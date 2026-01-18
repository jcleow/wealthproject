/**
 * Property Planner Types
 *
 * Centralized type definitions for the property planner feature.
 */

// ============================================
// PROPERTY TYPES
// ============================================

export type PropertyType = 'hdb-resale' | 'hdb-bto' | 'ec' | 'private-resale' | 'private-new'
export type BorrowerType = 'single' | 'joint'
export type LoanType = 'bank' | 'hdb'
export type ChartView = 'balance' | 'composition' | 'schedule'
export type FormStep = 'property' | 'borrowers' | 'terms'
export type SaleFormStep = 'timing' | 'fees' | 'proceeds'
export type AccordionColor = 'rose' | 'violet' | 'emerald' | 'amber'

// ============================================
// FEE & EXPENSE TYPES
// ============================================

export interface FeeItem {
  id: string
  name: string
  type: 'percentage' | 'fixed'
  value: number  // percentage (e.g., 2 for 2%) or fixed amount
  enabled: boolean
  dueOffset?: number  // Months relative to purchase (0 = at purchase, -1 = 1 month before, 1 = 1 month after)
  icon?: string       // lucide icon name (kebab-case)
  iconColor?: string  // hex color
}

// ============================================
// APPRECIATION & LOAN TYPES
// ============================================

export interface AppreciationPeriod {
  id: string
  startYear: number    // Year 1, 2, 3, etc.
  endYear: number | null  // null = until end ("onwards")
  rate: number         // Annual % (e.g., 3 for 3%)
}

export interface LoanSegment {
  id: string
  startMonth: string   // YYYY-MM when this segment starts
  termYears: number    // Duration of this segment
  rate: number         // Interest rate for this segment
  rateType: 'fixed' | 'floating'  // Type of rate
}

// ============================================
// BTO STAGGERED DOWNPAYMENT SCHEME (SDS)
// ============================================

// The SDS allows BTO buyers to pay downpayment in 2 instalments:
// 1. First instalment at Agreement for Lease signing
// 2. Second instalment at key collection
export interface StaggeredDownpayment {
  enabled: boolean                    // Whether SDS is enabled
  firstInstalmentPercent: number      // e.g., 5% (standard) or 2.5% (young couples)
  secondInstalmentPercent: number     // e.g., 20% - remainder of downpayment
  firstInstalmentMonth: string        // YYYY-MM - typically ~9 months after booking
  secondInstalmentMonth: string       // YYYY-MM - at key collection
}

// ============================================
// MORTGAGE INPUTS
// ============================================

/**
 * Grant item for form state
 */
export interface GrantItem {
  id?: string  // Optional - only present for persisted grants
  name: string
  amount: number
}

export interface MortgageInputs {
  propertyPrice: number
  valuationPrice: number // Bank/HDB valuation (for resale properties)
  loanAmount: number
  loanType: LoanType // Bank loan vs HDB loan - affects downpayment CPF/cash split
  // Downpayment breakdown (legacy - kept for backward compatibility)
  downpaymentCpfOa: number // Total CPF OA for downpayment (computed from per-borrower)
  downpaymentCash: number // Amount to pay in cash (excluding COV)
  loanTermYears: number
  loanStartMonth: string
  fixedYears: number
  fixedRate: number
  floatingRate: number
  householdIncome: number
  otherDebt: number // Computed from selected liabilities
  borrowerType: BorrowerType
  cpfOaBalance: number
  monthlyCpfOa: number
  grants: GrantItem[]
  // Borrower selection fields
  borrower1IncomeId: string
  borrower1CpfAccountId: string | null // CPF account linked to borrower 1 (for person name lookup)
  borrower1OaBalance: number
  borrower1LiabilityIds: string[] // IDs of liabilities assigned to borrower 1
  borrower2IncomeId: string | null
  borrower2CpfAccountId: string | null // CPF account linked to borrower 2 (for person name lookup)
  borrower2OaBalance: number
  borrower2LiabilityIds: string[] // IDs of liabilities assigned to borrower 2
  // Per-borrower CPF OA tracking
  borrower1DownpaymentCpfOaAmountType: 'fixed' | 'max_available' // How CPF OA amount is determined
  borrower1DownpaymentCpfOa: number // Borrower 1's CPF OA for downpayment
  borrower2DownpaymentCpfOaAmountType: 'fixed' | 'max_available' // How CPF OA amount is determined
  borrower2DownpaymentCpfOa: number // Borrower 2's CPF OA for downpayment
  borrower1MonthlyCpfOa: number // Borrower 1's monthly CPF OA payment
  borrower2MonthlyCpfOa: number // Borrower 2's monthly CPF OA payment
  // Per-borrower cash account configuration (downpayment)
  borrower1DownpaymentCashAccountId: string | null // Borrower 1's cash account for downpayment
  borrower1DownpaymentCashAmountType: 'fixed' | 'pct_target' | 'pct_source' | 'remainder' // How cash amount is determined
  borrower1DownpaymentCashAmount: number // Borrower 1's cash contribution to downpayment
  borrower2DownpaymentCashAccountId: string | null // Borrower 2's cash account for downpayment
  borrower2DownpaymentCashAmountType: 'fixed' | 'pct_target' | 'pct_source' | 'remainder' // How cash amount is determined
  borrower2DownpaymentCashAmount: number // Borrower 2's cash contribution to downpayment
  // Per-borrower cash account configuration (monthly payment)
  borrower1MonthlyCashAccountId: string | null // Borrower 1's cash account for monthly payment
  borrower1MonthlyCashAmountType: 'fixed' | 'pct_target' | 'pct_source' | 'remainder' // How amount is determined
  borrower1MonthlyCashAmount: number // Fixed $ or percentage depending on type
  borrower2MonthlyCashAccountId: string | null // Borrower 2's cash account for monthly payment
  borrower2MonthlyCashAmountType: 'fixed' | 'pct_target' | 'pct_source' | 'remainder' // How amount is determined
  borrower2MonthlyCashAmount: number // Fixed $ or percentage depending on type
  // Legacy fields (kept for backward compatibility - computed from per-borrower values)
  monthlyCashAccountId: string | null // @deprecated - use per-borrower fields
  monthlyCashAmountType: 'fixed' | 'pct_target' | 'pct_source' | 'remainder' // @deprecated
  monthlyCashAmount: number // @deprecated
  downpaymentCashAccountId: string | null // @deprecated - use per-borrower fields
  // Lease tenure: null = freehold, 1-999 = remaining years
  leaseRemainingYears: number | null
  // Purchase fees/expenses
  purchaseFees: FeeItem[]
  // ABSD (Additional Buyer's Stamp Duty) - user-entered percentage
  absdRate: number // e.g., 0 for SC 1st property, 20 for SC 2nd, 60 for foreigner
  // Property appreciation (period-based rates)
  appreciationPeriods: AppreciationPeriod[]
  // Loan chain for refinancing scenarios
  loanSegments: LoanSegment[]
  // BTO-specific: Staggered Downpayment Scheme (SDS)
  staggeredDownpayment: StaggeredDownpayment | null
}

