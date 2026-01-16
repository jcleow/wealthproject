# CPF Property Tab UI Specification (v2)

## Overview

An integrated approach where:
1. **CPF Simulation → Property Tab**: Shows aggregate stats + property list with CPF summary
2. **Property Planner → CPF Tab**: Shows detailed per-person CPF breakdown for selected property

This reuses the existing Property Planner UI while adding CPF-specific views.

---

## Part 1: CPF Simulation Property Tab (Overview + List)

This is what users see when they click "Property" tab in CPF Simulation view.

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────────┐
│  CPF Simulation                                                                              [X]   │
├─────────────────────────────────────────────────────────────────────────────────────────────────────┤
│  [👤 John ▼]   Age: [34] y/o  ═══════○═══════════════════   🇸🇬 Citizen                            │
├─────────────────────────────────────────────────────────────────────────────────────────────────────┤
│  [ Overview ]  [ Projection ]  [ Property ]  [ Strategies ]                          [ Learn ]     │
│                                     ▲                                                               │
│                                  ACTIVE                                                             │
├─────────────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                                     │
│  ┌─ AGGREGATE STATS ───────────────────────────────────────────────────────────────────────────┐   │
│  │                                                                                             │   │
│  │   ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐   │   │
│  │   │  🏠 Properties   │  │  💰 Total CPF    │  │  📈 Accrued      │  │  🎁 Total        │   │   │
│  │   │                  │  │     Used         │  │     Interest     │  │     Grants       │   │   │
│  │   │       2          │  │                  │  │                  │  │                  │   │   │
│  │   │   Active         │  │    $770,000      │  │    $89,230       │  │    $110,000      │   │   │
│  │   │                  │  │                  │  │                  │  │                  │   │   │
│  │   │  ▪ John: $430k   │  │  ▪ John: $430k   │  │  ▪ John: $52k    │  │  (not refunded   │   │   │
│  │   │  ▪ Jane: $340k   │  │  ▪ Jane: $340k   │  │  ▪ Jane: $37k    │  │   at sale)       │   │   │
│  │   └──────────────────┘  └──────────────────┘  └──────────────────┘  └──────────────────┘   │   │
│  │                                                                                             │   │
│  │   ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐                         │   │
│  │   │  💸 Must Refund  │  │  🏦 OA Balance   │  │  ⚠️ OA After     │                         │   │
│  │   │     at Sale      │  │     Available    │  │     Housing      │                         │   │
│  │   │                  │  │                  │  │                  │                         │   │
│  │   │    $859,230      │  │    $125,000      │  │    ($645,000)    │  ◄── Warning if neg    │   │
│  │   │                  │  │                  │  │                  │                         │   │
│  │   │  (principal +    │  │  Current OA      │  │  OA - CPF Used   │                         │   │
│  │   │   interest)      │  │  balance today   │  │  (projected)     │                         │   │
│  │   └──────────────────┘  └──────────────────┘  └──────────────────┘                         │   │
│  │                                                                                             │   │
│  └─────────────────────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                                     │
│  ┌─ PROPERTY LIST ─────────────────────────────────────────────────────────────────────────────┐   │
│  │                                                                                             │   │
│  │   Active Properties                                                          [+ Add Property]│   │
│  │   ──────────────────────────────────────────────────────────────────────────────────────   │   │
│  │                                                                                             │   │
│  │   ┌─────────────────────────────────────────────────────────────────────────────────────┐  │   │
│  │   │  🏠  Marine Parade HDB                                                              │  │   │
│  │   │      ┌─────┐                                                                        │  │   │
│  │   │      │ HDB │  Resale • Purchased Jan 2020                                           │  │   │
│  │   │      └─────┘                                                                        │  │   │
│  │   │                                                                                     │  │   │
│  │   │      CPF Used                    Accrued Interest              Grants               │  │   │
│  │   │      ─────────────────────────────────────────────────────────────────────────      │  │   │
│  │   │      $320,000                    $40,000                       $110,000             │  │   │
│  │   │      ▪ John: $180k               (2.5% p.a.)                   EHG + PHG            │  │   │
│  │   │      ▪ Jane: $140k                                                                  │  │   │
│  │   │                                                                                     │  │   │
│  │   │      Must refund at sale: $360,000                              [View Details →]   │  │   │
│  │   └─────────────────────────────────────────────────────────────────────────────────────┘  │   │
│  │                                                                                             │   │
│  │   ┌─────────────────────────────────────────────────────────────────────────────────────┐  │   │
│  │   │  🏢  Bishan Condo                                                                   │  │   │
│  │   │      ┌─────────┐                                                                    │  │   │
│  │   │      │ Private │  New Launch • Purchased Mar 2022                                   │  │   │
│  │   │      └─────────┘                                                                    │  │   │
│  │   │                                                                                     │  │   │
│  │   │      CPF Used                    Accrued Interest              Grants               │  │   │
│  │   │      ─────────────────────────────────────────────────────────────────────────      │  │   │
│  │   │      $450,000                    $49,230                       -                    │  │   │
│  │   │      ▪ John: $250k               (2.5% p.a.)                   (Private - no       │  │   │
│  │   │      ▪ Jane: $200k                                              HDB grants)        │  │   │
│  │   │                                                                                     │  │   │
│  │   │      Must refund at sale: $499,230                              [View Details →]   │  │   │
│  │   └─────────────────────────────────────────────────────────────────────────────────────┘  │   │
│  │                                                                                             │   │
│  │                                                                                             │   │
│  │   ▼ Draft Properties (1)                                                                   │   │
│  │   ┌─────────────────────────────────────────────────────────────────────────────────────┐  │   │
│  │   │  🏠  Future BTO  ·  Draft                                       [View Details →]   │  │   │
│  │   │      BTO • Expected 2027  •  $200,000 CPF planned                                   │  │   │
│  │   └─────────────────────────────────────────────────────────────────────────────────────┘  │   │
│  │                                                                                             │   │
│  └─────────────────────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                                     │
├─────────────────────────────────────────────────────────────────────────────────────────────────────┤
│  Using your CPF data. Verify with cpf.gov.sg                                                        │
└─────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

