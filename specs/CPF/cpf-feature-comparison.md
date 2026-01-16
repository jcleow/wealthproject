# CPF Feature Comparison: geek.sg vs Assetra

> **Last Updated**: January 15, 2026
> **Source**: https://geek.sg/tools/cpf-forecast
> **Purpose**: Identify feature gaps and opportunities for Assetra's CPF module
> **Previous Review**: January 2026 (initial)

---

## Executive Summary

**geek.sg CPF Forecast Calculator** is a standalone, single-purpose CPF projection tool focused on life event simulation and retirement milestone tracking.

**Assetra** is a comprehensive financial planning platform where CPF is one component of a larger net worth tracking system.

### What Changed Since Last Review

| Area | Previous Status | Current Status |
|------|-----------------|----------------|
| CPF LIFE Payout Calculator | ~10% | ✅ **100%** - Regression model with 3 plans |
| Age 55 RA Conversion | ~10% | ✅ **100%** - Full simulator with property pledge |
| Extra Interest Calculation | 0% | ✅ **100%** - First $60k/$30k tiers implemented |
| Assumptions → Projector | Not wired | ✅ **Complete** - User assumptions affect projections |
| Timeline Projection API | Missing | ✅ **Implemented** - 30-year month-by-month |
| Config2026 | N/A | ✅ **Added** - OW $8k, FRS $220,400 |

**Key Insight**: Assetra's **Scenario Events system** is actually more comprehensive than geek.sg's life events. geek.sg has a simpler, CPF-focused event model, while Assetra has a full financial impact engine with 4 impact types (delta, override, start, stop), 6 target types, date ranges, growth strategies, and scenario grouping.

**Remaining Gaps**: Primarily UX polish — milestone achievement dates, monthly table view, and housing accrued interest calculation.

---

## Feature Comparison Matrix

### What geek.sg Has That Assetra is Missing

| Feature | geek.sg | Assetra Status | Priority | Notes |
|---------|---------|----------------|----------|-------|
| **Retirement Sum Milestone Cards with Dates** | Shows exact age + date when BRS/FRS/ERS achieved | ⚠️ Partial - shows targets but not achievement dates | **HIGH** | Backend can calculate; needs frontend display |
| **Month-by-Month Table View** | Expandable table with Date/Age/Salary/Balances/Contributions | ⚠️ Backend ready, frontend missing | **MEDIUM** | API returns monthly data; UI shows annual only |
| **Housing Accrued Interest Tracking** | Tracks 2.5% p.a. interest on CPF housing usage | ❌ Not calculated | **MEDIUM** | `oa_used_for_housing` exists but no interest calc |
| **Housing Refund Liability Chart** | Visual breakdown of principal + accrued interest | ❌ Not implemented | **MEDIUM** | Would enhance property planning |
| **CPF-Specific Event Templates** | Pre-built: OA→SA transfer, voluntary top-up, property purchase | ⚠️ Possible via scenario events but no CPF-specific templates | **LOW** | Could add as presets |
| **Transparent Methodology Section** | "How It Works" with detailed calculation breakdown | ❌ No user-facing docs | **LOW** | Trust/education |
| **In-App FAQ** | Comprehensive FAQ integrated into tool | ❌ No FAQ | **LOW** | Support reduction |

### What Assetra Has That geek.sg is Missing

