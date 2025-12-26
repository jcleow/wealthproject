# Assetra Design System

A comprehensive guide for building consistent, premium UI components across the application.

## Core Principles

1. **8px Spacing Grid** - All spacing values are multiples of 8px
2. **Desktop-First** - Optimize for side-by-side layouts, then adapt for mobile
3. **Dark Glassmorphic** - Semi-transparent surfaces with subtle blur
4. **Consistent Typography** - Fixed type scale (xs/sm/base/lg/xl)
5. **Unified Radius** - 8px, 12px, 16px for different component scales

---

## Spacing System

Use Tailwind's spacing scale in 8px increments:

| Token | Value | Usage |
|-------|-------|-------|
| `gap-1` | 4px | Tight inline elements |
| `gap-2` | 8px | Related elements |
| `gap-3` | 12px | Form fields |
| `gap-4` | 16px | Section spacing |
| `gap-6` | 24px | Card content |
| `gap-8` | 32px | Major sections |

```tsx
// Card content
<div className="p-6 space-y-6">

// Form fields
<div className="grid grid-cols-2 gap-4">

// Section spacing
<div className="space-y-8">
```

---

## Color Palette

### Backgrounds
```tsx
bg-gray-950        // Page background
bg-white/[0.02]    // Card surface
bg-white/[0.03]    // Input background
bg-white/[0.04]    // Hover state / progress bars
bg-black/20        // Chart containers
```

### Borders
```tsx
border-white/[0.04]  // Subtle dividers
border-white/[0.06]  // Card borders
border-white/[0.08]  // Dashed borders
border-white/[0.12]  // Hover state
border-white/20      // Focus state
```

### Text
```tsx
text-white         // Primary headings
text-slate-300     // Secondary text, values
text-slate-400     // Labels, body text
text-slate-500     // Muted text, descriptions
text-slate-600     // Very muted (limits, hints)
text-slate-700     // Disabled text
```

### Accent Colors
```tsx
// Success / Positive
text-emerald-400
bg-emerald-500/15
border-emerald-500/20
bg-gradient-to-r from-emerald-500 to-emerald-400

// Info / Primary
text-blue-400
bg-blue-500/15
border-blue-500/20
bg-gradient-to-r from-blue-500 to-blue-400

// Warning
text-amber-400
bg-amber-500/15
bg-gradient-to-r from-amber-500 to-amber-400

// Error / Negative
text-red-400
bg-gradient-to-r from-red-500 to-red-400
```

### Property Type Colors (Gradients)
```tsx
// HDB Resale - Rose
from-rose-500/20 to-rose-600/5
text-rose-400

// HDB BTO - Violet
from-violet-500/20 to-violet-600/5
text-violet-400

// Executive Condo - Teal
from-teal-500/20 to-teal-600/5
text-teal-400

// Private Resale - Amber
from-amber-500/20 to-amber-600/5
text-amber-400

// Private New - Sky
from-sky-500/20 to-sky-600/5
text-sky-400
```

---

## Typography Scale

```tsx
// Page titles
text-4xl md:text-5xl font-semibold tracking-tight

// Section headings
text-2xl font-semibold tracking-tight

// Card headings
text-lg font-semibold

// Subheadings
text-sm font-medium

// Body text
text-sm text-slate-400 leading-relaxed

// Labels
text-xs font-medium text-slate-400

// Small text / hints
text-xs text-slate-500

// Tiny text (limits, badges)
text-[10px] text-slate-600
```

---

## Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| `rounded-lg` | 8px | Buttons, small pills |
| `rounded-xl` | 12px | Inputs, inner containers |
| `rounded-2xl` | 16px | Cards, panels |
| `rounded-full` | 50% | Avatars, indicators |

---

## Component Patterns

### Glass Card
```tsx
<div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-xl">
  {/* content */}
</div>
```

### Glass Card with Header
```tsx
<div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-xl overflow-hidden">
  <div className="px-6 py-4 border-b border-white/[0.04]">
    <h4 className="text-sm font-medium text-white">Card Title</h4>
    <p className="text-xs text-slate-500 mt-0.5">Description</p>
  </div>
  <div className="p-6">
    {/* content */}
  </div>
</div>
```

