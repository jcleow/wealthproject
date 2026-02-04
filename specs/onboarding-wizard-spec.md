# Onboarding Wizard - Financial Plan Setup Specification

## Overview

A one-time guided onboarding wizard that helps new users set up their financial plan on first login. Automatically triggers when a user has no existing financial data. If the user skips/dismisses the wizard, it will not appear again. Follows the existing `PropertyPlannerModal` architecture pattern (React Hook Form + FormProvider, Zustand store, Framer Motion transitions).

**Key Principles:**
- **One-time only** — auto-triggers for new users, never re-appears after skip/completion
- Guided but flexible — every step can be skipped with "Complete Later"
- Progressive save — each step saves to API immediately, no data loss on close
- Reuses existing API endpoints and mutation hooks — no backend changes needed

---

## Trigger Logic

The wizard auto-opens when ALL of these conditions are true:
1. User is authenticated and on the dashboard
2. User has **zero persons** (no financial data yet)
3. User has **not previously dismissed** the wizard (`onboardingCompleted` flag in UserSettings is `false` or absent)

When the user clicks "Skip Setup" (dismiss) or completes the wizard:
- Set `onboardingCompleted: true` in UserSettings via API
- Wizard never appears again

```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                     │
│   New User Signs Up → Redirected to Dashboard                       │
│       │                                                             │
│       ├─ Check: persons.length === 0 AND !onboardingCompleted?      │
│       │                                                             │
│       ├─ YES → Auto-open Onboarding Wizard Modal                    │
│       │         │                                                   │
│       │         ├──► Step 1: Personal Info ──────────►              │
│       │         ├──► Step 2: Income & Expenses ──────►              │
│       │         ├──► Step 3: Assets & Liabilities ───►              │
│       │         ├──► Step 4: CPF Accounts ───────────►              │
│       │         └──► Step 5: Summary ─────────────────► Close       │
│       │                                                             │
│       │         OR: [Skip Setup] → set onboardingCompleted = true   │
│       │                           → close wizard, show dashboard    │
│       │                                                             │
│       └─ NO → Show dashboard normally                               │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Step Indicator Bar

Appears at the top of Steps 1-4. Hidden on the Summary step (Step 5).

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│    ①─────────②─────────③─────────④                                          │
│  Personal    Income &   Assets &    CPF                                     │
│   Info      Expenses  Liabilities  Accounts                                 │
│                                                                             │
│  States:                                                                    │
│    ● Active  = emerald border, white number, filled bg                      │
│    ✓ Done    = green bg, white checkmark icon                               │
│    ⊘ Skipped = amber bg, dash icon                                          │
│    ○ Future  = slate-600 border, dimmed number, not clickable               │
│                                                                             │
│  Clicking a completed/skipped step navigates back to it.                    │
│  Future steps are disabled until the current step is completed/skipped.     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Footer Layout (Steps 1-4)
```
[Skip Setup]    [Complete Later →]                    [← Back]  [Next →]
```

- **"Skip Setup"** (left-most) — dismisses the entire wizard permanently. Sets `onboardingCompleted = true`.
- **"Complete Later →"** — skips only this step, advances to next.
- **"Next →"** — validates + saves current step, advances. On Step 4, becomes **"Finish →"**.
- **"← Back"** — goes to previous step (hidden on Step 1).

---

## Step 1: Personal Info & Retirement

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Set Up Your Financial Plan                                           [X]  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│    ●─────────○─────────○─────────○                                          │
│  Personal    Income &   Assets &    CPF                                     │
│   Info      Expenses  Liabilities  Accounts                                 │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Household Members                                                          │
│  Tell us about yourself and your household                                  │
│                                                                             │
│  ┌─ 🟢 YOURSELF ────────────────────────────────────────────────────────┐  │
│  │                                                                       │  │
│  │  Name                    Date of Birth          Gender                │  │
│  │  ┌──────────────────┐    ┌──────────────────┐   ┌──────────────┐     │  │
│  │  │ John Doe         │    │ 15/03/1990       │   │ Male     ▼   │     │  │
│  │  └──────────────────┘    └──────────────────┘   └──────────────┘     │  │
│  │                                                                       │  │
│  │  Residency Status        PR Grant Date           Retirement Age       │  │
│  │  ┌──────────────────┐    ┌──────────────────┐   ┌──────────────┐     │  │
│  │  │ Citizen      ▼   │    │ (hidden)         │   │ 65           │     │  │
│  │  └──────────────────┘    └──────────────────┘   └──────────────┘     │  │
│  │                                                                       │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ┌─ 🔵 SPOUSE ──────────────────────────────────────────────────── [🗑] ─┐  │
│  │                                                                       │  │
│  │  Name                    Date of Birth          Gender                │  │
│  │  ┌──────────────────┐    ┌──────────────────┐   ┌──────────────┐     │  │
│  │  │ Jane Doe         │    │ 22/07/1992       │   │ Female   ▼   │     │  │
│  │  └──────────────────┘    └──────────────────┘   └──────────────┘     │  │
│  │                                                                       │  │
│  │  Residency Status        PR Grant Date           Retirement Age       │  │
│  │  ┌──────────────────┐    ┌──────────────────┐   ┌──────────────┐     │  │
│  │  │ PR           ▼   │    │ 01/06/2018       │   │ 62           │     │  │
│  │  └──────────────────┘    └──────────────────┘   └──────────────┘     │  │
│  │                                                                       │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ┌─ 🟣 DEPENDENT ───────────────────────────────────────────────── [🗑] ─┐  │
│  │                                                                       │  │
│  │  Name                    Date of Birth          Gender                │  │
│  │  ┌──────────────────┐    ┌──────────────────┐   ┌──────────────┐     │  │
│  │  │ Emily Doe        │    │ 10/01/2020       │   │ Female   ▼   │     │  │
│  │  └──────────────────┘    └──────────────────┘   └──────────────┘     │  │
│  │                                                                       │  │
│  │  Relationship                                                         │  │
│  │  ┌──────────────────┐                                                 │  │
│  │  │ Child        ▼   │    (No retirement age for dependents)           │  │
│  │  └──────────────────┘                                                 │  │
│  │                                                                       │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  [+ Add Household Member]                                                   │
│                                                                             │
│  ── Planning Horizon ────────────────────────────────────────────────────── │
│                                                                             │
│  Plan until age   ┌──────┐                                                  │
│                   │  90  │   How far into the future to project              │
│                   └──────┘                                                   │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│  [Skip Setup]   Complete Later →                           [← Back] [Next →]│
└─────────────────────────────────────────────────────────────────────────────┘
```

