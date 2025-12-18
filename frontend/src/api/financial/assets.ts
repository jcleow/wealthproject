import { ApiError, apiClient } from '../client'
import { buildPaginatedPath } from './helpers'
import { normalizePaginatedResponse, toAsset } from './transformers'
import type { Asset, PaginatedResponse, PaginationParams } from '@/types/financial'
import type { UpdateMode } from '@/components/modals/FinancialFormModal/types'

export async function listAssets(params?: PaginationParams): Promise<PaginatedResponse<Asset>> {
  const path = buildPaginatedPath('/assets', params)
  const data = await apiClient.get<any>(path, undefined, { baseUrl: '/api/v2' })
  return normalizePaginatedResponse<Asset>(data, toAsset, params)
}

export async function createAsset(payload: Omit<Asset, 'id' | 'updatedAt'>): Promise<Asset> {
  const body: Record<string, unknown> = {
    name: payload.name,
    category: payload.category,
    currentValue: payload.currentValue,
    annualGrowthRate: payload.annualGrowthRate,
    notes: payload.notes,
  }

  if (payload.startDate !== undefined) body.startDate = payload.startDate
  if (payload.endDate !== undefined) body.endDate = payload.endDate

  const data = await apiClient.post<any>('/assets', body)
  return toAsset(data)
}

export async function updateAsset(
  id: string,
  payload: Partial<Asset> & {
    updateMode?: UpdateMode
  }
): Promise<Asset> {
  // Use string for decimal values to avoid float64 precision loss
  const body: Record<string, unknown> = {
    name: payload.name,
    category: payload.category,
    currentValue: payload.currentValue?.toString(),
    annualGrowthRate: payload.annualGrowthRate?.toString(),
    notes: payload.notes,
    startDate: payload.startDate,
    endDate: payload.endDate,
  }
  // Add updateMode for versioned updates
  if (payload.updateMode !== undefined) {
    body.updateMode = payload.updateMode
  }

  // Use v2 API for versioned update support
  const data = await apiClient.put<any>(`/assets/${id}`, body, { baseUrl: '/api/v2' })
  return toAsset(data)
}

// Stop an asset (soft delete) - sets end_date
export async function stopAsset(id: string, endDate: string): Promise<Asset> {
  const data = await apiClient.post<any>(`/assets/${id}/stop`, { endDate }, { baseUrl: '/api/v2' })
  return toAsset(data)
}

export async function deleteAsset(id: string): Promise<void> {
  try {
    // Use v2 API for recursive delete support
    await apiClient.delete<void>(`/assets/${id}`, { baseUrl: '/api/v2' })
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return
    }
    throw error
  }
}

export async function convertAssetToProperty(id: string): Promise<Asset> {
  const data = await apiClient.put<any>(`/assets/${id}/convert-to-property`)
  return toAsset(data)
}

/**
 * Delete all assets using the V2 endpoint (bulk delete, includes versioned entries)
 */
export async function deleteAllAssets(): Promise<void> {
  const response = await fetch('/api/v2/assets', { method: 'DELETE' })
  if (!response.ok && response.status !== 204) {
    const errorText = await response.text()
    throw new Error(`Failed to delete assets: ${response.status} ${errorText}`)
  }
}

export const assetsApi = {
  listAssets,
  createAsset,
  updateAsset,
  stopAsset,
  deleteAsset,
  deleteAllAssets,
  convertAssetToProperty,
}
