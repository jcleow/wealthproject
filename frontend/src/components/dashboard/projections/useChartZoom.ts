import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ZoomLevel } from '@/components/timeline/ZoomControls'
import type { TimeResolution } from '@/types/timeline'
import { useTimelineStore } from '@/stores'

export interface UseChartZoomOptions {
  effectiveResolution: TimeResolution
  projectionLength: number
  chartWrapperRef: React.RefObject<HTMLDivElement | null>
  scrollMode: 'page' | 'zoom'
}

interface UseChartZoomResult {
  zoomLevel: ZoomLevel
  setZoomLevel: (value: ZoomLevel | ((prev: ZoomLevel) => ZoomLevel)) => void
  startIndex: number | null
  endIndex: number | null
  actualStartIndex: number | null
  actualEndIndex: number | null
  canZoomIn: boolean
  canZoomOut: boolean
  handleZoomIn: () => void
  handleZoomOut: () => void
}

export function useChartZoom({
  effectiveResolution,
  projectionLength,
  chartWrapperRef,
  scrollMode,
}: UseChartZoomOptions): UseChartZoomResult {
  // Get zoom state from Zustand store
  const zoomLevel = useTimelineStore((s) => s.zoomLevel)
  const storeSetZoomLevel = useTimelineStore((s) => s.setZoomLevel)

  const [startIndex, setStartIndex] = useState<number | null>(null)
  const [endIndex, setEndIndex] = useState<number | null>(null)
  const [zoomRangeStack, setZoomRangeStack] = useState<number[]>([])

  // Refs for stable event handlers
  const startIndexRef = useRef(startIndex)
  const endIndexRef = useRef(endIndex)
  const zoomRangeStackRef = useRef(zoomRangeStack)

  // Keep refs in sync with state
  useEffect(() => {
    startIndexRef.current = startIndex
    endIndexRef.current = endIndex
    zoomRangeStackRef.current = zoomRangeStack
  })

  const setZoomLevel = useCallback(
    (value: ZoomLevel | ((prev: ZoomLevel) => ZoomLevel)) => {
      const newLevel = typeof value === 'function' ? value(zoomLevel) : value
      storeSetZoomLevel(newLevel)
    },
    [storeSetZoomLevel, zoomLevel]
  )

  // Derive windowing indices - clear them when in yearly mode
  const actualStartIndex = zoomLevel === 'yearly' ? null : startIndex
  const actualEndIndex = zoomLevel === 'yearly' ? null : endIndex

  // Mouse wheel zoom handler
  useEffect(() => {
    const chartElement = chartWrapperRef.current
    if (!chartElement) return
    if (projectionLength === 0) return
    if (scrollMode !== 'zoom') return
    if (effectiveResolution !== 'monthly') return

    let isProcessing = false

    const handleWheel = (e: WheelEvent) => {
      if (!chartElement.contains(e.target as Node)) return
      if (isProcessing) return

      isProcessing = true
      setTimeout(() => {
        isProcessing = false
      }, 50)

      const direction = e.deltaY < 0 ? -1 : 1

      const rect = chartElement.getBoundingClientRect()
      const mouseX = e.clientX - rect.left
      const mousePercentage = mouseX / rect.width

      const currentStart = startIndexRef.current ?? 0
      const currentEnd = endIndexRef.current ?? projectionLength - 1
      const currentRange = currentEnd - currentStart + 1
      const centerIndex = Math.floor(currentStart + currentRange * mousePercentage)

      if (direction < 0) {
        const newRange = Math.max(12, Math.floor(currentRange / 1.5))
        const halfRange = Math.floor(newRange / 2)

        let newStart = centerIndex - halfRange
        let newEnd = centerIndex + halfRange

        if (newStart < 0) {
          newStart = 0
          newEnd = Math.min(projectionLength - 1, newRange - 1)
        } else if (newEnd >= projectionLength) {
          newEnd = projectionLength - 1
          newStart = Math.max(0, projectionLength - newRange)
        }

        setZoomRangeStack((prev) => [...prev, currentRange])
        setStartIndex(newStart)
        setEndIndex(newEnd)
        setZoomLevel('monthly')
      } else {
        if (zoomRangeStackRef.current.length > 0) {
          const previousRange = zoomRangeStackRef.current[zoomRangeStackRef.current.length - 1]
          setZoomRangeStack((prev) => prev.slice(0, -1))

          if (previousRange >= projectionLength - 6) {
            setStartIndex(null)
            setEndIndex(null)
            setZoomLevel('yearly')
            return
          }

          const halfRange = Math.floor(previousRange / 2)
          const newStart = Math.max(0, centerIndex - halfRange)
          const newEnd = Math.min(projectionLength - 1, centerIndex + halfRange)

          setStartIndex(newStart)
          setEndIndex(newEnd)
          setZoomLevel('monthly')
        } else {
          setStartIndex(null)
          setEndIndex(null)
          setZoomLevel('yearly')
        }
      }
    }

    chartElement.addEventListener('wheel', handleWheel, { passive: false })
    return () => chartElement.removeEventListener('wheel', handleWheel)
  }, [scrollMode, effectiveResolution, projectionLength, setZoomLevel, chartWrapperRef])

  // Drag-to-pan handler
  useEffect(() => {
    const chartElement = chartWrapperRef.current
    if (!chartElement) return
    if (effectiveResolution !== 'monthly') return
    if (startIndexRef.current === null || endIndexRef.current === null) return

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
      const indexDelta = Math.round(-deltaX / pixelsPerIndex)

      const newStart = Math.max(
        0,
        Math.min(projectionLength - dataRange, dragStartData.startIdx + indexDelta)
      )
      const newEnd = newStart + dataRange

      setStartIndex(newStart)
      setEndIndex(newEnd)
    }

    const handleMouseUp = () => {
      isDragging = false
      dragStartData = null
      chartElement.style.cursor = 'grab'
    }

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
  }, [effectiveResolution, projectionLength, chartWrapperRef])

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
  }, [effectiveResolution, projectionLength, startIndex, endIndex, setZoomLevel])

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
      return
    }

    const halfRange = Math.floor(newRange / 2)
    const newStart = Math.max(0, centerIndex - halfRange)
    const newEnd = Math.min(projectionLength - 1, centerIndex + halfRange)

    setStartIndex(newStart)
    setEndIndex(newEnd)
    setZoomLevel('monthly')
  }, [effectiveResolution, projectionLength, startIndex, endIndex, setZoomLevel])

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
  }
}
