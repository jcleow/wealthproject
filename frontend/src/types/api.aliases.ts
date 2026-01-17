/**
 * Type Re-exports from Generated API Types
 *
 * This file re-exports types from api.generated.ts with simplified names.
 * The generated types use full Go package paths as prefixes, so we alias them here.
 *
 * Usage:
 *   import { Expense, Income, Person } from '@/types/api.aliases'
 */

import type {
  // Repository types (entities) - full package path
  FinancialChatSystemBackendInternalFinancialV2RepositoryNonCashAsset,
  FinancialChatSystemBackendInternalFinancialV2RepositoryCashAsset,
  FinancialChatSystemBackendInternalFinancialV2RepositoryCPFAccount,
  FinancialChatSystemBackendInternalFinancialV2RepositoryPerson,
  FinancialChatSystemBackendInternalFinancialV2RepositoryPropertySG,
  FinancialChatSystemBackendInternalFinancialV2RepositoryPropertySGGrant,
  FinancialChatSystemBackendInternalFinancialV2RepositoryPropertyFee,
  FinancialChatSystemBackendInternalFinancialV2RepositoryExpense,
  FinancialChatSystemBackendInternalFinancialV2RepositoryGroupedExpenses,
  FinancialChatSystemBackendInternalFinancialV2RepositoryIncome,
  FinancialChatSystemBackendInternalFinancialV2RepositoryInvestment,
  FinancialChatSystemBackendInternalFinancialV2RepositoryLiability,
  FinancialChatSystemBackendInternalFinancialV2RepositoryPropertyScenario,
  // Handler input types
  CmdServerHandlersAssetCreateInput,
  CmdServerHandlersAssetInput,
  CmdServerHandlersCashAccountV2Input,
  CmdServerHandlersCpfV2CreateInput,
  CmdServerHandlersCpfV2Input,
  CmdServerHandlersExpenseCreateInput,
  CmdServerHandlersExpenseV2Input,
  CmdServerHandlersIncomeV2CreateInput,
  CmdServerHandlersIncomeV2Input,
  CmdServerHandlersInvestmentCreateInput,
  CmdServerHandlersInvestmentV2Input,
  CmdServerHandlersLiabilityCreateInput,
  CmdServerHandlersLiabilityInput,
  CmdServerHandlersPersonV2CreateInput,
  CmdServerHandlersPersonV2UpdateInput,
  CmdServerHandlersStopInput,
  // Fund flow types
  CmdServerHandlersFundFlowRuleDTO,
  CmdServerHandlersFundFlowRuleCreateDTO,
  CmdServerHandlersStopFundFlowRuleDTO,
  // Scenario types
  CmdServerHandlersScenarioEventV2DTO,
  CmdServerHandlersScenarioImpactV2DTO,
  CmdServerHandlersScenarioResponse,
  // Timeline types
  FinancialChatSystemBackendInternalFinancialTimelineTimelineResponse,
  FinancialChatSystemBackendInternalFinancialV2TimelineTimelineV2Response,
  FinancialChatSystemBackendInternalFinancialV2TimelineMonthDetailResponse,
  FinancialChatSystemBackendInternalFinancialV2TimelineTimelineAnnualChartResponse,
  // Chat types
  CmdServerHandlersChatRequest,
  CmdServerHandlersChatResponse,
  // Property types
  CmdServerHandlersCreatePropertySGRequest,
  CmdServerHandlersCreateFeeRequest,
  CmdServerHandlersCreateGrantRequest,
  CmdServerHandlersCreateGrowthPeriodRequest,
  CmdServerHandlersCreateRatePeriodRequest,
  CmdServerHandlersGrowthPeriodResponse,
  CmdServerHandlersLiabilityRatePeriodResponse,
  FinancialChatSystemBackendInternalFinancialV2PropertyPropertySnapshot,
  FinancialChatSystemBackendInternalFinancialV2PropertyMortgagePaymentSnapshot,
  FinancialChatSystemBackendInternalFinancialV2PropertyPropertyFeeSnapshot,
  FinancialChatSystemBackendInternalFinancialV2PropertyComputedValues,
  FinancialChatSystemBackendInternalFinancialV2PropertyCPFOAAccountUsageInfo,
} from './api.generated'

// Re-export everything from generated types (for types not aliased here)
export * from './api.generated'

// ============================================================================
// Type Aliases - Map generated names to convenient names
// ============================================================================

// Repository types (entities)
export type NonCashAsset = FinancialChatSystemBackendInternalFinancialV2RepositoryNonCashAsset
export type CashAsset = FinancialChatSystemBackendInternalFinancialV2RepositoryCashAsset
export type CPFAccount = FinancialChatSystemBackendInternalFinancialV2RepositoryCPFAccount
export type Person = FinancialChatSystemBackendInternalFinancialV2RepositoryPerson
export type PropertySG = FinancialChatSystemBackendInternalFinancialV2RepositoryPropertySG
export type PropertySGGrant = FinancialChatSystemBackendInternalFinancialV2RepositoryPropertySGGrant
export type PropertyFee = FinancialChatSystemBackendInternalFinancialV2RepositoryPropertyFee

// Long repository type names
export type Expense = FinancialChatSystemBackendInternalFinancialV2RepositoryExpense
export type GroupedExpenses = FinancialChatSystemBackendInternalFinancialV2RepositoryGroupedExpenses
export type Income = FinancialChatSystemBackendInternalFinancialV2RepositoryIncome
export type Investment = FinancialChatSystemBackendInternalFinancialV2RepositoryInvestment
export type Liability = FinancialChatSystemBackendInternalFinancialV2RepositoryLiability
export type PropertyScenario = FinancialChatSystemBackendInternalFinancialV2RepositoryPropertyScenario

