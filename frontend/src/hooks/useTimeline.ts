import { useCallback, useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { timelineApi } from '@/services/timelineApi'
import type { TimelineEditRequest, TimelineResponse, TimelineYear } from '@/types/timeline'

const TIMELINE_QUERY_KEY = ['timeline']

export function useTimeline() {
  const queryClient = useQueryClient()
  const [selectedYear, setSelectedYear] = useState<number | null>(null)

  const timelineQuery = useQuery<TimelineResponse>({
    queryKey: TIMELINE_QUERY_KEY,
    queryFn: () => timelineApi.getTimeline({ includeScenarios: true }),
    staleTime: 1000 * 60 * 5,
    retry: 1,
  })

  useEffect(() => {
    if (!timelineQuery.data) return
    if (selectedYear !== null) return
    const firstYear = timelineQuery.data.years?.[0]?.year ?? 0
    setSelectedYear(firstYear)
  }, [selectedYear, timelineQuery.data])

  const years = timelineQuery.data?.years?.map((entry) => entry.year) ?? []

  const selectedYearValue = selectedYear ?? years[0] ?? 0

  const selectedYearData: TimelineYear | undefined =
    timelineQuery.data?.years?.find((year) => year.year === selectedYearValue)

  const overrideYears = useMemo(
    () =>
      new Set(
        timelineQuery.data?.years
          ?.filter((year) => year.hasOverrides)
          .map((year) => year.year) ?? []
      ),
    [timelineQuery.data?.years]
  )

  const upsertMutation = useMutation({
    mutationFn: (payload: TimelineEditRequest) =>
      timelineApi.putTimeline(payload.year, payload),
    onSuccess: (data, variables) => {
      queryClient.setQueryData(TIMELINE_QUERY_KEY, data)
      setSelectedYear(variables.year)
    },
  })

  useEffect(() => {
    const handler = () => {
      queryClient.invalidateQueries({ queryKey: TIMELINE_QUERY_KEY }).catch(() => {
        // ignore cache errors
      })
    }
    if (typeof window !== 'undefined') {
      window.addEventListener('financial-data-refresh', handler)
      return () => window.removeEventListener('financial-data-refresh', handler)
    }
  }, [queryClient])

  const saveEdits = useCallback(
    async (payload: TimelineEditRequest): Promise<void> => {
      await upsertMutation.mutateAsync(payload)
    },
    [upsertMutation]
  )

  return {
    timelineQuery,
    selectedYear: selectedYearValue,
    selectedYearData,
    setSelectedYear,
    overrideYears,
    saveEdits,
    saving: upsertMutation.isPending,
  }
}
