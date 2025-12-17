import { ApiError, apiClient } from '../client'
import { buildPaginatedPath } from './helpers'
import { normalizePaginatedResponse, toAsset } from './transformers'
import type { Asset, PaginatedResponse, PaginationParams } from '@/types/financial'
import type { UpdateMode } from '@/components/modals/FinancialFormModal/types'

export async function listAssets(params?: PaginationParams): Promise<PaginatedResponse<Asset>> {
  const path = buildPaginatedPath('/assets', params)
  const data = await apiClient.get<any>(path)
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
  const body: Record<string, unknown> = {
    name: payload.name,
    category: payload.category,
    currentValue: payload.currentValue,
    annualGrowthRate: payload.annualGrowthRate,
    notes: payload.notes,
    startDate: payload.startDate,
    endDate: payload.endDate,
  }
  // Add updateMode for versioned updates
  if (payload.updateMode !== undefined) {
    body.updateMode = payload.updateMode
  }

  // Use v2 API for versioned update support
  const data = await apiClient.put<any>(`/v2/assets/${id}`, body)
  return toAsset(data)
}

// Stop an asset (soft delete) - sets end_date
export async function stopAsset(id: string, endDate: string): Promise<Asset> {
  const data = await apiClient.post<any>(`/v2/assets/${id}/stop`, { endDate })
  return toAsset(data)
}

export async function deleteAsset(id: string): Promise<void> {
  try {
    // Use v2 API for recursive delete support
    await apiClient.delete<void>(`/v2/assets/${id}`)
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

export async function deleteAllAssets(): Promise<void> {
  const result = await listAssets({ limit: -1 })
  await Promise.all(result.data.map((asset) => deleteAsset(asset.id)))
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
