package timeline_v2

import (
	"context"
	"math"
	"testing"
	"time"

	"financial-chat-system/backend/internal/cpf/account"
	"financial-chat-system/backend/internal/cpf/projector"
	"financial-chat-system/backend/internal/decimal"
)

// =============================================================================
// Integration Test: Timeline vs Projector Balance Consistency
// =============================================================================
// These tests verify that the Timeline service and Projector produce
// consistent CPF balances at year-end boundaries.
//
// Timeline: Processes month-by-month, returns monthly snapshots
// Projector: Processes month-by-month, returns yearly snapshots (end of December)
//
// At year-end, both should show the same balances.
// =============================================================================

func TestTimelineVsProjector_YearEndBalanceConsistency(t *testing.T) {
	// Create a CPF account for a 30-year-old
	dob := time.Date(1996, 6, 15, 0, 0, 0, 0, time.UTC)
	asOfDate := time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC) // Start of 2026

	cpfAccount := &account.CPFAccount{
		ID:              "test-id",
		PersonID:        "person-id",
		OABalance:       *decimal.MustFromFloat64(80000),
		SABalance:       *decimal.MustFromFloat64(40000),
		MABalance:       *decimal.MustFromFloat64(25000),
		RABalance:       *decimal.Zero(),
		DateOfBirth:     dob,
		ResidencyStatus: "citizen",
		Gender:          "male",
	}

	// === Run Timeline starting from month AFTER AsOfDate (same as Projector) ===
	// Projector uses: current := firstOfMonth(account.AsOfDate).AddDate(0, 1, 0)
	// So for AsOfDate=Jan 1, 2026, it starts from Feb 2026
	ctx := NewCPFContext(cpfAccount)
	if ctx == nil {
		t.Fatal("NewCPFContext returned nil")
	}

	// Process Feb-Dec 2026 (11 months, matching Projector behavior)
	for month := 2; month <= 12; month++ {
		currentDate := time.Date(2026, time.Month(month), 1, 0, 0, 0, 0, time.UTC)
		ctx.ApplyEngineProcessing(currentDate, true)
	}

	// Get Timeline's December 2026 balances
	timelineOA := ctx.EngineState.OA.ToFloat64()
	timelineSA := ctx.EngineState.SA.ToFloat64()
	timelineMA := ctx.EngineState.MA.ToFloat64()
	timelineRA := ctx.EngineState.RA.ToFloat64()

	// === Run Projector ===
	proj := projector.New()
	accountSnapshot := projector.AccountSnapshot{
		OABalance:       &cpfAccount.OABalance,
		SABalance:       &cpfAccount.SABalance,
		MABalance:       &cpfAccount.MABalance,
		RABalance:       &cpfAccount.RABalance,
		DateOfBirth:     dob,
		Gender:          "male",
		ResidencyStatus: "citizen",
		AsOfDate:        asOfDate,
	}

	projResult, err := proj.ProjectBalances(
		context.Background(),
		accountSnapshot,
		nil,  // No incomes - just interest growth
		62,   // Retirement age
		65,   // Payout start age
		nil,  // Default assumptions
	)
	if err != nil {
		t.Fatalf("Projector.ProjectBalances failed: %v", err)
	}

	// Find 2026 snapshot from projector
	var projSnapshot *projector.YearlySnapshot
	for i := range projResult.Snapshots {
		if projResult.Snapshots[i].Year == 2026 {
			projSnapshot = &projResult.Snapshots[i]
			break
		}
	}

	if projSnapshot == nil {
		t.Fatal("Projector did not return 2026 snapshot")
	}

	// Get Projector's Year 2026 balances
	projectorOA := projSnapshot.OA.ToFloat64()
	projectorSA := projSnapshot.SA.ToFloat64()
	projectorMA := projSnapshot.MA.ToFloat64()
	projectorRA := projSnapshot.RA.ToFloat64()

	// === Compare balances ===
	tolerance := 1.0 // Allow $1 difference due to rounding

	t.Logf("=== Year 2026 Balance Comparison ===")
	t.Logf("Timeline (Dec 2026):  OA=%.2f, SA=%.2f, MA=%.2f, RA=%.2f",
		timelineOA, timelineSA, timelineMA, timelineRA)
	t.Logf("Projector (Year 2026): OA=%.2f, SA=%.2f, MA=%.2f, RA=%.2f",
		projectorOA, projectorSA, projectorMA, projectorRA)

	if diff := math.Abs(timelineOA - projectorOA); diff > tolerance {
		t.Errorf("OA mismatch: Timeline=%.2f, Projector=%.2f, diff=%.2f", timelineOA, projectorOA, diff)
	}
	if diff := math.Abs(timelineSA - projectorSA); diff > tolerance {
		t.Errorf("SA mismatch: Timeline=%.2f, Projector=%.2f, diff=%.2f", timelineSA, projectorSA, diff)
	}
	if diff := math.Abs(timelineMA - projectorMA); diff > tolerance {
		t.Errorf("MA mismatch: Timeline=%.2f, Projector=%.2f, diff=%.2f", timelineMA, projectorMA, diff)
	}
	if diff := math.Abs(timelineRA - projectorRA); diff > tolerance {
		t.Errorf("RA mismatch: Timeline=%.2f, Projector=%.2f, diff=%.2f", timelineRA, projectorRA, diff)
	}

	timelineTotal := timelineOA + timelineSA + timelineMA + timelineRA
	projectorTotal := projectorOA + projectorSA + projectorMA + projectorRA
	if diff := math.Abs(timelineTotal - projectorTotal); diff > tolerance {
		t.Errorf("Total mismatch: Timeline=%.2f, Projector=%.2f, diff=%.2f", timelineTotal, projectorTotal, diff)
	} else {
		t.Logf("PASS: Total balances match (diff=%.2f)", diff)
	}
}

