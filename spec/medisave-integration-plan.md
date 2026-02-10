# MediSave Premium Integration & Frequency Fix

## Context

Insurance policies in Singapore can have premiums paid from CPF MediSave, but the current system doesn't track or project this. Additionally, the `AddPolicyModal` hardcodes `premiumFrequency: 'monthly'` regardless of what the user intends. This plan addresses both issues:

1. Fix the premium frequency bug so users can choose monthly/annually
2. Add MediSave premium projection to the Coverage Journey chart

**No backend migration needed** — MediSave payability is derivable from existing `government_scheme` and `category` fields already in the `insurance_policies` table.

---

## CPF-Insurance Reference

### How CPF Funds Insurance — Account Mapping

```
CPF Account
├── Ordinary Account (OA)
│   └── DPS premiums (auto-deducted; SA is fallback)
├── Special Account (SA)
│   └── DPS premiums (fallback if OA insufficient)
├── MediSave Account (MA)
│   ├── MediShield Life premiums (auto, fully payable)
│   ├── CareShield Life premiums (auto, until age 67)
│   ├── ElderShield premiums (auto, legacy)
│   └── Integrated Shield Plan premiums (capped by AWL)
└── Retirement Account (RA)
    └── NOT used for insurance
```

> **Important:** DPS is the only scheme deducted from OA/SA. All health/care schemes use MediSave (MA).

### Government Scheme Summary Table

| Scheme | CPF Account | Deduction | Premium Range | Covers | Stops At |
|--------|-------------|-----------|---------------|--------|----------|
| MediShield Life | MA | Auto, annual | ~$130–$2,400/yr (age-based) | Hospital bills, costly outpatient | Never (for life) |
| CareShield Life | MA | Auto, annual | ~$200–$400/yr (age+gender) | Severe disability ($689/mo payout in 2026) | Premiums stop at age 67; coverage for life |
| ElderShield | MA | Auto, annual | Age-based | Severe disability ($400/mo, up to 72 months) | Legacy — born before 1980 only |
| DPS | OA/SA | Auto, annual | $18–$298/yr (age-based) | Death, terminal illness, TPD ($70,000) | Age 65 |

### DPS Premium Rate Table

| Age Band | Annual Premium |
|----------|---------------|
| 21–25 | ~$18 |
| 26–30 | ~$18 |
| 31–35 | ~$30 |
| 36–40 | ~$36 |
| 41–45 | ~$93 |
| 46–50 | ~$93 |
| 51–55 | ~$204 |
| 56–60 | ~$298 |
| 61–65 | ~$298 |

Administered by Great Eastern (appointed by CPF Board). Auto-enrolled on first CPF contribution; members can opt out. 60-day grace period if auto-deduction fails.

### Integrated Shield Plans — MediSave Withdrawal Limits (AWL)

| Age Group | AWL (per insured person per year) |
|-----------|----------------------------------|
| ≤ 40 | $300 |
| 41–70 | $600 |
| ≥ 71 | $900 |

- Excess above AWL must be paid in cash
- IP Riders are never MediSave-payable — always cash
- AWL is shared across all ISPs for one person (if 2 ISPs, combined capped at AWL)
- Can use family members' MediSave to pay (spouse, parents, children, grandchildren, siblings)

### 2025–2026 Policy Changes

**MediShield Life (April 2025):**
- Enhanced: higher claim limits, expanded coverage for new high-cost treatments
- Premium increase capped at 35%, phased over 3 years (April 2025 – March 2028)
- Late payment: 5% penalty after due date, +12% after 1 year, 4% compound interest

**CareShield Life:**
- First review underway, recommendations expected second half of 2025
- 2026 payout for claim at age 46: $689/month for life

**IP Rider Changes (April 2026):**
- New IP riders can no longer cover minimum IP deductibles (MOH range: $1,500–$3,500/yr)
- Co-payment cap raised from $3,000/yr to $6,000/yr minimum

**Matched MediSave Scheme (MMSS) — New 2026–2030:**
- Government matches $1 for $1 on cash top-ups to MA for eligible seniors
- Annual cap: $1,000 matched per year

### Plans NOT Payable by CPF

All cash-only:
- Private life insurance (term, whole life, endowment)
- Private critical illness plans
- Private disability income plans
- Personal accident plans
- IP Riders (co-payment / deductible riders)

### Codebase Gap Analysis

**What already exists:**

