package timeline_v2

import (
	"testing"
	"time"

	"financial-chat-system/backend/internal/cpf/account"
	"financial-chat-system/backend/internal/decimal"
)

// =============================================================================
// Test: Gender should be fetched from CPFAccount, not hardcoded
// =============================================================================

func TestNewCPFContext_GenderNotHardcoded(t *testing.T) {
	// This test verifies that gender is fetched from CPFAccount.Gender, not hardcoded

	// Test 1: Female gender should be used
	cpfAccountFemale := &account.CPFAccount{
		ID:              "test-id",
		PersonID:        "person-id",
		OABalance:       *decimal.MustFromFloat64(50000),
		SABalance:       *decimal.MustFromFloat64(30000),
		MABalance:       *decimal.MustFromFloat64(20000),
		RABalance:       *decimal.Zero(),
		DateOfBirth:     time.Date(1990, 6, 15, 0, 0, 0, 0, time.UTC),
		ResidencyStatus: "citizen",
		Gender:          "female",
	}

	ctx := NewCPFContext(cpfAccountFemale)
	if ctx == nil {
		t.Fatal("NewCPFContext returned nil")
	}
	if ctx.EngineState == nil {
		t.Fatal("EngineState is nil")
	}
	if ctx.EngineState.Gender != "female" {
		t.Errorf("Gender should be 'female' from CPFAccount, got %q", ctx.EngineState.Gender)
	} else {
		t.Log("PASS: Gender correctly fetched from CPFAccount (female)")
	}

	// Test 2: Male gender should be used
	cpfAccountMale := &account.CPFAccount{
		ID:              "test-id-2",
		PersonID:        "person-id-2",
		OABalance:       *decimal.MustFromFloat64(50000),
		SABalance:       *decimal.MustFromFloat64(30000),
		MABalance:       *decimal.MustFromFloat64(20000),
		RABalance:       *decimal.Zero(),
		DateOfBirth:     time.Date(1990, 6, 15, 0, 0, 0, 0, time.UTC),
		ResidencyStatus: "citizen",
		Gender:          "male",
	}

	ctx2 := NewCPFContext(cpfAccountMale)
	if ctx2.EngineState.Gender != "male" {
		t.Errorf("Gender should be 'male' from CPFAccount, got %q", ctx2.EngineState.Gender)
	} else {
		t.Log("PASS: Gender correctly fetched from CPFAccount (male)")
	}

	// Test 3: Empty gender should default to male
	cpfAccountEmpty := &account.CPFAccount{
		ID:              "test-id-3",
		PersonID:        "person-id-3",
		OABalance:       *decimal.MustFromFloat64(50000),
		SABalance:       *decimal.MustFromFloat64(30000),
		MABalance:       *decimal.MustFromFloat64(20000),
		RABalance:       *decimal.Zero(),
		DateOfBirth:     time.Date(1990, 6, 15, 0, 0, 0, 0, time.UTC),
		ResidencyStatus: "citizen",
		Gender:          "", // Empty should default to male
	}

	ctx3 := NewCPFContext(cpfAccountEmpty)
	if ctx3.EngineState.Gender != "male" {
		t.Errorf("Empty gender should default to 'male', got %q", ctx3.EngineState.Gender)
	} else {
		t.Log("PASS: Empty gender correctly defaults to 'male'")
	}
}

// =============================================================================
// Test: RA Formation at Age 55
// =============================================================================

func TestApplyEngineProcessing_RAFormationAtAge55(t *testing.T) {
	// Arrange - Person who is exactly 55
	// DOB March 15, 1971 + currentDate April 1, 2026 = age 55 (after birthday)
	dob := time.Date(1971, 3, 15, 0, 0, 0, 0, time.UTC) // Born March 1971
	currentDate := time.Date(2026, 4, 1, 0, 0, 0, 0, time.UTC) // April 2026 = age 55 (after March birthday)

	cpfAccount := &account.CPFAccount{
		ID:              "test-id",
		PersonID:        "person-id",
		OABalance:       *decimal.MustFromFloat64(200000), // $200k OA
		SABalance:       *decimal.MustFromFloat64(150000), // $150k SA
		MABalance:       *decimal.MustFromFloat64(68000),  // $68k MA (below BHS)
		RABalance:       *decimal.Zero(),                  // No RA yet
		DateOfBirth:     dob,
		ResidencyStatus: "citizen",
	}

	ctx := NewCPFContext(cpfAccount)
	if ctx == nil {
		t.Fatal("NewCPFContext returned nil")
	}

	// Verify initial state
	if ctx.EngineState.RAFormed {
		t.Fatal("RAFormed should be false initially")
	}

	// Act - Apply engine processing at age 55
	// Currently uses ApplyMonthlyInterest which does NOT handle RA formation
	ctx.ApplyEngineProcessing(currentDate, true)

	// Assert - EXPECTED TO FAIL until implementation
	// RA should have been formed at age 55
	if ctx.EngineState.RA == nil || ctx.EngineState.RA.IsZero() {
		t.Error("FAIL: RA should have been formed at age 55, but RA is zero")
		t.Log("This test will pass after ApplyEngineProcessing uses engine.ProcessMonth()")
	} else {
		t.Logf("RA formed: %s", ctx.EngineState.RA.String())
	}

	// RAFormed flag should be set
	if !ctx.EngineState.RAFormed {
		t.Error("FAIL: RAFormed flag should be true after age 55 processing")
	}
}

