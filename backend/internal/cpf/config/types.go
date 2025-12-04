// Package config provides CPF configuration types and policy data.
//
// Reference: https://www.cpf.gov.sg/employer/employer-obligations/how-much-cpf-contributions-to-pay
package config

import "time"

// ResidencyStatus represents the CPF residency status for contribution rate lookup.
// PR contribution rates are graduated over the first 3 years of obtaining PR status.
// Reference: https://www.cpf.gov.sg/employer/employer-obligations/how-much-cpf-contributions-to-pay
type ResidencyStatus string

const (
	ResidencyCitizen     ResidencyStatus = "citizen"
	ResidencyPRYear1     ResidencyStatus = "pr_year_1"
	ResidencyPRYear2     ResidencyStatus = "pr_year_2"
	ResidencyPRYear3Plus ResidencyStatus = "pr_year_3_plus"
)

// CPFConfiguration represents a complete set of CPF rules for a given year
type CPFConfiguration struct {
	ID            string     `json:"id" db:"id"`
	Year          int        `json:"year" db:"year"`
	EffectiveFrom time.Time  `json:"effectiveFrom" db:"effective_from"`
	EffectiveTo   *time.Time `json:"effectiveTo" db:"effective_to"`
	Config        ConfigData `json:"config" db:"config"`
	CreatedAt     time.Time  `json:"createdAt" db:"created_at"`
	UpdatedAt     time.Time  `json:"updatedAt" db:"updated_at"`
}

// ConfigData contains all CPF policy parameters for a year
type ConfigData struct {
	// Wage ceilings (in dollars)
	OWCeiling      int64 `json:"owCeiling"`      // Monthly Ordinary Wages ceiling
	AnnualCeiling  int64 `json:"annualCeiling"`  // Annual wages ceiling for AW calculation
	CPFAnnualLimit int64 `json:"cpfAnnualLimit"` // Maximum total CPF contributions per year

	// Retirement sums (in dollars)
	RetirementSums RetirementSums `json:"retirementSums"`

	// Basic Healthcare Sum (in dollars)
	BHS int64 `json:"bhs"`

	// Interest rates (as decimals, e.g., 0.025 = 2.5%)
	InterestRates InterestRates `json:"interestRates"`

	// Contribution rates by residency status
	ContributionRates ContributionRateTable `json:"contributionRates"`

	// Allocation rates by age band
	AllocationRates AllocationRateTable `json:"allocationRates"`
}

// RetirementSums contains the three retirement sum tiers
type RetirementSums struct {
	BRS int64 `json:"brs"` // Basic Retirement Sum
	FRS int64 `json:"frs"` // Full Retirement Sum
	ERS int64 `json:"ers"` // Enhanced Retirement Sum
}

// InterestRates contains all interest rate configurations
type InterestRates struct {
	OA float64 `json:"oa"` // Ordinary Account base rate (typically 2.5%)
	SA float64 `json:"sa"` // Special Account base rate (typically 4%)
	MA float64 `json:"ma"` // MediSave Account base rate (typically 4%)
	RA float64 `json:"ra"` // Retirement Account base rate (typically 4%)

	// Extra interest rates
	Extra1PctFirst60k        float64 `json:"extra1PctFirst60k"`        // Extra 1% on first $60k (below 55)
	Extra2PctFirst30kAbove55 float64 `json:"extra2PctFirst30kAbove55"` // Extra 2% on first $30k (55+)
	Extra1PctNext30kAbove55  float64 `json:"extra1PctNext30kAbove55"`  // Extra 1% on next $30k (55+)
}

// ContributionRateTable contains contribution rates for all residency statuses
type ContributionRateTable struct {
	CitizenAndPR3Plus AgeBasedContributionRates `json:"citizenAndPR3Plus"`
	PRYear1           AgeBasedContributionRates `json:"prYear1"`
	PRYear2           AgeBasedContributionRates `json:"prYear2"`
}

// AgeBasedContributionRates contains contribution rates for each age band.
// Age is determined based on the employee's age on the date of payment, not calendar year.
// Reference: https://www.cpf.gov.sg/employer/employer-obligations/how-much-cpf-contributions-to-pay
type AgeBasedContributionRates struct {
	UpTo55      RatePair `json:"upTo55"`
	Above55To60 RatePair `json:"above55To60"`
	Above60To65 RatePair `json:"above60To65"`
	Above65To70 RatePair `json:"above65To70"`
	Above70     RatePair `json:"above70"`
}

