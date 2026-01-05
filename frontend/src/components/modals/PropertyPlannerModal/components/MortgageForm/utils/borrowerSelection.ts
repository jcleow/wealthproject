/**
 * Borrower Selection Utilities
 *
 * Encapsulates the complex logic for handling borrower selection changes,
 * including CPF account matching and OA balance updates.
 */

import type { IncomeOption, ProjectedCpfAccount } from '../types'

/**
 * Find the matching CPF account for an income source based on personId.
 */
export function findCpfAccountForIncome(
  income: IncomeOption,
  cpfAccounts: ProjectedCpfAccount[]
): ProjectedCpfAccount | null {
  if (!income.personId) return null
  return cpfAccounts.find(acc => acc.personId === income.personId) ?? null
}

/**
 * Format income label for dropdown display.
 * Shows person name if present, otherwise falls back to salary name.
 */
export function formatIncomeLabel(income: IncomeOption): string {
  const displayName = income.personName || income.name
  return `${displayName} - $${income.monthlyAmount.toLocaleString()}/mo`
}

/**
 * Result of selecting a borrower income.
 * Contains all the values that need to be updated in the form.
 */
export interface BorrowerSelectionResult {
  incomeId: string
  oaBalance: number
}

/**
 * Process borrower 1 income selection.
 * Returns the values to update and handles CPF account matching.
 */
export function selectBorrower1Income(
  incomeId: string,
  incomes: IncomeOption[],
  cpfAccounts: ProjectedCpfAccount[],
  borrowerType: 'single' | 'joint',
  borrower2OaBalance: number
): {
  borrower1OaBalance: number
  combinedCpfOaBalance: number
} | null {
  const selectedIncome = incomes.find(i => i.id === incomeId)
  if (!selectedIncome) return null

  const matchingCpf = findCpfAccountForIncome(selectedIncome, cpfAccounts)
  if (!matchingCpf) return null

  const oaBalance = matchingCpf.oaBalance
  const combinedBalance = borrowerType === 'joint'
    ? oaBalance + borrower2OaBalance
    : oaBalance

  return {
    borrower1OaBalance: oaBalance,
    combinedCpfOaBalance: combinedBalance,
  }
}

/**
 * Process borrower 2 income selection.
 * Returns the values to update and handles CPF account matching.
 */
export function selectBorrower2Income(
  incomeId: string,
  incomes: IncomeOption[],
  cpfAccounts: ProjectedCpfAccount[],
  borrower1OaBalance: number
): {
  borrower2OaBalance: number
  combinedCpfOaBalance: number
} | null {
  const selectedIncome = incomes.find(i => i.id === incomeId)
  if (!selectedIncome) return null

  const matchingCpf = findCpfAccountForIncome(selectedIncome, cpfAccounts)
  if (!matchingCpf) return null

  const oaBalance = matchingCpf.oaBalance

  return {
    borrower2OaBalance: oaBalance,
    combinedCpfOaBalance: borrower1OaBalance + oaBalance,
  }
}

/**
 * Default OA balance to use when no CPF account is found.
 * Based on typical starting OA balance for new CPF members.
 */
export const DEFAULT_OA_BALANCE = 62400
