package growth_test

import (
	"testing"

	"financial-chat-system/backend/internal/decimal"
	"financial-chat-system/backend/internal/financial/growth"
)

func TestCompoundMonthlyStrategy(t *testing.T) {
	strategy := growth.NewCompoundMonthly()

	t.Run("Type", func(t *testing.T) {
		if strategy.Type() != growth.CompoundMonthly {
			t.Errorf("expected type %s, got %s", growth.CompoundMonthly, strategy.Type())
		}
	})

	t.Run("Single month growth", func(t *testing.T) {
		currentValue := decimal.MustFromString("25000")
		rate := decimal.MustFromString("2.5")

		result, err := strategy.Calculate(growth.Params{
			CurrentValue: currentValue,
			Rate:         rate,
			PeriodIndex:  0,
			Frequency:    "monthly",
		})
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}

		// Expected: 25000 * (1.025^(1/12)) rounded to 2dp
		expected := decimal.MustFromString("25051.50")
		if !equalDecimal(result, expected) {
			t.Errorf("got %s, want %s", result.String(), expected.String())
		}
	})

	t.Run("12 months should equal annual rate", func(t *testing.T) {
		amount := decimal.MustFromString("25000.0")
		rate := decimal.MustFromString("2.5")

		// Apply monthly compounding 12 times
		for i := 0; i < 12; i++ {
			var err error
			amount, err = strategy.Calculate(growth.Params{
				CurrentValue: amount,
				Rate:         rate,
				PeriodIndex:  i,
				Frequency:    "monthly",
			})
			if err != nil {
				t.Fatalf("unexpected error at month %d: %v", i, err)
			}
		}

		// Should equal annual growth: 25000 * 1.025 (compounded monthly, rounded to 2dp)
		expected := decimal.MustFromString("25625.00")
		if !equalDecimal(amount, expected) {
			t.Errorf("after 12 months: got %s, want %s", amount.String(), expected.String())
		}
	})
}

func TestAnnualStepStrategy(t *testing.T) {
	strategy := growth.NewAnnualStep()

	t.Run("Type", func(t *testing.T) {
		if strategy.Type() != growth.AnnualStep {
			t.Errorf("expected type %s, got %s", growth.AnnualStep, strategy.Type())
		}
	})

	t.Run("Monthly frequency - Year 0 all months same", func(t *testing.T) {
		baseAmount := decimal.MustFromString("1200.0")
		rate := decimal.MustFromString("3.0")

		for month := 0; month < 12; month++ {
			result, err := strategy.Calculate(growth.Params{
				CurrentValue: baseAmount,
				Rate:         rate,
				PeriodIndex:  month,
				Frequency:    "monthly",
			})
			if err != nil {
				t.Fatalf("unexpected error at month %d: %v", month, err)
			}

			if result.Cmp(baseAmount) != 0 {
				t.Errorf("Month %d: expected %s, got %s", month, baseAmount.String(), result.String())
			}
		}
	})

	t.Run("Monthly frequency - Year 1 increases by rate", func(t *testing.T) {
		baseAmount := decimal.MustFromString("1200.0")
		rate := decimal.MustFromString("3.0")
		expected := decimal.MustFromString("1236") // 1200 * 1.03

		for month := 12; month < 24; month++ {
			result, err := strategy.Calculate(growth.Params{
				CurrentValue: baseAmount,
				Rate:         rate,
				PeriodIndex:  month,
				Frequency:    "monthly",
			})
			if err != nil {
				t.Fatalf("unexpected error at month %d: %v", month, err)
			}

			if !equalDecimal(result, expected) {
				t.Errorf("Month %d: expected %s, got %s", month, expected.String(), result.String())
			}
		}
	})

	t.Run("Monthly frequency - Year 2 increases by rate^2", func(t *testing.T) {
		baseAmount := decimal.MustFromString("1200.0")
		rate := decimal.MustFromString("3.0")
		expected := decimal.MustFromString("1273.08") // 1200 * 1.03^2

		for month := 24; month < 36; month++ {
			result, err := strategy.Calculate(growth.Params{
				CurrentValue: baseAmount,
				Rate:         rate,
				PeriodIndex:  month,
				Frequency:    "monthly",
			})
			if err != nil {
				t.Fatalf("unexpected error at month %d: %v", month, err)
			}

			if !equalDecimal(result, expected) {
				t.Errorf("Month %d: expected %s, got %s", month, expected.String(), result.String())
			}
		}
	})

	t.Run("Yearly frequency", func(t *testing.T) {
		baseAmount := decimal.MustFromString("15000.0")
		rate := decimal.MustFromString("3.0")

		tests := []struct {
			yearIndex int
			expected  string
		}{
			{0, "15000.00"},              // Year 0
			{1, "15450.00"},              // Year 1: 15000 * 1.03
			{2, "15913.50"},              // Year 2: 15000 * 1.03^2
			{5, "17389.11"},              // Year 5: 15000 * 1.03^5 (rounded to 2dp)
		}

		for _, tt := range tests {
			result, err := strategy.Calculate(growth.Params{
				CurrentValue: baseAmount,
				Rate:         rate,
				PeriodIndex:  tt.yearIndex,
				Frequency:    "annual",
			})
			if err != nil {
				t.Fatalf("unexpected error at year %d: %v", tt.yearIndex, err)
			}

			expected := decimal.MustFromString(tt.expected)
			if !equalDecimal(result, expected) {
				t.Errorf("Year %d: expected %s, got %s", tt.yearIndex, expected.String(), result.String())
			}
		}
	})
}

