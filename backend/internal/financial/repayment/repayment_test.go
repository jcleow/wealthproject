package repayment_test

import (
	"testing"

	"financial-chat-system/backend/internal/decimal"
	"financial-chat-system/backend/internal/financial/repayment"
)

func TestStandardAmortization_ZeroInterest(t *testing.T) {
	// $12,000 loan, 0% interest, 12 months = $1,000/month
	strategy := repayment.NewStandardAmortization()
	result, err := strategy.Calculate(repayment.Params{
		CurrentBalance:  decimal.MustFromFloat64(12000),
		InterestRateAPR: decimal.Zero(),
		TotalPeriods:    12,
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	expected := decimal.MustFromFloat64(1000)
	tolerance := decimal.MustFromString("1")
	if !almostEqualDecimal(result.MonthlyPayment, expected, tolerance) {
		t.Errorf("expected monthly payment %s, got %s", expected.String(), result.MonthlyPayment.String())
	}

	// All payment goes to principal with 0% interest
	zeroTolerance := decimal.MustFromString("0.01")
	if !almostEqualDecimal(result.InterestPortion, decimal.Zero(), zeroTolerance) {
		t.Errorf("expected zero interest, got %s", result.InterestPortion.String())
	}
}

func TestStandardAmortization_CarLoan(t *testing.T) {
	// $30,000 car loan at 5% APR for 60 months
	// Expected payment ≈ $566.14
	strategy := repayment.NewStandardAmortization()
	result, err := strategy.Calculate(repayment.Params{
		CurrentBalance:  decimal.MustFromFloat64(30000),
		InterestRateAPR: decimal.MustFromFloat64(5.0),
		TotalPeriods:    60,
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	expected := decimal.MustFromString("566.14")
	tolerance := decimal.MustFromString("1")
	if !almostEqualDecimal(result.MonthlyPayment, expected, tolerance) {
		t.Errorf("expected monthly payment ~%s, got %s", expected.String(), result.MonthlyPayment.String())
	}

	// Verify interest portion for first month: 30000 * 0.05 / 12 = $125
	expectedInterest := decimal.MustFromFloat64(125)
	interestTolerance := decimal.MustFromString("0.5")
	if !almostEqualDecimal(result.InterestPortion, expectedInterest, interestTolerance) {
		t.Errorf("expected first month interest ~%s, got %s", expectedInterest.String(), result.InterestPortion.String())
	}
}

func TestStandardAmortization_Mortgage(t *testing.T) {
	// $400,000 mortgage at 4% APR for 360 months (30 years)
	// Expected payment ≈ $1,909.66
	strategy := repayment.NewStandardAmortization()
	result, err := strategy.Calculate(repayment.Params{
		CurrentBalance:  decimal.MustFromFloat64(400000),
		InterestRateAPR: decimal.MustFromFloat64(4.0),
		TotalPeriods:    360,
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	expected := decimal.MustFromString("1909.66")
	tolerance := decimal.MustFromString("2")
	if !almostEqualDecimal(result.MonthlyPayment, expected, tolerance) {
		t.Errorf("expected monthly payment ~%s, got %s", expected.String(), result.MonthlyPayment.String())
	}
}

func TestStandardAmortization_ZeroBalance(t *testing.T) {
	strategy := repayment.NewStandardAmortization()
	result, err := strategy.Calculate(repayment.Params{
		CurrentBalance:  decimal.Zero(),
		InterestRateAPR: decimal.MustFromFloat64(5.0),
		TotalPeriods:    60,
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if !result.MonthlyPayment.IsZero() {
		t.Errorf("expected zero payment for zero balance, got %s", result.MonthlyPayment.String())
	}
}

func TestInterestOnly_DuringInterestOnlyPeriod(t *testing.T) {
	// $300,000 loan at 5% APR, interest-only for 24 months
	// Interest-only payment = 300000 * 0.05 / 12 = $1,250
	strategy := repayment.NewInterestOnly()
	result, err := strategy.Calculate(repayment.Params{
		CurrentBalance:     decimal.MustFromFloat64(300000),
		InterestRateAPR:    decimal.MustFromFloat64(5.0),
		PeriodIndex:        10, // Still in interest-only period
		TotalPeriods:       360,
		InterestOnlyMonths: 24,
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	expected := decimal.MustFromFloat64(1250)
	tolerance := decimal.MustFromString("1")
	if !almostEqualDecimal(result.MonthlyPayment, expected, tolerance) {
		t.Errorf("expected interest-only payment ~%s, got %s", expected.String(), result.MonthlyPayment.String())
	}

	// Principal should be zero during interest-only period
	if !result.PrincipalPortion.IsZero() {
		t.Errorf("expected zero principal during interest-only, got %s", result.PrincipalPortion.String())
	}

	// Balance should remain unchanged
	originalBalance := decimal.MustFromFloat64(300000)
	if result.RemainingBalance.Cmp(originalBalance) != 0 {
		t.Errorf("expected balance unchanged at %s, got %s", originalBalance.String(), result.RemainingBalance.String())
	}
}

func TestInterestOnly_AfterInterestOnlyPeriod(t *testing.T) {
	// After interest-only period, should switch to amortization
	strategy := repayment.NewInterestOnly()
	result, err := strategy.Calculate(repayment.Params{
		CurrentBalance:     decimal.MustFromFloat64(300000),
		InterestRateAPR:    decimal.MustFromFloat64(5.0),
		PeriodIndex:        30, // After 24-month interest-only period
		TotalPeriods:       360,
		InterestOnlyMonths: 24,
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	// Should now be paying principal
	if result.PrincipalPortion.Cmp(decimal.Zero()) <= 0 {
		t.Error("expected positive principal payment after interest-only period")
	}

	// Payment should be higher than interest-only ($1250)
	interestOnlyPayment := decimal.MustFromFloat64(1250)
	if result.MonthlyPayment.Cmp(interestOnlyPayment) <= 0 {
		t.Error("expected higher payment after interest-only period")
	}
}

func TestMinimumPayment_CreditCard(t *testing.T) {
	// $5,000 balance at 20% APR, 2% minimum payment with $25 floor
	// Min payment = max(5000 * 0.02, 25, interest + 1) = max(100, 25, ~83.33+1) = $100
	strategy := repayment.NewMinimumPayment()
	result, err := strategy.Calculate(repayment.Params{
		CurrentBalance:  decimal.MustFromFloat64(5000),
		InterestRateAPR: decimal.MustFromFloat64(20.0),
		MinPaymentPct:   decimal.MustFromFloat64(2.0),
		MinPaymentFloor: decimal.MustFromFloat64(25.0),
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	expected := decimal.MustFromFloat64(100)
	tolerance := decimal.MustFromString("1")
	if !almostEqualDecimal(result.MonthlyPayment, expected, tolerance) {
		t.Errorf("expected min payment ~%s, got %s", expected.String(), result.MonthlyPayment.String())
	}
}

func TestMinimumPayment_SmallBalance(t *testing.T) {
	// $20 balance - should pay off balance, not floor
	strategy := repayment.NewMinimumPayment()
	result, err := strategy.Calculate(repayment.Params{
		CurrentBalance:  decimal.MustFromFloat64(20),
		InterestRateAPR: decimal.MustFromFloat64(20.0),
		MinPaymentPct:   decimal.MustFromFloat64(2.0),
		MinPaymentFloor: decimal.MustFromFloat64(25.0),
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	// Should pay balance + interest, not $25 floor
	maxPayment := decimal.MustFromFloat64(25)
	if result.MonthlyPayment.Cmp(maxPayment) > 0 {
		t.Errorf("expected payment <= balance for small balance, got %s", result.MonthlyPayment.String())
	}

	if !result.RemainingBalance.IsZero() {
		t.Error("expected payoff for small balance")
	}
}

func TestExtraPayment_AddsToStandardPayment(t *testing.T) {
	// $200,000 loan at 4% for 360 months with $500 extra
	strategy := repayment.NewExtraPayment()
	result, err := strategy.Calculate(repayment.Params{
		CurrentBalance:  decimal.MustFromFloat64(200000),
		InterestRateAPR: decimal.MustFromFloat64(4.0),
		TotalPeriods:    360,
		ExtraPayment:    decimal.MustFromFloat64(500.0),
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	// Compare with standard amortization (without extra payment)
	amortStrategy := repayment.NewStandardAmortization()
	baseResult, _ := amortStrategy.Calculate(repayment.Params{
		CurrentBalance:  decimal.MustFromFloat64(200000),
		InterestRateAPR: decimal.MustFromFloat64(4.0),
		TotalPeriods:    360,
	})

	// Extra payment should be $500 more than standard
	diff := result.MonthlyPayment.Sub(baseResult.MonthlyPayment)
	expectedDiff := decimal.MustFromFloat64(500)
	tolerance := decimal.MustFromString("0.01")
	if !almostEqualDecimal(diff, expectedDiff, tolerance) {
		t.Errorf("expected extra payment of $500, got difference of %s", diff.String())
	}

	// Interest should be the same
	interestDiff := result.InterestPortion.Sub(baseResult.InterestPortion)
	if !almostEqualDecimal(interestDiff, decimal.Zero(), tolerance) {
		t.Errorf("expected same interest, got difference of %s", interestDiff.String())
	}

	// Principal should be $500 more
	principalDiff := result.PrincipalPortion.Sub(baseResult.PrincipalPortion)
	if !almostEqualDecimal(principalDiff, expectedDiff, tolerance) {
		t.Errorf("expected extra principal of $500, got difference of %s", principalDiff.String())
	}
}

func TestExtraPayment_ZeroExtra(t *testing.T) {
	// With zero extra payment, should behave like standard amortization
	strategy := repayment.NewExtraPayment()
	result, err := strategy.Calculate(repayment.Params{
		CurrentBalance:  decimal.MustFromFloat64(100000),
		InterestRateAPR: decimal.MustFromFloat64(5.0),
		TotalPeriods:    240,
		ExtraPayment:    decimal.MustFromFloat64(0.0),
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	amortStrategy := repayment.NewStandardAmortization()
	baseResult, _ := amortStrategy.Calculate(repayment.Params{
		CurrentBalance:  decimal.MustFromFloat64(100000),
		InterestRateAPR: decimal.MustFromFloat64(5.0),
		TotalPeriods:    240,
	})

	tolerance := decimal.MustFromString("0.01")
	if !almostEqualDecimal(result.MonthlyPayment, baseResult.MonthlyPayment, tolerance) {
		t.Error("expected same payment with zero extra")
	}
}

func TestGetStrategy(t *testing.T) {
	tests := []struct {
		strategyType repayment.StrategyType
		expectedType repayment.StrategyType
	}{
		{repayment.StandardAmortization, repayment.StandardAmortization},
		{repayment.InterestOnly, repayment.InterestOnly},
		{repayment.MinimumPayment, repayment.MinimumPayment},
		{repayment.ExtraPayment, repayment.ExtraPayment},
		{"unknown", repayment.StandardAmortization}, // Default fallback
	}

	for _, tc := range tests {
		strategy := repayment.GetStrategy(tc.strategyType)
		if strategy.Type() != tc.expectedType {
			t.Errorf("GetStrategy(%s): expected type %s, got %s",
				tc.strategyType, tc.expectedType, strategy.Type())
		}
	}
}

func TestStrategyTypes(t *testing.T) {
	// Verify strategy types match their constants
	if repayment.NewStandardAmortization().Type() != repayment.StandardAmortization {
		t.Error("StandardAmortizationStrategy type mismatch")
	}
	if repayment.NewInterestOnly().Type() != repayment.InterestOnly {
		t.Error("InterestOnlyStrategy type mismatch")
	}
	if repayment.NewMinimumPayment().Type() != repayment.MinimumPayment {
		t.Error("MinimumPaymentStrategy type mismatch")
	}
	if repayment.NewExtraPayment().Type() != repayment.ExtraPayment {
		t.Error("ExtraPaymentStrategy type mismatch")
	}
}

func TestStrategyInterface(t *testing.T) {
	// Verify all concrete types implement the Strategy interface
	var _ repayment.Strategy = repayment.NewStandardAmortization()
	var _ repayment.Strategy = repayment.NewInterestOnly()
	var _ repayment.Strategy = repayment.NewMinimumPayment()
	var _ repayment.Strategy = repayment.NewExtraPayment()
}

// almostEqualDecimal checks if two decimals are equal within a tolerance
func almostEqualDecimal(a, b, tolerance *decimal.Decimal) bool {
	diff := a.Sub(b)

	// Get absolute value by checking if negative and negating if so
	absDiff := diff
	if diff.IsNegative() {
		zero := decimal.Zero()
		absDiff = zero.Sub(diff)
	}

	return absDiff.Cmp(tolerance) < 0
}
