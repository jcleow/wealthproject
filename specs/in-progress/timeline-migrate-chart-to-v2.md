# Plan: Migrate Chart from V1 to V2 Timeline API

## Overview

Migrate the frontend chart (`NetWorthProjection`) from using the V1 timeline API (`/api/v1/financial/timeline`) to a new flexible V2 chart endpoint (`/api/v2/financial/timeline/chart`) that supports:

- **Multiple data series** (net worth, income, expenses, assets, liabilities, CPF balances, etc.)
- **Different chart types** (line charts, stacked bar charts, area charts)
- **Configurable aggregations** (by category, by item type, totals only)
- **Efficient responses** (only return requested series, not full item details)

## Current State

### V1 API (currently used by chart)
- **Endpoint**: `GET /api/v1/financial/timeline?resolution=monthly&include_scenarios=true`
- **Returns**: Full `TimelineResponse` with `years[]` or `months[]` containing all items (assets, liabilities, income, expenses), net worth, and growth details
- **Data flow**: Frontend `useTimeline` hook → `timelineApi.getTimeline()` → V1 handler → V1 service

### V2 API (target)
- **Endpoint**: `GET /api/v2/financial/timeline/chart?resolution=monthly`
- **Returns**: `TimelineAnnualChartResponse` with simplified `years[]` or `months[]` containing only `netWorth` per period
- **Current state**: Backend handler exists but `GetTimeline` method is a stub returning empty arrays

### Detail Panels Status
- **Already migrated**: The detail panels (`FinancialDataManagement`) already support V2 via the `/api/v2/financial/timeline/snapshot` endpoint
- **Feature flagged**: Controlled by `NEXT_PUBLIC_USE_TIMELINE_V2` env var
- **This PR focuses on**: Migrating the chart to V2 with a flexible, multi-series API

---

## Flexible Chart API Design

### Supported Data Series

The chart endpoint should support requesting any combination of these series:

| Series ID | Description | Use Case |
|-----------|-------------|----------|
| `net_worth` | Assets + Cash + CPF - Liabilities | Main projection line |
| `total_assets` | All non-cash assets | Asset breakdown |
| `total_investments` | Investment accounts | Investment growth |
| `total_cash` | Cash accounts | Liquidity tracking |
| `total_cpf` | OA + SA + MA + RA | CPF projection |
| `cpf_oa` | Ordinary Account only | CPF breakdown |
| `cpf_sa` | Special Account only | CPF breakdown |
| `cpf_ma` | MediSave Account only | CPF breakdown |
| `cpf_ra` | Retirement Account only | CPF breakdown |
| `total_liabilities` | All liabilities | Debt tracking |
| `total_income` | Gross income | Income vs expense |
| `total_expenses` | All expenses | Income vs expense |
| `net_savings` | Income - CPF - Expenses | Savings rate |
| `net_cash_flow` | Net savings - Investments | Cash flow |
| `assets_by_category` | Assets grouped by category | Stacked bar chart |
| `liabilities_by_category` | Liabilities grouped | Stacked bar chart |
| `income_by_category` | Income grouped | Stacked bar chart |
| `expenses_by_category` | Expenses grouped | Stacked bar chart |

### API Request Format

```
GET /api/v2/financial/timeline/chart
  ?series=net_worth,total_income,total_expenses
  &resolution=monthly
  &includeScenarios=true
```

**Parameters:**
- `series` (required): Comma-separated list of series IDs to include
- `resolution`: `yearly` | `monthly` (default: `monthly`)
- `includeScenarios`: `true` | `false` (default: `false`)

### API Response Format

```json
{
  "resolution": "monthly",
  "anchorYear": 2025,
  "anchorMonth": 1,
  "scenarioIds": ["scenario-1", "scenario-2"],
  "series": {
    "net_worth": {
      "id": "net_worth",
      "name": "Net Worth",
      "type": "currency",
      "data": [
        { "index": 0, "year": 2025, "month": 1, "value": "150000" },
        { "index": 1, "year": 2025, "month": 2, "value": "152500" },
        ...
      ]
    },
    "total_income": {
      "id": "total_income",
      "name": "Total Income",
      "type": "currency",
      "data": [...]
    },
    "assets_by_category": {
      "id": "assets_by_category",
      "name": "Assets by Category",
      "type": "stacked",
      "categories": ["property", "vehicle", "investment", "other"],
      "data": [
        {
          "index": 0,
          "year": 2025,
          "month": 1,
          "values": {
            "property": "500000",
            "vehicle": "30000",
            "investment": "100000",
            "other": "20000"
          }
        },
        ...
      ]
    }
  }
}
```

