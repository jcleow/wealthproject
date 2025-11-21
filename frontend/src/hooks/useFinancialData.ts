import { useEffect, useState, useCallback } from 'react'
import type { Asset, Expense, Income, Liability } from '../types/financial'
import { financialApi } from '../services/financialApi'

export function useFinancialData() {
  const [assets, setAssets] = useState<Asset[]>([])
  const [incomes, setIncomes] = useState<Income[]>([])
  const [liabilities, setLiabilities] = useState<Liability[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
    return created
  }

  const updateAsset = async (id: string, updates: Partial<Asset>) => {
    const updated = await financialApi.updateAsset(id, updates)
    setAssets(prev => prev.map(asset => (asset.id === id ? updated : asset)))
    return updated
  }

  const deleteAsset = async (id: string) => {
    await financialApi.deleteAsset(id)
    setAssets(prev => prev.filter(asset => asset.id !== id))
  }

  // Income operations
  const addIncome = async (income: Omit<Income, 'id' | 'updatedAt'>) => {
    const created = await financialApi.createIncome(income)
    setIncomes(prev => [...prev, created])
    return created
  }

  const updateIncome = async (id: string, updates: Partial<Income>) => {
    const updated = await financialApi.updateIncome(id, updates)
    setIncomes(prev => prev.map(income => (income.id === id ? updated : income)))
    return updated
  }

  const deleteIncome = async (id: string) => {
    await financialApi.deleteIncome(id)
    setIncomes(prev => prev.filter(income => income.id !== id))
  }

  // Liability operations
  const addLiability = async (liability: Omit<Liability, 'id' | 'updatedAt'>) => {
    const created = await financialApi.createLiability(liability)
    setLiabilities(prev => [...prev, created])
    return created
  }

  const updateLiability = async (id: string, updates: Partial<Liability>) => {
    const updated = await financialApi.updateLiability(id, updates)
    setLiabilities(prev => prev.map(liability => (liability.id === id ? updated : liability)))
    return updated
  }

  const deleteLiability = async (id: string) => {
    await financialApi.deleteLiability(id)
    setLiabilities(prev => prev.filter(liability => liability.id !== id))
  }

  // Expense operations
  const addExpense = async (expense: Omit<Expense, 'id' | 'updatedAt'>) => {
    const created = await financialApi.createExpense(expense)
    setExpenses(prev => [...prev, created])
    return created
  }

  const updateExpense = async (id: string, updates: Partial<Expense>) => {
    const updated = await financialApi.updateExpense(id, updates)
    setExpenses(prev => prev.map(expense => (expense.id === id ? updated : expense)))
    return updated
  }

  const deleteExpense = async (id: string) => {
    await financialApi.deleteExpense(id)
    setExpenses(prev => prev.filter(expense => expense.id !== id))
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
  }
}
