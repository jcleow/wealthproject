"use client"

import { useEffect, useRef } from 'react'
import { usePropertyScenarioFormContext } from './usePropertyScenarioFormContext'
import { useIncomesQuery } from '@/hooks/queries/useIncomesQuery'
import { useCpfAccountsQuery } from '@/hooks/queries/useCpfQuery'

/**
 * Find the CPF account ID for a given income source by matching personId.
 */
function findCpfAccountIdForIncome(
  incomeId: string | null | undefined,
  incomes: Array<{ id: string; personId?: string | null }>,
  cpfAccounts: Array<{ id: string; personId?: string | null }>
): string | null {
  if (!incomeId) return null

  // Find the income to get its personId
  const income = incomes.find(i => i.id === incomeId)
  if (!income?.personId) return null

  // Find the CPF account with the same personId
  const cpfAccount = cpfAccounts.find(acc => acc.personId === income.personId)
  return cpfAccount?.id ?? null
}

/**
 * Hook to automatically link CPF refund accounts in sale proceeds
 * based on borrower income selections in the purchase tab.
 *
 * When a borrower's income is selected, their CPF refund destination
 * is auto-populated with the matching CPF account (same person).
 */
export function useSyncCpfRefundAccounts(): void {
  const { watch, setValue, getValues } = usePropertyScenarioFormContext()

  // Fetch incomes and CPF accounts
  const { data: incomes = [] } = useIncomesQuery()
  const { data: cpfAccounts = [] } = useCpfAccountsQuery()

  // Watch borrower income selections
  const inputs = watch('inputs')
  const saleInputs = watch('saleInputs')

  const borrower1IncomeId = inputs.borrower1IncomeId
  const borrower2IncomeId = inputs.borrower2IncomeId
  const borrowerType = inputs.borrowerType

  // Use ref to track previous values to avoid unnecessary updates
  const prevValuesRef = useRef<{
    borrower1IncomeId: string
    borrower2IncomeId: string | null
    borrowerType: 'single' | 'joint'
    incomesLoaded: boolean
    cpfAccountsLoaded: boolean
  } | null>(null)

  useEffect(() => {
    // Wait for data to load
    if (incomes.length === 0 || cpfAccounts.length === 0) return

    const currentValues = {
      borrower1IncomeId,
      borrower2IncomeId,
      borrowerType,
      incomesLoaded: incomes.length > 0,
      cpfAccountsLoaded: cpfAccounts.length > 0,
    }

    const prevValues = prevValuesRef.current

    // Check if borrower 1 income changed or this is first load with data
    const borrower1Changed = !prevValues ||
      prevValues.borrower1IncomeId !== currentValues.borrower1IncomeId ||
      (!prevValues.incomesLoaded && currentValues.incomesLoaded) ||
      (!prevValues.cpfAccountsLoaded && currentValues.cpfAccountsLoaded)

    // Check if borrower 2 income changed
    const borrower2Changed = !prevValues ||
      prevValues.borrower2IncomeId !== currentValues.borrower2IncomeId ||
      prevValues.borrowerType !== currentValues.borrowerType

    // Get current sale inputs
    const currentSaleInputs = getValues('saleInputs')
    let hasChanges = false
    const updatedSaleInputs = { ...currentSaleInputs }

    // Auto-link borrower 1 CPF refund account
    if (borrower1Changed && borrower1IncomeId) {
      const cpfAccountId = findCpfAccountIdForIncome(borrower1IncomeId, incomes, cpfAccounts)
      if (cpfAccountId && currentSaleInputs.borrower1CpfRefundAccountId !== cpfAccountId) {
        updatedSaleInputs.borrower1CpfRefundAccountId = cpfAccountId
        hasChanges = true
      }
    }

    // Auto-link borrower 2 CPF refund account (joint borrowers only)
    if (borrower2Changed && borrowerType === 'joint' && borrower2IncomeId) {
      const cpfAccountId = findCpfAccountIdForIncome(borrower2IncomeId, incomes, cpfAccounts)
      if (cpfAccountId && currentSaleInputs.borrower2CpfRefundAccountId !== cpfAccountId) {
        updatedSaleInputs.borrower2CpfRefundAccountId = cpfAccountId
        hasChanges = true
      }
    }

    // Clear borrower 2 refund account if switched from joint to single
    if (borrowerType === 'single' && currentSaleInputs.borrower2CpfRefundAccountId) {
      updatedSaleInputs.borrower2CpfRefundAccountId = null
      hasChanges = true
    }

    // Apply updates if any
    if (hasChanges) {
      setValue('saleInputs', updatedSaleInputs, { shouldDirty: false })
    }

    // Update ref with current values
    prevValuesRef.current = currentValues
  }, [
    borrower1IncomeId,
    borrower2IncomeId,
    borrowerType,
    incomes,
    cpfAccounts,
    saleInputs,
    setValue,
    getValues,
  ])
}