### Series Types

1. **Simple Series** (`type: "currency"` | `"percentage"`)
   - Single value per time period
   - For line charts, area charts

2. **Stacked Series** (`type: "stacked"`)
   - Multiple values per time period (by category)
   - For stacked bar charts, stacked area charts

---

## Implementation Plan

### Step 1: Define Chart Types and Request/Response Structs

**File**: `backend/internal/financial_v2/timeline/chart_types.go` (new)

```go
// ChartSeriesID defines valid series identifiers
type ChartSeriesID string

const (
    SeriesNetWorth           ChartSeriesID = "net_worth"
    SeriesTotalAssets        ChartSeriesID = "total_assets"
    SeriesTotalInvestments   ChartSeriesID = "total_investments"
    SeriesTotalCash          ChartSeriesID = "total_cash"
    SeriesTotalCPF           ChartSeriesID = "total_cpf"
    SeriesCPFOA              ChartSeriesID = "cpf_oa"
    SeriesCPFSA              ChartSeriesID = "cpf_sa"
    SeriesCPFMA              ChartSeriesID = "cpf_ma"
    SeriesCPFRA              ChartSeriesID = "cpf_ra"
    SeriesTotalLiabilities   ChartSeriesID = "total_liabilities"
    SeriesTotalIncome        ChartSeriesID = "total_income"
    SeriesTotalExpenses      ChartSeriesID = "total_expenses"
    SeriesNetSavings         ChartSeriesID = "net_savings"
    SeriesNetCashFlow        ChartSeriesID = "net_cash_flow"
    SeriesAssetsByCategory   ChartSeriesID = "assets_by_category"
    SeriesLiabilitiesByCat   ChartSeriesID = "liabilities_by_category"
    SeriesIncomeByCategory   ChartSeriesID = "income_by_category"
    SeriesExpensesByCategory ChartSeriesID = "expenses_by_category"
)

// ChartRequest defines what data to return
type ChartRequest struct {
    Series           []ChartSeriesID
    Resolution       string // "yearly" | "monthly"
    IncludeScenarios bool
}

// ChartResponse is the flexible response format
type ChartResponse struct {
    Resolution   string                     `json:"resolution"`
    AnchorYear   int                        `json:"anchorYear"`
    AnchorMonth  int                        `json:"anchorMonth"`
    ScenarioIDs  []string                   `json:"scenarioIds"`
    Series       map[string]ChartSeriesData `json:"series"`
}

// ChartSeriesData represents a single data series
type ChartSeriesData struct {
    ID         string            `json:"id"`
    Name       string            `json:"name"`
    Type       string            `json:"type"` // "currency", "percentage", "stacked"
    Categories []string          `json:"categories,omitempty"` // For stacked series
    Data       []ChartDataPoint  `json:"data"`
}

// ChartDataPoint is a single point in a series
type ChartDataPoint struct {
    Index  int                `json:"index"`
    Year   int                `json:"year"`
    Month  int                `json:"month,omitempty"` // Only for monthly resolution
    Value  *decimal.Decimal   `json:"value,omitempty"` // For simple series
    Values map[string]decimal.Decimal `json:"values,omitempty"` // For stacked series
}
```

### Step 2: Implement Optimized Chart Computation

**File**: `backend/internal/financial_v2/timeline/chart_service.go` (new)

Key optimizations over full snapshot:
1. **Only compute requested series** - Skip CPF calculations if not requested
2. **Pre-filter active items** - Build active item set once, not per-month
3. **Lightweight month processing** - Don't build full response objects
4. **Category aggregation in single pass** - Collect category totals during iteration

```go
func (s *Service) GetChartData(
    ctx context.Context,
    userID string,
    req ChartRequest,
) (ChartResponse, error) {
    // 1. Load financial data (parallel, same as snapshot)
    sgData, err := s.loadFinancialData(ctx, userID, opts)

    // 2. Determine which computations are needed based on requested series
    needsCPF := seriesNeedsCPF(req.Series)
    needsCategories := seriesNeedsCategories(req.Series)

    // 3. Initialize lightweight month context (skip unneeded components)
    // 4. Process months, collecting only requested aggregations
    // 5. Build and return ChartResponse
}

// seriesNeedsCPF checks if any requested series requires CPF computation
func seriesNeedsCPF(series []ChartSeriesID) bool {
    for _, s := range series {
        switch s {
        case SeriesTotalCPF, SeriesCPFOA, SeriesCPFSA, SeriesCPFMA, SeriesCPFRA:
            return true
        }
    }
    return false
}
```

