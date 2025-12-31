# CPF Projector Modularization Spec

> **Status**: Approved
> **Branch**: `feat/income-earner-classification`

---

## Summary

Extract CPF balance projection logic into a standalone, reusable module that can project CPF account balances to any future date, accounting for contributions and interest. The primary consumer is the Property Planner, which needs projected CPF OA balances at the property purchase date for each borrower.

---

## Background

### Current State

The CPF projection logic is embedded in the timeline service (`backend/internal/financial_v2/timeline/service.go`). It processes month-by-month, tracking:
- CPF contributions from income (OW/AW)
- Year-to-date wage ceilings
- Account allocations by age

**Problem**: This logic is tightly coupled to the full timeline computation and cannot be reused by the Property Planner to get projected balances at a specific date.

### Current CPF Package Structure

```
backend/internal/cpf/
├── config/        # Policy rates, ceilings, allocations (stateless)
├── contribution/  # Pure calculation engine (no state, no I/O)
├── processor/     # Orchestrates calculations WITH state tracking
└── account/       # Domain model + legacy repository
```

**What's Already Modular:**
- `contribution/calculator.go` - Pure calculation, no DB dependencies
- `config/` - Rates/ceilings abstracted from calculations

**What's Coupled:**
- `processor/` manages YTD state AND orchestrates calculations
- Timeline service embeds CPF month-by-month logic directly

---

## Requirements

### Functional Requirements

1. **Project CPF balances to a target date** given:
   - Starting account balances (OA, SA, MA, RA)
   - Linked income streams
   - Account holder profile (DOB, residency)

2. **Include monthly contributions** calculated from linked incomes:
   - Ordinary Wages (OW) - capped at $7,400/month
   - Additional Wages (AW) - capped at $102,000 - YTD OW - YTD AW

3. **Include interest accrual**:
   - OA: 2.5% p.a.
   - SA/MA: 4% p.a.
   - RA: 4% on first $60k, 5% on amounts above (simplified to 4% for now)

4. **Per-borrower breakdown** - Return separate projections for borrower1 and borrower2

5. **Target date** - Use earliest purchase date (loanStartMonth or btoKeyCollectionDate)

### Non-Functional Requirements

1. **Compute on-the-fly** - No caching, derive fresh each time
2. **Testable in isolation** - No database dependencies in core logic
3. **Reusable** - Can be adopted by timeline service later

---

## Design

### Architecture Principles

1. **Interface-first** - Define what consumers need, not what implementation provides
2. **Pure core, impure shell** - Calculation logic has no I/O; data loading at edges
3. **Composition over inheritance** - Small, focused components that compose
4. **Dependency inversion** - Core logic depends on abstractions

### Public Interface

```go
// Package: backend/internal/cpf/projector

// Projector projects CPF balances to a future date
type Projector struct {
    configLoader *config.Loader
}

// ProjectToDate calculates projected CPF balances at targetDate
func (p *Projector) ProjectToDate(
    ctx context.Context,
    account AccountSnapshot,
    incomes []IncomeStream,
    targetDate time.Time,
) (*ProjectedBalances, error)
```

### Input Types

```go
// AccountSnapshot represents CPF account state at a point in time
type AccountSnapshot struct {
    OABalance       decimal.Decimal
    SABalance       decimal.Decimal
    MABalance       decimal.Decimal
    RABalance       decimal.Decimal
    DateOfBirth     time.Time
    ResidencyStatus string    // "citizen", "pr_year_1", "pr_year_2", etc.
    AsOfDate        time.Time // When these balances were recorded
}

// IncomeStream represents an income contributing to CPF
type IncomeStream struct {
    MonthlyAmount decimal.Decimal
    WageType      string     // "ow" or "aw"
    StartDate     time.Time
    EndDate       *time.Time // nil = ongoing
}
```

### Output Type

