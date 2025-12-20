# Income Entity Relationships

## Overview

Income records have two types of relationships:
1. **SOURCE** - Where income comes FROM (e.g., dividends from investments, interest from savings)
2. **DESTINATION** - Where income goes TO (e.g., salary distributed to multiple accounts)

## ERD Diagram (dbdiagram.io format)

```dbml
// Copy this to https://dbdiagram.io to visualize

Table finance_incomes {
  id uuid [pk, default: `gen_random_uuid()`]
  user_id varchar [not null]
  parent_id uuid
  source text [not null, note: 'Name/description of income']
  amount numeric(15,4) [not null]
  frequency varchar [not null, note: 'annual, monthly, quarterly, weekly, daily, one_time']
  start_date timestamptz [not null]
  end_date timestamptz
  category varchar [not null]
  growth_rate numeric(6,4) [default: 3.0]
  growth_strategy varchar [default: 'annual_step']
  growth_metadata jsonb
  notes text
  cpf_wage_type varchar [note: 'ow or aw']
  updated_at timestamptz [not null, default: `now()`]
  // SOURCE relationship (where income comes FROM)
  source_type varchar(20) [note: 'investment or cash_account']
  source_id uuid [note: 'FK to source entity (polymorphic)']

  indexes {
    (parent_id, start_date) [unique]
    (source_type, source_id)
  }
}

Table income_allocations {
  id uuid [pk, default: `gen_random_uuid()`]
  income_id uuid [not null, ref: > finance_incomes.id]
  // Separate nullable FKs for proper referential integrity
  target_cash_account_id uuid [ref: > finance_cash_accounts.id, note: 'NULL if targeting investment']
  target_investment_id uuid [ref: > finance_investments.id, note: 'NULL if targeting cash account']
  allocation_type varchar(10) [not null, note: 'percentage or fixed']
  allocation_value numeric(15,4) [not null, note: '0-100 for %, or fixed amount']
  created_at timestamptz [not null, default: `now()`]

  indexes {
    income_id
    target_cash_account_id
    target_investment_id
  }
}

Table finance_cash_accounts {
  id uuid [pk, default: `gen_random_uuid()`]
  user_id varchar [not null]
  name varchar [not null]
  balance numeric [not null]
  interest_rate numeric [default: 1.5]
  bank_name varchar
  account_type varchar [note: 'checking, savings, money_market']
  is_accumulator boolean [not null, default: false]
  start_date timestamptz [not null]
  end_date timestamptz
  notes text
  growth_strategy varchar
  growth_metadata jsonb
  created_at timestamptz [not null, default: `now()`]
  updated_at timestamptz [not null, default: `now()`]
}

Table finance_investments {
  id uuid [pk, default: `gen_random_uuid()`]
  user_id varchar [not null]
  parent_id uuid
  name text [not null]
  category varchar [not null]
  current_value numeric(15,4) [not null]
  annual_growth_rate numeric(6,4)
  start_date timestamptz [not null]
  end_date timestamptz
  notes text
  growth_strategy varchar
  growth_metadata jsonb
  created_at timestamptz [not null, default: `now()`]
  updated_at timestamptz [not null, default: `now()`]

  indexes {
    (parent_id, start_date) [unique]
  }
}

Table finance_expenses {
  id uuid [pk, default: `gen_random_uuid()`]
  user_id varchar [not null]
  parent_id uuid
  payee text [not null]
  amount numeric(15,4) [not null]
  frequency varchar [not null]
  start_date timestamptz [not null]
  end_date timestamptz
  category varchar [not null]
  growth_rate numeric(6,4) [default: 2.0]
  growth_strategy varchar [default: 'annual_step']
  growth_metadata jsonb
  notes text
  updated_at timestamptz [not null, default: `now()`]
  // SOURCE relationship (where expense comes FROM)
  source_liability_id uuid [ref: > finance_liabilities.id]

  indexes {
    (parent_id, start_date) [unique]
    source_liability_id
  }
}

Table finance_liabilities {
  id uuid [pk, default: `gen_random_uuid()`]
  user_id varchar [not null]
  parent_id uuid
  name text [not null]
  category varchar [not null]
  current_balance numeric(15,4) [not null]
  interest_rate_apr numeric(6,4)
  minimum_payment numeric
  start_date timestamptz [not null]
  end_date timestamptz
  notes text
  growth_strategy varchar
  growth_metadata jsonb
  updated_at timestamptz [not null, default: `now()`]

  indexes {
    (parent_id, start_date) [unique]
  }
}

// ============ RELATIONSHIPS ============

// income_allocations -> finance_incomes (DB-level FK with CASCADE)
Ref: income_allocations.income_id > finance_incomes.id [delete: cascade]

// income_allocations -> finance_cash_accounts (DB-level FK with CASCADE)
Ref: income_allocations.target_cash_account_id > finance_cash_accounts.id [delete: cascade]

// income_allocations -> finance_investments (DB-level FK with CASCADE)
Ref: income_allocations.target_investment_id > finance_investments.id [delete: cascade]

// finance_expenses -> finance_liabilities (DB-level FK with CASCADE)
Ref: finance_expenses.source_liability_id > finance_liabilities.id [delete: cascade]

// POLYMORPHIC RELATIONSHIPS (app-level enforcement for SOURCE only)
// finance_incomes.source_id -> finance_investments.id (when source_type = 'investment')
// finance_incomes.source_id -> finance_cash_accounts.id (when source_type = 'cash_account')
```

