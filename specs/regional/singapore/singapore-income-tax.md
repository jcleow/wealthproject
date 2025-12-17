# Singapore Personal Income Tax Computation Specification

## Overview

This specification provides a comprehensive technical reference for implementing a deterministic Singapore Personal Income Tax computation engine. It covers Assessment Years (YA) 2020-2026 with complete formulas, tax tables, relief calculations, and edge case handling.

**Scope:**
- Tax residency determination
- All assessable income categories
- Complete relief catalog with eligibility and caps
- Progressive tax rate tables (YA2020-2026)
- Non-resident taxation
- Special situations (ESOP/ESOW, stock options, rental income, overseas income)
- Worked examples with full calculations

**Target Audience:** Software engineers implementing tax calculation modules

---

## 1. Tax Residency Determination

### 1.1 Definition of Tax Resident

An individual is a **tax resident** of Singapore for a Year of Assessment (YA) if, in the preceding calendar year (basis year), they:

1. **Physical Presence Test**: Were physically present in Singapore for ≥183 days, OR
2. **Continuous Employment Test**: Were employed in Singapore for a continuous period of ≥183 days (can span 2 calendar years)

### 1.2 Day Counting Rules

```
Days in Singapore = Σ (days physically present)

Include:
- Partial days (arrival/departure days count as full days)
- Weekends and public holidays during stay
- Days in Singapore for any purpose (work, leisure, transit >24hrs)

Exclude:
- Days in transit (<24 hours at airport without clearing immigration)
- Days overseas during Singapore employment
```

### 1.3 Special Residency Rules

#### A. Two-Year Administrative Concession
For individuals who:
- Work in Singapore for a continuous period spanning 2 consecutive calendar years
- Physical presence ≥183 days in total across both years

**Result:** Treated as tax resident for BOTH years

#### B. Three-Year Administrative Concession
For individuals who:
- Work in Singapore for a continuous period spanning 3 consecutive calendar years
- Physical presence in the middle year is <183 days

**Result:** May be treated as tax resident for all 3 years (subject to IRAS approval)

#### C. Short-Term Employment Exemption (60-Day Rule)
Non-residents who:
- Are employed in Singapore for ≤60 days in a calendar year

**Result:** Employment income is EXEMPT from tax

**Exceptions (still taxable even if ≤60 days):**
- Directors of Singapore companies
- Public entertainers
- Professionals (consultants, trainers, coaches)

### 1.4 Non-Resident Definition

An individual is a **non-resident** if they:
- Are physically present in Singapore for <183 days, AND
- Do not qualify under continuous employment tests, AND
- Stay >60 days (if ≤60 days, employment income is exempt)

### 1.5 Residency Decision Flowchart

```
START: Determine tax residency for YA [X] (basis year [X-1])
│
├─► Physical presence in basis year ≥183 days?
│   ├─ YES → TAX RESIDENT
│   └─ NO ↓
│
├─► Employed in SG continuously for ≥183 days?
│   (can span 2 calendar years)
│   ├─ YES → TAX RESIDENT
│   └─ NO ↓
│
├─► Qualifies under 2-year or 3-year concession?
│   ├─ YES → TAX RESIDENT
│   └─ NO ↓
│
├─► Physical presence ≤60 days?
│   ├─ YES → NON-RESIDENT (Employment income EXEMPT*)
│   └─ NO ↓
│
└─► NON-RESIDENT (Employment income TAXABLE)
    Tax at higher of: 15% flat rate OR resident progressive rates

*Exceptions: Directors, public entertainers, professionals
```

### 1.6 Partial Year Residency

For individuals who arrive/depart Singapore mid-year:

**Time-Apportionment Basis:**
- Income earned during the period of physical presence in Singapore is taxable
- Personal reliefs may be prorated based on the period of tax residency
- Proration formula: `Relief × (Days as resident / 365)`

---

## 2. Assessable Income Categories

### 2.1 Employment Income

#### A. Salary and Wages
All cash remuneration from employment:
- Basic salary
- Overtime pay
- Commissions
- Tips and gratuities
- Leave pay
- Notice pay (in lieu of notice)

#### B. Bonuses
- Annual bonus / 13th month payment
- Performance bonus
- Sign-on bonus (taxable in year received)
- Retention bonus
- Contractual bonus

#### C. Allowances (Taxable)
| Allowance Type | Tax Treatment |
|---------------|---------------|
| Fixed monthly allowances | Fully taxable |
| Transport allowance | Taxable (unless reimbursement for business travel) |
| Entertainment allowance | Taxable (unless fully expended on business) |
| Housing allowance | Taxable |
| Cost of living allowance | Taxable |
| Education allowance | Taxable |
| Club membership fees (paid by employer) | Taxable as BIK |

#### D. Benefits-in-Kind (BIK)

**Accommodation:**
| Type | Annual Value |
|------|-------------|
| Fully furnished accommodation (employer-owned/rented) | 10% of employment income |
| Partially furnished | 8% of employment income |
| Unfurnished | 5% of employment income |
| Hotel accommodation (>3 months) | Actual cost or formula value |
| Serviced apartments | Actual cost or formula value |

**Cap:** BIK for accommodation cannot exceed actual rental paid by employer

**Motor Vehicle:**
| Type | Annual Value |
|------|-------------|
| Car provided by employer | Actual cost OR 3/7 of car's OMV per year |
| Driver provided | Additional $9,600/year |
| Petrol/Running costs paid | Actual cost |

**Other BIK:**
- Interest-free/subsidized loans: Benefit = (Market rate - Actual rate) × Principal
- Share options: See Section 2.6
- Insurance premiums (personal): Actual premium paid
- Gifts: Actual value (if >$200)

#### E. Director's Fees
- Taxable in the year fees are voted/approved at AGM
- For non-residents: Flat rate of 24% (YA2024+) or 22% (YA2017-2023)

#### F. Pension and Retirement Benefits
- Lump sum pension: Generally taxable
- Approved pension schemes: May be exempt
- Gratuity (non-contractual): May be exempt if for past services

### 2.2 Rental Income

#### A. Gross Rent
Include:
- Base rent
- Furniture and fittings rental
- Maintenance fees paid by tenant
- Any other amounts received from tenant

#### B. Deductible Expenses

**Option 1: Actual Expenses**
| Expense | Deductibility |
|---------|--------------|
| Property tax | Fully deductible |
| Fire insurance | Fully deductible |
| Mortgage interest | Deductible (capped at rental income) |
| Repairs and maintenance | Deductible (revenue nature only) |
| Agent's commission | Deductible |
| Legal fees (lease preparation) | Deductible |
| Furniture depreciation | Not deductible (capital) |
| Stamp duty | Not deductible (capital) |
| Cost of obtaining loan | Not deductible (capital) |

**Option 2: Deemed Expenses (Simplified)**
```
Taxable Rental Income = Gross Rent - (15% × Gross Rent) - Property Tax - Mortgage Interest

Where:
- 15% deemed expense covers: repairs, maintenance, insurance, agent fees
- Property tax and mortgage interest claimed separately on top of 15%
```

**Important:** Once elected, deemed expense method applies to ALL rental properties for that YA

#### C. Joint Ownership
- Rental income attributed based on ownership share
- Each owner claims expenses based on their share
- Legal owners only (not beneficial owners)

#### D. Vacant Periods
- Expenses during genuine vacancy periods: Deductible
- Expenses for owner-occupied periods: Not deductible
- Proration required for mixed-use

### 2.3 Business Income (Sole Proprietorship)

#### A. Taxable Trade Income
```
Gross Revenue
Less: Allowable Business Expenses
Less: Capital Allowances
= Adjusted Profit / (Loss)
```

#### B. Allowable Business Expenses
Must be:
1. Revenue in nature (not capital)
2. Wholly and exclusively incurred for the business
3. Not prohibited under Income Tax Act

**Common Allowable Expenses:**
- Cost of goods sold
- Employee salaries and CPF
- Rental of business premises
- Utilities
- Advertising and marketing
- Professional fees (accountant, lawyer - for business)
- Bad debts (specific provisions)
- Interest on business loans
- Depreciation → claimed via Capital Allowances instead

**Non-Allowable Expenses:**
- Owner's salary/drawings
- Private expenses
- Income tax
- Capital expenditure
- General provisions
- Donations (claimed separately)

#### C. Capital Allowances
| Asset Type | Rate |
|-----------|------|
| Plant and machinery | 33.3% per year (3 years) or 100% write-off if ≤$5,000 |
| Computers | 33.3% per year or 100% write-off |
| Motor vehicles | 20% per year (5 years), capped at $35,000/vehicle |
| Renovations | 33.3% per year, capped at $300,000 per 3-year period |
| Low-value assets (≤$5,000 each) | 100% immediate write-off |

#### D. Loss Utilization
- **Current year:** Offset against other income
- **Carry-forward:** Unlimited (subject to shareholding test for companies)
- **Carry-back:** 1 year, capped at $100,000

### 2.4 Investment Income

#### A. Dividends
| Source | Tax Treatment |
|--------|--------------|
| Singapore resident company (one-tier) | EXEMPT |
| Singapore resident company (franked, old system) | Taxable with tax credit |
| Foreign dividends (remitted) | Generally EXEMPT (since 2008) |
| REIT distributions | Taxable (for individuals) |

#### B. Interest Income
| Source | Tax Treatment |
|--------|--------------|
| Singapore banks (deposits) | EXEMPT |
| Approved bonds/securities | EXEMPT |
| Singapore Government Securities | EXEMPT |
| Foreign interest (remitted) | Generally EXEMPT (since 2008) |
| Trade debts interest | Taxable |
| Interest from related parties | Taxable |

#### C. Capital Gains
**Singapore has NO capital gains tax**

