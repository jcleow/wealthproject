'use client'

import { Moon, Palette } from 'lucide-react'
import clsx from 'clsx'
import { useColorScheme, useColorSchemeActions } from '@/stores'

interface ColorSchemeToggleProps {
  className?: string
}

/**
 * ColorSchemeToggle - Toggles between dark and Monet (impressionist) themes.
 *
 * Displays a contextual icon based on the current theme:
 * - Dark mode: Moon icon
 * - Monet mode: Palette icon (representing the artistic theme)
 */
export function ColorSchemeToggle({ className }: ColorSchemeToggleProps) {
  const colorScheme = useColorScheme()
  const { toggleColorScheme } = useColorSchemeActions()

  const renderIcon = () => {
    const iconClass = 'h-3.5 w-3.5 transition-transform duration-200'

    if (colorScheme === 'dark') {
      return <Moon className={iconClass} />
    }
    return <Palette className={clsx(iconClass, 'rotate-12')} />
  }

  return (
    <button
      type="button"
      onClick={toggleColorScheme}
      className={clsx(
        'flex items-center justify-center',
        'h-7 w-7',
        'rounded-full',
        'hover:bg-white/5',
        'transition-all duration-200',
        colorScheme === 'dark'
          ? 'text-slate-500 hover:text-slate-300'
          : 'text-[var(--monet-lavender)] hover:text-[var(--monet-lavender-dark)]',
        className
      )}
      title={colorScheme === 'dark' ? 'Switch to Monet theme' : 'Switch to dark theme'}
      aria-label={`Current theme: ${colorScheme}. Click to toggle.`}
    >
      {renderIcon()}
    </button>
  )
}
