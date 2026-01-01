export * as assetsApi from './assets'
export * as investmentsApi from './investments'
export * as liabilitiesApi from './liabilities'
export * as incomesApi from './incomes'
export * as expensesApi from './expenses'
export * as cashAccountsApi from './cashAccounts'
export * as scenarioEventsApi from './scenarioEvents'
export * as propertyApi from './property'
export * as propertyPlannerV2Api from './propertyPlannerV2'
export * as timelineApi from './timeline'
export * as growthApi from './growth'
export * as settingsApi from './settings'
export * as cpfApi from './cpf'
export * as personsApi from './persons'

import * as assets from './assets'
import * as investments from './investments'
import * as liabilities from './liabilities'
import * as incomes from './incomes'
import * as expenses from './expenses'
import * as cashAccounts from './cashAccounts'
import * as scenarioEvents from './scenarioEvents'
import * as property from './property'
import * as propertyPlannerV2 from './propertyPlannerV2'
import * as timeline from './timeline'
import * as growth from './growth'
import * as settings from './settings'
import * as cpf from './cpf'
import * as persons from './persons'

/**
 * Reset all user data in a single atomic transaction.
 * This deletes all financial data (assets, liabilities, incomes, expenses,
 * investments, cash accounts, CPF accounts, scenario events, property scenarios,
 * and persons) while avoiding deadlocks from parallel delete operations.
 */
export async function resetAllUserData(): Promise<void> {
  const response = await fetch('/api/v2/reset-all-data', { method: 'DELETE' })
  if (!response.ok && response.status !== 204) {
    const errorText = await response.text()
    throw new Error(`Failed to reset user data: ${response.status} ${errorText}`)
  }
}

export const financialApi = {
  ...assets,
  ...investments,
  ...liabilities,
  ...incomes,
  ...expenses,
  ...cashAccounts,
  ...scenarioEvents,
  ...property,
  ...propertyPlannerV2,
  ...timeline,
  ...growth,
  ...settings,
  ...cpf,
  ...persons,
  resetAllUserData,
}
