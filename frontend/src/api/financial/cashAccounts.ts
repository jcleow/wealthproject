import { apiClient } from '../client'
import { toCashAccount } from './transformers'
import type { CashAccount } from '@/types/financial'

export async function listCashAccounts(): Promise<CashAccount[]> {
  const data = await apiClient.get<any[]>('/cash-accounts')
  return (data ?? []).map(toCashAccount)
}

export async function getCashAccount(id: string): Promise<CashAccount> {
  const data = await apiClient.get<any>(`/cash-accounts/${id}`)
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
  const body: Record<string, unknown> = {
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
  const data = await apiClient.put<any>(`/cash-accounts/${id}`, body)
  return toCashAccount(data)
}

export async function deleteCashAccount(id: string): Promise<void> {
  await apiClient.delete<void>(`/cash-accounts/${id}`)
}

export async function setAccumulatorAccount(id: string): Promise<void> {
  await apiClient.put<void>(`/cash-accounts/${id}/set-accumulator`)
}

export async function deleteAllCashAccounts(): Promise<void> {
  const accounts = await listCashAccounts()
  const nonAccumulatorAccounts = accounts.filter((account) => !account.isAccumulator)
  await Promise.all(nonAccumulatorAccounts.map((account) => deleteCashAccount(account.id)))
}

export const cashAccountsApi = {
  listCashAccounts,
  getCashAccount,
  createCashAccount,
  updateCashAccount,
  deleteCashAccount,
  setAccumulatorAccount,
  deleteAllCashAccounts,
}
