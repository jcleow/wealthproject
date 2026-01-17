# Frontend React Best Practices Audit

**Date:** 2025-01-15
**Based on:** Vercel React Best Practices Guidelines
**Scope:** `/Users/jitcorn/assetra3/frontend/src`

---

## Executive Summary

| Category | Grade | Priority |
|----------|-------|----------|
| **Async Waterfalls** | ⚠️ Needs Work | CRITICAL |
| **Bundle Size** | ⚠️ Needs Work | HIGH |
| **Re-render Optimization** | ⚠️ Needs Work | MEDIUM |
| **Data Fetching** | ✅ Excellent | - |

---

## 1. Async Waterfalls (CRITICAL)

### Overview
Sequential `await` statements that could be parallelized with `Promise.all()` are causing significant performance bottlenecks in data loading operations.

### Issues Found

#### 1.1 Sequential Person/Account Creation Waterfalls
**File:** `src/hooks/queries/useLoadSampleDataMutation.ts`
**Severity:** CRITICAL

| Issue | Lines | Impact |
|-------|-------|--------|
| Person creation loop | 52-65 | 10+ seconds delay |
| CPF account loop | 70-87 | Multi-second delay |
| Cash account loop | 91-106 | Multi-second delay |
| Income allocation loop | 128-157 | Variable delay |
| Scenario event loop | 164-219 | Multi-second delay |
| Fund flow rules loop | 312-318 | Up to 4+ seconds |

**Current Pattern (SLOW):**
```typescript
// Lines 52-65: Create persons SEQUENTIALLY
for (const personConfig of profileData.persons) {
  try {
    const person = await personsApi.createPerson({...})  // Waterfall!
    createdPersons.push(person)
  } catch (error) { ... }
}
```

**Recommended Pattern (FAST):**
```typescript
// Create all persons in parallel
const createdPersons = await Promise.all(
  profileData.persons.map(personConfig =>
    personsApi.createPerson({...}).catch(error => {
      console.error('[loadProfile] Failed to create person:', error)
      return null
    })
  )
).then(results => results.filter(Boolean))
```

#### 1.2 Good Patterns Already Present
Lines 109-125 correctly use `Promise.all()` for assets/investments/liabilities:
```typescript
const [assets, investments, liabilities, incomes] = await Promise.all([
  Promise.all((profileData.assets ?? []).map(asset => financialApi.createAsset(asset))),
  Promise.all((profileData.investments ?? []).map(inv => financialApi.createInvestment(inv))),
  Promise.all((profileData.liabilities ?? []).map(lib => financialApi.createLiability(lib))),
  Promise.all((profileData.incomes ?? []).map(incomeConfig => {...})),
])
```

#### 1.3 Missing Suspense Boundaries
**Finding:** The codebase does not use React `<Suspense>` boundaries for streaming/progressive rendering.

**Recommendation:** Consider adding Suspense boundaries for:
- Timeline data fetching in `Dashboard.tsx`
- User settings fetching
- Scenario events

---

## 2. Bundle Size Optimization (HIGH)

### 2.1 Barrel File Imports

#### CPF Component Barrel
**File:** `src/components/cpf/index.ts`

Exports 20 large CPF components (294-936 lines each). Used in:
- `src/components/cpf/CPFSimulationView.tsx` (lines 16-27)

**Current (INEFFICIENT):**
```typescript
import {
  CPFBalanceOverview,
  CPFContributionFlow,
  CPFISInvestmentDashboard,
  // ... 7 more
} from '@/components/cpf'  // <- Barrel import bundles ALL 20 components
```

**Recommended:**
```typescript
import { CPFBalanceOverview } from '@/components/cpf/CPFBalanceOverview'
import { CPFContributionFlow } from '@/components/cpf/CPFContributionFlow'
// Direct imports allow tree-shaking
```

#### API Barrel File (Most Impactful)
**File:** `src/api/financial/index.ts`

The `financialApi` mega-object spreads 14 modules (~100+ functions):
```typescript
export const financialApi = {
  ...assets,
  ...investments,
  ...liabilities,
  // ... 11 more modules spread
}
```

**Files Affected:** 20+ files importing from this barrel

**Recommended:** Replace with named exports of specific functions:
```typescript
// Instead of:
import { financialApi } from '@/api/financial'

// Use:
import { getCPFAssumptions, updateCPFAssumptions } from '@/api/financial/cpf'
```

