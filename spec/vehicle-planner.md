# Vehicle Planner — Feature Specification

## Overview

A Singapore-specific vehicle ownership cost planner that calculates total cost of ownership including COE, ARF, PARF rebates, VES, road tax, financing, depreciation, and recurring expenses. Supports Cars (Cat A/B) and Motorcycles (Cat D), ICE and EV powertrains, new and used vehicles.

Follows the Insurance Planner architecture: full-screen takeover with tabbed navigation, Zustand state management with localStorage persistence, and net worth integration (depreciating asset + car loan + recurring expenses).

---

## Architecture

### Pattern

| Aspect | Choice | Rationale |
|--------|--------|-----------|
| UI pattern | Full-screen takeover | Complex multi-tab UI needs full viewport (same as Insurance Planner) |
| Vehicle types | Cars + Motorcycles | Cat A (≤1600cc/97kW), Cat B (>1600cc/97kW), Cat D (motorcycles) |
| EV support | ICE + EV from start | Different road tax (kW-based), VES rebates, AFC surcharge |
| State management | Zustand + localStorage | Same pattern as Insurance Planner; backend persistence as follow-up |
| Net worth integration | Full | Creates: depreciating asset, car loan liability, 5+ expense items |

### File Structure

```
frontend/src/
├── app/vehicle-planner/
│   └── page.tsx                          # Standalone page + VehiclePlannerView export
├── components/vehicle-planner/
│   ├── VehiclePlannerView.tsx            # Main view component (full-screen takeover)
│   ├── VehiclePlannerTabs.tsx            # Tab buttons (5 tabs)
│   ├── tabs/
│   │   ├── VehicleFinancingTab.tsx       # Tab 1: Vehicle details + financing inputs
│   │   ├── CostBreakdownTab.tsx          # Tab 2: Waterfall/pie charts of costs
│   │   ├── DepreciationTab.tsx           # Tab 3: Value curves + PARF/COE rebates
│   │   ├── TotalCostTab.tsx             # Tab 4: 10-year TCO summary
│   │   └── ScenariosTab.tsx             # Tab 5: Side-by-side comparison
│   ├── cards/
│   │   ├── CostSummaryCard.tsx           # Live cost breakdown sidebar
│   │   ├── FinancingSummaryCard.tsx       # Loan details summary
│   │   └── DepreciationScheduleCard.tsx  # Year-by-year table
│   └── shared/
│       ├── VehicleTypeSelector.tsx        # Car Cat A / Cat B / Motorcycle selector
│       ├── FuelTypeToggle.tsx            # Petrol / Diesel / Electric / Hybrid
│       └── CostWaterfallChart.tsx        # Waterfall visualization
├── stores/
│   └── vehiclePlannerStore.ts            # Zustand store with persist middleware
├── types/
│   └── vehicle.ts                        # All TypeScript types
└── lib/
    └── vehicle/
        ├── constants.ts                  # All tax rates, tiers, fees
        ├── calculations.ts               # ARF, road tax, depreciation, TCO
        └── formatting.ts                 # Vehicle-specific formatters
```

### Files to Modify

| File | Change |
|------|--------|
| `stores/featureModulesStore.ts` | Add `showVehiclePlanner`, `openVehiclePlanner`, `closeVehiclePlanner` |
| `components/dashboard/FinancialWorkspace.tsx` | Add Vehicle Planner to Modules dropdown menu |
| `components/dashboard/Dashboard.tsx` | Dynamic import + conditional render of VehiclePlannerView |

---

## 1. Singapore Vehicle Cost Model

### 1.1 Upfront Costs

**Registration Price = OMV + Excise Duty + GST + ARF + COE + Registration Fee ± VES ± EEAI**

| Component | Formula |
|-----------|---------|
| OMV | User input (Open Market Value declared by customs) |
| Excise Duty | `OMV × 20%` |
| GST | `(OMV + Excise Duty) × 9%` |
| ARF | Tiered (see below) |
| COE | User input (current bidding price for category) |
| Registration Fee | $220 (fixed) |
| VES | Rebate or surcharge based on CO2 band |
| EEAI | 45% of ARF, capped (EVs only, until 2027) |

