import { apiClient } from '../client'
import { toPropertyLink, toPropertyScenario } from './transformers'
import type { PropertyLinkRecord, PropertyScenarioRecord } from '@/types/property'
import type { PaginatedResponse, PaginationParams } from '@/types/financial'
import { normalizePaginatedResponse } from './transformers'
import { buildPaginatedPath } from './helpers'

export async function createPropertyScenario(payload: {
  propertyType: string
  headline: string
  subheadline?: string
  propertyPrice: number
  downPayment: number
  loanAmount: number
  interestRate: number
  loanTenure: number
  notes?: string
  assetId?: string
  liabilityId?: string
}): Promise<PropertyScenarioRecord> {
  const body = {
    propertyType: payload.propertyType,
    headline: payload.headline,
    subheadline: payload.subheadline ?? '',
    propertyPrice: payload.propertyPrice,
    downPayment: payload.downPayment || 0,
    loanAmount: payload.loanAmount || 0,
    interestRate: payload.interestRate || 0,
    loanTenure: payload.loanTenure || 0,
    notes: payload.notes ?? '',
    asset_id: payload.assetId,
    liability_id: payload.liabilityId,
  }
  const data = await apiClient.post<any>('/property-planner/scenarios', body)
  return toPropertyScenario(data)
}

export async function getPropertyScenario(id: string): Promise<PropertyScenarioRecord> {
  const data = await apiClient.get<any>(`/property-planner/scenarios/${id}`)
  return toPropertyScenario(data)
}

export async function listPropertyScenarios(): Promise<PropertyScenarioRecord[]> {
  const data = await apiClient.get<any[]>('/property-planner/scenarios')
  return (data ?? []).map(toPropertyScenario)
}

export async function deletePropertyScenario(id: string): Promise<void> {
  if (!id) return
  await apiClient.delete<void>(`/property-planner/scenarios/${id}`)
}

export async function createPropertyLink(payload: {
  propertyScenarioId?: string
  assetId: string
  liabilityId: string
}): Promise<{ link: PropertyLinkRecord; scenario: PropertyScenarioRecord }> {
  const body = {
    property_scenario_id: payload.propertyScenarioId,
    asset_id: payload.assetId,
    liability_id: payload.liabilityId,
  }
  const data = await apiClient.post<any>('/property-links', body)
  return {
    link: toPropertyLink(data.property_link ?? data.link ?? data),
    scenario: toPropertyScenario(data.property_scenario ?? data.scenario ?? data),
  }
}

export async function updatePropertyLink(
  id: string,
  payload: { propertyScenarioId: string; assetId: string; liabilityId: string }
): Promise<PropertyLinkRecord> {
  const body = {
    property_scenario_id: payload.propertyScenarioId,
    asset_id: payload.assetId,
    liability_id: payload.liabilityId,
  }
  const data = await apiClient.put<any>(`/property-links/${id}`, body)
  return toPropertyLink(data)
}

export async function listPropertyLinks(scenarioId: string): Promise<PropertyLinkRecord[]> {
  const data = await apiClient.get<any[]>(`/property-links?property_scenario_id=${encodeURIComponent(scenarioId)}`)
  return (data ?? []).map(toPropertyLink)
}

export async function listPropertyLinksByAsset(assetId: string): Promise<PropertyLinkRecord[]> {
  const data = await apiClient.get<any[]>(`/property-links?asset_id=${encodeURIComponent(assetId)}`)
  return (data ?? []).map(toPropertyLink)
}

export async function listPropertyLinksByLiability(liabilityId: string): Promise<PropertyLinkRecord[]> {
  const data = await apiClient.get<any[]>(`/property-links?liability_id=${encodeURIComponent(liabilityId)}`)
  return (data ?? []).map(toPropertyLink)
}

export async function listAllPropertyLinks(params?: PaginationParams): Promise<PaginatedResponse<PropertyLinkRecord>> {
  const path = buildPaginatedPath('/property-links', params)
  const data = await apiClient.get<any>(path)
  return normalizePaginatedResponse<PropertyLinkRecord>(data, toPropertyLink, params)
}

export const propertyApi = {
  createPropertyScenario,
  getPropertyScenario,
  listPropertyScenarios,
  deletePropertyScenario,
  createPropertyLink,
  updatePropertyLink,
  listPropertyLinks,
  listPropertyLinksByAsset,
  listPropertyLinksByLiability,
  listAllPropertyLinks,
}
