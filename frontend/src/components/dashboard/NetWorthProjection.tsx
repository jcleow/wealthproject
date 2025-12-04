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
} from 'recharts'
import { useQuery } from '@tanstack/react-query'
import { Plus } from 'lucide-react'

import { useFinancialDataContext } from '@/contexts/FinancialDataContext'
import type { ScenarioEvent } from '@/types/scenario'
import type { TimelineYear, TimelineMonth, TimeResolution } from '@/types/timeline'
import { formatCurrency } from '@/lib/format'
import { financialApi } from '@/services/financialApi'
import { QUERY_KEYS } from '@/lib/queryKeys'
import ScenarioMarker from './ScenarioMarker'
import { ZoomControls, type ZoomLevel } from '@/components/timeline/ZoomControls'

const chartColors = {
  axis: '#aeb6c9',
  grid: 'rgba(86, 91, 100, 0.6)',
  gradientStart: '#4f81ff',
  gradientEnd: 'rgba(59, 130, 246, 0.08)',
  stroke: '#7db0ff',
}

const DEFAULT_STARTING_AGE = 30
const DEFAULT_TERMINAL_AGE = 65
const BASE_CALENDAR_YEAR = new Date().getFullYear()
const AREA_ANIMATION_MS = 700
const MARKER_BUFFER_MS = 400

type AxisMode = 'age' | 'year_number' | 'actual_year'

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

interface CustomTooltipProps {
  active?: boolean
  payload?: ReadonlyArray<{ payload: ProjectionPoint }>
  startingAge?: number
  resolution?: 'yearly' | 'monthly'
}

function CustomTooltip({
  active,
  payload,
  startingAge = DEFAULT_STARTING_AGE,
  resolution = 'yearly',
}: CustomTooltipProps) {
  if (!active || !payload || !payload.length) return null
  const data = payload[0].payload

  // Calculate age - yearIndex is month index in monthly mode, year index in yearly mode
  const yearsPassed = resolution === 'monthly' ? Math.floor(data.yearIndex / 12) : data.yearIndex
  const age = startingAge + yearsPassed

  return (
    <div className="rounded-lg border border-white/10 bg-[#0f1728]/95 px-3 py-2 shadow-xl backdrop-blur-xl min-w-[180px]">
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
          <span className="font-mono text-slate-200">{formatCurrency(data.totalAssets)}</span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="flex items-center gap-1.5 text-rose-300">
            <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
            Liabilities
          </span>
          <span className="font-mono text-slate-200">{formatCurrency(data.totalLiabilities)}</span>
        </div>
      </div>
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
  startingAge,
  resolution,
  zoomLevel,
}: {
  x?: number
  y?: number
  payload?: { value: number }
  overrideYears: Set<number>
  onSelectYear?: (year: number) => void
  selectedYear?: number
  mode: AxisMode
  startingAge?: number
  resolution?: TimeResolution
  zoomLevel?: ZoomLevel
}) {
  if (!payload) return null
  const isOverride = overrideYears.has(payload.value)
  const isSelected = selectedYear === payload.value
  const age = startingAge ?? DEFAULT_STARTING_AGE

  let labelValue: string | number

  if (resolution === 'monthly') {
    const monthIndex = payload.value
    const year = Math.floor(monthIndex / 12)
    const month = monthIndex % 12

    if (zoomLevel === 'monthly') {
      // Show month abbreviation with year suffix (e.g., "Sep'25", "Oct'25")
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
      const calendarYear = BASE_CALENDAR_YEAR + year
      const yearSuffix = `'${String(calendarYear).slice(-2)}`
      labelValue = `${monthNames[month]}${yearSuffix}`
    } else {
      // Yearly zoom - show year
      labelValue = mode === 'age'
        ? age + year
        : mode === 'actual_year'
          ? `'${String(BASE_CALENDAR_YEAR + year).slice(-2)}`
          : year
    }
  } else {
    // Yearly resolution - use existing logic
    labelValue = mode === 'age'
      ? age + payload.value
      : mode === 'actual_year'
        ? `'${String(BASE_CALENDAR_YEAR + payload.value).slice(-2)}`
        : payload.value
  }

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
  timelineMonths?: TimelineMonth[]
  resolution?: TimeResolution
  zoomLevel?: ZoomLevel
  onZoomLevelChange?: (level: ZoomLevel) => void
  overrideYears?: Set<number>
  selectedYear?: number
  onSelectYear?: (year: number) => void
  scenarioEvents?: ScenarioEvent[]
  onScenarioSelect?: (event: ScenarioEvent) => void
  onAddScenario?: () => void
  chartTitle?: string
  chartSubtitle?: string
}

