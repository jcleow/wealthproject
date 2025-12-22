import type { ScenarioImpact } from '@/types/scenario'
import { impactToVerb } from '@/types/scenario'
import { GROWTH_RATE_MIN_PERCENT, GROWTH_RATE_MAX_PERCENT } from '../components/impactConfig'

export type FinancialItem = { id: string; name: string; amount: number; frequency?: string }

export interface ValidationResult {
  valid: boolean
  error?: string
}

export interface ValidateScenarioEventParams {
  name: string
  occursOn: string
  displayIcon: string
  impacts: ScenarioImpact[]
  selectedItemId: Record<number, string | undefined>
  newItemNames: Record<number, string>
  getItemsForType: (targetType: string) => FinancialItem[]
  getTargetTypeLabel: (targetType: string) => string
}

/**
 * Validates a scenario event form before submission.
 * Pure function - no side effects.
 */
export function validateScenarioEvent({
  name,
  occursOn,
  displayIcon,
  impacts,
  selectedItemId,
  newItemNames,
  getItemsForType,
  getTargetTypeLabel,
}: ValidateScenarioEventParams): ValidationResult {
  if (!name.trim()) {
    return { valid: false, error: 'Name is required.' }
  }

  if (!occursOn) {
    return { valid: false, error: 'Occurs on date is required.' }
  }

  if (!displayIcon.trim()) {
    return { valid: false, error: 'Icon is required.' }
  }

  if (impacts.length === 0) {
    return { valid: false, error: 'Add at least one impact to save this event.' }
  }

  // Validate item selection and new item names for each impact
  for (let i = 0; i < impacts.length; i++) {
    const impact = impacts[i]
    const verb = impactToVerb(impact.impactKind, impact.amount)
    const items = getItemsForType(impact.targetType)

    if (verb === 'starts_at') {
      // Require name for new items
      if (!newItemNames[i]?.trim()) {
        return {
          valid: false,
          error: `Impact ${i + 1}: Please provide a name for the new ${getTargetTypeLabel(impact.targetType)}.`,
        }
      }
    } else {
      // Require an item to be selected (only if items exist)
      const selected = selectedItemId[i]
      if (items.length > 0 && !selected) {
        return {
          valid: false,
          error: `Impact ${i + 1}: Please select a ${getTargetTypeLabel(impact.targetType)} to affect.`,
        }
      }
    }

    // Validate growth rate for percentage delta impacts
    // A percentage delta has amount === 0 and growthRate set (growthRate can be negative for decreases)
    const isPercentageDelta = impact.impactKind === 'delta' && impact.amount === 0 && impact.growthRate !== undefined
    if (isPercentageDelta) {
      const rate = impact.growthRate!
      if (rate < GROWTH_RATE_MIN_PERCENT || rate > GROWTH_RATE_MAX_PERCENT) {
        return {
          valid: false,
          error: `Impact ${i + 1}: Percentage must be between ${GROWTH_RATE_MIN_PERCENT}% and ${GROWTH_RATE_MAX_PERCENT}%.`,
        }
      }
    }
  }

  return { valid: true }
}