#### ARF Tiers (revised Feb 2023)

| OMV Range | Rate |
|-----------|------|
| First $20,000 | 100% |
| $20,001 – $40,000 | 140% |
| $40,001 – $60,000 | 190% |
| $60,001 – $80,000 | 250% |
| Above $80,000 | 320% |

```typescript
function calculateARF(omv: number): number {
  const tiers = [
    { limit: 20000, rate: 1.00 },
    { limit: 40000, rate: 1.40 },
    { limit: 60000, rate: 1.90 },
    { limit: 80000, rate: 2.50 },
    { limit: Infinity, rate: 3.20 },
  ]
  let arf = 0
  let remaining = omv
  let previousLimit = 0

  for (const tier of tiers) {
    const taxable = Math.min(remaining, tier.limit - previousLimit)
    arf += taxable * tier.rate
    remaining -= taxable
    previousLimit = tier.limit
    if (remaining <= 0) break
  }
  return arf
}
```

**Verification:** OMV $50,000 → `20,000×1.0 + 20,000×1.4 + 10,000×1.9` = `20,000 + 28,000 + 19,000` = **$67,000**

#### VES Bands

**2024–2025 Scheme:**

| Band | CO2 (g/km) | Amount |
|------|-----------|--------|
| A1 | ≤ 90 | $25,000 rebate |
| A2 | 91–120 | $5,000 rebate |
| B | 121–159 | $0 |
| C1 | 160–182 | $15,000 surcharge |
| C2 | > 182 | $25,000 surcharge |

**2026 Scheme (EV-focused):**

| Band | CO2 (g/km) | Amount |
|------|-----------|--------|
| A | 0 (EV only) | $22,500 rebate |
| B | 1–159 | $0 |
| C1 | 160–182 | $7,500 surcharge |
| C2 | 183–210 | $22,500 surcharge |
| C3 | > 210 | $35,000 surcharge |

**2027 Scheme:**

| Band | CO2 (g/km) | Amount |
|------|-----------|--------|
| A | 0 (EV only) | $20,000 rebate |
| B | 1–159 | $0 |
| C1 | 160–182 | $15,000 surcharge |
| C2 | 183–210 | $30,000 surcharge |
| C3 | > 210 | $45,000 surcharge |

#### EEAI (EV Early Adoption Incentive)

| Period | Rebate | Cap |
|--------|--------|-----|
| 2024–2025 | 45% of ARF | $15,000 |
| 2026 | 45% of ARF | $7,500 |
| 2027+ | Ceased | — |

### 1.2 Financing

#### LTV Limits (MAS Regulation)

| Condition | Max LTV |
|-----------|---------|
| OMV ≤ $20,000 | 70% of purchase price |
| OMV > $20,000 | 60% of purchase price |
| Motorcycles | No LTV restriction |

**Max loan tenure:** 7 years (cars only; no restriction for motorcycles)

#### Interest Rate Conversion

Dealers quote a **flat rate** (e.g., 2.78%). The actual cost is the **Effective Interest Rate (EIR)**.

```
Approximation: EIR ≈ flatRate × 1.85  (for 7-year loans)
Exact:         EIR = 2 × n × flatRate / (n + 1)   where n = number of monthly payments
```

#### Monthly Installment (EIR-based amortization)

```
monthlyRate = EIR / 12
months = tenure × 12
monthlyPayment = loanAmount × monthlyRate / (1 - (1 + monthlyRate)^(-months))
```

### 1.3 Road Tax (6-Monthly Rates)

All formulas produce a **6-monthly** amount. Annual road tax = 6-monthly × 2.

The `0.782` factor is the current road tax rebate applied by LTA.

#### Cars — ICE (CC-based)

| Engine CC | 6-Monthly Base Formula |
|-----------|----------------------|
| ≤ 600 | $200 |
| 601–1,000 | $200 + $0.125 × (CC − 600) |
| 1,001–1,600 | $250 + $0.375 × (CC − 1,000) |
| 1,601–3,000 | $475 + $0.75 × (CC − 1,600) |
| > 3,000 | $1,525 + $1.00 × (CC − 3,000) |

**Final = Base × 0.782** (road tax rebate factor)

