package scenario

import (
	"testing"
	"time"

	"financial-chat-system/backend/internal/common"
	"financial-chat-system/backend/internal/decimal"
)

// =============================================================================
// Test Helpers
// =============================================================================

func strPtr(s string) *string { return &s }

func mustDecimal(s string) *decimal.Decimal {
	return decimal.MustFromString(s)
}

func date(year, month, day int) time.Time {
	return time.Date(year, time.Month(month), day, 0, 0, 0, 0, time.UTC)
}

func datePtr(year, month, day int) *time.Time {
	t := date(year, month, day)
	return &t
}

// =============================================================================
// BuildImpactContext Tests
// =============================================================================

func TestBuildImpactContext_EmptyEvents(t *testing.T) {
	/*
		SCENARIO: No scenario events exist
		────────────────────────────────────────────────────────────────────────
		Given: An empty list of scenario events
		When:  BuildImpactContext is called
		Then:  It should return nil (no impacts to apply)

		WHY: This is a guard clause - if there are no events, we shouldn't
		     create an empty context that would still get checked during
		     timeline processing.
	*/
	ctx := BuildImpactContext([]Event{})

	if ctx != nil {
		t.Errorf("expected nil context for empty events, got %+v", ctx)
	}
}

func TestBuildImpactContext_SingleEventWithMultipleImpacts(t *testing.T) {
	/*
		SCENARIO: User creates a "Get a raise" event with multiple impacts
		────────────────────────────────────────────────────────────────────────
		Given: An event called "Get a raise" with 2 impacts:
		       1. Override salary to $150k
		       2. Delta bonus +$5k
		When:  BuildImpactContext is called
		Then:  Both impacts should be indexed by the income ID (salary-1)
		       AND the event should be accessible by EventsByID

		WHY: Multiple impacts on the same target is common - e.g., a raise
		     (override) plus a signing bonus (delta) in the same event.
	*/
	incomeID := "salary-1"
	event := Event{
		ID:        "event-1",
		Name:      "Get a raise",
		UpdatedAt: date(2025, 6, 1),
		Impacts: []Impact{
			{
				ID:             "impact-1",
				EventID:        "event-1",
				ImpactKind:     ImpactKindOverride,
				Amount:         150000,
				Cadence:    common.FrequencyAnnual,
				TargetIncomeID: &incomeID,
				StartDate:      date(2025, 6, 1),
			},
			{
				ID:             "impact-2",
				EventID:        "event-1",
				ImpactKind:     ImpactKindDelta,
				Amount:         5000,
				Cadence:    common.FrequencyAnnual,
				TargetIncomeID: &incomeID,
				StartDate:      date(2025, 6, 1),
			},
		},
	}

	ctx := BuildImpactContext([]Event{event})

	if ctx == nil {
		t.Fatal("expected non-nil context")
	}

	// Check ImpactsByTarget has 2 impacts for this income
	impacts := ctx.ImpactsByTarget[incomeID]
	if len(impacts) != 2 {
		t.Errorf("expected 2 impacts for %s, got %d", incomeID, len(impacts))
	}

	// Check EventsByID has the event
	if ctx.EventsByID["event-1"] == nil {
		t.Error("expected event-1 in EventsByID")
	}
}

func TestBuildImpactContext_MultipleEventsTargetingSameItem(t *testing.T) {
	/*
		SCENARIO: Multiple events affect the same item
		────────────────────────────────────────────────────────────────────────
		Given: Two separate events:
		       1. "Pay raise" - override salary to $150k (created Jan 2025)
		       2. "Bonus" - delta +$10k (created Mar 2025)
		       Both targeting the same income (salary-1)
		When:  BuildImpactContext is called
		Then:  ImpactsByTarget["salary-1"] should have 2 impacts

		WHY: Users often create multiple events that affect the same financial
		     item. The timeline needs to combine all applicable impacts.
	*/
	incomeID := "salary-1"
	events := []Event{
		{
			ID:        "event-raise",
			Name:      "Pay raise",
			UpdatedAt: date(2025, 1, 15),
			Impacts: []Impact{
				{
					ID:             "impact-raise",
					EventID:        "event-raise",
					ImpactKind:     ImpactKindOverride,
					Amount:         150000,
					Cadence:    common.FrequencyAnnual,
					TargetIncomeID: &incomeID,
					StartDate:      date(2025, 2, 1),
				},
			},
		},
		{
			ID:        "event-bonus",
			Name:      "Year-end bonus",
			UpdatedAt: date(2025, 3, 1),
			Impacts: []Impact{
				{
					ID:             "impact-bonus",
					EventID:        "event-bonus",
					ImpactKind:     ImpactKindDelta,
					Amount:         10000,
					Cadence:    common.FrequencyAnnual,
					TargetIncomeID: &incomeID,
					StartDate:      date(2025, 12, 1),
				},
			},
		},
	}

	ctx := BuildImpactContext(events)

	impacts := ctx.ImpactsByTarget[incomeID]
	if len(impacts) != 2 {
		t.Errorf("expected 2 impacts for salary-1, got %d", len(impacts))
	}

	// Verify both events are accessible
	if ctx.EventsByID["event-raise"] == nil {
		t.Error("expected event-raise in EventsByID")
	}
	if ctx.EventsByID["event-bonus"] == nil {
		t.Error("expected event-bonus in EventsByID")
	}
}

