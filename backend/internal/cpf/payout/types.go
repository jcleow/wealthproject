// Package payout provides CPF LIFE payout and bequest calculations.
//
// IMPORTANT DISCLAIMER: These calculations are approximations for planning purposes only.
// CPF LIFE is a complex annuity product and CPF Board does not publicly disclose
// the exact actuarial formulas used. Actual payouts may differ from these estimates.
// Always verify with CPF Board's official estimator at cpf.gov.sg.
package payout

import "financial-chat-system/backend/internal/decimal"

// Gender represents biological sex for CPF LIFE payout calculations.
// CPF uses gender-specific divisors due to different life expectancies.
type Gender string

const (
	Male   Gender = "male"
	Female Gender = "female"
)

// CPFLifePlan represents the three CPF LIFE plan types.
type CPFLifePlan string

const (
	Standard   CPFLifePlan = "standard"
	Basic      CPFLifePlan = "basic"
	Escalating CPFLifePlan = "escalating"
)

// PayoutInput contains all inputs needed to calculate CPF LIFE payouts.
type PayoutInput struct {
	// RAAt55 is the Retirement Account balance at age 55.
	// This is the key input that determines payout amounts.
	RAAt55 *decimal.Decimal

	// Gender affects the divisor used (males: 120, females: 132).
	// Females have lower payouts for the same balance due to longer life expectancy.
	Gender Gender

	// Plan determines payout characteristics (Standard/Basic/Escalating).
	Plan CPFLifePlan

	// PayoutStartAge is when payouts begin (65-70).
	// Deferring increases payout by ~7% per year.
	PayoutStartAge int
}

// PayoutResult contains the calculated CPF LIFE payout details.
type PayoutResult struct {
	// MonthlyPayout is the initial monthly payout amount at payout start age.
	MonthlyPayout *decimal.Decimal

	// RAAtPayoutAge is the projected RA balance when payouts begin
	// (after compounding at 4% from age 55).
	RAAtPayoutAge *decimal.Decimal

	// BasePayout is the payout before plan and deferment adjustments.
	// Calculated as: RAAt55 / divisor
	BasePayout *decimal.Decimal

	// PlanAdjustment is the multiplier applied for plan type.
	// Standard: 1.0, Basic: 0.90, Escalating: 0.80
	PlanAdjustment *decimal.Decimal

	// DefermentBonus is the multiplier for delayed payout start.
	// +7% per year deferred (age 65-70), max +40%.
	DefermentBonus *decimal.Decimal
}

// BequestInput contains inputs for bequest (inheritance) calculations.
type BequestInput struct {
	// Premium is the amount transferred to CPF LIFE at payout start.
	Premium *decimal.Decimal

	// Plan determines bequest characteristics.
	// Basic plan preserves more for beneficiaries.
	Plan CPFLifePlan

	// MonthlyPayout is the payout amount being received.
	MonthlyPayout *decimal.Decimal

	// YearsReceived is how many years of payouts have been received
	// before death.
	YearsReceived int
}

// BequestResult contains calculated bequest amounts.
type BequestResult struct {
	// Bequest is the amount left to beneficiaries upon death.
	Bequest *decimal.Decimal

	// TotalPayoutsReceived is the cumulative payouts received before death.
	TotalPayoutsReceived *decimal.Decimal

	// IsDepleted indicates if bequest has reached zero.
	IsDepleted bool
}

// EscalatingPayoutInput contains inputs for escalating plan payout at a specific year.
type EscalatingPayoutInput struct {
	// InitialPayout is the Year 1 payout amount.
	InitialPayout *decimal.Decimal

	// YearNumber is the payout year (1 = first year, 2 = second year, etc.)
	YearNumber int
}
