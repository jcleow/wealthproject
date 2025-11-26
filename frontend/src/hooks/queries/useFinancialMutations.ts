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
          currentValue: 25000,
          interestRate: 1.5,
        },
        {
          name: 'Investment Portfolio',
          category: 'Investment',
          currentValue: 15000,
          interestRate: 7,
        },
        {
          name: 'Emergency Fund',
          category: 'Bank Account',
          currentValue: 10000,
          interestRate: 2,
        },
      ]

      const sampleLiabilities = [
        {
          name: 'Student Loan',
          category: 'Loan',
          currentBalance: 15000,
          interestRate: 4.5,
          minimumPayment: 300,
        },
        {
          name: 'Credit Card',
          category: 'Credit Card',
          currentBalance: 3000,
          interestRate: 18,
          minimumPayment: 150,
        },
      ]

      const nowIso = new Date().toISOString()
      const sampleIncomes: Array<Omit<Income, 'id' | 'updatedAt'>> = [
        {
          source: 'Salary',
          category: 'Employment',
          amount: 550000,
          frequency: 'monthly',
          startDate: nowIso,
          notes: 'Base pay',
        },
        {
          source: 'Freelance',
          category: 'Business',
          amount: 100000,
          frequency: 'monthly',
          startDate: nowIso,
          notes: 'Side work',
        },
      ]

      const sampleExpenses: Array<Omit<Expense, 'id' | 'updatedAt'>> = [
        {
          payee: 'Rent',
          category: 'Housing',
          amount: 180000,
          frequency: 'monthly',
          notes: 'Monthly rent',
        },
        {
          payee: 'Groceries',
          category: 'Food',
          amount: 60000,
          frequency: 'monthly',
          notes: 'Groceries',
        },
        {
          payee: 'Transportation',
          category: 'Transport',
          amount: 30000,
          frequency: 'monthly',
          notes: 'Transit',
        },
        {
          payee: 'Utilities',
          category: 'Bills',
          amount: 20000,
          frequency: 'monthly',
          notes: 'Utilities',
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