| Feature | Location | Status |
|---------|----------|--------|
| Government scheme enum | `governmentSchemeEnum` in `types/insurance.ts` | `medishield_life`, `careshield_life`, `eldershield`, `dps` |
| CPF account modeling | `types/cpf.ts` | OA, SA, MA, RA balances with person FK |
| Insurance policy CRUD | `insurance_policies_v2.go` + frontend | Full create/read/update/delete |
| Premium tracking | `premiumAmount` + `premiumFrequency` on policy | Amount and frequency only |
| Expense linking | `linkedExpenseId` on policy | FK to expense for cash flow tracking |
| Fund flow rules (mortgages) | `MortgageForm/components/` | CPF vs cash split for property payments |
| Person demographics | `Person` type | dateOfBirth, gender, residencyStatus, prGrantDate |
| Government scheme metadata | `GOVERNMENT_SCHEME_INFO` in `types/insurance.ts` | Coverage type + default amounts per scheme |

**What's missing (current phase addresses items marked with *):**

| Gap | Description | Priority |
|-----|-------------|----------|
| * Premium frequency selector | Hardcoded to 'monthly' in AddPolicyModal | **This plan, Part 1** |
| * MediSave payability logic | No way to determine or display MediSave eligibility | **This plan, Part 2** |
| * MediSave projection in Journey | No premium cost layer in coverage journey chart | **This plan, Part 3** |
| * MediSave badges on policies | No visual indicator of payment source | **This plan, Part 4** |
| No `premiumPaymentSource` field | DB/API lacks cash vs CPF vs mixed field | Future Phase A |
| No `cpfAccountUsed` field | Can't model which CPF pot (OA/SA/MA) is drained | Future Phase A |
| No government scheme auto-deduction | Timeline doesn't model CPF outflows for insurance | Future Phase B |
| No enrollment status on Person | No flags for CareShield/ElderShield/DPS enrollment | Future Phase B |
| No age-based premium rate tables | Can't auto-calculate government scheme premiums | Future Phase B |
| Insurance not in fund flow system | Unlike mortgages, premiums don't appear in CPF projections | Future Phase C |
| No MediSave balance validation | Can't warn about insufficient MA funds | Future Phase C |

---

## Part 1: Fix Premium Frequency Bug

### Problem
- `PoliciesTab.tsx:858` hardcodes `premiumFrequency: 'monthly'`
- `AddPolicyModal` collects `monthlyPremium` but has no frequency selector
- `PolicyFormData` interface (AddPolicyModal.tsx:126) lacks `premiumFrequency`

### Changes

**`frontend/src/components/insurance/modals/AddPolicyModal.tsx`**
1. Add `premiumFrequency` to `PolicyFormData` interface (line 133, after `monthlyPremium`)
2. Rename `monthlyPremium` → `premiumAmount` throughout (state, form data, label)
3. Add `premiumFrequency` state: `useState<'monthly' | 'annually'>('monthly')`
4. Rename the "Monthly Premium" label to "Premium Amount" (line ~902)
5. Add a 2-option segmented control below the premium input (Monthly / Annually) using the existing segmented control pattern from `ChartControls`
6. Include `premiumFrequency` in `baseFormData` (line ~488)
7. When editing, initialize `premiumFrequency` from `editingPolicy.premiumFrequency`

**`frontend/src/components/insurance/tabs/PoliciesTab.tsx`**
1. Update `handleSave` type (line 812) to include `premiumFrequency`
2. Replace hardcoded `premiumFrequency: 'monthly'` (line 858) with `formData.premiumFrequency`

---

## Part 1.5: Reactive Payment Source Banner (AddPolicyModal)

The Payment Source banner in the Add/Edit Policy modal is **computed at runtime**, not stored. It reacts live to three inputs: policy type, premium amount, and the person's age + existing IPs.

### Three Banner States

| State | Trigger | Color | Content |
|-------|---------|-------|---------|
| **Full MediSave** | Government scheme, OR IP with `annualPremium ≤ remainingAWL` | Green (`#10B981`) | "MediSave Payable" — "Premiums fully deducted from CPF MediSave Account" |
| **Partial (Mixed)** | IP with `annualPremium > remainingAWL` | Amber (`#F59E0B`) | "Partially MediSave Payable" — split preview + AWL context |
| **Hidden** | Cash-only categories (life, CI, PA, accident, custom) | — | No banner shown |

### Reactive Inputs