**Verification:** 1,600cc → `[$250 + $0.375 × 600] × 0.782` = `$475 × 0.782` = **$371.45** per 6 months

#### Cars — EV (Power-based, kW)

| Power (kW) | 6-Monthly Base Formula |
|------------|----------------------|
| ≤ 7.5 | $200 |
| 7.5–30 | $200 + $2.00 × (kW − 7.5) |
| 30–230 | $250 + $3.75 × (kW − 30) |
| > 230 | $1,525 + $10.00 × (kW − 230) |

**Final = (Base × 0.782) + AFC**

AFC (Additional Flat Component) = $350 per 6 months — proxy for fuel excise duty on EVs.

#### Motorcycles (CC-based)

| Engine CC | 6-Monthly Base Formula |
|-----------|----------------------|
| ≤ 200 | $40 |
| 201–1,000 | $40 + $0.15 × (CC − 200) |
| > 1,000 | $160 + $0.30 × (CC − 1,000) |

**Final = Base × 0.782**

### 1.4 Depreciation & Residual Value

#### PARF Rebate Schedule (vehicles registered from Feb 2023)

| Age at Deregistration | PARF Rebate (% of ARF) |
|-----------------------|------------------------|
| ≤ 5 years | 75% |
| 6 years | 70% |
| 7 years | 65% |
| 8 years | 60% |
| 9 years | 55% |
| 10 years | 50% |
| > 10 years | 0% |

**PARF cap:** Maximum $60,000 rebate regardless of ARF amount.

#### COE Rebate

Pro-rated by remaining months on the 10-year COE:

```
coeRebate = coePaid × (remainingMonths / 120)
```

#### Scrap Value

```
scrapValue = min(parfRebate, $60,000) + coeRebate
```

#### Market Value Depreciation

Default depreciation curve (configurable via periods):

| Year | Default Annual Rate |
|------|-------------------|
| 1 | 15% |
| 2–3 | 10% |
| 4–5 | 8% |
| 6–10 | 5% |

User can override with custom `DepreciationPeriod` entries (same pattern as property planner appreciation periods).

### 1.5 Recurring Costs

| Cost | Frequency | Default Estimate |
|------|-----------|-----------------|
| Road Tax | Annual | Calculated from CC/kW |
| Motor Insurance | Annual | User input (varies by driver profile) |
| Petrol/Electricity | Monthly | User input |
| Maintenance/Servicing | Annual | $1,500 (car), $500 (motorcycle) |
| Parking (Season) | Monthly | $0 (user input) |
| ERP/Tolls | Monthly | $0 (user input) |

---

## 2. Data Model

