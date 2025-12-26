# Property Planner Gap Analysis: HDB Purchase Full Lifecycle

**Date**: 2025-12-23
**Status**: Analysis Complete
**Current Form**: `frontend/src/app/property-planner/page.tsx`

---

## Executive Summary

The current property planner form captures approximately **60-70%** of HDB purchase costs but is missing critical components including stamp duties, transaction fees, CPF limits, and the entire **selling process**. This document details all gaps across the complete property lifecycle.

---

## 1. PURCHASE PHASE: Current vs Required

### 1.1 What's Currently Captured ✅

| Component | Field/Calculation | Notes |
|-----------|-------------------|-------|
| Property Price | `propertyPrice` | ✅ |
| Valuation | `valuationPrice` | ✅ For resale COV |
| Cash Over Valuation | Calculated | ✅ `propertyPrice - valuationPrice` |
| Loan Amount | `loanAmount` | ✅ |
| Loan Type | `loanType` (HDB/Bank) | ✅ Toggle |
| Downpayment CPF | `downpaymentCpfOa` | ✅ |
| Downpayment Cash | `downpaymentCash` | ✅ |
| Grants (Total) | `grants` | ⚠️ Single amount, no breakdown |
| Interest Rate | `fixedRate`, `floatingRate` | ✅ |
| Loan Tenure | `loanTermYears` | ✅ |
| MSR Ratio | Calculated | ✅ |
| TDSR Ratio | Calculated | ✅ |
| Monthly Payment | Calculated | ✅ |
| Total Interest | Calculated | ✅ |
| Amortization Schedule | Calculated | ✅ |

---

### 1.2 Missing: Buyer Profile & Eligibility ❌

| Gap | Description | Impact |
|-----|-------------|--------|
| **Citizenship Status** | No input for SC/PR/Foreigner | Affects ABSD (0% vs 5% vs 60%), grants eligibility, HDB loan eligibility |
| **First-Timer Status** | Not tracked | Affects all grants (EHG, FHG, PHG) |
| **Age** | Not captured | Affects singles scheme (35+), CPF withdrawal limits, loan tenure |
| **Number of Properties Owned** | Not tracked | Affects ABSD tier (1st: 0%, 2nd: 20%, 3rd: 30%) |
| **Existing Property Type** | Not tracked | HDB owners can't buy another HDB without selling |
| **Wait-out Period** | Not calculated | 15-month or 30-month wait after selling private/subsidized |
| **Marital Status** | Not captured | Affects family nucleus scheme, grant amounts |
| **PR Grant Date** | Not tracked | PRs need 3 years before buying HDB |

**Required New Fields:**
```typescript
interface BuyerProfile {
  citizenship: 'SC' | 'PR' | 'foreigner'
  dateOfBirth: string
  isFirstTimer: boolean
  maritalStatus: 'single' | 'married' | 'engaged' | 'divorced' | 'widowed'
  prGrantDate?: string  // For PR year calculation

  // For co-buyer (joint application)
  coBuyer?: {
    citizenship: 'SC' | 'PR' | 'foreigner'
    dateOfBirth: string
    isFirstTimer: boolean
  }

  // Property ownership
  existingProperties: {
    type: 'hdb' | 'condo' | 'landed' | 'ec'
    dateAcquired: string
    dateSold?: string
    isSubsidized: boolean
  }[]
}
```

---

### 1.3 Missing: Stamp Duties ❌

#### Buyer's Stamp Duty (BSD)
| Price Bracket | Rate | Example on $600K |
|---------------|------|------------------|
| First $180,000 | 1% | $1,800 |
| Next $180,000 | 2% | $3,600 |
| Next $640,000 | 3% | $7,200 |
| Next $500,000 | 4% | - |
| Next $1,500,000 | 5% | - |
| Above $3,000,000 | 6% | - |
| **Total BSD on $600K** | | **$12,600** |

