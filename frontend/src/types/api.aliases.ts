/**
 * Type Re-exports from Generated API Types
 *
 * This file re-exports types from api.generated.ts with simplified names.
 * The generated types use package path prefixes, so we alias them here.
 *
 * Usage:
 *   import { Expense, Income, Person } from '@/types/api.aliases'
 */

import type {
  // Repository types (entities)
  RepositoryNonCashAsset,
  RepositoryCashAsset,
  RepositoryCPFAccount,
  RepositoryPerson,
  RepositoryPropertySG,
  RepositoryPropertySGGrant,
  RepositoryPropertyFee,
  FinancialChatSystemBackendInternalFinancialV2RepositoryExpense,
  FinancialChatSystemBackendInternalFinancialV2RepositoryGroupedExpenses,
  FinancialChatSystemBackendInternalFinancialV2RepositoryIncome,
  FinancialChatSystemBackendInternalFinancialV2RepositoryInvestment,
  FinancialChatSystemBackendInternalFinancialV2RepositoryLiability,
  FinancialChatSystemBackendInternalFinancialV2RepositoryPropertyScenario,
  // Handler input types
  HandlersAssetCreateInput,
  HandlersAssetInput,
  HandlersCashAccountV2Input,
  HandlersCpfV2CreateInput,
  HandlersCpfV2Input,
  HandlersExpenseCreateInput,
  HandlersExpenseV2Input,
  HandlersIncomeV2CreateInput,
  HandlersIncomeV2Input,
  HandlersInvestmentCreateInput,
  HandlersInvestmentV2Input,
  HandlersLiabilityCreateInput,
  HandlersLiabilityInput,
  HandlersPersonV2CreateInput,
  HandlersPersonV2UpdateInput,
  HandlersStopInput,
  // Fund flow types
  HandlersFundFlowRuleDTO,
  HandlersFundFlowRuleCreateDTO,
  HandlersStopFundFlowRuleDTO,
  // Scenario types
  HandlersScenarioEventV2DTO,
  HandlersScenarioImpactV2DTO,
  HandlersScenarioResponse,
  // Timeline types
  TimelineTimelineResponse,
  TimelineV2TimelineV2Response,
  TimelineV2MonthDetailResponse,
  TimelineV2TimelineAnnualChartResponse,
  // Chat types
  HandlersChatRequest,
  HandlersChatResponse,
  // Property types
  HandlersCreatePropertySGRequest,
  HandlersCreateFeeRequest,
  HandlersCreateGrantRequest,
  HandlersCreateGrowthPeriodRequest,
  HandlersCreateRatePeriodRequest,
  HandlersGrowthPeriodResponse,
  HandlersLiabilityRatePeriodResponse,
  PropertyPropertySnapshot,
  PropertyMortgagePaymentSnapshot,
  PropertyPropertyFeeSnapshot,
  PropertyComputedValues,
  PropertyCPFOAAccountUsageInfo,
} from './api.generated'

// Re-export everything from generated types (for types not aliased here)
export * from './api.generated'

// ============================================================================
// Type Aliases - Map generated names to convenient names
// ============================================================================

// Repository types (entities)
export type NonCashAsset = RepositoryNonCashAsset
export type CashAsset = RepositoryCashAsset
export type CPFAccount = RepositoryCPFAccount
export type Person = RepositoryPerson
export type PropertySG = RepositoryPropertySG
export type PropertySGGrant = RepositoryPropertySGGrant
export type PropertyFee = RepositoryPropertyFee

// Long repository type names
export type Expense = FinancialChatSystemBackendInternalFinancialV2RepositoryExpense
// Defined manually — generated types don't include this yet
export interface InsurancePremiumExpense {
  policyId: string
  policyName: string
  premiumAmount: number
  premiumFrequency: string
  category: string
  startDate: string
  endDate?: string
  personName?: string
}
// Override generated type to include insurancePremiums field added in this branch
export interface GroupedExpenses extends FinancialChatSystemBackendInternalFinancialV2RepositoryGroupedExpenses {
  insurancePremiums?: InsurancePremiumExpense[]
}
export type Income = FinancialChatSystemBackendInternalFinancialV2RepositoryIncome
export type Investment = FinancialChatSystemBackendInternalFinancialV2RepositoryInvestment
export type Liability = FinancialChatSystemBackendInternalFinancialV2RepositoryLiability
export type PropertyScenario = FinancialChatSystemBackendInternalFinancialV2RepositoryPropertyScenario

// Handler input types
export type AssetCreateInput = HandlersAssetCreateInput
export type AssetInput = HandlersAssetInput
export type CashAccountV2Input = HandlersCashAccountV2Input
export type CpfV2CreateInput = HandlersCpfV2CreateInput
export type CpfV2Input = HandlersCpfV2Input
export type ExpenseCreateInput = HandlersExpenseCreateInput
export type ExpenseV2Input = HandlersExpenseV2Input
export type IncomeV2CreateInput = HandlersIncomeV2CreateInput
export type IncomeV2Input = HandlersIncomeV2Input
export type InvestmentCreateInput = HandlersInvestmentCreateInput
export type InvestmentV2Input = HandlersInvestmentV2Input
export type LiabilityCreateInput = HandlersLiabilityCreateInput
export type LiabilityInput = HandlersLiabilityInput
export type PersonV2CreateInput = HandlersPersonV2CreateInput
export type PersonV2UpdateInput = HandlersPersonV2UpdateInput
export type StopInput = HandlersStopInput

// Fund flow types
export type FundFlowRuleDTO = HandlersFundFlowRuleDTO
export type FundFlowRuleCreateDTO = HandlersFundFlowRuleCreateDTO
export type StopFundFlowRuleDTO = HandlersStopFundFlowRuleDTO

// Scenario types
export type ScenarioEventV2DTO = HandlersScenarioEventV2DTO
export type ScenarioImpactV2DTO = HandlersScenarioImpactV2DTO
export type ScenarioResponse = HandlersScenarioResponse

// Timeline types
export type TimelineResponse = TimelineTimelineResponse
export type TimelineV2Response = TimelineV2TimelineV2Response
export type MonthDetailResponse = TimelineV2MonthDetailResponse
export type TimelineAnnualChartResponse = TimelineV2TimelineAnnualChartResponse

// Chat types
export type ChatRequest = HandlersChatRequest
export type ChatResponse = HandlersChatResponse

// Property types
export type CreatePropertySGRequest = HandlersCreatePropertySGRequest
export type CreateFeeRequest = HandlersCreateFeeRequest
export type CreateGrantRequest = HandlersCreateGrantRequest
export type CreateGrowthPeriodRequest = HandlersCreateGrowthPeriodRequest
export type CreateRatePeriodRequest = HandlersCreateRatePeriodRequest
export type GrowthPeriodResponse = HandlersGrowthPeriodResponse
export type LiabilityRatePeriodResponse = HandlersLiabilityRatePeriodResponse
export type PropertySnapshot = PropertyPropertySnapshot
export type MortgagePaymentSnapshot = PropertyMortgagePaymentSnapshot
export type PropertyFeeSnapshot = PropertyPropertyFeeSnapshot
export type CPFOAAccountUsageInfo = PropertyCPFOAAccountUsageInfo
export { PropertyComputedValues }

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
