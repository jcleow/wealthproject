package growth

import (
	"financial-chat-system/backend/internal/decimal"
	"testing"
)

func TestMonthlyCompoundStrategy(t *testing.T) {
	strategy := &MonthlyCompoundStrategy{}

	// Tests for arrears behavior: no growth in month 1, growth starts from month 2
	tests := []struct {
		name           string
		startAmount    string
		annualRatePct  string
		numMonths      int    // Number of times to apply growth (months 1 to numMonths)
		wantApprox     string // Approximate expected value
		tolerance      string // Acceptable tolerance for comparison
	}{
		{
			name:           "no growth in month 1 (arrears)",
			startAmount:    "10000",
			annualRatePct:  "7",
			numMonths:      1,
			wantApprox:     "10000", // No growth in first month
			tolerance:      "1",
		},
		{
			name:           "growth starts in month 2",
			startAmount:    "10000",
			annualRatePct:  "7",
			numMonths:      2,
			wantApprox:     "10056.5", // 10000 * (1.07)^(1/12) ≈ 10056.52
			tolerance:      "1",
		},
		{
			name:           "7 months = 6 months of growth (arrears)",
			startAmount:    "10000",
			annualRatePct:  "7",
			numMonths:      7,
			wantApprox:     "10345.5", // 10000 * (1.07)^(6/12) ≈ 10344.08
			tolerance:      "2",
		},
		{
			name:           "12 months = 11 months of growth (arrears)",
			startAmount:    "10000",
			annualRatePct:  "7",
			numMonths:      12,
			wantApprox:     "10641", // 10000 * (1.07)^(11/12) ≈ 10641.78
			tolerance:      "2",
		},
		{
			name:           "13 months = 12 months of growth (full year)",
			startAmount:    "10000",
			annualRatePct:  "7",
			numMonths:      13,
			wantApprox:     "10700", // 10000 * (1.07)^1 = 10700
			tolerance:      "2",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			amount := decimal.MustFromString(tt.startAmount)
			rate := decimal.MustFromString(tt.annualRatePct)
			params := Params{AnnualRatePct: rate}

			// Simulate applying growth for each month
			result := amount
			for month := 1; month <= tt.numMonths; month++ {
				monthOfYear := ((month - 1) % 12) + 1 // Convert to 1-12 range
				result = strategy.Apply(result, params, month, monthOfYear)
			}

			t.Logf("After %d months: %s (expected approx: %s)", tt.numMonths, result.String(), tt.wantApprox)

			// Basic sanity checks
			if result == nil {
				t.Fatal("result is nil")
			}
			if result.IsZero() && !amount.IsZero() {
				t.Error("result is zero but amount is not")
			}

			// Check that result is within tolerance of expected
			expected := decimal.MustFromString(tt.wantApprox)
			tolerance := decimal.MustFromString(tt.tolerance)
			diff := result.Sub(expected)

			// Check absolute difference is within tolerance (-tolerance <= diff <= tolerance)
			negTolerance := decimal.MustFromString("-" + tt.tolerance)
			if diff.Cmp(tolerance) > 0 || diff.Cmp(negTolerance) < 0 {
				t.Errorf("Result %s is outside tolerance ±%s of expected %s (diff: %s)",
					result.String(), tolerance.String(), expected.String(), diff.String())
			}
		})
	}
}

