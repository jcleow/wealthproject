/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/*
 * ---------------------------------------------------------------
 * ## THIS FILE WAS GENERATED VIA SWAGGER-TYPESCRIPT-API        ##
 * ##                                                           ##
 * ## AUTHOR: acacode                                           ##
 * ## SOURCE: https://github.com/acacode/swagger-typescript-api ##
 * ---------------------------------------------------------------
 */

export enum TimelineItemType {
  ItemTypeAsset = "asset",
  ItemTypeLiability = "liability",
  ItemTypeIncome = "income",
  ItemTypeExpense = "expense",
  ItemTypeCashAccount = "cash_account",
}

export enum CommonFrequency {
  FrequencyOneTime = "one_time",
  FrequencyMonthly = "monthly",
  FrequencyAnnual = "annual",
  /** deprecated */
  FrequencyWeekly = "weekly",
  /** deprecated */
  FrequencyBiweekly = "bi_weekly",
  /** deprecated */
  FrequencyQuarterly = "quarterly",
  /** deprecated */
  FrequencySemiannual = "semi_annual",
}

export interface FinancialChatSystemBackendInternalFinancialV2RepositoryExpense {
  amount?: number;
  category?: string;
  /** NULL means ongoing */
  endDate?: string;
  frequency?: string;
  growthRate?: number;
  growthStrategy?: string;
  id?: string;
  /** How often delta adds (NULL for base/override) */
  impactFrequency?: string;
  /** NULL = base item, 'delta' = additive, 'override' = replaces */
  impactKind?: string;
  name?: string;
  notes?: string;
  parentId?: string;
  /** Scenario impact fields */
  scenarioEventId?: string;
  /** Link to liability this expense pays down */
  sourceLiabilityId?: string;
  /** Precise start date (day-level) */
  startDate?: string;
  updatedAt?: string;
}

export interface FinancialChatSystemBackendInternalFinancialV2RepositoryGroupedExpenses {
  count?: number;
  debtRepayments?: FinancialChatSystemBackendInternalFinancialV2RepositoryExpense[];
  limit?: number;
  offset?: number;
  regularExpenses?: FinancialChatSystemBackendInternalFinancialV2RepositoryExpense[];
}

export interface FinancialChatSystemBackendInternalFinancialV2RepositoryIncome {
  amount?: number;
  category?: string;
  /** 'ow' (Ordinary Wages) or 'aw' (Additional Wages) */
  cpfWageType?: string;
  /** NULL means ongoing */
  endDate?: string;
  frequency?: string;
  growthRate?: number;
  growthStrategy?: string;
  id?: string;
  /** How often delta adds (NULL for base/override) */
  impactFrequency?: string;
  /** NULL = base item, 'delta' = additive, 'override' = replaces */
  impactKind?: string;
  /** CPF-related fields */
  incomeType?: string;
  name?: string;
  notes?: string;
  parentId?: string;
  /** Scenario impact fields */
  scenarioEventId?: string;
  /** Precise start date (day-level) - now required */
  startDate?: string;
  updatedAt?: string;
}

export interface FinancialChatSystemBackendInternalFinancialV2RepositoryInvestment {
  category?: string;
  currentValue?: number;
  /** NULL means ongoing */
  endDate?: string;
  growthRate?: number;
  growthStrategy?: string;
  id?: string;
  /** How often delta adds (NULL for base/override) */
  impactFrequency?: string;
  /** NULL = base item, 'delta' = additive, 'override' = replaces */
  impactKind?: string;
  name?: string;
  notes?: string;
  parentId?: string;
  /** Scenario impact fields */
  scenarioEventId?: string;
  /** Precise start date (day-level) */
  startDate?: string;
  updatedAt?: string;
}

export interface FinancialChatSystemBackendInternalFinancialV2RepositoryLiability {
  category?: string;
  currentBalance?: number;
  /** NULL means ongoing */
  endDate?: string;
  growthStrategy?: string;
  id?: string;
  /** How often delta adds (NULL for base/override) */
  impactFrequency?: string;
  /** NULL = base item, 'delta' = additive, 'override' = replaces */
  impactKind?: string;
  interestRateApr?: number;
  minimumPayment?: number;
  name?: string;
  notes?: string;
  parentId?: string;
  repaymentStrategy?: string;
  /** Scenario impact fields */
  scenarioEventId?: string;
  /** Precise start date (day-level) */
  startDate?: string;
  updatedAt?: string;
}

