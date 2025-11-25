import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Area,
  ComposedChart,
  CartesianGrid,
  ResponsiveContainer,
  Scatter,
  Tooltip,
  XAxis,
  YAxis,
  ReferenceArea,
} from 'recharts'

import { useFinancialData } from '@/hooks/useFinancialData'
import { ScenarioMarker } from './ScenarioMarker'
import type { ScenarioEvent } from '@/types/scenario'
import type { TimelineYear } from '@/types/timeline'
import { formatCurrency } from '@/lib/format'

const chartColors = {
  axis: '#aeb6c9',
  grid: 'rgba(86, 91, 100, 0.6)',
  gradientStart: '#4f81ff',
  gradientEnd: 'rgba(59, 130, 246, 0.08)',
  stroke: '#7db0ff',
}

const YEARS = 20
const DEFAULT_AGE = 33

type AxisMode = 'age' | 'year'

type ProjectionPoint = {
  yearIndex: number
  yearLabel: string
  netWorth: number
  totalAssets: number
  totalLiabilities: number
  calendarYear: number
  hasNonAnnualSource?: boolean
  hasOverride?: boolean
}

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean
  payload?: Array<{ payload: ProjectionPoint }>
}) {
  if (!active || !payload || !payload.length) return null
  const data = payload[0].payload
  return (
    <div className="rounded-xl border border-white/10 bg-[#0f1728]/90 px-4 py-3 shadow-2xl backdrop-blur">
      <p className="text-xs uppercase tracking-wide text-slate-300">{data.yearLabel}</p>
      <p className="mt-1 font-semibold text-blue-300">
        Net Worth: {formatCurrency(data.netWorth)}
      </p>
      <p className="text-emerald-300 text-sm">Assets {formatCurrency(data.totalAssets)}</p>
      <p className="text-rose-300 text-sm">
        Liabilities {formatCurrency(data.totalLiabilities)}
      </p>
      {data.hasNonAnnualSource && (
        <p className="mt-1 text-[11px] uppercase tracking-wide text-sky-200">
          Annualized from source frequency
        </p>
      )}
      {data.hasOverride && (
        <p className="text-[11px] uppercase tracking-wide text-blue-300">
          Override applied
        </p>
      )}
    </div>
  )
}

function YearTick({
  x = 0,
  y = 0,
  payload,
  overrideYears,
  onSelectYear,
  selectedYear,
  mode,
}: {
  x?: number
  y?: number
  payload?: { value: number }
  overrideYears: Set<number>
  onSelectYear?: (year: number) => void
  selectedYear?: number
  mode: AxisMode
}) {
  if (!payload) return null
  const isOverride = overrideYears.has(payload.value)
  const isSelected = selectedYear === payload.value
  const labelValue = mode === 'age' ? DEFAULT_AGE + payload.value : payload.value
  const handleClick = () => {
    if (onSelectYear) onSelectYear(payload.value)
  }

  return (
    <g
      transform={`translate(${x},${y})`}
      className="cursor-pointer"
      onClick={handleClick}
      aria-label={`Year ${payload.value}`}
    >
      <text
        dy={12}
        fill={isSelected ? '#a5b4fc' : '#cbd5e1'}
        fontSize={12}
        fontWeight={isSelected ? 700 : 400}
        textAnchor="middle"
      >
        {labelValue}
      </text>
      {isOverride && (
        <path
          d="M0,14 L7,28 L-7,28 Z"
          fill="#38bdf8"
          data-testid={`override-marker-${payload.value}`}
        />
      )}
    </g>
  )
}

export interface NetWorthProjectionProps {
  timelineYears?: TimelineYear[]
  overrideYears?: Set<number>
  selectedYear?: number
  onSelectYear?: (year: number) => void
  scenarioEvents?: ScenarioEvent[]
}

