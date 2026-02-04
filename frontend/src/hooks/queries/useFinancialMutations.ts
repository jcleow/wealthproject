import { useMutation, useQueryClient } from '@tanstack/react-query'
import { financialApi, settingsApi } from '@/api/financial'
import { QUERY_KEYS } from '@/lib/queryKeys'
import { propertyPlannerV2Keys } from './usePropertyPlannerV2Query'
import { PERSONS_QUERY_KEY } from './usePersonsQuery'
import type { UserSettings } from '@/types/financial'

export { useLoadSampleDataMutation } from './useLoadSampleDataMutation'

export function useDeleteAllFinancialDataMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => financialApi.resetAllUserData(),
    onSuccess: async () => {
      // Clear all caches
      queryClient.setQueryData(QUERY_KEYS.financial.assets, [])
      queryClient.setQueryData(QUERY_KEYS.financial.liabilities, [])
      queryClient.setQueryData(QUERY_KEYS.financial.incomes, [])
      queryClient.setQueryData(QUERY_KEYS.financial.expenses, [])
      queryClient.setQueryData(QUERY_KEYS.financial.cashAccounts, [])
      queryClient.setQueryData(propertyPlannerV2Keys.list(), [])
      queryClient.setQueryData(PERSONS_QUERY_KEY, [])

      // Reset onboardingCompleted so the wizard can re-trigger after a fresh start
      try {
        const currentSettings = queryClient.getQueryData<UserSettings>(QUERY_KEYS.settings.user)
        if (currentSettings?.onboardingCompleted) {
          await settingsApi.updateUserSettings({
            ...currentSettings,
            onboardingCompleted: false,
          })
          queryClient.invalidateQueries({ queryKey: QUERY_KEYS.settings.user })
        }
      } catch {
        // Non-critical — wizard trigger will still work on next page load
      }

      // Invalidate all financial queries with single call
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.financial.all })
    },
  })
}
