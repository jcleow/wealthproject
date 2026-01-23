import type { ColorScheme } from '@/stores/colorSchemeStore'
import { useColorScheme } from '@/stores'

/**
 * Centralized Theme System
 *
 * Provides theme-aware color palettes for the entire application.
 * Supports both Monet (impressionist light) and Dark modes.
 *
 * Usage:
 *   const { theme, isMonet } = useTheme()
 *   style={{ background: theme.cardBg, color: theme.textPrimary }}
 */

export const monetTheme = {
  // ============================================
  // BACKGROUNDS
  // ============================================
  // Panel backgrounds (modals, sidebars, overlays)
  panelBg: 'rgba(255, 255, 255, 0.92)',
  panelBorder: 'rgba(155, 139, 180, 0.15)',

  // Card backgrounds (content containers)
  cardBg: 'rgba(255, 255, 255, 0.7)',
  cardBgHover: 'rgba(255, 255, 255, 0.8)',
  cardBorder: 'rgba(155, 139, 180, 0.15)',
  cardBorderHover: 'rgba(155, 139, 180, 0.25)',

  // Surface backgrounds (subtle sections within cards)
  surfaceBg: 'rgba(255, 255, 255, 0.5)',
  surfaceBorder: 'rgba(155, 139, 180, 0.1)',

  // Control backgrounds (buttons, toggles, tabs)
  controlBg: 'rgba(255, 255, 255, 0.6)',
  controlBorder: 'rgba(155, 139, 180, 0.2)',
  controlBgHover: 'rgba(255, 255, 255, 0.8)',

  // Active/selected state
  activeBg: 'rgba(155, 139, 180, 0.15)',
  activeBorder: 'rgba(155, 139, 180, 0.3)',

  // Hover state
  hoverBg: 'rgba(155, 139, 180, 0.08)',

  // ============================================
  // PRIMARY COLORS - Wisteria/Lavender
  // ============================================
  primary: '#9B8BB4',
  primaryLight: '#C4B8D9',
  primaryDark: '#7A6B94',
  lavender: '#9B8BB4',
  lavenderLight: '#C4B8D9',
  lavenderDark: '#7A6B94',

  // ============================================
  // ACCENT COLORS
  // ============================================
  // Coral Rose (water lily pinks)
  accent: '#E8A898',
  accentLight: '#F5D4CC',
  coralRose: '#E8A898',
  coralRoseLight: '#F5D4CC',

  // Success - Sage Green (lily pads, gardens)
  success: '#7FB285',
  successLight: '#B5D4B8',
  sage: '#7FB285',
  sageLight: '#B5D4B8',
  sageDark: '#5A8A5E',

  // Warning - Soft Amber
  warning: '#D4A574',
  warningLight: '#E8D4BC',
  amber: '#D4A574',
  amberLight: '#E8D4BC',

  // Info - Soft Blue
  info: '#7BA3C9',
  infoLight: '#B8D0E8',
  blue: '#7BA3C9',
  blueLight: '#B8D0E8',

  // Purple accent
  purple: '#A887B3',
  purpleLight: '#D4C0DC',

  // Gold - Sunlight on water
  gold: '#D4C5A9',
  goldLight: '#EDE6D8',
  sunlightGold: '#D4C5A9',
  sunlightGoldLight: '#EDE6D8',

  // ============================================
  // TEXT COLORS
  // ============================================
  textPrimary: '#3D3D3D',
  textSecondary: '#6B6B6B',
  textMuted: '#9B9B9B',
  textOnPrimary: '#ffffff',

  // ============================================
  // SHADOWS
  // ============================================
  shadowSoft: 'rgba(155, 139, 180, 0.12)',
  shadowMedium: 'rgba(155, 139, 180, 0.18)',
  shadowHard: 'rgba(155, 139, 180, 0.25)',

  // ============================================
  // INPUT STYLES
  // ============================================
  inputBg: 'rgba(255, 255, 255, 0.8)',
  inputBorder: 'rgba(155, 139, 180, 0.2)',
  inputBorderFocus: 'rgba(155, 139, 180, 0.4)',
  inputFocusBorder: 'rgba(155, 139, 180, 0.4)', // alias
  inputText: '#3D3D3D',
  inputPlaceholder: '#9B9B9B',

  // ============================================
  // BUTTON STYLES
  // ============================================
  buttonPrimaryBg: 'linear-gradient(145deg, #9B8BB4, #7A6B94)',
  buttonPrimaryText: '#ffffff',
  buttonSecondaryBg: 'rgba(255, 255, 255, 0.7)',
  buttonSecondaryText: '#6B6B6B',
  buttonSecondaryBorder: 'rgba(155, 139, 180, 0.2)',

  // ============================================
  // CHART COLORS (for CPF accounts, etc.)
  // ============================================
  chartOA: '#7BA3C9', // Blue - Ordinary Account
  chartSA: '#7FB285', // Sage - Special Account
  chartMA: '#D4A574', // Amber - MediSave Account
  chartRA: '#9B8BB4', // Lavender - Retirement Account

  // ============================================
  // TYPOGRAPHY
  // ============================================
  fontFamily: "'DM Sans', system-ui, sans-serif",
  fontFamilyDisplay: "'Cormorant Garamond', Georgia, serif",
}