### Step 1 Details

| Field | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| Name | Text input | Yes | `''` | Min 1 char |
| Date of Birth | Date input | Yes | `''` | YYYY-MM-DD format |
| Gender | CustomDropdown | Yes | `'male'` | Options: Male, Female |
| Residency Status | CustomDropdown | Yes | `'citizen'` | Options: Citizen, PR |
| PR Grant Date | Date input | Conditional | `null` | Only shown when status = PR |
| Relationship | CustomDropdown | Yes | `'self'` (first) | Options: Self, Spouse, Child, Parent, Other |
| Retirement Age | Number input | No | `65` | Hidden for children. Range: 50-100 |
| Planning Horizon | Number input | No | `90` | Maps to `terminalAge` in UserSettings |

**Behavior:**
- First person card is labeled "YOURSELF" and cannot be deleted, relationship locked to "self"
- Color auto-assigned from palette (🟢, 🔵, 🟣, 🟡...)
- PR Grant Date field appears/disappears with animation when toggling residency

---

## Step 2: Income & Expenses

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Set Up Your Financial Plan                                           [X]  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│    ✓─────────●─────────○─────────○                                          │
│  Personal    Income &   Assets &    CPF                                     │
│   Info      Expenses  Liabilities  Accounts                                 │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Income Sources                                              Total: $8,500  │
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                                                                       │  │
│  │  Person          Name            Amount     Freq      Category        │  │
│  │  ┌──────────┐   ┌────────────┐  ┌────────┐ ┌───────┐ ┌───────────┐  │  │
│  │  │ 🟢 John ▼│   │ Salary     │  │ $7,000 │ │Monthly│ │ Salary  ▼ │  │  │
│  │  └──────────┘   └────────────┘  └────────┘ └───────┘ └───────────┘  │  │
│  │                                                                       │  │
│  │  CPF Wage Type   Growth Rate                                          │  │
│  │  ┌──────────┐   ┌────────────┐                                  [🗑] │  │
│  │  │  OW    ▼ │   │ 3%         │                                       │  │
│  │  └──────────┘   └────────────┘                                       │  │
│  │                                                                       │  │
│  │  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─   │  │
│  │                                                                       │  │
│  │  Person          Name            Amount     Freq      Category        │  │
│  │  ┌──────────┐   ┌────────────┐  ┌────────┐ ┌───────┐ ┌───────────┐  │  │
│  │  │ 🔵 Jane ▼│   │ Salary     │  │ $1,500 │ │Monthly│ │ Salary  ▼ │  │  │
│  │  └──────────┘   └────────────┘  └────────┘ └───────┘ └───────────┘  │  │
│  │                                                                       │  │
│  │  CPF Wage Type   Growth Rate                                          │  │
│  │  ┌──────────┐   ┌────────────┐                                  [🗑] │  │
│  │  │  OW    ▼ │   │ 3%         │                                       │  │
│  │  └──────────┘   └────────────┘                                       │  │
│  │                                                                       │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  [+ Add Income Source]                                                      │
│                                                                             │
│  ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── │
│                                                                             │
│  Recurring Expenses                                          Total: $4,200  │
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                                                                       │  │
│  │  Name              Amount       Freq        Category    Growth        │  │
│  │  ┌──────────────┐  ┌────────┐  ┌─────────┐ ┌─────────┐ ┌──────┐     │  │
│  │  │ Rent         │  │ $2,500 │  │ Monthly │ │Housing ▼│ │ 2%   │ [🗑]│  │
│  │  └──────────────┘  └────────┘  └─────────┘ └─────────┘ └──────┘     │  │
│  │                                                                       │  │
│  │  ┌──────────────┐  ┌────────┐  ┌─────────┐ ┌─────────┐ ┌──────┐     │  │
│  │  │ Living       │  │ $1,200 │  │ Monthly │ │Living  ▼│ │ 2%   │ [🗑]│  │
│  │  └──────────────┘  └────────┘  └─────────┘ └─────────┘ └──────┘     │  │
│  │                                                                       │  │
│  │  ┌──────────────┐  ┌────────┐  ┌─────────┐ ┌─────────┐ ┌──────┐     │  │
│  │  │ Transport    │  │  $500  │  │ Monthly │ │Transprt▼│ │ 2%   │ [🗑]│  │
│  │  └──────────────┘  └────────┘  └─────────┘ └─────────┘ └──────┘     │  │
│  │                                                                       │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  [+ Add Expense]                                                            │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│  [Skip Setup]   Complete Later →                           [← Back] [Next →]│
└─────────────────────────────────────────────────────────────────────────────┘
```

### Step 2 Details

**Income Fields:**

| Field | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| Person | CustomDropdown | Yes | First person | Populated from Step 1 persons |
| Name | Text input | Yes | `'Salary'` | |
| Amount | CurrencyInput | Yes | `0` | |
| Frequency | CustomDropdown | Yes | `'monthly'` | monthly, annually, quarterly, fortnightly, weekly |
| Category | CustomDropdown | Yes | `'salary'` | salary, bonus, rental, freelance, dividend, other |
| CPF Wage Type | CustomDropdown | Conditional | `'ow'` | Only for citizen/PR persons. Options: OW, AW |
| Growth Rate | Percentage input | No | `3` | Annual growth rate |

**Expense Fields:**

| Field | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| Name | Text input | Yes | `'Living Expenses'` | |
| Amount | CurrencyInput | Yes | `0` | |
| Frequency | CustomDropdown | Yes | `'monthly'` | Same options as income |
| Category | CustomDropdown | Yes | `'living'` | housing, transport, food, utilities, insurance, living, other |
| Growth Rate | Percentage input | No | `2` | Annual inflation/growth |

**Pre-populated defaults:** One salary row linked to first person, one "Living Expenses" row.

---

## Step 3: Assets & Liabilities

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Set Up Your Financial Plan                                           [X]  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│    ✓─────────✓─────────●─────────○                                          │
│  Personal    Income &   Assets &    CPF                                     │
│   Info      Expenses  Liabilities  Accounts                                 │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Assets                                                   Total: $185,000   │
│  What you own — savings, investments, property, etc.                        │
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                                                                       │  │
│  │  Name              Category       Current Value    Growth Rate        │  │
│  │  ┌──────────────┐  ┌───────────┐  ┌────────────┐  ┌──────────┐      │  │
│  │  │ Savings      │  │ Cash    ▼ │  │  $50,000   │  │   1.5%   │  [🗑]│  │
│  │  └──────────────┘  └───────────┘  └────────────┘  └──────────┘      │  │
│  │                                                                       │  │
│  │  ┌──────────────┐  ┌───────────┐  ┌────────────┐  ┌──────────┐      │  │
│  │  │ Stock ETFs   │  │ Stocks  ▼ │  │ $120,000   │  │   7.0%   │  [🗑]│  │
│  │  └──────────────┘  └───────────┘  └────────────┘  └──────────┘      │  │
│  │                                                                       │  │
│  │  ┌──────────────┐  ┌───────────┐  ┌────────────┐  ┌──────────┐      │  │
│  │  │ Car          │  │ Vehicle ▼ │  │  $15,000   │  │  (5.0%)  │  [🗑]│  │
│  │  └──────────────┘  └───────────┘  └────────────┘  └──────────┘      │  │
│  │                                                                       │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  [+ Add Asset]                                                              │
│                                                                             │
│  ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── ── │
│                                                                             │
│  Liabilities                                              Total: ($320,000) │
│  What you owe — mortgages, loans, credit cards, etc.                        │
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                                                                       │  │
│  │  Name           Category      Balance      APR      Min Payment      │  │
│  │  ┌────────────┐ ┌──────────┐  ┌──────────┐ ┌──────┐ ┌──────────┐    │  │
│  │  │ Mortgage   │ │Mortgage▼ │  │ $300,000 │ │ 2.5% │ │ $1,500   │[🗑]│  │
│  │  └────────────┘ └──────────┘  └──────────┘ └──────┘ └──────────┘    │  │
│  │                                                                       │  │
│  │  ┌────────────┐ ┌──────────┐  ┌──────────┐ ┌──────┐ ┌──────────┐    │  │
│  │  │ Car Loan   │ │Car Loan▼ │  │  $20,000 │ │ 3.5% │ │   $400   │[🗑]│  │
│  │  └────────────┘ └──────────┘  └──────────┘ └──────┘ └──────────┘    │  │
│  │                                                                       │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  [+ Add Liability]                                                          │
│                                                                             │
│  ┌─ 💡 ──────────────────────────────────────────────────────────────────┐  │
│  │  No assets yet? That's okay! You can add them later from the          │  │
│  │  dashboard. This step is completely optional.                          │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│  [Skip Setup]   Complete Later →                           [← Back] [Next →]│
└─────────────────────────────────────────────────────────────────────────────┘
```

