# Plan: Coverage Protection Dashboard by Person

## Summary
Create a visual dashboard showing coverage targets vs actual coverage per person, with gap analysis and protection score. **Phase 1 focuses on UI with empty state** (0% coverage until policies are integrated).

---

## ASCII Design: Coverage Dashboard (Empty State - Phase 1)

After the wizard is completed, show a **Coverage Dashboard** view. Initially shows 0% coverage since no policies are linked yet:

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│  My Coverage                                              [Edit Targets] [⟳]    │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌───────────────────────────────────────────────────────────────────────────┐  │
│  │                                                                           │  │
│  │  ┌─────────────────────────────────┐   ┌───────────────────────────────┐ │  │
│  │  │  👤 John Tan          [$120K/yr]│   │  PROTECTION SCORE             │ │  │
│  │  │     [Change Person ▼]           │   │                               │ │  │
│  │  └─────────────────────────────────┘   │        ╭─────────╮            │ │  │
│  │                                        │       ╱           ╲           │ │  │
│  │                                        │      │             │          │ │  │
│  │                                        │      │     0%      │          │ │  │
│  │                                        │      │             │          │ │  │
│  │                                        │       ╲           ╱           │ │  │
│  │                                        │        ╰─────────╯            │ │  │
│  │                                        │                               │ │  │
│  │                                        │   Add policies to see your    │ │  │
│  │                                        │   protection score            │ │  │
│  │                                        └───────────────────────────────┘ │  │
│  │                                                                           │  │
│  └───────────────────────────────────────────────────────────────────────────┘  │
│                                                                                 │
│  ┌───────────────────────────────────────────────────────────────────────────┐  │
│  │  COVERAGE TARGETS                                                         │  │
│  │  ─────────────────────────────────────────────────────────────────────    │  │
│  │                                                                           │  │
│  │  🏥 Hospitalization                                         ⚠ No Policy  │  │
│  │     Target: Ward A + Rider                                                │  │
│  │     ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░   0%      │  │
│  │                                                                           │  │
│  │  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─     │  │
│  │                                                                           │  │
│  │  🛡️ Life / TPD                                              ⚠ No Policy  │  │
│  │     Target: $1.2M (10× income)                                            │  │
│  │     ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░   0%      │  │
│  │                                                                           │  │
│  │  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─     │  │
│  │                                                                           │  │
│  │  💊 Critical Illness                                        ⚠ No Policy  │  │
│  │     Target: $600K (5× income)                                             │  │
│  │     ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░   0%      │  │
│  │                                                                           │  │
│  │  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─     │  │
│  │                                                                           │  │
│  │  ⚡ Personal Accident                                       ⚠ No Policy  │  │
│  │     Target: $360K (3× income)                                             │  │
│  │     ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░   0%      │  │
│  │                                                                           │  │
│  └───────────────────────────────────────────────────────────────────────────┘  │
│                                                                                 │
│  ┌───────────────────────────────────────────────────────────────────────────┐  │
│  │  PREMIUM BUDGET                                                           │  │
│  │  ─────────────────────────────────────────────────────────────────────    │  │
│  │                                                                           │  │
│  │  Budget: $12,000/year (10% of income)            Current: $0/year         │  │
│  │  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░   0%       │  │
│  │  $12,000 remaining                                                        │  │
│  │                                                                           │  │
│  └───────────────────────────────────────────────────────────────────────────┘  │
│                                                                                 │
│  ┌───────────────────────────────────────────────────────────────────────────┐  │
│  │                                                                           │  │
│  │     ┌──────────────────────────────────────────────────────────────┐     │  │
│  │     │           + Add Your First Policy to Track Coverage          │     │  │
│  │     └──────────────────────────────────────────────────────────────┘     │  │
│  │                                                                           │  │
│  └───────────────────────────────────────────────────────────────────────────┘  │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## Circular Gauge Component Detail

The protection score gauge uses an SVG circle with stroke-dasharray for the progress arc:

```
                    ╭─────────────────╮
                   ╱                   ╲
                  ╱    ┌───────────┐    ╲
                 │     │    67%    │     │
                 │     │           │     │
                 │     │  ◉ Good   │     │     ← Status text below percentage
                 │     └───────────┘     │
                  ╲    ╭───────────╮    ╱
                   ╲  ╱             ╲  ╱
                    ╰─────────────────╯

                    ↑ Colored arc shows progress
                      (emerald for good, amber for partial, red for gap)

Score Thresholds:
  - 80-100%: "Well Protected" (emerald)
  - 50-79%:  "Partial Coverage" (amber)
  - 0-49%:   "Needs Attention" (red)
```

**Gauge Implementation (SVG):**
```
┌─────────────────────────────────────┐
│                                     │
│           ╱‾‾‾‾‾‾‾‾‾‾‾╲             │   ← Background circle (gray)
│          │    ╱‾‾‾╲    │            │
│          │   │ 67% │   │            │   ← Progress arc overlay (colored)
│          │    ╲___╱    │            │
│           ╲___________╱             │   ← Stroke-dasharray controls fill
│                                     │
│         2 gaps to address           │   ← Summary text
│                                     │
└─────────────────────────────────────┘
```