// ============================================
// AMORTIZATION & CALCULATION TYPES
// ============================================

export interface AmortizationYear {
  year: number
  principal: number
  interest: number
  balance: number
  totalPaid: number
}

export interface DownpaymentBreakdown {
  cpfOa: number
  cash: number
  minCashRequired: number
  maxCpfAllowed: number
}

export interface CalculatedFee {
  item: FeeItem
  amount: number
}

export interface MortgageCalculationResult {
  monthlyPayment: number
  totalInterest: number
  msrRatio: number
  tdsrRatio: number
  loanStartDate: string
  loanEndDate: string
  loanTermYears: number
  amortization: AmortizationYear[]
  downpayment: number
  downpaymentBreakdown: DownpaymentBreakdown
  cpfRunsOutMonth: number | null
  // Purchase costs
  bsdAmount: number
  absdAmount: number
  calculatedPurchaseFees: CalculatedFee[]
  totalPurchaseFees: number
  cov: number
  totalUpfrontCash: number
}

// ============================================
// SALE TYPES
// ============================================

export interface SaleInputs {
  expectedSaleDate: string  // YYYY-MM format
  expectedSalePrice: number
  fees: FeeItem[]  // Flexible fees list
  // Sale proceeds destination fields
  borrower1CpfRefundAccountId: string | null  // Target CPF account for borrower 1's refund
  borrower2CpfRefundAccountId: string | null  // Target CPF account for borrower 2's refund (joint only)
  netCashProceedsAccountId: string | null     // Target cash account for net proceeds
}

export interface CpfRefund {
  principalUsed: number      // downpaymentCpfOa + cumulative monthly CPF payments
  accruedInterest: number    // 2.5% compound interest
  total: number
}

export interface PerBorrowerCpfRefund {
  borrower1: CpfRefund
  borrower2: CpfRefund | null  // null for single borrower
}

export interface SsdInfo {
  applicable: boolean
  rate: number               // 0-16%
  amount: number
}

export interface SaleResult {
  holdingPeriodMonths: number
  holdingPeriodYears: number
  outstandingLoanAtSale: number
  cpfRefund: CpfRefund
  perBorrowerCpfRefund: PerBorrowerCpfRefund  // Per-borrower CPF refund breakdown
  ssd: SsdInfo
  calculatedFees: CalculatedFee[]
  totalFees: number
  grossProceeds: number        // Sale price - outstanding loan
  netCashProceeds: number      // After all deductions
  cpfRefundedToOa: number      // Amount going back to CPF
}

// ============================================
// SCENARIO TYPES
// ============================================

export interface PropertyScenario {
  id: string
  propertySgId?: string       // The property_sg.id - used for fund flow rules queries
  name: string
  propertyType: PropertyType
  inputs: MortgageInputs
  saleInputs: SaleInputs
  isIncluded: boolean  // Whether to include in financial planning
  createdAt: number
  purchaseIcon?: string       // lucide icon name for purchase milestone
  purchaseIconColor?: string  // hex color for purchase milestone
  saleIcon?: string           // lucide icon name for sale milestone
  saleIconColor?: string      // hex color for sale milestone
}

// ============================================
// UI TYPES
// ============================================

export interface PropertyOption {
  id: PropertyType
  title: string
  subtitle: string
  description: string
  icon: React.ReactNode
  color: string
  accentColor: string
  priceRange: string
  highlights: string[]
}

export interface WaterfallItem {
  name: string
  amount: number
  color: string
  isTotal?: boolean
}

export interface MockIncome {
  id: string
  name: string
  monthlyAmount: number
}

// ============================================
// FORM STEP TYPES
// ============================================

export interface FormStepConfig {
  id: FormStep
  label: string
  icon: string
}

export interface SaleFormStepConfig {
  id: SaleFormStep
  label: string
}
