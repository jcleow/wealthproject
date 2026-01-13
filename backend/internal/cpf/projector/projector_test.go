package projector

import (
	"context"
	"testing"
	"time"

	"financial-chat-system/backend/internal/decimal"
)

func TestProjectToDate_2026Rates(t *testing.T) {
	// Arrange - Common test setup
	ctx := context.Background()
	proj := New()
	startDate := time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC)
	dob := time.Date(1991, 6, 15, 0, 0, 0, 0, time.UTC) // Age 34-35 in 2026

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
			incomes:    []IncomeStream{},
			targetDate: time.Date(2027, 1, 1, 0, 0, 0, 0, time.UTC),
			// Computation: OA interest rate = 2.5% p.a.
			// Monthly interest = $50,000 * 0.025 / 12 = $104.17/month
			// After 12 months: $50,000 + ($104.17 * 12) = $50,000 + $1,250 = $51,250
			wantOAMin:   51200,
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
			targetDate: time.Date(2027, 1, 1, 0, 0, 0, 0, time.UTC),
			// Computation: Age 34 citizen, $5000/month salary
			// Total CPF = 37% of $5000 = $1,850/month
			// OA allocation (age <=35) = 62.17% of total = $1,850 * 0.6217 = $1,150/month
			// 12 months OA contributions = $1,150 * 12 = $13,800
			// Starting OA + contributions = $50,000 + $13,800 = $63,800
			// Plus ~$1,500 interest on growing balance ≈ $65,300
			wantOAMin:   64000,
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
			incomes:    []IncomeStream{},
			targetDate: time.Date(2025, 1, 1, 0, 0, 0, 0, time.UTC), // Before start
			// Computation: Target date (2025-01-01) is before snapshot date (2026-01-01)
			// No projection needed - return original balance unchanged
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
					EndDate:       timePtr(time.Date(2026, 6, 30, 0, 0, 0, 0, time.UTC)), // Ends June
				},
			},
			targetDate: time.Date(2027, 1, 1, 0, 0, 0, 0, time.UTC),
			// Computation: Age 34 citizen, $6000/month salary for 6 months (Jan-Jun 2026)
			// Total CPF = 37% of $6000 = $2,220/month
			// OA allocation = 62.17% of total = $2,220 * 0.6217 = $1,380/month
			// 6 months OA contributions = $1,380 * 6 = $8,280
			// Starting OA + contributions = $30,000 + $8,280 = $38,280
			// Interest continues for full 12 months on varying balance ≈ $800
			wantOAMin:   37000,
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
					MonthlyAmount: decimal.MustFromFloat64(10000), // Above $8,000 OW ceiling (2026)
					WageType:      "ow",
					StartDate:     startDate,
					EndDate:       nil,
				},
			},
			targetDate: time.Date(2027, 1, 1, 0, 0, 0, 0, time.UTC),
			// Computation: Age 34 citizen, $10,000/month salary (capped at OW ceiling $8,000 in 2026)
			// Total CPF = 37% of $8,000 = $2,960/month (capped)
			// OA allocation = 62.17% of total = $2,960 * 0.6217 = $1,840/month
			// 12 months OA contributions = $1,840 * 12 = $22,080
			// Starting OA + contributions = $100,000 + $22,080 = $122,080
			// Plus ~$2,900 interest on growing balance ≈ $125,000
			wantOAMin:   120000,
			wantOAMax:   128000,
			description: "income above ceiling is capped",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Arrange - test case is already defined in table

			// Act
			result, err := proj.ProjectToDate(ctx, tt.account, tt.incomes, tt.targetDate)

			// Assert
			if err != nil {
				t.Fatalf("ProjectToDate() error = %v", err)
			}

			oaFloat := result.OA.ToFloat64()
			if oaFloat < tt.wantOAMin || oaFloat > tt.wantOAMax {
				t.Errorf("OA = %.2f, want between %.2f and %.2f (%s)",
					oaFloat, tt.wantOAMin, tt.wantOAMax, tt.description)
			}

			// Assert - Verify the breakdown sums correctly
			if result.ContributionsOA != nil && result.InterestOA != nil {
				startOA := tt.account.OABalance.ToFloat64()
				expectedTotal := startOA + result.ContributionsOA.ToFloat64() + result.InterestOA.ToFloat64()
				if diff := oaFloat - expectedTotal; diff < -1 || diff > 1 {
					t.Errorf("OA breakdown mismatch: OA=%.2f, start=%.2f + contrib=%.2f + interest=%.2f = %.2f",
						oaFloat, startOA, result.ContributionsOA.ToFloat64(), result.InterestOA.ToFloat64(), expectedTotal)
				}
			}
		})
	}
}

