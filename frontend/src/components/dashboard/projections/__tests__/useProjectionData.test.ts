import { renderHook } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { useProjectionData, useScenarioMarkers } from '../useProjectionData'
import type { TimelineMonth, TimelineYear } from '@/types/timeline'
import type { ScenarioEvent } from '@/types/scenario'
import type { ProjectionPoint } from '../types'

/** Helper to create a minimal ScenarioEvent for testing */
function createMockEvent(overrides: Partial<ScenarioEvent> & { id: string; name: string; occursOn: string }): ScenarioEvent {
  return {
    tags: [],
    isIncluded: true,
    impacts: [],
    ...overrides,
  }
}

/** Helper to create a minimal ProjectionPoint for testing */
function createMockPoint(overrides: Partial<ProjectionPoint> & { yearIndex: number; calendarYear: number; netWorth: number }): ProjectionPoint {
  return {
    yearLabel: `Year ${overrides.yearIndex}`,
    totalAssets: overrides.netWorth,
    totalLiabilities: 0,
    ...overrides,
  }
}

describe('useProjectionData', () => {
  // ============================================
  // DATA RESOLUTION TESTS
  // ============================================

  it('returns "monthly" resolution when timelineMonths is provided', () => {
    const timelineMonths: TimelineMonth[] = [
      {
        year: 2025,
        month: 1,
        yearIndex: 0,
        monthIndex: 0,
        netWorth: 100000,
        totalAssets: 150000,
        totalLiabilities: 50000,
        assets: [],
        cashAccounts: [],
        liabilities: [],
        income: [],
        expenses: [],
        netCash: 0,
        hasOverrides: false,
        growthApplied: [],
      },
    ]

    const { result } = renderHook(() =>
      useProjectionData({ timelineMonths })
    )

    expect(result.current.dataResolution).toBe('monthly')
  })

  it('returns "yearly" resolution when only timelineYears is provided', () => {
    const timelineYears: TimelineYear[] = [
      {
        year: 2025,
        netWorth: 100000,
        totalAssets: 150000,
        totalLiabilities: 50000,
        assets: [],
        cashAccounts: [],
        liabilities: [],
        income: [],
        expenses: [],
        netCash: 0,
        hasOverrides: false,
        growthApplied: [],
      },
    ]

    const { result } = renderHook(() =>
      useProjectionData({ timelineYears })
    )

    expect(result.current.dataResolution).toBe('yearly')
  })

  // ============================================
  // PROJECTION CALCULATION TESTS
  // ============================================

  it('transforms monthly timeline data into projection points', () => {
    const timelineMonths: TimelineMonth[] = [
      {
        year: 2025,
        month: 1,
        yearIndex: 0,
        monthIndex: 0,
        netWorth: 100000,
        totalAssets: 150000,
        totalLiabilities: 50000,
        assets: [],
        cashAccounts: [],
        liabilities: [],
        income: [],
        expenses: [],
        netCash: 0,
        hasOverrides: false,
        growthApplied: [],
      },
      {
        year: 2025,
        month: 2,
        yearIndex: 0,
        monthIndex: 1,
        netWorth: 105000,
        totalAssets: 155000,
        totalLiabilities: 50000,
        assets: [],
        cashAccounts: [],
        liabilities: [],
        income: [],
        expenses: [],
        netCash: 0,
        hasOverrides: false,
        growthApplied: [],
      },
    ]

    const { result } = renderHook(() =>
      useProjectionData({ timelineMonths })
    )

    expect(result.current.projection).toHaveLength(2)
    expect(result.current.projection[0]).toMatchObject({
      yearIndex: 0,
      netWorth: 100000,
      calendarYear: 2025,
      calendarMonth: 1,
    })
    expect(result.current.projection[1]).toMatchObject({
      yearIndex: 1,
      netWorth: 105000,
      calendarYear: 2025,
      calendarMonth: 2,
    })
  })

  it('returns empty projection when no timeline data provided', () => {
    const { result } = renderHook(() => useProjectionData({}))

    expect(result.current.projection).toHaveLength(0)
  })
})

describe('useScenarioMarkers', () => {
  it('returns empty array when no scenario events', () => {
    const result = renderHook(() =>
      useScenarioMarkers(undefined, [], 'monthly')
    )

    expect(result.result.current).toEqual([])
  })

  it('returns empty array when no display data', () => {
    const events = [
      createMockEvent({ id: '1', name: 'Test', occursOn: '2025-01-15' }),
    ]

    const result = renderHook(() =>
      useScenarioMarkers(events, [], 'monthly')
    )

    expect(result.result.current).toEqual([])
  })

  it('matches events to display data points by year and month', () => {
    const events = [
      createMockEvent({ id: '1', name: 'Buy House', occursOn: '2025-06-15' }),
    ]

    const displayData = [
      createMockPoint({ yearIndex: 5, calendarYear: 2025, calendarMonth: 6, netWorth: 200000 }),
    ]

    const result = renderHook(() =>
      useScenarioMarkers(events, displayData, 'monthly')
    )

    expect(result.result.current).toHaveLength(1)
    expect(result.result.current[0]).toMatchObject({
      yearIndex: 5,
      netWorth: 200000,
    })
    expect(result.result.current[0].events).toHaveLength(1)
  })

  it('groups multiple events on the same month', () => {
    const events = [
      createMockEvent({ id: '1', name: 'Event A', occursOn: '2025-06-01' }),
      createMockEvent({ id: '2', name: 'Event B', occursOn: '2025-06-15' }),
    ]

    const displayData = [
      createMockPoint({ yearIndex: 5, calendarYear: 2025, calendarMonth: 6, netWorth: 200000 }),
    ]

    const result = renderHook(() =>
      useScenarioMarkers(events, displayData, 'monthly')
    )

    expect(result.result.current).toHaveLength(1)
    expect(result.result.current[0].events).toHaveLength(2)
  })
})