```typescript
// ─── Enums ───────────────────────────────────────────

type VehicleCategory = 'car_cat_a' | 'car_cat_b' | 'motorcycle_cat_d'
type FuelType = 'petrol' | 'diesel' | 'electric' | 'hybrid_petrol' | 'hybrid_diesel'
type VehicleCondition = 'new' | 'used'
type VesPeriod = '2024_2025' | '2026' | '2027'

// ─── Main Scenario ───────────────────────────────────

interface VehicleScenario {
  id: string
  name: string                    // e.g. "Toyota Corolla Hybrid 2026"
  inputs: VehicleInputs
  recurringCosts: VehicleRecurringCosts
  isIncluded: boolean             // Include in financial planning / net worth
  createdAt: number
  updatedAt: number
}

// ─── User Inputs ─────────────────────────────────────

interface VehicleInputs {
  // Vehicle details
  vehicleCategory: VehicleCategory
  fuelType: FuelType
  condition: VehicleCondition
  engineCapacityCc: number | null  // null for EVs
  powerKw: number | null           // required for EVs (road tax), optional for ICE
  co2EmissionsGkm: number | null   // for VES calculation

  // Age (for used vehicles)
  vehicleAge: number               // 0 for new, years for used
  remainingCoeMonths: number       // 120 for new, user input for used
  isPafrEligible: boolean          // true for new, user input for used

  // Pricing
  omv: number                      // Open Market Value
  listPrice: number                // Dealer asking price (for reference/comparison)
  coePrice: number                 // COE premium (current bidding price)
  vesPeriod: VesPeriod             // Which VES schedule to use

  // Financing
  useFinancing: boolean
  loanAmount: number               // Must respect LTV limits
  loanTenureYears: number          // Max 7 for cars
  interestRateFlat: number         // Flat rate quoted by dealer (e.g. 2.78)

  // Purchase timing
  purchaseMonth: string            // YYYY-MM

  // Depreciation override
  depreciationPeriods: DepreciationPeriod[]

  // Payment source
  downpaymentCashAccountId: string | null
}

interface DepreciationPeriod {
  id: string
  startYear: number
  endYear: number | null           // null = until end
  annualRate: number               // percentage, e.g. 15 for 15%
}

// ─── Recurring Costs ─────────────────────────────────

interface VehicleRecurringCosts {
  insuranceAnnual: number
  fuelMonthly: number              // petrol or electricity
  maintenanceAnnual: number
  parkingMonthly: number
  erpMonthly: number
  otherMonthly: number
}

// ─── Calculation Results ─────────────────────────────

interface VehicleCalculationResult {
  // Upfront costs breakdown
  exciseDuty: number
  gst: number
  arf: number
  registrationFee: number
  vesAmount: number                // positive = surcharge, negative = rebate
  eeaiRebate: number              // EV only, always ≤ 0
  totalRegistrationCost: number    // OMV + all taxes + COE ± VES ± EEAI

  // Financing
  effectiveInterestRate: number
  monthlyInstallment: number
  totalInterestPaid: number
  totalLoanRepayment: number
  downpayment: number
  maxLtvPercent: number
  maxLoanAllowed: number

  // Road tax
  sixMonthlyRoadTax: number
  annualRoadTax: number

  // Depreciation schedule (10 years)
  depreciationSchedule: YearlyDepreciation[]

  // Total Cost of Ownership
  totalCostOfOwnership: TotalCostOfOwnership
}

interface YearlyDepreciation {
  year: number
  marketValue: number
  scrapValue: number               // PARF + COE rebate
  parfRebate: number
  coeRebate: number
  annualDepreciation: number       // Market value drop from previous year
  cumulativeDepreciation: number   // Total drop from purchase price
}

interface TotalCostOfOwnership {
  years: number                    // ownership period (1–10)
  upfrontCosts: number             // total registration cost (or purchase price for used)
  totalLoanInterest: number
  totalRoadTax: number
  totalInsurance: number
  totalFuel: number
  totalMaintenance: number
  totalParking: number
  totalErp: number
  totalOther: number
  residualValue: number            // Scrap/resale value at end of period
  netTotalCost: number             // All costs minus residual value
  costPerMonth: number
  costPerYear: number
}
```

---

## 3. Constants File

All tax rates, tiers, and fees defined as constants for easy updates when LTA revises rates:

