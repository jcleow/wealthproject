/**
 * Type Re-exports from Generated API Types
 *
 * This file re-exports types from api.generated.ts for convenient imports.
 * The generated types are the source of truth from the backend Swagger spec.
 *
 * Usage:
 *   import { Frequency, ItemType, Expense, ChatRequest } from '@/types/api.aliases'
 *
 * Or import directly:
 *   import { Expense } from '@/types/api.generated'
 */

// Re-export everything from generated types
export * from './api.generated'

// Convenience constants for enum values (matches backend string values)
export const FrequencyValues = {
  ONE_TIME: 'one_time',
  MONTHLY: 'monthly',
  ANNUAL: 'annual',
  // Deprecated values (still in backend for backwards compat)
  WEEKLY: 'weekly',
  BI_WEEKLY: 'bi_weekly',
  QUARTERLY: 'quarterly',
  SEMI_ANNUAL: 'semi_annual',
} as const

export const ItemTypeValues = {
  ASSET: 'asset',
  LIABILITY: 'liability',
  INCOME: 'income',
  EXPENSE: 'expense',
  CASH_ACCOUNT: 'cash_account',
} as const

// Type aliases for API input types (for clarity in usage)
export type {
  AssetCreateInput as CreateAssetPayload,
  AssetInput as UpdateAssetPayload,
  ExpenseCreateInput as CreateExpensePayload,
  ExpenseV2Input as UpdateExpensePayload,
  IncomeV2CreateInput as CreateIncomePayload,
  IncomeV2Input as UpdateIncomePayload,
  LiabilityCreateInput as CreateLiabilityPayload,
  LiabilityInput as UpdateLiabilityPayload,
  InvestmentCreateInput as CreateInvestmentPayload,
  InvestmentV2Input as UpdateInvestmentPayload,
  CashAccountV2Input as CashAccountPayload,
  CpfV2CreateInput as CreateCpfPayload,
  CpfV2Input as UpdateCpfPayload,
  ScenarioEventV2DTO as ScenarioEvent,
  ScenarioImpactV2DTO as ScenarioImpact,
  FundFlowRuleDTO as FundFlowRule,
  FundFlowRuleCreateDTO as CreateFundFlowRulePayload,
} from './api.generated'