### Step 3 Details

**Asset Fields:**

| Field | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| Name | Text input | Yes | `''` | |
| Category | CustomDropdown | Yes | `'cash_savings'` | cash_savings, stocks_etfs, bonds, property, vehicle, other |
| Current Value | CurrencyInput | Yes | `0` | |
| Growth Rate | Percentage input | No | `3` | Can be negative for depreciating assets |

**Liability Fields:**

| Field | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| Name | Text input | Yes | `''` | |
| Category | CustomDropdown | Yes | `'mortgage'` | mortgage, car_loan, student_loan, credit_card, personal_loan, other |
| Current Balance | CurrencyInput | Yes | `0` | |
| Interest Rate APR | Percentage input | No | `0` | |
| Minimum Payment | CurrencyInput | No | `0` | Monthly minimum |

**Empty state:** Starts empty (unlike Steps 1-2). Shows a helpful info banner encouraging users that this step is optional.

---

## Step 4: CPF Accounts

### When persons have citizen/PR status:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Set Up Your Financial Plan                                           [X]  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│    ✓─────────✓─────────✓─────────●                                          │
│  Personal    Income &   Assets &    CPF                                     │
│   Info      Expenses  Liabilities  Accounts                                 │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  CPF Account Balances                                                       │
│  Enter your current CPF balances (check cpf.gov.sg)                         │
│                                                                             │
│  ┌─ 🟢 John Doe (Citizen) ──────────────────────────────────────────────┐  │
│  │                                                                       │  │
│  │  ┌─────────────────────────┐   ┌─────────────────────────┐           │  │
│  │  │  Ordinary Account (OA)  │   │  Special Account (SA)   │           │  │
│  │  │                         │   │                         │           │  │
│  │  │  ┌───────────────────┐  │   │  ┌───────────────────┐  │           │  │
│  │  │  │     $45,000       │  │   │  │     $32,000       │  │           │  │
│  │  │  └───────────────────┘  │   │  └───────────────────┘  │           │  │
│  │  └─────────────────────────┘   └─────────────────────────┘           │  │
│  │                                                                       │  │
│  │  ┌─────────────────────────┐   ┌─────────────────────────┐           │  │
│  │  │  MediSave Account (MA)  │   │  Retirement Account (RA)│           │  │
│  │  │                         │   │                         │           │  │
│  │  │  ┌───────────────────┐  │   │  ┌───────────────────┐  │           │  │
│  │  │  │     $18,000       │  │   │  │     $0            │  │           │  │
│  │  │  └───────────────────┘  │   │  └───────────────────┘  │           │  │
│  │  └─────────────────────────┘   └─────────────────────────┘           │  │
│  │                                                                       │  │
│  │  ℹ RA is created at age 55. Leave as $0 if you're under 55.          │  │
│  │                                                                       │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ┌─ 🔵 Jane Doe (PR since 2018) ────────────────────────────────────────┐  │
│  │                                                                       │  │
│  │  ┌─────────────────────────┐   ┌─────────────────────────┐           │  │
│  │  │  Ordinary Account (OA)  │   │  Special Account (SA)   │           │  │
│  │  │  ┌───────────────────┐  │   │  ┌───────────────────┐  │           │  │
│  │  │  │     $28,000       │  │   │  │     $15,000       │  │           │  │
│  │  │  └───────────────────┘  │   │  └───────────────────┘  │           │  │
│  │  └─────────────────────────┘   └─────────────────────────┘           │  │
│  │                                                                       │  │
│  │  ┌─────────────────────────┐   ┌─────────────────────────┐           │  │
│  │  │  MediSave Account (MA)  │   │  Retirement Account (RA)│           │  │
│  │  │  ┌───────────────────┐  │   │  ┌───────────────────┐  │           │  │
│  │  │  │     $12,000       │  │   │  │     $0            │  │           │  │
│  │  │  └───────────────────┘  │   │  └───────────────────┘  │           │  │
│  │  └─────────────────────────┘   └─────────────────────────┘           │  │
│  │                                                                       │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│  [Skip Setup]   Complete Later →                        [← Back] [Finish →]│
└─────────────────────────────────────────────────────────────────────────────┘
```

### When no persons are citizen/PR:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│    ✓─────────✓─────────✓─────────●                                          │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│                                                                             │
│                          ℹ️                                                  │
│                                                                             │
│                  Not Applicable                                              │
│                                                                             │
│       CPF accounts are only applicable for                                  │
│       Singapore Citizens and Permanent Residents.                           │
│                                                                             │
│       None of your household members have                                   │
│       Citizen or PR residency status.                                       │
│                                                                             │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│  [Skip Setup]   Complete Later →                        [← Back] [Finish →]│
└─────────────────────────────────────────────────────────────────────────────┘
```

