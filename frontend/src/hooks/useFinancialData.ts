import { useEffect, useState, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { Asset, Expense, Income, Liability } from '../types/financial'
import { financialApi } from '../services/financialApi'

export function useFinancialData() {
  const queryClient = useQueryClient()
  const [assets, setAssets] = useState<Asset[]>([])
  const [incomes, setIncomes] = useState<Income[]>([])
  const [liabilities, setLiabilities] = useState<Liability[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const dispatchRefreshEvent = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['timeline'] }).catch(() => {
      // ignore cache errors
    })
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('financial-data-refresh'))
    }
  }, [queryClient])

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [assetData, incomeData, liabilityData, expenseData] = await Promise.all([
        financialApi.listAssets(),
        financialApi.listIncomes(),
        financialApi.listLiabilities(),
        financialApi.listExpenses(),
      ])
      setAssets(assetData)
      setIncomes(incomeData)
      setLiabilities(liabilityData)
      setExpenses(expenseData)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load financial data'
      setError(message)
      console.error(message, err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  useEffect(() => {
    const handler = () => void refresh()
    if (typeof window !== 'undefined') {
      window.addEventListener('financial-data-refresh', handler)
      return () => window.removeEventListener('financial-data-refresh', handler)
    }
  }, [refresh])

  // Asset operations
  const addAsset = async (asset: Omit<Asset, 'id' | 'updatedAt'>) => {
    const created = await financialApi.createAsset(asset)
    setAssets(prev => [...prev, created])
    dispatchRefreshEvent()
    return created
  }

  const updateAsset = async (id: string, updates: Partial<Asset>) => {
    const updated = await financialApi.updateAsset(id, updates)
    setAssets(prev => prev.map(asset => (asset.id === id ? updated : asset)))
    dispatchRefreshEvent()
    return updated
  }

  const deleteAsset = async (id: string) => {
    await financialApi.deleteAsset(id)
    setAssets(prev => prev.filter(asset => asset.id !== id))
    dispatchRefreshEvent()
  }

  // Income operations
  const addIncome = async (income: Omit<Income, 'id' | 'updatedAt'>) => {
    const created = await financialApi.createIncome(income)
    setIncomes(prev => [...prev, created])
    dispatchRefreshEvent()
    return created
  }

  const updateIncome = async (id: string, updates: Partial<Income>) => {
    const updated = await financialApi.updateIncome(id, updates)
    setIncomes(prev => prev.map(income => (income.id === id ? updated : income)))
    dispatchRefreshEvent()
    return updated
  }

  const deleteIncome = async (id: string) => {
    await financialApi.deleteIncome(id)
    setIncomes(prev => prev.filter(income => income.id !== id))
    dispatchRefreshEvent()
  }

  // Liability operations
  const addLiability = async (liability: Omit<Liability, 'id' | 'updatedAt'>) => {
    const created = await financialApi.createLiability(liability)
    setLiabilities(prev => [...prev, created])
    dispatchRefreshEvent()
    return created
  }

  const updateLiability = async (id: string, updates: Partial<Liability>) => {
    const updated = await financialApi.updateLiability(id, updates)
    setLiabilities(prev => prev.map(liability => (liability.id === id ? updated : liability)))
    dispatchRefreshEvent()
    return updated
  }

  const deleteLiability = async (id: string) => {
    await financialApi.deleteLiability(id)
    setLiabilities(prev => prev.filter(liability => liability.id !== id))
    dispatchRefreshEvent()
  }

  // Expense operations
  const addExpense = async (expense: Omit<Expense, 'id' | 'updatedAt'>) => {
    const created = await financialApi.createExpense(expense)
    setExpenses(prev => [...prev, created])
    dispatchRefreshEvent()
    return created
  }

  const updateExpense = async (id: string, updates: Partial<Expense>) => {
    const updated = await financialApi.updateExpense(id, updates)
    setExpenses(prev => prev.map(expense => (expense.id === id ? updated : expense)))
    dispatchRefreshEvent()
    return updated
  }

  const deleteExpense = async (id: string) => {
    await financialApi.deleteExpense(id)
    setExpenses(prev => prev.filter(expense => expense.id !== id))
    dispatchRefreshEvent()
  }

  // Calculation helpers
  const getTotalAssets = () => {
    return assets.reduce((total, asset) => total + asset.currentValue, 0)
  }

  const getTotalLiabilities = () => {
    return liabilities.reduce((total, liability) => total + liability.currentBalance, 0)
  }

  const getNetWorth = () => {
    return getTotalAssets() - getTotalLiabilities()
  }

  const getMonthlyIncome = () => {
    return incomes.reduce((total, income) => {
      switch (income.frequency) {
        case 'weekly': return total + (income.amount * 52 / 12)
        case 'biweekly': return total + (income.amount * 26 / 12)
        case 'monthly': return total + income.amount
        case 'quarterly': return total + (income.amount / 3)
        case 'yearly': return total + (income.amount / 12)
        default: return total
      }
    }, 0)
  }

  const getMonthlyExpenses = () => {
    return expenses.reduce((total, expense) => {
      switch (expense.frequency) {
        case 'weekly': return total + (expense.amount * 52 / 12)
        case 'biweekly': return total + (expense.amount * 26 / 12)
        case 'monthly': return total + expense.amount
        case 'quarterly': return total + (expense.amount / 3)
        case 'yearly': return total + (expense.amount / 12)
        default: return total
      }
    }, 0)
  }

  const getMonthlySavings = () => {
    return getMonthlyIncome() - getMonthlyExpenses()
  }

  const deleteAllFinancialData = async () => {
    setLoading(true)
    setError(null)
    try {
      const [assetList, incomeList, liabilityList, expenseList] = await Promise.all([
        financialApi.listAssets(),
        financialApi.listIncomes(),
        financialApi.listLiabilities(),
        financialApi.listExpenses(),
      ])

      await Promise.all([
        Promise.all(assetList.map((item) => financialApi.deleteAsset(item.id))),
        Promise.all(incomeList.map((item) => financialApi.deleteIncome(item.id))),
        Promise.all(liabilityList.map((item) => financialApi.deleteLiability(item.id))),
        Promise.all(expenseList.map((item) => financialApi.deleteExpense(item.id))),
      ])

      setAssets([])
      setIncomes([])
      setLiabilities([])
      setExpenses([])
      dispatchRefreshEvent()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to clear financial data'
      setError(message)
      console.error(message, err)
      throw err
    } finally {
      setLoading(false)
    }
  }

  const loadSampleData = async () => {
    setLoading(true)
    setError(null)
    try {
      await refresh()

      const sampleAssets: Array<Omit<Asset, 'id' | 'updatedAt'>> = [
        { name: 'Savings Account', category: 'cash', currentValue: 12000, annualGrowthRate: 1.5, notes: 'Emergency fund' },
        { name: 'Brokerage – Index ETF', category: 'investment', currentValue: 25000, annualGrowthRate: 5.5, notes: 'Global equity exposure' },
        { name: 'Sample Condo', category: 'property', currentValue: 750000, annualGrowthRate: 3.0, notes: 'Primary residence scenario' },
      ]

      const sampleLiabilities: Array<Omit<Liability, 'id' | 'updatedAt'>> = [
        { name: 'Credit Card', category: 'short-term', currentBalance: 1200, interestRateApr: 18.0, minimumPayment: 80, notes: 'Pay down monthly' },
        { name: 'Sample Condo Mortgage', category: 'property', currentBalance: 550000, interestRateApr: 3.2, minimumPayment: 2400, notes: '25-year loan' },
      ]

      const sampleIncomes: Array<Omit<Income, 'id' | 'updatedAt'>> = [
        { source: 'Salary', amount: 8200, frequency: 'monthly', startDate: new Date(), category: 'employment', notes: 'Base salary' },
        { source: 'Freelance', amount: 1200, frequency: 'monthly', startDate: new Date(), category: 'side-income', notes: 'Consulting' },
      ]

      const sampleExpenses: Array<Omit<Expense, 'id' | 'updatedAt'>> = [
        { payee: 'Rent/Utilities', amount: 2200, frequency: 'monthly', category: 'housing', notes: 'Monthly fixed' },
        { payee: 'Groceries', amount: 600, frequency: 'monthly', category: 'living', notes: 'Household spend' },
        { payee: 'Transport', amount: 200, frequency: 'monthly', category: 'transport', notes: 'Public/ride-hail' },
      ]

      const existingAssets = await financialApi.listAssets()
      const existingLiabilities = await financialApi.listLiabilities()
      const existingIncomes = await financialApi.listIncomes()
      const existingExpenses = await financialApi.listExpenses()

      const ensureAsset = async (payload: Omit<Asset, 'id' | 'updatedAt'>) => {
        const found = existingAssets.find((a) => a.name === payload.name)
        return found ?? (await financialApi.createAsset(payload))
      }
      const ensureLiability = async (payload: Omit<Liability, 'id' | 'updatedAt'>) => {
        const found = existingLiabilities.find((l) => l.name === payload.name)
        return found ?? (await financialApi.createLiability(payload))
      }
      const ensureIncome = async (payload: Omit<Income, 'id' | 'updatedAt'>) => {
        const found = existingIncomes.find((i) => i.source === payload.source && i.frequency === payload.frequency)
        return found ?? (await financialApi.createIncome(payload))
      }
      const ensureExpense = async (payload: Omit<Expense, 'id' | 'updatedAt'>) => {
        const found = existingExpenses.find((e) => e.payee === payload.payee && e.frequency === payload.frequency)
        return found ?? (await financialApi.createExpense(payload))
      }

      const [assetResults, liabilityResults, incomeResults, expenseResults] = await Promise.all([
        Promise.all(sampleAssets.map(ensureAsset)),
        Promise.all(sampleLiabilities.map(ensureLiability)),
        Promise.all(sampleIncomes.map(ensureIncome)),
        Promise.all(sampleExpenses.map(ensureExpense)),
      ])

      setAssets(assetResults)
      setLiabilities(liabilityResults)
      setIncomes(incomeResults)
      setExpenses(expenseResults)
      dispatchRefreshEvent()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load sample data'
      setError(message)
      console.error(message, err)
      throw err
    } finally {
      setLoading(false)
    }
  }

  return {
    // Data
    assets,
    incomes,
    liabilities,
    expenses,

    // Asset operations
    addAsset,
    updateAsset,
    deleteAsset,

    // Income operations
    addIncome,
    updateIncome,
    deleteIncome,

    // Liability operations
    addLiability,
    updateLiability,
    deleteLiability,

    // Expense operations
    addExpense,
    updateExpense,
    deleteExpense,

    // Calculations
    getTotalAssets,
    getTotalLiabilities,
    getNetWorth,
    getMonthlyIncome,
    getMonthlyExpenses,
    getMonthlySavings,
    loading,
    error,
    refresh,
    deleteAllFinancialData,
    loadSampleData,
  }
}
