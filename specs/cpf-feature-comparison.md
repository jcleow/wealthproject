# CPF Feature Implementation Status & Gap Analysis

> **Last Updated:** January 2026
> **Purpose:** Comprehensive comparison of documented CPF features vs actual implementation status
> **Source Documents Audited:**
> - `specs/backlog/regional-sg-cpf-integration-tickets.md`
> - `specs/cpf-backend-integration.md`
> - `specs/backlog/regional-sg-cpf.md`

---

## Executive Summary

This document provides a detailed gap analysis between the CPF features documented in various specs and what has actually been implemented in the codebase. **Many items are marked as `[x]` complete in the integration tickets but are NOT actually implemented.**

### Quick Status Overview

| Category | Documented | Implemented | Gap |
|----------|------------|-------------|-----|
| Core Calculation Engine | 100% | 100% | None |
| Timeline Integration | 100% | 100% | None |
| Database/API Infrastructure | 100% | ~70% | Missing tables, endpoints |
| Assumptions System | 100% | ~60% | Interest not wired to projector |
| CPF LIFE Payouts | 100% | ~10% | Backend calculators missing |
| Age 55 Conversion | 100% | ~10% | Backend calculators missing |
| Frontend Integration | 100% | ~30% | Most features not implemented |
| Extra Interest Calculation | 100% | 0% | Not implemented |

---

## CRITICAL: Tickets Marked Complete But NOT Implemented

The following items in `specs/backlog/regional-sg-cpf-integration-tickets.md` are marked `[x]` but **do not exist in the codebase**:

### Database/Schema Discrepancies

| Ticket | Claimed Feature | Actual Status |
|--------|-----------------|---------------|
| 1.1 | `cpf_account_configs` table | ❌ **NOT CREATED** - Table does not exist |
| 1.1 | `GetConfigForDate()` method | ❌ **NOT IMPLEMENTED** |
| 1.2 | `employee_cpf_contribution` column on incomes | ❌ **NOT ADDED** to `finance_incomes` |
| 1.2 | `net_take_home` column on incomes | ❌ **NOT ADDED** to `finance_incomes` |

### API Endpoint Discrepancies

| Ticket | Claimed Endpoint | Actual Status |
|--------|------------------|---------------|
| 2.1 | `POST /api/v1/cpf/profile` | ❌ **DOES NOT EXIST** |
| 2.1 | `GET /api/v1/cpf/profile` | ❌ **DOES NOT EXIST** |
| 2.1 | `POST /api/v1/cpf/profile/configs` | ❌ **DOES NOT EXIST** |
| 3.4 | `POST /api/v1/cpf/preview` | ❌ **DOES NOT EXIST** |
| 4.1 | `GET /api/v1/cpf/accounts/assets` | ❌ **DOES NOT EXIST** |
| 5.2 | `GET /api/v1/cpf/contributions/summary` | ❌ **DOES NOT EXIST** |

### Frontend Component Discrepancies

| Ticket | Claimed Component | Actual Status |
|--------|-------------------|---------------|
| 2.2 | `CPFProfileSetupModal.tsx` | ❌ **DOES NOT EXIST** - Only `CpfAccountFormModal` exists |
| 3.1 | Net take-home display in income cards | ❌ **NOT IMPLEMENTED** - No `netTakeHome` rendering |
| 3.2 | CPF contributions subsection in income cards | ❌ **NOT IMPLEMENTED** |
| 3.3 | CPF fields in income form modal | ❌ **NOT IMPLEMENTED** |
| 4.2 | CPF accounts in Assets section | ❌ **NOT IMPLEMENTED** |
| 5.1 | CPF Profile Settings page | ❌ **DOES NOT EXIST** |
| 5.2 | CPF Contributions Summary view | ❌ **DOES NOT EXIST** |

### Backend Logic Discrepancies

| Ticket | Claimed Feature | Actual Status |
|--------|-----------------|---------------|
| 1.5 | Income creation calculates CPF automatically | ❌ **NOT IMPLEMENTED** - No CPF auto-calc on income create |
| 4.3 | Creating CPF income updates account balances | ❌ **NOT IMPLEMENTED** |
| 5.3 | Monthly interest calculation with extra interest | ❌ **NOT IMPLEMENTED** |
| 5.3 | Extra interest on first $60k | ❌ **NOT IMPLEMENTED** |