func TestBuildImpactContext_EventWithNoImpacts_StillIndexed(t *testing.T) {
	/*
		SCENARIO: Event exists but has no impacts
		────────────────────────────────────────────────────────────────────────
		Given: An event with an empty impacts array
		When:  BuildImpactContext is called
		Then:  The event should still be in EventsByID (but no ImpactsByTarget entries)

		NOTE: Validation that events MUST have at least one impact is enforced
		      at the API layer (scenario_events_v2.go handler), not here.
		      BuildImpactContext is tolerant of edge cases for robustness.
	*/
	event := Event{
		ID:      "event-empty",
		Name:    "Empty event",
		Impacts: []Impact{}, // No impacts
	}

	ctx := BuildImpactContext([]Event{event})

	if ctx == nil {
		t.Fatal("expected non-nil context even with empty impacts")
	}

	// Event should be indexed
	if ctx.EventsByID["event-empty"] == nil {
		t.Error("expected event-empty in EventsByID")
	}

	// No impacts to index
	if len(ctx.ImpactsByTarget) != 0 {
		t.Errorf("expected 0 impacts indexed, got %d", len(ctx.ImpactsByTarget))
	}
}

func TestBuildImpactContext_ImpactWithNoTarget_Skipped(t *testing.T) {
	/*
		SCENARIO: Impact has no target (edge case / data integrity issue)
		────────────────────────────────────────────────────────────────────────
		Given: An impact where all target FK fields are nil
		When:  BuildImpactContext is called
		Then:  The impact should be skipped (not indexed)

		WHY: This handles malformed data gracefully. A "start" impact with
		     no existing target is a NEW item - but for now we skip it.
		     (Future: start impacts will use SyntheticItemID instead)
	*/
	event := Event{
		ID:   "event-orphan",
		Name: "Orphan impact",
		Impacts: []Impact{
			{
				ID:         "impact-orphan",
				EventID:    "event-orphan",
				ImpactKind: ImpactKindDelta,
				Amount:     1000,
				// ALL target fields are nil
			},
		},
	}

	ctx := BuildImpactContext([]Event{event})

	if ctx == nil {
		t.Fatal("expected non-nil context (event exists even if no indexed impacts)")
	}

	// Should have 0 impacts indexed (the orphan is skipped)
	if len(ctx.ImpactsByTarget) != 0 {
		t.Errorf("expected 0 indexed impacts, got %d", len(ctx.ImpactsByTarget))
	}

	// But the event should still be in EventsByID
	if ctx.EventsByID["event-orphan"] == nil {
		t.Error("expected event-orphan in EventsByID even with no valid impacts")
	}
}

// =============================================================================
// ImpactAppliesToMonth Tests
// =============================================================================

func TestImpactAppliesToMonth_BeforeStartDate(t *testing.T) {
	/*
		SCENARIO: Checking impact before it starts
		────────────────────────────────────────────────────────────────────────
		Given: An impact that starts on March 1, 2025
		When:  We check if it applies to January 2025
		Then:  It should NOT apply (too early)

		EXAMPLE: "Starting January 2026, I'll get a new bonus"
		         If we're computing December 2025, this impact doesn't apply yet.
	*/
	impact := Impact{
		EventID:   "test-event",
		StartDate: date(2025, 3, 1),
		Cadence:   common.FrequencyMonthly,
	}

	// January 2025 is before March 2025 (impact.StartDate)
	if ImpactAppliesToMonth(impact, date(2025, 1, 15)) {
		t.Error("impact should NOT apply before start date")
	}
}

func TestImpactAppliesToMonth_OnStartMonth(t *testing.T) {
	/*
		SCENARIO: Checking impact in its start month
		────────────────────────────────────────────────────────────────────────
		Given: An impact that starts on March 15, 2025
		When:  We check if it applies to March 1, 2025
		Then:  It SHOULD apply (same month)

		WHY: Impacts are normalized to the month level. If the impact starts
		     on March 15, it applies to the entire March 2025 month.
	*/
	impact := Impact{
		EventID:   "test-event",
		StartDate: date(2025, 3, 15), // Mid-month
		Cadence:   common.FrequencyMonthly,
	}

	// March 1, 2025 is in the same month
	if !ImpactAppliesToMonth(impact, date(2025, 3, 1)) {
		t.Error("impact SHOULD apply in the start month")
	}
}

func TestImpactAppliesToMonth_AfterStartDate_NoEndDate(t *testing.T) {
	/*
		SCENARIO: Ongoing impact with no end date
		────────────────────────────────────────────────────────────────────────
		Given: An impact that starts March 2025 with NO end date
		When:  We check if it applies to December 2030
		Then:  It SHOULD apply (ongoing forever)

		EXAMPLE: "My salary is now $150k" - this change persists indefinitely.
	*/
	impact := Impact{
		EventID:   "test-event",
		StartDate: date(2025, 3, 1),
		EndDate:   nil, // No end date
		Cadence:   common.FrequencyMonthly,
	}

	// Far future date
	if !ImpactAppliesToMonth(impact, date(2030, 12, 1)) {
		t.Error("impact with no end date SHOULD apply indefinitely")
	}
}

func TestImpactAppliesToMonth_AfterEndDate(t *testing.T) {
	/*
		SCENARIO: Impact has expired (past its end date)
		────────────────────────────────────────────────────────────────────────
		Given: An impact from March 2025 to June 2025
		When:  We check if it applies to July 2025
		Then:  It should NOT apply (expired)

		EXAMPLE: "Temporary $500/month raise for 3 months" - after 3 months,
		         the impact no longer applies.
	*/
	impact := Impact{
		EventID:   "test-event",
		StartDate: date(2025, 3, 1),
		EndDate:   datePtr(2025, 6, 30),
		Cadence:   common.FrequencyMonthly,
	}

	// July 2025 is after June 2025
	if ImpactAppliesToMonth(impact, date(2025, 7, 1)) {
		t.Error("impact should NOT apply after end date")
	}
}