#### Additional Buyer's Stamp Duty (ABSD)
| Buyer Profile | 1st Property | 2nd Property | 3rd+ Property |
|---------------|--------------|--------------|---------------|
| Singapore Citizen | 0% | 20% | 30% |
| Permanent Resident | 5% | 30% | 35% |
| Foreigner | 60% | 60% | 60% |
| Entity/Trust | 65% | 65% | 65% |

**Example Impact:**
- SC buying 1st HDB: BSD only = **$12,600** on $600K
- PR buying 1st HDB: BSD + ABSD = $12,600 + **$30,000** = **$42,600**
- SC buying 2nd property ($1M): BSD + ABSD = $24,600 + **$200,000** = **$224,600**

**Required Calculation:**
```typescript
interface StampDutyResult {
  bsd: number
  bsdBreakdown: { bracket: string; amount: number }[]
  absd: number
  absdRate: number
  propertyCount: number
  total: number
}

function calculateBSD(purchasePrice: number): number
function calculateABSD(purchasePrice: number, citizenship: string, propertyCount: number): number
```

---

### 1.4 Missing: Transaction Fees ❌

| Fee | Amount | When Paid | Payment Type |
|-----|--------|-----------|--------------|
| **Option Fee** | $1,000 (HDB resale) | At OTP signing | Cash only |
| **Exercise Fee** | $4,000 (HDB resale) | Within 21 days | Cash only |
| **Total Option + Exercise** | **$5,000** | Before completion | Cash only |
| **Legal/Conveyancing Fees** | $1,500 - $3,500 | At completion | Cash/CPF |
| **Valuation Fee** | $120 - $500 | Before completion | Cash |
| **Caveat Registration** | ~$65 | At completion | Cash |
| **Mortgage Stamp Duty** | 0.4% of loan (max $500) | At completion | Cash |
| **Agent Commission (Buyer)** | 1% of price (optional) | At completion | Cash |
| **Fire Insurance** | ~$100-300/year | Required for HDB loan | Cash |
| **HDB Admin Fee** | ~$80 | At completion | Cash |

**Total Additional Fees (Typical HDB Resale):**
- Minimum: ~$7,000 (option + exercise + legal + valuation)
- With agent: ~$13,000 (add 1% commission on $600K)

**Required Fields:**
```typescript
interface TransactionFees {
  optionFee: number           // $1,000 for HDB resale
  exerciseFee: number         // $4,000 for HDB resale
  legalFees: number           // $1,500 - $3,500
  valuationFee: number        // $120 - $500
  caveatFee: number           // ~$65
  mortgageStampDuty: number   // 0.4% of loan, max $500
  agentCommission?: number    // Optional, ~1% of price
  hdbAdminFee: number         // ~$80
  fireInsurance: number       // ~$100-300/year
}
```

---

### 1.5 Missing: Grant Breakdown ❌

Current form has single `grants` field. Should break down into:

| Grant Type | Max Amount (Family) | Max Amount (Single) | Eligibility |
|------------|---------------------|---------------------|-------------|
| **Enhanced Housing Grant (EHG)** | $120,000 | $60,000 | First-timer, income ≤ $9,000 (family) / $4,500 (single) |
| **Family Grant** | $80,000 (4-room or smaller) / $50,000 (5-room+) | N/A | First-timer, resale only |
| **Singles Grant** | N/A | $40,000 (4-room or smaller) / $25,000 (5-room+) | First-timer, resale only, 35+ |
| **Proximity Housing Grant (PHG)** | $30,000 (with parents) / $20,000 (near) | $15,000 / $10,000 | Near parents, resale only |
| **Step-Up Grant** | $15,000 | N/A | 2-room → 3-room upgrader |

**EHG Income Tiers (2025):**
| Household Income | Family Amount | Single Amount |
|------------------|---------------|---------------|
| ≤ $1,500 | $120,000 | $60,000 |
| $1,501 - $2,000 | $95,000 | $47,500 |
| $2,001 - $2,500 | $85,000 | $42,500 |
| $2,501 - $3,000 | $75,000 | $37,500 |
| $3,001 - $3,500 | $65,000 | $32,500 |
| $3,501 - $4,000 | $55,000 | $27,500 |
| $4,001 - $4,500 | $45,000 | $22,500 |
| $4,501 - $5,000 | $40,000 | - |
| $5,001 - $9,000 | $5,000 - $35,000 | - |
| > $9,000 / $4,500 | $0 | $0 |

