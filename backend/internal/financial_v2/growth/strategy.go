package growth

import "financial-chat-system/backend/internal/decimal"

// Strategy defines how to apply growth to a financial amount.
// Each strategy encapsulates both the growth calculation logic AND when to apply it.
type Strategy interface {
	// Apply calculates the new amount after applying growth
	// Parameters:
	//   - currentAmount: the current value to grow
	//   - params: strategy-specific parameters (rate, etc.)
	//   - currentMonth: absolute month index (1-420 for 35 years, 1=Jan year 0, 13=Jan year 1)
	//   - monthOfYear: month within year (1-12, where 1=January, 12=December)
	// Returns: the new amount after growth is applied
	Apply(currentAmount *decimal.Decimal, params Params, currentMonth int, monthOfYear int) *decimal.Decimal

	// Name returns the unique identifier for this strategy
	Name() string
}

// Params contains parameters for growth calculations.
// Different strategies may use different fields.
type Params struct {
	// AnnualRatePct is the annual growth rate as a percentage (e.g., 7.0 for 7%)
	AnnualRatePct *decimal.Decimal

	// CustomFields allows strategies to accept additional configuration
	CustomFields map[string]any
}
