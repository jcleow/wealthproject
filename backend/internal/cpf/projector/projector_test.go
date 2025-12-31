package projector

import (
	"context"
	"testing"
	"time"

	"financial-chat-system/backend/internal/decimal"
)

func TestProjectToDate(t *testing.T) {
	ctx := context.Background()
	proj := New()

	// Common test dates
	startDate := time.Date(2025, 1, 1, 0, 0, 0, 0, time.UTC)
	dob := time.Date(1990, 6, 15, 0, 0, 0, 0, time.UTC) // Age 34-35 in 2025

	tests := []struct {
		name        string
		account     AccountSnapshot
		incomes     []IncomeStream
		targetDate  time.Time
		wantOAMin   float64 // Minimum expected OA (for range check)
		wantOAMax   float64 // Maximum expected OA
		description string
	}{
		{
			name: "no_income_interest_only",
			account: AccountSnapshot{
				OABalance:       decimal.MustFromFloat64(50000),
				SABalance:       decimal.MustFromFloat64(20000),
				MABalance:       decimal.MustFromFloat64(10000),
				RABalance:       decimal.Zero(),
				DateOfBirth:     dob,
				ResidencyStatus: "citizen",
				AsOfDate:        startDate,
			},
			incomes:     []IncomeStream{},
			targetDate:  time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC),
			wantOAMin:   51200, // ~50000 * (1 + 0.025) = 51250
			wantOAMax:   51400,
			description: "12 months interest only on 50k OA",
		},
		{
			name: "single_income_12_months",
			account: AccountSnapshot{
				OABalance:       decimal.MustFromFloat64(50000),
				SABalance:       decimal.MustFromFloat64(20000),
				MABalance:       decimal.MustFromFloat64(10000),
				RABalance:       decimal.Zero(),
				DateOfBirth:     dob,
				ResidencyStatus: "citizen",
				AsOfDate:        startDate,
			},
			incomes: []IncomeStream{
				{
					MonthlyAmount: decimal.MustFromFloat64(5000),
					WageType:      "ow",
					StartDate:     startDate,
					EndDate:       nil,
				},
			},
			targetDate:  time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC),
			wantOAMin:   64000, // 50k + 12mo contributions (~$1150/mo OA for age 34) + interest
			wantOAMax:   67000,
			description: "12 months with $5000/mo salary",
		},
		{
			name: "target_before_start",
			account: AccountSnapshot{
				OABalance:       decimal.MustFromFloat64(50000),
				SABalance:       decimal.MustFromFloat64(20000),
				MABalance:       decimal.MustFromFloat64(10000),
				RABalance:       decimal.Zero(),
				DateOfBirth:     dob,
				ResidencyStatus: "citizen",
				AsOfDate:        startDate,
			},
			incomes:     []IncomeStream{},
			targetDate:  time.Date(2024, 1, 1, 0, 0, 0, 0, time.UTC), // Before start
			wantOAMin:   50000,
			wantOAMax:   50000,
			description: "target date before snapshot date returns original balance",
		},
		{
			name: "income_ends_mid_projection",
			account: AccountSnapshot{
				OABalance:       decimal.MustFromFloat64(30000),
				SABalance:       decimal.MustFromFloat64(10000),
				MABalance:       decimal.MustFromFloat64(5000),
				RABalance:       decimal.Zero(),
				DateOfBirth:     dob,
				ResidencyStatus: "citizen",
				AsOfDate:        startDate,
			},
			incomes: []IncomeStream{
				{
					MonthlyAmount: decimal.MustFromFloat64(6000),
					WageType:      "ow",
					StartDate:     startDate,
					EndDate:       timePtr(time.Date(2025, 6, 30, 0, 0, 0, 0, time.UTC)), // Ends June
				},
			},
			targetDate:  time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC),
			wantOAMin:   37000, // 6 months contributions + 12 months interest
			wantOAMax:   39000,
			description: "income ends mid-year, interest continues",
		},
		{
			name: "high_income_hits_ceiling",
			account: AccountSnapshot{
				OABalance:       decimal.MustFromFloat64(100000),
				SABalance:       decimal.MustFromFloat64(50000),
				MABalance:       decimal.MustFromFloat64(30000),
				RABalance:       decimal.Zero(),
				DateOfBirth:     dob,
				ResidencyStatus: "citizen",
				AsOfDate:        startDate,
			},
			incomes: []IncomeStream{
				{
					MonthlyAmount: decimal.MustFromFloat64(10000), // Above $7400 OW ceiling
					WageType:      "ow",
					StartDate:     startDate,
					EndDate:       nil,
				},
			},
			targetDate:  time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC),
			wantOAMin:   118000, // Capped at $7400 OW ceiling
			wantOAMax:   125000,
			description: "income above ceiling is capped",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, err := proj.ProjectToDate(ctx, tt.account, tt.incomes, tt.targetDate)
			if err != nil {
				t.Fatalf("ProjectToDate() error = %v", err)
			}

			oaFloat := result.OA.ToFloat64()
			if oaFloat < tt.wantOAMin || oaFloat > tt.wantOAMax {
				t.Errorf("OA = %.2f, want between %.2f and %.2f (%s)",
					oaFloat, tt.wantOAMin, tt.wantOAMax, tt.description)
			}

			// Verify the breakdown sums correctly
			if result.ContributionsOA != nil && result.InterestOA != nil {
				startOA := tt.account.OABalance.ToFloat64()
				expectedTotal := startOA + result.ContributionsOA.ToFloat64() + result.InterestOA.ToFloat64()
				// Allow small rounding difference
				if diff := oaFloat - expectedTotal; diff < -1 || diff > 1 {
					t.Errorf("OA breakdown mismatch: OA=%.2f, start=%.2f + contrib=%.2f + interest=%.2f = %.2f",
						oaFloat, startOA, result.ContributionsOA.ToFloat64(), result.InterestOA.ToFloat64(), expectedTotal)
				}
			}
		})
	}
}

