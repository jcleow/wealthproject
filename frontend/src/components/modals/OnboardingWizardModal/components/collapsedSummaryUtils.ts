import { formatCurrency } from '@/lib/format'

/** Frequency → short display suffix mapping */
const FREQUENCY_SUFFIXES: Record<string, string> = {
  weekly: '/wk',
  biweekly: '/2wk',
  monthly: '/mo',
  quarterly: '/qtr',
  annual: '/yr',
}

/**
 * Returns the left-side label: "Name · Category"
 */
export function formatCollapsedLabel(name: string, categoryLabel: string): string {
  const displayName = name || 'Untitled'
  return `${displayName} · ${categoryLabel}`
}

/**
 * Returns the right-side amount: "$5,000/mo" or "—"
 */
export function formatCollapsedAmount(amount: number, frequency: string): string {
  const suffix = FREQUENCY_SUFFIXES[frequency] ?? '/mo'
  return amount > 0 ? `${formatCurrency(amount)}${suffix}` : '—'
}
