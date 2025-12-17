# Annualized Snapshot Endpoint - Specification

## Problem Statement

The current `/v2/financial/timeline/snapshot` endpoint returns monthly data. For multi-year financial planning views (e.g., 30-year projections), returning 360 months of data is inefficient and overwhelming for users who want a high-level yearly overview.

We need an annualized version that aggregates monthly data into yearly summaries, where:
- **Balances** (point-in-time values) use December/year-end figures
- **Flows** (income, expenses, contributions) are summed across all 12 months

---

## Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Endpoint approach | New `?resolution=yearly` query param | Reuse existing endpoint, follows pattern of v1 timeline |
| Balance aggregation | December values (year-end) | Standard financial reporting uses year-end balances |
| Flow aggregation | Sum of 12 months | Represents total annual income/expenses |
| Partial year handling | Use last available month for balances, sum available months for flows | Handles projection start mid-year gracefully |
| Item visibility | Show items active at any point during the year | Don't hide items that start/end mid-year |
| Implementation location | Backend aggregation | More efficient than transferring 12x data and aggregating client-side |

---

## Current State

### Existing Monthly Response (`MonthDetailResponse`)

```go
type MonthDetailResponse struct {
    Year             int                       `json:"year"`
    Month            int                       `json:"month"`
    AllYearsIndex    int                       `json:"allYearsIndex"`
    AllMonthsIndex   int                       `json:"allMonthsIndex"`
    // Balances (point-in-time)
    NonCashAssets    []NonCashAssetResponse    `json:"nonCashAssets"`
    Investments      []InvestmentResponse      `json:"investments"`
    CashAssets       []CashAssetResponse       `json:"cashAssets"`
    CPFAssets        []CPFAssetResponse        `json:"cpfAssets"`
    Liabilities      []LiabilityResponse       `json:"liabilities"`
    // Flows (monthly amounts)
    Income           []IncomeResponse          `json:"income"`
    CPFContributions []CPFContributionResponse `json:"cpfContributions"`
    Expenses         []ExpenseResponse         `json:"expenses"`
    // Aggregates
    NetSavings       decimal.Decimal           `json:"netSavings"`
    NetCash          decimal.Decimal           `json:"netCash"`
    NetInvestments   decimal.Decimal           `json:"netInvestments"`
    NetWorth         decimal.Decimal           `json:"netWorth"`
    AccumulatorAccountID string                `json:"accumulatorAccountId"`
}
```

### Aggregation Strategy

| Data Type | Monthly Value | Yearly Aggregation |
|-----------|---------------|-------------------|
| NonCashAssets.Balance | Point-in-time balance | December balance |
| Investments.Balance | Point-in-time balance | December balance |
| CashAssets.Balance | Point-in-time balance | December balance |
| CPFAssets.Balance | Point-in-time balance | December balance |
| Liabilities.Balance | Point-in-time balance | December balance |
| Income.Amount | Monthly income | Sum of 12 months |
| Income.EmployeeCPF | Monthly CPF deduction | Sum of 12 months |
| Expenses.Amount | Monthly expense | Sum of 12 months |
| CPFContributions | Monthly contribution | Sum of 12 months |
| NetSavings | Monthly net savings | Sum of 12 months |
| NetCash | Monthly net cash | Sum of 12 months |
| NetInvestments | Monthly investment allocation | Sum of 12 months |
| NetWorth | Point-in-time net worth | December value |

---

## Detailed Implementation

### 1. New Response Types

**File: `backend/internal/financial_v2/timeline/types.go`**

