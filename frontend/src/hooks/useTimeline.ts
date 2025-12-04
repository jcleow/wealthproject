import { useCallback, useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { timelineApi } from '@/services/timelineApi'
import type { TimelineEditRequest, TimelineResponse, TimelineYear, TimelineMonth, TimeResolution } from '@/types/timeline'
import { QUERY_KEYS } from '@/lib/queryKeys'

export interface UseTimelineOptions {
  /** Override resolution (defaults to user's saved preference) */
  resolution?: TimeResolution
  /** Include scenario impacts */
  includeScenarios?: boolean
}

export function useTimeline(options?: UseTimelineOptions) {
  const queryClient = useQueryClient()
  const [selectedYear, setSelectedYear] = useState<number | null>(null)
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null)

  const timelineQuery = useQuery<TimelineResponse>({
    queryKey: [...QUERY_KEYS.financial.timeline, options?.resolution || 'default'],
    queryFn: () => timelineApi.getTimeline({
      resolution: options?.resolution,
      includeScenarios: options?.includeScenarios ?? true
    }),
    staleTime: 1000 * 60 * 5,
    retry: 1,
  })

  const resolution = timelineQuery.data?.resolution || 'yearly'

  useEffect(() => {
    if (!timelineQuery.data) return
    if (selectedYear !== null) return

    // Initialize based on resolution
    if (resolution === 'monthly' && timelineQuery.data.months?.[0]) {
      setSelectedYear(timelineQuery.data.months[0].year)
      setSelectedMonth(timelineQuery.data.months[0].month)
    } else if (resolution === 'yearly' && timelineQuery.data.years?.[0]) {
      setSelectedYear(timelineQuery.data.years[0].year)
    }
  }, [selectedYear, timelineQuery.data, resolution])

  // Extract years for navigation (works for both resolutions)
  const years = useMemo(() => {
    if (resolution === 'monthly') {
      // Get unique years from months
      const uniqueYears = new Set<number>()
      timelineQuery.data?.months?.forEach(m => uniqueYears.add(m.year))
      return Array.from(uniqueYears).sort((a, b) => a - b)
    }
    return timelineQuery.data?.years?.map((entry) => entry.year) ?? []
  }, [timelineQuery.data, resolution])

  const selectedYearValue = selectedYear ?? years[0] ?? 0
  const selectedMonthValue = selectedMonth ?? 1

  // Get selected period data (year or month depending on resolution)
  const selectedYearData: TimelineYear | undefined = useMemo(() => {
    if (resolution === 'yearly') {
      return timelineQuery.data?.years?.find((year) => year.year === selectedYearValue)
    }
    // For monthly resolution, aggregate the 12 months of selected year into a TimelineYear structure
    // This allows components to work with both resolutions seamlessly
    const monthsInYear = timelineQuery.data?.months?.filter(m => m.year === selectedYearValue) || []
    if (monthsInYear.length === 0) return undefined

    // Use December's data as representative for the year (or last available month)
    const decemberMonth = monthsInYear.find(m => m.month === 12) || monthsInYear[monthsInYear.length - 1]

    return {
      year: selectedYearValue,
      assets: decemberMonth.assets,
      cashAccounts: decemberMonth.cashAccounts,
      liabilities: decemberMonth.liabilities,
      income: decemberMonth.income,
      expenses: decemberMonth.expenses,
      netCash: decemberMonth.netCash,
      netWorth: decemberMonth.netWorth,
      hasOverrides: decemberMonth.hasOverrides,
      growthApplied: decemberMonth.growthApplied,
      annualNetSavings: decemberMonth.monthlyNetSavings ? decemberMonth.monthlyNetSavings * 12 : undefined,
      accumulatedCashStart: decemberMonth.accumulatedCashStart,
      accumulatedCashEnd: decemberMonth.accumulatedCashEnd,
      interestEarned: decemberMonth.interestEarned,
      accumulatorAccountId: decemberMonth.accumulatorAccountId,
    }
  }, [timelineQuery.data, resolution, selectedYearValue])

  const selectedMonthData: TimelineMonth | undefined = useMemo(() => {
    if (resolution !== 'monthly') return undefined
    return timelineQuery.data?.months?.find(
      (m) => m.year === selectedYearValue && m.month === selectedMonthValue
    )
  }, [timelineQuery.data, resolution, selectedYearValue, selectedMonthValue])

  const overrideYears = useMemo(() => {
    const years = new Set<number>()
    if (resolution === 'yearly') {
      timelineQuery.data?.years
        ?.filter((year) => year.hasOverrides)
        .forEach((year) => years.add(year.year))
    } else {
      timelineQuery.data?.months
        ?.filter((month) => month.hasOverrides)
        .forEach((month) => years.add(month.year))
    }
    return years
  }, [timelineQuery.data, resolution])

  const upsertMutation = useMutation({
    mutationFn: (payload: TimelineEditRequest) =>
      timelineApi.putTimeline(payload.year, payload),
    onSuccess: (data, variables) => {
      queryClient.setQueryData<TimelineResponse>(
        [...QUERY_KEYS.financial.timeline, options?.resolution || 'default'],
        data
      )
      setSelectedYear(variables.year)
    },
  })

  useEffect(() => {
    const handler = () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.financial.timeline }).catch(() => {
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
    resolution,
    selectedYear: selectedYearValue,
    selectedMonth: selectedMonthValue,
    selectedYearData,
    selectedMonthData,
    setSelectedYear,
    setSelectedMonth,
    years,
    overrideYears,
    saveEdits,
    saving: upsertMutation.isPending,
  }
}
