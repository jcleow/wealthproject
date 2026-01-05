import { useMutation, useQueryClient } from '@tanstack/react-query'
import { financialApi, propertyPlannerV2Api, personsApi, cashAccountsApi, fundFlowRulesApi } from '@/api/financial'
import type { Income, Expense, CashAccount } from '@/types/financial'
import type { CPFAccount, CPFAccountCreatePayload } from '@/types/cpf'
import type { ScenarioEvent } from '@/types/scenario'
import type { CreateScenarioInput, PropertyScenarioFull } from '@/types/propertyPlannerV2'
import type { Person } from '@/types/person'
import type { FundFlowRuleCreatePayload } from '@/types/fundFlowRules'
import { PERSON_COLORS } from '@/types/person'
import { DEFAULT_MONTHLY_CADENCE } from '@/types/scenario'
import { QUERY_KEYS } from '@/lib/queryKeys'
import { CPF_QUERY_KEY } from './useCpfQuery'
import { propertyPlannerV2Keys } from './usePropertyPlannerV2Query'
import { PERSONS_QUERY_KEY } from './usePersonsQuery'

// Fixed base date for sample data (January 2026)
// Using a fixed date ensures consistent sample data regardless of when it's loaded
const SAMPLE_DATA_BASE_DATE = new Date('2026-01-01T00:00:00.000Z')

// Helper to generate YYYY-MM format date strings
function getMonthString(yearsFromNow: number, monthOffset = 0): string {
  const date = new Date(SAMPLE_DATA_BASE_DATE)
  date.setFullYear(date.getFullYear() + yearsFromNow)
  date.setMonth(date.getMonth() + monthOffset)
  return date.toISOString().slice(0, 7)
}

