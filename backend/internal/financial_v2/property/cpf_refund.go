package property

import (
	"financial-chat-system/backend/internal/decimal"
)

// CpfRefund represents the CPF refund for a single borrower
type CpfRefund struct {
	PrincipalUsed   decimal.Decimal `json:"principalUsed"`
	AccruedInterest decimal.Decimal `json:"accruedInterest"`
	Total           decimal.Decimal `json:"total"`
}

// PerBorrowerCpfRefund contains CPF refund breakdown per borrower
type PerBorrowerCpfRefund struct {
	Borrower1 CpfRefund  `json:"borrower1"`
	Borrower2 *CpfRefund `json:"borrower2,omitempty"` // nil for single borrower
}

// CpfRefundCalculationInput contains all inputs needed to calculate CPF refund
type CpfRefundCalculationInput struct {
	BorrowerType              string          // "single" or "joint"
	Borrower1DownpaymentCpfOa decimal.Decimal
	Borrower2DownpaymentCpfOa decimal.Decimal
	Borrower1MonthlyCpfOa     decimal.Decimal
	Borrower2MonthlyCpfOa     decimal.Decimal
	MonthlyPayment            decimal.Decimal
	HoldingPeriodMonths       int
}

// CalculateCpfAccruedInterest calculates the compound interest on CPF principal
// at the statutory rate of 2.5% per annum
func CalculateCpfAccruedInterest(principal *decimal.Decimal, months int) *decimal.Decimal {
	if principal.IsZero() || months <= 0 {
		return decimal.Zero()
	}

	// CPF OA earns 2.5% interest per annum, compounded yearly
	// Formula: principal * ((1 + r)^years - 1) where r = 0.025
	years := decimal.MustFromString(formatYears(months))
	rate := decimal.MustFromString("0.025")      // 2.5% per annum
	onePlusRate := decimal.One().Add(rate)       // 1.025

	// Calculate (1.025)^years
	compoundFactor, err := onePlusRate.Pow(years)
	if err != nil {
		// Fall back to simple interest if pow fails
		return principal.Mul(rate).Mul(years)
	}

	// Subtract 1 to get just the interest factor
	interestFactor := compoundFactor.Sub(decimal.One())

	// Multiply by principal to get accrued interest
	return principal.Mul(interestFactor)
}

// CalculatePerBorrowerCpfRefund calculates the CPF refund per borrower
// Based on Singapore CPF rules:
// - Each borrower's refund = their downpayment CPF + their monthly CPF used + accrued interest
// - Borrower 1's monthly CPF contributes first, Borrower 2 fills the remainder
func CalculatePerBorrowerCpfRefund(input CpfRefundCalculationInput) PerBorrowerCpfRefund {
	monthsDecimal := decimal.MustFromString(formatInt(input.HoldingPeriodMonths))

	// Borrower 1's CPF usage
	// Their monthly CPF contribution goes to mortgage first, capped by monthly payment
	b1MonthlyUsed := minDecimal(&input.Borrower1MonthlyCpfOa, &input.MonthlyPayment)
	b1MonthlyTotal := b1MonthlyUsed.Mul(monthsDecimal)
	b1Principal := input.Borrower1DownpaymentCpfOa.Add(b1MonthlyTotal)
	b1AccruedInterest := CalculateCpfAccruedInterest(b1Principal, input.HoldingPeriodMonths)
	b1Total := b1Principal.Add(b1AccruedInterest)

	borrower1Refund := CpfRefund{
		PrincipalUsed:   *b1Principal,
		AccruedInterest: *b1AccruedInterest,
		Total:           *b1Total,
	}

	result := PerBorrowerCpfRefund{
		Borrower1: borrower1Refund,
	}

	// Borrower 2's CPF usage (joint only)
	if input.BorrowerType == "joint" {
		// Borrower 2 pays the remaining portion after borrower 1's contribution
		remainingMonthlyPayment := input.MonthlyPayment.Sub(&input.Borrower1MonthlyCpfOa)
		if remainingMonthlyPayment.IsNegative() {
			remainingMonthlyPayment = decimal.Zero()
		}
		b2MonthlyUsed := minDecimal(&input.Borrower2MonthlyCpfOa, remainingMonthlyPayment)
		b2MonthlyTotal := b2MonthlyUsed.Mul(monthsDecimal)
		b2Principal := input.Borrower2DownpaymentCpfOa.Add(b2MonthlyTotal)
		b2AccruedInterest := CalculateCpfAccruedInterest(b2Principal, input.HoldingPeriodMonths)
		b2Total := b2Principal.Add(b2AccruedInterest)

		borrower2Refund := &CpfRefund{
			PrincipalUsed:   *b2Principal,
			AccruedInterest: *b2AccruedInterest,
			Total:           *b2Total,
		}
		result.Borrower2 = borrower2Refund
	}

	return result
}

// TotalCpfRefund calculates the combined CPF refund for all borrowers
func (r PerBorrowerCpfRefund) TotalCpfRefund() *decimal.Decimal {
	total := &r.Borrower1.Total
	if r.Borrower2 != nil {
		total = total.Add(&r.Borrower2.Total)
	}
	return total
}

// Helper functions

func minDecimal(a, b *decimal.Decimal) *decimal.Decimal {
	if a.Cmp(b) <= 0 {
		return a
	}
	return b
}

func formatYears(months int) string {
	years := float64(months) / 12.0
	return formatFloat(years)
}

func formatInt(n int) string {
	return formatFloat(float64(n))
}

func formatFloat(f float64) string {
	// Use decimal.MustFromFloat64 for proper conversion
	d := decimal.MustFromFloat64(f)
	return d.String()
}
