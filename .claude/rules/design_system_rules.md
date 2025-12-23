# Design System Rules for Figma Integration

This document defines the design system patterns and conventions used in this codebase to help integrate Figma designs via the Model Context Protocol (MCP).

---

## 1. Token Definitions

### Location
- **Primary:** `frontend/src/styles/globals.css`
- **Secondary:** `frontend/src/index.css`
- **Tailwind Config:** `frontend/tailwind.config.js`

### Format & Structure
CSS custom properties in HSL format for dynamic theme switching:

```css
/* Light Mode (:root) */
:root {
  --background: 0 0% 100%;
  --foreground: 240 10% 3.9%;
  --primary: 240 5.9% 10%;
  --primary-foreground: 0 0% 98%;
  --border: 240 5.9% 90%;
  --chart-1: 12 76% 61%;
  --chart-2: 173 58% 39%;
  --chart-3: 197 37% 24%;
  --chart-4: 43 74% 66%;
  --chart-5: 27 87% 67%;
  --radius: 0.5rem;
}

/* Dark Mode (.dark) */
.dark {
  --background: 240 10% 3.9%;
  --foreground: 0 0% 98%;
  --primary: 0 0% 98%;
  --chart-1: 220 70% 50%;
}
```

### Figma Color Mapping

| Figma Token | CSS Variable | Tailwind Class |
|------------|--------------|----------------|
| Background | `--background` | `bg-background` |
| Foreground | `--foreground` | `text-foreground` |
| Primary | `--primary` | `bg-primary`, `text-primary` |
| Secondary | `--secondary` | `bg-secondary` |
| Destructive | `--destructive` | `bg-destructive` |
| Muted | `--muted` | `bg-muted`, `text-muted-foreground` |
| Accent | `--accent` | `bg-accent` |
| Border | `--border` | `border-border` |
| Chart Colors | `--chart-1` to `--chart-5` | `text-chart-1`, etc. |

### Landing Page Tokens
```css
.landing-wrapper {
  --landing-bg: #070B14;
  --landing-surface: #0C1119;
  --landing-gold: #C9A962;
  --landing-emerald: #10B981;
  --landing-rose: #F43F5E;
  --font-display: 'Cormorant Garamond', Georgia, serif;
  --font-body: 'DM Sans', system-ui, sans-serif;
}
```

### Opacity-Based Color System
All accent colors use opacity layers:
```
bg-emerald-500/15     // 15% opacity background
border-emerald-500/20 // 20% opacity border
bg-white/[0.02]       // 2% white overlay
border-white/[0.06]   // 6% white border
```

---

## 2. Component Library

### Location
`frontend/src/components/`

### Directory Structure
```
components/
├── ui/                    # Base UI primitives (button, card, input, modal)
├── dashboard/             # Dashboard-specific features
│   └── projections/       # Chart implementations
├── auth/                  # Authentication components
├── cpf/                   # CPF-specific modules
├── modals/                # Modal-based forms
├── landing-page/          # Landing page sections
├── chat/                  # Chat interface
└── timeline/              # Timeline visualization
```

### Component Architecture Pattern
Uses **Class Variance Authority (CVA)** for variant management:

```typescript
import { cva, type VariantProps } from "class-variance-authority"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  }
)
```

### Component Naming Conventions
- **Files:** PascalCase (`Dashboard.tsx`, `SettingsModal.tsx`)
- **Compound components:** Same file (`CardHeader`, `CardContent`, etc.)
- **Props interfaces:** `{ComponentName}Props` suffix

---

## 3. Frameworks & Libraries

### Core Stack
| Library | Version | Purpose |
|---------|---------|---------|
| React | 18.2.0 | UI framework |
| Next.js | 16.0.7 | App framework (Turbopack) |
| Tailwind CSS | 3.3.5 | Utility-first CSS |
| TypeScript | 5.2.2 | Type safety |

### Component Libraries
| Library | Purpose |
|---------|---------|
| Radix UI | Accessible primitives (dialog, slider, tabs, tooltip) |
| React Aria Components | Additional accessible components |
| Class Variance Authority | Variant management |
| clsx + tailwind-merge | Class name utilities |

### Charting
| Library | Purpose |
|---------|---------|
| Chart.js + react-chartjs-2 | Primary charting (new) |
| chartjs-plugin-zoom | Zoom/pan functionality |
| Recharts | Legacy charting |

### Animation
| Library | Purpose |
|---------|---------|
| Framer Motion | React animations |
| GSAP | Advanced animations |
| tailwindcss-animate | Tailwind animation utilities |

### Forms & Validation
| Library | Purpose |
|---------|---------|
| React Hook Form | Form state management |
| Zod | Schema validation |

### State Management
| Library | Purpose |
|---------|---------|
| @tanstack/react-query | Server state |
| zustand | Client state |

---

## 4. Asset Management

### Location
`frontend/src/assets/`

### Strategy
- **No public/ directory** - assets imported as modules
- **Build-time optimization** through Turbopack
- **SVG inlined** in CSS for backgrounds

### Font Loading
```typescript
// In layout.tsx
import { Geist, Geist_Mono } from 'next/font/google'

const geistSans = Geist({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-geist',
})
const geistMono = Geist_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-geist-mono',
})
```

### Additional Fonts (Google Fonts CDN)
- **Cormorant Garamond:** Display font for landing page
- **DM Sans:** Body font for landing page

---

## 5. Icon System

### Library
**Lucide React** v0.294.0

