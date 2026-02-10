import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { insuranceApi } from '@/api/financial'
import type { InsurancePolicyCreateInput } from '@/api/financial/insurance'
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

export function usePaginatedInsurancePoliciesQuery(params: {
  limit: number
  offset: number
  sortBy?: string
  sortDir?: 'asc' | 'desc'
  personIds?: string[]
  categories?: string[]
  startDateFrom?: string
  startDateTo?: string
  enabled?: boolean
}) {
  return useQuery({
    queryKey: [
      ...INSURANCE_POLICIES_QUERY_KEY,
      'paginated',
      params.limit,
      params.offset,
      params.sortBy ?? null,
      params.sortDir ?? null,
      params.personIds ?? null,
      params.categories ?? null,
      params.startDateFrom ?? null,
      params.startDateTo ?? null,
    ],
    queryFn: () =>
      insuranceApi.listInsurancePolicies({
        limit: params.limit,
        offset: params.offset,
        sortBy: params.sortBy,
        sortDir: params.sortDir,
        personIds: params.personIds,
        categories: params.categories,
        startDateFrom: params.startDateFrom,
        startDateTo: params.startDateTo,
      }),
    enabled: params.enabled ?? true,
    staleTime: 30_000,
    cacheTime: 5 * 60 * 1000,
    keepPreviousData: true,
  })
}

export function useCreateInsurancePolicyMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: InsurancePolicyCreateInput) =>
      insuranceApi.createInsurancePolicy(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INSURANCE_POLICIES_QUERY_KEY })
    },
  })
}

export function useUpdateInsurancePolicyMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: InsurancePolicyCreateInput }) =>
      insuranceApi.updateInsurancePolicy(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INSURANCE_POLICIES_QUERY_KEY })
    },
  })
}

export function useDeleteInsurancePolicyMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => insuranceApi.deleteInsurancePolicy(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INSURANCE_POLICIES_QUERY_KEY })
    },
  })
}

export function useDeleteAllInsurancePoliciesMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => insuranceApi.deleteAllInsurancePolicies(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INSURANCE_POLICIES_QUERY_KEY })
    },
  })
}
