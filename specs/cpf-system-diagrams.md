# Singapore CPF/SRS System Diagrams

This document contains Mermaid diagrams illustrating the interactions and flows within Singapore's personal finance system.

> **⚠️ IMPORTANT**: This document is used for financial projections. All figures must be verified against official CPF sources before use in production calculations.

---

## Quick Reference: 2025 Key Figures

### Contribution Ceilings

| Parameter | 2025 Value | Notes |
|-----------|------------|-------|
| **OW Ceiling** | $7,400/month | Maximum Ordinary Wages subject to CPF |
| **AW Ceiling** | $102,000 - YTD OW | Additional Wages ceiling (annual) |
| **Total Wage Ceiling** | $102,000/year | Maximum total wages subject to CPF |

### Retirement Sums (Cohort turning 55 in 2025)

| Sum | Amount | Purpose |
|-----|--------|---------|
| **BRS** (Basic) | $106,500 | Minimum for property pledge option |
| **FRS** (Full) | $213,000 | Standard requirement (2 × BRS) |
| **ERS** (Enhanced) | $426,000 | Maximum top-up for higher payouts (4 × BRS) |

### Healthcare

| Parameter | 2025 Value | Notes |
|-----------|------------|-------|
| **BHS** (Basic Healthcare Sum) | $71,500 | MediSave cap - excess spills over |

### Interest Rates

| Account | Base Rate | Extra Interest |
|---------|-----------|----------------|
| **OA** | 2.5% p.a. | +1% on first $20K (within $60K combined) |
| **SA** | 4.0% p.a. | +1% on first $60K combined |
| **MA** | 4.0% p.a. | +1% on first $60K combined |
| **RA** | 4.0% p.a. | +2% on first $30K, +1% on next $30K |

### SRS Contribution Caps

| Status | Annual Cap |
|--------|------------|
| Singapore Citizen/PR | $15,300 |
| Foreigner | $35,700 |

---

## Glossary of CPF Terms

| Acronym | Full Name | Description |
|---------|-----------|-------------|
| **CPF** | Central Provident Fund | Singapore's mandatory social security savings scheme |
| **OA** | Ordinary Account | For housing, education, investment, insurance. Earns 2.5% p.a. |
| **SA** | Special Account | For retirement. Earns 4% p.a. Locked until 55 |
| **MA** | MediSave Account | For healthcare expenses. Earns 4% p.a. |
| **RA** | Retirement Account | Created at 55 from SA+OA. For CPF LIFE |
| **BRS** | Basic Retirement Sum | Minimum retirement savings ($106,500 in 2025) |
| **FRS** | Full Retirement Sum | Standard retirement target ($213,000 in 2025) |
| **ERS** | Enhanced Retirement Sum | Maximum for higher payouts ($426,000 in 2025) |
| **BHS** | Basic Healthcare Sum | MediSave cap ($71,500 in 2025) |
| **VL** | Valuation Limit | min(Purchase Price, Valuation) - first CPF usage tier |
| **WL** | Withdrawal Limit | 120% × VL - maximum CPF for property (bank loan) |
| **OW** | Ordinary Wages | Regular monthly salary (capped at $7,400) |
| **AW** | Additional Wages | Bonus, commission, etc. (capped at $102,000 - YTD OW) |
| **CPFIS** | CPF Investment Scheme | Invest OA/SA in approved products |
| **SRS** | Supplementary Retirement Scheme | Voluntary tax-advantaged savings |
| **AWL** | Additional Withdrawal Limits | Annual MediSave limit for insurance premiums |
| **RSTU** | Retirement Sum Topping-Up | Cash top-up scheme with tax relief |
| **CPF LIFE** | CPF Lifelong Income For the Elderly | National annuity scheme from RA |

---

## 1. System Overview: Account Relationships

```mermaid
flowchart TB
    subgraph Employment["Employment Income"]
        SALARY[Monthly Salary<br/>Ordinary Wages]
        BONUS[Bonus/Commission<br/>Additional Wages]
    end

    subgraph CPF["CPF System"]
        subgraph Accounts["CPF Accounts"]
            OA[("OA<br/>Ordinary Account<br/>2.5-3.5%")]
            SA[("SA<br/>Special Account<br/>4-5%")]
            MA[("MA<br/>MediSave Account<br/>4-5%")]
            RA[("RA<br/>Retirement Account<br/>4-6%")]
        end
    end

    subgraph Healthcare["Healthcare"]
        MSL[MediShield Life]
        ISP[Integrated Shield Plan]
        MEDICAL[Medical Expenses]
    end

    subgraph Housing["Housing"]
        PROPERTY[Property Purchase]
        MORTGAGE[Monthly Mortgage]
    end

    subgraph Retirement["Retirement"]
        CPFLIFE[CPF LIFE<br/>Monthly Payouts]
    end

    subgraph Voluntary["Voluntary Savings"]
        SRS[("SRS Account<br/>Tax-Advantaged")]
    end

    %% Employment to CPF
    SALARY --> |"Contribution<br/>37% (≤55)"| Accounts
    BONUS --> |"Contribution<br/>Subject to AW Ceiling"| Accounts

    %% CPF Allocations
    OA -.-> |"Age 55<br/>Transfer to RA"| RA
    SA -.-> |"Age 55<br/>Transfer to RA"| RA

    %% Healthcare flows
    MA --> |"Premiums"| MSL
    MA --> |"AWL Limits"| ISP
    MA --> |"Withdrawal<br/>Limits Apply"| MEDICAL

    %% Housing flows
    OA --> |"Up to WL"| PROPERTY
    OA --> |"Monthly"| MORTGAGE

    %% Retirement flows
    RA --> |"Age 65+"| CPFLIFE

    %% SRS
    SALARY -.-> |"Voluntary<br/>Up to $15,300"| SRS
    SRS -.-> |"Age 63+<br/>50% Taxable"| Retirement

    style OA fill:#4CAF50,color:#fff
    style SA fill:#2196F3,color:#fff
    style MA fill:#FF9800,color:#fff
    style RA fill:#9C27B0,color:#fff
    style SRS fill:#607D8B,color:#fff
```

---

## 2. Monthly CPF Contribution Flow

```mermaid
flowchart TD
    START([Monthly Payroll]) --> WAGES[Receive Wages]

    WAGES --> CLASSIFY{Classify Wages}

    CLASSIFY --> |"Regular Monthly"| OW[Ordinary Wages]
    CLASSIFY --> |"Irregular/Annual"| AW[Additional Wages]

    OW --> OW_CAP{OW > Ceiling?<br/>$7,400 in 2025}
    OW_CAP --> |Yes| OW_CAPPED[Cap at $7,400]
    OW_CAP --> |No| OW_FULL[Use Full OW]

    AW --> AW_CALC[Calculate AW Ceiling<br/>$102,000 - YTD OW]
    AW_CALC --> AW_CAP{AW > AW Ceiling?}
    AW_CAP --> |Yes| AW_CAPPED[Cap at AW Ceiling]
    AW_CAP --> |No| AW_FULL[Use Full AW]

    OW_CAPPED --> TOTAL[Total Wages<br/>Subject to CPF]
    OW_FULL --> TOTAL
    AW_CAPPED --> TOTAL
    AW_FULL --> TOTAL

    TOTAL --> AGE{Member Age?}

    AGE --> |"≤55"| RATE_55[37% Total<br/>20% Employee<br/>17% Employer]
    AGE --> |"55-60"| RATE_60[32.5% Total<br/>15.5% Employee<br/>17% Employer]
    AGE --> |"60-65"| RATE_65[23.5% Total<br/>10.5% Employee<br/>13% Employer]
    AGE --> |"65-70"| RATE_70[16.5% Total<br/>7.5% Employee<br/>9% Employer]
    AGE --> |">70"| RATE_71[12.5% Total<br/>5% Employee<br/>7.5% Employer]

    RATE_55 --> CALC[Calculate Contribution]
    RATE_60 --> CALC
    RATE_65 --> CALC
    RATE_70 --> CALC
    RATE_71 --> CALC

    CALC --> ROUND[Apply Rounding<br/>Total: Nearest $<br/>Employee: Floor]

    ROUND --> ALLOC[Allocate to Accounts]

    ALLOC --> OA_ALLOC[/"To OA<br/>~62% (age ≤35)"/]
    ALLOC --> SA_ALLOC[/"To SA<br/>~16% (age ≤35)"/]
    ALLOC --> MA_ALLOC[/"To MA<br/>~22% (age ≤35)"/]

    OA_ALLOC --> DONE([Contribution Complete])
    SA_ALLOC --> DONE
    MA_ALLOC --> DONE

    style START fill:#4CAF50,color:#fff
    style DONE fill:#4CAF50,color:#fff
    style OA_ALLOC fill:#4CAF50,color:#fff
    style SA_ALLOC fill:#2196F3,color:#fff
    style MA_ALLOC fill:#FF9800,color:#fff
```

---

## 3. CPF Account Allocation by Age

### Complete Contribution & Allocation Rates (2025)

| Age Group | Total Rate | Employee | Employer | OA | SA | MA |
|-----------|------------|----------|----------|----|----|-----|
| **≤35** | 37% | 20% | 17% | 23% | 6% | 8% |
| **36-45** | 37% | 20% | 17% | 21% | 7% | 9% |
| **46-50** | 37% | 20% | 17% | 19% | 8% | 10% |
| **51-55** | 37% | 20% | 17% | 15% | 11.5% | 10.5% |
| **56-60** | 29.5% | 15% | 14.5% | 12% | 3.5% | 10.5% |
| **61-65** | 20.5% | 9.5% | 11% | 3.5% | 2.5% | 10.5% |
| **66-70** | 16.5% | 7.5% | 9% | 3.5% | 1% | 8% |
| **>70** | 12.5% | 5% | 7.5% | 1% | 1% | 5.5% |

