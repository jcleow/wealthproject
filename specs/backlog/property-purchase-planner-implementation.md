# Property Purchase Planner - Implementation Spec

**Status**: Planning Complete, Implementation Pending
**Branch**: `feat/property-purchase-planner`
**Date**: 2025-12-17

---

## 1. Requirements Summary

| Aspect | Decision |
|--------|----------|
| **Scope** | Full Purchase Flow (eligibility → grants → loans → costs → timeline) |
| **Versioning** | User selects scheme year (2023/2024/2025) |
| **User Data** | Leverage CPF account (residency_status, date_of_birth) |
| **UI** | New separate "Property Purchase Planner" tool |
| **CPF Housing** | Model CPF drawdown, update `oa_used_for_housing` |
| **Buyer Profile** | Detailed household (each buyer: age, citizenship, first-timer, joint applicants) |
| **Integration** | Auto-create scenario events on purchase confirmation |

---

## 2. Architecture: Pragmatic Phased Approach

### Phase 1: Basic Purchase Wizard (MVP)
- Multi-step wizard UI
- Frontend pure-function calculators (2025 rules hardcoded)
- Draft persistence to `property_purchase_plans` table
- **No entity creation yet** - just save calculation results

### Phase 2: Data Integration
- Confirm purchase creates: Asset, Liability, PropertyLink
- CPF OA drawdown via versioned account update
- Auto-generate scenario events

### Phase 3: Scheme Versioning
- Backend rule engine
- Scheme year selector (2023/2024/2025)
- Calculator rules fetched from backend

---

## 3. Data Model

### New Table: `property_purchase_plans`

```sql
CREATE TABLE IF NOT EXISTS property_purchase_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL,

  -- Property details
  property_type VARCHAR(50) NOT NULL, -- 'hdb_bto', 'hdb_resale', 'private_new', 'private_resale', 'ec'
  property_price NUMERIC(15,2) NOT NULL,
  location_tier VARCHAR(50), -- 'non_mature', 'mature', 'prime', 'plus'
  flat_size VARCHAR(20), -- '2room', '3room', '4room', '5room', 'ec'
  remaining_lease INT,
  scheme_year INT NOT NULL DEFAULT 2025,

  -- Buyer profile (JSONB)
  buyer_profile JSONB NOT NULL,
  -- Structure:
  -- {
  --   "applicants": [
  --     {"citizenship": "SC", "age": 30, "firstTimer": true, "prGrantDate": null, "maritalStatus": "married"}
  --   ],
  --   "householdIncome": 8000,
  --   "existingDebts": 500,
  --   "currentProperties": [],
  --   "livingWithParents": false,
  --   "nearParents": true
  -- }

  -- Financing options (JSONB)
  financing_options JSONB,

  -- Calculation results (cached JSONB)
  eligibility_result JSONB,
  grants_result JSONB,
  loan_result JSONB,
  stamp_duties_result JSONB,
  timeline_result JSONB,

  -- Metadata
  status VARCHAR(50) NOT NULL DEFAULT 'draft', -- 'draft', 'confirmed', 'cancelled'
  confirmed_at TIMESTAMPTZ,

  -- Linked entities (populated on confirmation)
  asset_id UUID,
  liability_id UUID,
  property_scenario_id UUID,
  cpf_account_id UUID,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_property_purchase_plans_user ON property_purchase_plans(user_id);
CREATE INDEX idx_property_purchase_plans_status ON property_purchase_plans(user_id, status);
```

---

## 4. Frontend File Structure

```
frontend/src/
├── types/
│   └── propertyPurchase.ts           # All TypeScript types
│
├── lib/propertyCalculators/
│   ├── index.ts                       # Export all calculators
│   ├── types.ts                       # Calculator input/output types
│   ├── eligibility.ts                 # Eligibility checker
│   ├── grants.ts                      # EHG, Family Grant, PHG calculations
│   ├── stampDuties.ts                 # BSD, ABSD, SSD calculations
│   ├── loanComparison.ts              # HDB vs Bank loan comparison
│   └── timeline.ts                    # Payment timeline generator
│
├── api/
│   └── propertyPurchase.ts            # API client for purchase plans
│
├── hooks/queries/
│   └── usePropertyPurchasePlan.ts     # TanStack Query hooks
│
└── components/property-purchase/
    ├── PropertyPurchaseWizard.tsx     # Main wizard container
    └── steps/
        ├── BuyerProfileStep.tsx       # Multi-applicant form
        ├── PropertyDetailsStep.tsx    # Property type, price, location
        ├── EligibilityStep.tsx        # Show eligibility + warnings
        ├── GrantsStep.tsx             # EHG, Family Grant, PHG breakdown
        ├── LoanComparisonStep.tsx     # HDB vs Bank side-by-side
        ├── StampDutiesStep.tsx        # BSD + ABSD breakdown
        └── TimelineStep.tsx           # Payment schedule + confirmation
```