func TestTimelineVsProjector_RAFormationConsistency(t *testing.T) {
	// Create a CPF account for someone turning 55 in 2026
	dob := time.Date(1971, 6, 15, 0, 0, 0, 0, time.UTC) // Turns 55 in June 2026
	asOfDate := time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC)

	cpfAccount := &account.CPFAccount{
		ID:              "test-id",
		PersonID:        "person-id",
		OABalance:       *decimal.MustFromFloat64(180000),
		SABalance:       *decimal.MustFromFloat64(140000),
		MABalance:       *decimal.MustFromFloat64(65000),
		RABalance:       *decimal.Zero(),
		DateOfBirth:     dob,
		ResidencyStatus: "citizen",
		Gender:          "male",
	}

	// === Run Timeline for full year ===
	ctx := NewCPFContext(cpfAccount)
	if ctx == nil {
		t.Fatal("NewCPFContext returned nil")
	}

	for month := 1; month <= 12; month++ {
		currentDate := time.Date(2026, time.Month(month), 1, 0, 0, 0, 0, time.UTC)
		ctx.ApplyEngineProcessing(currentDate, true)
	}

	// === Run Projector ===
	proj := projector.New()
	accountSnapshot := projector.AccountSnapshot{
		OABalance:       &cpfAccount.OABalance,
		SABalance:       &cpfAccount.SABalance,
		MABalance:       &cpfAccount.MABalance,
		RABalance:       &cpfAccount.RABalance,
		DateOfBirth:     dob,
		Gender:          "male",
		ResidencyStatus: "citizen",
		AsOfDate:        asOfDate,
	}

	projResult, err := proj.ProjectBalances(
		context.Background(),
		accountSnapshot,
		nil, 62, 65, nil,
	)
	if err != nil {
		t.Fatalf("Projector.ProjectBalances failed: %v", err)
	}

	// Find 2026 snapshot
	var projSnapshot *projector.YearlySnapshot
	for i := range projResult.Snapshots {
		if projResult.Snapshots[i].Year == 2026 {
			projSnapshot = &projResult.Snapshots[i]
			break
		}
	}

	if projSnapshot == nil {
		t.Fatal("Projector did not return 2026 snapshot")
	}

	// === Compare RA formation ===
	timelineRA := ctx.EngineState.RA.ToFloat64()
	projectorRA := projSnapshot.RA.ToFloat64()
	timelineRAFormed := ctx.EngineState.RAFormed

	t.Logf("=== RA Formation at Age 55 Comparison ===")
	t.Logf("Timeline:  RA=%.2f, RAFormed=%v", timelineRA, timelineRAFormed)
	t.Logf("Projector: RA=%.2f", projectorRA)

	// Both should have formed RA
	if !timelineRAFormed {
		t.Error("Timeline: RAFormed should be true after age 55")
	}
	if timelineRA < 100000 {
		t.Errorf("Timeline: RA should be substantial after formation, got %.2f", timelineRA)
	}
	if projectorRA < 100000 {
		t.Errorf("Projector: RA should be substantial after formation, got %.2f", projectorRA)
	}

	// Compare values
	tolerance := 1.0
	if diff := math.Abs(timelineRA - projectorRA); diff > tolerance {
		t.Errorf("RA mismatch: Timeline=%.2f, Projector=%.2f, diff=%.2f", timelineRA, projectorRA, diff)
	} else {
		t.Logf("PASS: RA balances match (diff=%.2f)", diff)
	}

	// SA should be 0 or near 0 after RA formation
	timelineSA := ctx.EngineState.SA.ToFloat64()
	projectorSA := projSnapshot.SA.ToFloat64()
	if timelineSA > 100 {
		t.Errorf("Timeline: SA should be near 0 after RA formation, got %.2f", timelineSA)
	}
	if projectorSA > 100 {
		t.Errorf("Projector: SA should be near 0 after RA formation, got %.2f", projectorSA)
	}
}