```go
// TimelineYearlyResponse is the top-level response for yearly resolution
type TimelineYearlyResponse struct {
    Years []YearDetailResponse `json:"years"`
}

// YearDetailResponse represents a single year in the timeline
type YearDetailResponse struct {
    Year             int                           `json:"year"`
    AllYearsIndex    int                           `json:"allYearsIndex"`
    // Balances (December/year-end values)
    NonCashAssets    []NonCashAssetYearResponse    `json:"nonCashAssets"`
    Investments      []InvestmentYearResponse      `json:"investments"`
    CashAssets       []CashAssetYearResponse       `json:"cashAssets"`
    CPFAssets        []CPFAssetYearResponse        `json:"cpfAssets"`
    Liabilities      []LiabilityYearResponse       `json:"liabilities"`
    // Flows (annual totals)
    Income           []IncomeYearResponse          `json:"income"`
    CPFContributions []CPFContributionYearResponse `json:"cpfContributions"`
    Expenses         []ExpenseYearResponse         `json:"expenses"`
    // Annual aggregates
    NetSavings       decimal.Decimal               `json:"netSavings"`     // Sum of monthly
    NetCash          decimal.Decimal               `json:"netCash"`        // Sum of monthly
    NetInvestments   decimal.Decimal               `json:"netInvestments"` // Sum of monthly
    NetWorth         decimal.Decimal               `json:"netWorth"`       // December value
    AccumulatorAccountID string                    `json:"accumulatorAccountId"`
}

// Balance response types (year-end snapshots)
// These mirror the monthly types but represent December values

type NonCashAssetYearResponse struct {
    ID         string          `json:"id"`
    ParentID   string          `json:"parentId"`
    Name       string          `json:"name"`
    Category   string          `json:"category"`
    Balance    decimal.Decimal `json:"balance"`    // December balance
    AdjBalance decimal.Decimal `json:"adjBalance"` // December adjusted balance
    ItemType   string          `json:"itemType"`
    StartYear  int             `json:"startYear"`
}

type InvestmentYearResponse struct {
    ID         string          `json:"id"`
    ParentID   string          `json:"parentId"`
    Name       string          `json:"name"`
    Category   string          `json:"category"`
    Balance    decimal.Decimal `json:"balance"`    // December balance
    AdjBalance decimal.Decimal `json:"adjBalance"` // December adjusted balance
    ItemType   string          `json:"itemType"`
    StartYear  int             `json:"startYear"`
}

type CashAssetYearResponse struct {
    ItemID        string          `json:"itemId"`
    Name          string          `json:"name"`
    Category      string          `json:"category"`
    Balance       decimal.Decimal `json:"balance"`    // December balance
    AdjBalance    decimal.Decimal `json:"adjBalance"` // December adjusted balance
    ItemType      string          `json:"itemType"`
    StartYear     int             `json:"startYear"`
    IsAccumulator bool            `json:"isAccumulator"`
}

type CPFAssetYearResponse struct {
    ID         string          `json:"id"`
    ParentID   string          `json:"parentId"`
    Name       string          `json:"name"`
    Category   string          `json:"category"`
    Balance    decimal.Decimal `json:"balance"`    // December balance
    AdjBalance decimal.Decimal `json:"adjBalance"` // December adjusted balance
    ItemType   string          `json:"itemType"`
    StartYear  int             `json:"startYear"`
}

type LiabilityYearResponse struct {
    ID           string          `json:"id"`
    ParentID     string          `json:"parentId"`
    Name         string          `json:"name"`
    Category     string          `json:"category"`
    Balance      decimal.Decimal `json:"balance"`      // December balance
    AdjBalance   decimal.Decimal `json:"adjBalance"`   // December adjusted balance
    SourceAmount decimal.Decimal `json:"sourceAmount"` // Original principal
    ItemType     string          `json:"itemType"`
    StartYear    int             `json:"startYear"`
}

// Flow response types (annual totals)

type IncomeYearResponse struct {
    ID              string          `json:"id"`
    ParentID        string          `json:"parentId"`
    Name            string          `json:"name"`
    Category        string          `json:"category"`
    AnnualAmount    decimal.Decimal `json:"annualAmount"`    // Sum of 12 months
    AdjAnnualAmount decimal.Decimal `json:"adjAnnualAmount"` // Sum of adjusted monthly
    ItemType        string          `json:"itemType"`
    StartYear       int             `json:"startYear"`
    GrowthRate      decimal.Decimal `json:"growthRate"`
    // Annual CPF totals
    EmployeeCPF     decimal.Decimal `json:"employeeCpf"`     // Sum of 12 months
    EmployerCPF     decimal.Decimal `json:"employerCpf"`     // Sum of 12 months
    TotalCPF        decimal.Decimal `json:"totalCpf"`        // Sum of 12 months
    NetTakeHomePay  decimal.Decimal `json:"netTakeHomePay"`  // Sum of 12 months
    // Annual CPF allocations
    AllocationOA    decimal.Decimal `json:"allocationOa"`
    AllocationSA    decimal.Decimal `json:"allocationSa"`
    AllocationMA    decimal.Decimal `json:"allocationMa"`
    AllocationRA    decimal.Decimal `json:"allocationRa"`
}

type CPFContributionYearResponse struct {
    ID                   string          `json:"id"`
    ParentID             string          `json:"parentId"`
    Name                 string          `json:"name"`
    Category             string          `json:"category"`
    EmployeeContribution decimal.Decimal `json:"employeeContribution"` // Sum of 12 months
    EmployerContribution decimal.Decimal `json:"employerContribution"` // Sum of 12 months
    TotalContribution    decimal.Decimal `json:"totalContribution"`    // Sum of 12 months
    ItemType             string          `json:"itemType"`
    StartYear            int             `json:"startYear"`
    AllocationOA         decimal.Decimal `json:"allocationOa"`
    AllocationSA         decimal.Decimal `json:"allocationSa"`
    AllocationMA         decimal.Decimal `json:"allocationMa"`
    AllocationRA         decimal.Decimal `json:"allocationRa"`
}

type ExpenseYearResponse struct {
    ID              string          `json:"id"`
    ParentID        string          `json:"parentId"`
    Name            string          `json:"name"`
    Category        string          `json:"category"`
    AnnualAmount    decimal.Decimal `json:"annualAmount"`    // Sum of 12 months
    AdjAnnualAmount decimal.Decimal `json:"adjAnnualAmount"` // Sum of adjusted monthly
    ItemType        string          `json:"itemType"`
    StartYear       int             `json:"startYear"`
}
```

