import type {
  PropertyType,
  MortgageInputs,
  FeeItem,
  AppreciationPeriod,
  LoanSegment,
  FormStepConfig,
  SaleFormStepConfig,
} from '../types'

// ============================================
// DEFAULT FEE CONFIGURATIONS
// ============================================

/**
 * Default sale fees (seller's expenses)
 */
export const DEFAULT_SALE_FEES: FeeItem[] = [
  { id: 'agent-commission', name: 'Agent Commission', type: 'percentage', value: 2, enabled: true, icon: 'user', iconColor: '#3b82f6' },
  { id: 'legal-fees', name: 'Legal/Conveyancing', type: 'fixed', value: 3000, enabled: true, icon: 'file-text', iconColor: '#6366f1' },
  { id: 'discharge-fee', name: 'Mortgage Discharge', type: 'fixed', value: 500, enabled: true, icon: 'file-check', iconColor: '#22c55e' },
]

/**
 * Default purchase fees (buyer's expenses)
 * dueOffset: months relative to purchase date (0 = at completion, negative = before)
 */
export const DEFAULT_PURCHASE_FEES: FeeItem[] = [
  { id: 'legal-fees', name: 'Legal/Conveyancing', type: 'fixed', value: 3000, enabled: true, dueOffset: 0, icon: 'file-text', iconColor: '#6366f1' },
  { id: 'valuation-fee', name: 'Valuation Fee', type: 'fixed', value: 500, enabled: true, dueOffset: -2, icon: 'search', iconColor: '#f97316' },
  { id: 'agent-fee', name: 'Agent Fee (if any)', type: 'percentage', value: 1, enabled: false, dueOffset: 0, icon: 'user', iconColor: '#3b82f6' },
  { id: 'renovation', name: 'Renovation/Repairs', type: 'fixed', value: 30000, enabled: false, dueOffset: 1, icon: 'hammer', iconColor: '#eab308' },
  { id: 'moving-costs', name: 'Moving Costs', type: 'fixed', value: 2000, enabled: false, dueOffset: 1, icon: 'truck', iconColor: '#14b8a6' },
]

/**
 * Default appreciation periods
 */
export const DEFAULT_APPRECIATION_PERIODS: AppreciationPeriod[] = [
  { id: 'default-1', startYear: 1, endYear: null, rate: 3 },
]

// ============================================
// FORM STEP CONFIGURATIONS
// ============================================

export const FORM_STEPS: FormStepConfig[] = [
  { id: 'property', label: 'Property', icon: '🏠' },
  { id: 'borrowers', label: 'Borrowers', icon: '👥' },
  { id: 'financing', label: 'Financing', icon: '💰' },
  { id: 'terms', label: 'Others', icon: '📋' },
]

export const SALE_FORM_STEPS: SaleFormStepConfig[] = [
  { id: 'timing', label: 'Sale Details' },
  { id: 'fees', label: 'Fees & Notices' },
]

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Create default loan segment (initial loan)
 */
export function createDefaultLoanSegment(
  startMonth: string,
  termYears: number,
  fixedYears: number,
  fixedRate: number,
  floatingRate: number
): LoanSegment {
  return {
    id: 'initial',
    startMonth,
    termYears,
    fixedYears,
    fixedRate,
    floatingRate,
  }
}

// ============================================
// DEFAULT INPUTS BY PROPERTY TYPE
// ============================================