**Required Structure:**
```typescript
interface GrantsBreakdown {
  ehg: {
    eligible: boolean
    amount: number
    incomeTier: string
  }
  familyGrant: {
    eligible: boolean
    amount: number
    buyerType: 'sc_sc' | 'sc_pr' | 'single'
  }
  singlesGrant: {
    eligible: boolean
    amount: number
  }
  phg: {
    eligible: boolean
    amount: number
    proximity: 'living_with' | 'within_4km' | 'none'
  }
  stepUpGrant: {
    eligible: boolean
    amount: number
  }
  total: number
}
```

---

### 1.6 Missing: CPF Withdrawal Limits ❌

| Scenario | Valuation Limit (VL) | Withdrawal Limit (WL) |
|----------|----------------------|-----------------------|
| HDB BTO + HDB Loan | None | None (unlimited) |
| HDB Resale + HDB Loan | VL = min(Price, Valuation) | None |
| HDB + Bank Loan | VL = min(Price, Valuation) | 120% of VL |
| Private + Bank Loan | VL = min(Price, Valuation) | 120% of VL |

**Important Rules:**
1. **120% WL** only available if met Basic Retirement Sum (BRS) in CPF
2. **BRS 2025**: ~$106,500 (must be in SA/RA before using 120%)
3. After hitting WL, must pay **cash** for remaining payments
4. **Accrued Interest**: 2.5% p.a. compound on CPF used, must refund on sale

**Required Calculation:**
```typescript
interface CPFWithdrawalLimits {
  valuationLimit: number
  withdrawalLimit: number       // 120% of VL if BRS met, else 100%
  hasNoLimit: boolean           // true for HDB BTO + HDB Loan
  brsAmount: number             // Current year BRS
  hasBrsBeenMet: boolean
  currentCumulativeUsed: number
  remainingAllowance: number
  estimatedExhaustionMonth: number  // Month # when WL is hit
}
```

---

### 1.7 Missing: CPF Accrued Interest ❌

When CPF is used for property, 2.5% p.a. compound interest accrues. This must be refunded to CPF when property is sold (before age 55).

**Formula:**
```
Accrued Interest = Principal × [(1 + 0.025)^years - 1]
```

**Example:**
- CPF used: $150,000
- Years held: 25
- Accrued Interest: $150,000 × [(1.025)^25 - 1] = **$127,340**
- Total to refund: $150,000 + $127,340 = **$277,340**

**Required Calculation:**
```typescript
interface CPFAccruedInterest {
  principalUsed: number          // Total CPF OA used
  yearsHeld: number
  accruedInterest: number
  totalToRefund: number          // Principal + Interest
  projectionByYear: {
    year: number
    accruedInterest: number
    cumulativeTotal: number
  }[]
}
```

---

### 1.8 Missing: Payment Timeline Milestones ❌

**HDB Resale Timeline:**
| Milestone | Timing | Amount | Payment Type |
|-----------|--------|--------|--------------|
| Option Fee | Day 0 | $1,000 | Cash |
| Exercise OTP | Within 21 days | $4,000 | Cash |
| Stamp Duty (BSD + ABSD) | Within 14 days of exercise | Varies | Cash |
| Completion | 8-12 weeks from exercise | Balance | CPF + Cash |
| First Mortgage Payment | Month after completion | Monthly | CPF/Cash |

**HDB BTO Timeline:**
| Milestone | Timing | Amount | Payment Type |
|-----------|--------|--------|--------------|
| Booking Fee | At ballot | $500 - $2,000 | Cash |
| Signing Agreement | ~9 months | 10% (HDB) / 20% (Bank) | CPF + Cash |
| Stamp Duty | 14 days after signing | Varies | Cash |
| Key Collection | 3-5 years | Balance | CPF + Cash |
| First Mortgage Payment | Month after key | Monthly | CPF/Cash |