// Handler input types
export type AssetCreateInput = CmdServerHandlersAssetCreateInput
export type AssetInput = CmdServerHandlersAssetInput
export type CashAccountV2Input = CmdServerHandlersCashAccountV2Input
export type CpfV2CreateInput = CmdServerHandlersCpfV2CreateInput
export type CpfV2Input = CmdServerHandlersCpfV2Input
export type ExpenseCreateInput = CmdServerHandlersExpenseCreateInput
export type ExpenseV2Input = CmdServerHandlersExpenseV2Input
export type IncomeV2CreateInput = CmdServerHandlersIncomeV2CreateInput
export type IncomeV2Input = CmdServerHandlersIncomeV2Input
export type InvestmentCreateInput = CmdServerHandlersInvestmentCreateInput
export type InvestmentV2Input = CmdServerHandlersInvestmentV2Input
export type LiabilityCreateInput = CmdServerHandlersLiabilityCreateInput
export type LiabilityInput = CmdServerHandlersLiabilityInput
export type PersonV2CreateInput = CmdServerHandlersPersonV2CreateInput
export type PersonV2UpdateInput = CmdServerHandlersPersonV2UpdateInput
export type StopInput = CmdServerHandlersStopInput

// Fund flow types
export type FundFlowRuleDTO = CmdServerHandlersFundFlowRuleDTO
export type FundFlowRuleCreateDTO = CmdServerHandlersFundFlowRuleCreateDTO
export type StopFundFlowRuleDTO = CmdServerHandlersStopFundFlowRuleDTO

// Scenario types
export type ScenarioEventV2DTO = CmdServerHandlersScenarioEventV2DTO
export type ScenarioImpactV2DTO = CmdServerHandlersScenarioImpactV2DTO
export type ScenarioResponse = CmdServerHandlersScenarioResponse

// Timeline types
export type TimelineResponse = FinancialChatSystemBackendInternalFinancialTimelineTimelineResponse
export type TimelineV2Response = FinancialChatSystemBackendInternalFinancialV2TimelineTimelineV2Response
export type MonthDetailResponse = FinancialChatSystemBackendInternalFinancialV2TimelineMonthDetailResponse
export type TimelineAnnualChartResponse = FinancialChatSystemBackendInternalFinancialV2TimelineTimelineAnnualChartResponse

// Chat types
export type ChatRequest = CmdServerHandlersChatRequest
export type ChatResponse = CmdServerHandlersChatResponse

// Property types
export type CreatePropertySGRequest = CmdServerHandlersCreatePropertySGRequest
export type CreateFeeRequest = CmdServerHandlersCreateFeeRequest
export type CreateGrantRequest = CmdServerHandlersCreateGrantRequest
export type CreateGrowthPeriodRequest = CmdServerHandlersCreateGrowthPeriodRequest
export type CreateRatePeriodRequest = CmdServerHandlersCreateRatePeriodRequest
export type GrowthPeriodResponse = CmdServerHandlersGrowthPeriodResponse
export type LiabilityRatePeriodResponse = CmdServerHandlersLiabilityRatePeriodResponse
export type PropertySnapshot = FinancialChatSystemBackendInternalFinancialV2PropertyPropertySnapshot
export type MortgagePaymentSnapshot = FinancialChatSystemBackendInternalFinancialV2PropertyMortgagePaymentSnapshot
export type PropertyFeeSnapshot = FinancialChatSystemBackendInternalFinancialV2PropertyPropertyFeeSnapshot
export type CPFOAAccountUsageInfo = FinancialChatSystemBackendInternalFinancialV2PropertyCPFOAAccountUsageInfo
export { FinancialChatSystemBackendInternalFinancialV2PropertyComputedValues as PropertyComputedValues }

// ============================================================================
// Convenience Type Aliases (for API payloads)
// ============================================================================
export type CreateAssetPayload = AssetCreateInput
export type UpdateAssetPayload = AssetInput
export type CreateExpensePayload = ExpenseCreateInput
export type UpdateExpensePayload = ExpenseV2Input
export type CreateIncomePayload = IncomeV2CreateInput
export type UpdateIncomePayload = IncomeV2Input
export type CreateLiabilityPayload = LiabilityCreateInput
export type UpdateLiabilityPayload = LiabilityInput
export type CreateInvestmentPayload = InvestmentCreateInput
export type UpdateInvestmentPayload = InvestmentV2Input
export type CashAccountPayload = CashAccountV2Input
export type CreateCpfPayload = CpfV2CreateInput
export type UpdateCpfPayload = CpfV2Input
export type ScenarioEvent = ScenarioEventV2DTO
export type ScenarioImpact = ScenarioImpactV2DTO
export type FundFlowRule = FundFlowRuleDTO
export type CreateFundFlowRulePayload = FundFlowRuleCreateDTO

// ============================================================================
// Enum Value Constants
// ============================================================================
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

// ============================================================================
// Manual Type Definitions (not in swagger spec)
// ============================================================================
// These types are for income allocations API which lacks swagger annotations

export interface IncomeAllocationV2DTO {
  id: string
  incomeId: string
  targetInvestmentId?: string
  targetCashAccountId?: string
  allocationType: 'percentage' | 'fixed'
  allocationValue: string
  startDate: string
  endDate?: string
  createdAt?: string
  updatedAt?: string
}

export interface IncomeAllocationCreateDTO {
  targetInvestmentId?: string
  targetCashAccountId?: string
  allocationType: 'percentage' | 'fixed'
  allocationValue: string
  startDate?: string
  endDate?: string
}

export interface StopAllocationDTO {
  endDate: string
}