export const defaultInputsByType: Record<PropertyType, MortgageInputs> = {
  'hdb-resale': {
    propertyPrice: 600000,
    valuationPrice: 580000,
    loanAmount: 464000,
    loanType: 'hdb',
    downpaymentCpfOa: 85000,
    downpaymentCash: 31000,
    loanTermYears: 25,
    loanStartMonth: '2025-06',
    fixedYears: 0,
    fixedRate: 2.6,
    floatingRate: 2.6,
    householdIncome: 8500,
    otherDebt: 0,
    borrowerType: 'single',
    cpfOaBalance: 85000,
    monthlyCpfOa: 1785,
    grants: 50000,
    borrower1IncomeId: 'income-1',
    borrower1OaBalance: 85000,
    borrower1LiabilityIds: [],
    borrower2IncomeId: null,
    borrower2OaBalance: 0,
    borrower2LiabilityIds: [],
    purchaseFees: DEFAULT_PURCHASE_FEES.map(f => ({ ...f })),
    absdRate: 0,
    appreciationPeriods: DEFAULT_APPRECIATION_PERIODS.map(p => ({ ...p })),
    loanSegments: [createDefaultLoanSegment('2025-06', 25, 0, 2.6, 2.6)],
  },
  'hdb-bto': {
    propertyPrice: 450000,
    valuationPrice: 450000,
    loanAmount: 360000,
    loanType: 'hdb',
    downpaymentCpfOa: 85000,
    downpaymentCash: 5000,
    loanTermYears: 25,
    loanStartMonth: '2029-06',
    fixedYears: 0,
    fixedRate: 2.6,
    floatingRate: 2.6,
    householdIncome: 8500,
    otherDebt: 0,
    borrowerType: 'single',
    cpfOaBalance: 85000,
    monthlyCpfOa: 1785,
    grants: 80000,
    borrower1IncomeId: 'income-1',
    borrower1OaBalance: 85000,
    borrower1LiabilityIds: [],
    borrower2IncomeId: null,
    borrower2OaBalance: 0,
    borrower2LiabilityIds: [],
    purchaseFees: DEFAULT_PURCHASE_FEES.map(f => ({ ...f })),
    absdRate: 0,
    appreciationPeriods: DEFAULT_APPRECIATION_PERIODS.map(p => ({ ...p })),
    loanSegments: [createDefaultLoanSegment('2029-06', 25, 0, 2.6, 2.6)],
  },
  'ec': {
    propertyPrice: 1200000,
    valuationPrice: 1200000,
    loanAmount: 900000,
    loanType: 'bank',
    downpaymentCpfOa: 147400,
    downpaymentCash: 152600,
    loanTermYears: 30,
    loanStartMonth: '2028-06',
    fixedYears: 3,
    fixedRate: 3.0,
    floatingRate: 4.0,
    householdIncome: 14700,
    otherDebt: 1400,
    borrowerType: 'joint',
    cpfOaBalance: 147400,
    monthlyCpfOa: 3087,
    grants: 30000,
    borrower1IncomeId: 'income-1',
    borrower1OaBalance: 85000,
    borrower1LiabilityIds: ['liability-2', 'liability-3'],
    borrower2IncomeId: 'income-2',
    borrower2OaBalance: 62400,
    borrower2LiabilityIds: ['liability-4'],
    purchaseFees: DEFAULT_PURCHASE_FEES.map(f => ({ ...f })),
    absdRate: 0,
    appreciationPeriods: DEFAULT_APPRECIATION_PERIODS.map(p => ({ ...p })),
    loanSegments: [createDefaultLoanSegment('2028-06', 30, 3, 3.0, 4.0)],
  },
  'private-resale': {
    propertyPrice: 1800000,
    valuationPrice: 1750000,
    loanAmount: 1312500,
    loanType: 'bank',
    downpaymentCpfOa: 147400,
    downpaymentCash: 290100,
    loanTermYears: 30,
    loanStartMonth: '2025-06',
    fixedYears: 3,
    fixedRate: 3.2,
    floatingRate: 4.0,
    householdIncome: 14700,
    otherDebt: 1400,
    borrowerType: 'joint',
    cpfOaBalance: 147400,
    monthlyCpfOa: 3087,
    grants: 0,
    borrower1IncomeId: 'income-1',
    borrower1OaBalance: 85000,
    borrower1LiabilityIds: ['liability-2', 'liability-3'],
    borrower2IncomeId: 'income-2',
    borrower2OaBalance: 62400,
    borrower2LiabilityIds: ['liability-4'],
    purchaseFees: DEFAULT_PURCHASE_FEES.map(f => ({ ...f })),
    absdRate: 0,
    appreciationPeriods: DEFAULT_APPRECIATION_PERIODS.map(p => ({ ...p })),
    loanSegments: [createDefaultLoanSegment('2025-06', 30, 3, 3.2, 4.0)],
  },
  'private-new': {
    propertyPrice: 2000000,
    valuationPrice: 2000000,
    loanAmount: 1500000,
    loanType: 'bank',
    downpaymentCpfOa: 147400,
    downpaymentCash: 352600,
    loanTermYears: 30,
    loanStartMonth: '2028-06',
    fixedYears: 3,
    fixedRate: 3.2,
    floatingRate: 4.0,
    householdIncome: 14700,
    otherDebt: 1400,
    borrowerType: 'joint',
    cpfOaBalance: 147400,
    monthlyCpfOa: 3087,
    grants: 0,
    borrower1IncomeId: 'income-1',
    borrower1OaBalance: 85000,
    borrower1LiabilityIds: ['liability-2', 'liability-3'],
    borrower2IncomeId: 'income-2',
    borrower2OaBalance: 62400,
    borrower2LiabilityIds: ['liability-4'],
    purchaseFees: DEFAULT_PURCHASE_FEES.map(f => ({ ...f })),
    absdRate: 0,
    appreciationPeriods: DEFAULT_APPRECIATION_PERIODS.map(p => ({ ...p })),
    loanSegments: [createDefaultLoanSegment('2028-06', 30, 3, 3.2, 4.0)],
  },
}

// ============================================
// MOCK DATA (for visual mockup)
// ============================================

export const mockIncomes = [
  { id: 'income-1', name: "John's Salary", monthlyAmount: 8500 },
  { id: 'income-2', name: "Sarah's Salary", monthlyAmount: 6200 },
]
