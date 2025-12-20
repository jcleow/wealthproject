# Bugs to Fix

## Bug: Scenario impacts not showing on financial line items

### Description
When clicking on a year where a scenario occurs, the financial data items should display a breakdown showing the scenario icon and impact amount (delta) next to the affected line item. Currently, this is not appearing.

### Expected Behavior
- Click on a year in the timeline (e.g., year 7 where "Buy a Car" scenario occurs)
- The affected financial items should show:
  - A small amber dot indicator (`hasScenarios` check)
  - An expandable section showing the scenario icon and delta amount
  - Example: "Income: Software Engineer Salary" should show the retirement scenario's override impact

### Current Behavior
The scenario impacts are not being displayed on the line items, even though:
1. Scenarios exist in the database with valid `target_id` values
2. The dropdown in the scenario modal shows the correct item pre-selected when editing

### Root Cause Investigation

The flow for displaying scenario impacts:

1. **Frontend** (`FinancialDataManagement.tsx`):
   - Calls `getAppliedImpacts(item, key, scenarioEvents)` at line 746
   - This function reads `item.eventImpacts` from the `TimelineItem`
   - If `eventImpacts` is empty, no scenario indicators show

2. **Backend Timeline** (`timeline/service.go`):
   - `GetTimelineWithScenarios()` calls `scenario.Apply()` for each year
   - `mapItems()` converts timeline items to scenario rows using `ItemID` (which is `ParentID` from the DB)
   - `annotateItems()` copies `EventImpacts` back to timeline items by matching on `ItemID`

3. **Backend Scenario Service** (`scenario/service.go`):
   - Builds a key: `key{t: imp.TargetType, id: *imp.TargetID}`
   - Matches against rows: `key{t: row.Type, id: row.ID}`
   - If keys match, adds to `impactRefs` map
   - Returns rows with `EventImpacts` populated

### Likely Issue
The scenario impact's `TargetID` may not match the timeline item's `ItemID`.

- **Timeline uses**: `ItemID = r.ParentID` (the stable/parent ID)
- **Scenario stores**: Whatever `targetId` was sent from frontend
- **Frontend sends**: `parentId ?? id` from `getItemsForType()`

The IDs should theoretically match, but there may be a mismatch due to:
1. Effective-dated records where `id` vs `parentId` differs
2. Type string mismatch (e.g., "income" vs "Income")
3. Scenario not applying to the selected year (date range filtering)

### Files Involved
- `frontend/src/components/dashboard/FinancialDataManagement.tsx` - Lines 113-124 (`getAppliedImpacts`), 746-747 (usage)
- `backend/internal/financial/scenario/service.go` - Lines 90-140 (`Apply` function)
- `backend/internal/financial/timeline/service.go` - Lines 56-105 (`GetTimelineWithScenarios`), 865-892 (`mapItems`, `annotateItems`)
- `frontend/src/components/modals/ScenarioEventModal.tsx` - Lines 120-137 (`getItemsForType` - what ID is sent)

### Debug Steps
1. Add logging to `scenario/service.go` to print:
   - Each event being processed and its impacts
   - Each impact's `TargetType` and `TargetID`
   - Each row's `Type` and `ID`
   - Any matches found

2. Compare the logged `TargetID` values with the logged row `ID` values to see if they match

3. Check the database directly:
   ```sql
   -- Get scenario impact target_ids
   SELECT sei.target_type, sei.target_id, se.name
   FROM scenario_event_impacts sei
   JOIN scenario_events se ON sei.event_id = se.id;

   -- Get financial item parent_ids (what timeline uses)
   SELECT id, parent_id, name FROM incomes;
   SELECT id, parent_id, name FROM expenses;
   -- etc.
   ```

4. Verify the IDs match between scenario impacts and financial items

### Related Code Context

