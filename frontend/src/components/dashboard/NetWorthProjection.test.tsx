import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

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

describe('NetWorthProjection', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>
  const originalError = console.error
  const originalWarn = console.warn

  beforeEach(() => {
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
    const user = userEvent.setup()

    render(
      <div style={{ width: 800, height: 400 }}>
        <NetWorthProjection
          timelineYears={timelineYears}
          selectedYear={0}
          onSelectYear={onSelectYear}
        />
      </div>
    )

    const marker = await screen.findByTestId('override-marker-1')
    await user.click(marker)

    expect(onSelectYear).toHaveBeenCalledWith(1)
  })
})
