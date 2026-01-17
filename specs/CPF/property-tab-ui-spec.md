# CPF Property Tab UI Specification

## Overview
A revamped CPF Property tab that provides a comprehensive view of CPF usage across all property scenarios, with per-person breakdowns and the ability to link/edit properties from the property planner.

---

## Layout Structure

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                                    CPF Property Overview                                 │
├────────────────────────────────┬────────────────────────────────────────────────────────┤
│                                │                                                        │
│   LEFT PANEL (35%)             │   RIGHT PANEL (65%)                                    │
│   Property Scenarios List      │   Selected Property Detail                             │
│                                │                                                        │
│                                │                                                        │
│                                │                                                        │
│                                │                                                        │
│                                │                                                        │
│                                │                                                        │
│                                │                                                        │
│                                │                                                        │
│                                │                                                        │
│                                │                                                        │
│                                │                                                        │
│                                │                                                        │
├────────────────────────────────┴────────────────────────────────────────────────────────┤
│   AGGREGATE SUMMARY BAR (fixed at bottom)                                               │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## Left Panel: Property Scenarios List

```
┌──────────────────────────────────┐
│  Active Properties              │
│  ────────────────────────────    │
│                                  │
│  ┌────────────────────────────┐  │
│  │ 🏠  Marine Parade HDB      │  │  ← Selected (highlighted border)
│  │     ┌─────────┐            │  │
│  │     │ HDB     │  Active   │  │  ← Property type badge + status
│  │     └─────────┘            │  │
│  │     $320,000 CPF used      │  │  ← Quick summary
│  │     John: $180k │ Jane: $140k │  │  ← Per-person mini breakdown
│  └────────────────────────────┘  │
│                                  │
│  ┌────────────────────────────┐  │
│  │ 🏢  Bishan Condo           │  │  ← Not selected (normal border)
│  │     ┌─────────┐            │  │
│  │     │ Private │  Active   │  │
│  │     └─────────┘            │  │
│  │     $450,000 CPF used      │  │
│  │     John: $450k │ (Single) │  │
│  └────────────────────────────┘  │
│                                  │
│  ▼ Draft Properties (1)         │  ← Collapsible section
│  ┌────────────────────────────┐  │
│  │ 🏠  Future BTO             │  │
│  │     ┌─────┐                │  │
│  │     │ BTO │   Draft        │  │  ← Amber "Draft" badge
│  │     └─────┘                │  │
│  │     $200,000 CPF planned   │  │
│  │     (Not counting toward   │  │
│  │      totals)               │  │
│  └────────────────────────────┘  │
│                                  │
│  ┌────────────────────────────┐  │
│  │  + Link from Property      │  │  ← Opens Property Planner modal
│  │    Planner                 │  │
│  └────────────────────────────┘  │
│                                  │
└──────────────────────────────────┘
```

### Card States

**Active Card (Selected):**
```
┌─────────────────────────────────────┐
│ 🏠  Marine Parade HDB         ⋮    │ ← Kebab menu (Edit, Remove)
│     ┌───────┐  ┌─────────────────┐ │
│     │ HDB   │  │ ✓ Active       │ │ ← Green badge
│     └───────┘  └─────────────────┘ │
│                                     │
│     Total CPF: $320,000            │
│     ├─ John:  $180,000             │
│     └─ Jane:  $140,000             │
└─────────────────────────────────────┘
  ↑ border-emerald-500/30 (selected)
```

**Draft Card:**
```
┌─────────────────────────────────────┐
│ 🏠  Future BTO                ⋮    │
│     ┌───────┐  ┌─────────────────┐ │
│     │ BTO   │  │ ○ Draft         │ │ ← Amber badge
│     └───────┘  └─────────────────┘ │
│                                     │
│     Total CPF: $200,000            │
│     ├─ John:  $100,000             │
│     └─ Jane:  $100,000             │
│                                     │
│  ⚠ Not included in calculations   │ ← Muted warning text
└─────────────────────────────────────┘
  ↑ border-amber-500/20 bg-amber-500/5
```

