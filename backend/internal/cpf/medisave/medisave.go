package medisave

import (
	"financial-chat-system/backend/internal/common"
	"financial-chat-system/backend/internal/decimal"
	"time"
)

// Government schemes that are fully CPF-payable
var governmentSchemes = map[string]bool{
	"medishield_life": true,
	"careshield_life": true,
	"eldershield":     true,
	"dps":             true,
}

// DPS uses OA/SA rather than MediSave (MA)
const dpsScheme = "dps"

// Payability categories for insurance policies relative to CPF
const (
	PayabilityFull    = "full"    // Government scheme — entire premium from CPF
	PayabilityPartial = "partial" // ISP — MediSave up to AWL cap
	PayabilityNone    = "none"    // Private insurance — cash only
)

// PolicyPremium is the minimal policy data needed for split calculation.
type PolicyPremium struct {
	ID               string
	PersonID         string
	Category         string
	GovernmentScheme *string
	PremiumAmount    decimal.Decimal
	PremiumFrequency string
	StartDate        time.Time
	EndDate          *time.Time
}

// SplitResult holds the per-person CPF/cash split for one month.
type SplitResult struct {
	CPFDeductions []CPFDeduction
	TotalCPF      *decimal.Decimal
	TotalCash     *decimal.Decimal
}

// CPFDeduction represents a single CPF deduction for one policy.
type CPFDeduction struct {
	PolicyID   string
	Amount     *decimal.Decimal // Monthly CPF deduction amount
	CPFAccount string           // "MA" or "OA"
}

// GetAWL returns the Additional Withdrawal Limit based on age next birthday.
// AWL is a per-person per-year cap on MediSave withdrawals for ISP premiums.
//
//	age ≤ 40: $300/yr
//	41–70:    $600/yr
//	≥ 71:     $900/yr
func GetAWL(ageNextBirthday int) *decimal.Decimal {
	if ageNextBirthday <= 40 {
		return decimal.NewFromInt64(300, 0)
	}
	if ageNextBirthday <= 70 {
		return decimal.NewFromInt64(600, 0)
	}
	return decimal.NewFromInt64(900, 0)
}

// GetPayability determines the CPF payability category of a policy.
//
//   - "full": government scheme, entire premium from CPF
//   - "partial": ISP (hospitalization/health, no gov scheme), subject to AWL cap
//   - "none": private insurance, cash only
func GetPayability(governmentScheme *string, category string) string {
	if governmentScheme != nil && governmentSchemes[*governmentScheme] {
		return PayabilityFull
	}
	if category == "hospitalization" || category == "health" {
		return PayabilityPartial
	}
	return PayabilityNone
}

// CPFAccountForScheme returns "MA" or "OA" based on the government scheme.
// DPS uses OA (Ordinary Account); all others use MA (MediSave Account).
func CPFAccountForScheme(scheme string) string {
	if scheme == dpsScheme {
		return "OA"
	}
	return "MA"
}

// CalculateMonthlySplit computes the CPF/cash split for one person's policies
// for a single month. Returns the monthly CPF deductions and total cash premium.
//
// AWL is annualized then divided by 12 for monthly processing.
// AWL is shared across all ISPs for the same person — first ISP consumes AWL,
// subsequent ISPs get the remainder.
func CalculateMonthlySplit(policies []PolicyPremium, ageNextBirthday int) SplitResult {
	annualAWL := GetAWL(ageNextBirthday)
	monthlyAWL := annualAWL.Div(decimal.NewFromInt64(12, 0))
	awlRemaining := monthlyAWL

	totalCPF := decimal.Zero()
	totalCash := decimal.Zero()
	var deductions []CPFDeduction

	for _, policy := range policies {
		monthlyPremium := toMonthlyPremium(&policy.PremiumAmount, policy.PremiumFrequency)
		if monthlyPremium.IsZero() {
			continue
		}

		payability := GetPayability(policy.GovernmentScheme, policy.Category)

		switch payability {
		case PayabilityFull:
			// Government schemes — entire premium deducted from CPF
			cpfAccount := "MA"
			if policy.GovernmentScheme != nil {
				cpfAccount = CPFAccountForScheme(*policy.GovernmentScheme)
			}
			deductions = append(deductions, CPFDeduction{
				PolicyID:   policy.ID,
				Amount:     monthlyPremium,
				CPFAccount: cpfAccount,
			})
			totalCPF = totalCPF.Add(monthlyPremium)

		case PayabilityPartial:
			// ISP — MediSave capped at remaining AWL (shared across ISPs)
			medisavePortion := decimal.Min(monthlyPremium, awlRemaining)
			cashPortion := monthlyPremium.Sub(medisavePortion)

			// Consume AWL
			awlRemaining = decimal.Max(decimal.Zero(), awlRemaining.Sub(medisavePortion))

			if medisavePortion.GT(decimal.Zero()) {
				deductions = append(deductions, CPFDeduction{
					PolicyID:   policy.ID,
					Amount:     medisavePortion,
					CPFAccount: "MA",
				})
			}
			totalCPF = totalCPF.Add(medisavePortion)
			totalCash = totalCash.Add(cashPortion)

		case PayabilityNone:
			// Private insurance — full premium from cash
			totalCash = totalCash.Add(monthlyPremium)
		}
	}

	// Suppress nil slice in JSON — ensure empty slice
	if deductions == nil {
		deductions = []CPFDeduction{}
	}

	return SplitResult{
		CPFDeductions: deductions,
		TotalCPF:      totalCPF,
		TotalCash:     totalCash,
	}
}

// toMonthlyPremium converts a premium amount to monthly based on its frequency.
// Uses the common.ToMonthlyAmount helper which handles all frequency types.
func toMonthlyPremium(amount *decimal.Decimal, frequency string) *decimal.Decimal {
	return common.ToMonthlyAmount(amount, common.Frequency(frequency))
}
