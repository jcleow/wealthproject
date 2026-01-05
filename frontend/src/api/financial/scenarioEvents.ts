import { apiClient } from '../client'
import { normalizeScenarioEvent, normalizeScenarioEventList } from './transformers'
import type { ScenarioEvent } from '@/types/scenario'
import { scenarioEventToDto } from '@/types/scenario'
import type { ScenarioEventV2DTO } from '@/types/api.generated'

export async function listScenarioEvents(): Promise<ScenarioEvent[]> {
  const data = await apiClient.get<ScenarioEventV2DTO[]>('/scenario-events', undefined, { baseUrl: '/api/v2' })
  return normalizeScenarioEventList(data)
}

export async function getScenarioEvent(id: string): Promise<ScenarioEvent> {
  if (!id) throw new Error('Scenario event id is required')
  const data = await apiClient.get<ScenarioEventV2DTO>(`/scenario-events/${encodeURIComponent(id)}`, undefined, { baseUrl: '/api/v2' })
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
  console.log('[createScenarioEvent] Sending payload:', JSON.stringify(body, null, 2))
  const data = await apiClient.post<ScenarioEventV2DTO>('/scenario-events', body, { baseUrl: '/api/v2' })

  // Use normalizeScenarioEvent to handle all property normalization
  return normalizeScenarioEvent(data)
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
  const data = await apiClient.put<ScenarioEventV2DTO>(`/scenario-events/${encodeURIComponent(id)}`, body, { baseUrl: '/api/v2' })

  // Use normalizeScenarioEvent to handle all property normalization
  return normalizeScenarioEvent(data)
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
