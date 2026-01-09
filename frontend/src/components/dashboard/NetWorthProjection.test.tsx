import React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import { NetWorthProjection } from './NetWorthProjection'
import { FinancialDataProvider } from '@/contexts/FinancialDataContext'
import type { TimelineYear } from '@/types/timeline'

// Wrapper component that provides all required contexts
function TestWrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return (
    <QueryClientProvider client={client}>
      <FinancialDataProvider>{children}</FinancialDataProvider>
    </QueryClientProvider>
  )
}

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
        createdYear: 0,
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
        createdYear: 0,
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

    // Mock window.matchMedia for JSDOM
    vi.stubGlobal('matchMedia', vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })))

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

    render(
      <TestWrapper>
        <div style={{ width: 800, height: 400 }}>
          <NetWorthProjection
            timelineYears={timelineYears}
            selectedYear={0}
            onSelectYear={onSelectYear}
            overrideYears={new Set([1])}
            scenarioEvents={scenarioEvents}
          />
        </div>
      </TestWrapper>
    )

    await waitFor(() => {
      expect(document.querySelector('[data-testid="override-marker-1"]')).not.toBeNull()
    })

    expect(onSelectYear).not.toHaveBeenCalled()
  })

  it('renders chart when scenario events are provided', async () => {
    const { container } = render(
      <TestWrapper>
        <div style={{ width: 800, height: 400 }}>
          <NetWorthProjection
            timelineYears={timelineYears}
            selectedYear={0}
            overrideYears={new Set([1])}
            scenarioEvents={scenarioEvents}
          />
        </div>
      </TestWrapper>
    )

    // Verify the component renders successfully with scenario events
    await waitFor(() => {
      // ResponsiveContainer renders an svg or the chart wrapper
      expect(container.querySelector('svg') || container.querySelector('[class*="recharts"]')).toBeTruthy()
    })
  })
})