---

### 2. Service Layer

**File: `backend/internal/financial_v2/timeline/service.go`**

```go
// ComputeYearlySnapshot aggregates monthly snapshots into yearly summaries
func (s *Service) ComputeYearlySnapshot(
    ctx context.Context,
    userID string,
    opts TimelineOptions,
) (TimelineYearlyResponse, error) {
    // 1. Normalize to full year boundaries
    startYear := opts.StartDate.Year()
    endYear := opts.EndDate.Year()

    // Adjust to Jan 1 of start year and Dec 31 of end year
    fullYearOpts := TimelineOptions{
        StartDate: time.Date(startYear, 1, 1, 0, 0, 0, 0, time.UTC),
        EndDate:   time.Date(endYear, 12, 31, 0, 0, 0, 0, time.UTC),
    }

    // 2. Get monthly data for full range
    monthlyResp, err := s.ComputeFinancialSnapshot(ctx, userID, fullYearOpts)
    if err != nil {
        return TimelineYearlyResponse{}, fmt.Errorf("failed to compute monthly snapshot: %w", err)
    }

    // 3. Group months by year
    yearMonths := make(map[int][]MonthDetailResponse)
    for _, month := range monthlyResp.Months {
        yearMonths[month.Year] = append(yearMonths[month.Year], month)
    }

    // 4. Aggregate each year
    years := make([]YearDetailResponse, 0, len(yearMonths))
    for year := startYear; year <= endYear; year++ {
        months, ok := yearMonths[year]
        if !ok || len(months) == 0 {
            continue
        }
        yearDetail := aggregateMonthsToYear(year, months)
        years = append(years, yearDetail)
    }

    // Sort by year
    sort.Slice(years, func(i, j int) bool {
        return years[i].Year < years[j].Year
    })

    return TimelineYearlyResponse{Years: years}, nil
}

// aggregateMonthsToYear converts 12 months of data into a single year summary
func aggregateMonthsToYear(year int, months []MonthDetailResponse) YearDetailResponse {
    // Find December (or last available month) for balances
    lastMonth := months[len(months)-1]
    for _, m := range months {
        if m.Month == 12 {
            lastMonth = m
            break
        }
    }

    // Aggregate flows
    result := YearDetailResponse{
        Year:          year,
        AllYearsIndex: lastMonth.AllYearsIndex,
        // Balances from December/last month
        NonCashAssets:        convertNonCashAssetsToYearly(lastMonth.NonCashAssets),
        Investments:          convertInvestmentsToYearly(lastMonth.Investments),
        CashAssets:           convertCashAssetsToYearly(lastMonth.CashAssets),
        CPFAssets:            convertCPFAssetsToYearly(lastMonth.CPFAssets),
        Liabilities:          convertLiabilitiesToYearly(lastMonth.Liabilities),
        NetWorth:             lastMonth.NetWorth,
        AccumulatorAccountID: lastMonth.AccumulatorAccountID,
    }

    // Sum flows across all months
    result.Income = aggregateIncomesByID(months)
    result.CPFContributions = aggregateCPFContributionsByID(months)
    result.Expenses = aggregateExpensesByID(months)

    // Sum aggregate fields
    for _, m := range months {
        result.NetSavings = result.NetSavings.Add(m.NetSavings)
        result.NetCash = result.NetCash.Add(m.NetCash)
        result.NetInvestments = result.NetInvestments.Add(m.NetInvestments)
    }

    return result
}

// aggregateIncomesByID sums income amounts across months, grouped by ID
func aggregateIncomesByID(months []MonthDetailResponse) []IncomeYearResponse {
    byID := make(map[string]*IncomeYearResponse)

    for _, month := range months {
        for _, inc := range month.Income {
            if existing, ok := byID[inc.ID]; ok {
                // Add to existing totals
                existing.AnnualAmount = existing.AnnualAmount.Add(inc.Amount)
                existing.AdjAnnualAmount = existing.AdjAnnualAmount.Add(inc.AdjAmount)
                existing.EmployeeCPF = existing.EmployeeCPF.Add(inc.EmployeeCPF)
                existing.EmployerCPF = existing.EmployerCPF.Add(inc.EmployerCPF)
                existing.TotalCPF = existing.TotalCPF.Add(inc.TotalCPF)
                existing.NetTakeHomePay = existing.NetTakeHomePay.Add(inc.NetTakeHomePay)
                existing.AllocationOA = existing.AllocationOA.Add(inc.AllocationOA)
                existing.AllocationSA = existing.AllocationSA.Add(inc.AllocationSA)
                existing.AllocationMA = existing.AllocationMA.Add(inc.AllocationMA)
                existing.AllocationRA = existing.AllocationRA.Add(inc.AllocationRA)
            } else {
                // Initialize new entry
                byID[inc.ID] = &IncomeYearResponse{
                    ID:              inc.ID,
                    ParentID:        inc.ParentID,
                    Name:            inc.Name,
                    Category:        inc.Category,
                    AnnualAmount:    inc.Amount,
                    AdjAnnualAmount: inc.AdjAmount,
                    ItemType:        inc.ItemType,
                    StartYear:       inc.StartYear,
                    GrowthRate:      inc.GrowthRate,
                    EmployeeCPF:     inc.EmployeeCPF,
                    EmployerCPF:     inc.EmployerCPF,
                    TotalCPF:        inc.TotalCPF,
                    NetTakeHomePay:  inc.NetTakeHomePay,
                    AllocationOA:    inc.AllocationOA,
                    AllocationSA:    inc.AllocationSA,
                    AllocationMA:    inc.AllocationMA,
                    AllocationRA:    inc.AllocationRA,
                }
            }
        }
    }

    // Convert map to slice
    result := make([]IncomeYearResponse, 0, len(byID))
    for _, inc := range byID {
        result = append(result, *inc)
    }
    return result
}

// aggregateExpensesByID sums expense amounts across months, grouped by ID
func aggregateExpensesByID(months []MonthDetailResponse) []ExpenseYearResponse {
    byID := make(map[string]*ExpenseYearResponse)

    for _, month := range months {
        for _, exp := range month.Expenses {
            if existing, ok := byID[exp.ID]; ok {
                existing.AnnualAmount = existing.AnnualAmount.Add(exp.Amount)
                existing.AdjAnnualAmount = existing.AdjAnnualAmount.Add(exp.AdjAmount)
            } else {
                byID[exp.ID] = &ExpenseYearResponse{
                    ID:              exp.ID,
                    ParentID:        exp.ParentID,
                    Name:            exp.Name,
                    Category:        exp.Category,
                    AnnualAmount:    exp.Amount,
                    AdjAnnualAmount: exp.AdjAmount,
                    ItemType:        exp.ItemType,
                    StartYear:       exp.StartYear,
                }
            }
        }
    }

    result := make([]ExpenseYearResponse, 0, len(byID))
    for _, exp := range byID {
        result = append(result, *exp)
    }
    return result
}

// aggregateCPFContributionsByID sums CPF contributions across months, grouped by ID
func aggregateCPFContributionsByID(months []MonthDetailResponse) []CPFContributionYearResponse {
    byID := make(map[string]*CPFContributionYearResponse)

    for _, month := range months {
        for _, cpf := range month.CPFContributions {
            if existing, ok := byID[cpf.ID]; ok {
                existing.EmployeeContribution = existing.EmployeeContribution.Add(cpf.EmployeeContribution)
                existing.EmployerContribution = existing.EmployerContribution.Add(cpf.EmployerContribution)
                existing.TotalContribution = existing.TotalContribution.Add(cpf.TotalContribution)
                existing.AllocationOA = existing.AllocationOA.Add(cpf.AllocationOA)
                existing.AllocationSA = existing.AllocationSA.Add(cpf.AllocationSA)
                existing.AllocationMA = existing.AllocationMA.Add(cpf.AllocationMA)
                existing.AllocationRA = existing.AllocationRA.Add(cpf.AllocationRA)
            } else {
                byID[cpf.ID] = &CPFContributionYearResponse{
                    ID:                   cpf.ID,
                    ParentID:             cpf.ParentID,
                    Name:                 cpf.Name,
                    Category:             cpf.Category,
                    EmployeeContribution: cpf.EmployeeContribution,
                    EmployerContribution: cpf.EmployerContribution,
                    TotalContribution:    cpf.TotalContribution,
                    ItemType:             cpf.ItemType,
                    StartYear:            cpf.StartYear,
                    AllocationOA:         cpf.AllocationOA,
                    AllocationSA:         cpf.AllocationSA,
                    AllocationMA:         cpf.AllocationMA,
                    AllocationRA:         cpf.AllocationRA,
                }
            }
        }
    }

    result := make([]CPFContributionYearResponse, 0, len(byID))
    for _, cpf := range byID {
        result = append(result, *cpf)
    }
    return result
}

// Helper functions to convert monthly balance types to yearly
func convertNonCashAssetsToYearly(assets []NonCashAssetResponse) []NonCashAssetYearResponse {
    result := make([]NonCashAssetYearResponse, len(assets))
    for i, a := range assets {
        result[i] = NonCashAssetYearResponse{
            ID:         a.ID,
            ParentID:   a.ParentID,
            Name:       a.Name,
            Category:   a.Category,
            Balance:    a.Balance,
            AdjBalance: a.AdjBalance,
            ItemType:   a.ItemType,
            StartYear:  a.StartYear,
        }
    }
    return result
}

// Similar converters for Investments, CashAssets, CPFAssets, Liabilities...
```

