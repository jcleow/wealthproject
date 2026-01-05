# SG Income Tax Projections - Implementation Plan

## Overview

Enable income tax projections across multiple years with automatic calculation from projected income, recurring relief patterns, and scenario-aware relief suggestions.

---

## Requirements Summary

| Aspect | Decision |
|--------|----------|
| **Tax Calculation** | Hybrid: Auto-calculate from income, user can override per-year |
| **Relief Projection** | Copy-forward + percentage-based (CPF) + per-year overrides |
| **Payment Timing** | User-configurable: lump sum (specify month) or GIRO installments |
| **Data Storage** | Separate `sg_income_tax` table |
| **Scenario Integration** | Auto-recompute on scenarios, show markers, allow opt-out |

---

## Data Model

### New Table: `sg_income_tax`

```sql
CREATE TABLE sg_income_tax (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id varchar(36) NOT NULL,

  -- Versioning (same pattern as other financial items)
  parent_id uuid REFERENCES sg_income_tax(id) ON DELETE CASCADE,
  start_date timestamp with time zone DEFAULT now(),
  end_date timestamp with time zone,

  -- Tax Year (Assessment Year, e.g., YA2025 = income earned in 2024)
  assessment_year int NOT NULL,  -- e.g., 2025, 2026

  -- Residency
  residency_status text CHECK (residency_status IN ('resident', 'non_resident')) DEFAULT 'resident',

  -- Reliefs Configuration (JSONB for flexibility)
  reliefs jsonb NOT NULL DEFAULT '{}',
  -- Structure: {
  --   "earned_income": { "amount": 1000, "source": "default" | "scenario" | "override", "scenario_id": null },
  --   "cpf_employee": { "amount": null, "auto_calculate": true },
  --   "spouse_relief": { "amount": 2000, "source": "scenario", "scenario_id": "uuid" },
  --   ...
  -- }

  -- Payment Configuration
  payment_method text CHECK (payment_method IN ('lump_sum', 'giro_10', 'giro_12')) DEFAULT 'giro_12',
  lump_sum_month int CHECK (lump_sum_month >= 1 AND lump_sum_month <= 12),  -- For lump_sum: which month (1-12)

  -- Computed Values (cached for performance, recalculated on changes)
  gross_income numeric(15,4),           -- Sum of all income sources
  total_reliefs numeric(15,4),          -- Sum of all claimed reliefs
  chargeable_income numeric(15,4),      -- After reliefs
  tax_payable numeric(15,4),            -- Final tax amount

  -- Override flag
  is_override boolean DEFAULT false,    -- If true, user manually set tax_payable
  override_tax_payable numeric(15,4),   -- Manual override value

  -- Metadata
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),

  -- Constraints
  CONSTRAINT sg_income_tax_year_unique EXCLUDE USING gist (
    user_id WITH =,
    int4range(assessment_year, assessment_year, '[]') WITH &&,
    tstzrange(start_date, COALESCE(end_date, 'infinity'), '[)') WITH &&
  )
);

CREATE INDEX idx_sg_income_tax_user ON sg_income_tax(user_id);
CREATE INDEX idx_sg_income_tax_year ON sg_income_tax(user_id, assessment_year);
```

### Relief Source Tracking

Each relief tracks its origin:

```typescript
type ReliefSource = 'default' | 'user' | 'scenario' | 'auto_cpf';

interface ReliefEntry {
  amount: number | null;           // null = auto-calculate
  source: ReliefSource;
  scenarioId?: string;             // If source === 'scenario'
  autoCalculate?: boolean;         // For CPF-based reliefs
  enabled: boolean;                // User can disable scenario-suggested reliefs
}

interface TaxReliefs {
  earned_income: ReliefEntry;
  cpf_employee: ReliefEntry;       // Auto-calculated from CPF contributions
  cpf_self_employed: ReliefEntry;
  life_insurance: ReliefEntry;
  course_fees: ReliefEntry;
  spouse_relief: ReliefEntry;      // Scenario: marriage event
  child_relief: ReliefEntry;       // Scenario: child event
  working_mother_child: ReliefEntry;
  parent_relief: ReliefEntry;
  handicapped_relative: ReliefEntry;
  cpf_cash_topup: ReliefEntry;     // Linked to CPF top-up events
  srs_relief: ReliefEntry;
  nsman_relief: ReliefEntry;
  // ... extensible
}
```

