import { z } from 'zod'

// Impact schema for individual impacts in the form
export const scenarioImpactFormSchema = z.object({
  id: z.string().optional(),
  impactKind: z.enum(['delta', 'override', 'start', 'stop'] as const),
  targetType: z.enum(['asset', 'liability', 'income', 'expense', 'cash', 'investment'] as const),
  parentId: z.string().optional(),
  amount: z.number(),
  currency: z.string(),
  cadence: z.enum(['monthly', 'annual'] as const),
  startMonth: z.string(),
  endMonth: z.string().optional(),
  name: z.string().optional(),
  frequency: z.enum(['one_time', 'monthly', 'annual'] as const).optional(),
  notes: z.string().optional(),
  category: z.string().optional(),
  growthRate: z.number().optional(),
  growthStrategy: z.enum(['fixed', 'annual_step', 'compound_monthly'] as const).optional(),
  interestRate: z.number().optional(),
  minimumPayment: z.number().optional(),
  personId: z.string().optional(),
})

export type ScenarioImpactFormData = z.infer<typeof scenarioImpactFormSchema>

// Main scenario event form schema
export const scenarioEventFormSchema = z.object({
  name: z.string().min(1, 'Event name is required'),
  occursOn: z.string().min(1, 'Occurs on date is required'),
  description: z.string(),
  displayIcon: z.string(),
  iconColor: z.string(),
  isIncluded: z.boolean(),
  impacts: z.array(scenarioImpactFormSchema),
  iconSearch: z.string(),
})

export type ScenarioEventFormData = z.infer<typeof scenarioEventFormSchema>

// Default impact for new impacts
export const defaultScenarioImpact: ScenarioImpactFormData = {
  impactKind: 'delta',
  targetType: 'asset',
  amount: 0,
  currency: 'SGD',
  cadence: 'monthly',
  startMonth: '',
  notes: '',
}

// Default form values for a new scenario event
export const defaultScenarioEventFormValues: ScenarioEventFormData = {
  name: '',
  occursOn: '',
  description: '',
  displayIcon: 'sparkles',
  iconColor: '#0ea5e9',
  isIncluded: true,
  impacts: [{ ...defaultScenarioImpact }],
  iconSearch: '',
}
