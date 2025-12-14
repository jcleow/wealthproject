package repayment

import (
	"testing"

	"financial-chat-system/backend/internal/decimal"

	"github.com/stretchr/testify/require"
)

func TestBuildSchedule_StandardAmortization(t *testing.T) {
	t.Parallel()

	strategy := NewStandardAmortization()
	balance := decimal.MustFromFloat64(1200)      // $1,200
	rate := decimal.MustFromFloat64(6.0)          // 6% APR
	minPay := decimal.MustFromFloat64(0)          // not used for amortization
	totalMonths := 12                             // 1-year term
	expectedFinal := decimal.Zero()               // should fully amortize
	expectedFirst := decimal.MustFromFloat64(109) // approx remaining after month 1 principal portion

	schedule, err := BuildSchedule(strategy, Params{
		CurrentBalance:  balance,
		InterestRateAPR: rate,
		MinimumPayment:  minPay,
	}, totalMonths)

	require.NoError(t, err)
	require.Len(t, schedule, totalMonths)

	// First month remaining balance should be less than starting and close to expectedFirst (rounded)
	require.Less(t, schedule[0].ToFloat64(), balance.ToFloat64())
	require.InDelta(t, expectedFirst.ToFloat64(), schedule[0].Round(0).ToFloat64(), 1)

	// Final month should be paid off (near zero)
	require.InDelta(t, expectedFinal.ToFloat64(), schedule[len(schedule)-1].ToFloat64(), 0.01)
}

func TestBuildSchedule_InterestOnlyThenAmortize(t *testing.T) {
	t.Parallel()

	strategy := NewInterestOnly()
	balance := decimal.MustFromFloat64(10000)
	rate := decimal.MustFromFloat64(5.0)
	minPay := decimal.MustFromFloat64(0)
	totalMonths := 24

	schedule, err := BuildSchedule(strategy, Params{
		CurrentBalance:  balance,
		InterestRateAPR: rate,
		MinimumPayment:  minPay,
		Metadata: map[string]interface{}{
			"interest_only_months": 12,
		},
	}, totalMonths)

	require.NoError(t, err)
	require.Len(t, schedule, totalMonths)

	// First 12 months should keep balance flat (interest-only)
	for i := 0; i < 12; i++ {
		require.InDelta(t, balance.ToFloat64(), schedule[i].ToFloat64(), 0.01)
	}

	// After month 12, balance should decrease
	require.Less(t, schedule[12].ToFloat64(), schedule[11].ToFloat64())

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

	schedule, err := BuildSchedule(strategy, Params{
		CurrentBalance:  balance,
		InterestRateAPR: rate,
		MinimumPayment:  minPay,
		Metadata: map[string]interface{}{
			"min_payment_pct":  3.0,  // 3% of balance
			"min_payment_floor": 50., // $50 floor
		},
	}, totalMonths)

	require.NoError(t, err)
	require.Len(t, schedule, totalMonths)

	// Balance should decline each month
	for i := 1; i < len(schedule); i++ {
		require.Less(t, schedule[i].ToFloat64(), schedule[i-1].ToFloat64())
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

	schedule, err := BuildSchedule(strategy, Params{
		CurrentBalance:  balance,
		InterestRateAPR: rate,
		MinimumPayment:  minPay,
		Metadata: map[string]interface{}{
			"extra_payment": extra,
		},
	}, totalMonths)

	require.NoError(t, err)
	require.Len(t, schedule, totalMonths)

	// Balance should reach zero before the end of term due to extra payments
	paidOffIndex := -1
	for i, bal := range schedule {
		if bal.Cmp(decimal.Zero()) == 0 {
			paidOffIndex = i
			break
		}
	}
	require.NotEqual(t, -1, paidOffIndex, "loan should pay off early with extra payments")
	require.Less(t, paidOffIndex, totalMonths-1, "extra payment should reduce term length")
}