---

## Backend Architecture

### 1. Tax Projection Service

**Location:** `backend/internal/financial_v2/tax/`

```
tax/
├── service.go          # CRUD operations
├── calculator.go       # Tax calculation engine
├── projector.go        # Multi-year projection with income aggregation
├── scenario_linker.go  # Links scenarios to reliefs
└── types.go            # Go structs
```

**Key Functions:**

```go
// ProjectTax calculates tax for a given assessment year
// using projected income from timeline + relief configuration
func (s *TaxService) ProjectTax(ctx context.Context, userID string, assessmentYear int) (*TaxProjection, error)

// GetOrCreateTaxConfig returns existing config or creates default
// with copy-forward from previous year
func (s *TaxService) GetOrCreateTaxConfig(ctx context.Context, userID string, assessmentYear int) (*TaxConfig, error)

// ApplyScenarioReliefs scans active scenarios and suggests reliefs
func (s *TaxService) ApplyScenarioReliefs(ctx context.Context, userID string, assessmentYear int) ([]ScenarioRelief, error)

// CalculateTaxFromIncome computes tax given income streams
func (c *TaxCalculator) CalculateTaxFromIncome(income decimal.Decimal, reliefs TaxReliefs, residency string) (*TaxResult, error)
```

### 2. Income Aggregation

Tax calculation needs projected income for the **income year** (AY2025 = income from Jan-Dec 2024):

```go
// GetAnnualIncome aggregates all income for a calendar year
func (s *TaxService) GetAnnualIncome(ctx context.Context, userID string, incomeYear int) (*AnnualIncome, error) {
  // 1. Get all income sources with date ranges overlapping the year
  // 2. Apply growth rates for projection
  // 3. Include CPF contributions (for employee relief)
  // 4. Return breakdown by category
}

type AnnualIncome struct {
  Employment    decimal.Decimal  // Salary, bonuses
  Rental        decimal.Decimal  // Property income
  Business      decimal.Decimal  // Self-employment
  Investment    decimal.Decimal  // Dividends, interest
  Other         decimal.Decimal
  TotalGross    decimal.Decimal
  CPFEmployee   decimal.Decimal  // For auto-calculating CPF relief
}
```

### 3. Scenario-Relief Mapping

```go
var scenarioReliefMap = map[string][]string{
  "marriage":    {"spouse_relief"},
  "child":       {"child_relief", "working_mother_child"},
  "cpf_topup":   {"cpf_cash_topup"},
  "parent_care": {"parent_relief"},
}

type ScenarioRelief struct {
  ReliefType   string
  Amount       decimal.Decimal
  ScenarioID   string
  ScenarioName string
  EventDate    time.Time
  CanOptOut    bool  // Always true
}
```

---

## API Endpoints

### Tax Configuration

```
GET    /api/v2/tax/config/{year}          # Get tax config for assessment year
POST   /api/v2/tax/config                 # Create tax config
PUT    /api/v2/tax/config/{year}          # Update tax config (reliefs, payment method)
DELETE /api/v2/tax/config/{year}          # Delete tax config

GET    /api/v2/tax/projection/{year}      # Get calculated tax projection
GET    /api/v2/tax/projections            # Get all years (for timeline)

POST   /api/v2/tax/calculate              # One-off calculation (preview)
```

### Request/Response Examples

**GET /api/v2/tax/projection/2025**

