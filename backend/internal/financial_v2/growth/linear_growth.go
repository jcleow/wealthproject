package growth

import (
	"financial-chat-system/backend/internal/decimal"
)

// LinearGrowthStrategy applies linear (non-compounding) growth each month.
// Formula: amount + (amount * rate/100 / 12)
// This adds a fixed percentage of the original amount each month, without compounding.
type LinearGrowthStrategy struct{}

// Name returns the strategy identifier.
func (l *LinearGrowthStrategy) Name() string {
	return "linear_growth"
}

// Apply calculates linear monthly growth.
// Growth is applied every month after the first year, adding the same absolute amount each time.
func (l *LinearGrowthStrategy) Apply(
	currentAmount *decimal.Decimal,
	params Params,
	currentMonth int,
	monthOfYear int,
) *decimal.Decimal {
	// No growth during the first year (months 1-12)
	if currentMonth <= 12 {
		return currentAmount
	}

	// Calculate monthly growth increment: (amount * rate/100) / 12
	hundred := decimal.MustFromFloat64(100)
	twelve := decimal.MustFromFloat64(12)

	// rate/100
	rateDecimal, _ := params.AnnualRatePct.Div(hundred)

	// amount * rate/100
	annualGrowth, _ := currentAmount.Mul(rateDecimal)

	// (amount * rate/100) / 12
	monthlyIncrement, _ := annualGrowth.Div(twelve)

	// amount + monthlyIncrement
	result, _ := currentAmount.Add(monthlyIncrement)

	return result
}
