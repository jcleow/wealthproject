package growth

import (
	"testing"
	"time"

	"financial-chat-system/backend/internal/decimal"
)

func TestMultiPeriodCalculator_CalculateValueAtDate(t *testing.T) {
	calculator := NewMultiPeriodCalculator()

	tests := []struct {
		name         string
		initialValue string
		purchaseDate time.Time
		targetDate   time.Time
		periods      []PeriodConfig
		wantApprox   string // Expected approximate value
		tolerance    string // Acceptable tolerance for comparison
	}{
		{
			name:         "no periods returns initial value",
			initialValue: "500000",
			purchaseDate: time.Date(2025, 1, 1, 0, 0, 0, 0, time.UTC),
			targetDate:   time.Date(2030, 1, 1, 0, 0, 0, 0, time.UTC),
			periods:      []PeriodConfig{},
			wantApprox:   "500000",
			tolerance:    "1",
		},
		{
			name:         "target before purchase returns initial value",
			initialValue: "500000",
			purchaseDate: time.Date(2025, 1, 1, 0, 0, 0, 0, time.UTC),
			targetDate:   time.Date(2024, 1, 1, 0, 0, 0, 0, time.UTC),
			periods: []PeriodConfig{
				{
					StartDate:     time.Date(2020, 1, 1, 0, 0, 0, 0, time.UTC),
					AnnualRatePct: decimal.MustFromString("3"),
					StrategyName:  StrategyAnnualStep,
				},
			},
			wantApprox: "500000",
			tolerance:  "1",
		},
		{
			name:         "single period 5 years at 3% annual growth",
			initialValue: "500000",
			purchaseDate: time.Date(2025, 1, 1, 0, 0, 0, 0, time.UTC),
			targetDate:   time.Date(2030, 1, 1, 0, 0, 0, 0, time.UTC),
			periods: []PeriodConfig{
				{
					StartDate:     time.Date(2025, 1, 1, 0, 0, 0, 0, time.UTC),
					AnnualRatePct: decimal.MustFromString("3"),
					StrategyName:  StrategyAnnualStep,
				},
			},
			wantApprox: "579637", // 500000 * (1.03)^5 = 579,637.14
			tolerance:  "100",
		},
		{
			name:         "single period 10 years at 3% annual growth",
			initialValue: "500000",
			purchaseDate: time.Date(2025, 1, 1, 0, 0, 0, 0, time.UTC),
			targetDate:   time.Date(2035, 1, 1, 0, 0, 0, 0, time.UTC),
			periods: []PeriodConfig{
				{
					StartDate:     time.Date(2025, 1, 1, 0, 0, 0, 0, time.UTC),
					AnnualRatePct: decimal.MustFromString("3"),
					StrategyName:  StrategyAnnualStep,
				},
			},
			wantApprox: "671958", // 500000 * (1.03)^10 = 671,958.19
			tolerance:  "100",
		},
		{
			name:         "two periods with different rates",
			initialValue: "500000",
			purchaseDate: time.Date(2025, 1, 1, 0, 0, 0, 0, time.UTC),
			targetDate:   time.Date(2030, 1, 1, 0, 0, 0, 0, time.UTC),
			periods: []PeriodConfig{
				{
					StartDate:     time.Date(2025, 1, 1, 0, 0, 0, 0, time.UTC),
					EndDate:       timePtr(time.Date(2027, 12, 31, 0, 0, 0, 0, time.UTC)),
					AnnualRatePct: decimal.MustFromString("3"),
					StrategyName:  StrategyAnnualStep,
				},
				{
					StartDate:     time.Date(2028, 1, 1, 0, 0, 0, 0, time.UTC),
					AnnualRatePct: decimal.MustFromString("5"),
					StrategyName:  StrategyAnnualStep,
				},
			},
			// Purchase in 2025
			// Growth applies in January of each year after purchase:
			// - Jan 2026: period 1 (3%): 500000 * 1.03 = 515000
			// - Jan 2027: period 1 (3%): 515000 * 1.03 = 530450
			// - Jan 2028: period 2 (5%): 530450 * 1.05 = 556972.50
			// - Jan 2029: period 2 (5%): 556972.50 * 1.05 = 584821.125
			// - Jan 2030: period 2 (5%): 584821.125 * 1.05 = 614062.18
			// Note: 5 years of growth total (2026, 2027, 2028, 2029, 2030)
			// But wait - period 1 ends in 2027, so:
			// Actually: 2 years at 3% (2026, 2027) and 3 years at 5% (2028, 2029, 2030)
			wantApprox: "614062",
			tolerance:  "200",
		},
		{
			name:         "period starts after purchase date",
			initialValue: "500000",
			purchaseDate: time.Date(2025, 1, 1, 0, 0, 0, 0, time.UTC),
			targetDate:   time.Date(2030, 1, 1, 0, 0, 0, 0, time.UTC),
			periods: []PeriodConfig{
				{
					StartDate:     time.Date(2027, 1, 1, 0, 0, 0, 0, time.UTC),
					AnnualRatePct: decimal.MustFromString("3"),
					StrategyName:  StrategyAnnualStep,
				},
			},
			// Purchase in 2025, period starts in 2027
			// Growth applies in January of years where period is active:
			// - Jan 2026: no period, no growth
			// - Jan 2027: period active, 500000 * 1.03 = 515000
			// - Jan 2028: period active, 515000 * 1.03 = 530450
			// - Jan 2029: period active, 530450 * 1.03 = 546363.50
			// - Jan 2030: period active, 546363.50 * 1.03 = 562754.40
			// 4 years of growth (2027, 2028, 2029, 2030)
			wantApprox: "562754", // 500000 * (1.03)^4 = 562,754.40
			tolerance:  "100",
		},
		{
			name:         "default strategy when not specified",
			initialValue: "500000",
			purchaseDate: time.Date(2025, 1, 1, 0, 0, 0, 0, time.UTC),
			targetDate:   time.Date(2027, 1, 1, 0, 0, 0, 0, time.UTC),
			periods: []PeriodConfig{
				{
					StartDate:     time.Date(2025, 1, 1, 0, 0, 0, 0, time.UTC),
					AnnualRatePct: decimal.MustFromString("3"),
					// StrategyName not set - should default to annual_step
				},
			},
			wantApprox: "530450", // 500000 * (1.03)^2 = 530,450
			tolerance:  "100",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			initialValue := decimal.MustFromString(tt.initialValue)

			result := calculator.CalculateValueAtDate(
				initialValue,
				tt.purchaseDate,
				tt.targetDate,
				tt.periods,
			)

			if result == nil {
				t.Fatal("result is nil")
			}

			expected := decimal.MustFromString(tt.wantApprox)
			tolerance := decimal.MustFromString(tt.tolerance)
			diff := result.Sub(expected).Abs()

			t.Logf("Result: %s (expected approx: %s, diff: %s)", result.String(), tt.wantApprox, diff.String())

			if diff.Cmp(tolerance) > 0 {
				t.Errorf("Result %s is outside tolerance ±%s of expected %s (diff: %s)",
					result.String(), tolerance.String(), expected.String(), diff.String())
			}
		})
	}
}

