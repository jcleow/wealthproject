'use client'

import { useMemo } from 'react'
import { usePersonsQuery } from '@/hooks/queries/usePersonsQuery'
import { useIncomesQuery } from '@/hooks/queries/useIncomesQuery'
import { useLiabilitiesQuery } from '@/hooks/queries/useLiabilitiesQuery'
import { useAssetsQuery } from '@/hooks/queries/useAssetsQuery'
import type { Frequency } from '@/types/financial'
import type {
  LifeTpdAnswers,
  CriticalIllnessAnswers,
  SelfInsuranceAnswers,
} from '@/stores/coverageGuidelinesStore'

// Frequency multipliers to convert to annual
const frequencyMultipliers: Record<Frequency, number> = {
  weekly: 52,
  biweekly: 26,
  monthly: 12,
  quarterly: 4,
  annual: 1,
  one_time: 0,
}

/**
 * Calculate age from date of birth
 */
function calculateAge(dateOfBirth: string): number {
  const today = new Date()
  const birth = new Date(dateOfBirth)
  let age = today.getFullYear() - birth.getFullYear()
  const monthDiff = today.getMonth() - birth.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--
  }
  return age
}

/**
 * Estimate years until a dependent is financially independent
 * Assumes independence at age 22 (university graduation)
 */
function yearsUntilIndependent(age: number): number {
  const independenceAge = 22
  return Math.max(0, independenceAge - age)
}

/**
 * Categories that indicate liquid assets (accessible for emergencies/self-insurance)
 */
const LIQUID_ASSET_CATEGORIES = [
  'cash',
  'savings',
  'checking',
  'money_market',
  'stocks',
  'bonds',
  'etf',
  'mutual_fund',
  'investment',
  'brokerage',
]

/**
 * Categories that indicate mortgage debt
 */
const MORTGAGE_CATEGORIES = ['mortgage', 'home_loan', 'housing_loan', 'hdb_loan']

export interface AutoPopulatedData {
  // Life/TPD data
  lifeTpd: Partial<LifeTpdAnswers>
  // Critical Illness data
  criticalIllness: Partial<CriticalIllnessAnswers>
  // Self Insurance data
  selfInsurance: Partial<SelfInsuranceAnswers>
  // Computed values for display
  computed: {
    totalAnnualIncome: number
    primaryPersonIncome: number
    spouseIncome: number
    totalMortgage: number
    totalOtherDebts: number
    totalLiquidAssets: number
    totalAssets: number
    dependentCount: number
    youngestDependentAge: number | null
    hasSpouse: boolean
    spouseHasIncome: boolean
  }
  // Data source indicators (to show user what was auto-filled)
  sources: {
    income: boolean
    liabilities: boolean
    assets: boolean
    persons: boolean
  }
  // Loading state
  isLoading: boolean
}

/**
 * Hook to auto-populate questionnaire data from existing app data
 *
 * @param selectedPersonId - The person ID for whom we're calculating coverage
 */