### Aggregate Stats Explained

| Stat | Description | Calculation |
|------|-------------|-------------|
| **Properties** | Count of active properties | `scenarios.filter(isIncluded).length` |
| **Total CPF Used** | Sum of all CPF OA used | `SUM(totalOAUsed)` per person |
| **Accrued Interest** | Total interest owed | `SUM(accruedInterest)` at 2.5% p.a. |
| **Total Grants** | Housing grants received | `SUM(grants)` - not refunded at sale |
| **Must Refund at Sale** | Principal + Interest | `totalCPFUsed + accruedInterest` |
| **OA Balance Available** | Current OA balance | From CPF account |
| **OA After Housing** | Net OA position | `currentOA - totalCPFUsed` (warning if negative) |

### Additional Stats to Consider

| Stat | Description | Why Useful |
|------|-------------|------------|
| **Monthly CPF to Housing** | Total monthly CPF OA going to mortgages | Shows cash flow impact |
| **Years of Payments Left** | Weighted avg remaining loan term | Planning horizon |
| **% of OA Used for Housing** | `totalCPFUsed / (currentOA + totalCPFUsed)` | Allocation awareness |
| **Refund as % of Sale Price** | How much sale proceeds go back to CPF | Sale planning |

---

## Part 2: Property Planner with CPF Tab

