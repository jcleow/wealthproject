# Cash Accumulation Feature - Complete Specification

## Problem Statement

Currently, `NetCash = Income - Expenses` is calculated but NOT accumulated. If a user has no assets or liabilities, their net worth stays flat because there's nowhere for savings to go.

Per the existing spec (`specs/cashflow-projection-spec.txt`), step 6 states:
> "Update cash assets with surplus; if negative, draw down cash to zero and flag deficit"

This is not implemented - the projection engine only calculates annual net cash flow without carrying it forward.

---

## Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Default behavior | Auto-create "Cash Savings" account | User shouldn't need to set up an account to see accumulation |
| Distribution method | Single accumulator account | Simplest approach; multiple accounts/allocation can be added later |
| Data model | **New `cash_accounts` table** | Separate from `finance_assets` for clean domain model; keeps `finance_assets` for other asset types (investments, property) until migrated |
| Deficit handling | Allow negative cash | Like overdraft; user can see when they'd go into debt |
| UI | Include "Set as Accumulator" toggle | Let users control which cash account receives surplus |

**Migration Strategy:**
- Create new `cash_accounts` table for cash/liquid assets
- Keep `finance_assets` for non-cash assets (investments, property, etc.)
- Timeline projection queries both tables for net worth
- Future: migrate other asset types to separate tables (investments, properties)

---

## Detailed Implementation

### 1. Database Schema

**Migration: `backend/migrations/YYYYMMDD_create_cash_accounts.up.sql`**

```sql
-- New table for cash/liquid accounts (separate from finance_assets)
CREATE TABLE cash_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    balance NUMERIC NOT NULL DEFAULT 0,
    interest_rate NUMERIC NOT NULL DEFAULT 1.5,
    bank_name VARCHAR(255),
    account_type VARCHAR(50),  -- 'checking', 'savings', 'money_market'
    is_accumulator BOOLEAN NOT NULL DEFAULT FALSE,
    start_year INT NOT NULL DEFAULT 0,
    end_year INT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Only one accumulator account per user
CREATE UNIQUE INDEX cash_accounts_accumulator_idx
ON cash_accounts (user_id) WHERE is_accumulator = TRUE;

-- Index for user queries
CREATE INDEX cash_accounts_user_id_idx ON cash_accounts (user_id);

COMMENT ON TABLE cash_accounts IS
'Cash and liquid accounts - receives accumulated surplus from income minus expenses';
```

**Down migration:**
```sql
DROP TABLE IF EXISTS cash_accounts;
```

---

### 2. Repository Layer

**New file: `backend/internal/financial/repository/cash_accounts.go`**

#### New CashAccount struct:
```go
type CashAccount struct {
    ID            string        `json:"id"`
    UserID        string        `json:"userId"`
    Name          string        `json:"name"`
    Balance       float64       `json:"balance"`
    InterestRate  float64       `json:"interestRate"`
    BankName      string        `json:"bankName,omitempty"`
    AccountType   string        `json:"accountType,omitempty"`  // checking, savings, money_market
    IsAccumulator bool          `json:"isAccumulator"`
    StartYear     int           `json:"startYear"`
    EndYear       sql.NullInt32 `json:"endYear,omitempty"`
    Notes         string        `json:"notes,omitempty"`
    CreatedAt     time.Time     `json:"createdAt"`
    UpdatedAt     time.Time     `json:"updatedAt"`
}
```

