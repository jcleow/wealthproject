import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Chart } from 'chart.js'
import type { ZoomLevel } from '@/components/timeline/ZoomControls'
import type { TimeResolution } from '@/types/timeline'

export interface UseChartJSZoomOptions {
  /** External zoom level state */
  externalZoomLevel?: ZoomLevel
  /** Callback when zoom level changes */
  onZoomLevelChange?: (level: ZoomLevel) => void
  /** Data resolution */
  effectiveResolution: TimeResolution
  /** Total number of data points */
  projectionLength: number
  /** Scroll mode: 'page' for normal scroll, 'zoom' for wheel zoom */
  scrollMode: 'page' | 'zoom'
}

export interface UseChartJSZoomResult {
  /** Current zoom level */
  zoomLevel: ZoomLevel
  /** Update zoom level */
  setZoomLevel: (value: ZoomLevel | ((prev: ZoomLevel) => ZoomLevel)) => void
  /** Start index for data windowing */
  startIndex: number | null
  /** End index for data windowing */
  endIndex: number | null
  /** Actual start index (null when not zoomed) */
  actualStartIndex: number | null
  /** Actual end index (null when not zoomed) */
  actualEndIndex: number | null
  /** Whether further zoom in is possible */
  canZoomIn: boolean
  /** Whether further zoom out is possible */
  canZoomOut: boolean
  /** Handle zoom in button click */
  handleZoomIn: () => void
  /** Handle zoom out button click */
  handleZoomOut: () => void
  /** Ref for the chart instance */
  chartRef: React.MutableRefObject<Chart | null>
  /** Get zoom plugin options for Chart.js */
  getZoomPluginOptions: () => object
}

/**
 * Hook for managing Chart.js zoom and pan functionality
 *
 * This integrates with chartjs-plugin-zoom for native zoom/pan support,
 * while maintaining the same interface as the Recharts useChartZoom hook.
 */