export interface FinancialChatSystemBackendInternalFinancialV2RepositoryPropertyScenario {
  createdAt?: string;
  id?: string;
  myDetailsId?: string;
  sgDetailsId?: string;
  updatedAt?: string;
  userId?: string;
}

export interface FinancialImpactEstimate {
  description?: string;
  monthly_change?: number;
  net_worth_change?: number;
}

export interface FinancialProposedAction {
  call_id?: string;
  dependencies?: string[];
  estimated_impact?: FinancialImpactEstimate;
  friendly_description?: string;
  parameters?: Record<string, any>;
  tool_name?: string;
  warnings?: FinancialWarning[];
}

export interface FinancialWarning {
  message?: string;
  /** "low", "medium", "high" */
  severity?: string;
  type?: string;
}

export interface HandlersChatRequest {
  chat_id: string;
  message: string;
  session_id: string;
}

export interface HandlersChatResponse {
  actions_executed?: number;
  api_version?: string;
  content?: string;
  conversation_flow?: SessionConversationStep[];
  message_id?: string;
  proposed_actions?: FinancialProposedAction[];
  requires_approval?: boolean;
}

export interface HandlersDispatchRequest {
  selected_actions: HandlersSelectedAction[];
  session_id: string;
}

export interface HandlersDispatchResponse {
  api_version?: string;
  results?: HandlersExecutionResult[];
  summary?: HandlersExecutionSummary;
  updated_session_state?: SessionSessionState;
}

export interface HandlersExecutionResult {
  call_id?: string;
  entity_id?: string;
  error?: string;
  execution_time_ms?: number;
  rolled_back?: boolean;
  success?: boolean;
  tool_name?: string;
}

export interface HandlersExecutionSummary {
  failed?: number;
  skipped?: number;
  /** "success", "partial_success", "failed" */
  status?: string;
  successful?: number;
  total_actions?: number;
  total_execution_time_ms?: number;
}

export interface HandlersHealthResponse {
  services?: Record<string, any>;
  status?: string;
  timestamp?: string;
  uptime?: string;
  version?: string;
}

export interface HandlersSelectedAction {
  approved?: boolean;
  call_id: string;
  modified_args?: Record<string, any>;
}

export interface HandlersTokenResponse {
  expires?: string;
  token?: string;
  usage?: string;
  userId?: string;
}

export interface HandlersAssetCreateInput {
  annualGrowthRate?: string;
  category?: string;
  currentValue?: string;
  endDate?: string;
  growthStrategy?: string;
  name?: string;
  notes?: string;
  startDate?: string;
}

export interface HandlersAssetInput {
  annualGrowthRate?: string;
  category?: string;
  currentValue?: string;
  growthStrategy?: string;
  id?: string;
  name?: string;
  notes?: string;
  parentId?: string;
  startDate?: string;
  updateMode?: string;
}

export interface HandlersCashAccountV2Input {
  accountType?: string;
  balance?: string;
  bankName?: string;
  growthStrategy?: string;
  id?: string;
  interestRate?: string;
  name?: string;
  notes?: string;
  startDate?: string;
  updateMode?: string;
}

export interface HandlersComputedValues {
  absdAmount?: string;
  bsdAmount?: string;
  loanAmount?: string;
  monthlyPayment?: string;
  totalAmountPaid?: string;
  totalInterest?: string;
  totalStampDuty?: string;
  totalUpfrontCash?: string;
}

export interface HandlersCpfV2CreateInput {
  /**
   * TODO: DateOfBirth should be moved to a general user profile/settings module
   * rather than being specific to CPF. This is kept here temporarily for CPF calculations.
   */
  dateOfBirth?: string;
  housingStartDate?: string;
  maBalance?: string;
  oaBalance?: string;
  oaUsedForHousing?: string;
  prGrantDate?: string;
  raBalance?: string;
  residencyStatus?: string;
  saBalance?: string;
}

