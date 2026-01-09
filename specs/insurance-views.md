# Insurance Coverage Views Specification

## Overview

The insurance overview should support **3 different views** (2 implemented now, 1 deferred):

1. **By Life Events** - "What risks am I covered for?"
2. **By Product** - "What do my policies cover?"
3. **By Components** - *(deferred)* "What specific items are covered?"

Each view has:
- **Left panel**: Category squares (clickable)
- **Right panel**: GitHub-style coverage matrix (unique per view)
- **Toggle**: Switch between views at top

---

## View 1: By Life Events

**Purpose**: Answer "Am I covered if X happens?"

```
┌──────────────────────────────────────────────────────────────────────────────────────────────┐
│  [Life Events ▼]  [By Product]                                                               │
├──────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                              │
│  CATEGORIES                    │  COVERAGE BY PRODUCTS                                       │
│                                │                                                             │
│  ┌──────────┐ ┌──────────┐     │                  Term Life  Whole Life  DPS                 │
│  │   Life   │ │ Critical │     │  Life Protection    🟢         🟢       🟢                  │
│  │Protection│ │ Illness  │     │                                                             │
│  └──────────┘ └──────────┘     │                  Early CI   Late CI   Multi-pay             │
│  ┌──────────┐ ┌──────────┐     │  Critical Illness   🟢        ⬜         ⬜                 │
│  │Hospitali-│ │Long-Term │     │                                                             │
│  │  zation  │ │   Care   │     │                  MediShield Life   Integrated Shield Plan   │
│  └──────────┘ └──────────┘     │  Hospitalisation       🟢                  🟢              │
│                                │                                                             │
│                                │                  CareShield Life   Private Supplement       │
│                                │  Long-Term Care       🟢                ⬜                  │
│                                │                                                             │
│                                │  🟢 Covered  🟠 Partial  ⬜ Exposed                         │
└──────────────────────────────────────────────────────────────────────────────────────────────┘
```

### Left Panel: Risk Categories (4 squares)

| ID | Label | Icon | What it means |
|----|-------|------|---------------|
| `life` | Life Protection | Shield | Death, Total Permanent Disability, Terminal Illness |
| `critical_illness` | Critical Illness | HeartHandshake | Early Critical Illness, Late-stage Critical Illness, Multi-pay |
| `hospitalisation` | Hospitalisation | Stethoscope | MediShield Life, Integrated Shield Plan |
| `long_term_care` | Long-Term Care | Heart | CareShield Life, ElderShield, Private Supplements |

### Right Panel: Products Matrix

**Rows** = Risk categories (same as left panel)
**Columns** = Product types within each category

| Category | Columns (Product Types) |
|----------|-------------------------|
| Life Protection | Term Life, Whole Life, Dependants' Protection Scheme |
| Critical Illness | Early Critical Illness, Late-stage Critical Illness, Multi-pay Critical Illness |
| Hospitalisation | MediShield Life, Integrated Shield Plan |
| Long-Term Care | CareShield Life, Private Supplement |

---

## View 2: By Product

**Purpose**: Answer "What does each of my policies cover?"

```
┌───────────────────────────────────────────────────────────────────────────────────────┐
│  [Life Events]  [By Product ▼]                                                        │
├───────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                       │
│  PRODUCT TYPES              │  YOUR POLICIES                                          │
│                             │                                                         │
│  ┌──────────┐ ┌──────────┐  │                    Death  TPD   Terminal                │
│  │   Life   │ │  Health  │  │  AIA Term Life      🟢     🟢     🟢                    │
│  │ Products │ │ Products │  │  NTUC Whole Life    🟢     🟢     ⬜                    │
│  └──────────┘ └──────────┘  │  DPS                🟢     🟢     ⬜                    │
│  ┌──────────┐               │                                                         │
│  │ Personal │               │                    Inpatient  Outpatient  Surgical      │
│  │ Accident │               │  MediShield Life     🟢         🟠          🟢         │
│  └──────────┘               │  PRUShield Plus      🟢         🟢          🟢         │
│                             │  CareShield Life     🟢         ⬜          ⬜         │
│                             │                                                         │
│                             │                    Accident  Injury                     │
│                             │  (none)              ⬜        ⬜                       │
│                             │                                                         │
│                             │  🟢 Covered  🟠 Partial  ⬜ Exposed                     │
└───────────────────────────────────────────────────────────────────────────────────────┘
```

### Left Panel: Product Type Categories (3 squares)

| ID | Label | Icon | Products included |
|----|-------|------|-------------------|
| `life_products` | Life Products | Shield | Term Life, Whole Life, Investment-Linked Plans with death benefit |
| `health_products` | Health Products | Stethoscope | MediShield Life, Integrated Shield Plans, CareShield Life, Critical Illness plans |
| `pa_products` | Personal Accident | Accessibility | Personal Accident plans |

### Right Panel: Your Policies Matrix

**Rows** = Actual policies the user owns (grouped by product type)
**Columns** = What each policy covers

| Product Type | Columns (Coverage Items) |
|--------------|--------------------------|
| Life Products | Death, Total Permanent Disability, Terminal Illness |
| Health Products | Inpatient, Outpatient, Surgical |
| Personal Accident Products | Accident, Injury |

---

## Data Structure

### View Toggle State
```typescript
type InsuranceViewMode = 'life_events' | 'by_product'
```

### Life Events View Data
```typescript
interface LifeEventsViewData {
  categories: RiskCategory[]  // 4 categories
  matrix: {
    rows: RiskCategory[]
    columns: Record<RiskCategoryId, ProductType[]>
    cells: Record<RiskCategoryId, Record<ProductTypeId, CoverageStatus>>
  }
}
```

### By Product View Data
```typescript
interface ByProductViewData {
  productTypes: ProductTypeCategory[]  // 3 categories
  matrix: {
    rows: UserPolicy[]  // Actual policies user owns
    columns: Record<ProductTypeCategoryId, CoverageItem[]>
    cells: Record<PolicyId, Record<CoverageItemId, CoverageStatus>>
  }
}
```

---

## UI Components

### New Components
- `ViewToggle.tsx` - Segmented control to switch views
- `LifeEventsMatrix.tsx` - Matrix for life events view
- `ByProductMatrix.tsx` - Matrix for by product view

### Modified Components
- `OverviewTab.tsx` - Add view toggle, conditional rendering

---

## Color Legend

| Status | Color | Tailwind |
|--------|-------|----------|
| Covered | Emerald | `bg-emerald-500` |
| Partial | Amber | `bg-amber-500` |
| Exposed | Slate | `bg-slate-600` |

---

## Future: By Components View (Deferred)

```
Hospitalization:
  ├── Inpatient
  │   ├── Ward charges
  │   ├── ICU
  │   └── Surgery
  ├── Outpatient
  │   ├── Specialist
  │   └── Day surgery
  └── Post-treatment
      ├── Rehab
      └── Follow-up
```

This view breaks down coverage into granular components - deferred for now due to complexity.