#### CRUD methods:
```go
// ListCashAccounts returns all cash accounts for a user
func (s *Store) ListCashAccounts(ctx context.Context, userID string) ([]CashAccount, error) {
    rows, err := s.db.QueryContext(ctx, `
        SELECT id, user_id, name, balance, interest_rate, bank_name, account_type,
               is_accumulator, start_year, end_year, notes, created_at, updated_at
        FROM cash_accounts
        WHERE user_id = $1
        ORDER BY created_at`, userID)
    // ... scan into []CashAccount
}

// GetAccumulatorAccount returns the user's accumulator cash account
func (s *Store) GetAccumulatorAccount(ctx context.Context, userID string) (CashAccount, error) {
    row := s.db.QueryRowContext(ctx, `
        SELECT id, user_id, name, balance, interest_rate, bank_name, account_type,
               is_accumulator, start_year, end_year, notes, created_at, updated_at
        FROM cash_accounts
        WHERE user_id = $1 AND is_accumulator = true
        LIMIT 1`, userID)
    // ... scan into CashAccount
}

// CreateCashAccount creates a new cash account
func (s *Store) CreateCashAccount(ctx context.Context, account CashAccount) (CashAccount, error) {
    row := s.db.QueryRowContext(ctx, `
        INSERT INTO cash_accounts (user_id, name, balance, interest_rate, bank_name,
                                   account_type, is_accumulator, start_year, end_year, notes)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING id, created_at, updated_at`,
        account.UserID, account.Name, account.Balance, account.InterestRate,
        account.BankName, account.AccountType, account.IsAccumulator,
        account.StartYear, account.EndYear, account.Notes)
    // ... scan and return
}

// SetAccumulatorAccount marks a cash account as the accumulator (clears existing)
func (s *Store) SetAccumulatorAccount(ctx context.Context, userID, accountID string) error {
    tx, err := s.db.BeginTx(ctx, nil)
    if err != nil {
        return err
    }
    defer tx.Rollback()

    // Clear existing accumulator
    _, err = tx.ExecContext(ctx, `
        UPDATE cash_accounts SET is_accumulator = false
        WHERE user_id = $1 AND is_accumulator = true`, userID)
    if err != nil {
        return err
    }

    // Set new accumulator
    result, err := tx.ExecContext(ctx, `
        UPDATE cash_accounts SET is_accumulator = true
        WHERE user_id = $1 AND id = $2`, userID, accountID)
    if err != nil {
        return err
    }

    if affected, _ := result.RowsAffected(); affected == 0 {
        return ErrNotFound
    }
    return tx.Commit()
}
```

**Note:** `finance_assets` remains unchanged - continues to store non-cash assets (investments, property).

---

### 3. Timeline Types

**File: `backend/internal/financial/timeline/types.go`**

#### Update TimelineYear struct:
```go
type TimelineYear struct {
    Year          int             `json:"year"`
    Assets        []TimelineItem  `json:"assets"`         // Non-cash assets from finance_assets
    CashAccounts  []TimelineItem  `json:"cashAccounts"`   // NEW: from cash_accounts table
    Liabilities   []TimelineItem  `json:"liabilities"`
    Income        []TimelineItem  `json:"income"`
    Expenses      []TimelineItem  `json:"expenses"`
    NetCash       float64         `json:"netCash"`        // Keep for backward compat
    NetWorth      float64         `json:"netWorth"`       // Now includes cash_accounts + assets
    HasOverrides  bool            `json:"hasOverrides"`
    GrowthApplied []GrowthApplied `json:"growthApplied"`

    // NEW: Cash accumulation tracking
    AnnualNetSavings     float64 `json:"annualNetSavings"`     // Income - Expenses for this year
    AccumulatedCashStart float64 `json:"accumulatedCashStart"` // Cash balance at start of year
    AccumulatedCashEnd   float64 `json:"accumulatedCashEnd"`   // Cash balance at end of year
    InterestEarned       float64 `json:"interestEarned"`       // Interest earned this year
    AccumulatorAccountID string  `json:"accumulatorAccountId,omitempty"`
}
```

#### Update TimelineItem struct:
```go
type TimelineItem struct {
    // ... existing fields ...
    IsAccumulator bool `json:"isAccumulator,omitempty"` // NEW: true if this is the accumulator cash account
}
```

#### Update Store interface:
```go
type Store interface {
    // ... existing methods ...

    // NEW: Cash account methods
    ListCashAccounts(context.Context, string) ([]repository.CashAccount, error)
    GetAccumulatorAccount(context.Context, string) (repository.CashAccount, error)
    CreateCashAccount(context.Context, repository.CashAccount) (repository.CashAccount, error)
    SetAccumulatorAccount(context.Context, string, string) error
}
```

---

### 4. Timeline Service - Core Logic

**File: `backend/internal/financial/timeline/service.go`**