## Visual ERD

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                                    ENTITY RELATIONSHIP DIAGRAM                           │
└─────────────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────┐         ┌─────────────────────────┐
│   finance_investments   │         │  finance_cash_accounts  │
├─────────────────────────┤         ├─────────────────────────┤
│ PK id            uuid   │         │ PK id            uuid   │
│    user_id       varchar│         │    user_id       varchar│
│    parent_id     uuid   │         │    name          varchar│
│    name          text   │         │    balance       numeric│
│    category      varchar│         │    interest_rate numeric│
│    current_value numeric│         │    bank_name     varchar│
│    annual_growth numeric│         │    account_type  varchar│
│    start_date    tstz   │         │    is_accumulator bool  │
│    end_date      tstz   │         │    start_date    tstz   │
│    notes         text   │         │    end_date      tstz   │
│    growth_strat  varchar│         │    notes         text   │
│    growth_meta   jsonb  │         │    growth_strat  varchar│
│    created_at    tstz   │         │    growth_meta   jsonb  │
│    updated_at    tstz   │         │    created_at    tstz   │
└───────────┬─────────────┘         │    updated_at    tstz   │
            │                       └───────────┬─────────────┘
            │ source_type='investment'          │ source_type='cash_account'
            │ (polymorphic)                     │ (polymorphic)
            │                                   │
            └───────────────┬───────────────────┘
                            │
                            ▼ SOURCE (where income comes FROM)
            ┌───────────────────────────────┐
            │       finance_incomes         │
            ├───────────────────────────────┤
            │ PK id                 uuid    │
            │    user_id            varchar │
            │    parent_id          uuid    │
            │    source             text    │
            │    amount             numeric │
            │    frequency          varchar │
            │    start_date         tstz    │
            │    end_date           tstz    │
            │    category           varchar │
            │    growth_rate        numeric │
            │    growth_strategy    varchar │
            │    growth_metadata    jsonb   │
            │    notes              text    │
            │    cpf_wage_type      varchar │
            │    updated_at         tstz    │
            │ ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄ │
            │ FK source_type        varchar │◄── 'investment' | 'cash_account'
            │ FK source_id          uuid    │◄── polymorphic FK (app-enforced)
            └───────────────┬───────────────┘
                            │
                            │ 1:many (CASCADE DELETE)
                            ▼
            ┌───────────────────────────────┐
            │     income_allocations        │
            ├───────────────────────────────┤
            │ PK id                 uuid    │
            │ FK income_id          uuid    │──► finance_incomes.id (CASCADE)
            │ FK target_cash_account_id     │──► finance_cash_accounts.id (CASCADE)
            │ FK target_investment_id       │──► finance_investments.id (CASCADE)
            │    allocation_type    varchar │◄── 'percentage' | 'fixed'
            │    allocation_value   numeric │
            │    created_at         tstz    │
            └───────────────┬───────────────┘
                            │
                            │ DESTINATION (where income goes TO)
                            │ Exactly one of target_*_id must be non-null
            ┌───────────────┴───────────────┐
            │                               │
            ▼                               ▼