When user clicks "View Details →" on a property, open Property Planner modal with CPF tab.

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────────┐
│  Property Planner                                                                            [X]   │
├────────────────────────────────┬────────────────────────────────────────────────────────────────────┤
│                                │                                                                    │
│  SCENARIO LIST                 │  DETAIL VIEW                                                       │
│  (Left Panel - Existing)       │  (Right Panel - Existing + New CPF Tab)                            │
│                                │                                                                    │
│  ┌──────────────────────────┐  │  ┌────────────────────────────────────────────────────────────┐    │
│  │                          │  │  │                                                            │    │
│  │  🏠 Marine Parade HDB    │  │  │  🏠  Marine Parade HDB                     [Edit] [Delete] │    │
│  │     HDB • Resale         │◄─┼──│      HDB • Resale • $850,000                               │    │
│  │     $850,000             │  │  │                                                            │    │
│  │     ✓ Active             │  │  └────────────────────────────────────────────────────────────┘    │
│  │                          │  │                                                                    │
│  └──────────────────────────┘  │  ┌────────────────────────────────────────────────────────────┐    │
│                                │  │                                                            │    │
│  ┌──────────────────────────┐  │  │  [ Purchase ]  [ Sale ]  [ Appreciation ]  [ CPF ]        │    │
│  │                          │  │  │                                              ▲             │    │
│  │  🏢 Bishan Condo         │  │  │                                           ACTIVE          │    │
│  │     Private • New        │  │  │                                           (NEW TAB)       │    │
│  │     $1,200,000           │  │  │                                                            │    │
│  │     ✓ Active             │  │  └────────────────────────────────────────────────────────────┘    │
│  │                          │  │                                                                    │
│  └──────────────────────────┘  │                                                                    │
│                                │  ════════════════════════════════════════════════════════════════  │
│  ▼ Draft (1)                   │                        CPF TAB CONTENT                             │
│  ┌──────────────────────────┐  │  ════════════════════════════════════════════════════════════════  │
│  │  🏠 Future BTO           │  │                                                                    │
│  │     BTO • Draft          │  │  ┌─ CPF USAGE BY PERSON ──────────────────────────────────────┐   │
│  └──────────────────────────┘  │  │                                                            │   │
│                                │  │  ┌─────────────────────────┐  ┌─────────────────────────┐  │   │
│  ┌──────────────────────────┐  │  │  │                         │  │                         │  │   │
│  │                          │  │  │  │  👤 John                │  │  👤 Jane                │  │   │
│  │  + Add Property          │  │  │  │  ─────────────────────  │  │  ─────────────────────  │  │   │
│  │                          │  │  │  │                         │  │                         │  │   │
│  └──────────────────────────┘  │  │  │  Down Payment           │  │  Down Payment           │  │   │
│                                │  │  │    CPF OA:   $50,000    │  │    CPF OA:   $50,000    │  │   │
│                                │  │  │    Cash:     $30,000    │  │    Cash:     $20,000    │  │   │
│                                │  │  │                         │  │                         │  │   │
│                                │  │  │  Monthly (60 mo)        │  │  Monthly (60 mo)        │  │   │
│                                │  │  │    CPF OA:   $800/mo    │  │    CPF OA:   $600/mo    │  │   │
│                                │  │  │    Total:    $48,000    │  │    Total:    $36,000    │  │   │
│                                │  │  │                         │  │                         │  │   │
│                                │  │  │  ───────────────────    │  │  ───────────────────    │  │   │
│                                │  │  │  Total CPF Used         │  │  Total CPF Used         │  │   │
│                                │  │  │  $180,000               │  │  $140,000               │  │   │
│                                │  │  │                         │  │                         │  │   │
│                                │  │  │  + Accrued Interest     │  │  + Accrued Interest     │  │   │
│                                │  │  │    $22,500              │  │    $17,500              │  │   │
│                                │  │  │                         │  │                         │  │   │
│                                │  │  │  ═══════════════════    │  │  ═══════════════════    │  │   │
│                                │  │  │  Must Refund            │  │  Must Refund            │  │   │
│                                │  │  │  $202,500               │  │  $157,500               │  │   │
│                                │  │  │                         │  │                         │  │   │
│                                │  │  └─────────────────────────┘  └─────────────────────────┘  │   │
│                                │  │                                                            │   │
│                                │  │  Combined: $320,000 CPF used + $40,000 interest = $360,000│   │
│                                │  │                                                            │   │
│                                │  └────────────────────────────────────────────────────────────┘   │
│                                │                                                                    │
│                                │  ┌─ ACCRUED INTEREST OVER TIME ───────────────────────────────┐   │
│                                │  │                                                            │   │
│                                │  │  Total Accrued: $40,000                    Rate: 2.5% p.a. │   │
│                                │  │                                                            │   │
│                                │  │    $50K ┤                                      ╭─────      │   │
│                                │  │         │                                 ╭────╯           │   │
│                                │  │    $40K ┤                            ╭────╯                │   │
│                                │  │         │                       ╭────╯                     │   │
│                                │  │    $30K ┤                  ╭────╯                          │   │
│                                │  │         │             ╭────╯                               │   │
│                                │  │    $20K ┤        ╭────╯                                    │   │
│                                │  │         │   ╭────╯                                         │   │
│                                │  │    $10K ┤───╯                                              │   │
│                                │  │         │                                                  │   │
│                                │  │      $0 ┼───────────────────────────────────────────────   │   │
│                                │  │         2020  2021  2022  2023  2024  2025  2026          │   │
│                                │  │                                                            │   │
│                                │  │  ⚠ When you sell, you must refund principal + interest    │   │
│                                │  │                                                            │   │
│                                │  └────────────────────────────────────────────────────────────┘   │
│                                │                                                                    │
│                                │  ┌─ HOUSING GRANTS ───────────────────────────────────────────┐   │
│                                │  │                                                            │   │
│                                │  │  Grant                                      Amount         │   │
│                                │  │  ─────────────────────────────────────────────────────     │   │
│                                │  │  EHG (Enhanced CPF Housing Grant)           $80,000        │   │
│                                │  │  PHG (Proximity Housing Grant)              $30,000        │   │
│                                │  │  ─────────────────────────────────────────────────────     │   │
│                                │  │  Total                                      $110,000       │   │
│                                │  │                                                            │   │
│                                │  │  ℹ Grants reduce loan amount but are NOT refunded to CPF  │   │
│                                │  │                                                            │   │
│                                │  └────────────────────────────────────────────────────────────┘   │
│                                │                                                                    │
│                                │  ┌─ SALE IMPACT (if sale date set) ───────────────────────────┐   │
│                                │  │                                                            │   │
│                                │  │  Expected Sale: Dec 2030         Price: $1,100,000         │   │
│                                │  │                                                            │   │
│                                │  │  Sale Proceeds Breakdown                                   │   │
│                                │  │  ──────────────────────────────────────────────────────    │   │
│                                │  │  Expected Sale Price                        $1,100,000     │   │
│                                │  │  Less: Outstanding Loan                      ($420,000)    │   │
│                                │  │  Less: Selling Costs (~2%)                    ($22,000)    │   │
│                                │  │  Less: CPF Refund                            ($360,000)    │   │
│                                │  │        ├─ Principal: $320,000                              │   │
│                                │  │        └─ Interest:  $40,000                               │   │
│                                │  │  ──────────────────────────────────────────────────────    │   │
│                                │  │  Net Cash Proceeds                           $298,000      │   │
│                                │  │                                                            │   │
│                                │  │  CPF Refund Destinations:                                  │   │
│                                │  │  ┌────────────────────────────────────────────────────┐    │   │
│                                │  │  │  John's OA ◄──────── $202,500                      │    │   │
│                                │  │  │  Jane's OA ◄──────── $157,500                      │    │   │
│                                │  │  └────────────────────────────────────────────────────┘    │   │
│                                │  │                                                            │   │
│                                │  └────────────────────────────────────────────────────────────┘   │
│                                │                                                                    │
└────────────────────────────────┴────────────────────────────────────────────────────────────────────┘
```

---

## Component Reuse Strategy

### Existing Property Planner Components (Reuse)

| Component | Current Use | CPF Tab Use |
|-----------|-------------|-------------|
| `PropertyPlannerModal` | Container | Same - just add CPF tab |
| `ScenarioList` | Left panel | Same - no change |
| `PropertyScenarioCard` | Property cards | Same - no change |
| `TabbedResultsPanel` | Right panel tabs | Add "CPF" tab option |
| `CustomDropdown` | Form selects | Person selector if needed |

### New Components Needed

| Component | Location | Purpose |
|-----------|----------|---------|
| `CPFPropertyOverview` | CPF Simulation Property tab | Aggregate stats + property list |
| `CPFOverviewStats` | CPF Simulation Property tab | The 6-7 stat cards at top |
| `CPFPropertyCard` | CPF Simulation Property tab | Property card with CPF focus |
| `CPFTabContent` | Property Planner detail | Content for new CPF tab |
| `PersonCPFUsageCard` | CPF tab | Per-person breakdown card |
| `AccruedInterestChart` | CPF tab | Area chart (reuse existing) |
| `GrantsDisplay` | CPF tab | Grants list with info |
| `SaleImpactSection` | CPF tab | Sale proceeds breakdown |

---

## Interaction Flow

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                                                                 │
│   CPF Simulation                                                                │
│       │                                                                         │
│       └──► Property Tab                                                         │
│               │                                                                 │
│               ├──► View Aggregate Stats (top cards)                             │
│               │                                                                 │
│               ├──► See Property List with CPF Summary                           │
│               │       │                                                         │
│               │       └──► Click [View Details →]                               │
│               │               │                                                 │
│               │               ▼                                                 │
│               │       ┌───────────────────────────────────┐                     │
│               │       │  Property Planner Modal Opens     │                     │
│               │       │  with CPF Tab Pre-Selected        │                     │
│               │       │                                   │                     │
│               │       │  - Per-person breakdown           │                     │
│               │       │  - Interest chart                 │                     │
│               │       │  - Grants                         │                     │
│               │       │  - Sale impact                    │                     │
│               │       └───────────────────────────────────┘                     │
│               │                                                                 │
│               └──► Click [+ Add Property]                                       │
│                       │                                                         │
│                       ▼                                                         │
│               ┌───────────────────────────────────────┐                         │
│               │  Property Planner Modal Opens         │                         │
│               │  in Create Mode                       │                         │
│               └───────────────────────────────────────┘                         │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## Responsive Behavior

### CPF Property Overview (Stats + List)

**Desktop (≥1024px)**
```
┌─────────────────────────────────────────────────────────────────┐
│  [Stat 1] [Stat 2] [Stat 3] [Stat 4]                            │  ← 4 columns
│  [Stat 5] [Stat 6] [Stat 7]                                     │  ← 3 columns
├─────────────────────────────────────────────────────────────────┤
│  [Property Card - full width]                                   │
│  [Property Card - full width]                                   │
└─────────────────────────────────────────────────────────────────┘
```

**Tablet (768px - 1023px)**
```
┌─────────────────────────────────────────┐
│  [Stat 1] [Stat 2]                      │  ← 2 columns
│  [Stat 3] [Stat 4]                      │
│  [Stat 5] [Stat 6]                      │
├─────────────────────────────────────────┤
│  [Property Card]                        │
│  [Property Card]                        │
└─────────────────────────────────────────┘
```

**Mobile (<768px)**
```
┌─────────────────────┐
│  [Stat 1]           │  ← 1 column (scrollable)
│  [Stat 2]           │
│  [Stat 3]           │
│  ...                │
├─────────────────────┤
│  [Property Card]    │
│  [Property Card]    │
└─────────────────────┘
```

---

## Questions for Review

1. **Stat Cards**: Are the 7 suggested stats sufficient? Any to add/remove?

2. **Property Card Detail**: How much CPF info to show in the list card vs. requiring click-through to Property Planner?

3. **Single Borrower**: For single-borrower properties, show one card or still use two-column layout with "N/A" for second?

4. **Draft Properties**: Show CPF stats for draft properties or just basic info?
