package scenario

import (
	"time"

	"financial-chat-system/backend/internal/common"
	"financial-chat-system/backend/internal/decimal"
)

// ItemInfo provides the minimal information needed about a financial item
// for scenario impact calculations
type ItemInfo struct {
	ItemType  string           // e.g., "income", "expense", "asset", etc.
	Frequency common.Frequency // The frequency of flow items (monthly, annual, etc.)
	StartDate time.Time        // When the financial item started (impacts can't apply before this)
}

// AppliedImpactInfo contains information about an impact that was applied
type AppliedImpactInfo struct {
	EventID       string
	ImpactKind    string
	AmountMonthly int64            // Amount in monthly terms (cents)
	AmountAnnual  int64            // Amount in annual terms (cents)
	Cadence       common.Frequency // Original cadence
	Notes         string
}

// ApplyImpactsResult contains both the adjusted value and the impacts that were applied
type ApplyImpactsResult struct {
	AdjustedValue  *decimal.Decimal
	AppliedImpacts []AppliedImpactInfo
}

// BuildImpactContext indexes scenario impacts by target ID for O(1) lookup
func BuildImpactContext(events []Event) *ImpactContext {
	if len(events) == 0 {
		return nil
	}

	ctx := &ImpactContext{
		ImpactsByTarget: make(map[string][]Impact),
		EventsByID:      make(map[string]*Event),
	}

	for i := range events {
		event := &events[i]
		ctx.EventsByID[event.ID] = event

		for _, impact := range event.Impacts {
			targetID := impact.TargetID()
			if targetID == nil {
				continue
			}
			ctx.ImpactsByTarget[*targetID] = append(ctx.ImpactsByTarget[*targetID], impact)
		}
	}

	return ctx
}