```
┌─────────────────┐     ┌──────────────┐     ┌─────────────────┐
│ Policy category  │     │ Premium      │     │ Person's age    │
│ + gov scheme     │────▶│ amount +     │────▶│ + existing IPs  │
│                  │     │ frequency    │     │ for this person │
└─────────────────┘     └──────────────┘     └─────────────────┘
         │                      │                      │
         ▼                      ▼                      ▼
   ┌──────────────────────────────────────────────────────────┐
   │              calculateSinglePolicySplit()                 │
   │                                                          │
   │  1. gov scheme → 'full' green banner                     │
   │  2. IP + annualPremium ≤ remainingAWL → 'full' green     │
   │  3. IP + annualPremium > remainingAWL → 'mixed' amber    │
   │  4. other category → 'none' (no banner)                  │
   └──────────────────────────────────────────────────────────┘
```

**The banner updates live when the user:**
1. Changes the premium amount → split recalculates
2. Switches frequency (Monthly ↔ Annually) → annualized amount changes → split changes
3. Selects a different covered person → age changes → AWL threshold changes
4. Changes category/government scheme → banner state changes entirely

### Mixed State — Split Preview UI

When in the amber "Partially MediSave Payable" state, the banner expands to show:

```
┌─────────────────────────────────────────────────┐
│  ⚠ Partially MediSave Payable                   │
│  Premium exceeds MediSave Additional Withdrawal  │
│  Limit (AWL)                                     │
│                                                  │
│  ┌──────────────┐     ┌──────────────┐          │
│  │ MediSave     │     │ Cash         │          │
│  │ $300 /yr     │  +  │ $900 /yr     │          │
│  └──────────────┘     └──────────────┘          │
│                                                  │
│  ℹ AWL for age 35: $300/yr (fully used)          │
└─────────────────────────────────────────────────┘
```

### Implementation in AddPolicyModal

```typescript
// Inside AddPolicyModal, compute banner state reactively
const annualizedPremium = annualizePremium(premiumAmount, premiumFrequency)
const personAge = getAgeFromDob(selectedPerson?.dateOfBirth)

// Get remaining AWL after other IPs this person already has
const existingIpPolicies = policies.filter(p =>
  p.personId === selectedPerson?.id &&
  p.category === 'hospitalization' &&
  !p.governmentScheme &&
  p.id !== editingPolicy?.id  // exclude current policy if editing
)
const existingAWLUsage = existingIpPolicies.reduce(
  (sum, p) => sum + Math.min(annualizePremium(p.premiumAmount, p.premiumFrequency), getAWLLimit(personAge)),
  0
)
const awlLimit = getAWLLimit(personAge)
const remainingAWL = Math.max(0, awlLimit - existingAWLUsage)

const bannerState = getBannerState({
  governmentScheme: formData.governmentScheme,
  category: formData.category,
  annualizedPremium,
  remainingAWL,
})
// bannerState: { type: 'full' | 'mixed' | 'none', medisavePortion, cashPortion, awlLimit, remainingAWL }
```

### Key edge case: AWL shared across IPs

If a person has 2 IPs:
- IP1: $400/yr (uses $300 of AWL, $100 cash) — age ≤40
- IP2: $800/yr → remaining AWL is $0 → **entire $800 is cash**

The banner for IP2 must account for IP1 already consuming the AWL. This is why `remainingAWL` factors in existing policies.

---

## Part 2: MediSave Utility Functions

### New file: `frontend/src/lib/medisave-utils.ts`

```typescript
// Core types
type MediSavePayability = 'full' | 'partial' | 'none'

type BannerState =
  | { type: 'full'; medisavePortion: number }
  | { type: 'mixed'; medisavePortion: number; cashPortion: number; awlLimit: number; remainingAWL: number }
  | { type: 'none' }

// Determine payability category for a policy
function getMediSavePayability(policy): MediSavePayability
  // government_scheme set → 'full' (MediShield Life, CareShield Life, ElderShield, DPS)
  // category === 'hospitalization' && !government_scheme → 'partial' (ISP, up to AWL)
  // everything else → 'none'

// NOTE: 'partial' means "subject to AWL cap" — the actual split depends on premium vs remaining AWL.
// An IP with low premium might still be 'full' at runtime if premium ≤ remaining AWL.

// AWL limits by age group (per insured per year, for ISPs only)
function getAWLLimit(ageNextBirthday: number): number
  // ≤40: $300, 41-70: $600, 71+: $900

// Annualize a premium
function annualizePremium(amount, frequency): number

// Compute banner state for AddPolicyModal (single policy, reactive)
function getBannerState(params: {
  governmentScheme: string | null
  category: string
  annualizedPremium: number
  remainingAWL: number   // AWL minus what other IPs for this person already consume
}): BannerState

// Calculate MediSave vs cash split for a set of policies (batch, for summary cards)
function calculateMediSaveSplit(policies, personAge): {
  totalAnnualPremium: number
  medisavePayable: number      // amount payable from MediSave
  cashPayable: number          // remaining cash portion
  awlLimit: number
  awlUsed: number              // for ISPs specifically
  awlRemaining: number
  breakdown: Array<{
    policyId: string
    policyName: string
    payability: MediSavePayability
    annualPremium: number
    medisavePortion: number
    cashPortion: number
  }>
}

// Project MediSave premiums over age range (for coverage journey)
function projectMediSavePremiums(policies, startAge, endAge): Array<{
  age: number
  year: number
  totalAnnualPremium: number
  medisavePayable: number
  cashPayable: number
  awlLimit: number
}>
```

