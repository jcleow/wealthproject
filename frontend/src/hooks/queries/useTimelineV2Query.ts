import { useQuery } from '@tanstack/react-query'
import { timelineApi } from '@/services/timelineApi'
import type { TimelineV2Response, MonthDetailResponseV2 } from '@/types/timeline'
import { QUERY_KEYS } from '@/lib/queryKeys'

export const TIMELINE_V2_QUERY_KEY = QUERY_KEYS.financial.timelineV2

export interface UseTimelineV2QueryOptions {
  /** Start date in DD-MM-YYYY format */
  startDate: string
  /** End date in DD-MM-YYYY format (optional, defaults to startDate) */
  endDate?: string
  /** Whether the query should execute */
  enabled?: boolean
  /** If true, apply scenario impacts to adjBalance/adjAmount (default: true) */
  includeScenarios?: boolean
}

/**
 * Hook to fetch timeline V2 snapshot data for a date range.
 * Returns detailed monthly financial data including CPF breakdown.
 */
export function useTimelineV2Query(options: UseTimelineV2QueryOptions) {
  const { startDate, endDate, enabled = true, includeScenarios = true } = options

  return useQuery<TimelineV2Response>({
    queryKey: ['financial', 'timeline', 'v2', startDate, endDate ?? startDate, { includeScenarios }],
    queryFn: async (): Promise<TimelineV2Response> =>
      timelineApi.getTimelineV2Snapshot({ startDate, endDate, includeScenarios }),
    enabled: enabled && !!startDate,
    staleTime: 30_000, // Consider fresh for 30 seconds
    cacheTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
    refetchOnWindowFocus: true,
  })
}

/**
 * Helper to find a specific month from V2 response
 */
export function findMonthV2(
  response: TimelineV2Response | undefined,
  year: number,
  month: number
): MonthDetailResponseV2 | undefined {
  return response?.months?.find((m) => m.year === year && m.month === month)
}
