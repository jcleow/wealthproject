'use client'

import { createContext, useContext, useState, useCallback, useMemo, type ReactNode } from 'react'
import type { TaxResidencyStatus, TaxRelief, TaxCalculationResult } from '@/lib/taxCalculations'

// ============================================
// TYPES
// ============================================

export type TaxViewMode = 'summary' | 'detailed'

export interface TaxYearData {
  year: number
  grossIncome: number
  cpfDeductions: number
  reliefs: TaxRelief[]
  residencyStatus: TaxResidencyStatus
  calculation: TaxCalculationResult | null
}

export interface TaxModeContextType {
  // Mode state
  isTaxModeEnabled: boolean
  toggleTaxMode: () => void
  enableTaxMode: () => void
  disableTaxMode: () => void

  // View state
  viewMode: TaxViewMode
  setViewMode: (mode: TaxViewMode) => void

  // Selected year tax data (populated by useTaxModeData hook)
  selectedYearTaxData: TaxYearData | null
  setSelectedYearTaxData: (data: TaxYearData | null) => void

  // Relief editing
  updateRelief: (reliefId: string, claimedAmount: number) => void
  resetReliefs: () => void

  // Residency status
  residencyStatus: TaxResidencyStatus
  setResidencyStatus: (status: TaxResidencyStatus) => void
}

// ============================================
// CONTEXT
// ============================================

const TaxModeContext = createContext<TaxModeContextType | null>(null)

// ============================================
// PROVIDER
// ============================================

interface TaxModeProviderProps {
  children: ReactNode
}

export function TaxModeProvider({ children }: TaxModeProviderProps) {
  // Core state
  const [isTaxModeEnabled, setIsTaxModeEnabled] = useState(false)
  const [viewMode, setViewMode] = useState<TaxViewMode>('summary')
  const [selectedYearTaxData, setSelectedYearTaxData] = useState<TaxYearData | null>(null)
  const [residencyStatus, setResidencyStatus] = useState<TaxResidencyStatus>('resident')

  // Toggle functions
  const toggleTaxMode = useCallback(() => {
    setIsTaxModeEnabled(prev => !prev)
  }, [])

  const enableTaxMode = useCallback(() => {
    setIsTaxModeEnabled(true)
  }, [])

  const disableTaxMode = useCallback(() => {
    setIsTaxModeEnabled(false)
  }, [])

  // Relief management
  const updateRelief = useCallback((reliefId: string, claimedAmount: number) => {
    setSelectedYearTaxData(prev => {
      if (!prev) return prev
      return {
        ...prev,
        reliefs: prev.reliefs.map(relief =>
          relief.id === reliefId
            ? { ...relief, claimedAmount: Math.min(claimedAmount, relief.maxAmount) }
            : relief
        ),
      }
    })
  }, [])

  const resetReliefs = useCallback(() => {
    setSelectedYearTaxData(prev => {
      if (!prev) return prev
      return {
        ...prev,
        reliefs: prev.reliefs.map(relief => ({
          ...relief,
          claimedAmount: relief.autoCalculated ? relief.claimedAmount : 0,
        })),
      }
    })
  }, [])

  // Memoized context value
  const contextValue = useMemo<TaxModeContextType>(() => ({
    isTaxModeEnabled,
    toggleTaxMode,
    enableTaxMode,
    disableTaxMode,
    viewMode,
    setViewMode,
    selectedYearTaxData,
    setSelectedYearTaxData,
    updateRelief,
    resetReliefs,
    residencyStatus,
    setResidencyStatus,
  }), [
    isTaxModeEnabled,
    toggleTaxMode,
    enableTaxMode,
    disableTaxMode,
    viewMode,
    selectedYearTaxData,
    updateRelief,
    resetReliefs,
    residencyStatus,
  ])

  return (
    <TaxModeContext.Provider value={contextValue}>
      {children}
    </TaxModeContext.Provider>
  )
}

// ============================================
// HOOK
// ============================================

export function useTaxMode(): TaxModeContextType {
  const context = useContext(TaxModeContext)
  if (!context) {
    throw new Error('useTaxMode must be used within a TaxModeProvider')
  }
  return context
}

// Optional hook that returns null if outside provider (for conditional usage)
export function useTaxModeOptional(): TaxModeContextType | null {
  return useContext(TaxModeContext)
}
