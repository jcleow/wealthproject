import { ApiError, apiClient } from '../client'
import { buildPaginatedPath } from './helpers'
import { toExpense } from './transformers'
import type { Expense, PaginatedResponse, PaginationParams } from '@/types/financial'
import type { UpdateMode } from '@/components/modals/FinancialFormModal/types'

export async function listExpenses(params?: PaginationParams): Promise<PaginatedResponse<Expense>> {
  const path = buildPaginatedPath('/cashflow/expenses', params)
  // Use v2 API for full expense management
  const raw = await apiClient.get<any>(path, undefined, { baseUrl: '/api/v2' })

  // Backend returns GroupedExpenses with regularExpenses and debtRepayments
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
  // Use string for decimal values to avoid float64 precision loss
  const body: Record<string, unknown> = {
    name: payload.name,
    amount: payload.amount?.toString(),
    frequency: payload.frequency,
    category: payload.category,
    growthRate: (payload.growthRate ?? 2.0).toString(),
    notes: payload.notes,
  }
  if (payload.startDate !== undefined) body.startDate = payload.startDate
  if (payload.endDate !== undefined) body.endDate = payload.endDate
  if (payload.parentId !== undefined) body.parentId = payload.parentId
  if (payload.sourceLiabilityId !== undefined) body.sourceLiabilityId = payload.sourceLiabilityId

  // Use v2 API for full expense management
  const data = await apiClient.post<any>('/cashflow/expenses', body, { baseUrl: '/api/v2' })
  return toExpense(data)
}

export async function updateExpense(
  id: string,
  payload: Partial<Expense> & {
    sourceLiabilityId?: string
    updateMode?: UpdateMode
  }
): Promise<Expense> {
  // Only include fields that are actually provided (partial update support)
  const body: Record<string, unknown> = {}
  if (payload.name !== undefined) body.name = payload.name
  if (payload.amount !== undefined) body.amount = payload.amount.toString()
  if (payload.frequency !== undefined) body.frequency = payload.frequency
  if (payload.category !== undefined) body.category = payload.category
  if (payload.growthRate !== undefined) body.growthRate = payload.growthRate.toString()
  if (payload.notes !== undefined) body.notes = payload.notes
  if (payload.startDate !== undefined) body.startDate = payload.startDate
  if (payload.endDate !== undefined) body.endDate = payload.endDate
  if (payload.sourceLiabilityId !== undefined) body.sourceLiabilityId = payload.sourceLiabilityId
  if (payload.updateMode !== undefined) body.updateMode = payload.updateMode

  // Use v2 API for versioned update support
  const data = await apiClient.put<any>(`/cashflow/expenses/${id}`, body, { baseUrl: '/api/v2' })
  return toExpense(data)
}

// Stop an expense (soft delete) - sets end_date
export async function stopExpense(id: string, endDate: string): Promise<Expense> {
  // Use v2 API for versioned stop support
  const data = await apiClient.post<any>(`/cashflow/expenses/${id}/stop`, { endDate }, { baseUrl: '/api/v2' })
  return toExpense(data)
}

export async function deleteExpense(id: string): Promise<void> {
  try {
    // Use v2 API for recursive delete support
    await apiClient.delete<void>(`/cashflow/expenses/${id}`, { baseUrl: '/api/v2' })
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return
    }
    throw error
  }
}

/** @deprecated Use deleteAllExpensesV2 instead */
export async function deleteAllExpenses(): Promise<void> {
  const result = await listExpenses({ limit: -1 })
  await Promise.allSettled(result.data.map((expense) => deleteExpense(expense.id)))
}

/**
 * Delete all expenses using the V2 endpoint (bulk delete, includes versioned entries)
 */
export async function deleteAllExpensesV2(): Promise<void> {
  const response = await fetch('/api/v2/cashflow/expenses', { method: 'DELETE' })
  if (!response.ok && response.status !== 204) {
    const errorText = await response.text()
    throw new Error(`Failed to delete expenses: ${response.status} ${errorText}`)
  }
}

export const expensesApi = {
  listExpenses,
  createExpense,
  updateExpense,
  stopExpense,
  deleteExpense,
  deleteAllExpenses,
  deleteAllExpensesV2,
}
