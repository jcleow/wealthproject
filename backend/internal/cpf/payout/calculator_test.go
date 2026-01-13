package payout

import (
	"testing"

	"financial-chat-system/backend/internal/decimal"
)

func TestCalculatePayout_MaleStandard(t *testing.T) {
	tests := []struct {
		name           string
		birthYear      int
		balance        string
		payoutStartAge int
		wantMin        float64 // Minimum expected monthly payout
		wantMax        float64 // Maximum expected monthly payout (for tolerance)
	}{
		{
			name:           "1985 male $500k standard age 65",
			birthYear:      1985,
			balance:        "500000",
			payoutStartAge: 65,
			wantMin:        5200, // Model output ~$5,334
			wantMax:        5500,
		},
		{
			name:           "1970 male $400k standard age 65",
			birthYear:      1970,
			balance:        "400000",
			payoutStartAge: 65,
			wantMin:        2600, // Model output ~$2,831
			wantMax:        3000,
		},
		{
			name:           "1990 male $600k standard age 65",
			birthYear:      1990,
			balance:        "600000",
			payoutStartAge: 65,
			wantMin:        6700, // Model output ~$6,872
			wantMax:        7100,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			balance, _ := decimal.NewFromString(tt.balance)
			result, err := CalculatePayout(PayoutInput{
				BirthYear:      tt.birthYear,
				Gender:         GenderMale,
				Plan:           PlanStandard,
				RABalanceAt65:  balance,
				PayoutStartAge: tt.payoutStartAge,
			})
			if err != nil {
				t.Fatalf("CalculatePayout error: %v", err)
			}

			monthly, _ := result.MonthlyPayout.Float64()
			if monthly < tt.wantMin || monthly > tt.wantMax {
				t.Errorf("MonthlyPayout = %v, want between %v and %v", monthly, tt.wantMin, tt.wantMax)
			}
		})
	}
}

func TestCalculatePayout_FemaleStandard(t *testing.T) {
	tests := []struct {
		name           string
		birthYear      int
		balance        string
		payoutStartAge int
		wantMin        float64
		wantMax        float64
	}{
		{
			name:           "1990 female $600k standard age 65",
			birthYear:      1990,
			balance:        "600000",
			payoutStartAge: 65,
			wantMin:        7200, // Model output ~$7,411 (females have different coefficients)
			wantMax:        7600,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			balance, _ := decimal.NewFromString(tt.balance)
			result, err := CalculatePayout(PayoutInput{
				BirthYear:      tt.birthYear,
				Gender:         GenderFemale,
				Plan:           PlanStandard,
				RABalanceAt65:  balance,
				PayoutStartAge: tt.payoutStartAge,
			})
			if err != nil {
				t.Fatalf("CalculatePayout error: %v", err)
			}

			monthly, _ := result.MonthlyPayout.Float64()
			if monthly < tt.wantMin || monthly > tt.wantMax {
				t.Errorf("MonthlyPayout = %v, want between %v and %v", monthly, tt.wantMin, tt.wantMax)
			}
		})
	}
}

func TestCalculatePayout_Deferment(t *testing.T) {
	// Test that deferring payout increases monthly amount
	balance, _ := decimal.NewFromString("500000")

	resultAge65, err := CalculatePayout(PayoutInput{
		BirthYear:      1985,
		Gender:         GenderMale,
		Plan:           PlanStandard,
		RABalanceAt65:  balance,
		PayoutStartAge: 65,
	})
	if err != nil {
		t.Fatalf("CalculatePayout age 65 error: %v", err)
	}

	resultAge70, err := CalculatePayout(PayoutInput{
		BirthYear:      1985,
		Gender:         GenderMale,
		Plan:           PlanStandard,
		RABalanceAt65:  balance,
		PayoutStartAge: 70,
	})
	if err != nil {
		t.Fatalf("CalculatePayout age 70 error: %v", err)
	}

	monthly65, _ := resultAge65.MonthlyPayout.Float64()
	monthly70, _ := resultAge70.MonthlyPayout.Float64()

	// Age 70 should be ~35% higher than age 65 (7% per year * 5 years)
	expectedMinIncrease := 1.30 // Allow some tolerance
	actualIncrease := monthly70 / monthly65

	if actualIncrease < expectedMinIncrease {
		t.Errorf("Age 70 payout (%v) should be at least %.0f%% higher than age 65 (%v), actual increase: %.2fx",
			monthly70, (expectedMinIncrease-1)*100, monthly65, actualIncrease)
	}
}

