/**
 * CPF Policy Year - the year for which the retirement sums are defined.
 * This value is dynamically set to the current year.
 * When CPF Board publishes new values, they typically apply to the current year.
 * Source: https://www.cpf.gov.sg/service/article/what-are-the-retirement-sums-basic-retirement-sum-brs-full-retirement-sum-frs-and-enhanced-retirement-sum-ers
 */
export const CPF_POLICY_YEAR = new Date().getFullYear()

/**
 * CPF Policy Constants
 * Fixed policy values set by CPF Board (not user-adjustable)
 * Source: https://www.cpf.gov.sg/service/article/what-are-the-retirement-sums-basic-retirement-sum-brs-full-retirement-sum-frs-and-enhanced-retirement-sum-ers
 */
export const CPF_CONSTANTS = {
  BRS: 110200, // Basic Retirement Sum
  FRS: 220400, // Full Retirement Sum (2x BRS)
  ERS: 440800, // Enhanced Retirement Sum (4x BRS from 2025 onwards)
  BHS: 79000, // Basic Healthcare Sum
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
