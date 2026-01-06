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

export enum ItemType {
  ItemTypeAsset = "asset",
  ItemTypeLiability = "liability",
  ItemTypeIncome = "income",
  ItemTypeExpense = "expense",
  ItemTypeCashAccount = "cash_account",
}

export enum Frequency {
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

export interface AppliedImpact {
  amountAnnual?: number;
  amountMonthly?: number;
  eventId?: string;
  /** Percentage delta (e.g., 5 for +5%) */
  growthRate?: number;
  /** delta, override, start, stop */
  impactKind?: string;
  notes?: string;
}

export interface CPFAccount {
  createdAt?: string;
  /** Person-related fields (read-only, populated via JOIN from persons table) */
  dateOfBirth?: string;
  /** When this version ends (NULL = ongoing) */
  endDate?: string;
  housingStartDate?: string;
  id?: string;
  /** MediSave Account balance */
  maBalance?: number;
  /** Ordinary Account balance */
  oaBalance?: number;
  /**
   * OAUsedForHousing tracks OA withdrawals for housing purposes (for accrued interest calculation).
   * TODO: For multiple property scenarios, consider a 1:M relationship (cpf_housing_usages table)
   * with fields: property_scenario_id, amount_used, withdrawal_date, property_link_id.
   * This would allow tracking different OA usage amounts per property scenario.
   */
  oaUsedForHousing?: number;
  /** Groups versions of same logical account */
  parentId?: string;
  /** FK to persons table (required) */
  personId?: string;
  /** Display name from persons table (read-only, populated via JOIN) */
  personName?: string;
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

export interface CPFAssetResponse {
  balance?: number;
  category?: string;
  eventAdjBalance?: number;
  id?: string;
  itemType?: string;
  name?: string;
  parentId?: string;
  personId?: string;
  personName?: string;
  startDate?: string;
  startMonth?: number;
  startYear?: number;
}

export interface CPFContributionResponse {
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

export interface CPFOAAccountUsageInfo {
  accountId?: string;
  oaBalance?: string;
  personId?: string;
  remaining?: string;
  totalUsed?: string;
  usedElsewhere?: string;
  usedHere?: string;
}

export interface CashAsset {
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

export interface CashAssetResponse {
  balance?: number;
  category?: string;
  eventAdjBalance?: number;
  eventImpacts?: AppliedImpact[];
  isAccumulator?: boolean;
  itemId?: string;
  itemType?: string;
  name?: string;
  startMonth?: number;
  startYear?: number;
}

export interface ChatMessage {
  /** Message content */
  content?: string;
  /** Optional name for tool messages */
  name?: string;
  /** "user", "assistant", "system", "tool" */
  role?: string;
  /** ID of tool call this message responds to */
  tool_call_id?: string;
  /** Tool calls in this message */
  tool_calls?: ToolCall[];
}

export interface ChatRequest {
  chat_id: string;
  message: string;
  session_id: string;
}

export interface ChatResponse {
  actions_executed?: number;
  api_version?: string;
  content?: string;
  conversation_flow?: ConversationStep[];
  message_id?: string;
  proposed_actions?: ProposedAction[];
  requires_approval?: boolean;
}

export interface ComputedValues {
  absdAmount?: string;
  bsdAmount?: string;
  cpfOaUsageByAccount?: CPFOAAccountUsageInfo[];
  effectiveTdsrRatio?: string;
  loanAmount?: string;
  monthlyPayment?: string;
  /** Cross-property context (only populated when scenario is included) */
  otherMortgageTotal?: string;
  /** Projected CPF OA balances at purchase date */
  projectedBorrower1OA?: string;
  projectedBorrower2OA?: string;
  tdsrLimit?: string;
  totalAmountPaid?: string;
  totalInterest?: string;
  totalStampDuty?: string;
  totalUpfrontCash?: string;
}

export interface ConversationStep {
  content?: string;
  result?: Record<string, any>;
  step_id?: string;
  timestamp?: string;
  tool_calls?: string[];
  tool_name?: string;
  /** "user_message", "llm_response", "tool_execution" */
  type?: string;
}

export interface DispatchRequest {
  selected_actions: SelectedAction[];
  session_id: string;
}

export interface DispatchResponse {
  api_version?: string;
  results?: ExecutionResult[];
  summary?: ExecutionSummary;
  updated_session_state?: SessionState;
}

export interface EventImpactSummary {
  /** annualized */
  amountAnnual?: number;
  amountMonthly?: number;
  cadence?: string;
  eventId?: string;
  /** override|delta|start|stop */
  impactKind?: string;
  notes?: string;
}

export interface ExecutionResult {
  call_id?: string;
  entity_id?: string;
  error?: string;
  execution_time_ms?: number;
  rolled_back?: boolean;
  success?: boolean;
  tool_name?: string;
}

export interface ExecutionSummary {
  failed?: number;
  skipped?: number;
  /** "success", "partial_success", "failed" */
  status?: string;
  successful?: number;
  total_actions?: number;
  total_execution_time_ms?: number;
}

export interface Expense {
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

export interface ExpenseResponse {
  /** Monthly amount */
  amount?: number;
  /** Sum of 12 monthly amounts (accounts for growth) */
  annualAmount?: number;
  category?: string;
  /** Monthly amount with scenario impacts */
  eventAdjAmount?: number;
  /** Sum of 12 monthly amounts with scenario impacts */
  eventAdjAnnualAmount?: number;
  eventImpacts?: AppliedImpact[];
  /** Property fee specific fields */
  icon?: string;
  /** Icon color for property fees */
  iconColor?: string;
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

export interface FunctionCall {
  /** JSON string of function arguments */
  arguments?: string;
  /** Function name (e.g., "create_asset") */
  name?: string;
}

export interface GroupedExpenses {
  count?: number;
  debtRepayments?: Expense[];
  limit?: number;
  offset?: number;
  regularExpenses?: Expense[];
}

export interface GrowthApplied {
  annualRatePct?: number;
  category?: string;
}

export interface HealthResponse {
  services?: Record<string, any>;
  status?: string;
  timestamp?: string;
  uptime?: string;
  version?: string;
}

export interface ImpactEstimate {
  description?: string;
  monthly_change?: number;
  net_worth_change?: number;
}

export interface Income {
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
  /** FK to persons table (required) */
  personId?: string;
  /** Display name from persons table (read-only, populated via JOIN) */
  personName?: string;
  /** Scenario impact fields */
  scenarioEventId?: string;
  /** Precise start date (day-level) - now required */
  startDate?: string;
  updatedAt?: string;
}

export interface IncomeAllocationResponse {
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

export interface IncomeResponse {
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
  eventImpacts?: AppliedImpact[];
  growthRate?: number;
  id?: string;
  itemType?: string;
  name?: string;
  netTakeHomePay?: number;
  parentId?: string;
  personId?: string;
  personName?: string;
  /** If set, this item was created by a start impact */
  scenarioEventId?: string;
  sourceFrequency?: string;
  startMonth?: number;
  startYear?: number;
  totalCpf?: number;
}

export interface Investment {
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

export interface InvestmentResponse {
  balance?: number;
  category?: string;
  eventAdjBalance?: number;
  eventImpacts?: AppliedImpact[];
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

export interface Liability {
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

export interface LiabilityResponse {
  /** Point-in-time balance */
  balance?: number;
  category?: string;
  /** Adjusted balance with scenario events */
  eventAdjBalance?: number;
  eventImpacts?: AppliedImpact[];
  id?: string;
  itemType?: string;
  name?: string;
  parentId?: string;
  /** Fund flow payment attribution */
  paymentSources?: PaymentSourceResponse[];
  /** If set, this item was created by a start impact */
  scenarioEventId?: string;
  sourceAmount?: number;
  startMonth?: number;
  startYear?: number;
}

export interface MonthDetailResponse {
  accumulatorAccountId?: string;
  allMonthsIndex?: number;
  allYearsIndex?: number;
  cashAssets?: CashAssetResponse[];
  cpfAssets?: CPFAssetResponse[];
  cpfContributions?: CPFContributionResponse[];
  expenses?: ExpenseResponse[];
  income?: IncomeResponse[];
  incomeAllocations?: IncomeAllocationResponse[];
  investments?: InvestmentResponse[];
  liabilities?: LiabilityResponse[];
  month?: number;
  /** income - employee CPF - expenses - investments (monthly) */
  netCash?: number;
  /** employee CPF contribution (monthly) */
  netInvestments?: number;
  /** Savings breakdown */
  netSavings?: number;
  netWorth?: number;
  nonCashAssets?: NonCashAssetResponse[];
  properties?: PropertySnapshot[];
  /** Other totals */
  totalAssets?: number;
  totalLiabilities?: number;
  year?: number;
}

export interface MortgagePaymentSnapshot {
  /** Current interest rate (APR %) */
  currentRate?: number;
  /** Interest paid this month */
  interestPortion?: number;
  /** Total monthly payment */
  monthlyTotal?: number;
  /** Principal paid this month */
  principalPortion?: number;
  /** "fixed" or "floating" */
  rateType?: string;
}

export interface NonCashAsset {
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
  /** Value at end of useful life (NULL = disappear, 0 = worthless) */
  terminalValue?: number;
  updatedAt?: string;
}

export interface NonCashAssetResponse {
  balance?: number;
  category?: string;
  eventAdjBalance?: number;
  eventImpacts?: AppliedImpact[];
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

export interface PaymentSourceResponse {
  amount?: number;
  ruleId?: string;
  ruleName?: string;
  sourceId?: string;
  sourceName?: string;
  /** "cpf" or "cash" */
  sourceType?: string;
  /** True if this was a lower-priority rule covering remainder */
  usedFallback?: boolean;
}

export interface PendingToolCall {
  call_id?: string;
  created_at?: string;
  dependencies?: string[];
  friendly_description?: string;
  parameters?: Record<string, any>;
  preview?: string;
  tool_name?: string;
}

export interface Person {
  cpfCount?: number;
  createdAt?: string;
  dateOfBirth?: string;
  displayColor?: string;
  id?: string;
  /** Stats populated by GetPersonsWithStats */
  incomeCount?: number;
  isIncluded?: boolean;
  name?: string;
  prGrantDate?: string;
  /** 'citizen' or 'pr' (PR year computed from prGrantDate) */
  residencyStatus?: string;
  updatedAt?: string;
  userId?: string;
}

export interface PropertyFee {
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
  icon?: string;
  iconColor?: string;
  id?: string;
  isPercentage?: boolean;
  myDetailsId?: string;
  propertySgId?: string;
  startDate?: string;
}

export interface PropertyFeeSnapshot {
  /** Computed amount */
  amount?: number;
  /** When the fee is due */
  date?: string;
  /** "purchase", "recurring", "sale" */
  feeContext?: string;
  id?: string;
  name?: string;
}

export interface PropertySG {
  borrower1CpfAccountId?: string;
  /** Sale proceeds destination accounts */
  borrower1CpfRefundAccountId?: string;
  /** Per-borrower cash account configuration (downpayment) */
  borrower1DownpaymentCashAccountId?: string;
  borrower1DownpaymentCashAmount?: number;
  /** Per-borrower CPF OA tracking for downpayment */
  borrower1DownpaymentCpfOa?: number;
  borrower1IncomeId?: string;
  /** Per-borrower cash account configuration (monthly payment) */
  borrower1MonthlyCashAccountId?: string;
  borrower1MonthlyCashAmount?: number;
  /** 'fixed', 'percentage', 'remainder' */
  borrower1MonthlyCashAmountType?: string;
  /** Per-borrower monthly CPF OA payment amounts */
  borrower1MonthlyCpfOa?: number;
  borrower2CpfAccountId?: string;
  /** CPF OA to receive borrower 2's refund (joint only) */
  borrower2CpfRefundAccountId?: string;
  borrower2DownpaymentCashAccountId?: string;
  borrower2DownpaymentCashAmount?: number;
  borrower2DownpaymentCpfOa?: number;
  borrower2IncomeId?: string;
  borrower2MonthlyCashAccountId?: string;
  borrower2MonthlyCashAmount?: number;
  /** 'fixed', 'percentage', 'remainder' */
  borrower2MonthlyCashAmountType?: string;
  borrower2MonthlyCpfOa?: number;
  borrowerType?: string;
  btoKeyCollectionDate?: string;
  btoLaunchDate?: string;
  createdAt?: string;
  downpaymentCash?: number;
  downpaymentCpfOa?: number;
  id?: string;
  isIncluded?: boolean;
  /** Lease tenure: nil = freehold, 1-999 = remaining years */
  leaseRemainingYears?: number;
  loanType?: string;
  name?: string;
  /** Cash account to receive net proceeds */
  netCashProceedsAccountId?: string;
  otherDebt?: number;
  propertyCount?: number;
  propertyPrice?: number;
  propertySubtype?: string;
  propertyType?: string;
  purchaseIcon?: string;
  purchaseIconColor?: string;
  /** Residency is DERIVED from Borrower1IncomeID → finance_incomes.residency_status (not stored in DB) */
  residency?: string;
  saleExpectedDate?: string;
  saleExpectedPrice?: number;
  saleIcon?: string;
  saleIconColor?: string;
  updatedAt?: string;
  valuationPrice?: number;
}

export interface PropertySGGrant {
  amount?: number;
  createdAt?: string;
  id?: string;
  name?: string;
  propertySgId?: string;
}

export interface PropertyScenario {
  createdAt?: string;
  id?: string;
  myDetailsId?: string;
  propertySgId?: string;
  updatedAt?: string;
  userId?: string;
}

export interface PropertySnapshot {
  fees?: PropertyFeeSnapshot[];
  icon?: string;
  iconColor?: string;
  id?: string;
  /** Current/projected outstanding balance */
  mortgageBalance?: number;
  /** Monthly payment breakdown */
  mortgagePayment?: MortgagePaymentSnapshot;
  name?: string;
  /** PropertyValue - MortgageBalance */
  netEquity?: number;
  /** Current/projected value at this point */
  propertyValue?: number;
  /** First rate period start_month */
  purchaseDate?: string;
  saleDate?: string;
}

export interface ProposedAction {
  call_id?: string;
  dependencies?: string[];
  estimated_impact?: ImpactEstimate;
  friendly_description?: string;
  parameters?: Record<string, any>;
  tool_name?: string;
  warnings?: Warning[];
}

export interface SelectedAction {
  approved?: boolean;
  call_id: string;
  modified_args?: Record<string, any>;
}

export interface SessionState {
  chat_id?: string;
  conversation_flow?: ConversationStep[];
  created_at?: string;
  last_asset_id?: string;
  last_liability_id?: string;
  last_property_plan_id?: string;
  messages?: ChatMessage[];
  metadata?: Record<string, string>;
  pending_actions?: PendingToolCall[];
  session_id?: string;
  updated_at?: string;
  user_id?: string;
}

export interface TimelineAnnualChartResponse {
  months?: TimelineMonthlySummary[];
  resolution?: string;
  scenarioIds?: string[];
  years?: TimelineYearlySummary[];
}

export interface TimelineItem {
  adjAnnualAmt?: number;
  /** Adjusted monthly amount */
  adjMonthlyAmt?: number;
  amountAnnual?: number;
  /** Monthly amount (when resolution is monthly) */
  amountMonthly?: number;
  category?: string;
  eventImpacts?: EventImpactSummary[];
  /** GrowthRate is the per-item annual growth rate (percentage) */
  growthRate?: number;
  /** IsAccumulator indicates this is the designated cash account receiving net savings (cash accounts only) */
  isAccumulator?: boolean;
  /** ItemID is the stable logical identifier used for scenario matching (parent_id if present, else row id). */
  itemId?: string;
  itemType?: ItemType;
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

export interface TimelineMonth {
  accumulatedCashEnd?: number;
  accumulatedCashStart?: number;
  accumulatorAccountId?: string;
  assets?: TimelineItem[];
  cashAccounts?: TimelineItem[];
  expenses?: TimelineItem[];
  growthApplied?: GrowthApplied[];
  hasOverrides?: boolean;
  income?: TimelineItem[];
  interestEarned?: number;
  liabilities?: TimelineItem[];
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

export interface TimelineMonthlySummary {
  allMonthsIndex?: number;
  month?: number;
  netWorth?: number;
  totalAssets?: number;
  totalLiabilities?: number;
}

export interface TimelineResponse {
  months?: TimelineMonth[];
  /** "yearly" or "monthly" */
  resolution?: string;
  /** ScenariosApplied lists scenario IDs merged into this response (optional). */
  scenariosApplied?: string[];
  version?: string;
  years?: TimelineYear[];
}

export interface TimelineV2Response {
  months?: MonthDetailResponse[];
}

export interface TimelineYear {
  /** Cash balance at end of year (after interest) */
  accumulatedCashEnd?: number;
  /** Cash balance at start of year */
  accumulatedCashStart?: number;
  /** ID of the accumulator cash account */
  accumulatorAccountId?: string;
  /** Cash accumulation tracking */
  annualNetSavings?: number;
  assets?: TimelineItem[];
  /** Cash accounts from finance_cash_accounts table */
  cashAccounts?: TimelineItem[];
  expenses?: TimelineItem[];
  growthApplied?: GrowthApplied[];
  hasOverrides?: boolean;
  income?: TimelineItem[];
  /** Interest earned this year on accumulator */
  interestEarned?: number;
  liabilities?: TimelineItem[];
  /** Income - Expenses (annual net savings) */
  netCash?: number;
  /** Assets + CashAccounts - Liabilities */
  netWorth?: number;
  year?: number;
}

export interface TimelineYearlySummary {
  allYearsIndex?: number;
  netWorth?: number;
  totalAssets?: number;
  totalLiabilities?: number;
  year?: number;
}

export interface TokenResponse {
  expires?: string;
  token?: string;
  usage?: string;
  userId?: string;
}

export interface ToolCall {
  /** Function details */
  function?: FunctionCall;
  /** Unique identifier for this tool call */
  id?: string;
  /** Always "function" for function calls */
  type?: string;
}

export interface Warning {
  message?: string;
  /** "low", "medium", "high" */
  severity?: string;
  type?: string;
}

export interface AssetCreateInput {
  annualGrowthRate?: string;
  category?: string;
  currentValue?: string;
  endDate?: string;
  growthStrategy?: string;
  name?: string;
  notes?: string;
  startDate?: string;
  terminalValue?: string;
}

export interface AssetInput {
  annualGrowthRate?: string;
  category?: string;
  currentValue?: string;
  endDate?: string;
  growthStrategy?: string;
  id?: string;
  name?: string;
  notes?: string;
  parentId?: string;
  startDate?: string;
  terminalValue?: string;
  updateMode?: string;
}

export interface CashAccountV2Input {
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

export interface CpfV2CreateInput {
  housingStartDate?: string;
  maBalance?: string;
  oaBalance?: string;
  oaUsedForHousing?: string;
  /** Required FK to persons table */
  personId?: string;
  raBalance?: string;
  saBalance?: string;
}

export interface CpfV2Input {
  housingStartDate?: string;
  maBalance?: string;
  oaBalance?: string;
  oaUsedForHousing?: string;
  /** Required FK to persons table */
  personId?: string;
  raBalance?: string;
  saBalance?: string;
  startDate?: string;
  updateMode?: string;
}

export interface CreateFeeRequest {
  amount?: string;
  currency?: string;
  description?: string;
  endDate?: string;
  feeContext?: string;
  feeType?: string;
  frequency?: string;
  icon?: string;
  iconColor?: string;
  isPercentage?: boolean;
  startDate?: string;
}

export interface CreateGrantRequest {
  amount?: string;
  name?: string;
}

export interface CreateGrowthPeriodRequest {
  endYear?: number;
  growthRate?: string;
  growthStrategy?: string;
  startYear?: number;
}

export interface CreatePropertySGRequest {
  borrower1CpfAccountId?: string;
  /** Sale proceeds destination accounts */
  borrower1CpfRefundAccountId?: string;
  /** Per-borrower cash account configuration (downpayment) */
  borrower1DownpaymentCashAccountId?: string;
  borrower1DownpaymentCashAmount?: string;
  /** Per-borrower CPF OA tracking */
  borrower1DownpaymentCpfOa?: string;
  borrower1IncomeId?: string;
  /** Per-borrower cash account configuration (monthly payment) */
  borrower1MonthlyCashAccountId?: string;
  borrower1MonthlyCashAmount?: string;
  /** 'fixed', 'percentage', 'remainder' */
  borrower1MonthlyCashAmountType?: string;
  borrower1MonthlyCpfOa?: string;
  borrower2CpfAccountId?: string;
  borrower2CpfRefundAccountId?: string;
  borrower2DownpaymentCashAccountId?: string;
  borrower2DownpaymentCashAmount?: string;
  borrower2DownpaymentCpfOa?: string;
  borrower2IncomeId?: string;
  borrower2MonthlyCashAccountId?: string;
  borrower2MonthlyCashAmount?: string;
  /** 'fixed', 'percentage', 'remainder' */
  borrower2MonthlyCashAmountType?: string;
  borrower2MonthlyCpfOa?: string;
  borrowerType?: string;
  btoKeyCollectionDate?: string;
  btoLaunchDate?: string;
  downpaymentCash?: string;
  downpaymentCpfOa?: string;
  isIncluded?: boolean;
  /** Lease tenure: nil = freehold, 1-999 = remaining years */
  leaseRemainingYears?: number;
  loanType?: string;
  name?: string;
  netCashProceedsAccountId?: string;
  otherDebt?: string;
  propertyCount?: number;
  propertyPrice?: string;
  propertySubtype?: string;
  propertyType?: string;
  purchaseIcon?: string;
  purchaseIconColor?: string;
  saleExpectedDate?: string;
  saleExpectedPrice?: string;
  saleIcon?: string;
  saleIconColor?: string;
  valuationPrice?: string;
}

export interface CreateRatePeriodRequest {
  /** Interest rate (percentage) */
  rate?: string;
  /** "fixed" or "floating" */
  rateType?: string;
  /** YYYY-MM format - for backwards compatibility */
  startMonth?: string;
  termYears?: number;
}

export interface CreateScenarioRequest {
  /** "SG" | "MY" */
  country?: string;
  fees?: CreateFeeRequest[];
  grants?: CreateGrantRequest[];
  growthPeriods?: CreateGrowthPeriodRequest[];
  propertySG?: CreatePropertySGRequest;
  ratePeriods?: CreateRatePeriodRequest[];
}

export interface ExpenseCreateInput {
  amount?: string;
  category?: string;
  endDate?: string;
  frequency?: string;
  fundSourceAccountId?: string;
  growthRate?: string;
  growthStrategy?: string;
  name?: string;
  notes?: string;
  parentId?: string;
  sourceLiabilityId?: string;
  startDate?: string;
}

export interface ExpenseV2Input {
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

export interface FundFlowRuleCreateDTO {
  /** Amount */
  amountType?: string;
  amountValue?: string;
  endDate?: string;
  name?: string;
  /** Priority for multiple rules on same target (lower = higher priority) */
  priority?: number;
  ruleType?: string;
  sourceCashAccountId?: string;
  sourceCpfAccountId?: string;
  /** Source */
  sourceIncomeId?: string;
  sourceInvestmentId?: string;
  /** Timing */
  startDate?: string;
  targetCashAccountId?: string;
  /** Target */
  targetCpfAccountId?: string;
  targetInvestmentId?: string;
  targetLiabilityId?: string;
  targetPropertyId?: string;
}

export interface FundFlowRuleDTO {
  /** Amount */
  amountType?: string;
  amountValue?: string;
  /** Metadata */
  createdAt?: string;
  endDate?: string;
  id?: string;
  name?: string;
  /** Priority for multiple rules on same target (lower = higher priority) */
  priority?: number;
  ruleType?: string;
  sourceCashAccountId?: string;
  sourceCpfAccountId?: string;
  /** Source */
  sourceIncomeId?: string;
  sourceInvestmentId?: string;
  /** Timing */
  startDate?: string;
  targetCashAccountId?: string;
  /** Target */
  targetCpfAccountId?: string;
  targetInvestmentId?: string;
  targetLiabilityId?: string;
  targetPropertyId?: string;
  updatedAt?: string;
  userId?: string;
}

export interface GrowthPeriodResponse {
  assetId?: string;
  createdAt?: string;
  endYear?: number;
  growthRate?: string;
  growthStrategy?: string;
  id?: string;
  propertySgId?: string;
  startYear?: number;
}

export interface IncomeAllocationCreateDTO {
  allocationType?: string;
  allocationValue?: string;
  targetCashAccountId?: string;
  targetInvestmentId?: string;
}

export interface IncomeAllocationV2DTO {
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

export interface IncomeV2CreateInput {
  amount?: string;
  category?: string;
  cpfWageType?: string;
  endDate?: string;
  frequency?: string;
  growthRate?: string;
  growthStrategy?: string;
  name?: string;
  notes?: string;
  /** Required FK to persons table */
  personId?: string;
  startDate?: string;
}

export interface IncomeV2Input {
  amount?: string;
  category?: string;
  frequency?: string;
  growthRate?: string;
  growthStrategy?: string;
  id?: string;
  name?: string;
  notes?: string;
  parentId?: string;
  /** Required FK to persons table */
  personId?: string;
  startDate?: string;
  updateMode?: string;
}

export interface InvestmentCreateInput {
  annualGrowthRate?: string;
  category?: string;
  currentValue?: string;
  endDate?: string;
  growthStrategy?: string;
  name?: string;
  notes?: string;
  startDate?: string;
}

export interface InvestmentV2Input {
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

export interface LiabilityCreateInput {
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

export interface LiabilityInput {
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

export interface LiabilityRatePeriodResponse {
  createdAt?: string;
  id?: string;
  liabilityId?: string;
  periodOrder?: number;
  propertySgId?: string;
  rate?: string;
  rateType?: string;
  startDate?: string;
  termYears?: number;
}

export interface PersonV2CreateInput {
  /** Required, format: "2006-01-02" */
  dateOfBirth?: string;
  displayColor?: string;
  name?: string;
  /** Required if residencyStatus='pr', format: "2006-01-02" */
  prGrantDate?: string;
  /** 'citizen' or 'pr' (PR year is computed from prGrantDate) */
  residencyStatus?: string;
}

export interface PersonV2UpdateInput {
  /** Optional for updates, format: "2006-01-02" */
  dateOfBirth?: string;
  displayColor?: string;
  isIncluded?: boolean;
  name?: string;
  /** Required if residencyStatus='pr', format: "2006-01-02" */
  prGrantDate?: string;
  /** 'citizen' or 'pr' */
  residencyStatus?: string;
}

export interface ScenarioEventV2DTO {
  description?: string;
  displayColor?: string;
  displayIcon?: string;
  id?: string;
  impacts?: ScenarioImpactV2DTO[];
  isIncluded?: boolean;
  name?: string;
  occursOn?: string;
  scenarioId?: string;
  tags?: string[];
}

export interface ScenarioImpactV2DTO {
  /** Amount as string (e.g., "5000"), converted to decimal internally */
  amount?: string;
  /** Frequency for delta impacts (stored in DB) */
  cadence?: Frequency;
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
  /** Income-specific fields for start impacts */
  personId?: string;
  /** Start date for the item */
  startDate?: string;
  /** Required: asset, liability, income, expense, cash, investment */
  targetType?: string;
}

export interface ScenarioResponse {
  computed?: ComputedValues;
  fees?: PropertyFee[];
  grants?: PropertySGGrant[];
  growthPeriods?: GrowthPeriodResponse[];
  propertySG?: PropertySG;
  ratePeriods?: LiabilityRatePeriodResponse[];
  scenario?: PropertyScenario;
}

export interface StopAllocationDTO {
  /** ISO 8601 format (e.g., "2031-03-31T23:59:59Z") */
  endDate?: string;
}

export interface StopFundFlowRuleDTO {
  /** ISO 8601 format (e.g., "2031-03-31T23:59:59Z") */
  endDate?: string;
}

export interface StopInput {
  endDate?: string;
}