func TestTieredADBStrategy(t *testing.T) {
	strategy := growth.NewTieredADB()

	t.Run("Type", func(t *testing.T) {
		if strategy.Type() != growth.TieredADB {
			t.Errorf("expected type %s, got %s", growth.TieredADB, strategy.Type())
		}
	})

	tiers := []map[string]float64{
		{"threshold": 0, "rate": 0.05},
		{"threshold": 50000, "rate": 1.5},
		{"threshold": 100000, "rate": 2.5},
	}

	t.Run("Balance below first tier threshold", func(t *testing.T) {
		currentValue := decimal.MustFromString("10000")
		rate := decimal.MustFromString("0") // Rate param is ignored, uses tiers

		result, err := strategy.Calculate(growth.Params{
			CurrentValue: currentValue,
			Rate:         rate,
			PeriodIndex:  0,
			Frequency:    "monthly",
			Metadata: map[string]interface{}{
				"tiers": tiers,
			},
		})
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}

		// Should use 0.05% rate, rounded to 2dp
		expected := decimal.MustFromString("10000.42")
		if !equalDecimal(result, expected) {
			t.Errorf("got %s, want %s", result.String(), expected.String())
		}
	})

	t.Run("Balance in middle tier", func(t *testing.T) {
		currentValue := decimal.MustFromString("75000")
		rate := decimal.MustFromString("0")

		result, err := strategy.Calculate(growth.Params{
			CurrentValue: currentValue,
			Rate:         rate,
			PeriodIndex:  0,
			Frequency:    "monthly",
			Metadata: map[string]interface{}{
				"tiers": tiers,
			},
		})
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}

		// Should use 1.5% rate (>= 50000, < 100000), rounded to 2dp
		expected := decimal.MustFromString("75093.11")
		if !equalDecimal(result, expected) {
			t.Errorf("got %s, want %s", result.String(), expected.String())
		}
	})

	t.Run("Balance in highest tier", func(t *testing.T) {
		currentValue := decimal.MustFromString("150000")
		rate := decimal.MustFromString("0")

		result, err := strategy.Calculate(growth.Params{
			CurrentValue: currentValue,
			Rate:         rate,
			PeriodIndex:  0,
			Frequency:    "monthly",
			Metadata: map[string]interface{}{
				"tiers": tiers,
			},
		})
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}

		// Should use 2.5% rate (>= 100000), rounded to 2dp
		expected := decimal.MustFromString("150308.98")
		if !equalDecimal(result, expected) {
			t.Errorf("got %s, want %s", result.String(), expected.String())
		}
	})

	t.Run("Missing metadata returns same value", func(t *testing.T) {
		currentValue := decimal.MustFromString("10000")
		rate := decimal.MustFromString("5.0")

		result, err := strategy.Calculate(growth.Params{
			CurrentValue: currentValue,
			Rate:         rate,
			PeriodIndex:  0,
			Frequency:    "monthly",
		})
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}

		if result.Cmp(currentValue) != 0 {
			t.Errorf("expected %s, got %s", currentValue.String(), result.String())
		}
	})
}

func TestFixedStrategy(t *testing.T) {
	strategy := growth.NewFixed()

	t.Run("Type", func(t *testing.T) {
		if strategy.Type() != growth.Fixed {
			t.Errorf("expected type %s, got %s", growth.Fixed, strategy.Type())
		}
	})

	t.Run("Always returns same value", func(t *testing.T) {
		tests := []float64{100, 1000, 10000, 100000}

		for _, amountFloat := range tests {
			amount := decimal.MustFromFloat64(amountFloat)
			rate := decimal.MustFromString("5.0")

			result, err := strategy.Calculate(growth.Params{
				CurrentValue: amount,
				Rate:         rate,
				PeriodIndex:  10,
				Frequency:    "monthly",
			})
			if err != nil {
				t.Fatalf("unexpected error for amount %f: %v", amountFloat, err)
			}

			if result.Cmp(amount) != 0 {
				t.Errorf("expected %s, got %s", amount.String(), result.String())
			}
		}
	})
}

func TestGetStrategy(t *testing.T) {
	tests := []struct {
		name         string
		strategyType growth.StrategyType
		expectedType growth.StrategyType
	}{
		{"CompoundMonthly", growth.CompoundMonthly, growth.CompoundMonthly},
		{"AnnualStep", growth.AnnualStep, growth.AnnualStep},
		{"TieredADB", growth.TieredADB, growth.TieredADB},
		{"Fixed", growth.Fixed, growth.Fixed},
		{"Unknown defaults to CompoundMonthly", "unknown", growth.CompoundMonthly},
		{"Empty defaults to CompoundMonthly", "", growth.CompoundMonthly},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			strategy := growth.GetStrategy(tt.strategyType)
			if strategy.Type() != tt.expectedType {
				t.Errorf("expected type %s, got %s", tt.expectedType, strategy.Type())
			}
		})
	}
}

func TestStrategyInterface(t *testing.T) {
	// Verify all concrete types implement the Strategy interface
	var _ growth.Strategy = growth.NewCompoundMonthly()
	var _ growth.Strategy = growth.NewAnnualStep()
	var _ growth.Strategy = growth.NewTieredADB()
	var _ growth.Strategy = growth.NewFixed()
}

// equalDecimal checks if two decimals are exactly equal
func equalDecimal(a, b *decimal.Decimal) bool {
	return a.Cmp(b) == 0
}
