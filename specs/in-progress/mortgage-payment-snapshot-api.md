# Mortgage Payment in Snapshot API

## Summary

Add a `mortgagePayment` field to `PropertySnapshot` in the `/api/v2/financial/timeline/snapshot` endpoint. This exposes monthly payment breakdown (principal, interest, total) and current rate period info. Mortgage payments are also added to the expenses array for savings calculations.

**Status:** Implemented
**Date:** 2026-01-01

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                                    DATABASE LAYER                                        │
│                                  (No Changes Required)                                   │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                          │
│   ┌─────────────────────┐    ┌─────────────────────┐    ┌─────────────────────────┐     │
│   │  property_scenarios │    │  liability_rate_    │    │     property_sg         │     │
│   │                     │    │     periods         │    │                         │     │
│   │  - id               │    │  - rate             │    │  - property_price       │     │
│   │  - user_id          │    │  - rate_type        │    │  - downpayment_cash     │     │
│   │  - property_sg_id   │    │  - term_years       │    │  - downpayment_cpf_oa   │     │
│   └─────────────────────┘    │  - start_date       │    │  - name                 │     │
│                              └─────────────────────┘    └─────────────────────────┘     │
│                                                                                          │
└─────────────────────────────────────────────────────────────────────────────────────────┘
                                           │
                                           ▼
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                              REPOSITORY LAYER                                            │
│                            (No Changes Required)                                         │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                          │
│   backend/internal/financial_v2/repository/property_planner.go                          │
│   ┌─────────────────────────────────────────────────────────────────────────────────┐   │
│   │  PropertyScenarioFull {                                                          │   │
│   │    Scenario      PropertyScenario                                                │   │
│   │    PropertySG    *PropertySG           ◄── property_price, downpayments         │   │
│   │    RatePeriods   []LiabilityRatePeriod ◄── rate, rate_type, term_years          │   │
│   │    Grants        []PropertySGGrant     ◄── grant amounts                        │   │
│   │  }                                                                               │   │
│   └─────────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                          │
└─────────────────────────────────────────────────────────────────────────────────────────┘
                                           │
                                           ▼
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                              PROPERTY MODULE                                             │
│                           ★ MODIFIED ★                                                   │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                          │
│   backend/internal/financial_v2/property/snapshot.go                                    │
│                                                                                          │
│   ┌──────────────────────────────────┐      ┌──────────────────────────────────────┐   │
│   │  PropertySnapshot (modified)     │      │  MortgagePaymentSnapshot (NEW)       │   │
│   │  ─────────────────────────────── │      │  ──────────────────────────────────  │   │
│   │  + MortgagePayment *MortgagePaym │──────▶  MonthlyTotal     decimal.Decimal   │   │
│   │    entSnapshot                   │      │  PrincipalPortion decimal.Decimal   │   │
│   └──────────────────────────────────┘      │  InterestPortion  decimal.Decimal   │   │
│                                              │  CurrentRate      decimal.Decimal   │   │
│                                              │  RateType         string            │   │
│                                              └──────────────────────────────────────┘   │
│                                                                                          │
│   ┌──────────────────────────────────────────────────────────────────────────────────┐  │
│   │  SnapshotBuilder.BuildPropertySnapshots()                                         │  │
│   │  ─────────────────────────────────────────────────────────────────────────────── │  │
│   │                                                                                   │  │
│   │  1. Calculate mortgageBalance (existing)                                         │  │
│   │                    │                                                              │  │
│   │                    ▼                                                              │  │
│   │  2. calculateMortgagePayment() ◄─── NEW METHOD                                   │  │
│   │        │                                                                          │  │
│   │        ├── Find active rate period for target date                               │  │
│   │        ├── Calculate remaining months                                             │  │
│   │        └── Call repayment.StandardAmortization.Calculate()                       │  │
│   │                    │                                                              │  │
│   │                    ▼                                                              │  │
│   │  3. Set snapshot.MortgagePayment = mortgagePayment                               │  │
│   └──────────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                          │
│   ┌──────────────────────────────────────────────────────────────────────────────────┐  │
│   │  PropertySnapshot.ToMortgageExpense() ◄─── NEW METHOD                            │  │
│   │  ─────────────────────────────────────────────────────────────────────────────── │  │
│   │  Converts MortgagePaymentSnapshot → MortgagePaymentExpense                       │  │
│   │  (for inclusion in expenses array)                                                │  │
│   └──────────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                          │
└─────────────────────────────────────────────────────────────────────────────────────────┘
                                           │
                                           │ Uses
                                           ▼
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                              REPAYMENT MODULE                                            │
│                            (No Changes Required)                                         │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                          │
│   backend/internal/financial_v2/repayment/repayment.go                                  │
│                                                                                          │
│   ┌──────────────────────────────────────────────────────────────────────────────────┐  │
│   │  StandardAmortizationStrategy.Calculate(params) → Result                         │  │
│   │  ─────────────────────────────────────────────────────────────────────────────── │  │
│   │  Input:                              │  Output:                                  │  │
│   │    CurrentBalance  *decimal          │    MonthlyPayment   *decimal              │  │
│   │    InterestRateAPR *decimal          │    PrincipalPortion *decimal              │  │
│   │    TotalPeriods    int               │    InterestPortion  *decimal              │  │
│   │                                      │    RemainingBalance *decimal              │  │
│   └──────────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                          │
└─────────────────────────────────────────────────────────────────────────────────────────┘
                                           │
                                           │ Returns to
                                           ▼
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                              TIMELINE SERVICE                                            │
│                           ★ MODIFIED ★                                                   │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                          │
│   backend/internal/financial_v2/timeline/service.go                                     │
│                                                                                          │
│   ┌──────────────────────────────────────────────────────────────────────────────────┐  │
│   │  buildMonthResponse()                                                             │  │
│   │  ─────────────────────────────────────────────────────────────────────────────── │  │
│   │                                                                                   │  │
│   │  // Build property snapshots (includes mortgagePayment now)                      │  │
│   │  propertySnapshots, propertyTotal, mortgageTotal :=                              │  │
│   │      propertyBuilder.BuildPropertySnapshots(properties, date)                    │  │
│   │                                                                                   │  │
│   │  // Convert property fees and mortgage payments to expenses (SINGLE LOOP)       │  │
│   │  for i := range propertySnapshots {                                              │  │
│   │      // Property fees (recurring, purchase, sale)                                │  │
│   │      propExpenses := propertySnapshots[i].ToExpenses(date)                       │  │
│   │      expenses = append(expenses, ...)                                            │  │
│   │                                                                                   │  │
│   │      // Mortgage payment (principal + interest)                                  │  │
│   │      if mortgageExp := propertySnapshots[i].ToMortgageExpense(date); ... {       │  │
│   │          expenses = append(expenses, ExpenseResponse{...})                       │  │
│   │      }                                                                            │  │
│   │  }                                                                                │  │
│   │                                                                                   │  │
│   └──────────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                          │
└─────────────────────────────────────────────────────────────────────────────────────────┘
                                           │
                                           ▼
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                              API RESPONSE                                                │
│                           ★ MODIFIED ★                                                   │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                          │
│   GET /api/v2/financial/timeline/snapshot                                               │
│                                                                                          │
│   {                                                                                      │
│     "months": [{                                                                         │
│       "properties": [{                                                                   │
│         "id": "prop-123",                                                               │
│         "mortgageBalance": "380000",                                                    │
│         "mortgagePayment": {           ◄─── NEW FIELD                                   │
│           "monthlyTotal": "1850.00",                                                    │
│           "principalPortion": "1200.00",                                                │
│           "interestPortion": "650.00",                                                  │
│           "currentRate": "2.6",                                                         │
│           "rateType": "fixed"                                                           │
│         }                                                                                │
│       }],                                                                                │
│       "expenses": [                                                                      │
│         ...,                                                                             │
│         {                              ◄─── NEW EXPENSE ENTRY                           │
│           "id": "mortgage-prop-123",                                                    │
│           "name": "HDB BTO Mortgage",                                                   │
│           "category": "housing",                                                        │
│           "amount": "1850.00",                                                          │
│           "itemType": "mortgage_payment"                                                │
│         }                                                                                │
│       ]                                                                                  │
│     }]                                                                                   │
│   }                                                                                      │
│                                                                                          │
└─────────────────────────────────────────────────────────────────────────────────────────┘
                                           │
                                           ▼
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND TYPES                                              │
│                           ★ MODIFIED ★                                                   │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                          │
│   frontend/src/types/timeline.ts                                                        │
│                                                                                          │
│   ┌──────────────────────────────────┐      ┌──────────────────────────────────────┐   │
│   │  PropertySnapshotV2 (modified)   │      │  MortgagePaymentSnapshotV2 (NEW)     │   │
│   │  ─────────────────────────────── │      │  ──────────────────────────────────  │   │
│   │  + mortgagePayment?: MortgagePay │──────▶  monthlyTotal: string               │   │
│   │    mentSnapshotV2                │      │  principalPortion: string           │   │
│   └──────────────────────────────────┘      │  interestPortion: string            │   │
│                                              │  currentRate: string                │   │
│                                              │  rateType: string                   │   │
│                                              └──────────────────────────────────────┘   │
│                                                                                          │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## Data Flow Summary

