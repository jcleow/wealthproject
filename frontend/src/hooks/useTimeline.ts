import { useCallback, useEffect, useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { timelineApi } from '@/services/timelineApi'
import { settingsApi } from '@/api/financial/settings'
import type {
  TimelineEditRequest,
  TimelineResponse,
  TimelineYear,
  TimelineMonth,
  TimeResolution,
  TimelineV2Response,
  TimelineChartResponse,
  MonthDetailResponseV2,
} from '@/types/timeline'
import { QUERY_KEYS } from '@/lib/queryKeys'
import { useTimelineV2 } from '@/lib/featureFlags'
import { TIMELINE_CHART_QUERY_KEY } from '@/hooks/queries/useTimelineChartQuery'
import { useTimelineStore } from '@/stores'

/** Default planning horizon in years if user settings not available */
const DEFAULT_PLANNING_YEARS = 35

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

  // Use Zustand store for selection state instead of local useState
  const selectedYear = useTimelineStore((s) => s.selectedYear)
  const selectedMonth = useTimelineStore((s) => s.selectedMonth)
  const setSelectedYear = useTimelineStore((s) => s.setSelectedYear)
  const setSelectedMonth = useTimelineStore((s) => s.setSelectedMonth)
  const initializeSelection = useTimelineStore((s) => s.initializeSelection)
  const setAnchor = useTimelineStore((s) => s.setAnchor)

  // Fetch user settings to get terminal age for planning horizon
  const { data: userSettings } = useQuery({
    queryKey: QUERY_KEYS.settings.user,
    queryFn: () => settingsApi.getUserSettings(),
    staleTime: 5 * 60 * 1000,
  })

  // V1 timeline query - disabled when V2 feature flag is on
  // When V2 is enabled, chart uses V2 chart endpoint and detail panels use V2 snapshot
  const timelineQuery = useQuery<TimelineResponse>({
    queryKey: [...QUERY_KEYS.financial.timeline, options?.resolution || 'default'],
    queryFn: () => timelineApi.getTimeline({
      resolution: options?.resolution,
      includeScenarios: options?.includeScenarios ?? true
    }),
    staleTime: 1000 * 60 * 5,
    retry: 1,
    enabled: !useTimelineV2, // Disable when V2 is enabled
  })

  // V2 chart query - fetches simplified chart data when feature flag is on
  const timelineChartQuery = useQuery<TimelineChartResponse>({
    queryKey: [...TIMELINE_CHART_QUERY_KEY, options?.resolution ?? 'yearly'],
    queryFn: () => timelineApi.getTimelineV2Chart({ resolution: options?.resolution }),
    staleTime: 30_000,
    cacheTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
    enabled: useTimelineV2,
  })

  // When V2 is enabled, use the option resolution; otherwise get from V1 data
  const resolution = useTimelineV2
    ? (options?.resolution || 'monthly')
    : (timelineQuery.data?.resolution || 'yearly')

  // Calculate date range for V2 snapshot query
  // Uses user's terminal age from settings to determine planning horizon
  // When V1 is used, derive from V1 data for backwards compatibility
  const v2DateRange = useMemo(() => {
    if (useTimelineV2) {
      // Calculate planning years from user settings (terminal age - starting age)
      // Falls back to default if settings not yet loaded
      const planningYears = userSettings
        ? Math.max(1, userSettings.terminalAge - userSettings.startingAge)
        : DEFAULT_PLANNING_YEARS

      const now = new Date()
      const startYear = now.getFullYear()
      const endYear = startYear + planningYears
      return {
        startDate: formatDateForV2(startYear, 1),
        endDate: formatDateForV2(endYear, 12),
      }
    }

    // Legacy: derive from V1 data (only used when V2 flag is off)
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
  }, [timelineQuery.data, resolution, userSettings])

  // V2 snapshot query - provides detailed item data for the detail panels
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

  // Extract earliest month values separately to avoid creating new object on every recalculation
  const earliestMonthYear = useMemo(() => {
    const v2First = timelineV2Query.data?.months?.[0]
    if (v2First) return v2First.year
    const v1First = timelineQuery.data?.months?.[0]
    if (v1First) return v1First.year
    return null
  }, [timelineV2Query.data?.months, timelineQuery.data?.months])

  const earliestMonthMonth = useMemo(() => {
    const v2First = timelineV2Query.data?.months?.[0]
    if (v2First) return v2First.month
    const v1First = timelineQuery.data?.months?.[0]
    if (v1First) return v1First.month
    return null
  }, [timelineV2Query.data?.months, timelineQuery.data?.months])

  // Combine into object only for return value (consumers should use the individual values when possible)
  const earliestMonth = useMemo(() => {
    if (earliestMonthYear === null || earliestMonthMonth === null) return null
    return { year: earliestMonthYear, month: earliestMonthMonth }
  }, [earliestMonthYear, earliestMonthMonth])

  // Sync anchor to store whenever it changes
  useEffect(() => {
    setAnchor(earliestMonthYear, earliestMonthMonth)
  }, [earliestMonthYear, earliestMonthMonth, setAnchor])

  useEffect(() => {
    // Already initialized
    if (selectedYear !== null) return

    // When V2 is enabled, initialize from V2 snapshot data
    if (useTimelineV2) {
      const v2Months = timelineV2Query.data?.months
      if (v2Months?.[0]) {
        const initialYear = earliestMonthYear ?? v2Months[0].year
        const initialMonth = earliestMonthMonth ?? v2Months[0].month
        initializeSelection(initialYear, initialMonth)
      }
      return
    }

    // Legacy V1 path
    if (!timelineQuery.data) return

    // Initialize based on resolution
    if (resolution === 'monthly' && timelineQuery.data.months?.[0]) {
      const initialYear = earliestMonthYear ?? timelineQuery.data.months[0].year
      const initialMonth = earliestMonthMonth ?? timelineQuery.data.months[0].month
      initializeSelection(initialYear, initialMonth)
    } else if (resolution === 'yearly' && timelineQuery.data.years?.[0]) {
      initializeSelection(timelineQuery.data.years[0].year, null)
    }
  }, [selectedYear, timelineQuery.data, timelineV2Query.data, resolution, earliestMonthYear, earliestMonthMonth, initializeSelection])

  // Note: Clamping to anchor is now handled by the Zustand store's setSelectedYear/setSelectedMonth actions

  // Extract years for navigation (works for both resolutions)
  const years = useMemo(() => {
    if (useTimelineV2) {
      // When V2 is enabled, get years from V2 snapshot data
      const uniqueYears = new Set<number>()
      timelineV2Query.data?.months?.forEach(m => uniqueYears.add(m.year))
      return Array.from(uniqueYears).sort((a, b) => a - b)
    }

    // Legacy V1 path
    if (resolution === 'monthly') {
      // Get unique years from months
      const uniqueYears = new Set<number>()
      timelineQuery.data?.months?.forEach(m => uniqueYears.add(m.year))
      return Array.from(uniqueYears).sort((a, b) => a - b)
    }
    return timelineQuery.data?.years?.map((entry) => entry.year) ?? []
  }, [timelineQuery.data, timelineV2Query.data, resolution])

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

  // Transform V2 chart data to TimelineYear[] format for chart rendering
  // This provides minimal data needed for chart display (net worth and totals per year)
  const chartYears: TimelineYear[] | undefined = useMemo(() => {
    const chartData = timelineChartQuery.data as TimelineChartResponse | undefined
    if (!useTimelineV2 || !chartData?.years) {
      // Fall back to V1 data
      return timelineQuery.data?.years
    }

    // Transform V2 chart years to TimelineYear format
    return chartData.years.map((chartYear) => ({
      year: chartYear.year,
      netWorth: parseFloat(chartYear.netWorth) || 0,
      totalAssets: parseFloat(chartYear.totalAssets) || 0,
      totalLiabilities: parseFloat(chartYear.totalLiabilities) || 0,
      // Empty arrays for items - chart only needs totals
      assets: [],
      cashAccounts: [],
      liabilities: [],
      income: [],
      expenses: [],
      netCash: 0,
      hasOverrides: false,
      growthApplied: [],
    }))
  }, [timelineChartQuery.data, timelineQuery.data?.years])

  // Transform V2 chart data to TimelineMonth[] format for chart rendering
  const chartMonths: TimelineMonth[] | undefined = useMemo(() => {
    const chartData = timelineChartQuery.data as TimelineChartResponse | undefined
    if (!useTimelineV2 || !chartData?.months) {
      // Fall back to V1 data
      return timelineQuery.data?.months
    }

    // Transform V2 chart months to TimelineMonth format
    return chartData.months.map((chartMonth, index) => ({
      year: Math.floor(index / 12) + new Date().getFullYear(), // Approximate year from index
      month: (index % 12) + 1,
      yearIndex: Math.floor(index / 12),
      monthIndex: chartMonth.allMonthsIndex,
      netWorth: parseFloat(chartMonth.netWorth) || 0,
      totalAssets: parseFloat(chartMonth.totalAssets) || 0,
      totalLiabilities: parseFloat(chartMonth.totalLiabilities) || 0,
      // Empty arrays for items - chart only needs totals
      assets: [],
      cashAccounts: [],
      liabilities: [],
      income: [],
      expenses: [],
      netCash: 0,
      hasOverrides: false,
      growthApplied: [],
    }))
  }, [timelineChartQuery.data, timelineQuery.data?.months])

  const upsertMutation = useMutation({
    mutationFn: (payload: TimelineEditRequest) =>
      timelineApi.putTimeline(payload.year, payload),
    onSuccess: (data, variables) => {
      queryClient.setQueryData<TimelineResponse>(
        [...QUERY_KEYS.financial.timeline, options?.resolution || 'default'],
        data
      )
      setSelectedYear(variables.year)
      // Also invalidate V2 queries if enabled
      if (useTimelineV2) {
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.financial.timelineV2 }).catch(() => {
          // ignore cache errors
        })
        queryClient.invalidateQueries({ queryKey: TIMELINE_CHART_QUERY_KEY }).catch(() => {
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
      // Also invalidate V2 queries if enabled
      if (useTimelineV2) {
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.financial.timelineV2 }).catch(() => {
          // ignore cache errors
        })
        queryClient.invalidateQueries({ queryKey: TIMELINE_CHART_QUERY_KEY }).catch(() => {
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

  // Determine loading state based on which API is being used
  const isLoading = useTimelineV2
    ? timelineV2Query.isLoading || timelineChartQuery.isLoading
    : timelineQuery.isLoading

  // Provide months/years for slider navigation - uses V2 when enabled
  // Cast to TimelineMonth[]/TimelineYear[] since slider only uses year/month props
  const sliderMonths = useMemo((): TimelineMonth[] | undefined => {
    if (useTimelineV2) {
      // V2 snapshot months have year/month properties - cast with minimal placeholder data
      return timelineV2Query.data?.months?.map(m => ({
        year: m.year,
        month: m.month,
        // Placeholder values for type compatibility - slider only uses year/month
        yearIndex: 0,
        monthIndex: m.allMonthsIndex,
        assets: [],
        cashAccounts: [],
        liabilities: [],
        income: [],
        expenses: [],
        netCash: 0,
        netWorth: 0,
        hasOverrides: false,
        growthApplied: [],
      }))
    }
    return timelineQuery.data?.months
  }, [timelineV2Query.data?.months, timelineQuery.data?.months])

  const sliderYears = useMemo((): TimelineYear[] | undefined => {
    if (useTimelineV2) {
      // V2 chart years have year property - cast with minimal placeholder data
      const chartData = timelineChartQuery.data as TimelineChartResponse | undefined
      return chartData?.years?.map(y => ({
        year: y.year,
        // Placeholder values for type compatibility - slider only uses year
        assets: [],
        cashAccounts: [],
        liabilities: [],
        income: [],
        expenses: [],
        netCash: 0,
        netWorth: parseFloat(y.netWorth) || 0,
        hasOverrides: false,
        growthApplied: [],
      }))
    }
    return timelineQuery.data?.years
  }, [timelineChartQuery.data, timelineQuery.data?.years])

  return {
    timelineQuery,
    timelineV2Query,
    /** V2 chart query - only populated when NEXT_PUBLIC_USE_TIMELINE_V2=true */
    timelineChartQuery,
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
    /** Chart years - uses V2 data when enabled, falls back to V1 */
    chartYears,
    /** Chart months - uses V2 data when enabled, falls back to V1 */
    chartMonths,
    /** Months for slider navigation - minimal data with year/month */
    sliderMonths,
    /** Years for slider navigation - minimal data with year */
    sliderYears,
    saveEdits,
    saving: upsertMutation.isPending,
    /** Whether the V2 feature flag is enabled */
    isV2Enabled: useTimelineV2,
    /** Whether timeline data is loading */
    isLoading,
    anchorYear: earliestMonth?.year ?? null,
    anchorMonth: earliestMonth?.month ?? null,
  }
}