### Step 4 Details

| Field | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| OA Balance | CurrencyInput | No | `0` | Per person |
| SA Balance | CurrencyInput | No | `0` | Per person |
| MA Balance | CurrencyInput | No | `0` | Per person |
| RA Balance | CurrencyInput | No | `0` | Per person, 0 if under 55 |

**Auto-population:** On entering Step 4, auto-create one CPF entry per citizen/PR person from Step 1 (if not already created).

---

## Step 5: Summary

Shown after completing or finishing Step 4. No step indicator — this is a completion screen.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Set Up Your Financial Plan                                           [X]  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│                           ✅                                                │
│                                                                             │
│                  Your Plan is Ready!                                        │
│                                                                             │
│  ┌─ What We Set Up ─────────────────────────────────────────────────────┐  │
│  │                                                                       │  │
│  │   👥  2 Household Members          John Doe, Jane Doe                │  │
│  │   💰  2 Income Sources             $8,500/mo total                   │  │
│  │   💸  3 Recurring Expenses         $4,200/mo total                   │  │
│  │   📈  3 Assets                     $185,000 total                    │  │
│  │   📉  2 Liabilities                ($320,000) total                  │  │
│  │   🏦  2 CPF Accounts               $150,000 combined                │  │
│  │                                                                       │  │
│  │   ⊘  Skipped: (none)                                                │  │
│  │                                                                       │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ┌─ 💡 ──────────────────────────────────────────────────────────────────┐  │
│  │  You can fine-tune your financial data anytime from the dashboard.     │  │
│  │  Add scenario events to test "what-if" situations, explore CPF         │  │
│  │  projections, or set up insurance coverage analysis.                   │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                          [Go to Dashboard →]│
└─────────────────────────────────────────────────────────────────────────────┘
```

### Summary Step Details

- Counts are derived from the form data (not API queries) — shows what was just created
- **Skipped steps** shown in amber: e.g., "⊘ Skipped: Assets & Liabilities, CPF Accounts"
- **"Go to Dashboard →"** button closes the wizard and sets `onboardingCompleted = true`
- The info banner reminds users they can tweak everything from the dashboard
- Items with `$0` or empty entries are excluded from counts

---

## File Structure

```
frontend/src/components/modals/OnboardingWizardModal/
├── OnboardingWizardModal.tsx         # Modal shell (Portal, overlay, header/footer)
├── OnboardingWizardView.tsx          # Step machine + FormProvider controller
├── components/
│   ├── StepIndicator.tsx             # Horizontal step progress bar (4 circles)
│   ├── PersonalInfoStep.tsx          # Step 1 content
│   ├── PersonCard.tsx                # Single person card (used in Step 1)
│   ├── IncomeExpensesStep.tsx        # Step 2 content
│   ├── AssetsLiabilitiesStep.tsx     # Step 3 content
│   ├── CpfAccountsStep.tsx          # Step 4 content
│   └── SummaryStep.tsx              # Step 5: completion summary
├── hooks/
│   ├── useOnboardingForm.ts          # React Hook Form setup + Zod schema + defaults
│   └── useOnboardingSubmit.ts        # Per-step API submission logic
└── types.ts                          # OnboardingFormData + Zod schemas
```

---

## Files to Modify (Existing)

| File | Change |
|------|--------|
| `frontend/src/stores/featureModulesStore.ts` | Add `showOnboardingWizard`, `openOnboardingWizard()`, `closeOnboardingWizard()` to state + actions + selectors |
| `frontend/src/components/dashboard/Dashboard.tsx` | Import + render `<OnboardingWizardModal>`, add auto-trigger logic (check persons count + `onboardingCompleted` setting) |

No changes to `FinancialWorkspace.tsx` — the wizard is auto-triggered, not manually invoked.

---

## Architecture Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Form management | Single React Hook Form + FormProvider | Same pattern as PropertyPlannerModal. All steps share one form, no prop drilling |
| Modal visibility | Zustand `featureModulesStore` | Consistent with all other modals in the app |
| Save strategy | Progressive per-step | Preserves partial progress. Each "Next" saves that step's data via API |
| Idempotent saves | `serverId` field per entry | Prevents duplicates if user navigates back and re-saves. If `serverId` exists → update, else → create |
| Step transitions | Framer Motion AnimatePresence | Same pattern as MortgageForm step transitions |
| Validation | Zod per-step sub-schemas | Only validates current step on "Next", skip bypasses validation entirely |
| CPF auto-populate | `useEffect` on Step 4 mount | Creates CPF entries for eligible persons automatically |
| One-time trigger | `onboardingCompleted` in UserSettings | Persisted server-side. Checked on dashboard mount alongside persons count |
| Skip/dismiss behavior | Sets `onboardingCompleted = true` | "Skip Setup", X button, and completing wizard all set this flag permanently |

---

## Data Submission Flow

```
Step 1 Save:
  ├─ For each person: createPerson() → store serverId
  ├─ Build personIdMap (tempId → serverId) for Steps 2 & 4
  └─ updateUserSettings({ terminalAge: planningHorizonAge })