#### New helper function:
```go
// ensureAccumulatorAccount ensures user has an accumulator cash account.
// Creates one if none exists.
func (s *Service) ensureAccumulatorAccount(ctx context.Context, userID string) (repository.CashAccount, error) {
    // 1. Try to get existing accumulator
    acc, err := s.store.GetAccumulatorAccount(ctx, userID)
    if err == nil {
        return acc, nil
    }
    if !errors.Is(err, repository.ErrNotFound) {
        return repository.CashAccount{}, err
    }

    // 2. No accumulator - check if any cash account exists
    accounts, err := s.store.ListCashAccounts(ctx, userID)
    if err != nil {
        return repository.CashAccount{}, err
    }

    if len(accounts) > 0 {
        // Mark first cash account as accumulator
        if err := s.store.SetAccumulatorAccount(ctx, userID, accounts[0].ID); err != nil {
            return repository.CashAccount{}, err
        }
        accounts[0].IsAccumulator = true
        return accounts[0], nil
    }

    // 3. No cash accounts exist - create default
    defaultAccount, err := s.store.CreateCashAccount(ctx, repository.CashAccount{
        UserID:        userID,
        Name:          "Cash Savings",
        Balance:       0,
        InterestRate:  1.5,  // Default interest rate
        IsAccumulator: true,
        StartYear:     0,
    })
    if err != nil {
        return repository.CashAccount{}, err
    }

    return defaultAccount, nil
}
```

#### Modified buildTimeline() - key changes:

```go
func (s *Service) buildTimeline(ctx context.Context, userID string) (TimelineResponse, error) {
    growthCfg, err := s.ensureGrowth(ctx, userID)
    if err != nil {
        return TimelineResponse{}, err
    }

    // NEW: Ensure accumulator cash account exists
    accumulator, err := s.ensureAccumulatorAccount(ctx, userID)
    if err != nil {
        return TimelineResponse{}, err
    }

    // NEW: Load all cash accounts
    cashAccounts, err := s.store.ListCashAccounts(ctx, userID)
    if err != nil {
        return TimelineResponse{}, err
    }

    // Load non-cash assets from finance_assets (exclude category='cash')
    rows, err := s.loadEffectiveRows(ctx, userID)  // filter out cash category
    if err != nil {
        return TimelineResponse{}, err
    }

    // ... existing row grouping logic for non-cash assets ...

    // NEW: Track accumulated cash (starts from accumulator's balance)
    accumulatedCash := accumulator.Balance
    cashGrowthRate := accumulator.InterestRate

    years := make([]TimelineYear, totalYears)
    for year := 0; year < totalYears; year++ {
        cashAtStart := accumulatedCash

        // ... existing expire/growth/override logic for non-cash assets ...

        yearItems := segregateItems(state, year)

        // Calculate annual net savings
        annualNetSavings := sumAnnual(yearItems.Income) - sumAnnual(yearItems.Expenses)

        // NEW: Accumulate surplus into cash
        accumulatedCash += annualNetSavings

        // NEW: Apply interest to accumulated cash
        interestEarned := accumulatedCash * (cashGrowthRate / 100.0)
        accumulatedCash += interestEarned

        // NEW: Build cash account items for this year
        cashItems := buildCashItems(cashAccounts, accumulator.ID, accumulatedCash, year)

        // NetWorth = non-cash assets + cash accounts - liabilities
        totalCash := sumCashAccounts(cashItems)
        totalAssets := sumAnnual(yearItems.Assets)
        netWorth := totalAssets + totalCash - sumAnnual(yearItems.Liabilities)

        years[year] = TimelineYear{
            Year:          year,
            Assets:        yearItems.Assets,      // Non-cash assets
            CashAccounts:  cashItems,             // NEW: Cash accounts
            Liabilities:   yearItems.Liabilities,
            Income:        yearItems.Income,
            Expenses:      yearItems.Expenses,
            NetCash:       annualNetSavings,
            NetWorth:      netWorth,
            HasOverrides:  hasOverride,
            GrowthApplied: toGrowthApplied(growthCfg),

            // NEW fields
            AnnualNetSavings:     annualNetSavings,
            AccumulatedCashStart: cashAtStart,
            AccumulatedCashEnd:   accumulatedCash,
            InterestEarned:       interestEarned,
            AccumulatorAccountID: accumulator.ID,
        }
    }

    return TimelineResponse{Years: years, Version: defaultVersion}, nil
}

// buildCashItems converts cash accounts to timeline items, updating accumulator with current balance
func buildCashItems(accounts []repository.CashAccount, accumulatorID string, accumulatedBalance float64, year int) []TimelineItem {
    items := make([]TimelineItem, 0, len(accounts))
    for _, acc := range accounts {
        balance := acc.Balance
        isAccumulator := acc.ID == accumulatorID

        if isAccumulator {
            balance = accumulatedBalance  // Use accumulated value
        } else {
            // Apply interest to non-accumulator accounts
            balance = acc.Balance * math.Pow(1 + acc.InterestRate/100, float64(year))
        }

        items = append(items, TimelineItem{
            ItemID:        acc.ID,
            Name:          acc.Name,
            Category:      "cash",
            AmountAnnual:  balance,
            IsAccumulator: isAccumulator,
        })
    }
    return items
}
```

