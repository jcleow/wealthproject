package repayment

import (
	"testing"

	"financial-chat-system/backend/internal/decimal"

	"github.com/stretchr/testify/require"
)

func cloneDecimal(d *decimal.Decimal) *decimal.Decimal {
	if d == nil {
		return nil
	}
	copy := &decimal.Decimal{}
	copy.Decimal = d.Decimal
	return copy
}

func buildExpected(strategy Strategy, params Params, months int) ([]decimal.Decimal, error) {
	expected := make([]decimal.Decimal, 0, months)
	balance := params.CurrentBalance
	for i := 0; i < months; i++ {
		params.PeriodIndex = i
		params.TotalPeriods = months
		params.CurrentBalance = balance
		result, err := strategy.Calculate(params)
		if err != nil || result == nil || result.RemainingBalance == nil {
			return nil, err
		}
		expected = append(expected, *result.RemainingBalance)
		balance = result.RemainingBalance
		if result.IsPayoff {
			for fill := i + 1; fill < months; fill++ {
				expected = append(expected, *decimal.Zero())
			}
			break
		}
	}
	return expected, nil
}

func TestBuildSchedule_StandardAmortization(t *testing.T) {
	t.Parallel()

	strategy := NewStandardAmortization()
	balance := decimal.MustFromFloat64(1200)      // $1,200
	rate := decimal.MustFromFloat64(6.0)          // 6% APR
	minPay := decimal.MustFromFloat64(0)          // not used for amortization
	totalMonths := 12                             // 1-year term

	scheduleParams := Params{
		CurrentBalance:  cloneDecimal(balance),
		InterestRateAPR: rate,
		MinimumPayment:  minPay,
	}
	schedule, err := BuildSchedule(strategy, scheduleParams, totalMonths)

	require.NoError(t, err)
	require.Len(t, schedule, totalMonths)

	expectedParams := Params{
		CurrentBalance:  cloneDecimal(balance),
		InterestRateAPR: rate,
		MinimumPayment:  minPay,
	}
	expected, err := buildExpected(strategy, expectedParams, totalMonths)
	require.NoError(t, err)
	require.Len(t, expected, totalMonths)

	for i := range schedule {
		require.InDelta(t, expected[i].ToFloat64(), schedule[i].ToFloat64(), 0.01, "month %d mismatch", i)
	}
}

func TestBuildSchedule_InterestOnlyThenAmortize(t *testing.T) {
	t.Parallel()

	strategy := NewInterestOnly()
	balance := decimal.MustFromFloat64(10000)
	rate := decimal.MustFromFloat64(5.0)
	minPay := decimal.MustFromFloat64(0)
	totalMonths := 24

	params := Params{
		CurrentBalance:  balance,
		InterestRateAPR: rate,
		MinimumPayment:  minPay,
		Metadata: map[string]interface{}{
			"interest_only_months": 12,
		},
	}

	scheduleParams := params
	scheduleParams.CurrentBalance = cloneDecimal(balance)
	schedule, err := BuildSchedule(strategy, scheduleParams, totalMonths)

	require.NoError(t, err)
	require.Len(t, schedule, totalMonths)

	expectedParams := params
	expectedParams.CurrentBalance = cloneDecimal(balance)
	expected, err := buildExpected(strategy, expectedParams, totalMonths)
	require.NoError(t, err)
	require.Len(t, expected, totalMonths)

	// First 12 months should keep balance flat (interest-only)
	for i := 0; i < 12; i++ {
		require.InDelta(t, balance.ToFloat64(), schedule[i].ToFloat64(), 0.01, "month %d", i)
	}

	// After month 12, balance should decrease and match expected
	require.Less(t, schedule[12].ToFloat64(), schedule[11].ToFloat64())
	for i := 12; i < totalMonths; i++ {
		require.InDelta(t, expected[i].ToFloat64(), schedule[i].ToFloat64(), 0.01, "month %d", i)
	}

	// Final balance should reach zero (or very close)
	require.InDelta(t, 0.0, schedule[len(schedule)-1].ToFloat64(), 0.01)
}

func TestBuildSchedule_MinimumPayment(t *testing.T) {
	t.Parallel()

	strategy := NewMinimumPayment()
	balance := decimal.MustFromFloat64(2000)
	rate := decimal.MustFromFloat64(18.0) // credit card style APR
	minPay := decimal.MustFromFloat64(0)
	totalMonths := 6

	params := Params{
		CurrentBalance:  balance,
		InterestRateAPR: rate,
		MinimumPayment:  minPay,
		Metadata: map[string]interface{}{
			"min_payment_pct":  3.0,  // 3% of balance
			"min_payment_floor": 50., // $50 floor
		},
	}

	scheduleParams := params
	scheduleParams.CurrentBalance = cloneDecimal(balance)
	schedule, err := BuildSchedule(strategy, scheduleParams, totalMonths)

	require.NoError(t, err)
	require.Len(t, schedule, totalMonths)

	expectedParams := params
	expectedParams.CurrentBalance = cloneDecimal(balance)
	expected, err := buildExpected(strategy, expectedParams, totalMonths)
	require.NoError(t, err)
	require.Len(t, expected, totalMonths)

	for i := range schedule {
		require.InDelta(t, expected[i].ToFloat64(), schedule[i].ToFloat64(), 0.01, "month %d", i)
	}
}

func TestBuildSchedule_ExtraPayment(t *testing.T) {
	t.Parallel()

	strategy := NewExtraPayment()
	balance := decimal.MustFromFloat64(5000)
	rate := decimal.MustFromFloat64(4.0)
	minPay := decimal.MustFromFloat64(0)
	totalMonths := 24
	extra := 100.0

	params := Params{
		CurrentBalance:  balance,
		InterestRateAPR: rate,
		MinimumPayment:  minPay,
		Metadata: map[string]interface{}{
			"extra_payment": extra,
		},
	}

	scheduleParams := params
	scheduleParams.CurrentBalance = cloneDecimal(balance)
	schedule, err := BuildSchedule(strategy, scheduleParams, totalMonths)

	require.NoError(t, err)
	require.Len(t, schedule, totalMonths)

	expectedParams := params
	expectedParams.CurrentBalance = cloneDecimal(balance)
	expected, err := buildExpected(strategy, expectedParams, totalMonths)
	require.NoError(t, err)

	for i := range schedule {
		require.InDelta(t, expected[i].ToFloat64(), schedule[i].ToFloat64(), 0.01, "month %d", i)
	}

	// Balance should reach zero before the end of term due to extra payments
	for i, bal := range schedule {
		if bal.Cmp(decimal.Zero()) == 0 {
			require.Less(t, i, totalMonths-1, "extra payment should reduce term length")
			break
		}
	}
}
