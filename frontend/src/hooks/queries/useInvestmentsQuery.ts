import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { investmentsApi, type Investment } from '@/api/financial/investments'
import { QUERY_KEYS } from '@/lib/queryKeys'

export const INVESTMENTS_QUERY_KEY = QUERY_KEYS.financial.investments

export function useInvestmentsQuery() {
  return useQuery({
    queryKey: INVESTMENTS_QUERY_KEY,
    queryFn: async () => {
      const result = await investmentsApi.listInvestments({ limit: -1 })
      return result.data
    },
    staleTime: 30_000, // Consider fresh for 30 seconds
    cacheTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
  })
}

export function useCreateInvestmentMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (investment: Omit<Investment, 'id' | 'updatedAt'>) =>
      investmentsApi.createInvestment(investment),
    onSuccess: (newInvestment) => {
      // Update the investments cache
      queryClient.setQueryData<Investment[]>(INVESTMENTS_QUERY_KEY, (old) =>
        old ? [...old, newInvestment] : [newInvestment]
      )
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.financial.timeline })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.financial.timelineV2 })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.financial.netWorth })
    },
  })
}

export function useUpdateInvestmentMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Investment> }) =>
      investmentsApi.updateInvestment(id, updates),
    onSuccess: (updatedInvestment) => {
      // Update the investments cache
      queryClient.setQueryData<Investment[]>(INVESTMENTS_QUERY_KEY, (old) =>
        old?.map((inv) => inv.id === updatedInvestment.id ? updatedInvestment : inv) ?? []
      )
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.financial.timeline })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.financial.timelineV2 })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.financial.netWorth })
    },
  })
}

export function useDeleteInvestmentMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => investmentsApi.deleteInvestment(id),
    onSuccess: (_, deletedId) => {
      // Update the investments cache
      queryClient.setQueryData<Investment[]>(INVESTMENTS_QUERY_KEY, (old) =>
        old?.filter((inv) => inv.id !== deletedId) ?? []
      )
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.financial.timeline })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.financial.timelineV2 })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.financial.netWorth })
    },
  })
}
