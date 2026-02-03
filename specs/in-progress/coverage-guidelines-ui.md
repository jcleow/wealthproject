# Coverage Guidelines UI Specification

## Overview

A user-configurable insurance coverage guidelines system that allows users to define their own coverage targets based on income multipliers. This replaces generic LIA benchmarks with personalized "Captain of Your Ship" guidelines.

## Philosophy

- Users define their OWN coverage targets, not industry benchmarks
- Coverage expressed as multiples of annual income (e.g., 10× for Life/TPD)
- Hospitalization is ward-class based, not income-based
- Premium budget constraint: ≤ X% of income
- 5 independent risk layers, not a combined "protection score"

---

## Coverage Types & Icons

| Type | Emoji | Color | Multiplier | Required |
|------|-------|-------|------------|----------|
| Hospitalization | 🏥 | emerald | N/A (ward class) | Yes |
| Life / TPD | 😇 | blue | 10× (default) | Yes |
| Critical Illness | 🩺 | purple | 5× (default) | Yes |
| Personal Accident | 🚗 | amber | 5× (default) | No (optional) |

### Icon Design Decision
- Rejected: 💀 (skull) for Life/TPD - too morbid
- Chosen: 😇 (smiling face with halo) - "guardian angel" vibe

---

## Presets

| Preset | Life/TPD | CI | PA | Premium Budget |
|--------|----------|----|----|----------------|
| 🌱 Lean | 5× | 3× | 3× | 5% |
| ⚖️ Standard | 10× | 5× | 5× | 10% |
| 🛡️ Comprehensive | 15× | 7× | 10× | 15% |

---

## User Flow

### First-Time Users: 3-Step Wizard

```
┌─────────────────────────────────────────────────────────────────┐
│                    STEP INDICATOR                                │
│                                                                  │
│      ●────────────○────────────○                                │
│    Income      Coverage      Review                             │
│   (current)                                                     │
└─────────────────────────────────────────────────────────────────┘
```

### Returning Users: Configured View
Direct access to editable dashboard with all coverage cards and summary sidebar.

---

## Wizard Step 1: Income

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                  │
│                         💵                                       │
│                                                                  │
│            What's your annual income?                           │
│                                                                  │
│    Your coverage targets are calculated as multiples            │
│    of your income. This helps ensure you're adequately          │
│    protected.                                                   │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Annual gross income (before tax)                        │   │
│  │                                                          │   │
│  │  $  ┌──────────────────────────────────────────┐        │   │
│  │     │                                  80,000  │        │   │
│  │     └──────────────────────────────────────────┘        │   │
│  │                                                          │   │
│  │  ┌─────┐ ┌─────┐ ┌──────┐ ┌──────┐ ┌──────┐            │   │
│  │  │$50K │ │$80K │ │$100K │ │$150K │ │$200K │            │   │
│  │  └─────┘ └─────┘ └──────┘ └──────┘ └──────┘            │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ ℹ️  Why does income matter?                              │   │
│  │                                                          │   │
│  │ Insurance coverage is typically expressed as multiples   │   │
│  │ of annual income (e.g., 10× for life insurance). This   │   │
│  │ ensures your dependents can maintain their lifestyle    │   │
│  │ if something happens to you.                            │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│            ┌────────────────────────────────┐                   │
│            │     Continue            →      │                   │
│            └────────────────────────────────┘                   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Wizard Step 2: Coverage Multipliers

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                  │
│                         ✨                                       │
│                                                                  │
│            Set your coverage targets                            │
│                                                                  │
│    Choose a preset or customize each coverage type.             │
│    Remember: these are YOUR guidelines.                         │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │    PRESETS                                               │   │
│  │                                                          │   │
│  │  ┌───────────┐  ┌───────────┐  ┌───────────┐           │   │
│  │  │    🌱     │  │    ⚖️     │  │    🛡️     │           │   │
│  │  │   Lean    │  │ Standard  │  │Comprehen- │           │   │
│  │  │  5× Life  │  │ 10× Life  │  │sive 15×   │           │   │
│  │  │  3× CI    │  │  5× CI    │  │   7× CI   │           │   │
│  │  └───────────┘  └───────────┘  └───────────┘           │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 🏥  Hospitalization                           [ON/OFF]   │   │
│  │     Must upgrade from MediShield Life to ISP             │   │
│  │                                                          │   │
│  │     Ward Class:  ┌───┐ ┌───┐ ┌────┐ ┌───┐              │   │
│  │                  │ A │ │B1 │ │B2+ │ │ C │              │   │
│  │                  └───┘ └───┘ └────┘ └───┘              │   │
│  │                                                          │   │
│  │     ☑️ Include rider (reduces co-pay)                    │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 😇  Life / TPD                     ❓        [ON/OFF]   │   │
│  │     Death and Total Permanent Disability coverage        │   │
│  │                                                          │   │
│  │     10× income                              $800,000     │   │
│  │     ├────────────────●──────────────────────────┤       │   │
│  │     1×              10×                        20×       │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 🩺  Critical Illness                 ❓        [ON/OFF]   │   │
│  │     Lump-sum payout on diagnosis of major illness        │   │
│  │                                                          │   │
│  │     5× income                               $400,000     │   │
│  │     ├──────────●────────────────────────────────┤       │   │
│  │     1×         5×                              20×       │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 🚗  Personal Accident      (Optional)  ❓      [ON/OFF]   │   │
│  │     Coverage for accidental injuries                     │   │
│  │                                                          │   │
│  │     5× income                               $400,000     │   │
│  │     ├──────────●────────────────────────────────┤       │   │
│  │     1×         5×                              20×       │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│       ┌──────────────┐    ┌────────────────────────────┐       │
│       │     Back     │    │     Continue         →     │       │
│       └──────────────┘    └────────────────────────────┘       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Educational Tooltips (on ❓ hover)

