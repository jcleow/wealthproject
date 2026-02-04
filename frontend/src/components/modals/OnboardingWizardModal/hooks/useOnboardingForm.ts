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
    relationship: 'self',
    customRelationship: '',
    retirementAge: 65,
    displayColor: PERSON_COLORS[0],
  }
}

// ─── Default income row ───────────────────────────────────────────────────────

interface IncomeOverrides {
  growthRate?: number
  frequency?: 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'annual'
}

export function createDefaultIncome(
  personTempId: string,
  overrides?: IncomeOverrides,
): OnboardingIncome {
  return {
    tempId: generateUUID(),
    serverId: null,
    personTempId,
    name: '',
    amount: 0,
    frequency: overrides?.frequency ?? 'monthly',
    category: 'salary',
    cpfWageType: 'ow',
    growthRate: overrides?.growthRate ?? 3,
  }
}

// ─── Default expense row ──────────────────────────────────────────────────────

interface ExpenseOverrides {
  growthRate?: number
  frequency?: 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'annual'
}

export function createDefaultExpense(
  overrides?: ExpenseOverrides,
): OnboardingExpense {
  return {
    tempId: generateUUID(),
    serverId: null,
    name: '',
    amount: 0,
    frequency: overrides?.frequency ?? 'monthly',
    category: 'living',
    growthRate: overrides?.growthRate ?? 2,
  }
}

// ─── Form defaults ────────────────────────────────────────────────────────────

function createDefaultFormValues(): OnboardingFormData {
  const selfPerson = createDefaultSelfPerson()

  return {
    persons: [selfPerson],
    projectionYears: 30,
    incomes: [],
    expenses: [],
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