---

## Coverage Progress Bar Component Detail

Each category has its own progress bar with contextual information:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│  🛡️ Life / TPD                                                   ⚠ Gap     │
│     ───────────────────────────────────────────────────────────────         │
│                                                                             │
│     Target: $1.2M  •  Current: $800K  •  Gap: $400K                         │
│                                                                             │
│     ████████████████████████████████░░░░░░░░░░░░░░░░░░░░   67%              │
│     ↑ filled portion (emerald)      ↑ empty portion (gray)                  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

Status Badge Colors:
  - "✓ Covered" → emerald badge
  - "⚠ Gap"     → amber badge
  - "⚠ No Policy" → gray/muted badge
```

**Hospitalization (Binary - no progress bar needed):**
```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│  🏥 Hospitalization                                            ✓ Covered    │
│     ───────────────────────────────────────────────────────────────         │
│                                                                             │
│     Ward A + Rider                    ← Just shows the coverage type        │
│                                                                             │
│     ████████████████████████████████████████████████████████   100%         │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## With Policies (Future State - Phase 2)

Once policies are linked, the dashboard shows actual coverage:

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│  My Coverage                                              [Edit Targets] [⟳]    │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌───────────────────────────────────────────────────────────────────────────┐  │
│  │                                                                           │  │
│  │  ┌─────────────────────────────────┐   ┌───────────────────────────────┐ │  │
│  │  │  👤 John Tan          [$120K/yr]│   │  PROTECTION SCORE             │ │  │
│  │  │     [Change Person ▼]           │   │                               │ │  │
│  │  └─────────────────────────────────┘   │        ╭─────────╮            │ │  │
│  │                                        │       ╱ ██████████╲           │ │  │
│  │                                        │      │ ██████████ │          │ │  │
│  │                                        │      │     67%     │          │ │  │
│  │                                        │      │  ██████████ │          │ │  │
│  │                                        │       ╲ █████████ ╱           │ │  │
│  │                                        │        ╰─────────╯            │ │  │
│  │                                        │                               │ │  │
│  │                                        │      ⚠ Partial Coverage       │ │  │
│  │                                        │      2 gaps need attention    │ │  │
│  │                                        └───────────────────────────────┘ │  │
│  │                                                                           │  │
│  └───────────────────────────────────────────────────────────────────────────┘  │
│                                                                                 │
│  ┌───────────────────────────────────────────────────────────────────────────┐  │
│  │  COVERAGE BY CATEGORY                                                     │  │
│  │  ─────────────────────────────────────────────────────────────────────    │  │
│  │                                                                           │  │
│  │  🏥 Hospitalization                                         ✓ Covered    │  │
│  │     Ward A + Rider                                                        │  │
│  │     ████████████████████████████████████████████████████████████  100%   │  │
│  │                                                                           │  │
│  │  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─     │  │
│  │                                                                           │  │
│  │  🛡️ Life / TPD                                               ⚠ Gap       │  │
│  │     Target: $1.2M  •  Current: $800K  •  Gap: $400K                       │  │
│  │     ███████████████████████████████████░░░░░░░░░░░░░░░░░░░░░░░░   67%    │  │
│  │                                                                           │  │
│  │  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─     │  │
│  │                                                                           │  │
│  │  💊 Critical Illness                                         ⚠ Gap       │  │
│  │     Target: $600K  •  Current: $200K  •  Gap: $400K                       │  │
│  │     ███████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░   33%    │  │
│  │                                                                           │  │
│  │  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─     │  │
│  │                                                                           │  │
│  │  ⚡ Personal Accident                                        ✓ Covered   │  │
│  │     Target: $360K  •  Current: $500K  •  Excess: +$140K                   │  │
│  │     ████████████████████████████████████████████████████████████  100%+  │  │
│  │                                                                           │  │
│  └───────────────────────────────────────────────────────────────────────────┘  │
│                                                                                 │
│  ┌───────────────────────────────────────────────────────────────────────────┐  │
│  │  PREMIUM SUMMARY                                                          │  │
│  │  ─────────────────────────────────────────────────────────────────────    │  │
│  │                                                                           │  │
│  │  Monthly: $450    Annual: $5,400    Budget: $12,000 (10%)                 │  │
│  │  ███████████████████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░   45%    │  │
│  │  Using 45% of budget  •  $6,600 remaining                                 │  │
│  │                                                                           │  │
│  └───────────────────────────────────────────────────────────────────────────┘  │
│                                                                                 │
│  ┌────────────────────────────────────────────────────────────────────────���──┐  │
│  │  QUICK ACTIONS                                                            │  │
│  │                                                                           │  │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐           │  │
│  │  │   + Add Policy  │  │  📊 View Gaps   │  │  ⚙ Edit Targets │           │  │
│  │  └─────────────────┘  └─────────────────┘  └─────────────────┘           │  │
│  │                                                                           │  │
│  └───────────────────────────────────────────────────────────────────────────┘  │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## Layout Options