```typescript
// constants.ts

export const ARF_TIERS = [
  { limit: 20000, rate: 1.00 },
  { limit: 40000, rate: 1.40 },
  { limit: 60000, rate: 1.90 },
  { limit: 80000, rate: 2.50 },
  { limit: Infinity, rate: 3.20 },
] as const

export const ROAD_TAX_ICE_TIERS = [
  { limit: 600,  base: 200, rate: 0 },
  { limit: 1000, base: 200, rate: 0.125 },
  { limit: 1600, base: 250, rate: 0.375 },
  { limit: 3000, base: 475, rate: 0.75 },
  { limit: Infinity, base: 1525, rate: 1.0 },
] as const

export const ROAD_TAX_EV_TIERS = [
  { limit: 7.5,  base: 200, rate: 0 },
  { limit: 30,   base: 200, rate: 2.0 },
  { limit: 230,  base: 250, rate: 3.75 },
  { limit: Infinity, base: 1525, rate: 10.0 },
] as const

export const ROAD_TAX_MOTORCYCLE_TIERS = [
  { limit: 200,  base: 40, rate: 0 },
  { limit: 1000, base: 40, rate: 0.15 },
  { limit: Infinity, base: 160, rate: 0.30 },
] as const

export const VES_BANDS = {
  '2024_2025': [
    { maxCo2: 90,  amount: -25000 },
    { maxCo2: 120, amount: -5000 },
    { maxCo2: 159, amount: 0 },
    { maxCo2: 182, amount: 15000 },
    { maxCo2: Infinity, amount: 25000 },
  ],
  '2026': [
    { maxCo2: 0,   amount: -22500, evOnly: true },
    { maxCo2: 159, amount: 0 },
    { maxCo2: 182, amount: 7500 },
    { maxCo2: 210, amount: 22500 },
    { maxCo2: Infinity, amount: 35000 },
  ],
  '2027': [
    { maxCo2: 0,   amount: -20000, evOnly: true },
    { maxCo2: 159, amount: 0 },
    { maxCo2: 182, amount: 15000 },
    { maxCo2: 210, amount: 30000 },
    { maxCo2: Infinity, amount: 45000 },
  ],
} as const

export const EEAI_SCHEDULE = {
  '2024_2025': { rate: 0.45, cap: 15000 },
  '2026':      { rate: 0.45, cap: 7500 },
  '2027':      { rate: 0,    cap: 0 },
} as const

export const PARF_REBATE_SCHEDULE = [
  { maxAge: 5,  rebatePercent: 0.75 },
  { maxAge: 6,  rebatePercent: 0.70 },
  { maxAge: 7,  rebatePercent: 0.65 },
  { maxAge: 8,  rebatePercent: 0.60 },
  { maxAge: 9,  rebatePercent: 0.55 },
  { maxAge: 10, rebatePercent: 0.50 },
] as const

export const LTV_LIMITS = {
  lowOmv: { threshold: 20000, maxLtv: 0.70 },
  highOmv: { maxLtv: 0.60 },
} as const

export const MAX_LOAN_TENURE_YEARS = 7
export const REGISTRATION_FEE = 220
export const EXCISE_DUTY_RATE = 0.20
export const GST_RATE = 0.09
export const ROAD_TAX_REBATE_FACTOR = 0.782
export const EV_AFC_SIX_MONTHLY = 350
export const PARF_CAP = 60000
export const COE_DURATION_MONTHS = 120

export const DEFAULT_DEPRECIATION_PERIODS: DepreciationPeriod[] = [
  { id: 'yr1',   startYear: 1, endYear: 1,    annualRate: 15 },
  { id: 'yr2-3', startYear: 2, endYear: 3,    annualRate: 10 },
  { id: 'yr4-5', startYear: 4, endYear: 5,    annualRate: 8 },
  { id: 'yr6+',  startYear: 6, endYear: null,  annualRate: 5 },
]

export const DEFAULT_RECURRING_COSTS = {
  car: {
    maintenanceAnnual: 1500,
    insuranceAnnual: 1200,
    fuelMonthly: 200,
    parkingMonthly: 0,
    erpMonthly: 0,
    otherMonthly: 0,
  },
  motorcycle: {
    maintenanceAnnual: 500,
    insuranceAnnual: 300,
    fuelMonthly: 80,
    parkingMonthly: 0,
    erpMonthly: 0,
    otherMonthly: 0,
  },
} as const
```

---

## 4. UI Structure

### Full-Screen Takeover Layout

Same pattern as Insurance Planner in `Dashboard.tsx`:

```tsx
// When showVehiclePlanner is true:
<div className="shrink-0">
  <FinancialWorkspace headerOnly />
</div>
<div className="flex-1 overflow-hidden rounded-2xl">
  <VehiclePlannerView onClose={closeVehiclePlanner} />
</div>
```

### Tab Navigation (5 Tabs)

| # | Tab ID | Label | Icon | Description |
|---|--------|-------|------|-------------|
| 1 | `vehicle` | Vehicle & Financing | `Car` | Vehicle details, pricing, loan setup |
| 2 | `costs` | Cost Breakdown | `Receipt` | Waterfall/pie charts of all cost components |
| 3 | `depreciation` | Depreciation | `TrendingDown` | Market value vs scrap value curves |
| 4 | `tco` | Total Cost | `Calculator` | 10-year TCO summary and recurring costs |
| 5 | `scenarios` | Scenarios | `GitCompare` | Side-by-side vehicle comparison |

### Tab 1: Vehicle & Financing

