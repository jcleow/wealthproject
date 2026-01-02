import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
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

export interface TaxModeState {
  // Mode state
  isTaxModeEnabled: boolean
  viewMode: TaxViewMode
  selectedYearTaxData: TaxYearData | null
  residencyStatus: TaxResidencyStatus

  // Actions
  toggleTaxMode: () => void
  enableTaxMode: () => void
  disableTaxMode: () => void
  setViewMode: (mode: TaxViewMode) => void
  setSelectedYearTaxData: (data: TaxYearData | null) => void
  setResidencyStatus: (status: TaxResidencyStatus) => void
  updateRelief: (reliefId: string, claimedAmount: number) => void
  resetReliefs: () => void
}

// ============================================
// STORE
// ============================================

const initialState = {
  isTaxModeEnabled: false,
  viewMode: 'summary' as TaxViewMode,
  selectedYearTaxData: null as TaxYearData | null,
  residencyStatus: 'resident' as TaxResidencyStatus,
}

export const useTaxModeStore = create<TaxModeState>()(
  devtools(
    (set) => ({
      ...initialState,

      // Mode toggles
      toggleTaxMode: () => set((state) => ({ isTaxModeEnabled: !state.isTaxModeEnabled })),
      enableTaxMode: () => set({ isTaxModeEnabled: true }),
      disableTaxMode: () => set({ isTaxModeEnabled: false }),

      // View mode
      setViewMode: (mode) => set({ viewMode: mode }),

      // Tax data
      setSelectedYearTaxData: (data) => set({ selectedYearTaxData: data }),
      setResidencyStatus: (status) => set({ residencyStatus: status }),

      // Relief management
      updateRelief: (reliefId, claimedAmount) =>
        set((state) => {
          if (!state.selectedYearTaxData) return state
          return {
            selectedYearTaxData: {
              ...state.selectedYearTaxData,
              reliefs: state.selectedYearTaxData.reliefs.map((relief) =>
                relief.id === reliefId
                  ? { ...relief, claimedAmount: Math.min(claimedAmount, relief.maxAmount) }
                  : relief
              ),
            },
          }
        }),

      resetReliefs: () =>
        set((state) => {
          if (!state.selectedYearTaxData) return state
          return {
            selectedYearTaxData: {
              ...state.selectedYearTaxData,
              reliefs: state.selectedYearTaxData.reliefs.map((relief) => ({
                ...relief,
                claimedAmount: relief.autoCalculated ? relief.claimedAmount : 0,
              })),
            },
          }
        }),
    }),
    { name: 'tax-mode-store' }
  )
)

// ============================================
// SELECTORS (for optimized subscriptions)
// ============================================

export const useTaxModeEnabled = () => useTaxModeStore((s) => s.isTaxModeEnabled)
export const useTaxViewMode = () => useTaxModeStore((s) => s.viewMode)
export const useTaxYearData = () => useTaxModeStore((s) => s.selectedYearTaxData)
export const useTaxResidencyStatus = () => useTaxModeStore((s) => s.residencyStatus)

// Combined selector for components that need multiple values
export const useTaxModeActions = () =>
  useTaxModeStore((s) => ({
    toggleTaxMode: s.toggleTaxMode,
    enableTaxMode: s.enableTaxMode,
    disableTaxMode: s.disableTaxMode,
    setViewMode: s.setViewMode,
    setSelectedYearTaxData: s.setSelectedYearTaxData,
    setResidencyStatus: s.setResidencyStatus,
    updateRelief: s.updateRelief,
    resetReliefs: s.resetReliefs,
  }))
