import { useEffect, useRef, useState } from 'react'

export interface UseContainerSizeResult {
  hasSize: boolean
  containerWidth: number
  containerRef: React.RefObject<HTMLDivElement>
}

/**
 * Hook that observes container size changes using ResizeObserver.
 * Uses requestAnimationFrame debouncing and reference comparison to prevent infinite loops.
 */
export function useContainerSize(): UseContainerSizeResult {
  const containerRef = useRef<HTMLDivElement>(null)
  const [hasSize, setHasSize] = useState(false)
  const [containerWidth, setContainerWidth] = useState(0)

  // Track previous values to avoid unnecessary state updates
  const prevSizeRef = useRef({ hasSize: false, width: 0 })

  useEffect(() => {
    const element = containerRef.current
    if (!element) return

    // Set initial size immediately without observer to prevent loops
    const rect = element.getBoundingClientRect()
    if (rect.width > 0 && rect.height > 0) {
      prevSizeRef.current.hasSize = true
      prevSizeRef.current.width = Math.round(rect.width)
      setHasSize(true)
      setContainerWidth(Math.round(rect.width))
    }

    // Use requestAnimationFrame to debounce resize observations
    let rafId: number | null = null
    const observer = new ResizeObserver(([entry]) => {
      if (rafId) cancelAnimationFrame(rafId)
      rafId = requestAnimationFrame(() => {
        const { width, height } = entry.contentRect
        const newHasSize = width > 0 && height > 0
        const roundedWidth = Math.round(width)

        // Only update state if values actually changed to prevent infinite loops
        if (prevSizeRef.current.hasSize !== newHasSize) {
          prevSizeRef.current.hasSize = newHasSize
          setHasSize(newHasSize)
        }
        if (prevSizeRef.current.width !== roundedWidth) {
          prevSizeRef.current.width = roundedWidth
          setContainerWidth(roundedWidth)
        }
      })
    })

    observer.observe(element)
    return () => {
      if (rafId) cancelAnimationFrame(rafId)
      observer.disconnect()
    }
  }, [])

  return { hasSize, containerWidth, containerRef }
}
