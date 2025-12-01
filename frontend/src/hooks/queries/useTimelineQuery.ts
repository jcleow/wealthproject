import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { financialApi } from '@/services/financialApi'
import type { TimelineResponse, TimelineYear, TimelineEditRequest } from '@/types/timeline'
import { QUERY_KEYS } from '@/lib/queryKeys'

export const TIMELINE_QUERY_KEY = QUERY_KEYS.financial.timeline

export function useTimelineQuery() {
  return useQuery({
    queryKey: TIMELINE_QUERY_KEY,
    queryFn: async (): Promise<TimelineResponse> => financialApi.getTimeline(),
    staleTime: 30_000, // Consider fresh for 30 seconds
    cacheTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
    refetchOnWindowFocus: true, // Refetch when user comes back to tab
  })
}

export function useTimelineYearMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (request: TimelineEditRequest) =>
      financialApi.updateTimelineYear(request),
    onSuccess: (updatedTimeline: TimelineResponse) => {
      // Update the timeline cache with the response
      queryClient.setQueryData<TimelineResponse>(TIMELINE_QUERY_KEY, updatedTimeline)

      // Also invalidate related queries that depend on timeline data
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.financial.netWorth })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.financial.cashflow })
    },
  })
}

// Convenience hook to get specific year data
export function useTimelineYear(year: number) {
  const { data: timeline } = useTimelineQuery()

  return {
    yearData: timeline?.years?.find((y: TimelineYear) => y.year === year),
    loading: !timeline,
  }
}
