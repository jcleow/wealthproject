import { z } from 'zod'

// Rule type enum - which type of fund flow this is
export const fundFlowRuleTypeEnum = z.enum([
  'payment',    // Account → Liability/Property (Phase 1)
  'allocation', // Income → Account (Phase 2)
  'transfer',   // Account → Account (Phase 3)
])

export type FundFlowRuleType = z.infer<typeof fundFlowRuleTypeEnum>

// Amount type enum - how the amount is determined
export const fundFlowAmountTypeEnum = z.enum([
  'fixed',           // Exact amount specified
  'percentage',      // Percentage of base amount (0-100)
  'remainder',       // Whatever's left after higher-priority rules
  'target_required', // What the target needs (e.g., mortgage payment)
  'max_available',   // Use up to source balance, optionally capped
])

export type FundFlowAmountType = z.infer<typeof fundFlowAmountTypeEnum>

const isoDateTime = z
  .string()
  .refine(
    (value) => !Number.isNaN(Date.parse(value)),
    'Expected an ISO-8601 timestamp'
  )

// Fund flow rule schema
export const fundFlowRuleSchema = z.object({
  id: z.string().min(1),
  userId: z.string().min(1),
  name: z.string().min(1),
  ruleType: fundFlowRuleTypeEnum,

  // Source (exactly one should be set based on rule type)
  sourceIncomeId: z.string().nullable().optional(),
  sourceCpfAccountId: z.string().nullable().optional(),
  sourceCashAccountId: z.string().nullable().optional(),
  sourceInvestmentId: z.string().nullable().optional(),

  // Target (exactly one should be set based on rule type)
  targetCpfAccountId: z.string().nullable().optional(),
  targetCashAccountId: z.string().nullable().optional(),
  targetInvestmentId: z.string().nullable().optional(),
  targetLiabilityId: z.string().nullable().optional(),
  targetPropertyId: z.string().nullable().optional(),

  // Amount specification
  amountType: fundFlowAmountTypeEnum,
  amountValue: z.string().nullable().optional(), // String to preserve precision

  // Priority and fallback
  priority: z.number().int(),
  fallbackCpfAccountId: z.string().nullable().optional(),
  fallbackCashAccountId: z.string().nullable().optional(),
  fallbackInvestmentId: z.string().nullable().optional(),

  // Timing
  startDate: isoDateTime,
  endDate: isoDateTime.nullable().optional(),

  // Metadata
  createdAt: isoDateTime,
  updatedAt: isoDateTime,
})

export type FundFlowRule = z.infer<typeof fundFlowRuleSchema>

// Create/Update payload - omits server-managed fields
export type FundFlowRuleCreatePayload = {
  name: string
  ruleType: FundFlowRuleType

  // Source (exactly one based on rule type)
  sourceIncomeId?: string | null
  sourceCpfAccountId?: string | null
  sourceCashAccountId?: string | null
  sourceInvestmentId?: string | null

  // Target (exactly one based on rule type)
  targetCpfAccountId?: string | null
  targetCashAccountId?: string | null
  targetInvestmentId?: string | null
  targetLiabilityId?: string | null
  targetPropertyId?: string | null

  // Amount
  amountType: FundFlowAmountType
  amountValue?: string | null

  // Priority and fallback
  priority: number
  fallbackCpfAccountId?: string | null
  fallbackCashAccountId?: string | null
  fallbackInvestmentId?: string | null

  // Timing
  startDate?: string
  endDate?: string | null
}

export type FundFlowRuleUpdatePayload = Partial<FundFlowRuleCreatePayload>

// List query filters
export type FundFlowRuleListFilters = {
  ruleType?: FundFlowRuleType
  targetPropertyId?: string
  targetLiabilityId?: string
}

// Human-readable labels for amount types
export const AmountTypeLabels: Record<FundFlowAmountType, string> = {
  fixed: 'Fixed Amount',
  percentage: 'Percentage',
  remainder: 'Remainder',
  target_required: 'Target Required',
  max_available: 'Max Available',
}

// Human-readable descriptions for amount types
export const AmountTypeDescriptions: Record<FundFlowAmountType, string> = {
  fixed: 'Transfer exactly this amount each period',
  percentage: 'Transfer this percentage of the base amount',
  remainder: 'Cover whatever amount is left after higher-priority rules',
  target_required: 'Transfer what the target needs (e.g., mortgage payment)',
  max_available: 'Use up to the source balance, optionally capped',
}

// Helper to format amount value for display
export function formatAmountValue(
  amountType: FundFlowAmountType,
  amountValue: string | null | undefined
): string {
  if (!amountValue) {
    switch (amountType) {
      case 'remainder':
        return 'Remaining'
      case 'target_required':
        return 'Required'
      case 'max_available':
        return 'Available'
      default:
        return '-'
    }
  }

  const value = parseFloat(amountValue)
  switch (amountType) {
    case 'percentage':
      return `${value}%`
    case 'fixed':
    case 'target_required':
    case 'max_available':
      return `$${value.toLocaleString()}`
    default:
      return amountValue
  }
}
