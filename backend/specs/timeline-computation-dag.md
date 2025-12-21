# Timeline Monthly Computation DAG Documentation

This document illustrates the computation flow for each month in the timeline service as a directed acyclic graph (DAG).

---

## High-Level DAG Visualization

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        MONTH N COMPUTATION PIPELINE                         │
└─────────────────────────────────────────────────────────────────────────────┘

                         ┌──────────────────────┐
                         │   Previous Month     │
                         │   State (Month N-1)  │
                         └──────────┬───────────┘
                                    │
                                    ▼
                    ┌───────────────────────────────┐
                    │  STEP 1: Reset CPF YTD        │
                    │  (January only, if year > 1)  │
                    └───────────────┬───────────────┘
                                    │
                                    ▼
          ┌─────────────────────────────────────────────────────┐
          │                  STEP 2: Apply Growth               │
          │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐   │
          │  │   Income    │ │   Expense   │ │   Assets    │   │
          │  │ AnnualStep  │ │ AnnualStep  │ │  Monthly    │   │
          │  │ (Jan only)  │ │ (Jan only)  │ │  Compound   │   │
          │  └─────────────┘ └─────────────┘ └─────────────┘   │
          └─────────────────────────┬───────────────────────────┘
                                    │
                                    ▼
          ┌─────────────────────────────────────────────────────┐
          │            STEP 3: Process Liabilities              │
          │                                                     │
          │   Balance ──► Strategy ──► Payment ──► New Balance  │
          │                  │                                  │
          │                  ▼                                  │
          │         Update Linked Expense (if exists)           │
          └─────────────────────────┬───────────────────────────┘
                                    │
                                    ▼
          ┌─────────────────────────────────────────────────────┐
          │          STEP 4: Apply Scenario Impacts             │
          │                                                     │
          │   ┌──────────┐   ┌──────────┐   ┌──────────┐        │
          │   │   STOP   │──►│ OVERRIDE │──►│  DELTA   │        │
          │   │(return 0)│   │ (latest) │   │(cumulate)│        │
          │   └──────────┘   └──────────┘   └──────────┘        │
          │                                                     │
          │   Base State ──────────────► Adjusted State         │
          └─────────────────────────┬───────────────────────────┘
                                    │
                                    ▼
          ┌─────────────────────────────────────────────────────┐
          │           STEP 5: Calculate CPF Contributions       │
          │                                                     │
          │   OW Income ──► ProcessOrdinaryWage ───┐            │
          │                                        ├──► CPF     │
          │   AW Income ──► ProcessAdditionalWage ─┘   Balances │
          │                                                     │
          │   Employee CPF deducted from net savings            │
          └─────────────────────────┬───────────────────────────┘
                                    │
                                    ▼
          ┌─────────────────────────────────────────────────────┐
          │         STEP 6: Calculate Cash Flow & Allocations   │
          │                                                     │
          │   Income ─────────────┐                             │
          │                       │                             │
          │   - Employee CPF ─────┼──► Net Savings              │
          │                       │         │                   │
          │   - Expenses ─────────┘         │                   │
          │                                 ▼                   │
          │                     - Investment Allocations        │
          │                                 │                   │
          │                                 ▼                   │
          │                           Net Cash Flow             │
          │                                 │                   │
          │                                 ▼                   │
          │                        Cash Accumulator             │
          └─────────────────────────┬───────────────────────────┘
                                    │
                                    ▼
          ┌─────────────────────────────────────────────────────┐
          │              STEP 7: Build Response                 │
          │                                                     │
          │   Assets + Investments + Cash + CPF = Total Assets  │
          │                                                     │
          │   Net Worth = Total Assets - Liabilities            │
          └─────────────────────────┬───────────────────────────┘
                                    │
                                    ▼
                         ┌──────────────────────┐
                         │   State for Month N  │
                         │   (carries to N+1)   │
                         └──────────────────────┘
```

---

## Detailed Step Dependencies

### Step 1: Reset CPF YTD
```
Condition: month == January AND monthIndex > 0
Input:     CPFContext
Output:    Reset YTD wage counters for AW calculation
```

### Step 2: Apply Growth
```
┌────────────────────┬─────────────────────┬──────────────────────────────────┐
│ Item Type          │ Strategy            │ When Applied                     │
├────────────────────┼─────────────────────┼──────────────────────────────────┤
│ Income             │ Annual Step         │ January only (after month 12)    │
│ Expenses           │ Annual Step         │ January only (after month 12)    │
│ Non-Cash Assets    │ Monthly Compound    │ Every month (after month 1)      │
│ Investments        │ Monthly Compound    │ Every month (after month 1)      │
│ Cash Assets        │ Monthly Compound    │ Every month (after month 1)      │
│ Liabilities        │ (handled in Step 3) │                                  │
└────────────────────┴─────────────────────┴──────────────────────────────────┘

