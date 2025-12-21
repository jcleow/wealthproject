# Singapore Personal Finance System: Master Logic Specification

**Version:** 1.0.0
**Last Updated:** December 2024
**Baseline Years:** 2024, 2025
**Status:** Implementation Ready

---

## Table of Contents

1. [Executive Overview](#a-executive-overview)
2. [Source-of-Truth References](#b-source-of-truth-references)
3. [Module 1: CPF Contributions](#c1-cpf-contributions-employment-income)
4. [Module 2: CPF Interest Accrual](#c2-cpf-interest-accrual)
5. [Module 3: MediSave](#c3-medisave)
6. [Module 4: MediShield Life](#c4-medishield-life)
7. [Module 5: Integrated Shield Plans](#c5-integrated-shield-plans)
8. [Module 6: Retirement & CPF LIFE](#c6-retirement--cpf-life)
9. [Module 7: CPF Housing Usage](#c7-cpf-housing-usage) (Enhanced with Property Planner Integration)
10. [Module 8: Supplementary Retirement Scheme](#c8-supplementary-retirement-scheme-srs)
11. [Module 9: CPFIS (Investment Scheme)](#c9-cpfis-cpf-investment-scheme) ✨ NEW
12. [Module 10: Voluntary Top-ups & Tax Relief](#c10-voluntary-top-ups--tax-relief) ✨ NEW
13. [Module 11: SA Shielding Strategy](#c11-sa-shielding-strategy) ✨ NEW
14. [Module 12: CPF Education Scheme](#c12-cpf-education-scheme) ✨ NEW
15. [Flowcharts](#d-flowcharts)
16. [TypeScript Schemas](#e-typescript-schemas)
17. [Worked Examples](#f-worked-examples)
18. [Implementation Notes](#g-implementation-notes)

---

## A. Executive Overview

### System Purpose

This specification defines the deterministic logic for simulating Singapore's comprehensive personal finance ecosystem. The system models the lifecycle of a Singapore resident's mandatory and voluntary savings, healthcare financing, retirement planning, and property ownership from employment through retirement.

### System Interrelationships

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        SINGAPORE PERSONAL FINANCE SYSTEM                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────┐     ┌─────────────────────────────────────────────────┐   │
│  │  EMPLOYMENT  │────▶│                 CPF SYSTEM                       │   │
│  │   Income     │     │  ┌─────────┐  ┌─────────┐  ┌─────────┐          │   │
│  │  (OW + AW)   │     │  │   OA    │  │   SA    │  │   MA    │          │   │
│  └──────────────┘     │  │ 2.5-3.5%│  │  4-5%   │  │  4-5%   │          │   │
│         │             │  └────┬────┘  └────┬────┘  └────┬────┘          │   │
│         │             │       │            │            │                │   │
│         ▼             │       ▼            ▼            ▼                │   │
│  ┌──────────────┐     │  ┌─────────────────────────────────────────┐    │   │
│  │     SRS      │     │  │              At Age 55                   │    │   │
│  │  (Voluntary) │     │  │  SA → RA (up to FRS)                     │    │   │
│  │  Tax Relief  │     │  │  OA → RA (remainder to FRS)              │    │   │
│  └──────────────┘     │  └─────────────────┬───────────────────────┘    │   │
│                       │                     │                            │   │
│                       │                     ▼                            │   │
│  ┌──────────────┐     │            ┌─────────────┐                      │   │
│  │   HOUSING    │◀────│────────────│     RA      │                      │   │
│  │  (OA Usage)  │     │            │   4-6%      │                      │   │
│  │  VL/WL Rules │     │            └──────┬──────┘                      │   │
│  └──────────────┘     │                   │                              │   │
│                       │                   ▼                              │   │
│                       │          ┌─────────────────┐                    │   │
│                       │          │    CPF LIFE     │                    │   │
│                       │          │ (Age 65+ Payout)│                    │   │
│                       │          └─────────────────┘                    │   │
│                       └─────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                        HEALTHCARE FINANCING                           │   │
│  │  ┌─────────────┐    ┌─────────────────┐    ┌────────────────────┐    │   │
│  │  │  MediSave   │───▶│  MediShield Life │───▶│  Integrated Shield │    │   │
│  │  │   (MA)      │    │   (Mandatory)    │    │    (Optional)      │    │   │
│  │  │  BHS Cap    │    │   Premiums       │    │   Additional Cover │    │   │
│  │  └─────────────┘    └─────────────────┘    └────────────────────┘    │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Key Lifecycle Events

| Age | Event | System Impact |
|-----|-------|---------------|
| Employment Start | CPF contributions begin | OA/SA/MA allocations start |
| Property Purchase | OA withdrawals | VL/WL limits apply |
| 55 | RA Creation | SA→RA, OA→RA transfers; withdrawals possible |
| 55 | SA Closure (from 2025) | Contributions to SA redirected to RA |
| 65 | CPF LIFE Eligibility | Monthly payouts can begin |
| 63/64 | SRS Statutory Retirement Age | Penalty-free withdrawals available |

### Data Flow Summary

```
Monthly Employment Income
         │
         ▼
┌─────────────────────┐
│ Wage Classification │
│   OW vs AW          │
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│ Ceiling Application │
│ OW: $7,400 (2025)   │
│ AW: $102K - YTD OW  │
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│ Rate Determination  │
│ By Age Band & PR    │
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│ Account Allocation  │
│ OA / SA / MA        │
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│ Monthly Interest    │
│ Accrual             │
└─────────────────────┘
```

---

## B. Source-of-Truth References

### Official Government Sources

| Domain | Authority | URL | Content |
|--------|-----------|-----|---------|
| CPF Contribution Rates | CPF Board | cpf.gov.sg/employer/employer-obligations | Rates, ceilings, allocation tables |
| CPF Interest Rates | CPF Board | cpf.gov.sg/member/growing-your-savings | Quarterly rate announcements |
| Retirement Sums | CPF Board | cpf.gov.sg/member/retirement-income | BRS/FRS/ERS annual values |
| MediShield Life | MOH | moh.gov.sg/managing-expenses | Premiums, subsidies, benefits |
| MediSave | CPF Board/MOH | cpf.gov.sg/member/healthcare-financing | BHS, withdrawal limits |
| SRS | IRAS/MOF | iras.gov.sg/taxes/individual-income-tax | Contribution caps, tax treatment |
| Housing Rules | CPF Board/HDB | cpf.gov.sg/member/home-ownership | VL/WL, accrued interest |

### Document Version Control

When implementing, always check for the latest versions of:
- CPF Contribution Rate Tables (updated annually, sometimes mid-year)
- Retirement Sum announcements (announced each December for following year)
- BHS announcements (announced each December)
- MediShield Life premium tables (updated periodically)

---

## C1. CPF Contributions (Employment Income)

### 1.1 Wage Definitions

#### Ordinary Wages (OW)

**Definition:** Wages are classified as Ordinary Wages if BOTH conditions are satisfied:

1. The wages are due or granted wholly and exclusively for employment during that calendar month
2. The wages are payable before the 14th of the following month

**Examples of OW:**
- Monthly base salary
- Monthly fixed allowances (transport, meal, phone)
- Overtime pay (if paid monthly)
- Monthly commission (if tied to that month's performance)

#### Additional Wages (AW)

**Definition:** Any wages that do NOT satisfy both OW conditions are classified as Additional Wages.

**Examples of AW:**
- Annual bonus
- Annual Variable Component (AVC)
- Leave encashment
- Commissions paid quarterly/annually
- Director's fees
- Back-pay for prior periods

### 1.2 Wage Ceilings

#### Ordinary Wage Ceiling

| Effective Date | OW Ceiling (Monthly) |
|----------------|---------------------|
| Before 2024-01-01 | $6,300 |
| 2024-01-01 | $6,800 |
| 2025-01-01 | $7,400 |
| 2026-01-01 | $8,000 |

**Rule:** Only the first $OW_CEILING of monthly OW attracts CPF contributions.

```typescript
function getOWCeiling(date: Date): number {
  if (date < new Date('2024-01-01')) return 6300;
  if (date < new Date('2025-01-01')) return 6800;
  if (date < new Date('2026-01-01')) return 7400;
  return 8000;
}

function cappedOW(grossOW: number, date: Date): number {
  return Math.min(grossOW, getOWCeiling(date));
}
```

#### Additional Wage Ceiling

**Formula:**
```
AW_Ceiling = $102,000 - Total_OW_Subject_To_CPF_YTD
```

**Key Points:**
- The $102,000 is the Annual Salary Ceiling (unchanged since 2016)
- AW ceiling is calculated per employer per calendar year
- Resets on January 1st each year

```typescript
function calculateAWCeiling(ytdOWSubjectToCPF: number): number {
  const ANNUAL_SALARY_CEILING = 102000;
  return Math.max(0, ANNUAL_SALARY_CEILING - ytdOWSubjectToCPF);
}

function cappedAW(grossAW: number, ytdOWSubjectToCPF: number): number {
  const awCeiling = calculateAWCeiling(ytdOWSubjectToCPF);
  return Math.min(grossAW, awCeiling);
}
```

#### CPF Annual Limit

**Value:** $37,740 (unchanged)

This is the maximum total CPF contributions (employee + employer) in a calendar year. This limit is rarely reached in practice due to wage ceilings.

### 1.3 Contribution Rates by Age Band

#### Singapore Citizens and 3rd Year+ Permanent Residents

**Effective from 2025-01-01:**

| Age Group | Employee Rate | Employer Rate | Total Rate |
|-----------|---------------|---------------|------------|
| 55 and below | 20% | 17% | 37% |
| Above 55 to 60 | 15.5% | 17% | 32.5% |
| Above 60 to 65 | 10.5% | 13% | 23.5% |
| Above 65 to 70 | 7.5% | 9% | 16.5% |
| Above 70 | 5% | 7.5% | 12.5% |

**Effective 2024-01-01 to 2024-12-31:**

| Age Group | Employee Rate | Employer Rate | Total Rate |
|-----------|---------------|---------------|------------|
| 55 and below | 20% | 17% | 37% |
| Above 55 to 60 | 15% | 16% | 31% |
| Above 60 to 65 | 9.5% | 12.5% | 22% |
| Above 65 to 70 | 7.5% | 9% | 16.5% |
| Above 70 | 5% | 7.5% | 12.5% |

#### Permanent Residents - Graduated Rates

**1st Year SPR (Graduated/Graduated rates):**

| Age Group | Employee Rate | Employer Rate | Total Rate |
|-----------|---------------|---------------|------------|
| 55 and below | 5% | 4% | 9% |
| Above 55 to 60 | 5% | 4% | 9% |
| Above 60 to 65 | 5% | 4% | 9% |
| Above 65 to 70 | 5% | 4% | 9% |
| Above 70 | 5% | 4% | 9% |

**2nd Year SPR (Graduated/Graduated rates):**

| Age Group | Employee Rate | Employer Rate | Total Rate |
|-----------|---------------|---------------|------------|
| 55 and below | 15% | 9% | 24% |
| Above 55 to 60 | 12.5% | 9% | 21.5% |
| Above 60 to 65 | 7.5% | 6% | 13.5% |
| Above 65 to 70 | 5% | 6% | 11% |
| Above 70 | 5% | 6% | 11% |

**Note:** Employers and employees may jointly apply to contribute at full rates earlier.

#### Low-Wage Workers (Gradual Contribution)

For employees earning between $50 and $500 monthly:
- Employer contributes at full rate
- Employee contribution is zero

For employees earning between $500 and $750 monthly:
- Employer contributes at full rate
- Employee contribution is gradually phased in

```typescript
function getEmployeeRateForLowWage(
  totalWage: number,
  standardRate: number
): number {
  if (totalWage <= 50) return 0; // No CPF
  if (totalWage <= 500) return 0; // Employer only
  if (totalWage <= 750) {
    // Gradual phase-in
    // Employee share = 0.6 × (Total Wage - $500)
    const employeeShare = 0.6 * (totalWage - 500);
    return employeeShare / totalWage;
  }
  return standardRate;
}
```

### 1.4 Allocation Rates

Contributions are allocated to OA, SA, and MA based on age. The MA allocation is computed first, then SA, with the remainder going to OA.

#### Allocation Rates (2025)

| Age Group | OA | SA | MA |
|-----------|-----|-----|-----|
| 35 and below | 23% | 6% | 8% |
| Above 35 to 45 | 21% | 7% | 9% |
| Above 45 to 50 | 19% | 8% | 10% |
| Above 50 to 55 | 15% | 11.5% | 10.5% |
| Above 55 to 60 | 12% | 3.5% | 10.5% |
| Above 60 to 65 | 3.5% | 2.5% | 10.5% |
| Above 65 to 70 | 1% | 1% | 10.5% |
| Above 70 | 1% | 1% | 10.5% |

**Note:** Percentages shown are of Total Wages subject to CPF. For members 55+, SA is closed from 2025; contributions that would go to SA now go to RA (up to FRS).

```typescript
interface AllocationRates {
  OA: number;
  SA: number;
  MA: number;
}

function getAllocationRates(age: number, effectiveDate: Date): AllocationRates {
  // Returns allocation as percentage of total contribution
  if (age <= 35) return { OA: 0.6216, SA: 0.1622, MA: 0.2162 };
  if (age <= 45) return { OA: 0.5676, SA: 0.1892, MA: 0.2432 };
  if (age <= 50) return { OA: 0.5135, SA: 0.2162, MA: 0.2703 };
  if (age <= 55) return { OA: 0.4054, SA: 0.3108, MA: 0.2838 };
  if (age <= 60) return { OA: 0.3692, SA: 0.1077, MA: 0.5231 }; // Note: SA may go to RA
  if (age <= 65) return { OA: 0.1489, SA: 0.1064, MA: 0.7447 };
  if (age <= 70) return { OA: 0.0606, SA: 0.0606, MA: 0.8788 };
  return { OA: 0.08, SA: 0.08, MA: 0.84 };
}
```

### 1.5 Rounding Rules

**Total CPF Contribution:**
- Round to nearest dollar
- < $0.50 → round down
- ≥ $0.50 → round up

**Employee's Share:**
- Always round DOWN (drop cents)

**Employer's Share:**
- Employer Share = Total Contribution - Employee Share

```typescript
function roundTotalContribution(amount: number): number {
  return Math.round(amount); // Standard rounding
}

function roundEmployeeShare(amount: number): number {
  return Math.floor(amount); // Always round down
}

function calculateContributions(
  totalWages: number,
  employeeRate: number,
  employerRate: number
): { employee: number; employer: number; total: number } {
  const totalRate = employeeRate + employerRate;
  const rawTotal = totalWages * totalRate;
  const rawEmployee = totalWages * employeeRate;

  const total = roundTotalContribution(rawTotal);
  const employee = roundEmployeeShare(rawEmployee);
  const employer = total - employee;

  return { employee, employer, total };
}
```

### 1.6 Multi-Employer Handling

**Key Rules:**
1. Each employer calculates OW ceiling independently each month
2. AW ceiling is calculated per employer per year
3. Each employer uses their own YTD OW for that employee
4. If employee has multiple employers, total CPF may exceed normal single-employer amounts

**Example:**
- Employee works for Employer A (OW: $5,000) and Employer B (OW: $4,000)
- Both employers apply OW ceiling of $7,400 independently
- Employer A contributes on $5,000, Employer B contributes on $4,000
- Total CPF contributions will be on $9,000 combined

### 1.7 Age Transition Rules

**When does the new age band apply?**

The employee moves to the next age group on their birthday month. However, the rate for that month depends on the employee's age on the first day of the month.

```typescript
function getAgeForCPF(birthDate: Date, contributionMonth: Date): number {
  const firstOfMonth = new Date(
    contributionMonth.getFullYear(),
    contributionMonth.getMonth(),
    1
  );

  let age = firstOfMonth.getFullYear() - birthDate.getFullYear();
  const monthDiff = firstOfMonth.getMonth() - birthDate.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && firstOfMonth.getDate() < birthDate.getDate())) {
    age--;
  }

  return age;
}
```

---

## C2. CPF Interest Accrual

### 2.1 Base Interest Rates

| Account | Base Rate | Floor Rate | Benchmark |
|---------|-----------|------------|-----------|
| OA | Variable | 2.5% p.a. | 3-month average of major local banks' rates (80% FD + 20% savings) |
| SA | Variable | 4.0% p.a. | 12-month average of 10-year SGS yield + 1% |
| MA | Variable | 4.0% p.a. | 12-month average of 10-year SGS yield + 1% |
| RA | Variable | 4.0% p.a. | 12-month average of 10-year SGS yield + 1% |

**Current Effective Rates (2024-2025):**
- OA: 2.5% p.a. (at floor)
- SA/MA/RA: 4.0% p.a. (at floor)

### 2.2 Extra Interest Rules

#### Members Below Age 55

**Extra Interest:** 1% on first $60,000 of combined balances

**Allocation Priority:**
1. First applied to OA (capped at $20,000)
2. Then to SA
3. Then to MA

**Where Extra Interest Goes:** To SA (or RA if RA exists)

```typescript
function calculateExtraInterestUnder55(
  OA: number,
  SA: number,
  MA: number
): { oaExtra: number; saExtra: number; maExtra: number } {
  const TOTAL_CAP = 60000;
  const OA_CAP = 20000;
  const EXTRA_RATE = 0.01;

  let remaining = TOTAL_CAP;

  // OA portion (capped at $20,000)
  const oaEligible = Math.min(OA, OA_CAP, remaining);
  remaining -= oaEligible;

  // SA portion
  const saEligible = Math.min(SA, remaining);
  remaining -= saEligible;

  // MA portion
  const maEligible = Math.min(MA, remaining);

  return {
    oaExtra: oaEligible * EXTRA_RATE / 12, // Monthly
    saExtra: saEligible * EXTRA_RATE / 12,
    maExtra: maEligible * EXTRA_RATE / 12
  };
}
```

#### Members Age 55 and Above

**Extra Interest Structure:**
- 2% on first $30,000 of combined balances
- 1% on next $30,000 of combined balances (total $60,000)

**Allocation Priority:** Same as under 55 (OA capped at $20,000 first)

**Where Extra Interest Goes:** To RA

```typescript
function calculateExtraInterest55AndAbove(
  OA: number,
  SA: number,
  MA: number,
  RA: number
): { extraInterest: number } {
  const FIRST_TIER = 30000;
  const SECOND_TIER = 30000;
  const OA_CAP = 20000;
  const FIRST_RATE = 0.02;
  const SECOND_RATE = 0.01;

  const combined = OA + SA + MA + RA;

  // First $30,000 at 2%
  const firstTierEligible = Math.min(combined, FIRST_TIER);
  // With OA cap
  const oaInFirstTier = Math.min(OA, OA_CAP, FIRST_TIER);

  // Next $30,000 at 1%
  const secondTierEligible = Math.min(
    Math.max(0, combined - FIRST_TIER),
    SECOND_TIER
  );

  const extraInterest =
    (firstTierEligible * FIRST_RATE + secondTierEligible * SECOND_RATE) / 12;

  return { extraInterest };
}
```

### 2.3 Effective Interest Rates Summary

| Account | Age < 55 | Age ≥ 55 |
|---------|----------|----------|
| OA (first $20K of $60K) | 3.5% | 4.5% |
| OA (above caps) | 2.5% | 2.5% |
| SA/MA (within $60K) | 5.0% | 6.0% (first $30K), 5.0% (next $30K) |
| SA/MA (above caps) | 4.0% | 4.0% |
| RA (within $60K) | N/A | 6.0% (first $30K), 5.0% (next $30K) |
| RA (above caps) | N/A | 4.0% |

### 2.4 Interest Computation Mechanics

**Frequency:** Monthly

**Crediting:** Interest is computed monthly but credited at the end of each year (December 31)

**Balance Used:** Lowest balance of the month OR balance at month-end (CPF uses specific rules - for simulation, use month-end balance)

```typescript
function computeMonthlyInterest(
  account: 'OA' | 'SA' | 'MA' | 'RA',
  balance: number,
  baseRate: number,
  extraRate: number,
  extraEligibleAmount: number
): number {
  const monthlyBaseRate = baseRate / 12;
  const monthlyExtraRate = extraRate / 12;

  const extraPortion = Math.min(balance, extraEligibleAmount);
  const normalPortion = Math.max(0, balance - extraEligibleAmount);

  const baseInterest = balance * monthlyBaseRate;
  const extraInterest = extraPortion * monthlyExtraRate;

  return baseInterest + extraInterest;
}
```

---

## C3. MediSave

### 3.1 Basic Healthcare Sum (BHS)

**Definition:** The BHS is the maximum amount that can be held in the MediSave Account. Any contributions above this amount will overflow to other accounts.

| Year | BHS |
|------|-----|
| 2023 | $68,500 |
| 2024 | $71,500 |
| 2025 | $75,500 |

**Cohort BHS Rule:** When a member turns 65, their BHS is fixed at that year's BHS for life.

```typescript
function getBHS(year: number, memberAge: number, bhsAtAge65?: number): number {
  // If member is 65+, use their locked BHS
  if (memberAge >= 65 && bhsAtAge65 !== undefined) {
    return bhsAtAge65;
  }

  // Otherwise use current year's BHS
  const bhsTable: Record<number, number> = {
    2023: 68500,
    2024: 71500,
    2025: 75500,
    // Future years estimated at ~4% annual increase
  };

  return bhsTable[year] ?? Math.round(75500 * Math.pow(1.04, year - 2025));
}
```

### 3.2 MediSave Spillover Logic

When MA contributions would cause MA balance to exceed BHS, the excess spills over:

**Spillover Priority:**
1. **First:** To SA (or RA for members 55+) up to FRS
2. **Then:** To OA (if SA/RA has reached FRS)

```typescript
function processMediSaveContribution(
  maContribution: number,
  currentMA: number,
  currentSA: number,
  currentRA: number,
  currentOA: number,
  bhs: number,
  frs: number,
  age: number
): { toMA: number; toSA: number; toRA: number; toOA: number } {
  const maAfter = currentMA + maContribution;

  if (maAfter <= bhs) {
    return { toMA: maContribution, toSA: 0, toRA: 0, toOA: 0 };
  }

  const toMA = Math.max(0, bhs - currentMA);
  let excess = maContribution - toMA;

  let toSA = 0;
  let toRA = 0;
  let toOA = 0;

  if (age >= 55) {
    // Spillover to RA first
    const raRoom = Math.max(0, frs - currentRA);
    toRA = Math.min(excess, raRoom);
    excess -= toRA;
  } else {
    // Spillover to SA first
    const saRoom = Math.max(0, frs - currentSA);
    toSA = Math.min(excess, saRoom);
    excess -= toSA;
  }

  // Remaining goes to OA
  toOA = excess;

  return { toMA, toSA, toRA, toOA };
}
```

### 3.3 MediSave Withdrawal Categories

#### Inpatient Care (Hospitalisation)

| Category | Daily Limit (Days 1-2) | Daily Limit (Day 3+) |
|----------|------------------------|----------------------|
| Standard Inpatient | $1,130 | $400 |
| Psychiatric (IMH) | $1,130 | $230 |
| Community Hospital | $250 | $250 |

Plus applicable surgical limits based on operation table (Table 1A to 7C).

#### Day Surgery

- Daily ward charges: Up to $830
- Surgical limits: $240 (Table 1A) to $5,290 (Table 7C)
- Combined cap for multiple operations: $5,290

#### Outpatient Treatment

| Category | Annual Limit | Co-payment |
|----------|--------------|------------|
| Chronic Disease (CDMP) - MediSave500 | $500 | 15% |
| Chronic Disease (complex) - MediSave700 | $700 | 15% |
| Flexi-MediSave (Age 60+) | $300 → $400 (Oct 2025) | Varies |
| Outpatient Scans | $300 → $600 (Oct 2025) | N/A |

#### Cancer Treatment

- Up to $3,750 per course (in addition to daily hospital charges)

#### Vaccinations

- Selected vaccinations (e.g., influenza, pneumococcal) for eligible age groups
- Up to $500/year for preventive care

### 3.4 Self-Employed MediSave Contributions

Self-employed persons (SEPs) with annual net trade income (NTI) above $6,000 must contribute to MediSave.

**Contribution Rate:** Varies by age and NTI

| Age | Rate on NTI |
|-----|-------------|
| Below 35 | 8% |
| 35-45 | 9% |
| 45-50 | 10% |
| 50+ | 10.5% |

**Cap:** Contribution is capped at the applicable BHS.

---

## C4. MediShield Life

### 4.1 Overview

MediShield Life is a mandatory basic health insurance scheme that covers all Singapore Citizens and Permanent Residents. It provides coverage for large hospital bills and selected costly outpatient treatments.

### 4.2 Premium Structure

Premiums vary by age band and are set to cover each cohort's expected claims.

#### Premium Table (Effective April 2025)

| Age Next Birthday | Annual Premium (Before Subsidies) |
|-------------------|-----------------------------------|
| 1-18 | $197 |
| 19-20 | $197 |
| 21-25 | $197 |
| 26-30 | $270 |
| 31-40 | $360 |
| 41-50 | $495 |
| 51-60 | $690 |
| 61-65 | $915 |
| 66-70 | $1,075 |
| 71-73 | $1,270 |
| 74-76 | $1,440 |
| 77-78 | $1,605 |
| 79-80 | $1,755 |
| 81-83 | $1,920 |
| 84-85 | $2,085 |
| 86-90 | $2,265 |
| 91+ | $2,520 |

**Note:** These are approximate values. Actual premiums are updated periodically. Premiums are fully payable using MediSave.

### 4.3 Subsidies

#### Premium Subsidies (Means-Tested)

Available for lower- to middle-income families.

| Household Income Per Person | Subsidy Rate (Citizens) | Subsidy Rate (PRs) |
|-----------------------------|-------------------------|--------------------|
| ≤ $1,200 | 60% | 30% |
| $1,201 - $1,800 | 50% | 25% |
| $1,801 - $2,400 | 40% | 20% |
| $2,401 - $3,000 | 30% | 15% |
| $3,001 - $3,600 | 20% | 10% |

**Eligibility Requirements:**
- Household monthly income per person ≤ $3,600
- Property Annual Value ≤ $31,000
- Must not own multiple properties

#### Pioneer Generation (PG) Subsidies

- 40-60% additional subsidy on premiums
- $250-$900 annual MediSave top-up (increasing to up to $1,200)
- Members above 90 in 2025: premiums fully covered

#### Merdeka Generation (MG) Subsidies

- Additional 5% of premium (10% from age 76+)
- Not means-tested

### 4.4 Claim Limits

#### Deductibles

| Age | Inpatient Deductible (Current) | Inpatient Deductible (From Apr 2025) |
|-----|-------------------------------|-------------------------------------|
| Below 81 | $1,500 | $2,000 (Phase 1) → $2,500 (Phase 2, Apr 2027) |
| 81+ | $2,000 | $2,500 (Phase 1) → $3,000 (Phase 2, Apr 2027) |

**Outpatient Deductible (From Jan 2026):** $500/year

**Key Rules:**
- Deductible is per policy year (not per claim)
- Inpatient and outpatient deductibles are combined (paying one counts toward the other)
- Can be paid using MediSave or cash

#### Co-Insurance

After deductible is met, MediShield Life pays a percentage of remaining bill:

| Claimable Amount | Co-Insurance (Patient Pays) |
|------------------|----------------------------|
| First $5,000 | 10% |
| Next $5,000 | 5% |
| Above $10,000 | 3% |

#### Annual and Lifetime Limits

| Limit Type | Amount |
|------------|--------|
| Annual Claim Limit (from Apr 2025) | $200,000 |
| Lifetime Claim Limit | None (removed in 2025) |

### 4.5 Coverage

**Covered:**
- Inpatient hospital treatment (Class B2/C wards at public hospitals)
- Day surgery
- Selected outpatient treatments (chemotherapy, radiotherapy, dialysis)
- Outpatient scans (from 2025)

**Not Covered:**
- Cosmetic procedures
- Experimental treatments
- Private hospital charges (only up to public B2/C equivalent)
- Pre-existing conditions exclusions (first 12 months for some conditions)

---

## C5. Integrated Shield Plans

### 5.1 Overview

Integrated Shield Plans (ISPs) are private health insurance plans that provide coverage beyond MediShield Life. They are offered by private insurers and integrate with MediShield Life.

### 5.2 Plan Tiers

| Ward Class | Coverage Level |
|------------|----------------|
| Class B1 | Semi-private ward in public hospital |
| Class A | Single room in public hospital |
| Private | Private hospital coverage |

### 5.3 MediSave Usage for ISP Premiums

#### MediShield Life Component
- Fully payable using MediSave (no limit)

#### Additional Private Insurance Component

**Additional Withdrawal Limits (AWL):**

| Age Next Birthday | Annual AWL |
|-------------------|------------|
| 40 and below | $300 |
| 41 to 70 | $600 |
| 71 and above | $900 |

```typescript
function getAWL(ageNextBirthday: number): number {
  if (ageNextBirthday <= 40) return 300;
  if (ageNextBirthday <= 70) return 600;
  return 900;
}

function calculateISPMediSaveUsage(
  mediShieldLifePremium: number,
  additionalPremium: number,
  ageNextBirthday: number
): { fromMediSave: number; cashRequired: number } {
  const awl = getAWL(ageNextBirthday);

  // MediShield Life component: fully from MediSave
  const mslFromMediSave = mediShieldLifePremium;

  // Additional component: up to AWL from MediSave
  const additionalFromMediSave = Math.min(additionalPremium, awl);
  const cashRequired = additionalPremium - additionalFromMediSave;

  return {
    fromMediSave: mslFromMediSave + additionalFromMediSave,
    cashRequired
  };
}
```

#### Rider Premiums
- Must be paid in cash (not from MediSave)

### 5.4 Rider Requirements (From 2026)

**Co-Payment Requirements:**
- Minimum 5% co-payment by patient
- Minimum co-payment cap: $6,000/year (up from $3,000)

### 5.5 Coordination of Benefits

When an ISP claim is made:
1. MediShield Life pays first (as base layer)
2. ISP pays the additional coverage
3. Patient pays deductible and co-insurance

```
┌─────────────────────────────────────────┐
│             TOTAL HOSPITAL BILL          │
├─────────────────────────────────────────┤
│  ┌─────────────────────────────────┐    │
│  │      ISP Additional Coverage     │    │
│  │  (Private/A/B1 ward upgrade)     │    │
│  ├─────────────────────────────────┤    │
│  │      MediShield Life Coverage    │    │
│  │  (B2/C ward equivalent)          │    │
│  ├─────────────────────────────────┤    │
│  │    Deductible + Co-Insurance     │    │
│  │      (Patient's portion)         │    │
│  └─────────────────────────────────┘    │
└─────────────────────────────────────────┘
```

---

## C6. Retirement & CPF LIFE

### 6.1 Retirement Account (RA) Creation

**Trigger:** Member turns 55

**Process:**
1. RA is created automatically
2. SA balance transfers to RA (up to FRS)
3. If SA < FRS, OA balance transfers to RA (up to remaining FRS amount)
4. Amount above FRS can be withdrawn

```typescript
function createRetirementAccount(
  oaBalance: number,
  saBalance: number,
  frs: number
): { ra: number; oa: number; withdrawable: number } {
  // Step 1: Transfer SA to RA
  const saToRA = Math.min(saBalance, frs);
  const remainingFRS = frs - saToRA;

  // Step 2: Transfer OA to RA if needed
  const oaToRA = Math.min(oaBalance, remainingFRS);

  // Calculate final balances
  const ra = saToRA + oaToRA;
  const oa = oaBalance - oaToRA;
  const remainingSA = saBalance - saToRA; // Should be 0 if SA < FRS

  // Withdrawable = OA balance remaining + any SA above FRS
  const withdrawable = oa + remainingSA;

  return { ra, oa, withdrawable };
}
```

### 6.2 Retirement Sums

| Year (Turning 55) | BRS | FRS | ERS |
|-------------------|-----|-----|-----|
| 2024 | $102,900 | $205,800 | $308,700 |
| 2025 | $106,500 | $213,000 | $426,000 |
| 2026 | $110,200 | $220,400 | $440,800 |
| 2027 | $114,100 | $228,200 | $456,400 |

**Multipliers:**
- FRS = 2 × BRS
- ERS = 4 × BRS (from 2025; was 3 × BRS before)

**Cohort Rule:** The retirement sum applicable is fixed based on the year you turn 55.

```typescript
interface RetirementSums {
  brs: number;
  frs: number;
  ers: number;
}

function getRetirementSums(yearTurning55: number): RetirementSums {
  const brsTable: Record<number, number> = {
    2024: 102900,
    2025: 106500,
    2026: 110200,
    2027: 114100
  };

  const brs = brsTable[yearTurning55] ??
    Math.round(114100 * Math.pow(1.035, yearTurning55 - 2027));

  const ersMultiplier = yearTurning55 >= 2025 ? 4 : 3;

  return {
    brs,
    frs: brs * 2,
    ers: brs * ersMultiplier
  };
}
```

### 6.3 SA Closure for Age 55+ (From 2025)

**Effective:** January 1, 2025

**Rule:** For members aged 55 and above:
- SA is closed
- Contributions that would have gone to SA now go to RA (up to FRS)
- If RA has reached FRS, excess goes to OA

### 6.4 CPF LIFE Plans

#### Overview

CPF LIFE (Lifelong Income For the Elderly) provides monthly payouts for life starting from age 65.

**Eligibility:**
- Singapore Citizens and PRs
- RA balance of at least $60,000 (as of 2024)
- Automatic enrollment at age 65

#### Plan Types

| Plan | Initial Payout | Bequest | Best For |
|------|----------------|---------|----------|
| Standard | Higher | Lower | Self-focused |
| Basic | Lower | Higher | Legacy-focused |
| Escalating | Lowest initially, +2%/year | Moderate | Inflation hedge |

#### Payout Estimates (2025)

For members turning 65 with different RA balances:

| RA Balance | Standard Plan (Monthly) | Basic Plan (Monthly) | Escalating Plan (Initial) |
|------------|-------------------------|----------------------|---------------------------|
| BRS ($106,500) | $860 - $930 | $770 - $840 | $680 - $740 |
| FRS ($213,000) | $1,610 - $1,730 | $1,440 - $1,560 | $1,280 - $1,380 |
| ERS ($426,000) | $3,100 - $3,330 | $2,780 - $3,000 | $2,460 - $2,660 |

**Note:** Actual payouts depend on interest rates and cohort mortality assumptions.

#### Payout Deferral

Members can defer the start of CPF LIFE payouts from age 65 to 70.

**Benefit:** Approximately 7% higher monthly payout for each year deferred

```typescript
function estimateDeferralBonus(
  baseMonthlyPayout: number,
  startAge: number
): number {
  const DEFERRAL_BONUS_PER_YEAR = 0.07;
  const yearsDeferred = Math.max(0, startAge - 65);
  const maxDeferral = 5; // Cap at age 70

  const actualDeferral = Math.min(yearsDeferred, maxDeferral);
  const multiplier = 1 + (DEFERRAL_BONUS_PER_YEAR * actualDeferral);

  return Math.round(baseMonthlyPayout * multiplier);
}
```

### 6.5 Withdrawals at Age 55

**Withdrawable Amount = Total CPF - FRS**

If total CPF balance exceeds FRS:
- Excess can be withdrawn in cash
- Must retain FRS in RA for CPF LIFE

**Property Pledge Option:**
- If property is pledged, only BRS needs to be retained
- Difference (FRS - BRS) can be withdrawn
- Subject to conditions on property value

---

## C7. CPF Housing Usage

### 7.1 Overview

CPF OA savings can be used to purchase property in Singapore, subject to various limits and conditions.

### 7.2 Key Definitions

#### Valuation Limit (VL)

**Definition:** The lower of the purchase price or the property valuation at the time of purchase.

```typescript
function calculateVL(purchasePrice: number, valuation: number): number {
  return Math.min(purchasePrice, valuation);
}
```

#### Withdrawal Limit (WL)

**Definition:** Maximum CPF that can be used for the property.

**Formula:**
```
WL = VL × 1.2 (120% of Valuation Limit)
```

```typescript
function calculateWL(vl: number): number {
  return vl * 1.2;
}
```

### 7.3 Usage Rules by Property Type

#### HDB BTO (Build-To-Order)

- VL and WL do **not** apply
- Can use CPF without limit (up to purchase price)

#### HDB Resale with HDB Loan

- VL applies
- Can use CPF beyond VL only if BRS is met in CPF

#### HDB Resale/Private with Bank Loan

- Both VL and WL apply
- Up to VL: No BRS requirement
- VL to WL: Must meet BRS in CPF accounts
- Beyond WL: Not allowed

```typescript
interface PropertyCPFUsage {
  upToVL: number;
  vlToWL: number;
  total: number;
  brsRequired: boolean;
}

function calculateCPFUsageAllowed(
  propertyType: 'BTO' | 'HDB_RESALE' | 'PRIVATE',
  loanType: 'HDB' | 'BANK',
  purchasePrice: number,
  valuation: number,
  currentOA: number,
  currentCPFTotal: number,
  brs: number
): PropertyCPFUsage {
  if (propertyType === 'BTO') {
    return {
      upToVL: purchasePrice,
      vlToWL: 0,
      total: Math.min(purchasePrice, currentOA),
      brsRequired: false
    };
  }

  const vl = calculateVL(purchasePrice, valuation);
  const wl = calculateWL(vl);

  const upToVL = Math.min(vl, currentOA);

  let vlToWL = 0;
  let brsRequired = false;

  if (loanType === 'BANK' || propertyType === 'PRIVATE') {
    if (currentCPFTotal >= brs) {
      vlToWL = Math.min(wl - vl, currentOA - upToVL);
      brsRequired = true;
    }
  } else if (loanType === 'HDB') {
    // HDB loan: can exceed VL with BRS met
    if (currentCPFTotal >= brs) {
      vlToWL = Math.min(purchasePrice - vl, currentOA - upToVL);
      brsRequired = true;
    }
  }

  return {
    upToVL,
    vlToWL,
    total: upToVL + vlToWL,
    brsRequired
  };
}
```

### 7.4 Remaining Lease Requirements

CPF can only be used if the property's remaining lease meets these conditions:

1. Remaining lease ≥ 20 years
2. Remaining lease covers the youngest buyer until at least age 95

**Pro-ration:** If remaining lease doesn't cover to age 95, CPF usage is pro-rated:

```typescript
function calculateLeaseProration(
  remainingLease: number,
  youngestBuyerAge: number
): number {
  const yearsToAge95 = 95 - youngestBuyerAge;

  if (remainingLease >= yearsToAge95) {
    return 1.0; // Full usage allowed
  }

  if (remainingLease < 20) {
    return 0; // No CPF usage allowed
  }

  // Pro-rated based on lease coverage
  return remainingLease / yearsToAge95;
}
```

### 7.5 Accrued Interest

**Definition:** The interest that would have been earned if the CPF used for property had remained in the OA.

**Rate:** 2.5% per annum (OA interest rate)

**Compounding:** Annual (simplified) or monthly (precise)

```typescript
function calculateAccruedInterest(
  principalWithdrawn: number,
  withdrawalDate: Date,
  currentDate: Date,
  annualRate: number = 0.025
): number {
  const years = (currentDate.getTime() - withdrawalDate.getTime()) /
                (365.25 * 24 * 60 * 60 * 1000);

  // Compound interest formula
  const accruedInterest = principalWithdrawn *
    (Math.pow(1 + annualRate, years) - 1);

  return Math.round(accruedInterest * 100) / 100;
}
```

### 7.6 Property Sale Refund Rules

When selling a property purchased with CPF:

**Amount to Refund = Principal Used + Accrued Interest**

**Where Refund Goes:**
- Age < 55: To OA
- Age ≥ 55: To RA (up to FRS), then to OA

**Shortfall Handling:**
- If sale proceeds are insufficient to cover full refund
- No cash top-up required if sold at market value
- Option monies received in cash must still be refunded

```typescript
interface PropertyRefund {
  principalUsed: number;
  accruedInterest: number;
  totalRefund: number;
  toOA: number;
  toRA: number;
}

function calculatePropertyRefund(
  principalUsed: number,
  accruedInterest: number,
  memberAge: number,
  currentRA: number,
  frs: number
): PropertyRefund {
  const totalRefund = principalUsed + accruedInterest;

  let toRA = 0;
  let toOA = 0;

  if (memberAge >= 55) {
    const raRoom = Math.max(0, frs - currentRA);
    toRA = Math.min(totalRefund, raRoom);
    toOA = totalRefund - toRA;
  } else {
    toOA = totalRefund;
  }

  return {
    principalUsed,
    accruedInterest,
    totalRefund,
    toOA,
    toRA
  };
}
```

### 7.7 Second Property Rules

For second property purchases:
- WL capped at 100% of VL (not 120%)
- Must set aside BRS before using CPF
- More stringent lease requirements may apply

### 7.8 Detailed CPF Housing Usage Tracking (Property Planner Integration)

For detailed financial planning integration, track CPF usage at a granular level:

```typescript
interface CPFHousingUsage {
  propertyId: string;
  propertyScenarioId?: string; // Link to property planner scenario

  // Purchase details
  purchaseDate: Date;
  purchasePrice: number;
  marketValuation: number;

  // Down payment breakdown
  downPayment: {
    oaUsed: number;
    cashUsed: number;
    grantReceived: number; // CPF Housing Grant if applicable
    cpfHousingGrantType?: 'EHG' | 'FHG' | 'PHG' | 'STEP_UP';
  };

  // Monthly mortgage payment tracking
  monthlyPaymentSource: 'OA' | 'CASH' | 'MIXED';
  monthlyPayments: CPFMortgagePayment[];

  // Cumulative totals
  totals: {
    totalOAUsed: number;
    totalCashUsed: number;
    oaForDownPayment: number;
    oaForMonthlyPayments: number;
    oaForStampDuty: number;
    oaForLegalFees: number;
  };

  // Accrued interest tracking
  accruedInterest: AccruedInterestSchedule;
}

interface CPFMortgagePayment {
  month: Date;
  oaUsed: number;
  cashUsed: number;
  principalPortion: number;
  interestPortion: number;
  outstandingLoanAfter: number;
}

interface AccruedInterestSchedule {
  asOfDate: Date;
  totalAccrued: number;
  yearlyBreakdown: AccruedInterestYear[];
}

interface AccruedInterestYear {
  year: number;
  startingPrincipal: number; // Total OA used as of start of year
  newOAUsedDuringYear: number;
  interestForYear: number;
  cumulativeInterest: number;
}
```

### 7.9 Accrued Interest Calculation (Detailed)

Accrued interest tracks the interest that would have been earned if CPF remained in OA:

**Key Rules:**
- Rate: 2.5% per annum (OA interest rate)
- Compounds annually
- Each withdrawal tracked separately from its date
- Required to refund upon property sale

```typescript
function calculateDetailedAccruedInterest(
  oaWithdrawals: Array<{ date: Date; amount: number; purpose: string }>,
  currentDate: Date
): AccruedInterestSchedule {
  const ACCRUED_RATE = 0.025;

  // Group withdrawals by year
  const withdrawalsByYear = new Map<number, number>();
  let runningTotal = 0;

  for (const withdrawal of oaWithdrawals) {
    const year = withdrawal.date.getFullYear();
    withdrawalsByYear.set(
      year,
      (withdrawalsByYear.get(year) || 0) + withdrawal.amount
    );
  }

  // Calculate year-by-year accrued interest
  const yearlyBreakdown: AccruedInterestYear[] = [];
  let cumulativeInterest = 0;
  const startYear = Math.min(...Array.from(withdrawalsByYear.keys()));
  const endYear = currentDate.getFullYear();

  for (let year = startYear; year <= endYear; year++) {
    const newOAUsed = withdrawalsByYear.get(year) || 0;
    const startingPrincipal = runningTotal;
    runningTotal += newOAUsed;

    // Interest on starting principal (full year)
    // Plus interest on new withdrawals (prorated - assume mid-year average)
    const interestOnExisting = startingPrincipal * ACCRUED_RATE;
    const interestOnNew = newOAUsed * ACCRUED_RATE * 0.5; // Half year average
    const interestForYear = interestOnExisting + interestOnNew;

    cumulativeInterest += interestForYear;

    yearlyBreakdown.push({
      year,
      startingPrincipal,
      newOAUsedDuringYear: newOAUsed,
      interestForYear: Math.round(interestForYear * 100) / 100,
      cumulativeInterest: Math.round(cumulativeInterest * 100) / 100
    });
  }

  return {
    asOfDate: currentDate,
    totalAccrued: Math.round(cumulativeInterest * 100) / 100,
    yearlyBreakdown
  };
}
```

### 7.10 Property Sale Refund Flow (Detailed)

Complete workflow for calculating CPF refund upon property sale:

```typescript
interface PropertySaleAnalysis {
  saleDate: Date;
  salePrice: number;
  outstandingLoan: number;
  sellingCosts: SellingCosts;

  cpfRefundRequired: {
    principalUsed: number;
    accruedInterest: number;
    totalRefund: number;
    breakdown: {
      forDownPayment: number;
      forMonthlyPayments: number;
      forOtherFees: number;
      accruedOnDownPayment: number;
      accruedOnMonthlyPayments: number;
    };
  };

  refundDestination: RefundDestination;
  netCashProceeds: number;
  isShortfall: boolean;
  shortfallAmount?: number;
}

interface SellingCosts {
  agentCommission: number;
  legalFees: number;
  otherCosts: number;
  total: number;
}

interface RefundDestination {
  toOA: number;
  toRA: number;
  reason: string;
}

function calculatePropertySaleAnalysis(
  cpfUsage: CPFHousingUsage,
  saleDate: Date,
  salePrice: number,
  outstandingLoan: number,
  sellingCosts: SellingCosts,
  memberAge: number,
  currentRA: number,
  frs: number
): PropertySaleAnalysis {
  // Calculate accrued interest
  const allWithdrawals = [
    { date: cpfUsage.purchaseDate, amount: cpfUsage.downPayment.oaUsed, purpose: 'downpayment' },
    ...cpfUsage.monthlyPayments.map(p => ({
      date: p.month,
      amount: p.oaUsed,
      purpose: 'mortgage'
    }))
  ];

  const accruedSchedule = calculateDetailedAccruedInterest(allWithdrawals, saleDate);

  const totalOAUsed = cpfUsage.totals.totalOAUsed;
  const totalRefund = totalOAUsed + accruedSchedule.totalAccrued;

  // Determine refund destination based on age
  let refundDestination: RefundDestination;

  if (memberAge < 55) {
    refundDestination = {
      toOA: totalRefund,
      toRA: 0,
      reason: 'Member under 55 - full refund to OA'
    };
  } else {
    const raRoom = Math.max(0, frs - currentRA);
    const toRA = Math.min(totalRefund, raRoom);
    const toOA = totalRefund - toRA;

    refundDestination = {
      toOA,
      toRA,
      reason: raRoom > 0
        ? `Member 55+ - refund to RA first (up to FRS), remainder to OA`
        : `Member 55+ - RA at FRS, full refund to OA`
    };
  }

  // Calculate net proceeds
  const grossProceeds = salePrice - outstandingLoan;
  const netBeforeCPF = grossProceeds - sellingCosts.total;
  const netCashProceeds = netBeforeCPF - totalRefund;

  const isShortfall = netCashProceeds < 0;

  return {
    saleDate,
    salePrice,
    outstandingLoan,
    sellingCosts,
    cpfRefundRequired: {
      principalUsed: totalOAUsed,
      accruedInterest: accruedSchedule.totalAccrued,
      totalRefund,
      breakdown: {
        forDownPayment: cpfUsage.downPayment.oaUsed,
        forMonthlyPayments: cpfUsage.totals.oaForMonthlyPayments,
        forOtherFees: cpfUsage.totals.oaForStampDuty + cpfUsage.totals.oaForLegalFees,
        accruedOnDownPayment: cpfUsage.downPayment.oaUsed * 0.025 *
          ((saleDate.getTime() - cpfUsage.purchaseDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000)),
        accruedOnMonthlyPayments: accruedSchedule.totalAccrued -
          (cpfUsage.downPayment.oaUsed * 0.025 *
          ((saleDate.getTime() - cpfUsage.purchaseDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000)))
      }
    },
    refundDestination,
    netCashProceeds,
    isShortfall,
    shortfallAmount: isShortfall ? Math.abs(netCashProceeds) : undefined
  };
}
```

### 7.11 Property Planner Integration Points

For integration with an existing property planner system:

**Database/API Integration:**

```typescript
// Link CPF usage to property scenario
interface PropertyCPFLink {
  propertyScenarioId: string;
  cpfUsageId: string;

  // Sync status
  lastSyncedAt: Date;
  syncSource: 'MANUAL' | 'AUTO';
}

// Timeline projection with CPF impact
interface TimelineItemWithCPFImpact {
  year: number;
  month?: number;

  // Property values
  propertyValue: number;
  outstandingLoan: number;
  equity: number;

  // CPF tracking
  cpfImpact: {
    oaWithdrawalThisMonth: number;
    cumulativeOAUsed: number;
    accruedInterestToDate: number;
    projectedRefundAtSale: number;
  };

  // Cash flow impact
  monthlyMortgageFromOA: number;
  monthlyMortgageFromCash: number;
}

// Property sale scenario comparison
interface SaleScenarioComparison {
  scenarios: Array<{
    saleYear: number;
    projectedSalePrice: number;
    projectedLoanBalance: number;
    cpfRefundRequired: number;
    netCashProceeds: number;
    effectiveReturn: number;
  }>;
}

function projectPropertyTimeline(
  cpfUsage: CPFHousingUsage,
  loanDetails: {
    principal: number;
    interestRate: number;
    tenureMonths: number;
    monthlyPayment: number;
  },
  propertyGrowthRate: number,
  projectionYears: number
): TimelineItemWithCPFImpact[] {
  const timeline: TimelineItemWithCPFImpact[] = [];

  let propertyValue = cpfUsage.purchasePrice;
  let outstandingLoan = loanDetails.principal;
  let cumulativeOAUsed = cpfUsage.downPayment.oaUsed;

  for (let year = 0; year <= projectionYears; year++) {
    // Property appreciation
    propertyValue *= (1 + propertyGrowthRate);

    // Loan amortization (simplified - assume consistent payments)
    const annualPrincipalPaid = loanDetails.monthlyPayment * 12 * 0.6; // Estimate
    outstandingLoan = Math.max(0, outstandingLoan - annualPrincipalPaid);

    // CPF usage for mortgage (if paying from OA)
    const annualOAForMortgage = loanDetails.monthlyPayment * 12; // Assuming full OA payment
    cumulativeOAUsed += annualOAForMortgage;

    // Accrued interest projection
    const accruedInterestToDate = cumulativeOAUsed * 0.025 * year;

    timeline.push({
      year,
      propertyValue: Math.round(propertyValue),
      outstandingLoan: Math.round(outstandingLoan),
      equity: Math.round(propertyValue - outstandingLoan),
      cpfImpact: {
        oaWithdrawalThisMonth: 0, // Detailed in monthly view
        cumulativeOAUsed: Math.round(cumulativeOAUsed),
        accruedInterestToDate: Math.round(accruedInterestToDate),
        projectedRefundAtSale: Math.round(cumulativeOAUsed + accruedInterestToDate)
      },
      monthlyMortgageFromOA: loanDetails.monthlyPayment,
      monthlyMortgageFromCash: 0
    });
  }

  return timeline;
}
```

### 7.12 CPF Housing Grants

**Available Grants (for eligible first-timers):**

| Grant | Eligibility | Max Amount |
|-------|-------------|------------|
| Enhanced CPF Housing Grant (EHG) | Income ≤ $9,000 | Up to $80,000 |
| Family Grant (FHG) | Families buying resale | $50,000 - $80,000 |
| Proximity Housing Grant (PHG) | Living near parents/children | Up to $30,000 |
| Step-Up Grant | 2-room to 3-room upgrade | $15,000 |

```typescript
interface CPFHousingGrant {
  type: 'EHG' | 'FHG' | 'PHG' | 'STEP_UP';
  amount: number;
  eligibilityDetails: {
    incomeRequirement?: number;
    familyRequirement?: boolean;
    proximityRequirement?: boolean;
  };
  disbursedTo: 'OA' | 'DIRECT_TO_SELLER';
}

function estimateEHGAmount(
  averageMonthlyIncome: number,
  householdType: 'FIRST_TIMER_FAMILY' | 'FIRST_TIMER_SINGLE' | 'SECOND_TIMER'
): number {
  if (householdType !== 'FIRST_TIMER_FAMILY') return 0;

  // EHG tiered by income (2024 rates)
  if (averageMonthlyIncome <= 1500) return 80000;
  if (averageMonthlyIncome <= 2000) return 75000;
  if (averageMonthlyIncome <= 2500) return 70000;
  if (averageMonthlyIncome <= 3000) return 65000;
  if (averageMonthlyIncome <= 3500) return 60000;
  if (averageMonthlyIncome <= 4000) return 55000;
  if (averageMonthlyIncome <= 4500) return 50000;
  if (averageMonthlyIncome <= 5000) return 45000;
  if (averageMonthlyIncome <= 5500) return 40000;
  if (averageMonthlyIncome <= 6000) return 35000;
  if (averageMonthlyIncome <= 6500) return 30000;
  if (averageMonthlyIncome <= 7000) return 25000;
  if (averageMonthlyIncome <= 7500) return 20000;
  if (averageMonthlyIncome <= 8000) return 15000;
  if (averageMonthlyIncome <= 8500) return 10000;
  if (averageMonthlyIncome <= 9000) return 5000;
  return 0;
}
```

---

## C8. Supplementary Retirement Scheme (SRS)

### 8.1 Overview

The SRS is a voluntary savings scheme to supplement CPF savings for retirement. It offers tax benefits for contributions and withdrawals.

### 8.2 Contribution Rules

#### Annual Contribution Caps

| Residency Status | Annual Cap |
|------------------|------------|
| Singapore Citizens | $15,300 |
| Singapore PRs | $15,300 |
| Foreigners | $35,700 |

**Deadline:** December 31 of each year (typically cutoff at 7pm)

```typescript
function getSRSContributionCap(residencyStatus: 'CITIZEN' | 'PR' | 'FOREIGNER'): number {
  return residencyStatus === 'FOREIGNER' ? 35700 : 15300;
}
```

#### Tax Benefits on Contribution

- Contributions are tax-deductible dollar-for-dollar
- Subject to overall personal income tax relief cap of $80,000

```typescript
function calculateSRSTaxRelief(
  contribution: number,
  residencyStatus: 'CITIZEN' | 'PR' | 'FOREIGNER',
  otherTaxReliefs: number
): number {
  const cap = getSRSContributionCap(residencyStatus);
  const validContribution = Math.min(contribution, cap);

  const overallCap = 80000;
  const remainingCap = Math.max(0, overallCap - otherTaxReliefs);

  return Math.min(validContribution, remainingCap);
}
```

### 8.3 SRS Account Operations

**Account Opening:**
- Only with DBS, OCBC, or UOB
- One SRS account per person
- Non-transferable between operators

**Investment Options:**
- Fixed deposits
- Shares
- Unit trusts
- Bonds
- Insurance products

### 8.4 Statutory Retirement Age

**Definition:** The retirement age in effect when the member made their first SRS contribution.

| Year of First Contribution | Statutory Retirement Age |
|---------------------------|-------------------------|
| Before July 2022 | 62 |
| July 2022 - June 2026 | 63 |
| From July 2026 | 64 |

**Significance:** Determines when penalty-free withdrawals begin.

```typescript
function getStatutoryRetirementAge(firstContributionDate: Date): number {
  if (firstContributionDate < new Date('2022-07-01')) return 62;
  if (firstContributionDate < new Date('2026-07-01')) return 63;
  return 64;
}
```

### 8.5 Withdrawal Rules

#### Penalty-Free Withdrawals (At/After Retirement Age)

**Conditions:**
- Member has reached statutory retirement age
- Within 10-year withdrawal window from first withdrawal

**Tax Treatment:**
- Only 50% of withdrawal is taxable
- First $40,000 effectively tax-free (if no other income)

```typescript
function calculateSRSWithdrawalTax(
  withdrawalAmount: number,
  otherTaxableIncome: number,
  isPenaltyFree: boolean
): { taxableAmount: number; penalty: number } {
  if (isPenaltyFree) {
    return {
      taxableAmount: withdrawalAmount * 0.5,
      penalty: 0
    };
  } else {
    return {
      taxableAmount: withdrawalAmount,
      penalty: withdrawalAmount * 0.05
    };
  }
}
```

#### Early Withdrawals (Before Retirement Age)

**Tax Treatment:**
- 100% of withdrawal is taxable
- 5% penalty on withdrawal amount

**Formula:**
```
Net Amount = Withdrawal - (Withdrawal × 0.05) - Income Tax on Withdrawal
```

#### Exceptional Circumstances

**Conditions for penalty-free (but 50% taxable) withdrawal:**
- Medical grounds (certified permanent incapacity)
- Death (paid to beneficiaries)
- Terminal illness

**Death/Terminal Illness Exemption:**
- Up to $400,000 exempt from tax
- Amounts above $400,000: 50% taxable

### 8.6 10-Year Withdrawal Window

**Start:** First penalty-free withdrawal after reaching retirement age

**Duration:** 10 years from first withdrawal

**End of Window:**
- After 10 years, any remaining balance must be withdrawn
- Entire remaining balance is deemed withdrawn and 50% is taxable

```typescript
interface SRS10YearWindow {
  startDate: Date;
  endDate: Date;
  isActive: boolean;
}

function calculateWithdrawalWindow(
  firstWithdrawalDate: Date | null,
  currentAge: number,
  statutoryRetirementAge: number
): SRS10YearWindow | null {
  if (currentAge < statutoryRetirementAge) {
    return null; // Not yet eligible
  }

  if (!firstWithdrawalDate) {
    return null; // Window not started
  }

  const startDate = firstWithdrawalDate;
  const endDate = new Date(startDate);
  endDate.setFullYear(endDate.getFullYear() + 10);

  return {
    startDate,
    endDate,
    isActive: new Date() < endDate
  };
}
```

---

## C9. CPFIS (CPF Investment Scheme)

### 9.1 Overview

The CPF Investment Scheme (CPFIS) allows CPF members to invest their OA and SA savings in a range of approved instruments. This provides the opportunity to potentially earn higher returns than CPF interest rates, but with associated investment risks.

### 9.2 Investible Balance Rules

Before investing, members must retain minimum amounts in their accounts:

| Account | Minimum Reserved | Investible Amount |
|---------|------------------|-------------------|
| OA | $20,000 | OA Balance - $20,000 |
| SA | $40,000 | SA Balance - $40,000 |

```typescript
interface CPFISLimits {
  oaReserved: number;
  saReserved: number;
  stocksLimit: number;
  goldLimit: number;
}

const CPFIS_LIMITS: CPFISLimits = {
  oaReserved: 20000,
  saReserved: 40000,
  stocksLimit: 0.35,
  goldLimit: 0.10
};

function getInvestibleBalance(
  balance: number,
  account: 'OA' | 'SA'
): number {
  const reserved = account === 'OA'
    ? CPFIS_LIMITS.oaReserved
    : CPFIS_LIMITS.saReserved;
  return Math.max(0, balance - reserved);
}
```

### 9.3 Investment Limits by Asset Class (OA)

| Asset Class | Max % of Investible OA |
|-------------|------------------------|
| Stocks (including REITs), Property Funds, Corporate Bonds | 35% |
| Gold (ETFs and certificates) | 10% |
| Unit Trusts, ETFs (bond/balanced), ILPs, T-bills, SGS Bonds | 100% |

**SA Investment Restrictions:**
- Only lower-risk products allowed (unit trusts, ETFs, SGS bonds)
- No direct stock investments from SA

```typescript
type CPFISAssetClass =
  | 'STOCKS'
  | 'PROPERTY_FUNDS'
  | 'CORPORATE_BONDS'
  | 'GOLD'
  | 'UNIT_TRUSTS'
  | 'ETF'
  | 'ILP'
  | 'TBILL'
  | 'SGS_BOND';

function getInvestmentLimit(
  assetClass: CPFISAssetClass,
  investibleOA: number
): number {
  switch (assetClass) {
    case 'STOCKS':
    case 'PROPERTY_FUNDS':
    case 'CORPORATE_BONDS':
      return investibleOA * 0.35;
    case 'GOLD':
      return investibleOA * 0.10;
    default:
      return investibleOA; // 100% for lower-risk products
  }
}
```

### 9.4 Approved Investment Products

**Popular CPFIS-Approved ETFs and Funds:**

| Product | Benchmark | TER |
|---------|-----------|-----|
| STI ETF (ES3/G3B) | Straits Times Index | 0.30% |
| Infinity Global Stock Index Fund | MSCI World Index | 0.735% |
| Infinity U.S. 500 Stock Index Fund | S&P 500 | 0.69% |
| ABF Singapore Bond Index Fund | SGX Bond Index | 0.25% |

**Government Securities:**
- Singapore Government Securities (SGS) Bonds
- Treasury Bills (T-Bills) - 6-month and 1-year tenures
- Singapore Savings Bonds (SSB)

### 9.5 Investment Account Fees

CPFIS requires an Investment Account with an approved agent:

| Provider | Transaction Fee | Min Commission | Quarterly Service |
|----------|----------------|----------------|-------------------|
| UOB | $2 per 1000 units | $25 | $2/counter |
| OCBC | $2.50 per 1000 units | $25 | $2/counter |
| DBS | $2.50 per 1000 units | $25 | $2/counter |
| Endowus | 0.4% access fee | N/A | $2.50/portfolio |
| FSMOne | $2.50 flat | $10 (ETFs) | $2 flat |

```typescript
interface CPFISFeeStructure {
  provider: 'UOB' | 'OCBC' | 'DBS' | 'ENDOWUS' | 'FSMONE';
  transactionFeePerThousand?: number;
  flatTransactionFee?: number;
  minCommission: number;
  quarterlyServiceFee: number;
  accessFeePercent?: number;
}

const CPFIS_FEES: Record<string, CPFISFeeStructure> = {
  UOB: { provider: 'UOB', transactionFeePerThousand: 2, minCommission: 25, quarterlyServiceFee: 2 },
  OCBC: { provider: 'OCBC', transactionFeePerThousand: 2.5, minCommission: 25, quarterlyServiceFee: 2 },
  DBS: { provider: 'DBS', transactionFeePerThousand: 2.5, minCommission: 25, quarterlyServiceFee: 2 },
  ENDOWUS: { provider: 'ENDOWUS', accessFeePercent: 0.4, minCommission: 0, quarterlyServiceFee: 2.5 },
  FSMONE: { provider: 'FSMONE', flatTransactionFee: 2.5, minCommission: 10, quarterlyServiceFee: 2 }
};

function calculateTradingCost(
  provider: string,
  units: number,
  transactionValue: number
): number {
  const fees = CPFIS_FEES[provider];
  if (!fees) throw new Error('Unknown provider');

  let tradingFee = 0;

  if (fees.flatTransactionFee) {
    tradingFee = fees.flatTransactionFee;
  } else if (fees.transactionFeePerThousand) {
    tradingFee = Math.ceil(units / 1000) * fees.transactionFeePerThousand;
  }

  // Apply minimum commission
  const commission = Math.max(
    tradingFee,
    fees.minCommission
  );

  // Add access fee if applicable
  const accessFee = fees.accessFeePercent
    ? transactionValue * (fees.accessFeePercent / 100)
    : 0;

  return commission + accessFee;
}
```

### 9.6 CPFIS Investment Schema

```typescript
interface CPFISInvestment {
  id: string;
  account: 'OA' | 'SA';
  productType: CPFISAssetClass;
  productName: string;
  productCode?: string; // e.g., "ES3" for STI ETF

  // Holdings
  units: number;
  purchasePrice: number;
  purchaseDate: Date;
  currentValue: number;

  // Costs
  ter: number; // Total Expense Ratio
  purchaseFees: number;

  // Performance
  unrealizedGainLoss: number;
  dividendsReceived: number;
}

interface CPFISPortfolio {
  memberId: string;
  oaInvestments: CPFISInvestment[];
  saInvestments: CPFISInvestment[];

  // Summary
  totalOAInvested: number;
  totalSAInvested: number;
  totalCurrentValue: number;
  totalUnrealizedGainLoss: number;
}
```

### 9.7 Key Considerations

**When CPFIS May Not Be Worth It:**
1. OA already earns 2.5% (up to 3.5% with extra interest) - risk-free
2. SA earns 4% (up to 5%) - very competitive for low-risk
3. High expense ratios on many approved funds
4. Transaction costs can erode returns for small amounts

**When CPFIS May Be Considered:**
1. Long investment horizon (10+ years)
2. Large investible balance (reduce fee impact)
3. Comfortable with market volatility
4. Using low-cost index funds/ETFs

---

## C10. Voluntary Top-ups & Tax Relief

### 10.1 Cash Top-up Methods

Members can voluntarily top up their CPF accounts beyond mandatory contributions:

| Method | Destination Account | Age Restriction | Tax Relief |
|--------|---------------------|-----------------|------------|
| Cash top-up (self) | SA (before 55), RA (55+) | None | Yes |
| Cash top-up (family member) | SA/RA of recipient | None | Yes |
| OA → SA transfer | SA | Before 55 only | Yes |

### 10.2 RSTU (Retirement Sum Topping-Up Scheme) Tax Relief

| Beneficiary | Max Tax Relief per Year |
|-------------|-------------------------|
| Self (cash top-up to SA/RA or OA→SA transfer) | $8,000 |
| Family members (parents, grandparents, spouse, siblings) | $8,000 |
| **Combined Total Cap** | **$16,000** |

**Eligible Family Members:**
- Parents and grandparents (including in-laws)
- Spouse
- Siblings (including in-laws, if handicapped)

**Conditions:**
- Recipient must be Singapore Citizen or PR
- Top-up subject to prevailing FRS (cannot exceed FRS)
- For MediSave top-up: subject to BHS limit

```typescript
interface VoluntaryTopUp {
  type: 'CASH_TOPUP' | 'OA_TO_SA_TRANSFER' | 'MEDISAVE_TOPUP';
  amount: number;
  destination: 'SA' | 'RA' | 'MA';
  beneficiary: 'SELF' | 'FAMILY';
  beneficiaryRelation?: 'PARENT' | 'GRANDPARENT' | 'SPOUSE' | 'SIBLING';
  date: Date;
  taxReliefEligible: number;
}

function calculateRSTUTaxRelief(
  selfTopups: number,
  familyTopups: number
): { selfRelief: number; familyRelief: number; total: number } {
  const SELF_CAP = 8000;
  const FAMILY_CAP = 8000;

  const selfRelief = Math.min(selfTopups, SELF_CAP);
  const familyRelief = Math.min(familyTopups, FAMILY_CAP);

  return {
    selfRelief,
    familyRelief,
    total: selfRelief + familyRelief
  };
}

function maxTopUpAmount(
  currentSAorRA: number,
  frs: number,
  age: number
): number {
  // Top-up capped at FRS
  return Math.max(0, frs - currentSAorRA);
}
```

### 10.3 OA to SA Transfer Rules

**Key Rules:**
- **One-way only:** Cannot transfer SA → OA (irreversible)
- **Cap:** Up to current FRS minus existing SA balance
- **Age limit:** Not allowed after age 55
- **Tax relief:** Counts toward $8,000 self top-up limit

```typescript
function calculateMaxOAtoSATransfer(
  currentSA: number,
  currentOA: number,
  frs: number,
  age: number
): { maxTransfer: number; allowed: boolean; reason?: string } {
  if (age >= 55) {
    return {
      maxTransfer: 0,
      allowed: false,
      reason: 'OA to SA transfer not allowed after age 55'
    };
  }

  const saRoom = Math.max(0, frs - currentSA);
  const maxTransfer = Math.min(currentOA, saRoom);

  return {
    maxTransfer,
    allowed: maxTransfer > 0,
    reason: maxTransfer === 0 ? 'SA already at or above FRS' : undefined
  };
}
```

### 10.4 Post-55 Top-up Restrictions

After turning 55, the rules change significantly:

| Action | Allowed? | Notes |
|--------|----------|-------|
| Cash top-up to OA | ❌ No | Not permitted |
| Cash top-up to SA | ❌ No | SA closed at 55 (from 2025) |
| Cash top-up to RA | ✅ Yes | Up to ERS |
| OA → SA transfer | ❌ No | Not permitted |
| OA → RA transfer | ✅ Yes | SA must be transferred first |
| SA → RA transfer | ✅ Yes | Priority over OA |

```typescript
function getTopUpOptions(age: number): {
  cashTopUpDestinations: ('SA' | 'RA' | 'MA')[];
  transferOptions: ('OA_TO_SA' | 'OA_TO_RA' | 'SA_TO_RA')[];
} {
  if (age < 55) {
    return {
      cashTopUpDestinations: ['SA', 'MA'],
      transferOptions: ['OA_TO_SA']
    };
  } else {
    return {
      cashTopUpDestinations: ['RA', 'MA'],
      transferOptions: ['OA_TO_RA', 'SA_TO_RA']
    };
  }
}
```

### 10.5 MediSave Voluntary Contribution

**Annual Limit:** Up to BHS (subject to contribution cap)

**Tax Relief:** MediSave top-up is part of the same $8,000/$16,000 RSTU relief

```typescript
function calculateMediSaveTopUpLimit(
  currentMA: number,
  bhs: number
): number {
  return Math.max(0, bhs - currentMA);
}
```

---

## C11. SA Shielding Strategy

### 11.1 Problem Statement

At age 55, funds are transferred to RA in this order:
1. SA balance first (up to FRS)
2. Then OA balance (for any remaining FRS shortfall)

**Why this is suboptimal:**
- SA earns 4-5% interest
- OA earns only 2.5-3.5%
- Once in RA, funds are locked for CPF LIFE
- Better strategy: Let OA form the bulk of RA, keep SA earning higher interest

### 11.2 Shielding Mechanism

**Strategy:** Invest SA in SGS Bonds or T-Bills before turning 55

```
Timeline:
├── 6 months to 2 years before 55
│   └── Buy T-Bills/SGS Bonds using SA funds via CPFIS
│   └── SA balance decreases (funds now in investment)
│
├── Turn 55
│   └── RA formed from remaining SA (which is low) + OA
│   └── OA depleted first since SA is low
│   └── RA reaches FRS using mostly OA funds
│
├── After 55 (when instruments mature)
│   └── T-Bills/SGS mature
│   └── Proceeds return to SA (original source account)
│   └── SA now holds funds earning 4% (withdrawable anytime)
```

### 11.3 Day-Before Strategy (Optimized)

To minimize opportunity cost of having funds out of SA:

```typescript
interface SAShieldingPlan {
  targetAge55Date: Date;
  shieldingAmount: number;
  instruments: SAShieldingInstrument[];
  estimatedRAFormation: RAFormationEstimate;
}

interface SAShieldingInstrument {
  type: 'SGS_BOND' | 'T_BILL';
  purchaseDate: Date;
  maturityDate: Date;
  principal: number;
  yieldRate: number;
  tenure: '6_MONTH' | '1_YEAR' | '2_YEAR';
}

interface RAFormationEstimate {
  fromSA: number;   // Lower due to shielding
  fromOA: number;   // Higher due to shielding
  total: number;
  saPreserved: number; // Amount shielded
}

// Optimal strategy: Buy day before, sell day after
function planDayBeforeShielding(
  birthday55: Date,
  saBalance: number,
  oaBalance: number,
  frs: number
): SAShieldingPlan {
  // Amount to shield = max(SA - FRS_shortfall, 0)
  // We want RA to form primarily from OA
  const frsFromOA = Math.min(oaBalance, frs);
  const frsRemainder = frs - frsFromOA;

  // If OA can cover FRS, shield entire SA
  // Otherwise shield (SA - FRS_shortfall)
  const amountToShield = Math.max(0, saBalance - frsRemainder);

  return {
    targetAge55Date: birthday55,
    shieldingAmount: amountToShield,
    instruments: [{
      type: 'T_BILL',
      purchaseDate: new Date(birthday55.getTime() - 24*60*60*1000), // Day before
      maturityDate: new Date(birthday55.getTime() + 6*30*24*60*60*1000), // 6 months after
      principal: amountToShield,
      yieldRate: 0.035, // Example T-bill rate
      tenure: '6_MONTH'
    }],
    estimatedRAFormation: {
      fromSA: saBalance - amountToShield,
      fromOA: Math.min(oaBalance, frs - (saBalance - amountToShield)),
      total: frs,
      saPreserved: amountToShield
    }
  };
}
```

### 11.4 Benefits of SA Shielding

| Scenario | Without Shielding | With Shielding |
|----------|-------------------|----------------|
| SA Balance | Transferred to RA (4% locked) | Preserved in SA (4% withdrawable) |
| OA Balance | Remains in OA (2.5%) | Forms RA (4% in CPF LIFE) |
| Flexibility | Less (RA locked) | More (SA withdrawable) |
| Net Interest | Lower (OA at 2.5%) | Higher (SA at 4%) |

### 11.5 Risks and Considerations

1. **Market Risk:** Instrument value may fluctuate
2. **Timing Risk:** Must execute correctly around age 55
3. **Policy Risk:** Government may change rules
4. **Complexity:** Requires planning and monitoring

```typescript
function validateShieldingPlan(
  plan: SAShieldingPlan,
  currentDate: Date
): { valid: boolean; warnings: string[] } {
  const warnings: string[] = [];

  // Check timing
  const daysUntil55 = Math.floor(
    (plan.targetAge55Date.getTime() - currentDate.getTime()) / (24*60*60*1000)
  );

  if (daysUntil55 < 30) {
    warnings.push('Less than 30 days to execute - tight timeline');
  }

  if (daysUntil55 < 0) {
    return { valid: false, warnings: ['Already past age 55'] };
  }

  // Check instrument maturity
  for (const instrument of plan.instruments) {
    if (instrument.maturityDate < plan.targetAge55Date) {
      warnings.push(`Instrument matures before age 55 - funds will return to SA prematurely`);
    }
  }

  return { valid: true, warnings };
}
```

---

## C12. CPF Education Scheme

### 12.1 Overview

The CPF Education Scheme allows members to use OA funds to pay for approved full-time courses at local institutions, either for themselves or eligible family members.

### 12.2 Eligible Institutions

- **Universities:** NUS, NTU, SMU, SUTD, SUSS, SIT
- **Polytechnics:** All five polytechnics
- **ITE:** Institute of Technical Education
- **Selected Private Institutions:** LASALLE, NAFA (for specific courses)

### 12.3 Key Terms

| Parameter | Value |
|-----------|-------|
| Interest Rate | 2.5% p.a. (tied to OA rate) |
| Max Repayment Period | 12 years |
| Min Monthly Repayment | $100 |
| Interest Accrual Start | From withdrawal date |
| Grace Period | None (banks offer 6 months post-graduation) |

**Comparison with Bank Loans:**

| Feature | CPF Education Loan | Bank Education Loan |
|---------|-------------------|---------------------|
| Interest Rate | 2.5% | 4-5% |
| Interest Start | From withdrawal | 6 months after graduation |
| Repayment To | Own CPF OA | Bank |
| Breakeven | ~3 years (per FPL analysis) | - |

### 12.4 Eligible Borrowers

| Beneficiary | Relationship |
|-------------|--------------|
| Self | Own education |
| Child | Including legally adopted |
| Spouse | Legal spouse |
| Sibling | Brother/sister |

### 12.5 Loan Waiver Condition

The outstanding education loan can be waived if:
- Member is 55 years old or above, AND
- RA balance meets the FRS

```typescript
interface CPFEducationLoan {
  id: string;
  borrowerRelation: 'SELF' | 'CHILD' | 'SPOUSE' | 'SIBLING';
  borrowerName: string;
  institution: string;
  course: string;

  // Loan details
  principalWithdrawn: number;
  withdrawalDate: Date;
  interestRate: 0.025; // Fixed at OA rate

  // Repayment tracking
  totalRepaid: number;
  outstandingPrincipal: number;
  accruedInterest: number;

  // Schedule
  monthlyRepayment: number;
  repaymentStartDate: Date;
  expectedEndDate: Date;

  // Status
  status: 'ACTIVE' | 'FULLY_REPAID' | 'WAIVED';
  waiverDate?: Date;
}

function calculateEducationLoanBalance(
  principal: number,
  withdrawalDate: Date,
  currentDate: Date,
  totalRepaid: number
): { outstandingPrincipal: number; accruedInterest: number; total: number } {
  const INTEREST_RATE = 0.025;
  const monthsElapsed = differenceInMonths(currentDate, withdrawalDate);

  // Simple interest calculation (CPF uses this for education loans)
  // Note: Interest accrues from day of withdrawal
  const accruedInterest = principal * (INTEREST_RATE / 12) * monthsElapsed;

  const totalOwed = principal + accruedInterest;
  const outstanding = Math.max(0, totalOwed - totalRepaid);

  // Split outstanding into principal and interest
  const outstandingPrincipal = Math.max(0, principal - totalRepaid);
  const outstandingInterest = outstanding - outstandingPrincipal;

  return {
    outstandingPrincipal,
    accruedInterest: outstandingInterest,
    total: outstanding
  };
}

function calculateMinMonthlyRepayment(
  outstandingBalance: number,
  remainingMonths: number
): number {
  const MIN_PAYMENT = 100;
  const calculatedPayment = Math.ceil(outstandingBalance / remainingMonths);
  return Math.max(MIN_PAYMENT, calculatedPayment);
}

function checkLoanWaiverEligibility(
  memberAge: number,
  raBalance: number,
  frs: number
): { eligible: boolean; reason?: string } {
  if (memberAge < 55) {
    return { eligible: false, reason: 'Must be 55 years old or above' };
  }

  if (raBalance < frs) {
    return {
      eligible: false,
      reason: `RA balance ($${raBalance}) below FRS ($${frs})`
    };
  }

  return { eligible: true };
}
```

### 12.6 Withdrawal Limits

| Criteria | Max Withdrawal |
|----------|----------------|
| Per Course | Course fees + compulsory charges |
| Lifetime | No specific cap (subject to OA balance) |

**Note:** Cannot withdraw more than the approved course fees. Excess funds for living expenses must come from other sources.

### 12.7 Repayment Process

Repayments go back to the member's own CPF OA:
1. Interest earned on repayments = OA interest rate (2.5%)
2. No late payment fees (but interest continues to accrue)
3. Can make lump sum payments anytime

```typescript
function processEducationLoanRepayment(
  loan: CPFEducationLoan,
  repaymentAmount: number,
  repaymentDate: Date
): {
  appliedToPrincipal: number;
  appliedToInterest: number;
  newOutstanding: number;
  toMemberOA: number;
} {
  const balance = calculateEducationLoanBalance(
    loan.principalWithdrawn,
    loan.withdrawalDate,
    repaymentDate,
    loan.totalRepaid
  );

  // Payment applied to interest first, then principal
  const appliedToInterest = Math.min(repaymentAmount, balance.accruedInterest);
  const appliedToPrincipal = repaymentAmount - appliedToInterest;

  const newOutstanding = Math.max(0, balance.total - repaymentAmount);

  return {
    appliedToPrincipal,
    appliedToInterest,
    newOutstanding,
    toMemberOA: repaymentAmount // Goes back to own OA
  };
}
```

---

## D. Flowcharts

### D1. Monthly CPF Contribution Computation

```
┌─────────────────────────────────────────────────────────────────────┐
│                    MONTHLY CPF CONTRIBUTION FLOW                     │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
                    ┌───────────────────────────────┐
                    │   RECEIVE MONTHLY WAGES       │
                    │   (Gross Salary + Allowances) │
                    └───────────────┬───────────────┘
                                    │
                                    ▼
                    ┌───────────────────────────────┐
                    │   CLASSIFY WAGE COMPONENTS    │
                    │   ┌─────────┐  ┌──────────┐  │
                    │   │   OW    │  │    AW    │  │
                    │   │ Monthly │  │  Bonus/  │  │
                    │   │ Regular │  │ Irregular│  │
                    │   └────┬────┘  └────┬─────┘  │
                    └────────┼────────────┼────────┘
                             │            │
                             ▼            ▼
                    ┌─────────────────────────────────────┐
                    │        APPLY WAGE CEILINGS          │
                    │                                     │
                    │  OW: min(OW, $7,400)               │
                    │  AW: min(AW, $102K - YTD_OW)       │
                    └─────────────────┬───────────────────┘
                                      │
                                      ▼
                    ┌─────────────────────────────────────┐
                    │     DETERMINE MEMBER CATEGORY       │
                    │                                     │
                    │  ┌─────────┐ ┌─────────┐ ┌───────┐ │
                    │  │Citizen/ │ │ 1st Yr  │ │ 2nd Yr│ │
                    │  │ PR 3yr+ │ │   PR    │ │   PR  │ │
                    │  └────┬────┘ └────┬────┘ └───┬───┘ │
                    └───────┼───────────┼──────────┼─────┘
                            │           │          │
                            ▼           ▼          ▼
                    ┌─────────────────────────────────────┐
                    │      DETERMINE AGE BAND             │
                    │                                     │
                    │  ≤55 │ 55-60 │ 60-65 │ 65-70 │ >70 │
                    └─────────────────┬───────────────────┘
                                      │
                                      ▼
                    ┌─────────────────────────────────────┐
                    │      LOOKUP CONTRIBUTION RATES      │
                    │                                     │
                    │  Employee Rate: X%                  │
                    │  Employer Rate: Y%                  │
                    │  Total Rate: X% + Y%                │
                    └─────────────────┬───────────────────┘
                                      │
                                      ▼
                    ┌─────────────────────────────────────┐
                    │      CALCULATE RAW CONTRIBUTIONS    │
                    │                                     │
                    │  Raw_Total = Wages × Total_Rate     │
                    │  Raw_Employee = Wages × Emp_Rate    │
                    └─────────────────┬───────────────────┘
                                      │
                                      ▼
                    ┌─────────────────────────────────────┐
                    │      APPLY ROUNDING RULES           │
                    │                                     │
                    │  Total: Round to nearest $          │
                    │  Employee: Always round DOWN        │
                    │  Employer: Total - Employee         │
                    └─────────────────┬───────────────────┘
                                      │
                                      ▼
                    ┌─────────────────────────────────────┐
                    │      ALLOCATE TO ACCOUNTS           │
                    │                                     │
                    │  ┌────┐  ┌────┐  ┌────┐            │
                    │  │ OA │  │ SA │  │ MA │            │
                    │  │ X% │  │ Y% │  │ Z% │            │
                    │  └────┘  └────┘  └────┘            │
                    └─────────────────┬───────────────────┘
                                      │
                                      ▼
                    ┌─────────────────────────────────────┐
                    │      CHECK MA vs BHS                │
                    │                                     │
                    │  If MA + Alloc > BHS:              │
                    │    Excess → SA/RA (up to FRS)      │
                    │    Then → OA                       │
                    └─────────────────────────────────────┘
```

### D2. MediSave BHS Spillover

```
┌─────────────────────────────────────────────────────────────────────┐
│                    MEDISAVE BHS SPILLOVER FLOW                       │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
                    ┌───────────────────────────────┐
                    │   MA CONTRIBUTION RECEIVED    │
                    │   Amount: $X                  │
                    └───────────────┬───────────────┘
                                    │
                                    ▼
                    ┌───────────────────────────────┐
                    │   CHECK: Current_MA + $X      │
                    │          vs BHS               │
                    └───────────────┬───────────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    │                               │
                    ▼                               ▼
            ┌───────────────┐               ┌───────────────┐
            │  ≤ BHS        │               │  > BHS        │
            │               │               │               │
            │ Credit all    │               │ Calculate     │
            │ to MA         │               │ Excess        │
            └───────────────┘               └───────┬───────┘
                                                    │
                                                    ▼
                                    ┌───────────────────────────────┐
                                    │   Credit MA up to BHS         │
                                    │   To_MA = BHS - Current_MA    │
                                    │   Excess = $X - To_MA         │
                                    └───────────────┬───────────────┘
                                                    │
                                                    ▼
                                    ┌───────────────────────────────┐
                                    │   CHECK MEMBER AGE            │
                                    └───────────────┬───────────────┘
                                                    │
                                    ┌───────────────┴───────────────┐
                                    │                               │
                                    ▼                               ▼
                            ┌───────────────┐               ┌───────────────┐
                            │  Age < 55     │               │  Age ≥ 55     │
                            │               │               │               │
                            │ Check SA      │               │ Check RA      │
                            │ vs FRS        │               │ vs FRS        │
                            └───────┬───────┘               └───────┬───────┘
                                    │                               │
                                    ▼                               ▼
                    ┌───────────────────────────────┐   ┌───────────────────────────────┐
                    │  SA Room = FRS - Current_SA   │   │  RA Room = FRS - Current_RA   │
                    │                               │   │                               │
                    │  To_SA = min(Excess, SA_Room) │   │  To_RA = min(Excess, RA_Room) │
                    │  Remaining = Excess - To_SA   │   │  Remaining = Excess - To_RA   │
                    └───────────────┬───────────────┘   └───────────────┬───────────────┘
                                    │                               │
                                    └───────────────┬───────────────┘
                                                    │
                                                    ▼
                                    ┌───────────────────────────────┐
                                    │   ANY REMAINING EXCESS?       │
                                    └───────────────┬───────────────┘
                                                    │
                                    ┌───────────────┴───────────────┐
                                    │                               │
                                    ▼                               ▼
                            ┌───────────────┐               ┌───────────────┐
                            │  No           │               │  Yes          │
                            │               │               │               │
                            │ Done          │               │ Credit to OA  │
                            └───────────────┘               └───────────────┘
```

### D3. Retirement Account Creation at Age 55

```
┌─────────────────────────────────────────────────────────────────────┐
│                    RA CREATION AT AGE 55                             │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
                    ┌───────────────────────────────┐
                    │   MEMBER TURNS 55             │
                    │   Get applicable FRS          │
                    └───────────────┬───────────────┘
                                    │
                                    ▼
                    ┌───────────────────────────────┐
                    │   CREATE RETIREMENT ACCOUNT   │
                    │   Initial Balance: $0         │
                    └───────────────┬───────────────┘
                                    │
                                    ▼
                    ┌───────────────────────────────┐
                    │   STEP 1: TRANSFER SA → RA    │
                    │                               │
                    │   Transfer = min(SA, FRS)     │
                    │   Remaining_FRS = FRS - SA    │
                    └───────────────┬───────────────┘
                                    │
                                    ▼
                    ┌───────────────────────────────┐
                    │   IS SA ≥ FRS?                │
                    └───────────────┬───────────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    │                               │
                    ▼                               ▼
            ┌───────────────┐               ┌───────────────┐
            │  Yes          │               │  No           │
            │               │               │               │
            │ RA = FRS      │               │ Need OA       │
            │ SA_excess     │               │ transfer      │
            │ withdrawable  │               │               │
            └───────────────┘               └───────┬───────┘
                                                    │
                                                    ▼
                                    ┌───────────────────────────────┐
                                    │   STEP 2: TRANSFER OA → RA    │
                                    │                               │
                                    │   Need = Remaining_FRS        │
                                    │   Transfer = min(OA, Need)    │
                                    └───────────────┬───────────────┘
                                                    │
                                                    ▼
                                    ┌───────────────────────────────┐
                                    │   CALCULATE FINAL BALANCES    │
                                    │                               │
                                    │   RA = SA_transfer + OA_trans │
                                    │   OA_new = OA - OA_transfer   │
                                    │   SA_new = SA - SA_transfer   │
                                    └───────────────┬───────────────┘
                                                    │
                                                    ▼
                                    ┌───────────────────────────────┐
                                    │   CALCULATE WITHDRAWABLE      │
                                    │                               │
                                    │   Withdrawable = OA_new       │
                                    │                + SA_new       │
                                    │   (Amount above FRS)          │
                                    └───────────────────────────────┘
```

### D4. CPF LIFE Payout Decision

```
┌─────────────────────────────────────────────────────────────────────┐
│                    CPF LIFE PAYOUT FLOW                              │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
                    ┌───────────────────────────────┐
                    │   MEMBER TURNS 65             │
                    │   RA Balance: $X              │
                    └───────────────┬───────────────┘
                                    │
                                    ▼
                    ┌───────────────────────────────┐
                    │   CHECK ELIGIBILITY           │
                    │   RA ≥ $60,000?               │
                    └───────────────┬───────────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    │                               │
                    ▼                               ▼
            ┌───────────────┐               ┌───────────────┐
            │  No           │               │  Yes          │
            │               │               │               │
            │ Not enrolled  │               │ Auto-enrolled │
            │ in CPF LIFE   │               │ in CPF LIFE   │
            │               │               │               │
            │ RA drawdown   │               └───────┬───────┘
            │ until depleted│                       │
            └───────────────┘                       ▼
                                    ┌───────────────────────────────┐
                                    │   SELECT CPF LIFE PLAN        │
                                    │                               │
                                    │  ┌──────────┐ ┌──────────┐   │
                                    │  │ Standard │ │  Basic   │   │
                                    │  │ Higher $ │ │ Higher   │   │
                                    │  │ Lower    │ │ Bequest  │   │
                                    │  │ Bequest  │ │ Lower $  │   │
                                    │  └──────────┘ └──────────┘   │
                                    │       ┌──────────┐           │
                                    │       │Escalating│           │
                                    │       │  +2%/yr  │           │
                                    │       │ Lower    │           │
                                    │       │ Initial  │           │
                                    │       └──────────┘           │
                                    └───────────────┬───────────────┘
                                                    │
                                                    ▼
                                    ┌───────────────────────────────┐
                                    │   DEFER PAYOUTS?              │
                                    │   (Up to age 70)              │
                                    └───────────────┬───────────────┘
                                                    │
                                    ┌───────────────┴───────────────┐
                                    │                               │
                                    ▼                               ▼
                            ┌───────────────┐               ┌───────────────┐
                            │  Start at 65  │               │  Defer        │
                            │               │               │               │
                            │ Base payout   │               │ +7% per year  │
                            │               │               │ deferred      │
                            └───────┬───────┘               └───────┬───────┘
                                    │                               │
                                    └───────────────┬───────────────┘
                                                    │
                                                    ▼
                                    ┌───────────────────────────────┐
                                    │   MONTHLY PAYOUT BEGINS       │
                                    │                               │
                                    │   Payout for life             │
                                    │   (No matter how long)        │
                                    └───────────────────────────────┘
```

### D5. SRS Withdrawal Decision Tree

```
┌─────────────────────────────────────────────────────────────────────┐
│                    SRS WITHDRAWAL DECISION                           │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
                    ┌───────────────────────────────┐
                    │   WITHDRAWAL REQUEST          │
                    │   Amount: $X                  │
                    │   Current Age: Y              │
                    │   Stat. Retirement Age: Z     │
                    └───────────────┬───────────────┘
                                    │
                                    ▼
                    ┌───────────────────────────────┐
                    │   IS Age ≥ Stat. Ret. Age?    │
                    └───────────────┬───────────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    │                               │
                    ▼                               ▼
            ┌───────────────┐               ┌───────────────┐
            │  NO           │               │  YES          │
            │  (Early)      │               │  (Retirement) │
            └───────┬───────┘               └───────┬───────┘
                    │                               │
                    ▼                               ▼
    ┌───────────────────────────────┐   ┌───────────────────────────────┐
    │   EXCEPTIONAL CIRCUMSTANCES?  │   │   WITHIN 10-YEAR WINDOW?      │
    │   (Death/Terminal/Medical)    │   │                               │
    └───────────────┬───────────────┘   └───────────────┬───────────────┘
                    │                               │
            ┌───────┴───────┐               ┌───────┴───────┐
            │               │               │               │
            ▼               ▼               ▼               ▼
    ┌───────────┐   ┌───────────┐   ┌───────────┐   ┌───────────┐
    │   YES     │   │   NO      │   │   YES     │   │   NO      │
    │           │   │           │   │           │   │ (After 10 │
    │ 50% taxed │   │ 100% taxed│   │ 50% taxed │   │  years)   │
    │ No penalty│   │ + 5%      │   │ No penalty│   │           │
    │           │   │ penalty   │   │           │   │ Balance   │
    │ Up to $400K│  │           │   │           │   │ deemed    │
    │ exempt if │   │           │   │           │   │ withdrawn │
    │ death/    │   │           │   │           │   │ 50% taxed │
    │ terminal  │   │           │   │           │   │           │
    └───────────┘   └───────────┘   └───────────┘   └───────────┘
            │               │               │               │
            └───────────────┴───────────────┴───────────────┘
                                    │
                                    ▼
                    ┌───────────────────────────────┐
                    │   CALCULATE TAX LIABILITY     │
                    │                               │
                    │   Taxable_Amount × Tax_Rate   │
                    │   + Any Penalty               │
                    └───────────────────────────────┘
```

---

## E. TypeScript Schemas

### E1. Core Type Definitions

```typescript
// ============================================================
// ENUMS AND CONSTANTS
// ============================================================

export enum ResidencyStatus {
  CITIZEN = 'CITIZEN',
  PR_YEAR_1 = 'PR_YEAR_1',
  PR_YEAR_2 = 'PR_YEAR_2',
  PR_YEAR_3_PLUS = 'PR_YEAR_3_PLUS',
  FOREIGNER = 'FOREIGNER'
}

export enum PropertyType {
  HDB_BTO = 'HDB_BTO',
  HDB_RESALE = 'HDB_RESALE',
  HDB_DBSS = 'HDB_DBSS',
  PRIVATE_CONDO = 'PRIVATE_CONDO',
  PRIVATE_LANDED = 'PRIVATE_LANDED'
}

export enum LoanType {
  HDB_LOAN = 'HDB_LOAN',
  BANK_LOAN = 'BANK_LOAN',
  CASH = 'CASH'
}

export enum CPFAccountType {
  OA = 'OA',
  SA = 'SA',
  MA = 'MA',
  RA = 'RA'
}

export enum CPFLifePlanType {
  STANDARD = 'STANDARD',
  BASIC = 'BASIC',
  ESCALATING = 'ESCALATING'
}

export enum GenerationSubsidy {
  NONE = 'NONE',
  PIONEER = 'PIONEER',
  MERDEKA = 'MERDEKA'
}

// ============================================================
// INPUT SCHEMAS
// ============================================================

export interface PersonProfile {
  id: string;
  dateOfBirth: Date;
  residencyStatus: ResidencyStatus;
  prGrantDate?: Date; // For PRs: when PR was granted
  generationSubsidy: GenerationSubsidy;

  // Calculated/derived
  readonly currentAge: number;
  readonly ageForCPF: (referenceDate: Date) => number;
}

export interface EmploymentIncome {
  id: string;
  employerId: string;
  employerName: string;

  // Monthly recurring
  monthlyBaseSalary: number;
  monthlyAllowances: number;
  monthlyOvertimePay: number;

  // One-time / irregular (Additional Wages)
  annualBonus?: number;
  bonusPaymentMonth?: number; // 1-12
  otherAW: AdditionalWagePayment[];

  // Employment period
  startDate: Date;
  endDate?: Date; // null if ongoing

  // Calculation helpers
  readonly totalMonthlyOW: number;
  readonly ytdOWSubjectToCPF: number;
}

export interface AdditionalWagePayment {
  description: string;
  amount: number;
  paymentDate: Date;
}

export interface CPFBalances {
  asOfDate: Date;
  OA: number;
  SA: number;
  MA: number;
  RA: number; // 0 if member < 55

  // For interest calculation
  readonly combinedBalance: number;
  readonly combinedBalanceExcludingOA: number;
}

export interface CPFBalanceHistory {
  snapshots: CPFBalanceSnapshot[];
}

export interface CPFBalanceSnapshot {
  date: Date;
  OA: number;
  SA: number;
  MA: number;
  RA: number;
  event?: string; // e.g., "Monthly contribution", "Interest credit"
}

export interface PropertyPurchase {
  id: string;
  propertyType: PropertyType;
  purchasePrice: number;
  marketValuation: number;
  purchaseDate: Date;

  loanType: LoanType;
  loanAmount: number;
  loanTenureYears: number;
  interestRate: number; // Annual rate

  remainingLeaseYears: number; // For leasehold

  // CPF usage
  cpfUsedForDownpayment: number;
  cpfUsedForMonthlyInstalment: boolean;

  // Ownership
  ownershipPercentage: number; // 0-100
}

export interface PropertyCPFWithdrawal {
  propertyId: string;
  withdrawalDate: Date;
  principalAmount: number;
  purpose: 'DOWNPAYMENT' | 'INSTALMENT' | 'STAMP_DUTY' | 'LEGAL_FEES';
}

export interface InsurancePolicy {
  id: string;
  type: 'MEDISHIELD_LIFE' | 'INTEGRATED_SHIELD' | 'LIFE' | 'DISABILITY';
  insurer?: string;

  // For ISP
  wardClass?: 'B2C' | 'B1' | 'A' | 'PRIVATE';
  hasRider?: boolean;

  annualPremium: number;
  mediShieldLifeComponent?: number; // For ISP
  additionalPrivateComponent?: number; // For ISP

  startDate: Date;
  endDate?: Date;
}

export interface SRSAccount {
  operatorBank: 'DBS' | 'OCBC' | 'UOB';
  accountOpenDate: Date;
  firstContributionDate?: Date;

  currentBalance: number;
  totalContributions: number;
  totalWithdrawals: number;

  // For withdrawal calculations
  firstPenaltyFreeWithdrawalDate?: Date;

  // Investment breakdown (optional)
  investments?: SRSInvestment[];
}

export interface SRSInvestment {
  instrumentType: 'FIXED_DEPOSIT' | 'SHARES' | 'UNIT_TRUST' | 'BOND' | 'INSURANCE';
  description: string;
  currentValue: number;
  purchaseValue: number;
  purchaseDate: Date;
}

export interface SRSContribution {
  date: Date;
  amount: number;
  yearOfAssessment: number;
}

export interface SRSWithdrawal {
  date: Date;
  amount: number;
  isEarlyWithdrawal: boolean;
  isExceptionalCircumstance: boolean;
  taxableAmount: number;
  penalty: number;
}

// ============================================================
// CONFIGURATION SCHEMAS
// ============================================================

export interface CPFConfiguration {
  year: number;
  effectiveFrom: Date;
  effectiveTo?: Date;

  owCeiling: number;
  annualSalaryCeiling: number;
  cpfAnnualLimit: number;

  contributionRates: ContributionRateTable;
  allocationRates: AllocationRateTable;

  interestRates: InterestRateConfig;

  retirementSums: RetirementSumConfig;

  bhs: number;
}

export interface ContributionRateTable {
  citizenAndPR3Plus: AgeBasedRates;
  prYear1: AgeBasedRates;
  prYear2: AgeBasedRates;
}

export interface AgeBasedRates {
  upTo55: ContributionRatePair;
  above55To60: ContributionRatePair;
  above60To65: ContributionRatePair;
  above65To70: ContributionRatePair;
  above70: ContributionRatePair;
}

export interface ContributionRatePair {
  employee: number; // e.g., 0.20 for 20%
  employer: number; // e.g., 0.17 for 17%
}

export interface AllocationRateTable {
  upTo35: AllocationRates;
  above35To45: AllocationRates;
  above45To50: AllocationRates;
  above50To55: AllocationRates;
  above55To60: AllocationRates;
  above60To65: AllocationRates;
  above65To70: AllocationRates;
  above70: AllocationRates;
}

export interface AllocationRates {
  OA: number;
  SA: number;
  MA: number;
}

export interface InterestRateConfig {
  OA: {
    base: number;
    floor: number;
  };
  SMRA: { // SA, MA, RA
    base: number;
    floor: number;
  };
  extraInterest: {
    below55: {
      rate: number;
      combinedCap: number;
      oaCap: number;
    };
    age55AndAbove: {
      firstTierRate: number;
      firstTierCap: number;
      secondTierRate: number;
      secondTierCap: number;
      oaCap: number;
    };
  };
}

export interface RetirementSumConfig {
  brs: number;
  frs: number;
  ers: number;
  ersMultiplier: number; // 3 or 4
}

export interface MediShieldLifeConfig {
  effectiveFrom: Date;
  premiumTable: AgePremiumEntry[];
  subsidyTiers: SubsidyTier[];
  deductibles: DeductibleConfig;
  coInsurance: CoInsuranceConfig;
  annualClaimLimit: number;
}

export interface AgePremiumEntry {
  minAge: number;
  maxAge: number;
  annualPremium: number;
}

export interface SubsidyTier {
  maxIncomePerPerson: number;
  citizenRate: number;
  prRate: number;
}

export interface DeductibleConfig {
  inpatient: {
    below81: number;
    age81AndAbove: number;
  };
  outpatient: number; // From 2026
}

export interface CoInsuranceConfig {
  tiers: CoInsuranceTier[];
}

export interface CoInsuranceTier {
  upToAmount: number;
  rate: number;
}

export interface SRSConfiguration {
  citizenPRCap: number;
  foreignerCap: number;
  overallReliefCap: number;
  earlyWithdrawalPenalty: number;
  retirementWithdrawalTaxRate: number; // 0.5 for 50% taxable
  deathExemptionCap: number;
}

// ============================================================
// OUTPUT SCHEMAS
// ============================================================

export interface MonthlyContributionResult {
  month: Date;
  employeeId: string;
  employerId: string;

  // Wages
  grossOW: number;
  grossAW: number;
  cappedOW: number;
  cappedAW: number;
  totalWagesSubjectToCPF: number;

  // Contributions
  employeeContribution: number;
  employerContribution: number;
  totalContribution: number;

  // Allocation
  toOA: number;
  toSA: number;
  toMA: number;
  toRA: number; // If age 55+ and SA closed

  // Spillover (if MA exceeds BHS)
  maSpilloverToSA: number;
  maSpilloverToRA: number;
  maSpilloverToOA: number;

  // Metadata
  ageForContribution: number;
  residencyStatus: ResidencyStatus;
  ratesApplied: {
    employeeRate: number;
    employerRate: number;
    allocationRates: AllocationRates;
  };
}

export interface MonthlyInterestResult {
  month: Date;

  // Base interest
  oaBaseInterest: number;
  saBaseInterest: number;
  maBaseInterest: number;
  raBaseInterest: number;

  // Extra interest (credited to SA or RA)
  extraInterestEarned: number;
  extraInterestCreditedTo: 'SA' | 'RA';

  // Total
  totalInterestEarned: number;

  // Running balances (after interest)
  endingOA: number;
  endingSA: number;
  endingMA: number;
  endingRA: number;
}

export interface AccountProjection {
  startDate: Date;
  endDate: Date;
  monthly: MonthlyProjectionSnapshot[];
  yearly: YearlyProjectionSnapshot[];

  // Key milestones
  milestones: ProjectionMilestone[];
}

export interface MonthlyProjectionSnapshot {
  date: Date;
  OA: number;
  SA: number;
  MA: number;
  RA: number;

  contributions: number;
  interest: number;
  withdrawals: number;

  cumulativeContributions: number;
  cumulativeInterest: number;
}

export interface YearlyProjectionSnapshot {
  year: number;
  endOfYearOA: number;
  endOfYearSA: number;
  endOfYearMA: number;
  endOfYearRA: number;

  yearContributions: number;
  yearInterest: number;
  yearWithdrawals: number;
}

export interface ProjectionMilestone {
  type: 'AGE_55' | 'AGE_65' | 'BHS_REACHED' | 'FRS_REACHED' | 'PROPERTY_PAID_OFF';
  date: Date;
  description: string;
  balances: CPFBalances;
}

export interface RetirementProjection {
  currentAge: number;
  projectedAge55Balances: CPFBalances;
  projectedRAAtAge65: number;

  retirementSums: {
    brs: number;
    frs: number;
    ers: number;
    yearTurning55: number;
  };

  cpfLifeEstimates: {
    standard: MonthlyPayoutEstimate;
    basic: MonthlyPayoutEstimate;
    escalating: MonthlyPayoutEstimate;
  };

  withdrawableAt55: number;
}

export interface MonthlyPayoutEstimate {
  planType: CPFLifePlanType;
  startAge: number;
  initialMonthlyPayout: number;
  payoutRangeMin: number;
  payoutRangeMax: number;
  bequest: number;
}

export interface HousingAnalysis {
  propertyId: string;

  // Limits
  valuationLimit: number;
  withdrawalLimit: number;

  // CPF usage
  maxCPFAllowedUpToVL: number;
  maxCPFAllowedVLToWL: number;
  brsRequiredForVLToWL: boolean;

  // Accrued interest
  cpfUsedToDate: number;
  accruedInterestToDate: number;
  totalRefundRequired: number;

  // Remaining lease analysis
  leaseCoversToAge95: boolean;
  prorationFactor: number;
}

export interface SRSAnalysis {
  currentBalance: number;
  ytdContributions: number;
  remainingContributionRoom: number;

  statutoryRetirementAge: number;
  yearsUntilRetirement: number;

  // Tax analysis
  contributionTaxSavings: number; // Based on marginal tax rate

  // Withdrawal analysis
  isInWithdrawalWindow: boolean;
  withdrawalWindowEndDate?: Date;

  estimatedTaxOnFullWithdrawal: number;
  estimatedPenaltyOnEarlyWithdrawal: number;
}

// ============================================================
// SIMULATION ENGINE INTERFACES
// ============================================================

export interface SimulationInput {
  profile: PersonProfile;
  employment: EmploymentIncome[];
  currentBalances: CPFBalances;
  properties: PropertyPurchase[];
  insurance: InsurancePolicy[];
  srs?: SRSAccount;

  // Simulation parameters
  simulationStartDate: Date;
  simulationEndDate: Date;
  assumedSalaryGrowthRate?: number;
  assumedInflationRate?: number;
}

export interface SimulationOutput {
  projection: AccountProjection;
  retirement: RetirementProjection;
  housing: HousingAnalysis[];
  srs?: SRSAnalysis;

  // Detailed monthly breakdown
  monthlyDetails: MonthlySimulationResult[];

  // Warnings and recommendations
  warnings: SimulationWarning[];
  recommendations: SimulationRecommendation[];
}

export interface MonthlySimulationResult {
  month: Date;
  contribution?: MonthlyContributionResult;
  interest: MonthlyInterestResult;
  withdrawals: WithdrawalEvent[];
  events: LifeEvent[];
  endingBalances: CPFBalances;
}

export interface WithdrawalEvent {
  type: 'HOUSING' | 'MEDICAL' | 'RETIREMENT' | 'SRS';
  amount: number;
  fromAccount: CPFAccountType | 'SRS';
  description: string;
}

export interface LifeEvent {
  type: 'TURN_55' | 'TURN_65' | 'SA_CLOSURE' | 'CPF_LIFE_START';
  date: Date;
  description: string;
  impact: string;
}

export interface SimulationWarning {
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  category: 'RETIREMENT' | 'HOUSING' | 'HEALTHCARE' | 'TAX';
  message: string;
  recommendation?: string;
}

export interface SimulationRecommendation {
  category: 'SA_TOPUP' | 'MA_TOPUP' | 'SRS_CONTRIBUTION' | 'HOUSING_STRATEGY';
  title: string;
  description: string;
  potentialBenefit: string;
  priority: number;
}
```

### E2. Sample Configuration Data (2025)

```typescript
export const CPF_CONFIG_2025: CPFConfiguration = {
  year: 2025,
  effectiveFrom: new Date('2025-01-01'),

  owCeiling: 7400,
  annualSalaryCeiling: 102000,
  cpfAnnualLimit: 37740,

  contributionRates: {
    citizenAndPR3Plus: {
      upTo55: { employee: 0.20, employer: 0.17 },
      above55To60: { employee: 0.155, employer: 0.17 },
      above60To65: { employee: 0.105, employer: 0.13 },
      above65To70: { employee: 0.075, employer: 0.09 },
      above70: { employee: 0.05, employer: 0.075 }
    },
    prYear1: {
      upTo55: { employee: 0.05, employer: 0.04 },
      above55To60: { employee: 0.05, employer: 0.04 },
      above60To65: { employee: 0.05, employer: 0.04 },
      above65To70: { employee: 0.05, employer: 0.04 },
      above70: { employee: 0.05, employer: 0.04 }
    },
    prYear2: {
      upTo55: { employee: 0.15, employer: 0.09 },
      above55To60: { employee: 0.125, employer: 0.09 },
      above60To65: { employee: 0.075, employer: 0.06 },
      above65To70: { employee: 0.05, employer: 0.06 },
      above70: { employee: 0.05, employer: 0.06 }
    }
  },

  allocationRates: {
    upTo35: { OA: 0.6216, SA: 0.1622, MA: 0.2162 },
    above35To45: { OA: 0.5676, SA: 0.1892, MA: 0.2432 },
    above45To50: { OA: 0.5135, SA: 0.2162, MA: 0.2703 },
    above50To55: { OA: 0.4054, SA: 0.3108, MA: 0.2838 },
    above55To60: { OA: 0.3692, SA: 0.1077, MA: 0.5231 },
    above60To65: { OA: 0.1489, SA: 0.1064, MA: 0.7447 },
    above65To70: { OA: 0.0606, SA: 0.0606, MA: 0.8788 },
    above70: { OA: 0.08, SA: 0.08, MA: 0.84 }
  },

  interestRates: {
    OA: { base: 0.025, floor: 0.025 },
    SMRA: { base: 0.04, floor: 0.04 },
    extraInterest: {
      below55: {
        rate: 0.01,
        combinedCap: 60000,
        oaCap: 20000
      },
      age55AndAbove: {
        firstTierRate: 0.02,
        firstTierCap: 30000,
        secondTierRate: 0.01,
        secondTierCap: 30000,
        oaCap: 20000
      }
    }
  },

  retirementSums: {
    brs: 106500,
    frs: 213000,
    ers: 426000,
    ersMultiplier: 4
  },

  bhs: 75500
};

export const SRS_CONFIG_2025: SRSConfiguration = {
  citizenPRCap: 15300,
  foreignerCap: 35700,
  overallReliefCap: 80000,
  earlyWithdrawalPenalty: 0.05,
  retirementWithdrawalTaxRate: 0.5,
  deathExemptionCap: 400000
};
```

---

## F. Worked Examples

### F1. Salary + Bonus (AW Ceiling Edge Case)

**Scenario:**
- Employee: Alice, age 32, Singapore Citizen
- Monthly salary: $8,000
- Annual bonus: $50,000 (paid in December)
- Year: 2025

**Step-by-Step Calculation:**

**Monthly OW Calculation (January to November):**
```
Gross OW: $8,000
OW Ceiling: $7,400
Capped OW: $7,400

Employee Rate: 20%
Employer Rate: 17%
Total Rate: 37%

Raw Employee Share: $7,400 × 20% = $1,480
Raw Total: $7,400 × 37% = $2,738

After Rounding:
- Total: $2,738 (no rounding needed)
- Employee: $1,480 (drops cents, but no cents here)
- Employer: $2,738 - $1,480 = $1,258
```

**AW Ceiling Calculation (December):**
```
YTD OW Subject to CPF: $7,400 × 11 = $81,400
AW Ceiling: $102,000 - $81,400 = $20,600

Gross AW (Bonus): $50,000
Capped AW: $20,600

December Total Wages: $7,400 (OW) + $20,600 (AW) = $28,000
```

**December Contribution:**
```
Total Contribution: $28,000 × 37% = $10,360
Employee Share: $28,000 × 20% = $5,600
Employer Share: $10,360 - $5,600 = $4,760
```

**Annual Summary:**
```
Total OW Subject to CPF: $7,400 × 12 = $88,800
Total AW Subject to CPF: $20,600
Total Wages Subject to CPF: $109,400 (exceeds $102K, but individual ceilings apply)

Total Annual CPF: ($2,738 × 11) + $10,360 = $30,118 + $10,360 = $40,478
Total Employee Share: ($1,480 × 11) + $5,600 = $16,280 + $5,600 = $21,880
Total Employer Share: $40,478 - $21,880 = $18,598
```

**Account Allocation (Age 32):**
```
Allocation Rates: OA 62.16%, SA 16.22%, MA 21.62%

January-November (per month):
- To OA: $2,738 × 62.16% = $1,702
- To SA: $2,738 × 16.22% = $444
- To MA: $2,738 × 21.62% = $592

December:
- To OA: $10,360 × 62.16% = $6,440
- To SA: $10,360 × 16.22% = $1,680
- To MA: $10,360 × 21.62% = $2,240

Annual Total:
- To OA: ($1,702 × 11) + $6,440 = $18,722 + $6,440 = $25,162
- To SA: ($444 × 11) + $1,680 = $4,884 + $1,680 = $6,564
- To MA: ($592 × 11) + $2,240 = $6,512 + $2,240 = $8,752
```

---

### F2. Turning 55 Mid-Year

**Scenario:**
- Employee: Bob, age 54 turning 55 on June 15, 2025
- Monthly salary: $6,000
- CPF Balances on Jan 1, 2025:
  - OA: $180,000
  - SA: $120,000
  - MA: $50,000
- Applicable FRS (turning 55 in 2025): $213,000

**Contribution Rate Transition:**

```
January - May (Age 54):
- Employee Rate: 20%
- Employer Rate: 17%
- Total: 37%
- Monthly Contribution: $6,000 × 37% = $2,220

June - December (Age 55):
- Employee Rate: 15.5%
- Employer Rate: 17%
- Total: 32.5%
- Monthly Contribution: $6,000 × 32.5% = $1,950
```

**Account Allocation Transition:**

```
January - May (Age 50-55 allocation):
- OA: 40.54%
- SA: 31.08%
- MA: 28.38%

June - December (Age 55-60 allocation):
- OA: 36.92%
- SA: 10.77% → Now goes to RA (SA closed)
- MA: 52.31%
```

**RA Creation on June 15, 2025:**

```
Step 1: Transfer SA to RA
- SA Balance: $120,000
- FRS: $213,000
- Transfer: min($120,000, $213,000) = $120,000
- Remaining FRS: $213,000 - $120,000 = $93,000

Step 2: Transfer OA to RA (to fill remaining FRS)
- OA Balance: $180,000
- Need: $93,000
- Transfer: min($180,000, $93,000) = $93,000

Step 3: Final Balances
- RA: $120,000 + $93,000 = $213,000 (= FRS)
- OA: $180,000 - $93,000 = $87,000
- SA: $0 (closed)
- MA: $50,000

Withdrawable at 55: $87,000 (OA balance above FRS requirement)
```

---

### F3. Exceeding MediSave BHS

**Scenario:**
- Employee: Carol, age 40, high earner
- Monthly salary: $15,000 (capped at $7,400 for CPF)
- MA Balance on Jan 1, 2025: $74,000
- BHS 2025: $75,500
- SA Balance: $100,000
- FRS: $213,000

**Monthly MA Contribution:**
```
Monthly Total CPF: $7,400 × 37% = $2,738
MA Allocation (Age 35-45): 24.32%
Monthly MA Contribution: $2,738 × 24.32% = $666
```

**Month-by-Month MA:**

```
January:
- Start MA: $74,000
- Contribution: $666
- End MA: $74,666 (< BHS $75,500) ✓
- Spillover: $0

February:
- Start MA: $74,666
- Contribution: $666
- Would be: $75,332 (< BHS) ✓
- End MA: $75,332
- Spillover: $0

March:
- Start MA: $75,332
- Contribution: $666
- Would be: $75,998 (> BHS $75,500)
- To MA: $75,500 - $75,332 = $168
- Excess: $666 - $168 = $498

Spillover Check:
- SA Balance: ~$100,500 (with prior contributions)
- SA Room to FRS: $213,000 - $100,500 = $112,500
- Spillover $498 → SA

April onwards:
- MA already at BHS
- All MA allocation ($666/month) spills over to SA
```

---

### F4. SRS Withdrawal Scenarios

**Scenario A: Early Withdrawal**
- Employee: David, age 55
- First SRS contribution: 2015 (Statutory Retirement Age: 62)
- SRS Balance: $200,000
- Withdrawal: $50,000

```
Withdrawal Type: Early (age 55 < statutory age 62)

Tax Calculation:
- Taxable Amount: $50,000 × 100% = $50,000
- Penalty: $50,000 × 5% = $2,500

Assuming 15% marginal tax rate:
- Income Tax: $50,000 × 15% = $7,500
- Total Cost: $2,500 + $7,500 = $10,000

Net Received: $50,000 - $10,000 = $40,000
```

**Scenario B: Retirement Withdrawal**
- Employee: Eve, age 63
- First SRS contribution: 2020 (Statutory Retirement Age: 63)
- SRS Balance: $200,000
- Withdrawal: $40,000/year for 5 years

```
Withdrawal Type: Penalty-free (age 63 = statutory age 63)

Year 1 Withdrawal:
- Amount: $40,000
- Taxable: $40,000 × 50% = $20,000
- With no other income and personal reliefs:
  - First $20,000 = 0% tax
  - Net Tax: $0

Year 2-5 Withdrawals:
- Same calculation
- $40,000/year × 50% = $20,000 taxable
- Likely $0 tax if no other income

Total over 5 years: $200,000 withdrawn, minimal tax
```

---

### F5. CPF Housing with Accrued Interest

**Scenario:**
- Employee: Frank, age 35
- Property purchased in 2015 for $500,000
- CPF used for down payment: $100,000
- CPF used for monthly instalments: $1,500/month for 10 years = $180,000
- Total CPF used: $280,000
- Selling property in 2025

**Accrued Interest Calculation:**

```
Down Payment ($100,000) - Used in 2015:
- Interest from 2015 to 2025 = 10 years
- Accrued Interest = $100,000 × (1.025^10 - 1)
- = $100,000 × 0.2801 = $28,008

Monthly Instalments ($180,000) - Used progressively:
- Simplification: Average holding period = 5 years
- Accrued Interest ≈ $180,000 × (1.025^5 - 1)
- = $180,000 × 0.1314 = $23,657

Total Accrued Interest: $28,008 + $23,657 = $51,665

Total Refund Required:
- Principal: $280,000
- Accrued Interest: $51,665
- Total: $331,665
```

**Refund Destination (Age 35, below 55):**
```
All refund goes to OA: $331,665
```

---

### F6. CPF LIFE Payout Estimation

**Scenario:**
- Employee: Grace, age 55 in 2025
- RA Balance at 65: $300,000 (projection)
- FRS: $213,000

**Payout Comparison:**

```
Starting at Age 65:

Standard Plan:
- Higher monthly payout, lower bequest
- Estimated Monthly: ~$2,100 - $2,300

Basic Plan:
- Lower monthly payout, higher bequest
- Estimated Monthly: ~$1,900 - $2,100

Escalating Plan:
- Initial payout lower, increases 2%/year
- Initial Monthly: ~$1,700 - $1,900
- Age 75 Monthly: ~$2,100 - $2,300
- Age 85 Monthly: ~$2,500 - $2,800

Deferring to Age 70 (Standard Plan):
- Base at 65: ~$2,200
- Deferred to 70: $2,200 × (1 + 0.07 × 5) = $2,200 × 1.35 = ~$2,970
```

---

## G. Implementation Notes

### G1. Deterministic Modeling Principles

1. **Fixed Rates for Core Logic**
   - All CPF calculations use legislated rates
   - No stochastic elements in core contribution/allocation logic
   - Interest rates use floor rates for conservative projections

2. **Time-Based Precision**
   - All calculations are month-based
   - Age determination uses first day of month
   - Interest compounds monthly, credited yearly

3. **Rounding Consistency**
   - Apply rounding rules exactly as specified
   - Total contribution: round to nearest dollar
   - Employee share: always floor
   - Maintain rounding order (total first, then employee)

### G2. Versioning Strategy

```typescript
interface RuleVersion {
  ruleId: string;
  effectiveFrom: Date;
  effectiveTo: Date | null;
  parameters: Record<string, any>;
}

// Example: OW Ceiling versions
const OW_CEILING_VERSIONS: RuleVersion[] = [
  { ruleId: 'OW_CEILING', effectiveFrom: new Date('2023-01-01'), effectiveTo: new Date('2023-12-31'), parameters: { ceiling: 6300 } },
  { ruleId: 'OW_CEILING', effectiveFrom: new Date('2024-01-01'), effectiveTo: new Date('2024-12-31'), parameters: { ceiling: 6800 } },
  { ruleId: 'OW_CEILING', effectiveFrom: new Date('2025-01-01'), effectiveTo: new Date('2025-12-31'), parameters: { ceiling: 7400 } },
  { ruleId: 'OW_CEILING', effectiveFrom: new Date('2026-01-01'), effectiveTo: null, parameters: { ceiling: 8000 } },
];

function getRuleForDate<T>(rules: RuleVersion[], date: Date): T {
  const applicable = rules.find(r =>
    date >= r.effectiveFrom &&
    (r.effectiveTo === null || date <= r.effectiveTo)
  );
  if (!applicable) throw new Error('No applicable rule found');
  return applicable.parameters as T;
}
```

### G3. Modular Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        SIMULATION ENGINE                                 │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────────────┐                                                   │
│  │   CONFIG LOADER  │  Load rules for simulation date range             │
│  │   (Rule Engine)  │  Version-aware configuration                      │
│  └────────┬─────────┘                                                   │
│           │                                                              │
│           ▼                                                              │
│  ┌──────────────────┐                                                   │
│  │     PLANNER      │  Accept user inputs                               │
│  │  (Input Parser)  │  Validate and normalize data                      │
│  │                  │  Generate simulation timeline                     │
│  └────────┬─────────┘                                                   │
│           │                                                              │
│           ▼                                                              │
│  ┌──────────────────┐                                                   │
│  │      SOLVER      │  Core calculation engine                          │
│  │  (Calculations)  │  CPF contributions, interest, allocations         │
│  │                  │  Apply rules deterministically                    │
│  └────────┬─────────┘                                                   │
│           │                                                              │
│           ▼                                                              │
│  ┌──────────────────┐                                                   │
│  │      LEDGER      │  Track all account balances                       │
│  │ (State Manager)  │  Record transactions and events                   │
│  │                  │  Generate projections and reports                 │
│  └──────────────────┘                                                   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### G4. Annual Update Checklist

When new year parameters are announced (typically December):

- [ ] **CPF Contribution Rates** - Check for age band rate changes
- [ ] **OW Ceiling** - Update ceiling progression
- [ ] **Retirement Sums** - Update BRS/FRS/ERS for new cohort
- [ ] **Basic Healthcare Sum** - Update BHS
- [ ] **MediShield Life Premiums** - Check for premium revisions
- [ ] **CPF LIFE Payout Estimates** - Update payout tables
- [ ] **SRS Statutory Retirement Age** - Check for changes
- [ ] **Interest Rates** - Quarterly review, though floors rarely change

### G5. Testing Recommendations

1. **Unit Tests for Core Calculations**
   - Test each contribution rate table
   - Test rounding edge cases ($0.49 vs $0.50)
   - Test wage ceiling applications
   - Test allocation percentages sum to 100%

2. **Integration Tests for Lifecycle Events**
   - Test age 55 RA creation flow
   - Test BHS spillover scenarios
   - Test multi-employer scenarios

3. **Regression Tests with Official Examples**
   - Compare outputs with CPF website calculators
   - Validate against known contribution amounts

4. **Edge Case Tests**
   - Zero wage months
   - Exactly at ceiling amounts
   - Birthday on Feb 29
   - Mid-month employment start/end
   - Multiple bonuses in same month

### G6. Data Sources for Real-Time Updates

| Data Point | Update Frequency | Source |
|------------|-----------------|--------|
| Contribution Rates | Annual (Jan 1) | CPF Board announcement |
| Wage Ceilings | Annual (Jan 1) | CPF Board announcement |
| Interest Rates | Quarterly | CPF Board news release |
| Retirement Sums | Annual (Dec for next year) | CPF Board announcement |
| BHS | Annual (Dec for next year) | MOH/CPF announcement |
| MediShield Life Premiums | Periodic (multi-year) | MOH announcement |

---

## Document History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | Dec 2024 | Initial comprehensive specification |

---

## Appendix: Quick Reference Tables

### A1. CPF Contribution Rates 2025 (Citizens/PR 3yr+)

| Age | Employee | Employer | Total |
|-----|----------|----------|-------|
| ≤55 | 20% | 17% | 37% |
| 55-60 | 15.5% | 17% | 32.5% |
| 60-65 | 10.5% | 13% | 23.5% |
| 65-70 | 7.5% | 9% | 16.5% |
| >70 | 5% | 7.5% | 12.5% |

### A2. Key Limits 2025

| Limit | Amount |
|-------|--------|
| OW Ceiling | $7,400/month |
| Annual Salary Ceiling | $102,000 |
| CPF Annual Limit | $37,740 |
| BHS | $75,500 |
| BRS | $106,500 |
| FRS | $213,000 |
| ERS | $426,000 |
| SRS Cap (Citizen/PR) | $15,300 |
| SRS Cap (Foreigner) | $35,700 |

### A3. Interest Rates

| Account | Base | Extra (Under 55) | Extra (55+) |
|---------|------|------------------|-------------|
| OA | 2.5% | +1% on first $20K | +2%/+1% on first $60K |
| SA | 4.0% | +1% on first $60K | +2%/+1% on first $60K |
| MA | 4.0% | +1% on first $60K | +2%/+1% on first $60K |
| RA | 4.0% | N/A | +2%/+1% on first $60K |

---

*End of Specification*