---

## 5. TypeScript Types

```typescript
// types/propertyPurchase.ts

export type CitizenshipStatus = 'SC' | 'PR' | 'foreigner'
export type MaritalStatus = 'single' | 'married' | 'engaged' | 'divorced' | 'widowed'
export type PropertyType = 'hdb_bto' | 'hdb_resale' | 'private_new' | 'private_resale' | 'ec'
export type LocationTier = 'non_mature' | 'mature' | 'prime' | 'plus'
export type FlatSize = '2room' | '3room' | '4room' | '5room' | 'ec'
export type LoanType = 'hdb_loan' | 'bank_loan' | 'none'
export type PlanStatus = 'draft' | 'confirmed' | 'cancelled'

export interface Applicant {
  citizenship: CitizenshipStatus
  age: number
  firstTimer: boolean
  prGrantDate?: string // ISO date for PR grant date
  maritalStatus: MaritalStatus
  hasPriorHdbLoan?: boolean
}

export interface ExistingProperty {
  type: PropertyType
  dateAcquired: string
  dateSold?: string
  isSubsidized: boolean
}

export interface BuyerProfile {
  applicants: Applicant[]
  householdIncome: number
  existingDebts: number
  currentProperties: ExistingProperty[]
  livingWithParents: boolean
  nearParents: boolean // within 4km
}

export interface PropertySpecs {
  type: PropertyType
  price: number
  locationTier: LocationTier
  flatSize: FlatSize
  remainingLease?: number // years, for resale
}

export interface CPFUsage {
  oaForDownPayment: number
  oaForMonthly: number
  estimatedTotalOaUsed: number
}

export interface FinancingOptions {
  loanType: LoanType
  loanAmount: number
  interestRate: number
  tenureYears: number
  downPayment: number
  cpfUsage: CPFUsage
}

// Result Types
export interface EligibilityViolation {
  rule: string
  description: string
  severity: 'blocking' | 'warning'
}

export interface EligibilityResult {
  eligible: boolean
  scheme: string // 'public_family', 'singles_sc', 'joint_singles', etc.
  violations: EligibilityViolation[]
  warnings: string[]
  waitMonths: number // months to wait before eligible
}

export interface GrantsResult {
  ehg: number
  familyGrant: number
  singlesGrant: number
  phg: number
  ecGrant: number
  stepUpGrant: number
  total: number
  breakdown: GrantBreakdown[]
}

export interface GrantBreakdown {
  type: string
  amount: number
  conditions: string[]
}

export interface LoanOption {
  type: LoanType
  maxLtv: number
  maxLoan: number
  minCashDown: number
  monthlyPayment: number
  totalInterest: number
  passesMsr: boolean
  passesTdsr: boolean
  msrRatio: number
  tdsrRatio: number
}

export interface LoanComparisonResult {
  hdb: LoanOption | null // null if not eligible
  bank: LoanOption
  recommendation: 'hdb' | 'bank'
  reasons: string[]
}

export interface StampDutyBreakdown {
  bracket: string
  amount: number
}

export interface StampDutiesResult {
  bsd: number
  absd: number
  ssd: number
  total: number
  bsdBreakdown: StampDutyBreakdown[]
  propertyCount: number // which property this is (1st, 2nd, etc.)
}

export interface PaymentMilestone {
  phase: string
  description: string
  date: string
  amount: number
  paymentType: 'cash' | 'cpf' | 'loan' | 'stamp_duty' | 'fees'
}

export interface TimelineResult {
  milestones: PaymentMilestone[]
  totalCashNeeded: number
  totalCpfNeeded: number
}

// Full Plan
export interface PropertyPurchasePlan {
  id?: string
  userId?: string
  propertySpecs: PropertySpecs
  buyerProfile: BuyerProfile
  financingOptions: FinancingOptions
  schemeYear: number

  // Results
  eligibilityResult?: EligibilityResult
  grantsResult?: GrantsResult
  loanResult?: LoanComparisonResult
  stampDutiesResult?: StampDutiesResult
  timelineResult?: TimelineResult

  // Metadata
  status: PlanStatus
  confirmedAt?: string
  createdAt?: string
  updatedAt?: string

  // Linked entities (after confirmation)
  assetId?: string
  liabilityId?: string
  propertyScenarioId?: string
  cpfAccountId?: string
}
```

---

## 6. Calculator Logic (2025 Rules)

### 6.1 Eligibility Rules

