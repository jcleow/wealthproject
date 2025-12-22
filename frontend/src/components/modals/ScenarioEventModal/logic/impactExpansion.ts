import type { ScenarioImpact } from '@/types/scenario'
import { impactToVerb } from '@/types/scenario'

export interface ExpandImpactsParams {
  impacts: ScenarioImpact[]
  occursOn: string
  selectedItemId: Record<number, string | undefined>
  newItemNames: Record<number, string>
  resolveStableTargetId: (targetType: string, parentId?: string) => string | undefined
}

/**
 * Expands form impacts into the final payload format for the API.
 * Pure function - no side effects.
 *
 * Handles:
 * - Setting default currency
 * - Normalizing start month
 * - Processing 'starts_at' verb (new items with name - no parentId needed)
 * - Resolving parent IDs to stable IDs for delta/override/stop impacts
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
      // For new items (start impacts), set the name field for the created financial item
      // No parentId needed - backend creates the item
      const itemName = newItemNames[index]?.trim() || ''
      expandedImpacts.push({
        ...baseImpact,
        name: itemName || baseImpact.name,  // Store name in the name field
        parentId: undefined,  // Start impacts must NOT have parentId (they create new items)
        // Keep notes separate (don't duplicate name in notes)
      })
    } else {
      // For delta/override/stop impacts, resolve the parentId
      const parentId = selectedItemId[index]
      if (!parentId) {
        // No selection - try to use existing parentId normalized to stable id
        const stable = resolveStableTargetId(impact.targetType, impact.parentId)
        expandedImpacts.push({ ...baseImpact, parentId: stable })
      } else {
        expandedImpacts.push({ ...baseImpact, parentId })
      }
    }
  })

  return expandedImpacts
}