### What Actually Exists vs What's Claimed

**Actual V2 CPF Endpoints (working):**
- `GET /api/v2/cpf/account` ✅
- `GET /api/v2/cpf/accounts` ✅
- `POST /api/v2/cpf/account` ✅
- `PUT /api/v2/cpf/account/{id}` ✅
- `DELETE /api/v2/cpf/account/{id}` ✅
- `GET /api/v2/cpf/account/{id}/assumptions` ✅
- `PUT /api/v2/cpf/account/{id}/assumptions` ✅

**Actual Frontend Components (working):**
- `CpfAccountFormModal/` ✅ (but not `CPFProfileSetupModal`)
- `CpfBalanceModal/` ✅
- `CPFAssumptionsPanel/` ✅
- Various CPF chart components (using mock data)

**NOT Implemented Despite Being Marked Complete:**
- Time-based residency config system
- CPF profile setup multi-step modal
- Income form CPF integration
- Net take-home display
- CPF contributions subsection in income cards
- CPF as assets display
- CPF contributions summary view
- Extra interest calculation
- Interest calculation monthly job

---

## Part 1: Fully Implemented Features

### 1.1 CPF Contribution Calculator (`backend/internal/cpf/contribution/`)

**Status: COMPLETE**

| Feature | Implementation | Tests |
|---------|---------------|-------|
| OW (Ordinary Wages) calculation | `calculator.go:CalculateOW()` | ✅ Comprehensive |
| AW (Additional Wages) calculation | `calculator.go:CalculateAW()` | ✅ Comprehensive |
| 5 age bands (≤55, >55-60, >60-65, >65-70, >70) | `types.go:AgeGroup` | ✅ |
| 3 residency statuses (Citizen, PR Year 1-2, PR Year 3+) | `types.go:ResidencyStatus` | ✅ |
| Wage ceiling application (OW: $7,400, Annual: $102,000) | Implemented in calculation | ✅ |
| Employee/Employer contribution split | `ContributionResult` struct | ✅ |
| OA/SA/MA/RA allocation by age | Uses config allocation rates | ✅ |
| Annual calculations | `CalculateAnnualFromMonthly()`, `CalculateAnnualWithBonus()` | ✅ |

### 1.2 CPF Processor (`backend/internal/cpf/processor/`)

**Status: COMPLETE**

| Feature | Implementation | Tests |
|---------|---------------|-------|
| Stateful processing across months | `processor.go:Processor` | ✅ |
| YTD wage ceiling tracking | `CPFBalances.YTDOrdinaryWages`, `YTDAWSWages` | ✅ |
| Year boundary YTD reset | `ResetYtdAWCeiling()` | ✅ |
| Balance accumulation | `AddContributionToBalances()` | ✅ |
| Integration with contribution calculator | Uses `contribution.Calculator` | ✅ |

### 1.3 CPF Configuration (`backend/internal/cpf/config/`)

**Status: COMPLETE**

| Feature | Implementation | Tests |
|---------|---------------|-------|
| 2024 rates and ceilings | `seed.go:Config2024()` | ✅ |
| 2025 rates and ceilings | `seed.go:Config2025()` | ✅ |
| Contribution rate tables (15 combinations) | `ContributionRate` by age/residency | ✅ |
| Allocation rate tables (7 age bands) | `AllocationRate` by age | ✅ |
| Retirement sums (BRS/FRS/ERS) | `RetirementSums` struct | ✅ |
| BHS (Basic Healthcare Sum) | In config | ✅ |
| Interest rates | In config (but not used yet) | ✅ |

### 1.4 CPF Projector (`backend/internal/cpf/projector/`)

**Status: COMPLETE (Base functionality)**

| Feature | Implementation | Tests |
|---------|---------------|-------|
| Project balances to target date | `projector.go:ProjectToDate()` | ✅ |
| Month-by-month contribution calculation | Implemented | ✅ |
| Basic interest calculation | `interest.go` | ✅ |
| Multiple income stream support | `[]IncomeStream` input | ✅ |
| Contribution/interest breakdown in output | `ProjectedBalances` struct | ✅ |

### 1.5 Timeline Integration (`backend/internal/financial_v2/timeline/`)

**Status: COMPLETE**

