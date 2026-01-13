import { apiClient } from '../client'
import { toCPFAccount, toCPFConfiguration, toCPFContributionPreview } from './transformers'
import type {
  CPFAccount,
  CPFAccountCreatePayload,
  CPFAccountUpdatePayload,
  CPFAssumptionsResponse,
  CPFAssumptionsUpdateInput,
  CPFConfiguration,
  CPFContributionPreview,
  ResidencyStatus,
} from '@/types/cpf'
import type {
  CPFAccount as ApiCPFAccount,
  CpfV2CreateInput,
  CpfV2Input,
  StopInput,
} from '@/types/api.aliases'

export async function getCPFAccount(): Promise<CPFAccount | null> {
  try {
    const data = await apiClient.get<ApiCPFAccount>('/cpf/account', undefined, { baseUrl: '/api/v2' })
    return toCPFAccount(data)
  } catch {
    return null
  }
}

export async function listCPFAccounts(): Promise<CPFAccount[]> {
  try {
    const data = await apiClient.get<ApiCPFAccount[]>('/cpf/accounts', undefined, { baseUrl: '/api/v2' })
    return (data || []).map(toCPFAccount)
  } catch {
    return []
  }
}

export async function createCPFAccount(payload: CPFAccountCreatePayload): Promise<CPFAccount> {
  // Person-related fields (dateOfBirth, residencyStatus, prGrantDate) are now on the Person entity
  const body: CpfV2CreateInput = {
    personId: payload.personId,
    oaBalance: (payload.oaBalance ?? 0).toString(),
    saBalance: (payload.saBalance ?? 0).toString(),
    maBalance: (payload.maBalance ?? 0).toString(),
    raBalance: (payload.raBalance ?? 0).toString(),
    oaUsedForHousing: (payload.oaUsedForHousing ?? 0).toString(),
    housingStartDate: payload.housingStartDate ?? undefined,
  }
  const data = await apiClient.post<ApiCPFAccount>('/cpf/account', body, { baseUrl: '/api/v2' })
  return toCPFAccount(data)
}

export async function updateCPFAccount(
  id: string,
  payload: CPFAccountUpdatePayload
): Promise<CPFAccount> {
  // Use string for decimal values to preserve precision
  // Person-related fields (dateOfBirth, residencyStatus, prGrantDate) are now on the Person entity
  const body: CpfV2Input = {
    personId: payload.personId ?? undefined,
    oaBalance: payload.oaBalance?.toString() ?? '0',
    saBalance: payload.saBalance?.toString() ?? '0',
    maBalance: payload.maBalance?.toString() ?? '0',
    raBalance: payload.raBalance?.toString() ?? '0',
    oaUsedForHousing: payload.oaUsedForHousing?.toString() ?? '0',
    housingStartDate: payload.housingStartDate ?? undefined,
    updateMode: payload.updateMode,
    startDate: payload.startDate ?? undefined,
  }

  // Use v2 API for versioned update support
  const data = await apiClient.put<ApiCPFAccount>(`/cpf/account/${id}`, body, { baseUrl: '/api/v2' })
  return toCPFAccount(data)
}

export async function stopCPFAccount(id: string, endDate: string): Promise<CPFAccount> {
  const body: StopInput = { endDate }
  const data = await apiClient.post<ApiCPFAccount>(`/cpf/account/${id}/stop`, body, { baseUrl: '/api/v2' })
  return toCPFAccount(data)
}

export async function deleteCPFAccount(id: string): Promise<void> {
  // Use v2 API for proper delete with cascade support
  await apiClient.delete(`/cpf/account/${id}`, { baseUrl: '/api/v2' })
}

/**
 * Delete all CPF accounts using the V2 endpoint (bulk delete, includes versioned entries)
 */
export async function deleteCurrentCPFAccount(): Promise<void> {
  const response = await fetch('/api/v2/cpf/accounts', { method: 'DELETE' })
  if (!response.ok && response.status !== 204) {
    const errorText = await response.text()
    throw new Error(`Failed to delete CPF accounts: ${response.status} ${errorText}`)
  }
}

export async function getCPFConfig(params?: { year?: number; date?: string }): Promise<CPFConfiguration> {
  const searchParams = new URLSearchParams()
  if (params?.year) searchParams.set('year', params.year.toString())
  if (params?.date) searchParams.set('date', params.date)
  const url = `/cpf/config${searchParams.toString() ? `?${searchParams}` : ''}`
  const data = await apiClient.get<any>(url)
  return toCPFConfiguration(data)
}

export async function listCPFConfigYears(): Promise<number[]> {
  const data = await apiClient.get<{ years: number[] }>('/cpf/config/years')
  return data.years
}

export async function getCPFContributionPreview(params: {
  grossWage: number
  age: number
  residencyStatus: ResidencyStatus
  cpfWageType: 'ow' | 'aw'
}): Promise<CPFContributionPreview> {
  const searchParams = new URLSearchParams({
    gross_wage: params.grossWage.toString(),
    age: params.age.toString(),
    residency_status: params.residencyStatus,
    cpf_wage_type: params.cpfWageType,
  })
  const data = await apiClient.get<any>(`/cpf/contribution-preview?${searchParams}`)
  return toCPFContributionPreview(data)
}