```typescript
// lib/propertyCalculators/eligibility.ts

export function checkEligibility(
  profile: BuyerProfile,
  property: PropertySpecs
): EligibilityResult {
  const violations: EligibilityViolation[] = []
  const warnings: string[] = []
  let waitMonths = 0

  // Age check
  for (const applicant of profile.applicants) {
    if (applicant.age < 21) {
      violations.push({
        rule: 'minimum_age',
        description: 'All applicants must be at least 21 years old',
        severity: 'blocking'
      })
    }
  }

  // Citizenship check for HDB
  if (property.type === 'hdb_bto' || property.type === 'hdb_resale') {
    const hasSC = profile.applicants.some(a => a.citizenship === 'SC')
    if (!hasSC) {
      violations.push({
        rule: 'citizenship',
        description: 'At least one applicant must be a Singapore Citizen for HDB',
        severity: 'blocking'
      })
    }
  }

  // Singles scheme for BTO
  if (property.type === 'hdb_bto' && profile.applicants.length === 1) {
    const applicant = profile.applicants[0]
    if (applicant.age < 35) {
      violations.push({
        rule: 'singles_age',
        description: 'Singles must be 35+ for BTO',
        severity: 'blocking'
      })
    }
    if (property.flatSize !== '2room' || property.locationTier === 'mature') {
      violations.push({
        rule: 'singles_flat_type',
        description: 'Singles can only buy 2-room BTO in non-mature estates',
        severity: 'blocking'
      })
    }
  }

  // Income ceiling check
  const income = profile.householdIncome
  if (property.type === 'hdb_bto' || property.type === 'ec') {
    const isSingle = profile.applicants.length === 1
    const ceiling = isSingle ? 7000 : 14000
    const ecCeiling = 16000

    if (property.type === 'hdb_bto' && income > ceiling) {
      violations.push({
        rule: 'income_ceiling',
        description: `Household income exceeds ${isSingle ? '$7,000' : '$14,000'} ceiling for BTO`,
        severity: 'blocking'
      })
    }
    if (property.type === 'ec' && income > ecCeiling) {
      violations.push({
        rule: 'income_ceiling',
        description: 'Household income exceeds $16,000 ceiling for EC',
        severity: 'blocking'
      })
    }
  }

  // Prime/Plus resale income ceiling
  if (property.type === 'hdb_resale' &&
      (property.locationTier === 'prime' || property.locationTier === 'plus')) {
    if (income > 14000) {
      violations.push({
        rule: 'income_ceiling',
        description: 'Household income exceeds $14,000 ceiling for Prime/Plus resale',
        severity: 'blocking'
      })
    }
  }

  // Existing property check
  const ownsProperty = profile.currentProperties.some(p => !p.dateSold)
  if (ownsProperty && (property.type === 'hdb_bto' || property.type === 'hdb_resale')) {
    violations.push({
      rule: 'existing_property',
      description: 'Cannot own other residential property when buying HDB',
      severity: 'blocking'
    })
  }

  // Wait-out period check
  for (const existing of profile.currentProperties) {
    if (existing.dateSold) {
      const soldDate = new Date(existing.dateSold)
      const monthsSinceSale = monthsDiff(soldDate, new Date())

      if (existing.isSubsidized) {
        // 30-month wait for subsidized flat
        if (property.type === 'hdb_bto' && monthsSinceSale < 30) {
          waitMonths = Math.max(waitMonths, 30 - monthsSinceSale)
        }
      } else {
        // 15-month wait for standard resale, 30 for Prime/Plus
        const required = (property.locationTier === 'prime' || property.locationTier === 'plus') ? 30 : 15
        if (monthsSinceSale < required) {
          waitMonths = Math.max(waitMonths, required - monthsSinceSale)
        }
      }
    }
  }

  if (waitMonths > 0) {
    warnings.push(`Must wait ${waitMonths} more months from property disposal`)
  }

  // Determine scheme
  const scheme = determineScheme(profile)

  return {
    eligible: violations.filter(v => v.severity === 'blocking').length === 0 && waitMonths === 0,
    scheme,
    violations,
    warnings,
    waitMonths
  }
}

function determineScheme(profile: BuyerProfile): string {
  if (profile.applicants.length === 1) {
    return 'singles_sc'
  }
  if (profile.applicants.length >= 2 && profile.applicants.length <= 4) {
    const allSingles35Plus = profile.applicants.every(
      a => a.age >= 35 && a.maritalStatus === 'single'
    )
    if (allSingles35Plus) return 'joint_singles'
  }
  if (profile.applicants.some(a => a.maritalStatus === 'engaged')) {
    return 'fiancee'
  }
  return 'public_family'
}

function monthsDiff(from: Date, to: Date): number {
  return (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth())
}
```

### 6.2 Grants Calculator

