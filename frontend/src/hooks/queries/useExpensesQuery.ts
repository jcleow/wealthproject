import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { expensesApi } from '@/api/financial'
import type { Expense } from '@/types/financial'
import type { InsurancePremiumExpense } from '@/types/api.aliases'
import type { UpdateMode } from '@/components/modals/FinancialFormModal/types'
import { QUERY_KEYS } from '@/lib/queryKeys'

export const EXPENSES_QUERY_KEY = QUERY_KEYS.financial.expenses

interface ExpensesQueryData {
  expenses: Expense[]
  insurancePremiums: InsurancePremiumExpense[]
}

export function useExpensesQuery(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: EXPENSES_QUERY_KEY,
    queryFn: async (): Promise<ExpensesQueryData> => {
      const result = await expensesApi.listExpenses()
      return {
        expenses: result.data,
        insurancePremiums: result.insurancePremiums,
      }
    },
    enabled: options?.enabled ?? true,
    staleTime: 30_000,
    cacheTime: 5 * 60 * 1000,
  })
}

export function useCreateExpenseMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (expense: Omit<Expense, 'id' | 'updatedAt'>) =>
      expensesApi.createExpense(expense),
    onSuccess: (newExpense) => {
      queryClient.setQueryData<ExpensesQueryData>(EXPENSES_QUERY_KEY, (old) =>
        old
          ? { ...old, expenses: [...old.expenses, newExpense] }
          : { expenses: [newExpense], insurancePremiums: [] }
      )
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.financial.timeline })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.financial.cashflow })
    },
  })
}

export function useUpdateExpenseMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, updates }: {
      id: string
      updates: Partial<Expense> & {
        sourceLiabilityId?: string
        updateMode?: UpdateMode
      }
    }) => expensesApi.updateExpense(id, updates),
    onSuccess: () => {
      // Invalidate timeline and cashflow to refetch with new/updated expense
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.financial.timeline })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.financial.cashflow })
    },
  })
}

export function useStopExpenseMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, endDate }: { id: string; endDate: string }) =>
      expensesApi.stopExpense(id, endDate),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.financial.timeline })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.financial.cashflow })
    },
  })
}

export function useDeleteExpenseMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => expensesApi.deleteExpense(id),
    onSuccess: (_, deletedId) => {
      queryClient.setQueryData<ExpensesQueryData>(EXPENSES_QUERY_KEY, (old) =>
        old
          ? { ...old, expenses: old.expenses.filter((expense) => expense.id !== deletedId) }
          : { expenses: [], insurancePremiums: [] }
      )
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.financial.timeline })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.financial.cashflow })
    },
  })
}
