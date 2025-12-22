'use client'

import { createContext, useContext, ReactNode } from 'react'
import { useFinancialData } from '../hooks/useFinancialData'
import type { Asset, Expense, Income, Liability } from '../types/financial'

interface FinancialDataContextType {
  addAsset: (asset: Omit<Asset, 'id' | 'updatedAt'>) => Promise<Asset>
  addIncome: (income: Omit<Income, 'id' | 'updatedAt'>) => Promise<Income>
  addLiability: (liability: Omit<Liability, 'id' | 'updatedAt'>) => Promise<Liability>
  addExpense: (expense: Omit<Expense, 'id' | 'updatedAt'>) => Promise<Expense>
  updateAsset: (id: string, updates: Partial<Asset>) => Promise<Asset>
  updateIncome: (id: string, updates: Partial<Income>) => Promise<Income>
  updateLiability: (id: string, updates: Partial<Liability>) => Promise<Liability>
  updateExpense: (id: string, updates: Partial<Expense> & { sourceLiabilityId?: string }) => Promise<Expense>
  deleteAsset: (id: string) => Promise<void>
  deleteIncome: (id: string) => Promise<void>
  deleteLiability: (id: string) => Promise<void>
  deleteExpense: (id: string) => Promise<void>
  refresh: () => Promise<void>
  deleteAllFinancialData: () => Promise<void>
  loadSampleData: () => Promise<void>
}

const FinancialDataContext = createContext<FinancialDataContextType | undefined>(undefined)

export function FinancialDataProvider({ children }: { children: ReactNode }) {
  const financialData = useFinancialData()

  return (
    <FinancialDataContext.Provider value={financialData}>
      {children}
    </FinancialDataContext.Provider>
  )
}

export function useFinancialDataContext() {
  const context = useContext(FinancialDataContext)
  if (context === undefined) {
    throw new Error('useFinancialDataContext must be used within a FinancialDataProvider')
  }
  return context
}