The following are NOT taxable:
- Gains from sale of shares
- Gains from sale of property (for investment purposes)
- Gains from sale of other capital assets
- Cryptocurrency gains (if capital in nature)

**Exception - Trading Income:**
If IRAS determines the activity is a trade (e.g., frequent property flipping), gains are taxable as business income.

**Badges of Trade (IRAS assessment factors):**
1. Subject matter
2. Length of ownership
3. Frequency of transactions
4. Supplementary work done
5. Circumstances of sale
6. Motive

### 2.5 Director's Fees

| Residency Status | Tax Treatment |
|-----------------|---------------|
| Tax Resident | Taxable at progressive rates |
| Non-Resident | Flat rate: 24% (YA2024+), 22% (prior) |

**Taxing Point:** When fees are voted/approved by shareholders (AGM date)

**Withholding Obligation:** Company must withhold tax from non-resident directors

### 2.6 Stock Options and ESOP/ESOW Plans

#### A. Qualified Employee Equity-Based Remuneration (EEBR) Scheme

**Types of Plans:**
1. **ESOP (Employee Share Option Plan):** Right to purchase shares at predetermined price
2. **ESOW (Employee Share Ownership Plan):** Shares granted outright (may have vesting)

#### B. Taxation Point

| Event | Tax Consequence |
|-------|----------------|
| Grant of option | No tax |
| Vesting of option | No tax (unless no exercise required) |
| Exercise of option | TAXABLE (gain = Market Value - Exercise Price) |
| Sale of shares | No tax (capital gain) |

**Deemed Exercise Rule:**
Options are deemed exercised on the earliest of:
1. Actual exercise date
2. Date of expiry of option
3. Date of sale/transfer of option
4. Date employment ceases (with exceptions)

#### C. Moratorium Relief (Tax Deferral)

If shares acquired under ESOP/ESOW are subject to a moratorium (cannot be sold):

**Deferral Conditions:**
- Moratorium period ≥1 year
- Employee cannot dispose of shares during moratorium

**Tax Treatment:**
- Tax deferred until moratorium ends
- Taxable gain = Market value at end of moratorium - Amount paid

#### D. Tracking Gains Scheme

Allows employees to track actual gains instead of using market value at exercise:

**Conditions:**
- Company must apply to IRAS for Tracking Gains Scheme
- All employees under the scheme must track gains

**Formula:**
```
Taxable Gain = Actual Sale Price - Exercise Price
(instead of Market Value at Exercise - Exercise Price)
```

#### E. Valuation Methods

**Listed Shares:**
- Open market value = Closing price on exercise date
- If no trading, use last available closing price

**Unlisted Shares:**
- Net asset value method
- Earnings-based method
- Third-party valuation
- Formula in scheme documents (if approved)

### 2.7 Exempt Income

The following are NOT taxable in Singapore:

1. **Dividends** from Singapore resident companies (one-tier system)
2. **Capital gains** from disposal of investments
3. **Foreign-sourced income** (dividends, branch profits, service income) for individuals
4. **Interest** from approved banks and financial institutions
5. **Gains** from sale of ordinary shares in a company (subject to conditions)
6. **Compensation** for loss of employment (ex-gratia, within limits)
7. **Death gratuities**
8. **Scholarships** (full-time students)
9. **Winnings** from Singapore Pools, Singapore Turf Club, private lotteries
10. **Military/NS** allowances

---

## 3. Deductions & Reliefs - Complete Catalog

### 3.1 Earned Income Relief

**Eligibility:** Singapore tax residents with earned income (employment, trade, pension)

| Age at End of Basis Year | Relief Amount |
|-------------------------|---------------|
| Below 55 | $1,000 |
| 55 to 59 | $6,000 |
| 60 and above | $8,000 |

**Cap:** Cannot exceed earned income

**Special Rule:** Handicapped persons receive maximum of $4,000 (below 55), $10,000 (55-59), $12,000 (60+)

### 3.2 CPF/Provident Fund Relief

#### A. Ordinary Wages (OW) Contributions

**Relief Amount:** Employee's mandatory CPF contributions on ordinary wages

**Calculation:**
```
CPF Relief (OW) = MIN(
  Actual employee CPF on OW,
  Contribution rate × MIN(Monthly OW, OW Ceiling) × 12
)
```

**CPF Contribution Rates (Employee Portion) - Singapore Citizens/PRs:**

| Age | Employee Rate (up to YA2023) | Employee Rate (YA2024+) |
|-----|-----------------------------|-----------------------|
| ≤55 | 20% | 20% |
| >55-60 | 13% | 14% |
| >60-65 | 7.5% | 9.5% |
| >65-70 | 5% | 7% |
| >70 | 5% | 5% |

**OW Ceiling:** $6,000/month (YA2020-2023), $6,800/month (YA2024+)

#### B. Additional Wages (AW) Contributions

**Relief Amount:** Employee's mandatory CPF contributions on additional wages (bonus, etc.)

**AW Ceiling:**
```
AW Ceiling = Annual Ceiling - Total OW subject to CPF

Where:
- Annual Ceiling = $102,000 (YA2024+), $102,000 (YA2023), $102,000 (prior)
```

### 3.3 Voluntary CPF Contributions (MediSave Account)

**For Self-Employed:**
- Mandatory MediSave contributions are deductible
- Voluntary top-ups above mandatory are NOT automatically deductible

**For Employees:**
- Voluntary contributions beyond mandatory: Not deductible under this relief
- May qualify under CPF Cash Top-up Relief (Section 3.18)

### 3.4 SRS (Supplementary Retirement Scheme) Relief

**Eligibility:** Tax residents who contribute to SRS account

| Contributor Type | Annual Cap |
|-----------------|------------|
| Singapore Citizen / PR | $15,300 |
| Foreigner | $35,700 |

**Notes:**
- Contributions must be made in the calendar year (basis year)
- Relief capped at contribution cap, not actual contribution
- Withdrawals are taxable (50% of withdrawal if at retirement age, 100% if premature)

### 3.5 Qualifying Child Relief (QCR)

**Eligibility Conditions:**
1. Child is unmarried
2. Child is below 16 years old, OR
   - Full-time student (at university, etc.), OR
   - Serving full-time NS
3. Child's annual income ≤$4,000
4. Child is not someone else's QCR claim
5. Child is maintained by taxpayer

**Relief Amount:** $4,000 per qualifying child

**Shared Claims:** Parents can share relief in any proportion (must total $4,000)

### 3.6 Handicapped Child Relief (HCR)

**Eligibility:**
- Same as QCR, PLUS
- Child is physically/mentally handicapped (certified by medical practitioner)

**Relief Amount:** $7,500 per qualifying child

**Note:** Cannot claim both QCR and HCR for same child

### 3.7 Working Mother's Child Relief (WMCR)

**Eligibility:**
1. Mother is married, divorced, or widowed
2. Mother has earned income
3. Child is a Singapore citizen at birth (or within 12 months)
4. Child qualifies for QCR or HCR

**Relief Amount:** Percentage of mother's earned income

| Child Order | Percentage |
|-------------|------------|
| 1st child | 15% |
| 2nd child | 20% |
| 3rd and subsequent | 25% each |

**Combined Cap (QCR/HCR + WMCR):** $50,000 per child

### 3.8 Parent Relief