export function NetWorthProjection({
  timelineYears,
  timelineMonths,
  resolution = 'yearly',
  zoomLevel: externalZoomLevel,
  onZoomLevelChange,
  overrideYears,
  selectedYear,
  onSelectYear,
  scenarioEvents,
  onScenarioSelect,
  onAddScenario,
  chartTitle,
  chartSubtitle,
}: NetWorthProjectionProps) {
  const {
    assets,
    liabilities,
    expenses,
    incomes,
    getMonthlySavings,
  } = useFinancialDataContext()

  // Fetch user settings for year display format
  const { data: userSettings } = useQuery({
    queryKey: QUERY_KEYS.settings.user,
    queryFn: () => financialApi.getUserSettings(),
    staleTime: 5 * 60 * 1000,
  })

  const [xAxisMode, setXAxisMode] = useState<AxisMode>('year_number')
  const [internalZoomLevel, setInternalZoomLevel] = useState<ZoomLevel>('yearly')
  const zoomLevel = externalZoomLevel ?? internalZoomLevel

  // Windowing state for zoom
  const [startIndex, setStartIndex] = useState<number | null>(null)
  const [endIndex, setEndIndex] = useState<number | null>(null)

  const setZoomLevel = (value: ZoomLevel | ((prev: ZoomLevel) => ZoomLevel)) => {
    if (onZoomLevelChange) {
      const newLevel = typeof value === 'function' ? value(zoomLevel) : value
      onZoomLevelChange(newLevel)
    } else {
      setInternalZoomLevel(value)
    }
  }

  const [hasSize, setHasSize] = useState(false)
  const [containerWidth, setContainerWidth] = useState(0)
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)
  const [markersReady, setMarkersReady] = useState(false)
  const chartContainerRef = useRef<HTMLDivElement>(null)
  const chartWrapperRef = useRef<HTMLDivElement>(null)

  // Sync xAxisMode with user settings when loaded
  useEffect(() => {
    if (userSettings?.yearDisplayFormat) {
      setXAxisMode(userSettings.yearDisplayFormat)
    }
  }, [userSettings?.yearDisplayFormat])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const listener = () => setPrefersReducedMotion(media.matches)
    listener()
    media.addEventListener('change', listener)
    return () => media.removeEventListener('change', listener)
  }, [])

  const projection = useMemo<ProjectionPoint[]>(() => {
    // Handle monthly data
    if (timelineMonths && timelineMonths.length > 0) {
      const baseCalendarYear = 2025
      const monthlyProjection = timelineMonths.map<ProjectionPoint>((month) => {
        const assets = month.assets ?? []
        const liabilities = month.liabilities ?? []

        const totalAssets = assets.reduce((sum, item) => sum + (item.amountMonthly ?? item.amountAnnual ?? 0), 0)
        const totalLiabilities = liabilities.reduce(
          (sum, item) => sum + (item.amountMonthly ?? item.amountAnnual ?? 0),
          0
        )

        const calendarYear = baseCalendarYear + month.year

        return {
          yearIndex: month.monthIndex, // Use global month index for x-axis
          yearLabel: `${month.year}-${String(month.month).padStart(2, '0')}`,
          netWorth: month.netWorth ?? 0,
          totalAssets,
          totalLiabilities,
          calendarYear,
          hasNonAnnualSource: false,
          hasOverride: !!month.hasOverrides,
        }
      })

      return monthlyProjection
    }

    // Handle yearly data
    if (timelineYears && timelineYears.length > 0) {
      const baseCalendarYear = 2025
      const timelineProjection = timelineYears.map<ProjectionPoint>((year) => {
        const assets = year.assets ?? []
        const liabilities = year.liabilities ?? []
        const incomes = year.income ?? []
        const expenses = year.expenses ?? []

        const totalAssets = assets.reduce((sum, item) => sum + (item.amountAnnual ?? 0), 0)
        const totalLiabilities = liabilities.reduce(
          (sum, item) => sum + (item.amountAnnual ?? 0),
          0
        )
        const hasNonAnnualSource = [
          ...assets,
          ...liabilities,
          ...incomes,
          ...expenses,
        ].some((item) => item.sourceFrequency && item.sourceFrequency !== 'annual')

        const calendarYear = year.year >= 1900 ? year.year : baseCalendarYear + (year.year ?? 0)

        return {
          yearIndex: year.year ?? 0,
          yearLabel: `Year ${year.year ?? 0}`,
          netWorth: year.netWorth ?? 0,
          totalAssets,
          totalLiabilities,
          calendarYear,
          hasNonAnnualSource,
          hasOverride: !!year.hasOverrides,
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

    // Calculate planning years from user settings
    const startingAge = userSettings?.startingAge ?? DEFAULT_STARTING_AGE
    const terminalAge = userSettings?.terminalAge ?? DEFAULT_TERMINAL_AGE
    const planningYears = Math.max(1, terminalAge - startingAge)

    // If no data, return empty array so we render placeholder
    const hasAnyData =
      assets.length > 0 || liabilities.length > 0 || expenses.length > 0 || incomes.length > 0

    const currentYear = BASE_CALENDAR_YEAR
    const data: ProjectionPoint[] = []
    const annualSavings = Math.max(monthlySavings, 0) * 12
    const assetGrowthRate = 0.05 // conservative 5% annual
    const liabilityDecayRate = 0.94 // 6% annual paydown

    if (!hasAnyData) {
      for (let i = 0; i <= planningYears; i++) {
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

    for (let i = 0; i <= planningYears; i++) {
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
  }, [
    assets,
    expenses,
    getMonthlySavings,
    incomes,
    liabilities,
    timelineYears,
    timelineMonths,
    userSettings?.startingAge,
    userSettings?.terminalAge,
  ])

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

  // Window data based on zoom level
  const displayData = useMemo(() => {
    if (resolution !== 'monthly' || startIndex === null || endIndex === null) {
      return projection
    }

    // Return windowed subset of data
    return projection.slice(startIndex, endIndex + 1)
  }, [projection, resolution, startIndex, endIndex])

  // Mouse wheel zoom handler with fixed zoom levels
  useEffect(() => {
    const chartElement = chartWrapperRef.current
    if (!chartElement) return
    if (resolution !== 'monthly') return // Only enable wheel zoom in monthly mode
    if (projection.length === 0) return

    const handleWheel = (e: WheelEvent) => {
      // Only handle wheel events when hovering over the chart
      if (!chartElement.contains(e.target as Node)) return

      e.preventDefault()

      const direction = e.deltaY < 0 ? -1 : 1 // -1 = zoom in, 1 = zoom out

      // Calculate mouse position as data index
      const rect = chartElement.getBoundingClientRect()
      const mouseX = e.clientX - rect.left
      const mousePercentage = mouseX / rect.width

      // Get current center point
      const currentStart = startIndex ?? 0
      const currentEnd = endIndex ?? projection.length - 1
      const currentRange = currentEnd - currentStart
      const centerIndex = Math.floor(currentStart + currentRange * mousePercentage)

      // Determine current zoom level based on range
      // ±5 years = 120 months total, ±24 months = 48 months total
      let currentLevel: 'all' | '5years' | '2years'
      if (startIndex === null || endIndex === null) {
        currentLevel = 'all'
      } else if (currentRange > 120) { // More than 120 months = showing all
        currentLevel = 'all'
      } else if (currentRange > 48) { // Between 48 and 120 months = 5 years view
        currentLevel = '5years'
      } else { // 48 months or less = 2 years view
        currentLevel = '2years'
      }

      if (direction < 0) {
        // Zoom in
        if (currentLevel === 'all') {
          // Zoom to ±5 years (±60 months = 120 months total)
          const newStart = Math.max(0, centerIndex - 60)
          const newEnd = Math.min(projection.length - 1, centerIndex + 60)
          setStartIndex(newStart)
          setEndIndex(newEnd)
          setZoomLevel('monthly')
        } else if (currentLevel === '5years') {
          // Zoom to ±24 months (48 months total)
          const newStart = Math.max(0, centerIndex - 24)
          const newEnd = Math.min(projection.length - 1, centerIndex + 24)
          setStartIndex(newStart)
          setEndIndex(newEnd)
          setZoomLevel('monthly')
        }
        // Already at max zoom (2 years), do nothing
      } else {
        // Zoom out
        if (currentLevel === '2years') {
          // Zoom to ±5 years
          const newStart = Math.max(0, centerIndex - 60)
          const newEnd = Math.min(projection.length - 1, centerIndex + 60)
          setStartIndex(newStart)
          setEndIndex(newEnd)
          setZoomLevel('monthly')
        } else if (currentLevel === '5years') {
          // Zoom to all
          setStartIndex(null)
          setEndIndex(null)
          setZoomLevel('yearly')
        }
        // Already at min zoom (all), do nothing
      }
    }

    chartElement.addEventListener('wheel', handleWheel, { passive: false })
    return () => chartElement.removeEventListener('wheel', handleWheel)
  }, [resolution, projection.length, startIndex, endIndex])

  const areaAnimationEnabled = !prefersReducedMotion && displayData.length > 0

  // Reset marker visibility when data changes; show once line animation finishes (with fallback timer)
  useEffect(() => {
    if (!areaAnimationEnabled) {
      setMarkersReady(true)
      return
    }
    setMarkersReady(false)
    const timer = window.setTimeout(
      () => setMarkersReady(true),
      AREA_ANIMATION_MS + MARKER_BUFFER_MS
    )
    return () => window.clearTimeout(timer)
  }, [displayData.length, areaAnimationEnabled])

  // Absolute fallback to ensure markers are shown even if animation callbacks fail
  useEffect(() => {
    if (!areaAnimationEnabled) return
    const safetyTimer = window.setTimeout(
      () => setMarkersReady(true),
      AREA_ANIMATION_MS + MARKER_BUFFER_MS + 300
    )
    return () => window.clearTimeout(safetyTimer)
  }, [displayData.length, areaAnimationEnabled])

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

    const markersByIndex = new Map<number, { events: ScenarioEvent[]; netWorth: number }>()

    // Parse event date (YYYY-MM-DD format) and extract year and month
    const parseEventDate = (occursOn: string): { year: number; month: number } | null => {
      const parts = occursOn.split('-')
      if (parts.length < 2) return null
      const year = Number.parseInt(parts[0], 10)
      const month = Number.parseInt(parts[1], 10)
      if (!Number.isFinite(year) || !Number.isFinite(month)) return null
      return { year, month }
    }

    scenarioEvents.forEach((event) => {
      if (event.isIncluded === false) return
      const eventDate = parseEventDate(event.occursOn)
      if (eventDate === null) return

      let displayPoint: ProjectionPoint | undefined

      if (resolution === 'monthly') {
        // Monthly mode: match by calendar year and month directly in displayData
        // Each displayPoint has calendarYear and we can calculate the month from yearIndex
        displayPoint = displayData.find((point) => {
          const pointMonth = (point.yearIndex % 12) + 1 // Convert 0-based month index to 1-based month
          return point.calendarYear === eventDate.year && pointMonth === eventDate.month
        })

        // If not found in current window, skip this event
        if (!displayPoint) return
      } else {
        // Yearly mode: match by calendar year
        displayPoint = displayData.find((entry) => entry.calendarYear === eventDate.year)

        // If not found in current window, skip this event
        if (!displayPoint) return
      }

      const netWorth = displayPoint.netWorth

      const existing = markersByIndex.get(displayPoint.yearIndex) ?? { events: [], netWorth }
      markersByIndex.set(displayPoint.yearIndex, { events: [...existing.events, event], netWorth })
    })

    return Array.from(markersByIndex.entries()).map(([yearIndex, data]) => ({
      yearIndex,
      netWorth: Math.max(data.netWorth, 0),
      events: data.events,
    }))
  }, [scenarioEvents, displayData, projection, resolution, timelineMonths, zoomLevel])

  const planningYears = Math.max(1, (userSettings?.terminalAge ?? DEFAULT_TERMINAL_AGE) - (userSettings?.startingAge ?? DEFAULT_STARTING_AGE))

  const defaultTitle = 'Net Worth Projection'
  const defaultSubtitle = `Age ${userSettings?.startingAge ?? DEFAULT_STARTING_AGE} to ${userSettings?.terminalAge ?? DEFAULT_TERMINAL_AGE} (${planningYears} years)`

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col p-5">
      <div className="mb-4 flex flex-shrink-0 items-center justify-between border-b border-white/[0.04] pb-4">
        <div>
          <h3 className="text-lg font-medium text-slate-200">
            {chartTitle ?? defaultTitle}
          </h3>
          <p className="text-sm text-slate-500">
            {chartSubtitle ?? defaultSubtitle}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {resolution === 'monthly' && (
            <ZoomControls
              zoomLevel={zoomLevel}
              onZoomChange={setZoomLevel}
              canZoomIn={zoomLevel !== 'monthly'}
              canZoomOut={zoomLevel !== 'yearly'}
            />
          )}
          {onAddScenario && (
            <button
              onClick={onAddScenario}
              className="flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.02] px-3 py-1.5 text-xs font-medium text-slate-400 transition-all hover:border-white/[0.12] hover:bg-white/[0.04] hover:text-slate-200"
              type="button"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Scenario
            </button>
          )}
        </div>
      </div>

      <div
        ref={chartContainerRef}
        className="relative w-full flex-1 min-h-[250px] min-w-0 overflow-hidden [&_*:focus]:outline-none [&_*:focus-visible]:outline-none"
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
                      startingAge={userSettings?.startingAge}
                      resolution={resolution}
                      zoomLevel={zoomLevel}
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
                  isAnimationActive={areaAnimationEnabled}
                  animationDuration={AREA_ANIMATION_MS}
                  animationEasing="ease-out"
                  animationBegin={0}
                />

                <Tooltip
                  content={<CustomTooltip startingAge={userSettings?.startingAge} resolution={resolution} />}
                  cursor={{ stroke: 'rgba(255,255,255,0.2)', strokeWidth: 1 }}
                />

                {scenarioMarkers.length > 0 && (
                  <Scatter
                    data={scenarioMarkers}
                    dataKey="netWorth"
                    xAxisId={0}
                    yAxisId={0}
                    fill="#8884d8"
                    shape={({ cx = 0, cy = 0, payload }: any) => (
                      <ScenarioMarker
                        cx={cx}
                        cy={cy}
                        events={payload?.events ?? []}
                        yearIndex={payload?.yearIndex ?? 0}
                        onSelectYear={onSelectYear}
                        onScenarioSelect={onScenarioSelect}
                        visible={markersReady}
                        animate={!prefersReducedMotion}
                      />
                    )}
                    isAnimationActive={false}
                    style={{ pointerEvents: markersReady ? 'auto' : 'none' }}
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
          onClick={() => setXAxisMode((prev) => {
            if (prev === 'age') return userSettings?.yearDisplayFormat ?? 'year_number'
            return 'age'
          })}
        >
          {xAxisMode === 'age' ? 'Age' : xAxisMode === 'actual_year' ? 'Year' : 'Year #'}
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