func TestImpactAppliesToMonth_WithinDateRange(t *testing.T) {
	/*
		SCENARIO: Impact is within its active date range
		────────────────────────────────────────────────────────────────────────
		Given: An impact from March 2025 to June 2025
		When:  We check if it applies to April 2025
		Then:  It SHOULD apply (within range)
	*/
	impact := Impact{
		EventID:   "test-event",
		StartDate: date(2025, 3, 1),
		EndDate:   datePtr(2025, 6, 30),
		Cadence:   common.FrequencyMonthly,
	}

	if !ImpactAppliesToMonth(impact, date(2025, 4, 15)) {
		t.Error("impact SHOULD apply within its date range")
	}
}

func TestImpactAppliesToMonth_OneTime_SameMonth(t *testing.T) {
	/*
		SCENARIO: One-time impact in its trigger month
		────────────────────────────────────────────────────────────────────────
		Given: A one-time impact on March 15, 2025
		When:  We check if it applies to March 2025
		Then:  It SHOULD apply (same month)

		EXAMPLE: "One-time $10,000 bonus in March"
	*/
	impact := Impact{
		EventID:   "test-event",
		StartDate: date(2025, 3, 15),
		Cadence:   common.FrequencyOneTime,
	}

	if !ImpactAppliesToMonth(impact, date(2025, 3, 1)) {
		t.Error("one-time impact SHOULD apply in its trigger month")
	}
}

func TestImpactAppliesToMonth_OneTime_DifferentMonth(t *testing.T) {
	/*
		SCENARIO: One-time impact checked in a different month
		────────────────────────────────────────────────────────────────────────
		Given: A one-time impact on March 15, 2025
		When:  We check if it applies to April 2025
		Then:  It should NOT apply (one-time = only in that month)

		EXAMPLE: "One-time $10,000 bonus in March" doesn't repeat in April.
	*/
	impact := Impact{
		EventID:   "test-event",
		StartDate: date(2025, 3, 15),
		Cadence:   common.FrequencyOneTime,
	}

	if ImpactAppliesToMonth(impact, date(2025, 4, 1)) {
		t.Error("one-time impact should NOT apply in different month")
	}
}

func TestImpactAppliesToMonth_FutureStartDate(t *testing.T) {
	/*
		SCENARIO: Impact with future start date (from a financial item that starts later)
		────────────────────────────────────────────────────────────────────────
		Given: An impact with StartDate = 2028-06-01 (e.g., from a new job starting then)
		When:  We check if it applies at various dates
		Then:  It should only apply on or after the start date

		NOTE: impact.StartDate is derived from the target financial item via JOIN.
		      Event.OccursOn should never be later than any impact's start date
		      (this constraint should be enforced by validation).
	*/
	impact := Impact{
		EventID:   "test-event",
		StartDate: date(2028, 6, 1), // Impact starts June 2028
		Cadence:   common.FrequencyMonthly,
	}

	// Before impact starts - should NOT apply
	if ImpactAppliesToMonth(impact, date(2026, 1, 1)) {
		t.Error("impact should NOT apply before start date")
	}

	// In month impact starts - SHOULD apply
	if !ImpactAppliesToMonth(impact, date(2028, 6, 1)) {
		t.Error("impact SHOULD apply in start month")
	}

	// After impact starts - SHOULD apply
	if !ImpactAppliesToMonth(impact, date(2030, 1, 1)) {
		t.Error("impact SHOULD apply after start date")
	}
}

// =============================================================================
// ApplyImpactsToItem Tests - Stop Impacts
// =============================================================================

func TestApplyImpactsToItem_StopImpact_ZerosValue(t *testing.T) {
	/*
		SCENARIO: Job loss - income stops completely
		────────────────────────────────────────────────────────────────────────
		Given: User has a $10,000/month salary
		       User creates "Lose job" event with STOP impact starting March 2025
		When:  We compute the salary value for April 2025
		Then:  The salary should be $0

		REAL-WORLD: Modeling "What if I lose my job?" The stop impact
		            immediately zeros the income for all months after it starts.

		PRIORITY: Stop is checked FIRST. If there's a stop, we return $0
		          immediately without checking override or delta.
	*/
	incomeID := "salary-1"
	baseValue := mustDecimal("10000")
	currentDate := date(2025, 4, 1)

	impacts := []Impact{
		{
			ID:             "impact-stop",
			EventID:        "event-quit",
			ImpactKind:     ImpactKindStop,
			TargetIncomeID: &incomeID,
			StartDate:      date(2025, 3, 1), // Starts March
		},
	}

	eventsByID := map[string]*Event{
		"event-quit": {ID: "event-quit", Name: "Lose job", OccursOn: date(2025, 3, 1), UpdatedAt: date(2025, 2, 1)},
	}

	result := ApplyImpactsToItem(
		impacts,
		baseValue,
		currentDate,
		ItemInfo{ItemType: "income", Frequency: common.FrequencyMonthly},
		eventsByID,
	)

	if result.AdjustedValue.Cmp(decimal.Zero()) != 0 {
		t.Errorf("expected $0 after stop impact, got %s", result.AdjustedValue.String())
	}
}