export function useChartJSZoom({
  externalZoomLevel,
  onZoomLevelChange,
  effectiveResolution,
  projectionLength,
  scrollMode,
}: UseChartJSZoomOptions): UseChartJSZoomResult {
  const [internalZoomLevel, setInternalZoomLevel] = useState<ZoomLevel>('yearly')
  const zoomLevel = externalZoomLevel ?? internalZoomLevel

  const [startIndex, setStartIndex] = useState<number | null>(null)
  const [endIndex, setEndIndex] = useState<number | null>(null)

  const chartRef = useRef<Chart | null>(null)

  // Keep refs for stable callbacks
  const startIndexRef = useRef(startIndex)
  const endIndexRef = useRef(endIndex)

  useEffect(() => {
    startIndexRef.current = startIndex
    endIndexRef.current = endIndex
  })

  const setZoomLevel = useCallback(
    (value: ZoomLevel | ((prev: ZoomLevel) => ZoomLevel)) => {
      if (onZoomLevelChange) {
        const newLevel = typeof value === 'function' ? value(zoomLevel) : value
        onZoomLevelChange(newLevel)
      } else {
        setInternalZoomLevel(value)
      }
    },
    [onZoomLevelChange, zoomLevel]
  )

  // Derive actual indices (null when in yearly/full view)
  const actualStartIndex = zoomLevel === 'yearly' ? null : startIndex
  const actualEndIndex = zoomLevel === 'yearly' ? null : endIndex

  // Handle zoom in via button
  const handleZoomIn = useCallback(() => {
    if (effectiveResolution !== 'monthly' || projectionLength === 0) return

    const currentStart = startIndex ?? 0
    const currentEnd = endIndex ?? projectionLength - 1
    const currentRange = currentEnd - currentStart
    const centerIndex = Math.floor((currentStart + currentEnd) / 2)

    const newRange = Math.max(12, Math.floor(currentRange * 0.75))
    const halfRange = Math.floor(newRange / 2)

    const newStart = Math.max(0, centerIndex - halfRange)
    const newEnd = Math.min(projectionLength - 1, centerIndex + halfRange)

    setStartIndex(newStart)
    setEndIndex(newEnd)
    setZoomLevel('monthly')

    // Also update Chart.js zoom if chart exists
    if (chartRef.current) {
      const chart = chartRef.current
      chart.zoomScale('x', { min: newStart, max: newEnd }, 'zoom')
    }
  }, [effectiveResolution, projectionLength, startIndex, endIndex, setZoomLevel])

  // Handle zoom out via button
  const handleZoomOut = useCallback(() => {
    if (effectiveResolution !== 'monthly' || projectionLength === 0) return

    const currentStart = startIndex ?? 0
    const currentEnd = endIndex ?? projectionLength - 1
    const currentRange = currentEnd - currentStart
    const centerIndex = Math.floor((currentStart + currentEnd) / 2)

    const newRange = Math.min(projectionLength, Math.floor(currentRange * 1.33))

    if (newRange >= projectionLength - 6) {
      setStartIndex(null)
      setEndIndex(null)
      setZoomLevel('yearly')

      // Reset Chart.js zoom
      if (chartRef.current) {
        chartRef.current.resetZoom()
      }
      return
    }

    const halfRange = Math.floor(newRange / 2)
    const newStart = Math.max(0, centerIndex - halfRange)
    const newEnd = Math.min(projectionLength - 1, centerIndex + halfRange)

    setStartIndex(newStart)
    setEndIndex(newEnd)
    setZoomLevel('monthly')

    // Update Chart.js zoom
    if (chartRef.current) {
      const chart = chartRef.current
      chart.zoomScale('x', { min: newStart, max: newEnd }, 'zoom')
    }
  }, [effectiveResolution, projectionLength, startIndex, endIndex, setZoomLevel])

  // Determine if zoom operations are possible
  const canZoomIn = useMemo(() => {
    if (effectiveResolution !== 'monthly') return false
    if (projectionLength === 0) return false

    const currentStart = startIndex ?? 0
    const currentEnd = endIndex ?? projectionLength - 1
    const currentRange = currentEnd - currentStart

    return currentRange > 12
  }, [effectiveResolution, startIndex, endIndex, projectionLength])

  const canZoomOut = useMemo(() => {
    if (effectiveResolution !== 'monthly') return false
    if (projectionLength === 0) return false

    return startIndex !== null && endIndex !== null
  }, [effectiveResolution, startIndex, endIndex, projectionLength])

  // Generate Chart.js zoom plugin options
  const getZoomPluginOptions = useCallback(() => {
    const isZoomEnabled = scrollMode === 'zoom' && effectiveResolution === 'monthly'

    return {
      zoom: {
        wheel: {
          enabled: false,
        },
        pinch: {
          enabled: false,
        },
        mode: 'x' as const,
        onZoomComplete: ({ chart }: { chart: Chart }) => {
          const xScale = chart.scales['x']
          if (xScale) {
            const newStart = Math.floor(xScale.min)
            const newEnd = Math.ceil(xScale.max)

            if (newEnd - newStart >= projectionLength - 6) {
              setStartIndex(null)
              setEndIndex(null)
              setZoomLevel('yearly')
            } else {
              setStartIndex(newStart)
              setEndIndex(newEnd)
              setZoomLevel('monthly')
            }
          }
        },
      },
      pan: {
        enabled: false,
        mode: 'x' as const,
        onPanComplete: ({ chart }: { chart: Chart }) => {
          const xScale = chart.scales['x']
          if (xScale) {
            setStartIndex(Math.floor(xScale.min))
            setEndIndex(Math.ceil(xScale.max))
          }
        },
      },
      limits: {
        x: {
          min: 0,
          max: projectionLength - 1,
          minRange: 12,
        },
      },
    }
  }, [scrollMode, effectiveResolution, projectionLength, startIndex, setZoomLevel])

  return {
    zoomLevel,
    setZoomLevel,
    startIndex,
    endIndex,
    actualStartIndex,
    actualEndIndex,
    canZoomIn,
    canZoomOut,
    handleZoomIn,
    handleZoomOut,
    chartRef,
    getZoomPluginOptions,
  }
}

export default useChartJSZoom
