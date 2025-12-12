// Package processor provides CPF contribution processing for timeline calculations.
// It wraps the contribution calculator and tracks state across months.
package processor

import (
	"time"

	"financial-chat-system/backend/internal/cpf/account"
	"financial-chat-system/backend/internal/cpf/config"
	"financial-chat-system/backend/internal/cpf/contribution"
	"financial-chat-system/backend/internal/decimal"
)

// WageType represents the type of wage for CPF calculation
type WageType string

const (
	WageTypeOW WageType = "ow" // Ordinary Wages (monthly salary)
	WageTypeAW WageType = "aw" // Additional Wages (bonus, commission)
)

// Processor handles CPF contribution calculations for timeline processing.
// It wraps the contribution calculator and manages state across months.
type Processor struct {
	cpfAccount *account.CPFAccount
	configs    map[int]*config.CPFConfiguration // Config by year
}

// State tracks year-to-date wages and accumulated CPF balances across months.
// This should be maintained across the timeline loop and reset at year boundaries.
type State struct {
	YTDOrdinaryWages *decimal.Decimal // Year-to-date capped OW (for AW ceiling calc)
	YTDAWSWages      *decimal.Decimal // Year-to-date AW received
	AccumulatedOA    *decimal.Decimal // Running OA balance
	AccumulatedSA    *decimal.Decimal // Running SA balance
	AccumulatedMA    *decimal.Decimal // Running MA balance
	AccumulatedRA    *decimal.Decimal // Running RA balance
}

// ContributionResult contains the CPF calculation result for a single income.
type ContributionResult struct {
	GrossAmount          *decimal.Decimal // Original gross income
	CappedAmount         *decimal.Decimal // After wage ceiling applied
	EmployeeContribution *decimal.Decimal // Employee's contribution (deducted from pay)
	EmployerContribution *decimal.Decimal // Employer's contribution
	TotalContribution    *decimal.Decimal // Employee + Employer
	NetTakeHomePay       *decimal.Decimal // Gross - Employee contribution
	AllocationOA         *decimal.Decimal // Amount to Ordinary Account
	AllocationSA         *decimal.Decimal // Amount to Special Account
	AllocationMA         *decimal.Decimal // Amount to MediSave Account
	AllocationRA         *decimal.Decimal // Amount to Retirement Account
	WageType             WageType         // OW or AW
}

// NewProcessor creates a new CPF processor for the given account.
// It loads configurations for the relevant years.
func NewProcessor(cpfAccount *account.CPFAccount) (*Processor, error) {
	// Load configs for 2024 and 2025 (extend as needed)
	configs := make(map[int]*config.CPFConfiguration)
	for _, year := range config.ListYears() {
		cfg, err := config.GetByYear(year)
		if err == nil {
			configs[year] = cfg
		}
	}

	return &Processor{
		cpfAccount: cpfAccount,
		configs:    configs,
	}, nil
}

// NewState creates an initial State from a CPF account's current balances.
func NewState(cpfAccount *account.CPFAccount) *State {
	if cpfAccount == nil {
		return &State{
			YTDOrdinaryWages: decimal.Zero(),
			YTDAWSWages:      decimal.Zero(),
			AccumulatedOA:    decimal.Zero(),
			AccumulatedSA:    decimal.Zero(),
			AccumulatedMA:    decimal.Zero(),
			AccumulatedRA:    decimal.Zero(),
		}
	}

	// Copy the decimal values from the account
	oa := cpfAccount.OABalance
	sa := cpfAccount.SABalance
	ma := cpfAccount.MABalance
	ra := cpfAccount.RABalance

	return &State{
		YTDOrdinaryWages: decimal.Zero(),
		YTDAWSWages:      decimal.Zero(),
		AccumulatedOA:    &oa,
		AccumulatedSA:    &sa,
		AccumulatedMA:    &ma,
		AccumulatedRA:    &ra,
	}
}

// ResetYTDState resets the year-to-date wage tracking at year boundaries.
// Call this when transitioning to a new year in the timeline.
func (p *Processor) ResetYTDState(state *State) {
	state.YTDOrdinaryWages = decimal.Zero()
	state.YTDAWSWages = decimal.Zero()
}

