import { ApiError, apiClient } from '../client'
import { buildPaginatedPath } from './helpers'
import { toExpense } from './transformers'
import type { Expense, PaginatedResponse, PaginationParams } from '@/types/financial'
import type { UpdateMode } from '@/components/modals/FinancialFormModal/types'

export async function listExpenses(params?: PaginationParams): Promise<PaginatedResponse<Expense>> {
  const path = buildPaginatedPath('/cashflow/expenses', params)
  const raw = await apiClient.get<any>(path)

  // Debug: log the raw response structure
  console.log('[listExpenses] Raw response:', JSON.stringify(raw, null, 2))
  console.log('[listExpenses] Response keys:', raw ? Object.keys(raw) : 'null/undefined')

  // Backend returns GroupedExpenses with RegularExpenses and DebtRepayments
  // Handle multiple casing conventions (camelCase, PascalCase, snake_case)
  // Also check if raw itself is an array
  let regularExpenses: any[] = []
  let debtRepayments: any[] = []

  if (Array.isArray(raw)) {
    // Response is directly an array of expenses
    console.log('[listExpenses] Response is array, length:', raw.length)
    regularExpenses = raw
  } else if (raw?.data && Array.isArray(raw.data)) {
    // Standard paginated response with data array
    console.log('[listExpenses] Response has data array, length:', raw.data.length)
    regularExpenses = raw.data
  } else {
    // Grouped response with regularExpenses and debtRepayments
    regularExpenses = Array.isArray(raw?.regularExpenses) ? raw.regularExpenses
      : Array.isArray(raw?.RegularExpenses) ? raw.RegularExpenses
      : Array.isArray(raw?.regular_expenses) ? raw.regular_expenses
      : []
    debtRepayments = Array.isArray(raw?.debtRepayments) ? raw.debtRepayments
      : Array.isArray(raw?.DebtRepayments) ? raw.DebtRepayments
      : Array.isArray(raw?.debt_repayments) ? raw.debt_repayments
      : []
    console.log('[listExpenses] Grouped response - regular:', regularExpenses.length, 'debt:', debtRepayments.length)
  }

  const items = [...regularExpenses, ...debtRepayments]

  return {
    data: items.map(toExpense),
    total: raw?.total ?? raw?.Total ?? items.length,
    limit: raw?.limit ?? raw?.Limit ?? params?.limit ?? 20,
    offset: raw?.offset ?? raw?.Offset ?? params?.offset ?? 0,
    hasMore: raw?.hasMore ?? raw?.HasMore ?? false,
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
    updateMode?: UpdateMode
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
  // Try to get expenses from the base endpoint
  const result = await listExpenses({ limit: -1 })
  console.log('[deleteAllExpenses] Found', result.data.length, 'base expenses to delete')

  // Collect all unique expense IDs to delete
  const idsToDelete = new Set<string>()

  // Add base expense IDs
  result.data.forEach((expense) => {
    if (expense.id) idsToDelete.add(expense.id)
  })

  // Also try to fetch expense IDs from the V2 timeline snapshot
  try {
    const today = new Date()
    const year = today.getFullYear()
    // Use a wide date range to catch all expenses (current year span)
    const startDate = `01-01-${year}`
    const endDate = `31-12-${year + 10}`
    const url = `/api/v2/financial/timeline/snapshot?startDate=${startDate}&endDate=${endDate}`
    console.log('[deleteAllExpenses] Fetching V2 timeline from:', url)

    const response = await fetch(url)
    console.log('[deleteAllExpenses] V2 response status:', response.status)

    if (response.ok) {
      const timelineData = await response.json()
      console.log('[deleteAllExpenses] V2 timeline data keys:', Object.keys(timelineData))

      // V2 returns months array, each month has expenses
      const months = timelineData?.months ?? []
      console.log('[deleteAllExpenses] V2 timeline months:', months.length)

      months.forEach((month: { expenses?: Array<{ id?: string; parentId?: string }> }) => {
        const monthExpenses = month.expenses ?? []
        monthExpenses.forEach((exp) => {
          if (exp.id) idsToDelete.add(exp.id)
          if (exp.parentId) idsToDelete.add(exp.parentId)
        })
      })

      // Also check top-level expenses if present
      const topLevelExpenses = timelineData?.expenses ?? []
      console.log('[deleteAllExpenses] V2 top-level expenses:', topLevelExpenses.length)
      topLevelExpenses.forEach((exp: { id?: string; parentId?: string }) => {
        if (exp.id) idsToDelete.add(exp.id)
        if (exp.parentId) idsToDelete.add(exp.parentId)
      })
    } else {
      const errorText = await response.text()
      console.warn('[deleteAllExpenses] V2 request failed:', response.status, errorText)
    }
  } catch (error) {
    console.warn('[deleteAllExpenses] Could not fetch V2 timeline expenses:', error)
  }

  console.log('[deleteAllExpenses] Total unique IDs to delete:', idsToDelete.size)

  if (idsToDelete.size === 0) {
    console.log('[deleteAllExpenses] No expenses found to delete')
    return
  }

  const deleteResults = await Promise.allSettled(
    Array.from(idsToDelete).map((id) => {
      console.log('[deleteAllExpenses] Deleting expense:', id)
      return deleteExpense(id)
    })
  )

  const failures = deleteResults.filter((r) => r.status === 'rejected')
  if (failures.length > 0) {
    console.warn('[deleteAllExpenses] Some deletes failed:', failures)
  }
  console.log('[deleteAllExpenses] Completed, deleted:', idsToDelete.size - failures.length, 'failed:', failures.length)
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