Annual Step:      amount × (1 + rate/100)
Monthly Compound: amount × (1 + rate/100)^(1/12)
```

### Step 3: Process Liabilities
```
For each liability:
  ┌──────────────────────────────────────────────────────────────┐
  │ Input: balance, interestRate, strategy, endDate, linkedExp  │
  └──────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌───────────────────┐
                    │ Calculate Remaining│
                    │ Months (if endDate)│
                    └─────────┬─────────┘
                              │
                              ▼
            ┌─────────────────────────────────────┐
            │         Select Strategy             │
            │  ┌─────────────────────────────┐   │
            │  │ • Standard Amortization     │   │
            │  │ • Interest Only             │   │
            │  │ • Fixed Payment             │   │
            │  │ • Minimum Payment           │   │
            │  │ • Extra Payment             │   │
            │  └─────────────────────────────┘   │
            └─────────────────┬─────────────────┘
                              │
                              ▼
                    ┌───────────────────┐
                    │ Calculate Payment │
                    │ & New Balance     │
                    └─────────┬─────────┘
                              │
              ┌───────────────┴───────────────┐
              ▼                               ▼
    ┌─────────────────┐             ┌─────────────────┐
    │ Update Liability│             │ Update Linked   │
    │ Balance         │             │ Expense Amount  │
    └─────────────────┘             └─────────────────┘
```

### Step 4: Apply Scenario Impacts
```
Priority Order (evaluated for each item):

    ┌──────────────────────────────────────────────────────────┐
    │                    Base State Value                      │
    └──────────────────────────────┬───────────────────────────┘
                                   │
                                   ▼
    ┌──────────────────────────────────────────────────────────┐
    │  PASS 1: Check STOP impacts                              │
    │  If ANY stop impact applies → return 0 immediately       │
    └──────────────────────────────┬───────────────────────────┘
                                   │
                                   ▼
    ┌──────────────────────────────────────────────────────────┐
    │  PASS 2: Find latest OVERRIDE                            │
    │  Compare by event.UpdatedAt timestamp                    │
    │  Latest override replaces base value                     │
    └──────────────────────────────┬───────────────────────────┘
                                   │
                                   ▼
    ┌──────────────────────────────────────────────────────────┐
    │  PASS 3: Apply all DELTA impacts                         │
    │  Cumulative: adjustedValue += delta                      │
    └──────────────────────────────┬───────────────────────────┘
                                   │
                                   ▼
    ┌──────────────────────────────────────────────────────────┐
    │                  Adjusted State Value                    │
    └──────────────────────────────────────────────────────────┘
```

### Step 5: Calculate CPF Contributions
```
    ┌────────────────────────────────────────────────────────────┐
    │                  For each CPF-eligible Income             │
    └────────────────────────────────────────────────────────────┘
                                   │
              ┌────────────────────┴────────────────────┐
              ▼                                         ▼
    ┌─────────────────────┐                   ┌─────────────────────┐
    │  Ordinary Wage (OW) │                   │ Additional Wage (AW)│
    │  Monthly salary     │                   │ Bonuses, etc.       │
    └──────────┬──────────┘                   └──────────┬──────────┘
               │                                         │
               ▼                                         ▼
    ┌─────────────────────┐                   ┌─────────────────────┐
    │ProcessOrdinaryWage()│                   │ProcessAdditionalWage│
    └──────────┬──────────┘                   └──────────┬──────────┘
               │                                         │
               └────────────────────┬────────────────────┘
                                    │
                                    ▼
                   ┌────────────────────────────────┐
                   │  Allocate to CPF Accounts      │
                   │  ┌────────────────────────┐   │
                   │  │ OA (Ordinary Account)  │   │
                   │  │ SA (Special Account)   │   │
                   │  │ MA (MediSave Account)  │   │
                   │  │ RA (Retirement Account)│   │
                   │  └────────────────────────┘   │
                   └────────────────────────────────┘