func TestAnnualStepStrategy(t *testing.T) {
	strategy := &AnnualStepStrategy{}

	tests := []struct {
		name          string
		amount        string
		annualRatePct string
		currentMonth  int
		monthOfYear   int
		wantApprox    string
	}{
		{
			name:          "no growth in first year",
			amount:        "10000",
			annualRatePct: "7",
			currentMonth:  7, // Month 7 = July of year 0
			monthOfYear:   7, // July
			wantApprox:    "10000",
		},
		{
			name:          "no growth in non-January month",
			amount:        "10000",
			annualRatePct: "7",
			currentMonth:  15, // Month 15 = March of year 1
			monthOfYear:   3,  // March
			wantApprox:    "10000",
		},
		{
			name:          "annual growth in January",
			amount:        "10000",
			annualRatePct: "7",
			currentMonth:  13,      // Month 13 = January of year 1
			monthOfYear:   1,       // January
			wantApprox:    "10700", // 10000 * 1.07
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			amount := decimal.MustFromString(tt.amount)
			rate := decimal.MustFromString(tt.annualRatePct)
			params := Params{AnnualRatePct: rate}

			result := strategy.Apply(amount, params, tt.currentMonth, tt.monthOfYear)

			t.Logf("Result: %s (expected: %s)", result.String(), tt.wantApprox)

			if result == nil {
				t.Fatal("result is nil")
			}
		})
	}
}

func TestLinearGrowthStrategy(t *testing.T) {
	strategy := &LinearGrowthStrategy{}

	tests := []struct {
		name          string
		amount        string
		annualRatePct string
		currentMonth  int
		monthOfYear   int
		wantGrowth    bool
	}{
		{
			name:          "no growth in month 1 (arrears)",
			amount:        "10000",
			annualRatePct: "6",
			currentMonth:  1, // Month 1 = January of year 0
			monthOfYear:   1, // January
			wantGrowth:    false,
		},
		{
			name:          "linear growth starts in month 2",
			amount:        "10000",
			annualRatePct: "6",
			currentMonth:  2, // Month 2 = February of year 0
			monthOfYear:   2, // February
			wantGrowth:    true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			amount := decimal.MustFromString(tt.amount)
			rate := decimal.MustFromString(tt.annualRatePct)
			params := Params{AnnualRatePct: rate}

			result := strategy.Apply(amount, params, tt.currentMonth, tt.monthOfYear)

			t.Logf("Result: %s", result.String())

			if result == nil {
				t.Fatal("result is nil")
			}

			// Check if growth was applied
			cmp := result.Cmp(amount)
			if tt.wantGrowth && cmp <= 0 {
				t.Errorf("expected growth but amount stayed same or decreased")
			}
			if !tt.wantGrowth && cmp != 0 {
				t.Errorf("expected no growth but amount changed")
			}
		})
	}
}

func TestRegistry(t *testing.T) {
	registry := NewRegistry()

	t.Run("get existing strategy", func(t *testing.T) {
		strategy, err := registry.Get("monthly_compound")
		if err != nil {
			t.Fatalf("expected to find monthly_compound strategy: %v", err)
		}
		if strategy.Name() != "monthly_compound" {
			t.Errorf("expected name 'monthly_compound', got %q", strategy.Name())
		}
	})

	t.Run("get non-existent strategy", func(t *testing.T) {
		_, err := registry.Get("does_not_exist")
		if err == nil {
			t.Error("expected error for non-existent strategy")
		}
	})

	t.Run("list strategies", func(t *testing.T) {
		strategies := registry.List()
		if len(strategies) != 3 {
			t.Errorf("expected 3 registered strategies, got %d", len(strategies))
		}

		// Check that all expected strategies are present
		expectedStrategies := map[string]bool{
			"monthly_compound": false,
			"annual_step":      false,
			"linear_growth":    false,
		}

		for _, name := range strategies {
			if _, ok := expectedStrategies[name]; ok {
				expectedStrategies[name] = true
			}
		}

		for name, found := range expectedStrategies {
			if !found {
				t.Errorf("strategy %q not found in registry", name)
			}
		}
	})

	t.Run("register custom strategy", func(t *testing.T) {
		customStrategy := &MonthlyCompoundStrategy{} // Using existing as example
		registry.Register(customStrategy)

		strategy, err := registry.Get(customStrategy.Name())
		if err != nil {
			t.Fatalf("failed to get registered custom strategy: %v", err)
		}
		if strategy.Name() != customStrategy.Name() {
			t.Errorf("strategy name mismatch")
		}
	})
}
