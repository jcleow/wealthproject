import { useMutation, useQueryClient } from '@tanstack/react-query'
import { financialApi } from '@/services/financialApi'
import { ASSETS_QUERY_KEY } from './useAssetsQuery'
import { LIABILITIES_QUERY_KEY } from './useLiabilitiesQuery'
import { INCOMES_QUERY_KEY } from './useIncomesQuery'
import { EXPENSES_QUERY_KEY } from './useExpensesQuery'
import { CASH_ACCOUNTS_QUERY_KEY } from './useCashAccountsQuery'

export { useLoadSampleDataMutation } from './useLoadSampleDataMutation'

export function useDeleteAllFinancialDataMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      await Promise.all([
        financialApi.deleteAllAssets(),
        financialApi.deleteAllLiabilities(),
        financialApi.deleteAllIncomes(),
        financialApi.deleteAllExpenses(),
        financialApi.deleteAllCashAccounts(),
        financialApi.deleteAllScenarioEvents(),
      ])
    },
    onSuccess: () => {
      // Clear all caches
      queryClient.setQueryData(ASSETS_QUERY_KEY, [])
      queryClient.setQueryData(LIABILITIES_QUERY_KEY, [])
      queryClient.setQueryData(INCOMES_QUERY_KEY, [])
      queryClient.setQueryData(EXPENSES_QUERY_KEY, [])
      queryClient.setQueryData(CASH_ACCOUNTS_QUERY_KEY, [])

      // Invalidate all related queries
      queryClient.invalidateQueries({ queryKey: ['timeline'] })
      queryClient.invalidateQueries({ queryKey: ['net-worth'] })
      queryClient.invalidateQueries({ queryKey: ['cashflow'] })
      queryClient.invalidateQueries({ queryKey: ['scenario-events'] })
    },
  })
}

