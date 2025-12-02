# Singapore CPF/SRS System Diagrams

This document contains Mermaid diagrams illustrating the interactions and flows within Singapore's personal finance system.

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

```mermaid
%%{init: {'theme': 'base', 'themeVariables': { 'pie1': '#4CAF50', 'pie2': '#2196F3', 'pie3': '#FF9800'}}}%%
pie showData title Age ≤35 Allocation
    "OA (62.16%)" : 62.16
    "SA (16.22%)" : 16.22
    "MA (21.62%)" : 21.62
```

```mermaid
%%{init: {'theme': 'base', 'themeVariables': { 'pie1': '#4CAF50', 'pie2': '#2196F3', 'pie3': '#FF9800'}}}%%
pie showData title Age 50-55 Allocation
    "OA (40.54%)" : 40.54
    "SA (31.08%)" : 31.08
    "MA (28.38%)" : 28.38
```

```mermaid
%%{init: {'theme': 'base', 'themeVariables': { 'pie1': '#4CAF50', 'pie2': '#2196F3', 'pie3': '#FF9800'}}}%%
pie showData title Age 60-65 Allocation
    "OA (14.89%)" : 14.89
    "SA (10.64%)" : 10.64
    "MA (74.47%)" : 74.47
```

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

```mermaid
flowchart TD
    START([Property Purchase]) --> TYPE{Property Type?}

    TYPE --> |BTO| BTO[No VL/WL Limits<br/>Use OA Freely]
    TYPE --> |HDB Resale| RESALE[VL Applies]
    TYPE --> |Private| PRIVATE[VL & WL Apply]

    BTO --> USE_OA[Use OA for<br/>Downpayment + Instalments]

    RESALE --> CALC_VL[VL = min(Price, Valuation)]
    PRIVATE --> CALC_VL

    CALC_VL --> LOAN{Loan Type?}

    LOAN --> |HDB Loan| HDB_LOAN[Can Exceed VL<br/>if BRS Met]
    LOAN --> |Bank Loan| BANK_LOAN[WL = 120% × VL<br/>Max CPF Usage]

    HDB_LOAN --> BRS_CHECK_1{CPF ≥ BRS?}
    BANK_LOAN --> VL_FIRST[Use OA up to VL]

    BRS_CHECK_1 --> |Yes| USE_BEYOND[Use Beyond VL]
    BRS_CHECK_1 --> |No| CAP_VL_1[Cap at VL]

    VL_FIRST --> BRS_CHECK_2{CPF ≥ BRS?}

    BRS_CHECK_2 --> |Yes| USE_TO_WL[Use VL to WL<br/>Additional 20%]
    BRS_CHECK_2 --> |No| CAP_VL_2[Cap at VL]

    USE_OA --> TRACK[Track Principal<br/>for Accrued Interest]
    USE_BEYOND --> TRACK
    CAP_VL_1 --> TRACK
    USE_TO_WL --> TRACK
    CAP_VL_2 --> TRACK

    TRACK --> DONE([CPF Used for Property])

    style START fill:#4CAF50,color:#fff
    style DONE fill:#4CAF50,color:#fff
    style BTO fill:#8BC34A,color:#fff
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

```mermaid
flowchart TD
    START([Member Turns 65]) --> CHECK_RA{RA ≥ $60,000?}

    CHECK_RA --> |No| DRAWDOWN[RA Drawdown<br/>Until Depleted]
    CHECK_RA --> |Yes| AUTO_ENROLL[Auto-Enrolled in CPF LIFE]

    AUTO_ENROLL --> SELECT_PLAN{Select Plan}

    SELECT_PLAN --> STANDARD["Standard Plan<br/>Higher Payout<br/>Lower Bequest"]
    SELECT_PLAN --> BASIC["Basic Plan<br/>Lower Payout<br/>Higher Bequest"]
    SELECT_PLAN --> ESCALATING["Escalating Plan<br/>+2%/Year<br/>Lower Initial"]

    STANDARD --> DEFER{Defer Payout?}
    BASIC --> DEFER
    ESCALATING --> DEFER

    DEFER --> |"Start at 65"| PAYOUT_65[Base Payout]
    DEFER --> |"Defer to 70"| PAYOUT_70["Payout × 1.35<br/>(+7% per year)"]

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

| From | To | Trigger | Amount |
|------|-----|---------|--------|
| Employment | OA/SA/MA | Monthly payroll | Based on rates & ceilings |
| MA | SA/RA | MA > BHS | Spillover excess |
| MA | OA | MA > BHS, SA/RA ≥ FRS | Remaining spillover |
| OA | Property | Purchase/instalment | Up to VL/WL |
| OA | RA | Age 55 | To fill FRS gap |
| SA | RA | Age 55 | Up to FRS |
| RA | CPF LIFE | Age 65 | Annuity premium |
| CPF LIFE | Member | Age 65+ | Monthly payout |
| Property Sale | OA/RA | Sale completed | Principal + accrued interest |
| Income | SRS | Voluntary | Up to $15,300/$35,700 |
| SRS | Member | Age 63+ | 50% taxable withdrawal |
| OA | CPFIS | Voluntary | Investible balance (OA - $20K) |
| SA | CPFIS | Voluntary | Investible balance (SA - $40K) - lower risk only |
| Cash | SA/RA | Top-up | Up to FRS, $8K tax relief |
| OA | SA | Transfer (before 55) | Up to FRS, $8K tax relief |
| OA | Education | Loan | Course fees, 2.5% interest |

---

*These diagrams can be rendered in any Mermaid-compatible viewer (GitHub, VS Code with Mermaid extension, Obsidian, etc.)*
