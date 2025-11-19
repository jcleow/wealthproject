import { useState, useEffect } from 'react'
import type { Asset, Income, Liability, Expense } from '@/lib/financial/types'

// Storage keys
const STORAGE_KEYS = {
  ASSETS: 'financial_assets',
  INCOMES: 'financial_incomes',
  LIABILITIES: 'financial_liabilities',
  EXPENSES: 'financial_expenses',
} as const

// Helper functions for localStorage
const getStoredData = <T>(key: string): T[] => {
  try {
    const data = localStorage.getItem(key)
    return data ? JSON.parse(data) : []
  } catch (error) {
    console.error(`Error loading ${key} from localStorage:`, error)
    return []
  }
}

const setStoredData = <T>(key: string, data: T[]): void => {
  try {
    localStorage.setItem(key, JSON.stringify(data))
  } catch (error) {
    console.error(`Error saving ${key} to localStorage:`, error)
  }
}

export function useFinancialData() {
  // State for each data type
  const [assets, setAssets] = useState<Asset[]>([])
  const [incomes, setIncomes] = useState<Income[]>([])
  const [liabilities, setLiabilities] = useState<Liability[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])

  // Load data from localStorage on mount
  useEffect(() => {
    setAssets(getStoredData<Asset>(STORAGE_KEYS.ASSETS))
    setIncomes(getStoredData<Income>(STORAGE_KEYS.INCOMES))
    setLiabilities(getStoredData<Liability>(STORAGE_KEYS.LIABILITIES))
    setExpenses(getStoredData<Expense>(STORAGE_KEYS.EXPENSES))
  }, [])

  // Asset operations
  const addAsset = (asset: Omit<Asset, 'id' | 'updatedAt'>) => {
    const newAsset: Asset = {
      ...asset,
      id: Date.now().toString(),
      updatedAt: new Date().toISOString(),
    }
    const updatedAssets = [...assets, newAsset]
    setAssets(updatedAssets)
    setStoredData(STORAGE_KEYS.ASSETS, updatedAssets)
    return newAsset
  }

  const updateAsset = (id: string, updates: Partial<Asset>) => {
    const updatedAssets = assets.map(asset =>
      asset.id === id
        ? { ...asset, ...updates, updatedAt: new Date().toISOString() }
        : asset
    )
    setAssets(updatedAssets)
    setStoredData(STORAGE_KEYS.ASSETS, updatedAssets)
  }

  const deleteAsset = (id: string) => {
    const updatedAssets = assets.filter(asset => asset.id !== id)
    setAssets(updatedAssets)
    setStoredData(STORAGE_KEYS.ASSETS, updatedAssets)
  }

  // Income operations
  const addIncome = (income: Omit<Income, 'id' | 'updatedAt'>) => {
    const newIncome: Income = {
      ...income,
      id: Date.now().toString(),
      updatedAt: new Date().toISOString(),
    }
    const updatedIncomes = [...incomes, newIncome]
    setIncomes(updatedIncomes)
    setStoredData(STORAGE_KEYS.INCOMES, updatedIncomes)
    return newIncome
  }

  const updateIncome = (id: string, updates: Partial<Income>) => {
    const updatedIncomes = incomes.map(income =>
      income.id === id
        ? { ...income, ...updates, updatedAt: new Date().toISOString() }
        : income
    )
    setIncomes(updatedIncomes)
    setStoredData(STORAGE_KEYS.INCOMES, updatedIncomes)
  }

  const deleteIncome = (id: string) => {
    const updatedIncomes = incomes.filter(income => income.id !== id)
    setIncomes(updatedIncomes)
    setStoredData(STORAGE_KEYS.INCOMES, updatedIncomes)
  }

  // Liability operations
  const addLiability = (liability: Omit<Liability, 'id' | 'updatedAt'>) => {
    const newLiability: Liability = {
      ...liability,
      id: Date.now().toString(),
      updatedAt: new Date().toISOString(),
    }
    const updatedLiabilities = [...liabilities, newLiability]
    setLiabilities(updatedLiabilities)
    setStoredData(STORAGE_KEYS.LIABILITIES, updatedLiabilities)
    return newLiability
  }

  const updateLiability = (id: string, updates: Partial<Liability>) => {
    const updatedLiabilities = liabilities.map(liability =>
      liability.id === id
        ? { ...liability, ...updates, updatedAt: new Date().toISOString() }
        : liability
    )
    setLiabilities(updatedLiabilities)
    setStoredData(STORAGE_KEYS.LIABILITIES, updatedLiabilities)
  }

  const deleteLiability = (id: string) => {
    const updatedLiabilities = liabilities.filter(liability => liability.id !== id)
    setLiabilities(updatedLiabilities)
    setStoredData(STORAGE_KEYS.LIABILITIES, updatedLiabilities)
  }

  // Expense operations
  const addExpense = (expense: Omit<Expense, 'id' | 'updatedAt'>) => {
    const newExpense: Expense = {
      ...expense,
      id: Date.now().toString(),
      updatedAt: new Date().toISOString(),
    }
    const updatedExpenses = [...expenses, newExpense]
    setExpenses(updatedExpenses)
    setStoredData(STORAGE_KEYS.EXPENSES, updatedExpenses)
    return newExpense
  }

  const updateExpense = (id: string, updates: Partial<Expense>) => {
    const updatedExpenses = expenses.map(expense =>
      expense.id === id
        ? { ...expense, ...updates, updatedAt: new Date().toISOString() }
        : expense
    )
    setExpenses(updatedExpenses)
    setStoredData(STORAGE_KEYS.EXPENSES, updatedExpenses)
  }

  const deleteExpense = (id: string) => {
    const updatedExpenses = expenses.filter(expense => expense.id !== id)
    setExpenses(updatedExpenses)
    setStoredData(STORAGE_KEYS.EXPENSES, updatedExpenses)
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
  }
}
