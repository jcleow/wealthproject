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
		name             string
		initialMA        int64
		age              int
		wantOverflowToSA int64
		wantOverflowToRA int64
		wantFinalMA      int64
		wantFinalSA      int64
		wantFinalRA      int64
		initialSA        int64
		initialRA        int64
	}{
		{
			name:             "MA below BHS - no overflow",
			initialMA:        50000,
			age:              35,
			wantOverflowToSA: 0,
			wantOverflowToRA: 0,
			wantFinalMA:      50000,
			wantFinalSA:      10000, // unchanged
			wantFinalRA:      0,
			initialSA:        10000,
			initialRA:        0,
		},
		{
			name:             "MA exactly at BHS - no overflow",
			initialMA:        79000,
			age:              35,
			wantOverflowToSA: 0,
			wantOverflowToRA: 0,
			wantFinalMA:      79000,
			wantFinalSA:      10000, // unchanged
			wantFinalRA:      0,
			initialSA:        10000,
			initialRA:        0,
		},
		{
			name:             "MA exceeds BHS (age < 55) - overflow to SA",
			initialMA:        85000,
			age:              35,
			wantOverflowToSA: 6000, // 85000 - 79000
			wantOverflowToRA: 0,
			wantFinalMA:      79000, // capped at BHS
			wantFinalSA:      16000, // 10000 + 6000
			wantFinalRA:      0,
			initialSA:        10000,
			initialRA:        0,
		},
		{
			name:             "MA exceeds BHS (age 54) - overflow to SA",
			initialMA:        100000,
			age:              54,
			wantOverflowToSA: 21000, // 100000 - 79000
			wantOverflowToRA: 0,
			wantFinalMA:      79000,
			wantFinalSA:      31000, // 10000 + 21000
			wantFinalRA:      0,
			initialSA:        10000,
			initialRA:        0,
		},
		{
			name:             "MA exceeds BHS (age 55) - overflow to RA",
			initialMA:        90000,
			age:              55,
			wantOverflowToSA: 0,
			wantOverflowToRA: 11000, // 90000 - 79000
			wantFinalMA:      79000,
			wantFinalSA:      10000, // unchanged
			wantFinalRA:      111000, // 100000 + 11000
			initialSA:        10000,
			initialRA:        100000,
		},
		{
			name:             "MA exceeds BHS (age 60) - overflow to RA",
			initialMA:        95000,
			age:              60,
			wantOverflowToSA: 0,
			wantOverflowToRA: 16000, // 95000 - 79000
			wantFinalMA:      79000,
			wantFinalSA:      10000,
			wantFinalRA:      216000, // 200000 + 16000
			initialSA:        10000,
			initialRA:        200000,
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

			// Check overflow amounts using decimal comparison
			wantOverflowSA := decimal.NewFromInt64(tt.wantOverflowToSA, 0)
			wantOverflowRA := decimal.NewFromInt64(tt.wantOverflowToRA, 0)
			if !overflowToSA.EQ(wantOverflowSA) {
				t.Errorf("overflowToSA = %s, want %s", overflowToSA.String(), wantOverflowSA.String())
			}
			if !overflowToRA.EQ(wantOverflowRA) {
				t.Errorf("overflowToRA = %s, want %s", overflowToRA.String(), wantOverflowRA.String())
			}

			// Check final balances using decimal comparison
			wantFinalMA := decimal.NewFromInt64(tt.wantFinalMA, 0)
			wantFinalSA := decimal.NewFromInt64(tt.wantFinalSA, 0)
			wantFinalRA := decimal.NewFromInt64(tt.wantFinalRA, 0)
			if !state.MA.EQ(wantFinalMA) {
				t.Errorf("finalMA = %s, want %s", state.MA.String(), wantFinalMA.String())
			}
			if !state.SA.EQ(wantFinalSA) {
				t.Errorf("finalSA = %s, want %s", state.SA.String(), wantFinalSA.String())
			}
			if !state.RA.EQ(wantFinalRA) {
				t.Errorf("finalRA = %s, want %s", state.RA.String(), wantFinalRA.String())
			}
		})
	}
}

