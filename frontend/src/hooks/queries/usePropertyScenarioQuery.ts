import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { financialApi } from '@/services/financialApi'
import type { PropertyScenarioRecord } from '@/types/property'
import { QUERY_KEYS } from '@/lib/queryKeys'

export const PROPERTY_SCENARIOS_QUERY_KEY = QUERY_KEYS.financial.propertyScenarios
export const PROPERTY_LINKS_QUERY_KEY = QUERY_KEYS.financial.propertyLinks

// Property Scenarios
export function usePropertyScenariosQuery() {
  return useQuery({
    queryKey: PROPERTY_SCENARIOS_QUERY_KEY,
    queryFn: financialApi.listPropertyScenarios,
    staleTime: 30_000,
    cacheTime: 5 * 60 * 1000,
  })
}

export function usePropertyScenarioQuery(id: string | undefined) {
  return useQuery({
    queryKey: [...PROPERTY_SCENARIOS_QUERY_KEY, id],
    queryFn: () => financialApi.getPropertyScenario(id!),
    enabled: !!id,
    staleTime: 30_000,
  })
}

export function useCreatePropertyScenarioMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (scenario: Parameters<typeof financialApi.createPropertyScenario>[0]) =>
      financialApi.createPropertyScenario(scenario),
    onSuccess: (newScenario) => {
      queryClient.setQueryData<PropertyScenarioRecord[]>(PROPERTY_SCENARIOS_QUERY_KEY, (old) =>
        old ? [...old, newScenario] : [newScenario]
      )
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.financial.timeline })
    },
  })
}

export function useDeletePropertyScenarioMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => financialApi.deletePropertyScenario(id),
    onSuccess: (_, deletedId) => {
      queryClient.setQueryData<PropertyScenarioRecord[]>(PROPERTY_SCENARIOS_QUERY_KEY, (old) =>
        old?.filter((s) => s.id !== deletedId) ?? []
      )
      queryClient.removeQueries({ queryKey: [...PROPERTY_SCENARIOS_QUERY_KEY, deletedId] })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.financial.timeline })
    },
  })
}

// Property Links
export function usePropertyLinksQuery(scenarioId?: string) {
  return useQuery({
    queryKey: [...PROPERTY_LINKS_QUERY_KEY, { scenarioId }],
    queryFn: () => scenarioId ? financialApi.listPropertyLinks(scenarioId) : Promise.resolve([]),
    enabled: !!scenarioId,
    staleTime: 30_000,
  })
}

export function usePropertyLinksByAssetQuery(assetId?: string) {
  return useQuery({
    queryKey: [...PROPERTY_LINKS_QUERY_KEY, { assetId }],
    queryFn: () => assetId ? financialApi.listPropertyLinksByAsset(assetId) : Promise.resolve([]),
    enabled: !!assetId,
    staleTime: 30_000,
  })
}

export function usePropertyLinksByLiabilityQuery(liabilityId?: string) {
  return useQuery({
    queryKey: [...PROPERTY_LINKS_QUERY_KEY, { liabilityId }],
    queryFn: () => liabilityId ? financialApi.listPropertyLinksByLiability(liabilityId) : Promise.resolve([]),
    enabled: !!liabilityId,
    staleTime: 30_000,
  })
}

export function useCreatePropertyLinkMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (link: Parameters<typeof financialApi.createPropertyLink>[0]) =>
      financialApi.createPropertyLink(link),
    onSuccess: () => {
      // Invalidate all property links queries as they might be filtered differently
      queryClient.invalidateQueries({ queryKey: PROPERTY_LINKS_QUERY_KEY })
      queryClient.invalidateQueries({ queryKey: PROPERTY_SCENARIOS_QUERY_KEY })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.financial.timeline })
    },
  })
}

export function useUpdatePropertyLinkMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, link }: { id: string; link: Parameters<typeof financialApi.updatePropertyLink>[1] }) =>
      financialApi.updatePropertyLink(id, link),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PROPERTY_LINKS_QUERY_KEY })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.financial.timeline })
    },
  })
}