```
PropertySnapshot.MortgagePayment (detailed breakdown)
         │
         ▼
PropertySnapshot.ToMortgageExpense() (converts to expense format)
         │
         ▼
service.go: expenses = append(expenses, mortgageExpense)
         │
         ▼
ExpenseResponse in API (included in savings calculations)
```

---

## Files Modified

| Layer | File | Change Type | Description |
|-------|------|-------------|-------------|
| **Database** | - | None | No schema changes - uses existing `liability_rate_periods` table |
| **Repository** | - | None | `PropertyScenarioFull` already contains all needed data |
| **Property Module** | `backend/internal/financial_v2/property/snapshot.go` | Modified | Added `MortgagePaymentSnapshot`, `MortgagePaymentExpense`, `calculateMortgagePayment()`, `ToMortgageExpense()` |
| **Repayment Module** | `backend/internal/financial_v2/repayment/repayment.go` | None | Reused existing `StandardAmortizationStrategy.Calculate()` |
| **Timeline Service** | `backend/internal/financial_v2/timeline/service.go` (line ~1800) | Modified | Added loop to convert mortgage payments to expenses |
| **Frontend Types** | `frontend/src/types/timeline.ts` (line ~417) | Modified | Added `MortgagePaymentSnapshotV2` interface |

---

