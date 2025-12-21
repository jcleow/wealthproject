# TanStack Query Migration Status

## Version Status
- **Current**: v4.42.0
- **Latest**: v5.90.11
- **Recommendation**: Stay on v4 for now (stable, v5 has breaking changes)

## ✅ Already Migrated to TanStack Query

### Core Data Hooks
- ✅ `useAssetsQuery` - Assets CRUD operations
- ✅ `useLiabilitiesQuery` - Liabilities CRUD operations
- ✅ `useIncomesQuery` - Income CRUD operations
- ✅ `useExpensesQuery` - Expense CRUD operations
- ✅ `useFinancialData` - Aggregated financial data hook
- ✅ `FinancialDataContext` - Using queries internally

### Modals/Forms (Partially Migrated)
- ✅ `ScenarioEventModal` - Now uses mutations

## ❌ Still Need Migration

### High Priority (Direct API Calls)
1. **PropertyPlannerModal** (`/components/modals/PropertyPlannerModal.tsx`)
   - Uses: `financialApi.createPropertyLink`, `financialApi.createPropertyScenario`
   - Migration: Use `useCreatePropertyScenarioMutation`, `useCreatePropertyLinkMutation`

2. **CpfBalanceModal** (`/components/modals/CpfBalanceModal.tsx`)
   - Uses: Direct asset creation via context
   - Migration: Already using context which uses queries internally

3. **FinancialWorkspace** (`/components/dashboard/FinancialWorkspace.tsx`)
   - Uses: `financialApi.getTimeline`
   - Migration: Create `useTimelineQuery` hook

4. **FinancialDataManagement** (`/components/dashboard/FinancialDataManagement.tsx`)
   - Uses: Context methods (already migrated internally)
   - Status: Working but could benefit from direct query usage

## Migration Benefits Achieved
- ✅ Automatic cache management
- ✅ Request deduplication
- ✅ Optimistic updates
- ✅ Background refetching
- ✅ Smart invalidation cascades

## Next Steps

### Immediate Actions
1. Create `useTimelineQuery` hook for timeline data
2. Migrate PropertyPlannerModal to use mutations
3. Review FinancialWorkspace for timeline queries

### Future Considerations
- Upgrade to TanStack Query v5 when stable (breaking changes)
- Add React Query Devtools (v4 compatible version)
- Implement infinite queries for paginated data
- Add prefetching for predictable navigation

## Quick Test Commands

```bash
# Check current implementation
npm run dev
# Open browser console and test:
# 1. Add/edit an asset - should update immediately
# 2. Navigate between pages - data loads from cache
# 3. Wait 30 seconds - see background refetch
```

## Query Keys Reference

```typescript
// Current query keys in use
['assets']
['liabilities']
['incomes']
['expenses']
['timeline']
['scenario-events']
['scenario-events', id]
['property-scenarios']
['property-links']
['net-worth']
['cashflow']
```