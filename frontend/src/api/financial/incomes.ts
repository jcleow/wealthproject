import { ApiError, apiClient } from '../client'
import { buildPaginatedPath } from './helpers'
import { normalizePaginatedResponse, toIncome } from './transformers'
import type { Income, PaginatedResponse, PaginationParams } from '@/types/financial'
import type { UpdateMode } from '@/components/modals/FinancialFormModal/types'

// Income Allocation Types
export interface IncomeAllocation {
  id: string
  incomeId: string
  parentId: string
  startDate: string
  endDate?: string
  targetCashAccountId?: string
  targetInvestmentId?: string
  allocationType: 'percentage' | 'fixed'
  allocationValue: number
  createdAt: string
}

export interface CreateIncomeAllocationPayload {
  targetCashAccountId?: string
  targetInvestmentId?: string
  allocationType: 'percentage' | 'fixed'
  allocationValue: number
}

export async function listIncomes(params?: PaginationParams): Promise<PaginatedResponse<Income>> {
  const path = buildPaginatedPath('/cashflow/incomes', params)
  const data = await apiClient.get<any>(path)
  return normalizePaginatedResponse<Income>(data, toIncome, params)
}

export async function createIncome(payload: Omit<Income, 'id' | 'updatedAt'>): Promise<Income> {
  const body: Record<string, unknown> = {
    source: payload.source,
    amount: payload.amount,
    frequency: payload.frequency,
    startDate: payload.startDate ?? new Date().toISOString(),
    category: payload.category,
    growthRate: payload.growthRate ?? 3.0,
    notes: payload.notes,
  }

  if (payload.cpfWageType !== undefined) body.cpfWageType = payload.cpfWageType
  if (payload.endDate !== undefined) body.endDate = payload.endDate

  const data = await apiClient.post<any>('/cashflow/incomes', body)
  return toIncome(data)
}

export async function updateIncome(
  id: string,
  payload: Partial<Income> & {
    updateMode?: UpdateMode
  }
): Promise<Income> {
  const body: Record<string, unknown> = {
    source: payload.source,
    amount: payload.amount,
    frequency: payload.frequency,
    startDate: payload.startDate,
    endDate: payload.endDate,
    category: payload.category,
    growthRate: payload.growthRate,
    notes: payload.notes,
  }
  if (payload.cpfWageType !== undefined) body.cpfWageType = payload.cpfWageType
  // Add updateMode for versioned updates
  if (payload.updateMode !== undefined) {
    body.updateMode = payload.updateMode
  }

  // Use v2 API for versioned update support
  const data = await apiClient.put<any>(`/v2/cashflow/incomes/${id}`, body)
  return toIncome(data)
}

// Stop an income (soft delete) - sets end_date
export async function stopIncome(id: string, endDate: string): Promise<Income> {
  const data = await apiClient.post<any>(`/v2/cashflow/incomes/${id}/stop`, { endDate })
  return toIncome(data)
}

export async function deleteIncome(id: string): Promise<void> {
  try {
    // Use v2 API for recursive delete support
    await apiClient.delete<void>(`/v2/cashflow/incomes/${id}`)
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return
    }
    throw error
  }
}

export async function deleteAllIncomes(): Promise<void> {
  const result = await listIncomes({ limit: -1 })
  await Promise.all(result.data.map((income) => deleteIncome(income.id)))
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
  const data = await apiClient.post<IncomeAllocation>(
    `/incomes/${incomeId}/allocations/${allocationId}/stop`,
    { endDate },
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
