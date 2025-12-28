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

// =============================================================================
// API RESPONSE TYPES
// =============================================================================

/**
 * Singapore-specific property details
 */
export interface PropertySGDetails {
  id: string
  name: string
  propertyType: PropertyType
  propertySubtype: PropertySubtype
  icon?: string | null
  iconColor?: string | null
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
  otherDebt: string
  residency: Residency  // Derived from borrower1IncomeId -> finance_incomes.residency_status
  propertyCount: number
  grants: string
  btoLaunchDate?: string | null
  btoKeyCollectionDate?: string | null
  saleExpectedDate?: string | null
  saleExpectedPrice?: string | null
  createdAt: string
  updatedAt: string
}

/**
 * Header scenario record
 */
export interface PropertyScenarioHeader {
  id: string
  userId: string
  sgDetailsId?: string | null
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
  createdAt: string
}

/**
 * Growth period for property appreciation
 */
export interface GrowthPeriod {
  id: string
  propertyScenarioId?: string | null
  assetId?: string | null
  startYear: number
  endYear?: number | null
  growthRate: string
  growthStrategy: GrowthStrategy
  createdAt: string
}

/**
 * Loan rate period (for refinancing scenarios)
 */
export interface LiabilityRatePeriod {
  id: string
  propertyScenarioId?: string | null
  liabilityId?: string | null
  periodOrder: number
  startMonth: string
  termYears: number
  fixedYears: number
  fixedRate: string
  floatingRate: string
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

export interface ComputedValues {
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
  sgDetails: PropertySGDetails | null
  myDetails: unknown | null  // Future: Malaysia details
  fees: PropertyFee[]
  growthPeriods: GrowthPeriod[]
  ratePeriods: LiabilityRatePeriod[]
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

export interface CreateSGDetailsInput {
  name: string
  propertyType: PropertyType
  propertySubtype: PropertySubtype
  icon?: string
  iconColor?: string
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
  otherDebt?: string
  // Note: residency is NOT in request - it's DERIVED from borrower1IncomeId
  propertyCount?: number
  grants?: string
  btoLaunchDate?: string
  btoKeyCollectionDate?: string
  saleExpectedDate?: string
  saleExpectedPrice?: string
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
  fixedYears?: number
  fixedRate: string
  floatingRate: string
}

export interface CreateScenarioInput {
  country: 'SG' | 'MY'
  sgDetails?: CreateSGDetailsInput
  fees?: CreateFeeInput[]
  growthPeriods?: CreateGrowthPeriodInput[]
  ratePeriods: CreateRatePeriodInput[]
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
