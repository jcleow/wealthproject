# Insurance Module Redesign: Singapore-Compliant Event-Based Model

## Executive Summary

This specification addresses a comprehensive critique from a Singapore-based senior insurance planner who identified fundamental conceptual flaws in the current insurance module. The critique highlighted issues that could be considered "regulator-dangerous" under MAS guidelines and "behaviourally hostile" to Singapore users.

### Core Problem Statement

The current implementation:
1. **Combines incompatible insurance categories** into a single "47% Protected" score
2. **Represents hospitalization as dollars** instead of ward class/ISP/rider
3. **Models disability as lump sum** instead of monthly income replacement
4. **Creates false security** around government schemes
5. **Uses aggressive UI patterns** that trigger distrust

### Design Philosophy

> "Insurance is not additive like a credit score. You cannot combine Life, CI, Disability, Hospital, and CareShield into one protection number. Each has completely different risk functions."

**New approach:**
- 5 independent risk layers with categorical status
- Event-based stress testing (how Singaporeans think about risk)
- Singapore-specific hospitalization model
- Neutral, engineering-style diagnosis (not sales manipulation)

---

## 1. Risk Layer Model

### Concept

Replace the weighted average protection score with **5 independent risk layers**. Each layer has a categorical status: `covered`, `partial`, or `exposed`.

### Risk Layers

| Layer | Description | Insurance Types | Government Schemes |
|-------|-------------|-----------------|-------------------|
| Medical Costs | Hospital bills, surgery | ISP, MediShield | MediShield Life |
| Income Interruption | Income during illness/recovery | CI, temporary disability | - |
| Permanent Disability | Unable to work permanently | TPD, LTC | DPS (TPD component), CareShield |
| Death / Dependents | Financial protection for family | Life insurance | DPS (death component) |
| Old-Age Care | Long-term care in old age | LTC supplements | CareShield Life, ElderShield |

### Status Definitions

| Status | Meaning | Color |
|--------|---------|-------|
| Covered | >90% of risk addressed | Emerald |
| Partial | 50-90% of risk addressed | Amber |
| Exposed | <50% of risk addressed | Slate (NOT red) |

### UI Representation

**Header:**
```
Risk Protection Status
3 of 5 risk areas covered
```

**Each layer displays:**
- Icon + Layer name
- Status badge
- One-line summary (e.g., "Ward B1 with ISP + rider")
- Expandable details

---

## 2. Event-Based Stress Test

### Concept

Instead of abstract gap percentages, show users how their coverage responds to **specific life events** across **different timeframes**.

### Events

| Event | Trigger | Financial Impact |
|-------|---------|------------------|
| Cancer | CI diagnosis | Medical $50k-300k + income loss 12-24mo |
| Accident | Injury | Medical $10k-200k + income loss 1-24mo |
| Stroke | Cerebrovascular | Medical $30k-150k + rehab + income loss 6-36mo |
| Death | Premature death | Debts + dependent income + education fund |
| Severe Disability | Cannot perform 3+ ADLs | Caregiving $3k-8k/mo + lifetime income loss |

### Timeframes

| Timeframe | Purpose |
|-----------|---------|
| 6 months | Acute phase, can deplete savings |
| 2 years | Extended illness, most CI coverage periods |
| 5 years | Long-term impact |
| Lifetime | Permanent conditions |

### Matrix Display

```
              │ 6 months │ 2 years  │ 5 years  │ Lifetime │
──────────────┼──────────┼──────────┼──────────┼──────────┤
Cancer        │    ⚠️    │    ✗     │    ✗     │    ✗     │
Accident      │    ⚠️    │    ✗     │    ✗     │    ✗     │
Stroke        │    ✓     │    ⚠️    │    ✗     │    ✗     │
Death         │    ⚠️    │    ⚠️    │    ⚠️    │    ⚠️    │
Disability    │    ⚠️    │    ⚠️    │    ⚠️    │    ⚠️    │
```

Icons:
- ✓ Protected (>90% covered)
- ⚠️ At Risk (50-90% covered)
- ✗ Exposed (<50% covered) - Uses neutral circle, NOT red X

### Cell Detail View (on click)