```typescript
// lib/propertyCalculators/grants.ts

// EHG Income Tiers (2025)
const EHG_TIERS_FAMILY = [
  { maxIncome: 1500, amount: 120000 },
  { maxIncome: 2000, amount: 95000 },
  { maxIncome: 2500, amount: 85000 },
  { maxIncome: 3000, amount: 75000 },
  { maxIncome: 3500, amount: 65000 },
  { maxIncome: 4000, amount: 55000 },
  { maxIncome: 4500, amount: 45000 },
  { maxIncome: 5000, amount: 40000 },
  { maxIncome: 5500, amount: 35000 },
  { maxIncome: 6000, amount: 30000 },
  { maxIncome: 6500, amount: 25000 },
  { maxIncome: 7000, amount: 20000 },
  { maxIncome: 7500, amount: 15000 },
  { maxIncome: 8000, amount: 10000 },
  { maxIncome: 8500, amount: 5000 },
  { maxIncome: 9000, amount: 5000 },
]

const EHG_TIERS_SINGLES = EHG_TIERS_FAMILY.map(t => ({
  maxIncome: t.maxIncome / 2,
  amount: t.amount / 2
}))

// Family Grant amounts (2025)
const FAMILY_GRANT = {
  '4room_or_smaller_sc_sc': 80000,
  '4room_or_smaller_sc_pr': 70000,
  '5room_or_larger_sc_sc': 50000,
  '5room_or_larger_sc_pr': 40000,
}

const SINGLES_GRANT = {
  '4room_or_smaller': 40000,
  '5room_or_larger': 25000,
}

const PHG = {
  family_living_with: 30000,
  family_nearby: 20000,
  single_living_with: 15000,
  single_nearby: 10000,
}

export function calculateGrants(
  profile: BuyerProfile,
  property: PropertySpecs,
  eligibility: EligibilityResult
): GrantsResult {
  const breakdown: GrantBreakdown[] = []
  let ehg = 0
  let familyGrant = 0
  let singlesGrant = 0
  let phg = 0
  let ecGrant = 0
  let stepUpGrant = 0

  // Only HDB resale and BTO get grants
  if (property.type !== 'hdb_bto' && property.type !== 'hdb_resale' && property.type !== 'ec') {
    return { ehg, familyGrant, singlesGrant, phg, ecGrant, stepUpGrant, total: 0, breakdown }
  }

  const isSingle = profile.applicants.length === 1
  const allFirstTimers = profile.applicants.every(a => a.firstTimer)
  const hasSC = profile.applicants.some(a => a.citizenship === 'SC')
  const allSC = profile.applicants.every(a => a.citizenship === 'SC')
  const income = profile.householdIncome
  const isSmallFlat = ['2room', '3room', '4room'].includes(property.flatSize)

  // EHG (for first-timers only, income <= $9k family / $4.5k single)
  if (allFirstTimers) {
    const tiers = isSingle ? EHG_TIERS_SINGLES : EHG_TIERS_FAMILY
    const maxIncome = isSingle ? 4500 : 9000

    if (income <= maxIncome) {
      const tier = tiers.find(t => income <= t.maxIncome)
      if (tier) {
        ehg = tier.amount
        breakdown.push({
          type: 'Enhanced CPF Housing Grant (EHG)',
          amount: ehg,
          conditions: [`Income ≤ $${tier.maxIncome}`, 'First-timer household']
        })
      }
    }
  }

  // Family Grant / Singles Grant (resale only, first-timers)
  if (property.type === 'hdb_resale' && allFirstTimers) {
    if (isSingle && hasSC) {
      singlesGrant = isSmallFlat ? SINGLES_GRANT['4room_or_smaller'] : SINGLES_GRANT['5room_or_larger']
      breakdown.push({
        type: 'Singles Grant',
        amount: singlesGrant,
        conditions: ['Single SC applicant', 'First-timer', `${isSmallFlat ? '4-room or smaller' : '5-room or larger'}`]
      })
    } else if (!isSingle && hasSC) {
      const key = isSmallFlat
        ? (allSC ? '4room_or_smaller_sc_sc' : '4room_or_smaller_sc_pr')
        : (allSC ? '5room_or_larger_sc_sc' : '5room_or_larger_sc_pr')
      familyGrant = FAMILY_GRANT[key]
      breakdown.push({
        type: 'Family Grant',
        amount: familyGrant,
        conditions: [
          allSC ? 'SC + SC household' : 'SC + PR household',
          'First-timer',
          `${isSmallFlat ? '4-room or smaller' : '5-room or larger'}`
        ]
      })
    }
  }

  // PHG (resale only, can be first or second timer)
  if (property.type === 'hdb_resale') {
    if (profile.livingWithParents) {
      phg = isSingle ? PHG.single_living_with : PHG.family_living_with
      breakdown.push({
        type: 'Proximity Housing Grant (PHG)',
        amount: phg,
        conditions: ['Living with parents/children']
      })
    } else if (profile.nearParents) {
      phg = isSingle ? PHG.single_nearby : PHG.family_nearby
      breakdown.push({
        type: 'Proximity Housing Grant (PHG)',
        amount: phg,
        conditions: ['Within 4km of parents/children']
      })
    }
  }

  const total = ehg + familyGrant + singlesGrant + phg + ecGrant + stepUpGrant

  return {
    ehg,
    familyGrant,
    singlesGrant,
    phg,
    ecGrant,
    stepUpGrant,
    total,
    breakdown
  }
}
```

