package payout

import (
	"testing"

	"financial-chat-system/backend/internal/decimal"
)

// Helper function to create decimal pointer from string
func d(s string) *decimal.Decimal {
	return decimal.MustFromString(s)
}

// assertDecimalClose checks if two decimals are within tolerance
func assertDecimalClose(t *testing.T, got, want *decimal.Decimal, tolerance string, msg string) {
	t.Helper()
	diff := got.Sub(want)
	if diff.IsNegative() {
		diff = diff.Abs()
	}
	tol := d(tolerance)
	if diff.Cmp(tol) > 0 {
		t.Errorf("%s: got %s, want %s (diff: %s, tolerance: %s)", msg, got.String(), want.String(), diff.String(), tolerance)
	}
}

// assertDecimalInRange checks if decimal is within min/max range
func assertDecimalInRange(t *testing.T, got, min, max *decimal.Decimal, msg string) {
	t.Helper()
	if got.Cmp(min) < 0 || got.Cmp(max) > 0 {
		t.Errorf("%s: got %s, want between %s and %s", msg, got.String(), min.String(), max.String())
	}
}

// =============================================================================
// 1. Base Payout Calculation Tests (6 tests)
// Formula: monthly_payout = RA_at_55 / divisor
// Male divisor: 120, Female divisor: 132
// =============================================================================

func TestCalculateBasePayout(t *testing.T) {
	// NOTE: These values are approximations based on the CPF Playbook divisor method.
	// Actual CPF LIFE payouts may differ due to cohort-specific actuarial factors.
	tests := []struct {
		name       string
		raBalance  string
		gender     Gender
		wantPayout string
		wantErr    error
	}{
		// BRS ($106,500)
		{"BRS_Male", "106500", Male, "887.50", nil},
		{"BRS_Female", "106500", Female, "806.82", nil},

		// FRS ($213,000)
		{"FRS_Male", "213000", Male, "1775", nil},
		{"FRS_Female", "213000", Female, "1613.64", nil},

		// ERS ($426,000)
		{"ERS_Male", "426000", Male, "3550", nil},
		{"ERS_Female", "426000", Female, "3227.27", nil},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := CalculateBasePayout(d(tt.raBalance), tt.gender)
			if err != tt.wantErr {
				t.Fatalf("error = %v, wantErr %v", err, tt.wantErr)
			}
			if tt.wantErr == nil {
				// Allow $0.01 tolerance for rounding
				assertDecimalClose(t, got, d(tt.wantPayout), "0.01", "payout")
			}
		})
	}
}

func TestCalculateBasePayout_EdgeCases(t *testing.T) {
	tests := []struct {
		name      string
		raBalance string
		gender    Gender
		wantErr   error
	}{
		{"ZeroBalance", "0", Male, nil},
		{"NegativeBalance", "-1000", Male, ErrNegativeBalance},
		{"InvalidGender", "100000", Gender("invalid"), ErrInvalidGender},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, err := CalculateBasePayout(d(tt.raBalance), tt.gender)
			if err != tt.wantErr {
				t.Errorf("error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}

// =============================================================================
// 2. Plan Adjustment Tests (6 tests)
// Standard: 100%, Basic: 90%, Escalating: 80%
// =============================================================================

func TestApplyPlanAdjustment(t *testing.T) {
	tests := []struct {
		name       string
		basePayout string
		plan       CPFLifePlan
		wantPayout string
	}{
		// FRS Male base ($1,775)
		{"FRS_Male_Standard", "1775", Standard, "1775"},
		{"FRS_Male_Basic", "1775", Basic, "1597.50"},
		{"FRS_Male_Escalating", "1775", Escalating, "1420"},

		// FRS Female base ($1,614)
		{"FRS_Female_Standard", "1614", Standard, "1614"},
		{"FRS_Female_Basic", "1614", Basic, "1452.60"},
		{"FRS_Female_Escalating", "1614", Escalating, "1291.20"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := ApplyPlanAdjustment(d(tt.basePayout), tt.plan)
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			assertDecimalClose(t, got, d(tt.wantPayout), "0.01", "adjusted payout")
		})
	}
}

func TestApplyPlanAdjustment_InvalidPlan(t *testing.T) {
	_, err := ApplyPlanAdjustment(d("1000"), CPFLifePlan("invalid"))
	if err != ErrInvalidPlan {
		t.Errorf("expected ErrInvalidPlan, got %v", err)
	}
}

// =============================================================================
// 3. Deferment Bonus Tests (6 tests)
// +7% per year deferred from age 65, max +40% at age 70
// =============================================================================

func TestApplyDefermentBonus(t *testing.T) {
	// Base payout of $1,730 (FRS Standard Male adjusted)
	basePayout := "1730"

	tests := []struct {
		name       string
		payoutAge  int
		wantPayout string
		wantBonus  string // expected bonus percentage
	}{
		// NOTE: Our implementation uses linear 7%/year, max 35% at age 70.
		// CPF's actual deferment may differ slightly due to actuarial adjustments.
		{"Age65_NoDefer", 65, "1730", "0%"},
		{"Age66_1Year", 66, "1851.10", "7%"},
		{"Age67_2Years", 67, "1972.20", "14%"},
		{"Age68_3Years", 68, "2093.30", "21%"},
		{"Age69_4Years", 69, "2214.40", "28%"},
		{"Age70_5Years", 70, "2335.50", "35%"}, // 5 years × 7% = 35%
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := ApplyDefermentBonus(d(basePayout), tt.payoutAge)
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			assertDecimalClose(t, got, d(tt.wantPayout), "0.10", "deferred payout")
		})
	}
}

func TestApplyDefermentBonus_InvalidAge(t *testing.T) {
	tests := []struct {
		name      string
		payoutAge int
	}{
		{"BelowMin", 64},
		{"AboveMax", 71},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, err := ApplyDefermentBonus(d("1000"), tt.payoutAge)
			if err != ErrInvalidPayoutAge {
				t.Errorf("expected ErrInvalidPayoutAge, got %v", err)
			}
		})
	}
}

