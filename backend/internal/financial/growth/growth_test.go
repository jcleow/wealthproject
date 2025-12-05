package growth_test

import (
	"math"
	"testing"

	"github.com/jcleow/financial-chat-system-backend/internal/financial/growth"
)

func TestCompoundMonthlyStrategy(t *testing.T) {
	strategy := growth.NewCompoundMonthly()

	t.Run("Type", func(t *testing.T) {
		if strategy.Type() != growth.CompoundMonthly {
			t.Errorf("expected type %s, got %s", growth.CompoundMonthly, strategy.Type())
		}
	})

	t.Run("Single month growth", func(t *testing.T) {
		result := strategy.Calculate(growth.Params{
			CurrentValue: 25000,
			Rate:         2.5,
			PeriodIndex:  0,
			Frequency:    "monthly",
		})

		// Expected: 25000 * (1 + (1.025^(1/12) - 1))
		monthlyRate := math.Pow(1+2.5/100, 1.0/12.0) - 1
		expected := 25000 * (1 + monthlyRate)

		if !almostEqual(result, expected, 0.01) {
			t.Errorf("got %f, want %f", result, expected)
		}
	})

	t.Run("12 months should equal annual rate", func(t *testing.T) {
		amount := 25000.0
		rate := 2.5

		// Apply monthly compounding 12 times
		for i := 0; i < 12; i++ {
			amount = strategy.Calculate(growth.Params{
				CurrentValue: amount,
				Rate:         rate,
				PeriodIndex:  i,
				Frequency:    "monthly",
			})
		}

		// Should equal annual growth: 25000 * 1.025
		expected := 25000 * 1.025
		if !almostEqual(amount, expected, 0.01) {
			t.Errorf("after 12 months: got %f, want %f", amount, expected)
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
		baseAmount := 1200.0
		rate := 3.0

		for month := 0; month < 12; month++ {
			result := strategy.Calculate(growth.Params{
				CurrentValue: baseAmount,
				Rate:         rate,
				PeriodIndex:  month,
				Frequency:    "monthly",
			})

			if result != baseAmount {
				t.Errorf("Month %d: expected %f, got %f", month, baseAmount, result)
			}
		}
	})

	t.Run("Monthly frequency - Year 1 increases by rate", func(t *testing.T) {
		baseAmount := 1200.0
		rate := 3.0
		expected := baseAmount * 1.03 // 1236

		for month := 12; month < 24; month++ {
			result := strategy.Calculate(growth.Params{
				CurrentValue: baseAmount,
				Rate:         rate,
				PeriodIndex:  month,
				Frequency:    "monthly",
			})

			if !almostEqual(result, expected, 0.01) {
				t.Errorf("Month %d: expected %f, got %f", month, expected, result)
			}
		}
	})

	t.Run("Monthly frequency - Year 2 increases by rate^2", func(t *testing.T) {
		baseAmount := 1200.0
		rate := 3.0
		expected := baseAmount * math.Pow(1.03, 2) // 1273.08

		for month := 24; month < 36; month++ {
			result := strategy.Calculate(growth.Params{
				CurrentValue: baseAmount,
				Rate:         rate,
				PeriodIndex:  month,
				Frequency:    "monthly",
			})

			if !almostEqual(result, expected, 0.01) {
				t.Errorf("Month %d: expected %f, got %f", month, expected, result)
			}
		}
	})

	t.Run("Yearly frequency", func(t *testing.T) {
		baseAmount := 15000.0
		rate := 3.0

		tests := []struct {
			yearIndex int
			expected  float64
		}{
			{0, 15000},                              // Year 0
			{1, 15000 * 1.03},                       // Year 1
			{2, 15000 * math.Pow(1.03, 2)},          // Year 2
			{5, 15000 * math.Pow(1.03, 5)},          // Year 5
		}

		for _, tt := range tests {
			result := strategy.Calculate(growth.Params{
				CurrentValue: baseAmount,
				Rate:         rate,
				PeriodIndex:  tt.yearIndex,
				Frequency:    "yearly",
			})

			if !almostEqual(result, tt.expected, 0.01) {
				t.Errorf("Year %d: expected %f, got %f", tt.yearIndex, tt.expected, result)
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
		result := strategy.Calculate(growth.Params{
			CurrentValue: 10000,
			Rate:         0, // Rate param is ignored, uses tiers
			PeriodIndex:  0,
			Frequency:    "monthly",
			Metadata: map[string]interface{}{
				"tiers": tiers,
			},
		})

		// Should use 0.05% rate
		monthlyRate := math.Pow(1+0.05/100, 1.0/12.0) - 1
		expected := 10000 * (1 + monthlyRate)

		if !almostEqual(result, expected, 0.01) {
			t.Errorf("got %f, want %f", result, expected)
		}
	})

	t.Run("Balance in middle tier", func(t *testing.T) {
		result := strategy.Calculate(growth.Params{
			CurrentValue: 75000,
			Rate:         0,
			PeriodIndex:  0,
			Frequency:    "monthly",
			Metadata: map[string]interface{}{
				"tiers": tiers,
			},
		})

		// Should use 1.5% rate (>= 50000, < 100000)
		monthlyRate := math.Pow(1+1.5/100, 1.0/12.0) - 1
		expected := 75000 * (1 + monthlyRate)

		if !almostEqual(result, expected, 0.01) {
			t.Errorf("got %f, want %f", result, expected)
		}
	})

	t.Run("Balance in highest tier", func(t *testing.T) {
		result := strategy.Calculate(growth.Params{
			CurrentValue: 150000,
			Rate:         0,
			PeriodIndex:  0,
			Frequency:    "monthly",
			Metadata: map[string]interface{}{
				"tiers": tiers,
			},
		})

		// Should use 2.5% rate (>= 100000)
		monthlyRate := math.Pow(1+2.5/100, 1.0/12.0) - 1
		expected := 150000 * (1 + monthlyRate)

		if !almostEqual(result, expected, 0.01) {
			t.Errorf("got %f, want %f", result, expected)
		}
	})

	t.Run("Missing metadata returns same value", func(t *testing.T) {
		result := strategy.Calculate(growth.Params{
			CurrentValue: 10000,
			Rate:         5.0,
			PeriodIndex:  0,
			Frequency:    "monthly",
		})

		if result != 10000 {
			t.Errorf("expected 10000, got %f", result)
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

		for _, amount := range tests {
			result := strategy.Calculate(growth.Params{
				CurrentValue: amount,
				Rate:         5.0, // Should be ignored
				PeriodIndex:  10,  // Should be ignored
				Frequency:    "monthly",
			})

			if result != amount {
				t.Errorf("expected %f, got %f", amount, result)
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

// almostEqual checks if two floats are equal within a tolerance
func almostEqual(a, b, tolerance float64) bool {
	return math.Abs(a-b) < tolerance
}
