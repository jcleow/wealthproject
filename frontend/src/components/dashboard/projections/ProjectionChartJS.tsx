'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
  type ChartOptions,
  type ChartData,
  type TooltipModel,
} from 'chart.js'
import { Line } from 'react-chartjs-2'
import zoomPlugin from 'chartjs-plugin-zoom'

import { milestonePlugin, preloadIcons } from './chartjs/milestonePlugin'
import { ChartJSTooltip, useChartJSTooltip } from './chartjs/ChartJSTooltip'
import { PropertyMarkerPopover } from './PropertyMarkerPopover'
import type { ChartJSMarkerData, PropertyMarkerData } from './chartjs/types'
import { chartColors, AREA_ANIMATION_MS, type AxisMode, type ProjectionPoint } from './types'
import type { ScenarioMarkerData } from './useProjectionData'
import type { ScenarioEvent } from '@/types/scenario'
import type { TimeResolution } from '@/types/timeline'
import { DEFAULT_STARTING_AGE } from './types'

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
  zoomPlugin,
  milestonePlugin
)

export interface ProjectionChartJSProps {
  displayData: ProjectionPoint[]
  enhancedDisplayData: ProjectionPoint[]
  enableChartOverlays: boolean
  areaAnimationEnabled: boolean
  ticks: number[]
  overrideYearsSet: Set<number>
  onSelectYear?: (year: number) => void
  onSelectMonth?: (month: number) => void
  selectedYear?: number
  xAxisMode: AxisMode
  startingAge?: number
  dataResolution: TimeResolution
  visibleRangeMonths: number
  baseCalendarYear: number
  scenarioMarkers: ScenarioMarkerData[]
  onScenarioSelect?: (event: ScenarioEvent) => void
  markersReady: boolean
  prefersReducedMotion: boolean
  scrollMode: 'page' | 'zoom'
  projectionLength: number
  startIndex: number | null
  endIndex: number | null
  propertyMarkers?: PropertyMarkerData[]
  onPropertyScenarioEdit?: (scenarioId: string) => void
}

/**
 * Chart.js implementation of the Net Worth Projection chart
 *
 * Key advantages over Recharts:
 * - Scenario markers are drawn directly on canvas (scale properly during zoom)
 * - Better performance for large datasets
 * - Native zoom/pan support via chartjs-plugin-zoom
 */
