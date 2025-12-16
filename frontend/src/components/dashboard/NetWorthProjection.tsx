import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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
import { Plus, Mouse, Hand } from 'lucide-react'

import { useFinancialDataContext } from '@/contexts/FinancialDataContext'
import type { ScenarioEvent } from '@/types/scenario'
import type { TimelineYear, TimelineMonth, TimeResolution } from '@/types/timeline'
import { settingsApi } from '@/api/financial'
import { QUERY_KEYS } from '@/lib/queryKeys'
import ScenarioMarker from './ScenarioMarker'
import { ZoomControls, type ZoomLevel } from '@/components/timeline/ZoomControls'
import { CustomTooltip } from './projections/CustomTooltip'
import { YearTick } from './projections/YearTick'
import {
  chartColors,
  DEFAULT_STARTING_AGE,
  DEFAULT_TERMINAL_AGE,
  BASE_CALENDAR_YEAR,
  AREA_ANIMATION_MS,
  MARKER_BUFFER_MS,
  type AxisMode,
  type ProjectionPoint,
} from './projections/types'

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
  resolution,
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
    queryFn: () => settingsApi.getUserSettings(),
    staleTime: 5 * 60 * 1000,
  })

  const [xAxisMode, setXAxisMode] = useState<AxisMode>('age')
  const [xAxisModeInitialized, setXAxisModeInitialized] = useState(false)
  const [internalZoomLevel, setInternalZoomLevel] = useState<ZoomLevel>('yearly')
  const zoomLevel = externalZoomLevel ?? internalZoomLevel

  // Scroll mode: 'page' allows normal page scrolling, 'zoom' enables zoom on scroll
  const [scrollMode, setScrollMode] = useState<'page' | 'zoom'>('page')

  // Windowing state for zoom
  const [startIndex, setStartIndex] = useState<number | null>(null)
  const [endIndex, setEndIndex] = useState<number | null>(null)

  // Zoom level history to ensure symmetrical zoom in/out
  const [zoomRangeStack, setZoomRangeStack] = useState<number[]>([])

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

  // Sync xAxisMode with user settings ONCE when settings first load
  // After that, respect user's local toggle changes (don't override them)
  useEffect(() => {
    if (userSettings?.yearDisplayFormat && !xAxisModeInitialized) {
      setXAxisMode(userSettings.yearDisplayFormat)
      setXAxisModeInitialized(true)
    }
  }, [userSettings?.yearDisplayFormat, xAxisModeInitialized])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const listener = () => setPrefersReducedMotion(media.matches)
    listener()
    media.addEventListener('change', listener)
    return () => media.removeEventListener('change', listener)
  }, [])

  // Determine the actual resolution of the data we have
  const dataResolution: TimeResolution = timelineMonths && timelineMonths.length > 0 ? 'monthly' : 'yearly'

  // Effective resolution based on available data and user preference
  const effectiveResolution: TimeResolution = resolution ?? dataResolution

  // Derive windowing indices - clear them when in yearly mode
  const actualStartIndex = zoomLevel === 'yearly' ? null : startIndex
  const actualEndIndex = zoomLevel === 'yearly' ? null : endIndex

  // Refs for stable event handlers (avoid recreating handlers on every state change)
  const startIndexRef = useRef(startIndex)
  const endIndexRef = useRef(endIndex)
  const zoomRangeStackRef = useRef(zoomRangeStack)
  const zoomLevelRef = useRef(zoomLevel)

  // Keep refs in sync with state
  useEffect(() => {
    startIndexRef.current = startIndex
    endIndexRef.current = endIndex
    zoomRangeStackRef.current = zoomRangeStack
    zoomLevelRef.current = zoomLevel
  })

  const projection = useMemo<ProjectionPoint[]>(() => {
    // Always use monthly data when available (regardless of zoom level)
    // The zoom level only affects how we display the data (axis labels, windowing)
    if (timelineMonths && timelineMonths.length > 0) {
      const monthlyProjection = timelineMonths.map<ProjectionPoint>((month) => {
        const assets = month.assets ?? []
        const liabilities = month.liabilities ?? []

        const totalAssets = assets.reduce((sum, item) => sum + (item.amountMonthly ?? item.amountAnnual ?? 0), 0)
        const totalLiabilities = liabilities.reduce(
          (sum, item) => sum + (item.amountMonthly ?? item.amountAnnual ?? 0),
          0
        )

        // month.year is already an absolute calendar year (e.g., 2025)
        // month.yearIndex is the 0-based year offset (0, 1, 2, 3...)
        // month.monthIndex is the global 0-based month index (0, 1, 2... for 420 months)
        const calendarYear = month.year

        return {
          yearIndex: month.monthIndex, // Use global month index for x-axis positioning
          yearLabel: `${month.year}-${String(month.month).padStart(2, '0')}`,
          netWorth: month.netWorth ?? 0,
          totalAssets,
          totalLiabilities,
          calendarYear, // This is the absolute year (2025, 2026, etc.) for display
          hasNonAnnualSource: false,
          hasOverride: !!month.hasOverrides,
        }
      })

      return monthlyProjection
    }

    // Handle yearly data
    if (timelineYears && timelineYears.length > 0) {
      const baseCalendarYear = 2025
      const timelineProjection = timelineYears.map<ProjectionPoint>((year, i) => {
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
          yearIndex: i,  // Use array index (0, 1, 2...) instead of calendar year
          yearLabel: `Year ${i}`,
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
    zoomLevel,
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
    if (effectiveResolution !== 'monthly' || actualStartIndex === null || actualEndIndex === null) {
      return projection
    }

    // Return windowed subset of data
    return projection.slice(actualStartIndex, actualEndIndex + 1)
  }, [projection, effectiveResolution, actualStartIndex, actualEndIndex])

  // Calculate visible range in months
  const visibleRangeMonths = useMemo(() => {
    if (effectiveResolution !== 'monthly' || actualStartIndex === null || actualEndIndex === null) {
      return projection.length
    }
    return actualEndIndex - actualStartIndex + 1
  }, [effectiveResolution, actualStartIndex, actualEndIndex, projection.length])

  // Prevent page scroll when mouse is over chart container
  useEffect(() => {
    const chartContainer = chartContainerRef.current
    if (!chartContainer) return

    const preventScroll = (e: WheelEvent) => {
      // Always prevent page scroll when over the chart area
      e.preventDefault()
      e.stopPropagation()
    }

    chartContainer.addEventListener('wheel', preventScroll, { passive: false })
    return () => chartContainer.removeEventListener('wheel', preventScroll)
  }, [])

  // Mouse wheel zoom handler with stable reference
  useEffect(() => {
    const chartElement = chartWrapperRef.current
    if (!chartElement) return
    if (projection.length === 0) return
    if (scrollMode !== 'zoom') return // Only zoom when in zoom mode
    if (effectiveResolution !== 'monthly') return // Only enable zoom when resolution is monthly

    let isProcessing = false // Prevent multiple rapid zooms

    const handleWheel = (e: WheelEvent) => {
      // Only handle wheel events when hovering over the chart
      if (!chartElement.contains(e.target as Node)) return
      if (isProcessing) return // Debounce rapid scrolls

      // Note: preventDefault is already called by the preventScroll handler above
      isProcessing = true

      // Reset processing flag after a short delay
      setTimeout(() => { isProcessing = false }, 50)

      const direction = e.deltaY < 0 ? -1 : 1 // -1 = zoom in, 1 = zoom out

      // Calculate mouse position as data index
      const rect = chartElement.getBoundingClientRect()
      const mouseX = e.clientX - rect.left
      const mousePercentage = mouseX / rect.width

      // Get current center point using refs for latest values
      const currentStart = startIndexRef.current ?? 0
      const currentEnd = endIndexRef.current ?? projection.length - 1
      const currentRange = currentEnd - currentStart + 1
      const centerIndex = Math.floor(currentStart + currentRange * mousePercentage)

      if (direction < 0) {
        // Zoom in: reduce range by dividing by 1.5 for gradual zoom
        const newRange = Math.max(12, Math.floor(currentRange / 1.5))
        const halfRange = Math.floor(newRange / 2)

        let newStart = centerIndex - halfRange
        let newEnd = centerIndex + halfRange

        // Clamp to valid bounds
        if (newStart < 0) {
          newStart = 0
          newEnd = Math.min(projection.length - 1, newRange - 1)
        } else if (newEnd >= projection.length) {
          newEnd = projection.length - 1
          newStart = Math.max(0, projection.length - newRange)
        }

        // Push current range to stack before zooming in (for perfect symmetry)
        setZoomRangeStack(prev => [...prev, currentRange])
        setStartIndex(newStart)
        setEndIndex(newEnd)
        setZoomLevel('monthly')
      } else {
        // Zoom out: use stack to restore previous range for symmetry
        if (zoomRangeStackRef.current.length > 0) {
          // Pop from stack to get the exact previous range
          const previousRange = zoomRangeStackRef.current[zoomRangeStackRef.current.length - 1]
          setZoomRangeStack(prev => prev.slice(0, -1))

          // If we're going back to full view, switch to yearly
          if (previousRange >= projection.length - 6) {
            setStartIndex(null)
            setEndIndex(null)
            setZoomLevel('yearly')
            return
          }

          const halfRange = Math.floor(previousRange / 2)
          const newStart = Math.max(0, centerIndex - halfRange)
          const newEnd = Math.min(projection.length - 1, centerIndex + halfRange)

          setStartIndex(newStart)
          setEndIndex(newEnd)
          setZoomLevel('monthly')
        } else {
          // No history, just switch back to yearly view
          setStartIndex(null)
          setEndIndex(null)
          setZoomLevel('yearly')
        }
      }
    }

    chartElement.addEventListener('wheel', handleWheel, { passive: false })
    return () => chartElement.removeEventListener('wheel', handleWheel)
  }, [scrollMode, effectiveResolution, projection.length]) // Reduced dependencies - use refs for state

  // Drag-to-pan handler with stable reference
  useEffect(() => {
    const chartElement = chartWrapperRef.current
    if (!chartElement) return
    if (effectiveResolution !== 'monthly') return
    if (startIndexRef.current === null || endIndexRef.current === null) return // Only allow panning when zoomed

    let isDragging = false
    let dragStartData: { x: number; startIdx: number; endIdx: number } | null = null

    const handleMouseDown = (e: MouseEvent) => {
      if (!chartElement.contains(e.target as Node)) return
      const currentStart = startIndexRef.current
      const currentEnd = endIndexRef.current
      if (currentStart === null || currentEnd === null) return

      isDragging = true
      dragStartData = {
        x: e.clientX,
        startIdx: currentStart,
        endIdx: currentEnd,
      }
      chartElement.style.cursor = 'grabbing'
    }

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !dragStartData) return

      const rect = chartElement.getBoundingClientRect()
      const deltaX = e.clientX - dragStartData.x
      const dataRange = dragStartData.endIdx - dragStartData.startIdx
      const pixelsPerIndex = rect.width / dataRange
      const indexDelta = Math.round(-deltaX / pixelsPerIndex) // Negative for natural panning direction

      const newStart = Math.max(0, Math.min(projection.length - dataRange, dragStartData.startIdx + indexDelta))
      const newEnd = newStart + dataRange

      setStartIndex(newStart)
      setEndIndex(newEnd)
    }

    const handleMouseUp = () => {
      isDragging = false
      dragStartData = null
      chartElement.style.cursor = 'grab'
    }

    // Set initial cursor
    chartElement.style.cursor = 'grab'

    window.addEventListener('mousedown', handleMouseDown)
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)

    return () => {
      window.removeEventListener('mousedown', handleMouseDown)
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
      chartElement.style.cursor = 'default'
    }
  }, [effectiveResolution, projection.length]) // Reduced dependencies - use refs for indices

  // Helper functions for zoom in/out buttons
  const handleZoomIn = useCallback(() => {
    if (effectiveResolution !== 'monthly' || projection.length === 0) return

    const currentStart = startIndex ?? 0
    const currentEnd = endIndex ?? projection.length - 1
    const currentRange = currentEnd - currentStart
    const centerIndex = Math.floor((currentStart + currentEnd) / 2)

    // Reduce the range by 25% (zoom in gradually)
    const newRange = Math.max(12, Math.floor(currentRange * 0.75)) // Minimum 12 months visible
    const halfRange = Math.floor(newRange / 2)

    const newStart = Math.max(0, centerIndex - halfRange)
    const newEnd = Math.min(projection.length - 1, centerIndex + halfRange)

    setStartIndex(newStart)
    setEndIndex(newEnd)
    setZoomLevel('monthly')
  }, [effectiveResolution, projection.length, startIndex, endIndex])

  const handleZoomOut = useCallback(() => {
    if (effectiveResolution !== 'monthly' || projection.length === 0) return

    const currentStart = startIndex ?? 0
    const currentEnd = endIndex ?? projection.length - 1
    const currentRange = currentEnd - currentStart
    const centerIndex = Math.floor((currentStart + currentEnd) / 2)

    // Increase the range by 33% (zoom out gradually)
    const newRange = Math.min(projection.length, Math.floor(currentRange * 1.33))

    // If we're showing all or most of the data, switch back to yearly view
    if (newRange >= projection.length - 6) {
      setStartIndex(null)
      setEndIndex(null)
      setZoomLevel('yearly')
      return
    }

    const halfRange = Math.floor(newRange / 2)
    const newStart = Math.max(0, centerIndex - halfRange)
    const newEnd = Math.min(projection.length - 1, centerIndex + halfRange)

    setStartIndex(newStart)
    setEndIndex(newEnd)
    setZoomLevel('monthly')
  }, [effectiveResolution, projection.length, startIndex, endIndex])

  // Determine if zoom buttons should be enabled
  const canZoomIn = useMemo(() => {
    if (effectiveResolution !== 'monthly') return false
    if (projection.length === 0) return false

    const currentStart = startIndex ?? 0
    const currentEnd = endIndex ?? projection.length - 1
    const currentRange = currentEnd - currentStart

    // Can zoom in if we're showing more than the minimum (12 months)
    return currentRange > 12
  }, [effectiveResolution, startIndex, endIndex, projection.length])

  const canZoomOut = useMemo(() => {
    if (effectiveResolution !== 'monthly') return false
    if (projection.length === 0) return false

    // Can zoom out if we're not showing all the data
    return startIndex !== null && endIndex !== null
  }, [effectiveResolution, startIndex, endIndex, projection.length])

  const areaAnimationEnabled = !prefersReducedMotion && displayData.length > 0

  // Manage marker visibility after chart animation completes
  useEffect(() => {
    if (!areaAnimationEnabled) {
      setMarkersReady(true)
      return
    }

    // Hide markers during animation
    setMarkersReady(false)

    // Show markers after animation completes (with safety buffer)
    const timer = window.setTimeout(
      () => setMarkersReady(true),
      AREA_ANIMATION_MS + MARKER_BUFFER_MS + 300 // Combined primary + safety timeout
    )

    return () => window.clearTimeout(timer)
  }, [displayData.length, areaAnimationEnabled])

  // Calculate the base calendar year for tick labels
  const baseCalendarYear = useMemo(() => {
    if (displayData.length === 0) return BASE_CALENDAR_YEAR

    const firstPoint = displayData[0]
    if (dataResolution === 'monthly') {
      // For monthly data: yearIndex is monthIndex
      // baseCalendarYear = calendarYear - (monthIndex / 12)
      const yearOffset = Math.floor(firstPoint.yearIndex / 12)
      return firstPoint.calendarYear - yearOffset
    } else {
      // For yearly data: yearIndex is year offset
      return firstPoint.calendarYear - firstPoint.yearIndex
    }
  }, [displayData, dataResolution])

  const ticks = useMemo(() => {
    const totalPoints = displayData.length
    if (totalPoints === 0) return [] as number[]

    // When showing years (not months), only show one tick per unique year
    const showingYears = dataResolution === 'monthly' && visibleRangeMonths >= 24

    if (showingYears) {
      // Group by year and pick the first month of each year
      const seenYears = new Set<number>()
      const values: number[] = []

      for (let i = 0; i < totalPoints; i++) {
        const point = displayData[i]
        const year = Math.floor(point.yearIndex / 12)

        if (!seenYears.has(year)) {
          seenYears.add(year)
          values.push(point.yearIndex)
        }
      }

      return values
    }

    // Default tick generation for monthly view or yearly resolution
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
  }, [displayData, dataResolution, visibleRangeMonths, containerWidth])

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

      if (dataResolution === 'monthly') {
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
  }, [scenarioEvents, displayData, projection, dataResolution, timelineMonths, zoomLevel])

  // Calculate age range from actual displayed data
  const ageRange = useMemo(() => {
    const startingAge = userSettings?.startingAge ?? DEFAULT_STARTING_AGE
    const terminalAge = userSettings?.terminalAge ?? DEFAULT_TERMINAL_AGE

    if (displayData.length === 0) {
      return { startAge: startingAge, endAge: terminalAge, years: Math.max(1, terminalAge - startingAge) }
    }

    // For monthly data, calculate age from yearIndex (0-based year offset)
    if (dataResolution === 'monthly') {
      const firstMonthIndex = displayData[0].yearIndex ?? 0
      const lastMonthIndex = displayData[displayData.length - 1].yearIndex ?? 0

      const firstYearOffset = Math.floor(firstMonthIndex / 12)
      const lastYearOffset = Math.floor(lastMonthIndex / 12)

      const startAge = startingAge + firstYearOffset
      const endAge = startingAge + lastYearOffset
      const years = endAge - startAge

      return { startAge, endAge, years }
    }

    // For yearly data, use yearIndex directly
    const firstYearIndex = displayData[0].yearIndex ?? 0
    const lastYearIndex = displayData[displayData.length - 1].yearIndex ?? 0

    const startAge = startingAge + firstYearIndex
    const endAge = startingAge + lastYearIndex
    const years = endAge - startAge

    return { startAge, endAge, years }
  }, [displayData, userSettings?.startingAge, userSettings?.terminalAge, dataResolution])

  const defaultTitle = 'Net Worth Projection'
  const defaultSubtitle = `Age ${ageRange.startAge} to ${ageRange.endAge} (${ageRange.years} years)`


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
          {onAddScenario && (
            <button
              onClick={onAddScenario}
              className="flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.02] px-3 py-1.5 text-xs font-medium text-slate-400 transition-all hover:border-white/[0.12] hover:bg-white/[0.04] hover:text-slate-200"
              type="button"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Event
            </button>
          )}
        </div>
      </div>

      <div
        ref={chartContainerRef}
        className="relative w-full flex-1 min-h-[250px] min-w-0 overflow-hidden [&_*:focus]:outline-none [&_*:focus-visible]:outline-none"
      >
        {/* Zoom controls and scroll mode toggle positioned on the right side - always visible */}
        <div className="absolute right-4 top-1/2 z-10 flex -translate-y-1/2 flex-col gap-3">
          {/* Scroll mode toggle */}
          <button
            onClick={() => setScrollMode(scrollMode === 'page' ? 'zoom' : 'page')}
            className="flex flex-col items-center gap-1 rounded-lg border border-white/[0.08] bg-[#0a0a0a]/80 p-2 backdrop-blur-sm transition-colors hover:bg-white/5"
            title={scrollMode === 'page' ? 'Switch to scroll-to-zoom mode' : 'Switch to page scroll mode'}
            type="button"
          >
            {scrollMode === 'page' ? (
              <Mouse className="h-4 w-4 text-gray-400" />
            ) : (
              <Hand className="h-4 w-4 text-blue-400" />
            )}
            <span className="text-[9px] text-gray-400">
              {scrollMode === 'page' ? 'Scroll' : 'Zoom'}
            </span>
          </button>

          {/* Zoom controls - only show reset when zoomed in */}
          <ZoomControls
            zoomLevel={zoomLevel}
            onZoomChange={setZoomLevel}
            canZoomIn={canZoomIn}
            canZoomOut={canZoomOut}
            onZoomIn={handleZoomIn}
            onZoomOut={handleZoomOut}
          />
        </div>
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
                      resolution={dataResolution}
                      visibleRangeMonths={visibleRangeMonths}
                      baseCalendarYear={baseCalendarYear}
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
                  content={<CustomTooltip startingAge={userSettings?.startingAge} resolution={dataResolution} />}
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
          onClick={() => setXAxisMode((prev) => prev === 'age' ? 'actual_year' : 'age')}
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