---

## Right Panel: Selected Property Detail

```
┌────────────────────────────────────────────────────────────────────────────────┐
│                                                                                │
│  ┌─ Header ──────────────────────────────────────────────────────────────────┐ │
│  │  🏠  Marine Parade HDB                                    [Edit Property] │ │
│  │      HDB • Resale • Purchased Jan 2020                                    │ │
│  └───────────────────────────────────────────────────────────────────────────┘ │
│                                                                                │
│  ┌─ CPF Usage by Person ─────────────────────────────────────────────────────┐ │
│  │                                                                           │ │
│  │  ┌─────────────────────────────┐  ┌─────────────────────────────┐        │ │
│  │  │  👤 John (You)              │  │  👤 Jane (Spouse)           │        │ │
│  │  │  ───────────────────────    │  │  ───────────────────────    │        │ │
│  │  │                             │  │                             │        │ │
│  │  │  Down Payment               │  │  Down Payment               │        │ │
│  │  │    CPF OA:     $50,000     │  │    CPF OA:     $50,000     │        │ │
│  │  │    Cash:       $30,000     │  │    Cash:       $20,000     │        │ │
│  │  │                             │  │                             │        │ │
│  │  │  Monthly Payments           │  │  Monthly Payments           │        │ │
│  │  │    CPF OA:     $800/mo     │  │    CPF OA:     $600/mo     │        │ │
│  │  │    × 60 months              │  │    × 60 months              │        │ │
│  │  │    Total:      $48,000     │  │    Total:      $36,000     │        │ │
│  │  │                             │  │                             │        │ │
│  │  │  ─────────────────────      │  │  ─────────────────────      │        │ │
│  │  │  Total CPF Used            │  │  Total CPF Used            │        │ │
│  │  │  $180,000                  │  │  $140,000                  │        │ │
│  │  │  + $22,500 interest        │  │  + $17,500 interest        │        │ │
│  │  │                             │  │                             │        │ │
│  │  │  Must refund at sale:      │  │  Must refund at sale:      │        │ │
│  │  │  $202,500                  │  │  $157,500                  │        │ │
│  │  └─────────────────────────────┘  └─────────────────────────────┘        │ │
│  │                                                                           │ │
│  └───────────────────────────────────────────────────────────────────────────┘ │
│                                                                                │
│  ┌─ Accrued Interest ────────────────────────────────────────────────────────┐ │
│  │                                                                           │ │
│  │  Total Accrued: $40,000                              Rate: 2.5% p.a.     │ │
│  │                                                                           │ │
│  │     $50K ┤                                               ╭───────        │ │
│  │          │                                          ╭────╯               │ │
│  │     $40K ┤                                     ╭────╯                    │ │
│  │          │                                ╭────╯                         │ │
│  │     $30K ┤                           ╭────╯                              │ │
│  │          │                      ╭────╯                                   │ │
│  │     $20K ┤                 ╭────╯                                        │ │
│  │          │            ╭────╯                                             │ │
│  │     $10K ┤       ╭────╯                                                  │ │
│  │          │  ╭────╯                                                       │ │
│  │       $0 ┼──╯────────────────────────────────────────────────────────    │ │
│  │          2020   2021   2022   2023   2024   2025   2026   2027           │ │
│  │                                                                           │ │
│  │  ⚠ When you sell, you must refund principal + accrued interest to CPF   │ │
│  └───────────────────────────────────────────────────────────────────────────┘ │
│                                                                                │
│  ┌─ Housing Grants ──────────────────────────────────────────────────────────┐ │
│  │                                                                           │ │
│  │  Grant                              Amount                                │ │
│  │  ─────────────────────────────────────────────────────────────────────   │ │
│  │  EHG (Enhanced CPF Housing Grant)   $80,000                              │ │
│  │  PHG (Proximity Housing Grant)      $30,000                              │ │
│  │  ─────────────────────────────────────────────────────────────────────   │ │
│  │  Total Grants                       $110,000                             │ │
│  │                                                                           │ │
│  │  ℹ Grants reduce loan amount but are NOT refunded to CPF upon sale      │ │
│  │    (unlike your CPF contributions which must be refunded with interest)  │ │
│  │                                                                           │ │
│  └───────────────────────────────────────────────────────────────────────────┘ │
│                                                                                │
│  ┌─ Upon Sale ───────────────────────────────────────────────────────────────┐ │
│  │                                                                           │ │
│  │  Expected Sale: Dec 2030    Expected Price: $850,000                     │ │
│  │                                                                           │ │
│  │  Sale Proceeds Breakdown                                                  │ │
│  │  ─────────────────────────────────────────────────────────────────────   │ │
│  │  Expected Sale Price                               $850,000              │ │
│  │  Less: Outstanding Loan                           ($320,000)             │ │
│  │  Less: Selling Costs (~2%)                         ($17,000)             │ │
│  │  Less: CPF Refund Required                        ($360,000)             │ │
│  │        ├─ Principal: $320,000                                            │ │
│  │        └─ Accrued Interest: $40,000                                      │ │
│  │  ─────────────────────────────────────────────────────────────────────   │ │
│  │  Net Cash Proceeds                                 $153,000              │ │
│  │                                                                           │ │
│  │  CPF Refund Destinations:                                                 │ │
│  │  ┌──────────────────────────────────────────────────────────────────┐    │ │
│  │  │  $360,000  ──────────►  John's OA: $202,500                      │    │ │
│  │  │  Total Refund           Jane's OA: $157,500                      │    │ │
│  │  └──────────────────────────────────────────────────────────────────┘    │ │
│  │                                                                           │ │
│  └───────────────────────────────────────────────────────────────────────────┘ │
│                                                                                │
└────────────────────────────────────────────────────────────────────────────────┘
```

