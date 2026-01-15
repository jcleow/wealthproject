import { z } from 'zod'

// Stored residency status - only 'citizen' or 'pr' is stored.
// The PR year (1, 2, 3+) is computed at runtime from pr_grant_date.
export type ResidencyStatus = 'citizen' | 'pr'

// Note: These options are for the Person form
export const residencyStatusOptions: { value: ResidencyStatus; label: string }[] = [
  { value: 'citizen', label: 'Singapore Citizen' },
  { value: 'pr', label: 'Permanent Resident' },
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
// Note: CPF housing usage is derived from property scenarios - see GetCPFOAUsageByAccount().
export const cpfAccountFormSchema = z.object({
  personId: z.string().min(1, 'Person is required'),
  oaBalance: numericStringField,
  saBalance: numericStringField,
  maBalance: numericStringField,
  raBalance: numericStringField,
})

export type CpfAccountFormData = z.infer<typeof cpfAccountFormSchema>

export const defaultCpfAccountFormValues: CpfAccountFormData = {
  personId: '',
  oaBalance: '',
  saBalance: '',
  maBalance: '',
  raBalance: '',
}
