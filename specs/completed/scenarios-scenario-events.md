# Scenario Events — Feature Specification

## Overview

Scenario events allow users to model "what-if" financial changes over time. Each scenario event contains one or more impacts that modify financial items (assets, liabilities, income, expenses).

## Data Model

### ScenarioEvent
```typescript
interface ScenarioEvent {
  id?: string
  name: string                    // e.g., "Job Loss", "Raise"
  description?: string
  occursOn: string               // ISO8601 date when scenario occurs
  displayIcon?: string           // Lucide icon name (e.g., "briefcase")
  displayColor?: string          // Hex color for icon
  tags: string[]
  scenarioId?: string            // Groups multiple events into a scenario
  isIncluded: boolean            // Whether to include in projections
  impacts: ScenarioImpact[]
}
```

### ScenarioImpact
```typescript
interface ScenarioImpact {
  targetType: 'asset' | 'liability' | 'income' | 'expense'
  targetId?: string              // ID of the specific financial item
  impactKind: 'delta' | 'override' | 'start' | 'stop'
  amount: number                 // In cents
  currency: string               // e.g., "SGD"
  cadence: 'one_time' | 'weekly' | 'bi_weekly' | 'monthly' | 'quarterly' | 'semi_annual' | 'annual'
  startMonth: string            // YYYY-MM when impact begins
  endMonth?: string             // YYYY-MM when impact ends (optional)
  notes?: string
}
```

### Impact Kind Semantics
- `delta`: Add/subtract from existing amount (e.g., "Income decreases by $5,000/month")
- `override`: Replace with new value (e.g., "Asset becomes $100,000")
- `start`: Create new financial item (e.g., "Side income starts at $2,000/month")
- `stop`: End an existing item (e.g., "Loan ends")

---

## Frontend Features

### 1. Scenario Impact Dropdown on Financial Line Items

**Component:** `frontend/src/components/dashboard/FinancialDataManagement.tsx`

Financial line items in the dashboard display scenario impacts as an expandable dropdown, showing which scenarios affect each item.

**Visual Design:**
```
Income                           $15,000
  Salary                  ● ▶   $10,000   ← amber dot + chevron indicates scenarios
  Freelance Work                 $5,000

(Expanded):
  Salary                  ● ▼   $10,000
    └ Original                  $13,000
    └ Job Loss 🎒               -$5,000   (exclude if disabled)
    └ Raise 📈                  +$2,000
```

**UI Elements:**
- **Amber colored dot** (2x2 rounded-full) - Visual indicator that scenarios affect this item
- **Chevron button** (▶) - Expands/collapses to show scenario impacts, rotates 90° when expanded
- **Scenario sub-items** - Indented list showing:
  - Scenario icon (Lucide icon or colored fallback badge)
  - Scenario name
  - Impact amount (rose for negative, emerald for positive)
- **Disabled scenarios** - Shown at 50% opacity with strikethrough on name

**Implementation:**
```typescript
// Helper to find scenario impacts for a financial item
function getImpactsForItem(
  itemId: string,
  itemType: ScenarioTargetType,
  scenarioEvents: ScenarioEvent[]
): Array<{ event: ScenarioEvent; impact: ScenarioImpact }>

// State for tracking expanded items
const [expandedScenarioItems, setExpandedScenarioItems] = useState<Set<string>>(new Set())
```

**Data Flow:**
1. `useScenarioEvents()` hook fetches all scenario events
2. `getImpactsForItem(itemId, itemType, scenarioEvents)` helper finds impacts targeting each item
3. Matching is done via `ScenarioImpact.targetType` + `ScenarioImpact.targetId`
4. `expandedScenarioItems` state (Set) tracks which items are expanded

**Click Behavior:**
- Clicking a scenario sub-item opens the ScenarioEventModal for editing

---

### 2. Scenario Event Modal

**Component:** `frontend/src/components/modals/ScenarioEventModal.tsx`

Modal for creating/editing scenario events using a "sentence builder" pattern.

**Sentence Builder Pattern:**
```
[Target Type] [Verb] [Amount] [Cadence] [from/to dates]
```

Example impact definitions:
- "Income increases by $5,000 monthly from 2025-02 to 2025-08"
- "Expense decreases by $500 one-time in 2025-03"
- "Asset becomes $100,000"

---

### 3. Scenario Markers on Net Worth Chart

**Component:** `frontend/src/components/dashboard/ScenarioMarker.tsx`

Scenarios are visualized as interactive circular markers on the net worth projection chart.

**Visual Design:**
- Stacked icons at each year where scenarios occur
- Icon from `displayIcon` field with `displayColor` background
- Disabled scenarios shown with reduced opacity (45%)
- Click opens scenario editor

---

## API Endpoints

- `GET /api/v1/scenario-events` - List all scenario events
- `POST /api/v1/scenario-events` - Create scenario event
- `PUT /api/v1/scenario-events/{id}` - Update scenario event
- `DELETE /api/v1/scenario-events/{id}` - Delete scenario event
- `GET /api/v1/timeline?include_scenarios=true` - Get timeline with scenarios applied

---

## Related Files

- `frontend/src/types/scenario.ts` - Type definitions
- `frontend/src/hooks/useScenarioEvents.ts` - Data fetching hook
- `frontend/src/services/financialApi.ts` - API client methods
- `frontend/src/components/dashboard/FinancialDataManagement.tsx` - Impact dropdown UI
- `frontend/src/components/modals/ScenarioEventModal.tsx` - Create/edit modal
- `frontend/src/components/dashboard/ScenarioMarker.tsx` - Chart markers
- `frontend/src/components/dashboard/NetWorthProjection.tsx` - Chart with markers
