import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { cpfApi } from '@/api/financial/cpf'
import { QUERY_KEYS } from '@/lib/queryKeys'
import type { CPFAccountUpdatePayload } from '@/types/cpf'

export const CPF_QUERY_KEY = ['cpf'] as const

export function useCpfAccountQuery() {
  return useQuery({
    queryKey: CPF_QUERY_KEY,
    queryFn: cpfApi.getCPFAccount,
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
