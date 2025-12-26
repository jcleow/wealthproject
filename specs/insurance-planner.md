# Insurance Planner Feature Specification

## Overview

The Insurance Planner helps users analyze their insurance coverage gaps, manage existing policies, and receive personalized recommendations. The north star is to **cover cash shortfall and maintain quality of life during health events**.

## User Requirements Summary

| Requirement | Decision |
|-------------|----------|
| Insurance Types | Full Singapore Suite + Custom Categories |
| Primary Goal | Gap Analysis First + Policy Management |
| Calculation Mode | Progressive (Simple → Detailed) |
| Integration | Fully integrated with existing financial data |

---

## 1. Insurance Categories

### Singapore Government Schemes (Auto-tracked)
| Scheme | Coverage Type | Default Status |
|--------|---------------|----------------|
| MediShield Life | Hospitalization | Mandatory for all SC/PR |
| CareShield Life | Long-term Care (Disability) | Auto-enrolled if born 1980+ |
| ElderShield | Long-term Care (Legacy) | For those enrolled before 2020 |
| Dependant's Protection Scheme (DPS) | Death & TPD ($70k) | Auto-enrolled via CPF |

### Private Insurance Types
| Category | Examples | Icon |
|----------|----------|------|
| `life` | Term Life, Whole Life | Shield |
| `critical_illness` | Early CI, Multi-pay CI | Heart |
| `hospitalization` | Integrated Shield Plans (ISP) | Building |
| `disability` | Income Protection, TPD riders | Accessibility |
| `accident` | Personal Accident Plans | AlertTriangle |
| `custom` | User-defined (Home, Travel, etc.) | Plus |

---

## 2. Coverage Needs Calculation

### Simple Mode (LIA Guidelines)
Quick calculation based on industry benchmarks:

```
Life Insurance Need = Annual Income × 9-10
Critical Illness Need = Annual Income × 3.4-4
```

### Detailed Mode (Needs-based)
Comprehensive calculation factoring in:

**Life Insurance:**
```
Need = Income Replacement + Outstanding Debts + Children's Education + Final Expenses
     - Existing Liquid Assets - CPF Savings - Partner Income Capacity
```

**Critical Illness:**
```
Need = Income Replacement (3-5 years) + Medical Costs + Recovery Period Expenses
     - Emergency Fund - Medical Savings
```

### Data Integration Points
| Source | Data Used | Purpose |
|--------|-----------|---------|
| Incomes | Annual salary, other income | Calculate income replacement needs |
| Liabilities | Mortgage, loans | Add to death benefit needs |
| Assets | Liquid assets, investments | Deduct from coverage needs |
| Expenses | Monthly expenses | Calculate survival fund needs |

---

## 3. Page Structure

### Route: `/insurance-planner`

### Tab Navigation
1. **Overview** - Protection score gauge + coverage breakdown
2. **Policies** - List of all policies with CRUD
3. **Gap Analysis** - Detailed needs vs coverage comparison
4. **Recommendations** - Prioritized action items

### Overview Tab Layout
```
┌─────────────────────────────────────────────────────────────┐
│  ← Back to Dashboard          Insurance Planner             │
├─────────────────────────────────────────────────────────────┤
│  [Overview]  [Policies]  [Gap Analysis]  [Recommendations]  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────┐  ┌──────────────────────────────┐ │
│  │                     │  │ Coverage Breakdown            │ │
│  │     [  67%  ]       │  │                              │ │
│  │    Protected        │  │ Life ████████░░░░ 78%       │ │
│  │                     │  │ CI   ████░░░░░░░░ 42%       │ │
│  │  Gap: $340,000      │  │ Health ██████████░ 95%      │ │
│  └─────────────────────┘  │ LTC  ████████░░░░ 80%       │ │
│                           └──────────────────────────────┘ │
│                                                             │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ Government Schemes                                      ││
│  │ ✓ MediShield Life   ✓ CareShield Life   ✓ DPS ($70k)  ││
│  └─────────────────────────────────────────────────────────┘│
│                                                             │
│  ┌────────────────┐ ┌────────────────┐ ┌────────────────┐  │
│  │ 🔴 Critical    │ │ 🟡 High        │ │ 🟢 Adequate    │  │
│  │ CI Gap: $250k  │ │ Life: $100k    │ │ Health: OK     │  │
│  │ [View Details] │ │ [View Details] │ │ [View Details] │  │
│  └────────────────┘ └────────────────┘ └────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. Data Types

### InsurancePolicy
```typescript
interface InsurancePolicy {
  id: string
  name: string
  category: 'life' | 'critical_illness' | 'hospitalization' | 'disability' | 'accident' | 'custom'
  subcategory?: string // e.g., 'term', 'whole_life', 'isp'