export interface HandlersCpfV2Input {
  /**
   * TODO: DateOfBirth should be moved to a general user profile/settings module
   * rather than being specific to CPF. This is kept here temporarily for CPF calculations.
   */
  dateOfBirth?: string;
  housingStartDate?: string;
  maBalance?: string;
  oaBalance?: string;
  oaUsedForHousing?: string;
  prGrantDate?: string;
  raBalance?: string;
  residencyStatus?: string;
  saBalance?: string;
  startDate?: string;
  updateMode?: string;
}

export interface HandlersCreateFeeRequest {
  amount?: string;
  currency?: string;
  description?: string;
  endDate?: string;
  feeContext?: string;
  feeType?: string;
  frequency?: string;
  isPercentage?: boolean;
  startDate?: string;
}

export interface HandlersCreateGrantRequest {
  amount?: string;
  name?: string;
}

export interface HandlersCreateGrowthPeriodRequest {
  endYear?: number;
  growthRate?: string;
  growthStrategy?: string;
  startYear?: number;
}

export interface HandlersCreateRatePeriodRequest {
  fixedRate?: string;
  fixedYears?: number;
  floatingRate?: string;
  startMonth?: string;
  termYears?: number;
}

export interface HandlersCreatePropertySGRequest {
  borrower1CpfAccountId?: string;
  borrower1IncomeId?: string;
  borrower2CpfAccountId?: string;
  borrower2IncomeId?: string;
  borrowerType?: string;
  btoKeyCollectionDate?: string;
  btoLaunchDate?: string;
  downpaymentCash?: string;
  downpaymentCpfOa?: string;
  icon?: string;
  iconColor?: string;
  isIncluded?: boolean;
  loanType?: string;
  name?: string;
  otherDebt?: string;
  propertyCount?: number;
  propertyPrice?: string;
  propertySubtype?: string;
  propertyType?: string;
  saleExpectedDate?: string;
  saleExpectedPrice?: string;
  valuationPrice?: string;
}

export interface HandlersCreateScenarioRequest {
  /** "SG" | "MY" */
  country?: string;
  fees?: HandlersCreateFeeRequest[];
  grants?: HandlersCreateGrantRequest[];
  growthPeriods?: HandlersCreateGrowthPeriodRequest[];
  ratePeriods?: HandlersCreateRatePeriodRequest[];
  sgDetails?: HandlersCreatePropertySGRequest;
}

export interface HandlersExpenseCreateInput {
  amount?: string;
  category?: string;
  endDate?: string;
  frequency?: string;
  growthRate?: string;
  growthStrategy?: string;
  name?: string;
  notes?: string;
  parentId?: string;
  sourceLiabilityId?: string;
  startDate?: string;
}

export interface HandlersExpenseV2Input {
  amount?: string;
  category?: string;
  frequency?: string;
  growthRate?: string;
  growthStrategy?: string;
  id?: string;
  name?: string;
  notes?: string;
  parentId?: string;
  sourceLiabilityId?: string;
  startDate?: string;
  updateMode?: string;
}

export interface HandlersIncomeAllocationCreateDTO {
  allocationType?: string;
  allocationValue?: string;
  targetCashAccountId?: string;
  targetInvestmentId?: string;
}

export interface HandlersIncomeAllocationV2DTO {
  allocationType?: string;
  allocationValue?: string;
  createdAt?: string;
  endDate?: string;
  id?: string;
  incomeId?: string;
  parentId?: string;
  startDate?: string;
  targetCashAccountId?: string;
  targetInvestmentId?: string;
}

export interface HandlersIncomeV2CreateInput {
  amount?: string;
  category?: string;
  cpfWageType?: string;
  endDate?: string;
  frequency?: string;
  growthRate?: string;
  growthStrategy?: string;
  name?: string;
  notes?: string;
  startDate?: string;
}

export interface HandlersIncomeV2Input {
  amount?: string;
  category?: string;
  frequency?: string;
  growthRate?: string;
  growthStrategy?: string;
  id?: string;
  name?: string;
  notes?: string;
  parentId?: string;
  startDate?: string;
  updateMode?: string;
}

