import { apiClient } from '../client'
import { buildPaginatedPath } from './helpers'
import { normalizePaginatedResponse, toLiability } from './transformers'
import type { Liability, PaginatedResponse, PaginationParams } from '@/types/financial'

export async function listLiabilities(params?: PaginationParams): Promise<PaginatedResponse<Liability>> {
  const path = buildPaginatedPath('/liabilities', params)
  const data = await apiClient.get<any>(path)
  return normalizePaginatedResponse<Liability>(data, toLiability, params)
}

export async function createLiability(payload: Omit<Liability, 'id' | 'updatedAt'>): Promise<Liability> {
  const body: Record<string, unknown> = {
    name: payload.name,
    category: payload.category,
    currentBalance: payload.currentBalance,
    interestRateApr: payload.interestRateApr,
    minimumPayment: payload.minimumPayment,
    notes: payload.notes,
  }

  if (payload.startDate !== undefined) body.startDate = payload.startDate
  if (payload.endDate !== undefined) body.endDate = payload.endDate

  // Use v2 endpoint which auto-creates linked expense for debt repayment
  const data = await apiClient.post<any>('/liabilities', body, { baseUrl: '/api/v2' })
  return toLiability(data)
}

export async function updateLiability(id: string, payload: Partial<Liability>): Promise<Liability> {
  const body: Record<string, unknown> = {
    name: payload.name,
    category: payload.category,
    currentBalance: payload.currentBalance,
    interestRateApr: payload.interestRateApr,
    minimumPayment: payload.minimumPayment,
    notes: payload.notes,
    startDate: payload.startDate,
    endDate: payload.endDate,
  }

  const data = await apiClient.put<any>(`/liabilities/${id}`, body)
  return toLiability(data)
}

export async function deleteLiability(id: string): Promise<void> {
  await apiClient.delete<void>(`/liabilities/${id}`)
}

export async function convertLiabilityToProperty(id: string): Promise<Liability> {
  const data = await apiClient.put<any>(`/liabilities/${id}/convert-to-property`)
  return toLiability(data)
}

export async function deleteAllLiabilities(): Promise<void> {
  const result = await listLiabilities({ limit: -1 })
  await Promise.all(result.data.map((liability) => deleteLiability(liability.id)))
}

export const liabilitiesApi = {
  listLiabilities,
  createLiability,
  updateLiability,
  deleteLiability,
  deleteAllLiabilities,
  convertLiabilityToProperty,
}