export function NetWorthProjection({
  timelineYears,
  overrideYears,
  selectedYear,
  onSelectYear,
  scenarioEvents,
}: NetWorthProjectionProps) {
  const {
    assets,
    liabilities,
    expenses,
    incomes,
    getMonthlySavings,
  } = useFinancialData()

  const [xAxisMode, setXAxisMode] = useState<AxisMode>('age')
  const [hasSize, setHasSize] = useState(false)
  const [containerWidth, setContainerWidth] = useState(0)
  const [startIndex, setStartIndex] = useState<number | null>(null)
  const [endIndex, setEndIndex] = useState<number | null>(null)
  const [refAreaLeft, setRefAreaLeft] = useState<string>('')
  const [refAreaRight, setRefAreaRight] = useState<string>('')
  const [isSelecting, setIsSelecting] = useState(false)
  const chartContainerRef = useRef<HTMLDivElement>(null)
  const chartWrapperRef = useRef<HTMLDivElement>(null)

  const projection = useMemo(() => {
    if (timelineYears && timelineYears.length > 0) {
      const baseCalendarYear = new Date().getFullYear()
      const timelineProjection = timelineYears.map<ProjectionPoint>((year) => {
        const assets = year.assets ?? []
        const liabilities = year.liabilities ?? []
        const incomes = year.income ?? []
        const expenses = year.expenses ?? []

        const totalAssets = assets.reduce((sum, item) => sum + (item.amount_annual ?? 0), 0)
        const totalLiabilities = liabilities.reduce(
          (sum, item) => sum + (item.amount_annual ?? 0),
          0
        )
        const hasNonAnnualSource = [
          ...assets,
          ...liabilities,
          ...incomes,
          ...expenses,
        ].some((item) => item?.source_frequency && item.source_frequency !== 'annual')

        const calendarYear = year.year >= 1900 ? year.year : baseCalendarYear + (year.year ?? 0)

        return {
          yearIndex: year.year ?? 0,
          yearLabel: `Year ${year.year ?? 0}`,
          netWorth: year.net_worth ?? 0,
          totalAssets,
          totalLiabilities,
          calendarYear,
          hasNonAnnualSource,
          hasOverride: !!year.has_overrides,
        }
      })

      // Recharts needs at least 2 points to render an Area; pad a clone when only one year exists.
      if (timelineProjection.length === 1) {
        const first = timelineProjection[0]
        const clone: ProjectionPoint = {
          ...first,
          yearIndex: first.yearIndex + 1,
          yearLabel: `Year ${first.yearIndex + 1}`,
          calendarYear: (first.calendarYear ?? baseCalendarYear) + 1,
        }
        return [first, clone]
      }

      return timelineProjection
    }

    const totalAssets = assets.reduce((sum, a) => sum + a.currentValue, 0)
    const totalLiabilities = liabilities.reduce((sum, l) => sum + l.currentBalance, 0)
    const monthlySavings = getMonthlySavings()

    // If no data, return empty array so we render placeholder
    const hasAnyData =
      assets.length > 0 || liabilities.length > 0 || expenses.length > 0 || incomes.length > 0

    const currentYear = new Date().getFullYear()
    const data: ProjectionPoint[] = []
    const annualSavings = Math.max(monthlySavings, 0) * 12
    const assetGrowthRate = 0.05 // conservative 5% annual
    const liabilityDecayRate = 0.94 // 6% annual paydown

    if (!hasAnyData) {
      for (let i = 0; i <= YEARS; i++) {
        const year = currentYear + i
        data.push({
          yearIndex: i,
          yearLabel: `Year ${year}`,
          netWorth: 0,
          totalAssets: 0,
          totalLiabilities: 0,
          calendarYear: year,
        })
      }
      return data
    }

    for (let i = 0; i <= YEARS; i++) {
      const year = currentYear + i
      const projectedAssets = Math.round((totalAssets + annualSavings * i) * Math.pow(1 + assetGrowthRate, i))
      const projectedLiabilities = Math.max(
        0,
        Math.round(totalLiabilities * Math.pow(liabilityDecayRate, i))
      )
      const netWorth = projectedAssets - projectedLiabilities

      data.push({
        yearIndex: i,
        yearLabel: `Year ${year}`,
        calendarYear: year,
        netWorth,
        totalAssets: projectedAssets,
        totalLiabilities: projectedLiabilities,
      })
    }

    return data
  }, [assets, expenses, getMonthlySavings, incomes, liabilities, timelineYears])

  useEffect(() => {
    const element = chartContainerRef.current
    if (!element) return

    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      setHasSize(width > 0 && height > 0)
      setContainerWidth(width)
    })

    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  // Filter data based on zoom
  const displayData = useMemo(() => {
    if (startIndex === null || endIndex === null) {
      return projection
    }

    const filtered = projection.filter(
      (point) => point.yearIndex >= (startIndex ?? 0) && point.yearIndex <= (endIndex ?? Number.POSITIVE_INFINITY)
    )

    // Ensure we have at least 2 points for the chart
    return filtered.length > 1 ? filtered : projection.slice(0, 2)
  }, [startIndex, endIndex, projection])

  const ticks = useMemo(() => {
    const totalPoints = displayData.length
    if (totalPoints === 0) return [] as number[]
    const minSpacingPx = 60
    const width = Math.max(containerWidth, 1)
    const maxTicks = Math.max(6, Math.floor(width / minSpacingPx))
    const step = Math.max(1, Math.floor(totalPoints / maxTicks))
    const values: number[] = []
    for (let i = 0; i < totalPoints; i += step) {
      values.push(displayData[i].yearIndex)
    }
    const last = displayData[totalPoints - 1]?.yearIndex ?? 0
    if (values[values.length - 1] !== last) values.push(last)
    const first = displayData[0]?.yearIndex ?? 0
    if (values[0] !== first) values.unshift(first)
    return values
  }, [containerWidth, displayData])

  const overrideYearsSet = useMemo(
    () =>
      overrideYears ??
      new Set(
        projection.filter((point) => point.hasOverride).map((point) => point.yearIndex)
      ),
    [overrideYears, projection]
  )

  const scenarioMarkers = useMemo(() => {
    if (!scenarioEvents || scenarioEvents.length === 0 || displayData.length === 0) return []

    const markersByYear = new Map<number, { events: ScenarioEvent[]; netWorth: number }>()

    const parseEventYear = (occursOn: string) => {
      const year = Number.parseInt(occursOn.slice(0, 4), 10)
      return Number.isFinite(year) ? year : null
    }

    const resolveYearIndex = (eventYear: number) => {
      let closestIndex: number | null = null
      let smallestDiff = Number.POSITIVE_INFINITY

      displayData.forEach((point) => {
        const diff = Math.abs((point.calendarYear ?? point.yearIndex) - eventYear)
        if (diff < smallestDiff) {
          smallestDiff = diff
          closestIndex = point.yearIndex
        }
      })

      return closestIndex
    }

    scenarioEvents.forEach((event) => {
      if (event.is_included === false) return
      const eventYear = parseEventYear(event.occurs_on)
      if (eventYear === null) return

      const yearIndex = resolveYearIndex(eventYear)
      if (yearIndex === null) return

      const point = displayData.find((entry) => entry.yearIndex === yearIndex)
      if (!point) return

      const existing = markersByYear.get(yearIndex) ?? { events: [], netWorth: point.netWorth }
      markersByYear.set(yearIndex, { events: [...existing.events, event], netWorth: point.netWorth })
    })

    return Array.from(markersByYear.entries()).map(([yearIndex, data]) => ({
      yearIndex,
      netWorth: Math.max(data.netWorth, 0),
      events: data.events,
    }))
  }, [displayData, scenarioEvents])

  const toPascalCase = (value: string) =>
    value
      .split(/[-_]/)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join('')

  const getIcon = (iconName?: string) => {
    if (!iconName) return null
    const pascal = toPascalCase(iconName)
    const IconComp = (LucideIcons as unknown as Record<string, React.ComponentType<any>>)[pascal]
    return IconComp ?? null
  }

  const handleMouseDown = (e: any) => {
    if (e?.activeLabel !== undefined) {
      setRefAreaLeft(e.activeLabel)
      setRefAreaRight('')
      setIsSelecting(true)
    }
  }

  const handleMouseMove = (e: any) => {
    if (isSelecting && refAreaLeft && e?.activeLabel !== undefined) {
      setRefAreaRight(e.activeLabel)
    }
  }

  const handleMouseUp = () => {
    if (refAreaLeft && refAreaRight) {
      const left = Math.min(Number(refAreaLeft), Number(refAreaRight))
      const right = Math.max(Number(refAreaLeft), Number(refAreaRight))

      if (right - left > 1) {
        setZoomDomain([left, right])
      }
    }
    setRefAreaLeft('')
    setRefAreaRight('')
    setIsSelecting(false)
  }

  const handleZoomIn = () => {
    const currentStart = zoomDomain?.[0] ?? 0
    const currentEnd = zoomDomain?.[1] ?? projection.length - 1
    const range = currentEnd - currentStart
    const newRange = Math.max(3, Math.floor(range * 0.7))
    const center = Math.floor((currentStart + currentEnd) / 2)
    const newStart = Math.max(0, center - Math.floor(newRange / 2))
    const newEnd = Math.min(projection.length - 1, newStart + newRange)
    setZoomDomain([newStart, newEnd])
  }

  const handleZoomOut = () => {
    const currentStart = zoomDomain?.[0] ?? 0
    const currentEnd = zoomDomain?.[1] ?? projection.length - 1
    const range = currentEnd - currentStart
    const newRange = Math.min(projection.length - 1, Math.floor(range * 1.4))
    const center = Math.floor((currentStart + currentEnd) / 2)
    const newStart = Math.max(0, center - Math.floor(newRange / 2))
    const newEnd = Math.min(projection.length - 1, newStart + newRange)
    if (newEnd - newStart >= projection.length - 2) {
      setZoomDomain(null)
    } else {
      setZoomDomain([newStart, newEnd])
    }
  }

  const handleResetZoom = () => {
    setZoomDomain(null)
    setRefAreaLeft('')
    setRefAreaRight('')
  }

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()

    if (!chartWrapperRef.current || projection.length === 0) return

    const zoomFactor = 0.1
    const direction = e.deltaY < 0 ? -1 : 1 // Negative for zoom in, positive for zoom out

    const currentStart = zoomDomain?.[0] ?? 0
    const currentEnd = zoomDomain?.[1] ?? projection.length - 1
    const currentRange = currentEnd - currentStart

    // Calculate mouse position relative to chart
    const chartRect = chartWrapperRef.current.getBoundingClientRect()
    const mouseX = e.clientX - chartRect.left
    const chartWidth = chartRect.width
    const mousePercentage = mouseX / chartWidth

    // Calculate zoom amount
    const zoomAmount = currentRange * zoomFactor * direction

    // Calculate new domain based on mouse position
    const newStart = Math.max(0, currentStart + zoomAmount * mousePercentage)
    const newEnd = Math.min(projection.length - 1, currentEnd - zoomAmount * (1 - mousePercentage))

    // Ensure minimum zoom range
    if (newEnd - newStart < 3) return

    // Reset zoom if we're back to full range
    if (newStart <= 0 && newEnd >= projection.length - 1) {
      setZoomDomain(null)
    } else {
      setZoomDomain([Math.floor(newStart), Math.ceil(newEnd)])
    }
  }

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col">
      <div className="mb-4 flex flex-shrink-0 items-center justify-between">
        <div>
          <h3 className="mb-1 font-semibold text-lg text-white">
            Net Worth Projection
          </h3>
          <p className="text-gray-400 text-sm">Next 20 Years</p>
        </div>
      </div>

      <div
        ref={chartContainerRef}
        className="relative w-full flex-1 min-h-[300px] min-w-0 overflow-hidden [&_*:focus]:outline-none [&_*:focus-visible]:outline-none"
      >
        {/* Zoom Controls */}
        <div className="absolute top-2 right-2 z-10 flex flex-col gap-1">
          <button
            onClick={handleZoomIn}
            className="flex h-8 w-8 items-center justify-center rounded bg-white/10 text-white backdrop-blur transition hover:bg-white/20"
            title="Zoom In"
          >
            <span className="text-lg font-bold">+</span>
          </button>
          {(startIndex !== null || endIndex !== null) && (
            <button
              onClick={handleResetZoom}
              className="flex h-auto px-2 py-1 items-center justify-center rounded bg-white/10 text-white text-xs backdrop-blur transition hover:bg-white/20"
              title="Reset Zoom"
            >
              Reset Zoom
            </button>
          )}
          <button
            onClick={handleZoomOut}
            className="flex h-8 w-8 items-center justify-center rounded bg-white/10 text-white backdrop-blur transition hover:bg-white/20"
            title="Zoom Out"
          >
            <span className="text-lg font-bold">−</span>
          </button>
        </div>

        {hasSize && displayData.length > 0 ? (
          <div
            ref={chartWrapperRef}
            className="h-full w-full"
            onWheel={handleWheel}
            style={{ touchAction: 'none' }}
          >
            <ResponsiveContainer width="100%" height="100%" minWidth={320} minHeight={200}>
              <ComposedChart
                data={displayData}
                margin={{ top: 20, right: 8, left: 8, bottom: 12 }}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={() => {
                  setRefAreaLeft('')
                  setRefAreaRight('')
                }}
              >
              <defs>
                <linearGradient id="netWorthGradient" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor={chartColors.gradientStart} stopOpacity={0.8} />
                  <stop offset="90%" stopColor={chartColors.gradientEnd} stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid
                stroke={chartColors.grid}
                strokeDasharray="2 12"
                horizontal={false}
                fillOpacity={0}
              />
              <XAxis
                axisLine={false}
                dataKey="yearIndex"
                fontSize={12}
                interval={0}
                ticks={ticks}
                stroke={chartColors.axis}
                tickLine={false}
                tick={
                  <YearTick
                    overrideYears={overrideYearsSet}
                    onSelectYear={onSelectYear}
                    selectedYear={selectedYear}
                    mode={xAxisMode}
                  />
                }
              />
              <YAxis
                axisLine={false}
                domain={[
                  (dataMin: number) => Math.min(0, Math.floor(dataMin * 1.05)),
                  (dataMax: number) => (dataMax > 0 ? Math.ceil(dataMax * 1.1) : 500000),
                ]}
                fontSize={12}
                stroke={chartColors.axis}
                tickFormatter={(value) => {
                  if (value <= 0) return ''
                  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`
                  if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`
                  return `$${value}`
                }}
                tickLine={false}
              />

              <Area
                data={displayData}
                activeDot={{ r: 5, fill: chartColors.stroke, strokeWidth: 0 }}
                dataKey="netWorth"
                dot={false}
                fill="url(#netWorthGradient)"
                stroke={chartColors.stroke}
                strokeWidth={2.5}
                strokeOpacity={0.85}
                type="monotone"
                name="Net Worth"
              />

              <Tooltip content={<CustomTooltip />} cursor={false} />

              {scenarioMarkers.length > 0 && (
                <Scatter
                  data={scenarioMarkers}
                  dataKey="netWorth"
                  shape={({ cx = 0, cy = 0, payload }: any) => (
                    <ScenarioMarker
                      cx={cx}
                      cy={cy}
                      events={payload?.events ?? []}
                      yearIndex={payload?.yearIndex ?? 0}
                      onSelectYear={onSelectYear}
                    />
                  )}
                  isAnimationActive={false}
                />
              )}

              {refAreaLeft && refAreaRight && (
                <ReferenceArea
                  x1={refAreaLeft}
                  x2={refAreaRight}
                  strokeOpacity={0.3}
                  fill="rgba(79, 129, 255, 0.15)"
                  stroke="rgba(79, 129, 255, 0.5)"
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
          </div>
        ) : (
          <div className="flex h-full min-h-[240px] items-center justify-center text-sm text-slate-400">
            Add assets or liabilities to view your net worth projection.
          </div>
        )}
      </div>
      <div className="mt-2 text-center text-xs text-slate-300">
        <button
          type="button"
          className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-slate-200 transition hover:bg-white/10"
          onClick={() => setXAxisMode((prev: any) => (prev === 'age' ? 'year' : 'age'))}
        >
          {xAxisMode === 'age' ? 'Age' : 'Year'}
        </button>
      </div>
      {overrideYearsSet.size > 0 && (
        <div className="sr-only">
          {Array.from(overrideYearsSet).map((year) => (
            <span key={year} data-testid={`override-marker-${year}`}>
              Override applied in year {year}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