func TestCalculateMonthlyInterest(t *testing.T) {
	// Arrange - test cases
	// Formula: Monthly Interest = Balance * (AnnualRate / 100) / 12
	tests := []struct {
		name    string
		balance string
		ratePct string // Annual rate as percentage (e.g., "2.5" for 2.5%)
		want    string // Exact expected result
	}{
		{
			name:    "standard_OA_interest",
			balance: "100000",
			ratePct: "2.5", // 2.5% p.a.
			// Computation: $100,000 * (2.5 / 100) / 12 = $100,000 * 0.025 / 12 = $208.33
			want: "208.33",
		},
		{
			name:    "standard_SA_interest",
			balance: "50000",
			ratePct: "4.0", // 4.0% p.a.
			// Computation: $50,000 * (4.0 / 100) / 12 = $50,000 * 0.04 / 12 = $166.67
			want: "166.67",
		},
		{
			name:    "zero_balance",
			balance: "0",
			ratePct: "2.5",
			// Computation: $0 * (2.5 / 100) / 12 = $0
			want: "0",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Arrange
			balance := decimal.MustFromString(tt.balance)
			ratePct := decimal.MustFromString(tt.ratePct)

			// Act
			result := CalculateMonthlyInterest(balance, ratePct)

			// Assert
			if result.String() != tt.want {
				t.Errorf("CalculateMonthlyInterest() = %s, want %s", result.String(), tt.want)
			}
		})
	}
}

func TestAgeAt(t *testing.T) {
	// Arrange
	// DOB: June 15, 1991
	dob := time.Date(1991, 6, 15, 0, 0, 0, 0, time.UTC)
	tests := []struct {
		date    time.Time
		wantAge int
	}{
		// Computation: 2026 - 1991 = 35, but Jan 1 is before birthday (Jun 15), so age = 34
		{time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC), 34},
		// Computation: 2026 - 1991 = 35, Jun 15 is on birthday, so age = 35
		{time.Date(2026, 6, 15, 0, 0, 0, 0, time.UTC), 35},
		// Computation: 2026 - 1991 = 35, Dec 1 is after birthday (Jun 15), so age = 35
		{time.Date(2026, 12, 1, 0, 0, 0, 0, time.UTC), 35},
	}

	for _, tt := range tests {
		// Act
		got := ageAt(dob, tt.date)

		// Assert
		if got != tt.wantAge {
			t.Errorf("ageAt(%v, %v) = %d, want %d", dob, tt.date, got, tt.wantAge)
		}
	}
}

func TestIsActiveAt(t *testing.T) {
	// Arrange
	// Income stream active from March 1, 2026 to September 30, 2026 (inclusive)
	startDate := time.Date(2026, 3, 1, 0, 0, 0, 0, time.UTC)
	endDate := time.Date(2026, 9, 30, 0, 0, 0, 0, time.UTC)
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
		// Feb 1 < Mar 1 (start), so inactive
		{time.Date(2026, 2, 1, 0, 0, 0, 0, time.UTC), false},
		// Mar 1 == Mar 1 (start), so active (inclusive)
		{time.Date(2026, 3, 1, 0, 0, 0, 0, time.UTC), true},
		// Mar 1 <= Jun 15 <= Sep 30, so active
		{time.Date(2026, 6, 15, 0, 0, 0, 0, time.UTC), true},
		// Sep 30 == Sep 30 (end), so active (inclusive)
		{time.Date(2026, 9, 30, 0, 0, 0, 0, time.UTC), true},
		// Oct 1 > Sep 30 (end), so inactive
		{time.Date(2026, 10, 1, 0, 0, 0, 0, time.UTC), false},
	}

	for _, tt := range tests {
		// Act
		got := isActiveAt(income, tt.date)

		// Assert
		if got != tt.want {
			t.Errorf("isActiveAt(income, %v) = %v, want %v", tt.date, got, tt.want)
		}
	}
}

func timePtr(t time.Time) *time.Time {
	return &t
}
