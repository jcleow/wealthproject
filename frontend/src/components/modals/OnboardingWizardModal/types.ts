import { z } from 'zod'
import type { Gender } from '@/types/person'
import type { ResidencyStatus } from '@/types/cpf'

// ─── Step status tracking ─────────────────────────────────────────────────────

export type StepStatus = 'pending' | 'active' | 'completed' | 'skipped'

export const ONBOARDING_STEPS = [
  { key: 'personal', label: 'Personal Info' },
  { key: 'income', label: 'Income & Expenses' },
  { key: 'assets', label: 'Assets & Liabilities' },
  { key: 'cpf', label: 'CPF Accounts' },
] as const

export type StepKey = (typeof ONBOARDING_STEPS)[number]['key']

// ─── Person form entry ────────────────────────────────────────────────────────

export const onboardingPersonSchema = z.object({
  tempId: z.string(), // Client-side ID for tracking
  serverId: z.string().nullable(), // API-assigned ID after creation
  name: z.string().min(1, 'Name is required'),
  dateOfBirth: z.string().min(1, 'Date of birth is required'),
  gender: z.enum(['male', 'female']) as z.ZodType<Gender>,
  residencyStatus: z.enum(['citizen', 'pr']) as z.ZodType<ResidencyStatus>,
  prGrantDate: z.string().nullable(),
  relationship: z.string().min(1, 'Relationship is required'),
  customRelationship: z.string(),
  retirementAge: z.number().min(50).max(100),
  displayColor: z.string(),
})

export type OnboardingPerson = z.infer<typeof onboardingPersonSchema>

// ─── Income form entry ────────────────────────────────────────────────────────

export const onboardingIncomeSchema = z.object({
  tempId: z.string(),
  serverId: z.string().nullable(),
  personTempId: z.string(), // Links to person.tempId
  name: z.string().min(1, 'Name is required'),
  amount: z.number().min(0, 'Amount must be positive'),
  frequency: z.enum(['weekly', 'biweekly', 'monthly', 'quarterly', 'annual']),
  category: z.enum(['salary', 'bonus', 'rental', 'freelance', 'dividend', 'other']),
  cpfWageType: z.enum(['ow', 'aw']).nullable(),
  growthRate: z.number(),
})

export type OnboardingIncome = z.infer<typeof onboardingIncomeSchema>

// ─── Expense form entry ───────────────────────────────────────────────────────

export const onboardingExpenseSchema = z.object({
  tempId: z.string(),
  serverId: z.string().nullable(),
  name: z.string().min(1, 'Name is required'),
  amount: z.number().min(0, 'Amount must be positive'),
  frequency: z.enum(['weekly', 'biweekly', 'monthly', 'quarterly', 'annual']),
  category: z.enum(['housing', 'transport', 'food', 'utilities', 'insurance', 'living', 'other']),
  growthRate: z.number(),
})

export type OnboardingExpense = z.infer<typeof onboardingExpenseSchema>

// ─── Asset form entry ─────────────────────────────────────────────────────────

export const onboardingAssetSchema = z.object({
  tempId: z.string(),
  serverId: z.string().nullable(),
  name: z.string().min(1, 'Name is required'),
  category: z.enum(['cash_savings', 'stocks_etfs', 'bonds', 'property', 'vehicle', 'other']),
  currentValue: z.number().min(0),
  growthRate: z.number(),
})

export type OnboardingAsset = z.infer<typeof onboardingAssetSchema>

// ─── Liability form entry ─────────────────────────────────────────────────────

export const onboardingLiabilitySchema = z.object({
  tempId: z.string(),
  serverId: z.string().nullable(),
  name: z.string().min(1, 'Name is required'),
  category: z.enum(['mortgage', 'car_loan', 'student_loan', 'credit_card', 'personal_loan', 'other']),
  currentBalance: z.number().min(0),
  interestRateApr: z.number().min(0),
  minimumPayment: z.number().min(0),
})

export type OnboardingLiability = z.infer<typeof onboardingLiabilitySchema>

// ─── CPF form entry ───────────────────────────────────────────────────────────

export const onboardingCpfSchema = z.object({
  tempId: z.string(),
  serverId: z.string().nullable(),
  personTempId: z.string(), // Links to person.tempId
  oaBalance: z.number().min(0),
  saBalance: z.number().min(0),
  maBalance: z.number().min(0),
  raBalance: z.number().min(0),
})

export type OnboardingCpf = z.infer<typeof onboardingCpfSchema>

// ─── Full onboarding form data ────────────────────────────────────────────────

export const onboardingFormSchema = z.object({
  // Step 1
  persons: z.array(onboardingPersonSchema).min(1, 'At least one person is required'),
  projectionYears: z.number().min(1).max(80),

  // Step 2
  incomes: z.array(onboardingIncomeSchema),
  expenses: z.array(onboardingExpenseSchema),

  // Step 3
  assets: z.array(onboardingAssetSchema),
  liabilities: z.array(onboardingLiabilitySchema),

  // Step 4
  cpfAccounts: z.array(onboardingCpfSchema),
})

export type OnboardingFormData = z.infer<typeof onboardingFormSchema>

// ─── Category label maps ──────────────────────────────────────────────────────

export const INCOME_CATEGORY_LABELS: Record<string, string> = {
  salary: 'Salary',
  bonus: 'Bonus',
  rental: 'Rental Income',
  freelance: 'Freelance',
  dividend: 'Dividend',
  other: 'Other',
}

export const EXPENSE_CATEGORY_LABELS: Record<string, string> = {
  housing: 'Housing',
  transport: 'Transport',
  food: 'Food & Dining',
  utilities: 'Utilities',
  insurance: 'Insurance',
  living: 'Living Expenses',
  other: 'Other',
}

export const ASSET_CATEGORY_LABELS: Record<string, string> = {
  cash_savings: 'Cash & Savings',
  stocks_etfs: 'Stocks & ETFs',
  bonds: 'Bonds',
  property: 'Property',
  vehicle: 'Vehicle',
  other: 'Other',
}

export const LIABILITY_CATEGORY_LABELS: Record<string, string> = {
  mortgage: 'Mortgage',
  car_loan: 'Car Loan',
  student_loan: 'Student Loan',
  credit_card: 'Credit Card',
  personal_loan: 'Personal Loan',
  other: 'Other',
}

export const RELATIONSHIP_LABELS: Record<string, string> = {
  self: 'Self',
  spouse: 'Spouse',
  child: 'Child',
  parent: 'Parent',
  sibling: 'Sibling',
  other: 'Other',
}

/** Dropdown options for non-self persons */
export const RELATIONSHIP_OPTIONS = [
  { value: 'spouse', label: 'Spouse' },
  { value: 'child', label: 'Child' },
  { value: 'parent', label: 'Parent' },
  { value: 'sibling', label: 'Sibling' },
  { value: 'other', label: 'Other' },
] as const

export const FREQUENCY_LABELS: Record<string, string> = {
  weekly: 'Weekly',
  biweekly: 'Fortnightly',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  annual: 'Annually',
}