export interface HandlersInvestmentCreateInput {
  annualGrowthRate?: string;
  category?: string;
  currentValue?: string;
  endDate?: string;
  growthStrategy?: string;
  name?: string;
  notes?: string;
  startDate?: string;
}

export interface HandlersInvestmentV2Input {
  category?: string;
  currentValue?: string;
  growthRate?: string;
  growthStrategy?: string;
  id?: string;
  name?: string;
  notes?: string;
  parentId?: string;
  startDate?: string;
  updateMode?: string;
}

export interface HandlersLiabilityCreateInput {
  category?: string;
  currentBalance?: string;
  endDate?: string;
  growthStrategy?: string;
  interestRateApr?: string;
  minimumPayment?: string;
  name?: string;
  notes?: string;
  repaymentStrategy?: string;
  startDate?: string;
}

export interface HandlersLiabilityInput {
  category?: string;
  currentBalance?: string;
  growthStrategy?: string;
  id?: string;
  interestRateApr?: string;
  minimumPayment?: string;
  name?: string;
  notes?: string;
  parentId?: string;
  repaymentStrategy?: string;
  startDate?: string;
  updateMode?: string;
}

export interface HandlersScenarioEventV2DTO {
  description?: string;
  displayColor?: string;
  displayIcon?: string;
  id?: string;
  impacts?: HandlersScenarioImpactV2DTO[];
  isIncluded?: boolean;
  name?: string;
  occursOn?: string;
  scenarioId?: string;
  tags?: string[];
}

export interface HandlersScenarioImpactV2DTO {
  /** Amount as string (e.g., "5000"), converted to decimal internally */
  amount?: string;
  /** Frequency for delta impacts (stored in DB) */
  cadence?: CommonFrequency;
  /** Advanced fields for start impacts - used to configure the created financial item */
  category?: string;
  /** Currency (derived field for response) */
  currency?: string;
  /** End date for the item */
  endDate?: string;
  /** Frequency for income/expense items */
  frequency?: string;
  /** Growth rate (%) - applied based on growth strategy */
  growthRate?: number;
  /** How growth is applied (none, annual_step, compound) */
  growthStrategy?: string;
  /** Impact ID (returned by server, sent back for updates) */
  id?: string;
  /** Required: start, delta, override, stop */
  impactKind?: string;
  /** Liability-specific fields for start impacts */
  interestRate?: number;
  /** Min payment for liabilities */
  minimumPayment?: number;
  /** Name for start impacts (creates new item with this name) */
  name?: string;
  /** Notes for the financial item */
  notes?: string;
  /** Required for delta/override/stop (ID of existing item to modify) */
  parentId?: string;
  /** Start date for the item */
  startDate?: string;
  /** Required: asset, liability, income, expense, cash, investment */
  targetType?: string;
}

export interface HandlersScenarioResponse {
  computed?: HandlersComputedValues;
  fees?: RepositoryPropertyFee[];
  grants?: RepositoryPropertySGGrant[];
  growthPeriods?: RepositoryGrowthPeriod[];
  ratePeriods?: RepositoryLiabilityRatePeriod[];
  scenario?: FinancialChatSystemBackendInternalFinancialV2RepositoryPropertyScenario;
  sgDetails?: RepositoryPropertySG;
}

export interface HandlersStopAllocationDTO {
  /** ISO 8601 format (e.g., "2031-03-31T23:59:59Z") */
  endDate?: string;
}

export interface HandlersStopInput {
  endDate?: string;
}

export interface LlmChatMessage {
  /** Message content */
  content?: string;
  /** Optional name for tool messages */
  name?: string;
  /** "user", "assistant", "system", "tool" */
  role?: string;
  /** ID of tool call this message responds to */
  tool_call_id?: string;
  /** Tool calls in this message */
  tool_calls?: LlmToolCall[];
}

export interface LlmFunctionCall {
  /** JSON string of function arguments */
  arguments?: string;
  /** Function name (e.g., "create_asset") */
  name?: string;
}

export interface LlmToolCall {
  /** Function details */
  function?: LlmFunctionCall;
  /** Unique identifier for this tool call */
  id?: string;
  /** Always "function" for function calls */
  type?: string;
}