| Feature | Implementation |
|---------|---------------|
| CPF accounts loaded with financial data | `loadEffectiveRows()` includes CPF |
| CPF context per person | `NewCPFContext()`, `NewCPFContexts()` |
| Income processing with CPF contributions | `ProcessIncomes()` |
| CPFWageType field on incomes | `FinancialDataRow.CPFWageType` |
| YTD reset at year boundaries | `resetAllCPFContextsYTD()` |
| CPF assets in response | `cpfAssets` array |
| CPF contributions in response | `cpfContributions` array |

### 1.6 Database Schema

**Status: COMPLETE**

| Table | Columns | Status |
|-------|---------|--------|
| `cpf_accounts` | id, user_id, person_id, oa/sa/ma/ra_balance, oa_used_for_housing, housing_start_date | ✅ |
| `cpf_assumptions` | id, cpf_account_id, interest rates (oa/sa/ma/ra), extra interest, frs_growth_rate, retirement_age, cpf_life_plan, payout_start_age | ✅ |

### 1.7 API Endpoints (`backend/cmd/server/routes/v2.go`)

**Status: COMPLETE**

| Endpoint | Handler | Status |
|----------|---------|--------|
| `GET /api/v2/cpf/account` | Get user's CPF account | ✅ |
| `GET /api/v2/cpf/accounts` | List all CPF accounts | ✅ |
| `POST /api/v2/cpf/account` | Create CPF account | ✅ |
| `PUT /api/v2/cpf/account/{id}` | Update CPF account | ✅ |
| `DELETE /api/v2/cpf/account/{id}` | Delete CPF account | ✅ |
| `POST /api/v2/cpf/account/{id}/stop` | Stop CPF account | ✅ |
| `GET /api/v2/cpf/account/{id}/assumptions` | Get assumptions | ✅ |
| `PUT /api/v2/cpf/account/{id}/assumptions` | Update assumptions | ✅ |
| `DELETE /api/v2/cpf/account/{id}/assumptions` | Delete assumptions | ✅ |

---

## Part 2: Partially Implemented Features

### 2.1 Assumptions Integration

**Status: ~80% COMPLETE**

#### What's Done:
- ✅ Database schema for `cpf_assumptions`
- ✅ Repository CRUD operations
- ✅ API endpoints (GET/PUT/DELETE)
- ✅ Frontend hook `useApiAssumptions`
- ✅ `CPFAssumptionsPanel` saves/loads from API
- ✅ Default assumptions auto-created on first access

#### What's Missing:
- ❌ **Projector doesn't use assumptions** - `projector.go` uses hardcoded rates:
  ```go
  // backend/internal/cpf/projector/interest.go
  var (
      OAInterestRatePct = decimal.MustFromFloat64(2.5)  // Hardcoded!
      SAInterestRatePct = decimal.MustFromFloat64(4.0)  // Hardcoded!
  )
  ```
- ❌ Timeline service doesn't apply user interest rates
- ❌ No `/projection/range` endpoint (documented but not implemented)

#### Tasks to Complete:
1. Modify `ProjectToDate()` to accept `*CPFAssumptions` parameter
2. Update interest calculation to use assumption values
3. Add `/api/v2/cpf/account/{id}/projection/range` endpoint
4. Pass assumptions from handler to projector

### 2.2 Frontend Components

**Status: ~50% COMPLETE**

#### Functional Components:
| Component | Status | Notes |
|-----------|--------|-------|
| `CPFAssumptionsPanel` | ✅ Working | Uses API via `useApiAssumptions` |
| `CPFContributionCalculator` | ✅ Working | Basic calculator UI |

#### Using Mock Data (Need API Integration):
| Component | Current State | Required Change |
|-----------|---------------|-----------------|
| `CPFProjectionChart.tsx` | Uses `generateMockProjection()` | Use `/projection/range` endpoint |
| `Age55ConversionSimulator/` | Uses local `useRAConversion` | Need backend calculator endpoint |
| `CPFLifeEstimator.tsx` | Uses hardcoded payout factors | Need backend calculator endpoint |
| `CPFLifeTimelineChart.tsx` | Uses mock data | Need backend projection |
| `CPFHousingCalculator.tsx` | Uses local calculations | Need backend endpoint |
| `CPFBalanceOverview.tsx` | May use mock data | Verify API integration |