  // Government scheme (if applicable)
  governmentScheme?: 'medishield_life' | 'careshield_life' | 'eldershield' | 'dps'

  // Coverage
  coverageAmount: number
  deathBenefit?: number
  criticalIllnessBenefit?: number
  tpdBenefit?: number

  // Premium
  premiumAmount: number
  premiumFrequency: 'monthly' | 'quarterly' | 'annually'

  // Dates
  startDate: string
  endDate?: string // null for whole life
  renewalDate?: string

  // Provider
  insurerName?: string
  policyNumber?: string

  // Linking
  linkedExpenseId?: string // Auto-track premium as expense

  notes?: string
  createdAt: string
  updatedAt: string
}
```

### CoverageNeeds
```typescript
interface CoverageNeeds {
  life: {
    total: number
    components: {
      incomeReplacement: number  // 9-10x income
      outstandingDebts: number   // Mortgage + loans
      childrenEducation: number  // Per child
      finalExpenses: number      // Funeral, estate
    }
  }
  criticalIllness: {
    total: number
    components: {
      incomeReplacement: number  // 3.4x income
      medicalCosts: number
      recoveryPeriod: number     // Months
    }
  }
  hospitalization: {
    wardClass: 'A' | 'B1' | 'B2' | 'C'
    ispRecommended: boolean
  }
  disability: {
    monthlyBenefit: number
    coveragePeriod: number      // Years
  }
}
```

### CoverageGap
```typescript
interface CoverageGap {
  category: string
  needed: number
  current: number
  gap: number                    // needed - current
  coveragePercentage: number     // (current / needed) × 100
  priority: 'critical' | 'high' | 'medium' | 'low'
  recommendation: string
}
```

### ProtectionScore
```typescript
interface ProtectionScore {
  overall: number               // 0-100
  byCategory: {
    life: number
    criticalIllness: number
    hospitalization: number
    disability: number
  }
}
```

---

## 5. Key Visualizations

### 1. Protection Score Gauge
- Radial gauge showing overall protection %
- Color-coded: Red (0-25%), Orange (25-50%), Yellow (50-75%), Green (75-100%)
- Center shows percentage with "Protected" label

### 2. Coverage Bar Chart
- Horizontal bars for each category
- Shows: Current coverage (green) + Gap (red, semi-transparent)
- Tooltips with exact amounts

### 3. Gap Waterfall Chart
- Shows how protection layers add up
- Start with total need → subtract each layer → show remaining gap
- Layers: Assets, CPF, Government Schemes, Private Policies, Gap

### 4. Timeline Projection
- X-axis: Age (current → retirement)
- Y-axis: Coverage needs
- Shows how needs decrease as:
  - Children become independent
  - Mortgage is paid off
  - Retirement approaches

---

## 6. User Flows

### First-Time User
1. Navigate to `/insurance-planner`
2. Onboarding wizard appears:
   - Step 1: Confirm profile (age, income from existing data)
   - Step 2: Check government scheme status
   - Step 3: Add existing policies (or skip)
   - Step 4: View initial protection score
3. Redirect to Overview tab

### Adding a Policy
1. Click "Add Policy" button
2. Modal opens with form:
   - Select category (Life, CI, Health, etc.)
   - Enter coverage amount
   - Enter premium details
   - Optional: Link as recurring expense
3. Save → Gap analysis recalculates

### Viewing Recommendations
1. Navigate to Recommendations tab
2. See prioritized list:
   - Priority 1: Critical gaps (red)
   - Priority 2: High gaps (orange)
   - Priority 3: Optimization opportunities
3. Each recommendation shows:
   - What to buy
   - Why (rationale)
   - Estimated monthly premium
   - Action button to add policy

---

## 7. Integration with Financial Data

### Read Integration
| Query | Data | Usage |
|-------|------|-------|
| `useIncomesQuery` | Total annual income | Income replacement calculation |
| `useLiabilitiesQuery` | Outstanding debts | Death benefit needs |
| `useAssetsQuery` | Liquid assets | Deduct from coverage needs |
| `useExpensesQuery` | Monthly expenses | Survival fund calculation |

### Write Integration
| Action | Effect |
|--------|--------|
| Create policy with `linkExpense: true` | Auto-create recurring expense |
| Update premium | Update linked expense amount |
| Delete policy | Offer to delete linked expense |

---

## 8. Component Structure

```
frontend/src/
├── app/
│   └── insurance-planner/
│       └── page.tsx
├── components/
│   └── insurance/
│       ├── InsurancePlannerHeader.tsx
│       ├── InsuranceTabs.tsx
│       ├── tabs/
│       │   ├── OverviewTab.tsx
│       │   ├── PoliciesTab.tsx
│       │   ├── GapAnalysisTab.tsx
│       │   └── RecommendationsTab.tsx
│       ├── cards/
│       │   ├── ProtectionScoreCard.tsx
│       │   ├── CoverageBreakdownCard.tsx
│       │   ├── PolicyCard.tsx
│       │   ├── GapCard.tsx
│       │   └── GovernmentSchemeCard.tsx
│       ├── charts/
│       │   ├── ProtectionGauge.tsx
│       │   ├── CoverageBarChart.tsx
│       │   ├── GapWaterfallChart.tsx
│       │   └── TimelineCoverageChart.tsx
│       └── forms/
│           ├── PolicyFormModal.tsx
│           └── NeedsCalculatorForm.tsx
├── types/
│   └── insurance.ts
└── hooks/
    └── queries/
        └── useInsuranceQuery.ts
