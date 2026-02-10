// =============================================================================
// Unified dark theme tokens for the insurance module.
//
// Consolidates tokens previously duplicated across PolicyDetailModal,
// AddPolicyModal, and JourneyTab into a single source of truth.
//
// textPrimary uses '#F0F0F0' (fixing the AddPolicyModal inconsistency
// which previously used '#E8E6E1').
// =============================================================================

export const INSURANCE_DARK_THEME = {
  // Backgrounds
  modalBg: '#1A1A1D',
  cardBg: '#222226',
  inputBg: '#242428',
  closeBg: '#333338',

  // Borders
  border: '#2D2D33',

  // Text hierarchy (descending prominence)
  textPrimary: '#F0F0F0',
  textSecondary: '#A1A1AA',
  textLabel: '#6B7280',
  textMuted: '#71717A',
  textDim: '#52525B',

  // Semantic colors
  statusGreen: '#22C55E',
  deleteRed: '#C53D43',
  categoryBlue: '#3D5A80',
  linkedPurple: '#A78BFA',
} as const

export type InsuranceDarkTheme = typeof INSURANCE_DARK_THEME
