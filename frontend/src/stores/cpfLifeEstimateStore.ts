import { create } from 'zustand'
import { useShallow } from 'zustand/react/shallow'
import { devtools } from 'zustand/middleware'
import type { CPFLifeEstimateResponse } from '@/api/financial/cpf'

// ============================================
// TYPES
// ============================================

export type CPFLifeEstimateMode = 'account' | 'standalone'

export interface CPFLifeEstimateInputs {
  // Mode determines whether we use an existing CPF account or standalone inputs
  mode: CPFLifeEstimateMode

  // Account mode - get birth year/gender from linked Person
  cpfAccountId: string | null

  // Standalone mode - manual inputs
  birthYear: number | null
  gender: 'male' | 'female' | null

  // Required for both modes
  raBalanceAt65: string
  payoutStartAge: number
}

export interface CPFLifeEstimateState extends CPFLifeEstimateInputs {
  // Cached result from last successful calculation
  lastResult: CPFLifeEstimateResponse | null

  // Actions - Mode
  setMode: (mode: CPFLifeEstimateMode) => void

  // Actions - Account mode
  setCpfAccountId: (id: string | null) => void

  // Actions - Standalone mode
  setBirthYear: (year: number | null) => void
  setGender: (gender: 'male' | 'female' | null) => void

  // Actions - Common inputs
  setRaBalanceAt65: (balance: string) => void
  setPayoutStartAge: (age: number) => void

  // Actions - Results
  setLastResult: (result: CPFLifeEstimateResponse | null) => void

  // Actions - Reset
  reset: () => void
  resetInputs: () => void
}

// ============================================
// INITIAL STATE
// ============================================

const initialInputs: CPFLifeEstimateInputs = {
  mode: 'standalone',
  cpfAccountId: null,
  birthYear: null,
  gender: null,
  raBalanceAt65: '',
  payoutStartAge: 65,
}

// ============================================
// STORE
// ============================================

export const useCpfLifeEstimateStore = create<CPFLifeEstimateState>()(
  devtools(
    (set) => ({
      ...initialInputs,
      lastResult: null,

      // Mode
      setMode: (mode) => set({ mode }),

      // Account mode
      setCpfAccountId: (cpfAccountId) => set({ cpfAccountId }),

      // Standalone mode
      setBirthYear: (birthYear) => set({ birthYear }),
      setGender: (gender) => set({ gender }),

      // Common inputs
      setRaBalanceAt65: (raBalanceAt65) => set({ raBalanceAt65 }),
      setPayoutStartAge: (payoutStartAge) => set({ payoutStartAge }),

      // Results
      setLastResult: (lastResult) => set({ lastResult }),

      // Reset everything
      reset: () => set({ ...initialInputs, lastResult: null }),

      // Reset just inputs (keep result for reference)
      resetInputs: () => set(initialInputs),
    }),
    { name: 'cpf-life-estimate-store' }
  )
)

// ============================================
// SELECTORS
// ============================================

/**
 * Select the current input mode
 */
export const useCpfLifeEstimateMode = () =>
  useCpfLifeEstimateStore((s) => s.mode)

/**
 * Select all inputs needed for the API call
 */
export const useCpfLifeEstimateInputs = () =>
  useCpfLifeEstimateStore(
    useShallow((s) => ({
      mode: s.mode,
      cpfAccountId: s.cpfAccountId,
      birthYear: s.birthYear,
      gender: s.gender,
      raBalanceAt65: s.raBalanceAt65,
      payoutStartAge: s.payoutStartAge,
    }))
  )

/**
 * Select the last cached result
 */
export const useCpfLifeEstimateResult = () =>
  useCpfLifeEstimateStore((s) => s.lastResult)

/**
 * Select all actions for updating inputs
 */
export const useCpfLifeEstimateActions = () =>
  useCpfLifeEstimateStore(
    useShallow((s) => ({
      setMode: s.setMode,
      setCpfAccountId: s.setCpfAccountId,
      setBirthYear: s.setBirthYear,
      setGender: s.setGender,
      setRaBalanceAt65: s.setRaBalanceAt65,
      setPayoutStartAge: s.setPayoutStartAge,
      setLastResult: s.setLastResult,
      reset: s.reset,
      resetInputs: s.resetInputs,
    }))
  )

/**
 * Check if the current inputs are valid for calculation
 */
export const useCpfLifeEstimateIsValid = () =>
  useCpfLifeEstimateStore((s) => {
    // RA balance is required for both modes
    if (!s.raBalanceAt65 || parseFloat(s.raBalanceAt65) <= 0) {
      return false
    }

    // Payout start age must be between 65 and 70
    if (s.payoutStartAge < 65 || s.payoutStartAge > 70) {
      return false
    }

    if (s.mode === 'account') {
      // Account mode requires a CPF account ID
      return !!s.cpfAccountId
    } else {
      // Standalone mode requires birth year and gender
      return s.birthYear !== null && s.gender !== null
    }
  })
