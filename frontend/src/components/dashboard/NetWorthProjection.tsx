import { useEffect, useRef, useState } from 'react'
import {
  Area,
  ComposedChart,
  CartesianGrid,
  ResponsiveContainer,
  Scatter,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { useFinancialDataContext } from '@/contexts/FinancialDataContext'
import type { ScenarioEvent } from '@/types/scenario'
import type { TimelineYear } from '@/types/timeline'
import { formatCurrency } from '@/lib/format'
import ScenarioMarker from './ScenarioMarker'

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
  onScenarioSelect?: (event: ScenarioEvent) => void
}

export function NetWorthProjection({
  timelineYears,
  overrideYears,
  selectedYear,
  onSelectYear,
  scenarioEvents,
  onScenarioSelect,
}: NetWorthProjectionProps) {
  const {
    assets,
    liabilities,
    expenses,
    incomes,
    getMonthlySavings,
  } = useFinancialDataContext()

  const [xAxisMode, setXAxisMode] = useState<AxisMode>('age')
  const [hasSize, setHasSize] = useState(false)
  const [containerWidth, setContainerWidth] = useState(0)
  const chartContainerRef = useRef<HTMLDivElement>(null)
  const chartWrapperRef = useRef<HTMLDivElement>(null)

  const projection = (() => {
    if (timelineYears && timelineYears.length > 0) {
      const baseCalendarYear = 2025
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

    const currentYear = 2025
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
  })()

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
  const displayData = projection

  const ticks = (() => {
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
  })()

  const overrideYearsSet =
    overrideYears ??
    new Set(
      projection.filter((point) => point.hasOverride).map((point) => point.yearIndex)
    )

  const scenarioMarkers = (() => {
    if (!scenarioEvents || scenarioEvents.length === 0 || displayData.length === 0) return []

    const currentYear = new Date().getFullYear()
    const basePoint = displayData[0]
    const baseYear = basePoint?.calendarYear ?? currentYear
    const baseIndex = basePoint?.yearIndex ?? 0
    const minIndex = projection[0]?.yearIndex ?? 0
    const maxIndex = projection[projection.length - 1]?.yearIndex ?? minIndex

    const markersByYear = new Map<number, { events: ScenarioEvent[]; netWorth: number }>()

    const parseEventYear = (occursOn: string) => {
      const year = Number.parseInt(occursOn.slice(0, 4), 10)
      return Number.isFinite(year) ? year : null
    }

    scenarioEvents.forEach((event) => {
      if (event.is_included === false) return
      const eventYear = parseEventYear(event.occurs_on)
      if (eventYear === null) return

      // Calculate the year index relative to the base display point
      const yearIndex = baseIndex + (eventYear - baseYear)
      const clampedIndex = Math.max(minIndex, Math.min(maxIndex, yearIndex))

      // Match by calendarYear if present; otherwise by yearIndex
      const displayPoint =
        displayData.find((entry) => entry.calendarYear === eventYear) ??
        displayData.find((entry) => entry.yearIndex === clampedIndex) ??
        displayData.find((entry) => entry.yearIndex === yearIndex)

      if (!displayPoint) return

      const netWorth = displayPoint.netWorth

      const existing = markersByYear.get(displayPoint.yearIndex) ?? { events: [], netWorth }
      markersByYear.set(displayPoint.yearIndex, { events: [...existing.events, event], netWorth })
    })

    return Array.from(markersByYear.entries()).map(([yearIndex, data]) => ({
      yearIndex,
      netWorth: Math.max(data.netWorth, 0),
      events: data.events,
    }))
  })()

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
        {hasSize && displayData.length > 0 ? (
          <div
            ref={chartWrapperRef}
            className="h-full w-full"
            style={{ touchAction: 'none' }}
          >
            <ResponsiveContainer width="100%" height="100%" minWidth={320} minHeight={200}>
              <ComposedChart
                data={displayData}
                margin={{ top: 20, right: 8, left: 8, bottom: 12 }}
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
                type="number"
                axisLine={false}
                dataKey="yearIndex"
                fontSize={12}
                interval={0}
                ticks={ticks}
                allowDecimals={false}
                allowDataOverflow
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
                  xAxisId={0}
                  yAxisId={0}
                  shape={({ cx = 0, cy = 0, payload }: any) => (
                    <ScenarioMarker
                      cx={cx}
                      cy={cy}
                      events={payload?.events ?? []}
                      yearIndex={payload?.yearIndex ?? 0}
                      onSelectYear={onSelectYear}
                      onScenarioSelect={onScenarioSelect}
                    />
                  )}
                  isAnimationActive={false}
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
