'use client'

import { useState, useCallback, type ReactNode } from 'react'
import { ResizableBox, type ResizeCallbackData } from 'react-resizable'
import 'react-resizable/css/styles.css'

const DEFAULT_HEIGHT = 350
const MIN_HEIGHT = 200
const MAX_HEIGHT = 800
const STORAGE_KEY = 'financial-card-heights'

interface ResizableCardProps {
  id: string
  children: ReactNode
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

export function ResizableCard({ id, children }: ResizableCardProps) {
  const [height, setHeight] = useState(() => getStoredHeights()[id] ?? DEFAULT_HEIGHT)

  const handleResizeStop = useCallback(
    (_e: React.SyntheticEvent, data: ResizeCallbackData) => {
      setHeight(data.size.height)
      setStoredHeight(id, data.size.height)
    },
    [id]
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
      handle={
        <div className="absolute bottom-0 left-0 right-0 flex h-3 cursor-ns-resize items-center justify-center opacity-0 transition-opacity hover:opacity-100 group-hover/card:opacity-50">
          <div className="h-1 w-12 rounded-full bg-white/20" />
        </div>
      }
    >
      <div className="group/card relative h-full">{children}</div>
    </ResizableBox>
  )
}