*Note: OA/SA/MA columns show % of total wages, not % of contribution.*

### Allocation Percentages (of Total Contribution)

| Age Group | OA % | SA % | MA % |
|-----------|------|------|------|
| **≤35** | 62.16% | 16.22% | 21.62% |
| **36-45** | 56.76% | 18.92% | 24.32% |
| **46-50** | 51.35% | 21.62% | 27.03% |
| **51-55** | 40.54% | 31.08% | 28.38% |
| **56-60** | 40.68% | 11.86% | 35.59% |
| **61-65** | 17.07% | 12.20% | 51.22% |
| **66-70** | 21.21% | 6.06% | 48.48% |
| **>70** | 8.00% | 8.00% | 44.00% |

```mermaid
%%{init: {'theme': 'base', 'themeVariables': { 'pie1': '#4CAF50', 'pie2': '#2196F3', 'pie3': '#FF9800'}}}%%
pie showData title Age 35 and Below - Allocation of 37% Contribution
    "OA (23% of wage)" : 62.16
    "SA (6% of wage)" : 16.22
    "MA (8% of wage)" : 21.62
```

```mermaid
%%{init: {'theme': 'base', 'themeVariables': { 'pie1': '#4CAF50', 'pie2': '#2196F3', 'pie3': '#FF9800'}}}%%
pie showData title Age 51-55 - Allocation of 37% Contribution
    "OA (15% of wage)" : 40.54
    "SA (11.5% of wage)" : 31.08
    "MA (10.5% of wage)" : 28.38
```

```mermaid
%%{init: {'theme': 'base', 'themeVariables': { 'pie1': '#4CAF50', 'pie2': '#2196F3', 'pie3': '#FF9800'}}}%%
pie showData title Age 61-65 - Allocation of 20.5% Contribution
    "OA (3.5% of wage)" : 17.07
    "SA (2.5% of wage)" : 12.20
    "MA (10.5% of wage)" : 51.22
```

### Key Observations

1. **OA decreases with age** - From 23% (≤35) to 1% (>70)
2. **SA peaks at 51-55** - 11.5% before RA creation at 55
3. **MA stays relatively stable** - Around 8-10.5% throughout working life
4. **Total rate drops after 55** - From 37% to 29.5%, then 20.5%, 16.5%, 12.5%
5. **After 55, no more SA** - SA closes, contributions go to RA instead

---

## 4. MediSave BHS Spillover Logic

```mermaid
flowchart TD
    START([MA Contribution Received]) --> CHECK{Current MA + Contribution<br/>> BHS?}

    CHECK --> |No| CREDIT_MA[Credit Full Amount to MA]
    CREDIT_MA --> DONE([Done])

    CHECK --> |Yes| CALC_EXCESS[Calculate Excess<br/>Excess = Total - BHS Room]

    CALC_EXCESS --> CREDIT_PARTIAL[Credit MA up to BHS]

    CREDIT_PARTIAL --> AGE_CHECK{Member Age?}

    AGE_CHECK --> |"< 55"| SA_CHECK{SA < FRS?}
    AGE_CHECK --> |"≥ 55"| RA_CHECK{RA < FRS?}

    SA_CHECK --> |Yes| SPILL_SA[Spillover to SA<br/>Up to FRS]
    SA_CHECK --> |No| SPILL_OA_1[Spillover to OA]

    RA_CHECK --> |Yes| SPILL_RA[Spillover to RA<br/>Up to FRS]
    RA_CHECK --> |No| SPILL_OA_2[Spillover to OA]

    SPILL_SA --> REMAINING_1{Any Remaining?}
    SPILL_RA --> REMAINING_2{Any Remaining?}

    REMAINING_1 --> |Yes| SPILL_OA_1
    REMAINING_1 --> |No| DONE
    REMAINING_2 --> |Yes| SPILL_OA_2
    REMAINING_2 --> |No| DONE

    SPILL_OA_1 --> DONE
    SPILL_OA_2 --> DONE

    style START fill:#FF9800,color:#fff
    style DONE fill:#4CAF50,color:#fff
    style SPILL_SA fill:#2196F3,color:#fff
    style SPILL_RA fill:#9C27B0,color:#fff
    style SPILL_OA_1 fill:#4CAF50,color:#fff
    style SPILL_OA_2 fill:#4CAF50,color:#fff
```

---

## 5. Age 55: Retirement Account Creation

```mermaid
flowchart TD
    START([Member Turns 55]) --> CREATE[Create Retirement Account<br/>RA Balance = $0]

    CREATE --> GET_FRS[Get Cohort FRS<br/>2025: $213,000]

    GET_FRS --> TRANSFER_SA[Transfer SA → RA]

    TRANSFER_SA --> SA_CHECK{SA ≥ FRS?}

    SA_CHECK --> |Yes| RA_FULL[RA = FRS<br/>Excess SA Withdrawable]
    SA_CHECK --> |No| CALC_REMAINING[Remaining = FRS - SA]

    CALC_REMAINING --> TRANSFER_OA[Transfer OA → RA<br/>Up to Remaining]

    TRANSFER_OA --> OA_CHECK{OA ≥ Remaining?}

    OA_CHECK --> |Yes| RA_MET[RA = FRS<br/>Excess OA Withdrawable]
    OA_CHECK --> |No| RA_SHORT[RA = SA + OA<br/>Shortfall from FRS]

    RA_FULL --> WITHDRAW[Calculate Withdrawable<br/>= Total CPF - FRS]
    RA_MET --> WITHDRAW
    RA_SHORT --> NO_WITHDRAW[No Withdrawal<br/>Below FRS]

    WITHDRAW --> PLEDGE{Property Pledge?}
    PLEDGE --> |Yes| EXTRA_WITHDRAW[Additional Withdrawable<br/>= FRS - BRS]
    PLEDGE --> |No| DONE([Complete])
    EXTRA_WITHDRAW --> DONE
    NO_WITHDRAW --> DONE

    style START fill:#9C27B0,color:#fff
    style DONE fill:#4CAF50,color:#fff
    style RA_FULL fill:#4CAF50,color:#fff
    style RA_MET fill:#4CAF50,color:#fff
    style RA_SHORT fill:#f44336,color:#fff
```

---

## 6. CPF Interest Calculation

### Base Interest Rates

| Account | Base Rate | Floor Rate | Notes |
|---------|-----------|------------|-------|
| **OA** | 2.5% p.a. | 2.5% | Pegged to 3-month average of major local banks' rates |
| **SA** | 4.0% p.a. | 4.0% | = 12-month average yield of 10-year SGS + 1% |
| **MA** | 4.0% p.a. | 4.0% | Same as SA |
| **RA** | 4.0% p.a. | 4.0% | Same as SA |

### Extra Interest Scheme

**For members below 55:**
| Tier | Eligible Balance | Extra Rate | Where Credited |
|------|-----------------|------------|----------------|
| First $60,000 | OA (max $20K) + SA + MA | +1% p.a. | SA |

**For members 55 and above:**
| Tier | Eligible Balance | Extra Rate | Where Credited |
|------|-----------------|------------|----------------|
| First $30,000 | OA (max $20K) + SA + MA + RA | +2% p.a. | RA |
| Next $30,000 | OA (max $20K) + SA + MA + RA | +1% p.a. | RA |

### Effective Interest Rates Summary

| Age | OA (first $20K) | OA (above $20K) | SA | MA | RA |
|-----|-----------------|-----------------|----|----|-----|
| **< 55** | 3.5% | 2.5% | 5.0% | 5.0% | N/A |
| **55-65** | 6.0% (first $30K) | 2.5% | 6.0% | 6.0% | 6.0% |
| **> 65** | 6.0% (first $30K) | 2.5% | 6.0% | 6.0% | 6.0% |

*Note: Extra interest calculation order is OA → SA → MA → RA*

### Calculation Example (Age 40)

```
Balances: OA $50,000, SA $30,000, MA $20,000

Step 1: Calculate combined for extra interest
- OA eligible: min($50K, $20K) = $20,000
- Combined: $20K + $30K + $20K = $70,000
- First $60K gets extra 1%

Step 2: Base interest
- OA: $50,000 × 2.5% = $1,250
- SA: $30,000 × 4.0% = $1,200
- MA: $20,000 × 4.0% = $800

Step 3: Extra interest (credited to SA)
- Extra = $60,000 × 1% = $600 → SA

Total Annual Interest:
- OA: $1,250
- SA: $1,200 + $600 = $1,800
- MA: $800
- Total: $3,850 (effective ~3.85%)
```

