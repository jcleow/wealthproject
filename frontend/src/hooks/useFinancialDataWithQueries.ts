import { useEffect, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useCreateAssetMutation, useUpdateAssetMutation, useDeleteAssetMutation } from './queries/useAssetsQuery'
import { useCreateLiabilityMutation, useUpdateLiabilityMutation, useDeleteLiabilityMutation } from './queries/useLiabilitiesQuery'
import { useCreateIncomeMutation, useUpdateIncomeMutation, useDeleteIncomeMutation } from './queries/useIncomesQuery'
import { useCreateExpenseMutation, useUpdateExpenseMutation, useDeleteExpenseMutation } from './queries/useExpensesQuery'
import { useDeleteAllFinancialDataMutation, useLoadSampleDataMutation } from './queries/useFinancialMutations'
import { QUERY_KEYS } from '@/lib/queryKeys'
import type { Asset, Liability, Income, Expense } from '@/types/financial'
import type { UpdateMode } from '@/components/modals/FinancialFormModal/types'

/** Update payload with optional updateMode for versioned updates */
type AssetUpdates = Partial<Asset> & { updateMode?: UpdateMode }
type LiabilityUpdates = Partial<Liability> & { updateMode?: UpdateMode }
type IncomeUpdates = Partial<Income> & { updateMode?: UpdateMode }
type ExpenseUpdates = Partial<Expense> & { sourceLiabilityId?: string }

export function useFinancialData() {
  const queryClient = useQueryClient()

  // Listen for financial-data-refresh events (dispatched by chat when actions are executed)
  const invalidateAllQueries = useCallback(() => {
    console.log('[useFinancialData] Invalidating all financial queries')
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.financial.all })
  }, [queryClient])

  useEffect(() => {
    if (typeof window === 'undefined') return

    console.log('[useFinancialData] Setting up financial-data-refresh listener')
    window.addEventListener('financial-data-refresh', invalidateAllQueries)
    return () => window.removeEventListener('financial-data-refresh', invalidateAllQueries)
  }, [invalidateAllQueries])

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

  // Refresh function - invalidates all financial queries with single call
  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.financial.all })
  }

  return {
    // Asset operations
    addAsset: createAssetMutation.mutateAsync,
    updateAsset: (id: string, updates: AssetUpdates) => updateAssetMutation.mutateAsync({ id, updates }),
    deleteAsset: deleteAssetMutation.mutateAsync,

    // Income operations
    addIncome: createIncomeMutation.mutateAsync,
    updateIncome: (id: string, updates: IncomeUpdates) => updateIncomeMutation.mutateAsync({ id, updates }),
    deleteIncome: deleteIncomeMutation.mutateAsync,

    // Liability operations
    addLiability: createLiabilityMutation.mutateAsync,
    updateLiability: (id: string, updates: LiabilityUpdates) => updateLiabilityMutation.mutateAsync({ id, updates }),
    deleteLiability: deleteLiabilityMutation.mutateAsync,

    // Expense operations
    addExpense: createExpenseMutation.mutateAsync,
    updateExpense: (id: string, updates: ExpenseUpdates) => updateExpenseMutation.mutateAsync({ id, updates }),
    deleteExpense: deleteExpenseMutation.mutateAsync,

    // Bulk operations
    deleteAllFinancialData: deleteAllMutation.mutateAsync,
    loadSampleData: async () => { await loadSampleDataMutation.mutateAsync() },

    // Utility
    refresh,
  }
}