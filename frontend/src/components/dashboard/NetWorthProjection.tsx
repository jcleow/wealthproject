import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'

import type { ScenarioEvent } from '@/types/scenario'
import type { TimelineYear, TimelineMonth, TimeResolution } from '@/types/timeline'
import { settingsApi } from '@/api/financial'
import { QUERY_KEYS } from '@/lib/queryKeys'
import type { ZoomLevel } from '@/components/timeline/ZoomControls'

// Sub-components
import { ChartHeader } from './projections/ChartHeader'
import { ChartZoomControls } from './projections/ChartZoomControls'
import { ProjectionChart } from './projections/ProjectionChart'
import { AxisModeToggle } from './projections/AxisModeToggle'

// Hooks
import { useProjectionData, useScenarioMarkers } from './projections/useProjectionData'
import { useChartZoom } from './projections/useChartZoom'
import { useContainerSize } from './projections/useContainerSize'
import { useChartOverlayData } from './projections/useChartOverlayData'

// Types and constants
import {
  DEFAULT_STARTING_AGE,
  DEFAULT_TERMINAL_AGE,
  BASE_CALENDAR_YEAR,
  AREA_ANIMATION_MS,
  MARKER_BUFFER_MS,
  type AxisMode,
} from './projections/types'
import type { ChartType, MetricId } from './projections/chartOverlays'

// Feature flag for chart overlay controls (disabled until UI is refined)
const ENABLE_CHART_OVERLAYS = false

export interface NetWorthProjectionProps {
  timelineYears?: TimelineYear[]
  timelineMonths?: TimelineMonth[]
  resolution?: TimeResolution
  zoomLevel?: ZoomLevel
  onZoomLevelChange?: (level: ZoomLevel) => void
  overrideYears?: Set<number>
  selectedYear?: number
  onSelectYear?: (year: number) => void
  onSelectMonth?: (month: number) => void
  scenarioEvents?: ScenarioEvent[]
  onScenarioSelect?: (event: ScenarioEvent) => void
  onAddScenario?: () => void
  chartTitle?: string
  chartSubtitle?: string
}

