import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { financialApi } from '@/services/financialApi'
import type { CashAccount } from '@/types/financial'

export const CASH_ACCOUNTS_QUERY_KEY = ['cash-accounts'] as const

export function useCashAccountsQuery() {
  return useQuery({
    queryKey: CASH_ACCOUNTS_QUERY_KEY,
    queryFn: financialApi.listCashAccounts,
    staleTime: 30_000,
    cacheTime: 5 * 60 * 1000,
  })
}

export function useCreateCashAccountMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (account: Omit<CashAccount, 'id' | 'createdAt' | 'updatedAt'>) =>
      financialApi.createCashAccount(account),
    onSuccess: (newAccount) => {
      queryClient.setQueryData<CashAccount[]>(CASH_ACCOUNTS_QUERY_KEY, (old) =>
        old ? [...old, newAccount] : [newAccount]
      )
      queryClient.invalidateQueries({ queryKey: ['timeline'] })
    },
  })
}

export function useUpdateCashAccountMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<CashAccount> }) =>
      financialApi.updateCashAccount(id, updates),
    onSuccess: (updatedAccount) => {
      queryClient.setQueryData<CashAccount[]>(CASH_ACCOUNTS_QUERY_KEY, (old) =>
        old?.map((account) => account.id === updatedAccount.id ? updatedAccount : account) ?? []
      )
      queryClient.invalidateQueries({ queryKey: ['timeline'] })
    },
  })
}

export function useDeleteCashAccountMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => financialApi.deleteCashAccount(id),
    onSuccess: (_, deletedId) => {
      queryClient.setQueryData<CashAccount[]>(CASH_ACCOUNTS_QUERY_KEY, (old) =>
        old?.filter((account) => account.id !== deletedId) ?? []
      )
      queryClient.invalidateQueries({ queryKey: ['timeline'] })
    },
  })
}

export function useSetAccumulatorMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => financialApi.setAccumulatorAccount(id),
    onSuccess: (_, accumulatorId) => {
      // Update all accounts: set isAccumulator=true for the selected one, false for others
      queryClient.setQueryData<CashAccount[]>(CASH_ACCOUNTS_QUERY_KEY, (old) =>
        old?.map((account) => ({
          ...account,
          isAccumulator: account.id === accumulatorId,
        })) ?? []
      )
      queryClient.invalidateQueries({ queryKey: ['timeline'] })
    },
  })
}