export interface RepositoryCPFAccount {
  createdAt?: string;
  dateOfBirth?: string;
  /** When this version ends (NULL = ongoing) */
  endDate?: string;
  housingStartDate?: string;
  id?: string;
  /** MediSave Account balance */
  maBalance?: number;
  /** Ordinary Account balance */
  oaBalance?: number;
  /** OA amount used for housing (for accrued interest) */
  oaUsedForHousing?: number;
  /** Groups versions of same logical account */
  parentId?: string;
  prGrantDate?: string;
  /** Retirement Account balance (only after age 55) */
  raBalance?: number;
  /** 'citizen', 'pr_year_1', 'pr_year_2', 'pr_year_3_plus' */
  residencyStatus?: string;
  /** Special Account balance */
  saBalance?: number;
  /** When this version starts */
  startDate?: string;
  updatedAt?: string;
  userId?: string;
}

export interface RepositoryCashAsset {
  /** 'checking', 'savings', 'money_market' */
  accountType?: string;
  balance?: number;
  bankName?: string;
  category?: string;
  createdAt?: string;
  /** NULL means ongoing */
  endDate?: string;
  growthStrategy?: string;
  id?: string;
  /** How often delta adds (NULL for base/override) */
  impactFrequency?: string;
  /** NULL = base item, 'delta' = additive, 'override' = replaces */
  impactKind?: string;
  interestRate?: number;
  isAccumulator?: boolean;
  name?: string;
  notes?: string;
  /** For versioning support */
  parentId?: string;
  /** Scenario impact fields */
  scenarioEventId?: string;
  /** Precise start date (day-level) */
  startDate?: string;
  updatedAt?: string;
  userId?: string;
}

export interface RepositoryGrowthPeriod {
  assetId?: string;
  createdAt?: string;
  endYear?: number;
  growthRate?: number;
  growthStrategy?: string;
  id?: string;
  sgDetailsId?: string;
  startYear?: number;
}

export interface RepositoryLiabilityRatePeriod {
  createdAt?: string;
  fixedRate?: number;
  fixedYears?: number;
  floatingRate?: number;
  id?: string;
  liabilityId?: string;
  periodOrder?: number;
  sgDetailsId?: string;
  startMonth?: string;
  termYears?: number;
}

export interface RepositoryNonCashAsset {
  annualGrowthRate?: number;
  category?: string;
  currentValue?: number;
  /** NULL means ongoing */
  endDate?: string;
  growthStrategy?: string;
  id?: string;
  /** How often delta adds (NULL for base/override) */
  impactFrequency?: string;
  /** NULL = base item, 'delta' = additive, 'override' = replaces */
  impactKind?: string;
  name?: string;
  notes?: string;
  parentId?: string;
  /** Scenario impact fields */
  scenarioEventId?: string;
  /** Precise start date (day-level) */
  startDate?: string;
  updatedAt?: string;
}

export interface RepositoryPropertyFee {
  amount?: number;
  createdAt?: string;
  currency?: string;
  description?: string;
  endDate?: string;
  /** 'purchase' | 'sale' | 'recurring' */
  feeContext?: string;
  feeType?: string;
  /** 'one_time' | 'monthly' | 'yearly' */
  frequency?: string;
  id?: string;
  isPercentage?: boolean;
  myDetailsId?: string;
  sgDetailsId?: string;
  startDate?: string;
}

export interface RepositoryPropertySG {
  borrower1CpfAccountId?: string;
  borrower1IncomeId?: string;
  borrower2CpfAccountId?: string;
  borrower2IncomeId?: string;
  borrowerType?: string;
  btoKeyCollectionDate?: string;
  btoLaunchDate?: string;
  createdAt?: string;
  downpaymentCash?: number;
  downpaymentCpfOa?: number;
  icon?: string;
  iconColor?: string;
  id?: string;
  isIncluded?: boolean;
  loanType?: string;
  name?: string;
  otherDebt?: number;
  propertyCount?: number;
  propertyPrice?: number;
  propertySubtype?: string;
  propertyType?: string;
  /** Residency is DERIVED from Borrower1IncomeID → finance_incomes.residency_status (not stored in DB) */
  residency?: string;
  saleExpectedDate?: string;
  saleExpectedPrice?: number;
  updatedAt?: string;
  valuationPrice?: number;
}

