import { ApiError, apiClient } from '../client'
import { buildPaginatedPath } from './helpers'
import { normalizePaginatedResponse, toAsset } from './transformers'
import type { Asset, PaginatedResponse, PaginationParams } from '@/types/financial'
import type { UpdateMode } from '@/components/modals/FinancialFormModal/types'
import type {
  Investment as ApiInvestment,
  InvestmentCreateInput,
  InvestmentV2Input,
  StopInput,
} from '@/types/api.aliases'

// Investment shares the same shape as Asset but uses finance_investments table
export type Investment = Asset

// Reuse toAsset transformer since Investment has same shape
const toInvestment = toAsset

export async function listInvestments(params?: PaginationParams): Promise<PaginatedResponse<Investment>> {
  const path = buildPaginatedPath('/investments', params)
  const data = await apiClient.get<{ data: ApiInvestment[]; total?: number; limit?: number; offset?: number }>(path, undefined, { baseUrl: '/api/v2' })
  return normalizePaginatedResponse<Investment>(data, toInvestment, params)
}

export async function createInvestment(payload: Omit<Investment, 'id' | 'updatedAt'>): Promise<Investment> {
  // Use string for decimal values to avoid float64 precision loss
  const body: InvestmentCreateInput = {
    name: payload.name,
    category: payload.category,
    currentValue: String(payload.currentValue),
    annualGrowthRate: String(payload.annualGrowthRate),
    notes: payload.notes ?? undefined,
    startDate: payload.startDate ?? undefined,
    endDate: payload.endDate ?? undefined,
  }

  const data = await apiClient.post<ApiInvestment>('/investments', body, { baseUrl: '/api/v2' })
  return toInvestment(data)
}

export async function updateInvestment(
  id: string,
  payload: Partial<Investment> & {
    updateMode?: UpdateMode
  }
): Promise<Investment> {
  // Use string for decimal values to avoid float64 precision loss
  const body: InvestmentV2Input = {
    id,
    name: payload.name,
    category: payload.category,
    currentValue: payload.currentValue?.toString(),
    growthRate: payload.annualGrowthRate?.toString(), // Backend uses growthRate
    notes: payload.notes ?? undefined,
    startDate: payload.startDate ?? undefined,
    updateMode: payload.updateMode,
  }

  // Use v2 API for versioned update support
  const data = await apiClient.put<ApiInvestment>(`/investments/${id}`, body, { baseUrl: '/api/v2' })
  return toInvestment(data)
}

// Stop an investment (soft delete) - sets end_date and cascades to linked allocations
export async function stopInvestment(id: string, endDate: string): Promise<Investment> {
  const body: StopInput = { endDate }
  const data = await apiClient.post<ApiInvestment>(`/investments/${id}/stop`, body, { baseUrl: '/api/v2' })
  return toInvestment(data)
}

export async function deleteInvestment(id: string): Promise<void> {
  try {
    // Use v2 API for recursive delete support
    await apiClient.delete<void>(`/investments/${id}`, { baseUrl: '/api/v2' })
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return
    }
    throw error
  }
}

/**
 * Delete all investments using the V2 endpoint (bulk delete, includes versioned entries)
 */
export async function deleteAllInvestments(): Promise<void> {
  const response = await fetch('/api/v2/investments', { method: 'DELETE' })
  if (!response.ok && response.status !== 204) {
    const errorText = await response.text()
    throw new Error(`Failed to delete investments: ${response.status} ${errorText}`)
  }
}

export const investmentsApi = {
  listInvestments,
  createInvestment,
  updateInvestment,
  stopInvestment,
  deleteInvestment,
  deleteAllInvestments,
}
