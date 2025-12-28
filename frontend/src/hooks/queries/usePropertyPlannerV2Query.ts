/**
 * React Query hooks for Property Planner V2
 *
 * Provides query and mutation hooks for the new property planner API.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { propertyPlannerV2Api } from '@/api/financial'
import { QUERY_KEYS } from '@/lib/queryKeys'
import type {
  PropertyScenarioFull,
  CreateScenarioInput,
  UpdateScenarioInput,
} from '@/types/propertyPlannerV2'

// Query key factory for property planner V2
export const propertyPlannerV2Keys = {
  all: QUERY_KEYS.financial.propertyPlannerV2,
  lists: () => [...propertyPlannerV2Keys.all, 'list'] as const,
  list: () => [...propertyPlannerV2Keys.lists()] as const,
  details: () => [...propertyPlannerV2Keys.all, 'detail'] as const,
  detail: (id: string) => [...propertyPlannerV2Keys.details(), id] as const,
}

/**
 * Query hook for listing all property planner V2 scenarios
 */
export function usePropertyPlannerV2ScenariosQuery() {
  return useQuery({
    queryKey: propertyPlannerV2Keys.list(),
    queryFn: () => propertyPlannerV2Api.listScenarios(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

/**
 * Query hook for a single property planner V2 scenario
 */
export function usePropertyPlannerV2ScenarioQuery(id: string | undefined) {
  return useQuery({
    queryKey: propertyPlannerV2Keys.detail(id ?? ''),
    queryFn: () => propertyPlannerV2Api.getScenario(id!),
    enabled: !!id,
    staleTime: 30_000, // 30 seconds
  })
}

/**
 * Mutation hook for creating a property planner V2 scenario
 */
export function useCreatePropertyPlannerV2ScenarioMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: CreateScenarioInput) => propertyPlannerV2Api.createScenario(input),
    onSuccess: (data) => {
      // Add new scenario to list cache
      queryClient.setQueryData<PropertyScenarioFull[]>(
        propertyPlannerV2Keys.list(),
        (old) => (old ? [...old, data] : [data])
      )
      // Set detail cache
      queryClient.setQueryData(propertyPlannerV2Keys.detail(data.scenario.id), data)
      // Invalidate timeline since property scenarios affect it
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.financial.timeline })

      toast.success('Property scenario created')
    },
    onError: (error: Error) => {
      toast.error(`Failed to create scenario: ${error.message}`)
    },
  })
}

/**
 * Mutation hook for updating a property planner V2 scenario
 */
export function useUpdatePropertyPlannerV2ScenarioMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateScenarioInput }) =>
      propertyPlannerV2Api.updateScenario(id, input),
    onMutate: async ({ id, input }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: propertyPlannerV2Keys.detail(id) })

      // Snapshot previous value
      const previousScenario = queryClient.getQueryData<PropertyScenarioFull>(
        propertyPlannerV2Keys.detail(id)
      )

      // Optimistically update detail cache
      if (previousScenario && input.sgDetails) {
        queryClient.setQueryData(propertyPlannerV2Keys.detail(id), {
          ...previousScenario,
          sgDetails: previousScenario.sgDetails
            ? { ...previousScenario.sgDetails, ...input.sgDetails }
            : null,
        })
      }

      return { previousScenario }
    },
    onSuccess: (data, { id }) => {
      // Update with server response
      queryClient.setQueryData(propertyPlannerV2Keys.detail(id), data)
      // Update list cache
      queryClient.setQueryData<PropertyScenarioFull[]>(
        propertyPlannerV2Keys.list(),
        (old) => old?.map((s) => (s.scenario.id === id ? data : s)) ?? []
      )
      // Invalidate timeline
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.financial.timeline })

      toast.success('Scenario updated')
    },
    onError: (error: Error, { id }, context) => {
      // Rollback on error
      if (context?.previousScenario) {
        queryClient.setQueryData(propertyPlannerV2Keys.detail(id), context.previousScenario)
      }
      toast.error(`Failed to update scenario: ${error.message}`)
    },
  })
}

/**
 * Mutation hook for deleting a property planner V2 scenario
 */
export function useDeletePropertyPlannerV2ScenarioMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => propertyPlannerV2Api.deleteScenario(id),
    onMutate: async (id) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: propertyPlannerV2Keys.list() })

      // Snapshot previous value
      const previousScenarios = queryClient.getQueryData<PropertyScenarioFull[]>(
        propertyPlannerV2Keys.list()
      )

      // Optimistically remove from list
      queryClient.setQueryData<PropertyScenarioFull[]>(
        propertyPlannerV2Keys.list(),
        (old) => old?.filter((s) => s.scenario.id !== id) ?? []
      )

      return { previousScenarios }
    },
    onSuccess: (_, id) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: propertyPlannerV2Keys.detail(id) })
      // Invalidate timeline
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.financial.timeline })

      toast.success('Scenario deleted')
    },
    onError: (error: Error, _, context) => {
      // Rollback on error
      if (context?.previousScenarios) {
        queryClient.setQueryData(propertyPlannerV2Keys.list(), context.previousScenarios)
      }
      toast.error(`Failed to delete scenario: ${error.message}`)
    },
  })
}

/**
 * Mutation hook for toggling scenario inclusion
 */
export function useTogglePropertyPlannerV2ScenarioMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, isIncluded }: { id: string; isIncluded: boolean }) =>
      propertyPlannerV2Api.toggleScenarioIncluded(id, isIncluded),
    onMutate: async ({ id, isIncluded }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: propertyPlannerV2Keys.list() })

      // Snapshot previous value
      const previousScenarios = queryClient.getQueryData<PropertyScenarioFull[]>(
        propertyPlannerV2Keys.list()
      )

      // Optimistically update
      queryClient.setQueryData<PropertyScenarioFull[]>(
        propertyPlannerV2Keys.list(),
        (old) =>
          old?.map((s) =>
            s.scenario.id === id && s.sgDetails
              ? { ...s, sgDetails: { ...s.sgDetails, isIncluded } }
              : s
          ) ?? []
      )

      return { previousScenarios }
    },
    onSuccess: (data, { id }) => {
      // Update with server response
      queryClient.setQueryData(propertyPlannerV2Keys.detail(id), data)
      queryClient.setQueryData<PropertyScenarioFull[]>(
        propertyPlannerV2Keys.list(),
        (old) => old?.map((s) => (s.scenario.id === id ? data : s)) ?? []
      )
      // Invalidate timeline
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.financial.timeline })
    },
    onError: (error: Error, _, context) => {
      // Rollback on error
      if (context?.previousScenarios) {
        queryClient.setQueryData(propertyPlannerV2Keys.list(), context.previousScenarios)
      }
      toast.error(`Failed to toggle scenario: ${error.message}`)
    },
  })
}