### Form Input
```tsx
<div className="space-y-1.5">
  <label className="text-xs font-medium text-slate-400 block">Label</label>
  <div className="relative">
    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm font-medium">
      $
    </span>
    <input
      type="text"
      className={cn(
        "w-full rounded-xl bg-white/[0.03] border border-white/[0.06] text-white text-sm",
        "py-2.5 pl-7 pr-3 transition-all duration-200",
        "focus:outline-none focus:border-white/20 focus:bg-white/[0.05]",
        "placeholder:text-slate-600"
      )}
    />
  </div>
</div>
```

### Select Dropdown
```tsx
<select
  className="w-full rounded-xl bg-white/[0.03] border border-white/[0.06] text-white text-sm py-2.5 px-3 focus:outline-none focus:border-white/20 appearance-none cursor-pointer transition-colors"
  style={{
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2394a3b8'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 0.75rem center',
    backgroundSize: '1rem'
  }}
>
  <option>Option 1</option>
</select>
```

### Toggle Button Group
```tsx
<div className="flex items-center gap-1 p-1 bg-white/[0.02] border border-white/[0.06] rounded-xl">
  <button
    className={cn(
      "flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all duration-200",
      isActive
        ? "bg-emerald-500/15 text-emerald-400 shadow-sm"
        : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.03]"
    )}
  >
    Option A
  </button>
  <button className="...">Option B</button>
</div>
```

### Pill / Badge Button
```tsx
<button
  className={cn(
    "px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-200",
    isSelected
      ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"
      : "bg-white/[0.02] text-slate-500 hover:text-slate-300 hover:bg-white/[0.04] border border-white/[0.04]"
  )}
>
  Badge
</button>
```

### Progress Bar
```tsx
<div className="h-2 rounded-full bg-white/[0.04] overflow-hidden">
  <div
    className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-500"
    style={{ width: `${percentage}%` }}
  />
</div>
```

### Stacked Progress Bar
```tsx
<div className="h-2.5 rounded-full overflow-hidden bg-white/[0.04] flex">
  <div
    className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400"
    style={{ width: `${segment1}%` }}
  />
  <div
    className="h-full bg-gradient-to-r from-amber-500 to-amber-400"
    style={{ width: `${segment2}%` }}
  />
</div>
```

### Legend Item
```tsx
<div className="flex items-center gap-1.5">
  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
  <span className="text-slate-400 text-xs">
    $1,000 <span className="text-slate-500">Label</span>
  </span>
</div>
```

### Dashed Add Button
```tsx
<button className="w-full py-2.5 rounded-xl border border-dashed border-white/[0.08] hover:border-white/[0.15] text-slate-500 hover:text-slate-300 text-xs font-medium transition-all duration-200">
  + Add item
</button>
```

### Table
```tsx
<div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-xl overflow-hidden">
  <div className="overflow-x-auto">
    <table className="w-full text-xs">
      <thead>
        <tr className="text-slate-500 border-b border-white/[0.04]">
          <th className="text-left px-6 py-3 font-medium">Column</th>
        </tr>
      </thead>
      <tbody>
        <tr className="border-b border-white/[0.03] transition-colors hover:bg-white/[0.02]">
          <td className="px-6 py-3 text-white">Value</td>
        </tr>
      </tbody>
    </table>
  </div>
</div>
```

### Breadcrumb
```tsx
<div className="flex items-center gap-2 text-sm">
  <Link href="/dashboard" className="text-slate-500 hover:text-slate-300 transition-colors font-medium">
    Dashboard
  </Link>
  <span className="text-slate-700">/</span>
  <span className="text-slate-300 font-medium">Current Page</span>
</div>
```

### Icon Button
```tsx
<button className="p-2 rounded-xl bg-white/[0.03] border border-white/[0.06] text-slate-400 hover:text-white hover:bg-white/[0.06] transition-all">
  <ArrowLeft className="w-5 h-5" />
</button>
```

---

## Chart Styling