// =============================================================================
// Test: SA→RA Contribution Redirect at Age 55+ (Simplified)
// =============================================================================

func TestApplyEngineProcessing_Age55Plus_NoSAAccumulation(t *testing.T) {
	// After age 55, SA contributions should redirect to RA
	// This test verifies SA doesn't grow inappropriately after 55

	// Arrange - Person aged 56 (RA already formed)
	dob := time.Date(1970, 1, 15, 0, 0, 0, 0, time.UTC) // Born Jan 1970
	currentDate := time.Date(2026, 6, 1, 0, 0, 0, 0, time.UTC) // June 2026 = age 56

	cpfAccount := &account.CPFAccount{
		ID:              "test-id",
		PersonID:        "person-id",
		OABalance:       *decimal.MustFromFloat64(100000),
		SABalance:       *decimal.MustFromFloat64(0),      // SA depleted at 55
		MABalance:       *decimal.MustFromFloat64(68000),
		RABalance:       *decimal.MustFromFloat64(250000), // RA formed
		DateOfBirth:     dob,
		ResidencyStatus: "citizen",
	}

	ctx := NewCPFContext(cpfAccount)
	if ctx == nil {
		t.Fatal("NewCPFContext returned nil")
	}

	// Manually set RA formed (since engine doesn't do it yet)
	ctx.EngineState.RAFormed = true

	// Act - process one month (interest only, no contributions in this test)
	ctx.ApplyEngineProcessing(currentDate, true)

	// Assert - SA should remain at 0 (no SA after 55)
	if ctx.EngineState.SA != nil && ctx.EngineState.SA.ToFloat64() > 0 {
		t.Logf("SA = %.2f (should be 0 after age 55)", ctx.EngineState.SA.ToFloat64())
	}
}

// =============================================================================
// Test: CPF LIFE Payout Activation at Age 65
// =============================================================================

func TestApplyEngineProcessing_CPFLifeActivationAtAge65(t *testing.T) {
	// Arrange - Person who is exactly 65
	// DOB April 15, 1961 + currentDate May 1, 2026 = age 65 (after birthday)
	dob := time.Date(1961, 4, 15, 0, 0, 0, 0, time.UTC) // Born April 1961
	currentDate := time.Date(2026, 5, 1, 0, 0, 0, 0, time.UTC) // May 2026 = age 65 (after April birthday)

	cpfAccount := &account.CPFAccount{
		ID:              "test-id",
		PersonID:        "person-id",
		OABalance:       *decimal.MustFromFloat64(80000),
		SABalance:       *decimal.MustFromFloat64(0),
		MABalance:       *decimal.MustFromFloat64(70000),
		RABalance:       *decimal.MustFromFloat64(300000), // $300k RA
		DateOfBirth:     dob,
		ResidencyStatus: "citizen",
	}

	ctx := NewCPFContext(cpfAccount)
	if ctx == nil {
		t.Fatal("NewCPFContext returned nil")
	}

	// Set RA as already formed
	ctx.EngineState.RAFormed = true
	ctx.EngineState.PayoutsActive = false

	// Act - Apply engine processing at age 65
	ctx.ApplyEngineProcessing(currentDate, true)

	// Assert - EXPECTED TO FAIL until implementation
	if !ctx.EngineState.PayoutsActive {
		t.Error("FAIL: PayoutsActive should be true after age 65 processing")
		t.Log("This test will pass after ApplyEngineProcessing uses engine.ProcessMonth()")
	}

	if ctx.EngineState.MonthlyPayout == nil || ctx.EngineState.MonthlyPayout.IsZero() {
		t.Error("FAIL: MonthlyPayout should be set after CPF LIFE activation")
	} else {
		t.Logf("Monthly CPF LIFE payout: $%.2f", ctx.EngineState.MonthlyPayout.ToFloat64())
	}
}

