import { useMemo } from 'react'
import type { TimelineYear, TimelineMonth, TimeResolution } from '@/types/timeline'
import type { ScenarioEvent } from '@/types/scenario'
import type { ProjectionPoint } from './types'
import { BASE_CALENDAR_YEAR, DEFAULT_STARTING_AGE, DEFAULT_TERMINAL_AGE } from './types'

export interface UseProjectionDataOptions {
  timelineYears?: TimelineYear[]
  timelineMonths?: TimelineMonth[]
  assets: Array<{ currentValue: number }>
  liabilities: Array<{ currentBalance: number }>
  expenses: Array<{ amount: number; frequency: string }>
  incomes: Array<{ amount: number; frequency: string }>
  getMonthlySavings: () => number
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
 * Handles monthly, yearly, and fallback projection calculations.
 */
export function useProjectionData({
  timelineYears,
  timelineMonths,
  assets,
  liabilities,
  expenses,
  incomes,
  getMonthlySavings,
  userSettings,
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
      // TODO: Fetch baseCalendarYear from the backend instead of hardcoding
      const baseCalendarYear = 2025
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

    // Fallback: generate projection from current assets/liabilities
    const totalAssets = assets.reduce((sum, a) => sum + a.currentValue, 0)
    const totalLiabilities = liabilities.reduce((sum, l) => sum + l.currentBalance, 0)
    const monthlySavings = getMonthlySavings()

    const startingAge = userSettings?.startingAge ?? DEFAULT_STARTING_AGE
    const terminalAge = userSettings?.terminalAge ?? DEFAULT_TERMINAL_AGE
    const planningYears = Math.max(1, terminalAge - startingAge)

    const hasAnyData =
      assets.length > 0 || liabilities.length > 0 || expenses.length > 0 || incomes.length > 0

    const currentYear = BASE_CALENDAR_YEAR
    const data: ProjectionPoint[] = []
    const annualSavings = Math.max(monthlySavings, 0) * 12
    // TODO: Retrieve these rates from the backend instead of hardcoding
    const assetGrowthRate = 0.05
    const liabilityDecayRate = 0.94

    if (!hasAnyData) {
      for (let i = 0; i <= planningYears; i++) {
        const year = currentYear + i
        data.push({
          yearIndex: i,
          yearLabel: `Year ${year}`,
          netWorth: 0,
          totalAssets: 0,
          totalLiabilities: 0,
          calendarYear: year,
        })
      }
      return data
    }

    for (let i = 0; i <= planningYears; i++) {
      const year = currentYear + i
      const projectedAssets = Math.round(
        (totalAssets + annualSavings * i) * Math.pow(1 + assetGrowthRate, i)
      )
      const projectedLiabilities = Math.max(
        0,
        Math.round(totalLiabilities * Math.pow(liabilityDecayRate, i))
      )
      const netWorth = projectedAssets - projectedLiabilities

      data.push({
        yearIndex: i,
        yearLabel: `Year ${year}`,
        calendarYear: year,
        netWorth,
        totalAssets: projectedAssets,
        totalLiabilities: projectedLiabilities,
      })
    }

    return data
  }, [
    assets,
    expenses,
    getMonthlySavings,
    incomes,
    liabilities,
    timelineYears,
    timelineMonths,
    userSettings?.startingAge,
    userSettings?.terminalAge,
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