func TestTimelineVsProjector_CPFLifePayoutConsistency(t *testing.T) {
	// Create a CPF account for someone turning 65 in 2026
	dob := time.Date(1961, 6, 15, 0, 0, 0, 0, time.UTC) // Turns 65 in June 2026
	asOfDate := time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC)

	// Account with RA already formed (person is 64 turning 65)
	cpfAccount := &account.CPFAccount{
		ID:              "test-id",
		PersonID:        "person-id",
		OABalance:       *decimal.MustFromFloat64(80000),
		SABalance:       *decimal.Zero(), // SA depleted after age 55
		MABalance:       *decimal.MustFromFloat64(70000),
		RABalance:       *decimal.MustFromFloat64(300000), // RA formed at 55
		DateOfBirth:     dob,
		ResidencyStatus: "citizen",
		Gender:          "male",
	}

	// === Run Timeline for full year ===
	ctx := NewCPFContext(cpfAccount)
	if ctx == nil {
		t.Fatal("NewCPFContext returned nil")
	}

	// Manually mark RA as formed (since this person is 64+ at start)
	ctx.EngineState.RAFormed = true

	for month := 1; month <= 12; month++ {
		currentDate := time.Date(2026, time.Month(month), 1, 0, 0, 0, 0, time.UTC)
		ctx.ApplyEngineProcessing(currentDate, true)
	}

	// === Run Projector ===
	proj := projector.New()
	accountSnapshot := projector.AccountSnapshot{
		OABalance:       &cpfAccount.OABalance,
		SABalance:       &cpfAccount.SABalance,
		MABalance:       &cpfAccount.MABalance,
		RABalance:       &cpfAccount.RABalance,
		DateOfBirth:     dob,
		Gender:          "male",
		ResidencyStatus: "citizen",
		AsOfDate:        asOfDate,
	}

	projResult, err := proj.ProjectBalances(
		context.Background(),
		accountSnapshot,
		nil, 62, 65, nil,
	)
	if err != nil {
		t.Fatalf("Projector.ProjectBalances failed: %v", err)
	}

	// Find 2026 snapshot
	var projSnapshot *projector.YearlySnapshot
	for i := range projResult.Snapshots {
		if projResult.Snapshots[i].Year == 2026 {
			projSnapshot = &projResult.Snapshots[i]
			break
		}
	}

	if projSnapshot == nil {
		t.Fatal("Projector did not return 2026 snapshot")
	}

	// === Compare CPF LIFE payouts ===
	timelinePayoutsActive := ctx.EngineState.PayoutsActive
	timelineMonthlyPayout := float64(0)
	if ctx.EngineState.MonthlyPayout != nil {
		timelineMonthlyPayout = ctx.EngineState.MonthlyPayout.ToFloat64()
	}

	projectorMonthlyPayout := float64(0)
	if projSnapshot.MonthlyPayout != nil {
		projectorMonthlyPayout = projSnapshot.MonthlyPayout.ToFloat64()
	}

	t.Logf("=== CPF LIFE Payout at Age 65 Comparison ===")
	t.Logf("Timeline:  PayoutsActive=%v, MonthlyPayout=%.2f", timelinePayoutsActive, timelineMonthlyPayout)
	t.Logf("Projector: MonthlyPayout=%.2f", projectorMonthlyPayout)

	// Both should have activated payouts
	if !timelinePayoutsActive {
		t.Error("Timeline: PayoutsActive should be true after age 65")
	}
	if timelineMonthlyPayout < 100 {
		t.Errorf("Timeline: MonthlyPayout should be substantial, got %.2f", timelineMonthlyPayout)
	}
	if projectorMonthlyPayout < 100 {
		t.Errorf("Projector: MonthlyPayout should be substantial, got %.2f", projectorMonthlyPayout)
	}

	// Compare monthly payout values
	tolerance := 10.0 // Allow $10 difference for payout calculation variations
	if diff := math.Abs(timelineMonthlyPayout - projectorMonthlyPayout); diff > tolerance {
		t.Errorf("MonthlyPayout mismatch: Timeline=%.2f, Projector=%.2f, diff=%.2f",
			timelineMonthlyPayout, projectorMonthlyPayout, diff)
	} else {
		t.Logf("PASS: Monthly payout amounts match (diff=%.2f)", diff)
	}

	// Compare RA after year (may still grow if interest > payouts)
	// Person turns 65 in June, so only 6 months of payouts vs 12 months of interest
	// Interest on $300k @ 4% = ~$12,000/year
	// Payouts for 6 months @ $1,500/month = ~$9,000
	// Net = +$3,000 (RA may still grow in the first partial year)
	timelineRA := ctx.EngineState.RA.ToFloat64()
	projectorRA := projSnapshot.RA.ToFloat64()

	// Compare RA values between Timeline and Projector (allow some tolerance)
	tolerance = 2000.0 // Higher tolerance for RA due to timing differences in payout activation
	if diff := math.Abs(timelineRA - projectorRA); diff > tolerance {
		t.Errorf("RA mismatch: Timeline=%.2f, Projector=%.2f, diff=%.2f",
			timelineRA, projectorRA, diff)
	} else {
		t.Logf("PASS: RA values are within tolerance (diff=%.2f)", diff)
	}

	t.Logf("RA after year: Timeline=%.2f, Projector=%.2f", timelineRA, projectorRA)
}

