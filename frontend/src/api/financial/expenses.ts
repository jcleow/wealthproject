import { ApiError, apiClient } from '../client'
import { buildPaginatedPath } from './helpers'
import { toExpense } from './transformers'
import type { Expense, PaginatedResponse, PaginationParams } from '@/types/financial'

export async function listExpenses(params?: PaginationParams): Promise<PaginatedResponse<Expense>> {
  const path = buildPaginatedPath('/cashflow/expenses', params)
  const raw = await apiClient.get<any>(path)

  // Backend returns GroupedExpenses with RegularExpenses and DebtRepayments
  // Combine them into a single data array for pagination
  const regularExpenses = Array.isArray(raw?.regularExpenses) ? raw.regularExpenses : []
  const debtRepayments = Array.isArray(raw?.debtRepayments) ? raw.debtRepayments : []
  const items = [...regularExpenses, ...debtRepayments]

  return {
    data: items.map(toExpense),
    total: raw?.total ?? items.length,
    limit: raw?.limit ?? params?.limit ?? 20,
    offset: raw?.offset ?? params?.offset ?? 0,
    hasMore: raw?.hasMore ?? false,
  }
}

export async function createExpense(payload: Omit<Expense, 'id' | 'updatedAt'> & { parentId?: string; sourceLiabilityId?: string }): Promise<Expense> {
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
  if (payload.parentId !== undefined) body.parentId = payload.parentId
  if (payload.sourceLiabilityId !== undefined) body.sourceLiabilityId = payload.sourceLiabilityId

  const data = await apiClient.post<any>('/cashflow/expenses', body)
  return toExpense(data)
}

export async function updateExpense(
  id: string,
  payload: Partial<Expense> & {
    sourceLiabilityId?: string
    updateMode?: 'in_place' | 'versioned'
  }
): Promise<Expense> {
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
  // Preserve sourceLiabilityId for debt repayment expenses
  if (payload.sourceLiabilityId !== undefined) {
    body.sourceLiabilityId = payload.sourceLiabilityId
  }
  // Add updateMode for versioned updates
  if (payload.updateMode !== undefined) {
    body.updateMode = payload.updateMode
  }

  const data = await apiClient.put<any>(`/cashflow/expenses/${id}`, body)
  return toExpense(data)
}

// Stop an expense (soft delete) - sets end_date
export async function stopExpense(id: string, endDate: string): Promise<Expense> {
  const data = await apiClient.post<any>(`/cashflow/expenses/${id}/stop`, { endDate })
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
  stopExpense,
  deleteExpense,
  deleteAllExpenses,
}
