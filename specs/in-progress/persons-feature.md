# Persons Feature Specification

## Overview

Replace the "Tax Estimate" button with an icon toolbar containing Tax and Person icons. The Person icon opens a modal to manage household members (persons) and toggle their inclusion in financial calculations.

## User Requirements

1. **UI**: Replace long "Tax Estimate" button with compact icon toolbar (Tax + Person icons)
2. **Person Modal**: List all persons with checkboxes to toggle inclusion
3. **Filtering**: When a person is unchecked, exclude their incomes and CPF accounts from:
   - Financial cards display
   - Financial computations (property purchase, timeline calculations)
4. **Explicit Creation**: Users must create persons first, then select from dropdown when adding incomes/CPF accounts
5. **Scope**: Only incomes and CPF accounts support per-person ownership (assets, liabilities, expenses remain shared)

---

## Database Schema

### Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              DATABASE SCHEMA                                 │
└─────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────┐
│       persons        │ (NEW TABLE)
├──────────────────────┤
│ id          PK  uuid │
│ user_id         text │──────────────────────────────────────┐
│ name            text │                                      │
│ display_color   text │                                      │
│ is_included     bool │ ◄── Toggle for filtering             │
│ created_at timestamp │                                      │
│ updated_at timestamp │                                      │
└──────────────────────┘                                      │
         │                                                    │
         │ 1:N                                                │
         ▼                                                    │
┌──────────────────────┐       ┌──────────────────────┐      │
│   finance_incomes    │       │     cpf_accounts     │      │
├──────────────────────┤       ├──────────────────────┤      │
│ id          PK  uuid │       │ id          PK  uuid │      │
│ user_id         text │───────│ user_id         text │──────┘
│ person_id   FK  uuid │◄──┐   │ person_id   FK  uuid │◄──┐
│ earner (deprecated)  │   │   │ earner (deprecated)  │   │
│ name            text │   │   │ oa_balance   decimal │   │
│ amount       decimal │   │   │ sa_balance   decimal │   │
│ frequency       text │   │   │ ma_balance   decimal │   │
│ ...                  │   │   │ ...                  │   │
└──────────────────────┘   │   └──────────────────────┘   │
                           │                              │
                           └──────────────────────────────┘
                                      │
                                      │ ON DELETE SET NULL
                                      ▼
                           (Records become unassigned)


┌─────────────────────────────────────────────────────────────────────────────┐
│                         UNCHANGED TABLES (Shared)                           │
├─────────────────────────────────────────────────────────────────────────────┤
│  finance_assets  │  finance_liabilities  │  finance_expenses  │  property  │
│  (no person_id)  │    (no person_id)     │   (no person_id)   │    _sg     │
└─────────────────────────────────────────────────────────────────────────────┘
```

### New Table: `persons`

```sql
CREATE TABLE persons (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    user_id character varying(36) NOT NULL,
    name character varying(100) NOT NULL CHECK (char_length(name) >= 1),
    display_color character varying(20),  -- Optional color for UI differentiation
    is_included boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    UNIQUE (user_id, name)
);

CREATE INDEX idx_persons_user ON persons(user_id);
```

### Schema Changes

**finance_incomes:**
```sql
ALTER TABLE finance_incomes ADD COLUMN person_id uuid REFERENCES persons(id) ON DELETE SET NULL;
CREATE INDEX idx_finance_incomes_person ON finance_incomes(person_id);
```

**cpf_accounts:**
```sql
ALTER TABLE cpf_accounts ADD COLUMN person_id uuid REFERENCES persons(id) ON DELETE SET NULL;
CREATE INDEX idx_cpf_accounts_person ON cpf_accounts(person_id);

