import { apiClient } from '../client'
import { buildPaginatedPath } from './helpers'
import { normalizePaginatedResponse, toIncome } from './transformers'
import type { Income, PaginatedResponse, PaginationParams } from '@/types/financial'

// Income Allocation Types
export interface IncomeAllocation {
  id: string
  incomeId: string
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

export async function updateIncome(id: string, payload: Partial<Income>): Promise<Income> {
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

  const data = await apiClient.put<any>(`/cashflow/incomes/${id}`, body)
  return toIncome(data)
}

export async function deleteIncome(id: string): Promise<void> {
  await apiClient.delete<void>(`/cashflow/incomes/${id}`)
}

export async function deleteAllIncomes(): Promise<void> {
  const result = await listIncomes({ limit: -1 })
  await Promise.all(result.data.map((income) => deleteIncome(income.id)))
}

// Income Allocation API Methods

// List all allocations for the user (v2 API)
export async function listAllIncomeAllocations(): Promise<IncomeAllocation[]> {
  const data = await apiClient.get<IncomeAllocation[]>('/income-allocations', undefined, { baseUrl: '/api/v2' })
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

export const incomesApi = {
  listIncomes,
  createIncome,
  updateIncome,
  deleteIncome,
  deleteAllIncomes,
  listAllIncomeAllocations,
  listIncomeAllocations,
  createIncomeAllocation,
  updateIncomeAllocation,
  deleteIncomeAllocation,
}