**Required Structure:**
```typescript
interface PaymentMilestone {
  name: string
  date: string
  description: string
  amount: number
  paymentType: 'cash' | 'cpf' | 'cpf_or_cash' | 'stamp_duty'
  isCompleted: boolean
}

interface PurchaseTimeline {
  milestones: PaymentMilestone[]
  totalCashRequired: number
  totalCpfRequired: number
  stampDutyTotal: number
}
```

---

## 2. OWNERSHIP PHASE: Missing Components ❌

### 2.1 Ongoing Costs Not Tracked

| Cost | Frequency | Typical Amount | Notes |
|------|-----------|----------------|-------|
| **Conservancy Charges** | Monthly | $20 - $90 | Based on flat type |
| **Property Tax** | Annual | $100 - $500 (HDB) | Owner-occupier rates lower |
| **Fire Insurance** | Annual | $100 - $300 | Required for HDB loan |
| **Town Council S&CC** | Monthly | Included in conservancy | Service & Conservancy Charges |
| **Mortgage Payment** | Monthly | Calculated | ✅ Already tracked |

### 2.2 CPF Monthly Payment Tracking

Need to track:
- Monthly CPF OA contribution inflow
- Monthly mortgage payment outflow from CPF
- When CPF OA will be exhausted
- When to switch to cash payments
- Cumulative CPF used (for accrued interest calculation)

```typescript
interface MonthlyPaymentProjection {
  month: string
  paymentNumber: number
  totalPayment: number
  principal: number
  interest: number
  cpfUsed: number
  cashUsed: number
  cpfOaBalanceAfter: number
  loanBalanceAfter: number
  cumulativeCpfUsed: number
  isWithdrawalLimitHit: boolean
  accruedInterestToDate: number
}
```

---

## 3. SELLING PHASE: Completely Missing ❌

### 3.1 Seller's Stamp Duty (SSD)

Applies if selling within 4 years of purchase (as of July 2025):

| Holding Period | SSD Rate |
|----------------|----------|
| Within 1 year | 16% |
| 1 - 2 years | 12% |
| 2 - 3 years | 8% |
| 3 - 4 years | 4% |
| After 4 years | 0% |

**Example:** Sell $600K property after 1.5 years = **$72,000** SSD

### 3.2 Sale Proceeds Calculation

```typescript
interface SaleProceeds {
  salePrice: number

  // Deductions
  outstandingLoan: number
  cpfRefund: {
    principal: number
    accruedInterest: number
    total: number
  }
  ssd: number
  agentCommission: number    // Typically 2% for seller
  legalFees: number          // ~$2,500 - $4,000
  dischargeFees: number      // ~$500 for mortgage discharge

  // Net Proceeds
  grossProceeds: number      // Sale price - loan
  netCashProceeds: number    // After all deductions
}
```

### 3.3 CPF Refund Rules

When selling property (before age 55):
1. **Must refund**: Principal used + Accrued Interest (2.5% p.a.)
2. Refund goes to **CPF OA** (not cash)
3. If sale proceeds insufficient, refund what's available
4. Remaining CPF debt is waived

**Example:**
| Item | Amount |
|------|--------|
| Sale Price | $700,000 |
| Outstanding Loan | ($250,000) |
| CPF Principal Used | ($150,000) |
| CPF Accrued Interest (20 yrs) | ($93,000) |
| Agent Commission (2%) | ($14,000) |
| Legal Fees | ($3,000) |
| **Net Cash Proceeds** | **$190,000** |

### 3.4 Minimum Occupation Period (MOP)

| Property Type | MOP | Notes |
|---------------|-----|-------|
| HDB BTO (Standard) | 5 years | From key collection |
| HDB BTO (Prime/Plus) | 10 years | New classification from 2024 |
| HDB Resale | 5 years | From completion |
| EC | 5 years | Then can sell to locals; 10 years for foreigners |
| Private | None | But SSD applies within 4 years |

