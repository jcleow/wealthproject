import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { financialApi } from '@/services/financialApi'
import type { Expense } from '@/types/financial'

export const EXPENSES_QUERY_KEY = ['expenses'] as const

export function useExpensesQuery() {
  return useQuery({
    queryKey: EXPENSES_QUERY_KEY,
    queryFn: financialApi.listExpenses,
    staleTime: 30_000,
    cacheTime: 5 * 60 * 1000,
  })
}

export function useCreateExpenseMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (expense: Omit<Expense, 'id' | 'updatedAt'>) =>
      financialApi.createExpense(expense),
    onSuccess: (newExpense) => {
      queryClient.setQueryData<Expense[]>(EXPENSES_QUERY_KEY, (old) =>
        old ? [...old, newExpense] : [newExpense]
      )
      queryClient.invalidateQueries({ queryKey: ['timeline'] })
      queryClient.invalidateQueries({ queryKey: ['cashflow'] })
    },
  })
}

export function useUpdateExpenseMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Expense> }) =>
      financialApi.updateExpense(id, updates),
    onSuccess: (updatedExpense) => {
      queryClient.setQueryData<Expense[]>(EXPENSES_QUERY_KEY, (old) =>
        old?.map((expense) => expense.id === updatedExpense.id ? updatedExpense : expense) ?? []
      )
      queryClient.invalidateQueries({ queryKey: ['timeline'] })
      queryClient.invalidateQueries({ queryKey: ['cashflow'] })
    },
  })
}

export function useDeleteExpenseMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => financialApi.deleteExpense(id),
    onSuccess: (_, deletedId) => {
      queryClient.setQueryData<Expense[]>(EXPENSES_QUERY_KEY, (old) =>
        old?.filter((expense) => expense.id !== deletedId) ?? []
      )
      queryClient.invalidateQueries({ queryKey: ['timeline'] })
      queryClient.invalidateQueries({ queryKey: ['cashflow'] })
    },
  })
}