---

## Part 3: NOT Implemented Features

### 3.1 Extra Interest Calculation

**Status: NOT IMPLEMENTED**

**What's Documented:**
- +1% extra interest on first $60k (OA+SA+MA combined)
- +1% additional for members 55+ on first $30k
- Extra interest credited to SA (below 55) or RA (55+)
- Priority order: OA first, then SA/RA, then MA

**What's Missing:**
- ❌ No extra interest calculation in `projector/interest.go`
- ❌ No extra interest in timeline service
- ❌ Assumption fields `extra_interest_first_60k` and `extra_interest_first_30k_above_55` exist but aren't used

**Implementation Required:**
```go
// Need to add to projector/interest.go
func calculateExtraInterest(
    oaBalance, saBalance, maBalance, raBalance decimal.Decimal,
    age int,
    extraFirst60k, extraFirst30kAbove55 decimal.Decimal,
) (extraInterest decimal.Decimal, creditTo string)
```

### 3.2 Age 55 RA Conversion Calculator

**Status: NOT IMPLEMENTED**

**What's Documented (`specs/cpf-backend-integration.md`):**
- SA → RA transfer (all SA transfers to RA)
- OA → RA transfer (to reach FRS if needed)
- MA overflow → RA (if MA exceeds BHS)
- Property pledge option
- Withdrawable OA calculation
- BRS/FRS/ERS target selection

**What's Missing:**
- ❌ No `backend/internal/cpf/retirement/` package
- ❌ No `conversion.go` calculator
- ❌ No `/api/v2/cpf/calculators/age55-conversion` endpoint
- ❌ Frontend uses local `useRAConversion.ts` hook

**Implementation Required:**
```
backend/internal/cpf/retirement/
├── conversion.go       # Age 55 RA conversion calculator
├── conversion_test.go
└── types.go            # Shared types
```

### 3.3 CPF LIFE Payout Calculator

**Status: NOT IMPLEMENTED**

**What's Documented:**
- Standard/Basic/Escalating plan payout calculations
- Payout factors by age (65-70) and gender
- Deferment bonus (+7% per year)
- Bequest calculations
- Break-even analysis between plans

**What's Missing:**
- ❌ No `cpflife.go` calculator
- ❌ No RSS calculator (for accounts below MRS)
- ❌ No `/api/v2/cpf/calculators/cpflife-estimate` endpoint
- ❌ Frontend `CPFLifeEstimator.tsx` uses hardcoded factors

**Implementation Required:**
```
backend/internal/cpf/retirement/
├── cpflife.go          # CPF LIFE payout calculator
├── cpflife_test.go
├── rss.go              # RSS payout calculator (below MRS)
├── rss_test.go
└── types.go
```

### 3.4 Extended Projection Endpoint

**Status: NOT IMPLEMENTED**

**What's Documented:**
- `GET /api/v2/cpf/account/{id}/projection/range?years=30`
- Returns yearly projections with milestones
- Age 55 and Age 65 milestone data
- CPF LIFE estimates
- FRS/BRS/ERS targets

**What's Missing:**
- ❌ No `projection/range` endpoint in routes
- ❌ No handler implementation
- ❌ Frontend uses mock `generateMockProjection()`

### 3.5 Property CPF Refund Integration

**Status: PARTIAL**

**What's Implemented:**
- ✅ `backend/internal/financial_v2/property/cpf_refund.go` exists

**What's Missing:**
- ❌ No public API endpoint for CPF refund calculation
- ❌ Frontend `PropertyCPFUsage.tsx` likely uses local calculations

---

## Part 4: Implementation Roadmap

### Priority 1: Wire Assumptions to Projector (Critical Path)

**Why Critical:** User assumptions are stored but have no effect on projections.

**Tasks:**
1. **Modify `ProjectToDate()` signature** - Add `*CPFAssumptions` parameter
2. **Update interest calculation** - Use assumption rates instead of hardcoded values
3. **Load assumptions in handler** - Fetch assumptions before calling projector
4. **Unit tests** - Test projection with custom assumption values

**Effort:** 2-3 hours

### Priority 2: Extra Interest Calculation (Accuracy)

**Why Important:** Without extra interest, projections underestimate growth by ~1-2% on first $60k.

