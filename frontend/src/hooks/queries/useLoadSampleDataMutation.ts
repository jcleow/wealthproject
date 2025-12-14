import { useMutation, useQueryClient } from '@tanstack/react-query'
import { financialApi } from '@/api/financial'
import type { Income, Expense } from '@/types/financial'
import type { CPFAccountCreatePayload } from '@/types/cpf'
import type { ScenarioEvent } from '@/types/scenario'
import { QUERY_KEYS } from '@/lib/queryKeys'

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
      // First clear all data including CPF
      await Promise.all([
        financialApi.deleteAllAssets(),
        financialApi.deleteAllInvestments(),
        financialApi.deleteAllLiabilities(),
        financialApi.deleteAllIncomes(),
        financialApi.deleteAllExpenses(),
        financialApi.deleteAllCashAccounts(),
        financialApi.deleteAllScenarioEvents(),
        financialApi.deleteCPFAccount().catch(() => {}), // Ignore if no CPF account exists
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
          await financialApi.updateCPFAccount(sampleCPFAccount)
        } else {
          await financialApi.createCPFAccount(sampleCPFAccount)
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
          source: 'Software Engineer Salary',
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
          payee: 'Parents Allowance',
          category: 'Family',
          amount: 500,
          frequency: 'monthly',
          startDate: todayIso,
          growthRate: 2.0,
          notes: 'Monthly contribution to parents',
        },
        {
          payee: 'Rent (Room)',
          category: 'Housing',
          amount: 1200,
          frequency: 'monthly',
          startDate: todayIso,
          growthRate: 3.0,
          notes: 'Master bedroom in shared HDB, Toa Payoh',
        },
        {
          payee: 'Groceries & Hawker',
          category: 'Food',
          amount: 600,
          frequency: 'monthly',
          startDate: todayIso,
          growthRate: 3.0,
          notes: 'Mix of cooking and hawker center meals',
        },
        {
          payee: 'Dining & Social',
          category: 'Food',
          amount: 400,
          frequency: 'monthly',
          startDate: todayIso,
          growthRate: 2.0,
          notes: 'Restaurants, dates, gatherings with friends',
        },
        {
          payee: 'Public Transport',
          category: 'Transport',
          amount: 120,
          frequency: 'monthly',
          startDate: todayIso,
          growthRate: 2.0,
          notes: 'MRT and bus, monthly concession',
        },
        {
          payee: 'Grab/Taxi',
          category: 'Transport',
          amount: 100,
          frequency: 'monthly',
          startDate: todayIso,
          growthRate: 3.0,
          notes: 'Late nights and rainy days',
        },
        {
          payee: 'Mobile Plan',
          category: 'Bills',
          amount: 45,
          frequency: 'monthly',
          startDate: todayIso,
          growthRate: 0,
          notes: 'Circles.Life SIM-only plan',
        },
        {
          payee: 'Subscriptions',
          category: 'Bills',
          amount: 50,
          frequency: 'monthly',
          startDate: todayIso,
          growthRate: 2.0,
          notes: 'Netflix, Spotify, iCloud',
        },
        {
          payee: 'Term Life Insurance',
          category: 'Insurance',
          amount: 150,
          frequency: 'monthly',
          startDate: todayIso,
          growthRate: 0,
          notes: 'NTUC Income term life, $500k coverage',
        },
        {
          payee: 'Health Insurance (IP)',
          category: 'Insurance',
          amount: 80,
          frequency: 'monthly',
          startDate: todayIso,
          growthRate: 5.0,
          notes: 'Integrated Shield Plan rider, paid from Medisave + cash',
        },
        {
          payee: 'Gym Membership',
          category: 'Health',
          amount: 100,
          frequency: 'monthly',
          startDate: todayIso,
          growthRate: 2.0,
          notes: 'ActiveSG + occasional ClassPass',
        },
        {
          payee: 'Personal Care',
          category: 'Personal',
          amount: 80,
          frequency: 'monthly',
          startDate: todayIso,
          growthRate: 2.0,
          notes: 'Haircut, toiletries, etc',
        },
        {
          payee: 'Shopping & Entertainment',
          category: 'Personal',
          amount: 200,
          frequency: 'monthly',
          startDate: todayIso,
          growthRate: 2.0,
          notes: 'Clothes, gadgets, movies',
        },
        {
          payee: 'Investment Contribution',
          category: 'Savings',
          amount: 500,
          frequency: 'monthly',
          startDate: todayIso,
          growthRate: 3.0,
          notes: 'Monthly DCA to Syfe portfolio',
        },
        {
          payee: 'Annual Travel Fund',
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
              cadence: 'one_time',
              startMonth: getMonthString(2),
              notes: 'Wedding banquet, photography, honeymoon (~$50k total)',
            },
          ],
        },
        {
          name: 'BTO Key Collection',
          description: '4-room BTO flat in Tengah. Using CPF OA for downpayment, taking HDB loan. Finally moving out of rental!',
          occursOn: getMonthString(5),
          displayIcon: 'home',
          displayColor: '#3b82f6', // Blue
          tags: ['milestone', 'property', 'housing'],
          isIncluded: true,
          impacts: [
            {
              targetType: 'asset',
              impactKind: 'start',
              amount: 450000,
              currency: 'SGD',
              cadence: 'one_time',
              startMonth: getMonthString(5),
              notes: '4-room BTO flat in Tengah (estimated value)',
            },
            {
              targetType: 'liability',
              impactKind: 'start',
              amount: 350000,
              currency: 'SGD',
              cadence: 'one_time',
              startMonth: getMonthString(5),
              notes: 'HDB loan at 2.6% for 25 years (~$1,600/month)',
            },
            {
              targetType: 'expense',
              impactKind: 'delta',
              amount: 400,
              currency: 'SGD',
              cadence: 'monthly',
              startMonth: getMonthString(5),
              notes: 'Net housing cost change: +$1,600 HDB loan - $1,200 rent saved = +$400',
            },
            {
              targetType: 'expense',
              impactKind: 'start',
              amount: 50000,
              currency: 'SGD',
              cadence: 'one_time',
              startMonth: getMonthString(5),
              notes: 'Renovation and furniture (~$50k)',
            },
          ],
        },
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
              impactKind: 'delta',
              amount: 1500,
              currency: 'SGD',
              cadence: 'monthly',
              startMonth: getMonthString(4),
              notes: 'Childcare, diapers, formula, baby essentials (~$1.5k/month ongoing)',
            },
            {
              targetType: 'income',
              impactKind: 'start',
              amount: 11000,
              currency: 'SGD',
              cadence: 'one_time',
              startMonth: getMonthString(4),
              notes: 'Baby Bonus cash gift ($11k for first child) - offsets $8k baby gear',
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
              cadence: 'one_time',
              startMonth: getMonthString(7),
              notes: 'Toyota Corolla Hybrid (depreciating asset)',
            },
            {
              targetType: 'liability',
              impactKind: 'start',
              amount: 100000,
              currency: 'SGD',
              cadence: 'one_time',
              startMonth: getMonthString(7),
              notes: 'Car loan at 2.78% for 7 years',
            },
            {
              targetType: 'expense',
              impactKind: 'start',
              amount: 1600,
              currency: 'SGD',
              cadence: 'monthly',
              startMonth: getMonthString(7),
              notes: 'Car Running Costs',
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

      const [assets, investments, liabilities, incomes, expenses] = await Promise.all([
        Promise.all(sampleAssets.map(asset => financialApi.createAsset(asset))),
        Promise.all(sampleInvestments.map(investment => financialApi.createInvestment(investment))),
        Promise.all(sampleLiabilities.map(liability => financialApi.createLiability(liability))),
        Promise.all(sampleIncomes.map(income => financialApi.createIncome(income))),
        Promise.all(sampleExpenses.map(expense => financialApi.createExpense(expense))),
      ])

      // Build lookup maps for linking delta/override impacts to existing items
      const incomeBySource = new Map(incomes.map(inc => [inc.source, inc.id]))

      // Create scenario events with properly linked impacts
      // For 'start' impacts: create new financial items and link them
      // For 'delta'/'override' impacts: link to existing items by name match
      const scenarioEvents: ScenarioEvent[] = []

      for (const event of sampleScenarioEvents) {
        const linkedImpacts = []

        for (const impact of event.impacts ?? []) {
          let targetId: string | undefined = undefined

          if (impact.impactKind === 'start') {
            // Create a new financial item for this start impact
            const startMonth = impact.startMonth ?? event.occursOn
            // Use the impact amount (must be positive for income/expense schemas)
            const impactAmount = Math.abs(impact.amount ?? 1)
            const isOneTime = impact.cadence === 'one_time'
            const startDateIso = startMonth ? new Date(startMonth).toISOString() : new Date().toISOString()
            // For one-time items, set endDate to end of same month so they only appear once
            const endDateIso = isOneTime ? (() => {
              const d = startMonth ? new Date(startMonth) : new Date()
              // Set to last day of the month
              d.setMonth(d.getMonth() + 1, 0)
              d.setHours(23, 59, 59, 999)
              return d.toISOString()
            })() : undefined

            if (impact.targetType === 'asset') {
              const newAsset = await financialApi.createAsset({
                name: impact.notes || `${event.name} - Asset`,
                category: 'Investment',
                currentValue: impactAmount,
                annualGrowthRate: 3.0,
                notes: `Created by scenario: ${event.name}`,
                startDate: startDateIso,
                endDate: endDateIso,
              })
              targetId = newAsset.id
            } else if (impact.targetType === 'liability') {
              const newLiability = await financialApi.createLiability({
                name: impact.notes || `${event.name} - Liability`,
                category: 'Loan',
                currentBalance: impactAmount,
                interestRateApr: 3.0,
                minimumPayment: 0,
                notes: `Created by scenario: ${event.name}`,
                startDate: startDateIso,
                endDate: endDateIso,
              })
              targetId = newLiability.id
            } else if (impact.targetType === 'income') {
              const newIncome = await financialApi.createIncome({
                source: impact.notes || `${event.name} - Income`,
                category: 'Other',
                amount: impactAmount,
                // Use 'one_time' frequency for one-time items (backend handles this specially)
                // endDate provides a second layer of protection against recurrence
                frequency: isOneTime ? 'one_time' : 'monthly',
                startDate: startDateIso,
                endDate: endDateIso,
                growthRate: 0,
                notes: `Created by scenario: ${event.name}`,
              })
              targetId = newIncome.id
            } else if (impact.targetType === 'expense') {
              const newExpense = await financialApi.createExpense({
                payee: impact.notes || `${event.name} - Expense`,
                category: 'Other',
                amount: impactAmount,
                // Use 'one_time' frequency for one-time items (backend handles this specially)
                // endDate provides a second layer of protection against recurrence
                frequency: isOneTime ? 'one_time' : 'monthly',
                startDate: startDateIso,
                endDate: endDateIso,
                growthRate: 0,
                notes: `Created by scenario: ${event.name}`,
              })
              targetId = newExpense.id
            }
          } else if (impact.impactKind === 'delta' || impact.impactKind === 'override') {
            // Link to existing items based on targetType
            // For delta/override, we try to find a matching existing item
            if (impact.targetType === 'income') {
              // Look for the main salary income for income-related impacts
              targetId = incomeBySource.get('Software Engineer Salary') ?? undefined
            } else if (impact.targetType === 'expense') {
              // For expense deltas, use the first expense as a generic target
              // (In real usage, the user would select the specific item)
              const firstExpenseId = expenses[0]?.id
              targetId = firstExpenseId ?? undefined
            }
          }

          if (process.env.NODE_ENV === 'development') {
            console.debug(`[loadSampleData] Impact for ${event.name}:`, {
              targetType: impact.targetType,
              impactKind: impact.impactKind,
              targetId,
            })
          }

          linkedImpacts.push({
            ...impact,
            targetId,
          })
        }

        if (process.env.NODE_ENV === 'development') {
          console.debug(`[loadSampleData] Creating scenario event "${event.name}" with impacts:`, linkedImpacts.map(i => ({ targetType: i.targetType, targetId: i.targetId })))
        }

        const createdEvent = await financialApi.createScenarioEvent({
          ...event,
          impacts: linkedImpacts,
        } as ScenarioEvent)
        scenarioEvents.push(createdEvent)
      }

      return { assets, investments, liabilities, incomes, expenses, scenarioEvents }
    },
    onSuccess: (data) => {
      // Update all caches with the new data - this immediately updates the UI
      queryClient.setQueryData(QUERY_KEYS.financial.assets, data.assets)
      queryClient.setQueryData(QUERY_KEYS.financial.investments, data.investments)
      queryClient.setQueryData(QUERY_KEYS.financial.liabilities, data.liabilities)
      queryClient.setQueryData(QUERY_KEYS.financial.incomes, data.incomes)
      queryClient.setQueryData(QUERY_KEYS.financial.expenses, data.expenses)
      queryClient.setQueryData(QUERY_KEYS.financial.scenarioEvents, data.scenarioEvents)

      // Invalidate derived queries that need to be recalculated (timeline, netWorth, etc)
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.financial.timeline })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.financial.netWorth })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.financial.cashflow })
    },
  })
}