### Logic for MediSave split calculation:
1. Government schemes (fully payable): entire premium goes to MediSave
2. ISPs: compare annualized premium against **remaining** AWL (after other IPs)
   - If `premium ≤ remainingAWL` → fully MediSave (green badge)
   - If `premium > remainingAWL` → mixed: `remainingAWL` from MediSave, rest cash (amber badge)
3. IP Riders (subcategory indicator): always cash (note in UI)
4. AWL is shared across all ISPs for one person — if person has 2 ISPs, combined MediSave usage capped at AWL
5. Age-adjusted: as person ages across thresholds (40→41, 70→71), AWL steps up
6. Order matters: when calculating batch splits, process IPs in creation order (or by premium descending) to determine which IP "gets" the AWL first

---

## Part 3: Coverage Journey Premium Projection

### Type changes: `frontend/src/types/insurance.ts`
Add premium fields to `CoverageProjectionYear`:
```typescript
// Premium projection fields
totalAnnualPremium: number
medisavePayable: number
cashPayable: number
awlLimit: number
```

### Utility changes: `frontend/src/lib/coverage-journey-utils.ts`
- Update `generateCoverageProjection()` to accept policies array
- At each age, call `projectMediSavePremiums()` to compute premium split
- Include premium data in returned `CoverageProjectionYear` objects

### Chart changes: `frontend/src/components/insurance/tabs/JourneyTab.tsx`
- Add a "Premium Costs" toggle/layer to the chart
- When enabled, show stacked area or line for MediSave vs Cash premiums
- Use existing chart color scheme (emerald for MediSave, slate for cash)
- Show in the breakdown card: per-age premium split summary

### Data flow:
```
policies (from API) + person age
  → projectMediSavePremiums(policies, startAge, endAge)
  → merged into CoverageProjectionYear[]
  → rendered as additional chart layer
```

---

## Part 4: MediSave Indicators on Policies Tab & Detail Modal

### Badge Variants

Three badge styles, computed per-policy via `calculateMediSaveSplit()`:

| Badge | Color | Fill | Border | Shows When |
|-------|-------|------|--------|------------|
| `MediSave` | Emerald | `#10B98115` | `#10B98130` | Gov scheme, or IP with premium ≤ remaining AWL |
| `CPF OA` | Emerald | `#10B98115` | `#10B98130` | DPS specifically (drains OA, not MA) |
| `Mixed` | Amber | `#F59E0B15` | `#F59E0B30` | IP with premium > remaining AWL |
| `Cash` | Grey | `#52525B20` | none | Life, CI, PA, accident, custom categories |

Badge is a small pill (`cornerRadius: 10, padding: [2, 8], fontSize: 10`) placed inline next to the policy name or premium amount.

### `frontend/src/components/insurance/tabs/PoliciesTab.tsx`
- After each policy name/premium in the list, render the appropriate badge
- Badge type determined by calling `getMediSavePayability(policy)` + `getBannerState()` for IPs
- On hover/tooltip: show "MediSave: $X /yr | Cash: $Y /yr" split

### `frontend/src/components/insurance/modals/PolicyDetailModal.tsx`
- Add a **Payment Source** row to the "Policy Details" card (row 3, below Premium/Annual Premium/Linked Expense)
- Three cells: `Payment Source` (badge), `MediSave Portion` ($X /yr), `Cash Portion` ($Y /yr)
- For gov schemes: Payment Source shows green "MediSave (MA)" or "CPF OA" (for DPS), Cash Portion shows "$0" muted
- For IPs: Shows computed split from `calculateMediSaveSplit()`
- For cash-only: Payment Source shows grey "Cash", MediSave Portion shows "$0" muted

