import { useMutation, useQueryClient } from '@tanstack/react-query'
import { financialApi, propertyPlannerV2Api } from '@/api/financial'
import type { Income, Expense } from '@/types/financial'
import type { CPFAccount, CPFAccountCreatePayload } from '@/types/cpf'
import type { ScenarioEvent } from '@/types/scenario'
import type { CreateScenarioInput, PropertyScenarioFull } from '@/types/propertyPlannerV2'
import { DEFAULT_MONTHLY_CADENCE } from '@/types/scenario'
import { QUERY_KEYS } from '@/lib/queryKeys'
import { CPF_QUERY_KEY } from './useCpfQuery'
import { propertyPlannerV2Keys } from './usePropertyPlannerV2Query'

// Helper to generate YYYY-MM format date strings
function getMonthString(yearsFromNow: number, monthOffset = 0): string {
  const date = new Date()
  date.setFullYear(date.getFullYear() + yearsFromNow)
  date.setMonth(date.getMonth() + monthOffset)
  return date.toISOString().slice(0, 7)
}

export function useLoadSampleDataMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      let cpfAccount: CPFAccount | null = null

      // First clear all data including CPF and property scenarios
      // Use V2 bulk delete endpoints where available for better cleanup
      // Delete property V2 scenarios (no bulk delete, so list and delete each)
      const deletePropertyV2Scenarios = async () => {
        try {
          const scenarios = await propertyPlannerV2Api.listScenarios()
          await Promise.all(scenarios.map(s => propertyPlannerV2Api.deleteScenario(s.scenario.id)))
        } catch {
          // Ignore errors if no scenarios exist
        }
      }

      await Promise.all([
        financialApi.deleteAllAssets(),
        financialApi.deleteAllInvestments(),
        financialApi.deleteAllLiabilities(),
        financialApi.deleteAllIncomes(),
        financialApi.deleteAllExpensesV2(), // Use V2 to ensure all expenses (including scenario-created) are deleted
        financialApi.deleteAllCashAccounts(),
        financialApi.deleteAllScenarioEvents(),
        financialApi.deleteCurrentCPFAccount().catch(() => {}), // Ignore if no CPF account exists
        deletePropertyV2Scenarios(),
      ])

      // Ensure CPF profile exists so timeline v2 can show CPF assets and contributions
      const sampleCPFAccount: CPFAccountCreatePayload = {
        oaBalance: 85000,
        saBalance: 45000,
        maBalance: 32000,
        raBalance: 0,
        oaUsedForHousing: 0,
        dateOfBirth: '1993-01-01',
        residencyStatus: 'citizen',
      }

      try {
        const existingCPF = await financialApi.getCPFAccount()
        if (existingCPF) {
          cpfAccount = await financialApi.updateCPFAccount(existingCPF.id, sampleCPFAccount)
        } else {
          cpfAccount = await financialApi.createCPFAccount(sampleCPFAccount)
        }
      } catch (error) {
        console.error('[loadSampleData] Failed to upsert CPF account', error)
      }

      // Sample data for a 32-year-old Singaporean professional
      // Planning: marriage, BTO flat, car, retirement by 60
      const todayIso = new Date().toISOString()

      // Non-investment assets (Bank Accounts stay in assets table)
      const sampleAssets = [
        {
          name: 'DBS Multiplier Account',
          category: 'Bank Account',
          currentValue: 25000,
          annualGrowthRate: 2.5,
          startDate: todayIso,
          notes: 'Main savings account with salary crediting',
        },
        {
          name: 'Emergency Fund',
          category: 'Bank Account',
          currentValue: 18000,
          annualGrowthRate: 2.0,
          startDate: todayIso,
          notes: '6 months expenses in high-yield savings',
        },
      ]

      // Investments go to the finance_investments table
      const sampleInvestments = [
        {
          name: 'Syfe Core Growth Portfolio',
          category: 'Investment',
          currentValue: 35000,
          annualGrowthRate: 6.0,
          startDate: todayIso,
          notes: 'Global ETF robo-advisor, monthly DCA $500',
        },
        {
          name: 'Singapore Savings Bonds',
          category: 'Investment',
          currentValue: 20000,
          annualGrowthRate: 3.0,
          startDate: todayIso,
          notes: 'Safe haven, 10-year average yield',
        },
      ]

      const sampleLiabilities = [
        {
          name: 'Study Loan (NUS)',
          category: 'Loan',
          currentBalance: 8000,
          interestRateApr: 4.5,
          minimumPayment: 250,
          startDate: todayIso,
          notes: 'Remaining balance from university, 3 years left',
        },
        {
          name: 'Credit Card',
          category: 'Credit Card',
          currentBalance: 800,
          interestRateApr: 26,
          minimumPayment: 50,
          startDate: todayIso,
          notes: 'Paid in full monthly, revolving for cashback',
        },
      ]

      const sampleIncomes: Array<Omit<Income, 'id' | 'updatedAt'>> = [
        {
          name: 'Software Engineer Salary',
          category: 'Employment',
          amount: 7500,
          frequency: 'monthly',
          startDate: todayIso,
          growthRate: 4.0,
          cpfWageType: "ow", // Ordinary wages for monthly salary to compute CPF correctly
          notes: 'Mid-senior role at tech company, 10 years experience',
        },
        // {
        //   source: 'Annual Bonus',
        //   category: 'Employment',
        //   amount: 15000,
        //   frequency: 'yearly',
        //   startDate: nowIso,
        //   startYear: currentYear,
        //   growthRate: 3.0,
        //   notes: '2 months bonus, typically paid in March',
        // },
        // {
        //   source: 'Freelance Development',
        //   category: 'Freelance',
        //   amount: 800,
        //   frequency: 'monthly',
        //   startDate: nowIso,
        //   startYear: currentYear,
        //   growthRate: 0,
        //   notes: 'Side projects and consulting, variable income',
        // },
      ]

      const sampleExpenses: Array<Omit<Expense, 'id' | 'updatedAt'>> = [
        {
          name: 'Parents Allowance',
          category: 'Family',
          amount: 500,
          frequency: 'monthly',
          startDate: todayIso,
          growthRate: 2.0,
          notes: 'Monthly contribution to parents',
        },
        {
          name: 'Rent (Room)',
          category: 'Housing',
          amount: 1200,
          frequency: 'monthly',
          startDate: todayIso,
          growthRate: 3.0,
          notes: 'Master bedroom in shared HDB, Toa Payoh',
        },
        {
          name: 'Groceries & Hawker',
          category: 'Food',
          amount: 600,
          frequency: 'monthly',
          startDate: todayIso,
          growthRate: 3.0,
          notes: 'Mix of cooking and hawker center meals',
        },
        {
          name: 'Dining & Social',
          category: 'Food',
          amount: 400,
          frequency: 'monthly',
          startDate: todayIso,
          growthRate: 2.0,
          notes: 'Restaurants, dates, gatherings with friends',
        },
        {
          name: 'Public Transport',
          category: 'Transport',
          amount: 120,
          frequency: 'monthly',
          startDate: todayIso,
          growthRate: 2.0,
          notes: 'MRT and bus, monthly concession',
        },
        {
          name: 'Grab/Taxi',
          category: 'Transport',
          amount: 100,
          frequency: 'monthly',
          startDate: todayIso,
          growthRate: 3.0,
          notes: 'Late nights and rainy days',
        },
        {
          name: 'Mobile Plan',
          category: 'Bills',
          amount: 45,
          frequency: 'monthly',
          startDate: todayIso,
          growthRate: 0,
          notes: 'Circles.Life SIM-only plan',
        },
        {
          name: 'Subscriptions',
          category: 'Bills',
          amount: 50,
          frequency: 'monthly',
          startDate: todayIso,
          growthRate: 2.0,
          notes: 'Netflix, Spotify, iCloud',
        },
        {
          name: 'Term Life Insurance',
          category: 'Insurance',
          amount: 150,
          frequency: 'monthly',
          startDate: todayIso,
          growthRate: 0,
          notes: 'NTUC Income term life, $500k coverage',
        },
        {
          name: 'Health Insurance (IP)',
          category: 'Insurance',
          amount: 80,
          frequency: 'monthly',
          startDate: todayIso,
          growthRate: 5.0,
          notes: 'Integrated Shield Plan rider, paid from Medisave + cash',
        },
        {
          name: 'Gym Membership',
          category: 'Health',
          amount: 100,
          frequency: 'monthly',
          startDate: todayIso,
          growthRate: 2.0,
          notes: 'ActiveSG + occasional ClassPass',
        },
        {
          name: 'Personal Care',
          category: 'Personal',
          amount: 80,
          frequency: 'monthly',
          startDate: todayIso,
          growthRate: 2.0,
          notes: 'Haircut, toiletries, etc',
        },
        {
          name: 'Shopping & Entertainment',
          category: 'Personal',
          amount: 200,
          frequency: 'monthly',
          startDate: todayIso,
          growthRate: 2.0,
          notes: 'Clothes, gadgets, movies',
        },
        {
          name: 'Annual Travel Fund',
          category: 'Travel',
          amount: 4000,
          frequency: 'annual',
          startDate: todayIso,
          growthRate: 3.0,
          notes: '1-2 overseas trips per year (Japan, Thailand, etc)',
        },
      ]

      // Life goal scenario events for a 32-year-old planning major milestones
      // Timeline: Marriage (2 years) → BTO Key Collection (5 years) → Car (7 years) → Retirement (28 years)
      const sampleScenarioEvents: Array<Omit<ScenarioEvent, 'id'>> = [
        {
          name: 'Wedding & ROM',
          description: 'Getting married! Wedding banquet, ROM, photography, honeymoon. Using savings and some help from parents.',
          occursOn: getMonthString(2),
          displayIcon: 'heart',
          displayColor: '#ec4899', // Pink
          tags: ['milestone', 'marriage'],
          isIncluded: true,
          impacts: [
            {
              targetType: 'expense',
              impactKind: 'start',
              amount: 50000,
              currency: 'SGD',
              cadence: DEFAULT_MONTHLY_CADENCE,
              startMonth: getMonthString(2),
              frequency: 'one_time',
              name: 'Wedding Expenses',
            },
          ],
        },
        // NOTE: BTO Key Collection is now created via Property Planner V2, not as a legacy scenario event
        // The property scenario is created separately after financial data is seeded
        {
          name: 'First Child',
          description: 'Starting a family! Additional expenses for baby essentials, childcare planning. Baby Bonus helps offset initial costs.',
          occursOn: getMonthString(4),
          displayIcon: 'baby',
          displayColor: '#f59e0b', // Amber
          tags: ['milestone', 'family'],
          isIncluded: true,
          impacts: [
            {
              targetType: 'expense',
              impactKind: 'start',
              amount: 1500,
              currency: 'SGD',
              cadence: 'monthly',
              startMonth: getMonthString(4),
              frequency: 'monthly',
              name: 'Childcare & Baby Expenses',
            },
            {
              targetType: 'income',
              impactKind: 'start',
              amount: 11000,
              currency: 'SGD',
              cadence: DEFAULT_MONTHLY_CADENCE,
              startMonth: getMonthString(4),
              frequency: 'one_time',
              name: 'Baby Bonus',
            },
          ],
        },
        {
          name: 'Buy a Car',
          description: 'Getting a modest car for the family. Toyota Corolla Hybrid with 10-year COE.',
          occursOn: getMonthString(7),
          displayIcon: 'car',
          displayColor: '#10b981', // Emerald
          tags: ['milestone', 'vehicle'],
          isIncluded: true,
          impacts: [
            {
              targetType: 'asset',
              impactKind: 'start',
              amount: 150000,
              currency: 'SGD',
              cadence: DEFAULT_MONTHLY_CADENCE,
              startMonth: getMonthString(7),
              name: 'Toyota Corolla Hybrid',
            },
            {
              targetType: 'liability',
              impactKind: 'start',
              amount: 100000,
              currency: 'SGD',
              cadence: DEFAULT_MONTHLY_CADENCE,
              startMonth: getMonthString(7),
              name: 'Car Loan',
            },
            {
              targetType: 'expense',
              impactKind: 'start',
              amount: 1600,
              currency: 'SGD',
              cadence: 'monthly',
              startMonth: getMonthString(7),
              frequency: 'monthly',
              name: 'Car Running Costs',
            },
          ],
        },
        {
          name: 'Salary Promotion',
          description: 'Promoted to Senior/Lead role with significant salary bump (+$2k/month, +$5k bonus).',
          occursOn: getMonthString(3),
          displayIcon: 'trending-up',
          displayColor: '#22c55e', // Green
          tags: ['career', 'income'],
          isIncluded: true,
          impacts: [
            {
              targetType: 'income',
              impactKind: 'delta',
              amount: 2400,
              currency: 'SGD',
              cadence: 'monthly',
              startMonth: getMonthString(3),
              notes: 'Net income increase: +$2k salary + ~$400/month from higher bonus tier',
            },
          ],
        },
        {
          name: 'Retirement at 60',
          description: 'Target retirement age. CPF Life payouts begin, stop working income, focus on passive income and drawdown.',
          occursOn: getMonthString(28), // 32 + 28 = 60 years old
          displayIcon: 'sunset',
          displayColor: '#f97316', // Orange
          tags: ['milestone', 'retirement'],
          isIncluded: true,
          impacts: [
            {
              targetType: 'income',
              impactKind: 'override',
              amount: 2000,
              currency: 'SGD',
              cadence: 'monthly',
              startMonth: getMonthString(28),
              notes: 'Income becomes CPF Life payout only (~$2k/month estimated)',
            },
          ],
        },
      ]

      const [assets, investments, liabilities, incomes, _createdExpenses] = await Promise.all([
        Promise.all(sampleAssets.map(asset => financialApi.createAsset(asset))),
        Promise.all(sampleInvestments.map(investment => financialApi.createInvestment(investment))),
        Promise.all(sampleLiabilities.map(liability => financialApi.createLiability(liability))),
        Promise.all(sampleIncomes.map(income => financialApi.createIncome(income))),
        Promise.all(sampleExpenses.map(expense => financialApi.createExpense(expense))),
      ])

      // Create income allocations for investment contributions
      // Allocate from salary income to both investment accounts
      const salaryIncome = incomes.find(inc => inc.name === 'Software Engineer Salary')
      const syfeInvestment = investments.find(inv => inv.name.includes('Syfe'))
      const ssbInvestment = investments.find(inv => inv.name.includes('Singapore Savings'))

      if (salaryIncome && syfeInvestment && ssbInvestment) {
        await Promise.all([
          // $300/month to Syfe Core Growth Portfolio
          financialApi.createIncomeAllocation(salaryIncome.id, {
            targetInvestmentId: syfeInvestment.id,
            allocationType: 'fixed',
            allocationValue: '300',
          }),
          // $200/month to Singapore Savings Bonds
          financialApi.createIncomeAllocation(salaryIncome.id, {
            targetInvestmentId: ssbInvestment.id,
            allocationType: 'fixed',
            allocationValue: '200',
          }),
        ])
      }

      // Build lookup maps for linking delta/override impacts to existing items
      const incomeBySource = new Map(incomes.map(inc => [inc.name, inc.id]))
      const expensesResult = await financialApi.listExpenses()
      const expenses = expensesResult.data

      // Create scenario events with properly linked impacts
      // For 'start' impacts: backend creates the financial item (no parentId needed)
      // For 'delta'/'override' impacts: link to existing items by name match via parentId
      const scenarioEvents: ScenarioEvent[] = []

      for (const event of sampleScenarioEvents) {
        const linkedImpacts = []

        for (const impact of event.impacts ?? []) {
          let parentId: string | undefined = undefined

          if (impact.impactKind === 'start') {
            // For 'start' impacts, the backend will create the financial item
            // We just need to pass the impact data with targetType set
            // No parentId needed - backend handles creation

            // For one-time items, set endMonth to same month as startMonth
            const startMonth = impact.startMonth ?? event.occursOn
            const frequency = impact.frequency || 'monthly'
            const isOneTime = frequency === 'one_time'
            const endMonth = isOneTime ? startMonth : undefined

            linkedImpacts.push({
              ...impact,
              // No parentId for start impacts - backend creates the item
              endMonth,
            })
            continue
          } else if (impact.impactKind === 'delta' || impact.impactKind === 'override') {
            // Link to existing items based on targetType via parentId
            // For delta/override, we find a matching existing item to modify
            if (impact.targetType === 'income') {
              // Look for the main salary income for income-related impacts
              parentId = incomeBySource.get('Software Engineer Salary')
              if (!parentId) {
                console.error(`[loadSampleData] Failed to find income "Software Engineer Salary" for ${impact.impactKind} impact in event "${event.name}"`)
                console.error('[loadSampleData] Available incomes:', Array.from(incomeBySource.keys()))
                throw new Error(`Cannot create ${impact.impactKind} impact: income "Software Engineer Salary" not found`)
              }
            } else if (impact.targetType === 'expense') {
              // For expense deltas, use the first expense as a generic target
              // (In real usage, the user would select the specific item)
              parentId = expenses[0]?.id
              if (!parentId) {
                console.error(`[loadSampleData] No expenses available for ${impact.impactKind} impact in event "${event.name}"`)
                throw new Error(`Cannot create ${impact.impactKind} impact: no expenses available to target`)
              }
            } else {
              throw new Error(`Unsupported targetType "${impact.targetType}" for ${impact.impactKind} impact in event "${event.name}"`)
            }
          }

          if (process.env.NODE_ENV === 'development') {
            console.debug(`[loadSampleData] Impact for ${event.name}:`, {
              targetType: impact.targetType,
              impactKind: impact.impactKind,
              parentId,
            })
          }

          linkedImpacts.push({
            ...impact,
            parentId,
          })
        }

        if (process.env.NODE_ENV === 'development') {
          console.debug(`[loadSampleData] Creating scenario event "${event.name}" with impacts:`, linkedImpacts.map(i => ({ targetType: i.targetType, parentId: i.parentId })))
        }

        const createdEvent = await financialApi.createScenarioEvent({
          ...event,
          impacts: linkedImpacts,
        } as ScenarioEvent)
        scenarioEvents.push(createdEvent)
      }

      // Create BTO property scenario via Property Planner V2
      // This replaces the legacy "BTO Key Collection" scenario event
      let propertyScenario: PropertyScenarioFull | null = null
      try {
        const btoKeyCollectionDate = getMonthString(5) // 5 years from now
        const btoScenarioInput: CreateScenarioInput = {
          country: 'SG',
          sgDetails: {
            name: 'BTO Flat (Tengah)',
            propertyType: 'hdb',
            propertySubtype: 'bto',
            icon: 'home',
            iconColor: '#3b82f6', // Blue
            isIncluded: true,
            propertyPrice: '450000',
            loanType: 'hdb',
            downpaymentCpfOa: '100000', // Using CPF OA for downpayment
            downpaymentCash: '0',
            borrowerType: 'single',
            otherDebt: '0',
            propertyCount: 0, // First property
            btoKeyCollectionDate,
          },
          ratePeriods: [
            {
              startMonth: btoKeyCollectionDate,
              termYears: 25,
              rate: '2.6', // HDB concessionary rate 2.6%
              rateType: 'fixed' as const,
            },
          ],
          growthPeriods: [
            {
              startYear: 0,
              growthRate: '3.0', // 3% annual appreciation
              growthStrategy: 'compound_monthly',
            },
          ],
          fees: [
            {
              feeContext: 'purchase',
              feeType: 'renovation',
              description: 'Renovation for new BTO flat',
              amount: '50000',
              isPercentage: false,
              frequency: 'one_time',
              startDate: btoKeyCollectionDate,
              endDate: btoKeyCollectionDate, // One-time fee occurs at key collection
            },
          ],
        }

        propertyScenario = await propertyPlannerV2Api.createScenario(btoScenarioInput)
        console.debug('[loadSampleData] Created BTO property scenario via V2:', propertyScenario.scenario.id)
      } catch (error) {
        console.error('[loadSampleData] Failed to create BTO property scenario:', error)
        // Non-fatal: continue even if property scenario creation fails
      }

      return { assets, investments, liabilities, incomes, expenses: expensesResult.data, scenarioEvents, cpfAccount, propertyScenario }
    },
    onSuccess: (data) => {
      // Update all caches with the new data - this immediately updates the UI
      queryClient.setQueryData(QUERY_KEYS.financial.assets, data.assets)
      queryClient.setQueryData(QUERY_KEYS.financial.investments, data.investments)
      queryClient.setQueryData(QUERY_KEYS.financial.liabilities, data.liabilities)
      queryClient.setQueryData(QUERY_KEYS.financial.incomes, data.incomes)
      queryClient.setQueryData(QUERY_KEYS.financial.expenses, data.expenses)
      queryClient.setQueryData(QUERY_KEYS.financial.scenarioEvents, data.scenarioEvents)
      if (data.cpfAccount) {
        queryClient.setQueryData(CPF_QUERY_KEY, data.cpfAccount)
      }
      // Set property planner V2 cache if scenario was created
      if (data.propertyScenario) {
        queryClient.setQueryData<PropertyScenarioFull[]>(
          propertyPlannerV2Keys.list(),
          [data.propertyScenario]
        )
      }

      // Invalidate derived queries that need to be recalculated (timeline, netWorth, etc)
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.financial.timeline })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.financial.timelineV2 })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.financial.netWorth })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.financial.cashflow })
      queryClient.invalidateQueries({ queryKey: CPF_QUERY_KEY })
      queryClient.invalidateQueries({ queryKey: propertyPlannerV2Keys.all })
    },
  })
}