```
Cancer - 2 years

Your situation:
"Income at risk after 18 months. CI payout covers 1.5 years
 of expenses, then family would need alternative income."

Financial Impact:
  Medical treatment    $150,000
  Income loss (24mo)   $192,000
  Total need           $342,000

Coverage Available:
  ✓ CI payout          $100,000
  ✓ MediShield/ISP     ~$80,000
  ✓ Savings            $50,000
  Total resources      $230,000

Gap: $112,000 (32% shortfall)

Risk statement:
"Family at risk if illness lasts beyond 18 months"
```

---

## 3. Singapore Hospitalization Model

### Current Problem

Hospitalization is shown as "$95 of $100" which is meaningless. Singaporeans think about:
- Ward class (A, B1, B2+, C)
- Whether they have ISP
- Rider type (full, co-pay, none)
- Deductible amount

### New Model

#### Ward Class

| Class | Description | MediShield Covers? | Typical Daily Cost |
|-------|-------------|-------------------|-------------------|
| A | Single room, choice of doctor | No | $500-1,500 |
| B1 | 4-bed room, choice of doctor | No | $300-800 |
| B2+ | Subsidised multi-bed | Yes | $50-200 |
| C | Open ward, highest subsidy | Yes | $30-100 |

#### ISP Tiers

| Tier | Ward Covered | Annual Limit |
|------|--------------|--------------|
| MediShield Only | B2/C | $150k |
| Basic Shield | B2+ | $200k |
| Standard Shield | B1 | $500k |
| Enhanced Shield | A | $1M |
| Premium/Private | A (private) | Unlimited |

#### Rider Types

| Type | Out-of-Pocket | Description |
|------|---------------|-------------|
| None | 10% co-insurance | Standard after deductible |
| Co-Pay | 5% co-insurance | Reduced co-pay |
| Full | 0% | Covers all co-insurance |

### UI Representation

```
Hospitalization Coverage

Target Ward Class: [C] [B2+] [B1] [A]
                              ^^^
                           Selected

┌──────────────┐  ┌──────────────┐
│ MediShield   │  │ ISP          │
│     ✓        │  │ Prudential   │
│ (enrolled)   │  │ PRUShield+   │
└──────────────┘  └──────────────┘

┌──────────────┐  ┌──────────────┐
│ Rider        │  │ Deductible   │
│ 5% Co-pay    │  │ $3,000/year  │
└──────────────┘  └──────────────┘

What this means for a $50,000 B1 hospital bill:
  Deductible:     $3,000
  Co-insurance:   ~$2,350 (5% of $47k)
  Out-of-pocket:  ~$5,350

ⓘ MediSave can cover deductible and co-pay
```

---

## 4. Disability Income Model

### Current Problem

Disability shown as "$70k of $200k" (lump sum) is US-style thinking.

Singapore IDII (Income Disability Income Insurance) is:
- Monthly benefit (e.g., $5,000/month)
- To a specific age (e.g., age 65)
- With waiting period (30/60/90 days)

### New Model

```typescript
interface DisabilityIncomePolicy {
  monthlyBenefit: number          // e.g., $5,000
  maxReplacementRatio: number     // Usually 65-75% of income
  waitingPeriodDays: 30 | 60 | 90
  benefitPeriod: {
    type: 'to_age'
    age: 55 | 60 | 65 | 70
  }
  disabilityDefinition: 'own_occupation' | 'any_occupation'
}
```

### UI Representation

```
Disability / Income Protection

Current coverage:
  Monthly benefit:  $5,000/month
  Benefit period:   To age 65 (26 years)
  Waiting period:   30 days
  Definition:       Own occupation

vs. Target (65% of income):
  Target monthly:   $6,500/month
  Gap:              $1,500/month

Government (context only):
  DPS TPD:          $70,000 (one-time, NOT monthly)
  CareShield:       $662/month (severe disability only)
```

---

## 5. Life Insurance with Dependencies

### Current Problem

Life insurance target is shown as "$900k" based on 10x income multiplier, but with no visibility into:
- Spouse dependency
- Number of children
- Outstanding mortgage
- Education fund needs

### New Model

```typescript
interface LifeInsuranceNeeds {
  dependents: Dependent[]

  // Component breakdown
  incomeReplacement: {
    yearsNeeded: number
    annualAmount: number
    total: number
  }

  spouseDependency: {
    incomeGap: number        // Monthly income spouse lacks
    yearsOfSupport: number
    total: number
  }

  childrenEducation: {
    perChild: number         // ~$100k for university
    totalChildren: number
    total: number
  }

  debtSettlement: {
    mortgage: number
    otherDebts: number
    total: number
  }

  finalExpenses: number      // $15k-25k

  totalNeeded: number
  currentCoverage: number
  gap: number
  isAdequate: boolean
}
```

