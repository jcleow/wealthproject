// Re-export scenario validation and impact expansion functions from their new location
// These were moved to ScenarioEventModal/logic/ for better colocation with the modal component
export { validateScenarioEvent } from '@/components/modals/ScenarioEventModal/logic/impactValidation'
export type { ValidationResult, ValidateScenarioEventParams, FinancialItem } from '@/components/modals/ScenarioEventModal/logic/impactValidation'

export { expandImpactsForPayload } from '@/components/modals/ScenarioEventModal/logic/impactExpansion'
export type { ExpandImpactsParams } from '@/components/modals/ScenarioEventModal/logic/impactExpansion'
