import { ApiError, apiClient } from '../client'
import { buildPaginatedPath } from './helpers'
import { normalizePaginatedResponse } from './transformers'
import { get, getOr, asRecord } from '@/lib/utils'
import type { PaginatedResponse, PaginationParams, SortParams } from '@/types/financial'

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface InsurancePolicyRecord {
  id: string
  userId: string
  personId: string | null
  personName: string
  name: string
  category: string
  subcategory: string | null
  governmentScheme: string | null
  coverageAmount: number
  deathBenefit: number | null
  criticalIllnessBenefit: number | null
  tpdBenefit: number | null
  dailyHospitalCash: number | null
  payoutAmount: number | null
  payoutFrequency: string | null
  premiumAmount: number
  premiumFrequency: string
  startDate: string
  endDate: string | null
  renewalDate: string | null
  insurerName: string | null
  policyNumber: string | null
  linkedExpenseId: string | null
  isActive: boolean
  notes: string | null
  createdAt: string
  updatedAt: string
}

export interface InsurancePolicyCreateInput {
  personId?: string
  name: string
  category: string
  subcategory?: string
  governmentScheme?: string
  coverageAmount: string
  deathBenefit?: string
  criticalIllnessBenefit?: string
  tpdBenefit?: string
  dailyHospitalCash?: string
  payoutAmount?: string
  payoutFrequency?: string
  premiumAmount: string
  premiumFrequency: string
  startDate: string
  endDate?: string
  renewalDate?: string
  insurerName?: string
  policyNumber?: string
  linkedExpenseId?: string
  isActive?: boolean
  notes?: string
}

// ─────────────────────────────────────────────────────────────────────────────
// Transformer
// ─────────────────────────────────────────────────────────────────────────────

function toInsurancePolicy(data: unknown): InsurancePolicyRecord {
  const item = asRecord(data)
  return {
    id: get<string>(item, 'id', 'ID') ?? '',
    userId: get<string>(item, 'userId', 'UserID') ?? '',
    personId: get<string>(item, 'personId', 'PersonID') ?? null,
    personName: getOr<string>(item, '', 'personName', 'PersonName'),
    name: get<string>(item, 'name', 'Name') ?? '',
    category: get<string>(item, 'category', 'Category') ?? '',
    subcategory: get<string>(item, 'subcategory', 'Subcategory') ?? null,
    governmentScheme: get<string>(item, 'governmentScheme', 'GovernmentScheme') ?? null,
    coverageAmount: get<number>(item, 'coverageAmount', 'CoverageAmount') ?? 0,
    deathBenefit: get<number>(item, 'deathBenefit', 'DeathBenefit') ?? null,
    criticalIllnessBenefit: get<number>(item, 'criticalIllnessBenefit', 'CriticalIllnessBenefit') ?? null,
    tpdBenefit: get<number>(item, 'tpdBenefit', 'TpdBenefit') ?? null,
    dailyHospitalCash: get<number>(item, 'dailyHospitalCash', 'DailyHospitalCash') ?? null,
    payoutAmount: get<number>(item, 'payoutAmount', 'PayoutAmount') ?? null,
    payoutFrequency: get<string>(item, 'payoutFrequency', 'PayoutFrequency') ?? null,
    premiumAmount: get<number>(item, 'premiumAmount', 'PremiumAmount') ?? 0,
    premiumFrequency: getOr<string>(item, 'monthly', 'premiumFrequency', 'PremiumFrequency'),
    startDate: get<string>(item, 'startDate', 'StartDate') ?? '',
    endDate: get<string>(item, 'endDate', 'EndDate') ?? null,
    renewalDate: get<string>(item, 'renewalDate', 'RenewalDate') ?? null,
    insurerName: get<string>(item, 'insurerName', 'InsurerName') ?? null,
    policyNumber: get<string>(item, 'policyNumber', 'PolicyNumber') ?? null,
    linkedExpenseId: get<string>(item, 'linkedExpenseId', 'LinkedExpenseID') ?? null,
    isActive: get<boolean>(item, 'isActive', 'IsActive') ?? true,
    notes: get<string>(item, 'notes', 'Notes') ?? null,
    createdAt: getOr<string>(item, new Date().toISOString(), 'createdAt', 'CreatedAt'),
    updatedAt: getOr<string>(item, new Date().toISOString(), 'updatedAt', 'UpdatedAt'),
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// API functions
// ─────────────────────────────────────────────────────────────────────────────

export type InsurancePolicyListParams = PaginationParams & SortParams & {
  personIds?: string[]
  categories?: string[]
  startDateFrom?: string
  startDateTo?: string
}

export async function listInsurancePolicies(
  params?: InsurancePolicyListParams
): Promise<PaginatedResponse<InsurancePolicyRecord>> {
  let path = buildPaginatedPath('/insurance/policies', params)
  const appendParam = (key: string, value: string) => {
    const separator = path.includes('?') ? '&' : '?'
    path += `${separator}${key}=${value}`
  }
  if (params?.personIds && params.personIds.length > 0) {
    appendParam('personIds', params.personIds.join(','))
  }
  if (params?.categories && params.categories.length > 0) {
    appendParam('categories', params.categories.join(','))
  }
  if (params?.startDateFrom) {
    appendParam('startDateFrom', params.startDateFrom)
  }
  if (params?.startDateTo) {
    appendParam('startDateTo', params.startDateTo)
  }
  const data = await apiClient.get<unknown>(path, undefined, { baseUrl: '/api/v2' })
  return normalizePaginatedResponse<InsurancePolicyRecord>(data, toInsurancePolicy, params)
}

export async function createInsurancePolicy(
  payload: InsurancePolicyCreateInput
): Promise<InsurancePolicyRecord> {
  const data = await apiClient.post<unknown>('/insurance/policies', payload, { baseUrl: '/api/v2' })
  return toInsurancePolicy(data)
}

export async function updateInsurancePolicy(
  id: string,
  payload: InsurancePolicyCreateInput
): Promise<InsurancePolicyRecord> {
  const data = await apiClient.put<unknown>(`/insurance/policies/${id}`, payload, { baseUrl: '/api/v2' })
  return toInsurancePolicy(data)
}

export async function deleteInsurancePolicy(id: string): Promise<void> {
  try {
    await apiClient.delete<void>(`/insurance/policies/${id}`, { baseUrl: '/api/v2' })
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return
    throw error
  }
}

export async function deleteAllInsurancePolicies(): Promise<void> {
  await apiClient.delete<void>('/insurance/policies', { baseUrl: '/api/v2' })
}

export const insuranceApi = {
  listInsurancePolicies,
  createInsurancePolicy,
  updateInsurancePolicy,
  deleteInsurancePolicy,
  deleteAllInsurancePolicies,
}