| Feature | Assetra | geek.sg Status |
|---------|---------|----------------|
| **Advanced Scenario Events System** | ✅ Full impact engine: 4 types (delta/override/start/stop), 6 targets, date ranges, growth strategies, scenario grouping, toggle on/off | Simple event list with fixed types |
| **Chart Event Markers** | ✅ `ScenarioMarker` - stacked icons on net worth chart with colors, click-to-edit | Basic event annotations |
| **Multi-Person/Multi-Earner Support** | ✅ Multiple CPF accounts per household via `person_id` | Single person only |
| **CPF-IS Investment Dashboard** | ✅ Full CPFIS limits and portfolio tracking | Not supported |
| **Housing Grant Calculations** | ✅ EHG, FHG, PHG, STEP_UP integrated | Not supported |
| **Tax Relief Calculator** | ✅ RSTU and MA top-up tax relief via `TopUpTaxReliefCalculator` | Not supported |
| **Age 55 Decision Flowchart** | ✅ Interactive `Age55ConversionSimulator` with property pledge | Limited to toggle |
| **CPF LIFE Plan Comparison** | ✅ `CPFLifeComparison` - Standard vs Basic vs Escalating | Shows estimates, no comparison |
| **CPF LIFE Regression Model** | ✅ Gender-based coefficients, deferment bonuses (65-70) | Basic estimation |
| **Assumption Presets** | ✅ Official/Conservative/Optimistic/Custom stored in DB | Fixed assumptions |
| **RA Formation Waterfall** | ✅ `RAFormationWaterfall` - SA→RA→OA transfer visualization | Not available |
| **Contribution Waterfall** | ✅ `CPFContributionWaterfall` - allocation visualization | Not available |
| **PR Residency Handling** | ✅ PR Year 1/2/3+ graduated rates in backend | Not visible in UI |
| **Integration with Net Worth** | ✅ CPF as part of total financial picture via timeline | Standalone tool |
| **Account History Tracking** | ✅ `parent_id` for historical CPF account versions | No historical tracking |
| **Percentage-Based Impacts** | ✅ Delta impacts can be % of current value (e.g., +5% raise) | Fixed amounts only |
| **Impact Persistence** | ✅ Delta impacts accumulate across months automatically | Recalculated each period |

---

## geek.sg Feature Deep Dive (January 2026)

### Input Parameters

**Basic Information:**
- Birth Year
- Birth Month (in Advanced Settings)
- Current Monthly Salary

**Current CPF Balances:**
- Ordinary Account (OA)
- Special Account (SA)
- MediSave Account (MA)

**Advanced Settings:**
- Forecast to Age (default: 55)
- Use Property Pledge (toggle)
- Experimental mode for forecasting beyond age 55

### Life Events Supported (9 Types)

| Event Type | Description | Recurrence Options |
|------------|-------------|-------------------|
| **Salary Change** | Increase/decrease salary by % or fixed amount | One-time, Annual, Custom |
| **Bonus** | Bonus payment (X months salary or fixed) | One-time, Annual |
| **Property Purchase** | Withdraw OA for housing down payment + monthly mortgage | One-time |
| **Property Sale** | Refund principal + accrued interest to OA | One-time |
| **Voluntary Top-up** | Add cash to CPF accounts (OA/SA/MA) | One-time, Annual |
| **OA to SA Transfer** | Move funds from OA to SA | One-time |
| **Career Break** | Sabbatical with reduced/no income | One-time |
| **Government Grant** | MRSS/MMSS grants | Coming Soon |
| **Withdrawal at 55** | Age 55 withdrawals | Coming Soon |

### Output Features

**Retirement Sum Milestone Cards:**
- Basic Retirement Sum (BRS) - achieved age, exact date, balances, estimated payout
- Full Retirement Sum (FRS) - achieved age, exact date, balances, estimated payout
- Enhanced Retirement Sum (ERS) - achieved age, exact date, balances, estimated payout

**Chart View:**
- Stacked area chart (OA, SA, MA, RA)
- BRS/FRS/ERS threshold lines
- Event annotations on chart
- Year-based x-axis

**Table View:**
- Date / Age / Salary
- OA, SA, MA, RA balances
- Total balance
- Contribution amount
- Expandable row details with calculation breakdown

**Housing Refund Liability Chart:**
- Principal withdrawn
- Accrued interest (2.5% p.a. compounded monthly)
- Grants received
- Grants accrued interest
- Total refund required

### Calculation Methodology (Validated)

**1. Contribution Calculation:**
- Age-based contribution rates (gradual increase to 37% for ages 55-60 by 2026)
- OW ceiling progression: $6.3K (2023) → $7.4K (2025) → $8K (2026)
- Account allocation based on official rates
- MA overflow to SA (or RA if 55+) when BHS reached

**2. Interest Calculation & Routing:**
- Base: OA 2.5%, SA/MA/RA 4.0%
- Extra interest (up to 2%) on first $60K combined (under 55)
- Extra interest tiers for 55+ ($30K at 2%, next $30K at 1%)
- OA extra interest routed to SA (pre-55) or RA (55+)
- Monthly compounding

**3. Age 55 Transformation Sequence:**
1. SA Closure - balance set to $0
2. RA Creation - new account initialized
3. SA → RA Transfer - up to FRS (or BRS with property pledge)
4. OA → RA Top-Up - if SA insufficient
5. Excess Distribution - remains in OA (withdrawable)
6. Future Routing - SA contributions go to RA

