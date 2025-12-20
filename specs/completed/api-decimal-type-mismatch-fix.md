# API Decimal Type Mismatch Fix

**Date:** 2024-12-19
**Status:** Completed

## Problem

Runtime errors when creating investments and incomes via the sample data mutation:

```
json: cannot unmarshal number into Go struct field investmentCreateInput.currentValue of type string
json: cannot unmarshal number into Go struct field incomeV2CreateInput.amount of type string
```

## Root Cause

Backend commit `34fe6653` changed decimal fields from `float64` to `string` in v2 handlers to avoid floating-point precision loss:

```go
// Before
CurrentValue float64 `json:"currentValue"`

// After
CurrentValue string `json:"currentValue"`
```

The frontend was only partially updated. Some API files were fixed (`assets.ts`, `liabilities.ts`, `expenses.ts`, `cpf.ts`) but others were missed (`investments.ts`, `incomes.ts`).

## Files Fixed

### `frontend/src/api/financial/investments.ts`

```typescript
// Before
const body = {
  currentValue: payload.currentValue,
  annualGrowthRate: payload.annualGrowthRate,
}

// After
const body = {
  currentValue: String(payload.currentValue),
  annualGrowthRate: String(payload.annualGrowthRate),
}
```

### `frontend/src/api/financial/incomes.ts`

```typescript
// Before
const body = {
  amount: payload.amount,
  growthRate: payload.growthRate ?? 3.0,
}

// After
const body = {
  amount: String(payload.amount),
  growthRate: String(payload.growthRate ?? 3.0),
}
```

## Audit of All API Files

| File | Status |
|------|--------|
| `investments.ts` | **Fixed** |
| `incomes.ts` | **Fixed** |
| `assets.ts` | Already had conversion |
| `liabilities.ts` | Already had conversion |
| `expenses.ts` | Already had conversion |
| `cpf.ts` | Already had conversion |
| `scenarioEvents.ts` | Uses DTO converter |
| `cashAccounts.ts` | Create uses v1 API |
| `property.ts` | Uses v1 API |

## Prevention

To prevent this class of bug in the future, implement OpenAPI TypeScript codegen. See `TODO.md` for implementation details.

This would generate TypeScript types from `swagger.json`, causing type mismatches to fail at compile time instead of runtime.
