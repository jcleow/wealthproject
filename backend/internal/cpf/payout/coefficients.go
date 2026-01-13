package payout

import (
	"strconv"

	"financial-chat-system/backend/internal/decimal"
)

// Coefficient contains the regression coefficients for a gender+plan combination.
// The payout formula is: payout = a*year*balance + b*balance + c*year + d
type Coefficient struct {
	A *decimal.Decimal // Coefficient for year * balance interaction
	B *decimal.Decimal // Coefficient for balance
	C *decimal.Decimal // Coefficient for year (birth year)
	D *decimal.Decimal // Constant term
}

// coefficients maps gender+plan combinations to their regression coefficients.
// These coefficients were derived from official CPF calculator data for birth years 1961-1971.
// R-squared values are all > 0.999, indicating excellent fit within the training data range.
var coefficients = map[Gender]map[Plan]Coefficient{
	GenderMale: {
		PlanStandard: {
			A: decimal.MustFromFloat64(0.00023),
			B: decimal.MustFromFloat64(-0.446285),
			C: decimal.MustFromFloat64(6.424021),
			D: decimal.MustFromFloat64(-12550.148404),
		},
		PlanBasic: {
			A: decimal.MustFromFloat64(0.000213),
			B: decimal.MustFromFloat64(-0.412684),
			C: decimal.MustFromFloat64(5.900242),
			D: decimal.MustFromFloat64(-11527.033931),
		},
		PlanEscalating: {
			A: decimal.MustFromFloat64(0.000181),
			B: decimal.MustFromFloat64(-0.350307),
			C: decimal.MustFromFloat64(4.84221),
			D: decimal.MustFromFloat64(-9454.447753),
		},
	},
	GenderFemale: {
		PlanStandard: {
			A: decimal.MustFromFloat64(0.000215),
			B: decimal.MustFromFloat64(-0.415905),
			C: decimal.MustFromFloat64(6.986598),
			D: decimal.MustFromFloat64(-13658.650699),
		},
		PlanBasic: {
			A: decimal.MustFromFloat64(0.000205),
			B: decimal.MustFromFloat64(-0.397853),
			C: decimal.MustFromFloat64(5.864603),
			D: decimal.MustFromFloat64(-11457.610097),
		},
		PlanEscalating: {
			A: decimal.MustFromFloat64(0.000165),
			B: decimal.MustFromFloat64(-0.319844),
			C: decimal.MustFromFloat64(4.467727),
			D: decimal.MustFromFloat64(-8723.478107),
		},
	},
}

// getCoefficient retrieves the regression coefficients for the given gender and plan.
// Returns nil if the combination is not found.
func getCoefficient(gender Gender, plan Plan) *Coefficient {
	genderCoeffs, ok := coefficients[gender]
	if !ok {
		return nil
	}
	coeff, ok := genderCoeffs[plan]
	if !ok {
		return nil
	}
	return &coeff
}

// Deferment bonus rates per year of delay (ages 65-70).
// Each year of delay from age 65 increases the payout by approximately 7% (non-compounded).
var defermentBonusRates = map[int]*decimal.Decimal{
	65: decimal.MustFromFloat64(1.0),  // No bonus
	66: decimal.MustFromFloat64(1.07), // +7%
	67: decimal.MustFromFloat64(1.14), // +14%
	68: decimal.MustFromFloat64(1.21), // +21%
	69: decimal.MustFromFloat64(1.28), // +28%
	70: decimal.MustFromFloat64(1.35), // +35%
}

// getDefermentBonus returns the deferment bonus multiplier for the given payout start age.
// Returns 1.0 (no bonus) for invalid ages.
func getDefermentBonus(payoutStartAge int) *decimal.Decimal {
	if bonus, ok := defermentBonusRates[payoutStartAge]; ok {
		return bonus
	}
	return decimal.One()
}

// Escalating plan annual growth rate (2% per year).
var escalatingGrowthRate = decimal.MustFromFloat64(1.02)

// Model confidence boundaries based on training data (birth years 1961-1971).
const (
	// Training data range
	trainingDataMinYear = 1961
	trainingDataMaxYear = 1971

	// High confidence range (close to training data)
	highConfidenceMinYear = 1960
	highConfidenceMaxYear = 1975

	// Moderate confidence range (reasonable extrapolation)
	moderateConfidenceMinYear = 1950
	moderateConfidenceMaxYear = 1985

	// Outside these ranges is low confidence
)

// getConfidenceLevel determines the confidence level based on birth year.
func getConfidenceLevel(birthYear int) ConfidenceLevel {
	if birthYear >= highConfidenceMinYear && birthYear <= highConfidenceMaxYear {
		return ConfidenceHigh
	}
	if birthYear >= moderateConfidenceMinYear && birthYear <= moderateConfidenceMaxYear {
		return ConfidenceModerate
	}
	return ConfidenceLow
}

// getDisclaimer returns a disclaimer message reminding users to verify with CPF LIFE's official calculator.
// Always returns a disclaimer regardless of confidence level.
func getDisclaimer(birthYear int, confidence ConfidenceLevel) string {
	baseDisclaimer := "These estimates are based on our own regression model and may differ from CPF LIFE's official calculations. " +
		"Please verify with CPF's official calculator at cpf.gov.sg for accurate figures."

	switch confidence {
	case ConfidenceModerate:
		return "Birth year " + strconv.Itoa(birthYear) + " is outside the primary data range (1961-1971). " +
			"Estimates are extrapolated and may vary from actual CPF LIFE payouts. " + baseDisclaimer
	case ConfidenceLow:
		return "WARNING: Birth year " + strconv.Itoa(birthYear) + " is significantly outside the training data range. " +
			"These estimates may not be accurate. " + baseDisclaimer
	default:
		return baseDisclaimer
	}
}