export function useQuestionnaireAutoPopulate(selectedPersonId: string | null): AutoPopulatedData {
  const { data: persons, isLoading: personsLoading } = usePersonsQuery()
  const { data: incomes, isLoading: incomesLoading } = useIncomesQuery()
  const { data: liabilities, isLoading: liabilitiesLoading } = useLiabilitiesQuery()
  const { data: assets, isLoading: assetsLoading } = useAssetsQuery()

  const isLoading = personsLoading || incomesLoading || liabilitiesLoading || assetsLoading

  return useMemo(() => {
    // Default empty result
    const emptyResult: AutoPopulatedData = {
      lifeTpd: {},
      criticalIllness: {},
      selfInsurance: {},
      computed: {
        totalAnnualIncome: 0,
        primaryPersonIncome: 0,
        spouseIncome: 0,
        totalMortgage: 0,
        totalOtherDebts: 0,
        totalLiquidAssets: 0,
        totalAssets: 0,
        dependentCount: 0,
        youngestDependentAge: null,
        hasSpouse: false,
        spouseHasIncome: false,
      },
      sources: {
        income: false,
        liabilities: false,
        assets: false,
        persons: false,
      },
      isLoading,
    }

    if (isLoading) return emptyResult

    // ─────────────────────────────────────────────────────────
    // PERSONS: Calculate dependents and spouse info
    // ─────────────────────────────────────────────────────────
    const includedPersons = persons?.filter(p => p.isIncluded) ?? []
    const primaryPerson = selectedPersonId
      ? includedPersons.find(p => p.id === selectedPersonId)
      : includedPersons[0]

    // Other persons (potential spouse + dependents)
    const otherPersons = includedPersons.filter(p => p.id !== primaryPerson?.id)

    // Identify spouse (assume second adult is spouse - persons with age >= 18)
    // and dependents (persons with age < 18 or still in education)
    const personsWithAge = otherPersons.map(p => ({
      ...p,
      age: calculateAge(p.dateOfBirth),
    }))

    // Adults (18+) could be spouse
    const adults = personsWithAge.filter(p => p.age >= 18)
    const spouse = adults[0] // First other adult is assumed to be spouse

    // Dependents: children (< 22, assuming education) or all non-primary persons if we want to be inclusive
    const dependents = personsWithAge.filter(p => p.age < 22)

    const youngestDependent = dependents.length > 0
      ? dependents.reduce((youngest, p) => p.age < youngest.age ? p : youngest)
      : null

    // ─────────────────────────────────────────────────────────
    // INCOME: Calculate annual income for primary person and spouse
    // ─────────────────────────────────────────────────────────
    const activeIncomes = incomes?.filter(inc => {
      if (inc.endDate && new Date(inc.endDate) < new Date()) return false
      return true
    }) ?? []

    // Primary person's income
    const primaryPersonIncomes = activeIncomes.filter(inc => inc.personId === primaryPerson?.id)
    const primaryPersonIncome = primaryPersonIncomes.reduce((sum, inc) => {
      const multiplier = frequencyMultipliers[inc.frequency as Frequency] || 0
      return sum + (inc.amount * multiplier)
    }, 0)

    // Spouse's income (if spouse exists)
    const spouseIncomes = spouse
      ? activeIncomes.filter(inc => inc.personId === spouse.id)
      : []
    const spouseIncome = spouseIncomes.reduce((sum, inc) => {
      const multiplier = frequencyMultipliers[inc.frequency as Frequency] || 0
      return sum + (inc.amount * multiplier)
    }, 0)

    // Total household income
    const totalAnnualIncome = activeIncomes.reduce((sum, inc) => {
      const multiplier = frequencyMultipliers[inc.frequency as Frequency] || 0
      return sum + (inc.amount * multiplier)
    }, 0)

    // ─────────────────────────────────────────────────────────
    // LIABILITIES: Calculate mortgage and other debts
    // ─────────────────────────────────────────────────────────
    const activeLiabilities = liabilities?.filter(lib => {
      if (lib.endDate && new Date(lib.endDate) < new Date()) return false
      return true
    }) ?? []

    const mortgageDebts = activeLiabilities.filter(lib =>
      MORTGAGE_CATEGORIES.some(cat => lib.category.toLowerCase().includes(cat))
    )
    const totalMortgage = mortgageDebts.reduce((sum, lib) => sum + lib.currentBalance, 0)

    const otherDebts = activeLiabilities.filter(lib =>
      !MORTGAGE_CATEGORIES.some(cat => lib.category.toLowerCase().includes(cat))
    )
    const totalOtherDebts = otherDebts.reduce((sum, lib) => sum + lib.currentBalance, 0)

    // ─────────────────────────────────────────────────────────
    // ASSETS: Calculate liquid assets and total assets
    // ─────────────────────────────────────────────────────────
    const activeAssets = assets?.filter(asset => {
      if (asset.endDate && new Date(asset.endDate) < new Date()) return false
      return true
    }) ?? []

    const liquidAssets = activeAssets.filter(asset =>
      LIQUID_ASSET_CATEGORIES.some(cat => asset.category.toLowerCase().includes(cat))
    )
    const totalLiquidAssets = liquidAssets.reduce((sum, asset) => sum + asset.currentValue, 0)
    const totalAssets = activeAssets.reduce((sum, asset) => sum + asset.currentValue, 0)

    // ─────────────────────────────────────────────────────────
    // BUILD QUESTIONNAIRE PRE-POPULATION DATA
    // ─────────────────────────────────────────────────────────

    const hasSpouse = !!spouse
    const spouseHasIncome = spouseIncome > 0

    // Life/TPD answers
    const lifeTpdData: Partial<LifeTpdAnswers> = {
      dependentCount: dependents.length,
      youngestDependentAge: youngestDependent?.age ?? null,
      yearsUntilIndependent: youngestDependent
        ? yearsUntilIndependent(youngestDependent.age)
        : 0,
      mortgageBalance: totalMortgage,
      otherDebts: totalOtherDebts,
      existingAssets: totalAssets,
      spouseHasIncome,
      spouseIncome: spouseHasIncome ? spouseIncome : 0,
    }

    // Critical Illness answers
    // Estimate emergency fund months based on liquid assets / monthly expenses
    const estimatedMonthlyExpenses = primaryPersonIncome / 12 * 0.7 // Assume 70% of income goes to expenses
    const emergencyFundMonths = estimatedMonthlyExpenses > 0
      ? Math.round(totalLiquidAssets / estimatedMonthlyExpenses)
      : 0

    const criticalIllnessData: Partial<CriticalIllnessAnswers> = {
      emergencyFundMonths: Math.min(emergencyFundMonths, 24), // Cap at 24 months
      monthlyExpenses: Math.round(estimatedMonthlyExpenses),
    }

    // Self Insurance answers
    const selfInsuranceData: Partial<SelfInsuranceAnswers> = {
      liquidNetWorth: totalLiquidAssets,
    }

    return {
      lifeTpd: lifeTpdData,
      criticalIllness: criticalIllnessData,
      selfInsurance: selfInsuranceData,
      computed: {
        totalAnnualIncome,
        primaryPersonIncome,
        spouseIncome,
        totalMortgage,
        totalOtherDebts,
        totalLiquidAssets,
        totalAssets,
        dependentCount: dependents.length,
        youngestDependentAge: youngestDependent?.age ?? null,
        hasSpouse,
        spouseHasIncome,
      },
      sources: {
        income: activeIncomes.length > 0,
        liabilities: activeLiabilities.length > 0,
        assets: activeAssets.length > 0,
        persons: includedPersons.length > 0,
      },
      isLoading: false,
    }
  }, [persons, incomes, liabilities, assets, selectedPersonId, isLoading])
}