---

### 5. Cash Accumulation Algorithm

```
ALGORITHM: BuildTimelineWithCashAccumulation

INPUT: userID, growthConfigs
OUTPUT: TimelineResponse with accumulated cash projections

1. ENSURE ACCUMULATOR ACCOUNT
   a. Query cash_accounts WHERE is_accumulator=true
   b. If not found, query any cash account and mark first one as accumulator
   c. If none exist, CREATE "Cash Savings" with balance=0, is_accumulator=true

2. LOAD DATA
   a. Load all cash_accounts for user
   b. Load non-cash assets from finance_assets (for net worth)
   c. Load liabilities, income, expenses (existing)

3. INITIALIZE
   accumulatedCash = accumulator.balance
   cashGrowthRate = accumulator.interest_rate

4. FOR year = 0 TO 30:
   a. cashAtStart = accumulatedCash

   b. [Existing logic: expire items, apply growth for non-cash assets]

   c. SEGREGATE items by type (Assets, Liabilities, Income, Expenses)

   d. CALCULATE annual savings:
      annualNetSavings = sum(Income) - sum(Expenses)

   e. ACCUMULATE into accumulator:
      accumulatedCash = accumulatedCash + annualNetSavings

   f. APPLY INTEREST:
      interestEarned = accumulatedCash * (cashGrowthRate / 100)
      accumulatedCash = accumulatedCash + interestEarned

   g. BUILD cash account items:
      - Accumulator uses accumulatedCash as balance
      - Other cash accounts apply their own interest rates

   h. CALCULATE NET WORTH:
      netWorth = sum(Assets) + sum(CashAccounts) - sum(Liabilities)

   i. BUILD TimelineYear with all fields

5. RETURN TimelineResponse
```

---

### 6. API Endpoints

**New file: `backend/cmd/server/handlers/cash_accounts.go`**

```go
// GET /api/v1/financial/cash-accounts
func (h *Handler) HandleListCashAccounts(w http.ResponseWriter, r *http.Request) {
    userID := r.Context().Value("userID").(string)
    accounts, err := h.store.ListCashAccounts(r.Context(), userID)
    if err != nil {
        http.Error(w, err.Error(), http.StatusInternalServerError)
        return
    }
    json.NewEncoder(w).Encode(accounts)
}

// POST /api/v1/financial/cash-accounts
func (h *Handler) HandleCreateCashAccount(w http.ResponseWriter, r *http.Request) {
    userID := r.Context().Value("userID").(string)
    var req repository.CashAccount
    if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
        http.Error(w, err.Error(), http.StatusBadRequest)
        return
    }
    req.UserID = userID
    account, err := h.store.CreateCashAccount(r.Context(), req)
    if err != nil {
        http.Error(w, err.Error(), http.StatusInternalServerError)
        return
    }
    w.WriteHeader(http.StatusCreated)
    json.NewEncoder(w).Encode(account)
}

// PUT /api/v1/financial/cash-accounts/{id}/set-accumulator
func (h *Handler) HandleSetAccumulator(w http.ResponseWriter, r *http.Request) {
    userID := r.Context().Value("userID").(string)
    accountID := chi.URLParam(r, "id")

    if err := h.store.SetAccumulatorAccount(r.Context(), userID, accountID); err != nil {
        if errors.Is(err, repository.ErrNotFound) {
            http.Error(w, "Cash account not found", http.StatusNotFound)
            return
        }
        http.Error(w, err.Error(), http.StatusInternalServerError)
        return
    }
    json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
}
```