### 3.5 Sale Fees

| Fee | Amount | Notes |
|-----|--------|-------|
| **Agent Commission (Seller)** | 2% of sale price | Typical, negotiable |
| **Legal/Conveyancing** | $2,500 - $4,000 | |
| **Mortgage Discharge** | ~$500 | Bank admin fee |
| **HDB Resale Admin** | ~$80 | |
| **SSD** | 0% - 16% | If within 4 years |

---

## 4. UPGRADE PATH: Not Modeled ❌

### 4.1 Selling HDB → Buying Private

Key considerations not captured:
1. **ABSD**: 20% on 2nd property (if not selling first)
2. **Wait-out**: 30 months if selling subsidized HDB before buying
3. **LTV**: Only 45% for 2nd property loan
4. **Cash**: 25% minimum cash down for 2nd property
5. **CPF**: Must set aside BRS before using CPF for 2nd property

### 4.2 Decoupling Scenarios

For couples wanting to buy 2nd property:
1. Remove one spouse from existing property
2. New spouse can buy as "first-timer" (0% ABSD for SC)
3. Complex legal and financial implications

---

## 5. COMPLETE COST SUMMARY: What Form Should Show

### 5.1 Total Purchase Cost Breakdown

```
┌─────────────────────────────────────────────────────────────────┐
│  TOTAL COST OF PURCHASE                                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Property Price                              $600,000            │
│  Cash Over Valuation (COV)                   +$20,000            │
│  ─────────────────────────────────────────────────────────────  │
│  Total Purchase Price                        $620,000            │
│                                                                  │
│  LESS: Grants                                                    │
│    - Enhanced Housing Grant (EHG)            -$40,000            │
│    - Family Grant                            -$80,000            │
│    - Proximity Housing Grant (PHG)           -$20,000            │
│  ─────────────────────────────────────────────────────────────  │
│  Net Purchase Price                          $480,000            │
│                                                                  │
│  FINANCED BY:                                                    │
│    Loan Amount (75% LTV)                     $360,000            │
│    Downpayment Required (25%)                $120,000            │
│      - From CPF OA                           $85,000             │
│      - From Cash                             $35,000             │
│                                                                  │
│  ADDITIONAL COSTS:                                               │
│  Stamp Duties                                                    │
│    - Buyer's Stamp Duty (BSD)                $12,600             │
│    - Additional BSD (ABSD)                   $0                  │ (SC 1st property)
│  Transaction Fees                                                │
│    - Option Fee                              $1,000              │
│    - Exercise Fee                            $4,000              │
│    - Legal/Conveyancing                      $2,500              │
│    - Valuation Fee                           $200                │
│    - Other Fees                              $500                │
│  ─────────────────────────────────────────────────────────────  │
│  TOTAL ADDITIONAL COSTS                      $20,800             │
│                                                                  │
│  ═══════════════════════════════════════════════════════════════│
│  TOTAL CASH NEEDED AT PURCHASE               $55,800             │
│    (Downpayment cash + COV + Fees + Stamp)                       │
│                                                                  │
│  TOTAL CPF NEEDED AT PURCHASE                $85,000             │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 5.2 Long-Term Cost Projection

```
┌─────────────────────────────────────────────────────────────────┐
│  25-YEAR TOTAL COST OF OWNERSHIP                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Purchase Costs                                                  │
│    Net Purchase Price                        $480,000            │
│    Stamp Duties                              $12,600             │
│    Transaction Fees                          $8,200              │
│                                              ─────────           │
│    Subtotal                                  $500,800            │
│                                                                  │
│  Financing Costs                                                 │
│    Total Interest Paid (25 yrs @ 2.6%)       $127,000            │
│    CPF Accrued Interest (on $250K used)      $127,340            │
│                                              ─────────           │
│    Subtotal                                  $254,340            │
│                                                                  │
│  Ongoing Costs (25 years)                                        │
│    Conservancy Charges                       $18,000             │
│    Property Tax                              $6,000              │
│    Fire Insurance                            $5,000              │
│    Maintenance/Repairs                       $25,000             │
│                                              ─────────           │
│    Subtotal                                  $54,000             │
│                                                                  │
│  ═══════════════════════════════════════════════════════════════│
│  TOTAL COST OF OWNERSHIP (25 years)          $809,140            │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 5.3 Sale Proceeds Calculator