```mermaid
flowchart TD
    START([Monthly Interest Calculation]) --> GET_BAL[Get Account Balances<br/>OA, SA, MA, RA]

    GET_BAL --> BASE[Calculate Base Interest]

    subgraph BaseRates["Base Interest Rates"]
        OA_BASE["OA: 2.5% p.a."]
        SA_BASE["SA: 4.0% p.a."]
        MA_BASE["MA: 4.0% p.a."]
        RA_BASE["RA: 4.0% p.a."]
    end

    BASE --> AGE_CHECK{Member Age?}

    AGE_CHECK --> |"< 55"| EXTRA_U55[Extra Interest Rules<br/>Under 55]
    AGE_CHECK --> |"≥ 55"| EXTRA_55[Extra Interest Rules<br/>55 and Above]

    subgraph Under55["Under 55: Extra 1%"]
        U55_1["First $60K Combined<br/>(max $20K from OA)"]
        U55_2["Extra 1% → SA"]
    end

    subgraph Over55["55+: Extra 2% + 1%"]
        O55_1["First $30K: Extra 2%"]
        O55_2["Next $30K: Extra 1%<br/>(max $20K from OA)"]
        O55_3["Extra Interest → RA"]
    end

    EXTRA_U55 --> Under55
    EXTRA_55 --> Over55

    Under55 --> TOTAL[Total Monthly Interest]
    Over55 --> TOTAL

    TOTAL --> ACCRUE[Accrue Interest<br/>Credit Year-End]

    ACCRUE --> DONE([Complete])

    style START fill:#2196F3,color:#fff
    style DONE fill:#4CAF50,color:#fff
```

---

## 7. CPF Housing Usage Flow

### Key Terms

| Term | Full Name | Definition |
|------|-----------|------------|
| **VL** | Valuation Limit | Lower of purchase price or property valuation |
| **WL** | Withdrawal Limit | Maximum CPF that can be used = 120% × VL |
| **BRS** | Basic Retirement Sum | $106,500 (2025) - minimum needed before using CPF beyond VL |

### VL and WL Explained

**Valuation Limit (VL)** = min(Purchase Price, Market Valuation)
- Example: Price $500K, Valuation $480K → VL = $480K

**Withdrawal Limit (WL)** = VL × 120%
- Example: VL $480K → WL = $576K
- The extra 20% (VL to WL) requires meeting BRS first

### Usage Rules by Property & Loan Type

| Property Type | Loan Type | CPF Usage Limit | BRS Requirement |
|--------------|-----------|-----------------|-----------------|
| **BTO (New HDB)** | HDB Loan | No limit | None |
| **HDB Resale** | HDB Loan | Beyond VL allowed | Must meet BRS |
| **HDB Resale** | Bank Loan | Up to WL (120% VL) | Must meet BRS for VL→WL |
| **Private** | Bank Loan | Up to WL (120% VL) | Must meet BRS for VL→WL |

```mermaid
flowchart TD
    START([Property Purchase]) --> TYPE{Property Type?}

    TYPE --> |"BTO/New HDB"| BTO["No VL/WL Limits<br/>Use OA freely for:<br/>- Downpayment<br/>- Monthly instalments"]
    TYPE --> |"HDB Resale"| RESALE[VL Applies]
    TYPE --> |"Private Property"| PRIVATE[VL & WL Apply]

    BTO --> USE_OA[Use OA for<br/>Downpayment + Instalments]

    RESALE --> CALC_VL["Calculate VL<br/>VL = min#40;Price, Valuation#41;"]
    PRIVATE --> CALC_VL

    CALC_VL --> LOAN{Loan Type?}

    LOAN --> |"HDB Loan<br/>#40;2.6% interest#41;"| HDB_LOAN["HDB Loan Rules:<br/>Can exceed VL if BRS met"]
    LOAN --> |"Bank Loan<br/>#40;~4% interest#41;"| BANK_LOAN["Bank Loan Rules:<br/>WL = 120% × VL<br/>This is max CPF usage"]

    HDB_LOAN --> BRS_CHECK_1{"Total CPF<br/>#40;OA+SA+MA#41; ≥ BRS?<br/>BRS = $106,500"}
    BANK_LOAN --> PHASE1["Phase 1: Use OA up to VL<br/>#40;No BRS check needed#41;"]

    BRS_CHECK_1 --> |"Yes - BRS met"| USE_BEYOND["Can use OA beyond VL<br/>No hard cap"]
    BRS_CHECK_1 --> |"No - Below BRS"| CAP_VL_1["Capped at VL<br/>Cannot exceed"]

    PHASE1 --> BRS_CHECK_2{"Total CPF ≥ BRS?<br/>BRS = $106,500"}

    BRS_CHECK_2 --> |"Yes - BRS met"| PHASE2["Phase 2: Use VL to WL<br/>Additional 20% of VL"]
    BRS_CHECK_2 --> |"No - Below BRS"| CAP_VL_2["Capped at VL<br/>Cannot use the extra 20%"]

    USE_OA --> TRACK["Track All CPF Used:<br/>- Principal amount<br/>- Date of each withdrawal<br/>- For accrued interest calc"]
    USE_BEYOND --> TRACK
    CAP_VL_1 --> TRACK
    PHASE2 --> TRACK
    CAP_VL_2 --> TRACK

    TRACK --> ACCRUE["Accrued Interest:<br/>2.5% p.a. compound<br/>From withdrawal date"]

    ACCRUE --> DONE(["CPF Used for Property<br/>Must refund on sale"])

    style START fill:#4CAF50,color:#fff
    style DONE fill:#4CAF50,color:#fff
    style BTO fill:#8BC34A,color:#fff
    style PHASE2 fill:#2196F3,color:#fff
    style USE_BEYOND fill:#2196F3,color:#fff
    style CAP_VL_1 fill:#f44336,color:#fff
    style CAP_VL_2 fill:#f44336,color:#fff
```

### Worked Example: Bank Loan on Private Property

```
Purchase Price: $1,000,000
Valuation: $950,000
Your CPF OA: $200,000
Your Total CPF (OA+SA+MA): $280,000

VL = min($1,000,000, $950,000) = $950,000
WL = $950,000 × 120% = $1,140,000

Since Total CPF ($280,000) > BRS ($106,500):
✓ Can use full OA up to WL ($1,140,000)
✓ But you only have $200,000 OA, so use all $200K

If Total CPF was only $80,000 (below BRS):
✗ Can only use OA up to VL ($950,000)
✗ Cannot access the extra 20% (VL to WL)
```

---

## 8. Property Sale: Accrued Interest Refund

```mermaid
flowchart TD
    START([Sell Property]) --> GET_HISTORY[Get CPF Withdrawal History<br/>Dates + Amounts]

    GET_HISTORY --> CALC_EACH[For Each Withdrawal:<br/>Calculate Accrued Interest]

    CALC_EACH --> FORMULA["Interest = Principal × (1.025^years - 1)"]

    FORMULA --> SUM[Sum All Principal + Interest]

    SUM --> AGE_CHECK{Seller Age?}

    AGE_CHECK --> |"< 55"| REFUND_OA[Refund All to OA]

    AGE_CHECK --> |"≥ 55"| CHECK_RA{RA < FRS?}

    CHECK_RA --> |Yes| REFUND_RA[Refund to RA<br/>Up to FRS]
    CHECK_RA --> |No| REFUND_OA_55[Refund to OA]

    REFUND_RA --> REMAINING{Remaining After<br/>RA Topped to FRS?}

    REMAINING --> |Yes| REFUND_OA_REM[Remainder to OA]
    REMAINING --> |No| DONE([Refund Complete])

    REFUND_OA --> DONE
    REFUND_OA_55 --> DONE
    REFUND_OA_REM --> DONE

    style START fill:#FF9800,color:#fff
    style DONE fill:#4CAF50,color:#fff
    style FORMULA fill:#2196F3,color:#fff
```

---

## 9. CPF LIFE Payout Flow

### CPF LIFE Overview

| Criteria | Details |
|----------|---------|
| **Eligibility** | Singapore Citizens/PRs with RA ≥ $60,000 at age 65 |
| **Auto-enrollment** | Yes, if RA ≥ $60,000 |
| **Payout Start** | Age 65 (can defer up to 70) |
| **Payout Duration** | Lifelong (until death) |
| **Bequest** | Remaining annuity premium to beneficiaries |

### Three CPF LIFE Plans Compared

| Feature | Standard | Basic | Escalating |
|---------|----------|-------|------------|
| **Monthly Payout** | Highest | Lower | Lowest initially |
| **Bequest** | Lower | Highest | Medium |
| **Payout Pattern** | Level (fixed) | Level (fixed) | +2% yearly |
| **Best For** | Maximize income | Leave more to family | Inflation protection |

### Approximate Payout Factors (per $1,000 of RA balance)

*These are estimates - actual rates depend on cohort and prevailing interest rates*

| Start Age | Standard ($/month) | Basic ($/month) | Escalating ($/month) |
|-----------|-------------------|-----------------|---------------------|
| **65** | $5.50 | $5.00 | $4.40 |
| **66** | $5.90 | $5.40 | $4.70 |
| **67** | $6.30 | $5.80 | $5.00 |
| **68** | $6.80 | $6.20 | $5.40 |
| **69** | $7.30 | $6.70 | $5.80 |
| **70** | $7.90 | $7.20 | $6.30 |

**Example**: RA balance $200,000, Standard plan at age 65:
- Monthly payout ≈ $200K ÷ $1K × $5.50 = **$1,100/month**

### Deferral Bonus

| Defer From 65 To | Payout Increase |
|------------------|-----------------|
| 66 | +7% |
| 67 | +14% |
| 68 | +21% |
| 69 | +28% |
| 70 | +35% |

*Approximately 7% increase per year of deferral*

