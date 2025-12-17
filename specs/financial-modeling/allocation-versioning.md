# Plan: Timeline-Aware Allocation Versioning

## Problem
When deleting an allocation at a future point in time, it currently deletes the original allocation record. Expected behavior: "deleting" at a future month should **stop** the allocation from that point forward while preserving the original. Users should also be able to **restart** a stopped allocation later (supporting gaps).

## Schema Design
Use `start_date` and `end_date` (TIMESTAMPTZ) matching v2 patterns:
- `parent_id` groups multiple versions of the same logical allocation
- `start_date` / `end_date` define when each version is active
- UNIQUE constraint on `(parent_id, start_date)` allows multiple versions

**End Date Logic:**
When deleting at a future month, set `end_date` to the **last day of the previous month**.

Example: Allocation starts Jan 2025, user deletes at April 2031
→ `end_date = 2031-03-31` (last day of March 2031)
→ Allocation is active through March 2031, inactive from April 2031 onward

## Schema Changes
```sql
ALTER TABLE income_allocations
  ADD COLUMN parent_id UUID,
  ADD COLUMN start_date TIMESTAMPTZ NOT NULL DEFAULT '2025-01-01',
  ADD COLUMN end_date TIMESTAMPTZ NULL;

-- Backfill parent_id for existing rows
UPDATE income_allocations SET parent_id = id WHERE parent_id IS NULL;
ALTER TABLE income_allocations ALTER COLUMN parent_id SET NOT NULL;

-- Allow multiple versions of same logical allocation
CREATE UNIQUE INDEX income_allocations_parent_start_date_idx
  ON income_allocations(parent_id, start_date);
```

## Operations
| Action | Frontend Context | Backend Behavior |
|--------|-----------------|------------------|
| Delete at BASE (month 0) | selectedYear=0, selectedMonth=0 | DELETE row entirely |
| Delete at future month | selectedYear>0 or selectedMonth>0 | SET end_date to last day of previous month |
| Edit at future month | selectedYear>0 or selectedMonth>0 | CREATE new row with same parent_id, new start_date |
| Restart stopped allocation | After end_date | CREATE new row with same parent_id, new start_date |

## Files to Modify

### Backend

**1. Migration: `backend/migrations/20251215004_add_allocation_versioning.up.sql`**
```sql
ALTER TABLE income_allocations
  ADD COLUMN parent_id UUID,
  ADD COLUMN start_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN end_date TIMESTAMPTZ NULL;

UPDATE income_allocations SET parent_id = id WHERE parent_id IS NULL;
ALTER TABLE income_allocations ALTER COLUMN parent_id SET NOT NULL;

CREATE UNIQUE INDEX income_allocations_parent_start_date_idx
  ON income_allocations(parent_id, start_date);
```

**2. `backend/internal/financial_v2/repository/income_allocations.go`**
```go
type IncomeAllocation struct {
    ID                  string
    IncomeID            string
    ParentID            string      // NEW: groups versions
    StartDate           time.Time   // NEW: when this version starts
    EndDate             *time.Time  // NEW: when this version ends (nullable)
    TargetCashAccountID *string
    TargetInvestmentID  *string
    AllocationType      string
    AllocationValue     decimal.Decimal
    CreatedAt           time.Time
}
```
- Add `SetEndDate(ctx, allocationID, endDate)` method
- Add `CreateVersion(ctx, parentID, startDate, ...)` method

**3. `backend/cmd/server/handlers/income_allocations_v2.go`**
- Add endpoint: `POST /incomes/{incomeId}/allocations/{allocId}/stop`
  - Accepts `{ "end_date": "2031-03-31T23:59:59Z" }`
  - Calls `repo.SetEndDate()`

**4. `backend/internal/financial_v2/timeline/service.go`**
- In allocation processing:
```go
// Filter allocations by date
for id, alloc := range allocations {
    // Skip if not yet started
    if currentDate.Before(alloc.StartDate) {
        continue
    }
    // Skip if already ended
    if alloc.EndDate != nil && currentDate.After(*alloc.EndDate) {
        continue
    }
    // Allocation is active for this month
    activeAllocations[alloc.ParentID] = alloc
}
```

### Frontend

**5. `frontend/src/api/financial/incomes.ts`**
```typescript
export async function stopIncomeAllocation(
  incomeId: string,
  allocationId: string,
  endDate: string  // ISO date string
): Promise<void>
```

**6. `frontend/src/hooks/queries/useIncomeAllocationsQuery.ts`**
- Add `useStopIncomeAllocationMutation()` hook

**7. `frontend/src/components/dashboard/FinancialDataManagement/index.tsx`**
```typescript
const handleDeleteAllocation = async (allocation: IncomeAllocation) => {
  if (selectedYear > 0 || selectedMonth > 0) {
    // Calculate end_date as last day of previous month
    const targetDate = new Date(anchorYear + selectedYear, selectedMonth, 1)
    targetDate.setDate(0) // Goes to last day of previous month
    const endDate = targetDate.toISOString()

    await stopAllocationMutation.mutateAsync({
      incomeId: allocation.incomeId,
      allocationId: allocation.id,
      endDate,
    })
  } else {
    // Base - actually delete
    await deleteAllocationMutation.mutateAsync({...})
  }
}
```

## API Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/v2/incomes/{incomeId}/allocations/{allocId}/stop` | Set end_date |
| POST | `/api/v2/incomes/{incomeId}/allocations` | Create (with optional parentId for restart) |

## Example Scenarios

**Scenario 1: Stop allocation at April 2031**
- Allocation starts Jan 2025, no end
- User clicks delete at April 2031
- Backend sets `end_date = 2031-03-31T23:59:59Z`
- Timeline: Active through March 2031, inactive from April 2031

**Scenario 2: Restart stopped allocation at July 2032**
- Allocation ended March 2031
- User creates new allocation at July 2032 with same target
- Backend creates new row: `parent_id=SAME, start_date=2032-07-01`
- Timeline: Active Jan 2025 - Mar 2031, gap Apr 2031 - Jun 2032, active Jul 2032+

## Key Details
- `end_date` is **last day of the last active month** (not first day of inactive month)
- `start_date` is **first day of the first active month**
- Timeline filters: `startDate <= currentDate && (endDate == null || currentDate <= endDate)`
- UNIQUE on `(parent_id, start_date)` allows multiple versions