**Router registration:**
```go
r.Route("/api/v1/financial/cash-accounts", func(r chi.Router) {
    r.Get("/", h.HandleListCashAccounts)
    r.Post("/", h.HandleCreateCashAccount)
    r.Put("/{id}", h.HandleUpdateCashAccount)
    r.Delete("/{id}", h.HandleDeleteCashAccount)
    r.Put("/{id}/set-accumulator", h.HandleSetAccumulator)
})
```

---

### 7. Frontend Changes

#### New Cash Accounts section (separate from Assets):
- List all cash accounts with name, balance, interest rate, bank name
- Show "Accumulator" badge on the designated account
- "Set as Accumulator" button for each account

#### API client:
```typescript
interface CashAccount {
  id: string;
  name: string;
  balance: number;
  interestRate: number;
  bankName?: string;
  accountType?: string;
  isAccumulator: boolean;
}

async function listCashAccounts(): Promise<CashAccount[]> {
  const res = await fetch('/api/v1/financial/cash-accounts');
  return res.json();
}

async function createCashAccount(account: Partial<CashAccount>): Promise<CashAccount> {
  const res = await fetch('/api/v1/financial/cash-accounts', {
    method: 'POST',
    body: JSON.stringify(account),
  });
  return res.json();
}

async function setAccumulator(accountId: string): Promise<void> {
  await fetch(`/api/v1/financial/cash-accounts/${accountId}/set-accumulator`, {
    method: 'PUT',
  });
}
```

#### Timeline display:
- Show `CashAccounts` separately from `Assets` in net worth breakdown
- Highlight years where `AccumulatedCashEnd < 0` (deficit)
- Show accumulated cash growth over time

---

### 8. Edge Cases

| Case | Behavior |
|------|----------|
| No cash account exists | Auto-create "Cash Savings" with balance $0, is_accumulator=true |
| Multiple cash accounts, none is accumulator | Mark first one (by created_at) as accumulator |
| Negative cash (deficit) | Allow negative `AccumulatedCashEnd` (frontend can detect and display warning) |
| Each account has own interest rate | Accumulator uses its rate for surplus; others compound independently |
| Year 0 initial state | Start with existing balance + Year 0 surplus + interest |
| User deletes accumulator account | Next timeline build will auto-create or mark another as accumulator |
| User changes accumulator | Old account stops receiving surplus; new one starts from its balance + future surplus |
| Existing cash assets in finance_assets | Not migrated automatically; user creates new cash accounts |
| Scenario impact targets cash | Route to `cash_accounts` table when `target_type = 'cash'` |

---

## Scenario Integration

### Database: Add 'cash' to target_type
The `scenario_event_impacts` table needs to support cash as a target type:

```sql
-- Migration to add 'cash' to target_type constraint
ALTER TABLE scenario_event_impacts
DROP CONSTRAINT scenario_event_impacts_target_type_check;

ALTER TABLE scenario_event_impacts
ADD CONSTRAINT scenario_event_impacts_target_type_check
CHECK (target_type IN ('asset', 'liability', 'income', 'expense', 'cash'));
```

### Backend: Impact Resolution
When processing scenario impacts:
- If `target_type = 'cash'` and `target_id` is set → lookup in `cash_accounts` table
- If `target_type = 'cash'` and `target_id` is NULL → apply to accumulator account
- For timeline calculation, apply cash impacts the same way as asset impacts

### Frontend: Unified Asset Display
Even though `cash_accounts` is a separate table, the UI should display cash items within the Assets section:
- Timeline Assets list = `finance_assets` (category=asset) + `cash_accounts`
- Cash items should be visually distinguishable (e.g., icon or label)
- Net worth breakdown: `Assets (including Cash) - Liabilities`

### Scenario Modal Updates
When creating/editing scenario event impacts:
- Add "Cash" option to target_type dropdown alongside Asset, Liability, Income, Expense
- When "Cash" is selected, show cash accounts in the target dropdown (fetched from `/api/v1/financial/cash-accounts`)
- The impact is saved with `target_type: 'cash'` and `target_id: <cash_account_id>`

---

## Files to Modify

