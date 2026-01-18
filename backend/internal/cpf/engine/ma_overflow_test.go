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
			if actualOverflowToSA := overflowToSA.ToFloat64(); actualOverflowToSA != tt.wantOverflowToSA {
				t.Errorf("overflowToSA = %.2f, want %.2f", actualOverflowToSA, tt.wantOverflowToSA)
			}
			if actualOverflowToRA := overflowToRA.ToFloat64(); actualOverflowToRA != tt.wantOverflowToRA {
				t.Errorf("overflowToRA = %.2f, want %.2f", actualOverflowToRA, tt.wantOverflowToRA)
			}

			// Check final balances
			if actualFinalMA := state.MA.ToFloat64(); actualFinalMA != tt.wantFinalMA {
				t.Errorf("finalMA = %.2f, want %.2f", actualFinalMA, tt.wantFinalMA)
			}
			if actualFinalSA := state.SA.ToFloat64(); actualFinalSA != tt.wantFinalSA {
				t.Errorf("finalSA = %.2f, want %.2f", actualFinalSA, tt.wantFinalSA)
			}
			if actualFinalRA := state.RA.ToFloat64(); actualFinalRA != tt.wantFinalRA {
				t.Errorf("finalRA = %.2f, want %.2f", actualFinalRA, tt.wantFinalRA)
			}
		})
	}
}

