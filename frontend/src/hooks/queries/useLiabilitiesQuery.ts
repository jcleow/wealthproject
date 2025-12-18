import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { liabilitiesApi } from '@/api/financial'
import type { Liability } from '@/types/financial'
import type { UpdateMode } from '@/components/modals/FinancialFormModal/types'
import { QUERY_KEYS } from '@/lib/queryKeys'

export const LIABILITIES_QUERY_KEY = QUERY_KEYS.financial.liabilities

export function useLiabilitiesQuery(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: LIABILITIES_QUERY_KEY,
    queryFn: async () => {
      const result = await liabilitiesApi.listLiabilities({ limit: -1 })
      return result.data
    },
    enabled: options?.enabled ?? true,
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
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.financial.expenses })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.financial.cashflow })
    },
  })
}

export function useUpdateLiabilityMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, updates }: {
      id: string
      updates: Partial<Liability> & {
        updateMode?: UpdateMode
      }
    }) => liabilitiesApi.updateLiability(id, updates),
    onSuccess: () => {
      // Invalidate timeline and related queries to refetch with new/updated liability
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.financial.timeline })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.financial.netWorth })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.financial.expenses })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.financial.cashflow })
    },
  })
}

export function useStopLiabilityMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, endDate }: { id: string; endDate: string }) =>
      liabilitiesApi.stopLiability(id, endDate),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.financial.timeline })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.financial.netWorth })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.financial.expenses })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.financial.cashflow })
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
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.financial.expenses })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.financial.cashflow })
    },
  })
}