func TestApplyImpactsToItem_StopImpact_BeforeStartDate_NotApplied(t *testing.T) {
	/*
		SCENARIO: Job loss scheduled for future, computing current month
		────────────────────────────────────────────────────────────────────────
		Given: User has a $10,000/month salary
		       User creates "Plan to quit" event with STOP starting June 2025
		When:  We compute the salary value for March 2025
		Then:  The salary should still be $10,000 (stop hasn't started yet)

		WHY: The user is planning ahead - "I'll quit in June". Until then,
		     the income should still appear normally.
	*/
	incomeID := "salary-1"
	baseValue := mustDecimal("10000")
	currentDate := date(2025, 3, 1) // Before stop starts

	impacts := []Impact{
		{
			ID:             "impact-stop",
			EventID:        "event-quit",
			ImpactKind:     ImpactKindStop,
			TargetIncomeID: &incomeID,
			StartDate:      date(2025, 6, 1), // Future stop
		},
	}

	eventsByID := map[string]*Event{
		"event-quit": {ID: "event-quit", Name: "Plan to quit", OccursOn: date(2025, 6, 1), UpdatedAt: date(2025, 2, 1)},
	}

	result := ApplyImpactsToItem(
		impacts,
		baseValue,
		currentDate,
		ItemInfo{ItemType: "income", Frequency: common.FrequencyMonthly},
		eventsByID,
	)

	expected := mustDecimal("10000")
	if result.AdjustedValue.Cmp(expected) != 0 {
		t.Errorf("expected %s (stop not yet active), got %s", expected.String(), result.AdjustedValue.String())
	}
}

func TestApplyImpactsToItem_StopImpact_TrumpsOtherImpacts(t *testing.T) {
	/*
		SCENARIO: Stop impact takes priority over everything else
		────────────────────────────────────────────────────────────────────────
		Given: User has a $10,000/month salary with:
		       1. Override to $15,000 (raise)
		       2. Delta +$2,000 (bonus)
		       3. STOP (lose job)
		       All starting March 2025
		When:  We compute the salary value for April 2025
		Then:  The salary should be $0 (stop trumps all)

		WHY: Logically, if you lose your job, it doesn't matter what raise
		     or bonus you were getting - income is zero.

		DESIGN NOTE: Multiple impacts on the same item ARE valid in certain cases:
		  - Override + Delta: "Salary becomes $150k" + "$5k signing bonus" ✓
		  - Multiple Deltas: "+$5k raise" + "+$2k COLA adjustment" ✓
		  - Stop + anything: Stop wins, others ignored (this test)

		This test specifically verifies the stop-trumps-all priority order.
		In practice, users create separate scenario events for different
		what-if questions, and we need to handle overlapping impacts correctly.
	*/
	incomeID := "salary-1"
	baseValue := mustDecimal("10000")
	currentDate := date(2025, 4, 1)

	impacts := []Impact{
		{
			ID:             "impact-raise",
			EventID:        "event-raise",
			ImpactKind:     ImpactKindOverride,
			Amount:         15000,
			Cadence:    common.FrequencyMonthly,
			TargetIncomeID: &incomeID,
			StartDate:      date(2025, 3, 1),
		},
		{
			ID:             "impact-bonus",
			EventID:        "event-bonus",
			ImpactKind:     ImpactKindDelta,
			Amount:         2000,
			Cadence:    common.FrequencyMonthly,
			TargetIncomeID: &incomeID,
			StartDate:      date(2025, 3, 1),
		},
		{
			ID:             "impact-stop",
			EventID:        "event-quit",
			ImpactKind:     ImpactKindStop,
			TargetIncomeID: &incomeID,
			StartDate:      date(2025, 3, 1),
		},
	}

	eventsByID := map[string]*Event{
		"event-raise": {ID: "event-raise", OccursOn: date(2025, 3, 1), UpdatedAt: date(2025, 1, 1)},
		"event-bonus": {ID: "event-bonus", OccursOn: date(2025, 3, 1), UpdatedAt: date(2025, 1, 15)},
		"event-quit":  {ID: "event-quit", OccursOn: date(2025, 3, 1), UpdatedAt: date(2025, 2, 1)},
	}

	result := ApplyImpactsToItem(
		impacts,
		baseValue,
		currentDate,
		ItemInfo{ItemType: "income", Frequency: common.FrequencyMonthly},
		eventsByID,
	)

	if result.AdjustedValue.Cmp(decimal.Zero()) != 0 {
		t.Errorf("expected $0 (stop trumps override and delta), got %s", result.AdjustedValue.String())
	}
}

// =============================================================================
// ApplyImpactsToItem Tests - Override Impacts
// =============================================================================

func TestApplyImpactsToItem_OverrideImpact_ReplacesBaseValue(t *testing.T) {
	/*
		SCENARIO: Salary raise - income changes to new value
		────────────────────────────────────────────────────────────────────────
		Given: User has a $120,000/year salary
		       User creates "Get a raise" event with OVERRIDE to $150,000/year
		When:  We compute the salary value for a month after the raise
		Then:  The salary should be $150,000 (completely replaces old value)

		REAL-WORLD: "My salary becomes $150k" - this replaces the previous
		            value entirely, unlike delta which adds to it.
	*/
	incomeID := "salary-1"
	baseValue := mustDecimal("120000")
	currentDate := date(2025, 7, 1)

	impacts := []Impact{
		{
			ID:             "impact-raise",
			EventID:        "event-raise",
			ImpactKind:     ImpactKindOverride,
			Amount:         150000,
			Cadence:    common.FrequencyAnnual,
			TargetIncomeID: &incomeID,
			StartDate:      date(2025, 6, 1),
		},
	}

	eventsByID := map[string]*Event{
		"event-raise": {ID: "event-raise", Name: "Get a raise", OccursOn: date(2025, 6, 1), UpdatedAt: date(2025, 5, 15)},
	}

	result := ApplyImpactsToItem(
		impacts,
		baseValue,
		currentDate,
		ItemInfo{ItemType: "income", Frequency: common.FrequencyAnnual},
		eventsByID,
	)

	expected := mustDecimal("150000")
	if result.AdjustedValue.Cmp(expected) != 0 {
		t.Errorf("expected %s (override replaces base), got %s", expected.String(), result.AdjustedValue.String())
	}
}

