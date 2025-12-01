import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { financialApi } from '@/services/financialApi'
import type { ScenarioEvent } from '@/types/scenario'
import { QUERY_KEYS } from '@/lib/queryKeys'

export const SCENARIO_EVENTS_QUERY_KEY = QUERY_KEYS.financial.scenarioEvents

export function useScenarioEventsQuery() {
  return useQuery({
    queryKey: SCENARIO_EVENTS_QUERY_KEY,
    queryFn: financialApi.listScenarioEvents,
    staleTime: 30_000,
    cacheTime: 5 * 60 * 1000,
  })
}

export function useScenarioEventQuery(id: string | undefined) {
  return useQuery({
    queryKey: [...SCENARIO_EVENTS_QUERY_KEY, id],
    queryFn: () => financialApi.getScenarioEvent(id!),
    enabled: !!id,
    staleTime: 30_000,
  })
}

export function useCreateScenarioEventMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (event: ScenarioEvent) => financialApi.createScenarioEvent(event),
    onSuccess: (newEvent) => {
      // Update cache
      queryClient.setQueryData<ScenarioEvent[]>(SCENARIO_EVENTS_QUERY_KEY, (old) =>
        old ? [...old, newEvent] : [newEvent]
      )
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.financial.timeline })
    },
  })
}

export function useUpdateScenarioEventMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, event }: { id: string; event: ScenarioEvent }) =>
      financialApi.updateScenarioEvent(id, event),
    onSuccess: (updatedEvent, variables) => {
      // Update list cache
      queryClient.setQueryData<ScenarioEvent[]>(SCENARIO_EVENTS_QUERY_KEY, (old) =>
        old?.map((e) => e.id === variables.id ? updatedEvent : e) ?? []
      )
      // Update individual cache
      queryClient.setQueryData([...SCENARIO_EVENTS_QUERY_KEY, variables.id], updatedEvent)
      // Invalidate related
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.financial.timeline })
    },
  })
}

export function useDeleteScenarioEventMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => financialApi.deleteScenarioEvent(id),
    onSuccess: (_, deletedId) => {
      // Update cache
      queryClient.setQueryData<ScenarioEvent[]>(SCENARIO_EVENTS_QUERY_KEY, (old) =>
        old?.filter((e) => e.id !== deletedId) ?? []
      )
      // Remove individual cache
      queryClient.removeQueries({ queryKey: [...SCENARIO_EVENTS_QUERY_KEY, deletedId] })
      // Invalidate related
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.financial.timeline })
    },
  })
}
