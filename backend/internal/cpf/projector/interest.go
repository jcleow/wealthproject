package projector

import (
	"financial-chat-system/backend/internal/decimal"
)

// CPF interest rates (annual) as per CPF Board
// Reference: https://www.cpf.gov.sg/member/growing-your-savings/earning-higher-returns/cpf-interest-rates
var (
	OAInterestRate = decimal.MustFromFloat64(0.025) // 2.5% p.a.
	SAInterestRate = decimal.MustFromFloat64(0.04)  // 4% p.a.
	MAInterestRate = decimal.MustFromFloat64(0.04)  // 4% p.a.
	RAInterestRate = decimal.MustFromFloat64(0.04)  // 4% p.a. (simplified)
)

var twelve = decimal.NewFromInt64(12, 0)

// CalculateMonthlyInterest calculates interest for one month
// Uses simple monthly compounding: balance * (annualRate / 12)
func CalculateMonthlyInterest(balance, annualRate *decimal.Decimal) *decimal.Decimal {
	if balance == nil || balance.IsZero() {
		return decimal.Zero()
	}
	monthlyRate := annualRate.Div(twelve)
	interest := balance.Mul(monthlyRate)
	return interest.Round(2)
}
