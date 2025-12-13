// Package contribution provides CPF contribution calculation logic.
//
// Reference: https://www.cpf.gov.sg/employer/employer-obligations/how-much-cpf-contributions-to-pay
package contribution

import (
	"financial-chat-system/backend/internal/cpf/config"
	"financial-chat-system/backend/internal/decimal"
)

// CPFWageType represents the type of wage (Ordinary or Additional).
// OW (Ordinary Wages) are regular monthly wages like salary.
// AW (Additional Wages) are irregular payments like bonuses, commissions, leave pay.
// Reference: https://www.cpf.gov.sg/employer/employer-obligations/how-much-cpf-contributions-to-pay
type CPFWageType string

const (
	CPFWageTypeOW CPFWageType = "ow" // Ordinary Wages (monthly salary)
	CPFWageTypeAW CPFWageType = "aw" // Additional Wages (bonus, commission, etc.)
)

// ContributionResult represents the calculated CPF contributions for a wage payment
type ContributionResult struct {
	GrossWage            *decimal.Decimal  `json:"grossWage"`
	CappedWage           *decimal.Decimal  `json:"cappedWage"`
	EmployeeContribution *decimal.Decimal  `json:"employeeContribution"`
	EmployerContribution *decimal.Decimal  `json:"employerContribution"`
	TotalContribution    *decimal.Decimal  `json:"totalContribution"`
	TakeHomePay          *decimal.Decimal  `json:"takeHomePay"`
	Allocation           AccountAllocation `json:"allocation"`
	RatesApplied         RatesApplied      `json:"ratesApplied"`
}

// AccountAllocation shows how the total contribution is split across accounts
type AccountAllocation struct {
	OA *decimal.Decimal `json:"oa"`
	SA *decimal.Decimal `json:"sa"`
	MA *decimal.Decimal `json:"ma"`
	RA *decimal.Decimal `json:"ra"`
}

// RatesApplied shows which rates were used in the calculation
type RatesApplied struct {
	Employee        *decimal.Decimal       `json:"employee"`
	Employer        *decimal.Decimal       `json:"employer"`
	AgeGroup        string                 `json:"ageGroup"`
	ResidencyStatus config.ResidencyStatus `json:"residencyStatus"`
}

// Calculator calculates CPF contributions based on configuration
type Calculator struct {
	config *config.ConfigData
}

// NewCalculator creates a new contribution calculator with the given config
func NewCalculator(cfg *config.ConfigData) *Calculator {
	return &Calculator{config: cfg}
}

// CalculateOW calculates CPF contributions for Ordinary Wages (monthly salary).
// OW is capped at the monthly OW ceiling ($7,400 in 2025).
// The age parameter should be the employee's age on the date of payment.
// Reference: https://www.cpf.gov.sg/employer/employer-obligations/how-much-cpf-contributions-to-pay
func (c *Calculator) CalculateOW(grossWage *decimal.Decimal, age int, residency config.ResidencyStatus) ContributionResult {
	return c.calculate(grossWage, age, residency, CPFWageTypeOW, nil)
}

// CalculateAW calculates CPF contributions for Additional Wages (bonus, etc.).
// AW ceiling = Annual Ceiling ($102,000) - YTD OW - YTD AW.
// ytdOW is the year-to-date Ordinary Wages already received (capped amounts).
// ytdAW is the year-to-date Additional Wages already received.
// The age parameter should be the employee's age on the date of payment.
// Reference: https://www.cpf.gov.sg/employer/employer-obligations/how-much-cpf-contributions-to-pay
func (c *Calculator) CalculateAW(grossWage *decimal.Decimal, age int, residency config.ResidencyStatus, ytdOW *decimal.Decimal, ytdAW *decimal.Decimal) ContributionResult {
	// For AW, the ceiling is: Annual Ceiling - YTD OW - YTD AW
	annualCeiling := decimal.NewFromInt64(c.config.AnnualCeiling, 0)
	awCeiling := annualCeiling.Sub(ytdOW).Sub(ytdAW)

	if awCeiling.IsNegative() {
		awCeiling = decimal.Zero()
	}
	return c.calculate(grossWage, age, residency, CPFWageTypeAW, awCeiling)
}