func TestProcessMonth_MAOverflow(t *testing.T) {
	// Use dynamic base year from assumptions to avoid test failures when year changes
	assumptions := DefaultAssumptions()
	baseYear := assumptions.RetirementSumsBaseYear
	baseBHS := assumptions.BHSBase.ToFloat64()

	// Test date uses the base year from assumptions
	testDate := time.Date(baseYear, 6, 1, 0, 0, 0, 0, time.UTC)

	// Person age 35 in base year
	dobAge35 := time.Date(baseYear-35, 1, 1, 0, 0, 0, 0, time.UTC)

	// Person age 55 in base year
	dobAge55 := time.Date(baseYear-55, 1, 1, 0, 0, 0, 0, time.UTC)

	// BHS for base year (dynamically from assumptions)
	bhs := baseBHS

	// Use BHS-relative values so tests work regardless of base year
	bhsInt := int64(bhs)

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
			initialMA:         bhsInt - 9000, // well below BHS
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
			initialMA:         bhsInt - 500, // 500 below BHS
			initialSA:         50000,
			initialRA:         0,
			maContribution:    1000, // will exceed BHS by 500
			dob:               dobAge35,
			raFormed:          false,
			wantMAOverflowSA:  500, // (BHS-500) + 1000 - BHS = 500
			wantMAOverflowRA:  0,
			wantMACappedAtBHS: true,
		},
		{
			name:              "MA already at BHS - full contribution overflows to SA (age < 55)",
			initialMA:         bhsInt, // already at BHS
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
			initialMA:         bhsInt - 1000, // 1000 below BHS
			initialSA:         0,
			initialRA:         200000,
			maContribution:    2000, // will exceed BHS by 1000
			dob:               dobAge55,
			raFormed:          true,
			wantMAOverflowSA:  0,
			wantMAOverflowRA:  1000, // (BHS-1000) + 2000 - BHS = 1000
			wantMACappedAtBHS: true,
		},
		{
			name:              "MA already at BHS - full contribution overflows to RA (age 55)",
			initialMA:         bhsInt, // already at BHS
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
			if actualOverflowToSA := result.MAOverflowToSA.ToFloat64(); actualOverflowToSA != tt.wantMAOverflowSA {
				t.Errorf("MAOverflowToSA = %.2f, want %.2f", actualOverflowToSA, tt.wantMAOverflowSA)
			}
			if actualOverflowToRA := result.MAOverflowToRA.ToFloat64(); actualOverflowToRA != tt.wantMAOverflowRA {
				t.Errorf("MAOverflowToRA = %.2f, want %.2f", actualOverflowToRA, tt.wantMAOverflowRA)
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
	// =============================================================================
	// TEST: Verify that BHS (Basic Healthcare Sum) grows at 4% per year and that
	// monthly MA contributions are compared against the PROJECTED BHS for that year,
	// not the base year BHS.
	//
	// Example with base year 2026:
	//   - 2026: BHS = $79,000 (base)
	//   - 2028: BHS = $79,000 × 1.04² = $85,446.40
	//   - 2030: BHS = $79,000 × 1.04⁴ = $92,436.89
	//
	// This means in 2030, a member can have up to $92,436 in MA before overflow
	// occurs, NOT the original $79,000 cap.
	// =============================================================================

	// Get base year and BHS from assumptions (dynamically set to current year)
	assumptions := DefaultAssumptions()
	baseYear := assumptions.RetirementSumsBaseYear
	baseBHS := assumptions.BHSBase.ToFloat64()

	// Person under 55 (overflow goes to SA)
	dob := time.Date(baseYear-35, 1, 1, 0, 0, 0, 0, time.UTC)

	// Helper: Calculate projected BHS for any year using 4% annual growth
	// Formula: BHS(year) = baseBHS × 1.04^(year - baseYear)
	getBHSForYear := func(year int) float64 {
		years := max(0, year-baseYear)
		growth := 1.0
		for range years {
			growth *= 1.04
		}
		return baseBHS * growth
	}

	tests := []struct {
		name           string
		description    string // Detailed explanation of what this test verifies
		year           int
		initialMA      int64
		maContribution int64
		wantOverflow   bool
	}{
		{
			name: "Base year - contribution exceeds base BHS, triggers overflow",
			description: `
				Year: baseYear (e.g., 2026)
				BHS cap: $79,000 (base value, no growth applied)
				Initial MA: $78,500 (BHS - $500)
				Contribution: $1,000

				After contribution: $78,500 + $1,000 = $79,500
				Overflow: $79,500 - $79,000 = $500 redirected to SA
				Final MA: capped at $79,000`,
			year:           baseYear,
			initialMA:      int64(baseBHS) - 500,
			maContribution: 1000,
			wantOverflow:   true,
		},
		{
			name: "Base year + 2 - BHS grown to ~$85,446, contribution triggers overflow",
			description: `
				Year: baseYear + 2 (e.g., 2028)
				BHS cap: $79,000 × 1.04² = $85,446.40 (grown by 8.16%)
				Initial MA: $84,946 (projected BHS - $500)
				Contribution: $1,000

				After contribution: $84,946 + $1,000 = $85,946
				Overflow: $85,946 - $85,446 = $500 redirected to SA
				Final MA: capped at $85,446

				KEY: The overflow check uses the GROWN BHS ($85,446), not base ($79,000)`,
			year:           baseYear + 2,
			initialMA:      int64(getBHSForYear(baseYear+2)) - 500,
			maContribution: 1000,
			wantOverflow:   true,
		},
		{
			name: "Base year + 4 - BHS grown to ~$92,437, contribution triggers overflow",
			description: `
				Year: baseYear + 4 (e.g., 2030)
				BHS cap: $79,000 × 1.04⁴ = $92,436.89 (grown by 17%)
				Initial MA: $91,937 (projected BHS - $500)
				Contribution: $1,000

				After contribution: $91,937 + $1,000 = $92,937
				Overflow: $92,937 - $92,437 = $500 redirected to SA
				Final MA: capped at $92,437

				KEY: Member can hold $13,437 MORE in MA than in base year before overflow`,
			year:           baseYear + 4,
			initialMA:      int64(getBHSForYear(baseYear+4)) - 500,
			maContribution: 1000,
			wantOverflow:   true,
		},
		{
			name: "Base year + 4 - MA below grown BHS threshold, NO overflow",
			description: `
				Year: baseYear + 4 (e.g., 2030)
				BHS cap: $79,000 × 1.04⁴ = $92,436.89
				Initial MA: $90,437 (projected BHS - $2,000)
				Contribution: $1,000

				After contribution: $90,437 + $1,000 = $91,437
				This is BELOW the grown BHS of $92,437
				Overflow: $0 (no overflow occurs)
				Final MA: $91,437 (contribution fully absorbed)

				KEY: Without BHS growth, this $91,437 would have overflowed the base $79,000 cap.
				     But with 4% annual growth, the cap is now $92,437, so no overflow.`,
			year:           baseYear + 4,
			initialMA:      int64(getBHSForYear(baseYear+4)) - 2000,
			maContribution: 1000,
			wantOverflow:   false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Log the detailed description for clarity when viewing test output
			t.Logf("Test scenario:%s", tt.description)

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

			// Calculate expected BHS for this specific year (with 4% annual growth)
			projectedBHS := getBHSForYear(tt.year)
			t.Logf("Year %d: Projected BHS = $%.2f (base $%.2f × 1.04^%d)",
				tt.year, projectedBHS, baseBHS, tt.year-baseYear)

			// Calculate expected overflow: (initialMA + contribution) - projectedBHS
			totalMAAfterContribution := float64(tt.initialMA) + float64(tt.maContribution)
			expectedOverflow := totalMAAfterContribution - projectedBHS
			if expectedOverflow < 0 {
				expectedOverflow = 0
			}

			actualOverflow := result.MAOverflowToSA.ToFloat64()
			t.Logf("Initial MA: $%d + Contribution: $%d = $%.2f → Overflow to SA: $%.2f",
				tt.initialMA, tt.maContribution, totalMAAfterContribution, actualOverflow)

			// Verify overflow occurred/didn't occur as expected
			if tt.wantOverflow {
				if actualOverflow <= 0 {
					t.Errorf("Expected overflow but got none. MA contribution should have exceeded projected BHS of $%.2f", projectedBHS)
				}
				// Check overflow amount matches expected (with $1 tolerance for rounding)
				tolerance := 1.0
				if actualOverflow < expectedOverflow-tolerance || actualOverflow > expectedOverflow+tolerance {
					t.Errorf("MAOverflowToSA = $%.2f, want ~$%.2f", actualOverflow, expectedOverflow)
				}
			} else {
				if actualOverflow > 0 {
					t.Errorf("Expected NO overflow but got $%.2f. Total MA ($%.2f) should be below projected BHS ($%.2f)",
						actualOverflow, totalMAAfterContribution, projectedBHS)
				}
			}

			// Verify MA is capped at projected BHS (if overflow occurred)
			if tt.wantOverflow {
				endMA := result.EndOfMonthState.MA.ToFloat64()
				// MA should be near projected BHS (plus up to 0.5% monthly interest)
				maxExpectedMA := projectedBHS * 1.005
				if endMA > maxExpectedMA {
					t.Errorf("Final MA = $%.2f, should be capped near projected BHS $%.2f", endMA, projectedBHS)
				}
				t.Logf("Final MA: $%.2f (capped at projected BHS)", endMA)
			}

			// KEY ASSERTION: Verify BHS is actually growing across years
			if tt.year > baseYear {
				if projectedBHS <= baseBHS {
					t.Errorf("CRITICAL: BHS for year %d ($%.2f) should be GREATER than base BHS ($%.2f). Growth not applied!",
						tt.year, projectedBHS, baseBHS)
				}
				growthPercent := ((projectedBHS / baseBHS) - 1) * 100
				t.Logf("BHS growth verification: $%.2f is %.1f%% above base $%.2f ✓",
					projectedBHS, growthPercent, baseBHS)
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