**Tasks:**
1. **Implement `calculateExtraInterest()`** in `interest.go`
2. **Handle age-based credit destination** - SA (below 55) or RA (55+)
3. **Apply priority order** - OA first, then SA/RA, then MA
4. **Wire into monthly interest calculation**
5. **Unit tests** - Verify calculations match CPF official rules

**Effort:** 4-6 hours

### Priority 3: Projection Range Endpoint (Frontend Enabler)

**Why Important:** Enables frontend to remove mock projection data.

**Tasks:**
1. **Create handler** - `HandleGetProjectionRange()` in `cpf_v2.go`
2. **Add route** - `GET /api/v2/cpf/account/{id}/projection/range`
3. **Build response** - Yearly projections, milestones, retirement data
4. **Frontend hook** - `useCpfProjectionRangeQuery()`
5. **Update `CPFProjectionChart.tsx`** - Use real API

**Effort:** 6-8 hours

### Priority 4: Age 55 RA Conversion Calculator (Retirement Planning)

**Why Important:** Core retirement planning feature.

**Tasks:**
1. **Create `retirement/conversion.go`** - Implement SA→RA, OA→RA logic
2. **Handle edge cases** - Property pledge, below FRS, MA overflow
3. **Create endpoint** - `POST /api/v2/cpf/calculators/age55-conversion`
4. **Frontend mutation** - `useAge55ConversionMutation()`
5. **Update `Age55ConversionSimulator`** - Use API instead of local hook

**Effort:** 8-12 hours

### Priority 5: CPF LIFE Payout Calculator (Retirement Planning)

**Why Important:** Users need to understand retirement income.

**Tasks:**
1. **Create `retirement/cpflife.go`** - Implement payout calculation
2. **Support 3 plans** - Standard, Basic, Escalating
3. **Implement deferment bonus** - +7% per year (65-70)
4. **Implement bequest calculation** - Premium minus payouts
5. **Create RSS calculator** - For accounts below MRS
6. **Create endpoint** - `POST /api/v2/cpf/calculators/cpflife-estimate`
7. **Update `CPFLifeEstimator.tsx`** - Use API

**Effort:** 10-14 hours

### Priority 6: Frontend Mock Data Removal (Cleanup)

**Why Important:** Production readiness.

**Tasks:**
1. **Remove `cpf-mock-data.ts`** - After all components use APIs
2. **Add loading states** - To all CPF components
3. **Add error handling** - User-friendly error messages
4. **Cache invalidation** - When assumptions change

**Effort:** 4-6 hours

---

## Part 5: Detailed Task Tickets

