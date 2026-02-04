import { useCallback, useState } from 'react'
import type { UseFormReturn } from 'react-hook-form'
import { generateUUID } from '@/lib/utils'
import { PERSON_COLORS } from '@/types/person'
import { FINANCIAL_PROFILES } from '../../ProfileSelectionModal/profileConfigs'
import type { ProfilePersonConfig, ProfileLiabilityConfig } from '../../ProfileSelectionModal/types'
import type {
  OnboardingFormData,
  OnboardingPerson,
  OnboardingIncome,
  OnboardingExpense,
  OnboardingAsset,
  OnboardingLiability,
  OnboardingCpf,
} from '../types'

// ─── Age → Date of Birth ─────────────────────────────────────────────────────

function ageToDob(age: number): string {
  const today = new Date()
  const birthYear = today.getFullYear() - age
  // Use Jan 1 as a sensible default birthday
  return `${birthYear}-01-01`
}

// ─── Person mapping ──────────────────────────────────────────────────────────

function mapPerson(
  person: ProfilePersonConfig,
  index: number,
): OnboardingPerson {
  const isFirst = index === 0
  return {
    tempId: generateUUID(),
    serverId: null,
    name: person.name,
    dateOfBirth: ageToDob(person.age),
    gender: 'male', // Default — user can change
    residencyStatus: person.residencyStatus,
    prGrantDate: null,
    relationship: isFirst ? 'self' : 'spouse',
    customRelationship: '',
    retirementAge: 65,
    displayColor: person.displayColor || PERSON_COLORS[index % PERSON_COLORS.length],
  }
}

// ─── Income mapping ──────────────────────────────────────────────────────────

function mapIncome(
  person: ProfilePersonConfig,
  personTempId: string,
): OnboardingIncome | null {
  if (!person.income) return null
  return {
    tempId: generateUUID(),
    serverId: null,
    personTempId,
    name: person.income.name,
    amount: person.income.amount,
    frequency: 'monthly',
    category: 'salary',
    cpfWageType: person.income.cpfWageType ?? 'ow',
    growthRate: person.income.growthRate,
  }
}

// ─── Expense generation ──────────────────────────────────────────────────────

function generateDefaultExpenses(householdMonthlyIncome: number): OnboardingExpense[] {
  if (householdMonthlyIncome <= 0) return []

  const expenseTemplates: { name: string; category: OnboardingExpense['category']; ratio: number; growthRate: number }[] = [
    { name: 'Housing & Rent', category: 'housing', ratio: 0.25, growthRate: 3 },
    { name: 'Food & Dining', category: 'food', ratio: 0.12, growthRate: 3 },
    { name: 'Transport', category: 'transport', ratio: 0.08, growthRate: 2 },
  ]

  return expenseTemplates.map((template) => ({
    tempId: generateUUID(),
    serverId: null,
    name: template.name,
    amount: Math.round(householdMonthlyIncome * template.ratio),
    frequency: 'monthly' as const,
    category: template.category,
    growthRate: template.growthRate,
  }))
}

// ─── CPF mapping ─────────────────────────────────────────────────────────────

function mapCpf(
  person: ProfilePersonConfig,
  personTempId: string,
): OnboardingCpf {
  return {
    tempId: generateUUID(),
    serverId: null,
    personTempId,
    oaBalance: person.cpfBalances.oa,
    saBalance: person.cpfBalances.sa,
    maBalance: person.cpfBalances.ma,
    raBalance: 0,
  }
}

// ─── Liability mapping ──────────────────────────────────────────────────────

function mapLiability(liability: ProfileLiabilityConfig): OnboardingLiability {
  return {
    tempId: generateUUID(),
    serverId: null,
    name: liability.name,
    category: liability.category,
    currentBalance: liability.currentBalance,
    interestRateApr: liability.interestRateApr,
    minimumPayment: liability.minimumPayment,
  }
}

// ─── Full conversion ─────────────────────────────────────────────────────────

function profileToFormData(profileId: string): OnboardingFormData | null {
  const profile = FINANCIAL_PROFILES.find((p) => p.id === profileId)
  if (!profile || profile.persons.length === 0) return null

  const persons: OnboardingPerson[] = profile.persons.map(mapPerson)
  const incomes: OnboardingIncome[] = []
  const cpfAccounts: OnboardingCpf[] = []

  for (let i = 0; i < profile.persons.length; i++) {
    const personConfig = profile.persons[i]
    const personTempId = persons[i].tempId

    const income = mapIncome(personConfig, personTempId)
    if (income) incomes.push(income)

    cpfAccounts.push(mapCpf(personConfig, personTempId))
  }

  // Total household monthly income for expense/asset scaling
  const householdMonthlyIncome = incomes.reduce((sum, inc) => sum + inc.amount, 0)

  const expenses = generateDefaultExpenses(householdMonthlyIncome)

  // Emergency fund: 3 months of income as cash savings
  const assets: OnboardingAsset[] = householdMonthlyIncome > 0
    ? [{
        tempId: generateUUID(),
        serverId: null,
        name: 'Emergency Fund',
        category: 'cash_savings',
        currentValue: Math.round(householdMonthlyIncome * 3),
        growthRate: 1.5,
      }]
    : []

  // Map liabilities from profile config
  const liabilities: OnboardingLiability[] = (profile.liabilities ?? []).map(mapLiability)

  return {
    persons,
    projectionYears: 30,
    incomes,
    expenses,
    assets,
    liabilities,
    cpfAccounts,
  }
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useLoadWizardProfile() {
  const [isProfileLoaded, setIsProfileLoaded] = useState(false)

  const loadProfile = useCallback(
    (profileId: string, form: UseFormReturn<OnboardingFormData>): boolean => {
      const formData = profileToFormData(profileId)
      if (!formData) return false

      form.reset(formData)
      setIsProfileLoaded(true)
      return true
    },
    [],
  )

  return { loadProfile, isProfileLoaded }
}