### 6.3 Stamp Duty Calculator

```typescript
// lib/propertyCalculators/stampDuties.ts

// BSD Tiers (2025)
const BSD_TIERS = [
  { threshold: 180000, rate: 0.01 },
  { threshold: 360000, rate: 0.02 },   // next $180k
  { threshold: 1000000, rate: 0.03 },  // next $640k
  { threshold: 1500000, rate: 0.04 },  // next $500k
  { threshold: 3000000, rate: 0.05 },  // next $1.5m
  { threshold: Infinity, rate: 0.06 }, // above $3m
]

// ABSD Rates (April 2023+)
const ABSD_RATES = {
  SC: { first: 0, second: 0.20, third: 0.30 },
  PR: { first: 0.05, second: 0.30, third: 0.35 },
  foreigner: { any: 0.60 },
}

// SSD Rates (July 2025+)
const SSD_TIERS = [
  { years: 1, rate: 0.16 },
  { years: 2, rate: 0.12 },
  { years: 3, rate: 0.08 },
  { years: 4, rate: 0.04 },
]

export function calculateBSD(price: number): { total: number; breakdown: StampDutyBreakdown[] } {
  const breakdown: StampDutyBreakdown[] = []
  let total = 0
  let remaining = price
  let prevThreshold = 0

  for (const tier of BSD_TIERS) {
    const bracketSize = tier.threshold - prevThreshold
    const taxableInBracket = Math.min(remaining, bracketSize)

    if (taxableInBracket > 0) {
      const amount = taxableInBracket * tier.rate
      total += amount
      breakdown.push({
        bracket: `$${prevThreshold.toLocaleString()} - $${tier.threshold === Infinity ? '∞' : tier.threshold.toLocaleString()} @ ${tier.rate * 100}%`,
        amount
      })
      remaining -= taxableInBracket
    }

    prevThreshold = tier.threshold
    if (remaining <= 0) break
  }

  return { total, breakdown }
}

export function calculateABSD(
  price: number,
  profile: BuyerProfile
): number {
  // Count existing properties (not sold)
  const ownedCount = profile.currentProperties.filter(p => !p.dateSold).length
  const propertyNumber = ownedCount + 1

  // Get the "worst" citizenship status (foreigner > PR > SC)
  const citizenships = profile.applicants.map(a => a.citizenship)

  if (citizenships.includes('foreigner')) {
    return price * ABSD_RATES.foreigner.any
  }

  const hasPR = citizenships.includes('PR')
  const hasSC = citizenships.includes('SC')

  // For mixed SC/PR, use SC rates (more favorable)
  const rates = hasSC ? ABSD_RATES.SC : ABSD_RATES.PR

  if (propertyNumber === 1) return price * rates.first
  if (propertyNumber === 2) return price * rates.second
  return price * rates.third
}

export function calculateStampDuties(
  profile: BuyerProfile,
  property: PropertySpecs
): StampDutiesResult {
  const { total: bsd, breakdown: bsdBreakdown } = calculateBSD(property.price)
  const absd = calculateABSD(property.price, profile)
  const ssd = 0 // Only applies when selling

  const propertyCount = profile.currentProperties.filter(p => !p.dateSold).length + 1

  return {
    bsd,
    absd,
    ssd,
    total: bsd + absd + ssd,
    bsdBreakdown,
    propertyCount
  }
}
```

### 6.4 Loan Comparison Calculator

