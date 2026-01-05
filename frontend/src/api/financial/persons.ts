import { apiClient } from '../client'
import type { Person, PersonCreatePayload, PersonUpdatePayload } from '@/types/person'
import type { ResidencyStatus } from '@/types/cpf'
import type {
  Person as ApiPerson,
  PersonV2CreateInput,
  PersonV2UpdateInput,
} from '@/types/api.generated'

/**
 * Transform API response to Person type
 */
function toPerson(data: ApiPerson): Person {
  return {
    id: data.id ?? '',
    userId: data.userId ?? '',
    name: data.name ?? '',
    displayColor: data.displayColor ?? null,
    isIncluded: data.isIncluded ?? true,
    dateOfBirth: data.dateOfBirth ?? '',
    residencyStatus: (data.residencyStatus ?? 'citizen') as ResidencyStatus,
    prGrantDate: data.prGrantDate ?? null,
    createdAt: data.createdAt ?? '',
    updatedAt: data.updatedAt ?? '',
    incomeCount: data.incomeCount ?? 0,
    cpfCount: data.cpfCount ?? 0,
  }
}

/**
 * List all persons for the current user (with income/CPF counts)
 */
export async function listPersons(): Promise<Person[]> {
  const data = await apiClient.get<ApiPerson[]>('/persons', {}, { baseUrl: '/api/v2' })
  return (data || []).map(toPerson)
}

/**
 * Get a single person by ID
 */
export async function getPerson(id: string): Promise<Person> {
  const data = await apiClient.get<ApiPerson>(`/persons/${id}`, {}, { baseUrl: '/api/v2' })
  return toPerson(data)
}

/**
 * Create a new person
 */
export async function createPerson(payload: PersonCreatePayload): Promise<Person> {
  const body: PersonV2CreateInput = {
    name: payload.name,
    dateOfBirth: payload.dateOfBirth,
    residencyStatus: payload.residencyStatus,
    displayColor: payload.displayColor ?? undefined,
    prGrantDate: payload.prGrantDate ?? undefined,
  }
  const data = await apiClient.post<ApiPerson>('/persons', body, { baseUrl: '/api/v2' })
  return toPerson(data)
}

/**
 * Update an existing person
 */
export async function updatePerson(id: string, payload: PersonUpdatePayload): Promise<Person> {
  const body: PersonV2UpdateInput = {
    name: payload.name,
    dateOfBirth: payload.dateOfBirth,
    residencyStatus: payload.residencyStatus,
    displayColor: payload.displayColor ?? undefined,
    prGrantDate: payload.prGrantDate ?? undefined,
    isIncluded: payload.isIncluded,
  }
  const data = await apiClient.put<ApiPerson>(`/persons/${id}`, body, { baseUrl: '/api/v2' })
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
  const data = await apiClient.patch<ApiPerson>(`/persons/${id}/toggle`, {}, { baseUrl: '/api/v2' })
  return toPerson(data)
}

export interface BulkPersonUpdate {
  id: string
  isIncluded?: boolean
  name?: string
  displayColor?: string
  dateOfBirth?: string
  residencyStatus?: ResidencyStatus
  prGrantDate?: string | null
}

/**
 * Bulk update multiple persons in parallel
 * Used for batch saving changes from the PersonsModal
 */
export async function bulkUpdatePersons(updates: BulkPersonUpdate[]): Promise<Person[]> {
  const results = await Promise.all(
    updates.map(async ({ id, isIncluded, name, displayColor, dateOfBirth, residencyStatus, prGrantDate }) => {
      // Build the update payload (only include fields that are set)
      const body: PersonV2UpdateInput = {}
      if (name !== undefined) body.name = name
      if (displayColor !== undefined) body.displayColor = displayColor
      if (isIncluded !== undefined) body.isIncluded = isIncluded
      if (dateOfBirth !== undefined) body.dateOfBirth = dateOfBirth
      if (residencyStatus !== undefined) body.residencyStatus = residencyStatus
      if (prGrantDate !== undefined) body.prGrantDate = prGrantDate ?? undefined

      const data = await apiClient.put<ApiPerson>(`/persons/${id}`, body, { baseUrl: '/api/v2' })
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
