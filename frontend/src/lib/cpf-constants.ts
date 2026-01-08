/**
 * CPF 2025 Policy Constants
 * Fixed policy values set by CPF Board (not user-adjustable)
 */
export const CPF_CONSTANTS = {
  BRS: 106500, // Basic Retirement Sum
  FRS: 213000, // Full Retirement Sum
  ERS: 426000, // Enhanced Retirement Sum (2x FRS)
  BHS: 75500, // Basic Healthcare Sum
  MRS: 60000, // Minimum for CPF LIFE eligibility
} as const

/**
 * Color scheme for CPF visualizations
 * Consistent across all CPF components
 */
export const CPF_COLORS = {
  sa: '#8b5cf6', // Purple - SA
  oa: '#3b82f6', // Blue - OA
  maOverflow: '#06b6d4', // Cyan - MA overflow
  cash: '#f97316', // Orange - Cash top-up
  ra: '#fbbf24', // Gold - RA (CPF LIFE eligible)
  raRss: '#ef4444', // Red - RA (RSS/shortfall)
  excess: '#22c55e', // Green - Excess (withdrawable)
  ma: '#14b8a6', // Teal - MA (remaining)
} as const

export type TargetSum = 'BRS' | 'FRS' | 'ERS'
