import { useMemo, useCallback } from 'react'
import { useFinancialData } from '@/hooks/useFinancialDataWithQueries'
import { useInvestmentsQuery } from '@/hooks/queries/useInvestmentsQuery'
import { useCashAccountsQuery } from '@/hooks/queries/useCashAccountsQuery'

export type FinancialItem = { id: string; name: string; amount: number; frequency?: string }

export interface UseFinancialItemsReturn {
  assets: ReturnType<typeof useFinancialData>['assets']
  liabilities: ReturnType<typeof useFinancialData>['liabilities']
  incomes: ReturnType<typeof useFinancialData>['incomes']
  expenses: ReturnType<typeof useFinancialData>['expenses']
  investments: ReturnType<typeof useInvestmentsQuery>['data']
  cashAccounts: ReturnType<typeof useCashAccountsQuery>['data']
  financialDataLoading: boolean
  investmentsLoading: boolean
  cashAccountsLoading: boolean
  allFinancialDataLoading: boolean
  getItemsForType: (targetType: string) => FinancialItem[]
  resolveStableTargetId: (targetType: string, targetId?: string) => string | undefined
  isLoadingForType: (targetType: string, items: FinancialItem[]) => boolean
}

export function useFinancialItems(): UseFinancialItemsReturn {
  const { assets, liabilities, incomes, expenses, loading: financialDataLoading } = useFinancialData()
  const investmentsQuery = useInvestmentsQuery({ enabled: true })
  const cashAccountsQuery = useCashAccountsQuery()
  const investments = investmentsQuery.data ?? []
  const cashAccounts = cashAccountsQuery.data ?? []
  const investmentsLoading = investmentsQuery.isLoading
  const cashAccountsLoading = cashAccountsQuery.isLoading
  const allFinancialDataLoading = financialDataLoading || investmentsLoading || cashAccountsLoading

  // Get items for a given target type
  const getItemsForType = useMemo(() => {
    return (targetType: string): FinancialItem[] => {
      switch (targetType) {
        case 'income':
          return incomes.map(inc => ({ id: inc.parentId ?? inc.id, name: inc.source, amount: inc.amount, frequency: inc.frequency }))
        case 'expense':
          return expenses.map(exp => ({ id: exp.parentId ?? exp.id, name: exp.payee, amount: exp.amount, frequency: exp.frequency }))
        case 'asset':
          return assets.map(a => ({ id: a.parentId ?? a.id, name: a.name, amount: a.currentValue }))
        case 'liability':
          return liabilities.map(l => ({ id: l.parentId ?? l.id, name: l.name, amount: l.currentBalance }))
        case 'investment':
          return investments.map(inv => ({ id: inv.parentId ?? inv.id, name: inv.name, amount: inv.currentValue }))
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
          rawItems = incomes.map(inc => ({ id: inc.id, parentId: inc.parentId, name: inc.source }))
          break
        case 'expense':
          rawItems = expenses.map(exp => ({ id: exp.id, parentId: exp.parentId, name: exp.payee }))
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
        return match.parentId ?? match.id
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
