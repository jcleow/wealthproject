# CPF Timeline Unification Spec

## Problem Statement

The CPF Overview and Timeline display different balances for the same person at the same point in time. This causes user confusion and data inconsistency.

**Example from screenshot (Alex, September 2030):**
| Source | OA | SA | MA | Total |
|--------|-----|-----|-----|-------|
| CPF Overview | $200,984 | $89,184 | $79,913 | $370,080 |
| Timeline | $199,478 | $88,063 | $79,016 | $366,557 |
| **Difference** | ~$1,500 | ~$1,100 | ~$900 | ~$3,500 |

## Root Cause Analysis

### Two Separate Calculation Systems

**1. Timeline Service** (`backend/internal/financial_v2/timeline/service.go`)
- Uses `engine.ApplyMonthlyInterest()` only
- Processes month-by-month
- Missing 4 critical CPF lifecycle features

**2. CPF Projector** (`backend/internal/cpf/projector/projector.go`)
- Uses `engine.ProcessMonth()` with full lifecycle
- Returns yearly snapshots
- Handles all CPF lifecycle events

### Missing Features in Timeline

| Feature | Timeline | Projector |
|---------|----------|-----------|
| Contributions (OW/AW) | ✅ | ✅ |
| Interest (Base + Extra) | ✅ | ✅ |
| YTD Reset at Year Boundary | ✅ | ✅ |
| **RA Formation at Age 55** | ❌ | ✅ |
| **SA→RA Redirect at Age 55+** | ❌ | ✅ |
| **CPF LIFE Activation at Age 65-70** | ❌ | ✅ |
| **Monthly Payout Deduction** | ❌ | ✅ |
| Bequest Tracking | ❌ | ✅ |
| Custom Assumptions | ❌ | ✅ |

### Additional Bug: Hardcoded Gender

**Location:** `service.go:724`
```go
"male", // Default; update via SetGender if person data available
```

The `Person` table has a `Gender` field, but it's not being fetched and used. This affects CPF LIFE payout calculations which differ by gender.

---

## Solution Overview

Refactor the timeline's `ApplyEngineProcessing()` to use `engine.ProcessMonth()` instead of just `ApplyMonthlyInterest()`. This delegates all CPF lifecycle logic to the shared engine module.

---

## Implementation Phases

### Phase 1: Add Gender to CPFAccount (Data Layer)

**Context:** The SQL query already JOINs with persons table but doesn't select gender.

**File 1: `backend/internal/financial_v2/repository/store.go`**

Add Gender field to CPFAccount struct (around line 246):
```go
type CPFAccount struct {
    // ... existing fields ...
    PRGrantDate     *time.Time `json:"prGrantDate,omitempty"`
    Gender          string     `json:"gender"` // NEW: From persons table via JOIN
    CreatedAt       time.Time  `json:"createdAt"`
    // ...
}
```

**File 2: `backend/internal/financial_v2/repository/cpf_account.go`**

Update SQL query in `ListCPFAccounts` (around line 367):
```sql
p.pr_grant_date,
p.gender,          -- ADD THIS LINE
c.created_at,
```

Update scan function to include Gender field.

**File 3: `backend/internal/cpf/account/repository.go`**

Add Gender field to CPFAccount struct for consistency:
```go
type CPFAccount struct {
    // ... existing fields ...
    PRGrantDate      *time.Time             `json:"prGrantDate"`
    Gender           string                 `json:"gender"` // NEW
    CreatedAt        time.Time              `json:"createdAt"`
    // ...
}
```

---

### Phase 2: Use Gender in NewCPFContext

**File: `backend/internal/financial_v2/timeline/service.go:709-733`**

```go
// Before (line 724):
engineState := engine.NewCPFState(
    &cpfAccount.OABalance,
    // ...
    "male", // Default; update via SetGender if person data available
    // ...
)

// After:
engineState := engine.NewCPFState(
    &cpfAccount.OABalance,
    // ...
    cpfAccount.Gender, // From persons table via JOIN
    // ...
)
```

---

### Phase 3: Add CPF Assumptions to Context

**File: `backend/internal/financial_v2/timeline/service.go`**

Update CPFContext struct (around line 701):
```go
type CPFContext struct {
    Processor    *cpfProcessor.Processor
    Balances     *cpfProcessor.CPFBalances
    EngineState  *engine.CPFState
    Assumptions  *engine.Assumptions  // NEW: For interest rates, payout settings
    PreviousYear int                  // NEW: For YTD reset tracking
}
```

Initialize with defaults in NewCPFContext:
```go
func NewCPFContext(cpfAccount *account.CPFAccount) *CPFContext {
    // ... existing code ...
    return &CPFContext{
        Processor:    proc,
        Balances:     balances,
        EngineState:  engineState,
        Assumptions:  engine.DefaultAssumptions(), // NEW
        PreviousYear: cpfAccount.StartDate.Year(), // NEW
    }
}
```

---

### Phase 4: Refactor ApplyEngineProcessing

**File: `backend/internal/financial_v2/timeline/service.go:824-845`**

Replace current implementation:
```go
// CURRENT - Only applies interest:
func (c *CPFContext) ApplyEngineProcessing(date time.Time, applyToBalances bool) *engine.InterestResult {
    if c == nil || c.EngineState == nil || !applyToBalances {
        return nil
    }
    c.syncEngineFromProcessor()
    c.EngineState.AsOfDate = date
    interestResult := engine.ApplyMonthlyInterest(c.EngineState, nil)
    c.syncProcessorFromEngine()
    return interestResult
}
```

