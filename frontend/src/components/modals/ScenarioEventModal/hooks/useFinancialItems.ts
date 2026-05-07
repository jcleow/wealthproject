import { useMemo, useCallback } from 'react'
import { useAssetsQuery } from '@/hooks/queries/useAssetsQuery'
import { useLiabilitiesQuery } from '@/hooks/queries/useLiabilitiesQuery'
import { useIncomesQuery } from '@/hooks/queries/useIncomesQuery'
import { useExpensesQuery } from '@/hooks/queries/useExpensesQuery'
import { useInvestmentsQuery } from '@/hooks/queries/useInvestmentsQuery'
import { useCashAccountsQuery } from '@/hooks/queries/useCashAccountsQuery'
import type { Asset, Liability, Income, Expense, CashAccount } from '@/types/financial'
import type { Investment } from '@/api/financial/investments'

export type FinancialItem = { id: string; name: string; amount: number; frequency?: string }

export interface UseFinancialItemsReturn {
  assets: Asset[]
  liabilities: Liability[]
  incomes: Income[]
  expenses: Expense[]
  investments: Investment[]
  cashAccounts: CashAccount[]
  financialDataLoading: boolean
  investmentsLoading: boolean
  cashAccountsLoading: boolean
  allFinancialDataLoading: boolean
  getItemsForType: (targetType: string) => FinancialItem[]
  resolveStableTargetId: (targetType: string, targetId?: string) => string | undefined
  isLoadingForType: (targetType: string, items: FinancialItem[]) => boolean
}

/**
 * Hook for accessing financial items in the ScenarioEventModal.
 * Lazily fetches v1 financial data only when this modal is rendered.
 */
export function useFinancialItems(): UseFinancialItemsReturn {
  // These queries are only triggered when this hook is used (i.e., modal is open)
  const assetsQuery = useAssetsQuery()
  const liabilitiesQuery = useLiabilitiesQuery()
  const incomesQuery = useIncomesQuery()
  const expensesQuery = useExpensesQuery()
  const investmentsQuery = useInvestmentsQuery({ enabled: true })
  const cashAccountsQuery = useCashAccountsQuery()

  const assets = assetsQuery.data ?? []
  const liabilities = liabilitiesQuery.data ?? []
  const incomes = incomesQuery.data ?? []
  const expenses = expensesQuery.data?.expenses ?? []
  const investments = investmentsQuery.data ?? []
  const cashAccounts = cashAccountsQuery.data ?? []

  const financialDataLoading = assetsQuery.isLoading || liabilitiesQuery.isLoading ||
                                incomesQuery.isLoading || expensesQuery.isLoading
  const investmentsLoading = investmentsQuery.isLoading
  const cashAccountsLoading = cashAccountsQuery.isLoading
  const allFinancialDataLoading = financialDataLoading || investmentsLoading || cashAccountsLoading

  // Get items for a given target type
  // Always use the actual row id, not parentId - parentId is for internal versioning only
  const getItemsForType = useMemo(() => {
    return (targetType: string): FinancialItem[] => {
      switch (targetType) {
        case 'income':
          return incomes.map(inc => ({ id: inc.id, name: inc.name, amount: inc.amount, frequency: inc.frequency }))
        case 'expense':
          return expenses.map(exp => ({ id: exp.id, name: exp.name, amount: exp.amount, frequency: exp.frequency }))
        case 'asset':
          return assets.map(a => ({ id: a.id, name: a.name, amount: a.currentValue }))
        case 'liability':
          return liabilities.map(l => ({ id: l.id, name: l.name, amount: l.currentBalance }))
        case 'investment':
          return investments.map(inv => ({ id: inv.id, name: inv.name, amount: inv.currentValue }))
        case 'cash':
          return cashAccounts.map(ca => ({ id: ca.id, name: ca.name, amount: ca.balance }))
        default:
          return []
      }
    }
  }, [assets, liabilities, incomes, expenses, investments, cashAccounts])

  // Resolve stable target id
  const resolveStableTargetId = useCallback(
    (targetType: string, targetId?: string) => {
      if (!targetId) return undefined

      let rawItems: Array<{ id: string; parentId?: string; name: string }> = []
      switch (targetType) {
        case 'income':
          rawItems = incomes.map(inc => ({ id: inc.id, parentId: inc.parentId, name: inc.name }))
          break
        case 'expense':
          rawItems = expenses.map(exp => ({ id: exp.id, parentId: exp.parentId, name: exp.name }))
          break
        case 'asset':
          rawItems = assets.map(a => ({ id: a.id, parentId: a.parentId, name: a.name }))
          break
        case 'liability':
          rawItems = liabilities.map(l => ({ id: l.id, parentId: l.parentId, name: l.name }))
          break
        case 'investment':
          rawItems = investments.map(inv => ({ id: inv.id, parentId: inv.parentId, name: inv.name }))
          break
        case 'cash':
          rawItems = cashAccounts.map(ca => ({ id: ca.id, parentId: undefined, name: ca.name }))
          break
      }

      const match = rawItems.find(it => it.id === targetId || it.parentId === targetId)
      if (match) {
        return match.id
      }

      return targetId
    },
    [assets, liabilities, incomes, expenses, investments, cashAccounts]
  )

  // Check if loading for a specific type
  const isLoadingForType = useCallback(
    (targetType: string, items: FinancialItem[]) => {
      if (items.length > 0) return false
      switch (targetType) {
        case 'investment':
          return investmentsLoading
        case 'cash':
          return cashAccountsLoading
        case 'asset':
          return assets.length === 0 && financialDataLoading
        case 'liability':
          return liabilities.length === 0 && financialDataLoading
        case 'income':
          return incomes.length === 0 && financialDataLoading
        case 'expense':
          return expenses.length === 0 && financialDataLoading
        default:
          return financialDataLoading
      }
    },
    [assets, liabilities, incomes, expenses, financialDataLoading, investmentsLoading, cashAccountsLoading]
  )

  return {
    assets,
    liabilities,
    incomes,
    expenses,
    investments,
    cashAccounts,
    financialDataLoading,
    investmentsLoading,
    cashAccountsLoading,
    allFinancialDataLoading,
    getItemsForType,
    resolveStableTargetId,
    isLoadingForType,
  }
}
