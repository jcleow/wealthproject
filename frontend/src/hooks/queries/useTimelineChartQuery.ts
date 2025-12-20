import { useQuery } from '@tanstack/react-query'

import { timelineApi } from '@/services/timelineApi'
import type { TimelineChartResponse, TimeResolution } from '@/types/timeline'

export const TIMELINE_CHART_QUERY_KEY = ['financial', 'timeline', 'v2', 'chart'] as const

export interface UseTimelineChartQueryOptions {
  resolution?: TimeResolution
  enabled?: boolean
}

/**
 * React Query hook for fetching V2 timeline chart data.
 * Returns simplified net worth projection data for rendering charts.
 */
export function useTimelineChartQuery(options?: UseTimelineChartQueryOptions) {
  return useQuery<TimelineChartResponse>({
    queryKey: [...TIMELINE_CHART_QUERY_KEY, options?.resolution ?? 'yearly'],
    queryFn: () => timelineApi.getTimelineV2Chart({ resolution: options?.resolution }),
    staleTime: 30_000, // Consider fresh for 30 seconds
    cacheTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
    refetchOnWindowFocus: true,
    enabled: options?.enabled ?? true,
  })
}
