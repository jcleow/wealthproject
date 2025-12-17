import { useMutation, useQueryClient } from '@tanstack/react-query'
import { financialApi } from '@/api/financial'
import { QUERY_KEYS } from '@/lib/queryKeys'

export { useLoadSampleDataMutation } from './useLoadSampleDataMutation'

export function useDeleteAllFinancialDataMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      await Promise.all([
        financialApi.deleteAllAssets(),
        financialApi.deleteAllInvestments(),
        financialApi.deleteAllLiabilities(),
        financialApi.deleteAllIncomes(),
        financialApi.deleteAllExpensesV2(), // Bulk delete via V2 (falls back to V1 if not implemented)
        financialApi.deleteAllCashAccounts(),
        financialApi.deleteAllScenarioEvents(),
        financialApi.deleteCurrentCPFAccount().catch(() => {}), // Ignore if no CPF account exists
      ])
    },
    onSuccess: () => {
      // Clear all caches
      queryClient.setQueryData(QUERY_KEYS.financial.assets, [])
      queryClient.setQueryData(QUERY_KEYS.financial.liabilities, [])
      queryClient.setQueryData(QUERY_KEYS.financial.incomes, [])
      queryClient.setQueryData(QUERY_KEYS.financial.expenses, [])
      queryClient.setQueryData(QUERY_KEYS.financial.cashAccounts, [])

      // Invalidate all financial queries with single call
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.financial.all })
    },
  })
}
