import { ApiError, apiClient } from '../client'
import { toCashAccount } from './transformers'
import type { CashAccount } from '@/types/financial'

export async function listCashAccounts(): Promise<CashAccount[]> {
  const data = await apiClient.get<any>('/cash-accounts', undefined, { baseUrl: '/api/v2' })
  // V2 API returns paginated response with data array
  const items = Array.isArray(data?.data) ? data.data : []
  return items.map(toCashAccount)
}

export async function getCashAccount(id: string): Promise<CashAccount> {
  const data = await apiClient.get<any>(`/cash-accounts/${id}`, undefined, { baseUrl: '/api/v2' })
  return toCashAccount(data)
}

export async function createCashAccount(payload: Omit<CashAccount, 'id' | 'createdAt' | 'updatedAt'>): Promise<CashAccount> {
  const body = {
    name: payload.name,
    balance: payload.balance,
    interest_rate: payload.interestRate,
    bank_name: payload.bankName,
    account_type: payload.accountType,
    is_accumulator: payload.isAccumulator,
    start_year: payload.startYear,
    end_year: payload.endYear,
    notes: payload.notes,
  }
  const data = await apiClient.post<any>('/cash-accounts', body)
  return toCashAccount(data)
}

export async function updateCashAccount(id: string, payload: Partial<CashAccount>): Promise<CashAccount> {
  // Use string for decimal values to avoid float64 precision loss
  const body: Record<string, unknown> = {
    name: payload.name,
    balance: payload.balance?.toString(),
    interestRate: payload.interestRate?.toString(),
    bankName: payload.bankName,
    accountType: payload.accountType,
    notes: payload.notes,
  }
  // Use v2 API for versioned update support
  const data = await apiClient.put<any>(`/cash-accounts/${id}`, body, { baseUrl: '/api/v2' })
  return toCashAccount(data)
}

// Stop a cash account (soft delete) - sets end_date and cascades to linked allocations
export async function stopCashAccount(id: string, endDate: string): Promise<CashAccount> {
  const data = await apiClient.post<any>(`/cash-accounts/${id}/stop`, { endDate }, { baseUrl: '/api/v2' })
  return toCashAccount(data)
}

export async function deleteCashAccount(id: string): Promise<void> {
  try {
    // Use v2 API for proper delete with cascade support
    await apiClient.delete<void>(`/cash-accounts/${id}`, { baseUrl: '/api/v2' })
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return
    }
    throw error
  }
}

export async function setAccumulatorAccount(id: string): Promise<void> {
  await apiClient.put<void>(`/cash-accounts/${id}/set-accumulator`)
}

/**
 * Delete all cash accounts using the V2 endpoint (bulk delete, includes versioned entries)
 */
export async function deleteAllCashAccounts(): Promise<void> {
  const response = await fetch('/api/v2/cash-accounts', { method: 'DELETE' })
  if (!response.ok && response.status !== 204) {
    const errorText = await response.text()
    throw new Error(`Failed to delete cash accounts: ${response.status} ${errorText}`)
  }
}

export const cashAccountsApi = {
  listCashAccounts,
  getCashAccount,
  createCashAccount,
  updateCashAccount,
  stopCashAccount,
  deleteCashAccount,
  setAccumulatorAccount,
  deleteAllCashAccounts,
}