---

### 3. Handler Changes

**File: `backend/cmd/server/handlers/timeline_v2.go`**

```go
// HandleGetSnapshot returns financial snapshot for a date range
// Query params:
//   - startDate: DD-MM-YYYY (required)
//   - endDate: DD-MM-YYYY (optional, defaults to startDate)
//   - resolution: "monthly" | "yearly" (optional, defaults to "monthly")
func (h *TimelineV2Handler) HandleGetSnapshot(w http.ResponseWriter, r *http.Request) {
    userID, ok := r.Context().Value("userID").(string)
    if !ok || userID == "" {
        common.WriteJSONError(w, "unauthorized", http.StatusUnauthorized)
        return
    }

    startDate, endDate, err := common.ParseDateRange(r)
    if err != nil {
        common.WriteJSONError(w, err.Error(), http.StatusBadRequest)
        return
    }

    opts := timeline_v2.TimelineOptions{
        StartDate: startDate,
        EndDate:   endDate,
    }

    // Check resolution parameter
    resolution := r.URL.Query().Get("resolution")
    if resolution == "" {
        resolution = "monthly" // default
    }

    switch resolution {
    case "monthly":
        resp, err := h.Service.ComputeFinancialSnapshot(r.Context(), userID, opts)
        if err != nil {
            common.WriteJSONError(w, err.Error(), http.StatusInternalServerError)
            return
        }
        common.WriteJSON(w, resp, http.StatusOK)

    case "yearly":
        resp, err := h.Service.ComputeYearlySnapshot(r.Context(), userID, opts)
        if err != nil {
            common.WriteJSONError(w, err.Error(), http.StatusInternalServerError)
            return
        }
        common.WriteJSON(w, resp, http.StatusOK)

    default:
        common.WriteJSONError(w, "invalid resolution: must be 'monthly' or 'yearly'", http.StatusBadRequest)
    }
}
```