export function useLoadSampleDataMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      let cpfAccount: CPFAccount | null = null

      // Reset all data in a single atomic transaction to avoid deadlocks
      // This replaces the previous parallel delete calls that could cause
      // deadlock errors when FK constraints cascaded simultaneously
      await financialApi.resetAllUserData()

      // Create persons first so we can link CPF accounts and incomes to them
      let alexPerson: Person | null = null
      let sarahPerson: Person | null = null

      try {
        alexPerson = await personsApi.createPerson({
          name: 'Alex',
          displayColor: PERSON_COLORS[0], // blue
          dateOfBirth: '1993-01-01', // 32 years old
          residencyStatus: 'citizen',
        })
        sarahPerson = await personsApi.createPerson({
          name: 'Sarah',
          displayColor: PERSON_COLORS[1], // emerald
          dateOfBirth: '1994-06-15', // 31 years old
          residencyStatus: 'citizen',
        })
        console.debug('[loadSampleData] Created persons:', { alexId: alexPerson.id, sarahId: sarahPerson.id })
      } catch (error) {
        console.error('[loadSampleData] Failed to create persons', error)
      }

      // Ensure CPF profile exists so timeline v2 can show CPF assets and contributions
      // This is Alex's CPF account - linked to Alex person
      // Note: Person-related fields (dateOfBirth, residencyStatus, prGrantDate) are now on the Person entity
      const sampleCPFAccount: CPFAccountCreatePayload = {
        personId: alexPerson?.id ?? '', // Required FK to persons table
        oaBalance: 85000,
        saBalance: 45000,
        maBalance: 32000,
        raBalance: 0,
        oaUsedForHousing: 0,
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

      // Create Sarah's CPF account (spouse) - linked to Sarah person
      // Note: Person-related fields are now on the Person entity
      let sarahCpfAccount: CPFAccount | null = null
      const sarahCPFAccountPayload: CPFAccountCreatePayload = {
        personId: sarahPerson?.id ?? '', // Required FK to persons table
        oaBalance: 65000,
        saBalance: 35000,
        maBalance: 25000,
        raBalance: 0,
        oaUsedForHousing: 0,
      }

      try {
        sarahCpfAccount = await financialApi.createCPFAccount(sarahCPFAccountPayload)
      } catch (error) {
        console.error('[loadSampleData] Failed to create Sarah CPF account', error)
      }

      // Create cash account for property downpayment and monthly payments
      // This serves as the default cash source for fund flow rules
      let jointSavingsAccount: CashAccount | null = null
      try {
        jointSavingsAccount = await cashAccountsApi.createCashAccount({
          name: 'Joint Savings Account',
          balance: 50000, // $50k available for property down payment + buffer
          interestRate: 2.5,
          bankName: 'DBS',
          accountType: 'savings',
          isAccumulator: true, // This is the default accumulator account
          notes: 'Joint savings for BTO downpayment and monthly mortgage payments',
        })
        console.debug('[loadSampleData] Created joint savings account:', jointSavingsAccount.id)
      } catch (error) {
        console.error('[loadSampleData] Failed to create joint savings account', error)
      }

      // Sample data for a 32-year-old Singaporean professional
      // Planning: marriage, BTO flat, car, retirement by 60
      const todayIso = SAMPLE_DATA_BASE_DATE.toISOString()

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
          personId: alexPerson?.id ?? null, // Link to Alex person
          category: 'Employment',
          amount: 7500,
          frequency: 'monthly',
          startDate: todayIso,
          growthRate: 4.0,
          cpfWageType: "ow", // Ordinary wages for monthly salary to compute CPF correctly
          notes: 'Mid-senior role at tech company, 10 years experience',
        },
        {
          name: 'Marketing Manager Salary',
          personId: sarahPerson?.id ?? null, // Link to Sarah person
          category: 'Employment',
          amount: 5000,
          frequency: 'monthly',
          startDate: todayIso,
          growthRate: 3.5,
          cpfWageType: 'ow', // Ordinary wages
          notes: 'Spouse income - marketing role at agency',
        },
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

            // For income start impacts, personId is required by the database
            // Default to Alex's person ID for family/bonus income
            const personId = impact.targetType === 'income'
              ? (alexPerson?.id ?? sarahPerson?.id ?? undefined)
              : undefined

            linkedImpacts.push({
              ...impact,
              // No parentId for start impacts - backend creates the item
              endMonth,
              personId,
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

        // Find the created income IDs for linking borrowers
        const alexIncome = incomes.find(inc => inc.name === 'Software Engineer Salary')
        const sarahIncome = incomes.find(inc => inc.name === 'Marketing Manager Salary')

        const btoScenarioInput: CreateScenarioInput = {
          country: 'SG',
          propertySG: {
            name: 'BTO Flat (Tengah)',
            propertyType: 'hdb',
            propertySubtype: 'bto',
            purchaseIcon: 'home',
            purchaseIconColor: '#3b82f6', // Blue
            saleIcon: 'banknote',
            saleIconColor: '#10b981', // Emerald
            isIncluded: true,
            propertyPrice: '450000',
            loanType: 'hdb',
            // Legacy total fields (kept for backward compatibility)
            // Note: Backend validates total CPF against primary borrower's account ($85k)
            downpaymentCpfOa: '85000',
            downpaymentCash: '27500', // 25% downpayment ($112,500) - CPF ($85k) = $27,500 cash
            borrowerType: 'joint', // Joint borrowers (Alex + Sarah)
            borrower1IncomeId: alexIncome?.id, // Link to Alex's income for projected CPF OA
            borrower1CpfAccountId: cpfAccount?.id, // Link to Alex's CPF account
            borrower2IncomeId: sarahIncome?.id, // Link to Sarah's income for projected CPF OA
            borrower2CpfAccountId: sarahCpfAccount?.id, // Link to Sarah's CPF account
            // Per-borrower CPF OA tracking for downpayment
            // Split: Alex $50k (has $85k available), Sarah $35k (has $65k available)
            borrower1DownpaymentCpfOaAmountType: 'fixed',
            borrower1DownpaymentCpfOa: '50000',
            borrower2DownpaymentCpfOaAmountType: 'fixed',
            borrower2DownpaymentCpfOa: '35000',
            // Per-borrower monthly CPF OA contributions (estimated from salaries)
            // Alex $7,500/mo → ~$1,590/mo OA, Sarah $5,000/mo → ~$1,060/mo OA
            borrower1MonthlyCpfOa: '1590',
            borrower2MonthlyCpfOa: '1060',
            // Per-borrower cash account configuration (downpayment)
            // Borrower 1 covers cash remainder from Joint Savings
            borrower1DownpaymentCashAccountId: jointSavingsAccount?.id ?? null,
            borrower1DownpaymentCashAmountType: 'remainder',
            borrower1DownpaymentCashAmount: '27500',
            // Borrower 2 has no separate cash contribution
            borrower2DownpaymentCashAccountId: null,
            borrower2DownpaymentCashAmountType: 'remainder',
            borrower2DownpaymentCashAmount: '0',
            // Per-borrower cash account configuration (monthly payment)
            // Joint Savings covers any monthly shortfall
            borrower1MonthlyCashAccountId: jointSavingsAccount?.id ?? null,
            borrower1MonthlyCashAmountType: 'remainder',
            borrower1MonthlyCashAmount: '0',
            borrower2MonthlyCashAccountId: null,
            borrower2MonthlyCashAmountType: 'remainder',
            borrower2MonthlyCashAmount: '0',
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

        // Create fund flow rules for property payment sources
        // These rules specify how downpayment and monthly mortgage payments are funded
        // Note: Fund flow rules FK references property_sg table, not property_scenarios
        // Note: Backend JSON field is "propertySgId" (lowercase 'g')
        const propertySgId = propertyScenario?.scenario.propertySgId
        if (propertyScenario && propertySgId && cpfAccount && jointSavingsAccount) {
          const propertyId = propertySgId

          // Payment rules follow priority order (lower = higher priority):
          // 1. CPF OA (priority 0) - use as much as available from CPF OA
          // 2. Cash (priority 1) - cover remainder from cash account
          // Convert YYYY-MM to RFC3339 format for backend compatibility (time.RFC3339 parsing)
          const startDateForRules = `${btoKeyCollectionDate}-01T00:00:00Z`

          const fundFlowRules: FundFlowRuleCreatePayload[] = [
            // Downpayment - CPF OA source (priority 0)
            {
              name: 'BTO Downpayment - CPF OA',
              ruleType: 'payment',
              sourceCpfAccountId: cpfAccount.id,
              targetPropertyId: propertyId,
              amountType: 'max_available',
              priority: 0,
              startDate: startDateForRules,
            },
            // Downpayment - Cash source (priority 1, covers remainder)
            {
              name: 'BTO Downpayment - Cash',
              ruleType: 'payment',
              sourceCashAccountId: jointSavingsAccount.id,
              targetPropertyId: propertyId,
              amountType: 'remainder',
              priority: 1,
              startDate: startDateForRules,
            },
            // Monthly payment - CPF OA source (priority 0)
            {
              name: 'BTO Monthly - CPF OA',
              ruleType: 'payment',
              sourceCpfAccountId: cpfAccount.id,
              targetPropertyId: propertyId,
              amountType: 'max_available',
              priority: 0,
              startDate: startDateForRules,
            },
            // Monthly payment - Cash source (priority 1, covers remainder)
            {
              name: 'BTO Monthly - Cash',
              ruleType: 'payment',
              sourceCashAccountId: jointSavingsAccount.id,
              targetPropertyId: propertyId,
              amountType: 'remainder',
              priority: 1,
              startDate: startDateForRules,
            },
          ]

          try {
            // Create rules sequentially to avoid overwhelming rate limiter
            for (const rule of fundFlowRules) {
              await fundFlowRulesApi.createFundFlowRule(rule)
            }
            console.debug('[loadSampleData] Created fund flow rules for property:', propertyId)
          } catch (ruleError) {
            console.error('[loadSampleData] Failed to create fund flow rules:', ruleError)
            // Non-fatal: property scenario is still usable without rules
          }
        }
      } catch (error) {
        console.error('[loadSampleData] Failed to create BTO property scenario:', error)
        // Non-fatal: continue even if property scenario creation fails
      }

      // Build persons array for cache
      const persons: Person[] = []
      if (alexPerson) persons.push(alexPerson)
      if (sarahPerson) persons.push(sarahPerson)

      return { assets, investments, liabilities, incomes, expenses: expensesResult.data, scenarioEvents, cpfAccount, propertyScenario, persons }
    },
    onSuccess: (data) => {
      // Update all caches with the new data - this immediately updates the UI
      queryClient.setQueryData(QUERY_KEYS.financial.assets, data.assets)
      queryClient.setQueryData(QUERY_KEYS.financial.investments, data.investments)
      queryClient.setQueryData(QUERY_KEYS.financial.liabilities, data.liabilities)
      queryClient.setQueryData(QUERY_KEYS.financial.incomes, data.incomes)
      queryClient.setQueryData(QUERY_KEYS.financial.expenses, data.expenses)
      queryClient.setQueryData(QUERY_KEYS.financial.scenarioEvents, data.scenarioEvents)
      // Set persons cache
      queryClient.setQueryData(PERSONS_QUERY_KEY, data.persons)
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
