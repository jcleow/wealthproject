package repayment

import (
	"fmt"

	"financial-chat-system/backend/internal/decimal"
)

// BuildSchedule returns remaining balances for each month of a loan term.
// totalPeriods is the number of months; params must include CurrentBalance, InterestRateAPR, and MinimumPayment.
func BuildSchedule(strategy Strategy, params Params, totalPeriods int) ([]decimal.Decimal, error) {
	if totalPeriods <= 0 {
		return nil, nil
	}
	if params.CurrentBalance == nil || params.InterestRateAPR == nil || params.MinimumPayment == nil {
		return nil, fmt.Errorf("missing repayment params")
	}

	balance := params.CurrentBalance
	schedule := make([]decimal.Decimal, totalPeriods)

	for i := 0; i < totalPeriods; i++ {
		params.PeriodIndex = i
		params.TotalPeriods = totalPeriods
		params.CurrentBalance = balance

		result, err := strategy.Calculate(params)
		if err != nil || result == nil || result.RemainingBalance == nil {
			return nil, fmt.Errorf("failed to calculate repayment schedule: %w", err)
		}

		schedule[i] = *result.RemainingBalance
		balance = result.RemainingBalance

		if result.RemainingBalance.IsZero() {
			for fill := i + 1; fill < totalPeriods; fill++ {
				schedule[fill] = *decimal.Zero()
			}
			break
		}
	}

	return schedule, nil
}