// ProcessOrdinaryWage calculates CPF for ordinary wages (monthly salary).
// Updates YTD tracking in state and returns the contribution result.
func (p *Processor) ProcessOrdinaryWage(
	grossAmount *decimal.Decimal,
	state *State,
	date time.Time,
) (*ContributionResult, error) {
	cfg, err := p.getConfigForDate(date)
	if err != nil {
		return nil, err
	}

	calculator := contribution.NewCalculator(&cfg.Config)
	age := p.cpfAccount.AgeAtDate(date)
	residency := p.cpfAccount.ResidencyStatus

	// Calculate contribution
	grossFloat, _ := grossAmount.Float64()
	result := calculator.CalculateOW(grossFloat, age, residency)

	// Update YTD ordinary wages (capped amount)
	cappedWage := decimal.MustFromFloat64(result.CappedWage)
	state.YTDOrdinaryWages, _ = state.YTDOrdinaryWages.Add(cappedWage)

	return p.buildResult(grossAmount, &result, WageTypeOW), nil
}

// ProcessAdditionalWage calculates CPF for additional wages (bonus, commission).
// Uses YTD tracking from state to calculate the AW ceiling.
func (p *Processor) ProcessAdditionalWage(
	grossAmount *decimal.Decimal,
	state *State,
	date time.Time,
) (*ContributionResult, error) {
	cfg, err := p.getConfigForDate(date)
	if err != nil {
		return nil, err
	}

	calculator := contribution.NewCalculator(&cfg.Config)
	age := p.cpfAccount.AgeAtDate(date)
	residency := p.cpfAccount.ResidencyStatus

	// Get YTD values for AW ceiling calculation
	ytdOW, _ := state.YTDOrdinaryWages.Float64()
	ytdAW, _ := state.YTDAWSWages.Float64()
	grossFloat, _ := grossAmount.Float64()

	// Calculate contribution with YTD context
	result := calculator.CalculateAW(grossFloat, age, residency, ytdOW, ytdAW)

	// Update YTD additional wages
	state.YTDAWSWages, _ = state.YTDAWSWages.Add(decimal.MustFromFloat64(result.CappedWage))

	return p.buildResult(grossAmount, &result, WageTypeAW), nil
}

// AddContributionToState adds the contribution allocations to the accumulated balances.
// Call this after processing each income to update the running CPF balances.
func (p *Processor) AddContributionToState(result *ContributionResult, state *State) {
	state.AccumulatedOA, _ = state.AccumulatedOA.Add(result.AllocationOA)
	state.AccumulatedSA, _ = state.AccumulatedSA.Add(result.AllocationSA)
	state.AccumulatedMA, _ = state.AccumulatedMA.Add(result.AllocationMA)
	state.AccumulatedRA, _ = state.AccumulatedRA.Add(result.AllocationRA)
}

// GetAccount returns the underlying CPF account.
func (p *Processor) GetAccount() *account.CPFAccount {
	return p.cpfAccount
}

// getConfigForDate returns the CPF configuration for the given date's year.
func (p *Processor) getConfigForDate(date time.Time) (*config.CPFConfiguration, error) {
	year := date.Year()
	cfg, ok := p.configs[year]
	if !ok {
		// Fall back to getting by date
		return config.GetByDate(date)
	}
	return cfg, nil
}

// buildResult converts the calculator result to our ContributionResult type.
func (p *Processor) buildResult(grossAmount *decimal.Decimal, result *contribution.ContributionResult, wageType WageType) *ContributionResult {
	return &ContributionResult{
		GrossAmount:          grossAmount,
		CappedAmount:         decimal.MustFromFloat64(result.CappedWage),
		EmployeeContribution: decimal.MustFromFloat64(result.EmployeeContribution),
		EmployerContribution: decimal.MustFromFloat64(result.EmployerContribution),
		TotalContribution:    decimal.MustFromFloat64(result.TotalContribution),
		NetTakeHomePay:       decimal.MustFromFloat64(result.TakeHomePay),
		AllocationOA:         decimal.MustFromFloat64(result.Allocation.OA),
		AllocationSA:         decimal.MustFromFloat64(result.Allocation.SA),
		AllocationMA:         decimal.MustFromFloat64(result.Allocation.MA),
		AllocationRA:         decimal.MustFromFloat64(result.Allocation.RA),
		WageType:             wageType,
	}
}

// TotalBalance returns the total accumulated CPF balance from state.
func (s *State) TotalBalance() *decimal.Decimal {
	total := decimal.Zero()
	total, _ = total.Add(s.AccumulatedOA)
	total, _ = total.Add(s.AccumulatedSA)
	total, _ = total.Add(s.AccumulatedMA)
	total, _ = total.Add(s.AccumulatedRA)
	return total
}
