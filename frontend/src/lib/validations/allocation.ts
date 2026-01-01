import { z } from 'zod'

export type AllocationType = 'percentage' | 'fixed'
export type AllocationTargetType = 'cash_account' | 'investment'

export const allocationFormSchema = z.object({
  targetType: z.enum(['cash_account', 'investment']),
  targetId: z.string().min(1, 'Please select a target'),
  allocationType: z.enum(['percentage', 'fixed']),
  allocationValue: z
    .string()
    .min(1, 'Value is required')
    .refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0, 'Value must be greater than 0'),
  searchTerm: z.string(),
})

export type AllocationFormData = z.infer<typeof allocationFormSchema>

export const defaultAllocationFormValues: AllocationFormData = {
  targetType: 'investment',
  targetId: '',
  allocationType: 'percentage',
  allocationValue: '',
  searchTerm: '',
}
