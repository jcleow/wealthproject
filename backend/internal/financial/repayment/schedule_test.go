package repayment

import (
	"testing"

	"financial-chat-system/backend/internal/decimal"

	"github.com/stretchr/testify/require"
)

func TestBuildSchedule_StandardAmortization(t *testing.T) {
	strategy := NewStandardAmortization()
	balance := decimal.MustFromFloat64(1200)
	rate := decimal.MustFromFloat64(6.0)
	minPay := decimal.MustFromFloat64(0)

	schedule, err := BuildSchedule(strategy, Params{
		CurrentBalance:  balance,
		InterestRateAPR: rate,
		MinimumPayment:  minPay,
	}, 12)

	require.NoError(t, err)
	require.Len(t, schedule, 12)

	// Balance should decrease and end near zero
	require.True(t, schedule[0].Cmp(schedule[len(schedule)-1]) >= 0)
	require.True(t, schedule[len(schedule)-1].Cmp(decimal.MustFromFloat64(1)) <= 0)
}
