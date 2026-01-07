/**
 * Property Planner V2 Types
 *
 * Types for the new property planner persistence API.
 * Backend computes all calculations; frontend only stores inputs.
 */

// =============================================================================
// ENUMS
// =============================================================================

export type PropertyType = 'hdb' | 'private'
export type PropertySubtype = 'bto' | 'resale' | 'ec' | 'new'
export type LoanType = 'bank' | 'hdb'
export type BorrowerType = 'single' | 'joint'
export type Residency = 'singapore_citizen' | 'permanent_resident' | 'foreigner'
export type FeeContext = 'purchase' | 'sale' | 'recurring'
export type FeeFrequency = 'one_time' | 'monthly' | 'yearly'
export type GrowthStrategy = 'fixed' | 'annual_step' | 'compound_monthly' | 'tiered_adb'
export type CashAmountType = 'fixed' | 'pct_target' | 'pct_source' | 'remainder'
export type CpfOaAmountType = 'fixed' | 'max_available'
export type DownpaymentCashAmountType = 'fixed' | 'pct_target' | 'pct_source' | 'remainder'

// =============================================================================
// API RESPONSE TYPES
// =============================================================================

/**
 * Singapore-specific property details
 */
export interface PropertySG {
  id: string
  name: string
  propertyType: PropertyType
  propertySubtype: PropertySubtype
  purchaseIcon?: string | null
  purchaseIconColor?: string | null
  saleIcon?: string | null
  saleIconColor?: string | null
  isIncluded: boolean
  propertyPrice: string
  valuationPrice: string | null
  loanType: LoanType
  downpaymentCpfOa: string
  downpaymentCash: string
  borrowerType: BorrowerType
  borrower1IncomeId?: string | null
  borrower1CpfAccountId?: string | null
  borrower2IncomeId?: string | null
  borrower2CpfAccountId?: string | null
  // Per-borrower CPF OA tracking
  borrower1DownpaymentCpfOaAmountType?: CpfOaAmountType | null
  borrower1DownpaymentCpfOa?: string | null
  borrower2DownpaymentCpfOaAmountType?: CpfOaAmountType | null
  borrower2DownpaymentCpfOa?: string | null
  borrower1MonthlyCpfOa?: string | null
  borrower2MonthlyCpfOa?: string | null
  // Per-borrower cash account configuration (downpayment)
  borrower1DownpaymentCashAccountId?: string | null
  borrower1DownpaymentCashAmountType?: DownpaymentCashAmountType | null
  borrower1DownpaymentCashAmount?: string | null
  borrower2DownpaymentCashAccountId?: string | null
  borrower2DownpaymentCashAmountType?: DownpaymentCashAmountType | null
  borrower2DownpaymentCashAmount?: string | null
  // Per-borrower cash account configuration (monthly payment)
  borrower1MonthlyCashAccountId?: string | null
  borrower1MonthlyCashAmountType?: CashAmountType | null
  borrower1MonthlyCashAmount?: string | null
  borrower2MonthlyCashAccountId?: string | null
  borrower2MonthlyCashAmountType?: CashAmountType | null
  borrower2MonthlyCashAmount?: string | null
  // Legacy fields (kept for backward compatibility)
  monthlyCashAccountId?: string | null
  monthlyCashAmountType?: CashAmountType | null
  monthlyCashAmount?: string | null
  downpaymentCashAccountId?: string | null
  // Lease tenure (null = freehold, 1-999 = years remaining)
  leaseRemainingYears?: number | null
  otherDebt: string
  residency: Residency  // Derived from borrower1IncomeId -> finance_incomes.residency_status
  propertyCount: number
  btoLaunchDate?: string | null
  btoKeyCollectionDate?: string | null
  saleExpectedDate?: string | null
  saleExpectedPrice?: string | null
  // Sale proceeds destination accounts
  borrower1CpfRefundAccountId?: string | null
  borrower2CpfRefundAccountId?: string | null
  netCashProceedsAccountId?: string | null
  createdAt: string
  updatedAt: string
}

/**
 * Header scenario record
 */
export interface PropertyScenarioHeader {
  id: string
  userId: string
  propertySgId?: string | null  // Note: lowercase 'g' to match backend JSON tag
  myDetailsId?: string | null
  createdAt: string
  updatedAt: string
}

/**
 * Fee item
 */
