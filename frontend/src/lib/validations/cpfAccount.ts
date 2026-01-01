import { z } from 'zod'

export type ResidencyStatus = 'citizen' | 'pr_year_1' | 'pr_year_2' | 'pr_year_3_plus'

export const residencyStatusOptions: { value: ResidencyStatus; label: string }[] = [
  { value: 'citizen', label: 'Singapore Citizen' },
  { value: 'pr_year_1', label: 'PR Year 1' },
  { value: 'pr_year_2', label: 'PR Year 2' },
  { value: 'pr_year_3_plus', label: 'PR Year 3+' },
]

const numericStringField = z
  .string()
  .refine(
    (val) => val === '' || !Number.isNaN(Number.parseFloat(val)),
    'Enter a valid number'
  )
  .refine(
    (val) => val === '' || Number.parseFloat(val) >= 0,
    'Value cannot be negative'
  )

export const cpfAccountFormSchema = z.object({
  personId: z.string().nullable(),
  oaBalance: numericStringField,
  saBalance: numericStringField,
  maBalance: numericStringField,
  raBalance: numericStringField,
  oaUsedForHousing: numericStringField,
  dateOfBirth: z.string().min(1, 'Date of birth is required'),
  residencyStatus: z.enum(['citizen', 'pr_year_1', 'pr_year_2', 'pr_year_3_plus']),
  housingStartDate: z.string(),
  prGrantDate: z.string(),
})

export type CpfAccountFormData = z.infer<typeof cpfAccountFormSchema>

export const defaultCpfAccountFormValues: CpfAccountFormData = {
  personId: null,
  oaBalance: '',
  saBalance: '',
  maBalance: '',
  raBalance: '',
  oaUsedForHousing: '',
  dateOfBirth: '',
  residencyStatus: 'citizen',
  housingStartDate: '',
  prGrantDate: '',
}