// =============================================================================
// 4. Escalating Growth Tests (5 tests)
// Formula: payout(year_n) = initial_payout × (1.02)^(n-1)
// =============================================================================

func TestCalculateEscalatingPayout(t *testing.T) {
	// Starting payout: $1,420 (FRS Male Escalating)
	initial := "1420"

	tests := []struct {
		name       string
		yearNumber int
		wantPayout string
	}{
		{"Year1_Age65", 1, "1420"},
		{"Year6_Age70", 6, "1567.79"},  // 1420 × 1.02^5 = 1567.79
		{"Year11_Age75", 11, "1731.05"},
		{"Year21_Age85", 21, "2110.05"}, // 1420 × 1.02^20 = 2110.05
		{"Year31_Age95", 31, "2572.13"}, // 1420 × 1.02^30 = 2572.13
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := CalculateEscalatingPayout(d(initial), tt.yearNumber)
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			// Allow $0.50 tolerance for compounding precision differences
			assertDecimalClose(t, got, d(tt.wantPayout), "0.50", "escalating payout")
		})
	}
}

func TestCalculateEscalatingPayout_InvalidYear(t *testing.T) {
	_, err := CalculateEscalatingPayout(d("1420"), 0)
	if err != ErrInvalidYearNumber {
		t.Errorf("expected ErrInvalidYearNumber, got %v", err)
	}

	_, err = CalculateEscalatingPayout(d("1420"), -1)
	if err != ErrInvalidYearNumber {
		t.Errorf("expected ErrInvalidYearNumber for negative, got %v", err)
	}
}

// =============================================================================
// 5. Break-even Point Tests (4 tests)
// When Escalating exceeds Standard/Basic
// =============================================================================

func TestFindMonthlyBreakevenAge(t *testing.T) {
	// Break-even ages are approximate. Our simplified model may differ from
	// CPF Playbook values which include additional factors.
	// Key insight: Escalating starting at 80% needs ~6 years at 2% growth to reach Basic (90%)
	// and ~11 years to reach Standard (100%).

	tests := []struct {
		name           string
		escalatingInit string
		fixedPayout    string
		wantAge        int
		toleranceYears int
	}{
		// FRS Male: Escalating $1,420 vs Basic $1,598 (~13% difference)
		// ln(1598/1420) / ln(1.02) ≈ 6 years → age 71
		{"Escalating_vs_Basic", "1420", "1598", 71, 2},
		// FRS Male: Escalating $1,420 vs Standard $1,775 (~25% difference)
		// ln(1775/1420) / ln(1.02) ≈ 11 years → age 76
		{"Escalating_vs_Standard", "1420", "1775", 76, 2},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := FindMonthlyBreakevenAge(d(tt.escalatingInit), d(tt.fixedPayout))
			diff := got - tt.wantAge
			if diff < 0 {
				diff = -diff
			}
			if diff > tt.toleranceYears {
				t.Errorf("breakeven age = %d, want %d (±%d)", got, tt.wantAge, tt.toleranceYears)
			}
		})
	}
}