// ApplyImpactsToItem applies all applicable impacts to a single item.
// Order: stop first (returns zero), then override (latest event wins), then delta (cumulative)
//
// Example 1 - Delta impact (+$100k/month to cash account):
//
//	baseValue = $25,000
//	impacts = [{ImpactKind: "delta", Amount: 100000, Cadence: "monthly"}]
//	result = $25,000 + $100,000 = $125,000
//
// Example 2 - Override impact (salary change to $150k/year):
//
//	baseValue = $120,000 (current annual salary)
//	impacts = [{ImpactKind: "override", Amount: 150000, Cadence: "annual"}]
//	result = $150,000 (base value replaced entirely)
//
// Example 3 - Stop impact (job loss - income stops):
//
//	baseValue = $10,000 (monthly salary)
//	impacts = [{ImpactKind: "stop"}]
//	result = $0 (immediately returns zero)
//
// Example 4 - Multiple impacts (override + delta):
//
//	baseValue = $120,000
//	impacts = [
//	  {ImpactKind: "override", Amount: 150000},  // Sets to $150k
//	  {ImpactKind: "delta", Amount: 5000},       // Adds $5k bonus
//	]
//	result = $150,000 + $5,000 = $155,000
//
// ApplyImpactsToItem returns both the adjusted value and tracking info
// (which impacts were applied, for API responses).
//
// ═══════════════════════════════════════════════════════════════════════════════
// WORKED EXAMPLE: Cash account with delta impact
// ═══════════════════════════════════════════════════════════════════════════════
//
// INPUT:
//
//	impacts = [
//	  {EventID: "evt-1", ImpactKind: "delta", Amount: 100000, Cadence: "monthly",
//	   StartDate: "2025-12-01", EndDate: nil}
//	]
//	baseValue = $125,051
//	currentDate = "2026-01-15"
//	itemInfo = {ItemType: "cash_asset", Frequency: "monthly"}
//	eventsByID = {"evt-1": {ID: "evt-1", UpdatedAt: "2025-12-01T10:00:00Z"}}
//
// PROCESSING:
//
//	PASS 1 (stop):
//	  impacts[0].ImpactKind = "delta" ≠ "stop" → skip
//	  No stop found → continue to pass 2
//
//	PASS 2 (override):
//	  impacts[0].ImpactKind = "delta" ≠ "override" → skip
//	  No override found → result.AdjustedValue stays $125,051
//
//	PASS 3 (delta):
//	  impacts[0].ImpactKind = "delta" ✓
//	  ImpactAppliesToMonth("2025-12-01", nil, "2026-01-15") → true
//	  deltaAmount = ConvertImpactAmount($100,000, "monthly", "cash_asset") = $100,000
//	  result.AdjustedValue = $125,051 + $100,000 = $225,051
//	  result.AppliedImpacts = [{EventID: "evt-1", ImpactKind: "delta",
//	                           AmountMonthly: 100000, AmountAnnual: 1200000}]
//
// OUTPUT:
//
//	ApplyImpactsResult{
//	  AdjustedValue: $225,051,
//	  AppliedImpacts: [{EventID: "evt-1", ImpactKind: "delta", AmountMonthly: 100000, ...}]
//	}
//
// ═══════════════════════════════════════════════════════════════════════════════
// WORKED EXAMPLE: Income with override + delta impacts
// ═══════════════════════════════════════════════════════════════════════════════
//
// INPUT:
//
//	impacts = [
//	  {EventID: "evt-raise", ImpactKind: "override", Amount: 150000, Cadence: "annual"},
//	  {EventID: "evt-bonus", ImpactKind: "delta", Amount: 5000, Cadence: "annual"}
//	]
//	baseValue = $120,000 (current annual salary)
//	itemInfo = {ItemType: "income", Frequency: "annual"}
//
// PROCESSING:
//
//	PASS 1 (stop): No stop → continue
//
//	PASS 2 (override):
//	  Found "evt-raise" override, Amount = $150,000
//	  result.AdjustedValue = $150,000 (replaces base entirely)
//	  result.AppliedImpacts = [{EventID: "evt-raise", ImpactKind: "override", ...}]
//
//	PASS 3 (delta):
//	  Found "evt-bonus" delta, Amount = $5,000
//	  result.AdjustedValue = $150,000 + $5,000 = $155,000
//	  result.AppliedImpacts = [
//	    {EventID: "evt-raise", ImpactKind: "override", AmountAnnual: 150000},
//	    {EventID: "evt-bonus", ImpactKind: "delta", AmountAnnual: 5000}
//	  ]
//
// OUTPUT:
//
//	ApplyImpactsResult{
//	  AdjustedValue: $155,000,
//	  AppliedImpacts: [override info, delta info]
//	}
//
// ═══════════════════════════════════════════════════════════════════════════════
// WORKED EXAMPLE: Income with stop impact (job loss)
// ═══════════════════════════════════════════════════════════════════════════════
//
// INPUT:
//
//	impacts = [
//	  {EventID: "evt-quit", ImpactKind: "stop", StartDate: "2026-03-01"},
//	  {EventID: "evt-bonus", ImpactKind: "delta", Amount: 5000}  // would be ignored
//	]
//	baseValue = $120,000
//	currentDate = "2026-04-01"
//
// PROCESSING:
//
//	PASS 1 (stop):
//	  Found "evt-quit" stop impact
//	  ImpactAppliesToMonth("2026-03-01", nil, "2026-04-01") → true (started)
//	  result.AdjustedValue = $0 (immediately)
//	  RETURN EARLY ← delta never processed
//
// OUTPUT:
//
//	ApplyImpactsResult{
//	  AdjustedValue: $0,
//	  AppliedImpacts: [{EventID: "evt-quit", ImpactKind: "stop", ...}]
//	}
//
// ═══════════════════════════════════════════════════════════════════════════════
func ApplyImpactsToItem(
	impacts []Impact,
	baseValue *decimal.Decimal,
	currentDate time.Time,
	itemInfo ItemInfo,
	eventsByID map[string]*Event,
) ApplyImpactsResult {
	// ─────────────────────────────────────────────────────────────────────────
	// Initialize result with base value
	//
	// Example: baseValue = $125,051
	//          result.AdjustedValue = $125,051 (will be modified by impacts)
	// ─────────────────────────────────────────────────────────────────────────
	result := ApplyImpactsResult{
		AdjustedValue:  baseValue,
		AppliedImpacts: []AppliedImpactInfo{},
	}

	// ─────────────────────────────────────────────────────────────────────────
	// PASS 1: Check for stop impacts (highest priority - returns immediately)
	//
	// Example: Job loss scenario
	//   impact = {ImpactKind: "stop", StartDate: "2026-03-01"}
	//   currentDate = "2026-04-01"
	//   ImpactAppliesToMonth() → true (stop has started)
	//   result.AdjustedValue = $0
	//   RETURN immediately (skip override and delta passes)
	// ─────────────────────────────────────────────────────────────────────────
	for _, impact := range impacts {
		event := eventsByID[impact.EventID]
		if impact.ImpactKind == ImpactKindStop && ImpactAppliesToMonth(impact, currentDate, event, &itemInfo) {
			result.AdjustedValue = decimal.Zero()
			result.AppliedImpacts = append(result.AppliedImpacts, AppliedImpactInfo{
				EventID:       impact.EventID,
				ImpactKind:    impact.ImpactKind,
				AmountMonthly: 0,
				AmountAnnual:  0,
				Cadence:       impact.Cadence,
				Notes:         impact.Notes,
			})
			return result
		}
	}

	// ─────────────────────────────────────────────────────────────────────────
	// PASS 2: Find latest applicable override (by event.UpdatedAt timestamp)
	//
	// Why "latest"? If user creates multiple conflicting overrides, the most
	// recently updated one wins. This allows users to correct mistakes.
	//
	// Example: Two override impacts for same item
	//   impact1 = {EventID: "old", Amount: 100000, event.UpdatedAt: "2025-01-01"}
	//   impact2 = {EventID: "new", Amount: 150000, event.UpdatedAt: "2025-06-01"}
	//   latestOverride = impact2 (newer UpdatedAt wins)
	//   result.AdjustedValue = $150,000 (replaces base value entirely)
	// ─────────────────────────────────────────────────────────────────────────
	var latestOverride *Impact
	var latestOverrideTime time.Time

	for i := range impacts {
		impact := &impacts[i]
		// Example: impact.ImpactKind = "delta" → skip (not override)
		if impact.ImpactKind != ImpactKindOverride {
			continue
		}

		event := eventsByID[impact.EventID]
		if event == nil {
			continue
		}

		// Example: event.OccursOn = "2026-06-01", currentDate = "2026-01-01"
		//          → false (event hasn't occurred yet)
		if !ImpactAppliesToMonth(*impact, currentDate, event, &itemInfo) {
			continue
		}

		// Example: event.UpdatedAt = "2025-06-01" > latestOverrideTime "2025-01-01"
		//          → this becomes the new latestOverride
		if latestOverride == nil || event.UpdatedAt.After(latestOverrideTime) {
			latestOverride = impact
			latestOverrideTime = event.UpdatedAt
		}
	}

	// Example: latestOverride = {Amount: 150000, Cadence: "annual"}
	//          result.AdjustedValue = $150,000 (base value completely replaced)
	if latestOverride != nil {
		result.AdjustedValue = ConvertImpactAmount(latestOverride, itemInfo)
		monthlyAmt, annualAmt := computeImpactAmounts(latestOverride)
		result.AppliedImpacts = append(result.AppliedImpacts, AppliedImpactInfo{
			EventID:       latestOverride.EventID,
			ImpactKind:    latestOverride.ImpactKind,
			AmountMonthly: monthlyAmt,
			AmountAnnual:  annualAmt,
			Cadence:       latestOverride.Cadence,
			Notes:         latestOverride.Notes,
		})
	}

	// ─────────────────────────────────────────────────────────────────────────
	// PASS 3: Apply all delta impacts (cumulative - all deltas stack)
	//
	// Unlike override (only latest wins), ALL applicable deltas are summed.
	// This allows multiple additive adjustments.
	//
	// Example: Two delta impacts
	//   delta1 = {Amount: 100000, Cadence: "monthly"}  // +$100k/month
	//   delta2 = {Amount: 5000, Cadence: "monthly"}    // +$5k/month bonus
	//   Both apply: result.AdjustedValue += $100,000 += $5,000
	//
	// Example with prior override:
	//   After PASS 2: result.AdjustedValue = $150,000 (from override)
	//   delta = {Amount: 5000}
	//   result.AdjustedValue = $150,000 + $5,000 = $155,000
	// ─────────────────────────────────────────────────────────────────────────
	for i := range impacts {
		impact := &impacts[i]
		// Example: impact.ImpactKind = "override" → skip (not delta)
		if impact.ImpactKind != ImpactKindDelta {
			continue
		}

		event := eventsByID[impact.EventID]
		// Example: event.OccursOn = future date, or impact.EndDate passed
		//          → false (event hasn't occurred yet or impact has ended)
		if !ImpactAppliesToMonth(*impact, currentDate, event, &itemInfo) {
			continue
		}

		// Example: impact.Amount = 100000, Cadence = "monthly", ItemType = "cash_asset"
		//          deltaAmount = $100,000 (no conversion needed for assets)
		deltaAmount := ConvertImpactAmount(impact, itemInfo)

		// Example: result.AdjustedValue = $125,051 + $100,000 = $225,051
		result.AdjustedValue = result.AdjustedValue.Add(deltaAmount)

		// Track this impact for API response
		// Example: monthlyAmt = 100000, annualAmt = 1200000
		monthlyAmt, annualAmt := computeImpactAmounts(impact)
		result.AppliedImpacts = append(result.AppliedImpacts, AppliedImpactInfo{
			EventID:       impact.EventID,
			ImpactKind:    impact.ImpactKind,
			AmountMonthly: monthlyAmt,
			AmountAnnual:  annualAmt,
			Cadence:       impact.Cadence,
			Notes:         impact.Notes,
		})
	}

	// Example final result:
	//   AdjustedValue = $225,051
	//   AppliedImpacts = [{EventID: "evt-1", ImpactKind: "delta", AmountMonthly: 100000, ...}]
	return result
}