**Left Panel (Input Form):**
- Vehicle type selector: 3 cards (Car Cat A / Car Cat B / Motorcycle Cat D)
  - Cat A: ≤1,600cc or ≤97kW
  - Cat B: >1,600cc or >97kW
  - Cat D: Motorcycles
- Fuel type toggle: Petrol | Diesel | Electric | Hybrid
- New vs Used toggle
- OMV input field
- Engine CC input (hidden for EVs) / Power kW input (shown for EVs, optional for ICE)
- CO2 emissions input (for VES)
- COE price input with auto-detected category badge
- List/dealer price input (reference only)

**Financing Section:**
- Enable financing toggle
- Loan amount input with max LTV indicator badge
- Loan tenure slider (1–7 years)
- Flat interest rate input
- Auto-calculated: EIR, monthly installment, total interest

**Right Panel (Live Summary Card):**
- Registration cost breakdown (OMV, excise, GST, ARF, COE, VES, EEAI, reg fee)
- Total registration price (highlighted)
- Financing summary (downpayment, monthly payment, total interest)
- Road tax (annual)

### Tab 2: Cost Breakdown

- **Waterfall chart:** OMV → +Excise → +GST → +ARF → +COE → ±VES → ±EEAI → +RegFee = Total
- **Pie chart:** Composition of total registration cost
- **VES callout card:** Shows band, rebate/surcharge amount, CO2 rating
- **EEAI callout card:** (if EV) Shows rebate amount and cap
- **Comparison bar:** Your vehicle vs average Cat A / Cat B cost

### Tab 3: Depreciation & Value

- **Dual-line chart:** Market value (declining curve) vs Scrap value (PARF + COE rebate)
- **PARF rebate timeline:** Bar chart showing PARF rebate at each year (75% → 50% → 0%)
- **COE rebate curve:** Linear decline over 10 years
- **Optimal deregistration highlight:** Year where (market value - scrap value) gap is smallest
- **Year-by-year table:** Market value, scrap value, PARF rebate, COE rebate, annual depreciation

### Tab 4: Total Cost of Ownership

- **10-year TCO summary card:** Net total cost, cost/month, cost/year
- **Ownership period selector:** Slider or segmented control (1–10 years)
- **Recurring costs editor:** Inline editable fields for insurance, fuel, maintenance, parking, ERP
- **Stacked area chart:** Cumulative costs over time (fuel, insurance, road tax, maintenance stacked)
- **Cost per km:** Optional estimate if user provides annual mileage

### Tab 5: Scenarios

- **Scenario list:** Cards showing saved vehicle scenarios
- **Add scenario button:** Creates new scenario with default values
- **Side-by-side comparison table:**
  - Registration cost
  - Monthly installment
  - Annual road tax
  - Annual depreciation
  - 5-year TCO / 10-year TCO
  - Cost per month
- **Delta highlighting:** Green/red badges showing which scenario is cheaper and by how much
- **Include in planning toggle:** Per-scenario toggle to include/exclude from net worth

---

## 5. Used Vehicle Support

Used vehicles change the calculation flow:

| Factor | New Vehicle | Used Vehicle |
|--------|-------------|--------------|
| COE remaining | 120 months (full) | User input (remaining months) |
| PARF eligibility | Always eligible | Only if < 10 years old on first COE |
| ARF | Calculated + paid | Already paid (factored into purchase price) |
| Registration cost | Fully computed | = purchase price (user input) |
| Road tax | Standard formula | Same formula |
| Depreciation | From registration price | From purchase price |
| Financing LTV | Based on OMV | Same OMV-based rules apply |

**Additional inputs for used vehicles:**
- `purchasePrice` — replaces computed registration price
- `vehicleAge` — age in years at time of purchase
- `remainingCoeMonths` — months left on COE
- `isPafrEligible` — first COE cycle?
- `originalArf` — needed for PARF rebate calculation (if PARF eligible)

**Deregistration value (used):**
- If PARF-eligible: PARF rebate based on original ARF and age at deregistration
- COE rebate based on remaining months from original COE
- If COE was renewed (second cycle): No PARF rebate, only COE rebate on renewed COE

---

## 6. Net Worth Integration

When user saves a scenario with `isIncluded: true`, create the following entities in the financial plan:

