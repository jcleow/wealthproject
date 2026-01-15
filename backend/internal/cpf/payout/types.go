// Package payout provides CPF LIFE payout estimation calculations.
// It uses a regression model derived from official CPF calculator data
// to predict monthly payouts based on birth year, gender, plan type, and RA balance.
package payout

import "financial-chat-system/backend/internal/decimal"

// Gender represents the gender of a person for CPF LIFE calculations.
type Gender string

const (
	GenderMale   Gender = "male"
	GenderFemale Gender = "female"
)

// Plan represents a CPF LIFE plan type.
type Plan string

const (
	PlanStandard   Plan = "standard"
	PlanBasic      Plan = "basic"
	PlanEscalating Plan = "escalating"
)

// PayoutInput contains the inputs required for CPF LIFE payout calculation.
type PayoutInput struct {
	BirthYear      int              // Birth year of the person (e.g., 1985)
	Gender         Gender           // Gender of the person
	Plan           Plan             // CPF LIFE plan type
	RABalanceAt65  *decimal.Decimal // Projected RA balance at age 65
	PayoutStartAge int              // Payout start age (65-70)
}

// PayoutResult contains the calculated payout for a single plan.
type PayoutResult struct {
	MonthlyPayout *decimal.Decimal // Monthly payout amount
	AnnualPayout  *decimal.Decimal // Annual payout amount (monthly * 12)
	PayoutRate    *decimal.Decimal // Payout rate (monthly payout / RA balance * 12)

	// Bequest estimates (money left to beneficiaries upon death)
	BequestAtAge75 *decimal.Decimal // Estimated bequest if death at age 75
	BequestAtAge85 *decimal.Decimal // Estimated bequest if death at age 85
	BequestAtAge95 *decimal.Decimal // Estimated bequest if death at age 95
}

// EscalatingPayoutResult extends PayoutResult with escalating plan projections.
type EscalatingPayoutResult struct {
	PayoutResult
	PayoutAt75 *decimal.Decimal // Monthly payout at age 75 (after 10 years of 2% growth)
	PayoutAt85 *decimal.Decimal // Monthly payout at age 85 (after 20 years of 2% growth)
}

// AllPlanEstimates contains payout estimates for all three CPF LIFE plans.
type AllPlanEstimates struct {
	RABalanceAt65  *decimal.Decimal       // The RA balance used for calculations
	PayoutStartAge int                    // The payout start age used
	BirthYear      int                    // The birth year used
	Gender         Gender                 // The gender used
	Standard       PayoutResult           // Standard plan estimate
	Basic          PayoutResult           // Basic plan estimate
	Escalating     EscalatingPayoutResult // Escalating plan estimate
	Disclaimer     string                 // Disclaimer message reminding users to verify with official CPF calculator
}