// calculate performs the core CPF calculation
func (c *Calculator) calculate(grossWage *decimal.Decimal, age int, residency config.ResidencyStatus, wageType CPFWageType, awCeiling *decimal.Decimal) ContributionResult {
	rates := c.config.GetContributionRates(residency, age)
	allocation := c.config.GetAllocationRates(age)

	// Determine the wage ceiling
	var cappedWage *decimal.Decimal
	if wageType == CPFWageTypeOW {
		// OW is capped at the monthly OW ceiling
		owCeiling := decimal.NewFromInt64(c.config.OWCeiling, 0)
		cappedWage = minDecimal(grossWage, owCeiling)
	} else {
		// AW is capped at the remaining annual ceiling
		cappedWage = minDecimal(grossWage, awCeiling)
	}

	if cappedWage.IsNegative() {
		cappedWage = decimal.Zero()
	}

	// Calculate contributions
	employeeContrib := roundToNearestCent(cappedWage.Mul(&rates.Employee))
	employerContrib := roundToNearestCent(cappedWage.Mul(&rates.Employer))
	totalContrib := employeeContrib.Add(employerContrib)

	// Calculate allocation to each account
	allocOA := roundToNearestCent(totalContrib.Mul(&allocation.OA))
	allocSA := roundToNearestCent(totalContrib.Mul(&allocation.SA))
	allocMA := roundToNearestCent(totalContrib.Mul(&allocation.MA))
	allocRA := roundToNearestCent(totalContrib.Mul(&allocation.RA))

	// Adjust for rounding errors - ensure allocations sum to total
	allocSum := decimal.Zero().Add(allocOA).Add(allocSA).Add(allocMA).Add(allocRA)
	if diff := totalContrib.Sub(allocSum); !diff.IsZero() {
		// Add/subtract the difference from OA (largest account for most ages)
		allocOA = allocOA.Add(diff)
	}

	takeHomePay := grossWage.Sub(employeeContrib)

	return ContributionResult{
		GrossWage:            grossWage,
		CappedWage:           cappedWage,
		EmployeeContribution: employeeContrib,
		EmployerContribution: employerContrib,
		TotalContribution:    totalContrib,
		TakeHomePay:          takeHomePay,
		Allocation: AccountAllocation{
			OA: allocOA,
			SA: allocSA,
			MA: allocMA,
			RA: allocRA,
		},
		RatesApplied: RatesApplied{
			Employee:        &rates.Employee,
			Employer:        &rates.Employer,
			AgeGroup:        getAgeGroupLabel(age),
			ResidencyStatus: residency,
		},
	}
}

// CalculateAnnualFromMonthly calculates annual CPF contributions from monthly salary
func (c *Calculator) CalculateAnnualFromMonthly(monthlySalary *decimal.Decimal, age int, residency config.ResidencyStatus, months int) ContributionResult {
	if months <= 0 {
		months = 12
	}
	if months > 12 {
		months = 12
	}

	rates := c.config.GetContributionRates(residency, age)
	totalResult := ContributionResult{
		GrossWage:            decimal.Zero(),
		CappedWage:           decimal.Zero(),
		EmployeeContribution: decimal.Zero(),
		EmployerContribution: decimal.Zero(),
		TotalContribution:    decimal.Zero(),
		TakeHomePay:          decimal.Zero(),
		Allocation: AccountAllocation{
			OA: decimal.Zero(),
			SA: decimal.Zero(),
			MA: decimal.Zero(),
			RA: decimal.Zero(),
		},
		RatesApplied: RatesApplied{
			Employee:        &rates.Employee,
			Employer:        &rates.Employer,
			AgeGroup:        getAgeGroupLabel(age),
			ResidencyStatus: residency,
		},
	}

	for i := 0; i < months; i++ {
		monthResult := c.CalculateOW(monthlySalary, age, residency)
		totalResult.GrossWage = totalResult.GrossWage.Add(monthResult.GrossWage)
		totalResult.CappedWage = totalResult.CappedWage.Add(monthResult.CappedWage)
		totalResult.EmployeeContribution = totalResult.EmployeeContribution.Add(monthResult.EmployeeContribution)
		totalResult.EmployerContribution = totalResult.EmployerContribution.Add(monthResult.EmployerContribution)
		totalResult.TotalContribution = totalResult.TotalContribution.Add(monthResult.TotalContribution)
		totalResult.TakeHomePay = totalResult.TakeHomePay.Add(monthResult.TakeHomePay)
		totalResult.Allocation.OA = totalResult.Allocation.OA.Add(monthResult.Allocation.OA)
		totalResult.Allocation.SA = totalResult.Allocation.SA.Add(monthResult.Allocation.SA)
		totalResult.Allocation.MA = totalResult.Allocation.MA.Add(monthResult.Allocation.MA)
		totalResult.Allocation.RA = totalResult.Allocation.RA.Add(monthResult.Allocation.RA)
	}

	return totalResult
}