> **Linear Project:** [ASS - Assetra3](https://linear.app/assetra3/team/ASS/backlog)
> **GitHub Issues:** [cpf label](https://github.com/jcleow/financial-chat-system/labels/cpf)
> **Label:** `cpf`

### Ticket CPF-001: Wire Assumptions to Projector

**Linear:** [ASS-49](https://linear.app/assetra3/issue/ASS-49/cpf-wire-assumptions-to-projector) | **GitHub:** [#151](https://github.com/jcleow/financial-chat-system/issues/151)
**Priority:** P0 (Critical)
**Effort:** Small (2-3h)
**Dependencies:** None

**Description:**
Modify the CPF projector to use user assumptions instead of hardcoded interest rates.

**Files to Modify:**
- `backend/internal/cpf/projector/projector.go`
- `backend/internal/cpf/projector/interest.go`
- `backend/internal/cpf/projector/types.go`

**Changes:**
1. Add `Assumptions` field to projector or pass as parameter
2. Update `calculateInterest()` to use assumption rates
3. Pass assumptions from caller

**Acceptance Criteria:**
- [ ] `ProjectToDate()` accepts assumptions parameter
- [ ] Interest calculated using assumption values
- [ ] Default to official rates if assumptions nil
- [ ] Unit tests verify custom rates are applied

---

### Ticket CPF-002: Implement Extra Interest Calculation

**Linear:** [ASS-50](https://linear.app/assetra3/issue/ASS-50/cpf-implement-extra-interest-calculation) | **GitHub:** [#152](https://github.com/jcleow/financial-chat-system/issues/152)
**Priority:** P1 (High)
**Effort:** Medium (4-6h)
**Dependencies:** ASS-49 / #151

**Description:**
Implement the +1% extra interest on first $60k combined balances, with additional +1% for age 55+ on first $30k.

**Files to Modify:**
- `backend/internal/cpf/projector/interest.go`

**New Functions:**
```go
func calculateExtraInterest(
    balances Balances,
    age int,
    assumptions *CPFAssumptions,
) ExtraInterestResult

type ExtraInterestResult struct {
    Amount   decimal.Decimal
    CreditTo string // "sa" or "ra"
}
```

**Acceptance Criteria:**
- [ ] Extra interest calculated on first $60k
- [ ] Additional +1% on first $30k for 55+
- [ ] Priority order: OA → SA/RA → MA
- [ ] Credits to SA (below 55) or RA (55+)
- [ ] Unit tests with multiple scenarios

---

### Ticket CPF-003: Add Projection Range Endpoint

**Linear:** [ASS-51](https://linear.app/assetra3/issue/ASS-51/cpf-add-projection-range-endpoint) | **GitHub:** [#153](https://github.com/jcleow/financial-chat-system/issues/153)
**Priority:** P1 (High)
**Effort:** Medium (6-8h)
**Dependencies:** ASS-49, ASS-50 / #151, #152

**Description:**
Add API endpoint for 30-year CPF projections to replace frontend mock data.

**New Endpoint:**
`GET /api/v2/cpf/account/{id}/projection/range?years=30`

**Files to Modify:**
- `backend/cmd/server/handlers/cpf_v2.go`
- `backend/cmd/server/routes/v2.go`

**Response Structure:**
```json
{
  "projections": [
    { "year": 2025, "age": 34, "oa": "...", "sa": "...", ... }
  ],
  "milestones": {
    "age55": { "year": 2046, "balances": {...} },
    "age65": { "year": 2056, "balances": {...} }
  },
  "retirement": {
    "frsTarget": "213000.00",
    "cpfLifeEstimates": {...}
  }
}
```

**Acceptance Criteria:**
- [ ] Endpoint returns yearly projections
- [ ] Includes age 55 and 65 milestones
- [ ] Uses user assumptions for interest rates
- [ ] Performance < 500ms for 30-year projection

---

### Ticket CPF-004: Create Age 55 Conversion Calculator

**Linear:** [ASS-52](https://linear.app/assetra3/issue/ASS-52/cpf-create-age-55-conversion-calculator) | **GitHub:** [#154](https://github.com/jcleow/financial-chat-system/issues/154)
**Priority:** P2 (Medium)
**Effort:** Large (8-12h)
**Dependencies:** None

**Description:**
Implement backend calculator for Age 55 RA conversion (SA→RA, OA→RA transfers).

**New Files:**
```
backend/internal/cpf/retirement/
├── conversion.go
├── conversion_test.go
└── types.go
```

**New Endpoint:**
`POST /api/v2/cpf/calculators/age55-conversion`

**Calculation Logic:**
1. Transfer ALL SA → RA
2. If RA < FRS, transfer OA → RA (up to amount needed)
3. If MA > BHS, overflow → RA
4. Calculate withdrawable OA
5. Determine if CPF LIFE eligible

**Acceptance Criteria:**
- [ ] Handles BRS/FRS/ERS targets
- [ ] Property pledge option supported
- [ ] Returns transfer breakdown
- [ ] Returns eligibility status
- [ ] Unit tests for all scenarios

---

### Ticket CPF-005: Create CPF LIFE Payout Calculator

**Linear:** [ASS-53](https://linear.app/assetra3/issue/ASS-53/cpf-create-cpf-life-payout-calculator) | **GitHub:** [#155](https://github.com/jcleow/financial-chat-system/issues/155)
**Priority:** P2 (Medium)
**Effort:** Large (10-14h)
**Dependencies:** ASS-52 / #154

**Description:**
Implement backend calculator for CPF LIFE monthly payout estimates.

**New Files:**
- `backend/internal/cpf/retirement/cpflife.go`
- `backend/internal/cpf/retirement/cpflife_test.go`
- `backend/internal/cpf/retirement/rss.go`
- `backend/internal/cpf/retirement/rss_test.go`

**New Endpoint:**
`POST /api/v2/cpf/calculators/cpflife-estimate`

**Calculation Logic:**
- Standard: RA ÷ 120 (male) or ÷ 132 (female)
- Basic: ~90% of Standard
- Escalating: ~80% initial, +2%/year
- Deferment: +7% per year (65-70)

**Acceptance Criteria:**
- [ ] Calculate payouts for all 3 plans
- [ ] Support payout ages 65-70
- [ ] Include deferment bonus
- [ ] Calculate bequest estimates
- [ ] RSS fallback for below MRS
- [ ] Unit tests match CPF official calculator

---

### Ticket CPF-006: Frontend CPF Projection Integration

**Linear:** [ASS-54](https://linear.app/assetra3/issue/ASS-54/cpf-frontend-projection-integration) | **GitHub:** [#156](https://github.com/jcleow/financial-chat-system/issues/156)
**Priority:** P1 (High)
**Effort:** Medium (4-6h)
**Dependencies:** ASS-51 / #153

**Description:**
Update frontend CPF projection components to use real API instead of mock data.

**Files to Modify:**
- `frontend/src/hooks/queries/useCpfQuery.ts` - Add `useCpfProjectionRangeQuery()`
- `frontend/src/components/cpf/CPFProjectionChart.tsx` - Use real API
- `frontend/src/lib/cpf-mock-data.ts` - Mark for removal

**Acceptance Criteria:**
- [ ] `CPFProjectionChart` uses API
- [ ] Loading state shown during fetch
- [ ] Error handling implemented
- [ ] Cache invalidation on assumption change
- [ ] No mock data used in production

---

### Ticket CPF-007: Frontend Age 55 Conversion Integration

**Linear:** [ASS-55](https://linear.app/assetra3/issue/ASS-55/cpf-frontend-age-55-conversion-integration) | **GitHub:** [#157](https://github.com/jcleow/financial-chat-system/issues/157)
**Priority:** P2 (Medium)
**Effort:** Medium (4-6h)
**Dependencies:** ASS-52 / #154

**Description:**
Update Age 55 Conversion Simulator to use backend calculator.

**Files to Modify:**
- `frontend/src/hooks/queries/useCpfQuery.ts` - Add mutation
- `frontend/src/components/cpf/Age55ConversionSimulator/hooks/useRAConversion.ts` - Use API
- `frontend/src/components/cpf/Age55ConversionSimulator/`

**Acceptance Criteria:**
- [ ] Simulator uses backend calculation
- [ ] Frontend `useRAConversion` hook refactored to call API
- [ ] Loading/error states
- [ ] Results match backend calculator

---

### Ticket CPF-008: Frontend CPF LIFE Integration

**Linear:** [ASS-56](https://linear.app/assetra3/issue/ASS-56/cpf-frontend-cpf-life-integration) | **GitHub:** [#158](https://github.com/jcleow/financial-chat-system/issues/158)
**Priority:** P2 (Medium)
**Effort:** Medium (4-6h)
**Dependencies:** ASS-53 / #155

**Description:**
Update CPF LIFE estimator to use backend calculator.

**Files to Modify:**
- `frontend/src/hooks/queries/useCpfQuery.ts` - Add mutation
- `frontend/src/components/cpf/CPFLifeEstimator.tsx`

**Acceptance Criteria:**
- [ ] Estimator uses backend calculation
- [ ] Payout factors not hardcoded in frontend
- [ ] All 3 plans displayed
- [ ] Deferment options shown

---

## Part 6: Summary

### What's Working Well
1. **Core CPF calculation engine** - Fully implemented and tested
2. **Timeline integration** - CPF contributions flow through financial timeline
3. **Database schema** - All tables in place
4. **API infrastructure** - V2 endpoints for accounts and assumptions
5. **Frontend assumptions panel** - Saves/loads from backend

### Critical Gaps to Address
1. **Assumptions not wired to projector** - User settings have no effect
2. **No extra interest calculation** - Projections underestimate growth
3. **No projection range endpoint** - Frontend uses mock data
4. **No retirement calculators** - Age 55 conversion, CPF LIFE payouts

### Recommended Next Steps
1. Wire assumptions to projector (2-3h)
2. Implement extra interest calculation (4-6h)
3. Add projection range endpoint (6-8h)
4. Create retirement calculators (18-26h)
5. Frontend integration (12-18h)

**Total Estimated Effort:** 42-61 hours (1-2 sprints)
