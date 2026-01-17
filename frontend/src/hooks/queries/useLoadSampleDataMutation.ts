import { useMutation, useQueryClient } from '@tanstack/react-query'
import { financialApi, propertyPlannerV2Api, personsApi, cashAccountsApi, fundFlowRulesApi } from '@/api/financial'
import type { CashAccount } from '@/types/financial'
import type { CPFAccount } from '@/types/cpf'
import type { ScenarioEvent } from '@/types/scenario'
import type { PropertyScenarioFull } from '@/types/propertyPlannerV2'
import type { Person } from '@/types/person'
import type { FundFlowRuleCreatePayload } from '@/types/fundFlowRules'
import { QUERY_KEYS } from '@/lib/queryKeys'
import { CPF_QUERY_KEY } from './useCpfQuery'
import { propertyPlannerV2Keys } from './usePropertyPlannerV2Query'
import { PERSONS_QUERY_KEY } from './usePersonsQuery'
import { getProfileGenerator } from '@/components/modals/ProfileSelectionModal/profileGenerators'

/**
 * Mutation hook for loading a financial profile template.
 * Accepts a profileId to load different Singapore-specific financial profiles.
 */
export function useLoadSampleDataMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (profileId: string = 'dink-kids-planned') => {
      // Reset all data first
      await financialApi.resetAllUserData()

      // Get the profile generator
      const generator = getProfileGenerator(profileId)
      if (!generator) {
        throw new Error(`Unknown profile: ${profileId}`)
      }

      const profileData = generator()

      // Handle blank slate - just return empty data
      if (profileData.persons.length === 0) {
        return {
          assets: [],
          investments: [],
          liabilities: [],
          incomes: [],
          expenses: [],
          scenarioEvents: [],
          cpfAccount: null,
          propertyScenario: null,
          persons: [],
        }
      }

      // Create persons and build a map of personIndex -> Person
      const createdPersons: Person[] = []
      for (const personConfig of profileData.persons) {
        try {
          const person = await personsApi.createPerson({
            name: personConfig.name,
            displayColor: personConfig.displayColor,
            dateOfBirth: personConfig.dateOfBirth,
            gender: personConfig.gender,
            residencyStatus: personConfig.residencyStatus,
          })
          createdPersons.push(person)
        } catch (error) {
          console.error('[loadProfile] Failed to create person:', personConfig.name, error)
        }
      }
      console.debug('[loadProfile] Created persons:', createdPersons.map(p => ({ id: p.id, name: p.name })))

      // Create CPF accounts linked to persons
      const createdCpfAccounts: CPFAccount[] = []
      for (const cpfConfig of profileData.cpfAccounts) {
        const person = createdPersons[cpfConfig.personIndex]
        if (!person) continue

        try {
          // Note: CPF housing usage is derived from property scenarios - see GetCPFOAUsageByAccount()
          const cpfAccount = await financialApi.createCPFAccount({
            personId: person.id,
            oaBalance: cpfConfig.oaBalance,
            saBalance: cpfConfig.saBalance,
            maBalance: cpfConfig.maBalance,
            raBalance: cpfConfig.raBalance,
          })
          createdCpfAccounts.push(cpfAccount)
        } catch (error) {
          console.error('[loadProfile] Failed to create CPF account for:', person.name, error)
        }
      }

      // Create cash accounts
      const createdCashAccounts: CashAccount[] = []
      for (const cashConfig of profileData.cashAccounts ?? []) {
        try {
          const cashAccount = await cashAccountsApi.createCashAccount({
            name: cashConfig.name,
            balance: cashConfig.balance,
            interestRate: cashConfig.interestRate,
            bankName: cashConfig.bankName,
            accountType: cashConfig.accountType,
            isAccumulator: cashConfig.isAccumulator,
            notes: cashConfig.notes,
          })
          createdCashAccounts.push(cashAccount)
        } catch (error) {
          console.error('[loadProfile] Failed to create cash account:', cashConfig.name, error)
        }
      }

      // Create assets, investments, liabilities, incomes, expenses in parallel
      const [assets, investments, liabilities, incomes] = await Promise.all([
        Promise.all((profileData.assets ?? []).map(asset => financialApi.createAsset(asset))),
        Promise.all((profileData.investments ?? []).map(inv => financialApi.createInvestment(inv))),
        Promise.all((profileData.liabilities ?? []).map(lib => financialApi.createLiability(lib))),
        Promise.all(
          (profileData.incomes ?? []).map(incomeConfig => {
            const person = createdPersons[incomeConfig.personIndex]
            return financialApi.createIncome({
              ...incomeConfig,
              personId: person?.id ?? null,
            })
          })
        ),
      ])

      // Create expenses separately (they don't have person links)
      await Promise.all((profileData.expenses ?? []).map(exp => financialApi.createExpense(exp)))

      // Create income allocations if defined
      if (profileData.incomeAllocations && incomes.length > 0 && investments.length > 0) {
        for (const allocation of profileData.incomeAllocations) {
          const income = incomes[allocation.incomeIndex]
          const investment = investments[allocation.investmentIndex]
          // Ensure both income and investment exist with valid IDs
          if (income?.id && investment?.id) {
            try {
              await financialApi.createIncomeAllocation(income.id, {
                targetInvestmentId: investment.id,
                allocationType: allocation.allocationType,
                allocationValue: allocation.allocationValue,
              })
            } catch (error) {
              // Non-fatal: profile still works without allocations
              console.warn('[loadProfile] Failed to create income allocation (non-fatal):', {
                incomeId: income.id,
                investmentId: investment.id,
                error,
              })
            }
          } else {
            console.warn('[loadProfile] Skipping allocation - missing income or investment:', {
              incomeIndex: allocation.incomeIndex,
              investmentIndex: allocation.investmentIndex,
              hasIncome: !!income,
              hasInvestment: !!investment,
            })
          }
        }
      }

      // Get expenses for linking scenario event impacts
      const expensesResult = await financialApi.listExpenses()
      const expenses = expensesResult.data

      // Create scenario events with linked impacts
      const scenarioEvents: ScenarioEvent[] = []
      for (const eventConfig of profileData.scenarioEvents ?? []) {
        const linkedImpacts = []

        for (const impact of eventConfig.impacts ?? []) {
          let parentId: string | undefined = undefined

          if (impact.impactKind === 'start') {
            // For start impacts, set up one-time handling and personId
            const startMonth = impact.startMonth ?? eventConfig.occursOn
            const frequency = (impact as { frequency?: string }).frequency || 'monthly'
            const isOneTime = frequency === 'one_time'
            const endMonth = isOneTime ? startMonth : undefined
            const personId = impact.targetType === 'income'
              ? (createdPersons[0]?.id ?? undefined)
              : undefined

            linkedImpacts.push({
              ...impact,
              endMonth,
              personId,
            })
            continue
          } else if (impact.impactKind === 'delta' || impact.impactKind === 'override') {
            // Link to existing items
            if (impact.targetType === 'income') {
              parentId = incomes[0]?.id
              if (!parentId) {
                console.error('[loadProfile] No income available for impact')
                continue
              }
            } else if (impact.targetType === 'expense') {
              parentId = expenses[0]?.id
              if (!parentId) {
                console.error('[loadProfile] No expense available for impact')
                continue
              }
            }
          }

          linkedImpacts.push({
            ...impact,
            parentId,
          })
        }

        try {
          const createdEvent = await financialApi.createScenarioEvent({
            ...eventConfig,
            impacts: linkedImpacts,
          } as ScenarioEvent)
          scenarioEvents.push(createdEvent)
        } catch (error) {
          console.error('[loadProfile] Failed to create scenario event:', eventConfig.name, error)
        }
      }

      // Create property scenario if defined
      let propertyScenario: PropertyScenarioFull | null = null
      if (profileData.propertyScenario) {
        try {
          const propConfig = profileData.propertyScenario
          const propertySG = propConfig.propertySG

          // Map person indexes to actual IDs and accounts
          const borrower1Cpf = propertySG.borrower1PersonIndex !== undefined
            ? createdCpfAccounts[propertySG.borrower1PersonIndex]
            : undefined
          const borrower2Cpf = propertySG.borrower2PersonIndex !== undefined
            ? createdCpfAccounts[propertySG.borrower2PersonIndex]
            : undefined
          const borrower1Income = propertySG.borrower1PersonIndex !== undefined
            ? incomes[propertySG.borrower1PersonIndex]
            : undefined
          const borrower2Income = propertySG.borrower2PersonIndex !== undefined
            ? incomes[propertySG.borrower2PersonIndex]
            : undefined
          const cashAccount = createdCashAccounts[0]

          // Build scenario input, removing personIndex fields
          const { borrower1PersonIndex, borrower2PersonIndex, ...restPropertySG } = propertySG

          const scenarioInput = {
            country: propConfig.country,
            propertySG: {
              ...restPropertySG,
              borrower1IncomeId: borrower1Income?.id,
              borrower1CpfAccountId: borrower1Cpf?.id,
              borrower2IncomeId: borrower2Income?.id,
              borrower2CpfAccountId: borrower2Cpf?.id,
              borrower1DownpaymentCashAccountId: cashAccount?.id ?? null,
              borrower1MonthlyCashAccountId: cashAccount?.id ?? null,
              borrower2DownpaymentCashAccountId: null,
              borrower2MonthlyCashAccountId: null,
            },
            ratePeriods: propConfig.ratePeriods,
            growthPeriods: propConfig.growthPeriods,
            fees: propConfig.fees,
            grants: propConfig.grants,
          }

          propertyScenario = await propertyPlannerV2Api.createScenario(scenarioInput)
          console.debug('[loadProfile] Created property scenario:', propertyScenario.scenario.id)

          // Create fund flow rules
          const propertySgId = propertyScenario?.scenario.propertySgId
          if (propertySgId && borrower1Cpf && cashAccount) {
            const btoDate = propertySG.btoKeyCollectionDate
            const startDateForRules = `${btoDate}-01T00:00:00Z`

            const fundFlowRules: FundFlowRuleCreatePayload[] = [
              {
                name: 'Downpayment - CPF OA',
                ruleType: 'payment',
                sourceCpfAccountId: borrower1Cpf.id,
                targetPropertyId: propertySgId,
                amountType: 'max_available',
                priority: 0,
                startDate: startDateForRules,
              },
              {
                name: 'Downpayment - Cash',
                ruleType: 'payment',
                sourceCashAccountId: cashAccount.id,
                targetPropertyId: propertySgId,
                amountType: 'remainder',
                priority: 1,
                startDate: startDateForRules,
              },
              {
                name: 'Monthly - CPF OA',
                ruleType: 'payment',
                sourceCpfAccountId: borrower1Cpf.id,
                targetPropertyId: propertySgId,
                amountType: 'max_available',
                priority: 0,
                startDate: startDateForRules,
              },
              {
                name: 'Monthly - Cash',
                ruleType: 'payment',
                sourceCashAccountId: cashAccount.id,
                targetPropertyId: propertySgId,
                amountType: 'remainder',
                priority: 1,
                startDate: startDateForRules,
              },
            ]

            for (const rule of fundFlowRules) {
              try {
                await fundFlowRulesApi.createFundFlowRule(rule)
              } catch (ruleError) {
                console.error('[loadProfile] Failed to create fund flow rule:', ruleError)
              }
            }
          }
        } catch (error) {
          console.error('[loadProfile] Failed to create property scenario:', error)
        }
      }

      return {
        assets,
        investments,
        liabilities,
        incomes,
        expenses,
        scenarioEvents,
        cpfAccount: createdCpfAccounts[0] ?? null,
        propertyScenario,
        persons: createdPersons,
      }
    },
    onSuccess: (data) => {
      // Update all caches with the new data
      queryClient.setQueryData(QUERY_KEYS.financial.assets, data.assets)
      queryClient.setQueryData(QUERY_KEYS.financial.investments, data.investments)
      queryClient.setQueryData(QUERY_KEYS.financial.liabilities, data.liabilities)
      queryClient.setQueryData(QUERY_KEYS.financial.incomes, data.incomes)
      queryClient.setQueryData(QUERY_KEYS.financial.expenses, data.expenses)
      queryClient.setQueryData(QUERY_KEYS.financial.scenarioEvents, data.scenarioEvents)
      queryClient.setQueryData(PERSONS_QUERY_KEY, data.persons)
      if (data.cpfAccount) {
        queryClient.setQueryData(CPF_QUERY_KEY, data.cpfAccount)
      }
      if (data.propertyScenario) {
        queryClient.setQueryData<PropertyScenarioFull[]>(
          propertyPlannerV2Keys.list(),
          [data.propertyScenario]
        )
      }

      // Invalidate derived queries
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.financial.timeline })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.financial.timelineV2 })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.financial.netWorth })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.financial.cashflow })
      queryClient.invalidateQueries({ queryKey: CPF_QUERY_KEY })
      queryClient.invalidateQueries({ queryKey: propertyPlannerV2Keys.all })
    },
  })
}