// computeImpactAmounts converts impact amount to both monthly and annual terms (in dollars)
func computeImpactAmounts(impact *Impact) (monthlyAmt int64, annualAmt int64) {
	// Impact.Amount is stored as int64 (dollars, like all financial amounts in the DB)
	amount := decimal.NewFromInt64(impact.Amount, 0)

	// Convert to monthly based on impact's cadence
	switch impact.Cadence {
	case common.FrequencyAnnual:
		// Annual: monthly = amount/12, annual = amount
		monthly := amount.Div(decimal.NewFromInt64(12, 0))
		monthlyAmt, _ = monthly.Int64()
		annualAmt = impact.Amount
	case common.FrequencyMonthly:
		// Monthly: monthly = amount, annual = amount*12
		monthlyAmt = impact.Amount
		annual := amount.Mul(decimal.NewFromInt64(12, 0))
		annualAmt, _ = annual.Int64()
	default:
		// Default to monthly treatment for other frequencies
		monthlyAmt = impact.Amount
		annual := amount.Mul(decimal.NewFromInt64(12, 0))
		annualAmt, _ = annual.Int64()
	}
	return
}

// ImpactAppliesToMonth checks if an impact is active for the given month.
// It uses the later of (event.OccursOn, item.StartDate) to determine when the impact takes effect.
// This ensures impacts don't apply before the financial item exists OR before the event occurs.
//
// Example 1 - Future event:
//
//	event.OccursOn = "2028-12-01" (Salary Promotion)
//	item.StartDate = "2020-01-01" (job started in 2020)
//	effectiveStart = 2028-12-01 (later of the two)
//	currentDate = "2025-12-01" → false (event hasn't occurred yet)
//
// Example 2 - Item starts after event:
//
//	event.OccursOn = "2025-01-01" (generic increase scenario)
//	item.StartDate = "2028-06-01" (new job starts in future)
//	effectiveStart = 2028-06-01 (later of the two)
//	currentDate = "2026-01-01" → false (item doesn't exist yet)
//
// Example 3 - Time-bounded impact:
//
//	event.OccursOn = "2025-01-01", impact.EndDate = "2025-06-30"
//	currentDate = "2025-03-01" → true  (within range)
//	currentDate = "2025-07-01" → false (after end)
//
// Example 4 - One-time impact:
//
//	event.OccursOn = "2025-03-15", impact.Cadence = "one_time"
//	currentDate = "2025-03-01" → true  (same month as event)
//	currentDate = "2025-04-01" → false (different month)
func ImpactAppliesToMonth(impact Impact, currentDate time.Time, event *Event, itemInfo *ItemInfo) bool {
	// Normalize to first of month for comparison
	currentMonth := normalizeToMonthStart(currentDate)

	// Determine effective start date: later of (event.OccursOn, item.StartDate)
	// This ensures impact doesn't apply before the item exists or before the event occurs
	var effectiveStart time.Time
	if event != nil && !event.OccursOn.IsZero() {
		effectiveStart = normalizeToMonthStart(event.OccursOn)
	} else {
		// Fallback to impact's StartDate if event is not available
		effectiveStart = normalizeToMonthStart(impact.StartDate)
	}

	// If item has a start date, use the later of event/item start dates
	if itemInfo != nil && !itemInfo.StartDate.IsZero() {
		itemStart := normalizeToMonthStart(itemInfo.StartDate)
		if itemStart.After(effectiveStart) {
			effectiveStart = itemStart
		}
	}

	// Impact must have started on or before current month
	if currentMonth.Before(effectiveStart) {
		return false
	}

	// If impact has end date, current month must be on or before end
	if impact.EndDate != nil {
		impactEnd := normalizeToMonthStart(*impact.EndDate)
		if currentMonth.After(impactEnd) {
			return false
		}
	}

	// Handle one_time cadence: only applies in the start month
	if impact.Cadence == common.FrequencyOneTime {
		return currentMonth.Equal(effectiveStart)
	}

	return true
}