---

## Aggregate Summary Bar (Fixed Bottom)

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                                                                                         │
│   📊 Across All Active Properties                                                      │
│                                                                                         │
│   ┌─────────────────────┐   ┌─────────────────────┐   ┌─────────────────────┐          │
│   │ Total CPF Used      │   │ Total Accrued       │   │ Total Grants        │          │
│   │ $770,000            │   │ Interest            │   │ $110,000            │          │
│   │                     │   │ $89,230             │   │                     │          │
│   │ ▪ John: $430,000    │   │                     │   │                     │          │
│   │ ▪ Jane: $340,000    │   │ ▪ John: $52,000     │   │                     │          │
│   │                     │   │ ▪ Jane: $37,230     │   │                     │          │
│   └─────────────────────┘   └─────────────────────┘   └─────────────────────┘          │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## Empty State

When no property scenarios exist:

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                                                                                         │
│                                                                                         │
│                              🏠                                                         │
│                                                                                         │
│                    No Property Scenarios Yet                                            │
│                                                                                         │
│          Create a property scenario in the Property Planner to see                      │
│          how it affects your CPF usage and retirement planning.                         │
│                                                                                         │
│                    ┌────────────────────────────┐                                       │
│                    │  Open Property Planner     │                                       │
│                    └────────────────────────────┘                                       │
│                                                                                         │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## Single Borrower View

When property has only one borrower (no joint):