### Step 3: Update Handler to Parse Series Parameter

**File**: `backend/cmd/server/handlers/timeline_v2.go`

```go
func (h *TimelineV2Handler) HandleGetTimelineChart(w http.ResponseWriter, r *http.Request) {
    // Parse series parameter (comma-separated)
    seriesParam := r.URL.Query().Get("series")
    if seriesParam == "" {
        seriesParam = "net_worth" // Default
    }
    seriesIDs := strings.Split(seriesParam, ",")

    // Validate series IDs
    validSeries := make([]timeline_v2.ChartSeriesID, 0, len(seriesIDs))
    for _, s := range seriesIDs {
        id := timeline_v2.ChartSeriesID(strings.TrimSpace(s))
        if !timeline_v2.IsValidSeriesID(id) {
            badRequest(w, fmt.Errorf("invalid series: %s", s))
            return
        }
        validSeries = append(validSeries, id)
    }

    // Parse other params...
    req := timeline_v2.ChartRequest{
        Series:           validSeries,
        Resolution:       resolution,
        IncludeScenarios: includeScenarios,
    }

    resp, err := h.svc.GetChartData(r.Context(), userCtx.UserID, req)
    // ...
}
```

### Step 4: Frontend TypeScript Types

**File**: `frontend/src/types/chart.ts` (new)

```typescript
export type ChartSeriesID =
  | 'net_worth'
  | 'total_assets'
  | 'total_investments'
  | 'total_cash'
  | 'total_cpf'
  | 'cpf_oa' | 'cpf_sa' | 'cpf_ma' | 'cpf_ra'
  | 'total_liabilities'
  | 'total_income'
  | 'total_expenses'
  | 'net_savings'
  | 'net_cash_flow'
  | 'assets_by_category'
  | 'liabilities_by_category'
  | 'income_by_category'
  | 'expenses_by_category'

export interface ChartDataPoint {
  index: number
  year: number
  month?: number
  value?: string        // For simple series (decimal as string)
  values?: Record<string, string>  // For stacked series
}

export interface ChartSeriesData {
  id: string
  name: string
  type: 'currency' | 'percentage' | 'stacked'
  categories?: string[]  // For stacked series
  data: ChartDataPoint[]
}

export interface ChartResponse {
  resolution: 'yearly' | 'monthly'
  anchorYear: number
  anchorMonth: number
  scenarioIds: string[]
  series: Record<string, ChartSeriesData>
}

export interface ChartRequestOptions {
  series: ChartSeriesID[]
  resolution?: 'yearly' | 'monthly'
  includeScenarios?: boolean
}
```

### Step 5: Frontend API and Hook

**File**: `frontend/src/services/timelineApi.ts`

```typescript
async getChartData(options: ChartRequestOptions): Promise<ChartResponse> {
  const params = new URLSearchParams()
  params.set('series', options.series.join(','))
  if (options.resolution) {
    params.set('resolution', options.resolution)
  }
  if (options.includeScenarios) {
    params.set('includeScenarios', 'true')
  }
  return jsonRequest<ChartResponse>(
    `/financial/timeline/chart?${params.toString()}`,
    { method: 'GET' },
    API_BASE_V2
  )
}
```

**File**: `frontend/src/hooks/useChartData.ts` (new)

```typescript
export function useChartData(options: ChartRequestOptions) {
  return useQuery<ChartResponse>({
    queryKey: ['financial', 'chart', options.series.sort().join(','), options.resolution],
    queryFn: () => timelineApi.getChartData(options),
    staleTime: 1000 * 60 * 5,
  })
}
```

### Step 6: Update Chart Components

**File**: `frontend/src/components/dashboard/NetWorthProjection.tsx`

Update to use new hook and support multiple series:

```typescript
// Example: Net Worth line chart
const { data } = useChartData({
  series: ['net_worth'],
  resolution: 'monthly',
  includeScenarios: true,
})

// Example: Income vs Expenses comparison
const { data } = useChartData({
  series: ['total_income', 'total_expenses', 'net_savings'],
  resolution: 'monthly',
})

// Example: Asset allocation stacked bar chart
const { data } = useChartData({
  series: ['assets_by_category'],
  resolution: 'yearly',
})
```

---

## Chart Visualization Examples

### 1. Net Worth Projection (Current)
```
Series: ['net_worth']
Chart: Line/Area
```

### 2. Income vs Expenses
```
Series: ['total_income', 'total_expenses']
Chart: Dual line or bar comparison
```