---

### 4. Frontend Types

**File: `frontend/src/types/timeline.ts`**

```typescript
// ========== Timeline V2 Yearly Types ==========

/** V2 Response for yearly snapshot endpoint */
export interface TimelineYearlyV2Response {
  years: YearDetailResponseV2[]
}

/** Single year detail in V2 yearly response */
export interface YearDetailResponseV2 {
  year: number
  allYearsIndex: number
  // Balances (December values)
  nonCashAssets: NonCashAssetYearResponseV2[]
  investments: InvestmentYearResponseV2[]
  cashAssets: CashAssetYearResponseV2[]
  cpfAssets: CPFAssetYearResponseV2[]
  liabilities: LiabilityYearResponseV2[]
  // Flows (annual totals)
  income: IncomeYearResponseV2[]
  cpfContributions: CPFContributionYearResponseV2[]
  expenses: ExpenseYearResponseV2[]
  // Annual aggregates
  netSavings: string      // Sum of monthly
  netCash: string         // Sum of monthly
  netInvestments: string  // Sum of monthly
  netWorth: string        // December value
  accumulatorAccountId: string
}

/** Non-cash asset yearly response */
export interface NonCashAssetYearResponseV2 {
  id: string
  parentId: string
  name: string
  category: string
  balance: string      // December balance
  adjBalance: string   // December adjusted balance
  itemType: string
  startYear: number
}

/** Investment yearly response */
export interface InvestmentYearResponseV2 {
  id: string
  parentId: string
  name: string
  category: string
  balance: string
  adjBalance: string
  itemType: string
  startYear: number
}

/** Cash asset yearly response */
export interface CashAssetYearResponseV2 {
  itemId: string
  name: string
  category: string
  balance: string
  adjBalance: string
  itemType: string
  startYear: number
  isAccumulator: boolean
}

/** CPF asset yearly response */
export interface CPFAssetYearResponseV2 {
  id: string
  parentId: string
  name: string
  category: string
  balance: string
  adjBalance: string
  itemType: string
  startYear: number
}

/** Liability yearly response */
export interface LiabilityYearResponseV2 {
  id: string
  parentId: string
  name: string
  category: string
  balance: string
  adjBalance: string
  sourceAmount: string
  itemType: string
  startYear: number
}

/** Income yearly response */
export interface IncomeYearResponseV2 {
  id: string
  parentId: string
  name: string
  category: string
  annualAmount: string      // Sum of 12 months
  adjAnnualAmount: string   // Sum of adjusted monthly
  itemType: string
  startYear: number
  growthRate: string
  employeeCpf: string
  employerCpf: string
  totalCpf: string
  netTakeHomePay: string
  allocationOa: string
  allocationSa: string
  allocationMa: string
  allocationRa: string
}

/** CPF contribution yearly response */
export interface CPFContributionYearResponseV2 {
  id: string
  parentId: string
  name: string
  category: string
  employeeContribution: string
  employerContribution: string
  totalContribution: string
  itemType: string
  startYear: number
  allocationOa: string
  allocationSa: string
  allocationMa: string
  allocationRa: string
}

/** Expense yearly response */
export interface ExpenseYearResponseV2 {
  id: string
  parentId: string
  name: string
  category: string
  annualAmount: string
  adjAnnualAmount: string
  itemType: string
  startYear: number
}
```