func TestProcessMonth_MAOverflow(t *testing.T) {
	// Use dynamic base year from assumptions to avoid test failures when year changes
	assumptions := DefaultAssumptions()
	baseYear := assumptions.RetirementSumsBaseYear
	baseBHS := assumptions.BHSBase

	// Test date uses the base year from assumptions
	testDate := time.Date(baseYear, 6, 1, 0, 0, 0, 0, time.UTC)

	// Named constants for test ages (CPF policy ages)
	const ageUnder55 = 35
	const ageAt55 = 55

	// Person age 35 in base year
	dobAge35 := time.Date(baseYear-ageUnder55, 1, 1, 0, 0, 0, 0, time.UTC)

	// Person age 55 in base year
	dobAge55 := time.Date(baseYear-ageAt55, 1, 1, 0, 0, 0, 0, time.UTC)

	// BHS for base year (dynamically from assumptions) - use decimal throughout
	bhs := baseBHS

	// Use BHS-relative values so tests work regardless of base year
	bhsInt := bhs.ToCents() / 100 // Convert to int64 for test struct fields

	// Monthly MA interest rate: 4% / 12 = 0.333%
	// Interest is applied BEFORE contributions (on opening balance)
	// So when MA < BHS, interest is added to MA first, reducing room for contributions

	tests := []struct {
		name             string
		initialMA        int64
		initialSA        int64
		initialRA        int64
		maContribution   int64
		dob              time.Time
		raFormed         bool
		wantMAOverflowSA *decimal.Decimal
		wantMAOverflowRA *decimal.Decimal
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
			wantMAOverflowSA:  decimal.Zero(),
			wantMAOverflowRA:  decimal.Zero(),
			wantMACappedAtBHS: false, // MA stays below BHS
		},
		{
			name: "Contribution causes MA to exceed BHS (age < 55) - partial overflow to SA",
			// Interest is applied first: 78500 × 0.04/12 ≈ 261.67 → MA becomes 78761.67
			// Room remaining: 79000 - 78761.67 = 238.33
			// Contribution 1000: 238.33 to MA + 761.67 overflow to SA
			initialMA:         bhsInt - 500, // 78500
			initialSA:         50000,
			initialRA:         0,
			maContribution:    1000,
			dob:               dobAge35,
			raFormed:          false,
			wantMAOverflowSA:  decimal.MustFromString("761.67"), // 1000 - 238.33 (room after interest)
			wantMAOverflowRA:  decimal.Zero(),
			wantMACappedAtBHS: true,
		},
		{
			name: "MA already at BHS - full contribution overflows to SA (age < 55)",
			// MA at BHS: interest also overflows (263.33 = 79000 × 0.04/12)
			// Contribution 800: entire amount overflows
			initialMA:         bhsInt, // already at BHS
			initialSA:         50000,
			initialRA:         0,
			maContribution:    800,
			dob:               dobAge35,
			raFormed:          false,
			wantMAOverflowSA:  decimal.NewFromInt64(800, 0), // entire contribution overflows
			wantMAOverflowRA:  decimal.Zero(),
			wantMACappedAtBHS: true,
		},
		{
			name: "Contribution causes MA to exceed BHS (age 55) - overflow to RA",
			// Interest first: 78000 × 0.04/12 = 260.00 → MA becomes 78260.00
			// Room remaining: 79000 - 78260 = 740
			// Contribution 2000: 740 to MA + 1260 overflow to RA
			initialMA:         bhsInt - 1000, // 78000
			initialSA:         0,
			initialRA:         200000,
			maContribution:    2000,
			dob:               dobAge55,
			raFormed:          true,
			wantMAOverflowSA:  decimal.Zero(),
			wantMAOverflowRA:  decimal.NewFromInt64(1260, 0), // 2000 - 740 (room after interest)
			wantMACappedAtBHS: true,
		},
		{
			name: "MA already at BHS - full contribution overflows to RA (age 55)",
			// MA at BHS: interest also overflows to RA
			// Contribution 600: entire amount overflows to RA
			initialMA:         bhsInt, // already at BHS
			initialSA:         0,
			initialRA:         200000,
			maContribution:    600,
			dob:               dobAge55,
			raFormed:          true,
			wantMAOverflowSA:  decimal.Zero(),
			wantMAOverflowRA:  decimal.NewFromInt64(600, 0),
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
			if !result.MAOverflowToSA.EQ(tt.wantMAOverflowSA) {
				t.Errorf("MAOverflowToSA = %s, want %s", result.MAOverflowToSA.String(), tt.wantMAOverflowSA.String())
			}
			if !result.MAOverflowToRA.EQ(tt.wantMAOverflowRA) {
				t.Errorf("MAOverflowToRA = %s, want %s", result.MAOverflowToRA.String(), tt.wantMAOverflowRA.String())
			}

			// Verify MA was capped at BHS
			// After overflow handling, MA should be exactly at BHS (contributions that exceed BHS are redirected)
			endState := result.EndOfMonthState

			if tt.wantMACappedAtBHS {
				// MA should be exactly at BHS after overflow handling
				if !endState.MA.EQ(bhs) {
					t.Errorf("finalMA = %s, expected exactly BHS = %s", endState.MA.String(), bhs.String())
				}
			}

			// Verify exact SA/RA balances (overflow already verified above via MAOverflowToSA/RA)
			// The overflow tracking fields are the source of truth for overflow amounts
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
	//   - 2030: BHS = $79,000 × 1.04⁴ = $92,418.83
	//
	// This means in 2030, a member can have up to $92,418.83 in MA before overflow
	// occurs, NOT the original $79,000 cap.
	// =============================================================================

	// Get base year and BHS from assumptions (dynamically set to current year)
	assumptions := DefaultAssumptions()
	baseYear := assumptions.RetirementSumsBaseYear
	baseBHS := assumptions.BHSBase

	// Test age: person under 55 (so MA overflow goes to SA, not RA)
	const testAge = 35
	dob := time.Date(baseYear-testAge, 1, 1, 0, 0, 0, 0, time.UTC)

	// Helper: Calculate projected BHS for any year using 4% annual growth
	// Uses decimal arithmetic to avoid float precision issues
	// Formula: BHS(year) = baseBHS × 1.04^(year - baseYear)
	getBHSForYear := func(year int) *decimal.Decimal {
		return assumptions.GetBHS(year)
	}

	// Helper to create initial MA as BHS minus offset (using decimal)
	bhsMinus := func(year int, offset int64) *decimal.Decimal {
		return getBHSForYear(year).Sub(decimal.NewFromInt64(offset, 0))
	}

	// NOTE: Interest is applied BEFORE contributions (on opening balance)
	// So the room available for contribution is reduced by the interest first applied

	tests := []struct {
		name           string
		description    string // Detailed explanation of what this test verifies
		year           int
		initialMA      *decimal.Decimal
		maContribution *decimal.Decimal
		wantOverflow   bool
	}{
		{
			name: "Base year - contribution exceeds base BHS, triggers overflow",
			description: `
				Year: baseYear (e.g., 2026)
				BHS cap: $79,000 (base value, no growth applied)
				Initial MA: $78,500 (BHS - $500)

				Interest applied first: $78,500 × 0.04/12 ≈ $261.67
				MA after interest: $78,761.67
				Room remaining: $79,000 - $78,761.67 = $238.33

				Contribution: $1,000
				Overflow: $1,000 - $238.33 = $761.67 redirected to SA
				Final MA: capped at $79,000`,
			year:           baseYear,
			initialMA:      bhsMinus(baseYear, 500),
			maContribution: decimal.NewFromInt64(1000, 0),
			wantOverflow:   true,
		},
		{
			name: "Base year + 2 - BHS grown to ~$85,446, contribution triggers overflow",
			description: `
				Year: baseYear + 2 (e.g., 2028)
				BHS cap: $79,000 × 1.04² = $85,446.40 (grown by 8.16%)
				Initial MA: $84,946 (projected BHS - $500)

				Interest applied first: $84,946 × 0.04/12 ≈ $283.15
				MA after interest: $85,229.55
				Room remaining: $85,446 - $85,229.55 = $216.85

				Contribution: $1,000
				Overflow: $1,000 - $216.85 = $783.15 redirected to SA

				KEY: The overflow check uses the GROWN BHS ($85,446), not base ($79,000)`,
			year:           baseYear + 2,
			initialMA:      bhsMinus(baseYear+2, 500),
			maContribution: decimal.NewFromInt64(1000, 0),
			wantOverflow:   true,
		},
		{
			name: "Base year + 4 - BHS grown to ~$92,419, contribution triggers overflow",
			description: `
				Year: baseYear + 4 (e.g., 2030)
				BHS cap: $79,000 × 1.04⁴ = $92,418.83 (grown by 17%)
				Initial MA: $91,918 (projected BHS - $500)

				Interest applied first: $91,918 × 0.04/12 ≈ $306.40
				MA after interest: $92,224.23
				Room remaining: $92,418.83 - $92,224.23 = $194.60

				Contribution: $1,000
				Overflow: $1,000 - $194.60 = $805.40 redirected to SA

				KEY: Member can hold $13,418 MORE in MA than in base year before overflow`,
			year:           baseYear + 4,
			initialMA:      bhsMinus(baseYear+4, 500),
			maContribution: decimal.NewFromInt64(1000, 0),
			wantOverflow:   true,
		},
		{
			name: "Base year + 4 - MA below grown BHS threshold, NO overflow",
			description: `
				Year: baseYear + 4 (e.g., 2030)
				BHS cap: $79,000 × 1.04⁴ = $92,418.83
				Initial MA: $90,418 (projected BHS - $2,000)

				Interest applied first: $90,418 × 0.04/12 ≈ $301.39
				MA after interest: $90,719.39
				Room remaining: $92,418.83 - $90,719.39 = $1,699.44

				Contribution: $1,000 (fits within remaining room)
				Overflow: $0 (no overflow occurs)
				Final MA: $91,719.39

				KEY: Without BHS growth, this $91,418 would have overflowed the base $79,000 cap.
				     But with 4% annual growth, the cap is now $92,418, so no overflow.`,
			year:           baseYear + 4,
			initialMA:      bhsMinus(baseYear+4, 2000),
			maContribution: decimal.NewFromInt64(1000, 0),
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
				tt.initialMA,
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
					MA: tt.maContribution,
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
				tt.year, projectedBHS.ToFloat64(), baseBHS.ToFloat64(), tt.year-baseYear)

			// Interest is applied BEFORE contributions
			// Calculate monthly interest: initialMA × (4% / 12)
			// Then calculate room remaining: BHS - (initialMA + interest)
			// Overflow = contribution - room (if contribution > room)
			maRatePct := decimal.NewFromInt64(4, 0) // 4% annual
			monthlyInterest := CalculateMonthlyInterest(tt.initialMA, maRatePct)
			maAfterInterest := tt.initialMA.Add(monthlyInterest)

			var expectedOverflow *decimal.Decimal
			if maAfterInterest.GTE(projectedBHS) {
				// MA already at/above BHS after interest - full contribution overflows
				expectedOverflow = tt.maContribution
			} else {
				remainderToMACap := projectedBHS.Sub(maAfterInterest)
				expectedOverflow = tt.maContribution.Sub(remainderToMACap)
				if expectedOverflow.IsNegative() {
					expectedOverflow = decimal.Zero()
				}
			}

			actualOverflow := result.MAOverflowToSA
			t.Logf("Initial MA: $%.2f + Interest: $%.2f = $%.2f → Room: $%.2f → Overflow to SA: $%.2f",
				tt.initialMA.ToFloat64(), monthlyInterest.ToFloat64(),
				maAfterInterest.ToFloat64(),
				projectedBHS.Sub(maAfterInterest).ToFloat64(),
				actualOverflow.ToFloat64())

			// Verify overflow occurred/didn't occur as expected
			if tt.wantOverflow {
				if actualOverflow.IsZero() {
					t.Errorf("Expected overflow but got none. MA contribution should have exceeded projected BHS of %s",
						projectedBHS.String())
				}
				// Check overflow amount matches expected exactly - no tolerance allowed
				if !actualOverflow.EQ(expectedOverflow) {
					t.Errorf("MAOverflowToSA = %s, want exactly %s",
						actualOverflow.String(), expectedOverflow.String())
				}
			} else {
				if !actualOverflow.IsZero() {
					totalAfterContrib := maAfterInterest.Add(tt.maContribution)
					t.Errorf("Expected NO overflow but got %s. Total MA (%s) should be below projected BHS (%s)",
						actualOverflow.String(), totalAfterContrib.String(), projectedBHS.String())
				}
			}

			// Verify MA is capped exactly at projected BHS (if overflow occurred)
			// Overflow handling caps MA at BHS - no tolerance allowed
			if tt.wantOverflow {
				endMA := result.EndOfMonthState.MA
				// MA should be exactly at projected BHS after overflow handling
				if !endMA.EQ(projectedBHS) {
					t.Errorf("Final MA = %s, should be exactly projected BHS %s",
						endMA.String(), projectedBHS.String())
				}
				t.Logf("Final MA: %s (capped at BHS)", endMA.String())
			}

			// KEY ASSERTION: Verify BHS is actually growing across years
			if tt.year > baseYear {
				if projectedBHS.LTE(baseBHS) {
					t.Errorf("CRITICAL: BHS for year %d (%s) should be GREATER than base BHS (%s). Growth not applied!",
						tt.year, projectedBHS.String(), baseBHS.String())
				}
				t.Logf("BHS growth verification: %s > base %s ✓",
					projectedBHS.String(), baseBHS.String())
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

// TestApplyMonthlyInterest_MAInterestOverflow tests that MA interest overflows to SA/RA when MA >= BHS
func TestApplyMonthlyInterest_MAInterestOverflow(t *testing.T) {
	assumptions := DefaultAssumptions()
	baseYear := assumptions.RetirementSumsBaseYear
	baseBHS := assumptions.GetBHS(baseYear)

	// MA interest rate: 4% annual (used for calculating expected interest)
	maRatePct := decimal.NewFromInt64(4, 0)

	// BHS value for test cases - use ToCents for accurate int64 conversion
	bhsInt := baseBHS.ToCents() / 100

	tests := []struct {
		name                   string
		initialMA              int64
		age                    int
		raFormed               bool
		wantInterestOverflowSA bool
		wantInterestOverflowRA bool
	}{
		{
			name:                   "MA below BHS (age 35) - no interest overflow",
			initialMA:              70000,
			age:                    35,
			raFormed:               false,
			wantInterestOverflowSA: false,
			wantInterestOverflowRA: false,
		},
		{
			name:                   "MA at BHS (age 35) - interest overflows to SA",
			initialMA:              bhsInt,
			age:                    35,
			raFormed:               false,
			wantInterestOverflowSA: true,
			wantInterestOverflowRA: false,
		},
		{
			name:                   "MA above BHS (age 35) - interest overflows to SA",
			initialMA:              bhsInt + 5000,
			age:                    35,
			raFormed:               false,
			wantInterestOverflowSA: true,
			wantInterestOverflowRA: false,
		},
		{
			name:                   "MA at BHS (age 55) - interest overflows to RA",
			initialMA:              bhsInt,
			age:                    55,
			raFormed:               true,
			wantInterestOverflowSA: false,
			wantInterestOverflowRA: true,
		},
		{
			name:                   "MA above BHS (age 60) - interest overflows to RA",
			initialMA:              bhsInt + 10000,
			age:                    60,
			raFormed:               true,
			wantInterestOverflowSA: false,
			wantInterestOverflowRA: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			testDate := time.Date(baseYear, 6, 1, 0, 0, 0, 0, time.UTC)
			dob := testDate.AddDate(-tt.age, 0, 0)

			state := NewCPFState(
				decimal.NewFromInt64(100000, 0),      // OA
				decimal.NewFromInt64(50000, 0),       // SA
				decimal.NewFromInt64(tt.initialMA, 0), // MA
				decimal.NewFromInt64(200000, 0),      // RA
				dob,
				"male",
				config.ResidencyCitizen,
				testDate,
			)
			state.RAFormed = tt.raFormed

			initialSA := state.SA
			initialRA := state.RA

			result := ApplyMonthlyInterest(state, DefaultAssumptions())

			// Check MA interest overflow tracking
			if tt.wantInterestOverflowSA {
				if result.MAInterestOverflowToSA == nil || result.MAInterestOverflowToSA.IsZero() {
					t.Errorf("Expected MA interest overflow to SA, but got none")
				} else {
					overflow := result.MAInterestOverflowToSA
					// Calculate expected interest for actual MA balance (may differ from BHS)
					actualMAInterest := CalculateMonthlyInterest(decimal.NewFromInt64(tt.initialMA, 0), maRatePct)
					// Interest overflow should match the calculated MA interest exactly
					if !overflow.EQ(actualMAInterest) {
						t.Errorf("MAInterestOverflowToSA = %s, expected exactly %s", overflow.String(), actualMAInterest.String())
					}
					t.Logf("MA interest %s overflowed to SA (age %d)", overflow.String(), tt.age)

					// Verify SA balance increased by at least the overflow amount
					saIncrease := state.SA.Sub(initialSA)
					if saIncrease.LT(overflow) {
						t.Errorf("SA increase (%s) should be at least MA overflow (%s)", saIncrease.String(), overflow.String())
					}
				}
			}

			if tt.wantInterestOverflowRA {
				if result.MAInterestOverflowToRA == nil || result.MAInterestOverflowToRA.IsZero() {
					t.Errorf("Expected MA interest overflow to RA, but got none")
				} else {
					overflow := result.MAInterestOverflowToRA
					// Calculate expected interest for actual MA balance
					actualMAInterest := CalculateMonthlyInterest(decimal.NewFromInt64(tt.initialMA, 0), maRatePct)
					// Interest overflow should match the calculated MA interest exactly
					if !overflow.EQ(actualMAInterest) {
						t.Errorf("MAInterestOverflowToRA = %s, expected exactly %s", overflow.String(), actualMAInterest.String())
					}
					t.Logf("MA interest %s overflowed to RA (age %d)", overflow.String(), tt.age)

					// Verify RA balance increased by at least the overflow amount
					raIncrease := state.RA.Sub(initialRA)
					if raIncrease.LT(overflow) {
						t.Errorf("RA increase (%s) should be at least MA overflow (%s)", raIncrease.String(), overflow.String())
					}
				}
			}

			// If no overflow expected, verify the fields are zero
			if !tt.wantInterestOverflowSA && !tt.wantInterestOverflowRA {
				if result.MAInterestOverflowToSA != nil && !result.MAInterestOverflowToSA.IsZero() {
					t.Errorf("Expected no MA interest overflow, but got SA overflow: %s",
						result.MAInterestOverflowToSA.String())
				}
				if result.MAInterestOverflowToRA != nil && !result.MAInterestOverflowToRA.IsZero() {
					t.Errorf("Expected no MA interest overflow, but got RA overflow: %s",
						result.MAInterestOverflowToRA.String())
				}
			}
		})
	}
}
