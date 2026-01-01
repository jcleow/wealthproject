import { z } from 'zod'

const cpfAccountField = z
  .string()
  .min(1, 'This field is required')
  .refine(
    (val) => !Number.isNaN(Number.parseFloat(val)),
    'Enter a valid number'
  )
  .refine(
    (val) => Number.parseFloat(val) >= 0,
    'Value cannot be negative'
  )

export const cpfBalanceSchema = z.object({
  ordinaryAccount: cpfAccountField,
  specialAccount: cpfAccountField,
  medisaveAccount: cpfAccountField,
})

export type CpfBalanceFormData = z.infer<typeof cpfBalanceSchema>
