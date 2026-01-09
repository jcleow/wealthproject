package assumptions

import (
	"testing"

	"financial-chat-system/backend/internal/decimal"
)

func TestDefaultAssumptions(t *testing.T) {
	cpfAccountID := "test-account-123"
	defaults := DefaultAssumptions(cpfAccountID)

	t.Run("sets correct cpf account id", func(t *testing.T) {
		if defaults.CPFAccountID != cpfAccountID {
			t.Errorf("expected CPFAccountID %q, got %q", cpfAccountID, defaults.CPFAccountID)
		}
	})

	t.Run("sets official CPF interest rates", func(t *testing.T) {
		tests := []struct {
			name     string
			actual   decimal.Decimal
			expected string
		}{
			{"OA interest rate", defaults.InterestRateOA, "0.025"},
			{"SA interest rate", defaults.InterestRateSA, "0.04"},
			{"MA interest rate", defaults.InterestRateMA, "0.04"},
			{"RA interest rate", defaults.InterestRateRA, "0.04"},
			{"Extra interest first 60k", defaults.ExtraInterestFirst60K, "0.01"},
			{"Extra interest first 30k above 55", defaults.ExtraInterestFirst30KAbove55, "0.01"},
		}

		for _, tt := range tests {
			expected := decimal.MustFromString(tt.expected)
			if tt.actual.Cmp(expected) != 0 {
				t.Errorf("%s: expected %s, got %s", tt.name, tt.expected, tt.actual.String())
			}
		}
	})

	t.Run("sets FRS growth rate", func(t *testing.T) {
		expected := decimal.MustFromString("0.035")
		if defaults.FRSGrowthRate.Cmp(expected) != 0 {
			t.Errorf("expected FRS growth rate 0.035, got %s", defaults.FRSGrowthRate.String())
		}
	})

	t.Run("sets retirement age to 65", func(t *testing.T) {
		if defaults.RetirementAge != 65 {
			t.Errorf("expected retirement age 65, got %d", defaults.RetirementAge)
		}
	})

	t.Run("sets CPF LIFE defaults", func(t *testing.T) {
		if defaults.CPFLifePlan != CPFLifePlanStandard {
			t.Errorf("expected CPF LIFE plan %q, got %q", CPFLifePlanStandard, defaults.CPFLifePlan)
		}
		if defaults.PayoutStartAge != 65 {
			t.Errorf("expected payout start age 65, got %d", defaults.PayoutStartAge)
		}
		expected := decimal.MustFromString("0.02")
		if defaults.EscalatingPlanGrowth.Cmp(expected) != 0 {
			t.Errorf("expected escalating plan growth 0.02, got %s", defaults.EscalatingPlanGrowth.String())
		}
	})

	t.Run("sets preset to official", func(t *testing.T) {
		if defaults.PresetName != PresetOfficial {
			t.Errorf("expected preset %q, got %q", PresetOfficial, defaults.PresetName)
		}
	})
}

func TestCPFLifePlanConstants(t *testing.T) {
	tests := []struct {
		name     string
		plan     CPFLifePlan
		expected string
	}{
		{"Standard plan", CPFLifePlanStandard, "standard"},
		{"Basic plan", CPFLifePlanBasic, "basic"},
		{"Escalating plan", CPFLifePlanEscalating, "escalating"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if string(tt.plan) != tt.expected {
				t.Errorf("expected %q, got %q", tt.expected, tt.plan)
			}
		})
	}
}

func TestPresetNameConstants(t *testing.T) {
	tests := []struct {
		name     string
		preset   PresetName
		expected string
	}{
		{"Official preset", PresetOfficial, "official"},
		{"Conservative preset", PresetConservative, "conservative"},
		{"Optimistic preset", PresetOptimistic, "optimistic"},
		{"Custom preset", PresetCustom, "custom"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if string(tt.preset) != tt.expected {
				t.Errorf("expected %q, got %q", tt.expected, tt.preset)
			}
		})
	}
}

func TestErrNotFound(t *testing.T) {
	if ErrNotFound == nil {
		t.Fatal("ErrNotFound should not be nil")
	}
	expected := "cpf assumptions not found"
	if ErrNotFound.Error() != expected {
		t.Errorf("expected error message %q, got %q", expected, ErrNotFound.Error())
	}
}

func TestCPFAssumptions_ValidRanges(t *testing.T) {
	// Test that default values are within valid ranges
	defaults := DefaultAssumptions("test-account")

	t.Run("interest rates are non-negative", func(t *testing.T) {
		zero := decimal.MustFromString("0")
		rates := []struct {
			name string
			rate decimal.Decimal
		}{
			{"OA", defaults.InterestRateOA},
			{"SA", defaults.InterestRateSA},
			{"MA", defaults.InterestRateMA},
			{"RA", defaults.InterestRateRA},
			{"Extra first 60k", defaults.ExtraInterestFirst60K},
			{"Extra first 30k above 55", defaults.ExtraInterestFirst30KAbove55},
		}

		for _, r := range rates {
			if r.rate.Cmp(zero) < 0 {
				t.Errorf("%s interest rate should be non-negative, got %s", r.name, r.rate.String())
			}
		}
	})

	t.Run("retirement age is between 55 and 70", func(t *testing.T) {
		if defaults.RetirementAge < 55 || defaults.RetirementAge > 70 {
			t.Errorf("retirement age should be between 55 and 70, got %d", defaults.RetirementAge)
		}
	})

	t.Run("payout start age is between 65 and 70", func(t *testing.T) {
		if defaults.PayoutStartAge < 65 || defaults.PayoutStartAge > 70 {
			t.Errorf("payout start age should be between 65 and 70, got %d", defaults.PayoutStartAge)
		}
	})

	t.Run("FRS growth rate is reasonable", func(t *testing.T) {
		zero := decimal.MustFromString("0")
		ten := decimal.MustFromString("0.10") // 10% max
		if defaults.FRSGrowthRate.Cmp(zero) < 0 || defaults.FRSGrowthRate.Cmp(ten) > 0 {
			t.Errorf("FRS growth rate should be between 0%% and 10%%, got %s", defaults.FRSGrowthRate.String())
		}
	})
}

func TestNewRepository(t *testing.T) {
	// Test that NewRepository returns a valid repository
	repo := NewRepository(nil)
	if repo == nil {
		t.Fatal("NewRepository should return a non-nil repository")
	}
}
