import { apiClient } from '../client'
import { normalizeImpact, normalizeScenarioEvent, normalizeScenarioEventList } from './transformers'
import type { ScenarioEvent } from '@/types/scenario'
import { scenarioEventFromDto, scenarioEventToDto, scenarioImpactToDto } from '@/types/scenario'

export async function listScenarioEvents(): Promise<ScenarioEvent[]> {
  const data = await apiClient.get<any>('/scenario-events', undefined, { baseUrl: '/api/v2' })
  return normalizeScenarioEventList(data)
}

export async function getScenarioEvent(id: string): Promise<ScenarioEvent> {
  if (!id) throw new Error('Scenario event id is required')
  const data = await apiClient.get<any>(`/scenario-events/${encodeURIComponent(id)}`, undefined, { baseUrl: '/api/v2' })
  return normalizeScenarioEvent(data)
}

export async function createScenarioEvent(payload: ScenarioEvent): Promise<ScenarioEvent> {
  const normalizedIcon = payload.displayIcon?.trim()
  if (!normalizedIcon) {
    throw new Error('displayIcon is required when creating a scenario event')
  }
  const body = scenarioEventToDto({
    ...payload,
    displayIcon: normalizedIcon,
    tags: payload.tags ?? [],
    isIncluded: payload.isIncluded ?? true,
  })
  const data = await apiClient.post<any>('/scenario-events', body, { baseUrl: '/api/v2' })

  const impacts = Array.isArray(data.impacts)
    ? data.impacts.map(normalizeImpact)
    : Array.isArray(data.Impacts)
      ? data.Impacts.map(normalizeImpact)
      : Array.isArray(payload.impacts)
        ? payload.impacts.map(scenarioImpactToDto)
        : []

  return scenarioEventFromDto({
    id: data.id ?? data.ID,
    name: data.name ?? data.Name ?? payload.name,
    description: data.description ?? data.Description ?? payload.description,
    occursOn: data.occursOn ?? data.occurs_on ?? data.OccursOn ?? payload.occursOn,
    displayIcon: data.displayIcon ?? data.display_icon ?? data.DisplayIcon ?? payload.displayIcon,
    displayColor: data.displayColor ?? data.display_color ?? data.DisplayColor ?? payload.displayColor ?? '',
    tags: data.tags ?? data.Tags ?? payload.tags ?? [],
    scenarioId: data.scenarioId ?? data.scenario_id ?? data.ScenarioID ?? data.ScenarioId ?? payload.scenarioId,
    isIncluded: data.isIncluded ?? data.is_included ?? data.IsIncluded ?? payload.isIncluded ?? true,
    impacts,
  })
}

export async function updateScenarioEvent(id: string, payload: ScenarioEvent): Promise<ScenarioEvent> {
  if (!id) throw new Error('Scenario event id is required')
  const normalizedIcon = payload.displayIcon?.trim()
  if (!normalizedIcon) {
    throw new Error('displayIcon is required when updating a scenario event')
  }
  const body = scenarioEventToDto({
    ...payload,
    displayIcon: normalizedIcon,
    tags: payload.tags ?? [],
    isIncluded: payload.isIncluded ?? true,
  })
  const data = await apiClient.put<any>(`/scenario-events/${encodeURIComponent(id)}`, body, { baseUrl: '/api/v2' })

  const impacts = Array.isArray(data.impacts)
    ? data.impacts.map(normalizeImpact)
    : Array.isArray(data.Impacts)
      ? data.Impacts.map(normalizeImpact)
      : Array.isArray(payload.impacts)
        ? payload.impacts.map(scenarioImpactToDto)
        : []

  return scenarioEventFromDto({
    id: data.id ?? data.ID ?? id,
    name: data.name ?? data.Name ?? payload.name,
    description: data.description ?? data.Description ?? payload.description,
    occursOn: data.occursOn ?? data.occurs_on ?? data.OccursOn ?? payload.occursOn,
    displayIcon: data.displayIcon ?? data.display_icon ?? data.DisplayIcon ?? payload.displayIcon,
    displayColor: data.displayColor ?? data.display_color ?? data.DisplayColor ?? payload.displayColor ?? '',
    tags: data.tags ?? data.Tags ?? payload.tags ?? [],
    scenarioId: data.scenarioId ?? data.scenario_id ?? data.ScenarioID ?? data.ScenarioId ?? payload.scenarioId,
    isIncluded: data.isIncluded ?? data.is_included ?? data.IsIncluded ?? payload.isIncluded ?? true,
    impacts,
  })
}

export async function deleteScenarioEvent(id: string): Promise<void> {
  if (!id) throw new Error('Scenario event id is required')
  await apiClient.delete<void>(`/scenario-events/${encodeURIComponent(id)}`, { baseUrl: '/api/v2' })
}

export async function deleteAllScenarioEvents(): Promise<void> {
  const events = await listScenarioEvents()
  await Promise.all(events.filter((event) => event.id).map((event) => deleteScenarioEvent(event.id!)))
}

export const scenarioEventsApi = {
  listScenarioEvents,
  getScenarioEvent,
  createScenarioEvent,
  updateScenarioEvent,
  deleteScenarioEvent,
  deleteAllScenarioEvents,
}