export interface RepositoryPropertySGGrant {
  amount?: number;
  createdAt?: string;
  id?: string;
  name?: string;
  sgDetailsId?: string;
}

export interface SessionConversationStep {
  content?: string;
  result?: Record<string, any>;
  step_id?: string;
  timestamp?: string;
  tool_calls?: string[];
  tool_name?: string;
  /** "user_message", "llm_response", "tool_execution" */
  type?: string;
}

export interface SessionPendingToolCall {
  call_id?: string;
  created_at?: string;
  dependencies?: string[];
  friendly_description?: string;
  parameters?: Record<string, any>;
  preview?: string;
  tool_name?: string;
}

export interface SessionSessionState {
  chat_id?: string;
  conversation_flow?: SessionConversationStep[];
  created_at?: string;
  last_asset_id?: string;
  last_liability_id?: string;
  last_property_plan_id?: string;
  messages?: LlmChatMessage[];
  metadata?: Record<string, string>;
  pending_actions?: SessionPendingToolCall[];
  session_id?: string;
  updated_at?: string;
  user_id?: string;
}

export interface TimelineEventImpactSummary {
  /** annualized */
  amountAnnual?: number;
  amountMonthly?: number;
  cadence?: string;
  eventId?: string;
  /** override|delta|start|stop */
  impactKind?: string;
  notes?: string;
}

export interface TimelineGrowthApplied {
  annualRatePct?: number;
  category?: string;
}

export interface TimelineTimelineItem {
  adjAnnualAmt?: number;
  /** Adjusted monthly amount */
  adjMonthlyAmt?: number;
  amountAnnual?: number;
  /** Monthly amount (when resolution is monthly) */
  amountMonthly?: number;
  category?: string;
  eventImpacts?: TimelineEventImpactSummary[];
  /** GrowthRate is the per-item annual growth rate (percentage) */
  growthRate?: number;
  /** IsAccumulator indicates this is the designated cash account receiving net savings (cash accounts only) */
  isAccumulator?: boolean;
  /** ItemID is the stable logical identifier used for scenario matching (parent_id if present, else row id). */
  itemId?: string;
  itemType?: TimelineItemType;
  name?: string;
  /** ParentID is the original/base item id when this row is a child; else same as RowID. */
  parentId?: string;
  /** RowID is the concrete finance_* row id (for debugging/reference). */
  rowId?: string;
  sourceAmount?: number;
  sourceFrequency?: string;
  /** Month when item started (1-12) */
  startMonth?: number;
  startYear?: number;
}

export interface TimelineTimelineMonth {
  accumulatedCashEnd?: number;
  accumulatedCashStart?: number;
  accumulatorAccountId?: string;
  assets?: TimelineTimelineItem[];
  cashAccounts?: TimelineTimelineItem[];
  expenses?: TimelineTimelineItem[];
  growthApplied?: TimelineGrowthApplied[];
  hasOverrides?: boolean;
  income?: TimelineTimelineItem[];
  interestEarned?: number;
  liabilities?: TimelineTimelineItem[];
  /** Month number (1-12) */
  month?: number;
  /** 0-based global month index */
  monthIndex?: number;
  /** Monthly cash accumulation tracking */
  monthlyNetSavings?: number;
  /** Monthly net savings */
  netCash?: number;
  netWorth?: number;
  /** Calendar year (e.g., 2025) */
  year?: number;
  /** 0-based year index */
  yearIndex?: number;
}

export interface TimelineTimelineResponse {
  months?: TimelineTimelineMonth[];
  /** "yearly" or "monthly" */
  resolution?: string;
  /** ScenariosApplied lists scenario IDs merged into this response (optional). */
  scenariosApplied?: string[];
  version?: string;
  years?: TimelineTimelineYear[];
}