**Life/TPD:**
```
┌──────────────────────────────────────┐
│ Why Life/TPD Coverage?               │
│                                      │
│ ✓ 10× income replaces earnings for   │
│   ~10 years                          │
│ ✓ Covers mortgage, children's        │
│   education, daily expenses          │
│ ✓ TPD pays if you can't work         │
│ ✓ DPS ($70K) from CPF is often       │
│   insufficient alone                 │
└──────────────────────────────────────┘
```

**Critical Illness:**
```
┌──────────────────────────────────────┐
│ Why Critical Illness Coverage?       │
│                                      │
│ ✓ Pays lump sum on diagnosis         │
│   (cancer, heart attack, stroke)     │
│ ✓ 5× income covers treatment +       │
│   income loss during recovery        │
│ ✓ 1 in 4 Singaporeans will develop   │
│   cancer by age 75                   │
│ ✓ Covers expenses not covered by     │
│   hospitalization plans              │
└──────────────────────────────────────┘
```

---

## Wizard Step 3: Review & Budget

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                  │
│                         ✓                                        │
│                                                                  │
│            Review your guidelines                               │
│                                                                  │
│    Here's a summary of your coverage targets.                   │
│    You can always adjust these later.                           │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  SUMMARY                                                 │   │
│  │  ─────────────────────────────────────────────────────  │   │
│  │  Annual Income                             $80,000      │   │
│  │  ─────────────────────────────────────────────────────  │   │
│  │                                                          │   │
│  │  🏥  Hospital        Class B1 + Rider                   │   │
│  │  😇  Life/TPD        $800,000  (10×)                    │   │
│  │  🩺  Critical Illness $400,000  (5×)                    │   │
│  │  🚗  Personal Accident $400,000  (5×)                   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  MAXIMUM PREMIUM BUDGET                                  │   │
│  │                                                          │   │
│  │  % of income you're willing to spend on insurance       │   │
│  │                                                          │   │
│  │                                                    10%   │   │
│  │  ├────────────────────●─────────────────────────────┤   │   │
│  │  5%                  10%                          20%   │   │
│  │                                                          │   │
│  │  ┌─────────────────────────────────────────────────┐   │   │
│  │  │  Max annual premiums          ≤ $8,000          │   │   │
│  │  │  ≈ $667/month                                   │   │   │
│  │  └─────────────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│       ┌──────────────┐    ┌────────────────────────────┐       │
│       │     Back     │    │  ✓  Save My Guidelines     │       │
│       └──────────────┘    └────────────────────────────┘       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Configured View (After Wizard)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                              │
│  ⚙️  My Coverage Guidelines                              [🔄 Reset]         │
│  Your personal coverage targets based on $80,000/year income                │
│                                                                              │
│  ┌─────────────────────────────────────────┐  ┌──────────────────────────┐ │
│  │                                         │  │  COVERAGE TARGETS        │ │
│  │  ┌─────────────────────────────────┐   │  │  ──────────────────────  │ │
│  │  │ 🏥  Hospitalization    [ON/OFF] │   │  │                          │ │
│  │  │     Must upgrade to ISP         │   │  │  🏥 Hospital   Class B1  │ │
│  │  │                                 │   │  │  😇 Life      $800,000   │ │
│  │  │  Ward: ┌─┐ ┌──┐ ┌───┐ ┌─┐      │   │  │  🩺 CI        $400,000   │ │
│  │  │        │A│ │B1│ │B2+│ │C│      │   │  │  🚗 PA        $400,000   │ │
│  │  │        └─┘ └──┘ └───┘ └─┘      │   │  │                          │ │
│  │  │                                 │   │  └──────────────────────────┘ │
│  │  │  ☑️ Include rider               │   │                               │
│  │  └─────────────────────────────────┘   │  ┌──────────────────────────┐ │
│  │                                         │  │  PREMIUM BUDGET          │ │
│  │  ┌─────────────────────────────────┐   │  │  ──────────────────────  │ │
│  │  │ 😇  Life / TPD    ❓  [ON/OFF]  │   │  │                    10%   │ │
│  │  │     Death and TPD coverage      │   │  │  ├────────●──────────┤  │ │
│  │  │                                 │   │  │  5%      10%       20%  │ │
│  │  │     10× income        $800,000  │   │  │                          │ │
│  │  │     ├────────●──────────────┤   │   │  │   ≤ $8,000/year         │ │
│  │  │     1×      10×            20×  │   │  └──────────────────────────┘ │
│  │  └─────────────────────────────────┘   │                               │
│  │                                         │  Last updated: 19 Jan 2026   │
│  │  ┌─────────────────────────────────┐   │                               │
│  │  │ 🩺  Critical Illness  ❓ [ON]    │   │                               │
│  │  │     5× income         $400,000  │   │                               │
│  │  │     ├────●──────────────────┤   │   │                               │
│  │  └─────────────────────────────────┘   │                               │
│  │                                         │                               │
│  │  ┌─────────────────────────────────┐   │                               │
│  │  │ 🚗  Personal Accident (Optional) │   │                               │
│  │  │     5× income         $400,000  │   │                               │
│  │  │     ├────●──────────────────┤   │   │                               │
│  │  └─────────────────────────────────┘   │                               │
│  │                                         │                               │
│  └─────────────────────────────────────────┘                               │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Component Architecture

