---
description: Create stylish UI components matching the app's glassmorphic dark theme
triggers:
  - create component
  - style
  - UI
  - frontend
  - button
  - card
  - modal
  - form
  - input
  - dashboard
  - chart
---

# Frontend Styling Skill

When creating or modifying frontend components, follow these conventions to match the existing design system.

## Tech Stack

- **Tailwind CSS** with custom config
- **CVA (Class Variance Authority)** for component variants
- **Radix UI** for accessible primitives
- **Lucide React** for icons
- **Recharts** for charts
- **cn()** utility from `@/lib/utils` for class merging

## Design Theme: Glassmorphic Dark

This app uses a **dark glassmorphic** design with:
- Dark backgrounds (`bg-gray-950`, `bg-black`)
- Semi-transparent surfaces with blur (`bg-white/5 backdrop-blur-xl`)
- Subtle white borders (`border-white/10`)
- Blue accent colors (`#006cff`, `#4f81ff`, `#7db0ff`)
- Deep shadows (`shadow-xl shadow-black/30`)

## Core Patterns

### Glassmorphic Containers

```tsx
// Glass panel (sidebars, overlays)
className="glass-panel" // or manually:
className="bg-[rgba(10,10,10,0.6)] backdrop-blur-xl border border-white/[0.08]"

// Glass card (content cards)
className="glass-card" // or manually:
className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.05] shadow-[0_4px_30px_rgba(0,0,0,0.2)]"

// Standard card
className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-lg shadow-black/30"

// Gradient card (for emphasis)
className="rounded-2xl border border-white/10 bg-gradient-to-r from-blue-600/20 via-indigo-600/20 to-blue-600/10 p-4 shadow-lg shadow-black/30"
```

### Buttons

```tsx
// Primary action
className="rounded-lg bg-white/10 p-2 text-slate-300 transition-all hover:bg-white hover:text-black"

// Ghost/icon button
className="h-8 p-1 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"

// Outlined button
className="flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.02] px-3 py-1.5 text-xs font-medium text-slate-400 transition-all hover:border-white/[0.12] hover:bg-white/[0.04] hover:text-slate-200"

// Use CVA buttonVariants for standard buttons:
import { Button } from "@/components/ui/button"
```

### Inputs & Forms

```tsx
// Text input container
className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 shadow-xl shadow-black/30"

// Textarea
className="min-h-0 flex-1 resize-none bg-transparent text-sm text-white placeholder:text-slate-500 focus:outline-none"

// Form labels
className="text-sm font-medium text-slate-300"

// Helper text
className="text-xs text-slate-500"
```

### Typography

```tsx
// Headings
className="text-2xl font-semibold tracking-tight text-white"
className="text-lg font-medium text-white"

// Body text
className="text-sm text-slate-300 leading-relaxed"

// Muted/secondary
className="text-sm text-slate-500"
className="text-xs text-gray-500"

// Links
className="text-blue-400 hover:text-blue-300 transition-colors"
```

### Spacing & Layout

```tsx
// Standard padding: p-4, p-6
// Standard gaps: gap-2, gap-3, gap-4
// Border radius: rounded-lg (8px), rounded-xl (12px), rounded-2xl (16px), rounded-full

// Flex patterns
className="flex items-center justify-between"
className="flex flex-col gap-4"

// Max widths for content
className="max-w-[85%] sm:max-w-2xl"
```

### Shadows

```tsx
// Subtle
className="shadow-sm"

// Medium (cards)
className="shadow-lg shadow-black/40"

// Heavy (modals, popovers)
className="shadow-xl shadow-black/30"

// Glow effect
className="shadow-glow" // or: shadow-[0_0_20px_rgba(255,255,255,0.1)]
```

### States & Interactions

```tsx
// Hover
className="hover:bg-white/[0.04] hover:border-white/[0.12]"
className="hover:text-white"

// Disabled
className="disabled:opacity-50 disabled:pointer-events-none"

// Focus
className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"

// Loading
className="animate-spin" // for spinners
className="animate-pulse" // for skeletons

// Transitions
className="transition-all duration-200"
className="transition-colors"
className="transition-opacity"
```

### Colors Reference

```tsx
// Backgrounds
bg-black, bg-gray-950, bg-gray-900
bg-white/5, bg-white/10, bg-white/[0.02]

// Borders
border-white/10, border-white/[0.08], border-gray-800

// Text
text-white, text-slate-300, text-slate-400, text-slate-500, text-gray-500

// Accent (user actions, highlights)
bg-[#006cff], text-blue-400, from-blue-600/20

// Chart colors
#4f81ff (primary), #7db0ff (secondary), rgba(59,130,246,0.08) (gradient end)
```

### Chat-Specific Patterns

```tsx
// User message bubble
className="rounded-2xl bg-[#006cff] px-4 py-3 text-white shadow-lg shadow-black/40"

// AI message bubble
className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-gray-100 shadow-lg shadow-black/40"

// Avatar
className="h-9 w-9 rounded-full border border-white/10 bg-white/5 flex items-center justify-center"

// Timestamp
className="text-[11px] text-gray-500 transition-opacity group-hover:opacity-100"
```

### Modals & Dialogs

```tsx
// Overlay
className="fixed inset-0 bg-black/80 backdrop-blur-sm"

// Modal container
className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-white/10 bg-gray-950 p-6 shadow-xl shadow-black/50"

// Modal header
className="flex items-center justify-between border-b border-gray-800 pb-4"
```

### Tooltips & Popovers

```tsx
className="rounded-lg border border-white/10 bg-[#0f1728]/95 px-3 py-2 shadow-xl backdrop-blur-xl"
```

### Progress & Loading

```tsx
// Progress bar container
className="h-2.5 overflow-hidden rounded-full bg-white/10"

// Progress bar fill
className="h-full bg-gradient-to-r from-blue-400 via-indigo-400 to-blue-600 animate-pulse"

// Spinner container
className="h-9 w-9 flex items-center justify-center rounded-full bg-white/10"
```

### Scrollbars

```tsx
// Custom styled scrollbar
className="custom-scrollbar"

// Hidden scrollbar
className="scrollbar-hidden"
```

## Reference Components

When creating new components, reference these existing files:
- Buttons: `@frontend/src/components/ui/button.tsx`
- Cards: `@frontend/src/components/ui/card.tsx`
- Inputs: `@frontend/src/components/ui/input.tsx`
- Chat bubbles: `@frontend/src/components/chat/MessageBubble.tsx`
- Chat input: `@frontend/src/components/chat/ChatInput.tsx`
- Dashboard charts: `@frontend/src/components/dashboard/NetWorthProjection.tsx`
- Modals: `@frontend/src/components/modals/SettingsModal.tsx`
- Sidebar: `@frontend/src/components/sidebar/AppSidebar.tsx`

## Do's and Don'ts

**DO:**
- Use opacity-based colors (`bg-white/10` not `bg-gray-800`)
- Add transitions to interactive elements
- Use `cn()` for conditional classes
- Keep shadows dark (`shadow-black/30`)
- Use rounded corners generously (`rounded-lg`, `rounded-2xl`)

**DON'T:**
- Use light backgrounds (unless for contrast like hover states)
- Use sharp corners
- Forget backdrop-blur on glassmorphic elements
- Use colors outside the palette
- Skip hover/focus states on interactive elements
