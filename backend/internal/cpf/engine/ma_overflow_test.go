package engine

import (
	"testing"
	"time"

	"financial-chat-system/backend/internal/cpf/config"
	"financial-chat-system/backend/internal/cpf/contribution"
	"financial-chat-system/backend/internal/decimal"
)

func TestRedirectMAOverflowFromBHS(t *testing.T) {
	// BHS for testing: $79,000
	bhs := decimal.NewFromInt64(79000, 0)

	tests := []struct {
		name              string
		initialMA         int64
		age               int
		wantOverflowToSA  float64
		wantOverflowToRA  float64
		wantFinalMA       float64
		wantFinalSA       float64
		wantFinalRA       float64
		initialSA         int64
		initialRA         int64
	}{
		{
			name:              "MA below BHS - no overflow",
			initialMA:         50000,
			age:               35,
			wantOverflowToSA:  0,
			wantOverflowToRA:  0,
			wantFinalMA:       50000,
			wantFinalSA:       10000, // unchanged
			wantFinalRA:       0,
			initialSA:         10000,
			initialRA:         0,
		},
		{
			name:              "MA exactly at BHS - no overflow",
			initialMA:         79000,
			age:               35,
			wantOverflowToSA:  0,
			wantOverflowToRA:  0,
			wantFinalMA:       79000,
			wantFinalSA:       10000, // unchanged
			wantFinalRA:       0,
			initialSA:         10000,
			initialRA:         0,
		},
		{
			name:              "MA exceeds BHS (age < 55) - overflow to SA",
			initialMA:         85000,
			age:               35,
			wantOverflowToSA:  6000, // 85000 - 79000
			wantOverflowToRA:  0,
			wantFinalMA:       79000, // capped at BHS
			wantFinalSA:       16000, // 10000 + 6000
			wantFinalRA:       0,
			initialSA:         10000,
			initialRA:         0,
		},
		{
			name:              "MA exceeds BHS (age 54) - overflow to SA",
			initialMA:         100000,
			age:               54,
			wantOverflowToSA:  21000, // 100000 - 79000
			wantOverflowToRA:  0,
			wantFinalMA:       79000,
			wantFinalSA:       31000, // 10000 + 21000
			wantFinalRA:       0,
			initialSA:         10000,
			initialRA:         0,
		},
		{
			name:              "MA exceeds BHS (age 55) - overflow to RA",
			initialMA:         90000,
			age:               55,
			wantOverflowToSA:  0,
			wantOverflowToRA:  11000, // 90000 - 79000
			wantFinalMA:       79000,
			wantFinalSA:       10000, // unchanged
			wantFinalRA:       111000, // 100000 + 11000
			initialSA:         10000,
			initialRA:         100000,
		},
		{
			name:              "MA exceeds BHS (age 60) - overflow to RA",
			initialMA:         95000,
			age:               60,
			wantOverflowToSA:  0,
			wantOverflowToRA:  16000, // 95000 - 79000
			wantFinalMA:       79000,
			wantFinalSA:       10000,
			wantFinalRA:       216000, // 200000 + 16000
			initialSA:         10000,
			initialRA:         200000,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Create state with initial balances
			state := &CPFState{
				MA: decimal.NewFromInt64(tt.initialMA, 0),
				SA: decimal.NewFromInt64(tt.initialSA, 0),
				RA: decimal.NewFromInt64(tt.initialRA, 0),
			}

			// Call the function
			overflowToSA, overflowToRA := RedirectMAOverflowFromBHS(state, bhs, tt.age)

			// Check overflow amounts
			if got := overflowToSA.ToFloat64(); got != tt.wantOverflowToSA {
				t.Errorf("overflowToSA = %.2f, want %.2f", got, tt.wantOverflowToSA)
			}
			if got := overflowToRA.ToFloat64(); got != tt.wantOverflowToRA {
				t.Errorf("overflowToRA = %.2f, want %.2f", got, tt.wantOverflowToRA)
			}

			// Check final balances
			if got := state.MA.ToFloat64(); got != tt.wantFinalMA {
				t.Errorf("finalMA = %.2f, want %.2f", got, tt.wantFinalMA)
			}
			if got := state.SA.ToFloat64(); got != tt.wantFinalSA {
				t.Errorf("finalSA = %.2f, want %.2f", got, tt.wantFinalSA)
			}
			if got := state.RA.ToFloat64(); got != tt.wantFinalRA {
				t.Errorf("finalRA = %.2f, want %.2f", got, tt.wantFinalRA)
			}
		})
	}
}