```
┌─ CPF Usage ──────────────────────────────────────────────────────────────────┐
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │  👤 John                                                                │ │
│  │  ─────────────────────────────────────────────────────────────────      │ │
│  │                                                                         │ │
│  │  Down Payment                          Monthly Payments                 │ │
│  │    CPF OA:     $100,000                  CPF OA:     $1,400/mo         │ │
│  │    Cash:       $50,000                   × 60 months                   │ │
│  │                                          Total:      $84,000           │ │
│  │                                                                         │ │
│  │  ──────────────────────────────────────────────────────────────────     │ │
│  │  Total CPF Used: $184,000              Accrued Interest: $45,000       │ │
│  │  Must refund at sale: $229,000                                         │ │
│  │                                                                         │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## Interactions

### 1. Selecting a Property
- Click on any property card in the left panel
- Right panel updates to show that property's details
- Selected card gets highlighted border (`border-emerald-500/30`)

### 2. Toggle Active/Draft Status
- Click kebab menu (⋮) on property card → "Mark as Draft" / "Mark as Active"
- OR toggle switch in detail header
- Confirmation dialog: "This will include/exclude this property from CPF calculations"
- Property moves between Active and Draft sections
- Aggregate bar updates immediately

### 3. Edit Property
- Click "Edit Property" button in detail header
- Opens Property Planner modal with this scenario loaded
- Changes saved sync back to CPF view

### 4. Link New Property
- Click "+ Link from Property Planner" button
- Opens Property Planner modal in selection/creation mode
- Newly linked property appears in Active or Draft section

### 5. Collapsible Draft Section
- Click "▼ Draft Properties (N)" to expand/collapse
- Collapsed by default if empty
- Shows count badge

---

## Responsive Behavior

### Desktop (≥1024px)
- Side-by-side layout as shown above
- Left panel: 35%, Right panel: 65%

### Tablet (768px - 1023px)
- Left panel: 40%, Right panel: 60%
- Aggregate bar metrics stack 2 per row

### Mobile (<768px)
- Stacked layout: List on top, detail below
- OR: Tab-based navigation between list and detail
- Aggregate bar: Single column, vertical stack

```
Mobile Layout Option A (Stacked):
┌───────────────────────────┐
│  Property List            │
│  ───────────────────      │
│  [Marine Parade HDB]      │
│  [Bishan Condo]           │
│  ▼ Draft Properties       │
│  [+ Link Property]        │
├───────────────────────────┤
│  Selected Property Detail │
│  ───────────────────      │
│  (scrollable content)     │
│                           │
├───────────────────────────┤
│  Aggregate Summary        │
└───────────────────────────┘