**How `targetId` is selected in the modal** (`ScenarioEventModal.tsx:120-137`):
```typescript
const getItemsForType = useMemo(() => {
  return (targetType: string): FinancialItem[] => {
    switch (targetType) {
      case 'income':
        return incomes.map(inc => ({ id: inc.parentId ?? inc.id, ... }))
      case 'expense':
        return expenses.map(exp => ({ id: exp.parentId ?? exp.id, ... }))
      // ...
    }
  }
}, [assets, liabilities, incomes, expenses])
```

**How timeline builds item ID** (`timeline/service.go:399-401`):
```go
state[r.ParentID] = itemState{
    item: TimelineItem{
        ItemID: r.ParentID,  // Uses ParentID as the stable identifier
        // ...
    },
}
```

**How scenario matches** (`scenario/service.go:97-98`):
```go
k := key{t: imp.TargetType, id: *imp.TargetID}
// Must match:
k := key{t: row.Type, id: row.ID}
```

### Priority
Medium - UI shows scenarios exist (amber dot may appear) but breakdown details don't show

---

## P0: Security - Add user_id filter to ListScenarioImpacts

### Description
The `ListScenarioImpacts` function in `backend/internal/financial/repository/scenario_events.go` queries by `event_id` only without filtering by `user_id`. While this is called internally after fetching an event already filtered by user_id, defense-in-depth requires explicit user ownership checks.

### Files
- `backend/internal/financial/repository/scenario_events.go:351-410` (v1)
- `backend/internal/financial_v2/repository/scenario_events.go:371+` (v2)

### Fix
Add `user_id` parameter and join with `scenario_events` table to verify ownership:
```sql
SELECT imp.* FROM scenario_event_impacts imp
JOIN scenario_events ev ON imp.event_id = ev.id
WHERE imp.event_id = $1 AND ev.user_id = $2
```

---

## P0: Test - Fix TestProjection_NewItemPersistsForward

### Description
Test expects `HasOverrides=true` when creating a new item via `UpsertYear`, but the current logic only sets `HasOverrides` when replacing an existing item or deleting. Currently skipped with `t.Skip()`.

### Root Cause
In `backend/internal/financial/timeline/service.go:700-728`, `hasOverride` is only set to true when:
1. Amount is 0 (deletion)
2. Replacing an existing item version (`if _, exists := state[r.ParentID]; exists`)

Creating a **new** item doesn't set the flag.

### Options
1. **Fix the logic**: Set `hasOverride=true` when an item's `StartYear` matches the current year being processed (indicates it was created in that year, not year 0)
2. **Remove UpsertYear**: If this endpoint is deprecated in favor of direct CRUD, remove it entirely
3. **Update test expectation**: If the current behavior is intentional, update the test

### Files
- `backend/internal/financial/timeline/service.go:700-728`
- `backend/internal/financial/timeline/service_test.go:54-93`

---

## P1: Refactor - Advanced sections for all impact kinds

### Description
Currently, the Advanced section (category, growth rate, growth strategy) only shows for "starts_at" impacts. Should be available for all impact kinds to allow customizing the created/modified financial item.

### Files
- `frontend/src/components/modals/ScenarioEventModal/components/ImpactEditor.tsx:314-322`
- `frontend/src/components/modals/ScenarioEventModal/components/AdvancedSection.tsx`

---

## P1: Refactor - ItemSelector into smaller subcomponents

### Description
The ItemSelector component is getting large and handles multiple concerns. Should be broken into:
- SearchInput component
- ItemList component
- CreateNewItem component

### Files
- `frontend/src/components/modals/ScenarioEventModal/components/ItemSelector.tsx`

---

## P1: Feature - Generalize financial item update function

### Description
The `updateFinancialItemName` function in ScenarioEventModal only updates the name field. Should be generalized to update all fields of the financial item (amount, frequency, category, etc.) when editing via the modal.

### Files
- `frontend/src/components/modals/ScenarioEventModal/ScenarioEventModal.tsx:20-56`