```

### Step 6: Calculate Cash Flow & Allocations
```
    ┌─────────────┐
    │   Income    │ (sum of all active, converted to monthly)
    └──────┬──────┘
           │
           ├────────────────────────────────────────────────┐
           │                                                │
           ▼                                                ▼
    ┌─────────────┐                              ┌──────────────────┐
    │ - Employee  │                              │ Income           │
    │   CPF       │                              │ Allocations      │
    └──────┬──────┘                              └────────┬─────────┘
           │                                              │
           ▼                                              ▼
    ┌─────────────┐                              ┌──────────────────┐
    │ - Expenses  │                              │ To Investments   │
    └──────┬──────┘                              │ (fixed or %)     │
           │                                     └────────┬─────────┘
           ▼                                              │
    ┌─────────────┐                                       │
    │ Net Savings │◄──────────────────────────────────────┘
    │ = Income    │        (netInvestments deducted)
    │   - CPF     │
    │   - Expense │
    └──────┬──────┘
           │
           ▼
    ┌──────────────────┐
    │  Net Cash Flow   │
    │  = NetSavings    │
    │    - Allocations │
    └────────┬─────────┘
             │
             ▼
    ┌──────────────────┐
    │ Cash Accumulator │ (added to designated cash account)
    └──────────────────┘
```

---

## State Persistence Across Months

```
Month N-1                      Month N                       Month N+1
┌─────────┐                  ┌─────────┐                   ┌─────────┐
│ State   │                  │ State   │                   │ State   │
│ ─────── │                  │ ─────── │                   │ ─────── │
│ Asset₁  │────growth───────►│ Asset₁' │────growth────────►│ Asset₁''│
│ Asset₂  │────growth───────►│ Asset₂' │────growth────────►│ Asset₂''│
│ Liab₁   │────repay────────►│ Liab₁'  │────repay─────────►│ Liab₁'' │
│ CPF_OA  │────contrib──────►│ CPF_OA' │────contrib───────►│ CPF_OA''│
│ Cash    │────accumulate───►│ Cash'   │────accumulate────►│ Cash''  │
└─────────┘                  └─────────┘                   └─────────┘

Note: State persists and mutates.
      EventAdjustedState is recreated fresh each month (for scenario display).
```

---

## Anchor Month Special Handling

The **anchor month** (first month) behaves differently:

```
┌───────────────────────────────────────────────────────────────────────┐
│                         ANCHOR MONTH RULES                            │
├───────────────────────────────────────────────────────────────────────┤
│ ✗ CPF contributions calculated but NOT accumulated to balances        │
│ ✗ Investment allocations calculated but NOT applied to balances       │
│ ✗ Liabilities NOT processed (no balance mutations)                    │
│ ✗ Cash accumulator NOT incremented                                    │
│ ✓ Growth IS applied (sets initial grown values)                       │
│ ✓ Scenario impacts ARE applied (for display)                          │
│                                                                       │
│ Purpose: Shows base financial position without forward momentum       │
└───────────────────────────────────────────────────────────────────────┘
```

---

## Data Structures

### ItemStateMap
Maps item ID to `ItemState`:
```go
type ItemState struct {
    Row        FinancialDataRow  // Original data config
    Balance    *decimal.Decimal  // Current computed balance (mutated each month)
    StartYear  int               // Year relative to base year
    StartMonth int               // Month (1-12)
}
```

### MonthlyContext (Persists Across Months)
```go
type MonthlyContext struct {
    Data               EffectiveRows           // All financial data
    ItemStates         ItemStateMap            // Running state of each item
    State              map[string]*Decimal     // Persists growth, allocations, CPF
    Registry           GrowthRegistry          // Growth strategies
    CPFCtx             CPFContext              // CPF processor + balances
    CashAccumulator    decimal.Decimal         // Accumulated cash flow
    LinkedExpenses     map[string]DataRow      // Liability ID -> linked expense
    ScenarioImpacts    *ImpactContext          // Pre-indexed scenario events
    EventAdjustedState map[string]*Decimal     // Temporary adjusted state (recreated each month)
    AppliedImpacts     map[string][]ImpactInfo // Tracks which impacts were applied
}
```

---

## Dependency Summary

| Computation | Depends On | Affects |
|------------|-----------|---------|
| Growth | Previous balance, growth rate | Current balance |
| Liabilities | Current balance, interest rate, strategy | Current balance, linked expense |
| Scenario Impacts | Base state (after growth/liability), events | Adjusted state (for responses) |
| CPF | Income amount, wage type | CPF balances, net savings |
| Allocations | Income amount, allocation config | Investment balance, cash flow |
| Cash Flow | Income, expenses, CPF, allocations | Cash accumulator, net worth |
| Responses | All item states, CPF, scenario impacts | API output |

---

## File References

| Component | File Path |
|-----------|-----------|
| Main Orchestration | `backend/internal/financial_v2/timeline/service.go` |
| Growth Strategies | `backend/internal/financial_v2/growth/*.go` |
| Liability Repayment | `backend/internal/financial_v2/repayment/repayment.go` |
| Scenario Impacts | `backend/internal/financial_v2/scenario/impact.go` |
| CPF Processing | `backend/internal/cpf/processor/` |
