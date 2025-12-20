# Expense Versioning API Specification

## Overview

This document specifies the versioning behavior for expense CRUD operations. The system supports timeline-based versioning where expenses can have multiple versions over time, with each version having a `startDate` and optional `endDate`.

## Core Design: User Choice Model

At **anchor month** (year 0, month 1): No choice - operations apply directly to base expense.

At **future months**: User chooses the scope of the change via UI controls.

| Viewing Month | Operation | User Choice | API Call |
|---------------|-----------|-------------|----------|
| Anchor | Edit | (none) | `PUT` (in-place) |
| Anchor | Delete | (none) | `DELETE` (hard delete) |
| Future | Edit | "Apply to all months" | `PUT` with `updateMode: "in_place"` |
| Future | Edit | "Apply from this month" | `PUT` with `updateMode: "versioned"` + `startDate` |
| Future | Delete | "Delete from all months" | `DELETE` (hard delete) |
| Future | Delete | "Delete from this month" | `POST /stop` with `endDate` |

## Data Model

### Expense Row
```sql
id                  UUID PRIMARY KEY
parent_id           UUID REFERENCES finance_expenses(id)  -- Points to parent version
user_id             UUID NOT NULL
payee               TEXT NOT NULL
amount              DECIMAL NOT NULL
frequency           TEXT NOT NULL
category            TEXT NOT NULL
start_date          TIMESTAMP NOT NULL  -- When this version becomes active
end_date            TIMESTAMP           -- When this version ends (NULL = still active)
growth_rate         DECIMAL
growth_strategy     TEXT
notes               TEXT
source_liability_id UUID                -- For debt repayments, links to liability
created_at          TIMESTAMP
updated_at          TIMESTAMP
```

### Version Chain

Versions form a chain via `parent_id`:
```
Base Expense (start_date: 2025-01-01, end_date: 2025-02-28)
    └── Version 1 (parent_id: base.id, start_date: 2025-03-01, end_date: NULL)
```

## API Endpoints

### 1. DELETE /cashflow/expenses/:id

**Purpose:** Hard delete an expense and all its descendants.

**Behavior:**
- Recursively deletes the specified expense and all rows where `parent_id` points to it (via recursive CTE)
- Irreversible operation
- Used when user chooses "Delete from all months" or when at anchor month

**Response:** `204 No Content`

---

### 2. POST /cashflow/expenses/:id/stop

**Purpose:** Soft delete by setting an end date on an expense.

**Request Body:**
```json
{
  "endDate": "2025-02-28T23:59:59Z"
}
```

**Behavior:**
- Sets `end_date` on the specified expense
- Child versions (rows with `parent_id` pointing to this expense) are NOT affected
- Used when user chooses "Delete from [Month] onwards"

**Response:** `200 OK` with updated expense object

---

### 3. PUT /cashflow/expenses/:id

**Purpose:** Update an expense with optional versioning.

**Request Body:**
```json
{
  "payee": "Utility Company",
  "amount": 500.00,
  "frequency": "monthly",
  "category": "utilities",
  "growthRate": 2.0,
  "notes": "Updated notes",
  "sourceLiabilityId": "uuid",
  "updateMode": "in_place",
  "startDate": "2025-03-01T00:00:00Z"
}
```

| Field | Required | Description |
|-------|----------|-------------|
| `updateMode` | No | `"in_place"` or `"versioned"`. Defaults to `in_place`. |
| `startDate` | Conditional | Required if `updateMode: "versioned"`. The start date for the new version. |

**Behavior:**

#### Case A: In-Place Update
**Condition:** `updateMode == "in_place"` OR `updateMode` not provided

**Action:** Direct update of the existing row with provided values. Changes apply to the expense from its original start_date.

#### Case B: Versioned Update
**Condition:** `updateMode == "versioned"` AND `startDate` is provided

**Action:**
1. Set `end_date` on current expense to last day before `startDate`
2. Check if a version with this `startDate` already exists (upsert logic)
3. If exists: Update that existing version
4. If not exists: Create new row with:
   - `parent_id` = current expense's ID
   - `start_date` = provided `startDate`
   - All other fields from request body
   - Copy `source_liability_id` if present

**Response:** `200 OK` with the updated/created expense object

---

## Frontend UI

### Edit: Checkbox in Edit Modal

At future months, the `FinancialFormModal` displays a checkbox:

```
┌─────────────────────────────────────────┐
│ Edit Expense                            │
├─────────────────────────────────────────┤
│ Payee: [_______________]                │
│ Amount: [_______________]               │
│ Frequency: [_______________]            │
│ Category: [_______________]             │
│ Growth Rate: [_______________]          │
│                                         │
│ ☑ Apply from March 2025 onwards only    │  ← Only shown at future months
│   (unchecked = applies to all months)   │
│                                         │
│              [Cancel] [Save]            │
└─────────────────────────────────────────┘
```