// ConvertImpactAmount converts impact amount (int64 dollars) to decimal.
// Normalizes based on impact cadence for the timeline's monthly processing.
//
// Example 1 - Asset with monthly delta:
//
//	impact.Amount = 1000, impact.Cadence = "monthly", itemInfo.ItemType = "asset"
//	result = $1,000 (added each month)
//
// Example 2 - Asset with annual delta:
//
//	impact.Amount = 12000, impact.Cadence = "annual", itemInfo.ItemType = "asset"
//	result = $12,000 ÷ 12 = $1,000 (added each month)
//
// Example 3 - Income stored annually, impact is monthly:
//
//	impact.Amount = 5000, impact.Cadence = "monthly"
//	itemInfo.ItemType = "income", itemInfo.Frequency = "annual"
//	Step 1: monthly = $5,000 (already monthly)
//	Step 2: convert to annual = $5,000 × 12 = $60,000
//	result = $60,000
//
// Example 4 - Income stored monthly, impact is annual:
//
//	impact.Amount = 12000, impact.Cadence = "annual"
//	itemInfo.ItemType = "income", itemInfo.Frequency = "monthly"
//	Step 1: monthly = $12,000 ÷ 12 = $1,000
//	Step 2: keep as monthly = $1,000
//	result = $1,000
func ConvertImpactAmount(impact *Impact, itemInfo ItemInfo) *decimal.Decimal {
	// Impact.Amount is stored as int64 (dollars, like all financial amounts in the DB)
	amount := decimal.NewFromInt64(impact.Amount, 0)

	// For flow items (income/expense), normalize to match the item's storage frequency
	if itemInfo.ItemType == "income" || itemInfo.ItemType == "expense" {
		// First convert impact amount to monthly
		monthlyAmount := NormalizeToMonthly(amount, impact.Cadence)
		// Then convert to item's frequency for storage consistency
		amount = NormalizeFromMonthly(monthlyAmount, itemInfo.Frequency)
	} else {
		// For balance sheet items (asset, liability, cash, investment),
		// normalize annual to monthly since timeline processes month-by-month
		// Only applies to delta impacts (override/start/stop don't use cadence)
		if impact.ImpactKind == ImpactKindDelta {
			amount = NormalizeToMonthly(amount, impact.Cadence)
		}
	}

	return amount
}