**Option A: Side-by-side (Current plan)**
```
┌──────────────────────────────────┬────────────────────────────────────────────┐
│  PERSON SELECTOR                 │  PROTECTION SCORE                          │
│  👤 John Tan                     │        ╭─────╮                             │
│  $120K/year                      │       │ 67% │                             │
│                                  │        ╰─────╯                             │
└──────────────────────────────────┴────────────────────────────────────────────┘
```

**Option B: Stacked (Mobile-friendly)**
```
┌─────────────────────────────────────────────────────────────────────────────────┐
│  👤 John Tan                                               $120K/year           │
├─────────────────────────────────────────────────────────────────────────────────┤
│                             ╭─────────╮                                         │
│                            │   67%   │                                         │
│                             ╰─────────╯                                         │
│                         Partial Coverage                                        │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## Data Flow

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Guidelines     │     │  Policies       │     │  Coverage       │
│  Store          │     │  (Phase 2)      │     │  Dashboard      │
│                 │     │                 │     │                 │
│ • selectedPerson│────▶│ • Query by      │────▶│ • Target vs     │
│ • annualIncome  │     │   personId      │     │   Actual        │
│ • multipliers   │     │ • Sum coverage  │     │ • Gap calc      │
│ • targets       │     │   by category   │     │ • Score %       │
└─────────────────┘     └─────────────────┘     └─────────────────┘

Phase 1: Guidelines Store → Dashboard (0% coverage, targets only)
Phase 2: + Policies → Dashboard (actual coverage shown)
```

---

## Protection Score Calculation

```
score = weightedAverage(
  hospitalization: hasValidISP ? 100 : 0,           weight: 0.25
  life_tpd: min(100, (current / target) * 100),     weight: 0.35
  critical_illness: min(100, (current / target) * 100), weight: 0.25
  personal_accident: min(100, (current / target) * 100), weight: 0.15
)
```

---

## Component Structure

```
CoverageDashboard
├── DashboardHeader
│   ├── Title "My Coverage"
│   ├── Edit Targets button
│   └── Reset button
├── PersonScoreSection (flex row)
│   ├── PersonCard
│   │   ├── Person name + color dot
│   │   ├── Annual income display
│   │   └── Change Person dropdown
│   └── ProtectionScoreGauge
│       ├── SVG circular progress
│       ├── Percentage text
│       └── Status message
├── CoverageCategoryList
│   └── CoverageCategoryRow × 4
│       ├── Category icon + label
│       ├── Status badge (Covered/Gap/No Policy)
│       ├── Target/Current/Gap amounts
│       └── Progress bar
├── PremiumBudgetSection
│   ├── Budget info (monthly/annual)
│   ├── Progress bar
│   └── Remaining amount
└── QuickActionsSection
    └── Add Policy button (prominent CTA)
```

---

## Files to Modify

### 1. `frontend/src/types/insurance.ts` ✅ DONE
- Added `CoverageCategoryStatus` interface
- Added `CoverageStatus` interface
- Added `calculateProtectionScore()` function
- Added `buildCoverageStatus()` function

### 2. `frontend/src/components/insurance/CoverageDashboard.tsx` (NEW)
Main dashboard component containing:
- `ProtectionScoreGauge` - SVG circular gauge
- `CoverageCategoryRow` - Individual category with progress bar
- `PremiumBudgetBar` - Budget utilization display
- `CoverageDashboard` - Main orchestrating component

### 3. `frontend/src/components/insurance/tabs/GuidelinesTab.tsx`
- Replace `ConfiguredGuidelinesView` with import of `CoverageDashboard`

---

## Implementation Notes

**SVG Circular Gauge:**
- Use `stroke-dasharray` and `stroke-dashoffset` for progress
- Circle with radius ~45, stroke-width ~10
- Background circle in gray, progress arc in color
- Animate with CSS transition on stroke-dashoffset

**Progress Bars:**
- Simple div with width percentage
- Background: `bg-white/[0.1]`
- Fill: `bg-emerald-500` (covered), `bg-amber-500` (partial), `bg-slate-600` (empty)

**Empty State:**
- All progress at 0%
- Protection score shows 0%
- Prominent CTA to add first policy
- Targets still visible so user knows what they're working toward

---

## Verification

1. Complete wizard → See coverage dashboard (empty state)
2. Dashboard shows targets with 0%
3. Circular gauge displays 0% with "Add policies" message
4. Person selector changes income and targets
5. TypeScript: `cd frontend && npx tsc --noEmit`

---

## Questions for Review

1. **Layout**: Side-by-side (Option A) or stacked (Option B) for person+score section?
2. **Empty state CTA**: Single prominent button or include "View Gaps" as secondary action?
3. **Category icons**: Use emojis (🏥🛡️💊⚡) or Lucide icons?
