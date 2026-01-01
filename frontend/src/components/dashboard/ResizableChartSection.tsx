'use client'

import { useState, useCallback, useEffect, forwardRef, type ReactNode, type Ref } from 'react'
import { ResizableBox, type ResizeCallbackData } from 'react-resizable'
import 'react-resizable/css/styles.css'

const MIN_HEIGHT = 300 // Minimum to still see chart content
const MAX_HEIGHT = 2000 // Allow very tall charts
const STORAGE_KEY = 'stacked-chart-height-v3' // v3 to reset old stored heights
const DEFAULT_HEIGHT_RATIO = 0.5 // 50% of viewport height

interface ResizableChartSectionProps {
  children: ReactNode
  chartRef?: Ref<HTMLDivElement>
}

// Calculate default height based on viewport (40% of screen height)
function getDefaultHeight(): number {
  if (typeof window === 'undefined') return 500
  const viewportHeight = window.innerHeight
  const defaultHeight = Math.round(viewportHeight * DEFAULT_HEIGHT_RATIO)
  return Math.max(MIN_HEIGHT, Math.min(defaultHeight, MAX_HEIGHT))
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
    // Clear old storage keys if they exist
    localStorage.removeItem('stacked-chart-height')
    localStorage.removeItem('stacked-chart-height-v2')
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
  // Calculate initial height - 40% of viewport or stored value
  const [height, setHeight] = useState(() => {
    if (typeof window === 'undefined') return 500
    const storedHeight = getStoredHeight()
    if (storedHeight && storedHeight >= MIN_HEIGHT && storedHeight <= MAX_HEIGHT) {
      return storedHeight
    }
    return getDefaultHeight()
  })
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    // Re-check on mount in case SSR value was used
    if (typeof window !== 'undefined') {
      const storedHeight = getStoredHeight()
      if (storedHeight && storedHeight >= MIN_HEIGHT && storedHeight <= MAX_HEIGHT) {
        setHeight(storedHeight)
      } else {
        setHeight(getDefaultHeight())
      }
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
      width={Infinity}
      axis="y"
      minConstraints={[Infinity, MIN_HEIGHT]}
      maxConstraints={[Infinity, MAX_HEIGHT]}
      onResizeStop={handleResizeStop}
      resizeHandles={['s']}
      handle={<ChartResizeHandle />}
      className="!w-full"
      style={{ height, minHeight: height }}
    >
      <div
        ref={chartRef}
        className="group/chart relative flex h-full flex-col overflow-hidden rounded-2xl bg-transparent"
        style={{ height: '100%' }}
      >
        {children}
      </div>
    </ResizableBox>
  )
}
