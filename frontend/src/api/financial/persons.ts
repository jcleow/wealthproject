import { apiClient } from '../client'
import type { Person, PersonCreatePayload, PersonUpdatePayload } from '@/types/person'

/** Raw API response shape for person */
interface RawPersonResponse {
  id: string
  userId: string
  name: string
  displayColor?: string | null
  isIncluded?: boolean
  createdAt: string
  updatedAt: string
  incomeCount?: number
  cpfCount?: number
}

/**
 * Transform API response to Person type
 */
function toPerson(data: RawPersonResponse): Person {
  return {
    id: data.id,
    userId: data.userId,
    name: data.name,
    displayColor: data.displayColor ?? null,
    isIncluded: data.isIncluded ?? true,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
    incomeCount: data.incomeCount ?? 0,
    cpfCount: data.cpfCount ?? 0,
  }
}

/**
 * List all persons for the current user (with income/CPF counts)
 */
export async function listPersons(): Promise<Person[]> {
  const data = await apiClient.get<RawPersonResponse[]>('/persons', undefined, { baseUrl: '/api/v2' })
  return (data || []).map(toPerson)
}

/**
 * Get a single person by ID
 */
export async function getPerson(id: string): Promise<Person> {
  const data = await apiClient.get<RawPersonResponse>(`/persons/${id}`, undefined, { baseUrl: '/api/v2' })
  return toPerson(data)
}

/**
 * Create a new person
 */
export async function createPerson(payload: PersonCreatePayload): Promise<Person> {
  const data = await apiClient.post<RawPersonResponse>('/persons', payload, { baseUrl: '/api/v2' })
  return toPerson(data)
}

/**
 * Update an existing person
 */
export async function updatePerson(id: string, payload: PersonUpdatePayload): Promise<Person> {
  const data = await apiClient.put<RawPersonResponse>(`/persons/${id}`, payload, { baseUrl: '/api/v2' })
  return toPerson(data)
}

/**
 * Delete a person (linked incomes/CPF accounts will have person_id set to NULL)
 */
export async function deletePerson(id: string): Promise<void> {
  await apiClient.delete(`/persons/${id}`, { baseUrl: '/api/v2' })
}

/**
 * Toggle the isIncluded flag for a person
 */
export async function togglePersonIncluded(id: string): Promise<Person> {
  const data = await apiClient.patch<RawPersonResponse>(`/persons/${id}/toggle`, undefined, { baseUrl: '/api/v2' })
  return toPerson(data)
}

export interface BulkPersonUpdate {
  id: string
  isIncluded?: boolean
  name?: string
  displayColor?: string
}

/**
 * Bulk update multiple persons in parallel
 * Used for batch saving changes from the PersonsModal
 */
export async function bulkUpdatePersons(updates: BulkPersonUpdate[]): Promise<Person[]> {
  const results = await Promise.all(
    updates.map(async ({ id, isIncluded, name, displayColor }) => {
      // Build the update payload (only include fields that are set)
      const payload: PersonUpdatePayload = {}
      if (name !== undefined) payload.name = name
      if (displayColor !== undefined) payload.displayColor = displayColor
      if (isIncluded !== undefined) payload.isIncluded = isIncluded

      const data = await apiClient.put<RawPersonResponse>(`/persons/${id}`, payload, { baseUrl: '/api/v2' })
      return toPerson(data)
    })
  )
  return results
}

export const personsApi = {
  listPersons,
  getPerson,
  createPerson,
  updatePerson,
  deletePerson,
  togglePersonIncluded,
  bulkUpdatePersons,
}