---

### 5. Frontend API

**File: `frontend/src/services/timelineApi.ts`**

```typescript
/**
 * Get V2 timeline snapshot for a date range
 * @param startDate - Start date in DD-MM-YYYY format
 * @param endDate - End date in DD-MM-YYYY format (optional)
 * @param resolution - 'monthly' or 'yearly' (optional, defaults to 'monthly')
 */
async getTimelineV2Snapshot(options: {
  startDate: string
  endDate?: string
  resolution?: 'monthly' | 'yearly'
}): Promise<TimelineV2Response | TimelineYearlyV2Response> {
  const params = new URLSearchParams()
  params.set('startDate', options.startDate)
  if (options.endDate) {
    params.set('endDate', options.endDate)
  }
  if (options.resolution) {
    params.set('resolution', options.resolution)
  }
  return jsonRequest<TimelineV2Response | TimelineYearlyV2Response>(
    `/financial/timeline/snapshot?${params.toString()}`,
    { method: 'GET' },
    API_BASE_V2
  )
}
```

---

## Edge Cases

| Case | Handling |
|------|----------|
| Partial year at start (e.g., Mar-Dec) | Sum available months for flows; use December for balances |
| Partial year at end (e.g., Jan-Jun) | Sum Jan-Jun for flows; use June (last month) for balances |
| Item starts mid-year (e.g., income from July) | Sum Jul-Dec for that income; shows in yearly view |
| Item ends mid-year (e.g., expense ends in October) | Sum Jan-Oct for that expense; shows in yearly view |
| Item active only part of year | Include in yearly aggregation; sum only active months |
| No data for a year | Skip that year in response |
| Single month requested with yearly resolution | Return single year with that month's data |
| Growth rate changes mid-year | Each month uses its correct adjusted amount; sum reflects actual |

