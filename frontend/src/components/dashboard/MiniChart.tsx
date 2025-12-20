"use client"

import { useMemo, useState, useCallback, useRef, useEffect } from 'react'
import { X, Maximize2 } from 'lucide-react'
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from 'recharts'

import type { TimelineYear, TimelineMonth } from '@/types/timeline'
import type { ScenarioEvent } from '@/types/scenario'
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { BASE_CALENDAR_YEAR } from './projections/types'

interface MiniChartProps {
  timelineYears?: TimelineYear[]
  timelineMonths?: TimelineMonth[]
  scenarioEvents?: ScenarioEvent[]
  onDismiss: () => void
  onScrollToChart: () => void
}

const MIN_WIDTH = 280
const MAX_WIDTH = 560
const MIN_HEIGHT = 180
const MAX_HEIGHT = 400
const STORAGE_KEY = 'mini-chart-size'

/**
 * A resizable, floating mini chart for picture-in-picture display.
 */
export function MiniChart({
  timelineYears,
  timelineMonths,
  scenarioEvents,
  onDismiss,
  onScrollToChart,
}: MiniChartProps) {
  const [size, setSize] = useState(() => {
    if (typeof window === 'undefined') return { width: 340, height: 220 }
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        return {
          width: Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, parsed.width || 340)),
          height: Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, parsed.height || 220)),
        }
      }
    } catch {
      // Ignore
    }
    return { width: 340, height: 220 }
  })

  const [isResizing, setIsResizing] = useState(false)
  const resizeStartRef = useRef({ x: 0, y: 0, width: 0, height: 0 })

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(size))
    }
  }, [size])

  // Simple data processing - extract what we need with consistent index
  const chartData = useMemo(() => {
    if (timelineMonths && timelineMonths.length > 0) {
      return timelineMonths
        .filter((_, i) => i % 3 === 0)
        .map((m, idx) => ({
          idx, // Array index for X-axis
          year: m.year,
          month: m.month,
          netWorth: m.netWorth,
        }))
    }
    if (timelineYears && timelineYears.length > 0) {
      return timelineYears.map((y, idx) => ({
        idx, // Array index for X-axis
        year: y.year + BASE_CALENDAR_YEAR,
        netWorth: y.netWorth,
      }))
    }
    return []
  }, [timelineYears, timelineMonths])

  // Process scenario events into marker data points
  const chartDataWithMarkers = useMemo(() => {
    if (!scenarioEvents || scenarioEvents.length === 0) return chartData

    // Create a map of data indices to event info
    const eventMap = new Map<number, { color: string; count: number }>()

    scenarioEvents.forEach((event) => {
      if (event.isIncluded === false || !event.occursOn) return

      const [, eventMonth, eventYear] = event.occursOn.split('-').map(Number)
      if (!eventYear) return

      // Find closest data point by comparing dates
      let closestIdx = 0
      let minDist = Infinity

      chartData.forEach((point) => {
        const pointYear = point.year
        const pointMonth = 'month' in point ? (point.month as number) : 6
        const eventTime = eventYear * 12 + eventMonth
        const pointTime = pointYear * 12 + pointMonth
        const dist = Math.abs(eventTime - pointTime)
        if (dist < minDist) {
          minDist = dist
          closestIdx = point.idx
        }
      })

      const existing = eventMap.get(closestIdx)
      if (existing) {
        existing.count++
      } else {
        eventMap.set(closestIdx, {
          color: event.displayColor || '#f59e0b',
          count: 1,
        })
      }
    })

    // Add marker info to chart data
    return chartData.map((point) => {
      const marker = eventMap.get(point.idx)
      return marker ? { ...point, markerColor: marker.color, markerCount: marker.count } : point
    })
  }, [scenarioEvents, chartData])

  const currentNetWorth = chartData[0]?.netWorth ?? 0

  const formatAxisValue = (value: number) => {
    const abs = Math.abs(value)
    if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
    if (abs >= 1_000) return `${(value / 1_000).toFixed(0)}K`
    return `${value.toFixed(0)}`
  }

  const formatCurrency = (value: number) => {
    const abs = Math.abs(value)
    if (abs >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`
    if (abs >= 1_000) return `$${(value / 1_000).toFixed(0)}K`
    return `$${value.toFixed(0)}`
  }

  // Calculate Y-axis domain from actual data
  const yDomain = useMemo(() => {
    if (chartData.length === 0) return [0, 100000]
    const values = chartData.map((d) => d.netWorth)
    const min = Math.min(...values)
    const max = Math.max(...values)
    // Start from 0 if all values are positive, otherwise use min
    const domainMin = min >= 0 ? 0 : min * 1.1
    const domainMax = max * 1.1 // Add 10% padding
    return [domainMin, domainMax]
  }, [chartData])

  // X-axis tick values (idx values to show as ticks)
  const xAxisTicks = useMemo(() => {
    if (chartData.length <= 4) return chartData.map((d) => d.idx)
    // Show ~4 ticks spread across the data
    const ticks: number[] = []
    const step = Math.floor(chartData.length / 3)
    for (let i = 0; i < chartData.length; i += step) {
      ticks.push(chartData[i].idx)
    }
    // Always include the last point
    const lastIdx = chartData[chartData.length - 1].idx
    if (ticks[ticks.length - 1] !== lastIdx) {
      ticks.push(lastIdx)
    }
    return ticks
  }, [chartData])

  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setIsResizing(true)
    resizeStartRef.current = { x: e.clientX, y: e.clientY, width: size.width, height: size.height }
  }, [size])

  useEffect(() => {
    if (!isResizing) return
    const onMove = (e: MouseEvent) => {
      setSize({
        width: Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, resizeStartRef.current.width + resizeStartRef.current.x - e.clientX)),
        height: Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, resizeStartRef.current.height + resizeStartRef.current.y - e.clientY)),
      })
    }
    const onUp = () => setIsResizing(false)
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
    return () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
  }, [isResizing])

  if (chartData.length === 0) return null

  return (
    <div
      className={`fixed bottom-5 right-5 z-50 overflow-hidden rounded-2xl
        bg-[#0c0c0c]/95 backdrop-blur-2xl
        shadow-[0_8px_32px_rgba(0,0,0,0.5),0_0_0_1px_rgba(255,255,255,0.06)]
        animate-in slide-in-from-bottom-4 fade-in duration-300
        ${isResizing ? 'select-none' : ''}`}
      style={{ width: size.width, height: size.height }}
    >
      {/* Resize handle */}
      <div
        className="absolute top-0 left-0 w-8 h-8 cursor-nw-resize z-10 flex items-start justify-start p-1.5 opacity-40 hover:opacity-80 transition-opacity"
        onMouseDown={handleResizeStart}
        title="Drag to resize"
      >
        <svg width="10" height="10" viewBox="0 0 10 10" className="text-slate-400">
          <path d="M0 10L10 0M0 6L6 0M0 2L2 0" stroke="currentColor" strokeWidth="1.5" fill="none" />
        </svg>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.04]">
        <div className="flex flex-col pl-3">
          <span className="text-[10px] uppercase tracking-wider font-medium text-slate-500">Net Worth</span>
          <span className="text-lg font-semibold text-white tracking-tight">{formatCurrency(currentNetWorth)}</span>
        </div>
        <div className="flex items-center gap-0.5">
          <button onClick={onScrollToChart} className="p-2 rounded-lg text-slate-500 hover:text-white hover:bg-white/[0.06] transition-all" title="Go to chart" type="button">
            <Maximize2 className="w-4 h-4" />
          </button>
          <button onClick={onDismiss} className="p-2 rounded-lg text-slate-500 hover:text-white hover:bg-white/[0.06] transition-all" title="Dismiss" type="button">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Chart */}
      <div className="h-[calc(100%-56px)] px-2 py-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartDataWithMarkers} margin={{ top: 16, right: 12, bottom: 24, left: 44 }}>
            <defs>
              <linearGradient id="pipGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.4} />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.02} />
              </linearGradient>
            </defs>

            <XAxis
              dataKey="idx"
              type="number"
              domain={[0, 'dataMax']}
              tick={{ fill: '#64748b', fontSize: 10 }}
              tickLine={false}
              axisLine={{ stroke: 'rgba(255,255,255,0.08)' }}
              ticks={xAxisTicks}
              tickFormatter={(idx: number) => {
                const pt = chartData.find((d) => d.idx === idx)
                return pt ? `${pt.year}` : ''
              }}
              dy={8}
            />

            <YAxis
              domain={yDomain}
              tick={{ fill: '#64748b', fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={formatAxisValue}
              width={40}
            />

            <Area
              type="monotone"
              dataKey="netWorth"
              stroke="#60a5fa"
              strokeWidth={2}
              fill="url(#pipGradient)"
              isAnimationActive={false}
              dot={(props: { cx?: number; cy?: number; payload?: { markerColor?: string; markerCount?: number } }) => {
                const { cx, cy, payload } = props
                if (!payload?.markerColor || cx === undefined || cy === undefined) return null
                return (
                  <g key={`marker-${cx}-${cy}`}>
                    <polygon
                      points={`${cx},${cy - 10} ${cx + 8},${cy} ${cx},${cy + 10} ${cx - 8},${cy}`}
                      fill={payload.markerColor}
                      stroke="rgba(0,0,0,0.3)"
                      strokeWidth={1}
                    />
                    {payload.markerCount && payload.markerCount > 1 && (
                      <text
                        x={cx}
                        y={cy + 3}
                        textAnchor="middle"
                        fill="white"
                        fontSize={9}
                        fontWeight="bold"
                      >
                        {payload.markerCount}
                      </text>
                    )}
                  </g>
                )
              }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