// NormalizeToMonthly converts an amount from any cadence to monthly equivalent.
// Primary cadences: monthly (no conversion), annual (÷12)
// Deprecated cadences are still supported for backward compatibility during migration.
func NormalizeToMonthly(amount *decimal.Decimal, cadence common.Frequency) *decimal.Decimal {
	switch cadence {
	case common.FrequencyAnnual:
		return amount.Div(decimal.NewFromInt64(12, 0))
	case common.FrequencyMonthly, common.FrequencyOneTime:
		return amount
	// Deprecated frequencies - kept for migration compatibility
	case common.FrequencyQuarterly:
		return amount.Div(decimal.NewFromInt64(3, 0))
	case common.FrequencySemiannual:
		return amount.Div(decimal.NewFromInt64(6, 0))
	case common.FrequencyBiweekly:
		return amount.Mul(decimal.NewFromInt64(26, 0)).Div(decimal.NewFromInt64(12, 0))
	case common.FrequencyWeekly:
		return amount.Mul(decimal.NewFromInt64(52, 0)).Div(decimal.NewFromInt64(12, 0))
	default:
		return amount
	}
}

// NormalizeFromMonthly converts a monthly amount to a target frequency.
// Primary frequencies: monthly (no conversion), annual (×12)
// Deprecated frequencies are still supported for backward compatibility during migration.
func NormalizeFromMonthly(monthlyAmount *decimal.Decimal, targetFreq common.Frequency) *decimal.Decimal {
	switch targetFreq {
	case common.FrequencyAnnual:
		return monthlyAmount.Mul(decimal.NewFromInt64(12, 0))
	case common.FrequencyMonthly:
		return monthlyAmount
	// Deprecated frequencies - kept for migration compatibility
	case common.FrequencyQuarterly:
		return monthlyAmount.Mul(decimal.NewFromInt64(3, 0))
	case common.FrequencySemiannual:
		return monthlyAmount.Mul(decimal.NewFromInt64(6, 0))
	case common.FrequencyBiweekly:
		return monthlyAmount.Mul(decimal.NewFromInt64(12, 0)).Div(decimal.NewFromInt64(26, 0))
	case common.FrequencyWeekly:
		return monthlyAmount.Mul(decimal.NewFromInt64(12, 0)).Div(decimal.NewFromInt64(52, 0))
	default:
		return monthlyAmount
	}
}

// normalizeToMonthStart returns the first day of the month in UTC for a given date.
func normalizeToMonthStart(date time.Time) time.Time {
	if date.IsZero() {
		return date
	}
	d := date.UTC()
	return time.Date(d.Year(), d.Month(), 1, 0, 0, 0, 0, time.UTC)
}
