/**
 * Type Aliases for Generated API Types
 *
 * This file re-exports types from api.generated.ts with cleaner, more ergonomic names.
 * The generated types are the source of truth from the backend Swagger spec.
 *
 * Usage:
 *   import { Frequency, ItemType, ChatRequest } from '@/types/api.aliases'
 *
 * Migration Guide:
 *   - New code should prefer these aliases over manual types in financial.ts
 *   - Existing code can be migrated gradually
 *   - Generated types ensure frontend/backend type safety
 */

// ============================================================================
// Enums - Clean re-exports
// ============================================================================

export { CommonFrequency as Frequency } from './api.generated'
export { TimelineItemType as ItemType } from './api.generated'

// Enum value constants for convenience (matches backend string values)
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
// Chat/Session Types
// ============================================================================

export type {
  HandlersChatRequest as ChatRequest,
  HandlersChatResponse as ChatResponse,
  HandlersDispatchRequest as DispatchRequest,
  HandlersDispatchResponse as DispatchResponse,
  HandlersSelectedAction as SelectedAction,
  HandlersExecutionResult as ExecutionResult,
  HandlersExecutionSummary as ExecutionSummary,
  FinancialProposedAction as ProposedAction,
  FinancialWarning as ActionWarning,
  FinancialImpactEstimate as ImpactEstimate,
} from './api.generated'

// ============================================================================
// API Input Types (for create/update payloads)
// ============================================================================

export type {
  HandlersAssetCreateInput as AssetCreateInput,
  HandlersAssetInput as AssetUpdateInput,
  HandlersExpenseCreateInput as ExpenseCreateInput,
  HandlersExpenseV2Input as ExpenseUpdateInput,
  HandlersIncomeV2CreateInput as IncomeCreateInput,
  HandlersIncomeV2Input as IncomeUpdateInput,
  HandlersLiabilityCreateInput as LiabilityCreateInput,
  HandlersLiabilityInput as LiabilityUpdateInput,
  HandlersInvestmentCreateInput as InvestmentCreateInput,
  HandlersInvestmentV2Input as InvestmentUpdateInput,
  HandlersCashAccountV2Input as CashAccountInput,
  HandlersCpfV2CreateInput as CpfCreateInput,
  HandlersCpfV2Input as CpfUpdateInput,
} from './api.generated'

// ============================================================================
// Scenario Types
// ============================================================================

export type {
  HandlersScenarioEventV2DTO as ScenarioEventDTO,
  HandlersScenarioImpactV2DTO as ScenarioImpactDTO,
  HandlersCreateScenarioRequest as CreateScenarioRequest,
  HandlersScenarioResponse as ScenarioResponse,
} from './api.generated'

// ============================================================================
// Property Types
// ============================================================================

export type {
  HandlersCreatePropertySGRequest as CreatePropertySGRequest,
  HandlersComputedValues as PropertyComputedValues,
  HandlersCreateFeeRequest as CreateFeeRequest,
  HandlersCreateGrantRequest as CreateGrantRequest,
  HandlersCreateGrowthPeriodRequest as CreateGrowthPeriodRequest,
  HandlersCreateRatePeriodRequest as CreateRatePeriodRequest,
} from './api.generated'

// ============================================================================
// Repository/Domain Types (verbose names, alias for cleaner imports)
// ============================================================================

export type {
  FinancialChatSystemBackendInternalFinancialV2RepositoryExpense as ApiExpense,
  FinancialChatSystemBackendInternalFinancialV2RepositoryIncome as ApiIncome,
  FinancialChatSystemBackendInternalFinancialV2RepositoryInvestment as ApiInvestment,
  FinancialChatSystemBackendInternalFinancialV2RepositoryLiability as ApiLiability,
  FinancialChatSystemBackendInternalFinancialV2RepositoryGroupedExpenses as ApiGroupedExpenses,
  FinancialChatSystemBackendInternalFinancialV2RepositoryPropertyScenario as ApiPropertyScenario,
} from './api.generated'

// ============================================================================
// Utility Types
// ============================================================================

export type {
  HandlersHealthResponse as HealthResponse,
  HandlersTokenResponse as TokenResponse,
  HandlersStopInput as StopInput,
} from './api.generated'

// Income allocation types
export type {
  HandlersIncomeAllocationCreateDTO as IncomeAllocationCreateDTO,
  HandlersIncomeAllocationV2DTO as IncomeAllocationDTO,
  HandlersStopAllocationDTO as StopAllocationDTO,
} from './api.generated'