---

## Files to Modify

### Backend

| File | Changes |
|------|---------|
| `backend/internal/financial_v2/timeline/types.go` | Add `TimelineYearlyResponse`, `YearDetailResponse`, and yearly item types |
| `backend/internal/financial_v2/timeline/service.go` | Add `ComputeYearlySnapshot()` and aggregation helper functions |
| `backend/cmd/server/handlers/timeline_v2.go` | Add `resolution` query param handling |

### Frontend

| File | Changes |
|------|---------|
| `frontend/src/types/timeline.ts` | Add yearly V2 response types |
| `frontend/src/services/timelineApi.ts` | Add `resolution` parameter to `getTimelineV2Snapshot()` |
| Query hooks | Update to support resolution parameter |

---

## Testing Strategy

### Unit Tests

1. **Aggregation math** - Verify summing 12 months produces correct annual totals
2. **December selection** - Verify December values used for balances
3. **Partial year handling** - Verify correct behavior when year has fewer than 12 months
4. **Item grouping by ID** - Verify items with same ID across months are aggregated correctly
5. **Empty months** - Verify graceful handling of months with no items

### Integration Tests

1. **Full year request** - Request Jan 1 to Dec 31, verify all 12 months aggregated
2. **Multi-year request** - Request 2025-2030, verify each year aggregated separately
3. **Partial year request** - Request Jul 2025 to Jun 2026, verify correct aggregation
4. **Resolution switching** - Same date range with monthly vs yearly, verify data consistency

---

## Effort Estimate

| Component | Estimate |
|-----------|----------|
| Backend types | 0.5 hours |
| Service aggregation logic | 2 hours |
| Handler changes | 0.5 hours |
| Unit tests | 1.5 hours |
| Frontend types | 0.5 hours |
| Frontend API updates | 0.25 hours |
| Integration tests | 1 hour |
| **Total** | **~6 hours** |

---

## Future Considerations

1. **Performance optimization**: If monthly computation becomes slow for large date ranges, consider computing yearly directly from raw data rather than aggregating monthly results.

2. **Caching**: Yearly snapshots for past years are immutable - could be cached.

3. **Quarterly resolution**: Same pattern could support `resolution=quarterly` if needed.

4. **Pro-rata calculations**: For items that start/end mid-year, consider showing "active months" count alongside annual totals for clearer interpretation.
