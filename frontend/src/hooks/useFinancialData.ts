import { useEffect, useState } from 'react'
import type { Asset, Expense, Income, Liability } from '../types/financial'

type FinancialDataState = {
  assets: Asset[]
  incomes: Income[]
  liabilities: Liability[]
  expenses: Expense[]
}

const STORAGE_KEY = 'financial-data'

const loadFromStorage = (): FinancialDataState => {
  if (typeof window === 'undefined') {
    return { assets: [], incomes: [], liabilities: [], expenses: [] }
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      return { assets: [], incomes: [], liabilities: [], expenses: [] }
    }
    return JSON.parse(raw) as FinancialDataState
  } catch (error) {
    console.warn('Failed to parse stored financial data, resetting.', error)
    return { assets: [], incomes: [], liabilities: [], expenses: [] }
  }
}

const saveToStorage = (state: FinancialDataState) => {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch (error) {
    console.warn('Unable to persist financial data.', error)
  }
}

const nowIso = () => new Date().toISOString()

export function useFinancialData() {
  const [assets, setAssets] = useState<Asset[]>([])
  const [incomes, setIncomes] = useState<Income[]>([])
  const [liabilities, setLiabilities] = useState<Liability[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load data from localStorage on mount
  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError(null)
      const stored = loadFromStorage()
      setAssets(stored.assets)
      setLiabilities(stored.liabilities)
      setIncomes(stored.incomes)
      setExpenses(stored.expenses)
      setLoading(false)
    }
    load()
  }, [])

  const withPersist = <T,>(updater: () => { next: FinancialDataState; result: T }) => {
    const { next, result } = updater()
    saveToStorage(next)
    return result
  }

  // Asset operations
  const addAsset = async (asset: Omit<Asset, 'id' | 'updatedAt'>) => {
    const created: Asset = {
      id: crypto.randomUUID(),
      updatedAt: nowIso(),
      ...asset,
    }
    return withPersist(() => {
      const nextAssets = [...assets, created]
      setAssets(nextAssets)
      return {
        next: { assets: nextAssets, incomes, liabilities, expenses },
        result: created,
      }
    })
  }

  const updateAsset = async (id: string, updates: Partial<Asset>) => {
    const updated = withPersist(() => {
      const nextAssets = assets.map(asset =>
        asset.id === id ? { ...asset, ...updates, updatedAt: nowIso() } : asset
      )
      setAssets(nextAssets)
      return {
        next: { assets: nextAssets, incomes, liabilities, expenses },
        result: nextAssets.find(asset => asset.id === id),
      }
    })
    return updated
  }

  const deleteAsset = async (id: string) => {
    withPersist(() => {
      const nextAssets = assets.filter(asset => asset.id !== id)
      setAssets(nextAssets)
      return { next: { assets: nextAssets, incomes, liabilities, expenses }, result: undefined }
    })
  }

  // Income operations
  const addIncome = async (income: Omit<Income, 'id' | 'updatedAt'>) => {
    const created: Income = {
      id: crypto.randomUUID(),
      updatedAt: nowIso(),
      ...income,
    }
    return withPersist(() => {
      const nextIncomes = [...incomes, created]
      setIncomes(nextIncomes)
      return { next: { assets, incomes: nextIncomes, liabilities, expenses }, result: created }
    })
  }

  const updateIncome = async (id: string, updates: Partial<Income>) => {
    const updated = withPersist(() => {
      const nextIncomes = incomes.map(income =>
        income.id === id ? { ...income, ...updates, updatedAt: nowIso() } : income
      )
      setIncomes(nextIncomes)
      return { next: { assets, incomes: nextIncomes, liabilities, expenses }, result: nextIncomes.find(income => income.id === id) }
    })
    return updated
  }

  const deleteIncome = async (id: string) => {
    withPersist(() => {
      const nextIncomes = incomes.filter(income => income.id !== id)
      setIncomes(nextIncomes)
      return { next: { assets, incomes: nextIncomes, liabilities, expenses }, result: undefined }
    })
  }

  // Liability operations
  const addLiability = async (liability: Omit<Liability, 'id' | 'updatedAt'>) => {
    const created: Liability = {
      id: crypto.randomUUID(),
      updatedAt: nowIso(),
      ...liability,
    }
    return withPersist(() => {
      const nextLiabilities = [...liabilities, created]
      setLiabilities(nextLiabilities)
      return { next: { assets, incomes, liabilities: nextLiabilities, expenses }, result: created }
    })
  }

  const updateLiability = async (id: string, updates: Partial<Liability>) => {
    const updated = withPersist(() => {
      const nextLiabilities = liabilities.map(liability =>
        liability.id === id ? { ...liability, ...updates, updatedAt: nowIso() } : liability
      )
      setLiabilities(nextLiabilities)
      return { next: { assets, incomes, liabilities: nextLiabilities, expenses }, result: nextLiabilities.find(liability => liability.id === id) }
    })
    return updated
  }

  const deleteLiability = async (id: string) => {
    withPersist(() => {
      const nextLiabilities = liabilities.filter(liability => liability.id !== id)
      setLiabilities(nextLiabilities)
      return { next: { assets, incomes, liabilities: nextLiabilities, expenses }, result: undefined }
    })
  }

  // Expense operations
  const addExpense = async (expense: Omit<Expense, 'id' | 'updatedAt'>) => {
    const created: Expense = {
      id: crypto.randomUUID(),
      updatedAt: nowIso(),
      ...expense,
    }
    return withPersist(() => {
      const nextExpenses = [...expenses, created]
      setExpenses(nextExpenses)
      return { next: { assets, incomes, liabilities, expenses: nextExpenses }, result: created }
    })
  }

  const updateExpense = async (id: string, updates: Partial<Expense>) => {
    const updated = withPersist(() => {
      const nextExpenses = expenses.map(expense =>
        expense.id === id ? { ...expense, ...updates, updatedAt: nowIso() } : expense
      )
      setExpenses(nextExpenses)
      return { next: { assets, incomes, liabilities, expenses: nextExpenses }, result: nextExpenses.find(expense => expense.id === id) }
    })
    return updated
  }

  const deleteExpense = async (id: string) => {
    withPersist(() => {
      const nextExpenses = expenses.filter(expense => expense.id !== id)
      setExpenses(nextExpenses)
      return { next: { assets, incomes, liabilities, expenses: nextExpenses }, result: undefined }
    })
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
  }
}