func TestProcessMonth_MAOverflow(t *testing.T) {
	// Test date in 2026 (base year for assumptions)
	testDate := time.Date(2026, 6, 1, 0, 0, 0, 0, time.UTC)

	// Person born in 1991 (age 35 in 2026)
	dobAge35 := time.Date(1991, 1, 1, 0, 0, 0, 0, time.UTC)

	// Person born in 1971 (age 55 in 2026)
	dobAge55 := time.Date(1971, 1, 1, 0, 0, 0, 0, time.UTC)

	// BHS for 2026: $79,000
	bhs := 79000.0

	tests := []struct {
		name             string
		initialMA        int64
		initialSA        int64
		initialRA        int64
		maContribution   int64
		dob              time.Time
		raFormed         bool
		wantMAOverflowSA float64
		wantMAOverflowRA float64
		// Note: Final balances include interest, so we check MA is at or near BHS
		// (interest can push MA slightly above BHS, which is per CPF policy)
		wantMACappedAtBHS bool
	}{
		{
			name:              "Contribution below BHS cap - no overflow",
			initialMA:         70000,
			initialSA:         50000,
			initialRA:         0,
			maContribution:    500,
			dob:               dobAge35,
			raFormed:          false,
			wantMAOverflowSA:  0,
			wantMAOverflowRA:  0,
			wantMACappedAtBHS: false, // MA stays below BHS
		},
		{
			name:              "Contribution causes MA to exceed BHS (age < 55) - partial overflow to SA",
			initialMA:         78500,
			initialSA:         50000,
			initialRA:         0,
			maContribution:    1000,
			dob:               dobAge35,
			raFormed:          false,
			wantMAOverflowSA:  500, // 78500 + 1000 - 79000
			wantMAOverflowRA:  0,
			wantMACappedAtBHS: true,
		},
		{
			name:              "MA already at BHS - full contribution overflows to SA (age < 55)",
			initialMA:         79000, // already at BHS
			initialSA:         50000,
			initialRA:         0,
			maContribution:    800,
			dob:               dobAge35,
			raFormed:          false,
			wantMAOverflowSA:  800, // entire contribution overflows
			wantMAOverflowRA:  0,
			wantMACappedAtBHS: true,
		},
		{
			name:              "Contribution causes MA to exceed BHS (age 55) - overflow to RA",
			initialMA:         78000,
			initialSA:         0,
			initialRA:         200000,
			maContribution:    2000,
			dob:               dobAge55,
			raFormed:          true,
			wantMAOverflowSA:  0,
			wantMAOverflowRA:  1000, // 78000 + 2000 - 79000
			wantMACappedAtBHS: true,
		},
		{
			name:              "MA already at BHS - full contribution overflows to RA (age 55)",
			initialMA:         79000,
			initialSA:         0,
			initialRA:         200000,
			maContribution:    600,
			dob:               dobAge55,
			raFormed:          true,
			wantMAOverflowSA:  0,
			wantMAOverflowRA:  600,
			wantMACappedAtBHS: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Create initial state
			state := NewCPFState(
				decimal.NewFromInt64(100000, 0), // OA
				decimal.NewFromInt64(tt.initialSA, 0),
				decimal.NewFromInt64(tt.initialMA, 0),
				decimal.NewFromInt64(tt.initialRA, 0),
				tt.dob,
				"male",
				config.ResidencyCitizen,
				testDate,
			)
			state.RAFormed = tt.raFormed

			// Create contribution with only MA allocation for this test
			contrib := contribution.ContributionResult{
				Allocation: contribution.AccountAllocation{
					OA: decimal.Zero(),
					SA: decimal.Zero(),
					MA: decimal.NewFromInt64(tt.maContribution, 0),
					RA: decimal.Zero(),
				},
			}

			// Process the month
			result, err := ProcessMonth(state, testDate, ProcessMonthOptions{
				ApplyContributions: true,
				Contributions:      []contribution.ContributionResult{contrib},
				Assumptions:        DefaultAssumptions(),
			})

			if err != nil {
				t.Fatalf("ProcessMonth error: %v", err)
			}

			// Check overflow amounts in result - this is the key test
			if got := result.MAOverflowToSA.ToFloat64(); got != tt.wantMAOverflowSA {
				t.Errorf("MAOverflowToSA = %.2f, want %.2f", got, tt.wantMAOverflowSA)
			}
			if got := result.MAOverflowToRA.ToFloat64(); got != tt.wantMAOverflowRA {
				t.Errorf("MAOverflowToRA = %.2f, want %.2f", got, tt.wantMAOverflowRA)
			}

			// Verify MA was capped at BHS before interest was applied
			// Final MA will be slightly higher due to interest, but overflow should have happened
			endState := result.EndOfMonthState
			finalMA := endState.MA.ToFloat64()

			if tt.wantMACappedAtBHS {
				// MA should be BHS + monthly interest (4%/12 ≈ 0.333%)
				// Allow up to 0.5% above BHS for interest
				maxExpectedMA := bhs * 1.005
				if finalMA > maxExpectedMA {
					t.Errorf("finalMA = %.2f, expected to be capped near BHS (%.2f) + interest", finalMA, bhs)
				}
			}

			// Verify that overflow was correctly added to SA or RA
			if tt.wantMAOverflowSA > 0 {
				// SA should include the overflow (plus interest)
				minExpectedSA := float64(tt.initialSA) + tt.wantMAOverflowSA
				if endState.SA.ToFloat64() < minExpectedSA {
					t.Errorf("finalSA = %.2f, expected at least %.2f (initial + overflow)",
						endState.SA.ToFloat64(), minExpectedSA)
				}
			}
			if tt.wantMAOverflowRA > 0 {
				// RA should include the overflow (plus interest)
				minExpectedRA := float64(tt.initialRA) + tt.wantMAOverflowRA
				if endState.RA.ToFloat64() < minExpectedRA {
					t.Errorf("finalRA = %.2f, expected at least %.2f (initial + overflow)",
						endState.RA.ToFloat64(), minExpectedRA)
				}
			}
		})
	}
}

