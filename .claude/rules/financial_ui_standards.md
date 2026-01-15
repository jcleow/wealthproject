# Financial UI Standards - CRITICAL

You are designing a financial application that must be readable on:
- Dark mode laptops
- Bright daylight screens
- 13–14" MacBooks
- Mobile phones

These rules are **NON-NEGOTIABLE** across ALL screens, components, charts, and text.

---

## 1. COLOR CONTRAST RULES (NO WASHED-OUT UI)

### Never use:
- Low-contrast greys
- Faint greens
- Muted yellows
- Pastel text on dark backgrounds

### Contrast requirements:
- All foreground text: **WCAG AA (≥ 4.5:1)**
- Primary labels and numbers: **WCAG AAA (≥ 7:1)**

### On dark backgrounds:
| Element | Color Range |
|---------|-------------|
| Body text | `#EDEDED` to `#FFFFFF` |
| Secondary labels | `#B5B5B5` or brighter |
| Borders | At least `#3A3A3A` |
| Card backgrounds | Minimum 10% brightness difference from page |

### Never combine:
- Grey text on dark grey
- Green text on black
- Yellow on dark green

**All financial numbers must be high-contrast and legible.**

---

## 2. FONT SIZE & DENSITY RULES

This is NOT a marketing site — it is a **financial dashboard**.

### Minimum sizes:
| Element | Size |
|---------|------|
| Primary numbers | **24px** (`text-2xl`) |
| Section headers | **18–20px** (`text-lg` to `text-xl`) |
| Table values | **16px** (`text-base`) |
| Labels | **14–15px** (`text-sm`) - never smaller |

### Never use:
- 12px fonts (`text-xs`)
- Thin font weights for data
- Condensed typography

**All money, percentages, and dates must be readable at a glance.**

---

## 3. INFORMATION HIERARCHY

Every screen must have:
1. **One dominant primary number** (largest)
2. **Secondary metrics** (clearly smaller but still readable)
3. **Labels that never visually compete with data**

Do not compress dashboards for aesthetic minimalism.
**Clarity > minimalism.**

---

## 4. COLOR MEANING

Use color only when it conveys meaning:

| Color | Meaning |
|-------|---------|
| Green | Gain, positive |
| Red | Loss, negative |
| Blue | Neutral/system |
| Yellow | Warning/attention |

**Never use color purely decoratively on data.**

---

## 5. FINANCIAL UI STANDARD

This UI must feel closer to:
- Bloomberg
- Stripe dashboards
- Trading terminals
- Accounting software

**NOT:**
- Dribbble shots
- Crypto landing pages
- Notion
- Faded SaaS dashboards
- Pastel fintech

**Prioritize legibility, contrast, and scannability over aesthetic softness.**

---

## Tailwind Quick Reference

### Text colors (high contrast on dark):
```
Primary text:     text-white or text-gray-100
Secondary text:   text-gray-300 (#D1D5DB)
Tertiary text:    text-gray-400 (#9CA3AF) - minimum for labels
```

### Font sizes:
```
Primary numbers:  text-2xl (24px) or text-3xl (30px)
Section headers:  text-lg (18px) or text-xl (20px)
Table values:     text-base (16px)
Labels:           text-sm (14px) - MINIMUM
```

### Font weights for financial data:
```
Primary values:   font-semibold or font-bold
Secondary values: font-medium
Labels:           font-medium (not font-normal)
```