export interface TimelineTimelineYear {
  /** Cash balance at end of year (after interest) */
  accumulatedCashEnd?: number;
  /** Cash balance at start of year */
  accumulatedCashStart?: number;
  /** ID of the accumulator cash account */
  accumulatorAccountId?: string;
  /** Cash accumulation tracking */
  annualNetSavings?: number;
  assets?: TimelineTimelineItem[];
  /** Cash accounts from finance_cash_accounts table */
  cashAccounts?: TimelineTimelineItem[];
  expenses?: TimelineTimelineItem[];
  growthApplied?: TimelineGrowthApplied[];
  hasOverrides?: boolean;
  income?: TimelineTimelineItem[];
  /** Interest earned this year on accumulator */
  interestEarned?: number;
  liabilities?: TimelineTimelineItem[];
  /** Income - Expenses (annual net savings) */
  netCash?: number;
  /** Assets + CashAccounts - Liabilities */
  netWorth?: number;
  year?: number;
}

export interface TimelineV2AppliedImpact {
  amountAnnual?: number;
  amountMonthly?: number;
  eventId?: string;
  /** Percentage delta (e.g., 5 for +5%) */
  growthRate?: number;
  /** delta, override, start, stop */
  impactKind?: string;
  notes?: string;
}

export interface TimelineV2CPFAssetResponse {
  balance?: number;
  category?: string;
  eventAdjBalance?: number;
  id?: string;
  itemType?: string;
  name?: string;
  parentId?: string;
  startDate?: string;
  startMonth?: number;
  startYear?: number;
}

export interface TimelineV2CPFContributionResponse {
  allocationMa?: number;
  allocationOa?: number;
  allocationRa?: number;
  allocationSa?: number;
  category?: string;
  employeeContribution?: number;
  employerContribution?: number;
  id?: string;
  itemType?: string;
  name?: string;
  parentId?: string;
  sourceFrequency?: string;
  startMonth?: number;
  startYear?: number;
  totalContribution?: number;
}

export interface TimelineV2CashAssetResponse {
  balance?: number;
  category?: string;
  eventAdjBalance?: number;
  eventImpacts?: TimelineV2AppliedImpact[];
  isAccumulator?: boolean;
  itemId?: string;
  itemType?: string;
  name?: string;
  startMonth?: number;
  startYear?: number;
}

export interface TimelineV2ExpenseResponse {
  /** Monthly amount */
  amount?: number;
  /** Sum of 12 monthly amounts (accounts for growth) */
  annualAmount?: number;
  category?: string;
  /** Monthly amount with scenario impacts */
  eventAdjAmount?: number;
  /** Sum of 12 monthly amounts with scenario impacts */
  eventAdjAnnualAmount?: number;
  eventImpacts?: TimelineV2AppliedImpact[];
  id?: string;
  itemType?: string;
  name?: string;
  parentId?: string;
  /** If set, this item was created by a start impact */
  scenarioEventId?: string;
  sourceFrequency?: string;
  /** Link to liability this expense pays down */
  sourceLiabilityId?: string;
  startMonth?: number;
  startYear?: number;
}

export interface TimelineV2IncomeAllocationResponse {
  allocationType?: string;
  allocationValue?: number;
  endDate?: string;
  id?: string;
  incomeId?: string;
  parentId?: string;
  startDate?: string;
  targetCashAccountId?: string;
  targetInvestmentId?: string;
}

export interface TimelineV2IncomeResponse {
  allocationMa?: number;
  /** CPF allocation breakdown */
  allocationOa?: number;
  allocationRa?: number;
  allocationSa?: number;
  /** Monthly amount */
  amount?: number;
  /** Sum of 12 monthly amounts (accounts for growth) */
  annualAmount?: number;
  category?: string;
  employeeCpf?: number;
  employerCpf?: number;
  /** Monthly amount with scenario impacts */
  eventAdjAmount?: number;
  /** Sum of 12 monthly amounts with scenario impacts */
  eventAdjAnnualAmount?: number;
  eventImpacts?: TimelineV2AppliedImpact[];
  growthRate?: number;
  id?: string;
  itemType?: string;
  name?: string;
  netTakeHomePay?: number;
  parentId?: string;
  /** If set, this item was created by a start impact */
  scenarioEventId?: string;
  sourceFrequency?: string;
  startMonth?: number;
  startYear?: number;
  totalCpf?: number;
}

