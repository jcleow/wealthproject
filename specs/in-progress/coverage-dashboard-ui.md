# Coverage Protection Dashboard by Person

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

**Hospitalization (Binary - no dollar amounts):**
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
│  ┌───────────────────────────────────────────────────────────────────────────┐  │
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

---

# Coverage Journey View (Age-Based Planning)

## Concept

A dedicated view showing how insurance coverage needs evolve over a lifetime, personalized to the user's life stage and family situation. Combines:
1. Life Stage context
2. Coverage Curve visualization
3. Interactive Age Slider
4. Milestone Alerts

---

## Full Page View (Desktop)

```
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   Coverage Journey                                           [• Alex ▾]       ║
║   ─────────────────────────────────────────────────────────────────────────── ║
║                                                                                ║
║   ┌─────────────────────────────────────────────────────────────────────────┐ ║
║   │                                                                         │ ║
║   │   Your Life Stage                                                       │ ║
║   │                                                                         │ ║
║   │   ┌───────────┐ ┌───────────┐ ┌─────────────┐ ┌────────────┐ ┌───────┐ │ ║
║   │   │   Young   │ │    New    │ │  ● Growing  │ │   Empty    │ │Retired│ │ ║
║   │   │   Prof    │ │   Parent  │ │    Family   │ │   Nester   │ │       │ │ ║
║   │   └───────────┘ └───────────┘ └─────────────┘ └────────────┘ └───────┘ │ ║
║   │        ○              ○              ●              ○            ○      │ ║
║   │                                                                         │ ║
║   │   You're in: Growing Family                                             │ ║
║   │   Peak protection years • Dependents rely on your income                │ ║
║   │                                                                         │ ║
║   └─────────────────────────────────────────────────────────────────────────┘ ║
║                                                                                ║
║   ┌─────────────────────────────────────────────────────────────────────────┐ ║
║   │                                                                         │ ║
║   │   Coverage Needs Over Time                                              │ ║
║   │                                                                         │ ║
║   │   $1.2M ┤                                                               │ ║
║   │         │           ╭─────────────╮                                     │ ║
║   │   $1.0M ┤          ╱               ╲                                    │ ║
║   │         │         ╱                 ╲                                   │ ║
║   │   $800K ┤        ╱        ●          ╲                                  │ ║
║   │         │       ╱     YOU ARE         ╲                                 │ ║
║   │   $600K ┤      ╱       HERE            ╲                                │ ║
║   │         │     ╱                         ╲                               │ ║
║   │   $400K ┤    ╱                           ╲____                          │ ║
║   │         │   ╱                                 ╲____                     │ ║
║   │   $200K ┤  ╱                                       ╲____                │ ║
║   │         │ ╱                                             ╲____           │ ║
║   │       0 ┼─┬─────┬─────┬─────┬─────┬─────┬─────┬─────┬─────┬────→       │ ║
║   │         25     30     35     40     45     50     55     60     65      │ ║
║   │                  │            ↑            │            │               │ ║
║   │                  │         Age 38          │            │               │ ║
║   │            1st child     (current)    Kids grad    Retirement           │ ║
║   │                                                                         │ ║
║   │   ─────────────────────────────────────────────────────────────────    │ ║
║   │                                                                         │ ║
║   │   Explore:  25 [═══════════●═══════════════════════════════════] 75    │ ║
║   │                         Age 38                                          │ ║
║   │                                                                         │ ║
║   └─────────────────────────────────────────────────────────────────────────┘ ║
║                                                                                ║
║   ┌─────────────────────────────────────────────────────────────────────────┐ ║
║   │                                                                         │ ║
║   │   At Age 38 (Current)                                                   │ ║
║   │                                                                         │ ║
║   │   ┌──────────────────┬──────────────┬──────────────┬──────────────────┐│ ║
║   │   │     Category     │  Recommended │    Current   │    Status        ││ ║
║   │   ├──────────────────┼──────────────┼──────────────┼──────────────────┤│ ║
║   │   │ 🛡️ Life/TPD      │    $960,000  │    $960,000  │  ✓ On Target    ││ ║
║   │   │ 💗 Critical Ill  │     $80,000  │     $60,000  │  ⚠ Gap: $20K    ││ ║
║   │   │ 🏥 Hospital      │     Ward B1  │     Ward B1  │  ✓ Covered      ││ ║
║   │   │ ⚡ Accident      │    $120,000  │    $120,000  │  ✓ On Target    ││ ║
║   │   └──────────────────┴──────────────┴──────────────┴──────────────────┘│ ║
║   │                                                                         │ ║
║   └─────────────────────────────────────────────────────────────────────────┘ ║
║                                                                                ║
║   ┌─────────────────────────────────────────────────────────────────────────┐ ║
║   │                                                                         │ ║
║   │   Upcoming Milestones                                                   │ ║
║   │                                                                         │ ║
║   │   ┌─────────────────────────────────────────────────────────────────┐  │ ║
║   │   │                                                                 │  │ ║
║   │   │  ○───────────────○───────────────○───────────────○             │  │ ║
║   │   │  │               │               │               │             │  │ ║
║   │   │  2026            2031            2038            2050          │  │ ║
║   │   │  NOW             Emma 22         Mortgage        Retirement    │  │ ║
║   │   │                                  Paid Off                      │  │ ║
║   │   │                                                                 │  │ ║
║   │   └─────────────────────────────────────────────────────────────────┘  │ ║
║   │                                                                         │ ║
║   │   ┌─────────────────────────────────────────────────────────────────┐  │ ║
║   │   │  📅  2031 • In 5 years                                          │  │ ║
║   │   │  ─────────────────────────────────────────────────────────────  │  │ ║
║   │   │  Emma turns 22 and becomes financially independent              │  │ ║
║   │   │                                                                 │  │ ║
║   │   │  Impact on coverage:                                            │  │ ║
║   │   │  • Life/TPD need drops from $960K → $720K  (−$240K)            │  │ ║
║   │   │  • Consider reducing premium by ~$800/year                      │  │ ║
║   │   │                                                                 │  │ ║
║   │   │  [Set Reminder]                                                 │  │ ║
║   │   └─────────────────────────────────────────────────────────────────┘  │ ║
║   │                                                                         │ ║
║   │   ┌─────────────────────────────────────────────────────────────────┐  │ ║
║   │   │  📅  2038 • In 12 years                                         │  │ ║
║   │   │  ─────────────────────────────────────────────────────────────  │  │ ║
║   │   │  Mortgage fully paid off                                        │  │ ║
║   │   │                                                                 │  │ ║
║   │   │  Impact on coverage:                                            │  │ ║
║   │   │  • Life/TPD need drops from $720K → $400K  (−$320K)            │  │ ║
║   │   │  • No longer need to cover outstanding home loan                │  │ ║
║   │   │                                                                 │  │ ║
║   │   └─────────────────────────────────────────────────────────────────┘  │ ║
║   │                                                                         │ ║
║   │   ┌─────────────────────────────────────────────────────────────────┐  │ ║
║   │   │  📅  2050 • At age 62                                           │  │ ║
║   │   │  ─────────────────────────────────────────────────────────────  │  │ ║
║   │   │  Retirement                                                     │  │ ║
║   │   │                                                                 │  │ ║
║   │   │  Coverage focus shifts:                                         │  │ ║
║   │   │  • Life/TPD becomes optional (no dependents, no debt)          │  │ ║
║   │   │  • Hospitalization becomes priority (age-related health)        │  │ ║
║   │   │  • Consider upgrading ward class for retirement years           │  │ ║
║   │   │                                                                 │  │ ║
║   │   └─────────────────────────────────────────────────────────────────┘  │ ║
║   │                                                                         │ ║
║   └─────────────────────────────────────────────────────────────────────────┘ ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
```

