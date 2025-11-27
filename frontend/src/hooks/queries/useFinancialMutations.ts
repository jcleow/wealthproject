import { useMutation, useQueryClient } from '@tanstack/react-query'
import { financialApi } from '@/services/financialApi'
import { ASSETS_QUERY_KEY } from './useAssetsQuery'
import { LIABILITIES_QUERY_KEY } from './useLiabilitiesQuery'
import { INCOMES_QUERY_KEY } from './useIncomesQuery'
import { EXPENSES_QUERY_KEY } from './useExpensesQuery'

export function useDeleteAllFinancialDataMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      await Promise.all([
        financialApi.deleteAllAssets(),
        financialApi.deleteAllLiabilities(),
        financialApi.deleteAllIncomes(),
        financialApi.deleteAllExpenses(),
      ])
    },
    onSuccess: () => {
      // Clear all caches
      queryClient.setQueryData(ASSETS_QUERY_KEY, [])
      queryClient.setQueryData(LIABILITIES_QUERY_KEY, [])
      queryClient.setQueryData(INCOMES_QUERY_KEY, [])
      queryClient.setQueryData(EXPENSES_QUERY_KEY, [])

      // Invalidate all related queries
      queryClient.invalidateQueries({ queryKey: ['timeline'] })
      queryClient.invalidateQueries({ queryKey: ['net-worth'] })
      queryClient.invalidateQueries({ queryKey: ['cashflow'] })
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
      ])

      // Then load sample data
      const sampleAssets = [
        {
          name: 'Savings Account',
          category: 'Bank Account',
          currentValue: 12000,
          interestRate: 1.2,
        },
        {
          name: 'CPF Ordinary Account',
          category: 'Retirement',
          currentValue: 30000,
          interestRate: 2.5,
        },
        {
          name: 'ETF Portfolio',
          category: 'Investment',
          currentValue: 15000,
          interestRate: 5.5,
        },
        {
          name: 'Emergency Fund',
          category: 'Bank Account',
          currentValue: 8000,
          interestRate: 1.8,
        },
      ]

      const sampleLiabilities = [
        {
          name: 'Education Loan',
          category: 'Loan',
          currentBalance: 10000,
          interestRate: 3,
          minimumPayment: 220,
        },
        {
          name: 'Credit Card',
          category: 'Credit Card',
          currentBalance: 1200,
          interestRate: 24,
          minimumPayment: 80,
        },
      ]

      const nowIso = new Date().toISOString()
      const sampleIncomes: Array<Omit<Income, 'id' | 'updatedAt'>> = [
        {
          source: 'Salary',
          category: 'Employment',
          amount: 6500,
          frequency: 'monthly',
          startDate: nowIso,
          notes: 'Mid-level office role in Singapore',
        },
        {
          source: 'Side Projects',
          category: 'Freelance',
          amount: 400,
          frequency: 'monthly',
          startDate: nowIso,
          notes: 'Occasional weekend work',
        },
      ]

      const sampleExpenses: Array<Omit<Expense, 'id' | 'updatedAt'>> = [
        {
          payee: 'Rent',
          category: 'Housing',
          amount: 1800,
          frequency: 'monthly',
          notes: 'Room in shared apartment',
        },
        {
          payee: 'Groceries',
          category: 'Food',
          amount: 450,
          frequency: 'monthly',
          notes: 'Groceries and essentials',
        },
        {
          payee: 'Transportation',
          category: 'Transport',
          amount: 150,
          frequency: 'monthly',
          notes: 'MRT/bus plus occasional ride-hail',
        },
        {
          payee: 'Utilities',
          category: 'Bills',
          amount: 120,
          frequency: 'monthly',
          notes: 'Power and water',
        },
        {
          payee: 'Mobile & Internet',
          category: 'Bills',
          amount: 80,
          frequency: 'monthly',
          notes: 'SIM-only and fibre',
        },
        {
          payee: 'Insurance',
          category: 'Insurance',
          amount: 200,
          frequency: 'monthly',
          notes: 'Health and term life coverage',
        },
        {
          payee: 'Dining Out',
          category: 'Food',
          amount: 300,
          frequency: 'monthly',
          notes: 'Weekend meals and coffee',
        },
      ]

      const [assets, liabilities, incomes, expenses] = await Promise.all([
        Promise.all(sampleAssets.map(asset => financialApi.createAsset(asset))),
        Promise.all(sampleLiabilities.map(liability => financialApi.createLiability(liability))),
        Promise.all(sampleIncomes.map(income => financialApi.createIncome(income))),
        Promise.all(sampleExpenses.map(expense => financialApi.createExpense(expense))),
      ])

      return { assets, liabilities, incomes, expenses }
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
    },
  })
}