export interface PropertyFee {
  id: string
  scenarioId: string
  feeContext: FeeContext
  feeType: string
  description?: string | null
  amount: string
  currency: string
  isPercentage: boolean
  frequency: FeeFrequency
  startDate?: string | null
  endDate?: string | null
  icon: string
  iconColor: string
  createdAt: string
}

/**
 * Growth period for property appreciation
 */
export interface GrowthPeriod {
  id: string
  propertySgId?: string | null
  assetId?: string | null
  startYear: number   // Year (extracted from backend StartDate)
  endYear?: number | null  // Year (extracted from backend EndDate)
  growthRate: string
  growthStrategy: GrowthStrategy
  createdAt: string
}

/**
 * Loan rate period (for refinancing scenarios)
 * Each rate tranche is a separate row with its own rate and rate type
 */
export interface LiabilityRatePeriod {
  id: string
  propertySgId?: string | null
  liabilityId?: string | null
  periodOrder: number
  startDate: string  // ISO date string (from backend time.Time)
  termYears: number
  rate: string       // The interest rate for this period
  rateType: 'fixed' | 'floating'  // Type of rate
  createdAt: string
}

/**
 * Singapore-specific grant (1:M with property_sg_details)
 */
export interface PropertySGGrant {
  id: string
  propertySgId: string  // Note: lowercase 'g' to match backend JSON tag
  name: string
  amount: string
  createdAt: string
}

// =============================================================================
// COMPUTED VALUES (FROM BACKEND)
// =============================================================================

export interface DownpaymentBreakdown {
  cpfOa: string
  cpfSa: string
  cash: string
  grants: string
  minCashRequired: string
  maxCpfAllowed: string
}

export interface CalculatedFee {
  feeType: string
  description: string
  amount: string
  isCalculated: boolean
}

export interface AmortizationYear {
  year: number
  startingBalance: string
  totalPrincipal: string
  totalInterest: string
  endingBalance: string
}

export interface PaymentPeriod {
  periodOrder: number
  periodStart: string
  periodEnd: string
  monthlyPayment: string
  rate: string
  rateType: 'fixed' | 'floating'
}

export interface MortgageComputed {
  loanAmount: string
  monthlyPayment: string
  totalInterest: string
  totalAmountPaid: string
  loanStartDate: string
  loanEndDate: string
  msrRatio: string
  tdsrRatio: string
  msrPasses: boolean
  tdsrPasses: boolean
  bsdAmount: string
  absdAmount: string
  downpayment: string
  downpaymentBreakdown: DownpaymentBreakdown
  totalUpfrontCash: string
  cov: string
  calculatedPurchaseFees: CalculatedFee[]
  totalPurchaseFees: string
  amortization: AmortizationYear[]
  paymentPeriods: PaymentPeriod[]
}

export interface SaleComputed {
  holdingPeriodMonths: number
  outstandingLoanAtSale: string
  cpfRefund: string
  cpfAccruedInterest: string
  ssdRate: string
  ssdAmount: string
  grossProceeds: string
  agentFee: string
  legalFee: string
  totalSaleCosts: string
  netCashProceeds: string
}

export interface AppreciationYear {
  year: number
  projectedValue: string
  growthRate: string
  cumulativeGrowth: string
}

export interface RecurringCosts {
  monthlyPropertyTax: string
  monthlyMaintenance: string
  monthlyInsurance: string
  totalMonthlyRecurring: string
}

/**
 * Actual computed values structure from the backend API
 * Note: This is a flat structure, not nested under 'mortgage'
 */
export interface ComputedValues {
  loanAmount: string
  monthlyPayment: string
  totalInterest: string
  totalAmountPaid: string
  bsdAmount: string
  absdAmount: string
  totalStampDuty: string
  totalUpfrontCash: string
  // Projected CPF OA balances at purchase date (accounting for contributions + interest)
  projectedBorrower1OA?: string
  projectedBorrower2OA?: string
}

/**
 * Full computed values structure (for future expansion)
 * Currently the backend returns a simpler flat structure
 */
export interface ComputedValuesFull {
  mortgage: MortgageComputed
  sale: SaleComputed | null
  appreciation: AppreciationYear[]
  recurringCosts: RecurringCosts
}

// =============================================================================
// FULL SCENARIO RESPONSE
// =============================================================================

/**
 * Full scenario response from API (includes computed values)
 */
