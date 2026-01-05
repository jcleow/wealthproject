# Cash Account Person Ownership

## Overview

Add person ownership to cash accounts to reflect real-world bank account ownership patterns.

### Ownership Types

| Type | Description | Example |
|------|-------------|---------|
| `household` | Shared/unassigned (default) | "Emergency fund" |
| `individual` | Single person ownership | "My DBS savings" |
| `joint` | Two co-owners (max 2) | "Joint OCBC with spouse" |

---

## Database Schema

### Migration: `202601050001_add_cash_account_ownership.up.sql`

```sql
-- Add ownership columns
ALTER TABLE finance_cash_accounts
ADD COLUMN ownership_type varchar(10) DEFAULT 'household' NOT NULL
    CHECK (ownership_type IN ('household', 'individual', 'joint'));

ALTER TABLE finance_cash_accounts
ADD COLUMN person1_id uuid REFERENCES persons(id) ON DELETE SET NULL;

ALTER TABLE finance_cash_accounts
ADD COLUMN person2_id uuid REFERENCES persons(id) ON DELETE SET NULL;

-- Indexes for efficient queries
CREATE INDEX idx_finance_cash_accounts_person1 ON finance_cash_accounts(person1_id) WHERE person1_id IS NOT NULL;
CREATE INDEX idx_finance_cash_accounts_person2 ON finance_cash_accounts(person2_id) WHERE person2_id IS NOT NULL;

-- Ensure ownership_type matches person fields
ALTER TABLE finance_cash_accounts ADD CONSTRAINT chk_cash_account_ownership CHECK (
    (ownership_type = 'household' AND person1_id IS NULL AND person2_id IS NULL) OR
    (ownership_type = 'individual' AND person1_id IS NOT NULL AND person2_id IS NULL) OR
    (ownership_type = 'joint' AND person1_id IS NOT NULL AND person2_id IS NOT NULL)
);

-- Joint accounts must have different owners
ALTER TABLE finance_cash_accounts ADD CONSTRAINT chk_cash_account_different_persons CHECK (
    person1_id IS NULL OR person2_id IS NULL OR person1_id != person2_id
);
```

### Down Migration

```sql
ALTER TABLE finance_cash_accounts DROP CONSTRAINT IF EXISTS chk_cash_account_different_persons;
ALTER TABLE finance_cash_accounts DROP CONSTRAINT IF EXISTS chk_cash_account_ownership;
DROP INDEX IF EXISTS idx_finance_cash_accounts_person2;
DROP INDEX IF EXISTS idx_finance_cash_accounts_person1;
ALTER TABLE finance_cash_accounts DROP COLUMN IF EXISTS person2_id;
ALTER TABLE finance_cash_accounts DROP COLUMN IF EXISTS person1_id;
ALTER TABLE finance_cash_accounts DROP COLUMN IF EXISTS ownership_type;
```

---

## Backend Changes

### Struct Updates

**File:** `backend/internal/financial_v2/repository/store.go`

```go
type CashAsset struct {
    // ... existing fields ...

    // Ownership fields
    OwnershipType  string  `json:"ownershipType"`         // 'household', 'individual', 'joint'
    Person1ID      *string `json:"person1Id,omitempty"`   // FK to persons
    Person1Name    string  `json:"person1Name,omitempty"` // Read-only (populated via JOIN)
    Person2ID      *string `json:"person2Id,omitempty"`   // FK to persons (joint only)
    Person2Name    string  `json:"person2Name,omitempty"` // Read-only (populated via JOIN)
}
```

### Query Pattern

All SELECT queries will JOIN persons table for display names:

```sql
SELECT ca.*,
    COALESCE(ownership_type, 'household') as ownership_type,
    person1_id, COALESCE(p1.name, '') as person1_name,
    person2_id, COALESCE(p2.name, '') as person2_name
FROM finance_cash_accounts ca
LEFT JOIN persons p1 ON ca.person1_id = p1.id
LEFT JOIN persons p2 ON ca.person2_id = p2.id
WHERE ca.user_id = $1
```

### Handler Validation

```go
switch ownershipType {
case "household":
    // person1_id and person2_id must be NULL
case "individual":
    // person1_id required, person2_id must be NULL
case "joint":
    // both required, must be different
}
```

---

## Frontend Changes

### Type Updates

**File:** `frontend/src/types/financial.ts`

```typescript
export const cashAccountOwnershipTypeEnum = z.enum(['household', 'individual', 'joint'])

export const cashAccountSchema = z.object({
  // ... existing fields ...
  ownershipType: cashAccountOwnershipTypeEnum.default('household'),
  person1Id: z.string().optional().nullable(),
  person1Name: z.string().optional(),
  person2Id: z.string().optional().nullable(),
  person2Name: z.string().optional(),
})
```

### Form UI

1. **Ownership Type Selector** - Dropdown with 3 options
2. **Person Selector(s)** - Conditionally rendered based on ownership type:
   - `household`: No person selectors
   - `individual`: One PersonSelector (required)
   - `joint`: Two PersonSelectors (both required, must be different)

---

## Files to Modify

| Phase | File | Changes |
|-------|------|---------|
| 1 | `backend/migrations/202601050001_*.sql` | New migration files |
| 2 | `backend/internal/financial_v2/repository/store.go` | CashAsset struct |
| 3 | `backend/internal/financial_v2/repository/cash_account.go` | Get/Update queries |
| 3 | `backend/internal/financial_v2/repository/store.go` | ListCashAssets query |
| 3 | `backend/internal/financial/repository/cash_accounts.go` | Create query |
| 4 | `backend/cmd/server/handlers/cash_accounts_v2.go` | Input struct + validation |
| 4 | `backend/cmd/server/handlers/cash_accounts.go` | V1 create handler |
| 5 | `frontend/src/types/financial.ts` | Type definitions |
| 5 | `frontend/src/api/financial/transformers.ts` | API response transformer |
| 5 | `frontend/src/api/financial/cashAccounts.ts` | Create/update payloads |
| 6 | `frontend/src/lib/validations/cashAccount.ts` | Form validation schema |
| 6 | `frontend/src/components/modals/CashAccountFormModal/` | Form UI + hooks |

---

## Backward Compatibility

- Existing accounts automatically default to `ownership_type = 'household'`
- NULL person IDs are valid for household accounts
- No data migration required
- Fund flow rules continue to work unchanged (reference `cash_account_id`)

---

## Design Decisions

### Why max 2 owners for joint accounts?

- Matches existing property borrower pattern (`borrower1`/`borrower2`)
- Simpler than N-owner junction table
- Covers 99% of real-world joint account scenarios
- Avoids complexity of ownership percentage tracking

### Why `ON DELETE SET NULL`?

- Preserves account when a person is deleted
- Account becomes effectively "unassigned" until re-linked
- Alternative: `ON DELETE CASCADE` would delete accounts when person is deleted (too destructive)

### Why LEFT JOIN for person names?

- Follows existing Income pattern
- Avoids N+1 queries
- `person1Name`/`person2Name` are read-only display fields