### UI Representation

```
Life Insurance Needs

Your dependents:
  Spouse (no income)     → Needs support
  Child (age 8)          → 14 years to independence
  Child (age 12)         → 10 years to independence

Needs breakdown:
  Income replacement     $480,000  (10 yrs × $4k/mo)
  Spouse support         $240,000  (10 yrs × $2k/mo)
  Children education     $200,000  (2 × $100k)
  Mortgage settlement    $350,000
  Final expenses         $20,000
  ─────────────────────────────────
  Total needed           $1,290,000

Current coverage:
  Term life policies     $350,000
  DPS                    $70,000
  ─────────────────────────────────
  Total coverage         $420,000

Gap: $870,000

Family impact:
"If you pass away, family has ~4 years of coverage
 before needing alternative income"
```

---

## 6. Government Schemes with Limitations

### Current Problem

Showing "CareShield Life - $662/mo payout" and "DPS - $70k" creates false security. Users think they're covered.

### Reality

| Scheme | What Triggers It | What It Does NOT Cover |
|--------|------------------|------------------------|
| CareShield Life | Severe disability (3+ ADLs) | Temporary disability, CI, income during recovery |
| DPS | Death OR Total Permanent Disability | Critical illness, partial disability, income during illness |
| MediShield Life | Hospitalisation in B2/C ward | Private wards, A/B1 wards without ISP, most outpatient |

### UI Representation

**Warning Banner (required):**
```
⚠️ Base Safety Net - Not Financial Protection

Government schemes cover survival-level needs. They do NOT:
• Replace your income during illness
• Maintain your current lifestyle
• Protect your family's financial security
```

**Each Scheme Shows:**
```
CareShield Life

Status: ✓ Enrolled (born after 1980)
Payout: $662/month (increasing to ~$1,000 by age 67)

When this pays out:
"Only when severely disabled - cannot perform 3 or more
 Activities of Daily Living (washing, dressing, eating,
 toileting, walking, transferring)"

What this does NOT cover:
• Temporary disability or illness
• Cancer, heart attack, stroke (unless causing severe ADL loss)
• Income replacement during recovery
• Medical treatment costs
```

---

## 7. UI Tone Guidelines

### Remove These Patterns

| Current | Problem |
|---------|---------|
| `border-rose-500/20 bg-rose-500/10` | Alarmist, triggers distrust |
| "X Critical Gaps Detected" | Sales manipulation energy |
| "Gap: $920K" in rose | Emotionally hostile |
| "At Risk" labels | Creates panic, not understanding |
| AlertTriangle for gaps | Too aggressive |

### Replace With

| New | Purpose |
|-----|---------|
| `border-slate-500/20 bg-slate-500/10` | Neutral tone for "exposed" |
| "3 of 5 risk areas covered" | Factual, not alarming |
| "Income at risk if illness > 6 months" | Event-based, not dollar-based |
| Calm status labels | Engineering-style diagnosis |
| Info icons with tooltips | Educational, not alarming |

### Color Palette

```typescript
const statusColors = {
  covered: {
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
    text: 'text-emerald-400',
  },
  partial: {
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
    text: 'text-amber-400',
  },
  exposed: {
    // NEUTRAL - not alarming
    bg: 'bg-slate-500/10',
    border: 'border-slate-500/20',
    text: 'text-slate-400',
  },
}
```

---

## 8. Singapore Cost Assumptions (2025)

### Medical Costs

| Condition | Early/Mild | Moderate | Severe |
|-----------|------------|----------|--------|
| Cancer | $50k-100k | $100k-200k | $150k-300k |
| Stroke | $30k | $80k | $150k |
| Accident | $10k | $50k | $100k-200k |

### Income Loss Periods

| Condition | Acute Phase | Recovery Phase |
|-----------|-------------|----------------|
| Cancer | 12 months (100% loss) | 12 months (50% loss) |
| Stroke | 6-18 months | Variable |
| Accident | 1-24 months | Variable |

### Care Costs

| Type | Monthly Cost |
|------|--------------|
| Caregiving (home) | $3,000-5,000 |
| Caregiving (facility) | $5,000-8,000 |
| Rehabilitation | $1,500-5,000 |
| Medical supplies | $500-1,500 |

