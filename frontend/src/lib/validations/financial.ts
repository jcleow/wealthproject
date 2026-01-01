import { z } from 'zod'

// Match the Frequency type from types/financial.ts
const frequencySchema = z.enum(['weekly', 'biweekly', 'monthly', 'quarterly', 'annual', 'one_time'])

// Shared schema for all financial forms
const baseFormSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  personId: z.string().nullable(),
  amount: z.string().min(1, 'Amount is required'),
  frequency: frequencySchema,
  category: z.string(),
  annualGrowthRate: z.string(),
  interestRateApr: z.string(),
  minimumPayment: z.string(),
  growthRate: z.string(),
  notes: z.string(),
  // Asset useful life fields
  terminalValue: z.string(),
  leaseStartYear: z.string(),
  usefulLifeYears: z.string(),
})

export type FinancialFormState = z.infer<typeof baseFormSchema>

// CPF form fields schema
export const cpfFieldsSchema = z.object({
  ordinaryAccount: z.string(),
  specialAccount: z.string(),
  medisaveAccount: z.string(),
})

export type CpfFieldsFormData = z.infer<typeof cpfFieldsSchema>

// Combined schema for the complete financial form (used with RHF)
export const financialFormSchema = baseFormSchema

export const defaultFinancialFormValues: FinancialFormState = {
  name: '',
  personId: null,
  amount: '',
  frequency: 'monthly',
  category: '',
  annualGrowthRate: '7.0',
  interestRateApr: '4.5',
  minimumPayment: '',
  growthRate: '3.0',
  notes: '',
  terminalValue: '',
  leaseStartYear: '',
  usefulLifeYears: '',
}

export const defaultCpfFieldsValues: CpfFieldsFormData = {
  ordinaryAccount: '',
  specialAccount: '',
  medisaveAccount: '',
}
