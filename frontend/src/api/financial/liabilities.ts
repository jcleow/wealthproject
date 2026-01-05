import { ApiError, apiClient } from '../client'
import { buildPaginatedPath } from './helpers'
import { normalizePaginatedResponse, toLiability } from './transformers'
import type { Liability, PaginatedResponse, PaginationParams } from '@/types/financial'
import type { UpdateMode } from '@/components/modals/FinancialFormModal/types'
import type {
  Liability as ApiLiability,
  LiabilityCreateInput,
  LiabilityInput,
  StopInput,
} from '@/types/api.generated'

export async function listLiabilities(params?: PaginationParams): Promise<PaginatedResponse<Liability>> {
  const path = buildPaginatedPath('/liabilities', params)
  const data = await apiClient.get<{ data: ApiLiability[]; total?: number; limit?: number; offset?: number }>(path, undefined, { baseUrl: '/api/v2' })
  return normalizePaginatedResponse<Liability>(data, toLiability, params)
}

export async function createLiability(payload: Omit<Liability, 'id' | 'updatedAt'>): Promise<Liability> {
  // V2 endpoint expects decimal fields as strings
  const body: LiabilityCreateInput = {
    name: payload.name,
    category: payload.category,
    currentBalance: String(payload.currentBalance),
    interestRateApr: String(payload.interestRateApr),
    minimumPayment: String(payload.minimumPayment ?? 0),
    notes: payload.notes ?? undefined,
    startDate: payload.startDate ?? undefined,
    endDate: payload.endDate ?? undefined,
  }

  // Use v2 endpoint which auto-creates linked expense for debt repayment
  const data = await apiClient.post<ApiLiability>('/liabilities', body, { baseUrl: '/api/v2' })
  return toLiability(data)
}

export async function updateLiability(
  id: string,
  payload: Partial<Liability> & {
    updateMode?: UpdateMode
  }
): Promise<Liability> {
  // Use string for decimal values to avoid float64 precision loss
  const body: LiabilityInput = {
    id,
    name: payload.name,
    category: payload.category,
    currentBalance: payload.currentBalance?.toString(),
    interestRateApr: payload.interestRateApr?.toString(),
    minimumPayment: payload.minimumPayment?.toString(),
    notes: payload.notes ?? undefined,
    startDate: payload.startDate ?? undefined,
    updateMode: payload.updateMode,
  }

  // Use v2 API for versioned update support
  const data = await apiClient.put<ApiLiability>(`/liabilities/${id}`, body, { baseUrl: '/api/v2' })
  return toLiability(data)
}

// Stop a liability (soft delete) - sets end_date
export async function stopLiability(id: string, endDate: string): Promise<Liability> {
  const body: StopInput = { endDate }
  const data = await apiClient.post<ApiLiability>(`/liabilities/${id}/stop`, body, { baseUrl: '/api/v2' })
  return toLiability(data)
}

export async function deleteLiability(id: string): Promise<void> {
  try {
    // Use v2 API for recursive delete support
    await apiClient.delete<void>(`/liabilities/${id}`, { baseUrl: '/api/v2' })
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return
    }
    throw error
  }
}

export async function convertLiabilityToProperty(id: string): Promise<Liability> {
  const data = await apiClient.put<ApiLiability>(`/liabilities/${id}/convert-to-property`)
  return toLiability(data)
}

/**
 * Delete all liabilities using the V2 endpoint (bulk delete, includes versioned entries)
 */
export async function deleteAllLiabilities(): Promise<void> {
  const response = await fetch('/api/v2/liabilities', { method: 'DELETE' })
  if (!response.ok && response.status !== 204) {
    const errorText = await response.text()
    throw new Error(`Failed to delete liabilities: ${response.status} ${errorText}`)
  }
}

export const liabilitiesApi = {
  listLiabilities,
  createLiability,
  updateLiability,
  stopLiability,
  deleteLiability,
  deleteAllLiabilities,
  convertLiabilityToProperty,
}