```typescript
// lib/propertyCalculators/loanComparison.ts

const HDB_LOAN_RULES = {
  maxLtv: 0.75,
  interestRate: 0.026, // 2.6%
  maxTenure: 25,
  msr: 0.30,
  incomeCeiling: 14000,
  singlesIncomeCeiling: 7000,
}

const BANK_LOAN_RULES = {
  firstHome: { maxLtv: 0.75, minCashDown: 0.05 },
  secondHome: { maxLtv: 0.45, minCashDown: 0.25 },
  thirdHome: { maxLtv: 0.35, minCashDown: 0.25 },
  msr: 0.30, // for HDB/EC only
  tdsr: 0.55,
  stressTestRate: 0.04, // 4%
}

export function compareLoanOptions(
  profile: BuyerProfile,
  property: PropertySpecs,
  desiredLoan: number,
  desiredTenure: number,
  bankRate: number = 0.035 // default 3.5%
): LoanComparisonResult {
  const income = profile.householdIncome
  const existingDebt = profile.existingDebts
  const isSingle = profile.applicants.length === 1
  const propertyCount = profile.currentProperties.filter(p => !p.dateSold).length + 1

  // HDB Loan eligibility
  let hdbOption: LoanOption | null = null
  const hdbIncomeCeiling = isSingle ? HDB_LOAN_RULES.singlesIncomeCeiling : HDB_LOAN_RULES.incomeCeiling
  const isHDBEligible =
    (property.type === 'hdb_bto' || property.type === 'hdb_resale') &&
    income <= hdbIncomeCeiling &&
    profile.applicants.some(a => a.citizenship === 'SC')

  if (isHDBEligible) {
    const maxLoan = property.price * HDB_LOAN_RULES.maxLtv
    const loanAmount = Math.min(desiredLoan, maxLoan)
    const monthlyPayment = calculateMonthlyPayment(loanAmount, HDB_LOAN_RULES.interestRate, desiredTenure)
    const msrRatio = monthlyPayment / income

    hdbOption = {
      type: 'hdb_loan',
      maxLtv: HDB_LOAN_RULES.maxLtv,
      maxLoan,
      minCashDown: 0, // HDB loan allows full CPF for downpayment
      monthlyPayment,
      totalInterest: (monthlyPayment * desiredTenure * 12) - loanAmount,
      passesMsr: msrRatio <= HDB_LOAN_RULES.msr,
      passesTdsr: true, // TDSR not applicable for HDB loan
      msrRatio,
      tdsrRatio: 0,
    }
  }

  // Bank Loan
  const bankRules = propertyCount === 1
    ? BANK_LOAN_RULES.firstHome
    : propertyCount === 2
      ? BANK_LOAN_RULES.secondHome
      : BANK_LOAN_RULES.thirdHome

  const bankMaxLoan = property.price * bankRules.maxLtv
  const bankLoanAmount = Math.min(desiredLoan, bankMaxLoan)
  const bankMonthlyPayment = calculateMonthlyPayment(bankLoanAmount, bankRate, desiredTenure)

  // Use stress test rate for TDSR calculation
  const stressTestPayment = calculateMonthlyPayment(bankLoanAmount, BANK_LOAN_RULES.stressTestRate, desiredTenure)
  const msrRatio = bankMonthlyPayment / income
  const tdsrRatio = (stressTestPayment + existingDebt) / income

  // MSR only applies to HDB/EC purchases
  const msrApplies = property.type === 'hdb_bto' || property.type === 'hdb_resale' || property.type === 'ec'

  const bankOption: LoanOption = {
    type: 'bank_loan',
    maxLtv: bankRules.maxLtv,
    maxLoan: bankMaxLoan,
    minCashDown: property.price * bankRules.minCashDown,
    monthlyPayment: bankMonthlyPayment,
    totalInterest: (bankMonthlyPayment * desiredTenure * 12) - bankLoanAmount,
    passesMsr: !msrApplies || msrRatio <= BANK_LOAN_RULES.msr,
    passesTdsr: tdsrRatio <= BANK_LOAN_RULES.tdsr,
    msrRatio: msrApplies ? msrRatio : 0,
    tdsrRatio,
  }

  // Recommendation
  let recommendation: 'hdb' | 'bank' = 'bank'
  const reasons: string[] = []

  if (hdbOption && hdbOption.passesMsr) {
    if (hdbOption.monthlyPayment < bankOption.monthlyPayment) {
      recommendation = 'hdb'
      reasons.push('HDB loan has lower monthly payment')
    }
    if (HDB_LOAN_RULES.interestRate < bankRate) {
      recommendation = 'hdb'
      reasons.push(`HDB loan rate (${HDB_LOAN_RULES.interestRate * 100}%) lower than bank rate (${bankRate * 100}%)`)
    }
    reasons.push('HDB loan allows 100% CPF for downpayment')
  } else if (!hdbOption) {
    reasons.push('Not eligible for HDB loan')
  }

  return {
    hdb: hdbOption,
    bank: bankOption,
    recommendation,
    reasons
  }
}

function calculateMonthlyPayment(principal: number, annualRate: number, years: number): number {
  const monthlyRate = annualRate / 12
  const numPayments = years * 12

  if (monthlyRate === 0) return principal / numPayments

  return principal * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) /
         (Math.pow(1 + monthlyRate, numPayments) - 1)
}
```

### 6.5 Timeline Generator