// ============================================================================
// CPF Assumptions API
// ============================================================================

/**
 * Get CPF assumptions for a specific account.
 * Creates default assumptions if none exist.
 */
export async function getCPFAssumptions(cpfAccountId: string): Promise<CPFAssumptionsResponse> {
  return apiClient.get<CPFAssumptionsResponse>(
    `/cpf/account/${cpfAccountId}/assumptions`,
    undefined,
    { baseUrl: '/api/v2' }
  )
}

/**
 * Update CPF assumptions for a specific account.
 * Only provided fields are updated (partial update).
 */
export async function updateCPFAssumptions(
  cpfAccountId: string,
  updates: CPFAssumptionsUpdateInput
): Promise<CPFAssumptionsResponse> {
  return apiClient.put<CPFAssumptionsResponse>(
    `/cpf/account/${cpfAccountId}/assumptions`,
    updates,
    { baseUrl: '/api/v2' }
  )
}

/**
 * Delete CPF assumptions for a specific account (resets to defaults).
 */
export async function deleteCPFAssumptions(cpfAccountId: string): Promise<void> {
  await apiClient.delete(`/cpf/account/${cpfAccountId}/assumptions`, { baseUrl: '/api/v2' })
}

// ============================================================================
// CPF LIFE Estimate API
// ============================================================================

/**
 * Input for CPF LIFE payout estimate calculation.
 * Supports two modes:
 * 1. With cpfAccountId: fetches birth year and gender from linked Person
 * 2. Standalone: provide birthYear and gender directly
 */
export interface CPFLifeEstimateInput {
  cpfAccountId?: string // Optional: CPF account to get person's birth year and gender
  birthYear?: number // Optional: birth year for standalone mode
  gender?: 'male' | 'female' // Optional: gender for standalone mode
  raBalanceAt65: string // Required: RA balance at age 65
  payoutStartAge: number // Required: 65-70
}

/**
 * Response from CPF LIFE payout estimate calculation.
 */
export interface CPFLifeEstimateResponse {
  raBalanceAt65: string
  payoutStartAge: number
  birthYear: number
  gender: string
  estimates: {
    standard: {
      monthlyPayout: string
      annualPayout: string
      payoutRate: string
    }
    basic: {
      monthlyPayout: string
      annualPayout: string
      payoutRate: string
    }
    escalating: {
      monthlyPayout: string
      annualPayout: string
      payoutRate: string
      payoutAt75: string
      payoutAt85: string
    }
  }
  disclaimer: string
}

/**
 * Calculate CPF LIFE payout estimates for all three plans.
 * Uses a regression model based on official CPF calculator data.
 */
export async function calculateCPFLifeEstimate(
  input: CPFLifeEstimateInput
): Promise<CPFLifeEstimateResponse> {
  return apiClient.post<CPFLifeEstimateResponse>(
    '/cpf/calculators/cpflife-estimate',
    input,
    { baseUrl: '/api/v2' }
  )
}

// ============================================================================
// CPF Projection API
// ============================================================================

/**
 * Input for CPF projection with LIFE estimates.
 */
export interface CPFProjectionInput {
  payoutStartAge: number // 65-70
  includeIncomes?: boolean // Include linked incomes in projection (default true)
}

/**
 * Response from CPF projection with LIFE estimates.
 */
export interface CPFProjectionResponse {
  projectedBalances: {
    oa: string
    sa: string
    ma: string
    ra: string
    asOfDate: string // The date when person turns 65
  }
  currentBalances: {
    oa: string
    sa: string
    ma: string
    ra: string
    asOfDate: string
  }
  birthYear: number
  gender: string
  age65Date: string // When the person turns 65
  cpfLifeEstimates?: CPFLifeEstimateResponse
}

/**
 * Project CPF balances to age 65 and calculate CPF LIFE estimates.
 */
export async function getCPFProjection(
  cpfAccountId: string,
  input: CPFProjectionInput
): Promise<CPFProjectionResponse> {
  return apiClient.post<CPFProjectionResponse>(
    `/cpf/account/${cpfAccountId}/projection`,
    input,
    { baseUrl: '/api/v2' }
  )
}

export const cpfApi = {
  getCPFAccount,
  listCPFAccounts,
  createCPFAccount,
  updateCPFAccount,
  stopCPFAccount,
  deleteCPFAccount,
  deleteCurrentCPFAccount,
  getCPFConfig,
  listCPFConfigYears,
  getCPFContributionPreview,
  // Assumptions API
  getCPFAssumptions,
  updateCPFAssumptions,
  deleteCPFAssumptions,
  // CPF LIFE Estimate API
  calculateCPFLifeEstimate,
  // CPF Projection API
  getCPFProjection,
}
