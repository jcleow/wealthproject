import { apiClient } from '../client'
import { buildPaginatedPath } from './helpers'
import { normalizePaginatedResponse, toAsset } from './transformers'
import type { Asset, PaginatedResponse, PaginationParams } from '@/types/financial'

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

export async function updateAsset(id: string, payload: Partial<Asset>): Promise<Asset> {
  const body: Record<string, unknown> = {
    name: payload.name,
    category: payload.category,
    currentValue: payload.currentValue,
    annualGrowthRate: payload.annualGrowthRate,
    notes: payload.notes,
    startDate: payload.startDate,
    endDate: payload.endDate,
  }

  const data = await apiClient.put<any>(`/assets/${id}`, body)
  return toAsset(data)
}

export async function deleteAsset(id: string): Promise<void> {
  await apiClient.delete<void>(`/assets/${id}`)
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
  deleteAsset,
  deleteAllAssets,
  convertAssetToProperty,
}