func TestProcessMonth_MAOverflow_BHSGrowthAcrossYears(t *testing.T) {
	// BHS grows at 4% per year from base year (2026)
	// 2026: $79,000 (base)
	// 2030: $79,000 * 1.04^4 = $92,436.89

	// Person born in 1995 (age 35 in 2030)
	dob := time.Date(1995, 1, 1, 0, 0, 0, 0, time.UTC)

	// Get base year from assumptions to calculate expected BHS
	assumptions := DefaultAssumptions()
	baseYear := assumptions.RetirementSumsBaseYear
	baseBHS := assumptions.BHSBase.ToFloat64()

	// Calculate expected BHS for each test year
	// BHS grows at 4% per year: BHS(year) = baseBHS * 1.04^(year - baseYear)
	getBHSForYear := func(year int) float64 {
		years := year - baseYear
		if years < 0 {
			years = 0
		}
		growth := 1.0
		for i := 0; i < years; i++ {
			growth *= 1.04
		}
		return baseBHS * growth
	}

	tests := []struct {
		name           string
		year           int
		initialMA      int64
		maContribution int64
	}{
		{
			name:           "Base year - BHS at base value",
			year:           baseYear,
			initialMA:      int64(baseBHS) - 500,
			maContribution: 1000,
		},
		{
			name:           "Base year + 2 - BHS grown by 1.04^2",
			year:           baseYear + 2,
			initialMA:      int64(getBHSForYear(baseYear+2)) - 500,
			maContribution: 1000,
		},
		{
			name:           "Base year + 4 - BHS grown by 1.04^4",
			year:           baseYear + 4,
			initialMA:      int64(getBHSForYear(baseYear+4)) - 500,
			maContribution: 1000,
		},
		{
			name:           "Base year + 4 - MA below grown BHS, no overflow",
			year:           baseYear + 4,
			initialMA:      int64(getBHSForYear(baseYear+4)) - 2000,
			maContribution: 1000,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			testDate := time.Date(tt.year, 6, 1, 0, 0, 0, 0, time.UTC)

			state := NewCPFState(
				decimal.NewFromInt64(100000, 0), // OA
				decimal.NewFromInt64(50000, 0),  // SA
				decimal.NewFromInt64(tt.initialMA, 0),
				decimal.Zero(), // RA
				dob,
				"male",
				config.ResidencyCitizen,
				testDate,
			)

			contrib := contribution.ContributionResult{
				Allocation: contribution.AccountAllocation{
					OA: decimal.Zero(),
					SA: decimal.Zero(),
					MA: decimal.NewFromInt64(tt.maContribution, 0),
					RA: decimal.Zero(),
				},
			}

			result, err := ProcessMonth(state, testDate, ProcessMonthOptions{
				ApplyContributions: true,
				Contributions:      []contribution.ContributionResult{contrib},
				Assumptions:        DefaultAssumptions(),
			})

			if err != nil {
				t.Fatalf("ProcessMonth error: %v", err)
			}

			// Calculate expected BHS and overflow for this year
			expectedBHS := getBHSForYear(tt.year)
			totalMA := float64(tt.initialMA) + float64(tt.maContribution)
			expectedOverflow := totalMA - expectedBHS
			if expectedOverflow < 0 {
				expectedOverflow = 0
			}

			// Check overflow amount (allow tolerance for decimal precision)
			gotOverflow := result.MAOverflowToSA.ToFloat64()
			tolerance := 1.0 // $1 tolerance for rounding
			if gotOverflow < expectedOverflow-tolerance || gotOverflow > expectedOverflow+tolerance {
				t.Errorf("MAOverflowToSA = %.2f, want ~%.2f (BHS for %d = %.2f)",
					gotOverflow, expectedOverflow, tt.year, expectedBHS)
			}

			// Verify MA is capped at BHS for that year (if overflow occurred)
			if expectedOverflow > 0 {
				endMA := result.EndOfMonthState.MA.ToFloat64()
				// MA should be near BHS (plus interest which is ~0.33%/month)
				maxExpectedMA := expectedBHS * 1.005
				if endMA > maxExpectedMA {
					t.Errorf("finalMA = %.2f, expected near BHS %.2f", endMA, expectedBHS)
				}
			}

			// Key assertion: verify BHS is growing across years
			if tt.year > baseYear {
				if expectedBHS <= baseBHS {
					t.Errorf("BHS for %d (%.2f) should be greater than base BHS (%.2f)",
						tt.year, expectedBHS, baseBHS)
				}
			}
		})
	}
}

