import { useState, useCallback, useRef, useEffect, type RefObject } from 'react'

/** Chart layout constants for coordinate calculations */
interface ChartLayout {
  /** Chart margins (must match ComposedChart margin prop) */
  margin: { top: number; right: number; left: number; bottom: number }
  /** Width of Y-axis labels area */
  yAxisWidth: number
}

interface UseChartDragOptions {
  /** Reference to the container element */
  containerRef: RefObject<HTMLDivElement | null>
  /** Start value of the data range (e.g., startAge) */
  rangeStart: number
  /** End value of the data range (e.g., endAge) */
  rangeEnd: number
  /** Callback when value changes */
  onValueChange?: (value: number) => void
  /** Whether drag is enabled */
  enabled?: boolean
  /** Chart layout for coordinate calculations */
  layout: ChartLayout
}

interface UseChartDragReturn {
  /** Whether currently dragging */
  isDragging: boolean
  /** Mouse down handler for container */
  handleMouseDown: (e: React.MouseEvent) => void
  /** Mouse move handler for container */
  handleMouseMove: (e: React.MouseEvent) => void
  /** Mouse up handler for container */
  handleMouseUp: () => void
}

/**
 * Custom hook for handling drag interactions on a chart.
 * Calculates values from mouse X position based on chart layout.
 */
export function useChartDrag({
  containerRef,
  rangeStart,
  rangeEnd,
  onValueChange,
  enabled = true,
  layout,
}: UseChartDragOptions): UseChartDragReturn {
  const isDraggingRef = useRef(false)
  const [isDragging, setIsDragging] = useState(false)

  // Calculate value from mouse X position
  const calculateValueFromX = useCallback(
    (clientX: number): number | null => {
      if (!containerRef.current) return null

      const rect = containerRef.current.getBoundingClientRect()
      const leftOffset = layout.margin.left + layout.yAxisWidth
      const chartWidth = rect.width - leftOffset - layout.margin.right
      const relativeX = clientX - rect.left - leftOffset

      // Clamp to chart area
      const clampedX = Math.max(0, Math.min(chartWidth, relativeX))
      const ratio = clampedX / chartWidth

      // Map ratio to value range
      const value = Math.round(rangeStart + ratio * (rangeEnd - rangeStart))
      return Math.max(rangeStart, Math.min(rangeEnd, value))
    },
    [containerRef, rangeStart, rangeEnd, layout]
  )

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!enabled || !onValueChange) return

      isDraggingRef.current = true
      setIsDragging(true)

      const value = calculateValueFromX(e.clientX)
      if (value !== null) {
        onValueChange(value)
      }
    },
    [enabled, onValueChange, calculateValueFromX]
  )

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDraggingRef.current || !onValueChange) return

      const value = calculateValueFromX(e.clientX)
      if (value !== null) {
        onValueChange(value)
      }
    },
    [onValueChange, calculateValueFromX]
  )

  const handleMouseUp = useCallback(() => {
    isDraggingRef.current = false
    setIsDragging(false)
  }, [])

  // Handle mouse up outside the component
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isDraggingRef.current) {
        isDraggingRef.current = false
        setIsDragging(false)
      }
    }

    window.addEventListener('mouseup', handleGlobalMouseUp)
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp)
  }, [])

  return {
    isDragging,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
  }
}