### Government Payouts

| Scheme | Amount | Trigger |
|--------|--------|---------|
| CareShield Life | $662/month | Severe disability (3+ ADLs) |
| DPS | $70,000 | Death or TPD |
| MediShield Life | ~$150k limit | Hospitalisation |

---

## 9. Type Definitions

### New Types to Add (`types/insurance.ts`)

```typescript
// === RISK LAYER MODEL ===

export type RiskLayer =
  | 'medical_costs'
  | 'income_interruption'
  | 'permanent_disability'
  | 'death_dependency'
  | 'old_age_care'

export type CoverageStatus = 'covered' | 'partial' | 'exposed'

export interface RiskLayerStatus {
  layer: RiskLayer
  status: CoverageStatus
  summary: string
  details: string[]
  governmentCoverage: { scheme: GovernmentScheme; contribution: string }[]
  privateCoverage: { policyName: string; contribution: string }[]
  exposureNotes?: string[]
}

export interface RiskCoverageSummary {
  coveredCount: number
  partialCount: number
  exposedCount: number
  totalLayers: 5
  layers: RiskLayerStatus[]
  lastCalculated: string
}

// === HOSPITALIZATION MODEL ===

export type WardClass = 'A' | 'B1' | 'B2_plus' | 'C'

export type IspTier =
  | 'medishield_only'
  | 'basic'
  | 'standard'
  | 'enhanced'
  | 'premium'

export type RiderType = 'none' | 'co_pay_5' | 'co_pay_10' | 'full'

export interface HospitalizationCoverage {
  ispProvider?: string
  ispTier: IspTier
  ispPlanName?: string
  riderType: RiderType
  annualDeductible: number
  coInsurancePercentage: number
  annualLimit: number | null
  hasPanelRestrictions: boolean
  preferredWardClass: WardClass
  isAdequateForPreferredWard: boolean
  outOfPocketEstimate: {
    typicalClaim: { amount: number; scenario: string }
    majorClaim: { amount: number; scenario: string }
  }
}

// === DISABILITY INCOME MODEL ===

export type WaitingPeriod = 30 | 60 | 90 | 180

export interface DisabilityIncomePolicy {
  id: string
  policyName: string
  monthlyBenefit: number
  maxReplacementRatio: number
  waitingPeriodDays: WaitingPeriod
  benefitPeriod: {
    type: 'to_age'
    age: 55 | 60 | 65 | 70
  }
  disabilityDefinition: 'own_occupation' | 'any_occupation' | 'hybrid'
  annualPremium: number
}

export interface DisabilityCoverageNeeds {
  currentMonthlyIncome: number
  targetReplacementRatio: number
  targetMonthlyBenefit: number
  currentPolicies: DisabilityIncomePolicy[]
  totalMonthlyBenefitCurrent: number
  monthlyBenefitGap: number
  isAdequate: boolean
}

// === LIFE INSURANCE DEPENDENCIES ===

export interface Dependent {
  id: string
  name: string
  relationship: 'spouse' | 'child' | 'parent' | 'sibling'
  dateOfBirth: string
  hasOwnIncome: boolean
  monthlyIncome?: number
  educationFundNeeded?: number
  independenceAge?: number
  hasSpecialNeeds: boolean
}

export interface LifeInsuranceNeeds {
  dependents: Dependent[]

  incomeReplacement: {
    primaryMonthlyIncome: number
    yearsOfSupport: number
    total: number
  }

  spouseDependency: {
    spouseMonthlyIncome: number
    incomeGap: number
    yearsOfSupport: number
    total: number
  }

  childrenEducation: {
    numberOfChildren: number
    perChildEstimate: number
    total: number
  }

  debtSettlement: {
    mortgage: number
    otherDebts: number
    total: number
  }

  finalExpenses: number

  totalNeeded: number
  currentCoverage: number
  dpsContribution: number
  gap: number
  yearsOfCoverageIfDeath: number
  isAdequate: boolean
}

// === GOVERNMENT SCHEME LIMITATIONS ===

export interface GovernmentSchemeLimitations {
  scheme: GovernmentScheme
  triggerCondition: {
    description: string
    severity: 'any' | 'severe'
    examples: string[]
  }
  doesNotCover: string[]
  keyLimitations: string[]
  warningMessage: string
}

// === STRESS TEST MODEL ===

export type StressEvent =
  | 'cancer'
  | 'accident'
  | 'stroke'
  | 'death'
  | 'severe_disability'

export type StressTimeframe = '6_months' | '2_years' | '5_years' | 'lifetime'

export interface FinancialImpact {
  medicalCosts: number
  careCosts: number
  otherCosts: number
  incomeLoss: number
  debtSettlement: number
  totalNeed: number
}

export interface ResourcesAvailable {
  insurancePayout: number
  insuranceBreakdown: {
    life: number
    criticalIllness: number
    disability: number
    hospitalisation: number
    accident: number
  }
  governmentPayouts: number
  governmentBreakdown: {
    dps: number
    careshield: number
    medishield: number
  }
  savingsAvailable: number
  cpfWithdrawable: number
  totalResources: number
}

export interface StressTestCell {
  event: StressEvent
  timeframe: StressTimeframe
  impact: FinancialImpact
  resources: ResourcesAvailable
  coveragePercentage: number
  status: CoverageStatus
  shortfall: number
  riskStatement: string
  keyInsight: string
}

export interface StressTestMatrix {
  results: Record<StressEvent, Record<StressTimeframe, StressTestCell>>
  summary: {
    coveredCount: number
    partialCount: number
    exposedCount: number
    worstExposure: StressTestCell | null
  }
  calculatedAt: string
}
```

