import { useState, useEffect } from 'react'

export function useWindowWidth(): number {
  const [width, setWidth] = useState(() => {
    if (typeof window === 'undefined') return 1280
    return window.innerWidth
  })

  useEffect(() => {
    const handleResize = () => setWidth(window.innerWidth)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return width
}