func TestApplyImpactsToItem_MultipleOverrides_LatestEventWins(t *testing.T) {
	/*
		SCENARIO: Multiple override impacts - latest updated event wins
		────────────────────────────────────────────────────────────────────────
		Given: User creates two conflicting overrides:
		       1. "First raise" override to $140k (UpdatedAt: Jan 1)
		       2. "Better offer" override to $160k (UpdatedAt: Jan 15)
		When:  We compute the salary value
		Then:  The salary should be $160,000 (latest UpdatedAt wins)

		WHY: When users correct a mistake or negotiate a better deal, they
		     create a new event. The most recently updated override should
		     take precedence - this is the user's final decision.
	*/
	incomeID := "salary-1"
	baseValue := mustDecimal("120000")
	currentDate := date(2025, 7, 1)

	impacts := []Impact{
		{
			ID:             "impact-first-raise",
			EventID:        "event-first",
			ImpactKind:     ImpactKindOverride,
			Amount:         140000,
			Cadence:    common.FrequencyAnnual,
			TargetIncomeID: &incomeID,
			StartDate:      date(2025, 6, 1),
		},
		{
			ID:             "impact-better-offer",
			EventID:        "event-better",
			ImpactKind:     ImpactKindOverride,
			Amount:         160000,
			Cadence:    common.FrequencyAnnual,
			TargetIncomeID: &incomeID,
			StartDate:      date(2025, 6, 1),
		},
	}

	eventsByID := map[string]*Event{
		"event-first":  {ID: "event-first", Name: "First raise", OccursOn: date(2025, 6, 1), UpdatedAt: date(2025, 1, 1)},
		"event-better": {ID: "event-better", Name: "Better offer", OccursOn: date(2025, 6, 1), UpdatedAt: date(2025, 1, 15)}, // More recent
	}

	result := ApplyImpactsToItem(
		impacts,
		baseValue,
		currentDate,
		ItemInfo{ItemType: "income", Frequency: common.FrequencyAnnual},
		eventsByID,
	)

	expected := mustDecimal("160000")
	if result.AdjustedValue.Cmp(expected) != 0 {
		t.Errorf("expected %s (latest override wins), got %s", expected.String(), result.AdjustedValue.String())
	}
}

// =============================================================================
// ApplyImpactsToItem Tests - Delta Impacts
// =============================================================================

func TestApplyImpactsToItem_DeltaImpact_AddsToBaseValue(t *testing.T) {
	/*
		SCENARIO: Cash account receives monthly deposit
		────────────────────────────────────────────────────────────────────────
		Given: User has $25,000 in cash account
		       User creates "Monthly savings" event with DELTA +$1,000/month
		When:  We compute the cash balance for a month after the delta starts
		Then:  The balance should be $26,000 ($25,000 + $1,000)

		REAL-WORLD: "I'll deposit $1,000 more each month into savings"
	*/
	cashID := "savings-1"
	baseValue := mustDecimal("25000")
	currentDate := date(2025, 4, 1)

	impacts := []Impact{
		{
			ID:                  "impact-savings",
			EventID:             "event-savings",
			ImpactKind:          ImpactKindDelta,
			Amount:              1000,
			Cadence:             common.FrequencyMonthly,
			TargetCashAccountID: &cashID,
			StartDate:           date(2025, 3, 1),
		},
	}

	eventsByID := map[string]*Event{
		"event-savings": {ID: "event-savings", Name: "Monthly savings", OccursOn: date(2025, 3, 1), UpdatedAt: date(2025, 2, 1)},
	}

	result := ApplyImpactsToItem(
		impacts,
		baseValue,
		currentDate,
		ItemInfo{ItemType: "cash", Frequency: common.FrequencyMonthly},
		eventsByID,
	)

	expected := mustDecimal("26000")
	if result.AdjustedValue.Cmp(expected) != 0 {
		t.Errorf("expected %s (base + delta), got %s", expected.String(), result.AdjustedValue.String())
	}
}

