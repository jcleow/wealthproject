package property

import (
	"testing"

	"financial-chat-system/backend/internal/decimal"
)

func TestCpfRefund_CalculateCpfAccruedInterest(t *testing.T) {
	tests := []struct {
		name      string
		principal string
		months    int
		wantMin   string // Minimum expected value
		wantMax   string // Maximum expected value (to allow for rounding)
	}{
		{
			name:      "zero principal returns zero",
			principal: "0",
			months:    12,
			wantMin:   "0",
			wantMax:   "0",
		},
		{
			name:      "zero months returns zero",
			principal: "100000",
			months:    0,
			wantMin:   "0",
			wantMax:   "0",
		},
		{
			name:      "one year at 2.5%",
			principal: "100000",
			months:    12,
			wantMin:   "2400",  // Slightly less than 2.5% due to rounding
			wantMax:   "2600",  // Slightly more than 2.5% due to rounding
		},
		{
			name:      "five years compound interest",
			principal: "100000",
			months:    60,
			wantMin:   "13000", // ~13.14% after 5 years compound
			wantMax:   "14000",
		},
		{
			name:      "ten years compound interest",
			principal: "50000",
			months:    120,
			wantMin:   "13500", // ~28% after 10 years compound on 50k
			wantMax:   "15000",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			principal := decimal.MustFromString(tt.principal)
			result := CalculateCpfAccruedInterest(principal, tt.months)

			wantMin := decimal.MustFromString(tt.wantMin)
			wantMax := decimal.MustFromString(tt.wantMax)

			if result.Cmp(wantMin) < 0 {
				t.Errorf("CalculateCpfAccruedInterest() = %s, want >= %s", result.String(), wantMin.String())
			}
			if result.Cmp(wantMax) > 0 {
				t.Errorf("CalculateCpfAccruedInterest() = %s, want <= %s", result.String(), wantMax.String())
			}
		})
	}
}

func TestCalculatePerBorrowerCpfRefund_SingleBorrower(t *testing.T) {
	input := CpfRefundCalculationInput{
		BorrowerType:              "single",
		Borrower1DownpaymentCpfOa: *decimal.MustFromString("50000"),
		Borrower2DownpaymentCpfOa: *decimal.MustFromString("0"),
		Borrower1MonthlyCpfOa:     *decimal.MustFromString("1000"),
		Borrower2MonthlyCpfOa:     *decimal.MustFromString("0"),
		MonthlyPayment:            *decimal.MustFromString("2000"),
		HoldingPeriodMonths:       60, // 5 years
	}

	result := CalculatePerBorrowerCpfRefund(input)

	// Borrower 1 should have:
	// - Downpayment CPF: 50,000
	// - Monthly CPF used: min(1000, 2000) * 60 = 60,000
	// - Principal: 110,000
	// - Accrued interest: ~14,400 (2.5% compound over 5 years on 110k)

	// Verify borrower 1 has non-zero values
	zero := decimal.Zero()
	if result.Borrower1.PrincipalUsed.Cmp(zero) <= 0 {
		t.Errorf("Borrower1.PrincipalUsed should be positive, got %s", result.Borrower1.PrincipalUsed.String())
	}
	if result.Borrower1.AccruedInterest.Cmp(zero) <= 0 {
		t.Errorf("Borrower1.AccruedInterest should be positive, got %s", result.Borrower1.AccruedInterest.String())
	}
	if result.Borrower1.Total.Cmp(zero) <= 0 {
		t.Errorf("Borrower1.Total should be positive, got %s", result.Borrower1.Total.String())
	}

	// Verify borrower 2 is nil for single borrower
	if result.Borrower2 != nil {
		t.Errorf("Borrower2 should be nil for single borrower, got %+v", result.Borrower2)
	}

	// Verify principal calculation: 50000 + (1000 * 60) = 110000
	expectedPrincipal := decimal.MustFromString("110000")
	if result.Borrower1.PrincipalUsed.Cmp(expectedPrincipal) != 0 {
		t.Errorf("Borrower1.PrincipalUsed = %s, want %s", result.Borrower1.PrincipalUsed.String(), expectedPrincipal.String())
	}

	// Verify total is principal + interest
	calculatedTotal := result.Borrower1.PrincipalUsed.Add(&result.Borrower1.AccruedInterest)
	if calculatedTotal.Cmp(&result.Borrower1.Total) != 0 {
		t.Errorf("Borrower1.Total = %s, want PrincipalUsed + AccruedInterest = %s", result.Borrower1.Total.String(), calculatedTotal.String())
	}
}