| Entity | Type | Category | Details |
|--------|------|----------|---------|
| `{name}` | Asset | `vehicle` | `currentValue` = registration/purchase price, depreciation via negative growth rate |
| `{name} Loan` | Liability | `vehicle_loan` | `currentBalance` = loan amount, `interestRate` = EIR, `minimumPayment` = monthly installment |
| `{name} Road Tax` | Expense | `transport` | `amount` = annual road tax, frequency = annual |
| `{name} Insurance` | Expense | `transport` | `amount` = annual insurance, frequency = annual |
| `{name} Fuel` | Expense | `transport` | `amount` = monthly fuel, frequency = monthly |
| `{name} Maintenance` | Expense | `transport` | `amount` = annual maintenance, frequency = annual |
| `{name} Parking` | Expense | `transport` | `amount` = monthly parking, frequency = monthly (if > 0) |

**Note:** The asset's `annualGrowthRate` should be set to the negative of the first depreciation period's rate (e.g., -15% for year 1). For a more accurate projection, the asset value should be recalculated each year based on the depreciation periods schedule.

---

## 7. Store Design (Zustand)

```typescript
interface VehiclePlannerState {
  // Scenarios
  scenarios: VehicleScenario[]
  activeScenarioId: string | null

  // UI state
  activeTab: VehicleTabId

  // Actions
  setActiveTab: (tab: VehicleTabId) => void
  addScenario: (scenario: VehicleScenario) => void
  updateScenario: (id: string, updates: Partial<VehicleScenario>) => void
  deleteScenario: (id: string) => void
  setActiveScenario: (id: string | null) => void
  duplicateScenario: (id: string) => void
  toggleIncluded: (id: string) => void
}

type VehicleTabId = 'vehicle' | 'costs' | 'depreciation' | 'tco' | 'scenarios'
```

Uses `persist` middleware with `localStorage` (same as Insurance Planner's `coverageGuidelinesStore`).

---

## 8. Calculation Verification

### ARF Verification

| OMV | Expected ARF | Breakdown |
|-----|-------------|-----------|
| $15,000 | $15,000 | 15,000 × 1.0 |
| $30,000 | $34,000 | 20,000 × 1.0 + 10,000 × 1.4 |
| $50,000 | $67,000 | 20,000 × 1.0 + 20,000 × 1.4 + 10,000 × 1.9 |
| $70,000 | $111,000 | 20,000 × 1.0 + 20,000 × 1.4 + 20,000 × 1.9 + 10,000 × 2.5 |
| $100,000 | $182,000 | 20,000 × 1.0 + 20,000 × 1.4 + 20,000 × 1.9 + 20,000 × 2.5 + 20,000 × 3.2 |

### Road Tax Verification

| Vehicle | CC/kW | Expected 6-Monthly |
|---------|-------|-------------------|
| 1,000cc petrol | 1,000 | [$200 + $0.125 × 400] × 0.782 = $250 × 0.782 = $195.50 |
| 1,600cc petrol | 1,600 | [$250 + $0.375 × 600] × 0.782 = $475 × 0.782 = $371.45 |
| 2,000cc petrol | 2,000 | [$475 + $0.75 × 400] × 0.782 = $775 × 0.782 = $606.05 |
| 150kW EV | 150 | {[$250 + $3.75 × 120] × 0.782} + $350 = $546.90 + $350 = $896.90 |
| 200cc motorcycle | 200 | $40 × 0.782 = $31.28 |

### LTV Verification

| OMV | Registration Price (approx) | Max LTV | Max Loan |
|-----|---------------------------|---------|----------|
| $15,000 | ~$60,000 | 70% | ~$42,000 |
| $25,000 | ~$85,000 | 60% | ~$51,000 |
| $50,000 | ~$165,000 | 60% | ~$99,000 |

---

## 9. Future Enhancements (Out of Scope)

- Backend persistence (follow Insurance Planner's persistence pattern)
- COE bidding history charts and price predictions
- Integration with OneMotoring / SgCarMart data feeds
- Multi-vehicle fleet management
- Ride-hailing vs ownership cost comparison
- Carbon offset / environmental impact calculator
- Seasonal parking rate variations by location