// CalculateAnnualWithBonus calculates annual CPF with monthly salary and annual bonus
func (c *Calculator) CalculateAnnualWithBonus(monthlySalary *decimal.Decimal, annualBonus *decimal.Decimal, age int, residency config.ResidencyStatus) ContributionResult {
	// Calculate 12 months of OW
	owResult := c.CalculateAnnualFromMonthly(monthlySalary, age, residency, 12)

	// Calculate AW (bonus) with YTD wages
	owCeiling := decimal.NewFromInt64(c.config.OWCeiling, 0)
	twelve := decimal.NewFromInt64(12, 0)
	maxYtdOW := owCeiling.Mul(twelve)
	monthlySalaryTimes12 := monthlySalary.Mul(twelve)
	ytdOW := minDecimal(monthlySalaryTimes12, maxYtdOW)

	awResult := c.CalculateAW(annualBonus, age, residency, ytdOW, decimal.Zero())

	// Combine results
	grossWage := owResult.GrossWage.Add(awResult.GrossWage)
	cappedWage := owResult.CappedWage.Add(awResult.CappedWage)
	employeeContrib := owResult.EmployeeContribution.Add(awResult.EmployeeContribution)
	employerContrib := owResult.EmployerContribution.Add(awResult.EmployerContribution)
	totalContrib := owResult.TotalContribution.Add(awResult.TotalContribution)
	takeHomePay := owResult.TakeHomePay.Add(awResult.TakeHomePay)
	allocOA := owResult.Allocation.OA.Add(awResult.Allocation.OA)
	allocSA := owResult.Allocation.SA.Add(awResult.Allocation.SA)
	allocMA := owResult.Allocation.MA.Add(awResult.Allocation.MA)
	allocRA := owResult.Allocation.RA.Add(awResult.Allocation.RA)

	return ContributionResult{
		GrossWage:            grossWage,
		CappedWage:           cappedWage,
		EmployeeContribution: employeeContrib,
		EmployerContribution: employerContrib,
		TotalContribution:    totalContrib,
		TakeHomePay:          takeHomePay,
		Allocation: AccountAllocation{
			OA: allocOA,
			SA: allocSA,
			MA: allocMA,
			RA: allocRA,
		},
		RatesApplied: owResult.RatesApplied,
	}
}

// roundToNearestCent rounds to the nearest cent (2 decimal places)
func roundToNearestCent(amount *decimal.Decimal) *decimal.Decimal {
	return amount.Round(2)
}

// minDecimal returns the smaller of two decimals
func minDecimal(a, b *decimal.Decimal) *decimal.Decimal {
	if a.Cmp(b) < 0 {
		return a
	}
	return b
}

// getAgeGroupLabel returns a human-readable label for the age group
func getAgeGroupLabel(age int) string {
	switch {
	case age <= 55:
		return "55 and below"
	case age <= 60:
		return "Above 55 to 60"
	case age <= 65:
		return "Above 60 to 65"
	case age <= 70:
		return "Above 65 to 70"
	default:
		return "Above 70"
	}
}