## Type Definitions

### Backend (Go)

```go
// PropertySnapshot (modified)
type PropertySnapshot struct {
    ID              string                   `json:"id"`
    Name            string                   `json:"name"`
    Icon            *string                  `json:"icon"`
    IconColor       *string                  `json:"iconColor"`
    PropertyValue   decimal.Decimal          `json:"propertyValue"`
    MortgageBalance decimal.Decimal          `json:"mortgageBalance"`
    NetEquity       decimal.Decimal          `json:"netEquity"`
    PurchaseDate    string                   `json:"purchaseDate"`
    SaleDate        *string                  `json:"saleDate,omitempty"`
    Fees            []PropertyFeeSnapshot    `json:"fees"`
    MortgagePayment *MortgagePaymentSnapshot `json:"mortgagePayment,omitempty"` // NEW
}

// MortgagePaymentSnapshot (new struct)
type MortgagePaymentSnapshot struct {
    MonthlyTotal     decimal.Decimal `json:"monthlyTotal"`     // Total monthly payment
    PrincipalPortion decimal.Decimal `json:"principalPortion"` // Principal paid this month
    InterestPortion  decimal.Decimal `json:"interestPortion"`  // Interest paid this month
    CurrentRate      decimal.Decimal `json:"currentRate"`      // Current interest rate (APR %)
    RateType         string          `json:"rateType"`         // "fixed" or "floating"
}

// MortgagePaymentExpense (new struct for expense conversion)
type MortgagePaymentExpense struct {
    ID                   string
    ParentID             string          // Property scenario ID
    Name                 string          // e.g., "HDB BTO Mortgage"
    Category             string          // "housing"
    Amount               decimal.Decimal // Monthly payment amount
    EventAdjAmount       decimal.Decimal // Same as Amount (no scenario adjustment)
    AnnualAmount         decimal.Decimal // Amount * 12
    EventAdjAnnualAmount decimal.Decimal // Same as AnnualAmount
    SourceFrequency      string          // "monthly"
    ItemType             string          // "mortgage_payment"
    StartYear            int
    StartMonth           int
    ScenarioEventID      *string         // Points to property scenario ID
    Icon                 *string
    IconColor            *string
}
```

### Frontend (TypeScript)

```typescript
/** Property scenario snapshot in timeline V2 response */
export interface PropertySnapshotV2 {
  id: string
  name: string
  icon?: string
  iconColor?: string
  propertyValue: string
  mortgageBalance: string
  netEquity: string
  purchaseDate: string
  saleDate?: string
  fees: PropertyFeeSnapshotV2[]
  mortgagePayment?: MortgagePaymentSnapshotV2 // NEW
}

/** Mortgage payment breakdown in timeline V2 response */
export interface MortgagePaymentSnapshotV2 {
  monthlyTotal: string     // Total monthly payment
  principalPortion: string // Principal paid this month
  interestPortion: string  // Interest paid this month
  currentRate: string      // Current interest rate (APR %)
  rateType: string         // "fixed" or "floating"
}
```

---

## Example API Response