```mermaid
flowchart TD
    START([Member Turns 65]) --> CHECK_RA{RA ≥ $60,000?}

    CHECK_RA --> |"No - Below $60K"| DRAWDOWN["Retirement Sum Scheme<br/>Monthly drawdown<br/>Until RA depleted"]
    CHECK_RA --> |"Yes - $60K or more"| AUTO_ENROLL["Auto-Enrolled in CPF LIFE<br/>Lifelong payouts guaranteed"]

    AUTO_ENROLL --> SELECT_PLAN{Select Plan<br/>by age 65}

    SELECT_PLAN --> STANDARD["STANDARD PLAN<br/>━━━━━━━━━━━━<br/>✓ Highest monthly payout<br/>✓ Level payouts for life<br/>✗ Lower bequest"]
    SELECT_PLAN --> BASIC["BASIC PLAN<br/>━━━━━━━━━━━━<br/>✓ Highest bequest<br/>✓ Level payouts for life<br/>✗ Lower monthly payout"]
    SELECT_PLAN --> ESCALATING["ESCALATING PLAN<br/>━━━━━━━━━━━━<br/>✓ Payouts increase 2%/year<br/>✓ Inflation protection<br/>✗ Lowest starting payout"]

    STANDARD --> DEFER{Defer Payout?<br/>Can wait up to age 70}
    BASIC --> DEFER
    ESCALATING --> DEFER

    DEFER --> |"Start at 65"| PAYOUT_65["Base Payout<br/>100% of estimated amount"]
    DEFER --> |"Defer to 70"| PAYOUT_70["Enhanced Payout<br/>~135% of base amount<br/>#40;+7% per year#41;"]

    PAYOUT_65 --> LIFETIME[Lifetime Monthly Payouts]
    PAYOUT_70 --> LIFETIME

    DRAWDOWN --> DEPLETED([RA Depleted])
    LIFETIME --> DEATH([Member Passes])

    DEATH --> BEQUEST[Bequest to<br/>Beneficiaries]

    style START fill:#9C27B0,color:#fff
    style LIFETIME fill:#4CAF50,color:#fff
    style BEQUEST fill:#607D8B,color:#fff
```

---

## 10. SRS Contribution & Withdrawal Flow

```mermaid
flowchart TD
    START([SRS Account]) --> CONTRIB_FLOW[Contribution Flow]
    START --> WITHDRAW_FLOW[Withdrawal Flow]

    subgraph Contribution["Annual Contribution"]
        INCOME[Taxable Income] --> CAP_CHECK{Check Cap}
        CAP_CHECK --> |Citizen/PR| CAP_15["$15,300/year"]
        CAP_CHECK --> |Foreigner| CAP_35["$35,700/year"]
        CAP_15 --> RELIEF[Tax Relief<br/>Dollar-for-Dollar]
        CAP_35 --> RELIEF
        RELIEF --> OVERALL{"Overall Relief<br/>< $80,000?"}
        OVERALL --> |Yes| SAVE[Tax Savings =<br/>Contribution × Marginal Rate]
        OVERALL --> |No| PARTIAL[Partial Relief Only]
    end

    subgraph Withdrawal["Withdrawal Rules"]
        REQ[Withdrawal Request] --> AGE_CHECK{Age vs Statutory<br/>Retirement Age?}
        AGE_CHECK --> |Before| EARLY["EARLY WITHDRAWAL<br/>100% Taxable<br/>+ 5% Penalty"]
        AGE_CHECK --> |After| RET["RETIREMENT WITHDRAWAL<br/>50% Taxable<br/>No Penalty"]

        RET --> WINDOW{Within 10-Year<br/>Window?}
        WINDOW --> |Yes| SPREAD[Spread Withdrawals<br/>~$40K/year Tax-Free]
        WINDOW --> |No| FORCED[Forced Withdrawal<br/>50% Taxable]

        EARLY --> EXCEPT{Exceptional<br/>Circumstance?}
        EXCEPT --> |"Death/Terminal"| EXEMPT["Up to $400K<br/>Tax Exempt"]
        EXCEPT --> |No| FULL_TAX[Full Tax + Penalty]
    end

    CONTRIB_FLOW --> Contribution
    WITHDRAW_FLOW --> Withdrawal

    style START fill:#607D8B,color:#fff
    style SAVE fill:#4CAF50,color:#fff
    style EARLY fill:#f44336,color:#fff
    style RET fill:#4CAF50,color:#fff
```

---

## 11. Healthcare Financing Flow

```mermaid
flowchart TD
    subgraph MediSave["MediSave Account (MA)"]
        MA_BAL[("MA Balance<br/>Cap: BHS")]
    end

    subgraph Insurance["Health Insurance"]
        MSL["MediShield Life<br/>(Mandatory)"]
        ISP["Integrated Shield Plan<br/>(Optional)"]
        RIDER["ISP Rider<br/>(Optional)"]
    end

    subgraph Medical["Medical Expenses"]
        INPATIENT[Inpatient<br/>Hospital Stay]
        OUTPATIENT[Outpatient<br/>Chronic Disease]
        SURGERY[Day Surgery]
    end

    %% Premium Payments
    MA_BAL --> |"Full Premium<br/>From MediSave"| MSL
    MA_BAL --> |"Up to AWL<br/>$300-$900/year"| ISP
    CASH_1([Cash]) --> |"Excess Premium"| ISP
    CASH_2([Cash]) --> |"Full Premium"| RIDER

    %% Claims Flow
    INPATIENT --> CLAIM_1{Claim}
    OUTPATIENT --> CLAIM_2{Claim}
    SURGERY --> CLAIM_3{Claim}

    CLAIM_1 --> DEDUCT[Pay Deductible<br/>$1,500-$3,000]
    CLAIM_2 --> DEDUCT
    CLAIM_3 --> DEDUCT

    DEDUCT --> MSL_PAY[MediShield Life Pays<br/>B2/C Ward Rate]

    MSL_PAY --> ISP_CHECK{Have ISP?}

    ISP_CHECK --> |Yes| ISP_PAY[ISP Pays Upgrade<br/>Private/A/B1 Rate]
    ISP_CHECK --> |No| COINSURE[Patient Pays<br/>Co-Insurance 3-10%]

    ISP_PAY --> RIDER_CHECK{Have Rider?}

    RIDER_CHECK --> |Yes| RIDER_PAY[Rider Covers<br/>Deductible + Co-Pay]
    RIDER_CHECK --> |No| PATIENT_PAY[Patient Pays<br/>Remaining]

    COINSURE --> MA_WITHDRAW[Can Use MediSave<br/>Within Limits]
    PATIENT_PAY --> MA_WITHDRAW
    RIDER_PAY --> DONE([Claim Settled])
    MA_WITHDRAW --> DONE

    style MA_BAL fill:#FF9800,color:#fff
    style MSL fill:#2196F3,color:#fff
    style ISP fill:#9C27B0,color:#fff
    style DONE fill:#4CAF50,color:#fff
```

---

## 12. Complete Lifecycle: Age Progression

```mermaid
timeline
    title CPF Lifecycle Events

    section Working Years (22-54)
        Age 22-35 : Start Employment
                  : CPF Contributions Begin
                  : OA 62%, SA 16%, MA 22%

        Age 35-45 : Allocation Shifts
                  : OA 57%, SA 19%, MA 24%
                  : Property Purchase Common

        Age 45-55 : Allocation Shifts Again
                  : OA 41%, SA 31%, MA 28%
                  : Focus on Retirement

    section Retirement Transition (55-65)
        Age 55 : RA Created
               : SA → RA Transfer
               : OA → RA (if needed)
               : Can Withdraw Above FRS

        Age 55-60 : Contribution Rate Drops
                  : 32.5% Total
                  : SA Closed (2025+)

        Age 60-65 : Contribution Rate 23.5%
                  : MA Allocation 74%
                  : Prepare for CPF LIFE

    section Retirement (65+)
        Age 65 : CPF LIFE Begins
               : Monthly Payouts Start
               : Can Defer to 70

        Age 65-70 : Optional Deferral
                  : +7% per Year Bonus
                  : Continue Working OK

        Age 70+ : Maximum Payout
                : Lifelong Income
                : Bequest on Death
```

---

## 13. Data Flow: Simulation Engine

```mermaid
flowchart LR
    subgraph Input["User Input"]
        PROFILE[Profile<br/>DOB, Status]
        BALANCES[Current<br/>Balances]
        EMPLOYMENT[Employment<br/>Salary, Bonus]
        PROPERTY[Property<br/>Details]
    end

    subgraph Engine["Simulation Engine"]
        direction TB
        CONFIG[Load Config<br/>Rates, Ceilings]

        subgraph Loop["Monthly Loop (40 years)"]
            CONTRIB[Calculate<br/>Contribution]
            ALLOC[Allocate to<br/>OA/SA/MA]
            INTEREST[Calculate<br/>Interest]
            EVENTS[Check Life<br/>Events]
            SNAPSHOT[Record<br/>Snapshot]
        end

        CONFIG --> Loop
    end

    subgraph Output["Simulation Output"]
        MONTHLY[Monthly<br/>Snapshots]
        YEARLY[Yearly<br/>Summaries]
        MILESTONES[Key<br/>Milestones]
        RETIREMENT[Retirement<br/>Projection]
        RECOMMEND[Recommendations]
    end

    Input --> Engine
    Engine --> Output

    CONTRIB --> ALLOC --> INTEREST --> EVENTS --> SNAPSHOT
    SNAPSHOT --> |Next Month| CONTRIB

    style Engine fill:#e3f2fd
    style Loop fill:#fff
```

---

## 14. Scenario Comparison

