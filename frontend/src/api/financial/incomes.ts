import { ApiError, apiClient } from '../client'
import { buildPaginatedPath } from './helpers'
import { normalizePaginatedResponse, toIncome } from './transformers'
import type { Income, PaginatedResponse, PaginationParams } from '@/types/financial'
import type { UpdateMode } from '@/components/modals/FinancialFormModal/types'
import type {
  Income as ApiIncome,
  IncomeV2CreateInput,
  IncomeV2Input,
  IncomeAllocationV2DTO,
  IncomeAllocationCreateDTO,
  StopInput,
  StopAllocationDTO,
} from '@/types/api.aliases'

// Income Allocation Types - re-export from generated for convenience
export type IncomeAllocation = IncomeAllocationV2DTO & {
  // Ensure required fields are present for frontend usage
  id: string
  incomeId: string
  startDate: string
  allocationType: string
  allocationValue: string
}

export type CreateIncomeAllocationPayload = IncomeAllocationCreateDTO

export async function listIncomes(params?: PaginationParams): Promise<PaginatedResponse<Income>> {
  const path = buildPaginatedPath('/cashflow/incomes', params)
  const data = await apiClient.get<{ data: ApiIncome[]; total?: number; limit?: number; offset?: number }>(path, undefined, { baseUrl: '/api/v2' })
  return normalizePaginatedResponse<Income>(data, toIncome, params)
}

export async function createIncome(payload: Omit<Income, 'id' | 'updatedAt'>): Promise<Income> {
  // Use string for decimal values to avoid float64 precision loss
  const body: IncomeV2CreateInput = {
    name: payload.name,
    personId: payload.personId ?? undefined,
    amount: String(payload.amount),
    frequency: payload.frequency,
    startDate: payload.startDate ?? new Date().toISOString(),
    category: payload.category,
    growthRate: String(payload.growthRate ?? 3.0),
    notes: payload.notes ?? undefined,
    cpfWageType: payload.cpfWageType ?? undefined,
    endDate: payload.endDate ?? undefined,
  }

  const data = await apiClient.post<ApiIncome>('/cashflow/incomes', body, { baseUrl: '/api/v2' })
  return toIncome(data)
}

export async function updateIncome(
  id: string,
  payload: Partial<Income> & {
    updateMode?: UpdateMode
  }
): Promise<Income> {
  // Use string for decimal values to avoid float64 precision loss
  const body: IncomeV2Input = {
    id,
    name: payload.name,
    personId: payload.personId ?? undefined,
    amount: payload.amount?.toString(),
    frequency: payload.frequency,
    startDate: payload.startDate,
    category: payload.category,
    growthRate: payload.growthRate?.toString(),
    notes: payload.notes ?? undefined,
    updateMode: payload.updateMode,
  }

  // Use v2 API for versioned update support
  const data = await apiClient.put<ApiIncome>(`/cashflow/incomes/${id}`, body, { baseUrl: '/api/v2' })
  return toIncome(data)
}

// Stop an income (soft delete) - sets end_date
export async function stopIncome(id: string, endDate: string): Promise<Income> {
  const body: StopInput = { endDate }
  const data = await apiClient.post<ApiIncome>(`/cashflow/incomes/${id}/stop`, body, { baseUrl: '/api/v2' })
  return toIncome(data)
}

export async function deleteIncome(id: string): Promise<void> {
  try {
    // Use v2 API for recursive delete support
    await apiClient.delete<void>(`/cashflow/incomes/${id}`, { baseUrl: '/api/v2' })
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return
    }
    throw error
  }
}

/**
 * Delete all incomes using the V2 endpoint (bulk delete, includes versioned entries)
 * Also cascades to delete income allocations.
 */
export async function deleteAllIncomes(): Promise<void> {
  const response = await fetch('/api/v2/cashflow/incomes', { method: 'DELETE' })
  if (!response.ok && response.status !== 204) {
    const errorText = await response.text()
    throw new Error(`Failed to delete incomes: ${response.status} ${errorText}`)
  }
}

// Income Allocation API Methods

export type AllocationTargetType = 'investment' | 'cash_account'

export interface ListAllocationsParams {
  targetType?: AllocationTargetType
  asOf?: string // ISO 8601 date (e.g., "2031-04-01")
}

// List all allocations for the user (v2 API)
// targetType: filter by 'investment' or 'cash_account', or undefined for all
// asOf: filter allocations active as of this date (defaults to today on backend)
export async function listAllIncomeAllocations(params?: ListAllocationsParams): Promise<IncomeAllocation[]> {
  const searchParams = new URLSearchParams()
  if (params?.targetType) searchParams.set('targetType', params.targetType)
  if (params?.asOf) searchParams.set('asOf', params.asOf)

  const queryString = searchParams.toString()
  const path = queryString ? `/income-allocations?${queryString}` : '/income-allocations'
  const data = await apiClient.get<IncomeAllocation[]>(path, undefined, { baseUrl: '/api/v2' })
  return data
}

export async function listIncomeAllocations(incomeId: string): Promise<IncomeAllocation[]> {
  const data = await apiClient.get<IncomeAllocation[]>(`/incomes/${incomeId}/allocations`, undefined, { baseUrl: '/api/v2' })
  return data
}

export async function createIncomeAllocation(
  incomeId: string,
  payload: CreateIncomeAllocationPayload
): Promise<IncomeAllocation> {
  const data = await apiClient.post<IncomeAllocation>(
    `/incomes/${incomeId}/allocations`,
    payload,
    { baseUrl: '/api/v2' }
  )
  return data
}

export async function updateIncomeAllocation(
  incomeId: string,
  allocationId: string,
  payload: CreateIncomeAllocationPayload
): Promise<IncomeAllocation> {
  const data = await apiClient.put<IncomeAllocation>(
    `/incomes/${incomeId}/allocations/${allocationId}`,
    payload,
    { baseUrl: '/api/v2' }
  )
  return data
}

export async function deleteIncomeAllocation(incomeId: string, allocationId: string): Promise<void> {
  await apiClient.delete<void>(`/incomes/${incomeId}/allocations/${allocationId}`, { baseUrl: '/api/v2' })
}

// Stop an allocation at a future date (sets end_date instead of deleting)
export async function stopIncomeAllocation(
  incomeId: string,
  allocationId: string,
  endDate: string // ISO 8601 format (e.g., "2031-03-31T23:59:59Z")
): Promise<IncomeAllocation> {
  const body: StopAllocationDTO = { endDate }
  const data = await apiClient.post<IncomeAllocation>(
    `/incomes/${incomeId}/allocations/${allocationId}/stop`,
    body,
    { baseUrl: '/api/v2' }
  )
  return data
}

export const incomesApi = {
  listIncomes,
  createIncome,
  updateIncome,
  stopIncome,
  deleteIncome,
  deleteAllIncomes,
  listAllIncomeAllocations,
  listIncomeAllocations,
  createIncomeAllocation,
  updateIncomeAllocation,
  deleteIncomeAllocation,
  stopIncomeAllocation,
}
