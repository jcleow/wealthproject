package projector

import (
	"financial-chat-system/backend/internal/decimal"
	"financial-chat-system/backend/internal/financial_v2/growth"
)

// CPF interest rates (annual percentage) as per CPF Board
// Reference: https://www.cpf.gov.sg/member/growing-your-savings/earning-higher-returns/cpf-interest-rates
var (
	OAInterestRatePct = decimal.MustFromFloat64(2.5) // 2.5% p.a.
	SAInterestRatePct = decimal.MustFromFloat64(4.0) // 4.0% p.a.
	MAInterestRatePct = decimal.MustFromFloat64(4.0) // 4.0% p.a.
	RAInterestRatePct = decimal.MustFromFloat64(4.0) // 4.0% p.a.
)

// interestStrategy reuses the growth module's LinearGrowthStrategy for CPF interest.
// We use the growth module here (rather than duplicating the calculation) to ensure
// consistent arithmetic across all financial projections. The growth module provides
// well-tested percentage-based calculations that work for both asset growth and
// CPF interest - the underlying math is identical: balance * (rate / 100 / 12).
var interestStrategy = &growth.LinearGrowthStrategy{}

// CalculateMonthlyInterest calculates interest for one month using the growth module.
// Uses simple monthly interest: balance * (annualRate / 12)
// Note: annualRatePct is the annual rate as a percentage (e.g., 2.5 for 2.5%)
func CalculateMonthlyInterest(balance, annualRatePct *decimal.Decimal) *decimal.Decimal {
	if balance == nil || balance.IsZero() {
		return decimal.Zero()
	}

	// Use growth module's LinearGrowthStrategy for consistent calculation
	// The strategy calculates: balance + (balance * rate/100 / 12)
	// We only need the interest portion, not the total
	params := growth.Params{AnnualRatePct: annualRatePct}
	newBalance := interestStrategy.Apply(balance, params, 2, 1) // month > 1 to trigger calculation

	interest := newBalance.Sub(balance)
	return interest.Round(2)
}
