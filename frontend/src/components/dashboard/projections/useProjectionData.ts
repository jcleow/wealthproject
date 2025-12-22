import { useMemo } from 'react'
import type { TimelineYear, TimelineMonth, TimeResolution } from '@/types/timeline'
import type { ScenarioEvent } from '@/types/scenario'
import type { ProjectionPoint } from './types'
import { BASE_CALENDAR_YEAR } from './types'

export interface UseProjectionDataOptions {
  timelineYears?: TimelineYear[]
  timelineMonths?: TimelineMonth[]
  userSettings?: {
    startingAge?: number
    terminalAge?: number
  }
}

export interface UseProjectionDataResult {
  projection: ProjectionPoint[]
  dataResolution: TimeResolution
}

/**
 * Hook that transforms timeline data into projection points for chart rendering.
 * Handles monthly and yearly timeline data from the V2 API.
 */
export function useProjectionData({
  timelineYears,
  timelineMonths,
}: UseProjectionDataOptions): UseProjectionDataResult {
  const dataResolution: TimeResolution =
    timelineMonths && timelineMonths.length > 0 ? 'monthly' : 'yearly'

  const projection = useMemo<ProjectionPoint[]>(() => {
    // Always use monthly data when available (regardless of zoom level)
    if (timelineMonths && timelineMonths.length > 0) {
      return timelineMonths.map<ProjectionPoint>((month) => {
        const totalAssets = month.totalAssets ?? (month.assets ?? []).reduce(
          (sum, item) => sum + (item.amountMonthly ?? item.amountAnnual ?? 0), 0
        )
        const totalLiabilities = month.totalLiabilities ?? (month.liabilities ?? []).reduce(
          (sum, item) => sum + (item.amountMonthly ?? item.amountAnnual ?? 0), 0
        )

        return {
          yearIndex: month.monthIndex,
          yearLabel: `${month.year}-${String(month.month).padStart(2, '0')}`,
          netWorth: month.netWorth ?? 0,
          totalAssets,
          totalLiabilities,
          calendarYear: month.year,
          calendarMonth: month.month,
          hasNonAnnualSource: false,
          hasOverride: !!month.hasOverrides,
        }
      })
    }

    // Handle yearly data
    if (timelineYears && timelineYears.length > 0) {
      // Legacy fallback: used when backend returns relative year indices instead of actual calendar years
      const baseCalendarYear = BASE_CALENDAR_YEAR
      const timelineProjection = timelineYears.map<ProjectionPoint>((year, i) => {
        const assetsArray = year.assets ?? []
        const liabilitiesArray = year.liabilities ?? []
        const yearIncomes = year.income ?? []
        const yearExpenses = year.expenses ?? []

        const totalAssets = year.totalAssets ?? assetsArray.reduce(
          (sum, item) => sum + (item.amountAnnual ?? 0), 0
        )
        const totalLiabilities = year.totalLiabilities ?? liabilitiesArray.reduce(
          (sum, item) => sum + (item.amountAnnual ?? 0), 0
        )
        const hasNonAnnualSource = [
          ...assetsArray,
          ...liabilitiesArray,
          ...yearIncomes,
          ...yearExpenses,
        ].some((item) => item.sourceFrequency && item.sourceFrequency !== 'annual')

        const calendarYear = year.year >= 1900 ? year.year : baseCalendarYear + (year.year ?? 0)

        return {
          yearIndex: i,
          yearLabel: `Year ${i}`,
          netWorth: year.netWorth ?? 0,
          totalAssets,
          totalLiabilities,
          calendarYear,
          hasNonAnnualSource,
          hasOverride: !!year.hasOverrides,
        }
      })

      // Recharts needs at least 2 points to render an Area
      if (timelineProjection.length === 1) {
        const first = timelineProjection[0]
        const clone: ProjectionPoint = {
          ...first,
          yearIndex: first.yearIndex + 1,
          yearLabel: `Year ${first.yearIndex + 1}`,
          calendarYear: (first.calendarYear ?? baseCalendarYear) + 1,
        }
        return [first, clone]
      }

      return timelineProjection
    }

    // No timeline data - return empty array
    return []
  }, [
    timelineYears,
    timelineMonths,
  ])

  return { projection, dataResolution }
}

export interface ScenarioMarkerData {
  yearIndex: number
  netWorth: number
  events: ScenarioEvent[]
}

/**
 * Compute scenario markers from events and display data
 */
export function useScenarioMarkers(
  scenarioEvents: ScenarioEvent[] | undefined,
  displayData: ProjectionPoint[],
  dataResolution: TimeResolution
): ScenarioMarkerData[] {
  return useMemo(() => {
    if (!scenarioEvents || scenarioEvents.length === 0 || displayData.length === 0) {
      return []
    }

    const markersByIndex = new Map<number, { events: ScenarioEvent[]; netWorth: number }>()

    const parseEventDate = (occursOn: string): { year: number; month: number } | null => {
      const parts = occursOn.split('-')
      if (parts.length < 2) return null
      const year = Number.parseInt(parts[0], 10)
      const month = Number.parseInt(parts[1], 10)
      if (!Number.isFinite(year) || !Number.isFinite(month)) return null
      return { year, month }
    }

    scenarioEvents.forEach((event) => {
      const eventDate = parseEventDate(event.occursOn)
      if (eventDate === null) return

      let displayPoint: ProjectionPoint | undefined

      if (dataResolution === 'monthly') {
        displayPoint = displayData.find(
          (point) => point.calendarYear === eventDate.year && point.calendarMonth === eventDate.month
        )
      } else {
        displayPoint = displayData.find((entry) => entry.calendarYear === eventDate.year)
      }

      if (!displayPoint) return

      const netWorth = displayPoint.netWorth
      const existing = markersByIndex.get(displayPoint.yearIndex) ?? { events: [], netWorth }
      markersByIndex.set(displayPoint.yearIndex, {
        events: [...existing.events, event],
        netWorth,
      })
    })

    return Array.from(markersByIndex.entries()).map(([yearIndex, data]) => ({
      yearIndex,
      netWorth: Math.max(data.netWorth, 0),
      events: data.events,
    }))
  }, [scenarioEvents, displayData, dataResolution])
}
