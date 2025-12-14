import { ApiError, apiClient } from '../client'
import { buildPaginatedPath } from './helpers'
import { normalizePaginatedResponse, toExpense } from './transformers'
import type { Expense, PaginatedResponse, PaginationParams } from '@/types/financial'

export async function listExpenses(params?: PaginationParams): Promise<PaginatedResponse<Expense>> {
  const path = buildPaginatedPath('/cashflow/expenses', params)
  const data = await apiClient.get<any>(path)
  return normalizePaginatedResponse<Expense>(data, toExpense, params)
}

export async function createExpense(payload: Omit<Expense, 'id' | 'updatedAt'>): Promise<Expense> {
  const body: Record<string, unknown> = {
    payee: payload.payee,
    amount: payload.amount,
    frequency: payload.frequency,
    category: payload.category,
    growthRate: payload.growthRate ?? 2.0,
    notes: payload.notes,
  }
  if (payload.startDate !== undefined) body.startDate = payload.startDate
  if (payload.endDate !== undefined) body.endDate = payload.endDate

  const data = await apiClient.post<any>('/cashflow/expenses', body)
  return toExpense(data)
}

export async function updateExpense(id: string, payload: Partial<Expense>): Promise<Expense> {
  const body: Record<string, unknown> = {
    payee: payload.payee,
    amount: payload.amount,
    frequency: payload.frequency,
    category: payload.category,
    growthRate: payload.growthRate,
    notes: payload.notes,
    startDate: payload.startDate,
    endDate: payload.endDate,
  }

  const data = await apiClient.put<any>(`/cashflow/expenses/${id}`, body)
  return toExpense(data)
}

export async function deleteExpense(id: string): Promise<void> {
  try {
    await apiClient.delete<void>(`/cashflow/expenses/${id}`)
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return
    }
    throw error
  }
}

export async function deleteAllExpenses(): Promise<void> {
  const result = await listExpenses({ limit: -1 })
  await Promise.allSettled(result.data.map((expense) => deleteExpense(expense.id)))
}

export const expensesApi = {
  listExpenses,
  createExpense,
  updateExpense,
  deleteExpense,
  deleteAllExpenses,
}