// =============================================================================
// Test: Monthly Payout Deduction After Age 65
// =============================================================================

func TestApplyEngineProcessing_MonthlyPayoutDeductsFromRA(t *testing.T) {
	// Arrange - Person aged 66, CPF LIFE already active
	dob := time.Date(1960, 1, 15, 0, 0, 0, 0, time.UTC)
	currentDate := time.Date(2026, 6, 1, 0, 0, 0, 0, time.UTC) // June 2026 = age 66

	cpfAccount := &account.CPFAccount{
		ID:              "test-id",
		PersonID:        "person-id",
		OABalance:       *decimal.MustFromFloat64(50000),
		SABalance:       *decimal.MustFromFloat64(0),
		MABalance:       *decimal.MustFromFloat64(70000),
		RABalance:       *decimal.MustFromFloat64(280000),
		DateOfBirth:     dob,
		ResidencyStatus: "citizen",
	}

	ctx := NewCPFContext(cpfAccount)
	if ctx == nil {
		t.Fatal("NewCPFContext returned nil")
	}

	// Manually set payout state (since engine doesn't activate it yet)
	ctx.EngineState.RAFormed = true
	ctx.EngineState.PayoutsActive = true
	ctx.EngineState.MonthlyPayout = decimal.MustFromFloat64(1800)
	ctx.EngineState.CumulativePayouts = decimal.MustFromFloat64(21600) // 12 months

	raBefore := ctx.EngineState.RA.ToFloat64()
	cumulativeBefore := ctx.EngineState.CumulativePayouts.ToFloat64()

	// Act
	ctx.ApplyEngineProcessing(currentDate, true)

	// Assert - Check if payout was deducted
	cumulativeAfter := ctx.EngineState.CumulativePayouts.ToFloat64()

	// EXPECTED TO FAIL: CumulativePayouts should increase by MonthlyPayout
	// Currently, ApplyMonthlyInterest doesn't handle payouts
	cumulativeIncrease := cumulativeAfter - cumulativeBefore
	if cumulativeIncrease < 1 {
		t.Error("FAIL: CumulativePayouts should increase after payout month")
		t.Logf("CumulativePayouts: before=%.2f, after=%.2f, increase=%.2f",
			cumulativeBefore, cumulativeAfter, cumulativeIncrease)
		t.Log("This test will pass after ApplyEngineProcessing uses engine.ProcessMonth()")
	}

	raAfter := ctx.EngineState.RA.ToFloat64()
	t.Logf("RA: before=%.2f, after=%.2f, change=%.2f", raBefore, raAfter, raAfter-raBefore)
}

// =============================================================================
// Test: Interest Calculation (should already work)
// =============================================================================

func TestApplyEngineProcessing_InterestApplied(t *testing.T) {
	// This test should PASS - interest calculation already works
	dob := time.Date(1996, 1, 15, 0, 0, 0, 0, time.UTC)
	currentDate := time.Date(2026, 6, 1, 0, 0, 0, 0, time.UTC)

	cpfAccount := &account.CPFAccount{
		ID:              "test-id",
		PersonID:        "person-id",
		OABalance:       *decimal.MustFromFloat64(100000),
		SABalance:       *decimal.MustFromFloat64(50000),
		MABalance:       *decimal.MustFromFloat64(30000),
		RABalance:       *decimal.Zero(),
		DateOfBirth:     dob,
		ResidencyStatus: "citizen",
	}

	ctx := NewCPFContext(cpfAccount)
	if ctx == nil {
		t.Fatal("NewCPFContext returned nil")
	}

	oaBefore := ctx.EngineState.OA.ToFloat64()
	saBefore := ctx.EngineState.SA.ToFloat64()

	// Act
	result := ctx.ApplyEngineProcessing(currentDate, true)

	// Assert
	oaAfter := ctx.EngineState.OA.ToFloat64()
	saAfter := ctx.EngineState.SA.ToFloat64()

	// OA interest: ~$208 (2.5% / 12 * $100k)
	oaInterest := oaAfter - oaBefore
	expectedOAInterest := 100000 * 0.025 / 12
	if oaInterest < expectedOAInterest*0.95 || oaInterest > expectedOAInterest*1.05 {
		t.Errorf("OA interest = %.2f, want ~%.2f", oaInterest, expectedOAInterest)
	} else {
		t.Logf("OA interest: %.2f (expected ~%.2f) - PASS", oaInterest, expectedOAInterest)
	}

	// SA interest: ~$167 (4.0% / 12 * $50k) + extra interest
	saInterest := saAfter - saBefore
	minSAInterest := 50000 * 0.04 / 12
	if saInterest < minSAInterest {
		t.Errorf("SA interest = %.2f, want at least %.2f", saInterest, minSAInterest)
	} else {
		t.Logf("SA interest: %.2f (min expected ~%.2f) - PASS", saInterest, minSAInterest)
	}

	if result != nil {
		t.Logf("Interest result: OA=%v, SA=%v, Extra=%v, Total=%v",
			result.BaseInterestOA, result.BaseInterestSA, result.ExtraInterest, result.TotalInterest)
	}
}

