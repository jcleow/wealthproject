package payout

import "financial-chat-system/backend/internal/decimal"

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

// Disclaimer is the standard disclaimer message for all payout estimates.
const Disclaimer = "These estimates are based on our own calculations and may differ from CPF LIFE's official figures. " +
	"Please verify with CPF's official calculator at cpf.gov.sg for accurate payout amounts."