-- Update constraint for multi-person support
ALTER TABLE cpf_accounts DROP CONSTRAINT IF EXISTS cpf_accounts_no_overlap;
ALTER TABLE cpf_accounts ADD CONSTRAINT cpf_accounts_no_overlap_per_person EXCLUDE USING gist (
    user_id WITH =,
    COALESCE(person_id::text, '') WITH =,
    tstzrange(start_date, COALESCE(end_date, 'infinity'::timestamptz), '[)') WITH &&
);
```

### Data Migration

```sql
-- Extract unique earners from existing data
INSERT INTO persons (user_id, name)
SELECT DISTINCT user_id, earner FROM finance_incomes
WHERE earner IS NOT NULL AND earner <> ''
ON CONFLICT DO NOTHING;

INSERT INTO persons (user_id, name)
SELECT DISTINCT user_id, earner FROM cpf_accounts
WHERE earner IS NOT NULL AND earner <> ''
ON CONFLICT DO NOTHING;

-- Link existing records to migrated persons
UPDATE finance_incomes fi SET person_id = p.id
FROM persons p
WHERE fi.user_id = p.user_id AND fi.earner = p.name AND fi.earner <> '';

UPDATE cpf_accounts ca SET person_id = p.id
FROM persons p
WHERE ca.user_id = p.user_id AND ca.earner = p.name AND ca.earner <> '';
```

---

## Logic Flows

### Flow 1: Person Creation

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         PERSON CREATION FLOW                                │
└─────────────────────────────────────────────────────────────────────────────┘

┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│    User      │     │  PersonModal │     │   API Call   │     │   Database   │
│  Interface   │     │  Component   │     │   Handler    │     │              │
└──────┬───────┘     └──────┬───────┘     └──────┬───────┘     └──────┬───────┘
       │                    │                    │                    │
       │ Click "Add Person" │                    │                    │
       │───────────────────►│                    │                    │
       │                    │                    │                    │
       │ Enter name "Alex"  │                    │                    │
       │───────────────────►│                    │                    │
       │                    │                    │                    │
       │ Click "Save"       │                    │                    │
       │───────────────────►│                    │                    │
       │                    │                    │                    │
       │                    │ POST /api/v2/persons                    │
       │                    │ { name: "Alex" }   │                    │
       │                    │───────────────────►│                    │
       │                    │                    │                    │
       │                    │                    │ INSERT INTO persons│
       │                    │                    │───────────────────►│
       │                    │                    │                    │
       │                    │                    │◄───────────────────│
       │                    │                    │ Return new person  │
       │                    │◄───────────────────│                    │
       │                    │                    │                    │
       │                    │ Invalidate queries │                    │
       │                    │ Update UI          │                    │
       │◄───────────────────│                    │                    │
       │ Show "Alex" in list│                    │                    │
```

### Flow 2: Toggle Person Inclusion

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       PERSON TOGGLE INCLUSION FLOW                          │
└─────────────────────────────────────────────────────────────────────────────┘

┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  Checkbox    │     │ PersonFilter │     │   API Call   │     │ All Affected │
│  in Modal    │     │   Context    │     │   Handler    │     │  Components  │
└──────┬───────┘     └──────┬───────┘     └──────┬───────┘     └──────┬───────┘
       │                    │                    │                    │
       │ Uncheck "Alex"     │                    │                    │
       │───────────────────►│                    │                    │
       │                    │                    │                    │
       │                    │ PATCH /persons/{id}/toggle              │
       │                    │───────────────────►│                    │
       │                    │                    │                    │
       │                    │                    │ UPDATE persons     │
       │                    │                    │ SET is_included=   │
       │                    │                    │     NOT is_included│
       │                    │                    │                    │
       │                    │◄───────────────────│                    │
       │                    │                    │                    │
       │                    │ Update includedPersonIds Set            │
       │                    │────────────────────────────────────────►│
       │                    │                    │                    │
       │                    │                    │   Re-filter data   │
       │                    │                    │   - Income cards   │
       │                    │                    │   - CPF displays   │
       │                    │                    │   - Timeline       │
       │                    │                    │   - Calculations   │
       │                    │                    │                    │
