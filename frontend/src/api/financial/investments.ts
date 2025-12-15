import { apiClient } from '../client'
import { buildPaginatedPath } from './helpers'
import { normalizePaginatedResponse, toAsset } from './transformers'
import type { Asset, PaginatedResponse, PaginationParams } from '@/types/financial'

// Investment shares the same shape as Asset but uses finance_investments table
export type Investment = Asset

// Reuse toAsset transformer since Investment has same shape
const toInvestment = toAsset

export async function listInvestments(params?: PaginationParams): Promise<PaginatedResponse<Investment>> {
  const path = buildPaginatedPath('/investments', params)
  const data = await apiClient.get<any>(path)
  return normalizePaginatedResponse<Investment>(data, toInvestment, params)
}

export async function createInvestment(payload: Omit<Investment, 'id' | 'updatedAt'>): Promise<Investment> {
  const body: Record<string, unknown> = {
    name: payload.name,
    category: payload.category,
    currentValue: payload.currentValue,
    annualGrowthRate: payload.annualGrowthRate,
    notes: payload.notes,
  }

  if (payload.startDate !== undefined) body.startDate = payload.startDate
  if (payload.endDate !== undefined) body.endDate = payload.endDate

  const data = await apiClient.post<any>('/investments', body)
  return toInvestment(data)
}

export async function updateInvestment(id: string, payload: Partial<Investment>): Promise<Investment> {
  const body: Record<string, unknown> = {
    name: payload.name,
    category: payload.category,
    currentValue: payload.currentValue,
    annualGrowthRate: payload.annualGrowthRate,
    notes: payload.notes,
  }

  // Only include dates if explicitly provided (not undefined)
  // This prevents Go from receiving zero-time values
  if (payload.startDate !== undefined) body.startDate = payload.startDate
  if (payload.endDate !== undefined) body.endDate = payload.endDate

  const data = await apiClient.put<any>(`/investments/${id}`, body)
  return toInvestment(data)
}

export async function deleteInvestment(id: string): Promise<void> {
  await apiClient.delete<void>(`/investments/${id}`)
}

export async function deleteAllInvestments(): Promise<void> {
  const result = await listInvestments({ limit: -1 })
  await Promise.all(result.data.map((investment) => deleteInvestment(investment.id)))
}

export const investmentsApi = {
  listInvestments,
  createInvestment,
  updateInvestment,
  deleteInvestment,
  deleteAllInvestments,
}