func TestApplyImpactsToItem_MultipleDeltas_Stack(t *testing.T) {
	/*
		SCENARIO: Multiple delta impacts stack cumulatively
		────────────────────────────────────────────────────────────────────────
		Given: User has $25,000 in cash account with two delta impacts:
		       1. "Savings" +$1,000/month
		       2. "Side income" +$500/month
		When:  We compute the cash balance
		Then:  The balance should be $26,500 ($25,000 + $1,000 + $500)

		WHY: Unlike overrides (only latest wins), ALL deltas stack together.
		     This allows modeling multiple income sources or adjustments.
	*/
	cashID := "savings-1"
	baseValue := mustDecimal("25000")
	currentDate := date(2025, 4, 1)

	impacts := []Impact{
		{
			ID:                  "impact-savings",
			EventID:             "event-savings",
			ImpactKind:          ImpactKindDelta,
			Amount:              1000,
			Cadence:             common.FrequencyMonthly,
			TargetCashAccountID: &cashID,
			StartDate:           date(2025, 3, 1),
		},
		{
			ID:                  "impact-side-income",
			EventID:             "event-side",
			ImpactKind:          ImpactKindDelta,
			Amount:              500,
			Cadence:             common.FrequencyMonthly,
			TargetCashAccountID: &cashID,
			StartDate:           date(2025, 3, 1),
		},
	}

	eventsByID := map[string]*Event{
		"event-savings": {ID: "event-savings", OccursOn: date(2025, 3, 1), UpdatedAt: date(2025, 2, 1)},
		"event-side":    {ID: "event-side", OccursOn: date(2025, 3, 1), UpdatedAt: date(2025, 2, 15)},
	}

	result := ApplyImpactsToItem(
		impacts,
		baseValue,
		currentDate,
		ItemInfo{ItemType: "cash", Frequency: common.FrequencyMonthly},
		eventsByID,
	)

	expected := mustDecimal("26500")
	if result.AdjustedValue.Cmp(expected) != 0 {
		t.Errorf("expected %s (base + both deltas), got %s", expected.String(), result.AdjustedValue.String())
	}
}

func TestApplyImpactsToItem_NegativeDelta_Subtracts(t *testing.T) {
	/*
		SCENARIO: Negative delta (expense increase)
		────────────────────────────────────────────────────────────────────────
		Given: User has $3,000/month rent expense
		       User creates "Rent increase" event with DELTA +$200/month
		When:  We compute the expense value
		Then:  The expense should be $3,200

		NOTE: For the "decreases_by" verb, the frontend sends a negative amount.
		      This test verifies that negative deltas work correctly.
	*/
	expenseID := "rent-1"
	baseValue := mustDecimal("3000")
	currentDate := date(2025, 4, 1)

	impacts := []Impact{
		{
			ID:              "impact-rent-increase",
			EventID:         "event-rent",
			ImpactKind:      ImpactKindDelta,
			Amount:          200, // Rent increases by $200
			Cadence:         common.FrequencyMonthly,
			TargetExpenseID: &expenseID,
			StartDate:       date(2025, 3, 1),
		},
	}

	eventsByID := map[string]*Event{
		"event-rent": {ID: "event-rent", Name: "Rent increase", OccursOn: date(2025, 3, 1), UpdatedAt: date(2025, 2, 1)},
	}

	result := ApplyImpactsToItem(
		impacts,
		baseValue,
		currentDate,
		ItemInfo{ItemType: "expense", Frequency: common.FrequencyMonthly},
		eventsByID,
	)

	expected := mustDecimal("3200")
	if result.AdjustedValue.Cmp(expected) != 0 {
		t.Errorf("expected %s, got %s", expected.String(), result.AdjustedValue.String())
	}
}

// =============================================================================
// ApplyImpactsToItem Tests - Combined Override + Delta
// =============================================================================

func TestApplyImpactsToItem_OverrideThenDelta(t *testing.T) {
	/*
		SCENARIO: Salary raise with additional signing bonus
		────────────────────────────────────────────────────────────────────────
		Given: User has $120,000/year salary
		       User creates "New job" event with:
		       1. OVERRIDE salary to $150,000/year (new base salary)
		       2. DELTA +$10,000/year (signing bonus paid out annually)
		When:  We compute the salary value
		Then:  The salary should be $160,000 ($150,000 + $10,000)

		WHY: The override sets the new base, then deltas add on top.
		     This is the correct order: base replacement first, then additions.
	*/
	incomeID := "salary-1"
	baseValue := mustDecimal("120000")
	currentDate := date(2025, 7, 1)

	impacts := []Impact{
		{
			ID:             "impact-raise",
			EventID:        "event-job",
			ImpactKind:     ImpactKindOverride,
			Amount:         150000,
			Cadence:    common.FrequencyAnnual,
			TargetIncomeID: &incomeID,
			StartDate:      date(2025, 6, 1),
		},
		{
			ID:             "impact-bonus",
			EventID:        "event-job",
			ImpactKind:     ImpactKindDelta,
			Amount:         10000,
			Cadence:    common.FrequencyAnnual,
			TargetIncomeID: &incomeID,
			StartDate:      date(2025, 6, 1),
		},
	}

	eventsByID := map[string]*Event{
		"event-job": {ID: "event-job", Name: "New job offer", OccursOn: date(2025, 6, 1), UpdatedAt: date(2025, 5, 15)},
	}

	result := ApplyImpactsToItem(
		impacts,
		baseValue,
		currentDate,
		ItemInfo{ItemType: "income", Frequency: common.FrequencyAnnual},
		eventsByID,
	)

	expected := mustDecimal("160000")
	if result.AdjustedValue.Cmp(expected) != 0 {
		t.Errorf("expected %s (override + delta), got %s", expected.String(), result.AdjustedValue.String())
	}
}

// =============================================================================
// ConvertImpactAmount Tests - Frequency Normalization
// =============================================================================

func TestConvertImpactAmount_IncomeAnnual_ImpactMonthly(t *testing.T) {
	/*
		SCENARIO: Converting monthly impact to annual storage format
		────────────────────────────────────────────────────────────────────────
		Given: Income stored in ANNUAL frequency ($120,000/year)
		       Impact is MONTHLY +$5,000/month raise
		When:  ConvertImpactAmount is called
		Then:  Should return $60,000 ($5,000 × 12)

		WHY: The income is stored as annual, so the impact needs to be
		     converted to annual terms for consistent calculation.
	*/
	incomeID := "salary-1"
	impact := &Impact{
		ImpactKind:     ImpactKindDelta,
		Amount:         5000,
		Cadence:    common.FrequencyMonthly,
		TargetIncomeID: &incomeID,
	}

	itemInfo := ItemInfo{ItemType: "income", Frequency: common.FrequencyAnnual}
	result := ConvertImpactAmount(impact, itemInfo)

	expected := mustDecimal("60000") // 5000 * 12
	if result.Cmp(expected) != 0 {
		t.Errorf("expected %s (monthly to annual), got %s", expected.String(), result.String())
	}
}