```mermaid
flowchart TD
    BASE[Base Scenario<br/>Current Path] --> SIM[Run Simulation]

    ALT1["Scenario A<br/>SA Top-up $7K/year"] --> SIM
    ALT2["Scenario B<br/>Max CPF for Housing"] --> SIM
    ALT3["Scenario C<br/>SRS $15K/year"] --> SIM

    SIM --> RESULTS[Compare Results]

    RESULTS --> CHART["Projection Chart<br/>Multi-line Overlay"]
    RESULTS --> TABLE["Difference Table<br/>Key Metrics"]
    RESULTS --> RANK["Ranking<br/>By Goal"]

    CHART --> DECIDE{User Decision}
    TABLE --> DECIDE
    RANK --> DECIDE

    DECIDE --> ACTION[Take Action<br/>Implement Best Scenario]

    style BASE fill:#4CAF50,color:#fff
    style ALT1 fill:#2196F3,color:#fff
    style ALT2 fill:#FF9800,color:#fff
    style ALT3 fill:#9C27B0,color:#fff
```

---

## 15. CPFIS Investment Flow

```mermaid
flowchart TD
    subgraph CPF["CPF Accounts"]
        OA[("OA Balance")]
        SA[("SA Balance")]
    end

    subgraph Reserves["Reserved Amounts"]
        OA_RES["OA Reserve<br/>$20,000"]
        SA_RES["SA Reserve<br/>$40,000"]
    end

    subgraph Investible["Investible Balances"]
        OA_INV["Investible OA<br/>(OA - $20K)"]
        SA_INV["Investible SA<br/>(SA - $40K)"]
    end

    OA --> |"Minus Reserve"| OA_RES
    OA --> |"Available for<br/>Investment"| OA_INV
    SA --> |"Minus Reserve"| SA_RES
    SA --> |"Available for<br/>Investment"| SA_INV

    subgraph Limits["Investment Limits (OA)"]
        STOCK_LIM["Stocks/REITs/Corp Bonds<br/>35% of Investible"]
        GOLD_LIM["Gold<br/>10% of Investible"]
        FULL_LIM["Unit Trusts/ETFs/SGS<br/>100% of Investible"]
    end

    OA_INV --> STOCK_LIM
    OA_INV --> GOLD_LIM
    OA_INV --> FULL_LIM

    subgraph Products["CPFIS Products"]
        STI["STI ETF<br/>0.30% TER"]
        GLOBAL["Infinity Global<br/>0.735% TER"]
        SGS["SGS Bonds<br/>T-Bills"]
        UT["Unit Trusts"]
    end

    STOCK_LIM --> STI
    FULL_LIM --> GLOBAL
    FULL_LIM --> SGS
    FULL_LIM --> UT

    SA_INV --> |"Lower-risk only"| SGS
    SA_INV --> |"Lower-risk only"| UT

    style OA fill:#4CAF50,color:#fff
    style SA fill:#2196F3,color:#fff
    style OA_RES fill:#ffcccc
    style SA_RES fill:#ccccff
```

---

## 16. SA Shielding Strategy Timeline

```mermaid
timeline
    title SA Shielding Strategy Around Age 55

    section Before 55
        2 years before : Plan SA shielding amount
                       : Calculate OA vs SA balances
        6 months before : Purchase T-Bills/SGS using SA
                        : SA balance decreases
        1 day before : Last chance to shield SA

    section At 55
        Birthday : RA created
                 : SA (now low) transfers to RA
                 : OA fills remaining FRS gap

    section After 55
        6 months after : T-Bills mature
                       : Proceeds return to SA
        Ongoing : SA earns 4% (withdrawable)
                : RA earns 4-6% (locked for LIFE)
```

---

## 17. SA Shielding Decision Flow

```mermaid
flowchart TD
    START([Approaching Age 55]) --> CHECK{Can OA cover FRS?}

    CHECK --> |"OA ≥ FRS"| SHIELD_ALL["Shield Entire SA<br/>Buy T-Bills with all SA"]
    CHECK --> |"OA < FRS"| CALC["Calculate SA needed<br/>for FRS gap"]

    CALC --> PARTIAL["Shield: SA - (FRS - OA)<br/>Leave minimum for FRS"]

    SHIELD_ALL --> BUY[Purchase T-Bills/SGS<br/>Day before turning 55]
    PARTIAL --> BUY

    BUY --> TURN55[Turn 55]

    TURN55 --> RA_FORM["RA Formation:<br/>Low SA + High OA → RA"]

    RA_FORM --> MATURE[Instruments Mature<br/>6 months later]

    MATURE --> RETURN["Proceeds Return to SA<br/>(Original source account)"]

    RETURN --> BENEFIT["Benefits:<br/>- SA at 4% withdrawable<br/>- OA now in RA at 4%+<br/>- More flexibility"]

    style BENEFIT fill:#4CAF50,color:#fff
    style BUY fill:#2196F3,color:#fff
```

---

## 18. OA to SA Transfer and Top-up Flow

```mermaid
flowchart TD
    subgraph Before55["Before Age 55"]
        CASH1["Cash Top-up"] --> SA1["→ SA"]
        OA_TRANS["OA → SA Transfer"] --> SA1
        MA_TOP["MediSave Top-up"] --> MA1["→ MA"]
    end

    subgraph After55["After Age 55"]
        CASH2["Cash Top-up"] --> RA1["→ RA only"]
        SA_TRANS["SA → RA Transfer"] --> RA1
        OA_TRANS2["OA → RA Transfer"] --> RA1
        MA_TOP2["MediSave Top-up"] --> MA2["→ MA"]
    end

    subgraph TaxRelief["Tax Relief (RSTU)"]
        SELF["Self: up to $8,000"]
        FAMILY["Family: up to $8,000"]
        TOTAL["Combined Cap: $16,000"]
    end

    SA1 --> SELF
    RA1 --> SELF
    SA1 --> FAMILY
    RA1 --> FAMILY

    AGE{Age Check} --> |"< 55"| Before55
    AGE --> |"≥ 55"| After55

    style SA1 fill:#2196F3,color:#fff
    style RA1 fill:#9C27B0,color:#fff
    style Before55 fill:#e8f5e9
    style After55 fill:#fff3e0
```

---

## 19. CPF Education Scheme Flow

```mermaid
flowchart TD
    OA[("OA Balance")] --> WITHDRAW["Withdraw for Education"]

    WITHDRAW --> ELIGIBLE{Eligible Course?}

    ELIGIBLE --> |"NUS/NTU/SMU/etc"| APPROVED[Approved]
    ELIGIBLE --> |"Not eligible"| REJECTED[Rejected]

    APPROVED --> DISBURSE["Funds Disbursed<br/>Interest starts accruing<br/>@ 2.5% p.a."]

    DISBURSE --> STUDY["Complete Studies"]

    STUDY --> REPAY["Repay over 12 years<br/>Min $100/month"]

    REPAY --> OA_RETURN["Repayments return<br/>to own OA"]

    subgraph Waiver["Loan Waiver Eligibility"]
        AGE55["Age 55+"]
        FRS_MET["RA ≥ FRS"]
        WAIVER["Loan Waived!"]
    end

    REPAY --> |"Check eligibility"| AGE55
    AGE55 --> FRS_MET
    FRS_MET --> WAIVER

    style OA fill:#4CAF50,color:#fff
    style WAIVER fill:#9C27B0,color:#fff
    style OA_RETURN fill:#4CAF50,color:#fff
```

---

## 20. Property Sale with CPF Refund (Detailed)

```mermaid
flowchart TD
    SALE([Property Sale Initiated]) --> CALC_PROCEEDS["Calculate Sale Proceeds<br/>Sale Price - Outstanding Loan"]

    CALC_PROCEEDS --> CALC_COSTS["Deduct Selling Costs<br/>Agent Commission + Legal Fees"]

    CALC_COSTS --> CALC_CPF["Calculate CPF Refund Required"]

    subgraph CPF_Refund["CPF Refund Calculation"]
        PRINCIPAL["OA Principal Used<br/>(Downpayment + Instalments)"]
        ACCRUED["+ Accrued Interest<br/>(2.5% compound)"]
        TOTAL_REF["= Total Refund Required"]
    end

    CALC_CPF --> PRINCIPAL
    PRINCIPAL --> ACCRUED
    ACCRUED --> TOTAL_REF

    TOTAL_REF --> AGE_CHECK{Member's Age?}

    AGE_CHECK --> |"< 55"| TO_OA["Full Refund → OA"]
    AGE_CHECK --> |"≥ 55"| TO_RA_FIRST["Refund → RA first<br/>(up to FRS)"]

    TO_RA_FIRST --> RA_FULL{RA reached FRS?}
    RA_FULL --> |"Yes, or excess"| REMAINDER["Remainder → OA"]
    RA_FULL --> |"No"| ALL_TO_RA["All to RA"]

    TO_OA --> NET["Calculate Net Cash Proceeds"]
    REMAINDER --> NET
    ALL_TO_RA --> NET

    NET --> SHORTFALL{Shortfall?}
    SHORTFALL --> |"Yes"| CASH_TOPUP["No cash top-up required<br/>if sold at market value"]
    SHORTFALL --> |"No"| RECEIVE["Receive Cash Proceeds"]

    style TO_OA fill:#4CAF50,color:#fff
    style TO_RA_FIRST fill:#9C27B0,color:#fff
    style REMAINDER fill:#4CAF50,color:#fff
```

---

## 21. Accrued Interest Accumulation