```
┌─────────────────────────────────────────────────────────────────┐
│  SALE PROCEEDS CALCULATOR                    Sale after 25 years │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Estimated Sale Price                        $900,000            │
│                                                                  │
│  DEDUCTIONS:                                                     │
│    Outstanding Loan                          $0                  │
│    CPF Refund Required                                           │
│      - Principal Used                        $250,000            │
│      - Accrued Interest (2.5% × 25 yrs)      $213,000            │
│      - Total to CPF                          -$463,000           │
│    Seller's Stamp Duty (SSD)                 $0                  │ (>4 years)
│    Agent Commission (2%)                     -$18,000            │
│    Legal Fees                                -$3,500             │
│  ─────────────────────────────────────────────────────────────  │
│                                                                  │
│  NET CASH PROCEEDS                           $415,500            │
│  (Amount you receive in bank account)                            │
│                                                                  │
│  CPF REFUNDED TO OA                          $463,000            │
│  (Available for retirement or next property)                     │
│                                                                  │
│  ═══════════════════════════════════════════════════════════════│
│  EFFECTIVE GAIN/LOSS                                             │
│    Sale Price - Original Net Price           $420,000            │
│    Less: Total Interest Paid                 -$127,000           │
│    Less: Transaction Costs (buy + sell)      -$34,100            │
│    Less: Ongoing Costs                       -$54,000            │
│  ─────────────────────────────────────────────────────────────  │
│  NET PROFIT (excluding CPF opportunity cost) $204,900            │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 6. IMPLEMENTATION PRIORITY

### Priority 1: Critical for Accurate Purchase Planning
1. **Stamp Duties (BSD + ABSD)** - Significant cost often forgotten
2. **Transaction Fees** - Option, exercise, legal fees
3. **Grant Breakdown** - EHG, FHG, PHG individual amounts
4. **Buyer Profile** - Citizenship, first-timer status

### Priority 2: Important for Long-Term Planning
5. **CPF Withdrawal Limits** - VL, WL, BRS check
6. **CPF Accrued Interest** - Shows true cost of using CPF
7. **Monthly Payment Projection** - CPF vs cash split over time
8. **Payment Timeline** - Milestones and due dates

### Priority 3: Complete Lifecycle
9. **Sale Calculator** - Proceeds, refunds, SSD
10. **Upgrade Path Modeling** - HDB → Private scenarios
11. **Ownership Costs** - Conservancy, property tax
12. **MOP Tracking** - When can sell

---

## 7. NEW FIELDS SUMMARY

### 7.1 Buyer Profile (New Section)
```typescript
interface BuyerProfileInputs {
  // Primary buyer
  citizenship: 'SC' | 'PR' | 'foreigner'
  dateOfBirth: string
  isFirstTimer: boolean
  maritalStatus: string

  // Co-buyer (optional)
  hasCoBuyer: boolean
  coBuyerCitizenship?: 'SC' | 'PR'
  coBuyerDateOfBirth?: string
  coBuyerIsFirstTimer?: boolean

  // Existing properties
  propertiesOwned: number
  ownsHDB: boolean
  ownsPrivate: boolean
  recentlySoldProperty?: {
    type: string
    dateSold: string
    wasSubsidized: boolean
  }

  // Proximity for PHG
  livingWithParents: boolean
  nearParents: boolean  // within 4km
}
```

### 7.2 Enhanced Cost Breakdown (New Calculations)
```typescript
interface PurchaseCostBreakdown {
  // Stamp Duties
  stampDuties: {
    bsd: number
    bsdBreakdown: { bracket: string; amount: number }[]
    absd: number
    absdRate: number
    total: number
  }

