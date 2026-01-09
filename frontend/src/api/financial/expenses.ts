import { ApiError, apiClient } from '../client'
import { buildPaginatedPath } from './helpers'
import { toExpense } from './transformers'
import type { Expense, PaginatedResponse, PaginationParams } from '@/types/financial'
import type { UpdateMode } from '@/components/modals/FinancialFormModal/types'
import type {
  GroupedExpenses,
  Expense as ApiExpense,
  ExpenseCreateInput,
  ExpenseV2Input,
  StopInput,
} from '@/types/api.aliases'

export async function listExpenses(params?: PaginationParams): Promise<PaginatedResponse<Expense>> {
  const path = buildPaginatedPath('/cashflow/expenses', params)
  // Use v2 API for full expense management
  const raw = await apiClient.get<GroupedExpenses>(path, undefined, { baseUrl: '/api/v2' })

  // Backend returns GroupedExpenses with regularExpenses and debtRepayments
  const regularExpenses = raw?.regularExpenses ?? []
  const debtRepayments = raw?.debtRepayments ?? []
  const items = [...regularExpenses, ...debtRepayments]

  return {
    data: items.map(toExpense),
    total: raw?.count ?? items.length,
    limit: raw?.limit ?? params?.limit ?? 20,
    offset: raw?.offset ?? params?.offset ?? 0,
    hasMore: false,
  }
}

export async function createExpense(payload: Omit<Expense, 'id' | 'updatedAt'> & { parentId?: string; sourceLiabilityId?: string; fundSourceAccountId?: string }): Promise<Expense> {
  // Use string for decimal values to avoid float64 precision loss
  const body: ExpenseCreateInput = {
    name: payload.name,
    amount: payload.amount?.toString(),
    frequency: payload.frequency,
    category: payload.category,
    growthRate: (payload.growthRate ?? 2.0).toString(),
    notes: payload.notes ?? undefined,
    startDate: payload.startDate ?? undefined,
    endDate: payload.endDate ?? undefined,
    parentId: payload.parentId,
    sourceLiabilityId: payload.sourceLiabilityId,
    fundSourceAccountId: payload.fundSourceAccountId,
  }

  // Use v2 API for full expense management
  const data = await apiClient.post<ApiExpense>('/cashflow/expenses', body, { baseUrl: '/api/v2' })
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
  const body: ExpenseV2Input = {
    id,
    name: payload.name,
    amount: payload.amount?.toString(),
    frequency: payload.frequency,
    category: payload.category,
    growthRate: payload.growthRate?.toString(),
    notes: payload.notes ?? undefined,
    startDate: payload.startDate ?? undefined,
    sourceLiabilityId: payload.sourceLiabilityId,
    updateMode: payload.updateMode,
  }

  // Use v2 API for versioned update support
  const data = await apiClient.put<ApiExpense>(`/cashflow/expenses/${id}`, body, { baseUrl: '/api/v2' })
  return toExpense(data)
}

// Stop an expense (soft delete) - sets end_date
export async function stopExpense(id: string, endDate: string): Promise<Expense> {
  const body: StopInput = { endDate }
  // Use v2 API for versioned stop support
  const data = await apiClient.post<ApiExpense>(`/cashflow/expenses/${id}/stop`, body, { baseUrl: '/api/v2' })
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