```

### Flow 3: Data Filtering Across App

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         DATA FILTERING FLOW                                 │
└─────────────────────────────────────────────────────────────────────────────┘

                    ┌─────────────────────────┐
                    │   PersonFilterContext   │
                    │  includedPersonIds: Set │
                    │  { "uuid-alex" }        │  ◄── Only Alex included
                    │                         │      (Jordan excluded)
                    └───────────┬─────────────┘
                                │
          ┌─────────────────────┼─────────────────────┐
          │                     │                     │
          ▼                     ▼                     ▼
┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐
│  Income Cards   │   │   CPF Display   │   │ Dropdowns       │
├─────────────────┤   ├─────────────────┤   │ (Forms/Planner) │
│                 │   │                 │   ├─────────────────┤
│ DISPLAY filter: │   │ DISPLAY filter: │   │ SELECTION filter│
│ income.personId │   │ cpf.personId    │   │                 │
│ is NULL OR      │   │ is NULL OR      │   │ Only show       │
│ in includedIds  │   │ in includedIds  │   │ persons where   │
│                 │   │                 │   │ is_included=true│
│ Shows:          │   │ Shows:          │   │                 │
│ - Alex's income │   │ - Alex's CPF    │   │ Dropdown shows: │
│ - Unassigned    │   │ - Unassigned    │   │ - Alex          │
│                 │   │                 │   │ - (None)        │
│ Hides:          │   │ Hides:          │   │ - + Add new...  │
│ - Jordan's      │   │ - Jordan's      │   │                 │
└─────────────────┘   └─────────────────┘   └─────────────────┘
          │                     │                     │
          ▼                     ▼                     ▼
┌─────────────────────────────────────────────────────────────┐
│                    Timeline Calculation                      │
│  Only include incomes/CPF from included persons              │
│  → Net worth, cash flow, projections all reflect filtering   │
└─────────────────────────────────────────────────────────────┘
```

### Flow 4: Assigning Person to Income/CPF

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    ASSIGN PERSON TO INCOME FLOW                             │
└─────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────┐
│                        FinancialFormModal                                │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Name:     [Software Engineer Salary                    ]                │
│                                                                          │
│  Person:   [▼ Alex                                      ] ◄── NEW        │
│            ┌─────────────────────────────────────────┐                   │
│            │ (None)                                  │                   │
│            │ Alex                               ✓    │                   │
│            │ Jordan                                  │                   │
│            ├─────────────────────────────────────────┤                   │
│            │ + Add new person...                     │ ◄── INLINE CREATE │
│            └─────────────────────────────────────────┘                   │
│                                                                          │
│  Amount:   [8000                                     ]                   │
│                                                                          │
│                                          [Cancel] [Save]                 │
└──────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
                    POST /api/v2/incomes
                    {
                      "name": "Software Engineer Salary",
                      "personId": "uuid-of-alex",  ◄── NEW FIELD
                      "amount": "8000",
                      ...
                    }
```

### Flow 5: Inline Person Creation from Income/CPF Form

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    INLINE PERSON CREATION FLOW                              │
└─────────────────────────────────────────────────────────────────────────────┘

User clicks "+ Add new person..." in the Person dropdown
                                    │
                                    ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                    Inline Person Creation Popover                        │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────┐     │
│  │  Create New Person                                              │     │
│  ├────────────────────────────────────────────────────────────────┤     │
│  │                                                                 │     │
│  │  Name: [Alex                           ]                        │     │
│  │                                                                 │     │
│  │  Color: [●] [●] [●] [●] [●]  (optional)                        │     │
│  │                                                                 │     │
│  │                              [Cancel] [Create]                  │     │
│  └────────────────────────────────────────────────────────────────┘     │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ On "Create" click
                                    ▼
                    POST /api/v2/persons { name: "Alex" }
                                    │
                                    ▼
                    ┌───────────────────────────────┐
                    │ Person created successfully   │
                    │ Auto-select new person in     │
                    │ dropdown, close popover       │
                    └───────────────────────────────┘
```

### Flow 6: Property Purchase Scenario with Persons

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                 PROPERTY SCENARIO LOADS PERSON DATA                         │
└─────────────────────────────────────────────────────────────────────────────┘

┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│  Scenario Event  │     │   Property SG    │     │     Persons      │
│  (created prop)  │     │    (borrowers)   │     │   (owners)       │
└────────┬─────────┘     └────────┬─────────┘     └────────┬─────────┘
         │                        │                        │
         │ Load scenario          │                        │
         │───────────────────────►│                        │
         │                        │                        │
         │                        │ borrower1_income_id ───┼──► finance_incomes.person_id
         │                        │                        │           │
         │                        │ borrower1_cpf_id ──────┼──► cpf_accounts.person_id
         │                        │                        │           │
         │                        │ borrower2_income_id ───┼──► finance_incomes.person_id
         │                        │                        │           │
         │                        │ borrower2_cpf_id ──────┼──► cpf_accounts.person_id
         │                        │                        │           │
         │                        │                        │           ▼
         │                        │                        │   ┌───────────────┐
         │                        │                        │   │ Check:        │
         │                        │                        │   │ is_included?  │
         │                        │                        │   └───────┬───────┘
         │                        │                        │           │
         ▼                        ▼                        ▼           ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                     Property Planner Modal Display                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Borrower 1: [▼ Alex's Salary ($8,000/mo)        ]  ◄── Alex is included   │
│              CPF: Alex's CPF (OA: $50,000)                                  │
│                                                                             │
│  Borrower 2: [▼ Select income...                 ]  ◄── Jordan EXCLUDED    │
│              ℹ️ Previously selected income is no longer available           │
│              CPF: [▼ Select CPF account...       ]                          │
│                                                                             │
│  Dropdown only shows:                                                       │
│  ┌─────────────────────────────────────────┐                               │
│  │ Alex's Salary ($8,000/mo)               │  ◄── Included person's income │
│  │ Unassigned Rental Income ($2,000/mo)    │  ◄── No person assigned       │
│  │ + Add new person...                     │                               │
│  └─────────────────────────────────────────┘                               │
│  (Jordan's income NOT shown - person excluded)                              │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Features Affected

### Directly Modified Features

| Feature | Component | Impact |
|---------|-----------|--------|
| **Header Controls** | `Header.tsx` | Replace Tax Estimate button with icon toolbar |
| **Income Form** | `FinancialFormModal` | Add person dropdown |
| **CPF Form** | `CpfAccountFormModal` | Add person dropdown |
| **Income Display** | `IncomeCard`, `IncomeList` | Filter by included persons |
| **CPF Display** | `CPFAccountCard`, `CPFDetails` | Filter by included persons |

### Indirectly Affected Features (via filtering)

| Feature | How Affected |
|---------|--------------|
| **Timeline/Projections** | Net worth calculations exclude unchecked persons' incomes/CPF |
| **Financial Cards Summary** | Total income/CPF balances reflect only included persons |
| **Property Planner** | Borrower income dropdown only shows included persons' incomes |
| **Tax Estimate** | Tax calculations based only on included persons' incomes |
| **Cash Flow Chart** | Income inflows reflect only included persons |
| **Scenario Events** | Income-related impacts only apply to included persons' incomes |

### Not Affected (Shared Data)

| Feature | Reason |
|---------|--------|
| Assets | No person_id - remains shared household data |
| Liabilities | No person_id - remains shared household data |
| Expenses | No person_id - remains shared household data |
| Cash Accounts | No person_id - remains shared household data |

---

## UI Mockups

### Header Icon Toolbar

```
BEFORE:
┌─────────────────────────────────────┐
│  VIEW  Monthly  YEAR  2025  MONTH  │
├─────────────────────────────────────┤
│         [━━━━━●━━━━━━━━━]           │
├─────────────────────────────────────┤
│        📄 Tax Estimate              │  ◄── Full-width button
└─────────────────────────────────────┘

AFTER:
┌─────────────────────────────────────┐
│  VIEW  Monthly  YEAR  2025  MONTH  │
├─────────────────────────────────────┤
│         [━━━━━●━━━━━━━━━]           │
├─────────────────────────────────────┤
│         [📄]    [👥]                │  ◄── Compact icon row
└─────────────────────────────────────┘
           │       │
           │       └── Person icon (Users) - opens PersonsModal
           └────────── Tax icon (Receipt) - opens TaxMode
```

### Persons Modal

```
┌─────────────────────────────────────────────────────────┐
│  Manage Persons                                    [✕]  │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │ [✓] Alex                    2 incomes · 1 CPF   │   │
│  │     ●━━━ (blue)                    [✎] [🗑]    │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │ [ ] Jordan                  1 income · 1 CPF    │   │  ◄── Unchecked = excluded
│  │     ●━━━ (green)                   [✎] [🗑]    │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ─────────────────────────────────────────────────────  │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │  Name: [                    ]                   │   │
│  │  Color: [●] [●] [●] [●] [●]      [+ Add]       │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## Implementation Tickets

### Backend Tickets

#### BE-1: Database Migration for Persons Table
**Priority**: P0 (Blocking)
**Estimate**: 1 hour

**Description**: Create migration to add `persons` table and modify `finance_incomes` and `cpf_accounts` tables.

**Acceptance Criteria**:
- [ ] Create `persons` table with all columns and constraints
- [ ] Add `person_id` FK column to `finance_incomes`
- [ ] Add `person_id` FK column to `cpf_accounts`
- [ ] Update CPF overlap constraint for multi-person support
- [ ] Migrate existing `earner` data to persons table
- [ ] Create down migration for rollback
- [ ] Test migration on local database

**Files**:
- `backend/migrations/202512310001_add_persons_table.up.sql` (create)
- `backend/migrations/202512310001_add_persons_table.down.sql` (create)

---

#### BE-2: Person Repository Layer
**Priority**: P0 (Blocking)
**Estimate**: 2 hours

**Description**: Create Go repository for Person CRUD operations.

**Acceptance Criteria**:
- [ ] Add `Person` struct to `store.go`
- [ ] Implement `ListPersons(ctx, userID)`
- [ ] Implement `CreatePerson(ctx, userID, input)`
- [ ] Implement `UpdatePerson(ctx, userID, id, input)`
- [ ] Implement `DeletePerson(ctx, userID, id)`
- [ ] Implement `TogglePersonIncluded(ctx, userID, id)`
- [ ] Add `GetPersonStats(ctx, userID)` to return income/CPF counts per person

**Files**:
- `backend/internal/financial_v2/repository/store.go` (modify)
- `backend/internal/financial_v2/repository/person.go` (create)

---

#### BE-3: Person API Handlers
**Priority**: P0 (Blocking)
**Estimate**: 2 hours

**Description**: Create HTTP handlers and register routes for Person API.

**Acceptance Criteria**:
- [ ] `GET /api/v2/persons` - List all persons
- [ ] `POST /api/v2/persons` - Create person
- [ ] `PUT /api/v2/persons/{id}` - Update person
- [ ] `DELETE /api/v2/persons/{id}` - Delete person
- [ ] `PATCH /api/v2/persons/{id}/toggle` - Toggle inclusion
- [ ] Proper error handling and validation
- [ ] Register routes in v2.go

**Files**:
- `backend/cmd/server/handlers/persons_v2.go` (create)
- `backend/cmd/server/routes/v2.go` (modify)

---

#### BE-4: Update Income API for Person Support
**Priority**: P1
**Estimate**: 1 hour

**Description**: Modify income handlers and repository to support `person_id`.

**Acceptance Criteria**:
- [ ] Add `personId` field to income create/update input structs
- [ ] Store `person_id` in income INSERT/UPDATE queries
- [ ] Return `personId` in income GET responses
- [ ] Handle NULL person_id gracefully

**Files**:
- `backend/cmd/server/handlers/incomes_v2.go` (modify)
- `backend/internal/financial_v2/repository/income.go` (modify)

---

#### BE-5: Update CPF API for Person Support
**Priority**: P1
**Estimate**: 1 hour

**Description**: Modify CPF handlers and repository to support `person_id`.

**Acceptance Criteria**:
- [ ] Add `personId` field to CPF create/update input structs
- [ ] Store `person_id` in CPF INSERT/UPDATE queries
- [ ] Return `personId` in CPF GET responses
- [ ] Handle NULL person_id gracefully

**Files**:
- `backend/cmd/server/handlers/cpf_v2.go` (modify)
- `backend/internal/financial_v2/repository/cpf_account.go` (modify)

---

### Frontend Tickets

#### FE-1: Person Types and API Module
**Priority**: P0 (Blocking)
**Estimate**: 1 hour

**Description**: Create TypeScript types and API module for persons.

**Acceptance Criteria**:
- [ ] Create `Person` interface
- [ ] Create `PersonCreatePayload` and `PersonUpdatePayload` types
- [ ] Implement `listPersons()` API function
- [ ] Implement `createPerson()` API function
- [ ] Implement `updatePerson()` API function
- [ ] Implement `deletePerson()` API function
- [ ] Implement `togglePersonIncluded()` API function
- [ ] Add query keys for persons
- [ ] Export from api/financial/index.ts

**Files**:
- `frontend/src/types/person.ts` (create)
- `frontend/src/api/financial/persons.ts` (create)
- `frontend/src/api/financial/index.ts` (modify)
- `frontend/src/lib/queryKeys.ts` (modify)

---

#### FE-2: Person Query Hooks
**Priority**: P0 (Blocking)
**Estimate**: 1 hour

**Description**: Create React Query hooks for persons.

**Acceptance Criteria**:
- [ ] `usePersonsQuery()` - Fetch persons list
- [ ] `useCreatePersonMutation()` - Create person
- [ ] `useUpdatePersonMutation()` - Update person
- [ ] `useDeletePersonMutation()` - Delete person
- [ ] `useTogglePersonMutation()` - Toggle inclusion
- [ ] Proper query invalidation

**Files**:
- `frontend/src/hooks/queries/usePersonsQuery.ts` (create)

---

#### FE-3: PersonFilterContext
**Priority**: P0 (Blocking)
**Estimate**: 2 hours

**Description**: Create context for managing person filtering state across the app.

**Acceptance Criteria**:
- [ ] Create `PersonFilterContext` with types
- [ ] `persons` - list of all persons
- [ ] `includedPersonIds` - Set of included person IDs
- [ ] `isPersonIncluded(personId)` - helper function
- [ ] `togglePersonIncluded(personId)` - mutation wrapper
- [ ] `isModalOpen`, `openModal`, `closeModal` - modal state
- [ ] Create `usePersonFilter()` hook
- [ ] Wrap app with `PersonFilterProvider`

**Files**:
- `frontend/src/contexts/PersonFilterContext.tsx` (create)
- `frontend/src/app/layout.tsx` or provider wrapper (modify)

---

#### FE-4: Header Icon Toolbar
**Priority**: P1
**Estimate**: 1 hour

**Description**: Replace Tax Estimate button with icon toolbar.

**Acceptance Criteria**:
- [ ] Remove full-width "Tax Estimate" button
- [ ] Add centered icon row with 2 icons
- [ ] Tax icon (Receipt) - opens existing tax mode
- [ ] Person icon (Users) - opens persons modal
- [ ] Icons have hover states matching design system
- [ ] Proper accessibility (title, aria-label)

**Files**:
- `frontend/src/components/dashboard/FinancialDataManagement/components/Header.tsx` (modify)

---

#### FE-5: PersonsModal Component
**Priority**: P1
**Estimate**: 3 hours

**Description**: Create modal for managing persons.

**Acceptance Criteria**:
- [ ] List all persons with checkboxes
- [ ] Show income/CPF count per person
- [ ] Checkbox toggles `is_included`
- [ ] Add new person form (name + optional color)
- [ ] Edit person inline or via sub-modal
- [ ] Delete person with confirmation warning
- [ ] Loading and error states
- [ ] Follow existing modal patterns (glassmorphic design)

**Files**:
- `frontend/src/components/modals/PersonsModal/PersonsModal.tsx` (create)
- `frontend/src/components/modals/PersonsModal/index.ts` (create)

---

#### FE-6: Update Income Form with Person Dropdown + Inline Creation
**Priority**: P1
**Estimate**: 2 hours

**Description**: Add person selection dropdown to income form with ability to create new persons inline.

**Acceptance Criteria**:
- [ ] Add `personId` to form state
- [ ] Add person dropdown using CustomDropdown component
- [ ] **Dropdown only shows INCLUDED persons (is_included = true)**
- [ ] Allow "(None)" selection for unassigned
- [ ] **Add "+ Add new person..." option at bottom of dropdown**
- [ ] **Clicking "+ Add new person..." opens inline creation popover/mini-form**
- [ ] **Inline form has: name input, optional color picker, Create/Cancel buttons**
- [ ] **On create: call POST /persons, auto-select new person, close popover**
- [ ] Send `personId` in create/update API calls
- [ ] Show current person when editing existing income
- [ ] **If editing income with excluded person, show that person (greyed out) + warning**

**Files**:
- `frontend/src/types/financial.ts` (modify - add personId to Income)
- `frontend/src/components/modals/FinancialFormModal/index.tsx` (modify)
- `frontend/src/components/modals/FinancialFormModal/InlinePersonCreate.tsx` (create)
- `frontend/src/api/financial/incomes.ts` (modify)

---

#### FE-7: Update CPF Form with Person Dropdown + Inline Creation
**Priority**: P1
**Estimate**: 2 hours

**Description**: Add person selection dropdown to CPF account form with ability to create new persons inline.

**Acceptance Criteria**:
- [ ] Add `personId` to form state
- [ ] Add person dropdown using CustomDropdown component
- [ ] **Dropdown only shows INCLUDED persons (is_included = true)**
- [ ] Allow "(None)" selection for unassigned
- [ ] **Add "+ Add new person..." option at bottom of dropdown**
- [ ] **Reuse InlinePersonCreate component from FE-6**
- [ ] **On create: call POST /persons, auto-select new person, close popover**
- [ ] Send `personId` in create/update API calls
- [ ] Show current person when editing existing CPF account
- [ ] **If editing CPF with excluded person, show that person (greyed out) + warning**

**Files**:
- `frontend/src/types/cpf.ts` (modify - add personId to CPFAccount)
- `frontend/src/components/modals/CpfAccountFormModal/index.tsx` (modify)
- `frontend/src/api/financial/cpf.ts` (modify)

---

#### FE-8: Apply Person Filtering to Financial Display
**Priority**: P2
**Estimate**: 2 hours

**Description**: Filter incomes and CPF accounts based on included persons.

**Acceptance Criteria**:
- [ ] Income cards/lists filter by `includedPersonIds`
- [ ] CPF displays filter by `includedPersonIds`
- [ ] Items with `personId = null` always show
- [ ] Financial summary totals reflect filtered data
- [ ] Timeline calculations use filtered data

**Files**:
- Components that display incomes/CPF (identify specific files)
- Hooks that aggregate financial data

---

#### FE-9: Update Property Planner for Person Filtering + Scenario Loading
**Priority**: P2
**Estimate**: 2 hours

**Description**: Filter income dropdown in property planner to respect person inclusion, and properly load person data when viewing/editing property scenarios.

**Acceptance Criteria**:
- [ ] **Borrower income dropdown only shows incomes from INCLUDED persons**
- [ ] **CPF account dropdown only shows CPF from INCLUDED persons**
- [ ] Incomes/CPF with no person assigned (person_id = NULL) always show
- [ ] **When loading existing property scenario:**
  - [ ] Fetch person data for borrower incomes/CPF accounts
  - [ ] Display person name alongside income/CPF in dropdown labels
  - [ ] **If linked income/CPF belongs to excluded person, clear selection + show info message**
- [ ] **Income dropdown shows person name**: "Alex's Salary ($8,000/mo)"
- [ ] **CPF dropdown shows person name**: "Alex's CPF (OA: $50,000)"
- [ ] **Handle edge case**: If income/CPF has no person assigned, show without person prefix

**Files**:
- `frontend/src/components/modals/PropertyPlannerModal/components/MortgageForm.tsx` (modify)
- `frontend/src/components/modals/PropertyPlannerModal/hooks/usePropertyBorrowers.ts` (modify if exists)

---

## Ticket Dependencies

```
                    ┌─────────┐
                    │  BE-1   │ Migration
                    └────┬────┘
                         │
              ┌──────────┼──────────┐
              │          │          │
         ┌────▼────┐     │     ┌────▼────┐
         │  BE-2   │     │     │  FE-1   │
         │  Repo   │     │     │  Types  │
         └────┬────┘     │     └────┬────┘
              │          │          │
         ┌────▼────┐     │     ┌────▼────┐
         │  BE-3   │     │     │  FE-2   │
         │  API    │     │     │  Hooks  │
         └────┬────┘     │     └────┬────┘
              │          │          │
    ┌─────────┼──────────┼──────────┤
    │         │          │          │
┌───▼───┐ ┌───▼───┐  ┌───▼───┐  ┌───▼───┐
│ BE-4  │ │ BE-5  │  │ FE-3  │  │ FE-4  │
│Income │ │ CPF   │  │Context│  │Header │
└───────┘ └───────┘  └───┬───┘  └───────┘
                         │
              ┌──────────┼──────────┐
              │          │          │
         ┌────▼────┐ ┌───▼───┐ ┌───▼───┐
         │  FE-5   │ │ FE-6  │ │ FE-7  │
         │  Modal  │ │Income │ │ CPF   │
         └─────────┘ │ Form  │ │ Form  │
                     └───┬───┘ └───┬───┘
                         │         │
                    ┌────▼─────────▼────┐
                    │      FE-8         │
                    │   Filtering       │
                    └────────┬──────────┘
                             │
                    ┌────────▼──────────┐
                    │      FE-9         │
                    │  Property Planner │
                    └───────────────────┘
```

---

## Implementation Order (Recommended)

| Phase | Tickets | Description |
|-------|---------|-------------|
| 1 | BE-1 | Database migration |
| 2 | BE-2, BE-3, FE-1, FE-2 | Backend API + Frontend types/hooks (parallel) |
| 3 | BE-4, BE-5, FE-3 | Update Income/CPF APIs + PersonFilterContext |
| 4 | FE-4, FE-5 | Header UI + PersonsModal |
| 5 | FE-6, FE-7 | Form updates |
| 6 | FE-8, FE-9 | Filtering integration |

---

## Edge Cases

### 1. No Persons Created
- Income/CPF forms show dropdown with "(None)" and "+ Add new person..." options
- Users can create a person inline without leaving the income/CPF form
- Users can still create incomes/CPF without assigning a person (person_id = NULL)

### 2. All Persons Excluded
- Financial cards show only unassigned incomes/CPF
- If all data is assigned to persons, cards show $0 or empty state
- Timeline calculations only include unassigned items

### 3. Deleting a Person with Linked Records
- Show warning: "This person has X incomes and Y CPF accounts. Deleting will unassign them."
- On delete: linked records get person_id = NULL (ON DELETE SET NULL)
- User must confirm before proceeding

### 4. Property Planner with Excluded Person
- Excluded persons' incomes/CPF don't appear in borrower dropdowns
- If loading saved scenario where borrower's person is now excluded:
  - Clear the selection (set to empty)
  - Show info message: "Previously selected income is no longer available"
- User must re-select from available (included) options

### 5. Loading Existing Property Scenario
- When editing a saved property scenario, load person data for all linked incomes/CPF
- If a person was deleted since scenario creation, income/CPF still works (just unassigned)
- Display income/CPF labels with person name prefix when available

### 6. Inline Person Creation Conflicts
- If user tries to create a person with duplicate name, show validation error
- Don't close the inline form on error, let user correct the name
- On success: auto-select the new person in dropdown, invalidate persons query cache

### 7. Concurrent Editing
- If another session creates/deletes a person, the dropdown should reflect changes on next query refetch
- Use React Query's staleTime to balance freshness vs performance
