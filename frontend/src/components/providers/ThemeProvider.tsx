'use client'

import { useEffect, useState, ReactNode } from 'react'
import { useColorScheme } from '@/stores'

interface ThemeProviderProps {
  children: ReactNode
}

/**
 * ThemeProvider - Applies the color scheme class to the document root.
 *
 * This component handles:
 * - Reading the color scheme from Zustand store (with localStorage persistence)
 * - Applying 'dark' or 'monet' class to the <html> element
 * - Handling hydration to prevent flash of wrong theme
 */
export function ThemeProvider({ children }: ThemeProviderProps) {
  const colorScheme = useColorScheme()
  const [mounted, setMounted] = useState(false)

  // Handle hydration - only apply theme class after mount to avoid mismatch
  useEffect(() => {
    setMounted(true)
  }, [])

  // Apply theme class to document root
  useEffect(() => {
    if (!mounted) return

    const root = document.documentElement

    // Remove existing theme classes
    root.classList.remove('dark', 'monet')

    // Add current theme class
    root.classList.add(colorScheme)

    // Update body background based on theme
    if (colorScheme === 'monet') {
      document.body.style.background = 'linear-gradient(135deg, #FAF8F5 0%, #F0F4F8 50%, #FFFEF9 100%)'
      document.body.style.color = '#3D3D3D'
    } else {
      document.body.style.background = '#000'
      document.body.style.color = '#fff'
    }
  }, [colorScheme, mounted])

  return <>{children}</>
}
