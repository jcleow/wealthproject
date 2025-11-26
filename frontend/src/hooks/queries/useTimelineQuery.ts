import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { financialApi } from '@/services/financialApi'
import type { TimelineResponse } from '@/types/timeline'

export const TIMELINE_QUERY_KEY = ['timeline'] as const

export function useTimelineQuery() {
  return useQuery({
    queryKey: TIMELINE_QUERY_KEY,
    queryFn: financialApi.getTimeline,
    staleTime: 30_000, // Consider fresh for 30 seconds
    cacheTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
    refetchOnWindowFocus: true, // Refetch when user comes back to tab
  })
}

export function useTimelineYearMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ year, edits }: Parameters<typeof financialApi.updateTimelineYear>[0]) =>
      financialApi.updateTimelineYear({ year, edits }),
    onSuccess: (updatedTimeline) => {
      // Update the timeline cache with the response
      queryClient.setQueryData<TimelineResponse>(TIMELINE_QUERY_KEY, updatedTimeline)

      // Also invalidate related queries that depend on timeline data
      queryClient.invalidateQueries({ queryKey: ['net-worth'] })
      queryClient.invalidateQueries({ queryKey: ['cashflow'] })
    },
  })
}

// Convenience hook to get specific year data
export function useTimelineYear(year: number) {
  const { data: timeline } = useTimelineQuery()

  return {
    yearData: timeline?.years?.find(y => y.year === year),
    loading: !timeline,
  }
}