import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { cashAccountsApi } from '@/api/financial'
import type { CashAccount } from '@/types/financial'
import { QUERY_KEYS } from '@/lib/queryKeys'

export const CASH_ACCOUNTS_QUERY_KEY = QUERY_KEYS.financial.cashAccounts

export function useCashAccountsQuery() {
  return useQuery({
    queryKey: CASH_ACCOUNTS_QUERY_KEY,
    queryFn: cashAccountsApi.listCashAccounts,
    staleTime: 30_000,
    cacheTime: 5 * 60 * 1000,
  })
}

export function useCreateCashAccountMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (account: Omit<CashAccount, 'id' | 'createdAt' | 'updatedAt'>) =>
      cashAccountsApi.createCashAccount(account),
    onSuccess: (newAccount) => {
      queryClient.setQueryData<CashAccount[]>(CASH_ACCOUNTS_QUERY_KEY, (old) =>
        old ? [...old, newAccount] : [newAccount]
      )
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.financial.timeline })
    },
  })
}

export function useUpdateCashAccountMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<CashAccount> }) =>
      cashAccountsApi.updateCashAccount(id, updates),
    onSuccess: (updatedAccount) => {
      queryClient.setQueryData<CashAccount[]>(CASH_ACCOUNTS_QUERY_KEY, (old) =>
        old?.map((account) => account.id === updatedAccount.id ? updatedAccount : account) ?? []
      )
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.financial.timeline })
    },
  })
}

export function useDeleteCashAccountMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => cashAccountsApi.deleteCashAccount(id),
    onSuccess: (_, deletedId) => {
      queryClient.setQueryData<CashAccount[]>(CASH_ACCOUNTS_QUERY_KEY, (old) =>
        old?.filter((account) => account.id !== deletedId) ?? []
      )
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.financial.timeline })
    },
  })
}

export function useSetAccumulatorMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => cashAccountsApi.setAccumulatorAccount(id),
    onSuccess: (_, accumulatorId) => {
      // Update all accounts: set isAccumulator=true for the selected one, false for others
      queryClient.setQueryData<CashAccount[]>(CASH_ACCOUNTS_QUERY_KEY, (old) =>
        old?.map((account) => ({
          ...account,
          isAccumulator: account.id === accumulatorId,
        })) ?? []
      )
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.financial.timeline })
    },
  })
}

export function useStopCashAccountMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, endDate }: { id: string; endDate: string }) =>
      cashAccountsApi.stopCashAccount(id, endDate),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.financial.timeline })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.financial.timelineV2 })
    },
  })
}