### Import Pattern
```typescript
import {
  X,
  ChevronDown,
  Settings,
  TrendingUp,
  ArrowLeft,
  Search,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Info
} from 'lucide-react'
```

### Size Convention
```typescript
// Standard sizes
<Icon className="h-3.5 w-3.5" />  // Extra small
<Icon className="h-4 w-4" />      // Small (most common)
<Icon className="h-5 w-5" />      // Medium
<Icon className="h-6 w-6" />      // Large
```

### Color Application
```typescript
// Primary
<Icon className="text-emerald-400" />
<Icon className="text-blue-400" />

// Secondary
<Icon className="text-slate-400" />
<Icon className="text-slate-500" />

// Muted
<Icon className="text-slate-600" />

// With opacity
<Icon className="text-blue-400/70" />
```

### Naming Convention
- PascalCase component names (e.g., `CheckCircle2`, `ChevronDown`)
- Matches Lucide's official naming

---

## 6. Styling Approach

### Methodology
**Utility-first with Tailwind CSS**

### Dark Mode
Class-based: `darkMode: ["class"]`

### Glassmorphic Design Pattern

**Glass Card:**
```tsx
<div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-xl">
```

**Glass Panel (from CSS):**
```css
.glass-panel {
  background: rgba(10, 10, 10, 0.6);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.08);
}
```

### Spacing System (8px Grid)
| Class | Value | Usage |
|-------|-------|-------|
| `gap-1` | 4px | Tight inline elements |
| `gap-2` | 8px | Related elements |
| `gap-3` | 12px | Form fields |
| `gap-4` | 16px | Section spacing |
| `gap-6` | 24px | Card content |
| `gap-8` | 32px | Major sections |

### Border Radius Scale
| Class | Value | Usage |
|-------|-------|-------|
| `rounded-lg` | 8px | Buttons, pills |
| `rounded-xl` | 12px | Inputs, containers |
| `rounded-2xl` | 16px | Cards, panels |
| `rounded-full` | 50% | Avatars |

### Text Color Hierarchy
```
text-white              // Primary headings
text-slate-300          // Secondary text
text-slate-400          // Labels, body
text-slate-500          // Muted descriptions
text-slate-600          // Very muted (limits)
text-slate-700          // Disabled
```

### Responsive Design
**Desktop-first approach**

Breakpoints: Tailwind defaults (sm, md, lg, xl, 2xl)

Example:
```tsx
<h1 className="text-4xl md:text-5xl">Heading</h1>
<nav className="hidden md:flex">Navigation</nav>
```

### Animation Utilities
```
transition-all duration-200
transition-colors
transition-opacity
transition-transform
```

### Framer Motion Patterns
```typescript
initial={{ opacity: 0, y: 20 }}
animate={{ opacity: 1, y: 0 }}
whileHover={{ y: -4 }}
```

---

## 7. Common Component Patterns

### Form Input
```tsx
<input
  className="w-full rounded-xl bg-white/[0.03] border border-white/[0.06] text-white text-sm py-2.5 px-3 focus:outline-none focus:border-white/20 focus:bg-white/[0.05] placeholder:text-slate-600"
/>
```

### Toggle Button Group
```tsx
<div className="flex items-center gap-1 p-1 bg-white/[0.02] border border-white/[0.06] rounded-xl">
  <button className="flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all duration-200 bg-emerald-500/15 text-emerald-400">
    Active
  </button>
  <button className="flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all duration-200 text-slate-400 hover:text-slate-300">
    Inactive
  </button>
</div>
```

### Chart Container
```tsx
<div className="rounded-xl bg-black/20 p-3">
  {/* Chart content */}
</div>
```

### Chart Styling
- Grid: `stroke="rgba(255,255,255,0.04)"`
- Axis: `stroke="#64748b"` (slate-500)
- Tooltip: `backgroundColor: 'rgba(15, 23, 40, 0.95)'` with blur

### Modal Pattern
```tsx
// Uses React Portal for rendering at document root
// Keyboard handling (Escape key)
// Focus management and scroll lock
// Accessibility features (aria-modal, role="dialog")
```

---

## 8. Figma-to-Code Translation Guide

### When Translating Figma Designs:

1. **Colors:** Map Figma fills to CSS variables or Tailwind opacity classes
2. **Spacing:** Use 8px grid system (`gap-2`, `gap-4`, etc.)
3. **Border Radius:** Match to scale (`rounded-lg`, `rounded-xl`, `rounded-2xl`)
4. **Shadows:** Use glassmorphic blur effects over traditional shadows
5. **Typography:** Map to text hierarchy (`text-white`, `text-slate-300`, etc.)
6. **Icons:** Use Lucide React with consistent sizing (`h-4 w-4`)
7. **Animations:** Apply standard transitions (`transition-all duration-200`)

### Key Principles:
- Always use opacity-based colors for overlays
- Apply backdrop blur for glassmorphic effects
- Maintain 8px spacing grid
- Use CVA for component variants
- Keep accessibility in mind (ARIA attributes, keyboard handling)

---

## 9. Project Structure

```
frontend/
├── src/
│   ├── app/              # Next.js app router
│   ├── components/       # React components (feature-based)
│   ├── lib/              # Utilities & helpers
│   ├── hooks/            # Custom React hooks
│   ├── contexts/         # React Context
│   ├── types/            # TypeScript definitions
│   ├── services/         # API services
│   ├── styles/           # Global CSS
│   └── assets/           # Static files
├── tailwind.config.js
├── postcss.config.js
├── tsconfig.json
└── next.config.js
```

### Path Alias
`@/*` maps to `./src/*`

```typescript
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
```
