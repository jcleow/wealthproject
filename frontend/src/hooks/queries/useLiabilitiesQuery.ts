import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { liabilitiesApi } from '@/api/financial'
import type { Liability } from '@/types/financial'
import { QUERY_KEYS } from '@/lib/queryKeys'

export const LIABILITIES_QUERY_KEY = QUERY_KEYS.financial.liabilities

export function useLiabilitiesQuery() {
  return useQuery({
    queryKey: LIABILITIES_QUERY_KEY,
    queryFn: async () => {
      const result = await liabilitiesApi.listLiabilities({ limit: -1 })
      console.log('[DEBUG] Liabilities loaded:', result.data.length, 'items')
      console.log('[DEBUG] Liability startDate values:', result.data.map(l => ({ name: l.name, startDate: l.startDate })))
      return result.data
    },
    staleTime: 30_000,
    cacheTime: 5 * 60 * 1000,
  })
}

export function useCreateLiabilityMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (liability: Omit<Liability, 'id' | 'updatedAt'>) =>
      liabilitiesApi.createLiability(liability),
    onSuccess: (newLiability) => {
      queryClient.setQueryData<Liability[]>(LIABILITIES_QUERY_KEY, (old) =>
        old ? [...old, newLiability] : [newLiability]
      )
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.financial.timeline })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.financial.netWorth })
    },
  })
}

export function useUpdateLiabilityMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Liability> }) =>
      liabilitiesApi.updateLiability(id, updates),
    onSuccess: (updatedLiability) => {
      queryClient.setQueryData<Liability[]>(LIABILITIES_QUERY_KEY, (old) =>
        old?.map((liability) => liability.id === updatedLiability.id ? updatedLiability : liability) ?? []
      )
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.financial.timeline })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.financial.netWorth })
    },
  })
}

export function useDeleteLiabilityMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => liabilitiesApi.deleteLiability(id),
    onSuccess: (_, deletedId) => {
      queryClient.setQueryData<Liability[]>(LIABILITIES_QUERY_KEY, (old) =>
        old?.filter((liability) => liability.id !== deletedId) ?? []
      )
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.financial.timeline })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.financial.netWorth })
    },
  })
}