```
GuidelinesTab
├── (hasConfigured = false) → Wizard Flow
│   ├── WizardStepIndicator
│   ├── WizardStep1Income
│   ├── WizardStep2Multipliers
│   │   └── CoverageMultiplierCard (×4)
│   │       └── Educational Tooltip (on hover)
│   └── WizardStep3Summary
│
└── (hasConfigured = true) → ConfiguredGuidelinesView
    ├── Header with Reset button
    ├── CoverageMultiplierCard (×4)
    └── Summary Sidebar
        ├── Coverage Targets Card
        ├── Premium Budget Slider
        └── Last Updated timestamp
```

---

## State Management (Zustand)

```typescript
interface CoverageGuidelinesState {
  guidelines: UserCoverageGuidelines
  hasConfiguredGuidelines: boolean
  isEditing: boolean

  // Actions
  setAnnualIncome: (income: number) => void
  setMaxPremiumPercentage: (percentage: number) => void
  applyPreset: (preset: GuidelinesPreset) => void
  setMultiplier: (coverageType: GuidelineCoverageType, multiplier: number) => void
  toggleCoverage: (coverageType: GuidelineCoverageType) => void
  setHospitalizationPreferences: (prefs: {...}) => void
  resetToDefaults: () => void
  markAsConfigured: () => void
}
```

**Persistence:** Uses Zustand's `persist` middleware to save to localStorage.

---

## Integration Points

1. **Insurance Planner Page** (`/insurance-planner`)
   - New "My Guidelines" tab added to `InsuranceTabs`
   - Third tab after "Overview" and "Policies"

2. **Overview Tab**
   - Can reference user's guidelines when showing gap analysis
   - Compare actual coverage vs. user-defined targets

3. **Future: Stress Testing**
   - Guidelines inform what "adequate coverage" means
   - Stress tests can check if policies meet user's targets

---

## Files Created/Modified

| File | Purpose |
|------|---------|
| `types/insurance.ts` | Added `UserCoverageGuidelines`, `GuidelineCoverageType`, presets, helpers |
| `stores/coverageGuidelinesStore.ts` | Zustand store with persist middleware |
| `components/insurance/tabs/GuidelinesTab.tsx` | Main component with wizard + configured view |
| `components/insurance/InsuranceTabs.tsx` | Added "My Guidelines" tab |
| `app/insurance-planner/page.tsx` | Wired up GuidelinesTab |

---

## Design Tokens

- **Card gradients:** `from-{color}-500/20 to-{color}-500/5`
- **Active borders:** `border-{color}-500/30`
- **Step indicator:** Emerald for active/complete, white/20 for inactive
- **Slider thumb:** `bg-emerald-500` with shadow
- **Educational tooltip:** `bg-[#0a0f18]` with `border-white/[0.1]`