export interface TimelineV2InvestmentResponse {
  balance?: number;
  category?: string;
  eventAdjBalance?: number;
  eventImpacts?: TimelineV2AppliedImpact[];
  growthRate?: number;
  id?: string;
  itemType?: string;
  name?: string;
  parentId?: string;
  /** If set, this item was created by a start impact */
  scenarioEventId?: string;
  startDate?: string;
  startMonth?: number;
  startYear?: number;
}

export interface TimelineV2LiabilityResponse {
  /** Point-in-time balance */
  balance?: number;
  category?: string;
  /** Adjusted balance with scenario events */
  eventAdjBalance?: number;
  eventImpacts?: TimelineV2AppliedImpact[];
  id?: string;
  itemType?: string;
  name?: string;
  parentId?: string;
  /** If set, this item was created by a start impact */
  scenarioEventId?: string;
  sourceAmount?: number;
  startMonth?: number;
  startYear?: number;
}

export interface TimelineV2MonthDetailResponse {
  accumulatorAccountId?: string;
  allMonthsIndex?: number;
  allYearsIndex?: number;
  cashAssets?: TimelineV2CashAssetResponse[];
  cpfAssets?: TimelineV2CPFAssetResponse[];
  cpfContributions?: TimelineV2CPFContributionResponse[];
  expenses?: TimelineV2ExpenseResponse[];
  income?: TimelineV2IncomeResponse[];
  incomeAllocations?: TimelineV2IncomeAllocationResponse[];
  investments?: TimelineV2InvestmentResponse[];
  liabilities?: TimelineV2LiabilityResponse[];
  month?: number;
  /** income - employee CPF - expenses - investments (monthly) */
  netCash?: number;
  /** employee CPF contribution (monthly) */
  netInvestments?: number;
  /** Savings breakdown */
  netSavings?: number;
  netWorth?: number;
  nonCashAssets?: TimelineV2NonCashAssetResponse[];
  properties?: TimelineV2PropertySnapshot[];
  /** Other totals */
  totalAssets?: number;
  totalLiabilities?: number;
  year?: number;
}

export interface TimelineV2NonCashAssetResponse {
  balance?: number;
  category?: string;
  eventAdjBalance?: number;
  eventImpacts?: TimelineV2AppliedImpact[];
  id?: string;
  itemType?: string;
  name?: string;
  parentId?: string;
  /** If set, this item was created by a start impact */
  scenarioEventId?: string;
  startDate?: string;
  startMonth?: number;
  startYear?: number;
}

export interface TimelineV2PropertyFeeSnapshot {
  /** Computed amount */
  amount?: number;
  /** When the fee is due */
  date?: string;
  /** "purchase", "recurring", "sale" */
  feeContext?: string;
  id?: string;
  name?: string;
}

export interface TimelineV2PropertySnapshot {
  fees?: TimelineV2PropertyFeeSnapshot[];
  icon?: string;
  iconColor?: string;
  id?: string;
  /** Current/projected outstanding balance */
  mortgageBalance?: number;
  name?: string;
  /** PropertyValue - MortgageBalance */
  netEquity?: number;
  /** Current/projected value at this point */
  propertyValue?: number;
  /** First rate period start_month */
  purchaseDate?: string;
  saleDate?: string;
}

export interface TimelineV2TimelineAnnualChartResponse {
  months?: TimelineV2TimelineMonthlySummary[];
  resolution?: string;
  scenarioIds?: string[];
  years?: TimelineV2TimelineYearlySummary[];
}

export interface TimelineV2TimelineMonthlySummary {
  allMonthsIndex?: number;
  month?: number;
  netWorth?: number;
  totalAssets?: number;
  totalLiabilities?: number;
}

export interface TimelineV2TimelineV2Response {
  months?: TimelineV2MonthDetailResponse[];
}

export interface TimelineV2TimelineYearlySummary {
  allYearsIndex?: number;
  netWorth?: number;
  totalAssets?: number;
  totalLiabilities?: number;
  year?: number;
}
