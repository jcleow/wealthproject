// CPF Utility Functions
// Adapters and helpers for converting between database and legacy CPF types

import type { CPFAccount, CPFProfile, ResidencyStatus } from '@/types/cpf'

/**
 * Compute age from date of birth
 * @param dateOfBirth - ISO date string (YYYY-MM-DD)
 * @returns Age in years
 */
export function computeAgeFromDob(dateOfBirth: string): number {
  const today = new Date()
  const birthDate = new Date(dateOfBirth)
  let age = today.getFullYear() - birthDate.getFullYear()
  const monthDiff = today.getMonth() - birthDate.getMonth()

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--
  }

  return age
}

/**
 * Map database residency status to legacy CPFProfile format
 * Database stores: 'citizen' | 'pr'
 * Legacy format: 'CITIZEN' | 'PR_YEAR_1' | 'PR_YEAR_2' | 'PR_YEAR_3_PLUS'
 */
export function mapResidencyStatus(
  residencyStatus: ResidencyStatus,
  prGrantDate?: string | null
): CPFProfile['residencyStatus'] {
  if (residencyStatus === 'citizen') {
    return 'CITIZEN'
  }

  // For PR, compute the year based on prGrantDate
  if (!prGrantDate) {
    // If no grant date, assume 3+ years
    return 'PR_YEAR_3_PLUS'
  }

  const grantDate = new Date(prGrantDate)
  const today = new Date()
  const yearsAsPR = today.getFullYear() - grantDate.getFullYear()

  if (yearsAsPR < 1) {
    return 'PR_YEAR_1'
  } else if (yearsAsPR < 2) {
    return 'PR_YEAR_2'
  } else {
    return 'PR_YEAR_3_PLUS'
  }
}

/**
 * Convert database CPFAccount to legacy CPFProfile
 * Used by CPF simulation components that expect the legacy format
 */
export function cpfAccountToProfile(
  account: CPFAccount,
  simulatedAge?: number
): CPFProfile {
  const actualAge = computeAgeFromDob(account.dateOfBirth)
  const age = simulatedAge ?? actualAge

  return {
    id: account.id,
    dateOfBirth: account.dateOfBirth,
    age,
    residencyStatus: mapResidencyStatus(account.residencyStatus, account.prGrantDate),
    balances: {
      oa: account.oaBalance,
      sa: account.saBalance,
      ma: account.maBalance,
      ra: account.raBalance,
    },
    // Default income values - could be linked to income records in future
    monthlyIncome: 8500,
    annualBonus: 25500,
  }
}

/**
 * Format account label for dropdown display
 * Returns just the person name
 */
export function formatAccountLabel(account: CPFAccount): string {
  return account.personName || 'Unknown'
}
