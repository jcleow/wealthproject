// Impact kinds for scenario impacts
export enum ImpactKind {
  Delta = 'delta',
  Override = 'override',
  Start = 'start',
  Stop = 'stop',
}

// Target types for scenario impacts
export enum TargetType {
  Asset = 'asset',
  Liability = 'liability',
  Income = 'income',
  Expense = 'expense',
  Cash = 'cash',
  Investment = 'investment',
}

// Legacy type aliases for backwards compatibility
export type ScenarioImpactKind = `${ImpactKind}`
export type ScenarioTargetType = `${TargetType}`

// Cadence for delta impacts (recurring): monthly or annual
// Override, stop, and start impacts are implicitly one-time (cadence is ignored in processing)
export type ScenarioCadence = 'monthly' | 'annual'

// Default cadence for recurring impacts - explicitly named to indicate it's monthly
export const DEFAULT_MONTHLY_CADENCE: ScenarioCadence = 'monthly'

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
  impactKind: ScenarioImpactKind
  targetType: ScenarioTargetType
  parentId?: string | null  // Required for delta/override/stop (ID of existing item to modify)
  amount?: string | null  // Amount as string for decimal precision (optional for stop impacts)
  currency: string
  cadence: ScenarioCadence | ItemFrequency  // For start impacts, uses ItemFrequency (includes one_time)
  startDate: string
  endDate?: string | null
  name?: string | null       // Name for start impacts (creates new item with this name)
  frequency?: string | null  // Frequency for income/expense items
  notes?: string | null
  // Advanced fields for start impacts
  category?: string | null
  growthRate?: number | null
  growthStrategy?: string | null
  // Liability-specific fields for start impacts
  interestRate?: number | null    // APR % for liabilities
  minimumPayment?: number | null  // Min payment for liabilities
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

// Frequency for created financial items (used by start impacts)
export enum Frequency {
  OneTime = 'one_time',
  Monthly = 'monthly',
  Annual = 'annual',
}

// Legacy type alias for backwards compatibility
export type ItemFrequency = `${Frequency}`

// Growth strategy options for income/expense
export type GrowthStrategy = 'none' | 'annual_step' | 'compound'

// Frontend domain models (camelCase)
export interface ScenarioImpact {
  impactKind: ScenarioImpactKind
  targetType: ScenarioTargetType
  parentId?: string  // Required for delta/override/stop (ID of existing item to modify)
  amount: number
  currency: string
  cadence: ScenarioCadence
  startMonth: string
  endMonth?: string
  name?: string  // Name for the financial item (used by start impacts)
  frequency?: ItemFrequency  // Frequency for start impacts (one_time, monthly, annual)
  notes?: string
  // Advanced fields for start impacts - used to configure the created financial item
  category?: string  // Category for the created financial item
  growthRate?: number  // Annual growth rate (%)
  growthStrategy?: GrowthStrategy  // How growth is applied
  // Liability-specific fields for start impacts
  interestRate?: number  // APR % for liabilities
  minimumPayment?: number  // Min payment for liabilities
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

export const scenarioImpactFromDto = (dto: ScenarioImpactDto): ScenarioImpact => {
  const isStartImpact = dto.impactKind === 'start'

  return {
    impactKind: dto.impactKind,
    targetType: dto.targetType,
    parentId: dto.parentId ?? undefined,
    amount: Number(dto.amount ?? 0),  // Convert string from backend to number
    currency: dto.currency,
    // For non-start impacts, use the impact's cadence
    cadence: isStartImpact ? 'monthly' : (dto.cadence as ScenarioCadence),
    startMonth: dto.startDate.slice(0, 7),
    endMonth: dto.endDate ? dto.endDate.slice(0, 7) : undefined,
    name: dto.name ?? undefined,
    // For start impacts, use frequency from JOINed finance table (or fallback to cadence for backwards compat)
    frequency: isStartImpact ? ((dto.frequency as ItemFrequency) || (dto.cadence as ItemFrequency)) : undefined,
    notes: dto.notes ?? undefined,
    // Advanced fields for start impacts
    category: dto.category ?? undefined,
    growthRate: dto.growthRate ?? undefined,
    growthStrategy: (dto.growthStrategy as GrowthStrategy) ?? undefined,
    // Liability-specific fields for start impacts
    interestRate: dto.interestRate ?? undefined,
    minimumPayment: dto.minimumPayment ?? undefined,
  }
}

export const scenarioImpactToDto = (impact: ScenarioImpact): ScenarioImpactDto => {
  const isStartImpact = impact.impactKind === 'start'

  return {
    impactKind: impact.impactKind,
    targetType: impact.targetType,
    parentId: impact.parentId,
    amount: String(impact.amount),  // Convert number to string for backend decimal handling
    currency: impact.currency,
    // For start impacts, send frequency as cadence (backend expects one_time/monthly/annual)
    cadence: isStartImpact ? (impact.frequency ?? 'monthly') : impact.cadence,
    startDate: impact.startMonth,
    endDate: impact.endMonth,
    name: impact.name,
    frequency: impact.frequency,
    notes: impact.notes,
    // Advanced fields for start impacts
    category: impact.category,
    growthRate: impact.growthRate,
    growthStrategy: impact.growthStrategy,
    // Liability-specific fields for start impacts
    interestRate: impact.interestRate,
    minimumPayment: impact.minimumPayment,
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
