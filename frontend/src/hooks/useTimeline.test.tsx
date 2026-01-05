import React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import { useTimeline } from './useTimeline'
import type { TimelineResponse } from '@/types/timeline'

const baseTimeline: TimelineResponse = {
  resolution: 'yearly',
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
    // Use mockImplementation to create a new Response for each call
    // (Response bodies can only be read once, so we need fresh instances)
    fetchMock.mockImplementation(() =>
      Promise.resolve(
        new Response(JSON.stringify(baseTimeline), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      )
    )

    const { result } = renderHook(() => useTimeline(), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.timelineQuery.isSuccess).toBe(true))

    expect(result.current.selectedYear).toBe(0)
    expect(result.current.selectedYearData?.netWorth).toBe(50000)
  })

  it('saves edits via PUT and updates cached timeline', async () => {
    const updatedTimeline: TimelineResponse = {
      resolution: 'yearly',
      years: [
        {
          ...baseTimeline.years![0],
          netWorth: 90000,
          netCash: 24000,
          hasOverrides: true,
        },
      ],
      version: 'v1',
    }

    let callCount = 0

    // Use mockImplementation to create new Response instances for each call
    fetchMock.mockImplementation((_url: string, options?: RequestInit) => {
      callCount++

      // PUT request for timeline update
      if (options?.method === 'PUT') {
        return Promise.resolve(
          new Response(JSON.stringify(updatedTimeline), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        )
      }

      // First GET returns base timeline, subsequent GETs return updated
      const response = callCount === 1 ? baseTimeline : updatedTimeline
      return Promise.resolve(
        new Response(JSON.stringify(response), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      )
    })

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

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/financial/timeline/1'),
      expect.objectContaining({ method: 'PUT' })
    )

    await waitFor(() =>
      expect(result.current.timelineQuery.data?.years?.[0]?.netWorth).toBe(90000)
    )
    expect(result.current.selectedYear).toBe(1)
    expect(result.current.timelineQuery.data?.years?.[0]?.hasOverrides).toBe(true)
  })
})
