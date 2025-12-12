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

// CPFWageType represents the type of wage for CPF calculation
type CPFWageType string

const (
	CPFWageTypeOW CPFWageType = "ow" // Ordinary Wages (monthly salary)
	CPFWageTypeAW CPFWageType = "aw" // Additional Wages (bonus, commission)
)

// Processor handles CPF contribution calculations for timeline processing.
// It wraps the contribution calculator and manages state across months.
type Processor struct {
	cpfAccount *account.CPFAccount
	configs    map[int]*config.CPFConfiguration // Config by year
}

// CPFBalances tracks year-to-date wages and accumulated CPF balances across months.
// This should be maintained across the timeline loop and reset at year boundaries.
type CPFBalances struct {
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
	CPFWageType          CPFWageType      // OW or AW
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

// NewCPFBalances creates an initial CPFBalances from a CPF account's current balances.
func NewCPFBalances(cpfAccount *account.CPFAccount) *CPFBalances {
	if cpfAccount == nil {
		return &CPFBalances{
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

	return &CPFBalances{
		YTDOrdinaryWages: decimal.Zero(),
		YTDAWSWages:      decimal.Zero(),
		AccumulatedOA:    &oa,
		AccumulatedSA:    &sa,
		AccumulatedMA:    &ma,
		AccumulatedRA:    &ra,
	}
}

// ResetYtdAWCeiling resets the year-to-date wage tracking at year boundaries.
// This affects the AW ceiling calculation: AW Ceiling = $102,000 - YTD OW - YTD AW.
// Call this when transitioning to a new year in the timeline.
func (p *Processor) ResetYtdAWCeiling(balances *CPFBalances) {
	balances.YTDOrdinaryWages = decimal.Zero()
	balances.YTDAWSWages = decimal.Zero()
}

// ProcessOrdinaryWage calculates CPF for ordinary wages (monthly salary).
// Updates YTD tracking in balances and returns the contribution result.
func (p *Processor) ProcessOrdinaryWage(
	grossAmount *decimal.Decimal,
	balances *CPFBalances,
	date time.Time,
) (*ContributionResult, error) {
	cfg, err := p.getConfigForDate(date)
	if err != nil {
		return nil, err
	}

	calculator := contribution.NewCalculator(&cfg.Config)
	age := p.cpfAccount.AgeAtDate(date)
	residency := p.cpfAccount.ResidencyStatus

	// Calculate contribution (now uses decimal directly)
	result := calculator.CalculateOW(grossAmount, age, residency)

	// Update YTD ordinary wages (capped amount)
	balances.YTDOrdinaryWages, _ = balances.YTDOrdinaryWages.Add(result.CappedWage)

	return buildResult(&result, CPFWageTypeOW), nil
}

// ProcessAdditionalWage calculates CPF for additional wages (bonus, commission).
// Uses YTD tracking from balances to calculate the AW ceiling.
func (p *Processor) ProcessAdditionalWage(
	grossAmount *decimal.Decimal,
	balances *CPFBalances,
	date time.Time,
) (*ContributionResult, error) {
	cfg, err := p.getConfigForDate(date)
	if err != nil {
		return nil, err
	}

	calculator := contribution.NewCalculator(&cfg.Config)
	age := p.cpfAccount.AgeAtDate(date)
	residency := p.cpfAccount.ResidencyStatus

	// Calculate contribution with YTD context (now uses decimal directly)
	result := calculator.CalculateAW(grossAmount, age, residency, balances.YTDOrdinaryWages, balances.YTDAWSWages)

	// Update YTD additional wages
	balances.YTDAWSWages, _ = balances.YTDAWSWages.Add(result.CappedWage)

	return buildResult(&result, CPFWageTypeAW), nil
}

// AddContributionToBalances adds the contribution allocations to the accumulated balances.
// Call this after processing each income to update the running CPF balances.
func (p *Processor) AddContributionToBalances(result *ContributionResult, balances *CPFBalances) {
	balances.AccumulatedOA, _ = balances.AccumulatedOA.Add(result.AllocationOA)
	balances.AccumulatedSA, _ = balances.AccumulatedSA.Add(result.AllocationSA)
	balances.AccumulatedMA, _ = balances.AccumulatedMA.Add(result.AllocationMA)
	balances.AccumulatedRA, _ = balances.AccumulatedRA.Add(result.AllocationRA)
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
func buildResult(result *contribution.ContributionResult, cpfWageType CPFWageType) *ContributionResult {
	return &ContributionResult{
		GrossAmount:          result.GrossWage,
		CappedAmount:         result.CappedWage,
		EmployeeContribution: result.EmployeeContribution,
		EmployerContribution: result.EmployerContribution,
		TotalContribution:    result.TotalContribution,
		NetTakeHomePay:       result.TakeHomePay,
		AllocationOA:         result.Allocation.OA,
		AllocationSA:         result.Allocation.SA,
		AllocationMA:         result.Allocation.MA,
		AllocationRA:         result.Allocation.RA,
		CPFWageType:          cpfWageType,
	}
}

// TotalBalance returns the total accumulated CPF balance.
func (b *CPFBalances) TotalBalance() *decimal.Decimal {
	total := decimal.Zero()
	total, _ = total.Add(b.AccumulatedOA)
	total, _ = total.Add(b.AccumulatedSA)
	total, _ = total.Add(b.AccumulatedMA)
	total, _ = total.Add(b.AccumulatedRA)
	return total
}
