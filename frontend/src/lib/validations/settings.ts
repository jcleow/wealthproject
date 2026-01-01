import { z } from 'zod'

export const yearDisplayFormatOptions = [
  { value: 'year_number', label: 'Year Number (Year 0, Year 1...)' },
  { value: 'actual_year', label: 'Actual Year (2025, 2026...)' },
] as const

export type YearDisplayFormat = 'year_number' | 'actual_year'

export const generalSettingsSchema = z.object({
  startingAge: z.number().min(0, 'Starting age must be positive').max(120, 'Starting age must be at most 120'),
  terminalAge: z.number().min(1, 'Terminal age must be at least 1').max(120, 'Terminal age must be at most 120'),
  yearDisplayFormat: z.enum(['year_number', 'actual_year']),
  autoExecuteTools: z.boolean(),
  groupItemsByCategory: z.boolean(),
  chartPictureInPicture: z.boolean(),
})

export type GeneralSettingsFormData = z.infer<typeof generalSettingsSchema>

export const defaultGeneralSettingsValues: GeneralSettingsFormData = {
  startingAge: 30,
  terminalAge: 65,
  yearDisplayFormat: 'year_number',
  autoExecuteTools: false,
  groupItemsByCategory: true,
  chartPictureInPicture: false,
}

export const growthRateSchema = z.object({
  category: z.string(),
  annualRatePct: z.number().min(-100, 'Rate cannot be less than -100%').max(1000, 'Rate cannot exceed 1000%'),
})

export type GrowthRateFormData = z.infer<typeof growthRateSchema>
