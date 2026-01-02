import { z } from 'zod'

export type ResidencyStatus = 'citizen' | 'pr_year_1' | 'pr_year_2' | 'pr_year_3_plus'

// Note: These options are kept for the Person form, not CPF form
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

// CPF Account form schema - person-related fields (dateOfBirth, residencyStatus, prGrantDate)
// are now managed through the Person entity, not through CPF accounts.
export const cpfAccountFormSchema = z.object({
  personId: z.string().min(1, 'Person is required'),
  oaBalance: numericStringField,
  saBalance: numericStringField,
  maBalance: numericStringField,
  raBalance: numericStringField,
  oaUsedForHousing: numericStringField,
  housingStartDate: z.string(),
})

export type CpfAccountFormData = z.infer<typeof cpfAccountFormSchema>

export const defaultCpfAccountFormValues: CpfAccountFormData = {
  personId: '',
  oaBalance: '',
  saBalance: '',
  maBalance: '',
  raBalance: '',
  oaUsedForHousing: '',
  housingStartDate: '',
}
