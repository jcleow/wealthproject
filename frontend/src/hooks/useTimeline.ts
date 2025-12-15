import { useCallback, useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { timelineApi } from '@/services/timelineApi'
import type {
  TimelineEditRequest,
  TimelineResponse,
  TimelineYear,
  TimelineMonth,
  TimeResolution,
  TimelineV2Response,
  MonthDetailResponseV2,
} from '@/types/timeline'
import { QUERY_KEYS } from '@/lib/queryKeys'
import { useTimelineV2 } from '@/lib/featureFlags'

/**
 * Format a date as DD-MM-YYYY for V2 API
 */
function formatDateForV2(year: number, month: number): string {
  const day = '01'
  const monthStr = month.toString().padStart(2, '0')
  return `${day}-${monthStr}-${year}`
}

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

  // Calculate date range for V2 query based on V1 data
  const v2DateRange = useMemo(() => {
    if (!timelineQuery.data) return null

    if (resolution === 'monthly' && timelineQuery.data.months?.length) {
      const months = timelineQuery.data.months
      const firstMonth = months[0]
      const lastMonth = months[months.length - 1]
      return {
        startDate: formatDateForV2(firstMonth.year, firstMonth.month),
        endDate: formatDateForV2(lastMonth.year, lastMonth.month),
      }
    } else if (resolution === 'yearly' && timelineQuery.data.years?.length) {
      const years = timelineQuery.data.years
      const firstYear = years[0].year
      const lastYear = years[years.length - 1].year
      return {
        startDate: formatDateForV2(firstYear, 1),
        endDate: formatDateForV2(lastYear, 12),
      }
    }
    return null
  }, [timelineQuery.data, resolution])

  // V2 snapshot query - only enabled when feature flag is on and we have V1 data
  const timelineV2Query = useQuery<TimelineV2Response>({
    queryKey: [
      'financial',
      'timeline',
      'v2',
      v2DateRange?.startDate ?? '',
      v2DateRange?.endDate ?? '',
      { includeScenarios: true },
    ],
    queryFn: () =>
      timelineApi.getTimelineV2Snapshot({
        startDate: v2DateRange!.startDate,
        endDate: v2DateRange!.endDate,
        includeScenarios: true,
      }),
    enabled: useTimelineV2 && !!v2DateRange,
    staleTime: 1000 * 60 * 5,
    retry: 1,
  })

  const earliestMonth = useMemo(() => {
    // Months are already sorted by startDate from the backend; the first entry is the earliest.
    const v2First = timelineV2Query.data?.months?.[0]
    if (v2First) return { year: v2First.year, month: v2First.month }
    const v1First = timelineQuery.data?.months?.[0]
    if (v1First) return { year: v1First.year, month: v1First.month }
    return null
  }, [timelineV2Query.data?.months, timelineQuery.data?.months])

  useEffect(() => {
    if (!timelineQuery.data) return
    if (selectedYear !== null) return

    // Initialize based on resolution
    if (resolution === 'monthly' && timelineQuery.data.months?.[0]) {
      const initialYear = earliestMonth?.year ?? timelineQuery.data.months[0].year
      const initialMonth = earliestMonth?.month ?? timelineQuery.data.months[0].month
      setSelectedYear(initialYear)
      setSelectedMonth(initialMonth)
    } else if (resolution === 'yearly' && timelineQuery.data.years?.[0]) {
      setSelectedYear(timelineQuery.data.years[0].year)
    }
  }, [selectedYear, timelineQuery.data, resolution, earliestMonth])

  useEffect(() => {
    if (!earliestMonth) return
    const baseYear = earliestMonth.year
    if (selectedYear === null) return
    const effectiveYear = selectedYear >= 1900 ? selectedYear : baseYear + selectedYear
    const isBeforeAnchor =
      effectiveYear < earliestMonth.year ||
      (effectiveYear === earliestMonth.year && (selectedMonth ?? 1) < earliestMonth.month)
    if (isBeforeAnchor) {
      setSelectedYear(earliestMonth.year)
      setSelectedMonth(earliestMonth.month)
    }
  }, [earliestMonth, selectedYear, selectedMonth])

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
    const baseYear = new Date().getFullYear()

    if (resolution === 'yearly') {
      // Backend sends absolute calendar years (2025, 2026, etc.)
      // selectedYearValue could be either relative (0, 1, 2) or absolute (2025, 2026)
      // Try both to handle the transition
      return timelineQuery.data?.years?.find((year) =>
        year.year === selectedYearValue || year.year === baseYear + selectedYearValue
      )
    }
    // For monthly resolution, aggregate the 12 months of selected year into a TimelineYear structure
    // This allows components to work with both resolutions seamlessly
    const searchYear = selectedYearValue >= 1900 ? selectedYearValue : baseYear + selectedYearValue
    const monthsInYear = timelineQuery.data?.months?.filter(m => m.year === searchYear) || []
    if (monthsInYear.length === 0) return undefined

    // Use December's data as representative for the year (or last available month)
    const decemberMonth = monthsInYear.find(m => m.month === 12) || monthsInYear[monthsInYear.length - 1]

    return {
      year: searchYear,
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
    const baseYear = new Date().getFullYear()
    // Convert relative year to absolute if needed
    const searchYear = selectedYearValue >= 1900 ? selectedYearValue : baseYear + selectedYearValue
    return timelineQuery.data?.months?.find(
      (m) => m.year === searchYear && m.month === selectedMonthValue
    )
  }, [timelineQuery.data, resolution, selectedYearValue, selectedMonthValue])

  // V2 selected month data - only when V2 feature flag is enabled
  const selectedMonthDataV2: MonthDetailResponseV2 | undefined = useMemo(() => {
    if (!useTimelineV2 || !timelineV2Query.data) return undefined
    const baseYear = new Date().getFullYear()
    const searchYear = selectedYearValue >= 1900 ? selectedYearValue : baseYear + selectedYearValue
    return timelineV2Query.data.months?.find(
      (m) => m.year === searchYear && m.month === selectedMonthValue
    )
  }, [timelineV2Query.data, selectedYearValue, selectedMonthValue])

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
      // Also invalidate V2 query if enabled
      if (useTimelineV2) {
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.financial.timelineV2 }).catch(() => {
          // ignore cache errors
        })
      }
    },
  })

  useEffect(() => {
    const handler = () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.financial.timeline }).catch(() => {
        // ignore cache errors
      })
      // Also invalidate V2 if enabled
      if (useTimelineV2) {
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.financial.timelineV2 }).catch(() => {
          // ignore cache errors
        })
      }
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
    timelineV2Query,
    resolution,
    selectedYear: selectedYearValue,
    selectedMonth: selectedMonthValue,
    selectedYearData,
    selectedMonthData,
    /** V2 month data - only available when NEXT_PUBLIC_USE_TIMELINE_V2=true */
    selectedMonthDataV2,
    setSelectedYear,
    setSelectedMonth,
    years,
    overrideYears,
    saveEdits,
    saving: upsertMutation.isPending,
    /** Whether the V2 feature flag is enabled */
    isV2Enabled: useTimelineV2,
    anchorYear: earliestMonth?.year ?? null,
    anchorMonth: earliestMonth?.month ?? null,
  }
}
