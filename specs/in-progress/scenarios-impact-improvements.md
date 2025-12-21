# PRD: Scenario Impact System Improvements

> **Last Updated**: December 2024
> **Status**: Phase 1 Complete, Phase 2-3 Ready for Implementation

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Problem Statement](#problem-statement)
3. [Goals & Success Metrics](#goals--success-metrics)
4. [User Stories](#user-stories)
5. [Technical Design](#technical-design)
6. [Tickets](#tickets)
   - [Epic 1: Simplify Frequencies](#epic-1-simplify-frequencies) (DONE)
   - [Epic 2: Start Impact Kind](#epic-2-implement-start-impact-kind)
   - [Epic 3: Enable/Disable & Cascade](#epic-3-enabledisable-granularity--cascade)
7. [Implementation Order](#implementation-order)
8. [Technical Deep Dive](#technical-deep-dive-synthetic-items-from-start-impacts)
9. [Design Decisions](#design-decisions-resolved)
10. [Risks & Mitigations](#risks--mitigations)

---

## Quick Reference

### Impact Kinds
| Kind | UI Verb | Effect |
|------|---------|--------|
| `delta` | increases_by / decreases_by | Adds/subtracts from existing item |
| `override` | becomes | Replaces existing item's value |
| `stop` | ends | Sets existing item to $0 |
| `start` | starts_at | **Creates new synthetic item** |

### Key Files
| Area | Files |
|------|-------|
| Backend Types | `backend/internal/financial_v2/scenario/types.go` |
| Timeline Service | `backend/internal/financial_v2/timeline/service.go` |
| Impact Processing | `backend/internal/financial_v2/scenario/impact.go` |
| Frontend Types | `frontend/src/types/scenario.ts` |
| Impact Editor | `frontend/src/components/modals/ScenarioEventModal/components/ImpactEditor.tsx` |

---

## Executive Summary

Improve the scenario impact system by simplifying frequency options and implementing the `start` impact kind to create synthetic financial items. This will make the system more intuitive for users while enabling powerful "what-if" scenarios.

---

## Problem Statement

### Current Issues

1. **Overly Complex Frequency Options**: The system offers 7 frequency options (`one_time`, `weekly`, `bi_weekly`, `monthly`, `quarterly`, `semi_annual`, `annual`) when most users only need 2-3.

2. **Semantic Mismatch**: All frequency options are shown for all impact types, but this doesn't make sense:
   - "My salary **becomes** $150k **weekly**" - nonsensical
   - "My job **ends** **monthly**" - nonsensical
   - Only delta impacts (increases_by/decreases_by) should have recurring frequencies

3. **Missing Capability**: The `start` impact kind is defined but not implemented. Users cannot model "What if I start a rental property?" scenarios.

### User Impact

- Confusing UX with too many irrelevant options
- Cannot model new income/expense streams in scenarios
- Increased cognitive load when creating scenario events

---

## Goals & Success Metrics

### Goals
1. Simplify the frequency model to only monthly/annual for delta impacts
2. Make override, stop, and start impacts implicitly one-time
3. Implement `start` impact kind to create synthetic financial items
4. Maintain backward compatibility for existing data

### Success Metrics
- Reduced user confusion (fewer support questions about frequencies)
- Increased scenario feature adoption
- Zero regression in existing scenario functionality

---

## User Stories

### Epic 1: Simplify Frequencies

**US-1.1**: As a user, I want to see only relevant frequency options (monthly/annual) when creating recurring impacts, so I don't get confused by irrelevant options.

**US-1.2**: As a user, I want override and stop impacts to be implicitly one-time, so I don't have to think about frequency for point-in-time events.

### Epic 2: Start Impact Kind

**US-2.1**: As a user, I want to create a scenario where I start a new income source (e.g., rental property), so I can see how it affects my financial timeline.

**US-2.2**: As a user, I want to create a scenario where I start a new expense (e.g., childcare), so I can plan for future expenses.

**US-2.3**: As a user, I want synthetic items created by `start` impacts to grow at a specified rate, so projections are realistic.

---

## Technical Design

### Current State

**Frequencies** (backend `common/frequency.go`, frontend `types/scenario.ts`):
```
one_time, weekly, bi_weekly, monthly, quarterly, semi_annual, annual
```

**Impact Kinds**:
```
delta      → increases_by / decreases_by
override   → becomes
start      → starts_at (NOT IMPLEMENTED)
stop       → ends
```

### Proposed State

**Frequencies** (for delta impacts only):
```
monthly, annual
```

**Frequency Rules by Item Type**:

| Item Type | Impact Kind | UI Verb | Cadence Shown? | Cadence Options | Rationale |
|-----------|-------------|---------|----------------|-----------------|-----------|
| **Income** | delta | increases_by / decreases_by | Yes | monthly, annual | Recurring income adjustment |
| **Income** | override | becomes | Yes | monthly, annual | "Salary becomes $150k/year" |
| **Income** | start | starts_at | Yes | monthly, annual | "New income starts at $2k/month" |
| **Income** | stop | ends | No | - | Income just stops |
| **Expense** | delta | increases_by / decreases_by | Yes | monthly, annual | Recurring expense adjustment |
| **Expense** | override | becomes | Yes | monthly, annual | "Rent becomes $2k/month" |
| **Expense** | start | starts_at | Yes | monthly, annual | "New childcare starts at $1.5k/month" |
| **Expense** | stop | ends | No | - | Expense just stops |
| **Asset** | delta | increases_by / decreases_by | Yes | monthly, annual | Recurring contributions |
| **Asset** | override | becomes | No | - | Point-in-time value change |
| **Asset** | start | starts_at | No | - | Point-in-time creation |
| **Asset** | stop | ends | No | - | Asset stops existing |
| **Liability** | delta | increases_by / decreases_by | Yes | monthly, annual | Recurring payments |
| **Liability** | override | becomes | No | - | Point-in-time balance change |
| **Liability** | start | starts_at | No | - | Point-in-time creation |
| **Liability** | stop | ends | No | - | Liability paid off |
| **Cash** | delta | increases_by / decreases_by | Yes | monthly, annual | Recurring deposits/withdrawals |
| **Cash** | override | becomes | No | - | Point-in-time balance change |
| **Cash** | start | starts_at | No | - | Point-in-time creation |
| **Cash** | stop | ends | No | - | Account closes |
| **Investment** | delta | increases_by / decreases_by | Yes | monthly, annual | Recurring contributions |
| **Investment** | override | becomes | No | - | Point-in-time value change |
| **Investment** | start | starts_at | No | - | Point-in-time creation |
| **Investment** | stop | ends | No | - | Investment liquidated |

**Summary Logic:**
```
showCadence = (
  (itemType == 'income' || itemType == 'expense') && verb != 'ends'
) || (
  (itemType in ['asset', 'liability', 'cash', 'investment']) && verb in ['increases_by', 'decreases_by']
)
```

### Data Migration

Existing impacts with `weekly`, `bi_weekly`, `quarterly`, `semi_annual` frequencies will be converted:
- `weekly` → `monthly` (amount × 4.33)
- `bi_weekly` → `monthly` (amount × 2.17)
- `quarterly` → `monthly` (amount ÷ 3)
- `semi_annual` → `monthly` (amount ÷ 6)

---

## Tickets

### Epic 1: Simplify Frequencies

#### TICKET-1: Backend - Remove Unused Frequencies
**Priority**: High | **Estimate**: 2 points | **Status**: DONE

**Description**: Remove weekly, bi_weekly, quarterly, semi_annual from the codebase.

**Acceptance Criteria**:
- [x] Remove frequency constants from `common/frequency.go`
- [x] Update `AllFrequencies` and `RecurringFrequencies` slices
- [x] Simplify `ToMonthlyAmount()` switch cases
- [x] Update `NormalizeToMonthly()` in `scenario/impact.go`
- [x] Update `NormalizeFromMonthly()` in `scenario/impact.go`
- [x] All existing tests pass

**Files to Modify**:
- `backend/internal/common/frequency.go`
- `backend/internal/financial_v2/scenario/impact.go`

---

#### TICKET-2: Backend - Update Validation for Delta-Only Cadence
**Priority**: High | **Estimate**: 1 point | **Status**: DONE

**Description**: Only delta impacts should have a cadence field. Override, stop, and start should be implicitly one-time.

**Acceptance Criteria**:
- [x] Update `ValidCadences` to only include monthly, annual
- [x] Add validation: only delta impacts can have non-empty cadence
- [x] Non-delta impacts default to monthly (for storage) but treated as one-time in processing
- [x] Validation errors return clear messages

**Files to Modify**:
- `backend/internal/financial_v2/scenario/validation.go`

---

#### TICKET-3: Backend - Data Migration Script
**Priority**: High | **Estimate**: 2 points | **Status**: DONE

**Description**: Create migration to convert existing impacts with deprecated frequencies.

**Acceptance Criteria**:
- [x] Migration script converts frequencies and adjusts amounts
- [x] Conversion formulas: weekly→monthly (×4.33), bi_weekly→monthly (×2.17), quarterly→monthly (÷3), semi_annual→monthly (÷6)
- [x] Migration is idempotent (can run multiple times safely)
- [x] Rollback script included
- [x] Logging of all converted records

**Files to Create**:
- `backend/migrations/NNNN_simplify_frequencies.sql`

---

#### TICKET-4: Frontend - Update ScenarioCadence Type
**Priority**: High | **Estimate**: 1 point | **Status**: DONE

**Description**: Update TypeScript types to reflect simplified frequencies.

**Acceptance Criteria**:
- [x] Update `ScenarioCadence` type to `'monthly' | 'annual'`
- [x] Update any type guards or validation
- [x] TypeScript compiles without errors

**Files to Modify**:
- `frontend/src/types/scenario.ts`

---

#### TICKET-5: Frontend - Conditional Cadence Selector
**Priority**: High | **Estimate**: 2 points | **Status**: DONE

**Description**: Only show cadence selector for delta impacts.

**Acceptance Criteria**:
- [x] Cadence dropdown only appears when verb is `increases_by` or `decreases_by`
- [x] Cadence dropdown only shows monthly/annual options
- [x] When verb changes from delta to non-delta, cadence resets to default
- [x] Form validation passes for all impact kinds

**Files to Modify**:
- `frontend/src/components/modals/ScenarioEventModal/components/ImpactEditor.tsx`

---

### Epic 2: Implement Start Impact Kind

#### TICKET-6: Database - Add Synthetic Item Fields to Impact
**Priority**: Medium | **Estimate**: 2 points

**Description**: Add fields to store synthetic financial item details for `start` impacts.

**Acceptance Criteria**:
- [ ] Add columns to `scenario_event_impacts` table:
  - `synthetic_item_id` (UUID) - stable ID for the synthetic item (generated on create)
  - `synthetic_name` (VARCHAR) - name of the new item
  - `synthetic_category` (VARCHAR) - category (e.g., "Rental Income")
  - `synthetic_item_type` (VARCHAR) - income/expense/asset/liability/cash/investment
  - `synthetic_growth_rate` (DECIMAL) - annual growth rate (default 0)
  - `synthetic_frequency` (VARCHAR) - for P&L items: monthly/annual
- [ ] Migration script included
- [ ] Rollback script included
- [ ] `synthetic_item_id` is auto-generated (DEFAULT gen_random_uuid()) for new `start` impacts

**Files to Create**:
- `backend/migrations/NNNN_add_synthetic_item_fields.sql`

**Files to Modify**:
- `backend/internal/financial_v2/scenario/types.go`

---

#### TICKET-7: Backend - Impact Repository Support for Synthetic Fields
**Priority**: Medium | **Estimate**: 2 points

**Description**: Update repository to read/write synthetic item fields.

**Acceptance Criteria**:
- [ ] `Impact` struct includes synthetic fields
- [ ] Repository scans synthetic columns
- [ ] Repository inserts/updates synthetic columns
- [ ] Null handling for non-start impacts

**Files to Modify**:
- `backend/internal/financial_v2/scenario/types.go`
- `backend/internal/financial_v2/scenario/repository.go`

---

#### TICKET-8: Backend - Timeline Service Start Impact Processing
**Priority**: Medium | **Estimate**: 3 points

**Description**: Process `start` impacts to inject synthetic financial items into the timeline.

**Acceptance Criteria**:
- [ ] During `initializeItemStates()`, iterate through `start` impacts from included events
- [ ] Create synthetic `FinancialDataRow` for each `start` impact using:
  - `ID` = `impact.SyntheticItemID` (the stable UUID)
  - `Name` = `impact.SyntheticName`
  - `Category` = `impact.SyntheticCategory`
  - `Amount` = `impact.Amount`
  - `Frequency` = `impact.SyntheticFrequency`
  - `StartDate` = `impact.StartDate`
  - `EndDate` = `impact.EndDate`
  - `ItemType` = `impact.SyntheticItemType`
  - `GrowthRate` = `impact.SyntheticGrowthRate`
- [ ] Add `IsSynthetic` and `SourceEventID` fields to response types
- [ ] Synthetic items participate in normal growth calculations
- [ ] Synthetic items can be targeted by other impacts (delta/override/stop)
- [ ] If parent event is excluded, synthetic item is not included
- [ ] Response includes `isSynthetic: true` and `sourceEvent` info

**Files to Modify**:
- `backend/internal/financial_v2/timeline/service.go` - Inject synthetic items in `initializeItemStates()`
- `backend/internal/financial_v2/timeline/types.go` - Add `IsSynthetic`, `SourceEventID` to response types

---

#### TICKET-9: Frontend - Start Impact Form Fields
**Priority**: Medium | **Estimate**: 3 points

**Description**: Add form fields for creating synthetic items via `start` impacts.

**Acceptance Criteria**:
- [ ] When verb is `starts_at`, show additional fields:
  - Item name (required)
  - Item type dropdown (income/expense/asset/liability)
  - Category (optional)
  - Amount (required)
  - Frequency (for income/expense: monthly/annual)
  - Growth rate (optional, defaults to 0%)
- [ ] Form validation for required fields
- [ ] Clear UX distinction between targeting existing item vs creating new

**Files to Modify**:
- `frontend/src/components/modals/ScenarioEventModal/components/ImpactEditor.tsx`
- `frontend/src/types/scenario.ts`

---

#### TICKET-10: Frontend - Display Synthetic Items in Timeline & Lists
**Priority**: Medium | **Estimate**: 3 points

**Description**: Display synthetic items in both timeline charts and financial data lists.

**Acceptance Criteria**:
- [ ] Synthetic items appear in timeline charts with distinct styling (dashed line/border)
- [ ] Synthetic items appear in financial data lists (Assets, Income, etc.) with "Scenario" badge
- [ ] Tooltip/hover shows "Created by scenario: {event name}"
- [ ] Clicking synthetic item in list opens parent scenario event modal
- [ ] Synthetic items can be filtered/hidden via toggle

**Files to Modify**:
- `frontend/src/components/timeline/` (relevant components)
- `frontend/src/components/financial/` (list components for each item type)

---

#### TICKET-11: Frontend - Target Selector Includes Synthetic Items
**Priority**: Medium | **Estimate**: 2 points

**Description**: When creating delta/override/stop impacts, allow targeting synthetic items.

**Acceptance Criteria**:
- [ ] Target dropdown includes synthetic items (from `start` impacts)
- [ ] Synthetic items displayed with "(Scenario)" suffix or icon
- [ ] Only synthetic items from included events are shown
- [ ] Works for all target types (income, expense, asset, liability, cash, investment)

**Files to Modify**:
- `frontend/src/components/modals/ScenarioEventModal/components/ImpactEditor.tsx`
- `frontend/src/api/financial/` (may need endpoint to list synthetic items)

---

### Epic 3: Enable/Disable Granularity & Cascade

#### TICKET-12: Database - Add Impact-Level Enable/Disable
**Priority**: Medium | **Estimate**: 1 point

**Description**: Add `is_included` and cascade tracking columns to impacts table.

**Acceptance Criteria**:
- [ ] Add `is_included` BOOLEAN DEFAULT true to `scenario_event_impacts`
- [ ] Add `disabled_by_cascade` UUID NULL (references the event that caused cascade disable)
- [ ] Migration script included
- [ ] Rollback script included

**Files to Create**:
- `backend/migrations/NNNN_add_impact_is_included.sql`

---

#### TICKET-13: Backend - Cascade Disable Logic
**Priority**: Medium | **Estimate**: 3 points

**Description**: When an event with `start` impacts is disabled, cascade-disable dependent impacts.

**Acceptance Criteria**:
- [ ] When event is disabled, find all impacts targeting its synthetic items
- [ ] Set `is_included=false` and `disabled_by_cascade=event_id` on those impacts
- [ ] When event is re-enabled, re-enable impacts where `disabled_by_cascade=event_id`
- [ ] Timeline computation respects `impact.is_included`
- [ ] API returns cascade info in response

**Files to Modify**:
- `backend/cmd/server/handlers/scenario_events_v2.go`
- `backend/internal/financial_v2/repository/scenario_events.go`
- `backend/internal/financial_v2/timeline/service.go`

---

#### TICKET-14: Frontend - Impact-Level Toggle UI
**Priority**: Medium | **Estimate**: 2 points

**Description**: Add toggle to enable/disable individual impacts.

**Acceptance Criteria**:
- [ ] Each impact row has enable/disable toggle
- [ ] Disabled impacts shown with reduced opacity
- [ ] Event-level toggle sets all impacts
- [ ] Cascade-disabled impacts show indicator ("Disabled because X is disabled")
- [ ] Cannot re-enable cascade-disabled impact while parent is disabled

**Files to Modify**:
- `frontend/src/components/modals/ScenarioEventModal/components/ImpactEditor.tsx`
- `frontend/src/types/scenario.ts`

---

## Implementation Order

```
PHASE 1: Simplify Frequencies (DONE)
├── TICKET-1: Backend - Remove Unused Frequencies
├── TICKET-2: Backend - Update Validation
├── TICKET-3: Backend - Data Migration
├── TICKET-4: Frontend - Update Types
└── TICKET-5: Frontend - Conditional Cadence Selector

PHASE 2: Start Impact Kind
├── TICKET-6: Database - Add Synthetic Fields
├── TICKET-7: Backend - Repository Support
├── TICKET-8: Backend - Timeline Processing
├── TICKET-9: Frontend - Start Impact Form
├── TICKET-10: Frontend - Display Synthetic Items
└── TICKET-11: Frontend - Target Selector Includes Synthetic Items

PHASE 3: Enable/Disable Granularity & Cascade
├── TICKET-12: Database - Add Impact-Level Enable/Disable
├── TICKET-13: Backend - Cascade Disable Logic
└── TICKET-14: Frontend - Impact-Level Toggle UI
```

**Status**: Phase 1 is complete and committed. Phase 2 and 3 are ready for implementation.

**Recommendation**: Phase 2 should be completed before Phase 3, as cascade disable depends on synthetic items existing.

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Data migration breaks existing impacts | High | Thorough testing, rollback script, staged rollout |
| Users confused by UI changes | Medium | Clear documentation, tooltips explaining changes |
| Start impact creates duplicate items | Medium | Validation to prevent duplicate names within same scenario |

---

## Test Specifications

### Phase 2: Start Impact Kind Tests

#### TICKET-6 & 7: Repository Tests
**File**: `backend/internal/financial_v2/scenario/repository_test.go`

| Test Name | Description |
|-----------|-------------|
| `TestCreateImpact_StartKind_GeneratesSyntheticID` | Creating a `start` impact auto-generates `synthetic_item_id` |
| `TestCreateImpact_NonStartKind_NullSyntheticFields` | Non-start impacts have NULL synthetic fields |
| `TestGetImpact_SyntheticFieldsPopulated` | Retrieved impact includes all synthetic fields |
| `TestUpdateImpact_StartKind_PreservesSyntheticID` | Updating a start impact keeps the same `synthetic_item_id` |
| `TestListImpacts_IncludesSyntheticFields` | Listing impacts returns synthetic fields |

#### TICKET-8: Timeline Service Tests
**File**: `backend/internal/financial_v2/timeline/service_test.go`

| Test Name | Description |
|-----------|-------------|
| `TestComputeSnapshot_StartImpact_InjectsSyntheticItem` | Start impact creates synthetic item in timeline |
| `TestComputeSnapshot_StartImpact_RespectsDates` | Synthetic item only appears within start/end date range |
| `TestComputeSnapshot_StartImpact_AppliesGrowthRate` | Synthetic item's balance grows at specified rate |
| `TestComputeSnapshot_StartImpact_ExcludedEvent_NoSyntheticItem` | Excluded event = no synthetic item in timeline |
| `TestComputeSnapshot_StartImpact_TargetedByDelta` | Delta impact can modify synthetic item's value |
| `TestComputeSnapshot_StartImpact_TargetedByOverride` | Override impact can replace synthetic item's value |
| `TestComputeSnapshot_StartImpact_TargetedByStop` | Stop impact can zero out synthetic item |
| `TestComputeSnapshot_MultipleStartImpacts_SameEvent` | One event can create multiple synthetic items |
| `TestComputeSnapshot_StartImpact_IncomeType_MonthlyFrequency` | Income synthetic item contributes monthly |
| `TestComputeSnapshot_StartImpact_AssetType_NoFrequency` | Asset synthetic item is point-in-time balance |
| `TestComputeSnapshot_StartImpact_ResponseIncludesIsSynthetic` | Response marks synthetic items with `isSynthetic: true` |
| `TestComputeSnapshot_StartImpact_ResponseIncludesSourceEvent` | Response includes `sourceEvent` info |

#### Edge Cases & Regression Tests
**File**: `backend/internal/financial_v2/timeline/service_test.go`

| Test Name | Description |
|-----------|-------------|
| `TestComputeSnapshot_StartImpact_EndDateBeforeStartDate_Error` | Validation rejects invalid date range |
| `TestComputeSnapshot_StartImpact_ZeroAmount` | Synthetic item with $0 amount works correctly |
| `TestComputeSnapshot_StartImpact_NegativeAmount` | Synthetic expense with negative amount (if allowed) |
| `TestComputeSnapshot_StartImpact_VeryLongTimeline` | Performance test: 30-year timeline with synthetic items |
| `TestComputeSnapshot_StartImpact_SyntheticTargetsSynthetic` | One synthetic item targeted by another event's impact |
| `TestComputeSnapshot_ExistingImpacts_StillWork` | Regression: delta/override/stop impacts unchanged |

#### TICKET-9: Frontend Form Tests
**File**: `frontend/src/components/modals/ScenarioEventModal/components/__tests__/ImpactEditor.test.tsx`

| Test Name | Description |
|-----------|-------------|
| `renders synthetic fields when verb is starts_at` | Shows name, type, category, growth rate fields |
| `hides synthetic fields for delta verb` | Only shows target selector for delta |
| `hides synthetic fields for override verb` | Only shows target selector for override |
| `hides synthetic fields for stop verb` | Only shows target selector for stop |
| `validates required synthetic name field` | Name is required for starts_at |
| `validates required synthetic item type` | Item type is required for starts_at |
| `shows frequency selector for income/expense synthetic` | Cadence shown for P&L synthetic items |
| `hides frequency selector for asset/liability synthetic` | No cadence for balance sheet synthetic items |
| `defaults growth rate to 0` | Growth rate defaults to 0% |
| `submits synthetic fields correctly` | Form data includes all synthetic fields |

#### TICKET-10 & 11: Display & Target Selector Tests
**File**: `frontend/src/components/modals/ScenarioEventModal/components/__tests__/ImpactEditor.test.tsx`

| Test Name | Description |
|-----------|-------------|
| `target selector includes synthetic items` | Dropdown shows synthetic items from start impacts |
| `synthetic items show (Scenario) suffix` | Visual distinction in dropdown |
| `excludes synthetic items from disabled events` | Only shows synthetic items from included events |

### Phase 3: Enable/Disable & Cascade Tests

#### TICKET-12 & 13: Cascade Disable Tests
**File**: `backend/internal/financial_v2/scenario/cascade_test.go`

| Test Name | Description |
|-----------|-------------|
| `TestDisableEvent_CascadesDisableToDependentImpacts` | Disabling event disables impacts targeting its synthetic items |
| `TestDisableEvent_SetsDisabledByCascadeField` | Cascade-disabled impacts record source event ID |
| `TestReenableEvent_ReenablesCascadeDisabledImpacts` | Re-enabling event re-enables cascade-disabled impacts |
| `TestReenableEvent_DoesNotReenableManuallyDisabledImpacts` | Manually disabled impacts stay disabled |
| `TestCascade_MultiLevel` | Event A → synthetic → Event B impact → synthetic → Event C impact |
| `TestCascade_Timeline_ExcludesCascadeDisabledImpacts` | Timeline respects cascade-disabled impacts |

#### TICKET-14: Frontend Toggle Tests
**File**: `frontend/src/components/modals/ScenarioEventModal/components/__tests__/ImpactEditor.test.tsx`

| Test Name | Description |
|-----------|-------------|
| `renders enable/disable toggle per impact` | Each impact row has toggle |
| `disabled impacts have reduced opacity` | Visual styling for disabled |
| `cascade-disabled shows indicator` | Shows "Disabled because X is disabled" |
| `cannot toggle cascade-disabled impact` | Toggle is disabled for cascade-disabled |
| `event toggle sets all impacts` | Event-level toggle affects all |

### Integration Tests

**File**: `backend/cmd/server/handlers/scenario_events_v2_test.go`

| Test Name | Description |
|-----------|-------------|
| `TestCreateScenarioEvent_StartImpact_E2E` | Full flow: create event with start impact, verify timeline |
| `TestUpdateScenarioEvent_AddStartImpact_E2E` | Add start impact to existing event |
| `TestDeleteScenarioEvent_WithStartImpact_E2E` | Delete event, verify synthetic item gone |
| `TestToggleEventIsIncluded_WithStartImpact_E2E` | Toggle event, verify synthetic item appears/disappears |
| `TestCrossEventTargeting_E2E` | Event B delta targets Event A synthetic item |

---

## Design Decisions (Resolved)

1. **Should synthetic items be editable after creation?** YES - Synthetic items should be editable. This may require a FK in the `financial_*` tables to identify them as synthetic.

2. **Can a single event have multiple start impacts?** YES - One event like "Get rental property" could create both income (rent) and expense (maintenance).

3. **What happens when a start impact's event is excluded?** Synthetic item disappears from timeline - consistent with how other impact types work (if event is excluded, its impacts don't apply).

4. **Synthetic item ID generation**: **Generate new UUID** - Fully independent IDs for flexibility and to avoid conflicts.

5. **Can other impacts target synthetic items?** **YES** - A delta/override/stop impact can target a synthetic item. This enables modeling adjustments to hypothetical items (e.g., "Rental income increases by 3% annually").

6. **How should synthetic items appear in the UI?** **Visible with badge** - Synthetic items appear alongside real items in the financial data management UI with a "Scenario" badge. Editing is done via the parent scenario event modal.

7. **Orphan impacts (cross-references to disabled synthetic items)**: **Cascade disable** - When a synthetic item's parent event is disabled, automatically disable events that have impacts targeting that synthetic item.

8. **Enable/disable granularity**: **Impact-level** - Each impact can be individually enabled/disabled, not just entire events. More control for users.

---

## Technical Deep Dive: Synthetic Items from `start` Impacts

### Where Data Lives

**All scenario impacts are stored ONLY in `scenario_event_impacts` table** - they never touch the actual financial tables (`finance_incomes`, `finance_expenses`, etc.).

| Impact Kind | Storage | Effect on Timeline |
|------------|---------|-------------------|
| `delta` | `scenario_event_impacts` only | Modifies existing item's value at query time |
| `override` | `scenario_event_impacts` only | Replaces existing item's value at query time |
| `stop` | `scenario_event_impacts` only | Zeros out existing item at query time |
| `start` | `scenario_event_impacts` only | **Creates synthetic item at query time** |

### How Timeline Computation Works

```
ComputeFinancialSnapshot()
  │
  ├─ loadEffectiveRows() [parallel loading]
  │   ├─ ListNonCashAssets()
  │   ├─ ListInvestments()
  │   ├─ ListCashAssets()
  │   ├─ ListLiabilities()
  │   ├─ ListIncomes()
  │   ├─ ListExpenses()
  │   ├─ GetCPFAccount()
  │   ├─ ListAllIncomeAllocations()
  │   ├─ GetExcludedScenarioTargetIDs()  ← Filters items from excluded scenarios
  │   └─ ListIncludedScenarioEvents()    ← Only loads events where is_included=true
  │
  ├─ BuildImpactContext()  ← Indexes impacts by target ID for O(1) lookup
  │
  ├─ initializeItemStates()  ← Creates ItemState for each financial item
  │   └─ [INJECTION POINT] ← Add synthetic items here
  │
  └─ processMonth() [for each month in range]
      ├─ Apply growth rates
      ├─ Process liability amortization
      ├─ applyScenarioImpacts()  ← Applies delta/override/stop
      │   ├─ PASS 1: Stop impacts (returns $0)
      │   ├─ PASS 2: Override impacts (latest wins)
      │   └─ PASS 3: Delta impacts (cumulative)
      ├─ Calculate CPF contributions
      └─ Build response with event-adjusted values
```

### Synthetic Item Injection Design

**Recommended Injection Point**: During `initializeItemStates()` after building ItemStateMap from real data.

```go
// Pseudocode for synthetic item injection
func initializeItemStates(data EffectiveRows, impactCtx *scenario.ImpactContext) ItemStateMap {
    states := make(ItemStateMap)

    // 1. Add real items from database
    for _, row := range data.Rows {
        states[row.ID] = &ItemState{Row: row, Balance: row.Amount}
    }

    // 2. Add synthetic items from "start" impacts
    if impactCtx != nil {
        for _, event := range impactCtx.EventsByID {
            for _, impact := range event.Impacts {
                if impact.ImpactKind == "start" {
                    syntheticRow := createSyntheticRow(impact, event)
                    states[syntheticRow.ID] = &ItemState{
                        Row:     syntheticRow,
                        Balance: decimal.NewFromInt64(impact.Amount, 0),
                    }
                }
            }
        }
    }

    return states
}
```

### What Synthetic Items Need

To create a synthetic `FinancialDataRow`, we need:

| Field | Source | Notes |
|-------|--------|-------|
| `ID` | Generate UUID or use `impact.ID` | Must be unique |
| `Name` | From `synthetic_name` field (new) | User-provided name |
| `Category` | From `synthetic_category` field (new) | Optional |
| `Amount` | `impact.Amount` | Initial value |
| `Frequency` | From `synthetic_frequency` field (new) | For income/expense: monthly/annual |
| `StartDate` | `impact.StartDate` | When item starts existing |
| `EndDate` | `impact.EndDate` | When item stops (optional) |
| `ItemType` | From `impact.TargetType()` | income/expense/asset/liability/cash/investment |
| `GrowthRate` | From `synthetic_growth_rate` field (new) | Default 0% |
| `IsSynthetic` | `true` (new flag) | For UI to identify scenario-created items |
| `SourceEventID` | `impact.EventID` | Link back to creating event |

### Impact Persistence & Growth Behavior

Synthetic items participate in normal timeline computation:

```
Month 1 (start month):
  - Synthetic item appears with initial Amount
  - Growth rate applied (if any)
  - Other impacts (delta/override) can modify it

Month 2+:
  - Balance carries forward
  - Growth continues to apply
  - Item behaves like any real item

When event is excluded:
  - Synthetic item disappears from timeline
  - No entry in ItemStateMap
  - Timeline recalculates without it
```

### isIncluded Flag Behavior

The system already handles this correctly:

1. **`ListIncludedScenarioEvents()`** only returns events where `is_included=true`
2. **`GetExcludedScenarioTargetIDs()`** returns target IDs of items created by `start` impacts from excluded events
3. These excluded IDs are filtered out before timeline computation

**For synthetic items**: Since they're created from `start` impacts in included events only, they automatically respect the `isIncluded` flag.

### Response Format for UI

```json
{
  "incomes": [
    {
      "id": "real-income-123",
      "name": "Salary",
      "balance": 120000,
      "isSynthetic": false
    },
    {
      "id": "synthetic-income-456",
      "name": "Rental Income",
      "balance": 24000,
      "isSynthetic": true,
      "sourceEvent": {
        "id": "event-789",
        "name": "Buy Rental Property"
      }
    }
  ]
}
```

### Cross-Impact Targeting

- When user creates a `start` impact, a UUID is generated and stored as `synthetic_item_id` on the impact
- This UUID becomes the synthetic item's ID in the timeline
- Other impacts can reference this `synthetic_item_id` in their `target_*_id` fields
- UI: When selecting targets for delta/override/stop, synthetic items appear in the dropdown with a "(Scenario)" suffix

### Cascade Disable Logic

When user disables an event that creates a synthetic item:

```
User disables Event A (creates "Rental Income")
  ↓
Backend finds all impacts that target "Rental Income"
  ↓
For each impact found:
  - If impact.is_included = true, set to false (cascade)
  - Store reference: disabled_by_cascade = Event A's ID
  ↓
When Event A is re-enabled:
  - Find impacts where disabled_by_cascade = Event A's ID
  - Re-enable them (set is_included = true)
```

### Impact-Level Enable/Disable

- Add `is_included` boolean to `scenario_event_impacts` table
- Default to `true`
- UI shows toggle per impact
- Timeline respects per-impact enable/disable
- Event-level toggle sets all impacts in event