func TestMultiPeriodCalculator_CalculateValueAtMonth(t *testing.T) {
	calculator := NewMultiPeriodCalculator()

	tests := []struct {
		name         string
		initialValue string
		purchaseDate time.Time
		targetDate   time.Time
		periods      []PeriodConfig
		wantApprox   string
		tolerance    string
	}{
		{
			name:         "monthly compound growth 12 months",
			initialValue: "10000",
			purchaseDate: time.Date(2025, 1, 1, 0, 0, 0, 0, time.UTC),
			targetDate:   time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC),
			periods: []PeriodConfig{
				{
					StartDate:     time.Date(2025, 1, 1, 0, 0, 0, 0, time.UTC),
					AnnualRatePct: decimal.MustFromString("7"),
					StrategyName:  StrategyMonthlyCompound,
				},
			},
			// 10000 * (1.07)^(11/12) ≈ 10641.78 (11 months of growth due to arrears)
			wantApprox: "10641",
			tolerance:  "10",
		},
		{
			name:         "annual step with monthly calculation",
			initialValue: "10000",
			purchaseDate: time.Date(2025, 1, 1, 0, 0, 0, 0, time.UTC),
			targetDate:   time.Date(2027, 2, 1, 0, 0, 0, 0, time.UTC),
			periods: []PeriodConfig{
				{
					StartDate:     time.Date(2025, 1, 1, 0, 0, 0, 0, time.UTC),
					AnnualRatePct: decimal.MustFromString("5"),
					StrategyName:  StrategyAnnualStep,
				},
			},
			// Annual step only applies in January when currentMonth > 12
			// Purchase Jan 2025, so:
			// - monthIdx 12 = Jan 2026, currentMonth=12, but 12 is not > 12, no growth
			// - monthIdx 13 = Feb 2026, currentMonth=13, monthOfYear=2, no growth
			// - monthIdx 24 = Jan 2027, currentMonth=24, monthOfYear=1, GROWTH
			// Only 1 growth application: 10000 * 1.05 = 10500
			wantApprox: "10500",
			tolerance:  "10",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			initialValue := decimal.MustFromString(tt.initialValue)

			result := calculator.CalculateValueAtMonth(
				initialValue,
				tt.purchaseDate,
				tt.targetDate,
				tt.periods,
			)

			if result == nil {
				t.Fatal("result is nil")
			}

			expected := decimal.MustFromString(tt.wantApprox)
			tolerance := decimal.MustFromString(tt.tolerance)
			diff := result.Sub(expected).Abs()

			t.Logf("Result: %s (expected approx: %s, diff: %s)", result.String(), tt.wantApprox, diff.String())

			if diff.Cmp(tolerance) > 0 {
				t.Errorf("Result %s is outside tolerance ±%s of expected %s (diff: %s)",
					result.String(), tolerance.String(), expected.String(), diff.String())
			}
		})
	}
}