func TestCalculateMonthlyInterest(t *testing.T) {
	tests := []struct {
		name       string
		balance    float64
		rate       float64
		wantMin    float64
		wantMax    float64
	}{
		{
			name:    "standard_OA_interest",
			balance: 100000,
			rate:    0.025,
			wantMin: 208.00, // 100000 * 0.025 / 12 = 208.33
			wantMax: 209.00,
		},
		{
			name:    "standard_SA_interest",
			balance: 50000,
			rate:    0.04,
			wantMin: 166.00, // 50000 * 0.04 / 12 = 166.67
			wantMax: 167.00,
		},
		{
			name:    "zero_balance",
			balance: 0,
			rate:    0.025,
			wantMin: 0,
			wantMax: 0,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			balance := decimal.MustFromFloat64(tt.balance)
			rate := decimal.MustFromFloat64(tt.rate)
			result := CalculateMonthlyInterest(balance, rate)

			got := result.ToFloat64()
			if got < tt.wantMin || got > tt.wantMax {
				t.Errorf("CalculateMonthlyInterest() = %.2f, want between %.2f and %.2f",
					got, tt.wantMin, tt.wantMax)
			}
		})
	}
}

func TestAgeAt(t *testing.T) {
	dob := time.Date(1990, 6, 15, 0, 0, 0, 0, time.UTC)

	tests := []struct {
		date    time.Time
		wantAge int
	}{
		{time.Date(2025, 1, 1, 0, 0, 0, 0, time.UTC), 34},  // Before birthday
		{time.Date(2025, 6, 15, 0, 0, 0, 0, time.UTC), 35}, // On birthday
		{time.Date(2025, 12, 1, 0, 0, 0, 0, time.UTC), 35}, // After birthday
	}

	for _, tt := range tests {
		got := ageAt(dob, tt.date)
		if got != tt.wantAge {
			t.Errorf("ageAt(%v, %v) = %d, want %d", dob, tt.date, got, tt.wantAge)
		}
	}
}

func TestIsActiveAt(t *testing.T) {
	startDate := time.Date(2025, 3, 1, 0, 0, 0, 0, time.UTC)
	endDate := time.Date(2025, 9, 30, 0, 0, 0, 0, time.UTC)

	income := IncomeStream{
		MonthlyAmount: decimal.MustFromFloat64(5000),
		WageType:      "ow",
		StartDate:     startDate,
		EndDate:       &endDate,
	}

	tests := []struct {
		date time.Time
		want bool
	}{
		{time.Date(2025, 2, 1, 0, 0, 0, 0, time.UTC), false}, // Before start
		{time.Date(2025, 3, 1, 0, 0, 0, 0, time.UTC), true},  // On start
		{time.Date(2025, 6, 15, 0, 0, 0, 0, time.UTC), true}, // During
		{time.Date(2025, 9, 30, 0, 0, 0, 0, time.UTC), true}, // On end
		{time.Date(2025, 10, 1, 0, 0, 0, 0, time.UTC), false}, // After end
	}

	for _, tt := range tests {
		got := isActiveAt(income, tt.date)
		if got != tt.want {
			t.Errorf("isActiveAt(income, %v) = %v, want %v", tt.date, got, tt.want)
		}
	}
}

func timePtr(t time.Time) *time.Time {
	return &t
}