```json
{
  "assessmentYear": 2025,
  "incomeYear": 2024,
  "residencyStatus": "resident",

  "income": {
    "employment": 120000,
    "rental": 24000,
    "totalGross": 144000
  },

  "reliefs": {
    "earned_income": { "amount": 1000, "source": "default", "enabled": true },
    "cpf_employee": { "amount": 20400, "source": "auto_cpf", "enabled": true },
    "spouse_relief": { "amount": 2000, "source": "scenario", "scenarioId": "abc-123", "scenarioName": "Marriage in 2024", "enabled": true },
    "child_relief": { "amount": 4000, "source": "scenario", "scenarioId": "def-456", "scenarioName": "First child", "enabled": true }
  },

  "calculation": {
    "grossIncome": 144000,
    "totalReliefs": 27400,
    "chargeableIncome": 116600,
    "taxPayable": 8594,
    "effectiveRate": 5.97
  },

  "payment": {
    "method": "giro_12",
    "monthlyAmount": 716.17,
    "schedule": [
      { "month": "2025-01", "amount": 716.17 },
      // ... 12 entries
    ]
  },

  "isOverride": false,
  "scenarioReliefs": [
    { "reliefType": "spouse_relief", "scenarioId": "abc-123", "scenarioName": "Marriage in 2024" },
    { "reliefType": "child_relief", "scenarioId": "def-456", "scenarioName": "First child" }
  ]
}
```

---

## Timeline Integration

### Tax in Monthly Snapshots

Modify timeline service to include tax as expense:

```go
type MonthDetail struct {
  // Existing fields...
  Income    []IncomeItem
  Expenses  []ExpenseItem

  // NEW: Tax breakdown
  Tax *TaxItem  // nil if no tax for this month
}

type TaxItem struct {
  Type           string          // "sg_income_tax"
  AssessmentYear int             // Which tax year this payment belongs to
  Amount         decimal.Decimal // Payment for this month
  PaymentMethod  string          // "giro_12", "giro_10", "lump_sum"
  PaymentNumber  int             // e.g., 3 of 12 for GIRO
}
```

### Payment Distribution Logic

```go
func (s *TaxService) GetMonthlyTaxPayments(ctx context.Context, userID string, startDate, endDate time.Time) ([]MonthlyTaxPayment, error) {
  // For each assessment year with tax payable:
  // - If giro_12: spread across Jan-Dec of assessment year
  // - If giro_10: spread across Apr-Jan (10 months)
  // - If lump_sum: single payment in specified month
}
```

---

## Frontend Changes

### 1. Tax Modal Updates

**New UI Elements:**

- **Scenario Markers**: Badge/tag next to reliefs added by scenarios
  ```tsx
  <ReliefRow>
    <Label>Spouse Relief</Label>
    <Amount>$2,000</Amount>
    {relief.source === 'scenario' && (
      <ScenarioBadge scenarioName={relief.scenarioName}>
        <Sparkles className="h-3 w-3" /> From scenario
      </ScenarioBadge>
    )}
    <Toggle checked={relief.enabled} onChange={...} />
  </ReliefRow>
  ```

- **Override Toggle**: Allow user to manually set tax amount
  ```tsx
  <OverrideSection>
    <Checkbox checked={isOverride} onChange={...} />
    <Label>Override calculated tax</Label>
    {isOverride && <Input value={overrideTaxPayable} />}
  </OverrideSection>
  ```

- **Payment Method Selector**:
  ```tsx
  <PaymentMethodSelector>
    <Option value="giro_12">GIRO (12 months)</Option>
    <Option value="giro_10">GIRO (10 months)</Option>
    <Option value="lump_sum">Lump Sum</Option>
  </PaymentMethodSelector>
  {paymentMethod === 'lump_sum' && (
    <MonthSelector value={lumpSumMonth} />
  )}
  ```

### 2. New Hooks