Mobile Layout Option B (Tabs):
┌───────────────────────────┐
│  [List] [Detail] [Summary]│  ← Tab bar
├───────────────────────────┤
│                           │
│  (Active tab content)     │
│                           │
└───────────────────────────┘
```

---

## Color Scheme

| Element | Color | Tailwind Class |
|---------|-------|----------------|
| Active badge | Green | `bg-emerald-500/15 text-emerald-400` |
| Draft badge | Amber | `bg-amber-500/15 text-amber-400` |
| Selected card border | Green | `border-emerald-500/30` |
| Property type badge (HDB) | Blue | `bg-blue-500/15 text-blue-400` |
| Property type badge (Private) | Purple | `bg-violet-500/15 text-violet-400` |
| Property type badge (EC) | Cyan | `bg-cyan-500/15 text-cyan-400` |
| Accrued interest | Amber | `text-amber-400` |
| Positive proceeds | Green | `text-emerald-400` |
| Negative proceeds | Red | `text-rose-400` |
| Person name | White | `text-white` |
| CPF amounts | White | `text-white font-mono` |

---

## Data Sources

| Data | Source | Query Hook |
|------|--------|------------|
| Property scenarios | `/api/v2/property-planner/scenarios` | `listScenarios()` |
| CPF housing usage | `/api/v1/cpf/housing-usage/:scenarioId` | `useCPFHousingUsageQuery()` |
| Person names | `/api/v1/persons` | `usePersonsQuery()` |
| CPF accounts | `/api/v1/cpf/accounts` | `useCpfAccountsQuery()` |

---

## Data Flow: Property Planner → CPF View

This section explains how existing Property Planner data maps to the CPF Property view.

### Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                              PROPERTY PLANNER (Source)                               │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                     │
│   PropertyScenarioFull                                                              │
│   ├── scenario.id                                                                   │
│   ├── propertySG                                                                    │
│   │   ├── name                          ──────────────► Property Name               │
│   │   ├── propertyType (hdb/private)    ──────────────► Type Badge                  │
│   │   ├── propertySubtype (bto/resale)  ──────────────► Subtype Label               │
│   │   ├── isIncluded                    ──────────────► Active/Draft Status         │
│   │   ├── propertyPrice                                                             │
│   │   │                                                                             │
│   │   │   ┌─────────────────────────────────────────────────────────────┐           │
│   │   │   │  PER-BORROWER CPF DATA (already in Property Planner)       │           │
│   │   │   ├─────────────────────────────────────────────────────────────┤           │
│   │   ├── borrower1CpfAccountId         ──┬──────────► Person 1 Name (via lookup)   │
│   │   ├── borrower1DownpaymentCpfOa     ──┤                                         │
│   │   ├── borrower1MonthlyCpfOa         ──┴──────────► Person 1 CPF Usage           │
│   │   │                                                                             │
│   │   ├── borrower2CpfAccountId         ──┬──────────► Person 2 Name (via lookup)   │
│   │   ├── borrower2DownpaymentCpfOa     ──┤                                         │
│   │   ├── borrower2MonthlyCpfOa         ──┴──────────► Person 2 CPF Usage           │
│   │   │                                                                             │
│   │   ├── saleExpectedDate              ──────────────► Sale Section Visibility     │
│   │   └── saleExpectedPrice             ──────────────► Sale Proceeds Calc          │
│   │                                                                                 │
│   ├── grants[]                          ──────────────► Grants Section              │
│   │   ├── name (EHG/FHG/PHG/STEP_UP)                                               │
│   │   └── amount                                                                    │
│   │                                                                                 │
│   └── computed                                                                      │
│       ├── loanAmount                    ──────────────► Sale Calc (outstanding)     │
│       └── monthlyPayment                ──────────────► Verify monthly CPF usage    │
│                                                                                     │
└─────────────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                         CPF HOUSING USAGE API (Computed)                             │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                     │
│   GET /api/v1/cpf/housing-usage/:scenarioId                                         │
│                                                                                     │
│   Response: {                                                                       │
│     usage: {                                                                        │
│       downPayment: { oaUsed, cashUsed, grantReceived }  ► Down Payment Section      │
│       monthlyPayments: [...]                            ► Monthly breakdown         │
│       totals: { totalOAUsed, oaForDownPayment, ... }    ► Summary cards             │
│       accruedInterest: {                                                            │
│         totalAccrued,                                   ► Interest chart            │
│         yearlyBreakdown: [{ year, cumulativeInterest }] ► Chart data points         │
│       }                                                                             │
│     },                                                                              │
│     saleAnalysis: {                               (only if saleExpectedDate set)    │
│       grossProceeds, outstandingLoan, sellingCosts,     ► Sale breakdown            │
│       cpfRefundRequired: { principal, interest },       ► Refund amounts            │
│       netCashProceeds                                   ► Final proceeds            │
│     }                                                                               │
│   }                                                                                 │
│                                                                                     │
└─────────────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                              CPF PROPERTY VIEW (Display)                             │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

### Field Mapping Table

| CPF View Element | Property Planner Source | Notes |
|------------------|------------------------|-------|
| **Left Panel** | | |
| Property name | `propertySG.name` | Direct |
| Type badge (HDB/Private) | `propertySG.propertyType` | Map to badge color |
| Subtype label | `propertySG.propertySubtype` | BTO/Resale/EC/New |
| Active/Draft status | `propertySG.isIncluded` | `true` = Active |
| Total CPF used | `housingUsage.totals.totalOAUsed` | From API |
| Per-person mini totals | Computed (see below) | |
| **Right Panel - Per Person** | | |
| Person 1 name | `cpfAccounts.find(borrower1CpfAccountId).personName` | Lookup via CPF account |
| Person 1 down payment CPF | `propertySG.borrower1DownpaymentCpfOa` | Direct from scenario |
| Person 1 monthly CPF | `propertySG.borrower1MonthlyCpfOa` | Direct from scenario |
| Person 1 total used | `downpayment + (monthly × months)` | Frontend calc |
| Person 1 accrued interest | `principal × (1.025^years - 1)` | Frontend calc OR backend |
| Person 2 (same pattern) | `borrower2*` fields | Only if `borrowerType=joint` |
| **Right Panel - Interest** | | |
| Chart data | `housingUsage.accruedInterest.yearlyBreakdown` | From API |
| Total accrued | `housingUsage.accruedInterest.totalAccrued` | From API |
| **Right Panel - Grants** | | |
| Grant list | `scenario.grants[]` | Direct from scenario |
| Total grants | `SUM(grants[].amount)` | Frontend calc |
| **Right Panel - Sale** | | |
| Expected date | `propertySG.saleExpectedDate` | Show section if set |
| Expected price | `propertySG.saleExpectedPrice` | Direct |
| Outstanding loan | `saleAnalysis.outstandingLoan` | From API |
| CPF refund required | `saleAnalysis.cpfRefundRequired` | From API |
| Net proceeds | `saleAnalysis.netCashProceeds` | From API |
| **Aggregate Bar** | | |
| Total CPF used | `SUM(activeScenarios.totalOAUsed)` | Frontend aggregation |
| Total interest | `SUM(activeScenarios.accruedInterest)` | Frontend aggregation |
| Total grants | `SUM(activeScenarios.grants)` | Frontend aggregation |

### Gap Analysis: What's Missing?

Current `useCPFHousingUsageQuery` returns **aggregated** data, but we need **per-borrower** breakdowns.

**Option A: Frontend Computation (Recommended)**
```
Per-person data already exists in PropertySG:
├── borrower1DownpaymentCpfOa     → Person 1 down payment
├── borrower1MonthlyCpfOa         → Person 1 monthly
├── borrower2DownpaymentCpfOa     → Person 2 down payment
├── borrower2MonthlyCpfOa         → Person 2 monthly

