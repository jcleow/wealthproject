/**
 * Property Planner V2 API Client
 *
 * API client for the new property planner persistence endpoints.
 * Base path: /api/v2/property-planner
 */

import { apiClient } from '../client'
import type {
  PropertyScenarioFull,
  CreateScenarioInput,
  UpdateScenarioInput,
} from '@/types/propertyPlannerV2'

const BASE_PATH = '/property-planner'
const V2_BASE_URL = '/api/v2'

/**
 * List all property scenarios for the current user
 * Note: Backend returns array directly, not wrapped in { scenarios: [...] }
 */
export async function listScenarios(): Promise<PropertyScenarioFull[]> {
  return apiClient.get<PropertyScenarioFull[]>(
    `${BASE_PATH}/scenarios`,
    undefined,
    { baseUrl: V2_BASE_URL }
  )
}

/**
 * Get a single property scenario by ID
 */
export async function getScenario(id: string): Promise<PropertyScenarioFull> {
  return apiClient.get<PropertyScenarioFull>(
    `${BASE_PATH}/scenarios/${id}`,
    undefined,
    { baseUrl: V2_BASE_URL }
  )
}

/**
 * Create a new property scenario
 */
export async function createScenario(input: CreateScenarioInput): Promise<PropertyScenarioFull> {
  return apiClient.post<PropertyScenarioFull>(
    `${BASE_PATH}/scenarios`,
    input,
    { baseUrl: V2_BASE_URL }
  )
}

/**
 * Update an existing property scenario
 */
export async function updateScenario(id: string, input: UpdateScenarioInput): Promise<PropertyScenarioFull> {
  return apiClient.put<PropertyScenarioFull>(
    `${BASE_PATH}/scenarios/${id}`,
    input,
    { baseUrl: V2_BASE_URL }
  )
}

/**
 * Delete a property scenario
 */
export async function deleteScenario(id: string): Promise<void> {
  return apiClient.delete<void>(
    `${BASE_PATH}/scenarios/${id}`,
    { baseUrl: V2_BASE_URL }
  )
}

/**
 * Toggle scenario inclusion (for timeline projections)
 */
export async function toggleScenarioIncluded(id: string, isIncluded: boolean): Promise<PropertyScenarioFull> {
  return apiClient.patch<PropertyScenarioFull>(
    `${BASE_PATH}/scenarios/${id}`,
    { sgDetails: { isIncluded } },
    { baseUrl: V2_BASE_URL }
  )
}
