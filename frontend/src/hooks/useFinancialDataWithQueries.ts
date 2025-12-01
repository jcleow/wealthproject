import { useEffect, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useAssetsQuery, useCreateAssetMutation, useUpdateAssetMutation, useDeleteAssetMutation } from './queries/useAssetsQuery'
import { useLiabilitiesQuery, useCreateLiabilityMutation, useUpdateLiabilityMutation, useDeleteLiabilityMutation } from './queries/useLiabilitiesQuery'
import { useIncomesQuery, useCreateIncomeMutation, useUpdateIncomeMutation, useDeleteIncomeMutation } from './queries/useIncomesQuery'
import { useExpensesQuery, useCreateExpenseMutation, useUpdateExpenseMutation, useDeleteExpenseMutation } from './queries/useExpensesQuery'
import { useDeleteAllFinancialDataMutation, useLoadSampleDataMutation } from './queries/useFinancialMutations'

export function useFinancialData() {
  const queryClient = useQueryClient()

  // Listen for financial-data-refresh events (dispatched by chat when actions are executed)
  const invalidateAllQueries = useCallback(() => {
    console.log('[useFinancialData] Invalidating all queries')
    queryClient.invalidateQueries({ queryKey: ['assets'] })
    queryClient.invalidateQueries({ queryKey: ['liabilities'] })
    queryClient.invalidateQueries({ queryKey: ['incomes'] })
    queryClient.invalidateQueries({ queryKey: ['expenses'] })
    queryClient.invalidateQueries({ queryKey: ['cash-accounts'] })
    queryClient.invalidateQueries({ queryKey: ['scenario-events'] })
    queryClient.invalidateQueries({ queryKey: ['timeline'] })
    queryClient.invalidateQueries({ queryKey: ['property-scenarios'] })
  }, [queryClient])

  useEffect(() => {
    if (typeof window === 'undefined') return

    console.log('[useFinancialData] Setting up financial-data-refresh listener')
    window.addEventListener('financial-data-refresh', invalidateAllQueries)
    return () => window.removeEventListener('financial-data-refresh', invalidateAllQueries)
  }, [invalidateAllQueries])

  // Queries
  const assetsQuery = useAssetsQuery()
  const liabilitiesQuery = useLiabilitiesQuery()
  const incomesQuery = useIncomesQuery()
  const expensesQuery = useExpensesQuery()

  // Asset mutations
  const createAssetMutation = useCreateAssetMutation()
  const updateAssetMutation = useUpdateAssetMutation()
  const deleteAssetMutation = useDeleteAssetMutation()

  // Liability mutations
  const createLiabilityMutation = useCreateLiabilityMutation()
  const updateLiabilityMutation = useUpdateLiabilityMutation()
  const deleteLiabilityMutation = useDeleteLiabilityMutation()

  // Income mutations
  const createIncomeMutation = useCreateIncomeMutation()
  const updateIncomeMutation = useUpdateIncomeMutation()
  const deleteIncomeMutation = useDeleteIncomeMutation()

  // Expense mutations
  const createExpenseMutation = useCreateExpenseMutation()
  const updateExpenseMutation = useUpdateExpenseMutation()
  const deleteExpenseMutation = useDeleteExpenseMutation()

  // Bulk operations
  const deleteAllMutation = useDeleteAllFinancialDataMutation()
  const loadSampleDataMutation = useLoadSampleDataMutation()

  // Data
  const assets = assetsQuery.data ?? []
  const liabilities = liabilitiesQuery.data ?? []
  const incomes = incomesQuery.data ?? []
  const expenses = expensesQuery.data ?? []

  // Loading state - true if any query is loading
  const loading = assetsQuery.isLoading || liabilitiesQuery.isLoading ||
                  incomesQuery.isLoading || expensesQuery.isLoading

  // Error state - aggregate errors
  const error = assetsQuery.error || liabilitiesQuery.error ||
                incomesQuery.error || expensesQuery.error
  const errorMessage = error instanceof Error ? error.message : error ? String(error) : null

  // Computed values
  const getTotalAssets = () => {
    return assets.reduce((sum, asset) => sum + asset.currentValue, 0)
  }

  const getTotalLiabilities = () => {
    return liabilities.reduce((sum, liability) => sum + liability.currentBalance, 0)
  }

  const getNetWorth = () => {
    return getTotalAssets() - getTotalLiabilities()
  }

  const getMonthlyIncome = () => {
    return incomes.reduce((sum, income) => {
      const monthlyAmount = income.frequency === 'monthly'
        ? income.amount
        : income.frequency === 'yearly'
        ? income.amount / 12
        : income.frequency === 'weekly'
        ? income.amount * 52 / 12
        : income.frequency === 'biweekly'
        ? income.amount * 26 / 12
        : 0
      return sum + monthlyAmount
    }, 0)
  }

  const getMonthlyExpenses = () => {
    return expenses.reduce((sum, expense) => {
      const monthlyAmount = expense.frequency === 'monthly'
        ? expense.amount
        : expense.frequency === 'yearly'
        ? expense.amount / 12
        : expense.frequency === 'weekly'
        ? expense.amount * 52 / 12
        : expense.frequency === 'biweekly'
        ? expense.amount * 26 / 12
        : 0
      return sum + monthlyAmount
    }, 0)
  }

  const getMonthlySavings = () => {
    return getMonthlyIncome() - getMonthlyExpenses()
  }

  // Refresh function
  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['assets'] }),
      queryClient.invalidateQueries({ queryKey: ['liabilities'] }),
      queryClient.invalidateQueries({ queryKey: ['incomes'] }),
      queryClient.invalidateQueries({ queryKey: ['expenses'] }),
      queryClient.invalidateQueries({ queryKey: ['cash-accounts'] }),
      queryClient.invalidateQueries({ queryKey: ['scenario-events'] }),
      queryClient.invalidateQueries({ queryKey: ['timeline'] }),
    ])
  }

  return {
    // Data
    assets,
    incomes,
    liabilities,
    expenses,
    loading,
    error: errorMessage,

    // Asset operations
    addAsset: createAssetMutation.mutateAsync,
    updateAsset: (id: string, updates: any) => updateAssetMutation.mutateAsync({ id, updates }),
    deleteAsset: deleteAssetMutation.mutateAsync,

    // Income operations
    addIncome: createIncomeMutation.mutateAsync,
    updateIncome: (id: string, updates: any) => updateIncomeMutation.mutateAsync({ id, updates }),
    deleteIncome: deleteIncomeMutation.mutateAsync,

    // Liability operations
    addLiability: createLiabilityMutation.mutateAsync,
    updateLiability: (id: string, updates: any) => updateLiabilityMutation.mutateAsync({ id, updates }),
    deleteLiability: deleteLiabilityMutation.mutateAsync,

    // Expense operations
    addExpense: createExpenseMutation.mutateAsync,
    updateExpense: (id: string, updates: any) => updateExpenseMutation.mutateAsync({ id, updates }),
    deleteExpense: deleteExpenseMutation.mutateAsync,

    // Bulk operations
    deleteAllFinancialData: deleteAllMutation.mutateAsync,
    loadSampleData: async () => { await loadSampleDataMutation.mutateAsync() },

    // Computed values
    getTotalAssets,
    getTotalLiabilities,
    getNetWorth,
    getMonthlyIncome,
    getMonthlyExpenses,
    getMonthlySavings,

    // Utility
    refresh,
  }
}