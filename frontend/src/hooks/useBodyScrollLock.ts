import { useEffect, useRef } from 'react'

// Counter to handle nested locks
let activeLocksCount = 0
let originalStyles: {
  paddingRight: string
  overflow: string
  position: string
  top: string
  width: string
} | null = null

export function useBodyScrollLock(isLocked: boolean = false) {
  const scrollPositionRef = useRef(0)

  useEffect(() => {
    if (!isLocked) return

    const body = document.body
    const html = document.documentElement

    // Store scroll position before locking
    scrollPositionRef.current = window.scrollY

    // Calculate scrollbar width
    const scrollbarWidth = window.innerWidth - html.clientWidth

    // If this is the first lock, save original styles
    if (activeLocksCount === 0) {
      originalStyles = {
        paddingRight: body.style.paddingRight,
        overflow: body.style.overflow,
        position: body.style.position,
        top: body.style.top,
        width: body.style.width,
      }

      // Apply scroll lock styles
      body.style.position = 'fixed'
      body.style.top = `-${scrollPositionRef.current}px`
      body.style.width = '100%'
      body.style.overflow = 'hidden'

      // Add padding to compensate for scrollbar
      if (scrollbarWidth > 0) {
        const currentPadding = parseInt(originalStyles.paddingRight || '0', 10)
        body.style.paddingRight = `${currentPadding + scrollbarWidth}px`
      }
    }

    activeLocksCount++

    return () => {
      activeLocksCount--

      // Only restore styles when all locks are released
      if (activeLocksCount === 0 && originalStyles) {
        body.style.paddingRight = originalStyles.paddingRight
        body.style.overflow = originalStyles.overflow
        body.style.position = originalStyles.position
        body.style.top = originalStyles.top
        body.style.width = originalStyles.width

        // Restore scroll position
        window.scrollTo(0, scrollPositionRef.current)

        originalStyles = null
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