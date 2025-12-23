'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { formatCurrency } from '@/lib/format'
import type { ProjectionPoint } from '../types'
import { DEFAULT_STARTING_AGE } from '../types'

interface TooltipData {
  yearIndex: number
  calendarYear: number
  netWorth: number
  totalAssets: number
  totalLiabilities: number
}

interface ChartJSTooltipProps {
  /** Whether the tooltip should be visible */
  visible: boolean
  /** X position relative to chart container */
  x: number
  /** Y position relative to chart container */
  y: number
  /** The data point being hovered */
  data: TooltipData | null
  /** Starting age for age calculation */
  startingAge?: number
  /** Data resolution */
  resolution?: 'yearly' | 'monthly'
}

/**
 * External tooltip component for Chart.js
 * Renders outside the canvas as a React component for better styling control
 */
export function ChartJSTooltip({
  visible,
  x,
  y,
  data,
  startingAge = DEFAULT_STARTING_AGE,
  resolution = 'yearly',
}: ChartJSTooltipProps) {
  const tooltipRef = useRef<HTMLDivElement>(null)
  const [adjustedPosition, setAdjustedPosition] = useState({ x: 0, y: 0 })

  // Adjust position to keep tooltip within bounds
  useEffect(() => {
    if (!visible || !tooltipRef.current) {
      setAdjustedPosition({ x, y })
      return
    }

    const tooltip = tooltipRef.current
    const tooltipRect = tooltip.getBoundingClientRect()
    const parent = tooltip.parentElement
    if (!parent) {
      setAdjustedPosition({ x, y })
      return
    }

    const parentRect = parent.getBoundingClientRect()

    let adjustedX = x
    let adjustedY = y

    // Offset tooltip to the right of cursor
    adjustedX += 15

    // Keep tooltip within horizontal bounds
    if (adjustedX + tooltipRect.width > parentRect.width) {
      adjustedX = x - tooltipRect.width - 15
    }

    // Keep tooltip within vertical bounds
    if (adjustedY + tooltipRect.height > parentRect.height) {
      adjustedY = parentRect.height - tooltipRect.height - 10
    }
    if (adjustedY < 10) {
      adjustedY = 10
    }

    setAdjustedPosition({ x: adjustedX, y: adjustedY })
  }, [visible, x, y])

  if (!visible || !data) return null

  // Calculate age
  const yearsPassed = resolution === 'monthly'
    ? Math.floor(data.yearIndex / 12)
    : data.yearIndex
  const age = startingAge + yearsPassed

  return (
    <div
      ref={tooltipRef}
      className="pointer-events-none absolute z-50 min-w-[180px] rounded-lg border border-white/10 bg-[#0f1728]/95 px-3 py-2 shadow-xl backdrop-blur-xl transition-opacity duration-150"
      style={{
        left: adjustedPosition.x,
        top: adjustedPosition.y,
        opacity: visible ? 1 : 0,
      }}
    >
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
        Year {data.calendarYear} (Age {age})
      </p>
      <p className="mt-0.5 text-xl font-light text-white">
        {formatCurrency(data.netWorth)}
      </p>
      <div className="mt-2 space-y-1">
        <div className="flex items-center justify-between text-xs">
          <span className="flex items-center gap-1.5 text-sky-300">
            <span className="h-1.5 w-1.5 rounded-full bg-sky-400" />
            Assets
          </span>
          <span className="font-mono text-slate-200">
            {formatCurrency(data.totalAssets)}
          </span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="flex items-center gap-1.5 text-rose-300">
            <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
            Liabilities
          </span>
          <span className="font-mono text-slate-200">
            {formatCurrency(data.totalLiabilities)}
          </span>
        </div>
      </div>
    </div>
  )
}

/**
 * Hook to manage tooltip state from Chart.js events
 */
export function useChartJSTooltip() {
  const [tooltipState, setTooltipState] = useState<{
    visible: boolean
    x: number
    y: number
    data: TooltipData | null
  }>({
    visible: false,
    x: 0,
    y: 0,
    data: null,
  })

  const handleTooltip = useCallback(
    (
      visible: boolean,
      x: number,
      y: number,
      dataPoint: ProjectionPoint | null
    ) => {
      setTooltipState({
        visible,
        x,
        y,
        data: dataPoint
          ? {
              yearIndex: dataPoint.yearIndex,
              calendarYear: dataPoint.calendarYear,
              netWorth: dataPoint.netWorth,
              totalAssets: dataPoint.totalAssets,
              totalLiabilities: dataPoint.totalLiabilities,
            }
          : null,
      })
    },
    []
  )

  const hideTooltip = useCallback(() => {
    setTooltipState((prev) => ({ ...prev, visible: false }))
  }, [])

  return {
    tooltipState,
    handleTooltip,
    hideTooltip,
  }
}

export default ChartJSTooltip