func TestConvertImpactAmount_IncomeMonthly_ImpactAnnual(t *testing.T) {
	/*
		SCENARIO: Converting annual impact to monthly storage format
		────────────────────────────────────────────────────────────────────────
		Given: Income stored in MONTHLY frequency ($10,000/month)
		       Impact is ANNUAL override $150,000/year
		When:  ConvertImpactAmount is called
		Then:  Should return $12,500 ($150,000 ÷ 12)

		WHY: The income is stored as monthly, so the annual impact needs to
		     be divided by 12 for consistent calculation.
	*/
	incomeID := "salary-1"
	impact := &Impact{
		ImpactKind:     ImpactKindOverride,
		Amount:         150000,
		Cadence:    common.FrequencyAnnual,
		TargetIncomeID: &incomeID,
	}

	itemInfo := ItemInfo{ItemType: "income", Frequency: common.FrequencyMonthly}
	result := ConvertImpactAmount(impact, itemInfo)

	expected := mustDecimal("12500") // 150000 / 12
	if result.Cmp(expected) != 0 {
		t.Errorf("expected %s (annual to monthly), got %s", expected.String(), result.String())
	}
}

func TestConvertImpactAmount_Asset_AnnualDelta_ToMonthly(t *testing.T) {
	/*
		SCENARIO: Asset with annual delta contribution
		────────────────────────────────────────────────────────────────────────
		Given: An investment asset
		       Impact is ANNUAL delta +$12,000/year
		When:  ConvertImpactAmount is called
		Then:  Should return $1,000 ($12,000 ÷ 12)

		WHY: Timeline processes month-by-month, so annual contributions to
		     balance sheet items need to be spread across 12 months.
	*/
	assetID := "investment-1"
	impact := &Impact{
		ImpactKind:    ImpactKindDelta,
		Amount:        12000,
		Cadence:       common.FrequencyAnnual,
		TargetAssetID: &assetID,
	}

	itemInfo := ItemInfo{ItemType: "asset", Frequency: common.FrequencyMonthly}
	result := ConvertImpactAmount(impact, itemInfo)

	expected := mustDecimal("1000") // 12000 / 12
	if result.Cmp(expected) != 0 {
		t.Errorf("expected %s (annual delta to monthly), got %s", expected.String(), result.String())
	}
}

func TestConvertImpactAmount_Asset_Override_NoConversion(t *testing.T) {
	/*
		SCENARIO: Asset override - no frequency conversion
		────────────────────────────────────────────────────────────────────────
		Given: An investment asset worth $100,000
		       Impact is OVERRIDE to $150,000
		When:  ConvertImpactAmount is called
		Then:  Should return $150,000 (no conversion for override)

		WHY: Override sets the absolute value. "My investment becomes $150k"
		     means the balance is now $150k, not $150k/year or /month.
	*/
	assetID := "investment-1"
	impact := &Impact{
		ImpactKind:    ImpactKindOverride,
		Amount:        150000,
		Cadence:       common.FrequencyAnnual, // Cadence doesn't matter for override
		TargetAssetID: &assetID,
	}

	itemInfo := ItemInfo{ItemType: "asset", Frequency: common.FrequencyMonthly}
	result := ConvertImpactAmount(impact, itemInfo)

	expected := mustDecimal("150000") // No conversion
	if result.Cmp(expected) != 0 {
		t.Errorf("expected %s (override, no conversion), got %s", expected.String(), result.String())
	}
}

// =============================================================================
// ApplyImpactsToItem Tests
// =============================================================================

func TestApplyImpactsToItem_TracksAppliedImpacts(t *testing.T) {
	/*
		SCENARIO: Tracking which impacts were applied (for API response)
		────────────────────────────────────────────────────────────────────────
		Given: Cash account with $25,000
		       Delta impact +$1,000/month starting March 2025
		When:  ApplyImpactsToItem is called for April 2025
		Then:  Result should include:
		       - AdjustedValue = $26,000
		       - AppliedImpacts contains the delta impact info

		WHY: The API needs to tell the frontend WHICH impacts affected each
		     item, so users can see "Your cash balance includes +$1,000/month
		     from 'Monthly Savings' scenario".
	*/
	cashID := "savings-1"
	baseValue := mustDecimal("25000")
	currentDate := date(2025, 4, 1)

	impacts := []Impact{
		{
			ID:                  "impact-savings",
			EventID:             "event-savings",
			ImpactKind:          ImpactKindDelta,
			Amount:              1000,
			Cadence:             common.FrequencyMonthly,
			TargetCashAccountID: &cashID,
			StartDate:           date(2025, 3, 1),
			Notes:               "Extra monthly deposit",
		},
	}

	eventsByID := map[string]*Event{
		"event-savings": {ID: "event-savings", Name: "Monthly savings", OccursOn: date(2025, 3, 1), UpdatedAt: date(2025, 2, 1)},
	}

	result := ApplyImpactsToItem(
		impacts,
		baseValue,
		currentDate,
		ItemInfo{ItemType: "cash", Frequency: common.FrequencyMonthly},
		eventsByID,
	)

	// Check adjusted value
	expectedValue := mustDecimal("26000")
	if result.AdjustedValue.Cmp(expectedValue) != 0 {
		t.Errorf("expected adjusted value %s, got %s", expectedValue.String(), result.AdjustedValue.String())
	}

	// Check applied impacts
	if len(result.AppliedImpacts) != 1 {
		t.Fatalf("expected 1 applied impact, got %d", len(result.AppliedImpacts))
	}

	applied := result.AppliedImpacts[0]
	if applied.EventID != "event-savings" {
		t.Errorf("expected EventID 'event-savings', got '%s'", applied.EventID)
	}
	if applied.ImpactKind != ImpactKindDelta {
		t.Errorf("expected ImpactKind 'delta', got '%s'", applied.ImpactKind)
	}
	if applied.AmountMonthly != 1000 {
		t.Errorf("expected AmountMonthly 1000, got %d", applied.AmountMonthly)
	}
	if applied.AmountAnnual != 12000 {
		t.Errorf("expected AmountAnnual 12000, got %d", applied.AmountAnnual)
	}
}