```typescript
// hooks/queries/useTaxQuery.ts
export function useTaxProjectionQuery(assessmentYear: number) {
  return useQuery({
    queryKey: ['tax', 'projection', assessmentYear],
    queryFn: () => financialApi.getTaxProjection(assessmentYear),
  });
}

export function useTaxConfigMutation() {
  return useMutation({
    mutationFn: financialApi.updateTaxConfig,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tax'] });
      queryClient.invalidateQueries({ queryKey: ['timeline'] }); // Tax affects timeline
    },
  });
}
```

### 3. Timeline Display

Tax appears as expense line item in monthly breakdown:

```tsx
// In timeline month detail
{monthData.tax && (
  <ExpenseRow type="tax">
    <Icon><Receipt className="h-4 w-4 text-rose-400" /></Icon>
    <Label>Income Tax (YA{monthData.tax.assessmentYear})</Label>
    <Amount className="text-rose-400">
      ({formatCurrency(monthData.tax.amount)})
    </Amount>
    {monthData.tax.paymentMethod === 'giro_12' && (
      <Badge>{monthData.tax.paymentNumber}/12</Badge>
    )}
  </ExpenseRow>
)}
```

---

## Copy-Forward Logic

When user accesses a future year without config:

```go
func (s *TaxService) GetOrCreateTaxConfig(ctx context.Context, userID string, year int) (*TaxConfig, error) {
  // 1. Check if config exists for this year
  existing, err := s.repo.GetByYear(userID, year)
  if existing != nil {
    return existing, nil
  }

  // 2. Find most recent previous year config
  previous, _ := s.repo.GetMostRecentBefore(userID, year)

  // 3. Create new config
  newConfig := &TaxConfig{
    UserID:          userID,
    AssessmentYear:  year,
    ResidencyStatus: "resident",
    PaymentMethod:   "giro_12",
  }

  if previous != nil {
    // Copy forward reliefs (excluding auto-calculated ones)
    newConfig.Reliefs = copyForwardReliefs(previous.Reliefs)
    newConfig.ResidencyStatus = previous.ResidencyStatus
    newConfig.PaymentMethod = previous.PaymentMethod
    newConfig.LumpSumMonth = previous.LumpSumMonth
  }

  // 4. Apply scenario-suggested reliefs
  scenarioReliefs, _ := s.ApplyScenarioReliefs(ctx, userID, year)
  for _, sr := range scenarioReliefs {
    newConfig.Reliefs[sr.ReliefType] = ReliefEntry{
      Amount:     sr.Amount,
      Source:     "scenario",
      ScenarioID: sr.ScenarioID,
      Enabled:    true,
    }
  }

  return s.repo.Create(newConfig)
}
```

---

## Implementation Phases

### Phase 1: Backend Foundation
1. Create `sg_income_tax` table migration
2. Implement tax repository (CRUD)
3. Implement tax calculator (port from frontend)
4. Implement income aggregation from timeline
5. Add API endpoints

### Phase 2: Timeline Integration
1. Modify timeline service to include tax
2. Implement payment distribution logic
3. Add tax to snapshot responses
4. Test with different payment methods

### Phase 3: Scenario Integration
1. Implement scenario-relief mapping
2. Add scenario detection logic
3. Create relief source tracking
4. Test auto-relief suggestions

### Phase 4: Frontend Updates
1. Migrate from localStorage to API
2. Add scenario badges to relief rows
3. Add override toggle
4. Add payment method selector
5. Update timeline display

### Phase 5: Copy-Forward & Defaults
1. Implement copy-forward logic
2. Add default relief configuration
3. Handle missing year gracefully
4. Test multi-year projection

---

## Decisions

| Question | Decision |
|----------|----------|
| **SRS Integration** | Yes, auto-populate when SRS feature is built (see #95) |
| **Rental Income** | Yes, auto-include from property scenarios |
| **Historical Data** | No migration - start fresh (alpha build) |
| **Notifications** | Yes, show badge on scenario-affected reliefs |