```typescript
// lib/propertyCalculators/timeline.ts

export function generatePaymentTimeline(
  property: PropertySpecs,
  financing: FinancingOptions,
  grants: GrantsResult,
  duties: StampDutiesResult,
  purchaseDate: string
): TimelineResult {
  const milestones: PaymentMilestone[] = []
  let totalCashNeeded = 0
  let totalCpfNeeded = 0

  const startDate = new Date(purchaseDate)

  switch (property.type) {
    case 'hdb_bto':
      // BTO Timeline
      milestones.push({
        phase: 'Booking',
        description: 'Option fee at flat selection',
        date: formatDate(startDate),
        amount: getOptionFee(property.flatSize),
        paymentType: 'cash'
      })
      totalCashNeeded += getOptionFee(property.flatSize)

      // Signing Agreement (9 months later)
      const signingDate = addMonths(startDate, 9)
      const downPaymentAtSigning = financing.loanType === 'hdb_loan'
        ? property.price * 0.10  // 10% for HDB loan
        : property.price * 0.20  // 20% for bank loan

      milestones.push({
        phase: 'Agreement Signing',
        description: 'Downpayment at lease signing',
        date: formatDate(signingDate),
        amount: downPaymentAtSigning - getOptionFee(property.flatSize),
        paymentType: 'cpf'
      })
      totalCpfNeeded += downPaymentAtSigning - getOptionFee(property.flatSize)

      // Stamp duty
      milestones.push({
        phase: 'Stamp Duty',
        description: 'BSD + ABSD payment',
        date: formatDate(addDays(signingDate, 14)),
        amount: duties.total,
        paymentType: 'stamp_duty'
      })
      totalCashNeeded += duties.total

      // Key collection (3-5 years later, assume 4 years)
      const keyCollectionDate = addMonths(startDate, 48)
      const remainingDownPayment = financing.downPayment - downPaymentAtSigning

      milestones.push({
        phase: 'Key Collection',
        description: 'Remaining downpayment + legal fees',
        date: formatDate(keyCollectionDate),
        amount: remainingDownPayment + 3000, // estimate legal fees
        paymentType: 'cpf'
      })
      totalCpfNeeded += remainingDownPayment
      totalCashNeeded += 3000
      break

    case 'hdb_resale':
      // Resale HDB Timeline
      milestones.push({
        phase: 'Option Fee',
        description: 'Option to Purchase',
        date: formatDate(startDate),
        amount: 1000,
        paymentType: 'cash'
      })
      totalCashNeeded += 1000

      milestones.push({
        phase: 'Exercise Option',
        description: 'Exercise deposit (within 21 days)',
        date: formatDate(addDays(startDate, 21)),
        amount: 4000,
        paymentType: 'cash'
      })
      totalCashNeeded += 4000

      // Stamp duty
      milestones.push({
        phase: 'Stamp Duty',
        description: 'BSD + ABSD payment',
        date: formatDate(addDays(startDate, 35)),
        amount: duties.total,
        paymentType: 'stamp_duty'
      })
      totalCashNeeded += duties.total

      // Completion (8-12 weeks)
      const completionDate = addMonths(startDate, 2)
      const netDownPayment = financing.downPayment - grants.total - 5000

      milestones.push({
        phase: 'Completion',
        description: 'Remaining downpayment (after grants)',
        date: formatDate(completionDate),
        amount: Math.max(0, netDownPayment),
        paymentType: 'cpf'
      })
      totalCpfNeeded += Math.max(0, netDownPayment)
      break

    case 'private_new':
      // Private New Launch Timeline
      milestones.push({
        phase: 'Booking',
        description: '5% booking fee',
        date: formatDate(startDate),
        amount: property.price * 0.05,
        paymentType: 'cash'
      })
      totalCashNeeded += property.price * 0.05

      // S&P Agreement (2-3 weeks)
      milestones.push({
        phase: 'S&P Agreement',
        description: '15% downpayment + stamp duty',
        date: formatDate(addDays(startDate, 21)),
        amount: property.price * 0.15 + duties.total,
        paymentType: 'cash'
      })
      totalCashNeeded += property.price * 0.15 + duties.total

      // Progressive payments (simplified)
      const progressivePayments = [
        { phase: 'Foundation', pct: 0.10, months: 6 },
        { phase: 'Structure', pct: 0.10, months: 12 },
        { phase: 'Walls', pct: 0.05, months: 18 },
        { phase: 'Windows', pct: 0.05, months: 24 },
        { phase: 'TOP', pct: 0.05, months: 30 },
        { phase: 'Completion', pct: 0.25, months: 36 },
      ]

      for (const payment of progressivePayments) {
        milestones.push({
          phase: payment.phase,
          description: `${payment.pct * 100}% progressive payment`,
          date: formatDate(addMonths(startDate, payment.months)),
          amount: property.price * payment.pct,
          paymentType: 'loan'
        })
      }
      break

    case 'private_resale':
      // Private Resale Timeline
      milestones.push({
        phase: 'Option Fee',
        description: '1% option fee',
        date: formatDate(startDate),
        amount: property.price * 0.01,
        paymentType: 'cash'
      })
      totalCashNeeded += property.price * 0.01

      milestones.push({
        phase: 'Exercise Option',
        description: '4% exercise deposit',
        date: formatDate(addDays(startDate, 14)),
        amount: property.price * 0.04,
        paymentType: 'cash'
      })
      totalCashNeeded += property.price * 0.04

      milestones.push({
        phase: 'Stamp Duty',
        description: 'BSD + ABSD payment',
        date: formatDate(addDays(startDate, 28)),
        amount: duties.total,
        paymentType: 'stamp_duty'
      })
      totalCashNeeded += duties.total

      // Completion (8-12 weeks)
      milestones.push({
        phase: 'Completion',
        description: 'Balance payment via loan + CPF',
        date: formatDate(addMonths(startDate, 3)),
        amount: financing.downPayment - property.price * 0.05,
        paymentType: 'cpf'
      })
      totalCpfNeeded += financing.downPayment - property.price * 0.05
      break
  }

  return {
    milestones,
    totalCashNeeded,
    totalCpfNeeded
  }
}

function getOptionFee(flatSize: FlatSize): number {
  switch (flatSize) {
    case '2room': return 500
    case '3room':
    case '4room': return 1000
    default: return 2000
  }
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

function addMonths(date: Date, months: number): Date {
  const result = new Date(date)
  result.setMonth(result.getMonth() + months)
  return result
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0]
}
```

