package testutil

import (
	"financial-chat-system/backend/internal/decimal"
)

// DecimalEqual checks if two decimals are equal using Cmp.
// Returns true if both are nil, or if both are non-nil and equal.
func DecimalEqual(a, b *decimal.Decimal) bool {
	if a == nil || b == nil {
		return a == b
	}
	return a.Cmp(b) == 0
}

// Ptr returns a pointer to the given value.
// Useful for creating pointers to literals in tests.
func Ptr[T any](v T) *T {
	return &v
}
