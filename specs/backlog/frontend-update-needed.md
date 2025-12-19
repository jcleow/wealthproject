# Frontend Update Required

## File: `frontend/src/hooks/queries/useLoadSampleDataMutation.ts`

### Change Required (line 20-28)

**Current code:**
```typescript
mutationFn: async () => {
  // First clear all data
  await Promise.all([
    financialApi.deleteAllAssets(),
    financialApi.deleteAllLiabilities(),
    financialApi.deleteAllIncomes(),
    financialApi.deleteAllExpenses(),
    financialApi.deleteAllCashAccounts(),  // ❌ REMOVE THIS LINE
    financialApi.deleteAllScenarioEvents(),
  ])
```

**Updated code:**
```typescript
mutationFn: async () => {
  // First clear all data
  await Promise.all([
    financialApi.deleteAllAssets(),
    financialApi.deleteAllLiabilities(),
    financialApi.deleteAllIncomes(),
    financialApi.deleteAllExpenses(),
    // Don't delete cash accounts - reset accumulator to 0 instead
    financialApi.resetCashAccumulator(),  // ✅ ADD THIS NEW FUNCTION
    financialApi.deleteAllScenarioEvents(),
  ])
```

### New Function to Add to financialApi

Add this function to `frontend/src/services/financialApi.ts`:

```typescript
/**
 * Reset the cash accumulator account balance to 0
 */
async resetCashAccumulator(): Promise<void> {
  const accounts = await this.listCashAccounts()
  const accumulator = accounts.find(acc => acc.isAccumulator)

  if (accumulator) {
    await this.updateCashAccount(accumulator.id, {
      ...accumulator,
      balance: 0
    })
  }
}
```

## Explanation

The backend now ensures every user has a cash accumulator account (created automatically on first request). The `loadSampleData` mutation should reset this account to 0 instead of deleting it, because:

1. **Timeline requires accumulator** - Deleting it causes timeline to fail
2. **Auto-creation on first request** - Backend creates it automatically via middleware
3. **Clean reset** - Setting balance to 0 gives same effect as fresh start

This way sample data loads correctly and timeline displays immediately.
