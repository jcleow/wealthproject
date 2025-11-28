import type { ScenarioEvent } from './scenario'

// DTO envelopes for backend responses
export type ScenarioEventsDTO = ScenarioEventDTO[] | { items: ScenarioEventDTO[] }

// Permissive DTO that supports snake_case and camelCase from backend
export type ScenarioEventDTO = Partial<
  ScenarioEvent & {
    ID: string
    Name: string
    Description: string
    occurs_on: string
    occursOn: string
    OccursOn: string
    display_icon: string
    displayIcon: string
    DisplayIcon: string
    display_color: string
    displayColor: string
    DisplayColor: string
    Tags: string[]
    scenario_id: string
    scenarioId: string
    ScenarioID: string
    ScenarioId: string
    is_included: boolean
    isIncluded: boolean
    IsIncluded: boolean
    Impacts: ScenarioEvent['impacts']
  }
>
