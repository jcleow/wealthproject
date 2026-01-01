import { useMutation, useQueryClient } from '@tanstack/react-query'
import { financialApi } from '@/api/financial'
import { QUERY_KEYS } from '@/lib/queryKeys'
import { propertyPlannerV2Keys } from './usePropertyPlannerV2Query'
import { PERSONS_QUERY_KEY } from './usePersonsQuery'

export { useLoadSampleDataMutation } from './useLoadSampleDataMutation'

export function useDeleteAllFinancialDataMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => financialApi.resetAllUserData(),
    onSuccess: () => {
      // Clear all caches
      queryClient.setQueryData(QUERY_KEYS.financial.assets, [])
      queryClient.setQueryData(QUERY_KEYS.financial.liabilities, [])
      queryClient.setQueryData(QUERY_KEYS.financial.incomes, [])
      queryClient.setQueryData(QUERY_KEYS.financial.expenses, [])
      queryClient.setQueryData(QUERY_KEYS.financial.cashAccounts, [])
      queryClient.setQueryData(propertyPlannerV2Keys.list(), [])
      queryClient.setQueryData(PERSONS_QUERY_KEY, [])

      // Invalidate all financial queries with single call
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.financial.all })
    },
  })
}
