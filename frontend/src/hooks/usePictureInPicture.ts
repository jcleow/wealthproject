"use client"

import { useEffect, useState, useRef, type RefObject } from 'react'

interface UsePictureInPictureOptions {
  /** Whether the PiP feature is enabled */
  enabled: boolean
  /** Threshold for when to show PiP (0-1, default 0.1 means show when less than 10% visible) */
  threshold?: number
}

interface UsePictureInPictureReturn {
  /** Ref to attach to the element being observed */
  targetRef: RefObject<HTMLDivElement>
  /** Whether the PiP should be shown */
  showPiP: boolean
  /** Manually dismiss the PiP */
  dismissPiP: () => void
}

/**
 * Hook to manage picture-in-picture behavior using Intersection Observer.
 * Shows PiP when the target element scrolls mostly out of view.
 */
export function usePictureInPicture({
  enabled,
  threshold = 0.1,
}: UsePictureInPictureOptions): UsePictureInPictureReturn {
  const targetRef = useRef<HTMLDivElement>(null)
  const [isVisible, setIsVisible] = useState(true)
  const [isDismissed, setIsDismissed] = useState(false)

  useEffect(() => {
    if (!enabled) {
      setIsVisible(true)
      setIsDismissed(false)
      return
    }

    const target = targetRef.current
    if (!target) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        // Element is "visible" if intersection ratio is above threshold
        const visible = entry.intersectionRatio > threshold
        setIsVisible(visible)

        // Reset dismissed state when element comes back into view
        if (visible) {
          setIsDismissed(false)
        }
      },
      {
        threshold: [0, threshold, 0.5, 1],
        rootMargin: '0px',
      }
    )

    observer.observe(target)

    return () => {
      observer.disconnect()
    }
  }, [enabled, threshold])

  const showPiP = enabled && !isVisible && !isDismissed

  const dismissPiP = () => {
    setIsDismissed(true)
  }

  return {
    targetRef: targetRef as RefObject<HTMLDivElement>,
    showPiP,
    dismissPiP,
  }
}
