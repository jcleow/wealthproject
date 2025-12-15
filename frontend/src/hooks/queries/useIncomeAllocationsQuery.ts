import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { incomesApi, type IncomeAllocation, type CreateIncomeAllocationPayload, type ListAllocationsParams } from '@/api/financial/incomes'
import { QUERY_KEYS } from '@/lib/queryKeys'

// Query all allocations for the current user
// params.targetType: filter by 'investment' or 'cash_account', or undefined for all
// params.asOf: filter allocations active as of this date (ISO 8601, e.g., "2031-04-01")
export function useAllIncomeAllocationsQuery(params?: ListAllocationsParams) {
  return useQuery({
    queryKey: params
      ? [...QUERY_KEYS.financial.incomeAllocations, params]
      : QUERY_KEYS.financial.incomeAllocations,
    queryFn: () => incomesApi.listAllIncomeAllocations(params),
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

// Stop an allocation at a future date (sets end_date instead of deleting)
export function useStopIncomeAllocationMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      incomeId,
      allocationId,
      endDate,
    }: {
      incomeId: string
      allocationId: string
      endDate: string
    }) => incomesApi.stopIncomeAllocation(incomeId, allocationId, endDate),
    onSuccess: (updatedAllocation) => {
      // Update the allocations cache with the new end_date
      queryClient.setQueryData<IncomeAllocation[]>(
        [...QUERY_KEYS.financial.incomeAllocations, updatedAllocation.incomeId],
        (old) =>
          old?.map((alloc) =>
            alloc.id === updatedAllocation.id ? updatedAllocation : alloc
          ) ?? []
      )
      // Invalidate all income allocations list
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.financial.incomeAllocations })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.financial.timeline })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.financial.timelineV2 })
    },
  })
}