func TestRedirectMAOverflowFromBHS_NilInputs(t *testing.T) {
	// Test with nil MA
	state := &CPFState{
		MA: nil,
		SA: decimal.NewFromInt64(10000, 0),
		RA: decimal.NewFromInt64(10000, 0),
	}
	bhs := decimal.NewFromInt64(79000, 0)

	overflowToSA, overflowToRA := RedirectMAOverflowFromBHS(state, bhs, 35)

	if !overflowToSA.IsZero() || !overflowToRA.IsZero() {
		t.Errorf("expected zero overflow for nil MA, got SA=%.2f, RA=%.2f",
			overflowToSA.ToFloat64(), overflowToRA.ToFloat64())
	}

	// Test with nil BHS
	state2 := &CPFState{
		MA: decimal.NewFromInt64(90000, 0),
		SA: decimal.NewFromInt64(10000, 0),
		RA: decimal.NewFromInt64(10000, 0),
	}

	overflowToSA2, overflowToRA2 := RedirectMAOverflowFromBHS(state2, nil, 35)

	if !overflowToSA2.IsZero() || !overflowToRA2.IsZero() {
		t.Errorf("expected zero overflow for nil BHS, got SA=%.2f, RA=%.2f",
			overflowToSA2.ToFloat64(), overflowToRA2.ToFloat64())
	}
}