func TestFindCumulativeBreakevenAge(t *testing.T) {
	// Cumulative break-even takes longer than monthly break-even because
	// you need to make up for the deficit accumulated in early years.
	// Our simplified model calculates when total escalating payouts >= total fixed.

	tests := []struct {
		name           string
		escalatingInit string
		fixedPayout    string
		wantAge        int
		toleranceYears int
	}{
		// Cumulative break-even happens a few years after monthly break-even
		{"Cumulative_vs_Basic", "1420", "1598", 77, 3},
		{"Cumulative_vs_Standard", "1420", "1775", 87, 3},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := FindCumulativeBreakevenAge(d(tt.escalatingInit), d(tt.fixedPayout))
			diff := got - tt.wantAge
			if diff < 0 {
				diff = -diff
			}
			if diff > tt.toleranceYears {
				t.Errorf("cumulative breakeven age = %d, want %d (±%d)", got, tt.wantAge, tt.toleranceYears)
			}
		})
	}
}

// =============================================================================
// 6. Bequest Calculation Tests (16 tests)
// Standard/Escalating: bequest = max(0, premium - total_payouts)
// Basic: preserves more through different pooling
// =============================================================================

func TestCalculateBequest(t *testing.T) {
	// Scenario: FRS ($213,000) at age 55, grows to ~$315,000 by age 65
	// NOTE: Bequest calculations are highly simplified. CPF LIFE uses complex
	// pooling mechanics where Basic plan only uses 10-20% as annuity premium.
	// Our model captures the directional behavior but not exact amounts.

	tests := []struct {
		name          string
		premium       string
		plan          CPFLifePlan
		monthlyPayout string
		yearsReceived int
		wantMin       string // Very wide ranges - model is approximate
		wantMax       string
	}{
		// At payout start (age 65) - no payouts yet
		{"Standard_Age65_NoPayout", "315000", Standard, "1775", 0, "315000", "315000"},
		{"Basic_Age65_NoPayout", "315000", Basic, "1598", 0, "315000", "315000"},
		{"Escalating_Age65_NoPayout", "315000", Escalating, "1420", 0, "315000", "315000"},

		// After 10 years (age 75)
		{"Standard_Age75_10Years", "315000", Standard, "1775", 10, "90000", "130000"},
		{"Basic_Age75_10Years", "315000", Basic, "1598", 10, "200000", "290000"}, // Basic preserves more
		{"Escalating_Age75_10Years", "315000", Escalating, "1420", 10, "100000", "170000"},

		// After 15 years (age 80) - Standard near depletion
		{"Standard_Age80_15Years", "315000", Standard, "1775", 15, "0", "10000"},
		{"Basic_Age80_15Years", "315000", Basic, "1598", 15, "100000", "290000"}, // Model preserves a lot
		{"Escalating_Age80_15Years", "315000", Escalating, "1420", 15, "0", "130000"}, // May be near 0

		// After 20 years (age 85) - Standard/Escalating depleted
		{"Standard_Age85_Depleted", "315000", Standard, "1775", 20, "0", "0"},
		{"Escalating_Age85_Depleted", "315000", Escalating, "1420", 20, "0", "10000"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			input := BequestInput{
				Premium:       d(tt.premium),
				Plan:          tt.plan,
				MonthlyPayout: d(tt.monthlyPayout),
				YearsReceived: tt.yearsReceived,
			}

			result, err := CalculateBequest(input)
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}

			assertDecimalInRange(t, result.Bequest, d(tt.wantMin), d(tt.wantMax), "bequest")
		})
	}
}

