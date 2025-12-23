# Finebank Design System Tokens

Extracted from Figma file: **FIneback-Trial**

## Color Palette

### Brand Colors
| Token | Value | Usage |
|-------|-------|-------|
| `primary` | `#299D91` | Buttons, active states, accents |
| `secondary` | `#525256` | Secondary text, icons |

### Gray Scale
| Token | Value | Usage |
|-------|-------|-------|
| `gray.01` | `#666666` | Dark gray text |
| `gray.02` | `#878787` | Section headers, muted text |
| `gray.03` | `#9F9F9F` | Placeholder text, tertiary |
| `gray.04` | `#D1D1D1` | Disabled states |
| `gray.05` | `#E8E8E8` | Borders, dividers |
| `gray.06` | `#F3F3F3` | Light borders |

### Base Colors
| Token | Value | Usage |
|-------|-------|-------|
| `black` | `#191919` | Headings, primary text |
| `white` | `#FFFFFF` | Backgrounds, inverse text |

### Special Colors
| Token | Value | Usage |
|-------|-------|-------|
| `special.red` | `#E73D1C` | Error, negative change |
| `special.green` | `#4DAF6E` | Success, positive change |
| `special.mainBg` | `#F4F5F7` | Page background |
| `special.bg` | `rgba(210,210,210,0.25)` | Icon backgrounds |

---

## Typography

### Font Family
- **Primary**: `Inter` (all UI text)
- **Logo**: `Poppins` (brand name only)

### Type Scale
| Token | Size | Weight | Line Height | Usage |
|-------|------|--------|-------------|-------|
| `header-22-32` | 22px | Regular (400) | 32px | Section titles |
| `exbold-22-32` | 22px | ExtraBold (800) | 32px | Large numbers, amounts |
| `bold-24-28` | 24px | Bold (700) | 28px | Page titles |
| `bold-16-24` | 16px | Bold (700) | 24px | Card titles, emphasis |
| `semibold-16-24` | 16px | SemiBold (600) | 24px | Nav items, labels |
| `regular-16-24` | 16px | Regular (400) | 24px | Body text |
| `medium-14-20` | 14px | Medium (500) | 20px | Secondary labels |
| `regular-14-20` | 14px | Regular (400) | 20px | Descriptions |
| `medium-12-16` | 12px | Medium (500) | 16px | Captions, tags |
| `regular-12-16` | 12px | Regular (400) | 16px | Helper text |

---

## Shadows

| Token | Value | Usage |
|-------|-------|-------|
| `shadow-01` | `0px 20px 25px rgba(76,103,100,0.1)` | Cards |
| `shadow-search` | `0px 26px 26px rgba(106,22,58,0.04)` | Search bar |

---

## Spacing

Based on 4px grid system:
- `4px` - Tight spacing
- `8px` - Small gaps
- `12px` - Component padding
- `16px` - Standard spacing
- `20px` - Card padding
- `24px` - Section gaps
- `32px` - Large gaps
- `40px` - Section spacing
- `48px` - Page margins

---

## Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| `sm` | `4px` | Buttons, tags |
| `md` | `8px` | Cards, inputs |
| `lg` | `12px` | Search bar |
| `xl` | `16px` | Modals |
| `full` | `9999px` | Avatars, pills |

---

## Usage in Code

```tsx
import { colors, typography, shadows } from '@/styles/finebank-tokens'

// Use colors
<div style={{ backgroundColor: colors.primary }}>

// Use typography
<p style={{ ...typography['bold-16-24'], color: colors.black }}>

// Use shadows
<div style={{ boxShadow: shadows['shadow-01'] }}>
```

---

## Figma to Code Mapping

When building components from Figma:
1. Match colors to `colors.*` tokens
2. Match text styles to `typography.*` tokens
3. Match shadows to `shadows.*` tokens
4. Use semantic tokens for contextual styling

This ensures consistency between Figma designs and code.
