export type ScenarioImpactKind = 'delta' | 'override' | 'start' | 'stop'
export type ScenarioTargetType = 'asset' | 'liability' | 'income' | 'expense' | 'cash' | 'investment'
export type ScenarioCadence = 'one_time' | 'weekly' | 'bi_weekly' | 'monthly' | 'quarterly' | 'semi_annual' | 'annual'

// UI verb type for sentence-builder pattern
export type ImpactVerb = 'increases_by' | 'decreases_by' | 'becomes' | 'starts_at' | 'ends'

// Convert UI verb to internal impactKind and normalize amount sign
export function verbToImpact(verb: ImpactVerb, amount: number): { impactKind: ScenarioImpactKind; amount: number } {
  switch (verb) {
    case 'increases_by':
      return { impactKind: 'delta', amount: Math.abs(amount) }
    case 'decreases_by':
      return { impactKind: 'delta', amount: -Math.abs(amount) }
    case 'becomes':
      return { impactKind: 'override', amount }
    case 'starts_at':
      return { impactKind: 'start', amount }
    case 'ends':
      return { impactKind: 'stop', amount: 0 }
  }
}

// Convert internal impactKind back to UI verb
export function impactToVerb(impactKind: ScenarioImpactKind, amount: number): ImpactVerb {
  switch (impactKind) {
    case 'delta':
      return amount >= 0 ? 'increases_by' : 'decreases_by'
    case 'override':
      return 'becomes'
    case 'start':
      return 'starts_at'
    case 'stop':
      return 'ends'
  }
}

// Wire DTO shapes (camelCase) for the Go API
export interface ScenarioImpactDto {
  targetType: ScenarioTargetType
  targetId?: string | null
  targetAssetId?: string | null
  targetLiabilityId?: string | null
  targetIncomeId?: string | null
  targetExpenseId?: string | null
  targetCashAccountId?: string | null
  targetInvestmentId?: string | null
  impactKind: ScenarioImpactKind
  amount: number
  currency: string
  cadence: ScenarioCadence
  startDate: string
  endDate?: string | null
  notes?: string | null
}

export interface ScenarioEventDto {
  id?: string
  name: string
  description?: string | null
  occursOn: string
  displayIcon?: string | null
  displayColor?: string | null
  tags: string[]
  scenarioId?: string | null
  isIncluded: boolean
  impacts: ScenarioImpactDto[]
}

// Frontend domain models (camelCase)
export interface ScenarioImpact {
  targetType: ScenarioTargetType
  targetId?: string
  impactKind: ScenarioImpactKind
  amount: number
  currency: string
  cadence: ScenarioCadence
  startMonth: string
  endMonth?: string
  notes?: string
}

export interface ScenarioEvent {
  id?: string
  name: string
  description?: string
  occursOn: string
  displayIcon?: string
  displayColor?: string
  tags: string[]
  scenarioId?: string
  isIncluded: boolean
  impacts: ScenarioImpact[]
}

const pickTargetFromDto = (dto: ScenarioImpactDto): { targetType: ScenarioTargetType; targetId?: string } => {
  const typed = [
    ['asset', dto.targetAssetId],
    ['liability', dto.targetLiabilityId],
    ['income', dto.targetIncomeId],
    ['expense', dto.targetExpenseId],
    ['cash', dto.targetCashAccountId],
    ['investment', dto.targetInvestmentId],
  ] as const

  const match = typed.find(([, id]) => Boolean(id?.trim()))
  if (match) {
    return { targetType: match[0] as ScenarioTargetType, targetId: match[1] ?? undefined }
  }

  return { targetType: dto.targetType, targetId: dto.targetId ?? undefined }
}

const mapTargetToDtoFields = (impact: ScenarioImpact): Pick<ScenarioImpactDto, 'targetType' | 'targetId' | 'targetAssetId' | 'targetLiabilityId' | 'targetIncomeId' | 'targetExpenseId' | 'targetCashAccountId' | 'targetInvestmentId'> => {
  const targetId = impact.targetId
  switch (impact.targetType) {
    case 'asset':
      return { targetType: 'asset', targetId, targetAssetId: targetId }
    case 'liability':
      return { targetType: 'liability', targetId, targetLiabilityId: targetId }
    case 'income':
      return { targetType: 'income', targetId, targetIncomeId: targetId }
    case 'expense':
      return { targetType: 'expense', targetId, targetExpenseId: targetId }
    case 'cash':
      return { targetType: 'cash', targetId, targetCashAccountId: targetId }
    case 'investment':
      return { targetType: 'investment', targetId, targetInvestmentId: targetId }
    default:
      return { targetType: impact.targetType, targetId }
  }
}

export const scenarioImpactFromDto = (dto: ScenarioImpactDto): ScenarioImpact => {
  const target = pickTargetFromDto(dto)

  return {
    targetType: target.targetType,
    targetId: target.targetId,
    impactKind: dto.impactKind,
    amount: dto.amount,
    currency: dto.currency,
    cadence: dto.cadence,
    startMonth: dto.startDate.slice(0, 7),
    endMonth: dto.endDate ? dto.endDate.slice(0, 7) : undefined,
    notes: dto.notes ?? undefined,
  }
}

export const scenarioImpactToDto = (impact: ScenarioImpact): ScenarioImpactDto => {
  const targetFields = mapTargetToDtoFields(impact)

  return {
    ...targetFields,
    impactKind: impact.impactKind,
    amount: impact.amount,
    currency: impact.currency,
    cadence: impact.cadence,
    startDate: impact.startMonth,
    endDate: impact.endMonth,
    notes: impact.notes,
  }
}

export const scenarioEventFromDto = (dto: ScenarioEventDto): ScenarioEvent => ({
  id: dto.id,
  name: dto.name,
  description: dto.description ?? undefined,
  occursOn: dto.occursOn,
  displayIcon: dto.displayIcon ?? undefined,
  displayColor: dto.displayColor ?? undefined,
  tags: dto.tags ?? [],
  scenarioId: dto.scenarioId ?? undefined,
  isIncluded: dto.isIncluded,
  impacts: Array.isArray(dto.impacts) ? dto.impacts.map(scenarioImpactFromDto) : [],
})

export const scenarioEventToDto = (event: ScenarioEvent): ScenarioEventDto => ({
  id: event.id,
  name: event.name,
  description: event.description,
  occursOn: event.occursOn,
  displayIcon: event.displayIcon,
  displayColor: event.displayColor,
  tags: event.tags ?? [],
  scenarioId: event.scenarioId,
  isIncluded: event.isIncluded,
  impacts: Array.isArray(event.impacts) ? event.impacts.map(scenarioImpactToDto) : [],
})
