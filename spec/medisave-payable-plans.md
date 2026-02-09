# MediSave-Payable Insurance Plans — Reference Spec

## Overview

This document catalogues the insurance plans in Singapore that allow premium payments from CPF MediSave, relevant for the insurance planner's cost projection and coverage journey features.

---

## Mandatory / Auto-Enrolled Plans

### MediShield Life
- **What it covers:** Large hospital bills, selected costly outpatient treatments (dialysis, chemotherapy, radiotherapy)
- **Administered by:** CPF Board
- **Eligibility:** All Singapore Citizens and Permanent Residents (automatic)
- **MediSave usage:** Premiums fully payable from MediSave
- **Premium range:** ~$130/yr (age 30) to ~$2,400/yr (age 90+), age-adjusted annually
- **Key notes:** Base layer — all Integrated Shield Plans sit on top of this

### CareShield Life
- **What it covers:** Long-term care payouts ($600+/month, increasing over time) if severe disability (unable to perform 3+ ADLs)
- **Administered by:** CPF Board
- **Eligibility:** Mandatory for Singapore Citizens and PRs born 1980 or later
- **MediSave usage:** Premiums fully payable from MediSave
- **Premium range:** ~$200-$400/yr depending on age and gender, paid until age 67
- **Key notes:** Payouts are for life once disability claim is approved

---

## Opt-In Plans (Most Common)

### Integrated Shield Plans (IPs)
- **What it covers:** Hospital and surgical coverage above MediShield Life — private hospital wards, Class A/B1 wards, higher claim limits
- **Insurers:** AIA, Great Eastern, Prudential, NTUC Income, Singlife, Raffles Health Insurance
- **MediSave usage:** Up to **Additional Withdrawal Limits (AWL)** per insured person per year:

| Age Group | AWL (per year) |
|-----------|---------------|
| Under 40 | $300 |
| 41-50 | $600 |
| 51-60 | $900 |
| 61-70 | $900 |
| 71-80 | $900 |
| 81+ | $900 |

- **Key notes:**
  - Remainder above AWL must be paid in cash
  - **IP Riders** (co-payment/deductible riders) are NOT MediSave-payable — always cash
  - Since April 2022, full co-payment riders are no longer offered for new purchases

### Dependants' Protection Scheme (DPS)
- **What it covers:** Term life insurance — $70,000 lump sum payout on death, terminal illness, or total permanent disability (TPD)
- **Administered by:** Great Eastern (appointed by CPF Board)
- **Eligibility:** Singapore Citizens and PRs aged 21-65, auto-enrolled but can opt out
- **MediSave usage:** Premiums fully payable from MediSave
- **Premium range:** ~$18/yr (age 21-25) to ~$204/yr (age 60-65)
- **Key notes:** Very affordable term life; good baseline coverage

### ElderShield (Legacy)
- **What it covers:** Long-term care payouts ($400/month for up to 72 months) if severe disability
- **Eligibility:** Those born before 1980 who did not opt into CareShield Life
- **MediSave usage:** Premiums fully payable from MediSave
- **Key notes:** Predecessor to CareShield Life; lower payout, finite duration

---

## Plans NOT Payable by MediSave

For reference, these common insurance types must be paid in cash:

- IP Riders (co-payment / deductible riders)
- Standalone critical illness plans
- Term life plans (other than DPS)
- Whole life / endowment plans
- Personal accident plans
- Disability income plans

---

## Mapping to Codebase

### `InsurancePolicyRecord.governmentScheme` field values

| Scheme | `governmentScheme` value | MediSave-payable |
|--------|-------------------------|-----------------|
| MediShield Life | `medishield_life` | Yes (fully) |
| CareShield Life | `careshield_life` | Yes (fully) |
| ElderShield | `eldershield` | Yes (fully) |
| Dependants' Protection Scheme | `dps` | Yes (fully) |
| Integrated Shield Plan | `null` (private insurer) | Partial (up to AWL) |
| All other policies | `null` | No |

### Implications for Coverage Journey

1. **Cost projection accuracy:** Policies with `governmentScheme` set can have their premiums deducted from MediSave projections rather than cash flow
2. **Premium frequency:** Government schemes are typically annual; IPs can be monthly/quarterly/annual
3. **Auto-renewal:** MediShield Life and CareShield Life auto-renew; IPs may lapse if MediSave balance is insufficient
4. **Age-adjusted premiums:** All MediSave-payable plans increase with age — the coverage journey chart should account for rising premium costs over the projection horizon
