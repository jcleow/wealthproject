import type { ScenarioEvent } from './scenario'

// DTO envelopes for backend responses
export type ScenarioEventsDTO = ScenarioEventDTO[] | { items: ScenarioEventDTO[] }

// Permissive DTO that supports snake_case and camelCase from backend
export type ScenarioEventDTO = Partial<
  ScenarioEvent & {
    ID: string
    Name: string
    Description: string
    occursOn: string
    OccursOn: string
    displayIcon: string
    DisplayIcon: string
    displayColor: string
    DisplayColor: string
    Tags: string[]
    scenarioId: string
    ScenarioID: string
    ScenarioId: string
    isIncluded: boolean
    IsIncluded: boolean
    Impacts: ScenarioEvent['impacts']
  }
>