// RatePair contains employee and employer contribution rates
type RatePair struct {
	Employee float64 `json:"employee"` // Employee contribution rate (decimal)
	Employer float64 `json:"employer"` // Employer contribution rate (decimal)
}

// Total returns the total contribution rate (employee + employer)
func (r RatePair) Total() float64 {
	return r.Employee + r.Employer
}

// AllocationRateTable contains allocation rates for each age band
type AllocationRateTable struct {
	UpTo35      AllocationRates `json:"upTo35"`
	Above35To45 AllocationRates `json:"above35To45"`
	Above45To50 AllocationRates `json:"above45To50"`
	Above50To55 AllocationRates `json:"above50To55"`
	Above55To60 AllocationRates `json:"above55To60"`
	Above60To65 AllocationRates `json:"above60To65"`
	Above65     AllocationRates `json:"above65"`
}

// AllocationRates contains the allocation percentages to each account
type AllocationRates struct {
	OA float64 `json:"oa"` // Ordinary Account allocation (decimal)
	SA float64 `json:"sa"` // Special Account allocation (decimal)
	MA float64 `json:"ma"` // MediSave Account allocation (decimal)
	RA float64 `json:"ra"` // Retirement Account allocation (decimal, only for 55+)
}

// AgeBand represents an age range for rate lookup
type AgeBand string

const (
	AgeBandUpTo35      AgeBand = "upTo35"
	AgeBandAbove35To45 AgeBand = "above35To45"
	AgeBandAbove45To50 AgeBand = "above45To50"
	AgeBandAbove50To55 AgeBand = "above50To55"
	AgeBandAbove55To60 AgeBand = "above55To60"
	AgeBandAbove60To65 AgeBand = "above60To65"
	AgeBandAbove65To70 AgeBand = "above65To70"
	AgeBandAbove65     AgeBand = "above65"
	AgeBandAbove70     AgeBand = "above70"
)

// GetContributionAgeBand returns the appropriate age band for contribution rates
func GetContributionAgeBand(age int) AgeBand {
	switch {
	case age <= 55:
		return AgeBandUpTo35 // Uses same rates as upTo55 for contribution
	case age <= 60:
		return AgeBandAbove55To60
	case age <= 65:
		return AgeBandAbove60To65
	case age <= 70:
		return AgeBandAbove65To70
	default:
		return AgeBandAbove70
	}
}

// GetAllocationAgeBand returns the appropriate age band for allocation rates
func GetAllocationAgeBand(age int) AgeBand {
	switch {
	case age <= 35:
		return AgeBandUpTo35
	case age <= 45:
		return AgeBandAbove35To45
	case age <= 50:
		return AgeBandAbove45To50
	case age <= 55:
		return AgeBandAbove50To55
	case age <= 60:
		return AgeBandAbove55To60
	case age <= 65:
		return AgeBandAbove60To65
	default:
		return AgeBandAbove65
	}
}

// GetContributionRates returns the contribution rates for a given residency and age.
// The age parameter should be the employee's age on the date of contribution/payment.
// Reference: https://www.cpf.gov.sg/employer/employer-obligations/how-much-cpf-contributions-to-pay
func (c *ConfigData) GetContributionRates(residency ResidencyStatus, age int) RatePair {
	var rates AgeBasedContributionRates

	switch residency {
	case ResidencyPRYear1:
		rates = c.ContributionRates.PRYear1
	case ResidencyPRYear2:
		rates = c.ContributionRates.PRYear2
	default: // citizen or pr_year_3_plus
		rates = c.ContributionRates.CitizenAndPR3Plus
	}

	switch {
	case age <= 55:
		return rates.UpTo55
	case age <= 60:
		return rates.Above55To60
	case age <= 65:
		return rates.Above60To65
	case age <= 70:
		return rates.Above65To70
	default:
		return rates.Above70
	}
}

// GetAllocationRates returns the allocation rates for a given age
func (c *ConfigData) GetAllocationRates(age int) AllocationRates {
	switch {
	case age <= 35:
		return c.AllocationRates.UpTo35
	case age <= 45:
		return c.AllocationRates.Above35To45
	case age <= 50:
		return c.AllocationRates.Above45To50
	case age <= 55:
		return c.AllocationRates.Above50To55
	case age <= 60:
		return c.AllocationRates.Above55To60
	case age <= 65:
		return c.AllocationRates.Above60To65
	default:
		return c.AllocationRates.Above65
	}
}