func TestMultiPeriodCalculator_FindApplicablePeriod(t *testing.T) {
	calculator := NewMultiPeriodCalculator()

	period1End := time.Date(2027, 12, 31, 0, 0, 0, 0, time.UTC)
	periods := []PeriodConfig{
		{
			StartDate:     time.Date(2025, 1, 1, 0, 0, 0, 0, time.UTC),
			EndDate:       &period1End,
			AnnualRatePct: decimal.MustFromString("3"),
			StrategyName:  StrategyAnnualStep,
		},
		{
			StartDate:     time.Date(2028, 1, 1, 0, 0, 0, 0, time.UTC),
			AnnualRatePct: decimal.MustFromString("5"),
			StrategyName:  StrategyAnnualStep,
		},
	}

	tests := []struct {
		name     string
		date     time.Time
		wantRate string // Expected rate percentage, or empty if no period
	}{
		{
			name:     "date before all periods",
			date:     time.Date(2024, 1, 1, 0, 0, 0, 0, time.UTC),
			wantRate: "",
		},
		{
			name:     "date in first period",
			date:     time.Date(2026, 6, 1, 0, 0, 0, 0, time.UTC),
			wantRate: "3",
		},
		{
			name:     "date at end of first period",
			date:     time.Date(2027, 12, 31, 0, 0, 0, 0, time.UTC),
			wantRate: "3",
		},
		{
			name:     "date in second period",
			date:     time.Date(2029, 3, 15, 0, 0, 0, 0, time.UTC),
			wantRate: "5",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			period := calculator.findApplicablePeriod(tt.date, periods)

			if tt.wantRate == "" {
				if period != nil {
					t.Errorf("expected no period, got period with rate %s", period.AnnualRatePct.String())
				}
			} else {
				if period == nil {
					t.Fatalf("expected period with rate %s, got nil", tt.wantRate)
				}
				if period.AnnualRatePct.String() != tt.wantRate {
					t.Errorf("expected rate %s, got %s", tt.wantRate, period.AnnualRatePct.String())
				}
			}
		})
	}
}

// Helper function to create time pointer
func timePtr(t time.Time) *time.Time {
	return &t
}