  // Transaction Fees
  transactionFees: {
    optionFee: number
    exerciseFee: number
    legalFees: number
    valuationFee: number
    mortgageStampDuty: number
    agentCommission: number
    otherFees: number
    total: number
  }

  // Grants
  grants: {
    ehg: number
    familyGrant: number
    singlesGrant: number
    phg: number
    stepUpGrant: number
    total: number
    eligibilityDetails: {
      grantType: string
      eligible: boolean
      reason: string
    }[]
  }

  // CPF Limits
  cpfLimits: {
    valuationLimit: number
    withdrawalLimit: number
    hasNoLimit: boolean
    estimatedExhaustionMonth: number
  }

  // Timeline
  timeline: PaymentMilestone[]

  // Summary
  totalCashRequired: number
  totalCpfRequired: number
  grandTotal: number
}
```

### 7.3 Sale Planning (New Section)
```typescript
interface SalePlanningInputs {
  expectedSalePrice: number
  expectedSaleDate: string
  useAgent: boolean

  // Calculated
  holdingPeriodMonths: number
  ssdRate: number
  ssdAmount: number

  cpfRefund: {
    principalUsed: number
    accruedInterest: number
    total: number
  }

  saleFees: {
    agentCommission: number
    legalFees: number
    dischargeFees: number
    total: number
  }

  netCashProceeds: number
  cpfRefundedToOa: number
}
```

---

## 8. RECOMMENDED UI CHANGES

### 8.1 Add New Form Sections

1. **Buyer Profile Section** (before property details)
   - Citizenship dropdown
   - First-timer checkbox
   - Properties owned counter
   - Proximity to parents toggle

2. **Costs Breakdown Panel** (in results)
   - Stamp duties with breakdown
   - Transaction fees itemized
   - Grants breakdown with eligibility

3. **CPF Planning Panel** (in results)
   - Withdrawal limits
   - Monthly projection (when CPF runs out)
   - Accrued interest projection

4. **Sale Planning Tab** (new tab)
   - Sale price input
   - Proceeds calculator
   - SSD warning if applicable

### 8.2 Enhanced Summary Cards

Current summary shows:
- Monthly Payment
- Downpayment
- Total Interest
- Loan End Date

Should also show:
- **Total Upfront Cash** (downpayment + COV + fees + stamps)
- **Total Grants**
- **CPF Exhaustion Date**
- **Accrued Interest at Maturity**
- **True Cost of Ownership**

---

## 9. APPENDIX: Calculation Formulas

### BSD Calculation
```typescript
function calculateBSD(price: number): number {
  let bsd = 0
  const brackets = [
    { limit: 180000, rate: 0.01 },
    { limit: 360000, rate: 0.02 },
    { limit: 1000000, rate: 0.03 },
    { limit: 1500000, rate: 0.04 },
    { limit: 3000000, rate: 0.05 },
    { limit: Infinity, rate: 0.06 },
  ]

  let remaining = price
  let prevLimit = 0

  for (const bracket of brackets) {
    const taxable = Math.min(remaining, bracket.limit - prevLimit)
    bsd += taxable * bracket.rate
    remaining -= taxable
    prevLimit = bracket.limit
    if (remaining <= 0) break
  }

  return bsd
}
```

### CPF Accrued Interest
```typescript
function calculateAccruedInterest(
  principal: number,
  years: number,
  rate: number = 0.025
): number {
  return principal * (Math.pow(1 + rate, years) - 1)
}
```

### MSR/TDSR
```typescript
function calculateMSR(monthlyPayment: number, grossIncome: number): number {
  return monthlyPayment / grossIncome  // Must be ≤ 0.30 for HDB/EC
}

function calculateTDSR(
  monthlyPayment: number,
  otherDebt: number,
  grossIncome: number
): number {
  return (monthlyPayment + otherDebt) / grossIncome  // Must be ≤ 0.55
}
```
