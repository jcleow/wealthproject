import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fundFlowRulesApi } from '@/api/financial/fundFlowRules'
import type {
  FundFlowRule,
  FundFlowRuleCreatePayload,
  FundFlowRuleUpdatePayload,
  FundFlowRuleListFilters,
} from '@/types/fundFlowRules'
import { QUERY_KEYS } from '@/lib/queryKeys'

export const FUND_FLOW_RULES_QUERY_KEY = QUERY_KEYS.financial.fundFlowRules

export function useFundFlowRulesQuery(
  filters?: FundFlowRuleListFilters,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: [...FUND_FLOW_RULES_QUERY_KEY, filters] as const,
    queryFn: () => fundFlowRulesApi.listFundFlowRules(filters),
    enabled: options?.enabled ?? true,
    staleTime: 30_000,
  })
}

export function usePropertyPaymentRulesQuery(
  propertyId: string | undefined,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: [...FUND_FLOW_RULES_QUERY_KEY, 'property', propertyId] as const,
    queryFn: () => {
      if (!propertyId) return []
      return fundFlowRulesApi.getPaymentRulesForProperty(propertyId)
    },
    enabled: (options?.enabled ?? true) && !!propertyId,
    staleTime: 30_000,
  })
}

export function useLiabilityPaymentRulesQuery(
  liabilityId: string | undefined,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: [...FUND_FLOW_RULES_QUERY_KEY, 'liability', liabilityId] as const,
    queryFn: () => {
      if (!liabilityId) return []
      return fundFlowRulesApi.getPaymentRulesForLiability(liabilityId)
    },
    enabled: (options?.enabled ?? true) && !!liabilityId,
    staleTime: 30_000,
  })
}

export function useCreateFundFlowRuleMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (rule: FundFlowRuleCreatePayload) =>
      fundFlowRulesApi.createFundFlowRule(rule),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: FUND_FLOW_RULES_QUERY_KEY })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.financial.timeline })
    },
  })
}

export function useUpdateFundFlowRuleMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      id,
      updates,
    }: {
      id: string
      updates: FundFlowRuleUpdatePayload
    }) => fundFlowRulesApi.updateFundFlowRule(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: FUND_FLOW_RULES_QUERY_KEY })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.financial.timeline })
    },
  })
}

export function useStopFundFlowRuleMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, endDate }: { id: string; endDate: string }) =>
      fundFlowRulesApi.stopFundFlowRule(id, endDate),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: FUND_FLOW_RULES_QUERY_KEY })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.financial.timeline })
    },
  })
}

export function useDeleteFundFlowRuleMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => fundFlowRulesApi.deleteFundFlowRule(id),
    onSuccess: (_, deletedId) => {
      queryClient.setQueryData<FundFlowRule[]>(
        FUND_FLOW_RULES_QUERY_KEY,
        (old) => old?.filter((rule) => rule.id !== deletedId) ?? []
      )
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.financial.timeline })
    },
  })
}

export function useDeleteAllFundFlowRulesMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => fundFlowRulesApi.deleteAllFundFlowRules(),
    onSuccess: () => {
      queryClient.setQueryData<FundFlowRule[]>(FUND_FLOW_RULES_QUERY_KEY, [])
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.financial.timeline })
    },
  })
}