export function ProjectionChartJS({
  displayData,
  areaAnimationEnabled,
  onSelectYear,
  onSelectMonth,
  xAxisMode,
  startingAge = DEFAULT_STARTING_AGE,
  dataResolution,
  visibleRangeMonths,
  baseCalendarYear,
  scenarioMarkers,
  onScenarioSelect,
  markersReady: _markersReady, // Not used - markers animate with chart line
  prefersReducedMotion,
  scrollMode,
  projectionLength,
  startIndex,
  endIndex,
  propertyMarkers = [],
  onPropertyScenarioEdit,
}: ProjectionChartJSProps) {
  const chartRef = useRef<ChartJS<'line'> | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Tooltip state
  const { tooltipState, handleTooltip, hideTooltip } = useChartJSTooltip()

  // Store handlers in refs to avoid useMemo dependency issues
  const handleTooltipRef = useRef(handleTooltip)
  const hideTooltipRef = useRef(hideTooltip)
  handleTooltipRef.current = handleTooltip
  hideTooltipRef.current = hideTooltip

  // Track if icons are loaded
  const [iconsLoaded, setIconsLoaded] = useState(false)

  // Property marker popover state
  const [expandedPropertyMarker, setExpandedPropertyMarker] = useState<{
    marker: PropertyMarkerData
    position: { x: number; y: number }
  } | null>(null)

  // Pre-load icons when markers change
  useEffect(() => {
    const scenarioIconNames = scenarioMarkers.flatMap((marker) =>
      marker.events.map((event) => event.displayIcon).filter(Boolean)
    ) as string[]

    // Also preload property marker icons
    const propertyIconNames = propertyMarkers.map((marker) => marker.icon).filter(Boolean)

    const allIconNames = [...scenarioIconNames, ...propertyIconNames]

    if (allIconNames.length > 0) {
      setIconsLoaded(false)
      preloadIcons(allIconNames).then(() => setIconsLoaded(true))
    } else {
      setIconsLoaded(true)
    }
  }, [scenarioMarkers, propertyMarkers])

  // Markers are shown immediately (opacity 1) so they animate with the chart line
  // They only need icons to be loaded first
  const markerOpacity = iconsLoaded ? 1 : 0

  // Convert scenario markers to Chart.js format
  const chartJSMarkers: ChartJSMarkerData[] = useMemo(() => {
    return scenarioMarkers.map((marker) => ({
      yearIndex: marker.yearIndex,
      netWorth: marker.netWorth,
      events: marker.events,
    }))
  }, [scenarioMarkers])

  // Handle marker click
  const handleMarkerClick = useCallback(
    (event: ScenarioEvent) => {
      if (onScenarioSelect) {
        onScenarioSelect(event)
      }
    },
    [onScenarioSelect]
  )

  // Handle property marker click - show popover
  const handlePropertyMarkerClick = useCallback(
    (marker: PropertyMarkerData, x: number, y: number) => {
      setExpandedPropertyMarker({ marker, position: { x, y } })
    },
    []
  )

  // Handle edit scenario from popover
  const handleEditScenarioFromPopover = useCallback(() => {
    if (expandedPropertyMarker && onPropertyScenarioEdit) {
      onPropertyScenarioEdit(expandedPropertyMarker.marker.propertyScenarioId)
      setExpandedPropertyMarker(null)
    }
  }, [expandedPropertyMarker, onPropertyScenarioEdit])

  // Generate X-axis labels based on mode
  const getXAxisLabel = useCallback(
    (yearIndex: number): string => {
      if (dataResolution === 'monthly') {
        const yearOffset = Math.floor(yearIndex / 12)
        const year = baseCalendarYear + yearOffset

        // When zoomed in close, show month
        if (visibleRangeMonths < 24) {
          const monthIndex = yearIndex % 12
          const monthNames = [
            'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
            'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
          ]
          return `${monthNames[monthIndex]} ${year}`
        }

        // When showing years
        if (xAxisMode === 'age') {
          return `${startingAge + yearOffset}`
        }
        return `${year}`
      }

      // Yearly data
      const year = baseCalendarYear + yearIndex
      if (xAxisMode === 'age') {
        return `${startingAge + yearIndex}`
      }
      return `${year}`
    },
    [dataResolution, baseCalendarYear, visibleRangeMonths, xAxisMode, startingAge]
  )

  // Chart data
  const chartData: ChartData<'line'> = useMemo(() => {
    return {
      labels: displayData.map((point) => point.yearIndex),
      datasets: [
        {
          label: 'Net Worth',
          data: displayData.map((point) => ({
            x: point.yearIndex,
            y: point.netWorth,
          })),
          fill: true,
          backgroundColor: (context) => {
            const chart = context.chart
            const { ctx, chartArea } = chart
            if (!chartArea) return chartColors.gradientStart

            const gradient = ctx.createLinearGradient(
              0,
              chartArea.top,
              0,
              chartArea.bottom
            )
            gradient.addColorStop(0, 'rgba(79, 129, 255, 0.8)')
            gradient.addColorStop(0.9, 'rgba(59, 130, 246, 0.05)')
            return gradient
          },
          borderColor: chartColors.stroke,
          borderWidth: 2.5,
          pointRadius: 0,
          pointHoverRadius: 5,
          pointHoverBackgroundColor: chartColors.stroke,
          pointHoverBorderWidth: 0,
          tension: 0.3,
        },
      ],
    }
  }, [displayData])

  // Chart options
  const chartOptions: ChartOptions<'line'> = useMemo(() => {
    const isZoomEnabled = scrollMode === 'zoom' && dataResolution === 'monthly'

    return {
      responsive: true,
      maintainAspectRatio: false,
      animation: {
        duration: areaAnimationEnabled ? AREA_ANIMATION_MS : 0,
        easing: 'easeOutQuart',
      },
      interaction: {
        mode: 'index',
        intersect: false,
      },
      scales: {
        x: {
          type: 'linear',
          min: startIndex ?? undefined,
          max: endIndex ?? undefined,
          grid: {
            color: chartColors.grid,
            lineWidth: 1,
            drawTicks: false,
          },
          border: {
            display: false,
          },
          ticks: {
            color: chartColors.axis,
            font: { size: 12 },
            callback: (value) => getXAxisLabel(value as number),
            maxTicksLimit: 10,
          },
        },
        y: {
          type: 'linear' as const,
          grid: {
            display: false,
          },
          border: {
            display: false,
          },
          ticks: {
            color: chartColors.axis,
            font: { size: 12 },
            callback: (value) => {
              const numValue = value as number
              if (numValue <= 0) return ''
              if (numValue >= 1_000_000) return `$${(numValue / 1_000_000).toFixed(1)}M`
              if (numValue >= 1000) return `$${(numValue / 1000).toFixed(0)}K`
              return `$${numValue}`
            },
          },
          // Calculate min/max based on data
          min: (() => {
            const values = displayData.map((d) => d.netWorth)
            const minValue = Math.min(...values, 0)
            return Math.min(0, Math.floor(minValue * 1.05))
          })(),
          max: (() => {
            const values = displayData.map((d) => d.netWorth)
            const maxValue = Math.max(...values, 0)
            return maxValue > 0 ? Math.ceil(maxValue * 1.1) : 500000
          })(),
        },
      },
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          enabled: false,
          external: (context) => {
            const tooltipModel = context.tooltip as TooltipModel<'line'>

            if (tooltipModel.opacity === 0) {
              hideTooltipRef.current()
              return
            }

            const dataIndex = tooltipModel.dataPoints?.[0]?.dataIndex
            if (dataIndex === undefined) return

            const dataPoint = displayData[dataIndex]
            if (!dataPoint) return

            handleTooltipRef.current(true, tooltipModel.caretX, tooltipModel.caretY, dataPoint)
          },
        },
        zoom: {
          zoom: {
            wheel: {
              enabled: isZoomEnabled,
              speed: 0.1,
            },
            pinch: {
              enabled: isZoomEnabled,
            },
            mode: 'x',
          },
          pan: {
            enabled: isZoomEnabled && startIndex !== null,
            mode: 'x',
          },
          limits: {
            x: {
              min: 0,
              max: projectionLength - 1,
              minRange: 12,
            },
          },
        },
        milestoneMarkers: {
          markers: chartJSMarkers,
          propertyMarkers: propertyMarkers,
          visible: true, // Always visible, opacity controls actual visibility
          animate: !prefersReducedMotion,
          opacity: markerOpacity,
          onMarkerClick: handleMarkerClick,
          onPropertyMarkerClick: handlePropertyMarkerClick,
        },
      },
      onClick: (_event, elements) => {
        if (elements.length > 0) {
          const dataIndex = elements[0].index
          const dataPoint = displayData[dataIndex]

          if (dataPoint) {
            if (dataResolution === 'monthly' && onSelectMonth) {
              onSelectMonth(dataPoint.yearIndex)
            } else if (onSelectYear) {
              onSelectYear(dataPoint.yearIndex)
            }
          }
        }
      },
    }
  }, [
    scrollMode,
    dataResolution,
    areaAnimationEnabled,
    startIndex,
    endIndex,
    getXAxisLabel,
    projectionLength,
    chartJSMarkers,
    propertyMarkers,
    prefersReducedMotion,
    markerOpacity,
    handleMarkerClick,
    handlePropertyMarkerClick,
    displayData,
    onSelectMonth,
    onSelectYear,
  ])

  return (
    <div ref={containerRef} className="relative h-full w-full">
      <Line
        ref={chartRef}
        data={chartData}
        options={chartOptions}
      />

      {/* External tooltip */}
      <ChartJSTooltip
        visible={tooltipState.visible}
        x={tooltipState.x}
        y={tooltipState.y}
        data={tooltipState.data}
        startingAge={startingAge}
        resolution={dataResolution}
      />

      {/* Property marker popover */}
      {expandedPropertyMarker && (
        <PropertyMarkerPopover
          marker={expandedPropertyMarker.marker}
          position={expandedPropertyMarker.position}
          chartContainerRef={containerRef}
          onClose={() => setExpandedPropertyMarker(null)}
          onEditScenario={handleEditScenarioFromPopover}
        />
      )}
    </div>
  )
}

export default ProjectionChartJS
