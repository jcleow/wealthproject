/**
 * Shared CPF borrower calculation utilities
 * Used by PropertyCPFDetail, CPFTabContent, and CPFPropertyOverview
 */

import { CPF_OA_INTEREST_RATE } from './constants'
import type { CPFAccount } from '@/types/cpf'

/**
 * Data structure for a single borrower's CPF usage
 */
export interface BorrowerCPFData {
  name: string
  downpaymentCpfOa: number
  monthlyCpfOa: number
  totalCpfUsed: number
  accruedInterest: number
}

/**
 * Result of calculating per-borrower CPF usage
 */
export interface BorrowerCalculationResult {
  borrower1: BorrowerCPFData | null
  borrower2: BorrowerCPFData | null
  totalCpfUsed: number
  totalAccruedInterest: number
}

/**
 * Input parameters for borrower calculation
 */
export interface BorrowerCalculationInput {
  /** Borrower 1 CPF account ID */
  borrower1CpfAccountId: string | null | undefined
  /** Borrower 1 downpayment from CPF OA (string from API) */
  borrower1DownpaymentCpfOa: string | null | undefined
  /** Borrower 1 monthly CPF OA contribution (string from API) */
  borrower1MonthlyCpfOa: string | null | undefined

  /** Borrower type: 'single' or 'joint' */
  borrowerType: 'single' | 'joint'
  /** Borrower 2 CPF account ID (for joint) */
  borrower2CpfAccountId?: string | null
  /** Borrower 2 downpayment from CPF OA (string from API) */
  borrower2DownpaymentCpfOa?: string | null
  /** Borrower 2 monthly CPF OA contribution (string from API) */
  borrower2MonthlyCpfOa?: string | null

  /** Number of months property is held */
  holdingMonths: number

  /** CPF account lookup map for person names */
  accountMap: Map<string, CPFAccount>

  /** Total accrued interest from backend (if available) */
  backendTotalInterest: number | null
}

/**
 * Calculate per-borrower CPF usage with accurate compound interest from backend.
 * Falls back to simple interest calculation when backend data is unavailable.
 *
 * @param input - The borrower calculation input parameters
 * @returns Calculated borrower data with CPF usage and interest
 */
export function calculateBorrowerCPFUsage(input: BorrowerCalculationInput): BorrowerCalculationResult {
  const {
    borrower1CpfAccountId,
    borrower1DownpaymentCpfOa,
    borrower1MonthlyCpfOa,
    borrowerType,
    borrower2CpfAccountId,
    borrower2DownpaymentCpfOa,
    borrower2MonthlyCpfOa,
    holdingMonths,
    accountMap,
    backendTotalInterest,
  } = input

  // Calculate borrower 1 totals
  const b1DownpaymentOa = parseFloat(borrower1DownpaymentCpfOa || '0')
  const b1MonthlyOa = parseFloat(borrower1MonthlyCpfOa || '0')
  const b1TotalUsed = b1DownpaymentOa + (b1MonthlyOa * holdingMonths)

  // Calculate borrower 2 totals (only for joint ownership)
  const isJoint = borrowerType === 'joint' && !!borrower2CpfAccountId
  const b2DownpaymentOa = isJoint ? parseFloat(borrower2DownpaymentCpfOa || '0') : 0
  const b2MonthlyOa = isJoint ? parseFloat(borrower2MonthlyCpfOa || '0') : 0
  const b2TotalUsed = b2DownpaymentOa + (b2MonthlyOa * holdingMonths)

  // Calculate proportional interest for each borrower
  const { b1Interest, b2Interest } = calculateProportionalInterest(
    b1TotalUsed,
    b2TotalUsed,
    holdingMonths,
    backendTotalInterest
  )

  // Build borrower 1 data
  const borrower1Data: BorrowerCPFData | null = borrower1CpfAccountId ? {
    name: accountMap.get(borrower1CpfAccountId)?.personName || 'Borrower 1',
    downpaymentCpfOa: b1DownpaymentOa,
    monthlyCpfOa: b1MonthlyOa,
    totalCpfUsed: b1TotalUsed,
    accruedInterest: b1Interest,
  } : null

  // Build borrower 2 data (only for joint ownership)
  const borrower2Data: BorrowerCPFData | null = isJoint && borrower2CpfAccountId ? {
    name: accountMap.get(borrower2CpfAccountId)?.personName || 'Borrower 2',
    downpaymentCpfOa: b2DownpaymentOa,
    monthlyCpfOa: b2MonthlyOa,
    totalCpfUsed: b2TotalUsed,
    accruedInterest: b2Interest,
  } : null

  return {
    borrower1: borrower1Data,
    borrower2: borrower2Data,
    totalCpfUsed: b1TotalUsed + b2TotalUsed,
    totalAccruedInterest: b1Interest + b2Interest,
  }
}

/**
 * Result of proportional interest calculation for two borrowers
 */
export interface ProportionalInterestResult {
  b1Interest: number
  b2Interest: number
}

/**
 * Calculate proportional interest for two borrowers based on their CPF usage.
 * Uses backend interest when available, otherwise falls back to simple interest.
 *
 * @param b1Total - Borrower 1 total CPF used
 * @param b2Total - Borrower 2 total CPF used (0 if single borrower)
 * @param holdingMonths - Number of months property is held
 * @param backendTotalInterest - Total interest from backend (null if unavailable)
 * @returns Proportional interest for each borrower
 */
export function calculateProportionalInterest(
  b1Total: number,
  b2Total: number,
  holdingMonths: number,
  backendTotalInterest: number | null
): ProportionalInterestResult {
  const combinedTotal = b1Total + b2Total
  const b1Ratio = combinedTotal > 0 ? b1Total / combinedTotal : 1
  const b2Ratio = combinedTotal > 0 ? b2Total / combinedTotal : 0

  const b1Interest = backendTotalInterest !== null
    ? backendTotalInterest * b1Ratio
    : b1Total * CPF_OA_INTEREST_RATE * (holdingMonths / 12)
  const b2Interest = backendTotalInterest !== null
    ? backendTotalInterest * b2Ratio
    : b2Total * CPF_OA_INTEREST_RATE * (holdingMonths / 12)

  return { b1Interest, b2Interest }
}

/**
 * Calculate the number of holding months between two dates.
 *
 * @param startDate - The start date (purchase/key collection date)
 * @param endDate - The end date (sale date or current date)
 * @returns Number of months, minimum 1
 */
export function calculateHoldingMonths(startDate: Date, endDate: Date): number {
  const months = (endDate.getFullYear() - startDate.getFullYear()) * 12 +
    (endDate.getMonth() - startDate.getMonth())
  return Math.max(months, 1)
}

/**
 * Housing usage response shape (subset of CPFHousingUsageFullResponse)
 * Avoiding direct import to keep this utility lightweight
 */
interface HousingUsageResponseLike {
  usage?: {
    accruedInterest?: {
      totalAccrued?: string
    }
  } | null
}

/**
 * Extract the backend total interest from housing usage response.
 *
 * @param housingUsage - The housing usage response from backend
 * @returns The total accrued interest or null if unavailable
 */
export function extractBackendTotalInterest(
  housingUsage: HousingUsageResponseLike | null | undefined
): number | null {
  const totalAccrued = housingUsage?.usage?.accruedInterest?.totalAccrued
  return totalAccrued ? parseFloat(totalAccrued) : null
}
