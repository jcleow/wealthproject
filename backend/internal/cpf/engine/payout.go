package engine

import (
	"time"

	"financial-chat-system/backend/internal/cpf/payout"
	"financial-chat-system/backend/internal/decimal"
)

// PayoutActivationResult contains the outcome of CPF LIFE activation.
type PayoutActivationResult struct {
	MonthlyPayout  *decimal.Decimal // Calculated monthly payout
	AnnualPayout   *decimal.Decimal // Annual payout (monthly * 12)
	PayoutRate     *decimal.Decimal // Payout rate as percentage of RA
	Plan           payout.Plan      // The plan used (standard, basic, escalating)
	BequestAt75    *decimal.Decimal // Estimated bequest at age 75
	BequestAt85    *decimal.Decimal // Estimated bequest at age 85
	BequestAt95    *decimal.Decimal // Estimated bequest at age 95
}

// ShouldStartPayouts checks if CPF LIFE payouts should start this month.
// Returns true if age reaches payoutStartAge and payouts haven't started yet.
func ShouldStartPayouts(state *CPFState, payoutStartAge int, date time.Time) bool {
	age := state.AgeAt(date)
	return age >= payoutStartAge && !state.PayoutsActive
}

// CalculateCPFLifePayout calculates the monthly payout amount.
// Does not modify state - use ActivateCPFLifePayouts to start payouts.
func CalculateCPFLifePayout(
	raBalance *decimal.Decimal,
	birthYear int,
	gender string,
	plan payout.Plan,
	payoutStartAge int,
) (*PayoutActivationResult, error) {
	// Convert gender string to payout.Gender
	payoutGender := payout.GenderMale
	if gender == "female" {
		payoutGender = payout.GenderFemale
	}

	// Calculate payout using the payout package
	input := payout.PayoutInput{
		BirthYear:      birthYear,
		Gender:         payoutGender,
		Plan:           plan,
		RABalanceAt65:  raBalance,
		PayoutStartAge: payoutStartAge,
	}

	result, err := payout.CalculatePayout(input)
	if err != nil {
		return nil, err
	}

	return &PayoutActivationResult{
		MonthlyPayout: result.MonthlyPayout,
		AnnualPayout:  result.AnnualPayout,
		PayoutRate:    result.PayoutRate,
		Plan:          plan,
		BequestAt75:   result.BequestAtAge75,
		BequestAt85:   result.BequestAtAge85,
		BequestAt95:   result.BequestAtAge95,
	}, nil
}

// ActivateCPFLifePayouts starts CPF LIFE payouts.
// Modifies state: sets PayoutsActive = true and MonthlyPayout.
// Should be called once when payouts begin.
func ActivateCPFLifePayouts(
	state *CPFState,
	plan payout.Plan,
	payoutStartAge int,
) (*PayoutActivationResult, error) {
	// Use current RA balance for payout calculation
	result, err := CalculateCPFLifePayout(
		state.RA,
		state.DateOfBirth.Year(),
		state.Gender,
		plan,
		payoutStartAge,
	)
	if err != nil {
		return nil, err
	}

	// Update state
	state.PayoutsActive = true
	state.MonthlyPayout = result.MonthlyPayout

	return result, nil
}

// ApplyMonthlyPayout deducts one month's payout from RA.
// Modifies state in place, updating RA and CumulativePayouts.
// Returns the actual payout (may be less if RA is depleted).
// Note: CPF LIFE is a lifelong annuity - payouts continue even after RA is depleted.
func ApplyMonthlyPayout(state *CPFState) *decimal.Decimal {
	if !state.PayoutsActive || state.MonthlyPayout == nil || state.MonthlyPayout.IsZero() {
		return decimal.Zero()
	}

	actualPayout := state.MonthlyPayout

	// Deduct from RA only if RA has balance remaining
	// CPF LIFE is a lifelong annuity - payouts continue regardless of RA balance
	if state.RA != nil && !state.RA.IsZero() {
		if state.RA.Cmp(state.MonthlyPayout) >= 0 {
			state.RA = state.RA.Sub(state.MonthlyPayout)
		} else {
			// RA is depleted, take whatever is left
			state.RA = decimal.Zero()
		}
	}

	// Always track cumulative payouts (lifelong annuity continues regardless of RA balance)
	state.CumulativePayouts = state.CumulativePayouts.Add(actualPayout)

	return actualPayout
}