---

## Age Slider Interaction States

### State: Current Age (38)
```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   Explore:  25 [═══════════●═══════════════════════════] 75    │
│                         Age 38                                  │
│                          ↑                                      │
│                    (Your current age)                           │
│                                                                 │
│   ┌─────────────────────────────────────────────────────────┐  │
│   │  At Age 38 (Current)                     📍 YOU ARE HERE │  │
│   │                                                          │  │
│   │  Life/TPD        $960,000  needed                        │  │
│   │  Critical Ill     $80,000  needed                        │  │
│   │  Hospital         Ward B1  minimum                       │  │
│   │  Accident        $120,000  needed                        │  │
│   └─────────────────────────────────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### State: Dragged to Age 45
```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   Explore:  25 [═══════════════════●═══════════════════] 75    │
│                                  Age 45                         │
│                                    ↑                            │
│                          (7 years from now)                     │
│                                                                 │
│   ┌─────────────────────────────────────────────────────────┐  │
│   │  At Age 45                              📅 IN 7 YEARS    │  │
│   │                                                          │  │
│   │  Life/TPD        $720,000  needed   (↓ $240K from now)  │  │
│   │  Critical Ill     $80,000  needed   (same)               │  │
│   │  Hospital         Ward B1  minimum  (same)               │  │
│   │  Accident        $100,000  needed   (↓ $20K from now)   │  │
│   │                                                          │  │
│   │  Why the change?                                         │  │
│   │  • Emma turned 22 and is now independent                 │  │
│   └─────────────────────────────────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### State: Dragged to Age 65
```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   Explore:  25 [═══════════════════════════════════●═══] 75    │
│                                                  Age 65         │
│                                                    ↑            │
│                                         (27 years from now)     │
│                                                                 │
│   ┌─────────────────────────────────────────────────────────┐  │
│   │  At Age 65                           🌅 RETIREMENT       │  │
│   │                                                          │  │
│   │  Life/TPD        $100,000  optional  (↓ $860K from now) │  │
│   │  Critical Ill     $50,000  optional  (↓ $30K)           │  │
│   │  Hospital      Ward A/B1+  priority  (↑ upgrade)        │  │
│   │  Accident         $50,000  optional  (↓ $70K)           │  │
│   │                                                          │  │
│   │  Why the change?                                         │  │
│   │  • No dependents relying on income                       │  │
│   │  • Mortgage paid off                                     │  │
│   │  • CPF LIFE provides baseline income                     │  │
│   │  • Health coverage becomes primary concern               │  │
│   └─────────────────────────────────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Life Stage Cards

### Young Professional (22-30, no dependents)
```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   🌱 Young Professional                                         │
│   ─────────────────────────────────────────────────────────────│
│                                                                 │
│   Age range: 22-30                                              │
│   Typical situation: Single or newly married, no children       │
│                                                                 │
│   Coverage priorities:                                          │
│                                                                 │
│   ████████████████████░░░░ Hospitalization (Essential)          │
│   Ward B2+ minimum. You're healthy now but accidents happen.   │
│                                                                 │
│   ████████░░░░░░░░░░░░░░░░ Life/TPD (Low)                       │
│   2-3x income. Mainly to cover debts if any.                   │
│                                                                 │
│   ████████░░░░░░░░░░░░░░░░ Critical Illness (Low)               │
│   1-2x income. Emergency fund substitute.                       │
│                                                                 │
│   ████░░░░░░░░░░░░░░░░░░░░ Personal Accident (Optional)         │
│   Nice to have if physically active.                            │
│                                                                 │
│   💡 Focus: Build emergency fund first, basic coverage second   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Growing Family (30-50, dependents)
```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   🏠 Growing Family                                             │
│   ─────────────────────────────────────────────────────────────│
│                                                                 │
│   Age range: 30-50                                              │
│   Typical situation: Married, children, mortgage                │
│                                                                 │
│   Coverage priorities:                                          │
│                                                                 │
│   ████████████████████████ Life/TPD (CRITICAL)                  │
│   8-12x income. Family depends on your income.                 │
│   Include: mortgage + kids' education + 5-10yr expenses        │
│                                                                 │
│   ████████████████████░░░░ Hospitalization (Essential)          │
│   Ward B1+. Can't afford downtime during peak earning years.   │
│                                                                 │
│   ████████████████░░░░░░░░ Critical Illness (Important)         │
│   3-5x income. Recovery period without working.                │
│                                                                 │
│   ████████████░░░░░░░░░░░░ Personal Accident (Moderate)         │
│   2x income. Additional protection during active years.        │
│                                                                 │
│   ⚠️ This is your PEAK protection period. Don't underinsure.   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Empty Nester (50-65, kids independent)
```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   🍂 Empty Nester                                               │
│   ─────────────────────────────────────────────────────────────│
│                                                                 │
│   Age range: 50-65                                              │
│   Typical situation: Kids independent, mortgage reducing        │
│                                                                 │
│   Coverage priorities:                                          │
│                                                                 │
│   ████████████████████░░░░ Hospitalization (Priority)           │
│   Ward B1+. Health concerns increase with age.                 │
│                                                                 │
│   ████████████░░░░░░░░░░░░ Life/TPD (Decreasing)                │
│   3-5x income. Only need to cover remaining debts + spouse.    │
│                                                                 │
│   ████████████░░░░░░░░░░░░ Critical Illness (Important)         │
│   2-3x income. Higher risk age group.                          │
│                                                                 │
│   ████████░░░░░░░░░░░░░░░░ Personal Accident (Lower)            │
│   1x income. Less active lifestyle.                            │
│                                                                 │
│   💡 Review and reduce life coverage as debts clear            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Retirement (65+)
```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   🌅 Retirement                                                 │
│   ─────────────────────────────────────────────────────────────│
│                                                                 │
│   Age range: 65+                                                │
│   Typical situation: No dependents, no debt, CPF LIFE income   │
│                                                                 │
│   Coverage priorities:                                          │
│                                                                 │
│   ████████████████████████ Hospitalization (ESSENTIAL)          │
│   Ward A or B1. This is your main concern now.                 │
│   Consider: Lifetime guarantee, no co-pay riders               │
│                                                                 │
│   ████████░░░░░░░░░░░░░░░░ Life/TPD (Optional)                  │
│   Legacy planning only. Not for income replacement.            │
│                                                                 │
│   ████████░░░░░░░░░░░░░░░░ Critical Illness (Low)               │
│   If affordable. May be expensive at this age.                 │
│                                                                 │
│   ████░░░░░░░░░░░░░░░░░░░░ Personal Accident (Optional)         │
│   Consider if still active.                                    │
│                                                                 │
│   💡 Focus shifts from income protection to health coverage    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Multi-Category Coverage Curve

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│   Coverage Needs by Category                              [Combined ▾]      │
│                                                                             │
│                                                                             │
│   $1.2M ┤                                                                   │
│         │           ╭─────────────╮                                         │
│   $1.0M ┤          ╱               ╲                                        │
│         │         ╱    Life/TPD     ╲                                       │
│   $800K ┤        ╱         ●         ╲                                      │
│         │       ╱                     ╲                                     │
│   $600K ┤      ╱                       ╲                                    │
│         │     ╱                         ╲                                   │
│   $400K ┤    ╱                           ╲____                              │
│         │   ╱   ╭───────────────────────╮     ╲____                         │
│   $200K ┤  ╱   ╱  Critical Illness       ╲         ╲____                    │
│         │ ╱   ╱ ╭────────────────────────────────────╮  ╲___                │
│   $100K ┼╱───╱─╱  Personal Accident                   ╲────╲____            │
│         │   ╱                                                    ╲___       │
│       0 ┼──┬─────┬─────┬─────┬─────┬─────┬─────┬─────┬─────┬────→          │
│         25      30     35     40     45     50     55     60     65         │
│                                      ↑                                      │
│                                   Age 40                                    │
│                                                                             │
│   Legend:  ━━━ Life/TPD   ─── Critical Illness   ··· Accident              │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Mobile Layout (Stacked)

```
┌──────────────────────────────┐
│                              │
│   Coverage Journey           │
│   ──────────────────────────│
│                              │
│   [• Alex ▾]                 │
│                              │
│   ┌──────────────────────┐  │
│   │  🏠 Growing Family    │  │
│   │  Peak protection     │  │
│   └──────────────────────┘  │
│                              │
│   ┌──────────────────────┐  │
│   │        ╭──╮          │  │
│   │       ╱    ╲         │  │
│   │      ╱  ●   ╲        │  │
│   │     ╱        ╲___    │  │
│   │    ╱              ╲  │  │
│   │   ─┬──┬──┬──┬──┬──→  │  │
│   │   25 35 45 55 65     │  │
│   │                      │  │
│   │   Age: [════●════]   │  │
│   │           38         │  │
│   └──────────────────────┘  │
│                              │
│   At Age 38                  │
│   ┌──────────────────────┐  │
│   │ Life/TPD    $960K ✓  │  │
│   │ Critical    $60K  ⚠  │  │
│   │ Hospital    B1    ✓  │  │
│   │ Accident    $120K ✓  │  │
│   └──────────────────────┘  │
│                              │
│   Milestones                 │
│   ┌──────────────────────┐  │
│   │ 📅 2031              │  │
│   │ Emma turns 22        │  │
│   │ Coverage ↓ $240K     │  │
│   └──────────────────────┘  │
│   ┌──────────────────────┐  │
│   │ 📅 2038              │  │
│   │ Mortgage paid        │  │
│   │ Coverage ↓ $320K     │  │
│   └──────────────────────┘  │
│                              │
└──────────────────────────────┘
```

---

## Coverage Journey - Data Types

```tsx
type LifeStage =
  | 'young_professional'  // 22-30, no dependents
  | 'new_parent'          // First child under 5
  | 'growing_family'      // Multiple dependents, peak need
  | 'empty_nester'        // Kids independent, mortgage winding down
  | 'pre_retirement'      // 55-65, transitioning
  | 'retired'             // 65+, health focus

