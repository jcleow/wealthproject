import { renderHook } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { useProjectionData, useScenarioMarkers } from '../useProjectionData'
import type { TimelineMonth, TimelineYear } from '@/types/timeline'

describe('useProjectionData', () => {
  // Default props for the hook
  const defaultProps = {
    assets: [],
    liabilities: [],
    expenses: [],
    incomes: [],
    getMonthlySavings: () => 0,
    userSettings: { startingAge: 30, terminalAge: 65 },
  }

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
      useProjectionData({ ...defaultProps, timelineMonths })
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
      useProjectionData({ ...defaultProps, timelineYears })
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
      useProjectionData({ ...defaultProps, timelineMonths })
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

  it('generates fallback projection when no timeline data provided', () => {
    const { result } = renderHook(() =>
      useProjectionData({
        ...defaultProps,
        assets: [{ currentValue: 100000 }],
        liabilities: [{ currentBalance: 20000 }],
      })
    )

    // Should generate points for 35 years (age 30 to 65)
    expect(result.current.projection.length).toBeGreaterThan(0)
    expect(result.current.projection[0].netWorth).toBe(80000) // 100000 - 20000
  })

  it('returns empty projection points with zero values when no data', () => {
    const { result } = renderHook(() => useProjectionData(defaultProps))

    expect(result.current.projection.length).toBeGreaterThan(0)
    expect(result.current.projection[0].netWorth).toBe(0)
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
      { id: '1', name: 'Test', occursOn: '2025-01-15', isActive: true },
    ]

    const result = renderHook(() =>
      useScenarioMarkers(events as any, [], 'monthly')
    )

    expect(result.result.current).toEqual([])
  })

  it('matches events to display data points by year and month', () => {
    const events = [
      { id: '1', name: 'Buy House', occursOn: '2025-06-15', isActive: true },
    ]

    const displayData = [
      { yearIndex: 5, calendarYear: 2025, calendarMonth: 6, netWorth: 200000 },
    ]

    const result = renderHook(() =>
      useScenarioMarkers(events as any, displayData as any, 'monthly')
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
      { id: '1', name: 'Event A', occursOn: '2025-06-01', isActive: true },
      { id: '2', name: 'Event B', occursOn: '2025-06-15', isActive: true },
    ]

    const displayData = [
      { yearIndex: 5, calendarYear: 2025, calendarMonth: 6, netWorth: 200000 },
    ]

    const result = renderHook(() =>
      useScenarioMarkers(events as any, displayData as any, 'monthly')
    )

    expect(result.result.current).toHaveLength(1)
    expect(result.result.current[0].events).toHaveLength(2)
  })
})
