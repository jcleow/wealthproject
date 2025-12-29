'use client'

import { useState, useCallback, useEffect, forwardRef, type ReactNode } from 'react'
import { ResizableBox, type ResizeCallbackData } from 'react-resizable'
import 'react-resizable/css/styles.css'

const DEFAULT_HEIGHT = 350
const MIN_HEIGHT = 200
const MAX_HEIGHT = 800
const COLLAPSED_HEIGHT = 52 // Height of just the header when collapsed
const STORAGE_KEY = 'financial-card-heights'

interface ResizableCardProps {
  id: string
  children: ReactNode
  disabled?: boolean
  isCollapsed?: boolean
}

// Custom resize handle that works with react-resizable
const ResizeHandle = forwardRef<HTMLDivElement, { handleAxis?: string }>(
  function ResizeHandle({ handleAxis, ...props }, ref) {
    return (
      <div
        ref={ref}
        className={`react-resizable-handle react-resizable-handle-${handleAxis}
          absolute bottom-0 left-0 right-0
          flex items-center justify-center
          h-4 z-10
          opacity-0 hover:opacity-100 group-hover/card:opacity-60
          cursor-ns-resize transition-opacity`}
        {...props}
      >
        <div className="h-1 w-12 rounded-full bg-white/30" />
      </div>
    )
  }
)

function getStoredHeights(): Record<string, number> {
  if (typeof window === 'undefined') return {}
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? JSON.parse(stored) : {}
  } catch {
    return {}
  }
}

function setStoredHeight(id: string, height: number) {
  try {
    const heights = getStoredHeights()
    heights[id] = height
    localStorage.setItem(STORAGE_KEY, JSON.stringify(heights))
  } catch {
    // ignore storage errors
  }
}

export function ResizableCard({ id, children, disabled = false, isCollapsed = false }: ResizableCardProps) {
  // Initialize with default to match server render, then sync with localStorage
  const [expandedHeight, setExpandedHeight] = useState(DEFAULT_HEIGHT)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const storedHeight = getStoredHeights()[id]
    if (storedHeight) {
      setExpandedHeight(storedHeight)
    }
    setMounted(true)
  }, [id])

  const handleResizeStop = useCallback(
    (_e: React.SyntheticEvent, data: ResizeCallbackData) => {
      // Only save expanded height, not collapsed height
      if (!isCollapsed) {
        setExpandedHeight(data.size.height)
        setStoredHeight(id, data.size.height)
      }
    },
    [id, isCollapsed]
  )

  // In disabled mode, don't use resizable box - just render children directly
  if (disabled) {
    return <div className="group/card relative">{children}</div>
  }

  // When collapsed, use fixed collapsed height; when expanded, use stored/default height
  const currentHeight = isCollapsed ? COLLAPSED_HEIGHT : expandedHeight

  return (
    <ResizableBox
      height={currentHeight}
      width={10000}
      axis="y"
      minConstraints={[10000, isCollapsed ? COLLAPSED_HEIGHT : MIN_HEIGHT]}
      maxConstraints={[10000, isCollapsed ? COLLAPSED_HEIGHT : MAX_HEIGHT]}
      onResizeStop={handleResizeStop}
      resizeHandles={isCollapsed ? [] : ['s']} // Hide resize handle when collapsed
      handle={<ResizeHandle />}
      className={mounted ? '!w-full' : '!w-full transition-none'}
    >
      <div className="group/card relative h-full">{children}</div>
    </ResizableBox>
  )
}