```

---

## 9. Styling Guidelines

Follow existing glassmorphic dark theme:

```tsx
// Glass card
className="rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-xl"

// Status indicators
// Critical: bg-rose-500/15 border-rose-500/20 text-rose-400
// Warning: bg-amber-500/15 border-amber-500/20 text-amber-400
// Good: bg-emerald-500/15 border-emerald-500/20 text-emerald-400

// Progress bars
// Filled: bg-emerald-500
// Gap: bg-rose-500/50
// Background: bg-white/[0.05]
```

---

## 10. Implementation Phases

### Phase 1: UI Foundation
- Create page structure with tabs
- Build ProtectionScoreCard with mock gauge
- Build CoverageBreakdownCard with mock data
- Build PolicyCard and PolicyFormModal

### Phase 2: Gap Analysis
- Implement CoverageNeeds calculator (simple mode)
- Build GapCard components
- Create CoverageBarChart
- Integrate with existing financial queries

### Phase 3: Advanced Features
- Detailed needs calculator
- Timeline projection chart
- Government schemes integration
- Recommendations engine

### Phase 4: Polish
- Onboarding wizard
- Expense linking
- Performance optimization
- Mobile responsiveness

---

## 11. Open Questions for Future

1. **Backend API**: Should coverage needs calculation happen client-side or server-side?
2. **Government Data**: Can we auto-detect MediShield/CareShield status from CPF data?
3. **Notifications**: Should we alert users when policies are expiring?
4. **Quotes**: Should we integrate with insurance comparison APIs?
