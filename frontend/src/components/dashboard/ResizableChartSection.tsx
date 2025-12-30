'use client'

import { useState, useCallback, useEffect, forwardRef, type ReactNode, type Ref } from 'react'
import { ResizableBox, type ResizeCallbackData } from 'react-resizable'
import 'react-resizable/css/styles.css'

const DEFAULT_HEIGHT = 500 // Good default for chart visibility
const MIN_HEIGHT = 300 // Minimum to still see chart content
const MAX_HEIGHT = 1200 // Allow very tall charts
const STORAGE_KEY = 'stacked-chart-height'

interface ResizableChartSectionProps {
  children: ReactNode
  chartRef?: Ref<HTMLDivElement>
}

// Custom resize handle for the chart section
const ChartResizeHandle = forwardRef<HTMLDivElement, { handleAxis?: string }>(
  function ChartResizeHandle({ handleAxis, ...props }, ref) {
    return (
      <div
        ref={ref}
        className={`react-resizable-handle react-resizable-handle-${handleAxis}
          absolute bottom-0 left-0 right-0
          flex items-center justify-center
          h-5 z-10
          opacity-0 hover:opacity-100 group-hover/chart:opacity-60
          cursor-ns-resize transition-opacity`}
        {...props}
      >
        <div className="h-1 w-16 rounded-full bg-white/40" />
      </div>
    )
  }
)

function getStoredHeight(): number | null {
  if (typeof window === 'undefined') return null
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? parseInt(stored, 10) : null
  } catch {
    return null
  }
}

function setStoredHeight(height: number) {
  try {
    localStorage.setItem(STORAGE_KEY, height.toString())
  } catch {
    // ignore storage errors
  }
}

export function ResizableChartSection({ children, chartRef }: ResizableChartSectionProps) {
  const [height, setHeight] = useState(DEFAULT_HEIGHT)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const storedHeight = getStoredHeight()
    if (storedHeight && storedHeight >= MIN_HEIGHT && storedHeight <= MAX_HEIGHT) {
      setHeight(storedHeight)
    }
    setMounted(true)
  }, [])

  const handleResizeStop = useCallback(
    (_e: React.SyntheticEvent, data: ResizeCallbackData) => {
      setHeight(data.size.height)
      setStoredHeight(data.size.height)
    },
    []
  )

  return (
    <ResizableBox
      height={height}
      width={10000}
      axis="y"
      minConstraints={[10000, MIN_HEIGHT]}
      maxConstraints={[10000, MAX_HEIGHT]}
      onResizeStop={handleResizeStop}
      resizeHandles={['s']}
      handle={<ChartResizeHandle />}
      className={mounted ? '!w-full' : '!w-full transition-none'}
    >
      <div
        ref={chartRef}
        className="group/chart relative flex h-full flex-col overflow-hidden rounded-2xl bg-transparent"
      >
        {children}
      </div>
    </ResizableBox>
  )
}
