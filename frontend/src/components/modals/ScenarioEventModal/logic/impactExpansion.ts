import type { ScenarioImpact } from '@/types/scenario'
import { impactToVerb } from '@/types/scenario'

export interface ExpandImpactsParams {
  impacts: ScenarioImpact[]
  occursOn: string
  selectedItemId: Record<number, string | undefined>
  newItemNames: Record<number, string>
  resolveStableTargetId: (targetType: string, targetId?: string) => string | undefined
}

/**
 * Expands form impacts into the final payload format for the API.
 * Pure function - no side effects.
 *
 * Handles:
 * - Setting default currency
 * - Normalizing start month
 * - Processing 'starts_at' verb (new items with name in notes)
 * - Resolving target IDs to stable IDs
 */
export function expandImpactsForPayload({
  impacts,
  occursOn,
  selectedItemId,
  newItemNames,
  resolveStableTargetId,
}: ExpandImpactsParams): ScenarioImpact[] {
  const expandedImpacts: ScenarioImpact[] = []

  impacts.forEach((impact, index) => {
    const verb = impactToVerb(impact.impactKind, impact.amount)
    const baseImpact: ScenarioImpact = {
      ...impact,
      amount: Number(impact.amount) || 0,
      currency: 'SGD',
      startMonth: impact.startMonth || occursOn.slice(0, 7),
    }

    if (verb === 'starts_at') {
      // For new items, store the name in notes
      const itemName = newItemNames[index]?.trim() || ''
      expandedImpacts.push({
        ...baseImpact,
        notes: itemName ? `New: ${itemName}${baseImpact.notes ? ` - ${baseImpact.notes}` : ''}` : baseImpact.notes,
      })
    } else {
      const targetId = selectedItemId[index]
      if (!targetId) {
        // No selection - try to use existing targetId normalized to stable id
        const stable = resolveStableTargetId(impact.targetType, impact.targetId)
        expandedImpacts.push({ ...baseImpact, targetId: stable })
      } else {
        expandedImpacts.push({ ...baseImpact, targetId })
      }
    }
  })

  return expandedImpacts
}
