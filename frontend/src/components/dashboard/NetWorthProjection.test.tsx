import React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import { NetWorthProjection } from './NetWorthProjection'
import { useTimelineStore } from '@/stores'
import type { TimelineYear } from '@/types/timeline'

const timelineYears: TimelineYear[] = [
  {
    year: 0,
    assets: [
      {
        itemId: 'asset-1',
        name: 'Cash',
        category: 'asset_cash',
        amountAnnual: 12000,
        sourceAmount: 1000,
        sourceFrequency: 'monthly',
        itemType: 'asset',
        startYear: 0,
      },
    ],
    cashAccounts: [],
    liabilities: [],
    income: [],
    expenses: [],
    netCash: 12000,
    netWorth: 12000,
    hasOverrides: false,
    growthApplied: [],
  },
  {
    year: 1,
    assets: [
      {
        itemId: 'asset-1',
        name: 'Cash',
        category: 'asset_cash',
        amountAnnual: 13000,
        sourceAmount: 1000,
        sourceFrequency: 'monthly',
        itemType: 'asset',
        startYear: 0,
      },
    ],
    cashAccounts: [],
    liabilities: [],
    income: [],
    expenses: [],
    netCash: 13000,
    netWorth: 13000,
    hasOverrides: true,
    growthApplied: [],
  },
]

const scenarioEvents = [
  {
    id: 'evt-1',
    name: 'Job Loss',
    occursOn: `${new Date().getFullYear()}-06`,
    displayIcon: 'briefcase',
    displayColor: '#0ea5e9',
    tags: [],
    isIncluded: true,
    impacts: [],
  },
]

describe('NetWorthProjection', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>
  const originalError = console.error
  const originalWarn = console.warn

  beforeEach(() => {
    class ResizeObserverMock {
      private callback: ResizeObserverCallback
      constructor(callback: ResizeObserverCallback) {
        this.callback = callback
      }
      observe() {
        this.callback([{ contentRect: { width: 800, height: 400 } } as ResizeObserverEntry], this)
      }
      unobserve() {}
      disconnect() {}
    }

    vi.stubGlobal('ResizeObserver', ResizeObserverMock)

    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation((...args: Parameters<typeof console.error>) => {
      const [message] = args
      if (typeof message === 'string' && message.includes('width(-1) and height(-1)')) {
        return
      }
      return originalError(...args)
    })

    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation((...args: Parameters<typeof console.warn>) => {
      const [message] = args
      if (typeof message === 'string' && message.includes('width(-1) and height(-1)')) {
        return
      }
      return originalWarn(...args)
    })

    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response(JSON.stringify([]), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      )
    )
  })

  afterEach(() => {
    consoleErrorSpy.mockRestore()
    consoleWarnSpy.mockRestore()
    vi.unstubAllGlobals()
    // Reset Zustand store state
    useTimelineStore.setState({
      selectedYear: null,
      selectedMonth: null,
      anchorYear: null,
      anchorMonth: null,
      resolution: 'monthly',
      zoomLevel: 'yearly',
    })
  })

  it('renders override markers and allows jumping to a year', async () => {
    // Set initial store state
    useTimelineStore.setState({ selectedYear: 0, resolution: 'yearly', zoomLevel: 'yearly' })

    const client = new QueryClient()

    render(
      <QueryClientProvider client={client}>
        <div style={{ width: 800, height: 400 }}>
          <NetWorthProjection
            timelineYears={timelineYears}
            overrideYears={new Set([1])}
            scenarioEvents={scenarioEvents}
          />
        </div>
      </QueryClientProvider>
    )

    await waitFor(() => {
      expect(document.querySelector('[data-testid="override-marker-1"]')).not.toBeNull()
    })
  })

  it('renders scenario markers when events are provided', async () => {
    // Set initial store state
    useTimelineStore.setState({ selectedYear: 0, resolution: 'yearly', zoomLevel: 'yearly' })

    const client = new QueryClient()

    render(
      <QueryClientProvider client={client}>
        <div style={{ width: 800, height: 400 }}>
          <NetWorthProjection
            timelineYears={timelineYears}
            overrideYears={new Set([1])}
            scenarioEvents={scenarioEvents}
          />
        </div>
      </QueryClientProvider>
    )

    await waitFor(() => {
      expect(document.querySelector('[data-testid="scenario-marker-0"]')).not.toBeNull()
    })
  })
})
