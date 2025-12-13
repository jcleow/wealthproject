package common

import "financial-chat-system/backend/internal/decimal"

type Frequency string

const (
	FrequencyAnnual     Frequency = "annual"
	FrequencyMonthly    Frequency = "monthly"
	FrequencyWeekly     Frequency = "weekly"
	FrequencyBiweekly   Frequency = "biweekly"
	FrequencyQuarterly  Frequency = "quarterly"
	FrequencySemiannual Frequency = "semiannual"
)

// ToMonthlyAmount converts an amount to monthly based on frequency.
// Uses exact calculations: weekly = amount * 52 / 12, biweekly = amount * 26 / 12
func ToMonthlyAmount(amount *decimal.Decimal, freq Frequency) *decimal.Decimal {
	if amount == nil {
		return decimal.Zero()
	}
	switch freq {
	case FrequencyAnnual, "yearly": // Handle legacy "yearly" data
		return amount.Div(decimal.NewFromInt64(12, 0))
	case FrequencyQuarterly:
		return amount.Div(decimal.NewFromInt64(3, 0))
	case FrequencySemiannual:
		return amount.Div(decimal.NewFromInt64(6, 0))
	case FrequencyWeekly:
		// Exact: amount * 52 / 12
		return amount.Mul(decimal.NewFromInt64(52, 0)).Div(decimal.NewFromInt64(12, 0))
	case FrequencyBiweekly:
		// Exact: amount * 26 / 12
		return amount.Mul(decimal.NewFromInt64(26, 0)).Div(decimal.NewFromInt64(12, 0))
	case FrequencyMonthly:
		fallthrough
	default:
		return amount
	}
}