func TestCalculatePerBorrowerCpfRefund_JointBorrowers(t *testing.T) {
	input := CpfRefundCalculationInput{
		BorrowerType:              "joint",
		Borrower1DownpaymentCpfOa: *decimal.MustFromString("30000"),
		Borrower2DownpaymentCpfOa: *decimal.MustFromString("20000"),
		Borrower1MonthlyCpfOa:     *decimal.MustFromString("1200"),
		Borrower2MonthlyCpfOa:     *decimal.MustFromString("800"),
		MonthlyPayment:            *decimal.MustFromString("2000"),
		HoldingPeriodMonths:       36, // 3 years
	}

	result := CalculatePerBorrowerCpfRefund(input)

	// Verify both borrowers have non-zero values
	zero := decimal.Zero()
	if result.Borrower1.PrincipalUsed.Cmp(zero) <= 0 {
		t.Errorf("Borrower1.PrincipalUsed should be positive, got %s", result.Borrower1.PrincipalUsed.String())
	}
	if result.Borrower2 == nil {
		t.Fatal("Borrower2 should not be nil for joint borrower")
	}
	if result.Borrower2.PrincipalUsed.Cmp(zero) <= 0 {
		t.Errorf("Borrower2.PrincipalUsed should be positive, got %s", result.Borrower2.PrincipalUsed.String())
	}

	// Borrower 1: 30000 + (min(1200, 2000) * 36) = 30000 + 43200 = 73200
	expectedB1Principal := decimal.MustFromString("73200")
	if result.Borrower1.PrincipalUsed.Cmp(expectedB1Principal) != 0 {
		t.Errorf("Borrower1.PrincipalUsed = %s, want %s", result.Borrower1.PrincipalUsed.String(), expectedB1Principal.String())
	}

	// Borrower 2: 20000 + (min(800, 2000-1200) * 36) = 20000 + (800 * 36) = 20000 + 28800 = 48800
	expectedB2Principal := decimal.MustFromString("48800")
	if result.Borrower2.PrincipalUsed.Cmp(expectedB2Principal) != 0 {
		t.Errorf("Borrower2.PrincipalUsed = %s, want %s", result.Borrower2.PrincipalUsed.String(), expectedB2Principal.String())
	}

	// Verify total CPF refund method
	totalRefund := result.TotalCpfRefund()
	expectedTotal := result.Borrower1.Total.Add(&result.Borrower2.Total)
	if totalRefund.Cmp(expectedTotal) != 0 {
		t.Errorf("TotalCpfRefund() = %s, want %s", totalRefund.String(), expectedTotal.String())
	}
}

func TestCalculatePerBorrowerCpfRefund_Borrower1CoversFullPayment(t *testing.T) {
	// When borrower 1's monthly CPF >= monthly payment, borrower 2 uses 0 monthly
	input := CpfRefundCalculationInput{
		BorrowerType:              "joint",
		Borrower1DownpaymentCpfOa: *decimal.MustFromString("50000"),
		Borrower2DownpaymentCpfOa: *decimal.MustFromString("30000"),
		Borrower1MonthlyCpfOa:     *decimal.MustFromString("3000"), // Exceeds monthly payment
		Borrower2MonthlyCpfOa:     *decimal.MustFromString("1000"),
		MonthlyPayment:            *decimal.MustFromString("2000"),
		HoldingPeriodMonths:       24,
	}

	result := CalculatePerBorrowerCpfRefund(input)

	// Borrower 1: 50000 + (min(3000, 2000) * 24) = 50000 + 48000 = 98000
	expectedB1Principal := decimal.MustFromString("98000")
	if result.Borrower1.PrincipalUsed.Cmp(expectedB1Principal) != 0 {
		t.Errorf("Borrower1.PrincipalUsed = %s, want %s", result.Borrower1.PrincipalUsed.String(), expectedB1Principal.String())
	}

	// Borrower 2: 30000 + (min(1000, max(0, 2000-3000)) * 24) = 30000 + 0 = 30000
	expectedB2Principal := decimal.MustFromString("30000")
	if result.Borrower2.PrincipalUsed.Cmp(expectedB2Principal) != 0 {
		t.Errorf("Borrower2.PrincipalUsed = %s, want %s (borrower 2 should only have downpayment)", result.Borrower2.PrincipalUsed.String(), expectedB2Principal.String())
	}
}

func TestPerBorrowerCpfRefund_TotalCpfRefund(t *testing.T) {
	// Test with single borrower
	singleRefund := PerBorrowerCpfRefund{
		Borrower1: CpfRefund{
			PrincipalUsed:   *decimal.MustFromString("100000"),
			AccruedInterest: *decimal.MustFromString("10000"),
			Total:           *decimal.MustFromString("110000"),
		},
		Borrower2: nil,
	}

	total := singleRefund.TotalCpfRefund()
	expected := decimal.MustFromString("110000")
	if total.Cmp(expected) != 0 {
		t.Errorf("TotalCpfRefund() for single = %s, want %s", total.String(), expected.String())
	}

	// Test with joint borrowers
	jointRefund := PerBorrowerCpfRefund{
		Borrower1: CpfRefund{
			PrincipalUsed:   *decimal.MustFromString("100000"),
			AccruedInterest: *decimal.MustFromString("10000"),
			Total:           *decimal.MustFromString("110000"),
		},
		Borrower2: &CpfRefund{
			PrincipalUsed:   *decimal.MustFromString("50000"),
			AccruedInterest: *decimal.MustFromString("5000"),
			Total:           *decimal.MustFromString("55000"),
		},
	}

	total = jointRefund.TotalCpfRefund()
	expected = decimal.MustFromString("165000")
	if total.Cmp(expected) != 0 {
		t.Errorf("TotalCpfRefund() for joint = %s, want %s", total.String(), expected.String())
	}
}
