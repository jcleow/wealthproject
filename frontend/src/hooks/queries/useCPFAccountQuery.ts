import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { financialApi } from '@/services/financialApi'
import type { CPFAccount, CPFAccountCreatePayload, CPFAccountUpdatePayload } from '@/types/cpf'
import { QUERY_KEYS } from '@/lib/queryKeys'

export const CPF_ACCOUNT_QUERY_KEY = QUERY_KEYS.cpf.account

/**
 * Hook to fetch the current user's CPF account.
 * Returns null if no account exists.
 */
export function useCPFAccountQuery() {
  return useQuery({
    queryKey: CPF_ACCOUNT_QUERY_KEY,
    queryFn: financialApi.getCPFAccount,
    staleTime: 60_000,
  })
}

/**
 * Hook to create a CPF account.
 */
export function useCreateCPFAccountMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: CPFAccountCreatePayload) =>
      financialApi.createCPFAccount(payload),
    onSuccess: (createdAccount: CPFAccount) => {
      queryClient.setQueryData<CPFAccount>(CPF_ACCOUNT_QUERY_KEY, createdAccount)
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.cpf.all })
    },
  })
}

/**
 * Hook to update a CPF account.
 */
export function useUpdateCPFAccountMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: CPFAccountUpdatePayload) =>
      financialApi.updateCPFAccount(payload),
    onSuccess: (updatedAccount: CPFAccount) => {
      queryClient.setQueryData<CPFAccount>(CPF_ACCOUNT_QUERY_KEY, updatedAccount)
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.cpf.all })
    },
  })
}

/**
 * Convenience hook that provides account query and mutations together.
 */
export function useCPFAccount() {
  const query = useCPFAccountQuery()
  const createMutation = useCreateCPFAccountMutation()
  const updateMutation = useUpdateCPFAccountMutation()

  return {
    account: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    createAccount: createMutation.mutate,
    createAccountAsync: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    updateAccount: updateMutation.mutate,
    updateAccountAsync: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
  }
}