### `frontend/src/components/insurance/tabs/JourneyTab.tsx` (Bottom Section)
- Add **Annual Premium Breakdown** card between "Policy Coverages" and "Upcoming Milestones"
- Summary row: Total Premiums | MediSave (emerald) | Cash (amber)
- Per-policy rows: policy name + badge + amount (color-coded by source)
- AWL usage progress bar at bottom with warning text when fully used
- Data sourced from `calculateMediSaveSplit(allPoliciesForPerson, personAge)`

---

## Files to Modify

| File | Change |
|------|--------|
| `frontend/src/components/insurance/modals/AddPolicyModal.tsx` | Add frequency selector, reactive Payment Source banner |
| `frontend/src/components/insurance/modals/PolicyDetailModal.tsx` | Add Payment Source row with MediSave/Cash split |
| `frontend/src/components/insurance/tabs/PoliciesTab.tsx` | Use form frequency, add MediSave badges per policy |
| `frontend/src/lib/medisave-utils.ts` | **NEW** — `getMediSavePayability`, `getBannerState`, `calculateMediSaveSplit`, `getAWLLimit`, `annualizePremium`, `projectMediSavePremiums` |
| `frontend/src/types/insurance.ts` | Add premium fields to CoverageProjectionYear, add `BannerState` type |
| `frontend/src/lib/coverage-journey-utils.ts` | Integrate premium projection |
| `frontend/src/components/insurance/tabs/JourneyTab.tsx` | Add premium layer to chart, Annual Premium Breakdown card |

## Existing Utilities to Reuse

- Segmented control pattern: `frontend/src/components/dashboard/projections/ChartControls.tsx`
- `numericStyles` from `@/lib/utils` for premium displays
- `formatCurrency` from `@/lib/format` for currency formatting
- `annualizePremium()` already exists in `MyCoverageTab.tsx:130` — extract to shared util
- `computeAnnualPremium()` in `PolicyDetailModal.tsx` — same logic, consolidate

## Verification

### Part 1: Frequency
1. **Frequency fix**: Create a policy with annual frequency → verify it saves with `premiumFrequency: 'annually'` (check API payload in devtools)
2. **Edit round-trip**: Edit an existing policy → verify frequency pre-populates correctly

### Part 1.5: Reactive Banner
3. **Gov scheme → green banner**: Add MediShield Life policy → verify green "MediSave Payable" banner appears
4. **IP under AWL → green banner**: Add hospitalization IP with $200/yr premium for age ≤40 person → verify green banner (premium ≤ $300 AWL)
5. **IP over AWL → amber banner**: Change premium to $1,200/yr → verify amber "Partially MediSave Payable" with split preview ($300 MS + $900 Cash)
6. **Frequency toggle → split updates**: Switch from Annually to Monthly ($100/mo = $1,200/yr) → verify split stays the same
7. **Person change → AWL updates**: Switch covered person from age 35 to age 45 → verify AWL changes from $300 to $600, split updates to $600 MS + $600 Cash
8. **Shared AWL**: Person already has one IP using $200 of AWL → add second IP for $500/yr → verify banner shows $100 MS + $400 Cash (only $100 AWL remaining)
9. **Cash-only → no banner**: Select Life or CI category → verify banner disappears entirely

### Part 4: Badges & Detail Modal
10. **MediSave badges on PoliciesTab**: Create policies of different types → verify correct badge variant next to each (green MediSave, green CPF OA for DPS, amber Mixed, grey Cash)
11. **Policy Detail Modal**: Open a MediShield Life policy → verify Payment Source row shows "MediSave (MA)" green, "$492 /yr" MediSave portion, "$0" cash portion
12. **Detail Modal IP**: Open an IP policy → verify computed split in Payment Source row

### Part 3: Journey Chart
13. **Coverage Journey**: Open Journey tab → verify premium projection layer shows MediSave vs Cash premium lines
14. **Premium Breakdown card**: Verify Annual Premium Breakdown card appears with per-policy rows and badges
15. **AWL bar**: Verify AWL usage progress bar shows correct utilization
16. **Age progression**: Drag age marker past 40 → verify AWL jumps from $300 to $600 and splits recalculate

---

## Future Phases (Post-MVP)

### Phase A: Backend Schema — Payment Source Fields

Add explicit payment source tracking to `insurance_policies` table. This enables accurate per-policy CPF drain modeling without relying solely on derivation.

