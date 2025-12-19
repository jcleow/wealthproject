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
func ApplyImpactsToItem(
	impacts []Impact,
	baseValue *decimal.Decimal,
	currentDate time.Time,
	itemInfo ItemInfo,
	eventsByID map[string]*Event,
) *decimal.Decimal {
	result := baseValue

	// First pass: check for stop impacts
	for _, impact := range impacts {
		if impact.ImpactKind == ImpactKindStop && ImpactAppliesToMonth(impact, currentDate) {
			return decimal.Zero()
		}
	}

	// Second pass: find latest applicable override (by event updated_at)
	var latestOverride *Impact
	var latestOverrideTime time.Time

	for i := range impacts {
		impact := &impacts[i]
		if impact.ImpactKind != ImpactKindOverride {
			continue
		}
		if !ImpactAppliesToMonth(*impact, currentDate) {
			continue
		}

		event := eventsByID[impact.EventID]
		if event == nil {
			continue
		}

		if latestOverride == nil || event.UpdatedAt.After(latestOverrideTime) {
			latestOverride = impact
			latestOverrideTime = event.UpdatedAt
		}
	}

	if latestOverride != nil {
		result = ConvertImpactAmount(latestOverride, itemInfo)
	}

	// Third pass: apply all delta impacts (cumulative)
	for i := range impacts {
		impact := &impacts[i]
		if impact.ImpactKind != ImpactKindDelta {
			continue
		}
		if !ImpactAppliesToMonth(*impact, currentDate) {
			continue
		}

		deltaAmount := ConvertImpactAmount(impact, itemInfo)
		result = result.Add(deltaAmount)
	}

	return result
}