interface CoverageProjectionYear {
  age: number
  year: number
  recommendedLifeTpd: number
  recommendedCriticalIllness: number
  currentLifeTpd: number
  currentCriticalIllness: number
}

interface CoverageMilestone {
  year: number
  age: number
  event: string
  impact: string  // e.g., "Coverage need drops $240K"
  category: 'dependent' | 'debt' | 'retirement' | 'health'
}
```

---

## Coverage Journey - Files to Create

**New files:**
- `frontend/src/components/insurance/CoverageJourney.tsx` - Main view
- `frontend/src/components/insurance/CoverageNeedsCurve.tsx` - Chart
- `frontend/src/components/insurance/LifeStagePills.tsx` - Stage selector
- `frontend/src/components/insurance/MilestoneAlerts.tsx` - Alerts
- `frontend/src/lib/coverage-journey-utils.ts` - Calculations

**Modify:**
- `frontend/src/stores/coverageGuidelinesStore.ts` - Add life stage
- `frontend/src/components/insurance/InsuranceTabs.tsx` - Add Journey tab

---

## Coverage Journey - Verification

1. Life stage auto-detects correctly based on age/dependents
2. Coverage curve shows realistic shape (peaks in 30s-40s, declines after)
3. Age slider updates comparison table in real-time
4. Milestones calculate correctly from dependent ages
5. Responsive on mobile (stack vertically)
6. TypeScript compiles: `npx tsc --noEmit`
