'use client'

import { useState, useCallback, useEffect, useRef, type ReactNode } from 'react'

const MIN_HEIGHT = 100
const MAX_HEIGHT = 1200

interface ResizableCardProps {
  id: string
  children: ReactNode
  disabled?: boolean
  isCollapsed?: boolean
}

export function ResizableCard({ id, children, disabled = false, isCollapsed = false }: ResizableCardProps) {
  const contentRef = useRef<HTMLDivElement>(null)
  const [userHeight, setUserHeight] = useState<number | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const isDraggingRef = useRef(false)
  const dragStartY = useRef(0)
  const dragStartHeight = useRef(0)
  const currentHeightRef = useRef<number | null>(null)

  // Keep ref in sync with state
  useEffect(() => {
    currentHeightRef.current = userHeight
  }, [userHeight])

  // Save height to localStorage
  const saveHeight = useCallback((height: number) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(`card-height-${id}`, height.toString())
    }
  }, [id])

  // Get current content height for drag constraints
  const getContentHeight = useCallback(() => {
    return contentRef.current?.scrollHeight ?? MIN_HEIGHT
  }, [])

  // Handle drag start
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (disabled || isCollapsed) return

    e.preventDefault()
    e.stopPropagation()
    const target = e.currentTarget as HTMLElement
    target.setPointerCapture(e.pointerId)
    isDraggingRef.current = true
    setIsDragging(true)
    dragStartY.current = e.clientY
    dragStartHeight.current = currentHeightRef.current ?? getContentHeight()
  }, [disabled, isCollapsed, getContentHeight])

  // Handle pointer move during drag
  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDraggingRef.current) return
    const deltaY = e.clientY - dragStartY.current
    // Use MIN_HEIGHT as the minimum, not content height - allows shrinking below content
    const newHeight = Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, dragStartHeight.current + deltaY))
    setUserHeight(newHeight)
    currentHeightRef.current = newHeight
  }, [])

  // Handle pointer up to end drag
  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (!isDraggingRef.current) return
    const target = e.currentTarget as HTMLElement
    target.releasePointerCapture(e.pointerId)
    isDraggingRef.current = false
    setIsDragging(false)
    if (currentHeightRef.current !== null) {
      saveHeight(currentHeightRef.current)
    }
  }, [saveHeight])

  // Prevent click events from bubbling
  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
  }, [])

  // If disabled, just render children with no wrapper at all
  if (disabled) {
    return <>{children}</>
  }

  // Show drag handle only when expanded and has content
  const showDragHandle = !isCollapsed

  // Calculate style - use userHeight if set, otherwise auto
  const style = !isCollapsed && userHeight !== null ? { height: userHeight } : undefined

  return (
    <div
      ref={contentRef}
      className={`group/card relative h-full ${!isCollapsed && userHeight !== null ? 'overflow-hidden' : ''}`}
      style={style}
    >
      {children}
      {showDragHandle && (
        <div
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onClick={handleClick}
          className={`
            absolute bottom-0 left-0 right-0
            flex items-center justify-center
            h-5 z-10
            opacity-0 group-hover/card:opacity-100 hover:!opacity-100
            cursor-ns-resize transition-opacity
            touch-none
            ${isDragging ? '!opacity-100' : ''}`}
        >
          <div className="h-1 w-12 rounded-full bg-white/30 hover:bg-white/50 transition-colors" />
        </div>
      )}
    </div>
  )
}