┌─────────────────────────┐         ┌─────────────────────────┐
│  finance_cash_accounts  │         │   finance_investments   │
│     (receives funds)    │         │     (receives funds)    │
└─────────────────────────┘         └─────────────────────────┘


═══════════════════════════════════════════════════════════════════════════════════════════

                         EXPENSE ↔ LIABILITY RELATIONSHIP
                         ═════════════════════════════════

┌─────────────────────────┐                 ┌─────────────────────────┐
│   finance_liabilities   │                 │     finance_expenses    │
├─────────────────────────┤                 ├─────────────────────────┤
│ PK id            uuid   │─ ─ ─ ─ ─ ─ ─ ─ ►│ PK id            uuid   │
│    user_id       varchar│   referenced    │    user_id       varchar│
│    parent_id     uuid   │   by FK         │    parent_id     uuid   │
│    name          text   │                 │    payee         text   │
│    category      varchar│                 │    amount        numeric│
│    current_balance num  │                 │    frequency     varchar│
│    interest_rate  num   │                 │    start_date    tstz   │
│    minimum_payment num  │                 │    end_date      tstz   │
│    start_date    tstz   │                 │    category      varchar│
│    end_date      tstz   │                 │    growth_rate   numeric│
│    notes         text   │                 │    growth_strat  varchar│
│    growth_strat  varchar│                 │    growth_meta   jsonb  │
│    growth_meta   jsonb  │                 │    notes         text   │
│    updated_at    tstz   │                 │    updated_at    tstz   │
└─────────────────────────┘                 │ ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄ │
         │                                  │ FK source_liability_id  │──┐
         │                                  └─────────────────────────┘  │
         │                                                               │
         └───────────────────────────────────────────────────────────────┘
                              ON DELETE CASCADE
                              (delete liability → expenses deleted too)
```

## Example Flows

### Example 1: Salary with multiple destinations

```
Salary Income ($10,000/month)
     │
     │ source_type: NULL (no source - external income)
     │ source_id: NULL
     │
     └──► income_allocations:
            ├── 60% → Checking Account (target_cash_account_id = <checking_id>)
            ├── 30% → Savings Account (target_cash_account_id = <savings_id>)
            └── 10% → Stock Portfolio (target_investment_id = <stock_id>)
```

### Example 2: Dividend with source AND destination

```
Stock Investment ────► Dividend Income ($500/month) ────► income_allocations:
     │                        │                              ├── 50% → Savings (target_cash_account_id)
     │                        │                              └── 50% → Checking (target_cash_account_id)
     │                        │
     └── source_type: 'investment'
         source_id: <stock_investment_id>
```

### Example 3: Interest income (source only, no allocation)

```
Savings Account ────► Interest Income ($50/month)
     │                        │
     │                        └── Goes to accumulator by default
     │                            (no allocations defined)
     │
     └── source_type: 'cash_account'
         source_id: <savings_account_id>
```

## Schema

### Existing: `finance_incomes` table (SOURCE relationship)

```sql
-- Already implemented
ALTER TABLE finance_incomes
ADD COLUMN source_type VARCHAR(20), -- 'investment' or 'cash_account'
ADD COLUMN source_id UUID;
```

### New: `income_allocations` table (DESTINATION relationship)

```sql
-- Uses separate nullable FK columns for proper referential integrity
CREATE TABLE income_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  income_id UUID NOT NULL REFERENCES finance_incomes(id) ON DELETE CASCADE,

  -- Target: exactly one must be non-null (enforced by CHECK constraint)
  target_cash_account_id UUID REFERENCES finance_cash_accounts(id) ON DELETE CASCADE,
  target_investment_id UUID REFERENCES finance_investments(id) ON DELETE CASCADE,

  allocation_type VARCHAR(10) NOT NULL,  -- 'percentage' or 'fixed'
  allocation_value NUMERIC(15,4) NOT NULL,  -- percentage (0-100) or fixed amount
  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT chk_allocation_type CHECK (allocation_type IN ('percentage', 'fixed')),
  CONSTRAINT chk_exactly_one_target CHECK (
    (target_cash_account_id IS NOT NULL)::int +
    (target_investment_id IS NOT NULL)::int = 1
  ),
  CONSTRAINT chk_percentage_range CHECK (
    allocation_type != 'percentage' OR (allocation_value >= 0 AND allocation_value <= 100)
  ),
  CONSTRAINT chk_allocation_value_positive CHECK (allocation_value > 0)
);