// ApplyImpactsToItemWithTracking applies impacts and returns both the result and tracking info
func ApplyImpactsToItemWithTracking(
	impacts []Impact,
	baseValue *decimal.Decimal,
	currentDate time.Time,
	itemInfo ItemInfo,
	eventsByID map[string]*Event,
) ApplyImpactsResult {
	result := ApplyImpactsResult{
		AdjustedValue:  baseValue,
		AppliedImpacts: []AppliedImpactInfo{},
	}

	// First pass: check for stop impacts
	for _, impact := range impacts {
		if impact.ImpactKind == ImpactKindStop && ImpactAppliesToMonth(impact, currentDate) {
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

	// Second pass: find latest applicable override (by event updated_at)
	var latestOverride *Impact
	var latestOverrideTime time.Time

	for i := range impacts {
		impact := &impacts[i]
		if impact.ImpactKind != ImpactKindOverride {
			continue
		}
		if !ImpactAppliesToMonth(*impact, currentDate) {
			continue
		}

		event := eventsByID[impact.EventID]
		if event == nil {
			continue
		}

		if latestOverride == nil || event.UpdatedAt.After(latestOverrideTime) {
			latestOverride = impact
			latestOverrideTime = event.UpdatedAt
		}
	}

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

	// Third pass: apply all delta impacts (cumulative)
	for i := range impacts {
		impact := &impacts[i]
		if impact.ImpactKind != ImpactKindDelta {
			continue
		}
		if !ImpactAppliesToMonth(*impact, currentDate) {
			continue
		}

		deltaAmount := ConvertImpactAmount(impact, itemInfo)
		result.AdjustedValue = result.AdjustedValue.Add(deltaAmount)

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

// ImpactAppliesToMonth checks if an impact is active for the given month
//
// Example 1 - Ongoing monthly impact (no end date):
//
//	impact.StartDate = "2025-01-15", impact.EndDate = nil, impact.Cadence = "monthly"
//	currentDate = "2025-03-01" → true  (started, no end)
//	currentDate = "2024-12-01" → false (before start)
//
// Example 2 - Time-bounded impact:
//
//	impact.StartDate = "2025-01-01", impact.EndDate = "2025-06-30"
//	currentDate = "2025-03-01" → true  (within range)
//	currentDate = "2025-07-01" → false (after end)
//
// Example 3 - One-time impact:
//
//	impact.StartDate = "2025-03-15", impact.Cadence = "one_time"
//	currentDate = "2025-03-01" → true  (same month)
//	currentDate = "2025-04-01" → false (different month)
func ImpactAppliesToMonth(impact Impact, currentDate time.Time) bool {
	// Normalize to first of month for comparison
	currentMonth := normalizeToMonthStart(currentDate)
	impactStart := normalizeToMonthStart(impact.StartDate)

	// Impact must have started on or before current month
	if currentMonth.Before(impactStart) {
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
		return currentMonth.Equal(impactStart)
	}

	return true
}

// ConvertImpactAmount converts impact amount (int64 dollars) to decimal.
// For flow items (income/expense), normalizes based on impact cadence.
//
// Example 1 - Asset/Liability (no normalization needed):
//
//	impact.Amount = 100000, itemInfo.ItemType = "cash_asset"
//	result = $100,000 (direct conversion)
//
// Example 2 - Income stored annually, impact is monthly:
//
//	impact.Amount = 5000, impact.Cadence = "monthly"
//	itemInfo.ItemType = "income", itemInfo.Frequency = "annual"
//	Step 1: monthly = $5,000 (already monthly)
//	Step 2: convert to annual = $5,000 × 12 = $60,000
//	result = $60,000
//
// Example 3 - Income stored monthly, impact is annual:
//
//	impact.Amount = 12000, impact.Cadence = "annual"
//	itemInfo.ItemType = "income", itemInfo.Frequency = "monthly"
//	Step 1: monthly = $12,000 ÷ 12 = $1,000
//	Step 2: keep as monthly = $1,000
//	result = $1,000
func ConvertImpactAmount(impact *Impact, itemInfo ItemInfo) *decimal.Decimal {
	// Impact.Amount is stored as int64 (dollars, like all financial amounts in the DB)
	amount := decimal.NewFromInt64(impact.Amount, 0)

	// For flow items (income/expense), the impact amount is stored in its cadence
	// but we need to normalize to match the item's storage frequency
	if itemInfo.ItemType == "income" || itemInfo.ItemType == "expense" {
		// First convert impact amount to monthly
		monthlyAmount := NormalizeToMonthly(amount, impact.Cadence)
		// Then convert to item's frequency for storage consistency
		amount = NormalizeFromMonthly(monthlyAmount, itemInfo.Frequency)
	}

	return amount
}

// NormalizeToMonthly converts an amount from any cadence to monthly equivalent
func NormalizeToMonthly(amount *decimal.Decimal, cadence common.Frequency) *decimal.Decimal {
	switch cadence {
	case common.FrequencyAnnual:
		return amount.Div(decimal.NewFromInt64(12, 0))
	case common.FrequencyQuarterly:
		return amount.Div(decimal.NewFromInt64(3, 0))
	case common.FrequencySemiannual:
		return amount.Div(decimal.NewFromInt64(6, 0))
	case common.FrequencyBiweekly:
		return amount.Mul(decimal.NewFromInt64(26, 0)).Div(decimal.NewFromInt64(12, 0))
	case common.FrequencyWeekly:
		return amount.Mul(decimal.NewFromInt64(52, 0)).Div(decimal.NewFromInt64(12, 0))
	case common.FrequencyMonthly, common.FrequencyOneTime:
		return amount
	default:
		return amount
	}
}

// NormalizeFromMonthly converts a monthly amount to a target frequency
func NormalizeFromMonthly(monthlyAmount *decimal.Decimal, targetFreq common.Frequency) *decimal.Decimal {
	switch targetFreq {
	case common.FrequencyAnnual:
		return monthlyAmount.Mul(decimal.NewFromInt64(12, 0))
	case common.FrequencyQuarterly:
		return monthlyAmount.Mul(decimal.NewFromInt64(3, 0))
	case common.FrequencySemiannual:
		return monthlyAmount.Mul(decimal.NewFromInt64(6, 0))
	case common.FrequencyBiweekly:
		return monthlyAmount.Mul(decimal.NewFromInt64(12, 0)).Div(decimal.NewFromInt64(26, 0))
	case common.FrequencyWeekly:
		return monthlyAmount.Mul(decimal.NewFromInt64(12, 0)).Div(decimal.NewFromInt64(52, 0))
	case common.FrequencyMonthly:
		return monthlyAmount
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
