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

export enum FinancialChatSystemBackendInternalFinancialTimelineItemType {
  ItemTypeAsset = "asset",
  ItemTypeLiability = "liability",
  ItemTypeIncome = "income",
  ItemTypeExpense = "expense",
  ItemTypeCashAccount = "cash_account",
}

export enum FinancialChatSystemBackendInternalCommonFrequency {
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

export interface CmdServerHandlersChatRequest {
  chat_id: string;
  message: string;
  session_id: string;
}

export interface CmdServerHandlersChatResponse {
  actions_executed?: number;
  api_version?: string;
  content?: string;
  conversation_flow?: FinancialChatSystemBackendInternalSessionConversationStep[];
  message_id?: string;
  proposed_actions?: FinancialChatSystemBackendInternalFinancialProposedAction[];
  requires_approval?: boolean;
}

export interface CmdServerHandlersDispatchRequest {
  selected_actions: CmdServerHandlersSelectedAction[];
  session_id: string;
}

export interface CmdServerHandlersDispatchResponse {
  api_version?: string;
  results?: CmdServerHandlersExecutionResult[];
  summary?: CmdServerHandlersExecutionSummary;
  updated_session_state?: FinancialChatSystemBackendInternalSessionSessionState;
}

export interface CmdServerHandlersExecutionResult {
  call_id?: string;
  entity_id?: string;
  error?: string;
  execution_time_ms?: number;
  rolled_back?: boolean;
  success?: boolean;
  tool_name?: string;
}

export interface CmdServerHandlersExecutionSummary {
  failed?: number;
  skipped?: number;
  /** "success", "partial_success", "failed" */
  status?: string;
  successful?: number;
  total_actions?: number;
  total_execution_time_ms?: number;
}

export interface CmdServerHandlersHealthResponse {
  services?: Record<string, any>;
  status?: string;
  timestamp?: string;
  uptime?: string;
  version?: string;
}

export interface CmdServerHandlersSelectedAction {
  approved?: boolean;
  call_id: string;
  modified_args?: Record<string, any>;
}

export interface CmdServerHandlersTokenResponse {
  expires?: string;
  token?: string;
  usage?: string;
  userId?: string;
}

export interface CmdServerHandlersAge55ConversionInput {
  /** Basic Healthcare Sum */
  bhs?: string;
  /** Basic Retirement Sum */
  brs?: string;
  /** Enhanced Retirement Sum */
  ers?: string;
  /** Full Retirement Sum */
  frs?: string;
  /** MediSave Account balance */
  maBalance?: string;
  /** Ordinary Account balance */
  oaBalance?: string;
  /** Optional: property pledge amount */
  propertyPledgeAmount?: string;
  /** Special Account balance */
  saBalance?: string;
  /** "brs", "frs", or "ers" */
  targetScheme?: string;
}

export interface CmdServerHandlersAge55ConversionResponse {
  cpfLifeEligible?: boolean;
  finalMa?: string;
  /** Final balances after conversion */
  finalOa?: string;
  finalRa?: string;
  finalSa?: string;
  maOverflowToRa?: string;
  /** Status */
  meetsTarget?: boolean;
  oaToRa?: string;
  /** Transfer breakdown */
  saToRa?: string;
  targetAmount?: string;
  /** Target details */
  targetScheme?: string;
  /** Withdrawable */
  withdrawableOa?: string;
}

export interface CmdServerHandlersAssetCreateInput {
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

export interface CmdServerHandlersAssetInput {
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

export interface CmdServerHandlersCashAccountV2Input {
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

export interface CmdServerHandlersCpfAccruedInterestSchedule {
  asOfDate?: string;
  totalAccrued?: string;
  yearlyBreakdown?: CmdServerHandlersCpfYearlyAccrued[];
}

export interface CmdServerHandlersCpfAssumptionsInput {
  cpfLife?: {
    escalatingGrowth?: string;
    payoutStartAge?: number;
    plan?: string;
  };
  employment?: {
    retirementAge?: number;
  };
  growthRates?: {
    frs?: string;
  };
  interestRates?: {
    extraFirst30KAbove55?: string;
    extraFirst60K?: string;
    ma?: string;
    oa?: string;
    ra?: string;
    sa?: string;
  };
  presetName?: string;
}

export interface CmdServerHandlersCpfAssumptionsResponse {
  cpfAccountId?: string;
  cpfLife?: {
    escalatingGrowth?: string;
    payoutStartAge?: number;
    plan?: string;
  };
  employment?: {
    retirementAge?: number;
  };
  growthRates?: {
    frs?: string;
  };
  id?: string;
  interestRates?: {
    extraFirst30KAbove55?: string;
    extraFirst60K?: string;
    ma?: string;
    oa?: string;
    ra?: string;
    sa?: string;
  };
  presetName?: string;
}

export interface CmdServerHandlersCpfBalanceProjectionProjectionInput {
  /** CPF LIFE payout start age (65-70) */
  payoutStartAge?: number;
  /** Age at which contributions stop (default 62) */
  retirementAge?: number;
}

export interface CmdServerHandlersCpfBalanceProjectionProjectionResponse {
  age55Balances?: {
    ma?: string;
    oa?: string;
    ra?: string;
    sa?: string;
  };
  age65Balances?: {
    ma?: string;
    oa?: string;
    ra?: string;
    sa?: string;
  };
  bhs?: string;
  birthYear?: number;
  brsAt55?: string;
  cpfLifeEstimates?: CmdServerHandlersCpfLifeEstimateResponse;
  ersAt55?: string;
  frsAt55?: string;
  gender?: string;
  snapshots?: CmdServerHandlersCpfBalanceProjectionSnapshotResponse[];
}

export interface CmdServerHandlersCpfBalanceProjectionSnapshotResponse {
  age?: number;
  contributions?: string;
  /** Total CPF LIFE payouts to date */
  cumulativePayouts?: string;
  interest?: string;
  ma?: string;
  /** CPF LIFE monthly payout (after age 65) */
  monthlyPayout?: string;
  oa?: string;
  ra?: string;
  sa?: string;
  total?: string;
  year?: number;
  /** Total CPF LIFE payouts this year */
  yearlyPayout?: string;
}

export interface CmdServerHandlersCpfHousingMonthlyPayment {
  cashUsed?: string;
  interestPortion?: string;
  /** YYYY-MM format */
  month?: string;
  oaUsed?: string;
  principalPortion?: string;
}

export interface CmdServerHandlersCpfHousingUsageDownPayment {
  cashUsed?: string;
  grantReceived?: string;
  /** EHG, FHG, PHG, STEP_UP, or null */
  grantType?: string;
  oaUsed?: string;
}

export interface CmdServerHandlersCpfHousingUsageFullResponse {
  saleAnalysis?: CmdServerHandlersCpfPropertySaleAnalysis;
  usage?: CmdServerHandlersCpfHousingUsageResponse;
}

export interface CmdServerHandlersCpfHousingUsageResponse {
  accruedInterest?: CmdServerHandlersCpfAccruedInterestSchedule;
  downPayment?: CmdServerHandlersCpfHousingUsageDownPayment;
  monthlyPayments?: CmdServerHandlersCpfHousingMonthlyPayment[];
  propertyScenarioId?: string;
  totals?: CmdServerHandlersCpfHousingUsageTotals;
}

export interface CmdServerHandlersCpfHousingUsageTotals {
  oaForDownPayment?: string;
  oaForMonthlyPayments?: string;
  totalCashUsed?: string;
  totalOAUsed?: string;
}

export interface CmdServerHandlersCpfLifeEstimateInput {
  /** Optional: birth year for standalone mode */
  birthYear?: number;
  /** Optional: CPF account to get person's birth year and gender */
  cpfAccountId?: string;
  /** Optional: 'male' or 'female' for standalone mode */
  gender?: string;
  /** Required: payout start age (65-70) */
  payoutStartAge?: number;
  /** Required: RA balance at age 65 */
  raBalanceAt65?: string;
}

export interface CmdServerHandlersCpfLifeEstimateResponse {
  birthYear?: number;
  disclaimer?: string;
  estimates?: {
    basic?: {
      annualPayout?: string;
      bequestAtAge75?: string;
      bequestAtAge85?: string;
      bequestAtAge95?: string;
      monthlyPayout?: string;
      payoutRate?: string;
    };
    escalating?: {
      annualPayout?: string;
      bequestAtAge75?: string;
      bequestAtAge85?: string;
      bequestAtAge95?: string;
      monthlyPayout?: string;
      payoutAt75?: string;
      payoutAt85?: string;
      payoutRate?: string;
    };
    standard?: {
      annualPayout?: string;
      bequestAtAge75?: string;
      bequestAtAge85?: string;
      bequestAtAge95?: string;
      monthlyPayout?: string;
      payoutRate?: string;
    };
  };
  gender?: string;
  payoutStartAge?: number;
  raBalanceAt65?: string;
}

export interface CmdServerHandlersCpfProjectionInput {
  /** Required: CPF account to project */
  cpfAccountId?: string;
  /** Include linked incomes in projection (default true) */
  includeIncomes?: boolean;
  /** Required: payout start age (65-70) */
  payoutStartAge?: number;
}

export interface CmdServerHandlersCpfProjectionResponse {
  /** When the person turns 65 */
  age65Date?: string;
  /** Person info */
  birthYear?: number;
  /** CPF LIFE estimates using projected RA balance */
  cpfLifeEstimates?: CmdServerHandlersCpfLifeEstimateResponse;
  /** Current account info */
  currentBalances?: {
    asOfDate?: string;
    ma?: string;
    oa?: string;
    ra?: string;
    sa?: string;
  };
  gender?: string;
  /** Projected balances at age 65 */
  projectedBalances?: {
    /** The date when person turns 65 */
    asOfDate?: string;
    ma?: string;
    oa?: string;
    ra?: string;
    sa?: string;
  };
}

export interface CmdServerHandlersCpfPropertySaleAnalysis {
  cpfRefundRequired?: {
    accruedInterest?: string;
    principalUsed?: string;
    totalRefund?: string;
  };
  grossProceeds?: string;
  netCashProceeds?: string;
  outstandingLoan?: string;
  refundDestination?: {
    reason?: string;
    toOA?: string;
    toRA?: string;
  };
  saleDate?: string;
  sellingCosts?: string;
  warnings?: string[];
}

export interface CmdServerHandlersCpfV2CreateInput {
  maBalance?: string;
  oaBalance?: string;
  /** Required FK to persons table */
  personId?: string;
  raBalance?: string;
  saBalance?: string;
}

export interface CmdServerHandlersCpfV2Input {
  maBalance?: string;
  oaBalance?: string;
  /** Required FK to persons table */
  personId?: string;
  raBalance?: string;
  saBalance?: string;
  startDate?: string;
  updateMode?: string;
}

export interface CmdServerHandlersCpfYearlyAccrued {
  cumulativeInterest?: string;
  interestForYear?: string;
  startingPrincipal?: string;
  year?: number;
}

export interface CmdServerHandlersCreateFeeRequest {
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

export interface CmdServerHandlersCreateGrantRequest {
  amount?: string;
  name?: string;
}

export interface CmdServerHandlersCreateGrowthPeriodRequest {
  endYear?: number;
  growthRate?: string;
  growthStrategy?: string;
  startYear?: number;
}

export interface CmdServerHandlersCreatePropertySGRequest {
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

export interface CmdServerHandlersCreateRatePeriodRequest {
  /** Interest rate (percentage) */
  rate?: string;
  /** "fixed" or "floating" */
  rateType?: string;
  /** YYYY-MM format - for backwards compatibility */
  startMonth?: string;
  termYears?: number;
}

export interface CmdServerHandlersCreateScenarioRequest {
  /** "SG" | "MY" */
  country?: string;
  fees?: CmdServerHandlersCreateFeeRequest[];
  grants?: CmdServerHandlersCreateGrantRequest[];
  growthPeriods?: CmdServerHandlersCreateGrowthPeriodRequest[];
  propertySG?: CmdServerHandlersCreatePropertySGRequest;
  ratePeriods?: CmdServerHandlersCreateRatePeriodRequest[];
}

export interface CmdServerHandlersExpenseCreateInput {
  amount?: string;
  category?: string;
  endDate?: string;
  frequency?: string;
  /** Creates a fund flow expense rule to pay from this account */
  fundSourceAccountId?: string;
  growthRate?: string;
  growthStrategy?: string;
  name?: string;
  notes?: string;
  parentId?: string;
  sourceLiabilityId?: string;
  startDate?: string;
}

export interface CmdServerHandlersExpenseV2Input {
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

export interface CmdServerHandlersFundFlowRuleCreateDTO {
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
  targetExpenseId?: string;
  targetInvestmentId?: string;
  targetLiabilityId?: string;
  targetPropertyId?: string;
}

export interface CmdServerHandlersFundFlowRuleDTO {
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
  targetExpenseId?: string;
  targetInvestmentId?: string;
  targetLiabilityId?: string;
  targetPropertyId?: string;
  updatedAt?: string;
  userId?: string;
}

export interface CmdServerHandlersGrowthPeriodResponse {
  assetId?: string;
  createdAt?: string;
  endYear?: number;
  growthRate?: string;
  growthStrategy?: string;
  id?: string;
  propertySgId?: string;
  startYear?: number;
}

export interface CmdServerHandlersIncomeV2CreateInput {
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

export interface CmdServerHandlersIncomeV2Input {
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

export interface CmdServerHandlersInvestmentCreateInput {
  annualGrowthRate?: string;
  category?: string;
  currentValue?: string;
  endDate?: string;
  growthStrategy?: string;
  name?: string;
  notes?: string;
  startDate?: string;
}

export interface CmdServerHandlersInvestmentV2Input {
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

export interface CmdServerHandlersLiabilityCreateInput {
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

export interface CmdServerHandlersLiabilityInput {
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

export interface CmdServerHandlersLiabilityRatePeriodResponse {
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

export interface CmdServerHandlersPersonV2CreateInput {
  /** Required, format: "2006-01-02" */
  dateOfBirth?: string;
  displayColor?: string;
  /** Required: 'male' or 'female' for CPF LIFE calculations */
  gender?: string;
  name?: string;
  /** Required if residencyStatus='pr', format: "2006-01-02" */
  prGrantDate?: string;
  /** 'citizen' or 'pr' (PR year is computed from prGrantDate) */
  residencyStatus?: string;
}

export interface CmdServerHandlersPersonV2UpdateInput {
  /** Optional for updates, format: "2006-01-02" */
  dateOfBirth?: string;
  displayColor?: string;
  /** Optional: 'male' or 'female' */
  gender?: string;
  isIncluded?: boolean;
  name?: string;
  /** Required if residencyStatus='pr', format: "2006-01-02" */
  prGrantDate?: string;
  /** 'citizen' or 'pr' */
  residencyStatus?: string;
}

export interface CmdServerHandlersScenarioEventV2DTO {
  description?: string;
  displayColor?: string;
  displayIcon?: string;
  id?: string;
  impacts?: CmdServerHandlersScenarioImpactV2DTO[];
  isIncluded?: boolean;
  name?: string;
  occursOn?: string;
  scenarioId?: string;
  tags?: string[];
}

export interface CmdServerHandlersScenarioImpactV2DTO {
  /** Amount as string (e.g., "5000"), converted to decimal internally */
  amount?: string;
  /** Frequency for delta impacts (stored in DB) */
  cadence?: FinancialChatSystemBackendInternalCommonFrequency;
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

export interface CmdServerHandlersScenarioResponse {
  computed?: FinancialChatSystemBackendInternalFinancialV2PropertyComputedValues;
  fees?: FinancialChatSystemBackendInternalFinancialV2RepositoryPropertyFee[];
  grants?: FinancialChatSystemBackendInternalFinancialV2RepositoryPropertySGGrant[];
  growthPeriods?: CmdServerHandlersGrowthPeriodResponse[];
  propertySG?: FinancialChatSystemBackendInternalFinancialV2RepositoryPropertySG;
  ratePeriods?: CmdServerHandlersLiabilityRatePeriodResponse[];
  scenario?: FinancialChatSystemBackendInternalFinancialV2RepositoryPropertyScenario;
}

export interface CmdServerHandlersStopFundFlowRuleDTO {
  /** ISO 8601 format (e.g., "2031-03-31T23:59:59Z") */
  endDate?: string;
}

export interface CmdServerHandlersStopInput {
  endDate?: string;
}

export interface FinancialChatSystemBackendInternalFinancialImpactEstimate {
  description?: string;
  monthly_change?: number;
  net_worth_change?: number;
}

export interface FinancialChatSystemBackendInternalFinancialProposedAction {
  call_id?: string;
  dependencies?: string[];
  estimated_impact?: FinancialChatSystemBackendInternalFinancialImpactEstimate;
  friendly_description?: string;
  parameters?: Record<string, any>;
  tool_name?: string;
  warnings?: FinancialChatSystemBackendInternalFinancialWarning[];
}

export interface FinancialChatSystemBackendInternalFinancialWarning {
  message?: string;
  /** "low", "medium", "high" */
  severity?: string;
  type?: string;
}

export interface FinancialChatSystemBackendInternalFinancialTimelineEventImpactSummary {
  /** annualized */
  amountAnnual?: number;
  amountMonthly?: number;
  cadence?: string;
  eventId?: string;
  /** override|delta|start|stop */
  impactKind?: string;
  notes?: string;
}

export interface FinancialChatSystemBackendInternalFinancialTimelineGrowthApplied {
  annualRatePct?: number;
  category?: string;
}

export interface FinancialChatSystemBackendInternalFinancialTimelineTimelineItem {
  adjAnnualAmt?: number;
  /** Adjusted monthly amount */
  adjMonthlyAmt?: number;
  amountAnnual?: number;
  /** Monthly amount (when resolution is monthly) */
  amountMonthly?: number;
  category?: string;
  eventImpacts?: FinancialChatSystemBackendInternalFinancialTimelineEventImpactSummary[];
  /** GrowthRate is the per-item annual growth rate (percentage) */
  growthRate?: number;
  /** IsAccumulator indicates this is the designated cash account receiving net savings (cash accounts only) */
  isAccumulator?: boolean;
  /** ItemID is the stable logical identifier used for scenario matching (parent_id if present, else row id). */
  itemId?: string;
  itemType?: FinancialChatSystemBackendInternalFinancialTimelineItemType;
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

export interface FinancialChatSystemBackendInternalFinancialTimelineTimelineMonth {
  accumulatedCashEnd?: number;
  accumulatedCashStart?: number;
  accumulatorAccountId?: string;
  assets?: FinancialChatSystemBackendInternalFinancialTimelineTimelineItem[];
  cashAccounts?: FinancialChatSystemBackendInternalFinancialTimelineTimelineItem[];
  expenses?: FinancialChatSystemBackendInternalFinancialTimelineTimelineItem[];
  growthApplied?: FinancialChatSystemBackendInternalFinancialTimelineGrowthApplied[];
  hasOverrides?: boolean;
  income?: FinancialChatSystemBackendInternalFinancialTimelineTimelineItem[];
  interestEarned?: number;
  liabilities?: FinancialChatSystemBackendInternalFinancialTimelineTimelineItem[];
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

export interface FinancialChatSystemBackendInternalFinancialTimelineTimelineResponse {
  months?: FinancialChatSystemBackendInternalFinancialTimelineTimelineMonth[];
  /** "yearly" or "monthly" */
  resolution?: string;
  /** ScenariosApplied lists scenario IDs merged into this response (optional). */
  scenariosApplied?: string[];
  version?: string;
  years?: FinancialChatSystemBackendInternalFinancialTimelineTimelineYear[];
}

export interface FinancialChatSystemBackendInternalFinancialTimelineTimelineYear {
  /** Cash balance at end of year (after interest) */
  accumulatedCashEnd?: number;
  /** Cash balance at start of year */
  accumulatedCashStart?: number;
  /** ID of the accumulator cash account */
  accumulatorAccountId?: string;
  /** Cash accumulation tracking */
  annualNetSavings?: number;
  assets?: FinancialChatSystemBackendInternalFinancialTimelineTimelineItem[];
  /** Cash accounts from finance_cash_accounts table */
  cashAccounts?: FinancialChatSystemBackendInternalFinancialTimelineTimelineItem[];
  expenses?: FinancialChatSystemBackendInternalFinancialTimelineTimelineItem[];
  growthApplied?: FinancialChatSystemBackendInternalFinancialTimelineGrowthApplied[];
  hasOverrides?: boolean;
  income?: FinancialChatSystemBackendInternalFinancialTimelineTimelineItem[];
  /** Interest earned this year on accumulator */
  interestEarned?: number;
  liabilities?: FinancialChatSystemBackendInternalFinancialTimelineTimelineItem[];
  /** Income - Expenses (annual net savings) */
  netCash?: number;
  /** Assets + CashAccounts - Liabilities */
  netWorth?: number;
  year?: number;
}

export interface FinancialChatSystemBackendInternalFinancialV2PropertyCPFOAAccountUsageInfo {
  accountId?: string;
  oaBalance?: string;
  personId?: string;
  remaining?: string;
  totalUsed?: string;
  usedElsewhere?: string;
  usedHere?: string;
}

export interface FinancialChatSystemBackendInternalFinancialV2PropertyComputedValues {
  absdAmount?: string;
  bsdAmount?: string;
  cpfOaUsageByAccount?: FinancialChatSystemBackendInternalFinancialV2PropertyCPFOAAccountUsageInfo[];
  effectiveTdsrRatio?: string;
  loanAmount?: string;
  monthlyPayment?: string;
  /** Cross-property context (only populated when scenario is included) */
  otherMortgageTotal?: string;
  tdsrLimit?: string;
  totalAmountPaid?: string;
  totalInterest?: string;
  totalStampDuty?: string;
  totalUpfrontCash?: string;
}

export interface FinancialChatSystemBackendInternalFinancialV2PropertyMortgagePaymentSnapshot {
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

export interface FinancialChatSystemBackendInternalFinancialV2PropertyPropertyFeeSnapshot {
  /** Computed amount */
  amount?: number;
  /** When the fee is due */
  date?: string;
  /** "purchase", "recurring", "sale" */
  feeContext?: string;
  id?: string;
  name?: string;
}

export interface FinancialChatSystemBackendInternalFinancialV2PropertyPropertySnapshot {
  fees?: FinancialChatSystemBackendInternalFinancialV2PropertyPropertyFeeSnapshot[];
  icon?: string;
  iconColor?: string;
  id?: string;
  /** Current/projected outstanding balance */
  mortgageBalance?: number;
  /** Monthly payment breakdown */
  mortgagePayment?: FinancialChatSystemBackendInternalFinancialV2PropertyMortgagePaymentSnapshot;
  name?: string;
  /** PropertyValue - MortgageBalance */
  netEquity?: number;
  /** Current/projected value at this point */
  propertyValue?: number;
  /** First rate period start_month */
  purchaseDate?: string;
  saleDate?: string;
}

export interface FinancialChatSystemBackendInternalFinancialV2RepositoryCPFAccount {
  createdAt?: string;
  /** Person-related fields (read-only, populated via JOIN from persons table) */
  dateOfBirth?: string;
  /** When this version ends (NULL = ongoing) */
  endDate?: string;
  /** 'male' or 'female' - from persons table via JOIN */
  gender?: string;
  id?: string;
  /** MediSave Account balance */
  maBalance?: number;
  /** Ordinary Account balance */
  oaBalance?: number;
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

export interface FinancialChatSystemBackendInternalFinancialV2RepositoryCashAsset {
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

export interface FinancialChatSystemBackendInternalFinancialV2RepositoryNonCashAsset {
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

export interface FinancialChatSystemBackendInternalFinancialV2RepositoryPerson {
  cpfCount?: number;
  createdAt?: string;
  dateOfBirth?: string;
  displayColor?: string;
  /** 'male' or 'female' - required for CPF LIFE calculations */
  gender?: string;
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

export interface FinancialChatSystemBackendInternalFinancialV2RepositoryPropertyFee {
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

export interface FinancialChatSystemBackendInternalFinancialV2RepositoryPropertySG {
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

export interface FinancialChatSystemBackendInternalFinancialV2RepositoryPropertySGGrant {
  amount?: number;
  createdAt?: string;
  id?: string;
  name?: string;
  propertySgId?: string;
}

export interface FinancialChatSystemBackendInternalFinancialV2RepositoryPropertyScenario {
  createdAt?: string;
  id?: string;
  myDetailsId?: string;
  propertySgId?: string;
  updatedAt?: string;
  userId?: string;
}

export interface FinancialChatSystemBackendInternalFinancialV2TimelineAppliedImpact {
  amountAnnual?: number;
  amountMonthly?: number;
  eventId?: string;
  /** Percentage delta (e.g., 5 for +5%) */
  growthRate?: number;
  /** delta, override, start, stop */
  impactKind?: string;
  notes?: string;
}

export interface FinancialChatSystemBackendInternalFinancialV2TimelineCPFAssetResponse {
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

export interface FinancialChatSystemBackendInternalFinancialV2TimelineCPFContributionResponse {
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

export interface FinancialChatSystemBackendInternalFinancialV2TimelineCPFRefundResponse {
  id?: string;
  /** "cpf_refund" */
  itemType?: string;
  name?: string;
  propertyName?: string;
  /** YYYY-MM format */
  refundDate?: string;
  targetAccountId?: string;
  totalRefund?: number;
}

export interface FinancialChatSystemBackendInternalFinancialV2TimelineCashAssetResponse {
  balance?: number;
  category?: string;
  eventAdjBalance?: number;
  eventImpacts?: FinancialChatSystemBackendInternalFinancialV2TimelineAppliedImpact[];
  isAccumulator?: boolean;
  itemId?: string;
  itemType?: string;
  name?: string;
  startMonth?: number;
  startYear?: number;
}

export interface FinancialChatSystemBackendInternalFinancialV2TimelineExpenseResponse {
  /** Monthly amount */
  amount?: number;
  /** Sum of 12 monthly amounts (accounts for growth) */
  annualAmount?: number;
  category?: string;
  /** Monthly amount with scenario impacts */
  eventAdjAmount?: number;
  /** Sum of 12 monthly amounts with scenario impacts */
  eventAdjAnnualAmount?: number;
  eventImpacts?: FinancialChatSystemBackendInternalFinancialV2TimelineAppliedImpact[];
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

export interface FinancialChatSystemBackendInternalFinancialV2TimelineIncomeAllocationResponse {
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

export interface FinancialChatSystemBackendInternalFinancialV2TimelineIncomeResponse {
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
  eventImpacts?: FinancialChatSystemBackendInternalFinancialV2TimelineAppliedImpact[];
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

export interface FinancialChatSystemBackendInternalFinancialV2TimelineInvestmentResponse {
  balance?: number;
  category?: string;
  eventAdjBalance?: number;
  eventImpacts?: FinancialChatSystemBackendInternalFinancialV2TimelineAppliedImpact[];
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

export interface FinancialChatSystemBackendInternalFinancialV2TimelineLiabilityResponse {
  /** Point-in-time balance */
  balance?: number;
  category?: string;
  /** Adjusted balance with scenario events */
  eventAdjBalance?: number;
  eventImpacts?: FinancialChatSystemBackendInternalFinancialV2TimelineAppliedImpact[];
  id?: string;
  itemType?: string;
  name?: string;
  parentId?: string;
  /** Fund flow payment attribution */
  paymentSources?: FinancialChatSystemBackendInternalFinancialV2TimelinePaymentSourceResponse[];
  /** If set, this item was created by a start impact */
  scenarioEventId?: string;
  sourceAmount?: number;
  startMonth?: number;
  startYear?: number;
}

export interface FinancialChatSystemBackendInternalFinancialV2TimelineMonthDetailResponse {
  accumulatorAccountId?: string;
  allMonthsIndex?: number;
  allYearsIndex?: number;
  cashAssets?: FinancialChatSystemBackendInternalFinancialV2TimelineCashAssetResponse[];
  cpfAssets?: FinancialChatSystemBackendInternalFinancialV2TimelineCPFAssetResponse[];
  cpfContributions?: FinancialChatSystemBackendInternalFinancialV2TimelineCPFContributionResponse[];
  cpfRefunds?: FinancialChatSystemBackendInternalFinancialV2TimelineCPFRefundResponse[];
  expenses?: FinancialChatSystemBackendInternalFinancialV2TimelineExpenseResponse[];
  income?: FinancialChatSystemBackendInternalFinancialV2TimelineIncomeResponse[];
  incomeAllocations?: FinancialChatSystemBackendInternalFinancialV2TimelineIncomeAllocationResponse[];
  investments?: FinancialChatSystemBackendInternalFinancialV2TimelineInvestmentResponse[];
  liabilities?: FinancialChatSystemBackendInternalFinancialV2TimelineLiabilityResponse[];
  month?: number;
  /** income - employee CPF - expenses - investments (monthly) */
  netCash?: number;
  /** employee CPF contribution (monthly) */
  netInvestments?: number;
  /** Savings breakdown */
  netSavings?: number;
  netWorth?: number;
  nonCashAssets?: FinancialChatSystemBackendInternalFinancialV2TimelineNonCashAssetResponse[];
  properties?: FinancialChatSystemBackendInternalFinancialV2PropertyPropertySnapshot[];
  /** Other totals */
  totalAssets?: number;
  totalLiabilities?: number;
  year?: number;
}

export interface FinancialChatSystemBackendInternalFinancialV2TimelineNonCashAssetResponse {
  balance?: number;
  category?: string;
  eventAdjBalance?: number;
  eventImpacts?: FinancialChatSystemBackendInternalFinancialV2TimelineAppliedImpact[];
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

export interface FinancialChatSystemBackendInternalFinancialV2TimelinePaymentSourceResponse {
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

export interface FinancialChatSystemBackendInternalFinancialV2TimelineTimelineAnnualChartResponse {
  months?: FinancialChatSystemBackendInternalFinancialV2TimelineTimelineMonthlySummary[];
  resolution?: string;
  scenarioIds?: string[];
  years?: FinancialChatSystemBackendInternalFinancialV2TimelineTimelineYearlySummary[];
}

export interface FinancialChatSystemBackendInternalFinancialV2TimelineTimelineMonthlySummary {
  allMonthsIndex?: number;
  month?: number;
  netWorth?: number;
  totalAssets?: number;
  totalLiabilities?: number;
}

export interface FinancialChatSystemBackendInternalFinancialV2TimelineTimelineV2Response {
  months?: FinancialChatSystemBackendInternalFinancialV2TimelineMonthDetailResponse[];
}

export interface FinancialChatSystemBackendInternalFinancialV2TimelineTimelineYearlySummary {
  allYearsIndex?: number;
  netWorth?: number;
  totalAssets?: number;
  totalLiabilities?: number;
  year?: number;
}

export interface FinancialChatSystemBackendInternalLlmChatMessage {
  /** Message content */
  content?: string;
  /** Optional name for tool messages */
  name?: string;
  /** "user", "assistant", "system", "tool" */
  role?: string;
  /** ID of tool call this message responds to */
  tool_call_id?: string;
  /** Tool calls in this message */
  tool_calls?: FinancialChatSystemBackendInternalLlmToolCall[];
}

export interface FinancialChatSystemBackendInternalLlmFunctionCall {
  /** JSON string of function arguments */
  arguments?: string;
  /** Function name (e.g., "create_asset") */
  name?: string;
}

export interface FinancialChatSystemBackendInternalLlmToolCall {
  /** Function details */
  function?: FinancialChatSystemBackendInternalLlmFunctionCall;
  /** Unique identifier for this tool call */
  id?: string;
  /** Always "function" for function calls */
  type?: string;
}

export interface FinancialChatSystemBackendInternalSessionConversationStep {
  content?: string;
  result?: Record<string, any>;
  step_id?: string;
  timestamp?: string;
  tool_calls?: string[];
  tool_name?: string;
  /** "user_message", "llm_response", "tool_execution" */
  type?: string;
}

export interface FinancialChatSystemBackendInternalSessionPendingToolCall {
  call_id?: string;
  created_at?: string;
  dependencies?: string[];
  friendly_description?: string;
  parameters?: Record<string, any>;
  preview?: string;
  tool_name?: string;
}

export interface FinancialChatSystemBackendInternalSessionSessionState {
  chat_id?: string;
  conversation_flow?: FinancialChatSystemBackendInternalSessionConversationStep[];
  created_at?: string;
  last_asset_id?: string;
  last_liability_id?: string;
  last_property_plan_id?: string;
  messages?: FinancialChatSystemBackendInternalLlmChatMessage[];
  metadata?: Record<string, string>;
  pending_actions?: FinancialChatSystemBackendInternalSessionPendingToolCall[];
  session_id?: string;
  updated_at?: string;
  user_id?: string;
}
