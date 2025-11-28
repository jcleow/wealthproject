import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { financialApi } from '@/services/financialApi'
import type { Liability } from '@/types/financial'

export const LIABILITIES_QUERY_KEY = ['liabilities'] as const

export function useLiabilitiesQuery() {
  return useQuery({
    queryKey: LIABILITIES_QUERY_KEY,
    queryFn: financialApi.listLiabilities,
    staleTime: 30_000,
    cacheTime: 5 * 60 * 1000,
  })
}

export function useCreateLiabilityMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (liability: Omit<Liability, 'id' | 'updatedAt'>) =>
      financialApi.createLiability(liability),
    onSuccess: (newLiability) => {
      queryClient.setQueryData<Liability[]>(LIABILITIES_QUERY_KEY, (old) =>
        old ? [...old, newLiability] : [newLiability]
      )
      queryClient.invalidateQueries({ queryKey: ['timeline'] })
      queryClient.invalidateQueries({ queryKey: ['net-worth'] })
    },
  })
}

export function useUpdateLiabilityMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Liability> }) =>
      financialApi.updateLiability(id, updates),
    onSuccess: (updatedLiability) => {
      queryClient.setQueryData<Liability[]>(LIABILITIES_QUERY_KEY, (old) =>
        old?.map((liability) => liability.id === updatedLiability.id ? updatedLiability : liability) ?? []
      )
      queryClient.invalidateQueries({ queryKey: ['timeline'] })
      queryClient.invalidateQueries({ queryKey: ['net-worth'] })
    },
  })
}

export function useDeleteLiabilityMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => financialApi.deleteLiability(id),
    onSuccess: (_, deletedId) => {
      queryClient.setQueryData<Liability[]>(LIABILITIES_QUERY_KEY, (old) =>
        old?.filter((liability) => liability.id !== deletedId) ?? []
      )
      queryClient.invalidateQueries({ queryKey: ['timeline'] })
      queryClient.invalidateQueries({ queryKey: ['net-worth'] })
    },
  })
}