Frontend computes:
├── Person 1 total = downpayment + (monthly × holding_months)
├── Person 1 interest = total × (1.025^years - 1)
└── Same for Person 2
```

**Option B: Backend Enhancement**
Modify `/api/v1/cpf/housing-usage/:scenarioId` to return:
```json
{
  "usage": { ... },
  "perBorrower": {
    "borrower1": { "totalUsed": "180000", "accruedInterest": "22500" },
    "borrower2": { "totalUsed": "140000", "accruedInterest": "17500" }
  }
}
```

### Person Name Resolution

```
PropertySG.borrower1CpfAccountId
        │
        ▼
CPFAccount (from useCpfAccountsQuery)
        │
        ├── personId ─────────► Person.id
        │                            │
        └── personName ◄─────────────┘  (already joined in API response)
```

The `CPFAccount` type already includes `personName` from the JOIN, so we can display names directly.

### Holding Period Calculation

For monthly payment totals and interest accrual:

```
Purchase Date = propertySG.btoKeyCollectionDate || scenario.createdAt
Today = new Date()
Holding Months = monthDiff(Purchase Date, Today)

If sale date set:
  Sale Date = propertySG.saleExpectedDate
  Holding Months = monthDiff(Purchase Date, Sale Date)
```

---

## Questions for Review

1. **Mobile layout**: Do you prefer Option A (stacked) or Option B (tabs)?

2. **Edit in place**: Should users be able to edit some fields (like monthly CPF amount) directly in the detail view, or always redirect to Property Planner?

3. **Per-person chart**: Should the accrued interest chart show separate lines for each borrower, or just the combined total?

4. **Sale section visibility**: Should the "Upon Sale" section only appear if a sale date is set in the property scenario, or always show with placeholder values?
