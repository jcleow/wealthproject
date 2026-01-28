'use client'

import { Sun, Moon } from 'lucide-react'
import clsx from 'clsx'
import { useColorScheme, useColorSchemeActions } from '@/stores'

interface ThemeToggleButtonProps {
  className?: string
  size?: 'sm' | 'md'
}

/**
 * ThemeToggleButton - Toggle between dark and monet (light) themes
 *
 * Displays a sun icon for monet theme and moon icon for dark theme.
 * Clicking toggles between the two themes.
 */
export function ThemeToggleButton({ className, size = 'sm' }: ThemeToggleButtonProps) {
  const colorScheme = useColorScheme()
  const { toggleColorScheme } = useColorSchemeActions()
  const isMonet = colorScheme === 'monet'

  const sizeClasses = size === 'sm' ? 'h-7 w-7' : 'h-8 w-8'
  const iconSize = size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4'

  return (
    <button
      type="button"
      onClick={toggleColorScheme}
      className={clsx(
        'flex items-center justify-center',
        sizeClasses,
        'rounded-full',
        'transition-all duration-200',
        isMonet
          ? 'bg-amber-100 hover:bg-amber-200 text-amber-600'
          : 'hover:bg-white/5 text-slate-500 hover:text-slate-300',
        className
      )}
      title={isMonet ? 'Switch to dark mode' : 'Switch to light mode (Monet)'}
      aria-label={isMonet ? 'Switch to dark mode' : 'Switch to light mode'}
      data-testid="theme-toggle"
    >
      {isMonet ? (
        <Sun className={iconSize} />
      ) : (
        <Moon className={iconSize} />
      )}
    </button>
  )
}