```json
{
  "months": [{
    "year": 2025,
    "month": 6,
    "properties": [{
      "id": "prop-123",
      "name": "HDB BTO",
      "propertyValue": "500000",
      "mortgageBalance": "380000",
      "netEquity": "120000",
      "purchaseDate": "2025-01",
      "fees": [],
      "mortgagePayment": {
        "monthlyTotal": "1850.00",
        "principalPortion": "1200.00",
        "interestPortion": "650.00",
        "currentRate": "2.6",
        "rateType": "fixed"
      }
    }],
    "expenses": [
      {
        "id": "mortgage-prop-123",
        "parentId": "prop-123",
        "name": "HDB BTO Mortgage",
        "category": "housing",
        "amount": "1850.00",
        "eventAdjAmount": "1850.00",
        "annualAmount": "22200.00",
        "eventAdjAnnualAmount": "22200.00",
        "sourceFrequency": "monthly",
        "itemType": "mortgage_payment",
        "icon": "home",
        "iconColor": "#3b82f6"
      }
    ]
  }]
}
```

---

## Implementation Details

### calculateMortgagePayment Algorithm

1. **Find active rate period** for target date based on cumulative months elapsed
2. **Calculate remaining months** from current date to end of all rate periods
3. **Call repayment module** with current balance, rate, and remaining term
4. **Return breakdown** with monthly total, principal, interest, rate, and rate type

### Variable Rate Period Handling

The implementation **supports multiple rate periods** with different rates and types (fixed/floating):

```go
// Rate periods example:
// Period 1: Years 1-2, 2.6% fixed
// Period 2: Years 3-5, 3.0% fixed
// Period 3: Years 6+, 3.5% floating

ratePeriods := []LiabilityRatePeriod{
    {StartDate: "2025-01", TermYears: 2, Rate: 2.6, RateType: "fixed"},
    {StartDate: "2027-01", TermYears: 3, Rate: 3.0, RateType: "fixed"},
    {StartDate: "2030-01", TermYears: 20, Rate: 3.5, RateType: "floating"},
}
```

**How it works:**

1. **Period Selection**: For any target date, the algorithm iterates through rate periods by cumulative months to find which period applies:
   ```go
   monthsElapsed := monthsBetween(purchaseDate, targetDate)
   cumulativeMonths := 0
   for _, period := range ratePeriods {
       periodMonths := period.TermYears * 12
       if monthsElapsed < cumulativeMonths+periodMonths {
           activeRate = &period.Rate    // Use this period's rate
           activeRateType = period.RateType
           break
       }
       cumulativeMonths += periodMonths
   }
   ```

2. **Rate Changes Over Time**: As the timeline progresses month-by-month:
   - Month 1 (Jan 2025): Uses Period 1 rate (2.6% fixed)
   - Month 25 (Jan 2027): Switches to Period 2 rate (3.0% fixed)
   - Month 61 (Jan 2030): Switches to Period 3 rate (3.5% floating)

3. **Payment Recalculation**: Each month's payment is calculated using:
   - **Current balance** at that point (decreasing over time)
   - **Active rate** for that period
   - **Remaining term** across all periods

**Limitation (Simplification):**
The monthly payment is calculated as if the current rate applies for the entire remaining term. This is a standard approach used by banks for "what-if" projections, but actual payments will differ when rate periods change:

```
Timeline View (Jan 2026, in Period 1):
├─ Current Rate: 2.6% fixed
├─ Remaining Term: 24 years (calculated across all periods)
└─ Monthly Payment: Calculated assuming 2.6% for 24 years

Reality when Period 2 starts (Jan 2027):
└─ Payment recalculates with new rate, new balance, new remaining term
```

This is the **correct behavior** for a snapshot API—each month shows the payment based on that month's conditions. Future projections naturally show different payments as rate periods change.

### When mortgagePayment is null

- Mortgage is fully paid (balance = 0)
- Property has been sold
- Before purchase date
- Past all rate periods

### Expense Entry Behavior

- Mortgage payments appear in **both**:
  - `properties[].mortgagePayment` - detailed breakdown
  - `expenses[]` - as expense entry for savings calculations
- Uses property icon/color if set, otherwise defaults to home icon with blue color
- Category: "housing"
- ItemType: "mortgage_payment"

---

## Design Decisions

1. **On-the-fly calculation** - Mortgage payments are computed from existing data rather than stored, avoiding data duplication and ensuring payments always reflect current balance and rate.

2. **Dual exposure pattern** - Data stays in its domain (`PropertySnapshot.MortgagePayment`) for detailed display, while also being converted to expense format for unified cash flow calculations.

3. **Repayment module reuse** - Leverages existing `StandardAmortizationStrategy` for accurate amortization, ensuring consistency with property planner calculations.