### 2.2 Missing Dynamic Imports

#### Feature Modules in Dashboard
**File:** `src/components/dashboard/Dashboard.tsx` (lines 34-46)

Feature modules load synchronously but are conditionally shown:
```typescript
// Current - always bundled regardless of usage
import { CPFSimulationView } from '../cpf/CPFSimulationView'
import { TaxPlannerV2View } from '@/app/tax-planner/page'
import { InsurancePlannerView } from '@/app/insurance-planner/page'
```

**Recommended:**
```typescript
import dynamic from 'next/dynamic'

const CPFSimulationView = dynamic(
  () => import('../cpf/CPFSimulationView').then(mod => mod.CPFSimulationView),
  { ssr: false, loading: () => <LoadingSpinner /> }
)
```

#### Chart Components (8+ files need lazy loading)

**Already Correct:** `src/components/dashboard/NetWorthProjection.tsx` uses dynamic import:
```typescript
const ProjectionChartJS = dynamic(
  () => import('./projections/ProjectionChartJS').then((mod) => mod.ProjectionChartJS),
  { ssr: false, loading: () => <ChartLoadingSkeleton /> }
)
```

**Need Dynamic Imports:**
| File | Lines |
|------|-------|
| `src/components/cpf/CPFLifeTimelineChart.tsx` | 446 |
| `src/components/cpf/CPFLifeComparison.tsx` | 470 |
| `src/components/cpf/CPFContributionWaterfall.tsx` | 446 |
| `src/components/cpf/CPFProjectionChart.tsx` | 355 |
| `src/app/tax-planner/page.tsx` | Recharts |
| `src/app/property-planner/components/AppreciationChart.tsx` | Recharts |
| `src/app/property-planner/components/AmortizationChart.tsx` | Recharts |

### 2.3 Bundle Size Summary

| Issue | Severity | Location | Recommendation |
|-------|----------|----------|----------------|
| CPF barrel exports | Medium | `/components/cpf/index.ts` | Use direct imports |
| API mega barrel | High | `/api/financial/index.ts` | Replace `export *` with named exports |
| Missing lazy load for charts | High | 10+ chart components | Use `dynamic()` imports |
| Conditional feature modules | Medium | `Dashboard.tsx` | Use `dynamic()` imports |
| Framer Motion | Medium | 25 imports | Acceptable (route-split) |

---

## 3. Re-render Optimization (MEDIUM)

### 3.1 Zustand Store Subscriptions

**Files Affected:**
- `src/components/dashboard/FinancialWorkspace.tsx` (lines 34-42)
- `src/components/dashboard/NetWorthProjection.tsx` (lines 76-84)
- `src/components/dashboard/FinancialDataManagement/index.tsx` (lines 83-89)

**Current Pattern (causes excess re-renders):**
```typescript
// Each subscription triggers re-render on ANY store change
const setSelectedYear = useTimelineStore((s) => s.setSelectedYear)
const setSelectedMonth = useTimelineStore((s) => s.setSelectedMonth)
const resolution = useTimelineStore((s) => s.resolution)
const zoomLevel = useTimelineStore((s) => s.zoomLevel)
// ... 6 more subscriptions
```

**Recommended Pattern:**
```typescript
import { useShallow } from 'zustand/react/shallow'

const { setSelectedYear, setSelectedMonth, resolution, zoomLevel } = useTimelineStore(
  useShallow((s) => ({
    setSelectedYear: s.setSelectedYear,
    setSelectedMonth: s.setSelectedMonth,
    resolution: s.resolution,
    zoomLevel: s.zoomLevel,
  }))
)
```

### 3.2 Inline Object Creation in useState

**File:** `src/components/dashboard/FinancialDataManagement/index.tsx` (lines 251-296)

7 instances of inline object initialization:
```typescript
const [modalState, setModalState] = useState<ModalState>({ isOpen: false, ... })
const [sortDirections, setSortDirections] = useState<Record<...>>({ asset: 'desc', ... })
```

**Recommendation:** Use initializer functions for complex state:
```typescript
const [modalState, setModalState] = useState<ModalState>(() => ({ isOpen: false, ... }))
```

### 3.3 Missing useCallback on Event Handlers

**Files Affected:**
- `src/components/dashboard/FinancialDataManagement/components/LineItem.tsx` (lines 179, 211, 226, 270)
- `src/components/dashboard/FinancialWorkspace.tsx` (lines 281-386)
- `src/components/dashboard/projections/ChartControls.tsx` (line 65)