CREATE INDEX idx_income_allocations_income ON income_allocations(income_id);
CREATE INDEX idx_income_allocations_cash_account ON income_allocations(target_cash_account_id) WHERE target_cash_account_id IS NOT NULL;
CREATE INDEX idx_income_allocations_investment ON income_allocations(target_investment_id) WHERE target_investment_id IS NOT NULL;
```

## Full Table Definitions

### `finance_incomes`

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | NOT NULL | gen_random_uuid() | Primary key |
| `user_id` | VARCHAR | NOT NULL | | User ownership |
| `parent_id` | UUID | NULL | | For effective dating/versioning |
| `source` | TEXT | NOT NULL | | Name/description of income source |
| `amount` | NUMERIC(15,4) | NOT NULL | | Per-period amount |
| `frequency` | VARCHAR | NOT NULL | | 'annual', 'monthly', 'quarterly', 'weekly', 'daily', 'one_time' |
| `start_date` | TIMESTAMPTZ | NOT NULL | | When income starts |
| `end_date` | TIMESTAMPTZ | NULL | | When income ends (NULL = ongoing) |
| `category` | VARCHAR | NOT NULL | | Income category |
| `growth_rate` | NUMERIC(6,4) | NULL | 3.0 | Annual growth rate % |
| `growth_strategy` | VARCHAR | NULL | 'annual_step' | Growth calculation method |
| `growth_metadata` | JSONB | NULL | | Additional growth parameters |
| `notes` | TEXT | NULL | | User notes |
| `cpf_wage_type` | VARCHAR | NULL | | 'ow' or 'aw' for CPF calculation |
| `updated_at` | TIMESTAMPTZ | NOT NULL | NOW() | Last update timestamp |
| **`source_type`** | VARCHAR(20) | NULL | | **'investment' or 'cash_account'** |
| **`source_id`** | UUID | NULL | | **FK to source entity (polymorphic)** |

**Constraints:**
- `PRIMARY KEY (id)`
- `UNIQUE (parent_id, start_date)`
- `CHECK ((source_type IS NULL AND source_id IS NULL) OR (source_type IS NOT NULL AND source_id IS NOT NULL))`
- `CHECK (source_type IN ('investment', 'cash_account') OR source_type IS NULL)`

---

### `income_allocations`

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | NOT NULL | gen_random_uuid() | Primary key |
| `income_id` | UUID | NOT NULL | | FK to finance_incomes |
| `target_cash_account_id` | UUID | NULL | | FK to finance_cash_accounts |
| `target_investment_id` | UUID | NULL | | FK to finance_investments |
| `allocation_type` | VARCHAR(10) | NOT NULL | | 'percentage' or 'fixed' |
| `allocation_value` | NUMERIC(15,4) | NOT NULL | | Percentage (0-100) or fixed amount |
| `created_at` | TIMESTAMPTZ | NOT NULL | NOW() | Creation timestamp |

**Constraints:**
- `PRIMARY KEY (id)`
- `FOREIGN KEY (income_id) REFERENCES finance_incomes(id) ON DELETE CASCADE`
- `FOREIGN KEY (target_cash_account_id) REFERENCES finance_cash_accounts(id) ON DELETE CASCADE`
- `FOREIGN KEY (target_investment_id) REFERENCES finance_investments(id) ON DELETE CASCADE`
- `CHECK (allocation_type IN ('percentage', 'fixed'))`
- `CHECK ((target_cash_account_id IS NOT NULL)::int + (target_investment_id IS NOT NULL)::int = 1)`
- `CHECK (allocation_type != 'percentage' OR (allocation_value >= 0 AND allocation_value <= 100))`
- `CHECK (allocation_value > 0)`

**Indexes:**
- `idx_income_allocations_income ON (income_id)`
- `idx_income_allocations_cash_account ON (target_cash_account_id) WHERE target_cash_account_id IS NOT NULL`
- `idx_income_allocations_investment ON (target_investment_id) WHERE target_investment_id IS NOT NULL`

---

### `finance_cash_accounts`

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | NOT NULL | gen_random_uuid() | Primary key |
| `user_id` | VARCHAR | NOT NULL | | User ownership |
| `name` | VARCHAR | NOT NULL | | Account name |
| `balance` | NUMERIC | NOT NULL | | Current balance |
| `interest_rate` | NUMERIC | NULL | 1.5 | Annual interest rate % |
| `bank_name` | VARCHAR | NULL | | Bank name |
| `account_type` | VARCHAR | NULL | | 'checking', 'savings', 'money_market' |
| `is_accumulator` | BOOLEAN | NOT NULL | false | Is this the default accumulator? |
| `start_date` | TIMESTAMPTZ | NOT NULL | | When account starts |
| `end_date` | TIMESTAMPTZ | NULL | | When account ends |
| `notes` | TEXT | NULL | | User notes |
| `growth_strategy` | VARCHAR | NULL | | Growth calculation method |
| `growth_metadata` | JSONB | NULL | | Additional growth parameters |
| `created_at` | TIMESTAMPTZ | NOT NULL | NOW() | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | NOT NULL | NOW() | Last update timestamp |

**Constraints:**
- `PRIMARY KEY (id)`
- `UNIQUE (user_id) WHERE is_accumulator = true` (partial unique index)

---

### `finance_investments`

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | NOT NULL | gen_random_uuid() | Primary key |
| `user_id` | VARCHAR | NOT NULL | | User ownership |
| `parent_id` | UUID | NULL | | For effective dating/versioning |
| `name` | TEXT | NOT NULL | | Investment name |
| `category` | VARCHAR | NOT NULL | | Investment category |
| `current_value` | NUMERIC(15,4) | NOT NULL | | Current market value |
| `annual_growth_rate` | NUMERIC(6,4) | NULL | | Expected annual return % |
| `start_date` | TIMESTAMPTZ | NOT NULL | | When investment starts |
| `end_date` | TIMESTAMPTZ | NULL | | When investment ends |
| `notes` | TEXT | NULL | | User notes |
| `growth_strategy` | VARCHAR | NULL | | Growth calculation method |
| `growth_metadata` | JSONB | NULL | | Additional growth parameters |
| `created_at` | TIMESTAMPTZ | NOT NULL | NOW() | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | NOT NULL | NOW() | Last update timestamp |

**Constraints:**
- `PRIMARY KEY (id)`
- `UNIQUE (parent_id, start_date)`

---

## Foreign Key Relationships Summary

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         FOREIGN KEY RELATIONSHIPS                                │
└─────────────────────────────────────────────────────────────────────────────────┘

  finance_incomes
  ├── source_type + source_id ──────► finance_investments (polymorphic, app-enforced)
  │                            └────► finance_cash_accounts (polymorphic, app-enforced)
  │
  └── id ◄────────────────────────── income_allocations.income_id (FK, CASCADE DELETE)

  income_allocations
  ├── income_id ────────────────────► finance_incomes.id (FK, CASCADE DELETE)
  │
  ├── target_cash_account_id ──────► finance_cash_accounts.id (FK, CASCADE DELETE)
  │                                  (DB-ENFORCED)
  │
  └── target_investment_id ────────► finance_investments.id (FK, CASCADE DELETE)
                                     (DB-ENFORCED)


  CASCADE DELETE BEHAVIOR:
  ════════════════════════

  Delete finance_incomes record
       └──► Auto-deletes all income_allocations (DB-level CASCADE)

  Delete finance_investments record
       ├──► Auto-deletes finance_incomes where source_type='investment' (app-level)
       └──► Auto-deletes income_allocations where target_investment_id (DB-level CASCADE) ✓

  Delete finance_cash_accounts record
       ├──► Auto-deletes finance_incomes where source_type='cash_account' (app-level)
       └──► Auto-deletes income_allocations where target_cash_account_id (DB-level CASCADE) ✓
```

## Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| **Separate nullable FK columns** for destinations | Enables real DB-level FK constraints and automatic CASCADE DELETE |
| CHECK constraint for exactly one target | Ensures exactly one of `target_cash_account_id` or `target_investment_id` is set |
| ON DELETE CASCADE on all FKs | When parent entity is deleted, related allocations are auto-deleted by DB |
| No sum validation for percentages | User controls allocation strategy; remainder goes to accumulator |
| Supports both percentage and fixed amounts | Flexibility for different allocation strategies |
| Polymorphic FK for SOURCE only | SOURCE relationship uses polymorphic pattern (simpler, less critical for integrity) |
| Partial indexes on nullable FK columns | Efficient lookups on sparse columns |
