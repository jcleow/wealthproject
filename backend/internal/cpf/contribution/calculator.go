package contribution

import (
	"math"

	"financial-chat-system/backend/internal/cpf/config"
)

// WageType represents the type of wage (Ordinary or Additional)
type WageType string

const (
	WageTypeOW WageType = "ow" // Ordinary Wages (monthly salary)
	WageTypeAW WageType = "aw" // Additional Wages (bonus, commission, etc.)
)

// ContributionResult represents the calculated CPF contributions for a wage payment
type ContributionResult struct {
	GrossWage            float64          `json:"grossWage"`
	CappedWage           float64          `json:"cappedWage"`
	EmployeeContribution float64          `json:"employeeContribution"`
	EmployerContribution float64          `json:"employerContribution"`
	TotalContribution    float64          `json:"totalContribution"`
	TakeHomePay          float64          `json:"takeHomePay"`
	Allocation           AccountAllocation `json:"allocation"`
	RatesApplied         RatesApplied      `json:"ratesApplied"`
}

// AccountAllocation shows how the total contribution is split across accounts
type AccountAllocation struct {
	OA float64 `json:"oa"`
	SA float64 `json:"sa"`
	MA float64 `json:"ma"`
	RA float64 `json:"ra"`
}

// RatesApplied shows which rates were used in the calculation
type RatesApplied struct {
	Employee        float64                `json:"employee"`
	Employer        float64                `json:"employer"`
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

// CalculateOW calculates CPF contributions for Ordinary Wages (monthly salary)
func (c *Calculator) CalculateOW(grossWage float64, age int, residency config.ResidencyStatus) ContributionResult {
	return c.calculate(grossWage, age, residency, WageTypeOW, 0)
}

// CalculateAW calculates CPF contributions for Additional Wages (bonus, etc.)
// ytdOW is the year-to-date Ordinary Wages already received
// ytdAW is the year-to-date Additional Wages already received
func (c *Calculator) CalculateAW(grossWage float64, age int, residency config.ResidencyStatus, ytdOW float64, ytdAW float64) ContributionResult {
	// For AW, the ceiling is: Annual Ceiling - YTD OW - YTD AW
	// But we also need to cap each month's AW by (Annual Ceiling / 12 - OW ceiling)
	awCeiling := float64(c.config.AnnualCeiling) - ytdOW - ytdAW
	if awCeiling < 0 {
		awCeiling = 0
	}
	return c.calculate(grossWage, age, residency, WageTypeAW, awCeiling)
}

// calculate performs the core CPF calculation
func (c *Calculator) calculate(grossWage float64, age int, residency config.ResidencyStatus, wageType WageType, awCeiling float64) ContributionResult {
	rates := c.config.GetContributionRates(residency, age)
	allocation := c.config.GetAllocationRates(age)

	// Determine the wage ceiling
	var cappedWage float64
	if wageType == WageTypeOW {
		// OW is capped at the monthly OW ceiling
		cappedWage = math.Min(grossWage, float64(c.config.OWCeiling))
	} else {
		// AW is capped at the remaining annual ceiling
		cappedWage = math.Min(grossWage, awCeiling)
	}

	if cappedWage < 0 {
		cappedWage = 0
	}

	// Calculate contributions
	employeeContrib := roundToNearest(cappedWage * rates.Employee)
	employerContrib := roundToNearest(cappedWage * rates.Employer)
	totalContrib := employeeContrib + employerContrib

	// Calculate allocation to each account
	accountAlloc := AccountAllocation{
		OA: roundToNearest(totalContrib * allocation.OA),
		SA: roundToNearest(totalContrib * allocation.SA),
		MA: roundToNearest(totalContrib * allocation.MA),
		RA: roundToNearest(totalContrib * allocation.RA),
	}

	// Adjust for rounding errors - ensure allocations sum to total
	allocSum := accountAlloc.OA + accountAlloc.SA + accountAlloc.MA + accountAlloc.RA
	if diff := totalContrib - allocSum; diff != 0 {
		// Add/subtract the difference from OA (largest account for most ages)
		accountAlloc.OA += diff
	}

	return ContributionResult{
		GrossWage:            grossWage,
		CappedWage:           cappedWage,
		EmployeeContribution: employeeContrib,
		EmployerContribution: employerContrib,
		TotalContribution:    totalContrib,
		TakeHomePay:          grossWage - employeeContrib,
		Allocation:           accountAlloc,
		RatesApplied: RatesApplied{
			Employee:        rates.Employee,
			Employer:        rates.Employer,
			AgeGroup:        getAgeGroupLabel(age),
			ResidencyStatus: residency,
		},
	}
}

// CalculateAnnualFromMonthly calculates annual CPF contributions from monthly salary
func (c *Calculator) CalculateAnnualFromMonthly(monthlySalary float64, age int, residency config.ResidencyStatus, months int) ContributionResult {
	if months <= 0 {
		months = 12
	}
	if months > 12 {
		months = 12
	}

	var totalResult ContributionResult
	totalResult.RatesApplied = RatesApplied{
		Employee:        c.config.GetContributionRates(residency, age).Employee,
		Employer:        c.config.GetContributionRates(residency, age).Employer,
		AgeGroup:        getAgeGroupLabel(age),
		ResidencyStatus: residency,
	}

	for i := 0; i < months; i++ {
		monthResult := c.CalculateOW(monthlySalary, age, residency)
		totalResult.GrossWage += monthResult.GrossWage
		totalResult.CappedWage += monthResult.CappedWage
		totalResult.EmployeeContribution += monthResult.EmployeeContribution
		totalResult.EmployerContribution += monthResult.EmployerContribution
		totalResult.TotalContribution += monthResult.TotalContribution
		totalResult.TakeHomePay += monthResult.TakeHomePay
		totalResult.Allocation.OA += monthResult.Allocation.OA
		totalResult.Allocation.SA += monthResult.Allocation.SA
		totalResult.Allocation.MA += monthResult.Allocation.MA
		totalResult.Allocation.RA += monthResult.Allocation.RA
	}

	return totalResult
}

// CalculateAnnualWithBonus calculates annual CPF with monthly salary and annual bonus
func (c *Calculator) CalculateAnnualWithBonus(monthlySalary float64, annualBonus float64, age int, residency config.ResidencyStatus) ContributionResult {
	// Calculate 12 months of OW
	owResult := c.CalculateAnnualFromMonthly(monthlySalary, age, residency, 12)

	// Calculate AW (bonus) with YTD wages
	ytdOW := math.Min(monthlySalary*12, float64(c.config.OWCeiling)*12)
	awResult := c.CalculateAW(annualBonus, age, residency, ytdOW, 0)

	// Combine results
	return ContributionResult{
		GrossWage:            owResult.GrossWage + awResult.GrossWage,
		CappedWage:           owResult.CappedWage + awResult.CappedWage,
		EmployeeContribution: owResult.EmployeeContribution + awResult.EmployeeContribution,
		EmployerContribution: owResult.EmployerContribution + awResult.EmployerContribution,
		TotalContribution:    owResult.TotalContribution + awResult.TotalContribution,
		TakeHomePay:          owResult.TakeHomePay + awResult.TakeHomePay,
		Allocation: AccountAllocation{
			OA: owResult.Allocation.OA + awResult.Allocation.OA,
			SA: owResult.Allocation.SA + awResult.Allocation.SA,
			MA: owResult.Allocation.MA + awResult.Allocation.MA,
			RA: owResult.Allocation.RA + awResult.Allocation.RA,
		},
		RatesApplied: owResult.RatesApplied,
	}
}

// roundToNearest rounds to the nearest cent
func roundToNearest(amount float64) float64 {
	return math.Round(amount*100) / 100
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
