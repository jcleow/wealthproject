'use client'

import { useState, useCallback, useEffect, type ReactNode } from 'react'
import { ResizableBox, type ResizeCallbackData } from 'react-resizable'
import 'react-resizable/css/styles.css'

const DEFAULT_HEIGHT = 350
const MIN_HEIGHT = 200
const MAX_HEIGHT = 800
const STORAGE_KEY = 'financial-card-heights'

interface ResizableCardProps {
  id: string
  children: ReactNode
  disabled?: boolean
}

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

export function ResizableCard({ id, children, disabled = false }: ResizableCardProps) {
  // Initialize with default to match server render, then sync with localStorage
  const [height, setHeight] = useState(DEFAULT_HEIGHT)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const storedHeight = getStoredHeights()[id]
    if (storedHeight) {
      setHeight(storedHeight)
    }
    setMounted(true)
  }, [id])

  const handleResizeStop = useCallback(
    (_e: React.SyntheticEvent, data: ResizeCallbackData) => {
      setHeight(data.size.height)
      setStoredHeight(id, data.size.height)
    },
    [id]
  )

  // In compact mode, don't use resizable box - just render children directly
  if (disabled) {
    return <div className="group/card relative">{children}</div>
  }

  return (
    <ResizableBox
      height={height}
      width={10000}
      axis="y"
      minConstraints={[10000, MIN_HEIGHT]}
      maxConstraints={[10000, MAX_HEIGHT]}
      onResizeStop={handleResizeStop}
      resizeHandles={['s']}
      handle={
        <div className={`absolute bottom-0 left-0 right-0
flex items-center justify-center
h-3
opacity-0 hover:opacity-100 group-hover/card:opacity-50
cursor-ns-resize transition-opacity`}>
          <div className="h-1 w-12 rounded-full bg-white/20" />
        </div>
      }
      className={mounted ? '!w-full' : '!w-full transition-none'}
    >
      <div className="group/card relative h-full">{children}</div>
    </ResizableBox>
  )
}
