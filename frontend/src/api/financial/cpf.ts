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
    const data = await apiClient.get<any>('/cpf/account')
    return toCPFAccount(data)
  } catch {
    return null
  }
}

export async function createCPFAccount(payload: CPFAccountCreatePayload): Promise<CPFAccount> {
  const body = {
    oa_balance: payload.oaBalance ?? 0,
    sa_balance: payload.saBalance ?? 0,
    ma_balance: payload.maBalance ?? 0,
    ra_balance: payload.raBalance ?? 0,
    oa_used_for_housing: payload.oaUsedForHousing ?? 0,
    housing_start_date: payload.housingStartDate,
    date_of_birth: payload.dateOfBirth,
    residency_status: payload.residencyStatus,
    pr_grant_date: payload.prGrantDate,
  }
  const data = await apiClient.post<any>('/cpf/account', body)
  return toCPFAccount(data)
}

export async function updateCPFAccount(payload: CPFAccountUpdatePayload): Promise<CPFAccount> {
  const body: Record<string, unknown> = {}
  if (payload.oaBalance !== undefined) body.oa_balance = payload.oaBalance
  if (payload.saBalance !== undefined) body.sa_balance = payload.saBalance
  if (payload.maBalance !== undefined) body.ma_balance = payload.maBalance
  if (payload.raBalance !== undefined) body.ra_balance = payload.raBalance
  if (payload.oaUsedForHousing !== undefined) body.oa_used_for_housing = payload.oaUsedForHousing
  if (payload.housingStartDate !== undefined) body.housing_start_date = payload.housingStartDate
  if (payload.dateOfBirth !== undefined) body.date_of_birth = payload.dateOfBirth
  if (payload.residencyStatus !== undefined) body.residency_status = payload.residencyStatus
  if (payload.prGrantDate !== undefined) body.pr_grant_date = payload.prGrantDate

  const data = await apiClient.put<any>('/cpf/account', body)
  return toCPFAccount(data)
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
  getCPFConfig,
  listCPFConfigYears,
  getCPFContributionPreview,
}
