import { useMutation, useQueryClient } from '@tanstack/react-query'
import { financialApi, personsApi } from '@/api/financial'
import { QUERY_KEYS } from '@/lib/queryKeys'
import { propertyPlannerV2Keys } from './usePropertyPlannerV2Query'
import { PERSONS_QUERY_KEY } from './usePersonsQuery'

export { useLoadSampleDataMutation } from './useLoadSampleDataMutation'

export function useDeleteAllFinancialDataMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      // Delete all persons (no bulk delete endpoint, so list and delete each)
      const deleteAllPersons = async () => {
        try {
          const persons = await personsApi.listPersons()
          await Promise.all(persons.map(p => personsApi.deletePerson(p.id)))
        } catch {
          // Ignore errors if no persons exist
        }
      }

      await Promise.all([
        financialApi.deleteAllAssets(),
        financialApi.deleteAllInvestments(),
        financialApi.deleteAllLiabilities(),
        financialApi.deleteAllIncomes(),
        financialApi.deleteAllExpensesV2(), // Bulk delete via V2 (falls back to V1 if not implemented)
        financialApi.deleteAllCashAccounts(),
        financialApi.deleteAllScenarioEvents(),
        financialApi.deleteCurrentCPFAccount().catch(() => {}), // Ignore if no CPF account exists
        financialApi.deleteAllScenarios(), // Delete all property planner scenarios
        deleteAllPersons(), // Delete all persons
      ])
    },
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
