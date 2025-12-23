/**
 * Finebank Design System Tokens
 *
 * Extracted from Figma: FIneback-Trial
 * These tokens map directly to Figma variables for consistency.
 */

// =============================================================================
// COLOR TOKENS
// =============================================================================

export const colors = {
  // Brand Colors
  primary: '#299D91',        // Primary teal - buttons, active states, accents
  secondary: '#525256',      // Secondary text, icons

  // Neutrals - Gray Scale
  gray: {
    '01': '#666666',         // Dark gray text
    '02': '#878787',         // Section headers, muted text
    '03': '#9F9F9F',         // Placeholder text, tertiary
    '04': '#D1D1D1',         // Disabled states
    '05': '#E8E8E8',         // Borders, dividers
    '06': '#F3F3F3',         // Light borders
  },

  // Base Colors
  black: '#191919',          // Default black - headings, primary text
  white: '#FFFFFF',          // White

  // Special Colors
  special: {
    red: '#E73D1C',          // Error, negative change, alerts
    green: '#4DAF6E',        // Success, positive change
    bg: 'rgba(210, 210, 210, 0.25)',  // Icon backgrounds (D2D2D2 at 25%)
    bg2: '#FFFFFF',          // Card backgrounds
    bg3: '#FFFFFF',          // Modal backgrounds
    mainBg: '#F4F5F7',       // Page background
  },
} as const

// =============================================================================
// TYPOGRAPHY TOKENS
// =============================================================================

export const fontFamily = {
  primary: "'Inter', sans-serif",
  logo: "'Poppins', sans-serif",
} as const

export const fontWeight = {
  regular: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
  extrabold: 800,
} as const

export const typography = {
  // Headers
  'header-22-32': {
    fontFamily: fontFamily.primary,
    fontSize: '22px',
    fontWeight: fontWeight.regular,
    lineHeight: '32px',
    letterSpacing: '0',
  },
  'exbold-22-32': {
    fontFamily: fontFamily.primary,
    fontSize: '22px',
    fontWeight: fontWeight.extrabold,
    lineHeight: '32px',
    letterSpacing: '0',
  },
  'bold-24-28': {
    fontFamily: fontFamily.primary,
    fontSize: '24px',
    fontWeight: fontWeight.bold,
    lineHeight: '28px',
    letterSpacing: '0',
  },

  // Body Text
  'bold-16-24': {
    fontFamily: fontFamily.primary,
    fontSize: '16px',
    fontWeight: fontWeight.bold,
    lineHeight: '24px',
    letterSpacing: '0',
  },
  'semibold-16-24': {
    fontFamily: fontFamily.primary,
    fontSize: '16px',
    fontWeight: fontWeight.semibold,
    lineHeight: '24px',
    letterSpacing: '0',
  },
  'regular-16-24': {
    fontFamily: fontFamily.primary,
    fontSize: '16px',
    fontWeight: fontWeight.regular,
    lineHeight: '24px',
    letterSpacing: '0',
  },

  // Small Text
  'medium-14-20': {
    fontFamily: fontFamily.primary,
    fontSize: '14px',
    fontWeight: fontWeight.medium,
    lineHeight: '20px',
    letterSpacing: '0',
  },
  'regular-14-20': {
    fontFamily: fontFamily.primary,
    fontSize: '14px',
    fontWeight: fontWeight.regular,
    lineHeight: '20px',
    letterSpacing: '0',
  },

  // Caption Text
  'medium-12-16': {
    fontFamily: fontFamily.primary,
    fontSize: '12px',
    fontWeight: fontWeight.medium,
    lineHeight: '16px',
    letterSpacing: '0',
  },
  'regular-12-16': {
    fontFamily: fontFamily.primary,
    fontSize: '12px',
    fontWeight: fontWeight.regular,
    lineHeight: '16px',
    letterSpacing: '0',
  },
} as const

// =============================================================================
// SHADOW TOKENS
// =============================================================================

export const shadows = {
  // Card shadow - subtle elevation
  'shadow-01': '0px 20px 25px 0px rgba(76, 103, 100, 0.1)',

  // Search bar shadow - very subtle
  'shadow-search': '0px 26px 26px 0px rgba(106, 22, 58, 0.04)',
} as const

// =============================================================================
// SPACING TOKENS
// =============================================================================

export const spacing = {
  '0': '0px',
  '1': '4px',
  '2': '8px',
  '3': '12px',
  '4': '16px',
  '5': '20px',
  '6': '24px',
  '8': '32px',
  '10': '40px',
  '12': '48px',
} as const

// =============================================================================
// BORDER RADIUS TOKENS
// =============================================================================

export const borderRadius = {
  sm: '4px',
  md: '8px',
  lg: '12px',
  xl: '16px',
  full: '9999px',
} as const

// =============================================================================
// TAILWIND-COMPATIBLE CSS VARIABLES
// =============================================================================

export const cssVariables = `
  :root {
    /* Colors */
    --color-primary: ${colors.primary};
    --color-secondary: ${colors.secondary};
    --color-black: ${colors.black};
    --color-white: ${colors.white};

    /* Grays */
    --color-gray-01: ${colors.gray['01']};
    --color-gray-02: ${colors.gray['02']};
    --color-gray-03: ${colors.gray['03']};
    --color-gray-04: ${colors.gray['04']};
    --color-gray-05: ${colors.gray['05']};
    --color-gray-06: ${colors.gray['06']};

    /* Special */
    --color-red: ${colors.special.red};
    --color-green: ${colors.special.green};
    --color-bg: ${colors.special.mainBg};
    --color-icon-bg: ${colors.special.bg};

    /* Shadows */
    --shadow-card: ${shadows['shadow-01']};
    --shadow-search: ${shadows['shadow-search']};

    /* Typography */
    --font-primary: ${fontFamily.primary};
    --font-logo: ${fontFamily.logo};
  }
`

// =============================================================================
// SEMANTIC TOKENS (Component-level mappings)
// =============================================================================

export const semantic = {
  // Text colors
  text: {
    primary: colors.black,
    secondary: colors.secondary,
    muted: colors.gray['02'],
    placeholder: colors.gray['03'],
    disabled: colors.gray['04'],
    inverse: colors.white,
  },

  // Background colors
  background: {
    page: colors.special.mainBg,
    card: colors.white,
    sidebar: colors.black,
    icon: colors.special.bg,
    hover: colors.gray['06'],
  },

  // Border colors
  border: {
    default: colors.gray['05'],
    light: colors.gray['06'],
  },

  // Interactive states
  interactive: {
    default: colors.primary,
    hover: '#238a80',  // Slightly darker primary
    active: '#1d756d', // Even darker
    disabled: colors.gray['04'],
  },

  // Feedback colors
  feedback: {
    success: colors.special.green,
    error: colors.special.red,
    warning: '#F59E0B',
    info: colors.primary,
  },
} as const

// =============================================================================
// EXPORT ALL
// =============================================================================

export const finebankTokens = {
  colors,
  fontFamily,
  fontWeight,
  typography,
  shadows,
  spacing,
  borderRadius,
  semantic,
} as const

export default finebankTokens
