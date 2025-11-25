import type { ScenarioEvent } from './scenario'

// DTO envelopes for backend responses
export type ScenarioEventsDTO = ScenarioEvent[] | { items: ScenarioEvent[] }
