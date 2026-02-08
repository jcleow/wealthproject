import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { insuranceApi } from '@/api/financial'
import type { InsurancePolicyRecord, InsurancePolicyCreateInput } from '@/api/financial/insurance'
import { QUERY_KEYS } from '@/lib/queryKeys'

export const INSURANCE_POLICIES_QUERY_KEY = QUERY_KEYS.financial.insurancePolicies

export function useInsurancePoliciesQuery(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: INSURANCE_POLICIES_QUERY_KEY,
    queryFn: async () => {
      const result = await insuranceApi.listInsurancePolicies()
      return result.data
    },
    enabled: options?.enabled ?? true,
    staleTime: 30_000,
    cacheTime: 5 * 60 * 1000,
  })
}

export function useCreateInsurancePolicyMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: InsurancePolicyCreateInput) =>
      insuranceApi.createInsurancePolicy(payload),
    onSuccess: (newPolicy) => {
      queryClient.setQueryData<InsurancePolicyRecord[]>(
        INSURANCE_POLICIES_QUERY_KEY,
        (old) => (old ? [...old, newPolicy] : [newPolicy])
      )
    },
  })
}

export function useUpdateInsurancePolicyMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: InsurancePolicyCreateInput }) =>
      insuranceApi.updateInsurancePolicy(id, payload),
    onSuccess: (updatedPolicy) => {
      queryClient.setQueryData<InsurancePolicyRecord[]>(
        INSURANCE_POLICIES_QUERY_KEY,
        (old) => old?.map((p) => (p.id === updatedPolicy.id ? updatedPolicy : p)) ?? []
      )
    },
  })
}

export function useDeleteInsurancePolicyMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => insuranceApi.deleteInsurancePolicy(id),
    onSuccess: (_, deletedId) => {
      queryClient.setQueryData<InsurancePolicyRecord[]>(
        INSURANCE_POLICIES_QUERY_KEY,
        (old) => old?.filter((policy) => policy.id !== deletedId) ?? []
      )
    },
  })
}