```mermaid
xychart-beta
    title "Accrued Interest Growth Over 25 Years (Example: $200K OA Used)"
    x-axis [Y1, Y5, Y10, Y15, Y20, Y25]
    y-axis "Amount ($)" 0 --> 400000
    bar [200000, 200000, 200000, 200000, 200000, 200000]
    line [205000, 226000, 256000, 291000, 330000, 375000]
```

*Note: Bar = Principal Used, Line = Total Refund Required (Principal + Accrued Interest)*

---

## Summary: Key Account Interactions

### CPF Flow Summary Table

| From | To | Trigger | Amount/Limit | BRS Requirement |
|------|-----|---------|--------------|-----------------|
| **Employment** | OA/SA/MA | Monthly payroll | Based on age rates & OW/AW ceilings | N/A |
| **MA** | SA/RA | MA > BHS ($71,500) | Spillover excess | N/A |
| **MA** | OA | MA > BHS, SA/RA ≥ FRS | Remaining spillover | N/A |
| **OA** | BTO Property | Purchase/instalment | No limit | None |
| **OA** | HDB Resale (HDB Loan) | Purchase/instalment | Beyond VL allowed | Must meet BRS |
| **OA** | HDB Resale/Private (Bank Loan) | Purchase/instalment | Up to VL freely | None for VL |
| **OA** | HDB Resale/Private (Bank Loan) | Purchase/instalment | VL to WL (extra 20%) | Must meet BRS |
| **OA** | RA | Age 55 | To fill FRS gap | N/A (automatic) |
| **SA** | RA | Age 55 | Full SA transfers | N/A (automatic) |
| **RA** | CPF LIFE | Age 65 | Annuity premium | RA ≥ $60K |
| **CPF LIFE** | Member | Age 65+ | Monthly payout (lifelong) | N/A |
| **Property Sale** | OA (< 55) | Sale completed | Principal + accrued interest | N/A |
| **Property Sale** | RA then OA (≥ 55) | Sale completed | Fill RA to FRS first | N/A |
| **Income** | SRS | Voluntary | Up to $15,300/$35,700 | N/A |
| **SRS** | Member | Age 63+ | 50% taxable withdrawal | N/A |
| **OA** | CPFIS | Voluntary | OA - $20K reserve | N/A |
| **SA** | CPFIS | Voluntary | SA - $40K reserve (low risk only) | N/A |
| **Cash** | SA (< 55) | Top-up | Up to FRS, $8K tax relief | N/A |
| **Cash** | RA (≥ 55) | Top-up | Up to ERS, $8K tax relief | N/A |
| **OA** | SA (< 55) | Transfer | Up to FRS, $8K tax relief | N/A |
| **OA** | Education | Loan | Course fees, 2.5% accrued interest | N/A |

### Housing CPF Usage Quick Reference

| Scenario | Max CPF Usage | BRS Check Required? |
|----------|---------------|---------------------|
| BTO (New HDB) | No limit | No |
| HDB Resale + HDB Loan | Beyond VL | Yes - for beyond VL |
| HDB Resale + Bank Loan | VL | No |
| HDB Resale + Bank Loan | VL to WL (+20%) | Yes - for VL→WL |
| Private + Bank Loan | VL | No |
| Private + Bank Loan | VL to WL (+20%) | Yes - for VL→WL |

**VL** = min(Price, Valuation)
**WL** = VL × 120%
**BRS** = $106,500 (2025)

---

---

## 22. CPF Lifecycle & Concept Interactions (Comprehensive Overview)

This diagram shows how all CPF concepts interact across the entire lifecycle from employment to retirement.

```mermaid
flowchart TB
    subgraph Employment["💼 Employment Phase (Before 55)"]
        Salary[Monthly Salary] --> |"Employee: 20%<br/>Employer: 17%"| CPF[Total CPF Contribution]
        CPF --> |"23% of wage"| OA[Ordinary Account<br/>2.5% p.a.]
        CPF --> |"6% of wage"| SA[Special Account<br/>4% p.a.]
        CPF --> |"8% of wage"| MA[MediSave Account<br/>4% p.a.]
    end

    subgraph OA_Uses["OA Usage"]
        OA --> |"Housing"| HDB[HDB Purchase<br/>Down payment + Loan]
        OA --> |"Education"| EDU[Education<br/>Approved institutions]
        OA --> |"Investment"| CPFIS_OA[CPFIS-OA<br/>Stocks, Unit Trusts]
        OA --> |"Voluntary"| SA_TopUp[Top-up to SA<br/>Tax relief up to $8k]
    end

    subgraph SA_Uses["SA Usage"]
        SA --> |"Investment"| CPFIS_SA[CPFIS-SA<br/>Lower risk only]
        SA --> |"Cannot withdraw"| SA_Lock[Locked until 55]
    end

    subgraph MA_Uses["MA Usage"]
        MA --> |"Healthcare"| Medical[Medical Bills<br/>Hospitalization]
        MA --> |"Insurance"| Shield[MediShield Life<br/>+ Integrated Plans]
        MA --> |"Cap"| BHS[Basic Healthcare Sum<br/>$71,500 in 2025]
    end

    subgraph Age55["🎂 At Age 55"]
        SA --> |"Transfers to"| RA[Retirement Account<br/>4% p.a.]
        OA --> |"Tops up RA to FRS"| RA

        RA --> |"Must meet"| FRS[Full Retirement Sum<br/>$213,000 in 2025]

        OA --> |"If FRS met"| Withdraw55[Withdraw Excess OA]
        OA --> |"If FRS not met"| NoWithdraw[Cannot Withdraw<br/>Must top up RA]
    end

    subgraph Retirement["🏖️ Retirement Phase (55+)"]
        RA --> |"Option 1"| CPFLIFE[CPF LIFE<br/>Lifelong payouts from 65]
        RA --> |"Option 2"| RS[Retirement Sum Scheme<br/>Fixed period payouts]

        CPFLIFE --> Standard[Standard Plan<br/>Higher payout]
        CPFLIFE --> Basic[Basic Plan<br/>Higher bequest]
        CPFLIFE --> Escalating[Escalating Plan<br/>+2% yearly]
    end

    subgraph Schemes["Key Retirement Sums"]
        BRS[Basic Retirement Sum<br/>$106,500] --> |"Half of FRS"| FRS
        FRS --> |"Double of BRS"| ERS[Enhanced Retirement Sum<br/>$426,000]
    end

    subgraph Death["Upon Death"]
        OA --> |"Nominee"| Beneficiary[Beneficiaries]
        SA --> |"Nominee"| Beneficiary
        MA --> |"Nominee"| Beneficiary
        RA --> |"Bequest"| Beneficiary
    end

    subgraph Special["Special Schemes"]
        OA --> |"Property pledge"| Pledge[Property Pledge<br/>Use property to meet FRS]
        SA --> |"Before 55"| Shield_SA[SA Shielding<br/>Transfer to spouse/invest]
        RA --> |"Top-up"| RSTU[Retirement Sum Top-up<br/>Tax relief up to $8k]
    end

    style OA fill:#3b82f6,color:#fff
    style SA fill:#10b981,color:#fff
    style MA fill:#f59e0b,color:#fff
    style RA fill:#8b5cf6,color:#fff
    style FRS fill:#ef4444,color:#fff
    style BRS fill:#f97316,color:#fff
    style ERS fill:#dc2626,color:#fff
    style CPFLIFE fill:#06b6d4,color:#fff
```

### Key Lifecycle Summary

| Age | What Happens |
|-----|--------------|
| Working | Contributions split into OA (23%), SA (6%), MA (8%) |
| Before 55 | OA for housing/education, SA locked, MA for healthcare |
| At 55 | SA closes → transfers to RA. OA tops up RA to meet FRS |
| 55+ | Can withdraw OA excess only if FRS is met in RA |
| 65+ | CPF LIFE payouts begin from RA |

### Critical Rules

1. **FRS is mandatory** - Must have $213k (2025) in RA before any OA withdrawal at 55
2. **SA → RA is automatic** - No choice at age 55, entire SA transfers to RA
3. **OA → RA is forced** - If SA transfer doesn't meet FRS, OA must top up
4. **Property counts** - Can pledge property value toward FRS requirement
5. **No early SA withdrawal** - SA is completely locked until 55 (except CPFIS investments)
6. **MA has BHS cap** - Excess spills over to SA/RA, then OA

---

## 23. CPF Integration with Assetra Core Modules

This section maps how CPF events interact with Assetra's core financial data models for projection calculations.

### Assetra Core Entities Reference

| Entity | Description | Key Fields |
|--------|-------------|------------|
| **CashAccount** | User's bank savings/checking | `balance`, `interestRate`, `isAccumulator` |
| **Income** | Salary, bonus, dividends | `amount`, `frequency`, `category`, `growthRate` |
| **Expense** | Monthly/annual spending | `amount`, `frequency`, `category`, `growthRate` |
| **Asset** | Property, investments, etc. | `currentValue`, `annualGrowthRate`, `category` |
| **Liability** | Mortgages, loans, debts | `currentBalance`, `interestRateApr`, `minimumPayment` |
| **PropertyScenario** | HDB/Condo/Landed details | `propertyPrice`, `downPayment`, `loanAmount`, `loanTenure` |
| **ScenarioEvent** | Life events with impacts | `occursOn`, `impacts[]` on above entities |

---

### 23.1 CPF ↔ Assetra Integration Map

