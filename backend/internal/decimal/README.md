# APD Decimal Package

This package provides helper utilities for using CockroachDB's `apd` library for financial calculations.

## Quick Start

```go
import "financial-chat-system/backend/internal/decimal"

// Create decimals from various sources
amount := decimal.FromCents(10050)  // $100.50
rate := decimal.FromBasisPoints(300)  // 3% = 0.03

// Basic arithmetic
total, _ := amount.Add(decimal.FromCents(2500))  // $125.50
growth, _ := amount.Mul(decimal.MustFromString("1.03"))  // $103.52

// Compound monthly growth
monthlyRate, _ := decimal.MustFromString("1.03").Pow(decimal.MustFromString("0.083333"))
for month := 0; month < 12; month++ {
    amount, _ = amount.Mul(monthlyRate)
}
```

## Storage Strategy

**Database**: Use PostgreSQL `NUMERIC(15,2)` for money amounts
**Go Models**: Use `int64` for storage (cents), convert to `*decimal.Decimal` for calculations
**JSON API**: Serialize as string (e.g., `"100.50"`)

## Example: Growth Calculation

```go
// Calculate compound monthly growth
func ApplyMonthlyGrowth(cents int64, annualRateBPS int64, months int) int64 {
    amount := decimal.FromCents(cents)
    rate := decimal.FromBasisPoints(annualRateBPS)

    // Monthly multiplier: (1 + rate)^(1/12)
    onePlusRate, _ := decimal.One().Add(rate)
    exponent := decimal.MustFromString("0.083333333333")  // 1/12
    monthlyMult, _ := onePlusRate.Pow(exponent)

    // Apply for N months
    for i := 0; i < months; i++ {
        amount, _ = amount.Mul(monthlyMult)
    }

    return amount.ToCents()
}
```

## Current Status

This is a work in progress. The full implementation and migration to apd is pending.

For now, refer to `apd` documentation: https://pkg.go.dev/github.com/cockroachdb/apd/v3