### Chart Container
```tsx
<div className="rounded-xl bg-black/20 p-3" style={{ minHeight: 220 }}>
  <ResponsiveContainer width="100%" height={200}>
    {/* chart */}
  </ResponsiveContainer>
</div>
```

### Chart Colors
```tsx
// Grid
stroke="rgba(255,255,255,0.04)"

// Axis
stroke="#64748b"
fontSize={10}

// Tooltip
contentStyle={{
  backgroundColor: 'rgba(15, 23, 40, 0.95)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '12px',
  backdropFilter: 'blur(12px)',
}}

// Area gradient
<linearGradient id="gradient" x1="0" x2="0" y1="0" y2="1">
  <stop offset="5%" stopColor="#60A5FA" stopOpacity={0.5} />
  <stop offset="95%" stopColor="#60A5FA" stopOpacity={0.02} />
</linearGradient>

// Bar colors
fill="rgba(59, 130, 246, 0.6)"   // Principal (blue)
fill="rgba(248, 113, 113, 0.7)" // Interest (red)
```

---

## Page Layout

### Full Page with Gradient Background
```tsx
<div className="min-h-screen bg-gray-950">
  {/* Gradient backgrounds */}
  <div className="fixed inset-0 bg-gradient-to-br from-gray-950 via-gray-950 to-gray-900" />
  <div className="fixed inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(59,130,246,0.08),transparent)]" />

  <div className="relative z-10">
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* content */}
    </div>
  </div>
</div>
```

### Two-Column Layout
```tsx
<div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
  <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-xl p-6">
    {/* Left panel */}
  </div>
  <div>
    {/* Right panel */}
  </div>
</div>
```

### Card Grid
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  {items.map(item => (
    <Card key={item.id} />
  ))}
</div>
```

---

## Animation & Transitions

### Standard Transitions
```tsx
transition-all duration-200     // General
transition-colors               // Color changes only
transition-opacity              // Fade effects
transition-transform            // Scale/translate
```

### Framer Motion Patterns
```tsx
// Page enter
initial={{ opacity: 0, y: 20 }}
animate={{ opacity: 1, y: 0 }}
exit={{ opacity: 0 }}

// Card hover
whileHover={{ y: -4, transition: { duration: 0.2 } }}
whileTap={{ scale: 0.98 }}

// Expand/collapse
initial={{ opacity: 0, height: 0 }}
animate={{ opacity: 1, height: 'auto' }}
exit={{ opacity: 0, height: 0 }}
transition={{ duration: 0.2 }}
```

---

## Accessibility

- Always provide `focus:outline-none focus:border-white/20` for focusable elements
- Use `aria-label` for icon-only buttons
- Ensure sufficient color contrast (slate-400 on dark backgrounds)
- Use semantic HTML elements (`<button>`, `<label>`, `<table>`)

---

## Do's and Don'ts

### Do
- Use opacity-based colors (`bg-white/[0.02]` not `bg-gray-900`)
- Add transitions to all interactive elements
- Use `cn()` utility for conditional classes
- Keep shadows dark (`shadow-black/40`)
- Use rounded corners generously
- Maintain consistent spacing (8px grid)

### Don't
- Use light backgrounds (except hover states)
- Use sharp corners on cards
- Forget backdrop-blur on glassmorphic elements
- Use colors outside the palette
- Skip hover/focus states
- Mix spacing values outside the 8px grid
- Use arbitrary pixel values (use Tailwind tokens)

---

## File References

When creating new components, reference these existing implementations:

- **Cards**: `src/app/property-planner/page.tsx` - PropertyCard, ResultsPanel
- **Forms**: `src/app/property-planner/page.tsx` - MortgageForm, FormInput
- **Tables**: `src/app/property-planner/page.tsx` - AmortizationTable
- **Charts**: `src/app/property-planner/page.tsx` - AmortizationChart
- **Chat UI**: `src/components/chat/MessageBubble.tsx`, `ChatInput.tsx`
- **Buttons**: `src/components/ui/button.tsx`
- **Modals**: `src/components/modals/SettingsModal.tsx`