```mermaid
flowchart TB
    subgraph Assetra["Assetra Core Modules"]
        CASH[("CashAccount<br/>Bank Savings")]
        INCOME[("Income<br/>Salary/Bonus")]
        EXPENSE[("Expense<br/>Monthly Bills")]
        ASSET[("Asset<br/>Properties/Investments")]
        LIABILITY[("Liability<br/>Mortgages/Loans")]
        TIMELINE[("Timeline<br/>Net Worth Projection")]
    end

    subgraph CPF["CPF Accounts"]
        OA[("OA<br/>Ordinary Account")]
        SA[("SA<br/>Special Account")]
        MA[("MA<br/>MediSave Account")]
        RA[("RA<br/>Retirement Account")]
    end

    subgraph Events["Life Events / Triggers"]
        E1[Monthly Salary]
        E2[Buy Property]
        E3[Medical Bill]
        E4[Turn 55]
        E5[Turn 65]
        E6[Sell Property]
        E7[Top-up CPF]
        E8[CPFIS Investment]
    end

    %% Salary flows
    E1 --> |"Employee 20%"| CASH
    E1 --> |"→ OA/SA/MA"| CPF
    INCOME --> |"Gross Salary"| E1

    %% Property purchase
    E2 --> |"Cash portion"| CASH
    E2 --> |"OA for downpayment"| OA
    E2 --> |"OA for monthly"| OA
    E2 --> |"Create Asset"| ASSET
    E2 --> |"Create Liability"| LIABILITY

    %% Medical
    E3 --> |"MA withdrawal"| MA
    E3 --> |"Cash if MA insufficient"| CASH
    E3 --> |"Create Expense"| EXPENSE

    %% Age 55
    E4 --> |"SA → RA"| RA
    E4 --> |"OA → RA"| RA
    E4 --> |"Withdraw excess → Cash"| CASH

    %% Age 65
    E5 --> |"CPF LIFE payout"| RA
    RA --> |"Monthly income"| INCOME
    RA --> |"→ Cash"| CASH

    %% Property sale
    E6 --> |"Refund OA+interest"| OA
    E6 --> |"Net proceeds → Cash"| CASH
    E6 --> |"Remove Asset"| ASSET
    E6 --> |"Clear Liability"| LIABILITY

    %% Top-ups
    E7 --> |"Cash → SA/RA"| CASH
    E7 --> |"Tax relief"| EXPENSE

    %% CPFIS
    E8 --> |"OA → Investment"| OA
    E8 --> |"SA → Investment"| SA
    E8 --> |"Create Asset"| ASSET

    style CASH fill:#4CAF50,color:#fff
    style OA fill:#3b82f6,color:#fff
    style SA fill:#10b981,color:#fff
    style MA fill:#f59e0b,color:#fff
    style RA fill:#8b5cf6,color:#fff
```

---

### 23.2 Complete CPF Use Case → Assetra Impact Matrix

#### Employment & Contributions

| Use Case | Trigger | CPF Impact | Assetra Impact |
|----------|---------|------------|----------------|
| **Monthly Salary** | Payroll | OA ↑, SA ↑, MA ↑ | `Income` (gross), `CashAccount` ↑ (take-home) |
| **Annual Bonus** | Year-end | OA ↑, SA ↑, MA ↑ (subject to AW ceiling) | `Income` (bonus), `CashAccount` ↑ |
| **Salary Increase** | Promotion | Higher contributions | `Income.amount` ↑, `Income.growthRate` adjustment |
| **Job Loss** | Retrenchment | Contributions stop | `Income` end date set, `CashAccount` drawdown |

#### Housing (Property Purchase)

| Use Case | Trigger | CPF Impact | Assetra Impact |
|----------|---------|------------|----------------|
| **BTO Purchase** | Buy HDB | OA ↓ (downpayment + monthly) | `Asset` created (property), `Liability` created (HDB loan), `CashAccount` ↓ (cash portion) |
| **HDB Resale Purchase** | Buy resale | OA ↓ (up to VL/WL) | `Asset` created, `Liability` created, `CashAccount` ↓, `PropertyLink` created |
| **Private Property** | Buy condo/landed | OA ↓ (up to WL, need BRS) | `Asset` created, `Liability` created, `CashAccount` ↓ (larger cash portion) |
| **Monthly Mortgage (CPF)** | Loan servicing | OA ↓ monthly | No cash impact (unless OA insufficient) |
| **Monthly Mortgage (Cash)** | OA insufficient | OA depleted | `CashAccount` ↓, `Expense` created |
| **Property Sale** | Sell property | OA ↑ (refund + accrued interest) | `Asset` removed, `Liability` cleared, `CashAccount` ↑ (net proceeds) |
| **Refinancing** | Switch loan | Accrued interest continues | `Liability` updated (new terms) |

#### Healthcare (MediSave)

| Use Case | Trigger | CPF Impact | Assetra Impact |
|----------|---------|------------|----------------|
| **MediShield Life Premium** | Annual | MA ↓ (auto-deducted) | No cash impact |
| **Integrated Shield Plan** | Annual | MA ↓ (up to AWL), Cash ↓ (excess) | `Expense` created (insurance), `CashAccount` ↓ |
| **ISP Rider** | Annual | No MA usage | `Expense` created, `CashAccount` ↓ |
| **Hospitalization** | Medical event | MA ↓ (within limits) | `Expense` created (co-pay), `CashAccount` ↓ |
| **Outpatient (Chronic)** | Regular treatment | MA ↓ (CHAS limits) | `Expense` created, `CashAccount` ↓ |
| **Family MediSave Withdrawal** | Pay for family | MA ↓ | No direct Assetra impact |

#### Retirement (Age 55+)

| Use Case | Trigger | CPF Impact | Assetra Impact |
|----------|---------|------------|----------------|
| **Turn 55 - RA Creation** | Birthday | SA → RA (full), OA → RA (to FRS) | `ScenarioEvent` (milestone) |
| **Turn 55 - Withdrawal** | FRS met | OA ↓ (excess withdrawn) | `CashAccount` ↑ (lump sum) |
| **Turn 55 - No Withdrawal** | Below FRS | All locked in RA | No cash impact |
| **Property Pledge** | Meet FRS with property | RA remains at BRS | Additional OA withdrawable → `CashAccount` ↑ |
| **Turn 65 - CPF LIFE Start** | Birthday | RA → Annuity premium | `Income` created (monthly payout), `CashAccount` ↑ monthly |
| **CPF LIFE Payout** | Monthly (65+) | RA ↓ (notional) | `Income` (recurring), `CashAccount` ↑ |
| **Defer CPF LIFE** | Defer to 70 | RA continues earning interest | Higher future `Income` |
| **Death - Bequest** | Member dies | RA → Beneficiaries | `CashAccount` ↑ (for beneficiaries) |

#### Voluntary Top-ups & Transfers

| Use Case | Trigger | CPF Impact | Assetra Impact |
|----------|---------|------------|----------------|
| **Cash Top-up to SA (< 55)** | Voluntary | SA ↑ | `CashAccount` ↓, Tax relief → `Expense` reduction |
| **Cash Top-up to RA (≥ 55)** | Voluntary | RA ↑ | `CashAccount` ↓, Tax relief |
| **OA → SA Transfer (< 55)** | Voluntary | OA ↓, SA ↑ | No cash impact, Tax relief |
| **OA → RA Transfer (≥ 55)** | Voluntary | OA ↓, RA ↑ | No cash impact, Tax relief |
| **Top-up for Family** | Voluntary | Recipient's SA/RA ↑ | `CashAccount` ↓, Tax relief up to $8K |
| **RSTU Tax Relief** | Year-end | N/A | `Expense` reduction (up to $16K combined) |

#### CPFIS Investments

| Use Case | Trigger | CPF Impact | Assetra Impact |
|----------|---------|------------|----------------|
| **OA → CPFIS Investment** | Buy stocks/ETF | OA ↓ (investible: OA - $20K) | `Asset` created (investment), tracks growth |
| **SA → CPFIS Investment** | Buy low-risk | SA ↓ (investible: SA - $40K) | `Asset` created (investment) |
| **CPFIS Returns** | Dividends/Growth | OA/SA ↑ (on sale) | `Asset.currentValue` ↑ |
| **CPFIS Loss** | Market decline | OA/SA unchanged until sale | `Asset.currentValue` ↓ |
| **Sell CPFIS Investment** | Liquidate | OA/SA ↑ (proceeds) | `Asset` removed |

#### Education Scheme

| Use Case | Trigger | CPF Impact | Assetra Impact |
|----------|---------|------------|----------------|
| **Education Loan (Self)** | Start studies | OA ↓ (tuition withdrawn) | `Liability` created (CPF education loan) |
| **Education Loan (Child)** | Child's education | OA ↓ | `Liability` created, `Expense` (if cash top-up) |
| **Loan Repayment** | Monthly | OA ↑ (repayments return) | `Liability` ↓, `CashAccount` ↓ (if cash repay) |
| **Loan Waiver (55+)** | FRS met at 55 | Loan forgiven | `Liability` removed |

#### SA Shielding (Advanced)

| Use Case | Trigger | CPF Impact | Assetra Impact |
|----------|---------|------------|----------------|
| **Buy T-Bills with SA** | Before 55 | SA ↓ (CPFIS) | `Asset` created (T-Bill) |
| **Turn 55 (Shielded)** | Birthday | Low SA → RA, High OA → RA | More OA in RA instead of SA |
| **T-Bills Mature** | 6 months later | SA ↑ (proceeds return) | `Asset` removed, SA balance ↑ |
| **Benefit** | Ongoing | SA at 4% (withdrawable) vs RA locked | More flexibility, same interest |