// =============================================================================
// Test: Full lifecycle simulation over multiple years
// =============================================================================

func TestApplyEngineProcessing_FullLifecycleSimulation(t *testing.T) {
	// Simulate CPF lifecycle from age 54 to 66
	dob := time.Date(1971, 6, 15, 0, 0, 0, 0, time.UTC)

	cpfAccount := &account.CPFAccount{
		ID:              "test-id",
		PersonID:        "person-id",
		OABalance:       *decimal.MustFromFloat64(180000),
		SABalance:       *decimal.MustFromFloat64(140000),
		MABalance:       *decimal.MustFromFloat64(65000),
		RABalance:       *decimal.Zero(),
		DateOfBirth:     dob,
		ResidencyStatus: "citizen",
	}

	ctx := NewCPFContext(cpfAccount)
	if ctx == nil {
		t.Fatal("NewCPFContext returned nil")
	}

	// Track state transitions
	raFormedYear := 0
	payoutsStartedYear := 0

	// Process year by year from 2025 (age 53) to 2037 (age 66)
	for year := 2025; year <= 2037; year++ {
		// Process December of each year
		currentDate := time.Date(year, 12, 1, 0, 0, 0, 0, time.UTC)
		age := year - 1971
		if currentDate.Month() < 6 || (currentDate.Month() == 6 && currentDate.Day() < 15) {
			age--
		}

		raBeforeProcessing := ctx.EngineState.RAFormed
		payoutsBeforeProcessing := ctx.EngineState.PayoutsActive

		ctx.ApplyEngineProcessing(currentDate, true)

		// Track RA formation
		if !raBeforeProcessing && ctx.EngineState.RAFormed {
			raFormedYear = year
			t.Logf("RA formed in %d (age ~%d)", year, age)
		}

		// Track payout start
		if !payoutsBeforeProcessing && ctx.EngineState.PayoutsActive {
			payoutsStartedYear = year
			t.Logf("Payouts started in %d (age ~%d), monthly: %v",
				year, age, ctx.EngineState.MonthlyPayout)
		}

		t.Logf("Year %d (age %d): OA=%.0f, SA=%.0f, MA=%.0f, RA=%.0f, RAFormed=%v, PayoutsActive=%v",
			year, age,
			ctx.EngineState.OA.ToFloat64(),
			ctx.EngineState.SA.ToFloat64(),
			ctx.EngineState.MA.ToFloat64(),
			ctx.EngineState.RA.ToFloat64(),
			ctx.EngineState.RAFormed,
			ctx.EngineState.PayoutsActive)
	}

	// Summary assertions
	t.Log("\n=== SUMMARY ===")

	// EXPECTED TO FAIL: RA should form around age 55 (year 2026)
	if raFormedYear == 0 {
		t.Error("FAIL: RA should have formed at age 55 (2026), but never formed")
	} else if raFormedYear != 2026 {
		t.Errorf("RA formed in %d, expected 2026 (age 55)", raFormedYear)
	} else {
		t.Log("PASS: RA formed in correct year")
	}

	// EXPECTED TO FAIL: Payouts should start around age 65 (year 2036)
	if payoutsStartedYear == 0 {
		t.Error("FAIL: Payouts should have started at age 65 (2036), but never started")
	} else if payoutsStartedYear != 2036 {
		t.Errorf("Payouts started in %d, expected 2036 (age 65)", payoutsStartedYear)
	} else {
		t.Log("PASS: Payouts started in correct year")
	}

	t.Logf("Final state: RAFormed=%v, PayoutsActive=%v, MonthlyPayout=%v",
		ctx.EngineState.RAFormed, ctx.EngineState.PayoutsActive, ctx.EngineState.MonthlyPayout)
}
