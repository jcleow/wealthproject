import { useEffect } from 'react'

// Counter to handle nested locks
let activeLocksCount = 0
let originalOverflow: string | null = null

export function useBodyScrollLock(isLocked: boolean = false) {
  useEffect(() => {
    if (!isLocked) return

    const html = document.documentElement

    // If this is the first lock, save original overflow
    if (activeLocksCount === 0) {
      originalOverflow = html.style.overflow
      html.style.overflow = 'hidden'
    }

    activeLocksCount++

    return () => {
      activeLocksCount--

      // Only restore styles when all locks are released
      if (activeLocksCount === 0 && originalOverflow !== null) {
        html.style.overflow = originalOverflow
        originalOverflow = null
      }
    }
  }, [isLocked])
}

// Alternative: Export a hook that prevents scrolling without layout shifts
export function useScrollLock(isLocked: boolean = false) {
  useEffect(() => {
    if (!isLocked) return

    const preventScroll = (e: Event) => {
      e.preventDefault()
    }

    // Prevent wheel scrolling
    window.addEventListener('wheel', preventScroll, { passive: false })
    window.addEventListener('touchmove', preventScroll, { passive: false })

    return () => {
      window.removeEventListener('wheel', preventScroll)
      window.removeEventListener('touchmove', preventScroll)
    }
  }, [isLocked])
}