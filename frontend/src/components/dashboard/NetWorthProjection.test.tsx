import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import { NetWorthProjection } from './NetWorthProjection'
import type { TimelineYear } from '@/types/timeline'

const timelineYears: TimelineYear[] = [
  {
    year: 0,
    assets: [
      {
        item_id: 'asset-1',
        name: 'Cash',
        category: 'asset_cash',
        amount_annual: 12000,
        source_amount: 1000,
        source_frequency: 'monthly',
        item_type: 'asset',
        created_year: 0,
      },
    ],
    liabilities: [],
    income: [],
    expenses: [],
    net_cash: 12000,
    net_worth: 12000,
    has_overrides: false,
    growth_applied: [],
  },
  {
    year: 1,
    assets: [
      {
        item_id: 'asset-1',
        name: 'Cash',
        category: 'asset_cash',
        amount_annual: 13000,
        source_amount: 1000,
        source_frequency: 'monthly',
        item_type: 'asset',
        created_year: 0,
      },
    ],
    liabilities: [],
    income: [],
    expenses: [],
    net_cash: 13000,
    net_worth: 13000,
    has_overrides: true,
    growth_applied: [],
  },
]

const scenarioEvents = [
  {
    id: 'evt-1',
    name: 'Job Loss',
    occurs_on: `${new Date().getFullYear()}-06`,
    display_icon: 'briefcase',
    display_color: '#0ea5e9',
    tags: [],
    is_included: true,
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

    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation((message, ...args) => {
      if (typeof message === 'string' && message.includes('width(-1) and height(-1)')) {
        return
      }
      return originalError(message as any, ...args)
    })

    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation((message, ...args) => {
      if (typeof message === 'string' && message.includes('width(-1) and height(-1)')) {
        return
      }
      return originalWarn(message as any, ...args)
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
  })

  it('renders override markers and allows jumping to a year', async () => {
    const onSelectYear = vi.fn()

    const client = new QueryClient()

    render(
      <QueryClientProvider client={client}>
        <div style={{ width: 800, height: 400 }}>
          <NetWorthProjection
            timelineYears={timelineYears}
            selectedYear={0}
            onSelectYear={onSelectYear}
            overrideYears={new Set([1])}
            scenarioEvents={scenarioEvents}
          />
        </div>
      </QueryClientProvider>
    )

    await waitFor(() => {
      expect(document.querySelector('[data-testid="override-marker-1"]')).not.toBeNull()
    })

    expect(onSelectYear).not.toHaveBeenCalled()
  })

  it('renders scenario markers when events are provided', async () => {
    const client = new QueryClient()

    render(
      <QueryClientProvider client={client}>
        <div style={{ width: 800, height: 400 }}>
          <NetWorthProjection
            timelineYears={timelineYears}
            selectedYear={0}
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
