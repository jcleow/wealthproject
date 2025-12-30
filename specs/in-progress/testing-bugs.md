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

## ~~P0: Security - Add user_id filter to ListScenarioImpacts~~ ✅ DONE

Fixed in commit `b8e6feea` on branch `feat/p0-fixes`.

---

## ~~P0: Test - Fix TestProjection_NewItemPersistsForward~~ ✅ DONE

Fixed by implementing Option 1: Set `hasOverride=true` when an item's `StartYear > baseYear` (indicating it was created mid-timeline, not as initial year 0 data).

---

## ~~P1: Refactor - Advanced sections for all impact kinds~~ ✅ DONE

Now shows Advanced section for all impact kinds except 'ends'. Growth options properly shown for income/expense (unless explicitly one-time start impact) and always for assets/investments.

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

---

## P2: UI - Growth strategy field ordering and conditional display

### Description
In the financial item form (income/expense/asset/liability modals), the Growth Strategy dropdown should be on the left and Growth Rate should only be shown when a growth strategy other than "No Growth" is selected.

### Current Behavior
- Growth Rate (%) is on the left, Growth Strategy is on the right
- Growth Rate is always visible regardless of the selected strategy

### Expected Behavior
- Growth Strategy dropdown should be on the left
- Growth Rate input should only appear when a growth strategy other than "No Growth" is selected (conditional display)

### Screenshot Reference
Form shows: GROWTH RATE (%) [0.0] | GROWTH STRATEGY [Select...]

### Files to Investigate
- `frontend/src/components/modals/` - Income/Expense/Asset/Liability modal components
- Look for growth rate/strategy form field ordering

---

## P2: Feature - Add scenario icons to financial items created via scenarios

### Description
Financial data items that were created via scenario events (e.g., "starts" impact kind) should display scenario icons in the financial data management list. Clicking these icons should open the corresponding scenario modal.

### Current Behavior
- Items like "Retirement at 60" and "Salary Promotion" show small icons next to them in the expanded section
- However, items that were entirely created via a scenario (not just modified) may not have visible scenario indicators

### Expected Behavior
- All financial items that originated from a scenario event should show a scenario icon
- Clicking the icon should open the scenario event modal for editing

### Screenshot Reference
Shows "Software Engineer Salary" expanded with:
- Original: $4,400
- Retirement at 60 🏃: $2,000
- Salary Promotion 📈: $2,400

### Files to Investigate
- `frontend/src/components/dashboard/FinancialDataManagement.tsx`
- Look for `getAppliedImpacts` and how scenario indicators are rendered

---

## P2: Bug - Timeline slider shows future scenarios in past dates

### Description
When traversing the timeline slider backwards (moving to earlier dates), scenarios that are scheduled to occur in the future incorrectly appear as if they were applied in the past.

### Current Behavior
- Moving the timeline slider to past dates shows scenario impacts that shouldn't be visible yet
- Future scenarios "leak" into past timeline positions

### Expected Behavior
- Scenarios should only appear in the timeline from their occurrence date forward
- Moving slider to a date before a scenario's occurrence should not show that scenario's impacts

### Screenshot Reference
Shows list with scenario impacts visible even when viewing a past date

### Root Cause Investigation
- Timeline service may not be correctly filtering scenarios by the selected date
- The `GetTimelineWithScenarios` function may be applying all scenarios regardless of the current slider position

### Files to Investigate
- `backend/internal/financial/timeline/service.go` - `GetTimelineWithScenarios()`
- `backend/internal/financial/scenario/service.go` - `Apply()` function date filtering
- `frontend/src/` - Timeline slider state and API calls

---

## P2: Feature - Deactivated scenarios should show grey icon, not disappear

### Description
When a scenario event is deactivated (toggled off), its icon should remain visible in the chart/timeline but appear greyed out. The icon should still be clickable to re-activate or edit.

### Current Behavior
- Deactivating a scenario causes it to completely disappear from the chart

### Expected Behavior
- Deactivated scenarios should show a grey/muted icon in the chart
- The grey icon should still be clickable to open the scenario modal
- This allows users to easily see where scenarios exist even when inactive

### Screenshot Reference
Edit Scenario modal shows "Active" toggle for "Wedding & ROM" event (December 2027)

### Files to Investigate
- `frontend/src/components/` - Chart component rendering scenario markers
- Look for how `isActive` flag is handled in scenario display logic

