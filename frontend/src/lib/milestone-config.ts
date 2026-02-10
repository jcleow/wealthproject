import { Baby, Home, Sunset, Calendar, GraduationCap } from 'lucide-react'
import type { CoverageMilestone } from '@/lib/coverage-journey-utils'

// =============================================================================
// Milestone Configuration
//
// Single source of truth for milestone icon and color mappings.
// Replaces the separate getDarkMilestoneIcon / getDarkMilestoneIconBg /
// getDarkMilestoneYearColor and getMilestoneIcon / getMilestoneColor helpers
// that were previously duplicated across dark and light theme branches in
// JourneyTab.tsx.
// =============================================================================

type MilestoneCategory = CoverageMilestone['category']

interface MilestoneThemeColors {
  bg: string
  color: string
  yearColor: string
}

interface MilestoneConfigEntry {
  /** Lucide icon component for dark mode */
  darkIcon: typeof Baby
  /** Lucide icon component for light/Monet mode */
  lightIcon: typeof Baby
  dark: MilestoneThemeColors
  light: {
    bg: string
    border: string
    text: string
  }
}

/**
 * DARK_PALETTE values referenced by milestone dark colors.
 * Kept as constants so consumers do not need to import the full palette.
 */
const DARK_MILESTONE_COLORS = {
  pageBg: '#0a0a0a',
  red: '#D97706',
  blueLifeTpd: '#3D5A80',
  blueLightAccent: '#7CB3D8',
} as const

/**
 * Central mapping: milestone category -> icons and per-theme colors.
 */
export const MILESTONE_CONFIG: Record<MilestoneCategory, MilestoneConfigEntry> = {
  dependent: {
    darkIcon: Baby,
    lightIcon: GraduationCap,
    dark: {
      bg: DARK_MILESTONE_COLORS.blueLifeTpd,
      color: DARK_MILESTONE_COLORS.pageBg,
      yearColor: DARK_MILESTONE_COLORS.blueLightAccent,
    },
    light: {
      bg: 'rgba(59, 130, 246, 0.12)',
      border: 'rgba(59, 130, 246, 0.25)',
      text: '#3B82F6',
    },
  },
  debt: {
    darkIcon: Home,
    lightIcon: Home,
    dark: {
      bg: DARK_MILESTONE_COLORS.red,
      color: DARK_MILESTONE_COLORS.pageBg,
      yearColor: DARK_MILESTONE_COLORS.red,
    },
    light: {
      // Light mode debt colors depend on the active theme object, so we provide
      // placeholder values. Consumers should call getMilestoneColors() which
      // accepts the theme and computes the correct values.
      bg: '',
      border: '',
      text: '',
    },
  },
  retirement: {
    darkIcon: Sunset,
    lightIcon: Sunset,
    dark: {
      bg: DARK_MILESTONE_COLORS.blueLifeTpd,
      color: DARK_MILESTONE_COLORS.pageBg,
      yearColor: DARK_MILESTONE_COLORS.blueLightAccent,
    },
    light: {
      bg: '',
      border: '',
      text: '',
    },
  },
  health: {
    darkIcon: Calendar,
    lightIcon: Calendar,
    dark: {
      bg: DARK_MILESTONE_COLORS.blueLifeTpd,
      color: DARK_MILESTONE_COLORS.pageBg,
      yearColor: DARK_MILESTONE_COLORS.blueLightAccent,
    },
    light: {
      bg: '',
      border: '',
      text: '',
    },
  },
}

/**
 * Get the Lucide icon component for a milestone category.
 */
export function getMilestoneIcon(
  category: MilestoneCategory,
  theme: 'dark' | 'light'
): typeof Baby {
  const config = MILESTONE_CONFIG[category] ?? MILESTONE_CONFIG.health
  return theme === 'dark' ? config.darkIcon : config.lightIcon
}

/**
 * Get milestone colors for a given category and theme.
 *
 * For dark mode, returns { bg, color, yearColor } directly from the config.
 * For light/Monet mode, returns { bg, border, text } computed from the
 * insurance theme object (lavender, sage, amber, etc.).
 */
export function getMilestoneColors(
  category: MilestoneCategory,
  theme: 'dark' | 'light',
  insuranceTheme?: {
    sage: string
    lavender: string
    amber: string
    sunlightGold: string
  },
  isMonet?: boolean,
): { bg: string; color: string; yearColor: string; border?: string; text?: string } {
  const config = MILESTONE_CONFIG[category] ?? MILESTONE_CONFIG.health

  if (theme === 'dark') {
    return config.dark
  }

  // Light / Monet mode -- requires the insurance theme object
  if (!insuranceTheme) {
    return { bg: '', color: '', yearColor: '' }
  }

  switch (category) {
    case 'dependent':
      return {
        bg: isMonet ? 'rgba(59, 130, 246, 0.12)' : 'rgba(59, 130, 246, 0.15)',
        border: 'rgba(59, 130, 246, 0.25)',
        text: '#3B82F6',
        color: '#3B82F6',
        yearColor: '#3B82F6',
      }
    case 'debt':
      return {
        bg: isMonet ? insuranceTheme.sage + '18' : insuranceTheme.sage + '20',
        border: insuranceTheme.sage + '35',
        text: insuranceTheme.sage,
        color: insuranceTheme.sage,
        yearColor: insuranceTheme.sage,
      }
    case 'retirement':
      return {
        bg: isMonet ? insuranceTheme.sunlightGold + '25' : insuranceTheme.amber + '20',
        border: isMonet ? insuranceTheme.sunlightGold + '40' : insuranceTheme.amber + '35',
        text: isMonet ? '#8A7A5A' : insuranceTheme.amber,
        color: isMonet ? '#8A7A5A' : insuranceTheme.amber,
        yearColor: isMonet ? '#8A7A5A' : insuranceTheme.amber,
      }
    default:
      return {
        bg: insuranceTheme.lavender + '15',
        border: insuranceTheme.lavender + '25',
        text: insuranceTheme.lavender,
        color: insuranceTheme.lavender,
        yearColor: insuranceTheme.lavender,
      }
  }
}