func TestTimelineVsProjector_MultiYearConsistency(t *testing.T) {
	// Test consistency across multiple years (2026-2030)
	dob := time.Date(1996, 6, 15, 0, 0, 0, 0, time.UTC) // Age 30 in 2026
	asOfDate := time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC)

	cpfAccount := &account.CPFAccount{
		ID:              "test-id",
		PersonID:        "person-id",
		OABalance:       *decimal.MustFromFloat64(80000),
		SABalance:       *decimal.MustFromFloat64(40000),
		MABalance:       *decimal.MustFromFloat64(25000),
		RABalance:       *decimal.Zero(),
		DateOfBirth:     dob,
		ResidencyStatus: "citizen",
		Gender:          "male",
	}

	// === Run Timeline for 5 years (starting from month after AsOfDate) ===
	ctx := NewCPFContext(cpfAccount)
	if ctx == nil {
		t.Fatal("NewCPFContext returned nil")
	}

	// Store year-end balances from Timeline
	timelineYearEnd := make(map[int]struct{ OA, SA, MA, RA, Total float64 })

	// Start from Feb 2026 (month after AsOfDate), matching Projector behavior
	for year := 2026; year <= 2030; year++ {
		startMonth := 1
		if year == 2026 {
			startMonth = 2 // First year starts from Feb (month after AsOfDate)
		}
		for month := startMonth; month <= 12; month++ {
			currentDate := time.Date(year, time.Month(month), 1, 0, 0, 0, 0, time.UTC)
			ctx.ApplyEngineProcessing(currentDate, true)
		}
		// Capture year-end balance
		timelineYearEnd[year] = struct{ OA, SA, MA, RA, Total float64 }{
			OA:    ctx.EngineState.OA.ToFloat64(),
			SA:    ctx.EngineState.SA.ToFloat64(),
			MA:    ctx.EngineState.MA.ToFloat64(),
			RA:    ctx.EngineState.RA.ToFloat64(),
			Total: ctx.EngineState.TotalBalance().ToFloat64(),
		}
	}

	// === Run Projector ===
	proj := projector.New()
	accountSnapshot := projector.AccountSnapshot{
		OABalance:       &cpfAccount.OABalance,
		SABalance:       &cpfAccount.SABalance,
		MABalance:       &cpfAccount.MABalance,
		RABalance:       &cpfAccount.RABalance,
		DateOfBirth:     dob,
		Gender:          "male",
		ResidencyStatus: "citizen",
		AsOfDate:        asOfDate,
	}

	projResult, err := proj.ProjectBalances(
		context.Background(),
		accountSnapshot,
		nil, 62, 65, nil,
	)
	if err != nil {
		t.Fatalf("Projector.ProjectBalances failed: %v", err)
	}

	// Build map of projector snapshots by year
	projectorSnapshots := make(map[int]*projector.YearlySnapshot)
	for i := range projResult.Snapshots {
		projectorSnapshots[projResult.Snapshots[i].Year] = &projResult.Snapshots[i]
	}

	// === Compare each year ===
	tolerance := 1.0
	t.Logf("=== Multi-Year Balance Comparison ===")

	for year := 2026; year <= 2030; year++ {
		tl := timelineYearEnd[year]
		ps := projectorSnapshots[year]

		if ps == nil {
			t.Errorf("Year %d: Projector snapshot missing", year)
			continue
		}

		projOA := ps.OA.ToFloat64()
		projSA := ps.SA.ToFloat64()
		projMA := ps.MA.ToFloat64()
		projRA := ps.RA.ToFloat64()
		projTotal := ps.Total.ToFloat64()

		t.Logf("Year %d:", year)
		t.Logf("  Timeline:  OA=%.0f, SA=%.0f, MA=%.0f, RA=%.0f, Total=%.0f",
			tl.OA, tl.SA, tl.MA, tl.RA, tl.Total)
		t.Logf("  Projector: OA=%.0f, SA=%.0f, MA=%.0f, RA=%.0f, Total=%.0f",
			projOA, projSA, projMA, projRA, projTotal)

		if diff := math.Abs(tl.Total - projTotal); diff > tolerance {
			t.Errorf("Year %d Total mismatch: Timeline=%.2f, Projector=%.2f, diff=%.2f",
				year, tl.Total, projTotal, diff)
		}
	}
}
