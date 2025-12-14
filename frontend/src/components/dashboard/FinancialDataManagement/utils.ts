import * as LucideIcons from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { TimelineItem } from '@/types/timeline'
import type { ScenarioEvent, ScenarioTargetType } from '@/types/scenario'
import type { AppliedImpact } from './types'
import { formatCurrency } from '@/lib/format'

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
  _itemType: ScenarioTargetType,
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
