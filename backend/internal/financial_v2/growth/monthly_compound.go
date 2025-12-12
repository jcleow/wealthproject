package growth

import (
	"financial-chat-system/backend/internal/decimal"
)

// MonthlyCompoundStrategy applies compound growth every month after the first year.
// Formula: amount * (1 + rate/100)^(1/12)
// This is the most common growth strategy for assets like investments.
type MonthlyCompoundStrategy struct{}

// Name returns the strategy identifier.
func (m *MonthlyCompoundStrategy) Name() string {
	return "monthly_compound"
}

// Apply calculates monthly compound growth.
// Growth is applied every month from the start (month 1 onwards).
func (m *MonthlyCompoundStrategy) Apply(
	currentAmount *decimal.Decimal,
	params Params,
	currentMonth int,
	monthOfYear int,
) *decimal.Decimal {
	// Calculate monthly growth rate from annual rate
	// monthlyRate = (1 + annualRate/100)^(1/12)
	// We use decimal arithmetic for precision
	one := decimal.One()
	hundred := decimal.MustFromFloat64(100)
	oneOver12 := decimal.MustFromFloat64(1.0 / 12.0)

	// rate/100
	rateDecimal, _ := params.AnnualRatePct.Div(hundred)

	// 1 + rate/100
	onePlusRate, _ := one.Add(rateDecimal)

	// (1 + rate/100)^(1/12)
	growthFactor, _ := onePlusRate.Pow(oneOver12)

	// amount * growthFactor
	result, _ := currentAmount.Mul(growthFactor)

	return result
}
