import React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import { useTimeline } from './useTimeline'
import type { TimelineResponse } from '@/types/timeline'

const baseTimeline: TimelineResponse = {
  years: [
    {
      year: 0,
      assets: [],
      cashAccounts: [],
      liabilities: [],
      income: [],
      expenses: [],
      netCash: 12000,
      netWorth: 50000,
      hasOverrides: false,
      growthApplied: [],
    },
  ],
  version: 'v1',
}

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  })

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

describe('useTimeline', () => {
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('loads timeline and selects the first year by default', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify(baseTimeline), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    )

    const { result } = renderHook(() => useTimeline(), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.timelineQuery.isSuccess).toBe(true))

    expect(result.current.selectedYear).toBe(0)
    expect((result.current.selectedYearData as any)?.netWorth ?? (result.current.selectedYearData as any)?.net_worth).toBe(50000)
  })

  it('saves edits via PUT and updates cached timeline', async () => {
    const updatedTimeline: TimelineResponse = {
      years: [
        {
          ...baseTimeline.years[0],
          netWorth: 90000,
          netCash: 24000,
          hasOverrides: true,
        },
      ],
      version: 'v1',
    }

    fetchMock
      .mockResolvedValueOnce(
        new Response(JSON.stringify(baseTimeline), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify(updatedTimeline), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      )

    const { result } = renderHook(() => useTimeline(), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.timelineQuery.isSuccess).toBe(true))

    await act(async () => {
      await result.current.saveEdits({
        year: 1,
        edits: [
          {
            itemId: 'asset-1',
            itemType: 'asset',
            category: 'asset_cash',
            amount: 2000,
            frequency: 'monthly',
          },
        ],
      })
    })

    expect(fetchMock).toHaveBeenLastCalledWith(
      expect.stringContaining('/financial/timeline/1'),
      expect.objectContaining({ method: 'PUT' })
    )

    await waitFor(() =>
      expect(result.current.timelineQuery.data?.years[0]?.netWorth).toBe(90000)
    )
    expect(result.current.selectedYear).toBe(1)
    expect(result.current.timelineQuery.data?.years[0]?.hasOverrides).toBe(true)
  })
})
