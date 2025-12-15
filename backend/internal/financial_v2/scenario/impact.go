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
		if impact.ImpactKind != "delta" {
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

// ImpactAppliesToMonth checks if an impact is active for the given month
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
	if impact.Cadence == "one_time" {
		return currentMonth.Equal(impactStart)
	}

	return true
}

// ConvertImpactAmount converts impact amount (int64 cents) to decimal.
// For flow items (income/expense), normalizes based on impact cadence.
func ConvertImpactAmount(impact *Impact, itemInfo ItemInfo) *decimal.Decimal {
	// Impact.Amount is stored as int64 (cents or smallest unit)
	// Convert to decimal dollars (divide by 100)
	amount := decimal.NewFromInt64(impact.Amount, -2)

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
func NormalizeToMonthly(amount *decimal.Decimal, cadence string) *decimal.Decimal {
	switch cadence {
	case "annual":
		return amount.Div(decimal.NewFromInt64(12, 0))
	case "quarterly":
		return amount.Div(decimal.NewFromInt64(3, 0))
	case "semi_annual":
		return amount.Div(decimal.NewFromInt64(6, 0))
	case "bi_weekly":
		// ~2.17 bi-weekly periods per month
		return amount.Mul(decimal.NewFromInt64(26, 0)).Div(decimal.NewFromInt64(12, 0))
	case "weekly":
		// ~4.33 weeks per month
		return amount.Mul(decimal.NewFromInt64(52, 0)).Div(decimal.NewFromInt64(12, 0))
	case "monthly", "one_time":
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