```go
// ProjectedBalances contains the projected CPF state at target date
type ProjectedBalances struct {
    OA       decimal.Decimal
    SA       decimal.Decimal
    MA       decimal.Decimal
    RA       decimal.Decimal
    AsOfDate time.Time

    // Breakdown for transparency
    ContributionsOA decimal.Decimal
    InterestOA      decimal.Decimal
}
```

### Algorithm

```
1. Initialize running balances from AccountSnapshot
2. Initialize YTD wage tracking for the starting year
3. For each month from AsOfDate to targetDate:
   a. If January: reset YTD wage tracking
   b. For each active income:
      - Calculate contribution (using existing contribution/calculator)
      - Update YTD tracking
      - Add allocation to running balances
   c. Apply monthly interest:
      - OA: balance * (0.025 / 12)
      - SA/MA: balance * (0.04 / 12)
4. Return final ProjectedBalances
```

---

## Implementation Plan

### Phase 1: Create Projector Package (Backend)

**New Files:**

| File | Purpose |
|------|---------|
| `backend/internal/cpf/projector/types.go` | Input/output type definitions |
| `backend/internal/cpf/projector/interest.go` | Interest calculation helpers |
| `backend/internal/cpf/projector/projector.go` | Core projection implementation |
| `backend/internal/cpf/projector/projector_test.go` | Unit tests |

### Phase 2: Wire into Property Planner

**Modify: `backend/internal/financial_v2/property/service.go`**

1. Add projector as dependency
2. Add `getProjectedBorrowerBalances()` method
3. Update `ComputedValues` struct with `ProjectedBorrower1OA` and `ProjectedBorrower2OA`
4. Call projection in `ComputeValues()`

### Phase 3: Update Frontend

**Modify: `frontend/src/types/propertyPlannerV2.ts`**
- Add `projectedBorrower1OA` and `projectedBorrower2OA` to `ComputedValues`

**Modify: `frontend/src/components/modals/PropertyPlannerModal/PropertyPlannerView.tsx`**
- Use projected values in `apiToFrontendScenario()`

---

## File Changes Summary

| File | Change | Description |
|------|--------|-------------|
| `backend/internal/cpf/projector/types.go` | NEW | Input/output type definitions |
| `backend/internal/cpf/projector/interest.go` | NEW | Interest calculation helpers |
| `backend/internal/cpf/projector/projector.go` | NEW | Core projection implementation |
| `backend/internal/cpf/projector/projector_test.go` | NEW | Unit tests with table-driven scenarios |
| `backend/internal/financial_v2/property/service.go` | MODIFY | Add projector dep, implement getProjectedBorrowerBalances |
| `backend/cmd/server/routes/v2.go` | MODIFY | Wire projector into property service |
| `frontend/src/types/propertyPlannerV2.ts` | MODIFY | Add projected OA fields to ComputedValues |
| `frontend/src/components/modals/.../PropertyPlannerView.tsx` | MODIFY | Use projected values from API |

---

## Testing Strategy

### Test Scenarios

1. **Single income, 12 months** - Verify contribution + interest
2. **Multiple incomes (OW + AW)** - Verify ceiling handling
3. **Year boundary** - Verify YTD reset
4. **Interest compounding** - Verify monthly compound
5. **No income** - Interest only projection
6. **Income ends mid-projection** - Partial contributions
7. **Purchase date in past** - Return current balance

---

## Edge Cases

| Case | Handling |
|------|----------|
| No CPF account linked | Return "0" for projected balance |
| No income linked | Project with interest only |
| Purchase date in past | Return current balance (no projection) |
| Income ends before purchase | Stop contributions, continue interest |
| Year boundary crossed | Reset YTD wage tracking |
| Config not found for date | Use latest available config |

---

## Future Enhancements (Out of Scope)

1. **Timeline service adoption** - Refactor timeline to use projector
2. **CPF withdrawal modeling** - Project balance after housing withdrawal
3. **RA transfer at 55** - Model SA→RA transfer
4. **Extra interest on first $60k** - More accurate RA interest