---

## P2: Feature - Add "Jump to date" button in scenario modal

### Description
The scenario modal should include a button that allows users to quickly jump to the month (or year) when the scenario occurs on the timeline.

### Current Behavior
- The scenario modal shows the "Occurs On" date (e.g., "December 2027")
- No way to quickly navigate the timeline to that date from the modal

### Expected Behavior
- Add a button (e.g., "Go to date" or calendar icon button) next to or near the "Occurs On" field
- Clicking the button should:
  1. Close the modal (or keep it open with overlay)
  2. Navigate the timeline slider to the scenario's occurrence date

### Screenshot Reference
Edit Scenario modal shows "Occurs On: December 2027" - needs a jump/navigate button

### Files to Investigate
- `frontend/src/components/modals/ScenarioEventModal/ScenarioEventModal.tsx`
- Timeline state management for programmatic navigation

---

## P1: Bug - Unable to deactivate a property scenario

### Description
When attempting to deactivate a property scenario (toggle off the "Active" switch), the backend fails with an error. The property scenario cannot be toggled inactive.

### Current Behavior
- Toggling the "Active" switch off for a property scenario results in a backend error
- The scenario remains active despite the user action

### Expected Behavior
- Toggling the "Active" switch should successfully deactivate the property scenario
- The property should no longer appear in timeline projections when inactive
- The UI should reflect the inactive state

### Root Cause Investigation
- Backend logic for updating property scenario `is_included` status may have a bug
- Possible issues:
  1. Missing field in update query
  2. Validation failing on update
  3. Transaction/constraint issue

### Files to Investigate
- `backend/cmd/server/handlers/property_planner_v2.go` - Update handler
- `backend/internal/property/repository.go` - Update query
- `backend/internal/property/service.go` - Business logic

### Priority
P1 - Blocks user from managing property scenarios

---

## P1: Bug - Mortgage payment expenses not showing in /snapshots

### Description
Mortgage payment expenses from property scenarios are not appearing in the `/snapshots` endpoint response. This causes incorrect net worth calculations as the mortgage payments are not being factored in.

### Current Behavior
- Property scenarios are created with mortgage/loan details
- The snapshot endpoint does not include mortgage payment expenses
- Net worth projections are incorrect (overstated) because mortgage payments are missing

### Expected Behavior
- Mortgage payment expenses should appear as expense line items in the snapshot
- Monthly/yearly mortgage payments should reduce the projected cash flow
- Net worth calculations should account for mortgage obligations

### Root Cause Investigation
- The timeline/snapshot service may not be generating expense entries for mortgage payments
- Property planner may only be tracking the property asset without the corresponding liability/expense
- Possible issues:
  1. Mortgage expenses not being created when property scenario is saved
  2. Timeline service not including property-related expenses
  3. Snapshot query missing join to property mortgage data

### Files to Investigate
- `backend/internal/financial/timeline/service.go` - Snapshot generation
- `backend/internal/property/service.go` - Property expense generation
- `backend/cmd/server/handlers/financial_v2.go` - Snapshot endpoint
- `backend/internal/property/models.go` - Mortgage expense model

### Priority
P1 - Causes incorrect financial projections

---

## P2: Feature - Add multi-period interest rates for loans in property modal

### Description
The property planner modal should support multiple interest rate periods for loans, allowing users to model real-world mortgage scenarios where rates change over time (e.g., fixed rate for first 3 years, then floating rate).

### Current Behavior
- Property modal only supports a single interest rate for the entire loan duration

### Expected Behavior
- Allow users to define multiple interest rate periods, e.g.:
  - Period 1: Years 1-3 at 2.5% (fixed)
  - Period 2: Years 4-10 at 3.0% (floating)
  - Period 3: Years 11+ at 3.5% (floating)
- Each period should have:
  - Start year/month
  - End year/month (or "until end of loan")
  - Interest rate (%)
  - Rate type (fixed/floating) - optional label

### Use Cases
- HDB loans with concessionary rates that change
- Bank loans with promotional fixed periods followed by floating rates
- Refinancing scenarios

### Files to Investigate
- `frontend/src/components/modals/PropertyPlannerModal/` - UI for rate periods
- `backend/internal/property/models.go` - Data model for multi-period rates
- `backend/internal/property/service.go` - Calculation logic for varying rates

### Priority
P2 - Enhancement for realistic loan modeling
