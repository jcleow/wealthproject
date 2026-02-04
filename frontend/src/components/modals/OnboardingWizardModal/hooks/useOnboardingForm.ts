import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { generateUUID } from '@/lib/utils'
import { PERSON_COLORS } from '@/types/person'
import {
  onboardingFormSchema,
  type OnboardingFormData,
  type OnboardingPerson,
  type OnboardingIncome,
  type OnboardingExpense,
} from '../types'

// ─── Default person (self) ────────────────────────────────────────────────────

function createDefaultSelfPerson(): OnboardingPerson {
  return {
    tempId: generateUUID(),
    serverId: null,
    name: '',
    dateOfBirth: '',
    gender: 'male',
    residencyStatus: 'citizen',
    prGrantDate: null,
    relationship: 'Self',
    retirementAge: 65,
    displayColor: PERSON_COLORS[0],
  }
}

// ─── Default income row ───────────────────────────────────────────────────────

export function createDefaultIncome(personTempId: string): OnboardingIncome {
  return {
    tempId: generateUUID(),
    serverId: null,
    personTempId,
    name: 'Salary',
    amount: 0,
    frequency: 'monthly',
    category: 'salary',
    cpfWageType: 'ow',
    growthRate: 3,
  }
}

// ─── Default expense row ──────────────────────────────────────────────────────

export function createDefaultExpense(): OnboardingExpense {
  return {
    tempId: generateUUID(),
    serverId: null,
    name: 'Living Expenses',
    amount: 0,
    frequency: 'monthly',
    category: 'living',
    growthRate: 2,
  }
}

// ─── Form defaults ────────────────────────────────────────────────────────────

function createDefaultFormValues(): OnboardingFormData {
  const selfPerson = createDefaultSelfPerson()

  return {
    persons: [selfPerson],
    planningHorizonAge: 90,
    incomes: [createDefaultIncome(selfPerson.tempId)],
    expenses: [createDefaultExpense()],
    assets: [],
    liabilities: [],
    cpfAccounts: [],
  }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useOnboardingForm() {
  const form = useForm<OnboardingFormData>({
    resolver: zodResolver(onboardingFormSchema),
    defaultValues: createDefaultFormValues(),
    mode: 'onSubmit', // Only validate on step submit, not on every change
  })

  return { form }
}