**Eligibility:**
1. Taxpayer maintains parent/parent-in-law/grandparent/grandparent-in-law
2. Dependant is 55 years or older in basis year, OR handicapped
3. Dependant's annual income ≤$4,000
4. Dependant lived in Singapore (doesn't apply to handicapped living overseas)
5. No one else claims relief for same dependant

| Living Arrangement | Relief Amount |
|-------------------|---------------|
| Same household | $9,000 |
| Not same household | $5,500 |

### 3.9 Handicapped Parent Relief

**Eligibility:**
- Same as Parent Relief, PLUS
- Dependant is physically/mentally handicapped (certified)

| Living Arrangement | Relief Amount |
|-------------------|---------------|
| Same household | $14,000 |
| Not same household | $10,000 |

### 3.10 Grandparent Caregiver Relief (GCR)

**Eligibility:**
1. Working mother (married woman with earned income)
2. Has child (Singapore citizen) who is:
   - Below 12 years old, OR
   - Handicapped (any age)
3. Child cared for by taxpayer's or spouse's:
   - Parent / Grandparent / Parent-in-law / Grandparent-in-law
4. Caregiver is not working
5. Caregiver lives in Singapore

**Relief Amount:** $3,000

**Note:** Only ONE caregiver relief per household

### 3.11 Spouse Relief

**Eligibility:**
1. Taxpayer has spouse who is:
   - Living with taxpayer, OR
   - Maintained by taxpayer
2. Spouse's annual income ≤$4,000
3. Spouse is not someone else's dependant claim

**Relief Amount:** $2,000

### 3.12 Handicapped Spouse Relief

**Eligibility:**
- Same as Spouse Relief, PLUS
- Spouse is physically/mentally handicapped (certified)

**Relief Amount:** $5,500

### 3.13 NSman Relief

#### Self Relief

| NS Activity Level | Relief Amount |
|------------------|---------------|
| Active NSman (performed NS activities) | $3,000 |
| Non-active NSman (completed 10-year cycle or exempted) | $1,500 |
| Key appointment holders (CO, RSM, etc.) | $5,000 |

#### Wife/Parent Relief

**Eligibility:** Married to NSman or parent of NSman (only one claimant)

| Relationship | Relief Amount |
|--------------|---------------|
| Wife of NSman | $750 |
| Parent of NSman (unmarried NSman only) | $750 |

### 3.14 Life Insurance Relief

**Eligibility:**
1. Taxpayer has life insurance policy on own/spouse's life
2. CPF contributions below $5,000

**Relief Calculation:**
```
Life Insurance Relief = MIN(
  Actual premiums paid,
  7% × Sum Insured,
  $5,000 - CPF contributions
)
```

**Note:** If CPF contributions ≥$5,000, no life insurance relief available

### 3.15 Course Fees Relief

**Eligibility:**
1. Course is:
   - Academic/professional qualification, OR
   - Approved by SkillsFuture, OR
   - Related to current employment
2. Taxpayer paid fees (not reimbursed by employer)
3. Taxpayer passed the course (for examination-based courses)

**Relief Amount:** Actual fees paid, capped at $5,500

**Note:** Includes registration fees, examination fees, but not accommodation/transport

### 3.16 Foreign Domestic Worker Levy Relief

**Eligibility:**
1. Married woman living with spouse, OR
2. Taxpayer caring for handicapped family member
3. Employed foreign domestic worker

**Relief Amount:** 2 × Annual levy paid, up to $6,360 (based on standard levy of $265/month × 12 × 2)

### 3.17 Rental Expenses Relief

**Eligibility:** Taxpayer incurred rental expenses for home while overseas for work

**Relief Amount:** Actual rental paid, capped at $8,000

**Conditions:**
- Employment must require overseas posting
- Relief claimed in addition to accommodation BIK if applicable

### 3.18 CPF Cash Top-up Relief (Retirement Sum Topping-Up Scheme)

**Eligibility:**
1. Cash top-up to own or family member's:
   - Special Account (SA)
   - Retirement Account (RA)
   - MediSave Account (MA)

**Relief Caps:**

| Recipient | Cap |
|-----------|-----|
| Self | $8,000 per year |
| Family members (spouse, siblings, parents, parents-in-law, grandparents, grandparents-in-law, children) | $8,000 per year (combined) |

**Total Maximum:** $16,000 per year

**Important:**
- Top-ups under the Voluntary Contribution scheme (VC) or MediSave top-ups under specific schemes
- Must be cash (not CPF-to-CPF transfers)

---

## 4. Donations

### 4.1 Qualifying Donations

Donations to **Institutions of a Public Character (IPC)**:
- Registered charities with IPC status
- Approved by Commissioner of Charities

### 4.2 Tax Deduction Rate

| Period | Deduction Rate |
|--------|---------------|
| YA2020-2026 | 250% of donation amount |

**Example:**
- Donation: $1,000
- Tax deduction: $2,500

### 4.3 Types of Qualifying Donations

1. **Cash donations**
2. **Shares (publicly listed)**
   - Value = Market value on donation date
3. **Artifacts (approved)**
4. **Public art donations**
5. **Land/building donations**

### 4.4 Non-Qualifying Donations

- Donations with benefits received (naming rights, reserved seats, etc.)
- Political donations
- Donations to non-IPCs
- Donations via will/testament

### 4.5 Carry-Forward of Unutilized Donations

**Rule:** Unutilized donation deductions can be carried forward for up to 5 years

**Ordering:**
1. Use current year's donations first
2. Then prior years' donations (oldest first)
3. Subject to income available after personal reliefs

---

## 5. Taxable Income Calculation Sequence

### 5.1 Deterministic Computation Order

```
STEP 1: Calculate Gross Income
├── Employment Income
│   ├── Salary + Bonus + Allowances
│   ├── Benefits-in-Kind
│   └── Stock options/ESOW gains
├── Director's Fees
├── Rental Income (Gross)
├── Business Income (Gross)
└── Other Income (Interest, etc.)
= GROSS INCOME

STEP 2: Deduct Allowable Expenses
├── Employment: NIL (no deductions allowed)
├── Rental: Property tax + Interest + (Actual OR 15% Deemed)
├── Business: Allowable expenses + Capital allowances
└── Trade losses brought forward
= ASSESSABLE INCOME

STEP 3: Apply Personal Reliefs
├── Earned Income Relief
├── CPF Relief
├── SRS Relief
├── Child Reliefs (QCR/HCR/WMCR)
├── Parent/Spouse Reliefs
├── NSman Relief
├── Life Insurance Relief
├── Course Fees Relief
├── Foreign Maid Levy Relief
├── CPF Cash Top-up Relief
└── (Capped at Assessable Income - cannot create loss)
= CHARGEABLE INCOME (before donations)

STEP 4: Deduct Approved Donations
├── Current year donations × 250%
├── Brought forward donations × 250%
└── (Capped at Chargeable Income - cannot create loss)
= CHARGEABLE INCOME (final)

STEP 5: Apply Tax Rates
├── If Resident: Progressive rates
├── If Non-Resident: Flat rate OR progressive (higher)
= TAX PAYABLE (before rebates)

STEP 6: Apply Tax Rebates
├── Parenthood Tax Rebate
├── Other rebates (if any)
= NET TAX PAYABLE
```

### 5.2 Important Rules

1. **Reliefs cannot exceed assessable income** - Cannot create negative chargeable income
2. **Donations capped at chargeable income** - After reliefs
3. **Losses can be carried forward** - But not created via reliefs
4. **Rebates can reduce tax to zero** - But no refund of excess rebate

---

## 6. Tax Rate Tables (YA2020-2026)

### 6.1 Resident Tax Rates (YA2024 onwards)

| Chargeable Income | Rate | Tax on Band | Cumulative Tax |
|-------------------|------|-------------|----------------|
| First $20,000 | 0% | $0 | $0 |
| Next $10,000 | 2% | $200 | $200 |
| Next $10,000 | 3.5% | $350 | $550 |
| Next $40,000 | 7% | $2,800 | $3,350 |
| Next $40,000 | 11.5% | $4,600 | $7,950 |
| Next $40,000 | 15% | $6,000 | $13,950 |
| Next $40,000 | 18% | $7,200 | $21,150 |
| Next $40,000 | 19% | $7,600 | $28,750 |
| Next $40,000 | 19.5% | $7,800 | $36,550 |
| Next $40,000 | 20% | $8,000 | $44,550 |
| Next $180,000 | 22% | $39,600 | $84,150 |
| Next $500,000 | 23% | $115,000 | $199,150 |
| Above $1,000,000 | 24% | - | - |

### 6.2 Resident Tax Rates (YA2017-2023)

| Chargeable Income | Rate | Tax on Band | Cumulative Tax |
|-------------------|------|-------------|----------------|
| First $20,000 | 0% | $0 | $0 |
| Next $10,000 | 2% | $200 | $200 |
| Next $10,000 | 3.5% | $350 | $550 |
| Next $40,000 | 7% | $2,800 | $3,350 |
| Next $40,000 | 11.5% | $4,600 | $7,950 |
| Next $40,000 | 15% | $6,000 | $13,950 |
| Next $40,000 | 18% | $7,200 | $21,150 |
| Next $40,000 | 19% | $7,600 | $28,750 |
| Next $40,000 | 19.5% | $7,800 | $36,550 |
| Next $40,000 | 20% | $8,000 | $44,550 |
| Above $320,000 | 22% | - | - |

### 6.3 Changes Summary by Year

| Year | Key Change |
|------|-----------|
| YA2020-2023 | Top rate 22% above $320,000 |
| YA2024 | New bracket: 23% for $500k-$1M, 24% above $1M |
| YA2025-2026 | Same as YA2024 |

### 6.4 Non-Resident Tax Rates

#### Employment Income (>60 days)
```
Tax = MAX(
  15% × Total Employment Income,
  Resident Tax calculated on same income
)
```

#### Director's Fees
| Period | Rate |
|--------|------|
| YA2017-2023 | 22% flat |
| YA2024+ | 24% flat |

#### Consultant/Professional Fees
| Period | Rate |
|--------|------|
| YA2017-2023 | 22% flat (on gross) |
| YA2024+ | 24% flat (on gross) |

#### Rental Income
- Non-residents: Same progressive rates as residents
- May claim expenses in same manner

#### Interest/Royalties/Technical Fees
- Withholding tax at source (10-15%)
- May be reduced by tax treaties

---

## 7. Tax Rebates

### 7.1 Parenthood Tax Rebate (PTR)

**Eligibility:**
1. Child is a Singapore citizen
2. Child is legitimate, OR legally adopted, OR step-child
3. Claimed in year of birth or year of adoption

**Rebate Amount:**

| Child Order | Rebate Amount |
|-------------|---------------|
| 1st child | $5,000 |
| 2nd child | $10,000 |
| 3rd and subsequent | $20,000 each |

**Usage:**
- Can offset against tax payable
- Unused rebate carried forward indefinitely
- Both parents can share rebate (must agree on proportion)

### 7.2 Other Rebates (Historical)

| Rebate | Period | Amount |
|--------|--------|--------|
| Personal Income Tax Rebate | YA2020 | 20% (cap $200) - COVID relief |
| Personal Income Tax Rebate | YA2021 | NIL |
| Personal Income Tax Rebate | YA2022-2026 | NIL |

---

## 8. Special Situations

### 8.1 Mid-Year Arrival/Departure

#### A. Determining Residency
- Count actual days present in Singapore during basis year
- Apply 183-day test or continuous employment test

#### B. Income Attribution
```
Taxable Income = Income earned during period of presence in Singapore

For employment income:
- Time-apportion based on days worked in Singapore
- Formula: Total Income × (SG Work Days / Total Work Days)
```

#### C. Relief Proration
```
Prorated Relief = Full Relief × (Days as Resident / 365)

Applies to:
- Earned Income Relief
- Spouse/Parent Reliefs
- Child Reliefs
- NSman Relief

Does NOT apply to:
- CPF Relief (based on actual contributions)
- SRS Relief (based on actual contributions)
- Donations (based on actual donations)
```

### 8.2 Multiple Employers

#### A. Income Aggregation
- All employment income aggregated for tax assessment
- Each employer issues IR8A form
- Taxpayer files combined income in tax return

#### B. Relief Calculation
- CPF relief based on total CPF contributions (all employers)
- Subject to annual ceiling ($102,000 total)
- Other reliefs based on aggregate income

### 8.3 ESOP/ESOW Detailed Treatment

#### A. Taxing Point Analysis

| Scenario | Tax Point |
|----------|-----------|
| Option granted with exercise price | Exercise date |
| Option with nil exercise price | Vesting date |
| Shares granted with vesting conditions | Vesting date |
| Shares granted immediately (no conditions) | Grant date |
| Option expires unexercised | Expiry date (deemed exercise) |
| Option transferred/sold | Transfer/sale date |
| Employment ceases | Cessation date (unless waiver) |

#### B. Valuation on Tax Point

**Listed Shares:**
```
Taxable Gain = (Closing Price on Exercise Date - Exercise Price) × Number of Shares
```

**Unlisted Shares:**
```
Taxable Gain = (Fair Market Value - Exercise Price) × Number of Shares

Fair Market Value determined by:
1. Independent valuation
2. Net Asset Value
3. Recent transaction price
4. Formula in scheme rules (if approved by IRAS)
```

#### C. Moratorium Relief

**Conditions:**
1. Shares subject to moratorium of ≥1 year
2. No disposal allowed during moratorium
3. Employee elects moratorium relief

**Tax Treatment:**
```
Original Exercise Date: NO TAX (deferred)
Moratorium End Date: TAX on (Market Value at Moratorium End - Exercise Price)
```

**Risk:** If share price falls during moratorium, employee pays tax on lower value
**Benefit:** If share price rises, employee pays tax on higher value at moratorium end

#### D. Tracking Gains Election

**When Available:**
- Company applies to IRAS for Tracking Gains Scheme
- Scheme approved for that company

**Calculation:**
```
Standard Method: Gain = MV at Exercise - Exercise Price
Tracking Gains:  Gain = Actual Sale Price - Exercise Price

Taxed in year of exercise (not sale)
Any difference handled via:
- Additional tax (if sale price > MV at exercise)
- Refund claim (if sale price < MV at exercise)
```

### 8.4 Overseas Income

#### A. Territorial Basis
Singapore taxes on **territorial basis** - only Singapore-sourced income is taxable

**Singapore-Sourced Income:**
- Employment exercised in Singapore
- Business carried on in Singapore
- Rental of Singapore property
- Interest from Singapore sources

**Foreign-Sourced Income:**
- Generally NOT taxable when received in Singapore (since 2008)
- Exceptions may apply for certain structures

#### B. Determining Source of Employment Income

| Factor | Singapore Source | Foreign Source |
|--------|-----------------|----------------|
| Where work performed | In Singapore | Outside Singapore |
| Where employer located | Less relevant | Less relevant |
| Where contract signed | Less relevant | Less relevant |

**Key Principle:** Employment income sourced where the employment is exercised (where work is done)

#### C. Overseas Assignment by Singapore Employer

If Singapore tax resident is assigned overseas:
- Income from overseas work: NOT Singapore-sourced
- May still be taxable in other jurisdiction
- Tax treaties may provide relief

### 8.5 Rental Property Detailed Rules

#### A. Actual Expense Method - Full List

**Deductible:**
| Expense | Treatment |
|---------|-----------|
| Property tax | 100% deductible |
| Fire insurance | 100% deductible |
| Mortgage interest | Capped at rental income for the property |
| Repairs and maintenance | 100% (revenue nature only) |
| Repainting | 100% (if not improvement) |
| Agent's commission | 100% deductible |
| Legal fees (lease preparation) | 100% deductible |
| Advertising for tenants | 100% deductible |
| Servicing of appliances | 100% deductible |
| Pest control | 100% deductible |
| Condo management fees | 100% deductible |

**Not Deductible:**
| Expense | Reason |
|---------|--------|
| Furniture/appliances purchase | Capital nature |
| Renovation/improvement | Capital nature |
| Stamp duty | Capital nature |
| Mortgage principal | Capital repayment |
| Legal fees (purchase/sale) | Capital nature |
| Travel to inspect property | Not wholly for rental |

#### B. Deemed 15% Method

```
Taxable Rental Income = Gross Rent × 85%

OR

Taxable Rental Income = Gross Rent - 15% - Property Tax - Mortgage Interest
(IRAS allows property tax and interest on top of 15% deemed)
```

**When to Choose Deemed Method:**
- Actual expenses (excluding PT and interest) < 15% of gross rent
- Simplicity preferred
- No detailed records available

**Commitment:**
- Once elected for a year, applies to ALL rental properties that year
- Can change method in subsequent years

#### C. Joint Ownership Scenarios

**Married Couple (Joint Tenants):**
```
Each spouse reports: 50% of rental income
Each spouse claims: 50% of expenses
```

**Unequal Ownership (Tenants in Common):**
```
Owner A (70%): Reports 70% income, claims 70% expenses
Owner B (30%): Reports 30% income, claims 30% expenses
```

**Mortgage Interest Allocation:**
- Based on whose name is on mortgage, not ownership share
- If mortgage in one name, only that owner can claim interest
- Solution: Property can be held in proportion to who pays mortgage

### 8.6 Sole Proprietorship Tax Treatment

#### A. Basis Period

- Tax assessed on preceding year basis
- YA2024 = Basis year 2023 (calendar year)

#### B. Converting Financial Year to Calendar Year

If business financial year ≠ calendar year:
```
Method 1: Time Apportionment
Profit for YA = (FY profit × Months in basis year / 12)

Method 2: Accounts Basis
Use accounts for financial year ending in basis year
```

#### C. Loss Offset Rules

**Current Year:**
- Business loss can offset against other income (employment, rental)
- Reduces total assessable income

**Carry-Forward:**
- Unabsorbed losses carried forward indefinitely
- Used against future business income from same trade
- Subject to substantial change in shareholding rule (if company)

**Carry-Back (Section 37D):**
```
Conditions:
- Maximum carry-back: 1 year
- Cap: $100,000
- Must make election

Formula:
Carry-back Relief = MIN(Unabsorbed Loss, $100,000, Prior Year Income)
```

#### D. Capital Allowances vs Depreciation

```
Accounting: Depreciation expense recorded
Tax: Depreciation added back, Capital Allowances claimed instead

Taxable Income = Accounting Profit + Depreciation - Capital Allowances
```

---

## 9. Key Definitions

| Term | Definition |
|------|------------|
| **Assessment Year (YA)** | Year in which income is assessed. YA2024 = income earned in 2023 |
| **Basis Year** | Calendar year preceding the YA. For YA2024, basis year is 2023 |
| **Assessable Income** | Total income after deducting allowable expenses |
| **Chargeable Income** | Assessable income less personal reliefs and donations |
| **Tax Payable** | Amount calculated by applying tax rates to chargeable income |
| **Net Tax Payable** | Tax payable after deducting rebates |
| **Earned Income** | Income from employment, trade, or pension |
| **Unearned Income** | Investment income (interest, rent, dividends) |
| **Personal Relief** | Deduction from assessable income based on personal circumstances |
| **Tax Rebate** | Direct reduction of tax payable (not income) |

---

## 10. JSON/TypeScript Schemas

### 10.1 Input Schema

```typescript
interface SingaporeTaxInput {
  // Assessment context
  assessmentYear: number; // 2020-2026
  basisYear: number; // assessmentYear - 1

  // Residency
  residency: {
    status: 'resident' | 'non_resident' | 'partial_year';
    daysInSingapore: number;
    arrivalDate?: string; // ISO date
    departureDate?: string; // ISO date
  };

  // Personal information
  personal: {
    age: number; // Age at end of basis year
    maritalStatus: 'single' | 'married' | 'divorced' | 'widowed';
    isHandicapped: boolean;
    isNSman: boolean;
    nsmanStatus?: 'active' | 'non_active' | 'key_appointment';
    citizenshipStatus: 'citizen' | 'pr' | 'foreigner';
  };

  // Employment income
  employment: {
    basicSalary: number; // Annual
    bonus: number;
    allowances: number;
    benefitsInKind: BenefitInKind[];
    directorFees?: number;
    stockOptions?: StockOptionExercise[];
    esopEsowGains?: ESOPGain[];
  };

  // Rental income
  rental?: RentalProperty[];

  // Business income
  business?: {
    grossRevenue: number;
    allowableExpenses: number;
    capitalAllowances: number;
    lossCarryForward?: number;
  };

  // Contributions
  cpfContributions: {
    ordinaryWagesEmployee: number;
    additionalWagesEmployee: number;
    voluntaryContributions?: number;
  };
  srsContributions?: number;

  // Donations
  donations: {
    ipcCashDonations: number;
    ipcShareDonations?: number;
    otherApprovedDonations?: number;
    donationCarryForward?: number;
  };

  // Dependants
  dependants: {
    children: ChildDependant[];
    parents: ParentDependant[];
    spouse?: SpouseDependant;
    grandparentCaregiver?: GrandparentCaregiver;
  };

  // Other reliefs
  otherReliefs: {
    lifeInsurancePremiums?: number;
    sumInsured?: number;
    courseFees?: number;
    foreignMaidLevy?: number;
    cpfCashTopUpSelf?: number;
    cpfCashTopUpFamily?: number;
  };

  // Rebates
  rebates: {
    parenthoodTaxRebateBalance?: number; // Brought forward
    newChildren?: NewChild[]; // Born/adopted in basis year
  };
}

interface BenefitInKind {
  type: 'accommodation' | 'vehicle' | 'driver' | 'loan' | 'insurance' | 'other';
  annualValue: number;
  description?: string;
}

interface StockOptionExercise {
  exerciseDate: string;
  exercisePrice: number;
  marketValueAtExercise: number;
  numberOfShares: number;
  moratoriumApplied: boolean;
  moratoriumEndDate?: string;
  marketValueAtMoratoriumEnd?: number;
}

interface ESOPGain {
  vestingDate: string;
  marketValueAtVesting: number;
  amountPaid: number;
  numberOfShares: number;
}

interface RentalProperty {
  propertyId: string;
  grossRent: number; // Annual
  expenseMethod: 'actual' | 'deemed';
  actualExpenses?: {
    propertyTax: number;
    mortgageInterest: number;
    fireInsurance: number;
    repairs: number;
    agentFees: number;
    other: number;
  };
  ownershipShare: number; // 0-1 (e.g., 0.5 for 50%)
  vacantMonths?: number;
}

interface ChildDependant {
  name: string;
  dateOfBirth: string;
  isHandicapped: boolean;
  isStudying: boolean;
  annualIncome: number;
  reliefClaimedBySpouse: number; // Amount claimed by spouse (for sharing)
}

interface ParentDependant {
  relationship: 'parent' | 'parent_in_law' | 'grandparent' | 'grandparent_in_law';
  age: number;
  isHandicapped: boolean;
  livesWithTaxpayer: boolean;
  annualIncome: number;
}

interface SpouseDependant {
  annualIncome: number;
  isHandicapped: boolean;
}

interface GrandparentCaregiver {
  relationship: string;
  caresForChild: boolean;
  isWorking: boolean;
}

interface NewChild {
  dateOfBirth: string;
  childOrder: number; // 1st, 2nd, 3rd, etc.
  isSingaporeCitizen: boolean;
}
```

### 10.2 Output Schema

```typescript
interface SingaporeTaxOutput {
  assessmentYear: number;
  residencyStatus: string;

  // Income breakdown
  income: {
    employment: number;
    directorFees: number;
    rental: number;
    business: number;
    stockOptionsEsop: number;
    other: number;
    grossTotal: number;
  };

  // Expense deductions
  expenses: {
    rentalExpenses: number;
    businessExpenses: number;
    capitalAllowances: number;
    totalExpenses: number;
  };

  assessableIncome: number;

  // Reliefs breakdown
  reliefs: {
    earnedIncomeRelief: number;
    cpfRelief: number;
    srsRelief: number;
    qualifyingChildRelief: number;
    handicappedChildRelief: number;
    workingMothersChildRelief: number;
    parentRelief: number;
    handicappedParentRelief: number;
    grandparentCaregiverRelief: number;
    spouseRelief: number;
    handicappedSpouseRelief: number;
    nsmanRelief: number;
    lifeInsuranceRelief: number;
    courseFeesRelief: number;
    foreignMaidLevyRelief: number;
    cpfCashTopUpRelief: number;
    totalReliefs: number;
    reliefsUtilized: number; // Capped at assessable income
    unusedReliefs: number;
  };

  chargeableIncomeBeforeDonations: number;

  // Donations
  donations: {
    currentYearDonations: number;
    donationCarryForward: number;
    grossDeduction: number; // × 250%
    deductionUtilized: number; // Capped at chargeable income
    unusedDonation: number; // Carry forward
  };

  chargeableIncome: number;

  // Tax calculation
  tax: {
    taxBeforeRebate: number;
    parenthoodTaxRebateUsed: number;
    otherRebates: number;
    netTaxPayable: number;
    parenthoodTaxRebateCarryForward: number;
  };

  // Summary statistics
  summary: {
    effectiveTaxRate: number; // Net tax / Gross income
    marginalTaxRate: number; // Rate on last dollar
    averageTaxRate: number; // Net tax / Chargeable income
  };

  // Breakdown by tax bracket (for residents)
  taxBrackets?: TaxBracketBreakdown[];

  // Warnings and notes
  warnings: string[];
  notes: string[];
}

interface TaxBracketBreakdown {
  bracket: string; // e.g., "First $20,000"
  rate: number;
  incomeInBracket: number;
  taxOnBracket: number;
  cumulativeIncome: number;
  cumulativeTax: number;
}
```

---

## 11. Flowcharts

### 11.1 Tax Residency Decision Tree

```
┌─────────────────────────────────────────────────────────────┐
│                    START: Determine Residency               │
│                     for YA [X] (Basis Year [X-1])           │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
              ┌───────────────────────────────┐
              │ Physical presence in basis    │
              │ year ≥ 183 days?              │
              └───────────────────────────────┘
                     │              │
                    YES             NO
                     │              │
                     ▼              ▼
         ┌─────────────────┐    ┌───────────────────────────────┐
         │  TAX RESIDENT   │    │ Employed in SG continuously   │
         │  (Standard)     │    │ for ≥ 183 days (can span     │
         └─────────────────┘    │ 2 calendar years)?            │
                                └───────────────────────────────┘
                                       │              │
                                      YES             NO
                                       │              │
                                       ▼              ▼
                           ┌─────────────────┐    ┌───────────────────────────────┐
                           │  TAX RESIDENT   │    │ Qualifies under 2-year or    │
                           │  (Employment)   │    │ 3-year administrative        │
                           └─────────────────┘    │ concession?                   │
                                                  └───────────────────────────────┘
                                                         │              │
                                                        YES             NO
                                                         │              │
                                                         ▼              ▼
                                             ┌─────────────────┐    ┌───────────────────────────────┐
                                             │  TAX RESIDENT   │    │ Physical presence ≤ 60 days? │
                                             │  (Concession)   │    └───────────────────────────────┘
                                             └─────────────────┘           │              │
                                                                          YES             NO
                                                                           │              │
                                                                           ▼              ▼
                                                               ┌─────────────────────┐  ┌─────────────────────┐
                                                               │   NON-RESIDENT      │  │   NON-RESIDENT      │
                                                               │   (Income EXEMPT*)  │  │   (Income TAXABLE)  │
                                                               └─────────────────────┘  └─────────────────────┘

* Exceptions: Directors, public entertainers, professionals still taxable
```

### 11.2 Income Classification Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    INCOME RECEIVED                          │
└─────────────────────────────────────────────────────────────┘
                              │
          ┌───────────────────┼───────────────────┬──────────────────┬──────────────────┐
          ▼                   ▼                   ▼                  ▼                  ▼
   ┌─────────────┐     ┌─────────────┐     ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
   │ Employment  │     │   Rental    │     │  Business   │    │ Investment  │    │   Other     │
   │   Income    │     │   Income    │     │   Income    │    │   Income    │    │   Income    │
   └─────────────┘     └─────────────┘     └─────────────┘    └─────────────┘    └─────────────┘
          │                   │                   │                  │                  │
          ▼                   ▼                   ▼                  ▼                  ▼
   ┌─────────────┐     ┌─────────────┐     ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
   │ No expense  │     │ Actual OR   │     │ Allowable   │    │ Dividends   │    │ Varies by   │
   │ deductions  │     │ 15% deemed  │     │ expenses +  │    │ = EXEMPT    │    │ source      │
   │ allowed     │     │ expenses    │     │ capital     │    │             │    │             │
   │             │     │             │     │ allowances  │    │ Interest    │    │             │
   │ Include:    │     │ Include:    │     │             │    │ = Usually   │    │             │
   │ • Salary    │     │ • PT        │     │ Can create  │    │   EXEMPT    │    │             │
   │ • Bonus     │     │ • Interest  │     │ loss for    │    │             │    │             │
   │ • BIK       │     │ • Repairs   │     │ offset      │    │ Cap Gains   │    │             │
   │ • Options   │     │ • Agent fee │     │             │    │ = EXEMPT    │    │             │
   └─────────────┘     └─────────────┘     └─────────────┘    └─────────────┘    └─────────────┘
          │                   │                   │                  │                  │
          └───────────────────┴───────────────────┴──────────────────┴──────────────────┘
                                                  │
                                                  ▼
                                        ┌─────────────────┐
                                        │   ASSESSABLE    │
                                        │     INCOME      │
                                        └─────────────────┘
```

### 11.3 Relief Application Cascade

```
┌─────────────────────────────────────────────────────────────┐
│                    ASSESSABLE INCOME                        │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
              ┌───────────────────────────────┐
              │    Apply Personal Reliefs     │
              │    (in any order, but total   │
              │    capped at assessable       │
              │    income)                    │
              └───────────────────────────────┘
                              │
         ┌────────────────────┼────────────────────┐
         ▼                    ▼                    ▼
  ┌─────────────┐      ┌─────────────┐      ┌─────────────┐
  │ Earned      │      │ CPF Relief  │      │ SRS Relief  │
  │ Income      │      │ (OW + AW)   │      │             │
  │ Relief      │      └─────────────┘      └─────────────┘
  └─────────────┘             │                    │
         │                    │                    │
         ▼                    ▼                    ▼
  ┌─────────────┐      ┌─────────────┐      ┌─────────────┐
  │ Child       │      │ Parent      │      │ Spouse      │
  │ Reliefs     │      │ Reliefs     │      │ Relief      │
  │ (QCR/HCR/   │      │             │      │             │
  │  WMCR)      │      │             │      │             │
  └─────────────┘      └─────────────┘      └─────────────┘
         │                    │                    │
         └────────────────────┼────────────────────┘
                              │
                              ▼
              ┌───────────────────────────────┐
              │ Other Reliefs:                │
              │ • NSman                       │
              │ • Life Insurance              │
              │ • Course Fees                 │
              │ • Foreign Maid Levy           │
              │ • CPF Cash Top-up             │
              └───────────────────────────────┘
                              │
                              ▼
              ┌───────────────────────────────┐
              │ Total Reliefs = SUM(all)      │
              │                               │
              │ Utilized = MIN(Total,         │
              │                Assessable)    │
              │                               │
              │ Unused = Total - Utilized     │
              │ (LOST - cannot carry forward) │
              └───────────────────────────────┘
                              │
                              ▼
              ┌───────────────────────────────┐
              │ CHARGEABLE INCOME             │
              │ (before donations)            │
              │ = Assessable - Reliefs Used   │
              └───────────────────────────────┘
```

---

## 12. Worked Examples

### Example 1: Standard Employee with CPF + Typical Reliefs

**Profile:**
- Age: 35 (below 55)
- Married with 2 children (ages 5 and 8)
- Singapore Citizen
- Assessment Year: YA2024 (Basis Year 2023)

**Income:**
- Annual salary: $96,000
- Annual bonus: $12,000
- Benefits-in-Kind: None

**Contributions:**
- CPF Employee (OW): $96,000 × 20% = $19,200
- CPF Employee (AW): $6,000 (capped by AW ceiling: $102,000 - $96,000 = $6,000 eligible)
  - Actual AW contribution: $6,000 × 20% = $1,200
- Total CPF contributions: $20,400

**Relief Claims:**
- Earned Income Relief: $1,000
- CPF Relief: $20,400
- QCR (2 children): $8,000
- Parent Relief (mother, same household): $9,000
- Course Fees: $3,000

**Calculation:**

```
STEP 1: GROSS INCOME
Employment Income = $96,000 + $12,000 = $108,000

STEP 2: ASSESSABLE INCOME
No allowable deductions for employment
Assessable Income = $108,000

STEP 3: PERSONAL RELIEFS
Earned Income Relief:     $1,000
CPF Relief:              $20,400
QCR (2 children):         $8,000
Parent Relief:            $9,000
Course Fees Relief:       $3,000
─────────────────────────────────
Total Reliefs:           $41,400

STEP 4: CHARGEABLE INCOME
Chargeable Income = $108,000 - $41,400 = $66,600

STEP 5: TAX CALCULATION (YA2024 rates)
First $20,000 @ 0%:         $0
Next $10,000 @ 2%:        $200
Next $10,000 @ 3.5%:      $350
Next $26,600 @ 7%:      $1,862
─────────────────────────────────
Tax Payable:            $2,412

STEP 6: NET TAX PAYABLE
No rebates applicable
Net Tax Payable = $2,412

SUMMARY:
Gross Income:         $108,000
Assessable Income:    $108,000
Total Reliefs:         $41,400
Chargeable Income:     $66,600
Net Tax Payable:        $2,412
Effective Tax Rate:      2.23%
```

---

### Example 2: High-Income Employee with SRS and Stock Options

**Profile:**
- Age: 45
- Married, no children
- Singapore Citizen
- Assessment Year: YA2024

**Income:**
- Annual salary: $300,000
- Bonus: $50,000
- Stock option exercise gain: $100,000 (exercised 5,000 shares, MV $50, exercise price $30)

**Contributions:**
- CPF Employee (capped): $20,400 (OW ceiling $6,000 × 12 × 20% + AW portion)
- SRS: $15,300 (maximum)

**Relief Claims:**
- Earned Income Relief: $1,000
- CPF Relief: $20,400
- SRS Relief: $15,300
- Spouse Relief: $2,000

**Calculation:**

```
STEP 1: GROSS INCOME
Salary:                  $300,000
Bonus:                    $50,000
Stock Option Gain:       $100,000 (5,000 × ($50 - $30))
─────────────────────────────────
Gross Income:            $450,000

STEP 2: ASSESSABLE INCOME
Assessable Income = $450,000

STEP 3: PERSONAL RELIEFS
Earned Income Relief:      $1,000
CPF Relief:               $20,400
SRS Relief:               $15,300
Spouse Relief:             $2,000
─────────────────────────────────
Total Reliefs:            $38,700

STEP 4: CHARGEABLE INCOME
Chargeable Income = $450,000 - $38,700 = $411,300

STEP 5: TAX CALCULATION (YA2024 rates)
First $20,000 @ 0%:            $0
Next $10,000 @ 2%:           $200
Next $10,000 @ 3.5%:         $350
Next $40,000 @ 7%:         $2,800
Next $40,000 @ 11.5%:      $4,600
Next $40,000 @ 15%:        $6,000
Next $40,000 @ 18%:        $7,200
Next $40,000 @ 19%:        $7,600
Next $40,000 @ 19.5%:      $7,800
Next $40,000 @ 20%:        $8,000
Next $91,300 @ 22%:       $20,086
─────────────────────────────────
Tax Payable:              $64,636

STEP 6: NET TAX PAYABLE
No rebates applicable
Net Tax Payable = $64,636

SUMMARY:
Gross Income:            $450,000
Assessable Income:       $450,000
Total Reliefs:            $38,700
Chargeable Income:       $411,300
Net Tax Payable:          $64,636
Effective Tax Rate:        14.36%
Marginal Tax Rate:           22%
```

---

### Example 3: Person with Rental Income (Comparison)

**Profile:**
- Age: 40
- Single
- Assessment Year: YA2024

**Income:**
- Employment: $80,000
- Rental income: $36,000/year (1 property)

**Rental Property Details:**
- Gross rent: $3,000/month = $36,000/year
- Property tax: $2,000
- Mortgage interest: $8,000
- Fire insurance: $200
- Repairs: $1,500
- Agent fees: $1,800

**CPF Contributions:** $16,000 (employee portion)

**COMPARISON: Actual vs Deemed Expense Method**

```
═══════════════════════════════════════════════════════════════
                    ACTUAL EXPENSES         DEEMED 15%
═══════════════════════════════════════════════════════════════
Gross Rental         $36,000                $36,000

Less Expenses:
Property Tax         ($2,000)               ($2,000)
Mortgage Interest    ($8,000)               ($8,000)
Fire Insurance       ($200)
Repairs              ($1,500)
Agent Fees           ($1,800)
15% Deemed                                  ($5,400)
─────────────────────────────────────────────────────────────────
Total Deductions     ($13,500)              ($15,400)

Taxable Rental       $22,500                $20,600
═══════════════════════════════════════════════════════════════

RECOMMENDATION: Deemed 15% method saves $1,900 in taxable income
```

**Full Tax Calculation (Using Deemed Method):**

```
GROSS INCOME
Employment:           $80,000
Rental (taxable):     $20,600
─────────────────────────────────
Total:               $100,600

RELIEFS
Earned Income:         $1,000
CPF Relief:           $16,000
─────────────────────────────────
Total Reliefs:        $17,000

CHARGEABLE INCOME
$100,600 - $17,000 = $83,600

TAX CALCULATION
First $20,000 @ 0%:        $0
Next $10,000 @ 2%:       $200
Next $10,000 @ 3.5%:     $350
Next $40,000 @ 7%:     $2,800
Next $3,600 @ 11.5%:     $414
─────────────────────────────────
Net Tax Payable:       $3,764
```

---

### Example 4: Non-Resident Director

**Profile:**
- Non-resident (present in Singapore <183 days)
- Not employed in Singapore
- Assessment Year: YA2024

**Income:**
- Director's fees: $150,000 (voted at AGM)
- No other Singapore income

**Tax Calculation:**

```
NON-RESIDENT DIRECTOR TAX

Director's fees are taxed at flat rate regardless of days in Singapore.

YA2024 Rate: 24%

Tax Payable = $150,000 × 24% = $36,000

NOTES:
- No personal reliefs available for non-residents
- Company must withhold tax before payment
- Effective rate = 24% (flat)
```

---

### Example 5: Sole Proprietor with Business Losses and Donations

**Profile:**
- Age: 38
- Married, 1 child
- Runs sole proprietorship + part-time employment
- Assessment Year: YA2024

**Income:**
- Employment (part-time): $60,000
- Business (sole prop):
  - Gross revenue: $80,000
  - Allowable expenses: $95,000
  - Capital allowances: $15,000
  - **Net Loss: ($30,000)**

**Donations:**
- IPC donations: $5,000

**CPF Contributions:** $12,000 (from employment)

**Calculation:**

```
STEP 1: CALCULATE BUSINESS INCOME
Gross Revenue:            $80,000
Less: Expenses:          ($95,000)
Less: Capital Allow:     ($15,000)
─────────────────────────────────
Business Loss:           ($30,000)

STEP 2: GROSS/ASSESSABLE INCOME
Employment:               $60,000
Business Loss:           ($30,000)   ← Offset against employment
─────────────────────────────────
Assessable Income:        $30,000

STEP 3: PERSONAL RELIEFS
Earned Income Relief:      $1,000
CPF Relief:               $12,000
QCR (1 child):             $4,000
─────────────────────────────────
Total Reliefs:            $17,000

STEP 4: CHARGEABLE INCOME (before donations)
$30,000 - $17,000 = $13,000

STEP 5: DONATION DEDUCTION
IPC Donations: $5,000
Tax Deduction: $5,000 × 250% = $12,500

Deduction Used: MIN($12,500, $13,000) = $12,500

STEP 6: FINAL CHARGEABLE INCOME
$13,000 - $12,500 = $500

STEP 7: TAX CALCULATION
First $500 @ 0%: $0

Net Tax Payable: $0

SUMMARY:
Employment Income:        $60,000
Business Loss:           ($30,000)
Assessable Income:        $30,000
Total Reliefs:            $17,000
Chargeable (pre-donation): $13,000
Donation Deduction:       $12,500
Final Chargeable:            $500
Net Tax Payable:              $0

NOTE: If business loss was larger, excess could be carried forward
      to future years for offset against future business income.
```

---

## 13. Implementation Notes

### 13.1 Year-Based Versioning

```typescript
// Tax rates and caps vary by Assessment Year
interface TaxYearConfig {
  assessmentYear: number;
  residentBrackets: TaxBracket[];
  nonResidentEmploymentRate: number;
  nonResidentDirectorRate: number;
  reliefCaps: ReliefCaps;
  cpfCeilings: CPFCeilings;
  donationMultiplier: number;
}

// Example: Load config for specific year
function getTaxConfig(assessmentYear: number): TaxYearConfig {
  const configs: Record<number, TaxYearConfig> = {
    2020: { /* YA2020 config */ },
    2021: { /* YA2021 config */ },
    2022: { /* YA2022 config */ },
    2023: { /* YA2023 config */ },
    2024: { /* YA2024 config with new brackets */ },
    2025: { /* YA2025 config */ },
    2026: { /* YA2026 config */ },
  };
  return configs[assessmentYear];
}
```

### 13.2 Deterministic Ordering

**Critical:** Follow IRAS computation sequence exactly:

1. Calculate all income sources
2. Apply rental/business expense deductions
3. Sum to get Assessable Income
4. Calculate all eligible reliefs
5. Cap total reliefs at Assessable Income
6. Calculate Chargeable Income (before donations)
7. Apply donation deduction (250%)
8. Cap donation deduction at Chargeable Income
9. Apply tax rates to final Chargeable Income
10. Apply rebates
11. Round to nearest dollar

### 13.3 Rounding Rules

IRAS rounds to nearest dollar (standard rounding):
- 0.50 and above → round up
- Below 0.50 → round down

```typescript
function irasRound(value: number): number {
  return Math.round(value);
}
```

### 13.4 Handling Incomplete Data

| Missing Field | Default Assumption |
|--------------|-------------------|
| Residency days | Assume resident (183+ days) |
| Age | Required - cannot default |
| CPF contributions | Calculate from salary if not provided |
| Marital status | Assume single |
| Child count | Assume 0 |
| Donation carry-forward | Assume 0 |

### 13.5 Multi-Year Projections

For financial planning projections:

```typescript
interface ProjectionAssumptions {
  salaryGrowthRate: number;      // e.g., 3% annually
  inflationRate: number;         // e.g., 2% for expense growth
  reliefCapsGrowth: number;      // Usually 0 (caps rarely change)
  taxBracketAdjustment: boolean; // Whether to adjust for inflation
}

function projectTax(
  currentInput: SingaporeTaxInput,
  yearsToProject: number,
  assumptions: ProjectionAssumptions
): SingaporeTaxOutput[] {
  // Project income forward
  // Keep reliefs constant or adjust per assumptions
  // Use current year's tax rates or project changes
}
```

### 13.6 CPF-Tax Module Integration

The Tax module depends on the CPF module for contribution data. This section defines the explicit interface between the two modules.

#### 13.6.1 Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              USER INPUT                                     │
│         (salary, bonus, age, citizenship, voluntary contributions)          │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            CPF MODULE                                       │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ Inputs:                                                              │   │
│  │  • Gross salary (monthly/annual)                                     │   │
│  │  • Bonus / Additional wages                                          │   │
│  │  • Age at end of year                                                │   │
│  │  • Citizenship status (Citizen/PR/Foreigner)                         │   │
│  │  • PR status (1st year, 2nd year, 3rd+ year)                         │   │
│  │  • Voluntary contribution amounts (RSTU, VC)                         │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                      │                                      │
│                                      ▼                                      │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ Calculates:                                                          │   │
│  │  • Employee OW contribution (capped at OW ceiling)                   │   │
│  │  • Employee AW contribution (capped at AW ceiling)                   │   │
│  │  • Employer OW contribution                                          │   │
│  │  • Employer AW contribution                                          │   │
│  │  • OA/SA/MA allocation splits                                        │   │
│  │  • Voluntary contribution tracking                                   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      │ CPFContributionResult
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            TAX MODULE                                       │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ Receives from CPF Module:                                            │   │
│  │  • employeeOWContribution  → CPF Relief (OW)                         │   │
│  │  • employeeAWContribution  → CPF Relief (AW)                         │   │
│  │  • totalEmployeeContribution → Life Insurance Relief cap calc        │   │
│  │  • voluntaryRSTU           → CPF Cash Top-up Relief                  │   │
│  │  • voluntaryMediSave       → CPF Cash Top-up Relief                  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                      │                                      │
│                                      ▼                                      │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ Uses for:                                                            │   │
│  │  • CPF Relief calculation                                            │   │
│  │  • Life Insurance Relief cap ($5,000 - CPF contributions)            │   │
│  │  • CPF Cash Top-up Relief (RSTU) calculation                         │   │
│  │  • Assessable income (employer CPF is NOT taxable)                   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### 13.6.2 CPF Module Interface Definition

```typescript
// ============================================================
// CPF MODULE EXPORTS (for Tax Module consumption)
// ============================================================

/**
 * Input required by CPF module to calculate contributions
 */
interface CPFCalculationInput {
  // Income details
  monthlyOrdinaryWages: number;      // Base salary per month
  annualAdditionalWages: number;     // Bonus, commission, etc.

  // Personal details
  ageAtEndOfYear: number;            // Age as of 31 Dec of basis year
  citizenshipStatus: 'citizen' | 'pr_1st_year' | 'pr_2nd_year' | 'pr_3rd_plus' | 'foreigner';

  // Voluntary contributions
  voluntaryContributions?: {
    rstuSelf: number;                // RSTU to own SA/RA
    rstuFamily: number;              // RSTU to family member's SA/RA
    mediSaveTopUp: number;           // Voluntary MediSave top-up
    vcSelf: number;                  // Voluntary Contribution to own account
  };

  // Year for rate lookup
  year: number;                      // e.g., 2024
}

/**
 * Output from CPF module - consumed by Tax module
 */
interface CPFContributionResult {
  // Mandatory contributions (Employee portion - TAX DEDUCTIBLE)
  employeeOWContribution: number;    // On Ordinary Wages
  employeeAWContribution: number;    // On Additional Wages
  totalEmployeeContribution: number; // OW + AW

  // Mandatory contributions (Employer portion - NOT TAXABLE INCOME)
  employerOWContribution: number;
  employerAWContribution: number;
  totalEmployerContribution: number;

  // Allocation breakdown (for CPF module's own tracking)
  allocation: {
    ordinaryAccount: number;
    specialAccount: number;
    mediSaveAccount: number;
  };

  // Voluntary contributions (for Tax relief calculation)
  voluntaryContributions: {
    rstuSelf: number;                // Eligible for self relief ($8k cap)
    rstuFamily: number;              // Eligible for family relief ($8k cap)
    mediSaveTopUp: number;           // May be eligible for relief
    vcTotal: number;                 // Total voluntary (tracking only)
  };

  // Ceiling information (for validation/display)
  ceilings: {
    owCeilingUsed: number;           // e.g., $6,800 × 12 = $81,600
    awCeilingUsed: number;           // $102,000 - OW subject to CPF
    annualCeiling: number;           // e.g., $102,000
    excessOW: number;                // Wages above OW ceiling (not CPF-able)
    excessAW: number;                // AW above AW ceiling (not CPF-able)
  };

  // Rates used (for audit/display)
  ratesApplied: {
    employeeRate: number;            // e.g., 0.20 (20%)
    employerRate: number;            // e.g., 0.17 (17%)
    ageGroup: string;                // e.g., "55 and below"
  };
}

/**
 * CPF Module's main calculation function
 * Tax module calls this to get contribution data
 */
function calculateCPFContributions(input: CPFCalculationInput): CPFContributionResult;
```

#### 13.6.3 Tax Module's Usage of CPF Data

```typescript
// ============================================================
// TAX MODULE - How it uses CPF data
// ============================================================

interface TaxReliefFromCPF {
  cpfRelief: number;                 // employeeOW + employeeAW
  cpfCashTopUpReliefSelf: number;    // min(rstuSelf, $8,000)
  cpfCashTopUpReliefFamily: number;  // min(rstuFamily, $8,000)
  lifeInsuranceReliefCap: number;    // max(0, $5,000 - totalEmployeeCPF)
}

function calculateTaxReliefsFromCPF(cpfResult: CPFContributionResult): TaxReliefFromCPF {
  return {
    // CPF Relief = Employee mandatory contributions (already capped by CPF module)
    cpfRelief: cpfResult.employeeOWContribution + cpfResult.employeeAWContribution,

    // CPF Cash Top-up Relief (RSTU) - separate caps for self and family
    cpfCashTopUpReliefSelf: Math.min(cpfResult.voluntaryContributions.rstuSelf, 8000),
    cpfCashTopUpReliefFamily: Math.min(cpfResult.voluntaryContributions.rstuFamily, 8000),

    // Life Insurance Relief cap depends on CPF contributions
    // If CPF >= $5,000, no life insurance relief available
    lifeInsuranceReliefCap: Math.max(0, 5000 - cpfResult.totalEmployeeContribution),
  };
}

// Full tax calculation incorporating CPF
function calculateTax(taxInput: TaxInput, cpfResult: CPFContributionResult): TaxOutput {
  const cpfReliefs = calculateTaxReliefsFromCPF(cpfResult);

  // Assessable income does NOT include employer CPF (it's not taxable)
  const assessableIncome = taxInput.salary + taxInput.bonus + taxInput.otherIncome;
  // Note: Employer CPF is excluded - it goes directly to CPF accounts

  // Calculate reliefs
  const reliefs = {
    earnedIncome: getEarnedIncomeRelief(taxInput.age),
    cpf: cpfReliefs.cpfRelief,
    cpfCashTopUp: cpfReliefs.cpfCashTopUpReliefSelf + cpfReliefs.cpfCashTopUpReliefFamily,
    lifeInsurance: Math.min(
      taxInput.lifeInsurancePremiums,
      taxInput.sumInsured * 0.07,
      cpfReliefs.lifeInsuranceReliefCap
    ),
    // ... other reliefs
  };

  // Continue with tax calculation...
}
```

#### 13.6.4 CPF Contribution Rates Reference

The CPF module must implement these rates (Tax module doesn't need to know, but included for reference):

**Singapore Citizens & PRs (3rd year onwards) - YA2024+:**

| Age Group | Employee Rate | Employer Rate | Total |
|-----------|--------------|---------------|-------|
| 55 and below | 20% | 17% | 37% |
| Above 55 to 60 | 15% | 15% | 30% |
| Above 60 to 65 | 9.5% | 11.5% | 21% |
| Above 65 to 70 | 7% | 9% | 16% |
| Above 70 | 5% | 7.5% | 12.5% |

**Wage Ceilings - YA2024+:**

| Ceiling | Amount | Notes |
|---------|--------|-------|
| Ordinary Wage (OW) Ceiling | $6,800/month | Max OW subject to CPF per month |
| Annual Ceiling | $102,000 | Max total wages subject to CPF per year |
| Additional Wage (AW) Ceiling | $102,000 - (OW subject to CPF) | Varies per person |

#### 13.6.5 Data Flow Example

**Scenario:** Employee aged 35, salary $8,000/month, bonus $20,000

```
INPUT TO CPF MODULE:
{
  monthlyOrdinaryWages: 8000,
  annualAdditionalWages: 20000,
  ageAtEndOfYear: 35,
  citizenshipStatus: 'citizen',
  voluntaryContributions: { rstuSelf: 7000, rstuFamily: 0, mediSaveTopUp: 0, vcSelf: 0 },
  year: 2024
}

CPF MODULE CALCULATION:
─────────────────────────────────────────────────────────────────────────
OW Calculation:
  Monthly OW = $8,000 (exceeds ceiling of $6,800)
  OW subject to CPF = $6,800 × 12 = $81,600
  Employee OW contribution = $81,600 × 20% = $16,320
  Employer OW contribution = $81,600 × 17% = $13,872

AW Calculation:
  AW Ceiling = $102,000 - $81,600 = $20,400
  Actual AW = $20,000 (within ceiling)
  AW subject to CPF = $20,000
  Employee AW contribution = $20,000 × 20% = $4,000
  Employer AW contribution = $20,000 × 17% = $3,400
─────────────────────────────────────────────────────────────────────────

CPF MODULE OUTPUT:
{
  employeeOWContribution: 16320,
  employeeAWContribution: 4000,
  totalEmployeeContribution: 20320,
  employerOWContribution: 13872,
  employerAWContribution: 3400,
  totalEmployerContribution: 17272,
  voluntaryContributions: { rstuSelf: 7000, rstuFamily: 0, ... },
  ...
}

TAX MODULE RECEIVES:
─────────────────────────────────────────────────────────────────────────
Assessable Income:
  Salary: $8,000 × 12 = $96,000
  Bonus: $20,000
  Total: $116,000
  (Employer CPF of $17,272 is NOT included - not taxable)

Reliefs from CPF:
  CPF Relief = $16,320 + $4,000 = $20,320
  CPF Cash Top-up (RSTU) = min($7,000, $8,000) = $7,000
  Life Insurance Relief Cap = max(0, $5,000 - $20,320) = $0 (no relief available)
─────────────────────────────────────────────────────────────────────────
```

#### 13.6.6 Module Boundary Responsibilities

| Responsibility | CPF Module | Tax Module |
|---------------|------------|------------|
| Determine contribution rates by age | ✓ | |
| Apply OW/AW ceilings | ✓ | |
| Calculate employee contributions | ✓ | |
| Calculate employer contributions | ✓ | |
| Track OA/SA/MA allocation | ✓ | |
| Validate RSTU eligibility | ✓ | |
| Calculate CPF Relief amount | | ✓ |
| Apply relief caps ($8k RSTU, etc.) | | ✓ |
| Calculate Life Insurance Relief cap | | ✓ |
| Include CPF in assessable income | | ✓ (excludes employer portion) |
| Project future CPF balances | ✓ | |
| Project future tax liability | | ✓ |

#### 13.6.7 Shared Configuration

Both modules need access to year-specific configuration. Recommend a shared config service:

```typescript
// Shared configuration service
interface YearConfig {
  year: number;

  // CPF-specific
  cpf: {
    owCeiling: number;           // 6800 for 2024
    annualCeiling: number;       // 102000 for 2024
    rates: CPFRateTable;         // Age-based rates
  };

  // Tax-specific
  tax: {
    brackets: TaxBracket[];
    reliefCaps: ReliefCaps;
    donationMultiplier: number;  // 2.5 for 250%
  };

  // Shared
  shared: {
    rstuCapSelf: number;         // 8000
    rstuCapFamily: number;       // 8000
    lifeInsuranceMaxRelief: number; // 5000
  };
}

// Central config lookup
function getYearConfig(year: number): YearConfig;
```

#### 13.6.8 Error Handling at Module Boundary

```typescript
// CPF module should validate and return errors
interface CPFCalculationError {
  code: 'INVALID_AGE' | 'INVALID_CITIZENSHIP' | 'NEGATIVE_WAGES' | 'UNSUPPORTED_YEAR';
  message: string;
  field?: string;
}

type CPFCalculationResponse =
  | { success: true; result: CPFContributionResult }
  | { success: false; error: CPFCalculationError };

// Tax module handles CPF errors gracefully
function calculateTax(taxInput: TaxInput): TaxOutput {
  const cpfResponse = calculateCPFContributions(toCPFInput(taxInput));

  if (!cpfResponse.success) {
    // Option 1: Default to zero CPF relief
    // Option 2: Throw error requiring CPF data
    // Option 3: Use user-provided CPF values as override
  }

  // Continue with calculation...
}
```

### 13.7 Edge Cases

| Scenario | Handling |
|----------|----------|
| Reliefs > Assessable Income | Cap reliefs at Assessable Income; excess lost |
| Donations > Chargeable Income | Carry forward excess for 5 years |
| Business loss > Other income | Carry forward loss; minimum assessable = $0 |
| Tax < $0 | Tax cannot be negative; minimum = $0 |
| Rebate > Tax | Carry forward excess PTR; other rebates lost |
| Multiple employers | Aggregate all income; single assessment |
| Joint property ownership | Split by ownership share |

---

## 14. Data Sources & References

### Official Sources

1. **IRAS Website**
   - Tax rates: https://www.iras.gov.sg/taxes/individual-income-tax/basics-of-individual-income-tax/tax-residency-and-tax-rates/individual-income-tax-rates
   - Reliefs: https://www.iras.gov.sg/taxes/individual-income-tax/basics-of-individual-income-tax/tax-reliefs-rebates-and-deductions/tax-reliefs

2. **Income Tax Act (Singapore)**
   - Chapter 134
   - Subsidiary legislation for specific relief rules

3. **CPF Board**
   - Contribution rates: https://www.cpf.gov.sg/employer/employer-obligations/how-much-cpf-contributions-to-pay
   - Wage ceilings: https://www.cpf.gov.sg/member/growing-your-savings/cpf-contribution

4. **Ministry of Finance**
   - Budget announcements (tax changes)
   - https://www.mof.gov.sg/

### Historical Rate References

| YA | Top Rate | Threshold | Key Changes |
|----|----------|-----------|-------------|
| 2020 | 22% | >$320,000 | Standard rates |
| 2021 | 22% | >$320,000 | No change |
| 2022 | 22% | >$320,000 | No change |
| 2023 | 22% | >$320,000 | No change |
| 2024 | 24% | >$1,000,000 | New 23%/24% brackets |
| 2025 | 24% | >$1,000,000 | Same as YA2024 |
| 2026 | 24% | >$1,000,000 | Same as YA2024 |

---

## 15. Appendix: Complete Tax Rate Tables

### YA2024-2026 Resident Rates

| Income Band | Rate | Tax on Band | Cumulative Tax |
|-------------|------|-------------|----------------|
| $0 - $20,000 | 0% | $0 | $0 |
| $20,001 - $30,000 | 2% | $200 | $200 |
| $30,001 - $40,000 | 3.5% | $350 | $550 |
| $40,001 - $80,000 | 7% | $2,800 | $3,350 |
| $80,001 - $120,000 | 11.5% | $4,600 | $7,950 |
| $120,001 - $160,000 | 15% | $6,000 | $13,950 |
| $160,001 - $200,000 | 18% | $7,200 | $21,150 |
| $200,001 - $240,000 | 19% | $7,600 | $28,750 |
| $240,001 - $280,000 | 19.5% | $7,800 | $36,550 |
| $280,001 - $320,000 | 20% | $8,000 | $44,550 |
| $320,001 - $500,000 | 22% | $39,600 | $84,150 |
| $500,001 - $1,000,000 | 23% | $115,000 | $199,150 |
| >$1,000,000 | 24% | - | - |

### YA2017-2023 Resident Rates

| Income Band | Rate | Tax on Band | Cumulative Tax |
|-------------|------|-------------|----------------|
| $0 - $20,000 | 0% | $0 | $0 |
| $20,001 - $30,000 | 2% | $200 | $200 |
| $30,001 - $40,000 | 3.5% | $350 | $550 |
| $40,001 - $80,000 | 7% | $2,800 | $3,350 |
| $80,001 - $120,000 | 11.5% | $4,600 | $7,950 |
| $120,001 - $160,000 | 15% | $6,000 | $13,950 |
| $160,001 - $200,000 | 18% | $7,200 | $21,150 |
| $200,001 - $240,000 | 19% | $7,600 | $28,750 |
| $240,001 - $280,000 | 19.5% | $7,800 | $36,550 |
| $280,001 - $320,000 | 20% | $8,000 | $44,550 |
| >$320,000 | 22% | - | - |

---

*End of Singapore Personal Income Tax Computation Specification*
