export type ScenarioImpactKind = 'delta' | 'override' | 'start' | 'stop'
export type ScenarioTargetType = 'asset' | 'liability' | 'income' | 'expense'
export type ScenarioCadence = 'one_time' | 'monthly' | 'annual'

export interface ScenarioImpact {
  target_type: ScenarioTargetType
  target_id?: string
  impact_kind: ScenarioImpactKind
  amount: number
  currency: string
  cadence: ScenarioCadence
  start_month: string
  end_month?: string
  notes?: string
}

export interface ScenarioEvent {
  id?: string
  name: string
  description?: string
  occurs_on: string
  display_icon?: string
  tags: string[]
  scenario_id?: string
  is_included: boolean
  impacts: ScenarioImpact[]
}