**4. Housing Refund Liability Tracking:**
- Principal withdrawn from OA
- Accrued interest at 2.5% p.a. (monthly compounding)
- Housing grants and their accrued interest
- Total: Principal + Accrued Interest + Grants + Grants Interest

**Test Coverage:** 201 automated tests

---

## Assetra Implementation Status (January 2026)

### Backend Packages (`backend/internal/cpf/`)

| Package | Status | Features |
|---------|--------|----------|
| **contribution/** | ✅ Complete | OW/AW calculator, wage ceilings, account allocation, 15 age/residency combinations |
| **retirement/** | ✅ Complete | Age 55 RA conversion (BRS/FRS/ERS), property pledge (up to 50% BRS) |
| **payout/** | ✅ Complete | CPF LIFE regression model, 3 plans, deferment bonuses, gender coefficients |
| **engine/** | ✅ Complete | Monthly lifecycle processor, base + extra interest, RA formation, LIFE activation |
| **account/** | ✅ Complete | Repository with multi-earner support via `person_id` |
| **assumptions/** | ✅ Complete | Per-account stored assumptions (interest rates, plan, retirement age) |
| **config/** | ✅ Complete | 2024, 2025, 2026 configurations with all rates and sums |
| **processor/** | ✅ Complete | Timeline contribution processor with YTD wage tracking |

### Config Years

| Year | OW Ceiling | BRS | FRS | ERS | BHS |
|------|-----------|-----|-----|-----|-----|
| 2024 | $6,800 | $102,900 | $205,800 | $308,700 | $71,500 |
| 2025 | $7,400 | $106,500 | $213,000 | $319,500 | $75,500 |
| 2026 | $8,000 | $110,200 | $220,400 | $330,600 | $79,000 |

### API Endpoints (v2)

**Account Management:**
- ✅ `GET /cpf/accounts` - List user's CPF accounts
- ✅ `GET /cpf/account` - Get single account
- ✅ `POST /cpf/account` - Create new CPF account
- ✅ `PUT /cpf/account/{id}` - Update account
- ✅ `DELETE /cpf/account/{id}` - Delete account
- ✅ `POST /cpf/account/{id}/stop` - Stop account

**Assumptions:**
- ✅ `GET /cpf/account/{id}/assumptions` - Retrieve stored assumptions
- ✅ `PUT /cpf/account/{id}/assumptions` - Update assumptions
- ✅ `DELETE /cpf/account/{id}/assumptions` - Reset to defaults

**Calculators:**
- ✅ `POST /cpf/calculators/cpflife-estimate` - Calculate CPF LIFE payouts (3 plans)
- ✅ `POST /cpf/calculators/age55-conversion` - Age 55 RA conversion simulator

**Projections:**
- ✅ `GET /cpf/account/{id}/projection` - Balance snapshot + LIFE estimates
- ✅ `GET /cpf/account/{id}/timeline-projection` - 30-year month-by-month projection

### Frontend Components (`frontend/src/components/cpf/`)

| Component | Status | Data Source |
|-----------|--------|-------------|
| `CPFSimulationView` | ✅ | Multi-tab dashboard |
| `CPFBalanceOverview` | ✅ | API |
| `CPFProjectionChart` | ✅ | API (30-year projection) |
| `CPFContributionWaterfall` | ✅ | API |
| `RAFormationWaterfall` | ✅ | API |
| `Age55ConversionSimulator` | ✅ | API (`age55-conversion`) |
| `CPFLifeEstimator` | ✅ | API (`cpflife-estimate`) |
| `CPFLifeComparison` | ✅ | API |
| `CPFAssumptionsPanel` | ✅ | API (stored assumptions) |
| `TopUpTaxReliefCalculator` | ✅ | Local calculation |
| `CPFISInvestmentDashboard` | ⚠️ | Mock data |
| `PropertyCPFUsage` | ⚠️ | Mock data (no accrued interest) |
| `CPFHousingCalculator` | ⚠️ | Local calculation |

### Scenario Events System (Life Events)

Assetra uses a unified **Scenario Events** system that's more powerful than dedicated CPF life events:

**Impact Types:**
| Type | Description | Example |
|------|-------------|---------|
| `delta` | Add/subtract from value | +$5k/month salary raise |
| `override` | Replace value entirely | Salary becomes $150k |
| `start` | Create new financial item | New rental income |
| `stop` | End an item | Job loss |

**Target Types:** `asset`, `liability`, `income`, `expense`, `cash`, `investment`

**Key Features:**
- Date ranges with start/end dates (YYYY-MM format)
- Recurrence: one-time, monthly, annual
- Growth rates and compound strategies
- Scenario grouping via `scenarioId`
- Toggle on/off via `isIncluded` boolean
- Percentage-based deltas (e.g., +5% raise)
- Impacts persist/accumulate across months

**API Endpoints:**
- `GET/POST /api/v2/scenario-events` - List/Create
- `GET/PUT/DELETE /api/v2/scenario-events/{id}` - CRUD
- `PATCH /api/v2/scenario-events/{id}/toggle` - Toggle on/off

**Frontend:**
- `ScenarioEventModal` - Full CRUD with sentence-builder UI
- `ScenarioMarker` - Stacked icons on net worth chart
- `ImpactEditor` - Individual impact definition

### Database Schema

| Table | Status | Notes |
|-------|--------|-------|
| `cpf_accounts` | ✅ | Multi-earner via `person_id`, `parent_id` for history |
| `cpf_assumptions` | ✅ | Per-account interest rates, plan, retirement age |
| `fund_flow_rules` | ✅ | Payment and transfer rules |
| `scenario_events` | ✅ | Full life events via impact engine (more comprehensive than CPF-specific table) |

### Interest Calculation Status

| Feature | Status | Implementation |
|---------|--------|----------------|
| Base OA Interest (2.5%) | ✅ | `LinearGrowthStrategy` |
| Base SA/MA/RA Interest (4%) | ✅ | `LinearGrowthStrategy` |
| Extra Interest (first $60k, <55) | ✅ | +1% credited to SA |
| Extra Interest (first $30k, 55+) | ✅ | +2% credited to RA |
| Extra Interest (next $30k, 55+) | ✅ | +1% credited to RA |
| OA cap for extra interest ($20k) | ✅ | Priority ordering |
| Housing Accrued Interest (2.5%) | ❌ | **Not implemented** |

---

## Implementation Roadmap (Updated)

### Phase 1: Quick Wins (1-2 weeks)

#### 1.1 Retirement Milestone Achievement Dates
**Effort**: Small (2-4h)
**Value**: High

Enhance projection response to include milestone dates:

```typescript
interface RetirementMilestone {
  type: 'BRS' | 'FRS' | 'ERS';
  targetAmount: number;
  achievedAge: number | null;
  achievedDate: string | null;
  balancesAtAchievement: CPFBalances | null;
  estimatedMonthlyPayout: number | null;
}
```

#### 1.2 Month-by-Month Table View
**Effort**: Small (4-6h)
**Value**: Medium

Backend already returns monthly data via `timeline-projection`. Add frontend table component:

```typescript
// frontend/src/components/cpf/CPFProjectionTable.tsx
interface MonthlyProjectionRow {
  date: string;
  age: number;
  salary: number;
  oa: number;
  sa: number;
  ma: number;
  ra: number;
  total: number;
  contribution: number;
}
```

#### 1.3 Housing Accrued Interest Calculation
**Effort**: Small (4-6h)
**Value**: Medium

Add 2.5% p.a. monthly compounding on `oa_used_for_housing`:

```go
// backend/internal/cpf/housing/interest.go
type HousingLiability struct {
    PrincipalWithdrawn     decimal.Decimal
    AccruedInterest        decimal.Decimal // 2.5% p.a. compounded monthly
    GrantsReceived         decimal.Decimal
    GrantsAccruedInterest  decimal.Decimal
    TotalRefundRequired    decimal.Decimal
    AsOfDate               time.Time
}
```

**Database Changes:**
```sql
ALTER TABLE cpf_accounts ADD COLUMN housing_accrued_interest DECIMAL(15,2);
ALTER TABLE cpf_accounts ADD COLUMN housing_grants_received DECIMAL(15,2);
ALTER TABLE cpf_accounts ADD COLUMN housing_grants_interest DECIMAL(15,2);
```

### Phase 2: CPF-Specific Enhancements (1-2 weeks)

#### 2.1 CPF Event Templates
**Effort**: Medium

Add pre-built scenario event templates for common CPF actions:

```typescript
const CPF_EVENT_TEMPLATES = {
  'oa_to_sa_transfer': {
    name: 'OA to SA Transfer',
    description: 'Transfer funds from OA to SA for higher interest',
    impactKind: 'delta',
    // Pre-configured for OA decrease + SA increase
  },
  'voluntary_topup': {
    name: 'Voluntary CPF Top-up',
    description: 'Cash top-up to SA/MA for tax relief',
    impactKind: 'delta',
  },
  'property_purchase': {
    name: 'Property Purchase (CPF)',
    description: 'Use OA for property down payment',
    impactKind: 'delta',
  },
  'career_break': {
    name: 'Career Break',
    description: 'Pause income and CPF contributions',
    impactKind: 'stop',
  },
};
```

#### 2.2 Housing Refund Liability Chart
**Effort**: Medium

Visual breakdown:
- Principal withdrawn (bar)
- Accrued interest (stacked)
- Grants + grants interest (stacked)
- Timeline showing growth

### Phase 3: Polish (1 week)

#### 3.1 Methodology Documentation
**Effort**: Small

Add "How It Works" collapsible:
- Contribution calculation explained
- Interest routing rules
- Age 55 transformation sequence
- Link to CPF official sources

#### 3.2 Guided Scenario Templates
**Effort**: Medium

Pre-built scenarios using existing scenario events system:
- "Barista FIRE" - Part-time work from 45-55
- "Property Impact" - $500K HDB purchase
- "High Earner" - Hitting ERS before 55
- "Career Break" - 1-year sabbatical

---

## Implementation Scorecard

| Category | Previous | Current | Target |
|----------|----------|---------|--------|
| Core Calculations | 100% | 100% | 100% |
| API Endpoints | 70% | 100% | 100% |
| Interest (Base + Extra) | 0% | 100% | 100% |
| CPF LIFE Calculator | 10% | 100% | 100% |
| Age 55 Conversion | 10% | 100% | 100% |
| Assumptions Integration | 60% | 100% | 100% |
| Frontend Components | 30% | 85% | 100% |
| Scenario Events System | 0% | 100% | 100% | ✅ **More comprehensive than geek.sg** |
| Chart Event Markers | 0% | 100% | 100% | ✅ `ScenarioMarker` on net worth chart |
| Housing Interest Calc | 0% | 0% | 100% |
| Milestone Achievement Dates | 0% | 50% | 100% |

**Overall CPF Module Completion: ~88%** (up from ~40%)

### Scenario Events vs geek.sg Life Events

| Capability | geek.sg | Assetra |
|------------|---------|---------|
| Event types | 9 fixed types | Unlimited (4 impact kinds × 6 targets) |
| Impact model | Simple add/remove | delta, override, start, stop |
| Targets | CPF-focused | All financial items |
| Recurrence | One-time, Annual | Any frequency + date ranges |
| Grouping | None | `scenarioId` for related events |
| Toggle on/off | No | Yes (`isIncluded`) |
| Percentage changes | No | Yes (% of current value) |
| Growth strategies | No | Linear, compound |
| Visualization | Chart annotations | Stacked icon markers |
| Net worth integration | Standalone | Full timeline integration |

---

## Success Metrics

| Metric | Current | Target |
|--------|---------|--------|
| CPF module engagement | Baseline | +30% |
| Time in CPF simulators | Baseline | +50% |
| Scenario events created per user | Tracked | 3+ |
| Milestone cards interaction | N/A | 80% of users |
| CPF event templates usage | N/A | 50% of new events |

---

## Appendix: 2026 CPF Parameters

| Parameter | Value |
|-----------|-------|
| OW Ceiling | $8,000/month |
| Annual Wage Ceiling | $102,000 |
| FRS | $220,400 |
| BRS | $110,200 |
| ERS | $330,600 |
| BHS | $79,000 |
| OA Interest | 2.5% p.a. |
| SA/MA/RA Interest | 4.0% p.a. |
| Extra Interest (first $60k) | +1% |
| Extra Interest (55+, first $30k) | +2% |
| geek.sg Test Coverage | 201 tests |

---

## References

- geek.sg CPF Forecast: https://geek.sg/tools/cpf-forecast
- CPF Board Official: https://www.cpf.gov.sg
- Assetra CPF Specs: `/specs/CPF/`
- Internal Gap Analysis: `/specs/cpf-feature-comparison.md`