Step 2 Save:
  ├─ For each income: resolve personTempId → serverId via map
  │   └─ createIncome({ personId, name, amount, frequency, ... })
  └─ For each expense: createExpense({ name, amount, frequency, ... })

Step 3 Save:
  ├─ For each asset: createAsset({ name, category, currentValue, ... })
  └─ For each liability: createLiability({ name, category, currentBalance, ... })

Step 4 Save:
  └─ For each CPF entry: resolve personTempId → serverId
      └─ createCpfAccount({ personId, oaBalance, saBalance, maBalance, raBalance })
```

**Error handling:** If an API call fails mid-step, show toast error, stay on current step, allow retry. Already-saved entries (with `serverId`) are skipped on retry.

---

## Edge Cases

| Scenario | Handling |
|----------|----------|
| Person deleted in Step 1 | Cascade-remove linked incomes (Step 2) and CPF entries (Step 4) from form data |
| User closes modal mid-flow (X button) | Same as "Skip Setup" — set `onboardingCompleted = true`, wizard won't re-appear |
| User already has data (returning user) | `persons.length > 0` → wizard never triggers |
| `onboardingCompleted` already true | Wizard never triggers, even if persons count is 0 |
| All persons are non-citizen/PR | Step 4 shows "Not Applicable" message, "Finish →" still works |
| Mobile viewport | Modal: `max-w-[800px] mx-4`, CPF grid: `grid-cols-1 sm:grid-cols-2` |
| Monet theme | All components check `isMonet` for theme-variant styling (same as PropertyPlannerModal) |
| API error during auto-trigger check | Fail silently — don't show wizard if unsure, user can add data manually |

---

## Implementation Sequence

1. **Types & Schema** — `types.ts` + `useOnboardingForm.ts`
2. **Store Update** — Add wizard state to `featureModulesStore.ts`
3. **Modal Shell** — `OnboardingWizardModal.tsx` + `OnboardingWizardView.tsx` + `StepIndicator.tsx`
4. **Step 1** — `PersonalInfoStep.tsx` + `PersonCard.tsx` (most complex step)
5. **Step 2** — `IncomeExpensesStep.tsx`
6. **Step 3** — `AssetsLiabilitiesStep.tsx`
7. **Step 4** — `CpfAccountsStep.tsx`
8. **Step 5** — `SummaryStep.tsx` (completion screen with counts + info banner)
9. **Submission Hook** — `useOnboardingSubmit.ts` (per-step API calls + `onboardingCompleted` flag)
10. **Dashboard Integration** — Auto-trigger logic in `Dashboard.tsx` (check persons count + settings flag)
11. **Polish** — Animations, loading states, error toasts, theme variants

---

## Verification Checklist

- [ ] New user (0 persons, no `onboardingCompleted`) → wizard auto-opens on dashboard load
- [ ] Add 2 persons → Next → verify persons created via API (check Network tab)
- [ ] Add income + expense → Next → verify created with correct `personId` FK
- [ ] Add asset + liability → Next → verify created
- [ ] Enter CPF balances → Finish → verify CPF accounts created
- [ ] Summary step shows correct counts for all created items
- [ ] "Go to Dashboard" → wizard closes, `onboardingCompleted` set to true
- [ ] Refresh page → wizard does NOT re-appear (flag persisted)
- [ ] "Skip Setup" at any step → wizard closes permanently, no data created for that step
- [ ] Skip all steps → verify wizard dismissed, `onboardingCompleted = true`
- [ ] Delete a person in Step 1 → go to Step 2 → verify linked income removed
- [ ] Test with non-citizen persons → Step 4 shows "Not Applicable"
- [ ] Toggle Monet theme → verify all steps render correctly
- [ ] Resize to mobile → verify responsive layout (stacked fields, single-column CPF grid)
- [ ] Close modal via X button → same as "Skip Setup" (permanent dismiss)
