import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { cpfApi } from '@/api/financial/cpf'
import { QUERY_KEYS } from '@/lib/queryKeys'
import type {
  CPFAccountCreatePayload,
  CPFAccountUpdatePayload,
  CPFAssumptionsUpdateInput,
} from '@/types/cpf'

export const CPF_QUERY_KEY = ['cpf'] as const
export const CPF_ACCOUNTS_QUERY_KEY = ['cpf', 'accounts'] as const
export const CPF_ASSUMPTIONS_QUERY_KEY = (cpfAccountId: string) => ['cpf', 'assumptions', cpfAccountId] as const

export function useCpfAccountQuery() {
  return useQuery({
    queryKey: CPF_QUERY_KEY,
    queryFn: cpfApi.getCPFAccount,
  })
}

export function useCpfAccountsQuery() {
  return useQuery({
    queryKey: CPF_ACCOUNTS_QUERY_KEY,
    queryFn: cpfApi.listCPFAccounts,
  })
}

export function useCreateCpfAccountMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: CPFAccountCreatePayload) => cpfApi.createCPFAccount(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CPF_QUERY_KEY })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.financial.all })
    },
  })
}

export function useUpdateCpfAccountMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: CPFAccountUpdatePayload }) =>
      cpfApi.updateCPFAccount(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CPF_QUERY_KEY })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.financial.all })
    },
  })
}

export function useStopCpfAccountMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, endDate }: { id: string; endDate: string }) =>
      cpfApi.stopCPFAccount(id, endDate),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CPF_QUERY_KEY })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.financial.all })
    },
  })
}

export function useDeleteCpfAccountMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => cpfApi.deleteCPFAccount(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CPF_QUERY_KEY })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.financial.all })
    },
  })
}

// ============================================================================
// CPF Assumptions Hooks
// ============================================================================

/**
 * Query hook for fetching CPF assumptions for a specific account.
 * The API will create default assumptions if none exist.
 */
export function useCpfAssumptionsQuery(cpfAccountId: string | undefined) {
  return useQuery({
    queryKey: CPF_ASSUMPTIONS_QUERY_KEY(cpfAccountId ?? ''),
    queryFn: () => cpfApi.getCPFAssumptions(cpfAccountId!),
    enabled: !!cpfAccountId,
    staleTime: 5 * 60 * 1000, // 5 minutes - assumptions don't change often
  })
}

/**
 * Mutation hook for updating CPF assumptions.
 * Supports partial updates - only provided fields are changed.
 */
export function useUpdateCpfAssumptionsMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      cpfAccountId,
      updates,
    }: {
      cpfAccountId: string
      updates: CPFAssumptionsUpdateInput
    }) => cpfApi.updateCPFAssumptions(cpfAccountId, updates),
    onSuccess: (_, { cpfAccountId }) => {
      // Invalidate the specific assumptions query
      queryClient.invalidateQueries({ queryKey: CPF_ASSUMPTIONS_QUERY_KEY(cpfAccountId) })
      // Also invalidate timeline queries since assumptions affect projections
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.financial.all })
    },
  })
}

/**
 * Mutation hook for resetting CPF assumptions to defaults.
 */
export function useResetCpfAssumptionsMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (cpfAccountId: string) => cpfApi.deleteCPFAssumptions(cpfAccountId),
    onSuccess: (_, cpfAccountId) => {
      queryClient.invalidateQueries({ queryKey: CPF_ASSUMPTIONS_QUERY_KEY(cpfAccountId) })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.financial.all })
    },
  })
}
