import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { financialApi } from '@/services/financialApi'
import type { Income } from '@/types/financial'

export const INCOMES_QUERY_KEY = ['incomes'] as const

export function useIncomesQuery() {
  return useQuery({
    queryKey: INCOMES_QUERY_KEY,
    queryFn: financialApi.listIncomes,
    staleTime: 30_000,
    cacheTime: 5 * 60 * 1000,
  })
}

export function useCreateIncomeMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (income: Omit<Income, 'id' | 'updatedAt'>) =>
      financialApi.createIncome(income),
    onSuccess: (newIncome) => {
      queryClient.setQueryData<Income[]>(INCOMES_QUERY_KEY, (old) =>
        old ? [...old, newIncome] : [newIncome]
      )
      queryClient.invalidateQueries({ queryKey: ['timeline'] })
      queryClient.invalidateQueries({ queryKey: ['cashflow'] })
    },
  })
}

export function useUpdateIncomeMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Income> }) =>
      financialApi.updateIncome(id, updates),
    onSuccess: (updatedIncome) => {
      queryClient.setQueryData<Income[]>(INCOMES_QUERY_KEY, (old) =>
        old?.map((income) => income.id === updatedIncome.id ? updatedIncome : income) ?? []
      )
      queryClient.invalidateQueries({ queryKey: ['timeline'] })
      queryClient.invalidateQueries({ queryKey: ['cashflow'] })
    },
  })
}

export function useDeleteIncomeMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => financialApi.deleteIncome(id),
    onSuccess: (_, deletedId) => {
      queryClient.setQueryData<Income[]>(INCOMES_QUERY_KEY, (old) =>
        old?.filter((income) => income.id !== deletedId) ?? []
      )
      queryClient.invalidateQueries({ queryKey: ['timeline'] })
      queryClient.invalidateQueries({ queryKey: ['cashflow'] })
    },
  })
}