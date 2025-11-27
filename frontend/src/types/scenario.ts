export type ScenarioImpactKind = 'delta' | 'override' | 'start' | 'stop'
export type ScenarioTargetType = 'asset' | 'liability' | 'income' | 'expense'
export type ScenarioCadence = 'one_time' | 'monthly' | 'annual'

// Wire DTO shapes (snake_case) returned by the Go API
export interface ScenarioImpactDto {
  target_type: ScenarioTargetType
  target_id?: string | null
  impact_kind: ScenarioImpactKind
  amount: number
  currency: string
  cadence: ScenarioCadence
  start_month: string
  end_month?: string | null
  notes?: string | null
}

export interface ScenarioEventDto {
  id?: string
  name: string
  description?: string | null
  occurs_on: string
  display_icon?: string | null
  display_color?: string | null
  tags: string[]
  scenario_id?: string | null
  is_included: boolean
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

export const scenarioImpactFromDto = (dto: ScenarioImpactDto): ScenarioImpact => ({
  targetType: dto.target_type,
  targetId: dto.target_id ?? undefined,
  impactKind: dto.impact_kind,
  amount: dto.amount,
  currency: dto.currency,
  cadence: dto.cadence,
  startMonth: dto.start_month.slice(0, 7),
  endMonth: dto.end_month ? dto.end_month.slice(0, 7) : undefined,
  notes: dto.notes ?? undefined,
})

export const scenarioImpactToDto = (impact: ScenarioImpact): ScenarioImpactDto => ({
  target_type: impact.targetType,
  target_id: impact.targetId,
  impact_kind: impact.impactKind,
  amount: impact.amount,
  currency: impact.currency,
  cadence: impact.cadence,
  start_month: impact.startMonth,
  end_month: impact.endMonth,
  notes: impact.notes,
})

export const scenarioEventFromDto = (dto: ScenarioEventDto): ScenarioEvent => ({
  id: dto.id,
  name: dto.name,
  description: dto.description ?? undefined,
  occursOn: dto.occurs_on,
  displayIcon: dto.display_icon ?? undefined,
  displayColor: dto.display_color ?? undefined,
  tags: dto.tags ?? [],
  scenarioId: dto.scenario_id ?? undefined,
  isIncluded: dto.is_included,
  impacts: Array.isArray(dto.impacts) ? dto.impacts.map(scenarioImpactFromDto) : [],
})

export const scenarioEventToDto = (event: ScenarioEvent): ScenarioEventDto => ({
  id: event.id,
  name: event.name,
  description: event.description,
  occurs_on: event.occursOn,
  display_icon: event.displayIcon,
  display_color: event.displayColor,
  tags: event.tags ?? [],
  scenario_id: event.scenarioId,
  is_included: event.isIncluded,
  impacts: Array.isArray(event.impacts) ? event.impacts.map(scenarioImpactToDto) : [],
})
