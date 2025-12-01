import { useMutation, useQueryClient } from '@tanstack/react-query'
import { financialApi } from '@/services/financialApi'
import type { Income, Expense } from '@/types/financial'
import type { ScenarioEvent } from '@/types/scenario'
import { ASSETS_QUERY_KEY } from './useAssetsQuery'
import { LIABILITIES_QUERY_KEY } from './useLiabilitiesQuery'
import { INCOMES_QUERY_KEY } from './useIncomesQuery'
import { EXPENSES_QUERY_KEY } from './useExpensesQuery'
import { CASH_ACCOUNTS_QUERY_KEY } from './useCashAccountsQuery'

// Helper to generate YYYY-MM format date strings
function getMonthString(yearsFromNow: number, monthOffset = 0): string {
  const date = new Date()
  date.setFullYear(date.getFullYear() + yearsFromNow)
  date.setMonth(date.getMonth() + monthOffset)
  return date.toISOString().slice(0, 7)
}

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

export function useLoadSampleDataMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      // First clear all data
      await Promise.all([
        financialApi.deleteAllAssets(),
        financialApi.deleteAllLiabilities(),
        financialApi.deleteAllIncomes(),
        financialApi.deleteAllExpenses(),
        financialApi.deleteAllCashAccounts(),
        financialApi.deleteAllScenarioEvents(),
      ])

      // Sample data for a 32-year-old Singaporean professional
      // Planning: marriage, BTO flat, car, retirement by 60
      const sampleAssets = [
        {
          name: 'DBS Multiplier Account',
          category: 'Bank Account',
          currentValue: 25000,
          annualGrowthRate: 2.5,
          notes: 'Main savings account with salary crediting',
        },
        {
          name: 'CPF Ordinary Account',
          category: 'Retirement',
          currentValue: 85000,
          annualGrowthRate: 2.5,
          notes: '10 years of contributions, can be used for housing',
        },
        {
          name: 'CPF Special Account',
          category: 'Retirement',
          currentValue: 45000,
          annualGrowthRate: 4.0,
          notes: 'Cannot touch until 55, higher interest rate',
        },
        {
          name: 'CPF Medisave',
          category: 'Retirement',
          currentValue: 32000,
          annualGrowthRate: 4.0,
          notes: 'Medical expenses and insurance premiums',
        },
        {
          name: 'Syfe Core Growth Portfolio',
          category: 'Investment',
          currentValue: 35000,
          annualGrowthRate: 6.0,
          notes: 'Global ETF robo-advisor, monthly DCA $500',
        },
        {
          name: 'Singapore Savings Bonds',
          category: 'Investment',
          currentValue: 20000,
          annualGrowthRate: 3.0,
          notes: 'Safe haven, 10-year average yield',
        },
        {
          name: 'Emergency Fund',
          category: 'Bank Account',
          currentValue: 18000,
          annualGrowthRate: 2.0,
          notes: '6 months expenses in high-yield savings',
        },
      ]

      const sampleLiabilities = [
        {
          name: 'Study Loan (NUS)',
          category: 'Loan',
          currentBalance: 8000,
          interestRateApr: 4.5,
          minimumPayment: 250,
          notes: 'Remaining balance from university, 3 years left',
        },
        {
          name: 'Credit Card',
          category: 'Credit Card',
          currentBalance: 800,
          interestRateApr: 26,
          minimumPayment: 50,
          notes: 'Paid in full monthly, revolving for cashback',
        },
      ]

      const nowIso = new Date().toISOString()
      const sampleIncomes: Array<Omit<Income, 'id' | 'updatedAt'>> = [
        {
          source: 'Software Engineer Salary',
          category: 'Employment',
          amount: 7500,
          frequency: 'monthly',
          startDate: nowIso,
          growthRate: 4.0,
          notes: 'Mid-senior role at tech company, 10 years experience',
        },
        {
          source: 'Annual Bonus',
          category: 'Employment',
          amount: 15000,
          frequency: 'yearly',
          startDate: nowIso,
          growthRate: 3.0,
          notes: '2 months bonus, typically paid in March',
        },
        {
          source: 'Freelance Development',
          category: 'Freelance',
          amount: 800,
          frequency: 'monthly',
          startDate: nowIso,
          growthRate: 0,
          notes: 'Side projects and consulting, variable income',
        },
      ]

      const sampleExpenses: Array<Omit<Expense, 'id' | 'updatedAt'>> = [
        {
          payee: 'Parents Allowance',
          category: 'Family',
          amount: 500,
          frequency: 'monthly',
          growthRate: 2.0,
          notes: 'Monthly contribution to parents',
        },
        {
          payee: 'Rent (Room)',
          category: 'Housing',
          amount: 1200,
          frequency: 'monthly',
          growthRate: 3.0,
          notes: 'Master bedroom in shared HDB, Toa Payoh',
        },
        {
          payee: 'Groceries & Hawker',
          category: 'Food',
          amount: 600,
          frequency: 'monthly',
          growthRate: 3.0,
          notes: 'Mix of cooking and hawker center meals',
        },
        {
          payee: 'Dining & Social',
          category: 'Food',
          amount: 400,
          frequency: 'monthly',
          growthRate: 2.0,
          notes: 'Restaurants, dates, gatherings with friends',
        },
        {
          payee: 'Public Transport',
          category: 'Transport',
          amount: 120,
          frequency: 'monthly',
          growthRate: 2.0,
          notes: 'MRT and bus, monthly concession',
        },
        {
          payee: 'Grab/Taxi',
          category: 'Transport',
          amount: 100,
          frequency: 'monthly',
          growthRate: 3.0,
          notes: 'Late nights and rainy days',
        },
        {
          payee: 'Mobile Plan',
          category: 'Bills',
          amount: 45,
          frequency: 'monthly',
          growthRate: 0,
          notes: 'Circles.Life SIM-only plan',
        },
        {
          payee: 'Subscriptions',
          category: 'Bills',
          amount: 50,
          frequency: 'monthly',
          growthRate: 2.0,
          notes: 'Netflix, Spotify, iCloud',
        },
        {
          payee: 'Term Life Insurance',
          category: 'Insurance',
          amount: 150,
          frequency: 'monthly',
          growthRate: 0,
          notes: 'NTUC Income term life, $500k coverage',
        },
        {
          payee: 'Health Insurance (IP)',
          category: 'Insurance',
          amount: 80,
          frequency: 'monthly',
          growthRate: 5.0,
          notes: 'Integrated Shield Plan rider, paid from Medisave + cash',
        },
        {
          payee: 'Gym Membership',
          category: 'Health',
          amount: 100,
          frequency: 'monthly',
          growthRate: 2.0,
          notes: 'ActiveSG + occasional ClassPass',
        },
        {
          payee: 'Personal Care',
          category: 'Personal',
          amount: 80,
          frequency: 'monthly',
          growthRate: 2.0,
          notes: 'Haircut, toiletries, etc',
        },
        {
          payee: 'Shopping & Entertainment',
          category: 'Personal',
          amount: 200,
          frequency: 'monthly',
          growthRate: 2.0,
          notes: 'Clothes, gadgets, movies',
        },
        {
          payee: 'Investment Contribution',
          category: 'Savings',
          amount: 500,
          frequency: 'monthly',
          growthRate: 3.0,
          notes: 'Monthly DCA to Syfe portfolio',
        },
        {
          payee: 'Annual Travel Fund',
          category: 'Travel',
          amount: 4000,
          frequency: 'yearly',
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
              impactKind: 'delta',
              amount: 1600,
              currency: 'SGD',
              cadence: 'monthly',
              startMonth: getMonthString(7),
              notes: 'Net car costs: $1,350 loan + $400 running - $150 saved transport = +$1,600/month',
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
            {
              targetType: 'expense',
              impactKind: 'delta',
              amount: -500,
              currency: 'SGD',
              cadence: 'monthly',
              startMonth: getMonthString(28),
              notes: 'Reduced work-related expenses',
            },
          ],
        },
      ]

      const [assets, liabilities, incomes, expenses] = await Promise.all([
        Promise.all(sampleAssets.map(asset => financialApi.createAsset(asset))),
        Promise.all(sampleLiabilities.map(liability => financialApi.createLiability(liability))),
        Promise.all(sampleIncomes.map(income => financialApi.createIncome(income))),
        Promise.all(sampleExpenses.map(expense => financialApi.createExpense(expense))),
      ])

      // Create scenario events after other data is set up
      const scenarioEvents = await Promise.all(
        sampleScenarioEvents.map(event => financialApi.createScenarioEvent(event as ScenarioEvent))
      )

      return { assets, liabilities, incomes, expenses, scenarioEvents }
    },
    onSuccess: (data) => {
      // Update all caches with the new data
      queryClient.setQueryData(ASSETS_QUERY_KEY, data.assets)
      queryClient.setQueryData(LIABILITIES_QUERY_KEY, data.liabilities)
      queryClient.setQueryData(INCOMES_QUERY_KEY, data.incomes)
      queryClient.setQueryData(EXPENSES_QUERY_KEY, data.expenses)

      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['timeline'] })
      queryClient.invalidateQueries({ queryKey: ['net-worth'] })
      queryClient.invalidateQueries({ queryKey: ['cashflow'] })
      queryClient.invalidateQueries({ queryKey: ['scenario-events'] })
    },
  })
}