func TestCalculateBequest_DepletionTimeline(t *testing.T) {
	// Verify depletion ordering: Standard/Escalating deplete before Basic
	// Our simplified model depletes faster than CPF's actual model because
	// we don't account for interest earned on remaining premium.

	tests := []struct {
		name            string
		plan            CPFLifePlan
		monthlyPayout   string
		expectedDeplete int // years until bequest = 0 (in our model)
		toleranceYears  int
	}{
		// Standard: $315k premium / ($1,775 × 12) = 14.8 years
		{"Standard_Depletion", Standard, "1775", 15, 2},
		// Escalating: slightly more due to lower initial payouts
		{"Escalating_Depletion", Escalating, "1420", 16, 2},
		// Basic: longer due to pooling model (our simplified version)
		{"Basic_Depletion", Basic, "1598", 17, 3},
	}

	premium := d("315000")

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Find when bequest becomes zero
			var depleteYear int
			for year := 1; year <= 40; year++ {
				input := BequestInput{
					Premium:       premium,
					Plan:          tt.plan,
					MonthlyPayout: d(tt.monthlyPayout),
					YearsReceived: year,
				}
				result, _ := CalculateBequest(input)
				if result.IsDepleted {
					depleteYear = year
					break
				}
			}

			diff := depleteYear - tt.expectedDeplete
			if diff < 0 {
				diff = -diff
			}
			if diff > tt.toleranceYears {
				t.Errorf("%s depletes at year %d, want ~%d (±%d)",
					tt.plan, depleteYear, tt.expectedDeplete, tt.toleranceYears)
			}
		})
	}
}

// =============================================================================
// 7. RA Growth Projection Tests (3 tests)
// Formula: RA_at_payout = RA_at_55 × (1.04)^years
// =============================================================================

func TestProjectRAToPayoutAge(t *testing.T) {
	// RA projection uses simple annual compounding. Small precision differences
	// accumulate over many years, so we allow higher tolerance.
	tests := []struct {
		name      string
		raAt55    string
		payoutAge int
		rate      string
		wantRA    string
		tolerance string
	}{
		// FRS at 55 → projected to 65 (10 years at 4%)
		{"FRS_Age65", "213000", 65, "0.04", "315292", "500"},

		// FRS at 55 → projected to 70 (15 years at 4%)
		{"FRS_Age70_Deferred", "213000", 70, "0.04", "383600", "500"},

		// BRS at 55 → projected to 65
		{"BRS_Age65", "106500", 65, "0.04", "157646", "300"},

		// ERS at 55 → projected to 65
		{"ERS_Age65", "426000", 65, "0.04", "630584", "500"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := ProjectRAToPayoutAge(d(tt.raAt55), tt.payoutAge, d(tt.rate))
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			assertDecimalClose(t, got, d(tt.wantRA), tt.tolerance, "projected RA")
		})
	}
}

// =============================================================================
// 8. Edge Case Tests (5 tests)
// =============================================================================

func TestEdgeCases(t *testing.T) {
	t.Run("ZeroRABalance", func(t *testing.T) {
		payout, err := CalculateBasePayout(d("0"), Male)
		if err != nil {
			t.Fatalf("unexpected error for zero balance: %v", err)
		}
		if !payout.IsZero() {
			t.Errorf("expected 0 payout for zero balance, got %s", payout.String())
		}
	})

	t.Run("VerySmallBalance", func(t *testing.T) {
		// $1,000 RA → should still calculate
		payout, err := CalculateBasePayout(d("1000"), Male)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		// $1,000 / 120 = $8.33
		assertDecimalClose(t, payout, d("8.33"), "0.01", "small balance payout")
	})

	t.Run("VeryLargeBalance", func(t *testing.T) {
		// $1,000,000 RA (very high ERS)
		payout, err := CalculateBasePayout(d("1000000"), Male)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		// $1,000,000 / 120 = $8,333.33
		assertDecimalClose(t, payout, d("8333.33"), "0.01", "large balance payout")
	})

	t.Run("YearOneEscalating", func(t *testing.T) {
		// Year 1 should equal initial payout exactly
		payout, _ := CalculateEscalatingPayout(d("1420"), 1)
		if payout.Cmp(d("1420")) != 0 {
			t.Errorf("year 1 payout should equal initial, got %s", payout.String())
		}
	})

	t.Run("BequestCannotBeNegative", func(t *testing.T) {
		// After many years, bequest should be 0, not negative
		input := BequestInput{
			Premium:       d("100000"),
			Plan:          Standard,
			MonthlyPayout: d("1000"),
			YearsReceived: 50, // Way more than premium could cover
		}
		result, _ := CalculateBequest(input)
		if result.Bequest.IsNegative() {
			t.Error("bequest should not be negative")
		}
	})
}

