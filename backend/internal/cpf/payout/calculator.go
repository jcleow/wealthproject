package payout

import (
	"errors"

	"financial-chat-system/backend/internal/decimal"
)

var (
	// ErrInvalidGender is returned when the gender is not valid.
	ErrInvalidGender = errors.New("invalid gender: must be 'male' or 'female'")
	// ErrInvalidPlan is returned when the plan is not valid.
	ErrInvalidPlan = errors.New("invalid plan: must be 'standard', 'basic', or 'escalating'")
	// ErrInvalidPayoutAge is returned when the payout start age is not in the valid range.
	ErrInvalidPayoutAge = errors.New("invalid payout start age: must be between 65 and 70")
	// ErrInvalidBalance is returned when the RA balance is invalid.
	ErrInvalidBalance = errors.New("invalid RA balance: must be positive")
	// ErrInvalidBirthYear is returned when the birth year is invalid.
	ErrInvalidBirthYear = errors.New("invalid birth year: must be between 1930 and 2050")
)

// CalculatePayout calculates the CPF LIFE payout for a single plan using the regression model.
// Formula: payout = a*year*balance + b*balance + c*year + d
func CalculatePayout(input PayoutInput) (*PayoutResult, error) {
	// Validate inputs
	if err := validateInput(input); err != nil {
		return nil, err
	}

	// Get coefficients for gender + plan
	coeff := getCoefficient(input.Gender, input.Plan)
	if coeff == nil {
		return nil, ErrInvalidPlan
	}

	// Convert birth year to decimal
	year := decimal.NewFromInt64(int64(input.BirthYear), 0)

	// Calculate payout using regression formula:
	// payout = a*year*balance + b*balance + c*year + d

	// a * year * balance
	term1 := coeff.A.Mul(year).Mul(input.RABalanceAt65)

	// b * balance
	term2 := coeff.B.Mul(input.RABalanceAt65)

	// c * year
	term3 := coeff.C.Mul(year)

	// Sum all terms: a*year*balance + b*balance + c*year + d
	monthlyPayout := term1.Add(term2).Add(term3).Add(coeff.D)

	// Apply deferment bonus if payout starts after age 65
	if input.PayoutStartAge > 65 {
		bonus := getDefermentBonus(input.PayoutStartAge)
		monthlyPayout = monthlyPayout.Mul(bonus)
	}

	// Ensure payout is not negative
	if monthlyPayout.IsNegative() {
		monthlyPayout = decimal.Zero()
	}

	// Round to 2 decimal places
	monthlyPayout = monthlyPayout.Round(2)

	// Calculate annual payout
	twelve := decimal.NewFromInt64(12, 0)
	annualPayout := monthlyPayout.Mul(twelve).Round(2)

	// Calculate payout rate (annual payout / RA balance)
	var payoutRate *decimal.Decimal
	if !input.RABalanceAt65.IsZero() {
		payoutRate = annualPayout.Div(input.RABalanceAt65).Round(6)
	} else {
		payoutRate = decimal.Zero()
	}

	return &PayoutResult{
		MonthlyPayout: monthlyPayout,
		AnnualPayout:  annualPayout,
		PayoutRate:    payoutRate,
	}, nil
}

// CalculateAllPlans calculates CPF LIFE payouts for all three plans.
func CalculateAllPlans(birthYear int, gender Gender, raBalanceAt65 *decimal.Decimal, payoutStartAge int) (*AllPlanEstimates, error) {
	// Calculate standard plan
	standardInput := PayoutInput{
		BirthYear:      birthYear,
		Gender:         gender,
		Plan:           PlanStandard,
		RABalanceAt65:  raBalanceAt65,
		PayoutStartAge: payoutStartAge,
	}
	standard, err := CalculatePayout(standardInput)
	if err != nil {
		return nil, err
	}

	// Calculate basic plan
	basicInput := PayoutInput{
		BirthYear:      birthYear,
		Gender:         gender,
		Plan:           PlanBasic,
		RABalanceAt65:  raBalanceAt65,
		PayoutStartAge: payoutStartAge,
	}
	basic, err := CalculatePayout(basicInput)
	if err != nil {
		return nil, err
	}

	// Calculate escalating plan
	escalatingInput := PayoutInput{
		BirthYear:      birthYear,
		Gender:         gender,
		Plan:           PlanEscalating,
		RABalanceAt65:  raBalanceAt65,
		PayoutStartAge: payoutStartAge,
	}
	escalating, err := CalculatePayout(escalatingInput)
	if err != nil {
		return nil, err
	}

	// Calculate escalating plan projections at age 75 and 85
	// Escalating plan grows at 2% per year
	ten := decimal.NewFromInt64(10, 0)
	twenty := decimal.NewFromInt64(20, 0)

	// Payout at 75 = initial * (1.02^10)
	growthFactor10, _ := escalatingGrowthRate.Pow(ten)
	payoutAt75 := escalating.MonthlyPayout.Mul(growthFactor10).Round(2)

	// Payout at 85 = initial * (1.02^20)
	growthFactor20, _ := escalatingGrowthRate.Pow(twenty)
	payoutAt85 := escalating.MonthlyPayout.Mul(growthFactor20).Round(2)

	escalatingResult := EscalatingPayoutResult{
		PayoutResult: *escalating,
		PayoutAt75:   payoutAt75,
		PayoutAt85:   payoutAt85,
	}

	return &AllPlanEstimates{
		RABalanceAt65:  raBalanceAt65,
		PayoutStartAge: payoutStartAge,
		BirthYear:      birthYear,
		Gender:         gender,
		Standard:       *standard,
		Basic:          *basic,
		Escalating:     escalatingResult,
		Disclaimer:     Disclaimer,
	}, nil
}

// validateInput validates the payout calculation inputs.
func validateInput(input PayoutInput) error {
	// Validate gender
	if input.Gender != GenderMale && input.Gender != GenderFemale {
		return ErrInvalidGender
	}

	// Validate plan
	if input.Plan != PlanStandard && input.Plan != PlanBasic && input.Plan != PlanEscalating {
		return ErrInvalidPlan
	}

	// Validate payout start age (65-70)
	if input.PayoutStartAge < 65 || input.PayoutStartAge > 70 {
		return ErrInvalidPayoutAge
	}

	// Validate RA balance
	if input.RABalanceAt65 == nil || input.RABalanceAt65.IsNegative() {
		return ErrInvalidBalance
	}

	// Validate birth year (reasonable range)
	if input.BirthYear < 1930 || input.BirthYear > 2050 {
		return ErrInvalidBirthYear
	}

	return nil
}