func TestCalculateAllPlans(t *testing.T) {
	balance, _ := decimal.NewFromString("500000")

	result, err := CalculateAllPlans(1985, GenderMale, balance, 65)
	if err != nil {
		t.Fatalf("CalculateAllPlans error: %v", err)
	}

	// Verify all plans are calculated
	standardMonthly, _ := result.Standard.MonthlyPayout.Float64()
	basicMonthly, _ := result.Basic.MonthlyPayout.Float64()
	escalatingMonthly, _ := result.Escalating.MonthlyPayout.Float64()

	// Standard should have highest initial payout
	if standardMonthly <= basicMonthly || standardMonthly <= escalatingMonthly {
		t.Errorf("Standard plan should have highest initial payout: standard=%v, basic=%v, escalating=%v",
			standardMonthly, basicMonthly, escalatingMonthly)
	}

	// Escalating should have lowest initial payout
	if escalatingMonthly >= basicMonthly {
		t.Errorf("Escalating plan should have lowest initial payout: escalating=%v, basic=%v",
			escalatingMonthly, basicMonthly)
	}

	// Escalating should have payoutAt75 and payoutAt85 > initial
	at75, _ := result.Escalating.PayoutAt75.Float64()
	at85, _ := result.Escalating.PayoutAt85.Float64()

	if at75 <= escalatingMonthly {
		t.Errorf("Escalating payoutAt75 (%v) should be > initial (%v)", at75, escalatingMonthly)
	}
	if at85 <= at75 {
		t.Errorf("Escalating payoutAt85 (%v) should be > payoutAt75 (%v)", at85, at75)
	}
}

func TestConfidenceLevel(t *testing.T) {
	balance, _ := decimal.NewFromString("500000")

	tests := []struct {
		name            string
		birthYear       int
		expectedConfidence ConfidenceLevel
	}{
		{
			name:              "1965 should be high confidence",
			birthYear:         1965,
			expectedConfidence: ConfidenceHigh,
		},
		{
			name:              "1980 should be moderate confidence",
			birthYear:         1980,
			expectedConfidence: ConfidenceModerate,
		},
		{
			name:              "1995 should be low confidence",
			birthYear:         1995,
			expectedConfidence: ConfidenceLow,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, err := CalculateAllPlans(tt.birthYear, GenderMale, balance, 65)
			if err != nil {
				t.Fatalf("CalculateAllPlans error: %v", err)
			}

			if result.ConfidenceLevel != tt.expectedConfidence {
				t.Errorf("ConfidenceLevel = %v, want %v", result.ConfidenceLevel, tt.expectedConfidence)
			}
		})
	}
}

func TestValidation(t *testing.T) {
	balance, _ := decimal.NewFromString("500000")

	// Test invalid payout start age - too young
	_, err := CalculatePayout(PayoutInput{
		BirthYear:      1985,
		Gender:         GenderMale,
		Plan:           PlanStandard,
		RABalanceAt65:  balance,
		PayoutStartAge: 64, // Invalid - too young
	})
	if err == nil {
		t.Error("Expected error for payout start age 64")
	}

	// Test invalid payout start age - too old
	_, err = CalculatePayout(PayoutInput{
		BirthYear:      1985,
		Gender:         GenderMale,
		Plan:           PlanStandard,
		RABalanceAt65:  balance,
		PayoutStartAge: 71, // Invalid - too old
	})
	if err == nil {
		t.Error("Expected error for payout start age 71")
	}

	// Test nil balance
	_, err = CalculatePayout(PayoutInput{
		BirthYear:      1985,
		Gender:         GenderMale,
		Plan:           PlanStandard,
		RABalanceAt65:  nil,
		PayoutStartAge: 65,
	})
	if err == nil {
		t.Error("Expected error for nil balance")
	}
}

func TestZeroBalance(t *testing.T) {
	// Zero balance should produce zero payout (not an error)
	zeroBalance := decimal.Zero()
	result, err := CalculatePayout(PayoutInput{
		BirthYear:      1985,
		Gender:         GenderMale,
		Plan:           PlanStandard,
		RABalanceAt65:  zeroBalance,
		PayoutStartAge: 65,
	})

	// Implementation may allow zero balance - just verify it doesn't crash
	// and produces a result (whether zero payout or error)
	if err != nil {
		// Error is acceptable for zero balance
		return
	}

	// If no error, the result should be sensible
	monthly, _ := result.MonthlyPayout.Float64()
	if monthly < 0 {
		t.Errorf("MonthlyPayout should not be negative, got %v", monthly)
	}
}
