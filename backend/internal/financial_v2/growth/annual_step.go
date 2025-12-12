package growth

import (
	"financial-chat-system/backend/internal/decimal"
)

// AnnualStepStrategy applies growth once per year in January.
// Formula: amount * (1 + rate/100) applied only in January
// This is common for salary increases or annual adjustments.
type AnnualStepStrategy struct{}

// Name returns the strategy identifier.
func (a *AnnualStepStrategy) Name() string {
	return "annual_step"
}

// Apply calculates annual step growth.
// Growth is only applied in January (month 1) of each year, after the first year.
func (a *AnnualStepStrategy) Apply(
	currentAmount *decimal.Decimal,
	params Params,
	currentMonth int,
	monthOfYear int,
) *decimal.Decimal {
	// No growth during the first year (months 1-12)
	// Or if not January
	if currentMonth <= 12 || monthOfYear != 1 {
		return currentAmount
	}

	// Calculate annual growth: amount * (1 + rate/100)
	one := decimal.One()
	hundred := decimal.MustFromFloat64(100)

	// rate/100
	rateDecimal, _ := params.AnnualRatePct.Div(hundred)

	// 1 + rate/100
	onePlusRate, _ := one.Add(rateDecimal)

	// amount * (1 + rate/100)
	result, _ := currentAmount.Mul(onePlusRate)

	return result
}