export interface PropertyScenarioFull {
  scenario: PropertyScenarioHeader
  propertySG: PropertySG | null
  propertyMY: unknown | null  // Future: Malaysia details
  fees: PropertyFee[]
  growthPeriods: GrowthPeriod[]
  ratePeriods: LiabilityRatePeriod[]
  grants: PropertySGGrant[]
  computed: ComputedValues
}

/**
 * List scenarios response
 */
export interface ListScenariosResponse {
  scenarios: PropertyScenarioFull[]
  count: number
}

// =============================================================================
// CREATE/UPDATE INPUT TYPES
// =============================================================================

export interface CreatePropertySGInput {
  name: string
  propertyType: PropertyType
  propertySubtype: PropertySubtype
  purchaseIcon?: string
  purchaseIconColor?: string
  saleIcon?: string
  saleIconColor?: string
  isIncluded?: boolean
  propertyPrice: string
  valuationPrice?: string
  loanType: LoanType
  downpaymentCpfOa?: string
  downpaymentCash?: string
  borrowerType: BorrowerType
  borrower1IncomeId?: string
  borrower1CpfAccountId?: string
  borrower2IncomeId?: string
  borrower2CpfAccountId?: string
  // Per-borrower CPF OA tracking
  borrower1DownpaymentCpfOaAmountType?: CpfOaAmountType
  borrower1DownpaymentCpfOa?: string
  borrower2DownpaymentCpfOaAmountType?: CpfOaAmountType
  borrower2DownpaymentCpfOa?: string
  borrower1MonthlyCpfOa?: string
  borrower2MonthlyCpfOa?: string
  // Per-borrower cash account configuration (downpayment)
  borrower1DownpaymentCashAccountId?: string | null
  borrower1DownpaymentCashAmountType?: DownpaymentCashAmountType
  borrower1DownpaymentCashAmount?: string
  borrower2DownpaymentCashAccountId?: string | null
  borrower2DownpaymentCashAmountType?: DownpaymentCashAmountType
  borrower2DownpaymentCashAmount?: string
  // Per-borrower cash account configuration (monthly payment)
  borrower1MonthlyCashAccountId?: string | null
  borrower1MonthlyCashAmountType?: CashAmountType
  borrower1MonthlyCashAmount?: string
  borrower2MonthlyCashAccountId?: string | null
  borrower2MonthlyCashAmountType?: CashAmountType
  borrower2MonthlyCashAmount?: string
  // Legacy fields (kept for backward compatibility)
  monthlyCashAccountId?: string | null
  monthlyCashAmountType?: CashAmountType
  monthlyCashAmount?: string
  downpaymentCashAccountId?: string | null
  // Lease tenure (null = freehold, 1-999 = years remaining)
  leaseRemainingYears?: number | null
  otherDebt?: string
  // Note: residency is NOT in request - it's DERIVED from borrower1IncomeId
  propertyCount?: number
  btoLaunchDate?: string
  btoKeyCollectionDate?: string
  saleExpectedDate?: string
  saleExpectedPrice?: string
  // Sale proceeds destination accounts
  borrower1CpfRefundAccountId?: string | null
  borrower2CpfRefundAccountId?: string | null
  netCashProceedsAccountId?: string | null
}

export interface CreateFeeInput {
  feeContext: FeeContext
  feeType: string
  description?: string
  amount: string
  currency?: string
  isPercentage?: boolean
  frequency?: FeeFrequency
  startDate?: string
  endDate?: string
  icon?: string
  iconColor?: string
}

export interface CreateGrowthPeriodInput {
  startYear: number
  endYear?: number
  growthRate: string
  growthStrategy?: GrowthStrategy
}

export interface CreateRatePeriodInput {
  startMonth: string
  termYears: number
  rate: string
  rateType: 'fixed' | 'floating'
}

export interface CreateGrantInput {
  name: string
  amount: string
}

export interface CreateScenarioInput {
  country: 'SG' | 'MY'
  propertySG?: CreatePropertySGInput
  fees?: CreateFeeInput[]
  growthPeriods?: CreateGrowthPeriodInput[]
  ratePeriods: CreateRatePeriodInput[]
  grants?: CreateGrantInput[]
}

export interface UpdateScenarioInput extends Partial<CreateScenarioInput> {}

// =============================================================================
// ERROR RESPONSE
// =============================================================================

export interface ErrorResponse {
  error: string
  message: string
  statusCode: number
}