**Issue:** Inline arrow functions create new instances every render:
```typescript
onClick={() => onToggleExpand(itemId)}  // New function each render
```

**Recommendation:**
```typescript
const handleToggleExpand = useCallback(() => {
  onToggleExpand(itemId)
}, [onToggleExpand, itemId])
```

### 3.4 Inline Style Objects

**File:** `src/components/dashboard/FinancialDataManagement/components/LineItem.tsx`

12+ instances of inline style objects:
```typescript
// Lines 351, 356, 393, 398, 470, 478
<Icon style={{ color: item.iconColor ?? '#10b981' }} />  // New object every render
```

**Recommendation:** Use CSS/Tailwind instead of `useMemo`. The `useMemo` hook has memory and comparison overhead that often exceeds the cost of creating simple style objects.

**Preferred approaches:**
```typescript
// Option 1: CSS variable (best for dynamic colors)
<Icon
  className="text-[var(--icon-color)]"
  style={{ '--icon-color': item.iconColor ?? '#10b981' } as React.CSSProperties}
/>

// Option 2: Tailwind arbitrary value (if color is directly usable)
<Icon className={`text-[${item.iconColor ?? '#10b981'}]`} />

// Option 3: Conditional Tailwind classes (if colors are from a known set)
<Icon className={cn(
  item.iconColor === '#10b981' && 'text-emerald-500',
  item.iconColor === '#3b82f6' && 'text-blue-500',
  // fallback
  !item.iconColor && 'text-emerald-500'
)} />
```

**Note:** Only use `useMemo` for complex computed style objects where profiling shows measurable benefit.

### 3.5 Missing React.memo on Expensive Components

**Components that should be memoized:**
- `LineItem` in `FinancialDataManagement/components/LineItem.tsx`
- `CategoryCard` in `FinancialDataManagement`
- `CustomNode` in `CPFContributionFlow.tsx` (lines 69-105)
- Chart marker components in `projections/`

### 3.6 Static Arrays/Objects Inside Components

**Issue:** Arrays and objects defined inside component bodies are recreated on every render, causing new references that break memoization in child components.

**Pattern to avoid:**
```typescript
function MyComponent() {
  // ❌ New array created every render
  const columns = [
    { key: 'name', label: 'Name' },
    { key: 'value', label: 'Value' },
  ]

  // ❌ New object created every render
  const defaultFilters = { status: 'active', sort: 'date' }

  return <Table columns={columns} filters={defaultFilters} />
}
```

**Recommended pattern:**
```typescript
// ✅ Defined once, stable reference
const COLUMNS = [
  { key: 'name', label: 'Name' },
  { key: 'value', label: 'Value' },
] as const

const DEFAULT_FILTERS = { status: 'active', sort: 'date' } as const

function MyComponent() {
  return <Table columns={COLUMNS} filters={DEFAULT_FILTERS} />
}
```

**What to look for:**
- `const someArray = [...]` inside component functions
- `const someObject = {...}` inside component functions
- Props passed as inline literals: `<Child options={[...]} />`

**Exceptions (use `useMemo` instead):**
- Values that depend on props or state
- Values derived from other reactive data

**Files to audit:**
- Components passing array/object props to memoized children
- Form components with static option lists
- Table/list components with column definitions

### 3.7 Re-render Issues Summary

| Issue Type | Count | Severity |
|-----------|-------|----------|
| Missing selector hooks for Zustand | 3 files | HIGH |
| Static arrays/objects inside components | TBD | HIGH |
| Inline objects in useState | 7 instances | MEDIUM-HIGH |
| Missing useCallback on handlers | 20+ instances | MEDIUM |
| Expensive components without React.memo | 5+ components | MEDIUM |
| Inline style objects (use CSS/Tailwind) | 12+ instances | LOW |

---

## 4. Client-Side Data Fetching (EXCELLENT)

### 4.1 Query Configuration ✅

**File:** `src/components/providers/QueryProvider.tsx`

```typescript
const [queryClient] = useState(
  () => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 5, // 5 minutes
        refetchOnWindowFocus: false,
        retry: 1,
      },
    },
  })
)
```

### 4.2 Query Cache Keys ✅

**File:** `src/lib/queryKeys.ts`