### Backend
| File | Changes |
|------|---------|
| `backend/migrations/YYYYMMDD_create_cash_accounts.up.sql` | **NEW** - Create `cash_accounts` table |
| `backend/migrations/YYYYMMDD_create_cash_accounts.down.sql` | **NEW** - Drop table |
| `backend/migrations/YYYYMMDD_add_cash_target_type.up.sql` | **NEW** - Add 'cash' to scenario_event_impacts target_type |
| `backend/migrations/YYYYMMDD_add_cash_target_type.down.sql` | **NEW** - Revert target_type constraint |
| `backend/internal/financial/repository/cash_accounts.go` | **NEW** - CashAccount struct and CRUD methods |
| `backend/internal/financial/repository/store.go` | Add cash account methods to Store interface |
| `backend/internal/financial/repository/scenario_events.go` | Handle `target_type = 'cash'` in impact resolution |
| `backend/internal/financial/timeline/types.go` | Add CashAccounts to TimelineYear, accumulation fields |
| `backend/internal/financial/timeline/service.go` | Add `ensureAccumulatorAccount`, modify `buildTimeline`, apply cash impacts |
| `backend/internal/financial/timeline/service_test.go` | Add tests, update stubStore |
| `backend/cmd/server/handlers/cash_accounts.go` | **NEW** - Cash account handlers |
| `backend/cmd/server/routes.go` | Register `/cash-accounts` routes |

### Frontend
| File | Changes |
|------|---------|
| Cash accounts components | **NEW** - List/Create/Edit cash accounts UI |
| API client | Add cash account API functions |
| Types | Add CashAccount interface, update TimelineYear |
| Timeline display | Show CashAccounts merged into Assets section with visual distinction |
| Scenario modal | Add "Cash" to target_type dropdown, load cash accounts when selected |

---

## Testing Strategy

### Unit Tests
1. `ensureAccumulatorAccount` - creates when none exist, picks first when multiple exist
2. Cash accumulation math - verify year-over-year accumulation is correct
3. Interest calculation - verify compounding works correctly
4. Deficit handling - verify negative `AccumulatedCashEnd` when expenses exceed income + cash reserves
5. Cash items in timeline - verify cash accounts appear merged with assets in response
6. Scenario impact on cash - verify `target_type='cash'` routes to `cash_accounts` table

### Integration Tests
1. Timeline endpoint returns new fields including cash accounts in assets
2. Set-accumulator endpoint works correctly
3. Deleting accumulator account results in auto-creation on next timeline fetch
4. Scenario event with cash impact applies correctly to cash account balance

---

## Tickets

### Ticket 1: Database Migration - Create cash_accounts Table
**Type:** Backend
**Priority:** P0 (Blocker)
**Estimate:** 0.5 hours

**Description:**
Create new `cash_accounts` table for storing cash/liquid accounts separately from finance_assets.

**Acceptance Criteria:**
- [ ] Table created with columns: id, user_id, name, balance, interest_rate, bank_name, account_type, is_accumulator, start_year, end_year, notes, created_at, updated_at
- [ ] Unique index on `(user_id) WHERE is_accumulator = TRUE`
- [ ] Foreign key to users table with CASCADE delete
- [ ] Down migration drops table
- [ ] Migration runs successfully

---

### Ticket 2: Repository - Cash Account CRUD
**Type:** Backend
**Priority:** P0 (Blocker)
**Estimate:** 1.5 hours

**Description:**
Create new repository file with CashAccount struct and all CRUD operations.

**Acceptance Criteria:**
- [ ] `CashAccount` struct with all fields
- [ ] `ListCashAccounts(ctx, userID)` - list all for user
- [ ] `GetCashAccount(ctx, id)` - get single account
- [ ] `GetAccumulatorAccount(ctx, userID)` - get accumulator
- [ ] `CreateCashAccount(ctx, account)` - create new
- [ ] `UpdateCashAccount(ctx, account)` - update existing
- [ ] `DeleteCashAccount(ctx, id)` - delete
- [ ] `SetAccumulatorAccount(ctx, userID, accountID)` - set accumulator (clears existing)
- [ ] Store interface updated

---

### Ticket 3: Timeline Types Updates
**Type:** Backend
**Priority:** P0 (Blocker)
**Estimate:** 0.5 hours