export const darkTheme = {
  // ============================================
  // BACKGROUNDS
  // ============================================
  // Panel backgrounds (modals, sidebars, overlays)
  panelBg: 'rgba(0, 0, 0, 0.8)',
  panelBorder: 'rgba(255, 255, 255, 0.06)',

  // Card backgrounds (content containers)
  cardBg: 'rgba(255, 255, 255, 0.03)',
  cardBgHover: 'rgba(255, 255, 255, 0.05)',
  cardBorder: 'rgba(255, 255, 255, 0.08)',
  cardBorderHover: 'rgba(255, 255, 255, 0.12)',

  // Surface backgrounds (subtle sections within cards)
  surfaceBg: 'rgba(255, 255, 255, 0.02)',
  surfaceBorder: 'rgba(255, 255, 255, 0.04)',

  // Control backgrounds (buttons, toggles, tabs)
  controlBg: 'rgba(255, 255, 255, 0.03)',
  controlBorder: 'rgba(255, 255, 255, 0.08)',
  controlBgHover: 'rgba(255, 255, 255, 0.06)',

  // Active/selected state
  activeBg: 'rgba(255, 255, 255, 0.08)',
  activeBorder: 'rgba(255, 255, 255, 0.15)',

  // Hover state
  hoverBg: 'rgba(255, 255, 255, 0.04)',

  // ============================================
  // PRIMARY COLORS - Emerald
  // ============================================
  primary: '#10b981',
  primaryLight: '#34d399',
  primaryDark: '#059669',
  lavender: '#a78bfa', // Keep for compatibility
  lavenderLight: '#c4b5fd',
  lavenderDark: '#7c3aed',

  // ============================================
  // ACCENT COLORS
  // ============================================
  // Coral/Rose
  accent: '#fb7185',
  accentLight: '#fda4af',
  coralRose: '#fb7185',
  coralRoseLight: '#fda4af',

  // Success - Emerald
  success: '#34d399',
  successLight: '#6ee7b7',
  sage: '#34d399',
  sageLight: '#6ee7b7',
  sageDark: '#059669',

  // Warning - Amber
  warning: '#fbbf24',
  warningLight: '#fcd34d',
  amber: '#fbbf24',
  amberLight: '#fcd34d',

  // Info - Blue
  info: '#60a5fa',
  infoLight: '#93c5fd',
  blue: '#60a5fa',
  blueLight: '#93c5fd',

  // Purple accent
  purple: '#a78bfa',
  purpleLight: '#c4b5fd',

  // Gold
  gold: '#fbbf24',
  goldLight: '#fcd34d',
  sunlightGold: '#fbbf24',
  sunlightGoldLight: '#fcd34d',

  // ============================================
  // TEXT COLORS
  // ============================================
  textPrimary: '#f1f5f9',
  textSecondary: '#94a3b8',
  textMuted: '#64748b',
  textOnPrimary: '#ffffff',

  // ============================================
  // SHADOWS
  // ============================================
  shadowSoft: 'rgba(0, 0, 0, 0.3)',
  shadowMedium: 'rgba(0, 0, 0, 0.5)',
  shadowHard: 'rgba(0, 0, 0, 0.7)',

  // ============================================
  // INPUT STYLES
  // ============================================
  inputBg: 'rgba(255, 255, 255, 0.05)',
  inputBorder: 'rgba(255, 255, 255, 0.1)',
  inputBorderFocus: 'rgba(16, 185, 129, 0.4)',
  inputFocusBorder: 'rgba(16, 185, 129, 0.4)', // alias
  inputText: '#f1f5f9',
  inputPlaceholder: '#64748b',

  // ============================================
  // BUTTON STYLES
  // ============================================
  buttonPrimaryBg: 'linear-gradient(145deg, #10b981, #059669)',
  buttonPrimaryText: '#ffffff',
  buttonSecondaryBg: 'rgba(255, 255, 255, 0.05)',
  buttonSecondaryText: '#94a3b8',
  buttonSecondaryBorder: 'rgba(255, 255, 255, 0.1)',

  // ============================================
  // CHART COLORS (for CPF accounts, etc.)
  // ============================================
  chartOA: '#3b82f6', // Blue - Ordinary Account
  chartSA: '#10b981', // Emerald - Special Account
  chartMA: '#f59e0b', // Amber - MediSave Account
  chartRA: '#8b5cf6', // Purple - Retirement Account

  // ============================================
  // TYPOGRAPHY
  // ============================================
  fontFamily: 'inherit',
  fontFamilyDisplay: 'inherit',
}

export type AppTheme = typeof monetTheme

/**
 * Get theme based on color scheme
 */
export function getTheme(colorScheme: ColorScheme): AppTheme {
  return colorScheme === 'monet' ? monetTheme : darkTheme
}

/**
 * Hook to get the current theme with color scheme detection
 *
 * Usage:
 *   const { theme, isMonet, colorScheme } = useTheme()
 */
export function useTheme() {
  const colorScheme = useColorScheme()
  const isMonet = colorScheme === 'monet'
  const theme = isMonet ? monetTheme : darkTheme

  return {
    theme,
    isMonet,
    colorScheme,
    monetTheme,
    darkTheme,
  }
}

// Re-export for backwards compatibility with insurance-theme imports
export { monetTheme as insuranceMonetTheme, darkTheme as insuranceDarkTheme }
export const getInsuranceTheme = getTheme
export type InsuranceTheme = AppTheme
