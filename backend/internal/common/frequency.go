package common

import "financial-chat-system/backend/internal/decimal"

// Frequency represents the recurrence period for financial items.
// All values use snake_case format in the database.
type Frequency string

const (
	FrequencyOneTime    Frequency = "one_time"
	FrequencyWeekly     Frequency = "weekly"
	FrequencyBiweekly   Frequency = "bi_weekly"
	FrequencyMonthly    Frequency = "monthly"
	FrequencyQuarterly  Frequency = "quarterly"
	FrequencySemiannual Frequency = "semi_annual"
	FrequencyAnnual     Frequency = "annual"
)

// AllFrequencies contains all valid frequency values.
var AllFrequencies = []Frequency{
	FrequencyOneTime,
	FrequencyWeekly,
	FrequencyBiweekly,
	FrequencyMonthly,
	FrequencyQuarterly,
	FrequencySemiannual,
	FrequencyAnnual,
}

// RecurringFrequencies contains frequencies that recur (excludes one_time).
var RecurringFrequencies = []Frequency{
	FrequencyWeekly,
	FrequencyBiweekly,
	FrequencyMonthly,
	FrequencyQuarterly,
	FrequencySemiannual,
	FrequencyAnnual,
}

// ToMonthlyAmount converts an amount to monthly based on frequency.
// Uses exact calculations: weekly = amount * 52 / 12, bi_weekly = amount * 26 / 12
func ToMonthlyAmount(amount *decimal.Decimal, freq Frequency) *decimal.Decimal {
	if amount == nil {
		return decimal.Zero()
	}
	switch freq {
	case FrequencyAnnual:
		return amount.Div(decimal.NewFromInt64(12, 0))
	case FrequencyQuarterly:
		return amount.Div(decimal.NewFromInt64(3, 0))
	case FrequencySemiannual:
		return amount.Div(decimal.NewFromInt64(6, 0))
	case FrequencyWeekly:
		return amount.Mul(decimal.NewFromInt64(52, 0)).Div(decimal.NewFromInt64(12, 0))
	case FrequencyBiweekly:
		return amount.Mul(decimal.NewFromInt64(26, 0)).Div(decimal.NewFromInt64(12, 0))
	case FrequencyMonthly, FrequencyOneTime:
		return amount
	default:
		return amount
	}
}
