import { apiClient } from '../client'
import { toCPFAccount, toCPFConfiguration, toCPFContributionPreview } from './transformers'
import type {
  CPFAccount,
  CPFAccountCreatePayload,
  CPFAccountUpdatePayload,
  CPFConfiguration,
  CPFContributionPreview,
  ResidencyStatus,
} from '@/types/cpf'

export async function getCPFAccount(): Promise<CPFAccount | null> {
  try {
    const data = await apiClient.get<any>('/v2/cpf/account')
    return toCPFAccount(data)
  } catch {
    return null
  }
}

export async function createCPFAccount(payload: CPFAccountCreatePayload): Promise<CPFAccount> {
  const body = {
    oaBalance: (payload.oaBalance ?? 0).toString(),
    saBalance: (payload.saBalance ?? 0).toString(),
    maBalance: (payload.maBalance ?? 0).toString(),
    raBalance: (payload.raBalance ?? 0).toString(),
    oaUsedForHousing: (payload.oaUsedForHousing ?? 0).toString(),
    housingStartDate: payload.housingStartDate,
    dateOfBirth: payload.dateOfBirth,
    residencyStatus: payload.residencyStatus,
    prGrantDate: payload.prGrantDate,
  }
  const data = await apiClient.post<any>('/v2/cpf/account', body)
  return toCPFAccount(data)
}

export async function updateCPFAccount(
  id: string,
  payload: CPFAccountUpdatePayload
): Promise<CPFAccount> {
  // Use string for decimal values to preserve precision
  const body: Record<string, unknown> = {
    oaBalance: payload.oaBalance?.toString() ?? '0',
    saBalance: payload.saBalance?.toString() ?? '0',
    maBalance: payload.maBalance?.toString() ?? '0',
    raBalance: payload.raBalance?.toString() ?? '0',
    oaUsedForHousing: payload.oaUsedForHousing?.toString() ?? '0',
    housingStartDate: payload.housingStartDate,
    dateOfBirth: payload.dateOfBirth,
    residencyStatus: payload.residencyStatus,
    prGrantDate: payload.prGrantDate,
    updateMode: payload.updateMode,
    startDate: payload.startDate,
  }

  // Use v2 API for versioned update support
  const data = await apiClient.put<any>(`/v2/cpf/account/${id}`, body)
  return toCPFAccount(data)
}

export async function stopCPFAccount(id: string, endDate: string): Promise<CPFAccount> {
  const data = await apiClient.post<any>(`/v2/cpf/account/${id}/stop`, { endDate })
  return toCPFAccount(data)
}

export async function deleteCPFAccount(id: string): Promise<void> {
  // Use v2 API for proper delete with cascade support
  await apiClient.delete(`/v2/cpf/account/${id}`)
}

// Helper to delete the current user's CPF account (fetches ID first)
export async function deleteCurrentCPFAccount(): Promise<void> {
  const account = await getCPFAccount()
  if (account) {
    await deleteCPFAccount(account.id)
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

export const cpfApi = {
  getCPFAccount,
  createCPFAccount,
  updateCPFAccount,
  stopCPFAccount,
  deleteCPFAccount,
  deleteCurrentCPFAccount,
  getCPFConfig,
  listCPFConfigYears,
  getCPFContributionPreview,
}
