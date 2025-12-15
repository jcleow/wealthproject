import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { incomesApi } from '@/api/financial'
import type { Income } from '@/types/financial'
import { QUERY_KEYS } from '@/lib/queryKeys'

export const INCOMES_QUERY_KEY = QUERY_KEYS.financial.incomes

export function useIncomesQuery() {
  return useQuery({
    queryKey: INCOMES_QUERY_KEY,
    queryFn: async () => {
      const result = await incomesApi.listIncomes({ limit: -1 })
      return result.data
    },
    enabled: false, // V2 timeline provides this data - no need to fetch separately
    staleTime: 30_000,
    cacheTime: 5 * 60 * 1000,
  })
}

export function useCreateIncomeMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (income: Omit<Income, 'id' | 'updatedAt'>) =>
      incomesApi.createIncome(income),
    onSuccess: (newIncome) => {
      queryClient.setQueryData<Income[]>(INCOMES_QUERY_KEY, (old) =>
        old ? [...old, newIncome] : [newIncome]
      )
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.financial.timeline })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.financial.cashflow })
    },
  })
}

export function useUpdateIncomeMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Income> }) =>
      incomesApi.updateIncome(id, updates),
    onSuccess: (updatedIncome) => {
      queryClient.setQueryData<Income[]>(INCOMES_QUERY_KEY, (old) =>
        old?.map((income) => income.id === updatedIncome.id ? updatedIncome : income) ?? []
      )
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.financial.timeline })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.financial.cashflow })
    },
  })
}

export function useDeleteIncomeMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => incomesApi.deleteIncome(id),
    onSuccess: (_, deletedId) => {
      queryClient.setQueryData<Income[]>(INCOMES_QUERY_KEY, (old) =>
        old?.filter((income) => income.id !== deletedId) ?? []
      )
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.financial.timeline })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.financial.cashflow })
    },
  })
}
