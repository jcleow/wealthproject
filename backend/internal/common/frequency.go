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

// ToMonthlyAmount converts an amount to monthly based on frequency
func ToMonthlyAmount(amount *decimal.Decimal, freq Frequency) *decimal.Decimal {
	if amount == nil {
		return decimal.Zero()
	}
	switch freq {
	case FrequencyAnnual:
		result, _ := amount.Div(decimal.NewFromInt64(12, 0))
		return result
	case FrequencyQuarterly:
		result, _ := amount.Div(decimal.NewFromInt64(3, 0))
		return result
	case FrequencySemiannual:
		result, _ := amount.Div(decimal.NewFromInt64(6, 0))
		return result
	case FrequencyWeekly:
		// ~4.33 weeks per month
		result, _ := amount.Mul(decimal.MustFromFloat64(4.33))
		return result
	case FrequencyBiweekly:
		// ~2.17 bi-weeks per month
		result, _ := amount.Mul(decimal.MustFromFloat64(2.17))
		return result
	case FrequencyMonthly:
		fallthrough
	default:
		return amount
	}
}
