import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { propertyApi } from '@/api/financial'
import type { PropertyScenarioRecord } from '@/types/property'
import { QUERY_KEYS } from '@/lib/queryKeys'

export const PROPERTY_SCENARIOS_QUERY_KEY = QUERY_KEYS.financial.propertyScenarios
export const PROPERTY_LINKS_QUERY_KEY = QUERY_KEYS.financial.propertyLinks

// Property Scenarios
export function usePropertyScenariosQuery() {
  return useQuery({
    queryKey: PROPERTY_SCENARIOS_QUERY_KEY,
    queryFn: propertyApi.listPropertyScenarios,
    staleTime: 30_000,
    cacheTime: 5 * 60 * 1000,
  })
}

export function usePropertyScenarioQuery(id: string | undefined) {
  return useQuery({
    queryKey: [...PROPERTY_SCENARIOS_QUERY_KEY, id],
    queryFn: () => propertyApi.getPropertyScenario(id!),
    enabled: !!id,
    staleTime: 30_000,
  })
}

export function useCreatePropertyScenarioMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (scenario: Parameters<typeof propertyApi.createPropertyScenario>[0]) =>
      propertyApi.createPropertyScenario(scenario),
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
    mutationFn: (id: string) => propertyApi.deletePropertyScenario(id),
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
    queryFn: () => scenarioId ? propertyApi.listPropertyLinks(scenarioId) : Promise.resolve([]),
    enabled: !!scenarioId,
    staleTime: 30_000,
  })
}

export function usePropertyLinksByAssetQuery(assetId?: string) {
  return useQuery({
    queryKey: [...PROPERTY_LINKS_QUERY_KEY, { assetId }],
    queryFn: () => assetId ? propertyApi.listPropertyLinksByAsset(assetId) : Promise.resolve([]),
    enabled: !!assetId,
    staleTime: 30_000,
  })
}

export function usePropertyLinksByLiabilityQuery(liabilityId?: string) {
  return useQuery({
    queryKey: [...PROPERTY_LINKS_QUERY_KEY, { liabilityId }],
    queryFn: () => liabilityId ? propertyApi.listPropertyLinksByLiability(liabilityId) : Promise.resolve([]),
    enabled: !!liabilityId,
    staleTime: 30_000,
  })
}

export function useCreatePropertyLinkMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (link: Parameters<typeof propertyApi.createPropertyLink>[0]) =>
      propertyApi.createPropertyLink(link),
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
    mutationFn: ({ id, link }: { id: string; link: Parameters<typeof propertyApi.updatePropertyLink>[1] }) =>
      propertyApi.updatePropertyLink(id, link),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PROPERTY_LINKS_QUERY_KEY })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.financial.timeline })
    },
  })
}
