import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { incomesApi, type IncomeAllocation, type CreateIncomeAllocationPayload } from '@/api/financial/incomes'
import { QUERY_KEYS } from '@/lib/queryKeys'

// Query all allocations for the current user
export function useAllIncomeAllocationsQuery() {
  return useQuery({
    queryKey: QUERY_KEYS.financial.incomeAllocations,
    queryFn: () => incomesApi.listAllIncomeAllocations(),
    staleTime: 30_000,
  })
}

// Query allocations for a specific income
export function useIncomeAllocationsQuery(incomeId: string | undefined) {
  return useQuery({
    queryKey: [...QUERY_KEYS.financial.incomeAllocations, incomeId],
    queryFn: () => incomesApi.listIncomeAllocations(incomeId!),
    enabled: !!incomeId,
    staleTime: 30_000,
  })
}

export function useCreateIncomeAllocationMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ incomeId, payload }: { incomeId: string; payload: CreateIncomeAllocationPayload }) =>
      incomesApi.createIncomeAllocation(incomeId, payload),
    onSuccess: (newAllocation) => {
      // Update the allocations cache for this income
      queryClient.setQueryData<IncomeAllocation[]>(
        [...QUERY_KEYS.financial.incomeAllocations, newAllocation.incomeId],
        (old) => (old ? [...old, newAllocation] : [newAllocation])
      )
      // Invalidate timeline since allocations affect cash flow projections
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.financial.timeline })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.financial.timelineV2 })
    },
  })
}

export function useUpdateIncomeAllocationMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      incomeId,
      allocationId,
      payload,
    }: {
      incomeId: string
      allocationId: string
      payload: CreateIncomeAllocationPayload
    }) => incomesApi.updateIncomeAllocation(incomeId, allocationId, payload),
    onSuccess: (updatedAllocation) => {
      // Update the allocations cache
      queryClient.setQueryData<IncomeAllocation[]>(
        [...QUERY_KEYS.financial.incomeAllocations, updatedAllocation.incomeId],
        (old) =>
          old?.map((alloc) =>
            alloc.id === updatedAllocation.id ? updatedAllocation : alloc
          ) ?? []
      )
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.financial.timeline })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.financial.timelineV2 })
    },
  })
}

export function useDeleteIncomeAllocationMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ incomeId, allocationId }: { incomeId: string; allocationId: string }) =>
      incomesApi.deleteIncomeAllocation(incomeId, allocationId),
    onSuccess: (_, { incomeId, allocationId }) => {
      // Update the allocations cache
      queryClient.setQueryData<IncomeAllocation[]>(
        [...QUERY_KEYS.financial.incomeAllocations, incomeId],
        (old) => old?.filter((alloc) => alloc.id !== allocationId) ?? []
      )
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.financial.timeline })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.financial.timelineV2 })
    },
  })
}
