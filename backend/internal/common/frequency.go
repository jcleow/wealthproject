package common

import "financial-chat-system/backend/internal/decimal"

// Frequency represents the recurrence period for financial items.
// All values use snake_case format in the database.
type Frequency string

const (
	FrequencyOneTime Frequency = "one_time"
	FrequencyMonthly Frequency = "monthly"
	FrequencyAnnual  Frequency = "annual"

	// Deprecated frequencies - kept for migration compatibility, do not use in new code
	// These will be removed after data migration completes
	FrequencyWeekly     Frequency = "weekly"      // deprecated
	FrequencyBiweekly   Frequency = "bi_weekly"   // deprecated
	FrequencyQuarterly  Frequency = "quarterly"   // deprecated
	FrequencySemiannual Frequency = "semi_annual" // deprecated
)

// AllFrequencies contains all valid frequency values for new data.
var AllFrequencies = []Frequency{
	FrequencyOneTime,
	FrequencyMonthly,
	FrequencyAnnual,
}

// RecurringFrequencies contains frequencies that recur (excludes one_time).
// Used for delta impacts only.
var RecurringFrequencies = []Frequency{
	FrequencyMonthly,
	FrequencyAnnual,
}

// DeprecatedFrequencies contains frequencies that are being phased out.
// Used by migration logic to identify records that need conversion.
var DeprecatedFrequencies = []Frequency{
	FrequencyWeekly,
	FrequencyBiweekly,
	FrequencyQuarterly,
	FrequencySemiannual,
}

// ToMonthlyAmount converts an amount to monthly based on frequency.
// Primary frequencies: monthly (no conversion), annual (÷12)
// Deprecated frequencies are still supported for backward compatibility during migration.
func ToMonthlyAmount(amount *decimal.Decimal, freq Frequency) *decimal.Decimal {
	if amount == nil {
		return decimal.Zero()
	}
	switch freq {
	case FrequencyAnnual:
		return amount.Div(decimal.NewFromInt64(12, 0))
	case FrequencyMonthly, FrequencyOneTime:
		return amount
	// Deprecated frequencies - kept for migration compatibility
	case FrequencyQuarterly:
		return amount.Div(decimal.NewFromInt64(3, 0))
	case FrequencySemiannual:
		return amount.Div(decimal.NewFromInt64(6, 0))
	case FrequencyWeekly:
		return amount.Mul(decimal.NewFromInt64(52, 0)).Div(decimal.NewFromInt64(12, 0))
	case FrequencyBiweekly:
		return amount.Mul(decimal.NewFromInt64(26, 0)).Div(decimal.NewFromInt64(12, 0))
	default:
		return amount
	}
}