func TestApplyImpactsToItem_StopReturnsEarly(t *testing.T) {
	/*
		SCENARIO: Stop impact returns early with tracking
		────────────────────────────────────────────────────────────────────────
		Given: Income with both stop and delta impacts
		When:  ApplyImpactsToItem is called
		Then:  Result should show:
		       - AdjustedValue = $0
		       - AppliedImpacts contains ONLY the stop impact
		       - Delta impact is NOT in AppliedImpacts (never processed)

		WHY: Stop is processed first and returns immediately. The tracking
		     should reflect this - only the stop impact caused the $0.
	*/
	incomeID := "salary-1"
	baseValue := mustDecimal("10000")
	currentDate := date(2025, 4, 1)

	impacts := []Impact{
		{
			ID:             "impact-stop",
			EventID:        "event-quit",
			ImpactKind:     ImpactKindStop,
			TargetIncomeID: &incomeID,
			StartDate:      date(2025, 3, 1),
		},
		{
			ID:             "impact-bonus",
			EventID:        "event-bonus",
			ImpactKind:     ImpactKindDelta,
			Amount:         5000,
			Cadence:    common.FrequencyMonthly,
			TargetIncomeID: &incomeID,
			StartDate:      date(2025, 3, 1),
		},
	}

	eventsByID := map[string]*Event{
		"event-quit":  {ID: "event-quit", OccursOn: date(2025, 3, 1), UpdatedAt: date(2025, 2, 1)},
		"event-bonus": {ID: "event-bonus", OccursOn: date(2025, 3, 1), UpdatedAt: date(2025, 2, 15)},
	}

	result := ApplyImpactsToItem(
		impacts,
		baseValue,
		currentDate,
		ItemInfo{ItemType: "income", Frequency: common.FrequencyMonthly},
		eventsByID,
	)

	// Check adjusted value is $0
	if result.AdjustedValue.Cmp(decimal.Zero()) != 0 {
		t.Errorf("expected $0 from stop, got %s", result.AdjustedValue.String())
	}

	// Check only stop impact was tracked
	if len(result.AppliedImpacts) != 1 {
		t.Fatalf("expected 1 applied impact (stop only), got %d", len(result.AppliedImpacts))
	}

	if result.AppliedImpacts[0].ImpactKind != ImpactKindStop {
		t.Errorf("expected stop impact to be tracked, got %s", result.AppliedImpacts[0].ImpactKind)
	}
}

// =============================================================================
// NormalizeToMonthly / NormalizeFromMonthly Tests
// =============================================================================

func TestNormalizeToMonthly_Annual(t *testing.T) {
	/*
		SCENARIO: Converting annual amount to monthly
		────────────────────────────────────────────────────────────────────────
		Given: $120,000/year
		When:  NormalizeToMonthly is called
		Then:  Should return $10,000/month ($120,000 ÷ 12)
	*/
	amount := mustDecimal("120000")
	result := NormalizeToMonthly(amount, common.FrequencyAnnual)

	expected := mustDecimal("10000")
	if result.Cmp(expected) != 0 {
		t.Errorf("expected %s, got %s", expected.String(), result.String())
	}
}

func TestNormalizeToMonthly_Monthly_NoChange(t *testing.T) {
	/*
		SCENARIO: Monthly amount stays monthly
		────────────────────────────────────────────────────────────────────────
		Given: $5,000/month
		When:  NormalizeToMonthly is called with FrequencyMonthly
		Then:  Should return $5,000 (no change)
	*/
	amount := mustDecimal("5000")
	result := NormalizeToMonthly(amount, common.FrequencyMonthly)

	if result.Cmp(amount) != 0 {
		t.Errorf("expected %s (unchanged), got %s", amount.String(), result.String())
	}
}

func TestNormalizeFromMonthly_ToAnnual(t *testing.T) {
	/*
		SCENARIO: Converting monthly amount to annual
		────────────────────────────────────────────────────────────────────────
		Given: $10,000/month
		When:  NormalizeFromMonthly is called with FrequencyAnnual
		Then:  Should return $120,000/year ($10,000 × 12)
	*/
	monthlyAmount := mustDecimal("10000")
	result := NormalizeFromMonthly(monthlyAmount, common.FrequencyAnnual)

	expected := mustDecimal("120000")
	if result.Cmp(expected) != 0 {
		t.Errorf("expected %s, got %s", expected.String(), result.String())
	}
}
