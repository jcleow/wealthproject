package payout

import (
	"testing"

	"financial-chat-system/backend/internal/decimal"
)

func TestCalculatePayout_MaleStandard_CohortBased(t *testing.T) {
	// Arrange - test cases
	// CPF LIFE Standard Plan payouts estimated using regression model
	// Model coefficients vary by birth year cohort (affects life expectancy assumptions)
	// Formula approximation: Monthly payout ≈ f(balance, birth_year, gender, plan, start_age)
	tests := []struct {
		name           string
		birthYear      int
		balance        string
		payoutStartAge int
		wantMin        float64 // Minimum expected monthly payout
		wantMax        float64 // Maximum expected monthly payout (for tolerance)
	}{
		{
			// 1985 male: ~40 years old in 2025, payouts start 2050
			// $500k balance, Standard plan at 65
			// Payout rate ≈ 1.07%/month → $500,000 × 0.0107 ≈ $5,334/month
			name:           "1985 male $500k standard age 65",
			birthYear:      1985,
			balance:        "500000",
			payoutStartAge: 65,
			wantMin:        5200,
			wantMax:        5500,
		},
		{
			// 1970 male: ~55 years old in 2025, payouts start 2035
			// $400k balance, older cohort has lower payout rate due to longer life expectancy
			// Payout rate ≈ 0.71%/month → $400,000 × 0.0071 ≈ $2,831/month
			name:           "1970 male $400k standard age 65",
			birthYear:      1970,
			balance:        "400000",
			payoutStartAge: 65,
			wantMin:        2600,
			wantMax:        3000,
		},
		{
			// 1990 male: ~35 years old in 2025, payouts start 2055
			// $600k balance, younger cohort
			// Payout rate ≈ 1.15%/month → $600,000 × 0.0115 ≈ $6,872/month
			name:           "1990 male $600k standard age 65",
			birthYear:      1990,
			balance:        "600000",
			payoutStartAge: 65,
			wantMin:        6700,
			wantMax:        7100,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Arrange
			balance, _ := decimal.NewFromString(tt.balance)
			input := PayoutInput{
				BirthYear:      tt.birthYear,
				Gender:         GenderMale,
				Plan:           PlanStandard,
				RABalanceAt65:  balance,
				PayoutStartAge: tt.payoutStartAge,
			}

			// Act
			result, err := CalculatePayout(input)

			// Assert
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

func TestCalculatePayout_FemaleStandard_CohortBased(t *testing.T) {
	// Arrange - test cases
	// Females typically have higher monthly payouts than males for the same balance
	// because of different life expectancy assumptions in CPF LIFE calculations
	tests := []struct {
		name           string
		birthYear      int
		balance        string
		payoutStartAge int
		wantMin        float64
		wantMax        float64
	}{
		{
			// 1990 female: same parameters as male comparison
			// $600k balance, Standard plan at 65
			// Female payout rate ≈ 1.24%/month (higher than male 1.15%)
			// → $600,000 × 0.0124 ≈ $7,440/month
			name:           "1990 female $600k standard age 65",
			birthYear:      1990,
			balance:        "600000",
			payoutStartAge: 65,
			wantMin:        7200,
			wantMax:        7600,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Arrange
			balance, _ := decimal.NewFromString(tt.balance)
			input := PayoutInput{
				BirthYear:      tt.birthYear,
				Gender:         GenderFemale,
				Plan:           PlanStandard,
				RABalanceAt65:  balance,
				PayoutStartAge: tt.payoutStartAge,
			}

			// Act
			result, err := CalculatePayout(input)

			// Assert
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

func TestCalculatePayout_Deferment_CohortBased(t *testing.T) {
	// Arrange
	// Testing the CPF LIFE deferment bonus: delaying payout increases monthly amount
	// Each year of deferment (age 65→70) adds ~7% (non-compounded)
	// Total 5-year deferment: +35% increase (not compounded)
	balance, _ := decimal.NewFromString("500000")
	inputAge65 := PayoutInput{
		BirthYear:      1985,
		Gender:         GenderMale,
		Plan:           PlanStandard,
		RABalanceAt65:  balance,
		PayoutStartAge: 65,
	}
	inputAge70 := PayoutInput{
		BirthYear:      1985,
		Gender:         GenderMale,
		Plan:           PlanStandard,
		RABalanceAt65:  balance,
		PayoutStartAge: 70,
	}
	// Computation: Expected increase ratio after 5 years deferment
	// Age 65 payout ≈ $5,334/month
	// Age 70 payout ≈ $5,334 × 1.35 ≈ $7,201/month (+35% non-compounded)
	// Minimum expected ratio = 1.30 (30% increase for some tolerance)
	expectedMinIncrease := 1.30

	// Act
	resultAge65, err := CalculatePayout(inputAge65)
	if err != nil {
		t.Fatalf("CalculatePayout age 65 error: %v", err)
	}
	resultAge70, err := CalculatePayout(inputAge70)
	if err != nil {
		t.Fatalf("CalculatePayout age 70 error: %v", err)
	}

	// Assert - Deferring payout should increase monthly amount
	monthly65, _ := resultAge65.MonthlyPayout.Float64()
	monthly70, _ := resultAge70.MonthlyPayout.Float64()
	actualIncrease := monthly70 / monthly65

	if actualIncrease < expectedMinIncrease {
		t.Errorf("Age 70 payout (%v) should be at least %.0f%% higher than age 65 (%v), actual increase: %.2fx",
			monthly70, (expectedMinIncrease-1)*100, monthly65, actualIncrease)
	}
}

func TestCalculateAllPlans_CohortBased(t *testing.T) {
	// Arrange
	// CPF LIFE offers 3 plans with different payout structures:
	// - Standard: Highest initial payout, lower bequest
	// - Basic: Medium initial payout, higher bequest
	// - Escalating: Lowest initial payout, increases 2% yearly
	balance, _ := decimal.NewFromString("500000")

	// Act
	result, err := CalculateAllPlans(1985, GenderMale, balance, 65)

	// Assert
	if err != nil {
		t.Fatalf("CalculateAllPlans error: %v", err)
	}

	// Assert - Verify all plans are calculated
	standardMonthly, _ := result.Standard.MonthlyPayout.Float64()
	basicMonthly, _ := result.Basic.MonthlyPayout.Float64()
	escalatingMonthly, _ := result.Escalating.MonthlyPayout.Float64()

	// Computation: Expected ordering of initial payouts
	// Standard > Basic > Escalating (at start)
	// Standard ≈ $5,334, Basic ≈ $4,800, Escalating ≈ $4,200
	if standardMonthly <= basicMonthly || standardMonthly <= escalatingMonthly {
		t.Errorf("Standard plan should have highest initial payout: standard=%v, basic=%v, escalating=%v",
			standardMonthly, basicMonthly, escalatingMonthly)
	}

	// Assert - Escalating should have lowest initial payout
	if escalatingMonthly >= basicMonthly {
		t.Errorf("Escalating plan should have lowest initial payout: escalating=%v, basic=%v",
			escalatingMonthly, basicMonthly)
	}

	// Assert - Escalating should have payoutAt75 and payoutAt85 > initial
	// Escalating increases 2% per year:
	// At 75 (10 years): initial × (1.02)^10 ≈ initial × 1.22
	// At 85 (20 years): initial × (1.02)^20 ≈ initial × 1.49
	at75, _ := result.Escalating.PayoutAt75.Float64()
	at85, _ := result.Escalating.PayoutAt85.Float64()

	if at75 <= escalatingMonthly {
		t.Errorf("Escalating payoutAt75 (%v) should be > initial (%v)", at75, escalatingMonthly)
	}
	if at85 <= at75 {
		t.Errorf("Escalating payoutAt85 (%v) should be > payoutAt75 (%v)", at85, at75)
	}
}

func TestConfidenceLevel_CohortBased(t *testing.T) {
	// Arrange - common setup and test cases
	// Confidence level indicates how reliable the payout estimate is:
	// - High: Birth year ≤ 1970 (close to or past retirement, better data)
	// - Moderate: Birth year 1970-1990 (medium-term projection)
	// - Low: Birth year > 1990 (30+ years to retirement, high uncertainty)
	balance, _ := decimal.NewFromString("500000")
	tests := []struct {
		name               string
		birthYear          int
		expectedConfidence ConfidenceLevel
	}{
		{
			// 1965: ~60 years old in 2025, near retirement
			// High confidence due to shorter projection period
			name:               "1965 should be high confidence",
			birthYear:          1965,
			expectedConfidence: ConfidenceHigh,
		},
		{
			// 1980: ~45 years old in 2025, 20 years to retirement
			// Moderate confidence due to medium-term projection
			name:               "1980 should be moderate confidence",
			birthYear:          1980,
			expectedConfidence: ConfidenceModerate,
		},
		{
			// 1995: ~30 years old in 2025, 35 years to retirement
			// Low confidence due to long-term projection uncertainty
			name:               "1995 should be low confidence",
			birthYear:          1995,
			expectedConfidence: ConfidenceLow,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Act
			result, err := CalculateAllPlans(tt.birthYear, GenderMale, balance, 65)

			// Assert
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
	// Arrange
	// CPF LIFE validation rules:
	// - Payout start age must be between 65 and 70 (inclusive)
	// - Balance cannot be nil
	balance, _ := decimal.NewFromString("500000")

	t.Run("invalid payout start age - too young", func(t *testing.T) {
		// Arrange
		// Minimum payout start age is 65 (Payout Eligibility Age)
		input := PayoutInput{
			BirthYear:      1985,
			Gender:         GenderMale,
			Plan:           PlanStandard,
			RABalanceAt65:  balance,
			PayoutStartAge: 64, // Invalid: 64 < 65 minimum
		}

		// Act
		_, err := CalculatePayout(input)

		// Assert
		if err == nil {
			t.Error("Expected error for payout start age 64")
		}
	})

	t.Run("invalid payout start age - too old", func(t *testing.T) {
		// Arrange
		// Maximum payout start age is 70 (deferment limit)
		input := PayoutInput{
			BirthYear:      1985,
			Gender:         GenderMale,
			Plan:           PlanStandard,
			RABalanceAt65:  balance,
			PayoutStartAge: 71, // Invalid: 71 > 70 maximum
		}

		// Act
		_, err := CalculatePayout(input)

		// Assert
		if err == nil {
			t.Error("Expected error for payout start age 71")
		}
	})

	t.Run("nil balance", func(t *testing.T) {
		// Arrange
		// Balance is required for payout calculation
		input := PayoutInput{
			BirthYear:      1985,
			Gender:         GenderMale,
			Plan:           PlanStandard,
			RABalanceAt65:  nil, // Invalid: nil balance
			PayoutStartAge: 65,
		}

		// Act
		_, err := CalculatePayout(input)

		// Assert
		if err == nil {
			t.Error("Expected error for nil balance")
		}
	})
}

func TestZeroBalance(t *testing.T) {
	// Arrange
	// Edge case: $0 RA balance at 65
	// Computation: $0 × any payout rate = $0/month
	// Result should be $0 payout (or error, implementation-dependent)
	zeroBalance := decimal.Zero()
	input := PayoutInput{
		BirthYear:      1985,
		Gender:         GenderMale,
		Plan:           PlanStandard,
		RABalanceAt65:  zeroBalance,
		PayoutStartAge: 65,
	}

	// Act
	result, err := CalculatePayout(input)

	// Assert - Implementation may allow zero balance, just verify it doesn't crash
	if err != nil {
		// Error is acceptable for zero balance
		return
	}

	// Assert - If no error, the result should be sensible (≥$0)
	monthly, _ := result.MonthlyPayout.Float64()
	if monthly < 0 {
		t.Errorf("MonthlyPayout should not be negative, got %v", monthly)
	}
}
