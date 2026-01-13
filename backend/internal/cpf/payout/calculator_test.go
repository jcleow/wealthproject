package payout

import (
	"testing"

	"financial-chat-system/backend/internal/decimal"
)

// decimalEquals compares a decimal result against an expected string value
func decimalEquals(got *decimal.Decimal, wantStr string) bool {
	want := decimal.MustFromString(wantStr)
	return got.Cmp(want) == 0
}

func TestCalculatePayout_MaleStandard_CohortBased(t *testing.T) {
	// Arrange - test cases
	// CPF LIFE Standard Plan payouts estimated using regression model
	// Model coefficients vary by birth year cohort (affects life expectancy assumptions)
	// Regression formula: payout = intercept + (balance × balanceCoef) + (defermentYears × defermentCoef)
	tests := []struct {
		name           string
		birthYear      int
		balance        string
		payoutStartAge int
		want           string // Exact expected monthly payout from regression model (as decimal string)
	}{
		{
			// 1985 male: ~40 years old in 2025, payouts start 2050
			// $500k balance, Standard plan at 65
			// Regression output: $5,334.03/month
			name:           "1985 male $500k standard age 65",
			birthYear:      1985,
			balance:        "500000",
			payoutStartAge: 65,
			want:           "5334.03",
		},
		{
			// 1970 male: ~55 years old in 2025, payouts start 2035
			// $400k balance, older cohort has different coefficients
			// Regression output: $2,831.17/month
			name:           "1970 male $400k standard age 65",
			birthYear:      1970,
			balance:        "400000",
			payoutStartAge: 65,
			want:           "2831.17",
		},
		{
			// 1990 male: ~35 years old in 2025, payouts start 2055
			// $600k balance, younger cohort
			// Regression output: $7,082.65/month
			name:           "1990 male $600k standard age 65",
			birthYear:      1990,
			balance:        "600000",
			payoutStartAge: 65,
			want:           "7082.65",
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
			if !decimalEquals(result.MonthlyPayout, tt.want) {
				t.Errorf("MonthlyPayout = %s, want %s", result.MonthlyPayout.String(), tt.want)
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
		want           string // Exact expected monthly payout from regression model (as decimal string)
	}{
		{
			// 1990 female: same parameters as male comparison
			// $600k balance, Standard plan at 65
			// Female has higher payout than male ($7,082.65) due to different coefficients
			// Regression output: $7,411.68/month
			name:           "1990 female $600k standard age 65",
			birthYear:      1990,
			balance:        "600000",
			payoutStartAge: 65,
			want:           "7411.68",
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
			if !decimalEquals(result.MonthlyPayout, tt.want) {
				t.Errorf("MonthlyPayout = %s, want %s", result.MonthlyPayout.String(), tt.want)
			}
		})
	}
}

func TestCalculatePayout_Deferment_CohortBased(t *testing.T) {
	// Arrange
	// Testing the CPF LIFE deferment bonus: delaying payout increases monthly amount
	// Regression model applies deferment coefficient for each year of delay (age 65→70)
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
	// Expected exact values from regression model:
	// Age 65 payout: $5,334.03/month
	// Age 70 payout: $7,200.94/month
	// Increase ratio: 7200.94 / 5334.03 = 1.35 (35% increase)
	wantAge65 := "5334.03"
	wantAge70 := "7200.94"

	// Act
	resultAge65, err := CalculatePayout(inputAge65)
	if err != nil {
		t.Fatalf("CalculatePayout age 65 error: %v", err)
	}
	resultAge70, err := CalculatePayout(inputAge70)
	if err != nil {
		t.Fatalf("CalculatePayout age 70 error: %v", err)
	}

	// Assert - Verify exact payout values
	if !decimalEquals(resultAge65.MonthlyPayout, wantAge65) {
		t.Errorf("Age 65 payout = %s, want %s", resultAge65.MonthlyPayout.String(), wantAge65)
	}
	if !decimalEquals(resultAge70.MonthlyPayout, wantAge70) {
		t.Errorf("Age 70 payout = %s, want %s", resultAge70.MonthlyPayout.String(), wantAge70)
	}

	// Assert - Verify deferment increases payout (sanity check)
	if resultAge70.MonthlyPayout.Cmp(resultAge65.MonthlyPayout) <= 0 {
		t.Errorf("Age 70 payout (%s) should be greater than age 65 payout (%s)",
			resultAge70.MonthlyPayout.String(), resultAge65.MonthlyPayout.String())
	}
}

func TestCalculateAllPlans_CohortBased(t *testing.T) {
	// Arrange
	// CPF LIFE offers 3 plans with different payout structures:
	// - Standard: Highest initial payout, lower bequest
	// - Basic: Medium initial payout, higher bequest
	// - Escalating: Lowest initial payout, increases 2% yearly
	balance, _ := decimal.NewFromString("500000")

	// Expected exact values from regression model (1985 male, $500k, age 65):
	wantStandard := "5334.03"
	wantBasic := "5245.45"
	wantEscalating := "4646.34"
	wantAt75 := "5663.86" // Escalating at age 75 (10 years of 2% growth)
	wantAt85 := "6904.22" // Escalating at age 85 (20 years of 2% growth)

	// Act
	result, err := CalculateAllPlans(1985, GenderMale, balance, 65)

	// Assert
	if err != nil {
		t.Fatalf("CalculateAllPlans error: %v", err)
	}

	// Assert - Verify exact payout values for each plan
	if !decimalEquals(result.Standard.MonthlyPayout, wantStandard) {
		t.Errorf("Standard payout = %s, want %s", result.Standard.MonthlyPayout.String(), wantStandard)
	}
	if !decimalEquals(result.Basic.MonthlyPayout, wantBasic) {
		t.Errorf("Basic payout = %s, want %s", result.Basic.MonthlyPayout.String(), wantBasic)
	}
	if !decimalEquals(result.Escalating.MonthlyPayout, wantEscalating) {
		t.Errorf("Escalating payout = %s, want %s", result.Escalating.MonthlyPayout.String(), wantEscalating)
	}
	if !decimalEquals(result.Escalating.PayoutAt75, wantAt75) {
		t.Errorf("Escalating at 75 = %s, want %s", result.Escalating.PayoutAt75.String(), wantAt75)
	}
	if !decimalEquals(result.Escalating.PayoutAt85, wantAt85) {
		t.Errorf("Escalating at 85 = %s, want %s", result.Escalating.PayoutAt85.String(), wantAt85)
	}

	// Assert - Verify ordering: Standard > Basic > Escalating (sanity check)
	if result.Standard.MonthlyPayout.Cmp(result.Basic.MonthlyPayout) <= 0 ||
		result.Basic.MonthlyPayout.Cmp(result.Escalating.MonthlyPayout) <= 0 {
		t.Errorf("Expected Standard > Basic > Escalating, got: standard=%s, basic=%s, escalating=%s",
			result.Standard.MonthlyPayout.String(), result.Basic.MonthlyPayout.String(), result.Escalating.MonthlyPayout.String())
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