### 3. Cash Flow Waterfall
```
Series: ['total_income', 'total_expenses', 'net_savings', 'net_cash_flow']
Chart: Waterfall or stacked bar
```

### 4. Asset Allocation Over Time
```
Series: ['assets_by_category']
Chart: Stacked area or stacked bar
```

### 5. CPF Growth Projection
```
Series: ['cpf_oa', 'cpf_sa', 'cpf_ma', 'cpf_ra']
Chart: Stacked area (shows total CPF composition over time)
```

### 6. Debt Paydown
```
Series: ['total_liabilities', 'liabilities_by_category']
Chart: Line + stacked bar combo
```

### 7. Financial Health Dashboard
```
Series: ['net_worth', 'total_assets', 'total_liabilities', 'total_cpf']
Chart: Multi-line comparison
```

## Files to Modify

### Backend (New Files)
1. `backend/internal/financial_v2/timeline/chart_types.go` - Chart request/response types
2. `backend/internal/financial_v2/timeline/chart_service.go` - Chart computation logic

### Backend (Modify)
3. `backend/cmd/server/handlers/timeline_v2.go` - Update handler to parse series param
4. `backend/cmd/server/routes.go` - Ensure route is registered

### Frontend (New Files)
5. `frontend/src/types/chart.ts` - TypeScript types for chart API
6. `frontend/src/hooks/useChartData.ts` - React Query hook

### Frontend (Modify)
7. `frontend/src/services/timelineApi.ts` - Add `getChartData` method
8. `frontend/src/components/dashboard/NetWorthProjection.tsx` - Use new hook
9. `frontend/src/components/dashboard/Dashboard.tsx` - Update to use chart API

---

## Phased Implementation

### Phase 1: Core Chart API (MVP)
**Goal**: Replace V1 timeline with V2 chart for net worth projection

**Backend**:
- Implement `ChartRequest` / `ChartResponse` types
- Implement `GetChartData` with support for:
  - `net_worth` (required for current chart)
  - `total_assets`, `total_liabilities`, `total_cpf` (useful baselines)
- Reuse existing `processMonth` logic, extract only needed aggregates

**Frontend**:
- Add types and API method
- Update `NetWorthProjection` to use new endpoint
- Verify chart renders identically to V1

**Success Criteria**:
- Chart loads in <200ms (vs 1.7s on V1)
- Net worth values match V1 exactly

### Phase 2: Income/Expense Series
**Goal**: Enable income vs expenses visualizations

**Add series**:
- `total_income`, `total_expenses`
- `net_savings`, `net_cash_flow`

**Frontend**:
- Add income/expense comparison chart component
- Add cash flow visualization

### Phase 3: CPF Breakdown
**Goal**: Enable CPF projection charts

**Add series**:
- `cpf_oa`, `cpf_sa`, `cpf_ma`, `cpf_ra`

**Frontend**:
- Add CPF stacked area chart component
- Show CPF growth over time with account breakdown

### Phase 4: Category Aggregations
**Goal**: Enable stacked bar charts by category

**Add series**:
- `assets_by_category`
- `liabilities_by_category`
- `income_by_category`
- `expenses_by_category`

**Backend optimization**:
- Collect category totals in single pass during month processing
- Return dynamic category list based on user's data

**Frontend**:
- Add stacked bar chart component
- Add asset allocation visualization

### Phase 5: Performance Optimizations
**Goal**: Sub-100ms response times

**Optimizations**:
- Pre-filter active items at start (avoid per-month `isActiveInMonth` checks)
- Skip CPF calculations when not requested
- Pre-allocate slices with capacity hints
- Consider caching for unchanged financial data

---

## Testing Strategy

### Backend Tests
1. **Unit tests** for each series calculation
2. **Comparison tests**: Verify `net_worth` from chart matches `NetWorth` from snapshot
3. **Performance tests**: Ensure <200ms for full 35-year projection

### Frontend Tests
1. **Visual regression**: Chart renders same as V1
2. **Integration**: Hook correctly fetches and caches data
3. **Type safety**: TypeScript catches mismatches

---

## Future Considerations

### Additional Series Ideas
- `savings_rate` - Percentage series (net_savings / total_income)
- `debt_to_income` - Percentage series
- `fire_number` - 25x annual expenses projection
- `investment_returns` - Separate from principal

### Caching Strategy
- Financial data rarely changes; consider caching chart responses
- Invalidate on any financial data mutation
- Could use Redis or in-memory cache with TTL

### Real-time Updates
- WebSocket support for live chart updates during scenario editing
- Debounced recalculation as user adjusts sliders
