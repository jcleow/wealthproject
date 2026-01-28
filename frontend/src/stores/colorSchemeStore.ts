import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import { useShallow } from 'zustand/react/shallow'

/**
 * Color Scheme Types
 * - 'dark': Default glassmorphic dark theme with emerald/blue accents
 * - 'monet': Impressionist-inspired light theme with lavender/sage/coral accents
 */
export type ColorScheme = 'dark' | 'monet'

/**
 * Color Scheme Store - manages the application's visual theme.
 *
 * Uses localStorage persistence so the user's preference is remembered
 * across sessions.
 */
export interface ColorSchemeState {
  colorScheme: ColorScheme

  // Actions
  setColorScheme: (scheme: ColorScheme) => void
  toggleColorScheme: () => void
}

export const useColorSchemeStore = create<ColorSchemeState>()(
  devtools(
    persist(
      (set) => ({
        colorScheme: 'dark',

        setColorScheme: (scheme) => set({ colorScheme: scheme }),

        toggleColorScheme: () =>
          set((state) => ({
            colorScheme: state.colorScheme === 'dark' ? 'monet' : 'dark',
          })),
      }),
      {
        name: 'color-scheme-storage',
      }
    ),
    { name: 'ColorSchemeStore' }
  )
)

// Selector hooks for optimized re-renders
export const useColorScheme = () => useColorSchemeStore((s) => s.colorScheme)
export const useColorSchemeActions = () =>
  useColorSchemeStore(
    useShallow((s) => ({
      setColorScheme: s.setColorScheme,
      toggleColorScheme: s.toggleColorScheme,
    }))
  )
