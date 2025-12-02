# Product Requirements Document: Singapore CPF Simulation Engine

**Version:** 1.0.0
**Last Updated:** December 2024
**Status:** Ready for Implementation
**Logic Specification:** `specs/singapore-finance-logic-spec.md`

---

## Table of Contents

1. [Executive Summary](#1-product-definition)
2. [User Stories & Epics](#2-user-stories--epics)
3. [User Experience Flows](#3-user-experience-flows)
4. [Implementation Tickets](#4-implementation-tickets)
5. [Technical Architecture](#5-technical-architecture)
6. [Success Metrics](#6-success-metrics)

---

## 1. Product Definition

### Executive Summary

The CPF Simulation Engine is a comprehensive, deterministic financial planning module that enables Singapore residents to project their CPF (Central Provident Fund) accounts, healthcare financing, housing usage, retirement outcomes, and supplementary retirement savings over multi-decade horizons.

### Value Proposition

**For Singapore residents who want to plan their financial future**, the CPF Simulation Engine provides **accurate, government-rules-compliant projections** that help users understand:
- How their CPF contributions grow over time
- When they can afford to buy property and how much CPF to use
- What their retirement income will look like
- How to optimize tax savings through SA top-ups and SRS contributions
- Healthcare financing needs and MediSave adequacy

### Problem Statement

Singapore's personal finance system is complex, with multiple interconnected systems (CPF, MediSave, MediShield Life, SRS) that change based on age, income, and policy updates. Users struggle to:
- Understand how contributions are allocated across OA/SA/MA accounts
- Project their retirement adequacy (BRS/FRS/ERS targets)
- Optimize CPF usage for housing without compromising retirement
- Calculate accrued interest implications when selling property
- Plan tax-efficient voluntary contributions

### Product Vision

Build a **simulation-first financial planning engine** that:
1. Accurately models all CPF, healthcare, and SRS rules
2. Projects account balances month-by-month for 30+ years
3. Handles life events (property purchase, marriage, retirement)
4. Enables "what-if" scenario comparison
5. Provides actionable optimization recommendations

### Success Criteria

| Metric | Target |
|--------|--------|
| Calculation Accuracy | 100% match with CPF official calculators |
| Projection Horizon | 0-40 years |
| Rule Versioning | Support 2024, 2025, 2026 rules |
| Scenario Comparison | Up to 5 simultaneous scenarios |
| Performance | <500ms for 40-year projection |

---

## 2. User Stories & Epics

### Epic 1: CPF Contribution Simulation
**As a Singapore employee, I want to see how my CPF contributions are calculated and allocated so that I can understand my savings growth.**

#### User Stories:

- **US1.1**: As a user, I want to enter my monthly salary and bonus information so that the system can calculate my CPF contributions
  - Acceptance: Salary input with OW/AW classification, contribution breakdown displayed

- **US1.2**: As a user, I want to see my contributions allocated to OA/SA/MA based on my age so that I understand where my money goes
  - Acceptance: Allocation percentages shown, amounts per account displayed

- **US1.3**: As a PR, I want to see graduated contribution rates for my first 2 years so that I know my take-home pay impact
  - Acceptance: PR year selection, graduated vs full rate comparison

- **US1.4**: As a user, I want to understand how wage ceilings affect my contributions so that I know if I'm maximizing CPF
  - Acceptance: OW ceiling indicator, AW ceiling calculation shown

### Epic 2: CPF Interest & Balance Projection
**As a user, I want to project my CPF account balances over time so that I can plan for major life goals.**

#### User Stories:

- **US2.1**: As a user, I want to see projected balances for OA/SA/MA/RA for the next 30 years so that I can plan my finances
  - Acceptance: Year-by-year balance chart, hover for monthly details

- **US2.2**: As a user, I want to understand how extra interest works so that I can see the benefit of keeping money in CPF
  - Acceptance: Extra interest breakdown shown, effective rates displayed

- **US2.3**: As a user, I want to see my projected RA balance at age 55 so that I know if I'll meet FRS
  - Acceptance: Age 55 milestone highlighted, BRS/FRS/ERS comparison

- **US2.4**: As a user, I want to project different income growth scenarios so that I can see best/worst case outcomes
  - Acceptance: Scenario slider for salary growth rate, multiple projections overlaid

### Epic 3: MediSave & Healthcare Planning
**As a user, I want to understand my MediSave adequacy and healthcare costs so that I can plan for medical expenses.**

#### User Stories:

- **US3.1**: As a user, I want to see when my MA will reach the BHS so that I know when spillover begins
  - Acceptance: BHS target line on chart, spillover destination shown

- **US3.2**: As a user, I want to see my projected MediShield Life premiums by age so that I can budget for healthcare
  - Acceptance: Premium table by age, subsidy eligibility check

- **US3.3**: As a user, I want to understand ISP additional costs so that I can decide on coverage level
  - Acceptance: MediSave AWL limits shown, cash top-up required calculated

- **US3.4**: As a user, I want to see if my MediSave can cover projected premiums so that I know if I need to top up
  - Acceptance: MA balance vs premium projection, gap indicator

### Epic 4: CPF Housing Usage
**As a prospective homeowner, I want to plan my CPF usage for property so that I can optimize between housing and retirement.**

#### User Stories:

- **US4.1**: As a user, I want to calculate how much OA I can use for my property so that I can plan my down payment
  - Acceptance: VL/WL calculator, BRS requirement indicator

- **US4.2**: As a user, I want to see the accrued interest if I sell my property so that I understand the true cost
  - Acceptance: Accrued interest projection, refund amount calculator

- **US4.3**: As a user, I want to compare cash vs CPF for property payments so that I can minimize accrued interest
  - Acceptance: Side-by-side comparison, net worth impact shown

- **US4.4**: As a user, I want to see how using CPF for housing affects my retirement so that I can make informed trade-offs
  - Acceptance: RA projection with/without housing usage, retirement income comparison

### Epic 5: Retirement Planning & CPF LIFE
**As a user approaching retirement, I want to understand my CPF LIFE options so that I can maximize my retirement income.**

#### User Stories:

- **US5.1**: As a user, I want to see my projected RA balance at age 65 so that I can estimate CPF LIFE payouts
  - Acceptance: RA projection, CPF LIFE payout estimates by plan type

- **US5.2**: As a user, I want to compare Standard/Basic/Escalating plans so that I can choose the right plan
  - Acceptance: Side-by-side payout comparison, bequest amounts, break-even analysis

- **US5.3**: As a user, I want to see the benefit of deferring payouts to age 70 so that I can decide when to start
  - Acceptance: Deferral bonus calculation, total lifetime payout comparison

- **US5.4**: As a user, I want to know if I should top up to FRS/ERS so that I can increase my retirement income
  - Acceptance: Top-up recommendation, payout increase shown, tax relief benefit

### Epic 6: SRS Planning
**As a tax-conscious saver, I want to optimize my SRS contributions so that I can reduce taxes and grow retirement savings.**

#### User Stories:

- **US6.1**: As a user, I want to calculate my SRS contribution limit so that I don't over-contribute
  - Acceptance: Limit shown based on residency status, YTD tracking

- **US6.2**: As a user, I want to see the tax savings from SRS contributions so that I understand the benefit
  - Acceptance: Marginal tax rate applied, savings calculated

- **US6.3**: As a user, I want to plan my SRS withdrawal strategy so that I minimize taxes in retirement
  - Acceptance: 10-year window calculator, optimal withdrawal amount

- **US6.4**: As a user, I want to see the penalty for early SRS withdrawal so that I can avoid mistakes
  - Acceptance: Early withdrawal penalty + tax calculator

### Epic 7: Scenario Comparison
**As a user, I want to compare multiple financial scenarios so that I can make optimal decisions.**

#### User Stories:

- **US7.1**: As a user, I want to create and name multiple scenarios so that I can compare different life choices
  - Acceptance: Create up to 5 scenarios, rename, duplicate, delete

- **US7.2**: As a user, I want to compare scenarios side-by-side so that I can see the differences
  - Acceptance: Multi-scenario chart overlay, difference table

- **US7.3**: As a user, I want to model life events (marriage, children, career change) so that I can plan ahead
  - Acceptance: Life event templates, date-based triggers

---

## 3. User Experience Flows

### Flow 1: Initial CPF Profile Setup

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         CPF PROFILE SETUP FLOW                           │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
                    ┌───────────────────────────────┐
                    │   1. PERSONAL INFORMATION     │
                    │   - Date of birth             │
                    │   - Residency status          │
                    │   - PR grant date (if PR)     │
                    └───────────────┬───────────────┘
                                    │
                                    ▼
                    ┌───────────────────────────────┐
                    │   2. CURRENT CPF BALANCES     │
                    │   - OA balance                │
                    │   - SA balance                │
                    │   - MA balance                │
                    │   - RA balance (if 55+)       │
                    └───────────────┬───────────────┘
                                    │
                                    ▼
                    ┌───────────────────────────────┐
                    │   3. EMPLOYMENT DETAILS       │
                    │   - Monthly salary (OW)       │
                    │   - Expected bonus (AW)       │
                    │   - Salary growth rate        │
                    └───────────────┬───────────────┘
                                    │
                                    ▼
                    ┌───────────────────────────────┐
                    │   4. EXISTING COMMITMENTS     │
                    │   - Property (CPF used)       │
                    │   - Insurance policies        │
                    │   - SRS account               │
                    └───────────────┬───────────────┘
                                    │
                                    ▼
                    ┌───────────────────────────────┐
                    │   5. VIEW INITIAL PROJECTION  │
                    │   - 30-year balance chart     │
                    │   - Key milestones            │
                    │   - Recommendations           │
                    └───────────────────────────────┘
```

### Flow 2: Property Planning Simulation

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      PROPERTY PLANNING FLOW                              │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
                    ┌───────────────────────────────┐
                    │   1. SELECT PROPERTY TYPE     │
                    │   ○ HDB BTO                   │
                    │   ○ HDB Resale                │
                    │   ○ Private Condo             │
                    │   ○ Private Landed            │
                    └───────────────┬───────────────┘
                                    │
                                    ▼
                    ┌───────────────────────────────┐
                    │   2. ENTER PROPERTY DETAILS   │
                    │   - Purchase price            │
                    │   - Valuation (if different)  │
                    │   - Loan type (HDB/Bank)      │
                    │   - Loan tenure               │
                    └───────────────┬───────────────┘
                                    │
                                    ▼
                    ┌───────────────────────────────┐
                    │   3. VIEW CPF USAGE LIMITS    │
                    │   - Valuation Limit: $X       │
                    │   - Withdrawal Limit: $Y      │
                    │   - BRS required: Yes/No      │
                    └───────────────┬───────────────┘
                                    │
                                    ▼
                    ┌───────────────────────────────┐
                    │   4. COMPARE PAYMENT OPTIONS  │
                    │   ┌─────────┐  ┌─────────┐   │
                    │   │ Use Max │  │ Use Min │   │
                    │   │   CPF   │  │   CPF   │   │
                    │   └─────────┘  └─────────┘   │
                    └───────────────┬───────────────┘
                                    │
                                    ▼
                    ┌───────────────────────────────┐
                    │   5. VIEW IMPACT ANALYSIS     │
                    │   - Accrued interest at sale  │
                    │   - Retirement impact         │
                    │   - Cash flow difference      │
                    │   - Recommendation            │
                    └───────────────────────────────┘
```

### Flow 3: Retirement Projection

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      RETIREMENT PROJECTION FLOW                          │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
                    ┌───────────────────────────────┐
                    │   1. PROJECT TO AGE 55        │
                    │   - SA→RA transfer amount     │
                    │   - OA→RA transfer amount     │
                    │   - Final RA balance          │
                    │   - vs BRS/FRS/ERS            │
                    └───────────────┬───────────────┘
                                    │
                                    ▼
                    ┌───────────────────────────────┐
                    │   2. PROJECT TO AGE 65        │
                    │   - RA balance with interest  │
                    │   - Property pledge option    │
                    │   - Top-up recommendations    │
                    └───────────────┬───────────────┘
                                    │
                                    ▼
                    ┌───────────────────────────────┐
                    │   3. COMPARE CPF LIFE PLANS   │
                    │   ┌─────────────────────────┐ │
                    │   │ Standard │ Basic │ Esc. │ │
                    │   │ $1,700   │ $1,500│$1,350│ │
                    │   │ /month   │ /month│/month│ │
                    │   └─────────────────────────┘ │
                    └───────────────┬───────────────┘
                                    │
                                    ▼
                    ┌───────────────────────────────┐
                    │   4. MODEL DEFERRAL OPTIONS   │
                    │   - Start at 65: $1,700/mo    │
                    │   - Start at 67: $1,938/mo    │
                    │   - Start at 70: $2,295/mo    │
                    └───────────────┬───────────────┘
                                    │
                                    ▼
                    ┌───────────────────────────────┐
                    │   5. GENERATE RECOMMENDATIONS │
                    │   - Top up $X to SA for       │
                    │     additional $Y/month       │
                    │   - Tax relief: $Z            │
                    └───────────────────────────────┘
```

---

## 4. Implementation Tickets

## Backend Tickets

### Epic B-CPF1: Core CPF Calculation Engine

---

### Ticket B-CPF1.1: CPF Configuration & Rate Tables
**Priority:** P0 | **Complexity:** 3 points | **Sprint:** 1
**Objective:** Create versioned configuration system for CPF rates, ceilings, and thresholds

**Background:**
CPF rules change annually. The system must support multiple year configurations (2024, 2025, 2026) and load the appropriate rules based on simulation date.

**Requirements:**
- Create `internal/cpf/config/` package
- Implement versioned rate tables:
  - Contribution rates by age band and residency status
  - Allocation rates by age band
  - Wage ceilings (OW, AW, Annual)
  - Retirement sums (BRS, FRS, ERS)
  - BHS limits
  - Interest rates (base + extra)
- Support rule lookup by effective date
- Implement configuration validation

**API Contract:**
```go
// internal/cpf/config/types.go
type CPFConfiguration struct {
    Year           int       `json:"year"`
    EffectiveFrom  time.Time `json:"effectiveFrom"`
    EffectiveTo    *time.Time `json:"effectiveTo"`

    OWCeiling      int64     `json:"owCeiling"`
    AnnualCeiling  int64     `json:"annualCeiling"`
    CPFAnnualLimit int64     `json:"cpfAnnualLimit"`

    ContributionRates ContributionRateTable `json:"contributionRates"`
    AllocationRates   AllocationRateTable   `json:"allocationRates"`
    InterestRates     InterestRateConfig    `json:"interestRates"`
    RetirementSums    RetirementSumConfig   `json:"retirementSums"`
    BHS               int64                 `json:"bhs"`
}

type ContributionRateTable struct {
    CitizenAndPR3Plus AgeBasedRates `json:"citizenAndPR3Plus"`
    PRYear1           AgeBasedRates `json:"prYear1"`
    PRYear2           AgeBasedRates `json:"prYear2"`
}

type AgeBasedRates struct {
    UpTo55      RatePair `json:"upTo55"`
    Above55To60 RatePair `json:"above55To60"`
    Above60To65 RatePair `json:"above60To65"`
    Above65To70 RatePair `json:"above65To70"`
    Above70     RatePair `json:"above70"`
}

type RatePair struct {
    Employee float64 `json:"employee"`
    Employer float64 `json:"employer"`
}
```

**Database Schema:**
```sql
CREATE TABLE cpf_configurations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    year INTEGER NOT NULL,
    effective_from TIMESTAMPTZ NOT NULL,
    effective_to TIMESTAMPTZ,
    config JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(year)
);

CREATE INDEX idx_cpf_config_effective ON cpf_configurations(effective_from, effective_to);
```

**Acceptance Criteria:**
- [ ] Configuration loader returns correct rates for any date
- [ ] All 2024, 2025, 2026 rates are accurately encoded
- [ ] Validation fails for invalid configurations
- [ ] Unit tests cover all age bands and residency statuses
- [ ] Configuration can be loaded from JSON file or database

**Test Requirements:**
- Unit tests for each rate table lookup
- Integration test loading from database
- Validation tests for malformed configs

---

### Ticket B-CPF1.2: Monthly Contribution Calculator
**Priority:** P0 | **Complexity:** 5 points | **Sprint:** 1
**Objective:** Implement monthly CPF contribution calculation with full accuracy

**Background:**
This is the core calculation that must match CPF's official calculator exactly. It handles wage classification, ceiling application, rate determination, and rounding rules.

**Requirements:**
- Create `internal/cpf/contribution/` package
- Implement wage classification (OW vs AW)
- Apply OW ceiling (monthly) and AW ceiling (annual)
- Determine contribution rates based on age and residency
- Apply allocation rates to OA/SA/MA
- Implement rounding rules exactly as specified:
  - Total: round to nearest dollar
  - Employee: always floor
  - Employer: Total - Employee
- Handle low-wage worker graduated rates ($50-$750)
- Support multi-employer scenarios

**API Contract:**
```go
// internal/cpf/contribution/calculator.go
type ContributionCalculator struct {
    configLoader *config.Loader
}

type ContributionInput struct {
    EmployeeID      string
    EmployerID      string
    Month           time.Time
    GrossOW         int64  // In cents
    GrossAW         int64  // In cents
    DateOfBirth     time.Time
    ResidencyStatus ResidencyStatus
    PRGrantDate     *time.Time
    YTDOWSubjectToCPF int64 // For AW ceiling calculation
}

type ContributionResult struct {
    Month           time.Time `json:"month"`

    // Wages
    GrossOW         int64 `json:"grossOW"`
    GrossAW         int64 `json:"grossAW"`
    CappedOW        int64 `json:"cappedOW"`
    CappedAW        int64 `json:"cappedAW"`
    TotalWagesSubject int64 `json:"totalWagesSubject"`

    // Contributions (in cents)
    EmployeeContribution int64 `json:"employeeContribution"`
    EmployerContribution int64 `json:"employerContribution"`
    TotalContribution    int64 `json:"totalContribution"`

    // Allocations (in cents)
    ToOA int64 `json:"toOA"`
    ToSA int64 `json:"toSA"`
    ToMA int64 `json:"toMA"`
    ToRA int64 `json:"toRA"` // For age 55+

    // Spillover
    MASpilloverToSA int64 `json:"maSpilloverToSA"`
    MASpilloverToRA int64 `json:"maSpilloverToRA"`
    MASpilloverToOA int64 `json:"maSpilloverToOA"`

    // Metadata
    AgeForContribution int    `json:"ageForContribution"`
    ResidencyStatus    string `json:"residencyStatus"`
    RatesApplied       RatesApplied `json:"ratesApplied"`
}

func (c *ContributionCalculator) Calculate(input ContributionInput) (*ContributionResult, error)
func (c *ContributionCalculator) CalculateBatch(inputs []ContributionInput) ([]ContributionResult, error)
```

**Acceptance Criteria:**
- [ ] Contribution amounts match CPF official calculator within $1
- [ ] Rounding rules applied exactly as specified
- [ ] Age band transition handled correctly (birthday month)
- [ ] OW ceiling applied per employer
- [ ] AW ceiling calculated correctly per employer per year
- [ ] PR graduated rates applied for Year 1 and Year 2
- [ ] Low-wage worker rates ($50-$750) handled
- [ ] Allocation percentages sum to 100% (within rounding)

**Test Requirements:**
- Test each age band with sample salaries
- Test ceiling edge cases (exactly at ceiling, above ceiling)
- Test rounding with various decimal scenarios
- Test PR year transitions
- Test multi-employer scenarios
- Benchmark: <1ms per calculation

---

### Ticket B-CPF1.3: Interest Accrual Engine
**Priority:** P0 | **Complexity:** 5 points | **Sprint:** 1
**Objective:** Implement monthly interest calculation with extra interest rules

**Background:**
CPF interest is complex due to extra interest rules that differ by age and have caps. Interest is computed monthly but credited yearly.

**Requirements:**
- Create `internal/cpf/interest/` package
- Implement base interest rates (OA 2.5%, SA/MA/RA 4.0%)
- Implement extra interest for members below 55:
  - 1% on first $60,000 combined (capped $20,000 OA)
  - Extra interest credited to SA
- Implement extra interest for members 55+:
  - 2% on first $30,000 combined (capped $20,000 OA)
  - 1% on next $30,000 combined
  - Extra interest credited to RA
- Monthly compounding with year-end crediting
- Handle CPF LIFE participants (RA still earns interest)

**API Contract:**
```go
// internal/cpf/interest/engine.go
type InterestEngine struct {
    configLoader *config.Loader
}

type InterestInput struct {
    Month       time.Time
    DateOfBirth time.Time
    Balances    AccountBalances
}

type AccountBalances struct {
    OA int64 `json:"oa"` // In cents
    SA int64 `json:"sa"`
    MA int64 `json:"ma"`
    RA int64 `json:"ra"`
}

type InterestResult struct {
    Month time.Time `json:"month"`

    // Base interest earned (monthly)
    OABaseInterest int64 `json:"oaBaseInterest"`
    SABaseInterest int64 `json:"saBaseInterest"`
    MABaseInterest int64 `json:"maBaseInterest"`
    RABaseInterest int64 `json:"raBaseInterest"`

    // Extra interest earned (monthly)
    ExtraInterestEarned   int64  `json:"extraInterestEarned"`
    ExtraInterestCreditTo string `json:"extraInterestCreditTo"` // "SA" or "RA"

    // Effective rates applied
    EffectiveOARate float64 `json:"effectiveOARate"`
    EffectiveSARate float64 `json:"effectiveSARate"`
    EffectiveMARate float64 `json:"effectiveMARate"`
    EffectiveRARate float64 `json:"effectiveRARate"`

    // Total
    TotalInterestEarned int64 `json:"totalInterestEarned"`
}

func (e *InterestEngine) CalculateMonthly(input InterestInput) (*InterestResult, error)
func (e *InterestEngine) CalculateYearly(year int, monthlyResults []InterestResult) *YearlyInterestSummary
```

**Acceptance Criteria:**
- [ ] Base interest rates applied correctly by account type
- [ ] Extra interest calculated with correct caps
- [ ] Extra interest credited to correct account (SA or RA)
- [ ] Age 55 transition handled (changes extra interest rules)
- [ ] Monthly compounding produces accurate yearly totals
- [ ] Effective rates displayed correctly

**Test Requirements:**
- Test below $60K combined (full extra interest)
- Test above $60K combined (partial extra interest)
- Test $20K OA cap for extra interest
- Test age 54→55 transition
- Validate against CPF interest examples

---

### Ticket B-CPF1.4: MediSave BHS Spillover Logic
**Priority:** P0 | **Complexity:** 3 points | **Sprint:** 1
**Objective:** Implement MediSave contribution handling with BHS cap and spillover

**Background:**
When MA contributions would exceed the BHS, excess must spill over to SA/RA (up to FRS), then to OA.

**Requirements:**
- Create spillover logic in `internal/cpf/medisave/` package
- Check MA balance + contribution vs BHS
- If exceeds BHS:
  - Credit MA up to BHS
  - Spillover to SA (or RA if age 55+) up to FRS
  - Remaining spillover to OA
- Track spillover amounts for reporting
- Handle cohort BHS (fixed at age 65)

**API Contract:**
```go
// internal/cpf/medisave/spillover.go
type SpilloverInput struct {
    MAContribution int64 // Amount being contributed to MA
    CurrentMA      int64
    CurrentSA      int64
    CurrentRA      int64
    CurrentOA      int64
    BHS            int64
    FRS            int64
    Age            int
}

type SpilloverResult struct {
    ToMA         int64 `json:"toMA"`
    SpilloverToSA int64 `json:"spilloverToSA"`
    SpilloverToRA int64 `json:"spilloverToRA"`
    SpilloverToOA int64 `json:"spilloverToOA"`
    BHSReached    bool  `json:"bhsReached"`
}

func CalculateSpillover(input SpilloverInput) *SpilloverResult
```

**Acceptance Criteria:**
- [ ] Spillover occurs exactly when MA would exceed BHS
- [ ] Spillover priority is correct (SA/RA → OA)
- [ ] FRS cap is respected for SA/RA spillover
- [ ] Age 55+ routes spillover to RA instead of SA
- [ ] Cohort BHS is used for members 65+

**Test Requirements:**
- Test MA exactly at BHS
- Test MA exceeding BHS by small amount
- Test large spillover requiring OA overflow
- Test age 54 vs age 55 spillover routing

---

### Epic B-CPF2: Retirement Account & CPF LIFE

---

### Ticket B-CPF2.1: Retirement Account Creation (Age 55)
**Priority:** P0 | **Complexity:** 5 points | **Sprint:** 2
**Objective:** Implement RA creation logic when member turns 55

**Background:**
At age 55, an RA is created and savings are transferred from SA and OA to meet the FRS. The process is automatic and follows strict priority rules.

**Requirements:**
- Create `internal/cpf/retirement/` package
- Implement RA creation trigger at age 55
- Transfer SA to RA (up to FRS)
- Transfer OA to RA (for remaining FRS if SA insufficient)
- Calculate withdrawable amount (excess above FRS)
- Handle property pledge option (BRS instead of FRS)
- Implement SA closure for age 55+ (from 2025)

**API Contract:**
```go
// internal/cpf/retirement/ra_creation.go
type RACreationInput struct {
    DateOfBirth    time.Time
    CreationDate   time.Time
    Balances       AccountBalances
    PropertyPledge *PropertyPledge // nil if no pledge
}

type PropertyPledge struct {
    PropertyID   string
    PledgeAmount int64 // Up to property value or FRS-BRS
}

type RACreationResult struct {
    RACreated       bool  `json:"raCreated"`
    TransferFromSA  int64 `json:"transferFromSA"`
    TransferFromOA  int64 `json:"transferFromOA"`
    FinalRA         int64 `json:"finalRA"`
    FinalSA         int64 `json:"finalSA"`
    FinalOA         int64 `json:"finalOA"`
    Withdrawable    int64 `json:"withdrawable"`
    FRSMet          bool  `json:"frsMet"`
    ApplicableFRS   int64 `json:"applicableFRS"`
    ApplicableBRS   int64 `json:"applicableBRS"`
}

func ProcessRACreation(input RACreationInput) (*RACreationResult, error)
```

**Acceptance Criteria:**
- [ ] RA is created exactly on month member turns 55
- [ ] SA transferred first, then OA if needed
- [ ] FRS is the cohort FRS (based on year turning 55)
- [ ] Withdrawable amount calculated correctly
- [ ] Property pledge reduces required amount to BRS
- [ ] SA closure (2025+) routes future SA contributions to RA

**Test Requirements:**
- Test SA >= FRS (no OA transfer needed)
- Test SA < FRS (partial OA transfer)
- Test SA + OA < FRS (shortfall)
- Test with property pledge
- Test boundary (turning 55 on last day of month)

---

### Ticket B-CPF2.2: CPF LIFE Payout Estimator
**Priority:** P1 | **Complexity:** 5 points | **Sprint:** 2
**Objective:** Calculate CPF LIFE payout estimates for different plan types

**Background:**
CPF LIFE payouts depend on RA balance, plan type, and start age. This is an estimation since actual payouts depend on cohort mortality and interest rates.

**Requirements:**
- Create `internal/cpf/cpflife/` package
- Implement payout estimation for:
  - Standard Plan (higher payout, lower bequest)
  - Basic Plan (lower payout, higher bequest)
  - Escalating Plan (2% annual increase)
- Calculate deferral bonus (7% per year to age 70)
- Show estimated bequest amounts
- Use official CPF LIFE payout tables as baseline

**API Contract:**
```go
// internal/cpf/cpflife/estimator.go
type PayoutEstimatorInput struct {
    RABalance     int64     // At age 65
    DateOfBirth   time.Time
    StartAge      int       // 65-70
    PlanType      PlanType
}

type PlanType string
const (
    PlanStandard   PlanType = "STANDARD"
    PlanBasic      PlanType = "BASIC"
    PlanEscalating PlanType = "ESCALATING"
)

type PayoutEstimate struct {
    PlanType          PlanType `json:"planType"`
    StartAge          int      `json:"startAge"`
    InitialMonthly    int64    `json:"initialMonthly"`
    PayoutRangeMin    int64    `json:"payoutRangeMin"`
    PayoutRangeMax    int64    `json:"payoutRangeMax"`
    EstimatedBequest  int64    `json:"estimatedBequest"`
    LifetimePayout    int64    `json:"lifetimePayout"` // Assuming age 85

    // For Escalating plan
    PayoutAtAge75     *int64   `json:"payoutAtAge75,omitempty"`
    PayoutAtAge85     *int64   `json:"payoutAtAge85,omitempty"`
}

type PayoutComparison struct {
    Standard   PayoutEstimate `json:"standard"`
    Basic      PayoutEstimate `json:"basic"`
    Escalating PayoutEstimate `json:"escalating"`
    Recommendation string     `json:"recommendation"`
}

func EstimatePayout(input PayoutEstimatorInput) (*PayoutEstimate, error)
func ComparePlans(raBalance int64, dob time.Time) (*PayoutComparison, error)
```

**Acceptance Criteria:**
- [ ] Payout estimates within 10% of CPF LIFE estimator
- [ ] All three plan types calculated
- [ ] Deferral bonus applied correctly (7%/year)
- [ ] Bequest estimates reasonable
- [ ] Escalating plan shows 2% annual growth

**Test Requirements:**
- Test with BRS, FRS, ERS amounts
- Test different start ages (65, 67, 70)
- Compare against official CPF LIFE estimator
- Test edge cases (minimum $60K threshold)

---

### Epic B-CPF3: Housing & Property

---

### Ticket B-CPF3.1: Housing Withdrawal Limits Calculator
**Priority:** P0 | **Complexity:** 3 points | **Sprint:** 2
**Objective:** Calculate VL, WL, and CPF usage limits for property purchases

**Background:**
CPF usage for housing is limited by Valuation Limit (VL) and Withdrawal Limit (WL). Rules vary by property type and loan type.

**Requirements:**
- Create `internal/cpf/housing/` package
- Calculate VL = min(purchase price, valuation)
- Calculate WL = 1.2 × VL (or 1.0 × VL for second property)
- Apply BRS requirement for usage above VL
- Handle property type variations:
  - BTO: No VL/WL limits
  - HDB Resale with HDB loan: VL applies
  - Bank loan: VL and WL apply
- Check remaining lease requirements

**API Contract:**
```go
// internal/cpf/housing/limits.go
type LimitsInput struct {
    PropertyType     PropertyType
    LoanType         LoanType
    PurchasePrice    int64
    Valuation        int64
    RemainingLease   int // Years
    YoungestBuyerAge int
    CurrentOA        int64
    TotalCPF         int64
    BRS              int64
    IsSecondProperty bool
}

type PropertyType string
const (
    PropertyBTO        PropertyType = "BTO"
    PropertyHDBResale  PropertyType = "HDB_RESALE"
    PropertyPrivate    PropertyType = "PRIVATE"
)

type LimitsResult struct {
    ValuationLimit     int64 `json:"valuationLimit"`
    WithdrawalLimit    int64 `json:"withdrawalLimit"`
    MaxCPFUpToVL       int64 `json:"maxCPFUpToVL"`
    MaxCPFVLToWL       int64 `json:"maxCPFVLToWL"`
    TotalMaxCPF        int64 `json:"totalMaxCPF"`
    BRSRequired        bool  `json:"brsRequired"`
    LeaseRequirementMet bool  `json:"leaseRequirementMet"`
    LeaseProration     float64 `json:"leaseProration"`
    Warnings           []string `json:"warnings"`
}

func CalculateLimits(input LimitsInput) (*LimitsResult, error)
```

**Acceptance Criteria:**
- [ ] VL calculated correctly
- [ ] WL is 120% of VL (100% for second property)
- [ ] BRS check triggers for usage above VL
- [ ] BTO has no limits applied
- [ ] Lease requirements checked and prorated if needed
- [ ] Appropriate warnings generated

**Test Requirements:**
- Test each property type
- Test HDB vs bank loan scenarios
- Test lease < 20 years (should fail)
- Test lease covering to age 95

---

### Ticket B-CPF3.2: Accrued Interest Calculator
**Priority:** P0 | **Complexity:** 3 points | **Sprint:** 2
**Objective:** Calculate CPF accrued interest for property sales

**Background:**
When selling property purchased with CPF, the principal + accrued interest (what would have been earned in OA) must be refunded.

**Requirements:**
- Create accrued interest calculation
- Compound at 2.5% annually
- Handle multiple withdrawal dates (down payment + instalments)
- Calculate refund destination by age (<55 → OA, ≥55 → RA up to FRS)
- Support partial refund scenarios

**API Contract:**
```go
// internal/cpf/housing/accrued_interest.go
type AccruedInterestInput struct {
    Withdrawals []CPFWithdrawal
    SaleDate    time.Time
    MemberAge   int
    CurrentRA   int64
    FRS         int64
}

type CPFWithdrawal struct {
    Date      time.Time
    Principal int64
    Purpose   string // "DOWNPAYMENT", "INSTALMENT"
}

type AccruedInterestResult struct {
    TotalPrincipal    int64 `json:"totalPrincipal"`
    TotalAccruedInterest int64 `json:"totalAccruedInterest"`
    TotalRefundRequired int64 `json:"totalRefundRequired"`
    RefundToOA        int64 `json:"refundToOA"`
    RefundToRA        int64 `json:"refundToRA"`
    WithdrawalDetails []WithdrawalDetail `json:"withdrawalDetails"`
}

type WithdrawalDetail struct {
    Date            time.Time `json:"date"`
    Principal       int64     `json:"principal"`
    AccruedInterest int64     `json:"accruedInterest"`
    YearsHeld       float64   `json:"yearsHeld"`
}

func CalculateAccruedInterest(input AccruedInterestInput) (*AccruedInterestResult, error)
```

**Acceptance Criteria:**
- [ ] Interest compounds at 2.5% annually
- [ ] Each withdrawal calculated independently
- [ ] Refund destination based on age at sale
- [ ] RA refund capped at FRS - current RA
- [ ] Accurate to the cent

**Test Requirements:**
- Test 10-year holding period
- Test multiple withdrawals over time
- Test age <55 vs ≥55 refund routing
- Validate against HDB sale proceeds calculator

---

### Epic B-CPF4: SRS Module

---

### Ticket B-CPF4.1: SRS Contribution & Tax Calculator
**Priority:** P1 | **Complexity:** 3 points | **Sprint:** 3
**Objective:** Calculate SRS contribution limits and tax benefits

**Background:**
SRS contributions are tax-deductible. Limits differ by residency status. Benefits depend on marginal tax rate.

**Requirements:**
- Create `internal/srs/` package
- Implement contribution caps ($15,300 citizens/PR, $35,700 foreigners)
- Calculate tax relief based on marginal tax rate
- Track YTD contributions
- Validate against $80K overall relief cap

**API Contract:**
```go
// internal/srs/contribution.go
type ContributionInput struct {
    ResidencyStatus     ResidencyStatus
    ContributionAmount  int64
    YTDContributions    int64
    OtherTaxReliefs     int64
    TaxableIncome       int64
}

type ContributionResult struct {
    Cap                int64   `json:"cap"`
    AllowedContribution int64  `json:"allowedContribution"`
    TaxRelief          int64   `json:"taxRelief"`
    TaxSavings         int64   `json:"taxSavings"`
    MarginalTaxRate    float64 `json:"marginalTaxRate"`
    RemainingCap       int64   `json:"remainingCap"`
}

func CalculateContribution(input ContributionInput) (*ContributionResult, error)
```

**Acceptance Criteria:**
- [ ] Correct caps by residency status
- [ ] Tax relief limited by overall $80K cap
- [ ] Tax savings calculated using correct marginal rate
- [ ] YTD tracking accurate

**Test Requirements:**
- Test citizen vs foreigner caps
- Test at $80K overall relief cap
- Test various income levels for tax rate

---

### Ticket B-CPF4.2: SRS Withdrawal Tax Calculator
**Priority:** P1 | **Complexity:** 3 points | **Sprint:** 3
**Objective:** Calculate SRS withdrawal tax and penalties

**Background:**
SRS withdrawals have different tax treatment based on timing (before/after retirement age) and circumstance.

**Requirements:**
- Track statutory retirement age (locked at first contribution)
- Calculate:
  - Early withdrawal: 100% taxable + 5% penalty
  - Retirement withdrawal: 50% taxable, no penalty
  - Exceptional circumstances: 50% taxable, no penalty
- Implement 10-year withdrawal window tracking
- Calculate optimal withdrawal amount (to minimize tax)

**API Contract:**
```go
// internal/srs/withdrawal.go
type WithdrawalInput struct {
    Amount              int64
    AccountBalance      int64
    FirstContributionDate time.Time
    CurrentAge          int
    OtherTaxableIncome  int64
    IsExceptionalCircumstance bool

    // For window tracking
    FirstWithdrawalDate *time.Time
}

type WithdrawalResult struct {
    GrossWithdrawal    int64   `json:"grossWithdrawal"`
    TaxableAmount      int64   `json:"taxableAmount"`
    Penalty            int64   `json:"penalty"`
    EstimatedTax       int64   `json:"estimatedTax"`
    NetWithdrawal      int64   `json:"netWithdrawal"`

    StatutoryRetAge    int     `json:"statutoryRetAge"`
    IsEarlyWithdrawal  bool    `json:"isEarlyWithdrawal"`

    WithdrawalWindow   *WithdrawalWindow `json:"withdrawalWindow,omitempty"`
}

type WithdrawalWindow struct {
    StartDate    time.Time `json:"startDate"`
    EndDate      time.Time `json:"endDate"`
    YearsRemaining float64 `json:"yearsRemaining"`
}

func CalculateWithdrawal(input WithdrawalInput) (*WithdrawalResult, error)
func CalculateOptimalWithdrawal(balance int64, years int) []OptimalWithdrawalYear
```

**Acceptance Criteria:**
- [ ] Statutory retirement age locked at first contribution
- [ ] Early vs retirement withdrawal correctly identified
- [ ] 50% vs 100% taxable applied correctly
- [ ] 5% penalty applied for early withdrawal
- [ ] 10-year window tracked from first penalty-free withdrawal
- [ ] Tax estimate uses correct income tax rates

**Test Requirements:**
- Test early withdrawal (age < statutory)
- Test retirement withdrawal (age >= statutory)
- Test exceptional circumstances
- Test window expiry scenarios
- Validate against IRAS examples

---

### Epic B-CPF5: Simulation Engine

---

### Ticket B-CPF5.1: Monthly Simulation Orchestrator
**Priority:** P0 | **Complexity:** 8 points | **Sprint:** 3
**Objective:** Create the main simulation engine that projects month-by-month

**Background:**
This is the core orchestration layer that runs all modules for each month, tracking balances, applying contributions, interest, and life events.

**Requirements:**
- Create `internal/cpf/simulation/` package
- Orchestrate monthly simulation loop:
  1. Apply contributions
  2. Apply housing withdrawals
  3. Apply interest
  4. Check life events (age 55, 65)
  5. Record snapshot
- Support simulation horizon (0-40 years)
- Handle multiple scenarios
- Optimize for performance (<500ms for 40 years)

**API Contract:**
```go
// internal/cpf/simulation/engine.go
type SimulationEngine struct {
    contributionCalc *contribution.Calculator
    interestEngine   *interest.Engine
    retirementCalc   *retirement.Calculator
    housingCalc      *housing.Calculator
}

type SimulationInput struct {
    Profile          PersonProfile
    Employment       []EmploymentIncome
    InitialBalances  AccountBalances
    Properties       []Property
    StartDate        time.Time
    EndDate          time.Time
    SalaryGrowthRate float64
    Scenarios        []ScenarioOverride
}

type SimulationOutput struct {
    MonthlySnapshots []MonthlySnapshot `json:"monthlySnapshots"`
    YearlySummaries  []YearlySummary   `json:"yearlySummaries"`
    Milestones       []Milestone       `json:"milestones"`
    FinalBalances    AccountBalances   `json:"finalBalances"`

    RetirementProjection *RetirementProjection `json:"retirementProjection"`

    Warnings         []Warning         `json:"warnings"`
    Recommendations  []Recommendation  `json:"recommendations"`
}

type MonthlySnapshot struct {
    Date        time.Time       `json:"date"`
    Age         int             `json:"age"`
    Balances    AccountBalances `json:"balances"`

    Contribution *ContributionResult `json:"contribution,omitempty"`
    Interest     *InterestResult     `json:"interest,omitempty"`
    Withdrawals  []Withdrawal        `json:"withdrawals,omitempty"`
    Events       []Event             `json:"events,omitempty"`
}

type Milestone struct {
    Type        string          `json:"type"`
    Date        time.Time       `json:"date"`
    Description string          `json:"description"`
    Balances    AccountBalances `json:"balances"`
}

func (e *SimulationEngine) Run(input SimulationInput) (*SimulationOutput, error)
```

**Acceptance Criteria:**
- [ ] Simulates 40 years in <500ms
- [ ] All modules integrated correctly
- [ ] Milestones detected (age 55, 65, BHS reached, FRS reached)
- [ ] Recommendations generated based on results
- [ ] Scenario overrides applied correctly
- [ ] Memory efficient (streaming if needed)

**Test Requirements:**
- Integration test with all modules
- Performance benchmark (40 years)
- Milestone detection tests
- Scenario comparison tests

---

### Ticket B-CPF5.2: Scenario Comparison Engine
**Priority:** P1 | **Complexity:** 3 points | **Sprint:** 3
**Objective:** Enable side-by-side comparison of multiple scenarios

**Requirements:**
- Support up to 5 simultaneous scenarios
- Calculate differences between scenarios
- Identify optimal scenario based on goals
- Generate comparison reports

**API Contract:**
```go
// internal/cpf/simulation/comparison.go
type ScenarioComparison struct {
    BaseScenario    *SimulationOutput    `json:"baseScenario"`
    Alternatives    []AlternativeScenario `json:"alternatives"`
    Recommendation  *ScenarioRecommendation `json:"recommendation"`
}

type AlternativeScenario struct {
    Name            string            `json:"name"`
    Output          *SimulationOutput `json:"output"`
    DifferenceVsBase Differences       `json:"differenceVsBase"`
}

type Differences struct {
    FinalNetWorth      int64 `json:"finalNetWorth"`
    RetirementIncome   int64 `json:"retirementIncome"`
    TaxSavings         int64 `json:"taxSavings"`
    LiquidityImpact    int64 `json:"liquidityImpact"`
}

func CompareScenarios(scenarios []SimulationInput) (*ScenarioComparison, error)
```

**Acceptance Criteria:**
- [ ] Compare up to 5 scenarios
- [ ] Calculate meaningful differences
- [ ] Rank scenarios by goal (retirement income, liquidity, etc.)
- [ ] Generate actionable recommendations

---

### Epic B-CPF6: API Endpoints

---

### Ticket B-CPF6.1: CPF Profile API
**Priority:** P0 | **Complexity:** 3 points | **Sprint:** 2
**Objective:** Create CRUD API for CPF profile management

**Requirements:**
- `POST /api/v1/cpf/profiles` - Create profile
- `GET /api/v1/cpf/profiles/{id}` - Get profile
- `PUT /api/v1/cpf/profiles/{id}` - Update profile
- `DELETE /api/v1/cpf/profiles/{id}` - Delete profile
- Store in database with proper schema

**API Contract:**
```
POST /api/v1/cpf/profiles
Request:
{
    "dateOfBirth": "1990-05-15",
    "residencyStatus": "CITIZEN",
    "initialBalances": {
        "oa": 50000.00,
        "sa": 20000.00,
        "ma": 15000.00,
        "ra": 0
    },
    "employment": {
        "monthlySalary": 8000.00,
        "annualBonus": 24000.00,
        "salaryGrowthRate": 0.03
    }
}

Response:
{
    "id": "uuid",
    "dateOfBirth": "1990-05-15",
    "residencyStatus": "CITIZEN",
    ...
    "createdAt": "2024-12-02T...",
    "updatedAt": "2024-12-02T..."
}
```

**Database Schema:**
```sql
CREATE TABLE cpf_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    date_of_birth DATE NOT NULL,
    residency_status TEXT NOT NULL,
    pr_grant_date DATE,
    initial_balances JSONB NOT NULL,
    employment JSONB,
    properties JSONB,
    srs JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Acceptance Criteria:**
- [ ] CRUD operations work correctly
- [ ] Validation on all inputs
- [ ] User scoping (users can only see their profiles)
- [ ] Proper error responses

---

### Ticket B-CPF6.2: Simulation API
**Priority:** P0 | **Complexity:** 3 points | **Sprint:** 3
**Objective:** Create API endpoint for running simulations

**Requirements:**
- `POST /api/v1/cpf/simulate` - Run simulation
- `POST /api/v1/cpf/simulate/compare` - Compare scenarios
- Support pagination for large result sets
- Caching for repeated simulations

**API Contract:**
```
POST /api/v1/cpf/simulate
Request:
{
    "profileId": "uuid",
    "horizonYears": 30,
    "salaryGrowthRate": 0.03,
    "scenarios": [
        {
            "name": "Base Case",
            "overrides": {}
        },
        {
            "name": "SA Top-up $7K/year",
            "overrides": {
                "annualSATopUp": 7000
            }
        }
    ]
}

Response:
{
    "simulationId": "uuid",
    "profile": { ... },
    "results": {
        "monthlySnapshots": [...],
        "yearlySummaries": [...],
        "milestones": [...],
        "retirement": { ... },
        "recommendations": [...]
    }
}
```

**Acceptance Criteria:**
- [ ] Simulation runs in <500ms
- [ ] Results cached for 5 minutes
- [ ] Pagination for monthly snapshots
- [ ] Scenario comparison works

---

## Frontend Tickets

### Epic F-CPF1: CPF Profile Setup

---

### Ticket F-CPF1.1: CPF Profile Form
**Priority:** P0 | **Complexity:** 5 points | **Sprint:** 2
**Objective:** Create multi-step form for CPF profile setup

**Requirements:**
- Multi-step wizard:
  1. Personal information
  2. Current CPF balances
  3. Employment details
  4. Existing commitments (optional)
- Form validation with Zod
- Save progress to localStorage
- TanStack Query for submission

**Technical Details:**
```typescript
// components/cpf/CPFProfileWizard.tsx
interface CPFProfileFormData {
  // Step 1: Personal
  dateOfBirth: Date;
  residencyStatus: 'CITIZEN' | 'PR_YEAR_1' | 'PR_YEAR_2' | 'PR_YEAR_3_PLUS';
  prGrantDate?: Date;

  // Step 2: Balances
  oaBalance: number;
  saBalance: number;
  maBalance: number;
  raBalance: number;

  // Step 3: Employment
  monthlySalary: number;
  annualBonus: number;
  salaryGrowthRate: number;

  // Step 4: Commitments (optional)
  hasProperty: boolean;
  propertyDetails?: PropertyDetails;
  hasSRS: boolean;
  srsBalance?: number;
}
```

**Acceptance Criteria:**
- [ ] All form steps validate correctly
- [ ] Progress saved between steps
- [ ] Error messages match design system
- [ ] Responsive on mobile
- [ ] Loading states during submission

---

### Ticket F-CPF1.2: Balance Entry Components
**Priority:** P0 | **Complexity:** 3 points | **Sprint:** 2
**Objective:** Create reusable CPF balance entry components

**Requirements:**
- OA/SA/MA/RA balance inputs with currency formatting
- Real-time validation (non-negative, reasonable limits)
- Info tooltips explaining each account
- Import from CPF statement option (future)

**Technical Details:**
```typescript
// components/cpf/BalanceInput.tsx
interface BalanceInputProps {
  account: 'OA' | 'SA' | 'MA' | 'RA';
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  showTooltip?: boolean;
}
```

**Acceptance Criteria:**
- [ ] Currency formatting (S$ prefix, 2 decimals)
- [ ] Tooltips with account descriptions
- [ ] Validation messages
- [ ] Keyboard accessible

---

### Epic F-CPF2: Projection Visualization

---

### Ticket F-CPF2.1: Balance Projection Chart
**Priority:** P0 | **Complexity:** 5 points | **Sprint:** 3
**Objective:** Create interactive chart showing CPF balance projections

**Requirements:**
- Stacked area chart for OA/SA/MA/RA
- X-axis: Time (years/age)
- Y-axis: Balance (S$)
- Hover tooltips with monthly details
- Milestone markers (age 55, 65)
- Zoom and pan controls
- Export as image

**Technical Details:**
```typescript
// components/cpf/ProjectionChart.tsx
interface ProjectionChartProps {
  data: YearlySummary[];
  milestones: Milestone[];
  scenarios?: {
    name: string;
    data: YearlySummary[];
  }[];
  viewMode: 'stacked' | 'line';
  xAxisMode: 'year' | 'age';
}
```

**Acceptance Criteria:**
- [ ] Chart renders smoothly with 40 years of data
- [ ] Tooltips show breakdown by account
- [ ] Milestones clearly marked
- [ ] Legend toggles account visibility
- [ ] Responsive on all screen sizes

---

### Ticket F-CPF2.2: Key Metrics Dashboard
**Priority:** P0 | **Complexity:** 3 points | **Sprint:** 3
**Objective:** Display key CPF metrics in dashboard cards

**Requirements:**
- Current total CPF balance
- Projected balance at age 55
- Projected balance at age 65
- CPF LIFE monthly payout estimate
- Progress toward BRS/FRS/ERS
- Comparison vs previous simulation

**Technical Details:**
```typescript
// components/cpf/MetricsDashboard.tsx
interface MetricCard {
  title: string;
  value: number | string;
  change?: number;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon: React.ReactNode;
  tooltip?: string;
}
```

**Acceptance Criteria:**
- [ ] All metrics display correctly
- [ ] Change indicators show improvement/decline
- [ ] Tooltips explain calculations
- [ ] Responsive grid layout

---

### Epic F-CPF3: Retirement Planning UI

---

### Ticket F-CPF3.1: Retirement Summary Panel
**Priority:** P1 | **Complexity:** 3 points | **Sprint:** 3
**Objective:** Display retirement adequacy summary

**Requirements:**
- Progress bar toward BRS/FRS/ERS
- Estimated RA at 55 and 65
- CPF LIFE payout estimates
- Retirement gap indicator
- Top-up recommendations

**Technical Details:**
```typescript
// components/cpf/RetirementSummary.tsx
interface RetirementSummaryProps {
  currentAge: number;
  projectedRA55: number;
  projectedRA65: number;
  brs: number;
  frs: number;
  ers: number;
  cpfLifeEstimates: PayoutComparison;
  recommendations: Recommendation[];
}
```

**Acceptance Criteria:**
- [ ] Progress bars animated on load
- [ ] Color coding (red/yellow/green) for adequacy
- [ ] Recommendations actionable
- [ ] Links to top-up options

---

### Ticket F-CPF3.2: CPF LIFE Comparison Tool
**Priority:** P1 | **Complexity:** 5 points | **Sprint:** 4
**Objective:** Interactive tool to compare CPF LIFE plan options

**Requirements:**
- Side-by-side comparison of Standard/Basic/Escalating
- Adjustable RA balance input
- Adjustable start age (65-70)
- Payout projection chart over time
- Bequest comparison
- Break-even analysis

**Technical Details:**
```typescript
// components/cpf/CPFLIFEComparison.tsx
interface CPFLIFEComparisonProps {
  raBalance: number;
  dateOfBirth: Date;
  onPlanSelect?: (plan: PlanType) => void;
}
```

**Acceptance Criteria:**
- [ ] All three plans compared
- [ ] Sliders for RA balance and start age
- [ ] Chart shows 30-year payout projection
- [ ] Bequest amounts displayed
- [ ] Break-even age calculated

---

### Epic F-CPF4: Housing Planning UI

---

### Ticket F-CPF4.1: Property CPF Calculator
**Priority:** P1 | **Complexity:** 5 points | **Sprint:** 4
**Objective:** Calculate CPF usage limits for property purchase

**Requirements:**
- Property type selector
- Loan type selector
- Price and valuation inputs
- VL/WL calculation display
- BRS requirement indicator
- CPF usage optimizer (cash vs CPF)

**Technical Details:**
```typescript
// components/cpf/PropertyCPFCalculator.tsx
interface PropertyCPFCalculatorProps {
  currentOA: number;
  totalCPF: number;
  brs: number;
  onCalculate: (result: LimitsResult) => void;
}
```

**Acceptance Criteria:**
- [ ] All property types supported
- [ ] VL/WL correctly calculated
- [ ] BRS requirement shown when applicable
- [ ] Warnings for lease issues
- [ ] Optimizer shows trade-offs

---

### Ticket F-CPF4.2: Accrued Interest Calculator
**Priority:** P1 | **Complexity:** 3 points | **Sprint:** 4
**Objective:** Calculate and display CPF accrued interest for property

**Requirements:**
- Input CPF withdrawals (date + amount)
- Calculate accrued interest at any future date
- Show refund breakdown
- Timeline visualization
- Export calculation

**Technical Details:**
```typescript
// components/cpf/AccruedInterestCalculator.tsx
interface AccruedInterestProps {
  withdrawals: CPFWithdrawal[];
  saleDate?: Date;
  memberAge: number;
  currentRA: number;
  frs: number;
}
```

**Acceptance Criteria:**
- [ ] Multiple withdrawals supported
- [ ] Interest calculated correctly (2.5% compound)
- [ ] Refund destination shown (OA vs RA)
- [ ] Timeline shows interest growth

---

### Epic F-CPF5: SRS Planning UI

---

### Ticket F-CPF5.1: SRS Contribution Calculator
**Priority:** P2 | **Complexity:** 3 points | **Sprint:** 4
**Objective:** Calculate SRS contribution limits and tax benefits

**Requirements:**
- Residency status selector
- Income input
- YTD contribution tracking
- Tax savings calculation
- Optimal contribution recommendation

**Technical Details:**
```typescript
// components/srs/SRSContributionCalculator.tsx
interface SRSContributionProps {
  residencyStatus: ResidencyStatus;
  taxableIncome: number;
  ytdContributions: number;
  otherTaxReliefs: number;
}
```

**Acceptance Criteria:**
- [ ] Correct caps by residency
- [ ] Tax savings shown
- [ ] Overall relief cap considered
- [ ] Recommendation displayed

---

### Ticket F-CPF5.2: SRS Withdrawal Planner
**Priority:** P2 | **Complexity:** 3 points | **Sprint:** 5
**Objective:** Plan optimal SRS withdrawal strategy

**Requirements:**
- 10-year withdrawal window visualization
- Annual withdrawal amount input
- Tax projection by year
- Penalty calculator for early withdrawal
- Optimal withdrawal recommendation

**Acceptance Criteria:**
- [ ] Window start/end dates shown
- [ ] Tax per year calculated
- [ ] Early withdrawal penalty shown
- [ ] Optimal strategy recommended

---

### Epic F-CPF6: Scenario Management

---

### Ticket F-CPF6.1: Scenario Builder
**Priority:** P1 | **Complexity:** 5 points | **Sprint:** 5
**Objective:** Create and manage simulation scenarios

**Requirements:**
- Create up to 5 scenarios
- Name, duplicate, delete scenarios
- Override parameters per scenario
- Save scenarios to backend
- Export/import scenarios

**Technical Details:**
```typescript
// components/scenarios/ScenarioBuilder.tsx
interface Scenario {
  id: string;
  name: string;
  baseProfileId: string;
  overrides: ScenarioOverrides;
  createdAt: Date;
}

interface ScenarioOverrides {
  salaryGrowthRate?: number;
  annualSATopUp?: number;
  annualSRSContribution?: number;
  propertyPurchase?: PropertyPurchaseOverride;
  retirementAge?: number;
}
```

**Acceptance Criteria:**
- [ ] Create/edit/delete scenarios
- [ ] Overrides apply correctly
- [ ] Scenarios persist to backend
- [ ] Export as JSON

---

### Ticket F-CPF6.2: Scenario Comparison View
**Priority:** P1 | **Complexity:** 5 points | **Sprint:** 5
**Objective:** Compare multiple scenarios side-by-side

**Requirements:**
- Multi-line chart overlay
- Difference table
- Key metric comparison
- Recommendation based on goals
- Scenario ranking

**Technical Details:**
```typescript
// components/scenarios/ScenarioComparison.tsx
interface ScenarioComparisonProps {
  scenarios: SimulationOutput[];
  goal: 'RETIREMENT_INCOME' | 'LIQUIDITY' | 'NET_WORTH';
}
```

**Acceptance Criteria:**
- [ ] Up to 5 scenarios compared
- [ ] Chart colors distinct
- [ ] Difference table accurate
- [ ] Goal-based ranking works

---

## 5. Technical Architecture

### System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND (Next.js)                              │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │   Profile   │  │ Projection  │  │  Housing    │  │   SRS       │        │
│  │   Wizard    │  │   Charts    │  │  Calculator │  │  Planner    │        │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘        │
│         │                │                │                │                │
│  ┌──────┴────────────────┴────────────────┴────────────────┴──────┐        │
│  │                    TanStack Query + Zustand                      │        │
│  └──────────────────────────────┬───────────────────────────────────┘        │
└─────────────────────────────────┼───────────────────────────────────────────┘
                                  │ REST API
                                  ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              BACKEND (Go)                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                          API Layer (Handlers)                        │    │
│  │  /api/v1/cpf/profiles  │  /api/v1/cpf/simulate  │  /api/v1/srs/*   │    │
│  └────────────────────────────────┬────────────────────────────────────┘    │
│                                   │                                          │
│  ┌────────────────────────────────┴────────────────────────────────────┐    │
│  │                       Simulation Engine                              │    │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐   │    │
│  │  │Contribution │ │  Interest   │ │ Retirement  │ │   Housing   │   │    │
│  │  │ Calculator  │ │   Engine    │ │  Calculator │ │  Calculator │   │    │
│  │  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘   │    │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐                   │    │
│  │  │  MediSave   │ │  CPF LIFE   │ │     SRS     │                   │    │
│  │  │  Spillover  │ │  Estimator  │ │  Calculator │                   │    │
│  │  └─────────────┘ └─────────────┘ └─────────────┘                   │    │
│  └────────────────────────────────┬────────────────────────────────────┘    │
│                                   │                                          │
│  ┌────────────────────────────────┴────────────────────────────────────┐    │
│  │                       Configuration Layer                            │    │
│  │  Rate Tables │ Ceilings │ Retirement Sums │ BHS │ Interest Rates    │    │
│  └────────────────────────────────┬────────────────────────────────────┘    │
│                                   │                                          │
│  ┌────────────────────────────────┴────────────────────────────────────┐    │
│  │                       Data Layer (PostgreSQL)                        │    │
│  │  cpf_profiles │ cpf_configurations │ simulations │ scenarios        │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Data Flow

```
User Input → Profile API → Database
                ↓
         Simulation API → Engine
                ↓
    ┌──────────┴──────────┐
    │   Monthly Loop      │
    │ ┌─────────────────┐ │
    │ │ 1. Contribution │ │
    │ │ 2. Interest     │ │
    │ │ 3. Withdrawals  │ │
    │ │ 4. Life Events  │ │
    │ │ 5. Snapshot     │ │
    │ └─────────────────┘ │
    └──────────┬──────────┘
               ↓
    Simulation Output → Frontend Charts
```

### Database Schema Overview

```sql
-- Core tables
cpf_profiles          -- User CPF profiles
cpf_configurations    -- Versioned CPF rules
simulations           -- Saved simulation runs
scenarios             -- Scenario overrides
properties            -- Property records
srs_accounts          -- SRS account data

-- History/Audit
cpf_balance_history   -- Balance snapshots
contribution_history  -- Monthly contributions
withdrawal_history    -- All withdrawals
```

---

## 6. Success Metrics

### Technical Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Calculation Accuracy | 100% vs CPF calculators | Automated comparison tests |
| Simulation Performance | <500ms for 40 years | P95 latency monitoring |
| API Response Time | <200ms for profiles | P95 latency |
| Frontend Load Time | <2s initial load | Lighthouse score |
| Test Coverage | >80% | Jest/Go coverage |

### User Engagement Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Profile Completion Rate | >70% | Users completing wizard |
| Simulation Runs/User | >5/month | Average simulations |
| Scenario Usage | >30% users | % creating scenarios |
| Return User Rate | >40% weekly | DAU/WAU ratio |

### Business Impact Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| User Confidence | +30% | Pre/post survey |
| CPF Knowledge | +40% | Quiz improvement |
| Planning Actions | >20% | Users acting on recommendations |

---

## Implementation Priority

### Phase 1 (Sprint 1-2): Foundation
- B-CPF1.1: Configuration & Rate Tables
- B-CPF1.2: Monthly Contribution Calculator
- B-CPF1.3: Interest Accrual Engine
- B-CPF1.4: MediSave BHS Spillover
- F-CPF1.1: CPF Profile Form
- F-CPF1.2: Balance Entry Components

### Phase 2 (Sprint 3): Core Simulation
- B-CPF2.1: RA Creation (Age 55)
- B-CPF5.1: Monthly Simulation Orchestrator
- B-CPF6.1: CPF Profile API
- B-CPF6.2: Simulation API
- F-CPF2.1: Balance Projection Chart
- F-CPF2.2: Key Metrics Dashboard

### Phase 3 (Sprint 4): Retirement & Housing
- B-CPF2.2: CPF LIFE Payout Estimator
- B-CPF3.1: Housing Withdrawal Limits
- B-CPF3.2: Accrued Interest Calculator
- F-CPF3.1: Retirement Summary Panel
- F-CPF3.2: CPF LIFE Comparison Tool
- F-CPF4.1: Property CPF Calculator
- F-CPF4.2: Accrued Interest Calculator

### Phase 4 (Sprint 5): SRS & Scenarios
- B-CPF4.1: SRS Contribution Calculator
- B-CPF4.2: SRS Withdrawal Calculator
- B-CPF5.2: Scenario Comparison Engine
- F-CPF5.1: SRS Contribution Calculator
- F-CPF5.2: SRS Withdrawal Planner
- F-CPF6.1: Scenario Builder
- F-CPF6.2: Scenario Comparison View

---

## Dependencies

### Backend → Frontend
| Backend Ticket | Blocks Frontend Tickets |
|----------------|------------------------|
| B-CPF6.1 (Profile API) | F-CPF1.1 (Profile Form) |
| B-CPF6.2 (Simulation API) | F-CPF2.1 (Projection Chart) |
| B-CPF2.2 (CPF LIFE) | F-CPF3.2 (CPF LIFE Comparison) |
| B-CPF3.1 (Housing Limits) | F-CPF4.1 (Property Calculator) |

### Internal Dependencies
| Ticket | Depends On |
|--------|------------|
| B-CPF1.2 (Contribution) | B-CPF1.1 (Config) |
| B-CPF1.3 (Interest) | B-CPF1.1 (Config) |
| B-CPF5.1 (Simulation) | B-CPF1.2, B-CPF1.3, B-CPF1.4 |
| B-CPF2.1 (RA Creation) | B-CPF1.2 |
| F-CPF6.2 (Comparison) | F-CPF6.1 (Builder), F-CPF2.1 (Chart) |

---

## Total Effort Summary

| Category | Tickets | Total Points |
|----------|---------|--------------|
| Backend Core (B-CPF1) | 4 | 16 points |
| Backend Retirement (B-CPF2) | 2 | 10 points |
| Backend Housing (B-CPF3) | 2 | 6 points |
| Backend SRS (B-CPF4) | 2 | 6 points |
| Backend Simulation (B-CPF5) | 2 | 11 points |
| Backend API (B-CPF6) | 2 | 6 points |
| **Backend Total** | **14** | **55 points** |
| Frontend Profile (F-CPF1) | 2 | 8 points |
| Frontend Projection (F-CPF2) | 2 | 8 points |
| Frontend Retirement (F-CPF3) | 2 | 8 points |
| Frontend Housing (F-CPF4) | 2 | 8 points |
| Frontend SRS (F-CPF5) | 2 | 6 points |
| Frontend Scenarios (F-CPF6) | 2 | 10 points |
| **Frontend Total** | **12** | **48 points** |
| **GRAND TOTAL** | **26** | **103 points** |

---

## New Epics: Phase 2 Features (Added December 2024)

Based on gap analysis against the comprehensive Reddit r/singaporefi CPF guide, the following new epics and tickets have been added to cover additional CPF features and enhanced property integration.

---

### Epic B-CPF7: CPFIS (CPF Investment Scheme)

---

### Ticket B-CPF7.1: CPFIS Investment Limits Engine
**Priority:** P1 | **Complexity:** 5 points | **Sprint:** 6
**Objective:** Implement CPFIS investible balance and asset limit calculations

**Background:**
CPF members can invest OA/SA funds in approved instruments, subject to reserve requirements and asset class limits. OA requires $20K reserve, SA requires $40K reserve. Stocks/property funds limited to 35% of investible OA, gold limited to 10%.

**Requirements:**
- Create `internal/cpf/cpfis/` package
- Implement investible balance calculation:
  - OA Investible = max(0, OA Balance - $20,000)
  - SA Investible = max(0, SA Balance - $40,000)
- Implement asset class limits for OA:
  - Stocks, Property Funds, Corporate Bonds: 35% of investible OA
  - Gold: 10% of investible OA
  - Unit Trusts, ETFs, ILPs, T-Bills, SGS Bonds: 100%
- SA investments: Only lower-risk products allowed
- Track current allocations vs limits
- Calculate available investment room by asset class

**API Contract:**
```go
// internal/cpf/cpfis/limits.go
type CPFISLimits struct {
    OAReserved      int64 `json:"oaReserved"`       // 20000
    SAReserved      int64 `json:"saReserved"`       // 40000
    StocksLimit     float64 `json:"stocksLimit"`    // 0.35
    GoldLimit       float64 `json:"goldLimit"`      // 0.10
}

type InvestibleBalanceInput struct {
    OABalance       int64
    SABalance       int64
    CurrentInvestments []CPFISInvestment
}

type InvestibleBalanceResult struct {
    OAInvestible    int64   `json:"oaInvestible"`
    SAInvestible    int64   `json:"saInvestible"`
    TotalInvestible int64   `json:"totalInvestible"`

    // Current allocations
    StocksAllocated     int64   `json:"stocksAllocated"`
    GoldAllocated       int64   `json:"goldAllocated"`
    OtherAllocated      int64   `json:"otherAllocated"`

    // Available room by asset class
    StocksAvailable     int64   `json:"stocksAvailable"`
    GoldAvailable       int64   `json:"goldAvailable"`
    OtherAvailable      int64   `json:"otherAvailable"`

    Warnings            []string `json:"warnings"`
}

func CalculateInvestibleBalance(input InvestibleBalanceInput) (*InvestibleBalanceResult, error)
```

**Acceptance Criteria:**
- [ ] OA/SA reserve requirements correctly applied
- [ ] Asset class limits calculated accurately
- [ ] Current allocations tracked against limits
- [ ] Warnings generated when approaching limits
- [ ] SA investment restrictions enforced

**Test Requirements:**
- Test OA/SA below reserve (zero investible)
- Test at exactly reserve amount
- Test above reserve
- Test stocks at 35% limit
- Test gold at 10% limit

---

### Ticket B-CPF7.2: CPFIS Investment Tracking
**Priority:** P1 | **Complexity:** 3 points | **Sprint:** 6
**Objective:** Track CPFIS investments and calculate returns

**Background:**
Track approved investment products purchased through CPFIS, including ETFs (STI ETF, Infinity funds), SGS bonds, T-Bills, and unit trusts. Calculate performance and impact on CPF balances.

**Requirements:**
- Create investment tracking data model
- Track purchase price, current value, units
- Calculate realized and unrealized gains
- Handle investment sales (funds return to source account)
- Track Total Expense Ratio (TER) impact
- Integrate with timeline projection

**API Contract:**
```go
// internal/cpf/cpfis/investments.go
type CPFISInvestment struct {
    ID              string      `json:"id"`
    Account         string      `json:"account"` // "OA" or "SA"
    ProductType     string      `json:"productType"` // "etf", "unit_trust", "sgs", "tbill", "stock", "gold"
    ProductName     string      `json:"productName"`
    Units           float64     `json:"units"`
    PurchasePrice   int64       `json:"purchasePrice"`
    PurchaseDate    time.Time   `json:"purchaseDate"`
    CurrentValue    int64       `json:"currentValue"`
    TER             float64     `json:"ter"`
    Status          string      `json:"status"` // "active", "sold", "matured"
}

type InvestmentPerformance struct {
    Investment      CPFISInvestment `json:"investment"`
    UnrealizedGain  int64           `json:"unrealizedGain"`
    AnnualizedReturn float64        `json:"annualizedReturn"`
    TERCostToDate   int64           `json:"terCostToDate"`
}

func TrackInvestments(investments []CPFISInvestment) ([]InvestmentPerformance, error)
func SellInvestment(investmentID string, saleDate time.Time) (*InvestmentSaleResult, error)
```

**Database Schema:**
```sql
CREATE TABLE cpfis_investments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES cpf_profiles(id),
    account TEXT NOT NULL CHECK (account IN ('OA', 'SA')),
    product_type TEXT NOT NULL,
    product_name TEXT NOT NULL,
    units DECIMAL(18, 6) NOT NULL,
    purchase_price BIGINT NOT NULL,
    purchase_date TIMESTAMPTZ NOT NULL,
    current_value BIGINT,
    ter DECIMAL(5, 4),
    status TEXT NOT NULL DEFAULT 'active',
    sale_date TIMESTAMPTZ,
    sale_price BIGINT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_cpfis_profile ON cpfis_investments(profile_id);
CREATE INDEX idx_cpfis_account ON cpfis_investments(account, status);
```

**Acceptance Criteria:**
- [ ] Investments tracked with all required fields
- [ ] Performance calculations accurate
- [ ] Sale proceeds return to correct account (OA/SA)
- [ ] TER impact calculated over holding period
- [ ] Integration with timeline projection

**Test Requirements:**
- Test investment purchase and tracking
- Test investment sale
- Test T-Bill maturity
- Test performance calculation with various returns

---

### Epic B-CPF8: Voluntary Top-ups & Tax Relief

---

### Ticket B-CPF8.1: RSTU Tax Relief Calculator
**Priority:** P0 | **Complexity:** 3 points | **Sprint:** 6
**Objective:** Calculate tax relief for CPF voluntary top-ups

**Background:**
The Retirement Sum Topping-Up (RSTU) scheme provides tax relief up to $8,000 for self top-ups and $8,000 for family member top-ups, totaling $16,000 maximum per year.

**Requirements:**
- Create `internal/cpf/topup/` package
- Calculate tax relief for self top-ups (up to $8,000)
- Calculate tax relief for family top-ups (up to $8,000)
- Track YTD top-ups against limits
- Validate eligible family members
- Calculate actual tax savings based on marginal tax rate

**API Contract:**
```go
// internal/cpf/topup/tax_relief.go
type RSTUInput struct {
    SelfTopUpAmount     int64
    FamilyTopUpAmount   int64
    YTDSelfTopUps       int64
    YTDFamilyTopUps     int64
    TaxableIncome       int64
}

type RSTUResult struct {
    SelfRelief          int64   `json:"selfRelief"`
    FamilyRelief        int64   `json:"familyRelief"`
    TotalRelief         int64   `json:"totalRelief"`
    SelfReliefRemaining int64   `json:"selfReliefRemaining"`
    FamilyReliefRemaining int64 `json:"familyReliefRemaining"`
    TaxSavings          int64   `json:"taxSavings"`
    MarginalTaxRate     float64 `json:"marginalTaxRate"`
}

const (
    RSTU_SELF_CAP   = 8000 * 100  // in cents
    RSTU_FAMILY_CAP = 8000 * 100
    RSTU_TOTAL_CAP  = 16000 * 100
)

func CalculateRSTURelief(input RSTUInput) (*RSTUResult, error)
```

**Acceptance Criteria:**
- [ ] Self top-up relief capped at $8,000
- [ ] Family top-up relief capped at $8,000
- [ ] Total relief capped at $16,000
- [ ] Tax savings calculated with correct marginal rate
- [ ] YTD tracking accurate

**Test Requirements:**
- Test self-only top-ups
- Test family-only top-ups
- Test combined top-ups
- Test at exactly cap amounts
- Test exceeding caps

---

### Ticket B-CPF8.2: OA to SA Transfer Calculator
**Priority:** P0 | **Complexity:** 3 points | **Sprint:** 6
**Objective:** Calculate OA to SA transfer limits and execute transfers

**Background:**
Members below 55 can transfer from OA to SA, but it's one-way only. The maximum transfer is capped at (FRS - current SA balance). This helps optimize for higher SA interest rate.

**Requirements:**
- Calculate maximum transferable amount: max(0, FRS - SA)
- Validate age < 55 requirement
- Apply transfer immediately to balances
- Track transfer for tax relief purposes
- Warn about one-way nature

**API Contract:**
```go
// internal/cpf/topup/oa_to_sa.go
type OAtoSATransferInput struct {
    CurrentOA       int64
    CurrentSA       int64
    FRS             int64
    Age             int
    TransferAmount  int64
}

type OAtoSATransferResult struct {
    MaxTransferable     int64   `json:"maxTransferable"`
    ActualTransfer      int64   `json:"actualTransfer"`
    NewOABalance        int64   `json:"newOABalance"`
    NewSABalance        int64   `json:"newSABalance"`
    TaxReliefEligible   int64   `json:"taxReliefEligible"`
    Allowed             bool    `json:"allowed"`
    BlockedReason       string  `json:"blockedReason,omitempty"`
    Warnings            []string `json:"warnings"`
}

func CalculateOAtoSATransfer(input OAtoSATransferInput) (*OAtoSATransferResult, error)
func ExecuteOAtoSATransfer(profileID string, amount int64) (*OAtoSATransferResult, error)
```

**Acceptance Criteria:**
- [ ] Max transfer = FRS - SA correctly calculated
- [ ] Age 55+ blocked with clear message
- [ ] Transfer applied to balances correctly
- [ ] Tax relief eligibility tracked
- [ ] Warning about one-way transfer included

**Test Requirements:**
- Test transfer when SA < FRS
- Test transfer when SA >= FRS (should be zero)
- Test age 55+ block
- Test transfer amount exceeding maximum

---

### Epic B-CPF9: SA Shielding Strategy

---

### Ticket B-CPF9.1: SA Shielding Calculator
**Priority:** P1 | **Complexity:** 5 points | **Sprint:** 7
**Objective:** Calculate optimal SA shielding strategy for approaching age 55

**Background:**
At age 55, SA is transferred to RA before OA. SA earns 4-5% while OA earns 2.5%. By investing SA in T-Bills/SGS before 55, members can "shield" SA from RA formation, then have funds return to SA post-55.

**Requirements:**
- Create `internal/cpf/shielding/` package
- Calculate optimal shielding amount
- Project RA formation with/without shielding
- Model T-Bill/SGS maturity timing
- Compare shielded vs unshielded outcomes
- Support day-before strategy (minimize opportunity cost)

**API Contract:**
```go
// internal/cpf/shielding/calculator.go
type ShieldingInput struct {
    DateOfBirth     time.Time
    CurrentOA       int64
    CurrentSA       int64
    ProjectedOA55   int64  // Projected OA at 55
    ProjectedSA55   int64  // Projected SA at 55
    FRS             int64
}

type ShieldingStrategy struct {
    ShieldingAmount     int64       `json:"shieldingAmount"`
    Instruments         []ShieldingInstrument `json:"instruments"`
    PurchaseDate        time.Time   `json:"purchaseDate"`
    MaturityDate        time.Time   `json:"maturityDate"`

    RAFormationWithout  RAFormationEstimate `json:"raFormationWithout"`
    RAFormationWith     RAFormationEstimate `json:"raFormationWith"`

    BenefitAnalysis     ShieldingBenefit `json:"benefitAnalysis"`
}

type ShieldingInstrument struct {
    Type        string  `json:"type"` // "sgsBond" or "tBill"
    Principal   int64   `json:"principal"`
    YieldRate   float64 `json:"yieldRate"`
    Term        int     `json:"termMonths"`
}

type RAFormationEstimate struct {
    FromSA      int64   `json:"fromSA"`
    FromOA      int64   `json:"fromOA"`
    TotalRA     int64   `json:"totalRA"`
    ExcessSA    int64   `json:"excessSA"`
    ExcessOA    int64   `json:"excessOA"`
}

type ShieldingBenefit struct {
    SAPreserved         int64   `json:"saPreserved"`
    InterestDifferential int64  `json:"interestDifferential"` // Over 10 years
    NetBenefit          int64   `json:"netBenefit"`
}

func CalculateShieldingStrategy(input ShieldingInput) (*ShieldingStrategy, error)
func CompareScenariosWithShielding(input ShieldingInput) (*ShieldingComparison, error)
```

**Acceptance Criteria:**
- [ ] Optimal shielding amount calculated correctly
- [ ] RA formation projected accurately
- [ ] T-Bill/SGS return to SA modeled correctly
- [ ] Interest differential calculated over time
- [ ] Day-before strategy supported

**Test Requirements:**
- Test with SA > FRS (no shielding benefit)
- Test with SA + OA < FRS (all SA transferred anyway)
- Test optimal case (SA shielded, OA forms RA)
- Test day-before strategy timing

---

### Epic B-CPF10: CPF Education Scheme

---

### Ticket B-CPF10.1: Education Loan Calculator
**Priority:** P1 | **Complexity:** 3 points | **Sprint:** 7
**Objective:** Calculate CPF education loan terms and repayment

**Background:**
CPF Education Scheme allows OA funds for approved education. Interest is 2.5% (OA rate), max 12-year repayment, minimum $100/month. No grace period like bank loans. Loan can be waived at 55 if RA meets FRS.

**Requirements:**
- Create `internal/cpf/education/` package
- Calculate loan terms based on withdrawal amount
- Generate repayment schedule
- Track accrued interest
- Model loan waiver condition at 55
- Compare vs bank education loan

**API Contract:**
```go
// internal/cpf/education/loan.go
type EducationLoanInput struct {
    Borrower        string      `json:"borrower"` // "self", "child", "spouse", "sibling"
    Institution     string      `json:"institution"`
    Course          string      `json:"course"`
    WithdrawalAmount int64      `json:"withdrawalAmount"`
    WithdrawalDate  time.Time   `json:"withdrawalDate"`
}

type EducationLoan struct {
    ID                  string      `json:"id"`
    Borrower            string      `json:"borrower"`
    Principal           int64       `json:"principal"`
    InterestRate        float64     `json:"interestRate"` // 0.025
    WithdrawalDate      time.Time   `json:"withdrawalDate"`
    RepaymentStartDate  time.Time   `json:"repaymentStartDate"`
    RepaymentEndDate    time.Time   `json:"repaymentEndDate"`
    MonthlyRepayment    int64       `json:"monthlyRepayment"`
    TotalRepayment      int64       `json:"totalRepayment"`
    TotalInterest       int64       `json:"totalInterest"`
}

type EducationLoanBalance struct {
    OutstandingPrincipal int64   `json:"outstandingPrincipal"`
    AccruedInterest      int64   `json:"accruedInterest"`
    TotalOwed            int64   `json:"totalOwed"`
    MonthsRemaining      int     `json:"monthsRemaining"`
    WaiverEligible       bool    `json:"waiverEligible"`
}

const (
    EDUCATION_INTEREST_RATE = 0.025
    MAX_REPAYMENT_YEARS     = 12
    MIN_MONTHLY_REPAYMENT   = 10000 // $100 in cents
)

func CreateEducationLoan(input EducationLoanInput) (*EducationLoan, error)
func CalculateLoanBalance(loan EducationLoan, asOfDate time.Time, totalRepaid int64) (*EducationLoanBalance, error)
func CheckWaiverEligibility(age int, raBalance int64, frs int64) bool
```

**Database Schema:**
```sql
CREATE TABLE cpf_education_loans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES cpf_profiles(id),
    borrower TEXT NOT NULL,
    institution TEXT NOT NULL,
    course TEXT NOT NULL,
    principal BIGINT NOT NULL,
    interest_rate DECIMAL(5, 4) NOT NULL DEFAULT 0.025,
    withdrawal_date TIMESTAMPTZ NOT NULL,
    repayment_start_date TIMESTAMPTZ NOT NULL,
    repayment_end_date TIMESTAMPTZ NOT NULL,
    monthly_repayment BIGINT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE cpf_education_repayments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    loan_id UUID NOT NULL REFERENCES cpf_education_loans(id),
    repayment_date TIMESTAMPTZ NOT NULL,
    amount BIGINT NOT NULL,
    principal_portion BIGINT NOT NULL,
    interest_portion BIGINT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Acceptance Criteria:**
- [ ] Interest calculated at 2.5% compound
- [ ] 12-year max repayment enforced
- [ ] $100 minimum monthly repayment
- [ ] Repayment schedule accurate
- [ ] Waiver eligibility checked correctly

**Test Requirements:**
- Test standard loan calculation
- Test minimum $100/month requirement
- Test loan balance at various points
- Test waiver eligibility (age 55 + FRS met)

---

### Epic B-CPF11: Enhanced CPF Housing Integration

---

### Ticket B-CPF11.1: Detailed CPF Usage Tracking
**Priority:** P0 | **Complexity:** 5 points | **Sprint:** 6
**Objective:** Track detailed CPF usage for property with monthly breakdown

**Background:**
For integration with the existing property planner, need to track OA usage breakdown: down payment vs monthly payments, CPF grants received, and generate monthly accrued interest schedule.

**Requirements:**
- Enhance existing `internal/cpf/housing/` package
- Track OA usage breakdown:
  - Down payment amount
  - Monthly mortgage payments (OA portion)
  - CPF grants received (EHG, FHG, PHG, Step-Up)
- Calculate cumulative totals
- Generate accrued interest schedule by year
- Integrate with `property_scenarios` table

**API Contract:**
```go
// internal/cpf/housing/usage_tracking.go
type CPFHousingUsage struct {
    PropertyScenarioID  string      `json:"propertyScenarioId"`

    DownPayment struct {
        OAUsed          int64       `json:"oaUsed"`
        CashUsed        int64       `json:"cashUsed"`
        GrantReceived   int64       `json:"grantReceived"`
        GrantType       string      `json:"grantType"` // "EHG", "FHG", "PHG", "STEP_UP"
    } `json:"downPayment"`

    MonthlyPayments     []MonthlyPayment `json:"monthlyPayments"`

    Totals struct {
        TotalOAUsed         int64   `json:"totalOAUsed"`
        TotalCashUsed       int64   `json:"totalCashUsed"`
        OAForDownPayment    int64   `json:"oaForDownPayment"`
        OAForMonthlyPayments int64  `json:"oaForMonthlyPayments"`
    } `json:"totals"`

    AccruedInterest     AccruedInterestSchedule `json:"accruedInterest"`
}

type MonthlyPayment struct {
    Month           time.Time   `json:"month"`
    OAUsed          int64       `json:"oaUsed"`
    CashUsed        int64       `json:"cashUsed"`
    PrincipalPortion int64      `json:"principalPortion"`
    InterestPortion int64       `json:"interestPortion"`
}

type AccruedInterestSchedule struct {
    AsOfDate        time.Time   `json:"asOfDate"`
    TotalAccrued    int64       `json:"totalAccrued"`
    YearlyBreakdown []YearlyAccrued `json:"yearlyBreakdown"`
}

type YearlyAccrued struct {
    Year                int     `json:"year"`
    StartingPrincipal   int64   `json:"startingPrincipal"`
    InterestForYear     int64   `json:"interestForYear"`
    CumulativeInterest  int64   `json:"cumulativeInterest"`
}

func TrackCPFHousingUsage(propertyScenarioID string) (*CPFHousingUsage, error)
func CalculateAccruedInterestSchedule(withdrawals []CPFWithdrawal, asOfDate time.Time) (*AccruedInterestSchedule, error)
```

**Database Schema:**
```sql
CREATE TABLE cpf_housing_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_scenario_id UUID NOT NULL REFERENCES property_scenarios(id),
    oa_down_payment BIGINT NOT NULL DEFAULT 0,
    cash_down_payment BIGINT NOT NULL DEFAULT 0,
    grant_received BIGINT NOT NULL DEFAULT 0,
    grant_type TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE cpf_housing_monthly_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    housing_usage_id UUID NOT NULL REFERENCES cpf_housing_usage(id),
    payment_month TIMESTAMPTZ NOT NULL,
    oa_used BIGINT NOT NULL,
    cash_used BIGINT NOT NULL,
    principal_portion BIGINT NOT NULL,
    interest_portion BIGINT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_housing_usage_property ON cpf_housing_usage(property_scenario_id);
CREATE INDEX idx_housing_monthly_month ON cpf_housing_monthly_payments(housing_usage_id, payment_month);
```

**Acceptance Criteria:**
- [ ] Down payment breakdown tracked accurately
- [ ] Monthly payments tracked with OA/cash split
- [ ] Cumulative totals calculated correctly
- [ ] Accrued interest schedule generated
- [ ] Integration with property_scenarios table works

**Test Requirements:**
- Test down payment only tracking
- Test monthly payment tracking over 12 months
- Test cumulative total calculation
- Test accrued interest schedule generation

---

### Ticket B-CPF11.2: Property Sale Refund Flow
**Priority:** P0 | **Complexity:** 5 points | **Sprint:** 7
**Objective:** Implement complete property sale CPF refund calculation and routing

**Background:**
When selling a property purchased with CPF, principal + 2.5% compound accrued interest must be refunded. Destination depends on age: before 55 goes to OA, at/after 55 goes to RA (up to FRS) then OA.

**Requirements:**
- Calculate total refund required (principal + accrued interest)
- Determine refund destination based on age
- For age 55+, calculate RA room (FRS - current RA)
- Split refund between RA and OA
- Calculate net cash proceeds
- Integrate with timeline projection

**API Contract:**
```go
// internal/cpf/housing/sale_refund.go
type PropertySaleInput struct {
    PropertyScenarioID  string
    SaleDate            time.Time
    SalePrice           int64
    OutstandingLoan     int64
    SellingCosts        int64
    MemberAge           int
    CurrentRA           int64
    FRS                 int64
    CPFUsage            CPFHousingUsage
}

type PropertySaleAnalysis struct {
    SaleDate            time.Time   `json:"saleDate"`
    GrossProceeds       int64       `json:"grossProceeds"`
    OutstandingLoan     int64       `json:"outstandingLoan"`
    SellingCosts        int64       `json:"sellingCosts"`

    CPFRefundRequired struct {
        PrincipalUsed       int64   `json:"principalUsed"`
        AccruedInterest     int64   `json:"accruedInterest"`
        TotalRefund         int64   `json:"totalRefund"`
    } `json:"cpfRefundRequired"`

    RefundDestination struct {
        ToOA                int64   `json:"toOA"`
        ToRA                int64   `json:"toRA"`
        Reason              string  `json:"reason"`
    } `json:"refundDestination"`

    NetCashProceeds     int64   `json:"netCashProceeds"`
    Warnings            []string `json:"warnings"`
}

func CalculatePropertySaleRefund(input PropertySaleInput) (*PropertySaleAnalysis, error)
```

**Acceptance Criteria:**
- [ ] Accrued interest at 2.5% compound calculated correctly
- [ ] Age-based refund routing implemented
- [ ] RA room calculation accurate (FRS - current RA)
- [ ] Split between RA and OA correct for age 55+
- [ ] Net cash proceeds calculation accurate
- [ ] Warnings for insufficient proceeds

**Test Requirements:**
- Test sale before age 55 (all to OA)
- Test sale at age 55+ with RA room
- Test sale at age 55+ with RA full (all to OA)
- Test insufficient proceeds scenario
- Test 10-year holding period accrued interest

---

### Ticket B-CPF11.3: CPF Housing Grants Calculator
**Priority:** P1 | **Complexity:** 3 points | **Sprint:** 7
**Objective:** Calculate eligibility and amounts for CPF housing grants

**Background:**
Multiple CPF housing grants are available: EHG (up to $80K based on income), FHG (first-timers), PHG ($30K for proximity), Step-Up Grant. Eligibility depends on income, property type, and family status.

**Requirements:**
- Calculate Enhanced CPF Housing Grant (EHG)
- Calculate Family Grant (FHG)
- Calculate Proximity Housing Grant (PHG)
- Calculate Step-Up Grant
- Validate eligibility criteria
- Sum total grants available

**API Contract:**
```go
// internal/cpf/housing/grants.go
type GrantEligibilityInput struct {
    HouseholdIncome     int64
    PropertyType        string  // "BTO", "HDB_RESALE"
    IsFirstTimer        bool
    FamilyNucleus       string  // "married", "engaged", "fiancee", "orphan"
    ProximityEligible   bool    // Living near parents
    PreviousGrants      []string
}

type GrantCalculationResult struct {
    EHG struct {
        Eligible    bool    `json:"eligible"`
        Amount      int64   `json:"amount"`
        Reason      string  `json:"reason"`
    } `json:"ehg"`

    FHG struct {
        Eligible    bool    `json:"eligible"`
        Amount      int64   `json:"amount"`
        Reason      string  `json:"reason"`
    } `json:"fhg"`

    PHG struct {
        Eligible    bool    `json:"eligible"`
        Amount      int64   `json:"amount"` // $30,000
        Reason      string  `json:"reason"`
    } `json:"phg"`

    StepUp struct {
        Eligible    bool    `json:"eligible"`
        Amount      int64   `json:"amount"`
        Reason      string  `json:"reason"`
    } `json:"stepUp"`

    TotalGrants         int64   `json:"totalGrants"`
    Warnings            []string `json:"warnings"`
}

func CalculateHousingGrants(input GrantEligibilityInput) (*GrantCalculationResult, error)
```

**Acceptance Criteria:**
- [ ] EHG calculated based on income tiers
- [ ] FHG eligibility verified
- [ ] PHG $30K applied when eligible
- [ ] Step-Up Grant conditions checked
- [ ] Previous grant usage considered
- [ ] Total grants summed correctly

**Test Requirements:**
- Test EHG at various income levels
- Test first-timer vs second-timer
- Test PHG eligibility
- Test combined grant scenarios

---

## Frontend Tickets for New Epics

---

### Ticket F-CPF7.1: CPFIS Investment Dashboard
**Priority:** P1 | **Complexity:** 5 points | **Sprint:** 7
**Objective:** Display CPFIS investment limits and current allocations

**Requirements:**
- Show investible balance (OA and SA)
- Display asset class limits and current usage
- Progress bars for stocks (35%) and gold (10%)
- Investment product list with performance
- Add/sell investment forms

**Acceptance Criteria:**
- [ ] Reserve requirements clearly shown
- [ ] Asset class limits visualized
- [ ] Investment performance tracked
- [ ] Add/sell forms work correctly

---

### Ticket F-CPF8.1: Top-up Tax Relief Calculator UI
**Priority:** P0 | **Complexity:** 3 points | **Sprint:** 6
**Objective:** Interactive calculator for RSTU tax relief

**Requirements:**
- Self top-up input
- Family top-up input
- Tax relief calculation display
- Tax savings based on income
- YTD tracking display

**Acceptance Criteria:**
- [ ] $8K/$8K/$16K caps shown clearly
- [ ] Tax savings calculated and displayed
- [ ] YTD remaining relief shown
- [ ] Input validation correct

---

### Ticket F-CPF8.2: OA to SA Transfer Tool
**Priority:** P0 | **Complexity:** 3 points | **Sprint:** 6
**Objective:** Tool for OA to SA transfer calculation and execution

**Requirements:**
- Show maximum transferable (FRS - SA)
- Age eligibility check (< 55)
- Transfer amount input
- One-way warning prominently displayed
- Confirmation dialog before execution

**Acceptance Criteria:**
- [ ] Max transfer calculated correctly
- [ ] Age block message shown for 55+
- [ ] Warning about one-way transfer
- [ ] Confirmation required

---

### Ticket F-CPF9.1: SA Shielding Strategy Planner
**Priority:** P1 | **Complexity:** 5 points | **Sprint:** 8
**Objective:** Interactive tool for planning SA shielding strategy

**Requirements:**
- Timeline visualization (pre-55 → 55 → post-55)
- Shielding amount calculator
- T-Bill/SGS selector
- Before/after comparison chart
- Interest differential projection

**Acceptance Criteria:**
- [ ] Timeline clearly shows strategy
- [ ] Optimal amount recommended
- [ ] Comparison chart accurate
- [ ] Long-term benefit calculated

---

### Ticket F-CPF10.1: Education Loan Calculator UI
**Priority:** P1 | **Complexity:** 3 points | **Sprint:** 8
**Objective:** Calculator for CPF education loans

**Requirements:**
- Loan amount input
- Repayment schedule generator
- Interest accrual display
- Waiver eligibility indicator
- Comparison with bank loans

**Acceptance Criteria:**
- [ ] 2.5% interest calculated
- [ ] 12-year max repayment shown
- [ ] $100 min payment enforced
- [ ] Waiver condition explained

---

### Ticket F-CPF11.1: Property CPF Usage Breakdown
**Priority:** P0 | **Complexity:** 5 points | **Sprint:** 7
**Objective:** Display detailed CPF usage for property

**Requirements:**
- Down payment breakdown (OA/cash/grants)
- Monthly payment history
- Cumulative totals display
- Accrued interest schedule chart
- Integration with property dashboard

**Acceptance Criteria:**
- [ ] All usage types displayed
- [ ] Monthly breakdown accessible
- [ ] Accrued interest chart rendered
- [ ] Totals calculated correctly

---

### Ticket F-CPF11.2: Property Sale Simulator
**Priority:** P0 | **Complexity:** 5 points | **Sprint:** 8
**Objective:** Simulate property sale and CPF refund

**Requirements:**
- Sale price input
- Outstanding loan display
- CPF refund calculation
- Refund destination (OA vs RA) display
- Net cash proceeds calculator

**Acceptance Criteria:**
- [ ] Accrued interest shown
- [ ] Age-based routing explained
- [ ] RA vs OA split calculated
- [ ] Net proceeds accurate

---

## Updated Implementation Priority

### Phase 5 (Sprint 6): Top-ups & Housing Enhanced
- B-CPF7.1: CPFIS Investment Limits Engine
- B-CPF7.2: CPFIS Investment Tracking
- B-CPF8.1: RSTU Tax Relief Calculator
- B-CPF8.2: OA to SA Transfer Calculator
- B-CPF11.1: Detailed CPF Usage Tracking
- F-CPF8.1: Top-up Tax Relief Calculator UI
- F-CPF8.2: OA to SA Transfer Tool

### Phase 6 (Sprint 7): Shielding & Education
- B-CPF9.1: SA Shielding Calculator
- B-CPF10.1: Education Loan Calculator
- B-CPF11.2: Property Sale Refund Flow
- B-CPF11.3: CPF Housing Grants Calculator
- F-CPF7.1: CPFIS Investment Dashboard
- F-CPF11.1: Property CPF Usage Breakdown

### Phase 7 (Sprint 8): Advanced Features
- F-CPF9.1: SA Shielding Strategy Planner
- F-CPF10.1: Education Loan Calculator UI
- F-CPF11.2: Property Sale Simulator

---

## Updated Effort Summary (Including New Epics)

| Category | Tickets | Total Points |
|----------|---------|--------------|
| **Original Backend (B-CPF1-6)** | 14 | 55 points |
| **New Backend: CPFIS (B-CPF7)** | 2 | 8 points |
| **New Backend: Top-ups (B-CPF8)** | 2 | 6 points |
| **New Backend: Shielding (B-CPF9)** | 1 | 5 points |
| **New Backend: Education (B-CPF10)** | 1 | 3 points |
| **New Backend: Housing Enhanced (B-CPF11)** | 3 | 13 points |
| **Backend Total** | **23** | **90 points** |
| **Original Frontend (F-CPF1-6)** | 12 | 48 points |
| **New Frontend: CPFIS (F-CPF7)** | 1 | 5 points |
| **New Frontend: Top-ups (F-CPF8)** | 2 | 6 points |
| **New Frontend: Shielding (F-CPF9)** | 1 | 5 points |
| **New Frontend: Education (F-CPF10)** | 1 | 3 points |
| **New Frontend: Housing Enhanced (F-CPF11)** | 2 | 10 points |
| **Frontend Total** | **19** | **77 points** |
| **GRAND TOTAL** | **42** | **167 points** |

---

## New Dependencies

### New Backend → Frontend Dependencies
| Backend Ticket | Blocks Frontend Tickets |
|----------------|------------------------|
| B-CPF7.1 (CPFIS Limits) | F-CPF7.1 (CPFIS Dashboard) |
| B-CPF8.1 (Tax Relief) | F-CPF8.1 (Tax Relief UI) |
| B-CPF8.2 (OA to SA) | F-CPF8.2 (Transfer Tool) |
| B-CPF9.1 (Shielding) | F-CPF9.1 (Shielding Planner) |
| B-CPF10.1 (Education) | F-CPF10.1 (Education Calculator) |
| B-CPF11.1 (Usage Tracking) | F-CPF11.1 (Usage Breakdown) |
| B-CPF11.2 (Sale Refund) | F-CPF11.2 (Sale Simulator) |

### New Internal Dependencies
| Ticket | Depends On |
|--------|------------|
| B-CPF7.2 (Investment Tracking) | B-CPF7.1 (CPFIS Limits) |
| B-CPF9.1 (Shielding) | B-CPF1.3 (Interest), B-CPF2.1 (RA Creation) |
| B-CPF11.2 (Sale Refund) | B-CPF11.1 (Usage Tracking), B-CPF3.2 (Accrued Interest) |
| F-CPF11.2 (Sale Simulator) | F-CPF11.1 (Usage Breakdown) |

---

*End of PRD*
