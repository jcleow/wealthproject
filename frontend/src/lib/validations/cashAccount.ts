import { z } from 'zod'

export const accountTypeOptions = [
  { value: 'checking', label: 'Checking' },
  { value: 'savings', label: 'Savings' },
  { value: 'money_market', label: 'Money Market' },
  { value: 'other', label: 'Other' },
]

export const cashAccountFormSchema = z.object({
  name: z.string().min(1, 'Account name is required'),
  balance: z.number().min(0, 'Balance cannot be negative'),
  interestRate: z.number().min(0, 'Interest rate cannot be negative'),
  bankName: z.string(),
  accountType: z.string(),
  notes: z.string(),
})

export type CashAccountFormData = z.infer<typeof cashAccountFormSchema>

export const defaultCashAccountFormValues: CashAccountFormData = {
  name: '',
  balance: 0,
  interestRate: 1.5,
  bankName: '',
  accountType: 'savings',
  notes: '',
}