export function NetWorthProjection({
  timelineYears,
  timelineMonths,
  resolution,
  zoomLevel: externalZoomLevel,
  onZoomLevelChange,
  overrideYears,
  selectedYear,
  onSelectYear,
  onSelectMonth,
  scenarioEvents,
  onScenarioSelect,
  onAddScenario,
  chartTitle,
  chartSubtitle,
}: NetWorthProjectionProps) {
  // Fetch user settings
  const { data: userSettings } = useQuery({
    queryKey: QUERY_KEYS.settings.user,
    queryFn: () => settingsApi.getUserSettings(),
    staleTime: 5 * 60 * 1000,
  })

  // X-axis display mode (age vs year)
  const [xAxisMode, setXAxisMode] = useState<AxisMode>('age')
  const [xAxisModeInitialized, setXAxisModeInitialized] = useState(false)

  // Scroll mode for zoom behavior
  const [scrollMode, setScrollMode] = useState<'page' | 'zoom'>('page')

  // Chart overlay controls (feature-flagged)
  const [chartType, setChartType] = useState<ChartType>('area')
  const [selectedMetrics, setSelectedMetrics] = useState<MetricId[]>(['netWorth'])

  // Animation preferences
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)
  const [markersReady, setMarkersReady] = useState(false)
  const markersReadyRef = useRef(false)

  // Chart wrapper ref for zoom/pan interactions
  const chartWrapperRef = useRef<HTMLDivElement>(null)

  // Container size observation
  const { hasSize, containerWidth, containerRef } = useContainerSize()

  // Projection data transformation
  const { projection, dataResolution } = useProjectionData({
    timelineYears,
    timelineMonths,
  })

  // Effective resolution based on available data and user preference
  const effectiveResolution: TimeResolution = resolution ?? dataResolution

  // Zoom and pan state management
  const {
    zoomLevel,
    setZoomLevel,
    actualStartIndex,
    actualEndIndex,
    canZoomIn,
    canZoomOut,
    handleZoomIn,
    handleZoomOut,
  } = useChartZoom({
    externalZoomLevel,
    onZoomLevelChange,
    effectiveResolution,
    projectionLength: projection.length,
    chartWrapperRef,
    scrollMode,
  })

  // Sync xAxisMode with user settings ONCE when settings first load
  useEffect(() => {
    if (userSettings?.yearDisplayFormat && !xAxisModeInitialized) {
      setXAxisMode(userSettings.yearDisplayFormat)
      setXAxisModeInitialized(true)
    }
  }, [userSettings?.yearDisplayFormat, xAxisModeInitialized])

  // Detect reduced motion preference
  useEffect(() => {
    if (typeof window === 'undefined') return
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const listener = () => setPrefersReducedMotion(media.matches)
    listener()
    media.addEventListener('change', listener)
    return () => media.removeEventListener('change', listener)
  }, [])

  // Window data based on zoom level
  const displayData = useMemo(() => {
    if (effectiveResolution !== 'monthly' || actualStartIndex === null || actualEndIndex === null) {
      return projection
    }
    return projection.slice(actualStartIndex, actualEndIndex + 1)
  }, [projection, effectiveResolution, actualStartIndex, actualEndIndex])

  // Enhance display data with overlay metrics
  const enhancedDisplayData = useChartOverlayData(displayData, selectedMetrics)

  // Calculate visible range in months
  const visibleRangeMonths = useMemo(() => {
    if (effectiveResolution !== 'monthly' || actualStartIndex === null || actualEndIndex === null) {
      return projection.length
    }
    return actualEndIndex - actualStartIndex + 1
  }, [effectiveResolution, actualStartIndex, actualEndIndex, projection.length])

  // Prevent page scroll when mouse is over chart container
  useEffect(() => {
    const chartContainer = containerRef.current
    if (!chartContainer) return

    const preventScroll = (e: WheelEvent) => {
      e.preventDefault()
      e.stopPropagation()
    }

    chartContainer.addEventListener('wheel', preventScroll, { passive: false })
    return () => chartContainer.removeEventListener('wheel', preventScroll)
  }, [containerRef])

  // Animation state for markers
  const areaAnimationEnabled = !prefersReducedMotion && displayData.length > 0

  useEffect(() => {
    if (!areaAnimationEnabled) {
      if (!markersReadyRef.current) {
        markersReadyRef.current = true
        setMarkersReady(true)
      }
      return
    }

    markersReadyRef.current = false
    setMarkersReady(false)

    const timer = window.setTimeout(() => {
      markersReadyRef.current = true
      setMarkersReady(true)
    }, AREA_ANIMATION_MS + MARKER_BUFFER_MS + 300)

    return () => window.clearTimeout(timer)
  }, [areaAnimationEnabled])

  // Calculate base calendar year for tick labels
  const baseCalendarYear = useMemo(() => {
    if (displayData.length === 0) return BASE_CALENDAR_YEAR

    const firstPoint = displayData[0]
    if (dataResolution === 'monthly') {
      const yearOffset = Math.floor(firstPoint.yearIndex / 12)
      return firstPoint.calendarYear - yearOffset
    } else {
      return firstPoint.calendarYear - firstPoint.yearIndex
    }
  }, [displayData, dataResolution])

  // Calculate X-axis ticks
  const ticks = useMemo(() => {
    const totalPoints = displayData.length
    if (totalPoints === 0) return [] as number[]

    const minSpacingPx = 60
    const width = Math.max(containerWidth, 1)
    const maxTicks = Math.max(6, Math.floor(width / minSpacingPx))

    const showingYears = dataResolution === 'monthly' && visibleRangeMonths >= 24

    if (showingYears) {
      // Collect all unique year ticks first
      const seenYears = new Set<number>()
      const allYearTicks: number[] = []

      for (let i = 0; i < totalPoints; i++) {
        const point = displayData[i]
        const year = Math.floor(point.yearIndex / 12)

        if (!seenYears.has(year)) {
          seenYears.add(year)
          allYearTicks.push(point.yearIndex)
        }
      }

      // If too many year ticks, sample them to avoid overlap
      if (allYearTicks.length <= maxTicks) {
        return allYearTicks
      }

      const step = Math.ceil(allYearTicks.length / maxTicks)
      const values: number[] = []
      for (let i = 0; i < allYearTicks.length; i += step) {
        values.push(allYearTicks[i])
      }
      // Always include the last tick
      const lastTick = allYearTicks[allYearTicks.length - 1]
      if (values[values.length - 1] !== lastTick) {
        values.push(lastTick)
      }
      return values
    }

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
  }, [displayData, dataResolution, visibleRangeMonths, containerWidth])

  // Override years set
  const overrideYearsSet = useMemo(
    () =>
      overrideYears ??
      new Set(
        projection.filter((point) => point.hasOverride).map((point) => point.yearIndex)
      ),
    [overrideYears, projection]
  )

  // Scenario markers
  const scenarioMarkers = useScenarioMarkers(scenarioEvents, displayData, dataResolution)

  // Age range for subtitle
  const ageRange = useMemo(() => {
    const startingAge = userSettings?.startingAge ?? DEFAULT_STARTING_AGE
    const terminalAge = userSettings?.terminalAge ?? DEFAULT_TERMINAL_AGE
    const startAge = startingAge
    const endAge = Math.max(startAge, terminalAge)
    const years = Math.max(1, endAge - startAge)
    return { startAge, endAge, years }
  }, [userSettings?.startingAge, userSettings?.terminalAge])

  const defaultTitle = 'Net Worth Projection'
  const defaultSubtitle = `Age ${ageRange.startAge} to ${ageRange.endAge} (${ageRange.years} years)`

  const handleScrollModeToggle = useCallback(() => {
    setScrollMode((prev) => (prev === 'page' ? 'zoom' : 'page'))
  }, [])

  const handleAxisModeToggle = useCallback(() => {
    setXAxisMode((prev) => (prev === 'age' ? 'actual_year' : 'age'))
  }, [])

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col p-5">
      <ChartHeader
        title={chartTitle ?? defaultTitle}
        subtitle={chartSubtitle ?? defaultSubtitle}
        onAddScenario={onAddScenario}
        enableChartOverlays={ENABLE_CHART_OVERLAYS}
        chartType={chartType}
        onChartTypeChange={setChartType}
        selectedMetrics={selectedMetrics}
        onMetricsChange={setSelectedMetrics}
      />

      <div
        ref={containerRef}
        className="relative min-h-[250px] min-w-0 w-full flex-1 overflow-hidden [&_*:focus]:outline-none [&_*:focus-visible]:outline-none"
      >
        <ChartZoomControls
          scrollMode={scrollMode}
          onScrollModeToggle={handleScrollModeToggle}
          zoomLevel={zoomLevel}
          onZoomLevelChange={setZoomLevel}
          canZoomIn={canZoomIn}
          canZoomOut={canZoomOut}
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
        />

        {hasSize && displayData.length > 0 ? (
          <div
            ref={chartWrapperRef}
            className="h-full w-full"
            style={{ touchAction: 'none' }}
          >
            <ProjectionChart
              displayData={displayData}
              enhancedDisplayData={enhancedDisplayData}
              enableChartOverlays={ENABLE_CHART_OVERLAYS}
              chartType={chartType}
              selectedMetrics={selectedMetrics}
              areaAnimationEnabled={areaAnimationEnabled}
              ticks={ticks}
              overrideYearsSet={overrideYearsSet}
              onSelectYear={onSelectYear}
              onSelectMonth={onSelectMonth}
              selectedYear={selectedYear}
              xAxisMode={xAxisMode}
              startingAge={userSettings?.startingAge}
              dataResolution={dataResolution}
              visibleRangeMonths={visibleRangeMonths}
              baseCalendarYear={baseCalendarYear}
              scenarioMarkers={scenarioMarkers}
              onScenarioSelect={onScenarioSelect}
              markersReady={markersReady}
              prefersReducedMotion={prefersReducedMotion}
            />
          </div>
        ) : (
          <div className="flex h-full min-h-[240px] items-center justify-center text-sm text-slate-400">
            Add assets or liabilities to view your net worth projection.
          </div>
        )}
      </div>

      <AxisModeToggle mode={xAxisMode} onToggle={handleAxisModeToggle} />

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