---

## 10. Component Architecture

### New Components

```
frontend/src/components/insurance/
├── cards/
│   ├── RiskCoverageSummaryCard.tsx    # "3 of 5 covered" header
│   ├── RiskLayerCard.tsx              # Individual risk layer
│   ├── HospitalizationCoverageCard.tsx # Ward class, ISP, rider
│   └── GovernmentSchemeCard.tsx       # Modified with warnings
├── stress-test/
│   ├── StressTestMatrix.tsx           # Main grid
│   ├── StressTestCell.tsx             # Individual cell
│   └── StressTestDetailModal.tsx      # Expanded view
├── shared/
│   └── CoverageStatusBadge.tsx        # Reusable status badge
└── tabs/
    ├── OverviewTab.tsx                # Restructured
    ├── ScenarioAnalysisTab.tsx        # Renamed from GapAnalysisTab
    └── OptionsTab.tsx                 # Renamed from RecommendationsTab
```

### Files to Delete

```
frontend/src/components/insurance/cards/ProtectionScoreCard.tsx
frontend/src/components/insurance/cards/CoverageBreakdownCard.tsx
```

---

## 11. Implementation Phases

### Phase 1: Type System (Day 1)
- Add all new interfaces to `types/insurance.ts`
- Add `types/stress-test.ts` for stress test types
- Mark old `ProtectionScore` as deprecated

### Phase 2: Shared Components (Day 1-2)
- Create `CoverageStatusBadge.tsx`
- Create `RiskLayerCard.tsx`
- Create `RiskCoverageSummaryCard.tsx`

### Phase 3: Stress Test Foundation (Day 2-3)
- Create `lib/stress-test-calculator.ts`
- Create `hooks/useStressTestData.ts`
- Create stress test components

### Phase 4: Singapore Models (Day 3-4)
- Create `HospitalizationCoverageCard.tsx`
- Update government scheme display with limitations

### Phase 5: Tab Restructure (Day 4-5)
- Rewrite `OverviewTab.tsx`
- Rename and rewrite `GapAnalysisTab.tsx` → `ScenarioAnalysisTab.tsx`
- Rename and rewrite `RecommendationsTab.tsx` → `OptionsTab.tsx`

### Phase 6: Cleanup (Day 5)
- Delete old components
- Update tab navigation
- Verify all mock data works

---

## 12. Success Criteria

1. **No single protection percentage** - Only "X of 5 risk areas covered"
2. **Hospitalization shows ward class** - Not dollar amounts
3. **Disability shows monthly benefit** - Not lump sum
4. **Life insurance shows dependencies** - Spouse, children, mortgage
5. **Government schemes have warnings** - "Base safety net" framing
6. **No red/rose colors for gaps** - Use neutral slate
7. **Stress test matrix works** - All cells clickable with details
8. **Event-based risk statements** - "Family at risk if illness > 6 months"
9. **No urgency language** - Calm, engineering-style tone
10. **MAS-compliant framing** - No misleading aggregated scores
