/**
 * Property Planner Hooks and Utilities
 *
 * This file exports all hooks, calculations, and constants.
 */

// Calculations
export {
  formatCurrency,
  formatCompactCurrency,
  formatMonthYear,
  calculateMortgage,
  calculateSsdRate,
  calculateCpfAccruedInterest,
  calculateFeeAmount,
  calculateSaleProceeds,
  calculateMonthlyOaInflow,
} from './useCalculations'

// Constants
export {
  DEFAULT_SALE_FEES,
  DEFAULT_PURCHASE_FEES,
  DEFAULT_APPRECIATION_PERIODS,
  FORM_STEPS,
  SALE_FORM_STEPS,
  createDefaultLoanSegment,
  defaultInputsByType,
} from './constants'