With full lifecycle support:
```go
// NEW - Full CPF lifecycle:
func (c *CPFContext) ApplyEngineProcessing(
    date time.Time,
    applyToBalances bool,
    contributions []contribution.ContributionResult,
) (*engine.MonthlyResult, error) {
    if c == nil || c.EngineState == nil || !applyToBalances {
        return nil, nil
    }

    c.syncEngineFromProcessor()

    monthResult, err := engine.ProcessMonth(c.EngineState, date, engine.ProcessMonthOptions{
        ApplyContributions: len(contributions) > 0,
        Contributions:      contributions,
        TargetScheme:       retirement.TargetFRS,
        PayoutStartAge:     c.Assumptions.PayoutStartAge,
        PayoutPlan:         payout.PlanStandard,
        Assumptions:        c.Assumptions,
        PreviousYear:       c.PreviousYear,
    })
    if err != nil {
        return nil, err
    }

    c.syncProcessorFromEngine()
    c.PreviousYear = date.Year()

    return monthResult, nil
}
```

---

### Phase 5: Update Calling Code

**File: `backend/internal/financial_v2/timeline/service.go`**

Update `applyAllEngineProcessing` (around line 2178):
```go
// CURRENT:
func (mctx *MonthlyContext) applyAllEngineProcessing(date time.Time, applyToBalances bool) {
    for _, cpfCtx := range mctx.CPFContexts {
        cpfCtx.ApplyEngineProcessing(date, applyToBalances)
    }
}

// NEW:
func (mctx *MonthlyContext) applyAllEngineProcessing(
    date time.Time,
    applyToBalances bool,
    contributionsByPerson map[string][]contribution.ContributionResult,
) {
    for personID, cpfCtx := range mctx.CPFContexts {
        contributions := contributionsByPerson[personID]
        cpfCtx.ApplyEngineProcessing(date, applyToBalances, contributions)
    }
}
```

Update `processMonth` call site (around line 2226):
```go
// CURRENT:
mctx.applyAllEngineProcessing(currentDate, applyContributions)

// NEW:
mctx.applyAllEngineProcessing(currentDate, applyContributions, contributionsByPerson)
```

---

### Phase 6: Refactor ProcessIncomes Flow

**Current Flow:**
1. `ProcessIncomes()` calculates contributions AND applies to processor balances
2. `ApplyEngineProcessing()` syncs from processor, applies interest only, syncs back

**New Flow:**
1. `ProcessIncomes()` calculates contributions but does NOT apply to balances (return only)
2. `ApplyEngineProcessing()` receives contributions and calls `engine.ProcessMonth()`:
   - Applies contributions (with SA→RA redirect for 55+)
   - Applies interest (base + extra)
   - Handles RA formation at 55
   - Handles CPF LIFE payouts at 65+
3. Syncs engine state back to processor balances

**Changes needed in ProcessIncomes:**
- Add `applyToBalances bool` parameter
- When `applyToBalances=false`, return contributions without applying

---

## Files Summary

| File | Change Type | Description |
|------|-------------|-------------|
| `backend/internal/financial_v2/repository/store.go` | Modify | Add Gender to CPFAccount struct |
| `backend/internal/financial_v2/repository/cpf_account.go` | Modify | Add p.gender to SQL, update scan |
| `backend/internal/cpf/account/repository.go` | Modify | Add Gender to CPFAccount struct |
| `backend/internal/financial_v2/timeline/service.go` | Modify | Main refactoring |

---

## Testing Plan

### Unit Tests
1. Test `ApplyEngineProcessing` with age < 55 (no RA formation, SA contributions to SA)
2. Test `ApplyEngineProcessing` at age 55 (RA formation, SA→RA transfer)
3. Test `ApplyEngineProcessing` with age 55-64 (SA contributions redirect to RA)
4. Test `ApplyEngineProcessing` at age 65 (CPF LIFE activation)
5. Test `ApplyEngineProcessing` with age > 65 (monthly payouts from RA)

### Integration Tests
1. Compare timeline CPF output vs projector output for same account/date
2. Verify balances match at multiple ages (30, 55, 65, 70)

### Manual Verification
```bash
# Run backend tests
go test ./backend/internal/cpf/...
go test ./backend/internal/financial_v2/timeline/...

# Start application
cd frontend && npm run dev
cd backend && go run cmd/server/main.go

# Test steps:
1. Navigate to CPF Simulation
2. Select a person (e.g., Alex)
3. Move age slider to various points
4. Compare CPF Overview balances with Timeline balances
5. Verify RA appears at age 55
6. Verify RA decreases after age 65 (payouts)
```

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Breaking existing timeline tests | Run all tests before/after, fix failures |
| Performance impact from additional calculations | ProcessMonth is already optimized; monitor but unlikely issue |
| Gender field NULL in existing data | Use COALESCE in SQL to default to 'male' |

---

## Success Criteria

1. CPF Overview balances match Timeline balances for the same person/date
2. RA formation visible at age 55 in both views
3. CPF LIFE payouts deduct from RA after age 65 in both views
4. All existing tests pass
5. Gender fetched from Person table, not hardcoded