Hierarchical namespace pattern implemented correctly:
```typescript
export const QUERY_KEYS = {
  financial: {
    all: ['financial'] as const,
    assets: ['financial', 'assets'] as const,
    // ... properly organized
  },
}
```

### 4.3 staleTime Configuration ✅

| Query Hook | staleTime | Appropriate |
|-----------|-----------|-------------|
| useAssetsQuery | 30 sec | ✅ |
| useLiabilitiesQuery | 30 sec | ✅ |
| useTimelineQuery | 30 sec | ✅ |
| usePropertyPlannerV2Query | 5 min | ✅ |
| useCpfQuery | 5 min | ✅ |

### 4.4 Cache Invalidation Strategy ✅

Sophisticated implementation with optimistic updates:
```typescript
export function useCreateAssetMutation() {
  return useMutation({
    mutationFn: (asset) => assetsApi.createAsset(asset),
    onSuccess: (newAsset) => {
      queryClient.setQueryData<Asset[]>(ASSETS_QUERY_KEY, (old) =>
        old ? [...old, newAsset] : [newAsset]
      )
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.financial.timeline })
    },
  })
}
```

### 4.5 Event Listener Cleanup ✅

All 41 `addEventListener` calls have proper cleanup returns.

### 4.6 Minor Recommendations

1. **Prefetching:** Not implemented but low impact given staleTime config
2. **v5 Migration:** `cacheTime` will need to be renamed to `gcTime` when upgrading to React Query v5

---

## 5. Priority Action Items

| Priority | Task | Files | Estimated Impact | Effort |
|----------|------|-------|------------------|--------|
| 1️⃣ | Dynamic import feature modules | `Dashboard.tsx` | ~200KB bundle reduction | 30 min |
| 2️⃣ | Refactor API barrel exports | `api/financial/index.ts` | Better tree-shaking | 2-3 hours |
| 3️⃣ | Add React.memo to LineItem | `LineItem.tsx` | Smoother list scrolling | 30 min |
| 4️⃣ | Move static arrays/objects outside components | Multiple files | Fewer re-renders | 1 hour |
| 5️⃣ | Use Zustand shallow selectors | Multiple files | Fewer re-renders | 1 hour |
| 6️⃣ | Lazy-load chart components | 10+ files | ~150KB per chart | 2 hours |
| 7️⃣ | Convert inline styles to Tailwind/CSS | `LineItem.tsx`, others | Cleaner code, no runtime cost | 30 min |

**Note:** Parallelizing API calls in `useLoadSampleDataMutation.ts` was considered but rejected due to potential database deadlock risks with concurrent writes.

---

## 6. Files Reference

### Critical Priority

### High Priority
- `src/api/financial/index.ts` - Barrel refactor
- `src/components/dashboard/Dashboard.tsx` - Dynamic imports
- `src/components/cpf/index.ts` - Direct imports

### Medium Priority
- `src/components/dashboard/FinancialDataManagement/components/LineItem.tsx` - Memo + callbacks
- `src/components/dashboard/FinancialWorkspace.tsx` - Zustand selectors
- `src/components/dashboard/NetWorthProjection.tsx` - Zustand selectors
- `src/components/cpf/CPFLifeTimelineChart.tsx` - Dynamic import
- `src/components/cpf/CPFProjectionChart.tsx` - Dynamic import

### Good Examples to Follow
- `src/components/dashboard/NetWorthProjection.tsx` (lines 20-26) - Dynamic import pattern
- `src/hooks/queries/useLoadSampleDataMutation.ts` (lines 109-125) - Promise.all pattern
- `src/lib/queryKeys.ts` - Query key organization
- `src/hooks/queries/usePropertyPlannerV2Query.ts` - Query key factory pattern

---

## Appendix: Vercel Best Practices Rules Applied

| Rule | Status | Notes |
|------|--------|-------|
| `async-parallel` | ⚠️ Partial | Good in some places, missing in loops |
| `async-suspense-boundaries` | ❌ Missing | No Suspense for streaming |
| `bundle-barrel-imports` | ⚠️ Issues | CPF and API barrels need refactor |
| `bundle-dynamic-imports` | ⚠️ Partial | One good example, needs expansion |
| `client-swr-dedup` | ✅ Excellent | React Query properly configured |
| `rerender-memo` | ⚠️ Missing | Expensive components not memoized |
| `rerender-derived-state` | ⚠️ Issues | Zustand subscriptions too broad |
| `server-cache-react` | N/A | Not using RSC heavily |
