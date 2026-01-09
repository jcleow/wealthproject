import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { financialApi } from '@/services/financialApi'
import type { CPFAssumptions, CPFAssumptionsUpdatePayload } from '@/types/cpf'
import { QUERY_KEYS } from '@/lib/queryKeys'

export const CPF_ASSUMPTIONS_QUERY_KEY = QUERY_KEYS.cpf.assumptions

/**
 * Hook to fetch CPF assumptions for the current user.
 * Returns default assumptions if none exist (lazily created on first API call).
 */
export function useCPFAssumptionsQuery() {
  return useQuery({
    queryKey: CPF_ASSUMPTIONS_QUERY_KEY,
    queryFn: financialApi.getCPFAssumptions,
    staleTime: 60_000, // Consider fresh for 1 minute
    cacheTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
  })
}

/**
 * Hook to update CPF assumptions.
 * Supports partial updates - only changed fields need to be provided.
 */
export function useCPFAssumptionsMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: CPFAssumptionsUpdatePayload) =>
      financialApi.updateCPFAssumptions(payload),
    onSuccess: (updatedAssumptions: CPFAssumptions) => {
      // Update the assumptions cache with the response
      queryClient.setQueryData<CPFAssumptions>(CPF_ASSUMPTIONS_QUERY_KEY, updatedAssumptions)

      // Invalidate related queries that depend on assumptions
      // (e.g., CPF projections when they exist)
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.cpf.all })
    },
  })
}

/**
 * Helper hook that provides both query and mutation in one.
 */
export function useCPFAssumptions() {
  const query = useCPFAssumptionsQuery()
  const mutation = useCPFAssumptionsMutation()

  return {
    assumptions: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    updateAssumptions: mutation.mutate,
    updateAssumptionsAsync: mutation.mutateAsync,
    isUpdating: mutation.isPending,
    updateError: mutation.error,
  }
}