- **Checkbox unchecked** → `updateMode: "in_place"` (changes affect all months)
- **Checkbox checked** → `updateMode: "versioned"` with `startDate` (creates version)

### Delete: Popup Confirmation Modal

At future months, clicking delete shows a confirmation modal:

```
┌─────────────────────────────────────────┐
│ Delete Expense                          │
├─────────────────────────────────────────┤
│ How should this deletion be applied?    │
│                                         │
│ ○ Delete from all months                │
│   (removes the entry entirely)          │
│                                         │
│ ○ Delete from March 2025 onwards        │
│   (entry stops appearing from here)     │
│                                         │
│              [Cancel] [Delete]          │
└─────────────────────────────────────────┘
```

- **"Delete from all months"** → Calls `DELETE /expenses/:id`
- **"Delete from [Month] onwards"** → Calls `POST /expenses/:id/stop`

---

## Frontend Integration

### Month Context Determination

```typescript
const isAnchorMonth = selectedYear === 0 && (selectedMonth === undefined || selectedMonth === 1)
const isFutureMonth = selectedYear > 0 || (selectedMonth !== undefined && selectedMonth > 1)
```

### Date Calculations

```typescript
// First day of currently viewed month (for startDate in versioned updates)
const getFirstDayOfViewedMonth = (selectedYear: number, selectedMonth: number, anchorYear: number): string => {
  const year = anchorYear + selectedYear
  const month = selectedMonth - 1  // JS months are 0-indexed
  return new Date(year, month, 1).toISOString()
}

// Last day of previous month (for endDate in stop operations)
const getLastDayOfPreviousMonth = (selectedYear: number, selectedMonth: number, anchorYear: number): string => {
  const year = anchorYear + selectedYear
  const month = selectedMonth - 1
  // Day 0 of current month = last day of previous month
  return new Date(year, month, 0).toISOString()
}
```

### Edit Flow

```typescript
const handleEditExpense = async (id: string, values: ExpenseFormValues, applyFromThisMonthOnly: boolean) => {
  if (isAnchorMonth || !applyFromThisMonthOnly) {
    // In-place update
    await updateExpense(id, { ...values, updateMode: 'in_place' })
  } else {
    // Versioned update
    await updateExpense(id, {
      ...values,
      updateMode: 'versioned',
      startDate: getFirstDayOfViewedMonth(selectedYear, selectedMonth, anchorYear)
    })
  }
}
```

### Delete Flow

```typescript
const handleDeleteExpense = async (id: string, deleteFromAllMonths: boolean) => {
  if (isAnchorMonth || deleteFromAllMonths) {
    // Hard delete
    await deleteExpense(id)
  } else {
    // Soft delete - stop the expense
    await stopExpense(id, getLastDayOfPreviousMonth(selectedYear, selectedMonth, anchorYear))
  }
}
```

---

## Edge Cases

### 1. Editing Same Future Month Twice
When user edits at March 2025 with "Apply from this month only", then edits again at March 2025:
- First edit: Creates version with `start_date: 2025-03-01`
- Second edit: Upserts the same version (updates existing row with `start_date: 2025-03-01`)

### 2. Child Versions After Stop
If expense has child versions and parent is stopped:
```
Base (end_date: 2025-02-28)
    └── Child (start_date: 2025-03-01)  -- Still active!
```
The child version remains valid. Timeline rendering shows the child from March onwards.

### 3. Deleting a Version (Not Base)
If user hard-deletes a version that's not the base:
- Hard delete removes that version and its children
- Parent versions are unaffected

### 4. Debt Repayment Edits
Debt repayments (expenses with `source_liability_id`) follow the same versioning rules.
The `source_liability_id` is preserved/copied when creating new versions.

---

## Testing Scenarios

| # | Scenario | User Choice | Expected Result |
|---|----------|-------------|-----------------|
| 1 | Edit at anchor month | (none) | In-place update of base row |
| 2 | Edit at future, checkbox unchecked | "Apply to all" | In-place update of base row |
| 3 | Edit at future, checkbox checked | "From this month" | Base gets end_date, new version created |
| 4 | Edit same future month twice | "From this month" | Upserts existing version |
| 5 | Delete at anchor month | (none) | Hard delete + descendants |
| 6 | Delete at future, "all months" | "All months" | Hard delete + descendants |
| 7 | Delete at future, "from this month" | "From [Month]" | Sets end_date only, children remain |