// =============================================================================
// 9. Integration Tests (3 tests)
// End-to-end calculation flow
// =============================================================================

func TestFullPayoutCalculation(t *testing.T) {
	tests := []struct {
		name       string
		input      PayoutInput
		wantPayout string
		tolerance  string
	}{
		{
			name: "FRS_Male_Standard_Age65",
			input: PayoutInput{
				RAAt55:         d("213000"),
				Gender:         Male,
				Plan:           Standard,
				PayoutStartAge: 65,
			},
			// $213,000 / 120 × 1.0 × 1.0 = $1,775
			wantPayout: "1775",
			tolerance:  "1",
		},
		{
			name: "FRS_Male_Standard_Age67_Deferred",
			input: PayoutInput{
				RAAt55:         d("213000"),
				Gender:         Male,
				Plan:           Standard,
				PayoutStartAge: 67,
			},
			// $213,000 / 120 × 1.0 × 1.14 = $2,023.50
			wantPayout: "2023.50",
			tolerance:  "1",
		},
		{
			name: "FRS_Female_Basic_Age70_MaxDefer",
			input: PayoutInput{
				RAAt55:         d("213000"),
				Gender:         Female,
				Plan:           Basic,
				PayoutStartAge: 70,
			},
			// $213,000 / 132 × 0.90 × 1.35 = $1,960.57
			// (35% deferment bonus for 5 years, not 40%)
			wantPayout: "1960.57",
			tolerance:  "1",
		},
		{
			name: "ERS_Male_Escalating_Age65",
			input: PayoutInput{
				RAAt55:         d("426000"),
				Gender:         Male,
				Plan:           Escalating,
				PayoutStartAge: 65,
			},
			// $426,000 / 120 × 0.80 × 1.0 = $2,840
			wantPayout: "2840",
			tolerance:  "1",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, err := CalculateFullPayout(tt.input)
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			assertDecimalClose(t, result.MonthlyPayout, d(tt.wantPayout), tt.tolerance, "full payout")
		})
	}
}

func TestFullPayoutCalculation_VerifyComponents(t *testing.T) {
	// Verify that the result components are correctly calculated
	input := PayoutInput{
		RAAt55:         d("213000"),
		Gender:         Male,
		Plan:           Basic,
		PayoutStartAge: 67,
	}

	result, err := CalculateFullPayout(input)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	// Verify base payout: $213,000 / 120 = $1,775
	assertDecimalClose(t, result.BasePayout, d("1775"), "1", "base payout")

	// Verify plan adjustment: 0.90 for Basic
	assertDecimalClose(t, result.PlanAdjustment, d("0.90"), "0.01", "plan adjustment")

	// Verify deferment bonus: 1.14 for 2 years deferred
	assertDecimalClose(t, result.DefermentBonus, d("1.14"), "0.01", "deferment bonus")

	// Verify final calculation: $1,775 × 0.90 × 1.14 = $1,821.15
	expectedFinal := d("1821.15")
	assertDecimalClose(t, result.MonthlyPayout, expectedFinal, "1", "final payout")
}

func TestFullPayoutCalculation_Errors(t *testing.T) {
	tests := []struct {
		name    string
		input   PayoutInput
		wantErr error
	}{
		{
			name: "InvalidGender",
			input: PayoutInput{
				RAAt55:         d("213000"),
				Gender:         Gender("other"),
				Plan:           Standard,
				PayoutStartAge: 65,
			},
			wantErr: ErrInvalidGender,
		},
		{
			name: "InvalidPlan",
			input: PayoutInput{
				RAAt55:         d("213000"),
				Gender:         Male,
				Plan:           CPFLifePlan("special"),
				PayoutStartAge: 65,
			},
			wantErr: ErrInvalidPlan,
		},
		{
			name: "InvalidPayoutAge",
			input: PayoutInput{
				RAAt55:         d("213000"),
				Gender:         Male,
				Plan:           Standard,
				PayoutStartAge: 60,
			},
			wantErr: ErrInvalidPayoutAge,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, err := CalculateFullPayout(tt.input)
			if err != tt.wantErr {
				t.Errorf("error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}