**Description:**
Add CashAccounts slice to TimelineYear and accumulation tracking fields.

**Acceptance Criteria:**
- [ ] TimelineYear has: CashAccounts []TimelineItem, AnnualNetSavings, AccumulatedCashStart, AccumulatedCashEnd, InterestEarned, AccumulatorAccountID
- [ ] TimelineItem has: IsAccumulator bool
- [ ] Store interface includes cash account methods

---

### Ticket 4: Cash Accumulation in Timeline Service
**Type:** Backend
**Priority:** P0 (Blocker)
**Estimate:** 3 hours

**Description:**
Implement core cash accumulation logic. Load cash accounts, track accumulation year-over-year, compute net worth from both assets + cash accounts.

**Acceptance Criteria:**
- [ ] `ensureAccumulatorAccount` creates "Cash Savings" if no cash account exists
- [ ] Load all cash accounts separately from finance_assets
- [ ] Accumulator receives annual surplus (Income - Expenses)
- [ ] Interest applied to accumulator balance each year
- [ ] Non-accumulator accounts compound with their own interest rate
- [ ] NetWorth = sum(Assets) + sum(CashAccounts) - sum(Liabilities)
- [ ] All TimelineYear fields populated correctly

---

### Ticket 5: Cash Accounts API Endpoints
**Type:** Backend
**Priority:** P1 (High)
**Estimate:** 1.5 hours

**Description:**
Create REST endpoints for cash account management.

**Acceptance Criteria:**
- [ ] `GET /api/v1/financial/cash-accounts` - list all
- [ ] `POST /api/v1/financial/cash-accounts` - create new
- [ ] `PUT /api/v1/financial/cash-accounts/{id}` - update
- [ ] `DELETE /api/v1/financial/cash-accounts/{id}` - delete
- [ ] `PUT /api/v1/financial/cash-accounts/{id}/set-accumulator` - set as accumulator
- [ ] All routes registered with auth middleware
- [ ] Proper error handling (404, 400, 500)

---

### Ticket 6: Unit Tests for Cash Accumulation
**Type:** Backend
**Priority:** P1 (High)
**Estimate:** 2 hours

**Description:**
Add comprehensive unit tests for cash accumulation logic.

**Acceptance Criteria:**
- [ ] Test auto-creation of Cash Savings when no cash account exists
- [ ] Test marking first cash account as accumulator when none marked
- [ ] Test accumulation math over multiple years
- [ ] Test interest compounding (accumulator and non-accumulator)
- [ ] Test deficit detection (negative cash)
- [ ] Test net worth includes both assets and cash accounts
- [ ] Update stubStore with new interface methods

---

### Ticket 7: Frontend - Cash Accounts Management UI
**Type:** Frontend
**Priority:** P1 (High)
**Estimate:** 3 hours

**Description:**
Create new UI section for managing cash accounts (separate from Assets).

**Acceptance Criteria:**
- [ ] Cash accounts list showing name, balance, interest rate, bank name
- [ ] "Accumulator" badge on designated account
- [ ] Create cash account form (name, balance, interest rate, bank name, account type)
- [ ] Edit/delete functionality
- [ ] "Set as Accumulator" button
- [ ] API integration with all endpoints

---

### Ticket 8: Frontend - Update Timeline Types & Display
**Type:** Frontend
**Priority:** P2 (Medium)
**Estimate:** 1 hour

**Description:**
Update TypeScript interfaces and timeline display to show cash accounts.

**Acceptance Criteria:**
- [ ] CashAccount interface defined
- [ ] TimelineYear interface includes cashAccounts and accumulation fields
- [ ] Net worth breakdown shows cash accounts separately from assets
- [ ] Highlight years where AccumulatedCashEnd < 0 (deficit)

---

## Implementation Order

```
1. Ticket 1 (Migration)         ─┐
2. Ticket 2 (Repository)         ├─ Backend Foundation
3. Ticket 3 (Types)             ─┘
4. Ticket 4 (Service Logic)     ─── Core Feature
5. Ticket 5 (API Endpoints)     ─── API
6. Ticket 6 (Tests)             ─── Quality
7. Ticket 8 (Frontend Types)    ─┐
8. Ticket 7 (Frontend UI)       ─┴─ Frontend
```

**Total Estimate:** ~13 hours