---

### 23.3 CPF Account Flow Diagram with Assetra Integration

```mermaid
flowchart TD
    subgraph Employment["Monthly Employment"]
        GROSS["Gross Salary<br/>#40;Income entity#41;"]
        TAKE_HOME["Take-Home Pay<br/>#40;→ CashAccount#41;"]
        CPF_CONTRIB["CPF Contribution<br/>#40;37% if ≤55#41;"]
    end

    GROSS --> |"Employee 20%"| CPF_CONTRIB
    GROSS --> |"Net 63%"| TAKE_HOME

    subgraph CPF_Accounts["CPF Accounts"]
        OA["OA<br/>2.5% p.a."]
        SA["SA<br/>4% p.a."]
        MA["MA<br/>4% p.a."]
        RA["RA<br/>4% p.a."]
    end

    CPF_CONTRIB --> |"23%"| OA
    CPF_CONTRIB --> |"6%"| SA
    CPF_CONTRIB --> |"8%"| MA

    subgraph Housing["Housing Purchase"]
        PROP_ASSET["Property Asset<br/>#40;Asset entity#41;"]
        MORTGAGE["Mortgage<br/>#40;Liability entity#41;"]
        CASH_DOWN["Cash Downpayment<br/>#40;CashAccount ↓#41;"]
    end

    OA --> |"Downpayment<br/>+ Monthly"| Housing
    TAKE_HOME --> |"Cash portion"| CASH_DOWN

    subgraph Healthcare["Healthcare"]
        MSL["MediShield Life"]
        ISP["Integrated Shield<br/>#40;Expense entity#41;"]
        MEDICAL_BILL["Medical Bills<br/>#40;Expense entity#41;"]
    end

    MA --> |"Premiums"| MSL
    MA --> |"Up to AWL"| ISP
    MA --> |"Within limits"| MEDICAL_BILL
    TAKE_HOME --> |"Cash if MA insufficient"| MEDICAL_BILL

    subgraph Age55["At Age 55"]
        RA_CREATE["RA Created"]
        WITHDRAW["Excess Withdrawal<br/>#40;→ CashAccount#41;"]
    end

    SA --> |"Full transfer"| RA_CREATE
    OA --> |"Top up to FRS"| RA_CREATE
    OA --> |"If FRS met"| WITHDRAW

    subgraph Retirement["Age 65+ Retirement"]
        CPFLIFE["CPF LIFE Payout<br/>#40;Income entity#41;"]
        RETIRE_CASH["Monthly Cash<br/>#40;CashAccount ↑#41;"]
    end

    RA --> |"Annuity"| CPFLIFE
    CPFLIFE --> |"$X/month"| RETIRE_CASH

    subgraph Sale["Property Sale"]
        REFUND["CPF Refund<br/>#40;Principal + Interest#41;"]
        NET_PROCEEDS["Net Proceeds<br/>#40;CashAccount ↑#41;"]
        REMOVE_ASSET["Remove Property<br/>#40;Asset deleted#41;"]
        CLEAR_LOAN["Clear Mortgage<br/>#40;Liability deleted#41;"]
    end

    PROP_ASSET --> |"Sale"| REMOVE_ASSET
    MORTGAGE --> |"Paid off"| CLEAR_LOAN
    Sale --> REFUND
    REFUND --> |"< 55"| OA
    REFUND --> |"≥ 55"| RA
    Sale --> NET_PROCEEDS

    style OA fill:#3b82f6,color:#fff
    style SA fill:#10b981,color:#fff
    style MA fill:#f59e0b,color:#fff
    style RA fill:#8b5cf6,color:#fff
    style TAKE_HOME fill:#4CAF50,color:#fff
    style RETIRE_CASH fill:#4CAF50,color:#fff
    style WITHDRAW fill:#4CAF50,color:#fff
    style NET_PROCEEDS fill:#4CAF50,color:#fff
```

---

### 23.4 Timeline Projection Integration

When running Assetra's timeline projection, CPF events should be incorporated:

```mermaid
sequenceDiagram
    participant User
    participant Timeline as Timeline Engine
    participant CPF as CPF Module
    participant Core as Assetra Core

    User->>Timeline: Request 40-year projection

    loop Each Year
        Timeline->>Core: Get Income/Expenses
        Timeline->>CPF: Calculate CPF contributions
        CPF-->>Timeline: OA/SA/MA allocations

        alt Housing Purchase Year
            Timeline->>CPF: Deduct OA for property
            Timeline->>Core: Create Asset + Liability
            Timeline->>Core: Deduct CashAccount
        end

        alt Medical Event
            Timeline->>CPF: Deduct MA
            Timeline->>Core: Create Expense
        end

        alt Age 55
            Timeline->>CPF: Transfer SA → RA
            Timeline->>CPF: Transfer OA → RA (to FRS)
            alt FRS Met
                Timeline->>Core: Add excess to CashAccount
            end
        end

        alt Age 65+
            Timeline->>CPF: Calculate CPF LIFE payout
            Timeline->>Core: Add Income (monthly payout)
            Timeline->>Core: Increase CashAccount
        end

        Timeline->>CPF: Apply interest to all accounts
        Timeline->>Core: Calculate net worth
    end

    Timeline-->>User: Return TimelineResponse
```

---

### 23.5 Assetra Entity Updates by CPF Event

#### ScenarioEvent Examples for CPF Integration

```typescript
// Example: Buy HDB BTO
{
  name: "Buy HDB BTO",
  occursOn: "2025-06-01",
  impacts: [
    // Create property asset
    {
      targetType: "asset",
      impactKind: "start",
      amount: 500000, // Property value
      cadence: "once",
      notes: "HDB BTO property"
    },
    // Create mortgage liability
    {
      targetType: "liability",
      impactKind: "start",
      amount: 400000, // Loan amount
      cadence: "monthly", // $1,800/month
      notes: "HDB loan at 2.6%"
    },
    // Cash downpayment
    {
      targetType: "expense",
      impactKind: "delta",
      amount: -25000, // Cash portion of downpayment
      cadence: "once"
    }
    // CPF OA deduction handled by CPF module
  ]
}

// Example: Turn 55 with FRS met
{
  name: "Turn 55 - CPF Withdrawal",
  occursOn: "2045-03-15",
  impacts: [
    // Lump sum withdrawal to cash
    {
      targetType: "asset", // CashAccount treated as asset
      targetId: "accumulator-account-id",
      impactKind: "delta",
      amount: 150000, // Excess OA withdrawn
      cadence: "once",
      notes: "CPF withdrawal - FRS met"
    }
  ]
}

// Example: CPF LIFE starts at 65
{
  name: "CPF LIFE Payout Begins",
  occursOn: "2055-03-15",
  impacts: [
    // Monthly retirement income
    {
      targetType: "income",
      impactKind: "start",
      amount: 1500, // Monthly payout
      cadence: "monthly",
      notes: "CPF LIFE Standard Plan"
    }
  ]
}
```

---

### 23.6 Data Mapping Reference

| CPF Field | Assetra Entity | Assetra Field | Notes |
|-----------|---------------|---------------|-------|
| Monthly salary | `Income` | `amount`, `frequency: monthly` | Gross salary for CPF calc |
| Take-home pay | `CashAccount` | `balance` ↑ | Net after CPF deduction |
| OA for housing | `CPFHousingUsage` | `downPayment.oaUsed` | Track separately from cash |
| Property value | `Asset` | `currentValue`, `category: property` | Via PropertyLink |
| Mortgage balance | `Liability` | `currentBalance`, `category: property` | Via PropertyLink |
| Monthly mortgage | `Expense` OR CPF | Depends on source | OA or cash payment |
| Medical expense | `Expense` | `amount`, `category: healthcare` | After MA withdrawal |
| CPF LIFE payout | `Income` | `amount`, `frequency: monthly`, `category: retirement` | From age 65 |
| CPF withdrawal | `CashAccount` | `balance` ↑ | Lump sum at 55 |
| Top-up tax relief | `Expense` | Reduction in tax | Via income tax calc |
| CPFIS investment | `Asset` | `currentValue`, `category: cpfis` | Track separately |

---

### 23.7 Key Integration Points for Implementation

1. **CPF Contribution Calculator**
   - Input: `Income.amount` (gross salary)
   - Output: OA/SA/MA amounts, take-home pay
   - Updates: `CashAccount.balance`

2. **Housing Purchase Flow**
   - Input: PropertyScenario, CPF OA balance
   - Output: Asset, Liability, CPFHousingUsage
   - Updates: OA balance, `CashAccount.balance`

3. **Age 55 Transition**
   - Input: OA, SA, MA balances, FRS target
   - Output: RA balance, withdrawable amount
   - Updates: `CashAccount.balance` if FRS met

4. **CPF LIFE Projection**
   - Input: RA balance at 65, plan choice
   - Output: Monthly payout amount
   - Creates: `Income` entity for retirement

5. **Healthcare Withdrawals**
   - Input: Medical bill, MA balance
   - Output: MA deduction, cash expense
   - Updates: MA balance, may create `Expense`

6. **Property Sale**
   - Input: Sale price, CPF usage history
   - Output: Refund amount, net proceeds
   - Updates: OA/RA balance, `CashAccount.balance`, removes Asset/Liability

---

*These diagrams can be rendered in any Mermaid-compatible viewer (GitHub, VS Code with Mermaid extension, Obsidian, etc.)*
