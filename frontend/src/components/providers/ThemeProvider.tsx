'use client'

import { useEffect } from 'react'
import { useColorScheme } from '@/stores'

/**
 * ThemeProvider - Applies the current color scheme to the document
 *
 * This component syncs the Zustand color scheme state with the document's
 * class list, enabling CSS-based theme switching.
 *
 * Usage: Wrap your app with this provider in the root layout.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const colorScheme = useColorScheme()

  useEffect(() => {
    const root = document.documentElement

    // Remove existing theme classes
    root.classList.remove('dark', 'monet')

    // Add current theme class
    root.classList.add(colorScheme)

    // Update body background for smooth transitions
    if (colorScheme === 'monet') {
      document.body.style.backgroundColor = '#f8f6f3'
      document.body.style.color = '#3D3D3D'
    } else {
      document.body.style.backgroundColor = '#000000'
      document.body.style.color = '#ffffff'
    }
  }, [colorScheme])

  return <>{children}</>
}
