# Income Earner Classification

## Summary

Add the ability to classify income by custom earner names (e.g., "John", "Sarah") so users can identify which person each income belongs to for property planning purposes.

## User Requirements

- **Custom earner names** - Free-text field instead of fixed enum
- **Placement** - Near top of income form, right after the Name field
- **Simple input** - Basic text input (no autocomplete needed)

## Background

The database already has an `earner` column added via migration `20251228000_add_earner_to_incomes.up.sql`, but it uses a fixed constraint:

```sql
ALTER TABLE finance_incomes ADD COLUMN earner VARCHAR(20) DEFAULT 'self';
ALTER TABLE finance_incomes ADD CONSTRAINT finance_incomes_earner_check
    CHECK (earner IN ('self', 'spouse', 'other'));
```

This needs to be changed to allow custom names.

---

## Implementation Steps

### 1. Database Migration

**File:** `backend/migrations/YYYYMMDD_earner_custom_names.up.sql`

```sql
-- Remove the fixed constraint to allow custom names
ALTER TABLE finance_incomes DROP CONSTRAINT IF EXISTS finance_incomes_earner_check;

-- Expand column width for longer names
ALTER TABLE finance_incomes ALTER COLUMN earner TYPE VARCHAR(50);

-- Change default to empty string
ALTER TABLE finance_incomes ALTER COLUMN earner SET DEFAULT '';

-- Update existing 'self' values to empty (or keep as-is based on preference)
UPDATE finance_incomes SET earner = '' WHERE earner = 'self';
```

### 2. Backend Model Update

**File:** `backend/internal/financial_v2/repository/store.go` (line 164)

Add `Earner` field to Income struct after `Name`:

```go
type Income struct {
    ID             string          `json:"id"`
    ParentID       string          `json:"parentId"`
    Name           string          `json:"name"`
    Earner         string          `json:"earner"`  // NEW
    Amount         decimal.Decimal `json:"amount"`
    // ... rest unchanged
}
```

### 3. Backend Repository Updates

**File:** `backend/internal/financial_v2/repository/income.go`

Update SQL queries:

- `GetIncome` - Add `COALESCE(earner, '') as earner` to SELECT
- `CreateIncome` - Add `earner` to INSERT columns/values
- `UpdateIncome` - Add `earner = $N` to UPDATE SET clause
- `ListIncomes` - Add `COALESCE(earner, '') as earner` to SELECT

### 4. Backend Handler Updates

**File:** `backend/cmd/server/handlers/incomes_v2.go`

Add `Earner` field to input structs:

```go
type incomeV2CreateInput struct {
    Name    string  `json:"name"`
    Earner  string  `json:"earner"`  // NEW
    // ... rest
}
```

Pass earner through in `HandleCreate` and `HandleUpdate`.

### 5. Frontend Types

**File:** `frontend/src/types/financial.ts` (line 110)

Add `earner` to income schema:

```typescript
export const incomeSchema = z.object({
  id: z.string().min(1),
  parentId: z.string().optional(),
  name: z.string().min(1),
  earner: z.string().optional(),  // NEW
  amount: z.number().positive(),
  // ... rest unchanged
})
```

### 6. Frontend Form Types

**File:** `frontend/src/components/modals/FinancialFormModal/types.ts`

Add `earner` to `FormState` (line 21):

```typescript
export type FormState = {
  name: string
  earner: string  // NEW
  amount: string
  // ... rest
}
```

Add `earner` to `IncomeFormValues` (line 56):

```typescript
export type IncomeFormValues = {
  type: 'income'
  id?: string
  name: string
  earner?: string  // NEW
  amount: number
  // ... rest
}
```

### 7. Form Hook Updates

**File:** `frontend/src/components/modals/FinancialFormModal/hooks/useFinancialForm.ts`

- Add `earner: ''` to `buildDefaultFormState` (in helpers.ts)
- Update `populateFormFromData` to set earner for income type
- Update `buildPayload` to include earner for income type

### 8. Form Helpers

**File:** `frontend/src/components/modals/FinancialFormModal/helpers.ts`

Update `buildDefaultFormState`:

```typescript
export function buildDefaultFormState(...): FormState {
  return {
    name: '',
    earner: '',  // NEW
    amount: '',
    // ... rest
  }
}
```

### 9. Form UI Update

**File:** `frontend/src/components/modals/FinancialFormModal/index.tsx`

Add earner field after Name field (around line 115), only for income type:

```tsx
{normalizedCategory === 'incomes' && (
  <div>
    <label className="mb-2.5 block text-sm font-medium text-gray-200">
      Earner (optional)
    </label>
    <input
      type="text"
      className="w-full rounded-xl bg-white/[0.03] border border-white/[0.06] text-white text-sm py-2.5 px-3 focus:outline-none focus:border-white/20 focus:bg-white/[0.05] placeholder:text-slate-600"
      placeholder="e.g., John, Sarah"
      value={form.formData.earner}
      onChange={(e) => form.updateFormField('earner', e.target.value)}
    />
  </div>
)}
```

### 10. Income API Updates

**File:** `frontend/src/api/financial/incomes.ts`

Add `earner` to create/update payloads:

```typescript
const body = {
  name: payload.name,
  earner: payload.earner || '',  // NEW
  amount: String(payload.amount),
  // ...
}
```

### 11. Display in Line Item

**File:** `frontend/src/components/dashboard/FinancialDataManagement/components/LineItem.tsx`

Show earner as subtitle or badge below income name:

```tsx
<div className="flex min-w-0 flex-col">
  <span className="truncate text-sm text-slate-300">{item.name}</span>
  {item.earner && (
    <span className="text-[10px] text-slate-500 truncate">{item.earner}</span>
  )}
</div>
```

---

## Critical Files Summary

| Layer          | File Path                                                                 |
| -------------- | ------------------------------------------------------------------------- |
| Migration      | `backend/migrations/YYYYMMDD_earner_custom_names.up.sql`                  |
| Backend Model  | `backend/internal/financial_v2/repository/store.go:161-181`               |
| Backend Repo   | `backend/internal/financial_v2/repository/income.go`                      |
| Backend Handler| `backend/cmd/server/handlers/incomes_v2.go`                               |
| Frontend Types | `frontend/src/types/financial.ts:107-124`                                 |
| Form Types     | `frontend/src/components/modals/FinancialFormModal/types.ts`              |
| Form Hook      | `frontend/src/components/modals/FinancialFormModal/hooks/useFinancialForm.ts` |
| Form Helpers   | `frontend/src/components/modals/FinancialFormModal/helpers.ts`            |
| Form UI        | `frontend/src/components/modals/FinancialFormModal/index.tsx`             |
| Income API     | `frontend/src/api/financial/incomes.ts`                                   |
| Line Item      | `frontend/src/components/dashboard/FinancialDataManagement/components/LineItem.tsx` |

---

## Implementation Order

1. Backend migration (remove constraint, expand column)
2. Backend model + repository + handler
3. Frontend types (Income schema + form types)
4. Frontend API (incomes.ts)
5. Form helpers + hook
6. Form UI (add earner text input)
7. LineItem display update

---

## Property Planner Integration Note

The property planner already uses `borrower1IncomeId` and `borrower2IncomeId` to link incomes. Once earner names are stored, the income selection dropdowns can display:

```
"Software Engineer Salary (John) - $8,500/mo"
```

This is a display-only change in `MortgageForm.tsx` after the core feature is implemented.
