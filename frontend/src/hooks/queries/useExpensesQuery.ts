import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { expensesApi } from '@/api/financial'
import type { Expense } from '@/types/financial'
import { QUERY_KEYS } from '@/lib/queryKeys'

export const EXPENSES_QUERY_KEY = QUERY_KEYS.financial.expenses

export function useExpensesQuery() {
  return useQuery({
    queryKey: EXPENSES_QUERY_KEY,
    queryFn: async () => {
      const result = await expensesApi.listExpenses({ limit: -1 })
      return result.data
    },
    enabled: false, // V2 timeline provides this data - no need to fetch separately
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
      queryClient.setQueryData<Expense[]>(EXPENSES_QUERY_KEY, (old) =>
        old ? [...old, newExpense] : [newExpense]
      )
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.financial.timeline })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.financial.cashflow })
    },
  })
}

export function useUpdateExpenseMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Expense> }) =>
      expensesApi.updateExpense(id, updates),
    onSuccess: (updatedExpense) => {
      queryClient.setQueryData<Expense[]>(EXPENSES_QUERY_KEY, (old) =>
        old?.map((expense) => expense.id === updatedExpense.id ? updatedExpense : expense) ?? []
      )
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
      queryClient.setQueryData<Expense[]>(EXPENSES_QUERY_KEY, (old) =>
        old?.filter((expense) => expense.id !== deletedId) ?? []
      )
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.financial.timeline })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.financial.cashflow })
    },
  })
}