---

## 7. Backend Structure (Phase 2+)

```
backend/internal/financial_v2/property/
├── service.go              # PropertyPurchaseService
├── repository.go           # CRUD for property_purchase_plans
├── types.go                # Go structs matching frontend types
└── confirm.go              # ConfirmPurchase creates entities

backend/cmd/server/handlers/
└── property_purchase.go    # HTTP handlers
```

### API Endpoints

```
POST   /api/v2/property-purchase/plans           # Save draft plan
GET    /api/v2/property-purchase/plans           # List user's plans
GET    /api/v2/property-purchase/plans/{id}      # Get plan by ID
PUT    /api/v2/property-purchase/plans/{id}      # Update plan
DELETE /api/v2/property-purchase/plans/{id}      # Delete plan
POST   /api/v2/property-purchase/plans/{id}/confirm  # Confirm (creates entities)
```

---

## 8. Implementation Checklist

### Phase 1: MVP Wizard
- [ ] Database migration (`property_purchase_plans`)
- [ ] Frontend types (`types/propertyPurchase.ts`)
- [ ] Calculator: Eligibility (`lib/propertyCalculators/eligibility.ts`)
- [ ] Calculator: Grants (`lib/propertyCalculators/grants.ts`)
- [ ] Calculator: Stamp Duties (`lib/propertyCalculators/stampDuties.ts`)
- [ ] Calculator: Loan Comparison (`lib/propertyCalculators/loanComparison.ts`)
- [ ] Calculator: Timeline (`lib/propertyCalculators/timeline.ts`)
- [ ] Wizard UI: PropertyPurchaseWizard
- [ ] Wizard Step: BuyerProfileStep
- [ ] Wizard Step: PropertyDetailsStep
- [ ] Wizard Step: EligibilityStep
- [ ] Wizard Step: GrantsStep
- [ ] Wizard Step: LoanComparisonStep
- [ ] Wizard Step: StampDutiesStep
- [ ] Wizard Step: TimelineStep
- [ ] API client for draft persistence
- [ ] Calculator unit tests

### Phase 2: Data Integration
- [ ] Backend repository for property_purchase_plans
- [ ] API handlers for CRUD
- [ ] ConfirmPurchase service
- [ ] Auto-create Asset on confirm
- [ ] Auto-create Liability on confirm
- [ ] Auto-create PropertyLink on confirm
- [ ] CPF account versioned update (oa_used_for_housing)
- [ ] Generate scenario events

### Phase 3: Scheme Versioning
- [ ] Backend calculator rules table
- [ ] API to fetch rules by scheme year
- [ ] Frontend scheme year selector
- [ ] 2023 calculator rules
- [ ] 2024 calculator rules
- [ ] 2025 calculator rules (already done in Phase 1)

---

## 9. Reference Documents

- `/Users/jitcorn/assetra3/specs/property/property-purchase-research.md` - Comprehensive Singapore property rules
- `/Users/jitcorn/assetra3/specs/property/property-linking.md` - Entity linking spec
- `/Users/jitcorn/assetra3/backend/internal/cpf/config/loader.go` - Pattern for versioned configs
- `/Users/jitcorn/assetra3/frontend/src/components/modals/PropertyPlannerModal.tsx` - Existing mortgage UI

---

## 10. Open Questions (for future sessions)

1. Should we support multiple applicants editing their own details (multi-user)?
2. How to handle EC (Executive Condo) specific rules?
3. Should we track CPF accrued interest over time?
4. Integration with timeline projection system?
5. Print/export functionality for the plan?