```sql
ALTER TABLE insurance_policies ADD COLUMN premium_payment_source VARCHAR(10)
  CHECK (premium_payment_source IN ('cash', 'cpf', 'mixed'));

ALTER TABLE insurance_policies ADD COLUMN cpf_account_used VARCHAR(5)
  CHECK (cpf_account_used IN ('oa', 'sa', 'ma'));

ALTER TABLE insurance_policies ADD COLUMN cpf_premium_portion NUMERIC(15,2) DEFAULT 0;
ALTER TABLE insurance_policies ADD COLUMN cash_premium_portion NUMERIC(15,2) DEFAULT 0;
```

Auto-population rules for government schemes:

| Scheme | `payment_source` | `cpf_account_used` | Notes |
|--------|-------------------|---------------------|-------|
| `medishield_life` | `cpf` | `ma` | 100% MediSave |
| `careshield_life` | `cpf` | `ma` | 100% MediSave, stops at age 67 |
| `eldershield` | `cpf` | `ma` | 100% MediSave |
| `dps` | `cpf` | `oa` | OA first, SA fallback |
| IP (hospitalization, no gov scheme) | `mixed` | `ma` | min(premium, AWL) from MA, rest cash |
| Everything else | `cash` | `null` | Cash only |

### Phase B: Auto-Enrollment & Rate Tables

**Person enrollment fields:**
```typescript
cpfSchemeEnrollment?: {
  dpsOptedOut?: boolean           // DPS is opt-out, default enrolled
  careShieldLifeEnrolled?: boolean // Auto for born >= 1980
  elderShieldEnrolled?: boolean    // Auto for born < 1980
  // MediShield Life always on for citizens/PRs — no toggle
}
```

**Premium rate tables** stored as constants (updated periodically when CPF publishes new rates):
- DPS: age-band lookup (see table above)
- MediShield Life: age-next-birthday lookup (granular, from CPF published tables)
- CareShield Life: age + gender lookup (from CPF published tables)

**Auto-create government scheme policies** for eligible persons based on:
- Residency status (citizen/PR only)
- Date of birth (CareShield vs ElderShield threshold: 1980)
- Age range (DPS: 21–65 only)

### Phase C: Timeline & Fund Flow Integration

Reuse the existing mortgage fund flow pattern (`FundSourceRow`, `MonthlyPaymentSourcesSection`) for insurance premium fund flows:

```typescript
interface InsurancePremiumFundFlow {
  policyId: string
  totalPremium: number
  frequency: 'monthly' | 'quarterly' | 'annually'
  sources: Array<{
    source: 'cash' | 'cpf_oa' | 'cpf_sa' | 'cpf_ma'
    amount: number
  }>
}
```

**Timeline service changes:**
1. Government schemes → auto-generate CPF deduction events for enrolled persons
2. IPs → generate split deductions (MediSave capped at AWL + cash remainder)
3. Re-evaluate AWL each year as person ages across thresholds (40→41, 70→71)
4. Stop CareShield Life deductions at age 67, DPS at age 65
5. Validate that total MA withdrawals don't exceed balance

**UI additions:**
- CPF Accounts view: "Insurance Deductions" summary (annual MA outflow, AWL utilization %)
- Coverage Journey: age milestone markers (CareShield stops 67, DPS stops 65)
- Projection charts: insurance CPF drain alongside mortgage/contribution flows

---

## References

- [MediShield Life Premiums & Subsidies — CPF](https://www.cpf.gov.sg/member/healthcare-financing/medishield-life/medishield-life-premiums-and-subsidies)
- [CareShield Life — CPF](https://www.cpf.gov.sg/member/healthcare-financing/careshield-life)
- [Dependants' Protection Scheme — CPF](https://www.cpf.gov.sg/member/account-services/providing-for-your-loved-ones/insuring-to-protect-your-dependants)
- [DPS Premium Rates — CPF](https://www.cpf.gov.sg/service/article/how-much-premium-do-i-need-to-pay-to-be-covered-under-dependants-protection-scheme-dps)
- [Using MediSave Savings — CPF](https://www.cpf.gov.sg/member/healthcare-financing/using-your-medisave-savings)
- [Integrated Shield Plans — MOH](https://www.moh.gov.sg/managing-expenses/schemes-and-subsidies/integrated-shield-plans/about-integrated-shield-plans/)
- [IP Rider Changes 2026 — Health Insured](https://healthinsured.sg/new-moh-rules-integrated-shield-plan-riders-2026/)
- [MediSave-Payable Plans Catalogue](./medisave-payable-plans.md)
