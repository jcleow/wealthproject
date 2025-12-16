import * as LucideIcons from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { TimelineItem } from '@/types/timeline'
import type { ScenarioEvent } from '@/types/scenario'
import type { AppliedImpact, FinancialCategory } from './types'
import { formatCurrency } from '@/lib/format'

/**
 * Common style classes for numeric/currency displays.
 * Uses monospace font with tabular numbers for proper alignment.
 */
export const numericStyles = {
  /** Standard numeric display - used for amounts in lists */
  base: 'font-mono tabular-nums text-sm text-slate-300',
  /** Slightly emphasized - used for row values */
  medium: 'font-mono tabular-nums text-sm font-medium text-slate-200',
  /** De-emphasized - used for secondary values */
  muted: 'font-mono tabular-nums text-sm text-slate-400',
} as const

// Icon lookup for scenario icons
export const iconLookup = Object.entries(LucideIcons).reduce<Record<string, LucideIcon>>((acc, [key, component]) => {
  if (key === 'default' || key === 'createLucideIcon') return acc
  const kebab = key
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/_/g, '-')
    .toLowerCase()
  acc[kebab] = component as LucideIcon
  return acc
}, {})

export function getIconByName(name: string): LucideIcon | undefined {
  if (!name) return undefined
  const normalized = name.toLowerCase()
  return iconLookup[normalized]
}

/** Helper to find scenario impacts for a financial item */
export function getAppliedImpacts(
  item: TimelineItem,
  _itemType: FinancialCategory,
  scenarioEvents: ScenarioEvent[]
): AppliedImpact[] {
  const applied = item.eventImpacts
  if (!applied || applied.length === 0) return []
  return applied.map((imp) => {
    const event = scenarioEvents.find((ev) => ev.id === imp.eventId) ?? null
    return { event, impact: imp }
  })
}

type ItemWithId = { id?: string; itemId?: string; parentId?: string } | TimelineItem | null | undefined

export function getItemId(entry: ItemWithId): string {
  if (!entry) return ''
  if ('id' in entry && entry.id) return entry.id
  if ('itemId' in entry && entry.itemId) return entry.itemId
  if ('parentId' in entry && entry.parentId) return entry.parentId
  return ''
}

export function getAnnualizationLabel(item: TimelineItem): string | null {
  const sourceAmount = item.sourceAmount
  const sourceFrequency = item.sourceFrequency
  if (!sourceAmount || !sourceFrequency || sourceFrequency === 'annual') return null
  return `Annualized from ${formatCurrency(Number(sourceAmount), 'en-US', '$')} ${sourceFrequency}`
}

export function sortItems(items: TimelineItem[], direction: 'asc' | 'desc', summarizeAmount: (item: TimelineItem) => number): TimelineItem[] {
  return [...items].sort((a, b) =>
    direction === 'desc' ? summarizeAmount(b) - summarizeAmount(a) : summarizeAmount(a) - summarizeAmount(b)
  )
}

/**
 * Calculates the actual year from selectedYear which can be either:
 * - An offset (0, 1, 2, etc.) when < 1900
 * - An actual year (2025, 2026, etc.) when >= 1900
 *
 * @param selectedYear - Either an offset from anchorYear or an actual year
 * @param anchorYear - The base year (defaults to current year if not provided)
 * @returns The actual year
 */
export function calculateActualYear(selectedYear: number, anchorYear?: number | null): number {
  const baseYear = anchorYear ?? new Date().getFullYear()
  return selectedYear >= 1900 ? selectedYear : baseYear + selectedYear
}

/**
 * Calculates the end date for stopping an allocation.
 * Returns the last day of the month BEFORE the specified month/year.
 *
 * @param selectedYear - Either an offset from anchorYear or an actual year
 * @param selectedMonth - Month (1-12, where 1 = January) - matches timeline data format
 * @param anchorYear - The base year (defaults to current year if not provided)
 * @returns ISO 8601 date string for the last day of the previous month
 */
export function calculateAllocationEndDate(
  selectedYear: number,
  selectedMonth: number,
  anchorYear?: number | null
): string {
  const targetYear = calculateActualYear(selectedYear, anchorYear)
  // Convert 1-indexed month to 0-indexed for JavaScript Date, then go back one day
  const targetDate = new Date(targetYear, selectedMonth - 1, 1)
  targetDate.setDate(0) // Goes to last day of previous month
  targetDate.setHours(23, 59, 59, 0)
  return targetDate.toISOString()
}
