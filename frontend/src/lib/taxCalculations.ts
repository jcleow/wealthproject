/**
 * Singapore Tax Calculation Utilities
 * Extracted from tax-planner page for reuse across the application
 */

// ============================================
// TYPES
// ============================================

export type TaxResidencyStatus = 'resident' | 'non-resident' | 'not-ordinarily-resident'
export type AssessmentYear = '2024' | '2025' | '2026'
export type TaxIncomeType = 'employment' | 'rental' | 'dividend' | 'interest' | 'business' | 'other'
export type TaxReliefCategory = 'personal' | 'cpf-srs' | 'family' | 'insurance-education'

export interface TaxIncomeSource {
  id: string
  name: string
  type: TaxIncomeType
  grossAmount: number
  cpfDeducted?: number
  bonus?: number
}

export interface TaxRelief {
  id: string
  name: string
  code: string
  maxAmount: number
  claimedAmount: number
  autoCalculated?: boolean
  category: TaxReliefCategory
}

export interface TaxCalculationInput {
  residencyStatus: TaxResidencyStatus
  incomeSources: TaxIncomeSource[]
  reliefs: TaxRelief[]
}

export interface TaxBracketBreakdown {
  bracket: string
  amount: number
  rate: number
  min: number
  max: number
}

export interface TaxCalculationResult {
  grossIncome: number
  totalDeductions: number
  assessableIncome: number
  totalReliefs: number
  chargeableIncome: number
  taxPayable: number
  effectiveRate: number
  marginalRate: number
  taxBreakdown: TaxBracketBreakdown[]
}

// ============================================
// CONSTANTS
// ============================================

export const SG_TAX_BRACKETS_RESIDENT = [
  { min: 0, max: 20000, rate: 0 },
  { min: 20000, max: 30000, rate: 0.02 },
  { min: 30000, max: 40000, rate: 0.035 },
  { min: 40000, max: 80000, rate: 0.07 },
  { min: 80000, max: 120000, rate: 0.115 },
  { min: 120000, max: 160000, rate: 0.15 },
  { min: 160000, max: 200000, rate: 0.18 },
  { min: 200000, max: 240000, rate: 0.19 },
  { min: 240000, max: 280000, rate: 0.195 },
  { min: 280000, max: 320000, rate: 0.20 },
  { min: 320000, max: 500000, rate: 0.22 },
  { min: 500000, max: 1000000, rate: 0.23 },
  { min: 1000000, max: Infinity, rate: 0.24 },
] as const

export const NON_RESIDENT_RATE = 0.24
export const PERSONAL_RELIEF_CAP = 80000

// Tax data versioning - update when tax laws change
export const TAX_DATA_VERSION = {
  version: '2025.1',
  lastUpdated: '2025-01-01',
  validForYA: ['2025', '2026'] as const,
  source: 'IRAS',
  sourceUrl: 'https://www.iras.gov.sg/taxes/individual-income-tax/basics-of-individual-income-tax/tax-residency-and-tax-rates/individual-income-tax-rates',
  notes: 'Based on Singapore resident tax rates effective YA2024 onwards. Relief amounts may be subject to annual updates.',
}

// Relief information with descriptions and IRAS links
export const RELIEF_INFO: Record<string, { description: string; irasUrl: string }> = {
  'earned-income': {
    description: 'Automatic relief for individuals who earned income from employment, trade, business, profession or vocation.',
    irasUrl: 'https://www.iras.gov.sg/taxes/individual-income-tax/basics-of-individual-income-tax/tax-reliefs-rebates-and-deductions/tax-reliefs/earned-income-relief',
  },
  'cpf-employee': {
    description: 'Relief for mandatory CPF contributions deducted from your employment income.',
    irasUrl: 'https://www.iras.gov.sg/taxes/individual-income-tax/basics-of-individual-income-tax/tax-reliefs-rebates-and-deductions/tax-reliefs/cpf-cash-top-up-relief',
  },
  'cpf-cash': {
    description: 'Voluntary cash top-ups to your own or family members\' CPF Special/Retirement/MediSave Account.',
    irasUrl: 'https://www.iras.gov.sg/taxes/individual-income-tax/basics-of-individual-income-tax/tax-reliefs-rebates-and-deductions/tax-reliefs/cpf-cash-top-up-relief',
  },
  'srs': {
    description: 'Contributions to your Supplementary Retirement Scheme (SRS) account for retirement savings.',
    irasUrl: 'https://www.iras.gov.sg/taxes/individual-income-tax/basics-of-individual-income-tax/tax-reliefs-rebates-and-deductions/tax-reliefs/srs-relief',
  },
  'life-insurance': {
    description: 'Premiums paid on life insurance policies for yourself. Only claimable if CPF contributions are below $5,000.',
    irasUrl: 'https://www.iras.gov.sg/taxes/individual-income-tax/basics-of-individual-income-tax/tax-reliefs-rebates-and-deductions/tax-reliefs/life-insurance-relief',
  },
  'course-fees': {
    description: 'Fees for courses, seminars or conferences to maintain or upgrade skills for employment.',
    irasUrl: 'https://www.iras.gov.sg/taxes/individual-income-tax/basics-of-individual-income-tax/tax-reliefs-rebates-and-deductions/tax-reliefs/course-fees-relief',
  },
  'nsman': {
    description: 'Relief for NSmen who completed NS activities during the year. Amount varies by rank and activity.',
    irasUrl: 'https://www.iras.gov.sg/taxes/individual-income-tax/basics-of-individual-income-tax/tax-reliefs-rebates-and-deductions/tax-reliefs/nsman-relief-(self-wife-and-parents)',
  },
  'spouse-relief': {
    description: 'Relief if your spouse had little or no income (below $4,000) and is not claiming other reliefs.',
    irasUrl: 'https://www.iras.gov.sg/taxes/individual-income-tax/basics-of-individual-income-tax/tax-reliefs-rebates-and-deductions/tax-reliefs/spouse-relief-handicapped-spouse-relief',
  },
  'child-relief': {
    description: 'Relief for each unmarried child who was below 16, or studying full-time at any institution.',
    irasUrl: 'https://www.iras.gov.sg/taxes/individual-income-tax/basics-of-individual-income-tax/tax-reliefs-rebates-and-deductions/tax-reliefs/qualifying-child-relief-(qcr)-handicapped-child-relief-(hcr)',
  },
  'parent-relief': {
    description: 'Relief for supporting parents/grandparents aged 55+ who lived with you and had income below $4,000.',
    irasUrl: 'https://www.iras.gov.sg/taxes/individual-income-tax/basics-of-individual-income-tax/tax-reliefs-rebates-and-deductions/tax-reliefs/parent-relief-handicapped-parent-relief',
  },
  'handicapped-parent': {
    description: 'Enhanced relief for supporting handicapped parents/grandparents with physical or mental disability.',
    irasUrl: 'https://www.iras.gov.sg/taxes/individual-income-tax/basics-of-individual-income-tax/tax-reliefs-rebates-and-deductions/tax-reliefs/parent-relief-handicapped-parent-relief',
  },
  'foreign-domestic': {
    description: 'Relief for levy paid on a foreign domestic worker. Claimable by married women, divorcees, or widowers.',
    irasUrl: 'https://www.iras.gov.sg/taxes/individual-income-tax/basics-of-individual-income-tax/tax-reliefs-rebates-and-deductions/tax-reliefs/foreign-domestic-worker-levy-(fdwl)-relief',
  },
}

// Default reliefs catalog (user can customize claimed amounts)
export const DEFAULT_RELIEFS: TaxRelief[] = [
  { id: 'earned-income', name: 'Earned Income Relief', code: 'EIR', maxAmount: 1000, claimedAmount: 1000, autoCalculated: true, category: 'personal' },
  { id: 'cpf-employee', name: 'CPF (Employee)', code: 'CPF-E', maxAmount: 37740, claimedAmount: 0, autoCalculated: true, category: 'cpf-srs' },
  { id: 'cpf-cash', name: 'CPF Cash Top-Up', code: 'CPF-CT', maxAmount: 8000, claimedAmount: 0, category: 'cpf-srs' },
  { id: 'srs', name: 'SRS Contribution', code: 'SRS', maxAmount: 15300, claimedAmount: 0, category: 'cpf-srs' },
  { id: 'life-insurance', name: 'Life Insurance', code: 'LIR', maxAmount: 5000, claimedAmount: 0, category: 'insurance-education' },
  { id: 'course-fees', name: 'Course Fees', code: 'CFR', maxAmount: 5500, claimedAmount: 0, category: 'insurance-education' },
  { id: 'nsman', name: 'NSman Relief', code: 'NSR', maxAmount: 5000, claimedAmount: 0, category: 'personal' },
  { id: 'spouse-relief', name: 'Spouse Relief', code: 'SR', maxAmount: 2000, claimedAmount: 0, category: 'family' },
  { id: 'child-relief', name: 'Qualifying Child', code: 'QCR', maxAmount: 4000, claimedAmount: 0, category: 'family' },
  { id: 'parent-relief', name: 'Parent Relief', code: 'PR', maxAmount: 9000, claimedAmount: 0, category: 'family' },
  { id: 'handicapped-parent', name: 'Handicapped Parent', code: 'HPR', maxAmount: 14000, claimedAmount: 0, category: 'family' },
  { id: 'foreign-domestic', name: 'Foreign Maid Levy', code: 'FDWL', maxAmount: 6360, claimedAmount: 0, category: 'family' },
]

// ============================================
// FORMATTING UTILITIES
// ============================================

export function formatCurrency(amount: number): string {
  if (amount >= 1000000) {
    return `$${(amount / 1000000).toFixed(2)}M`
  }
  return new Intl.NumberFormat('en-SG', {
    style: 'currency',
    currency: 'SGD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatCompactCurrency(value: number): string {
  return new Intl.NumberFormat('en-SG', {
    style: 'currency',
    currency: 'SGD',
    notation: 'compact',
    maximumFractionDigits: 1,
    minimumFractionDigits: 0,
  }).format(value)
}

export function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`
}

// ============================================
// TAX CALCULATION FUNCTIONS
// ============================================

/**
 * Calculate progressive tax using Singapore resident tax brackets
 */
export function calculateProgressiveTax(chargeableIncome: number): { total: number; breakdown: TaxBracketBreakdown[] } {
  let remainingIncome = chargeableIncome
  let totalTax = 0
  const breakdown: TaxBracketBreakdown[] = []

  for (const bracket of SG_TAX_BRACKETS_RESIDENT) {
    if (remainingIncome <= 0) break

    const bracketSize = bracket.max - bracket.min
    const taxableInBracket = Math.min(remainingIncome, bracketSize)
    const taxInBracket = taxableInBracket * bracket.rate

    if (taxInBracket > 0 || (bracket.rate === 0 && taxableInBracket > 0)) {
      breakdown.push({
        bracket: bracket.max === Infinity
          ? `Above ${formatCurrency(bracket.min)}`
          : `${formatCurrency(bracket.min)} - ${formatCurrency(bracket.max)}`,
        amount: taxInBracket,
        rate: bracket.rate,
        min: bracket.min,
        max: bracket.max,
      })
    }

    totalTax += taxInBracket
    remainingIncome -= taxableInBracket
  }

  return { total: totalTax, breakdown }
}

/**
 * Get the marginal tax rate for a given chargeable income
 */
export function getMarginalRate(chargeableIncome: number, residencyStatus: TaxResidencyStatus): number {
  if (residencyStatus === 'non-resident') {
    return NON_RESIDENT_RATE
  }

  for (const bracket of SG_TAX_BRACKETS_RESIDENT) {
    if (chargeableIncome >= bracket.min && chargeableIncome < bracket.max) {
      return bracket.rate
    }
  }
  return SG_TAX_BRACKETS_RESIDENT[SG_TAX_BRACKETS_RESIDENT.length - 1].rate
}

/**
 * Main tax calculation function
 * Takes income sources and reliefs, returns full tax breakdown
 */
export function calculateTax(input: TaxCalculationInput): TaxCalculationResult {
  const { residencyStatus, incomeSources, reliefs } = input

  // Calculate gross income (including bonuses for employment)
  const grossIncome = incomeSources.reduce((sum, source) => {
    let amount = source.grossAmount
    if (source.type === 'employment' && source.bonus) {
      amount += source.bonus
    }
    return sum + amount
  }, 0)

  // Calculate CPF deductions (only from employment income)
  const totalDeductions = incomeSources
    .filter(source => source.type === 'employment')
    .reduce((sum, source) => sum + (source.cpfDeducted || 0), 0)

  const assessableIncome = grossIncome - totalDeductions

  // Calculate total reliefs (capped at $80,000)
  const totalReliefs = Math.min(
    reliefs.reduce((sum, relief) => sum + relief.claimedAmount, 0),
    PERSONAL_RELIEF_CAP
  )

  const chargeableIncome = Math.max(0, assessableIncome - totalReliefs)

  // Calculate tax based on residency status
  let taxPayable = 0
  const taxBreakdown: TaxBracketBreakdown[] = []

  if (residencyStatus === 'non-resident') {
    // Non-residents pay higher of flat 24% or progressive rate
    const flatTax = chargeableIncome * NON_RESIDENT_RATE
    const progressiveTax = calculateProgressiveTax(chargeableIncome).total
    taxPayable = Math.max(flatTax, progressiveTax)
    taxBreakdown.push({
      bracket: 'Non-Resident (24%)',
      amount: taxPayable,
      rate: NON_RESIDENT_RATE,
      min: 0,
      max: Infinity,
    })
  } else {
    // Residents use progressive tax brackets
    const result = calculateProgressiveTax(chargeableIncome)
    taxPayable = result.total
    taxBreakdown.push(...result.breakdown)
  }

  const effectiveRate = chargeableIncome > 0 ? taxPayable / chargeableIncome : 0
  const marginalRate = getMarginalRate(chargeableIncome, residencyStatus)

  return {
    grossIncome,
    totalDeductions,
    assessableIncome,
    totalReliefs,
    chargeableIncome,
    taxPayable,
    effectiveRate,
    marginalRate,
    taxBreakdown,
  }
}

/**
 * Simplified tax calculation for quick estimates
 * Takes gross income and CPF deductions directly
 */
export function calculateTaxSimple(
  grossIncome: number,
  cpfDeductions: number,
  totalReliefs: number,
  residencyStatus: TaxResidencyStatus = 'resident'
): TaxCalculationResult {
  const assessableIncome = grossIncome - cpfDeductions
  const cappedReliefs = Math.min(totalReliefs, PERSONAL_RELIEF_CAP)
  const chargeableIncome = Math.max(0, assessableIncome - cappedReliefs)

  let taxPayable = 0
  const taxBreakdown: TaxBracketBreakdown[] = []

  if (residencyStatus === 'non-resident') {
    const flatTax = chargeableIncome * NON_RESIDENT_RATE
    const progressiveTax = calculateProgressiveTax(chargeableIncome).total
    taxPayable = Math.max(flatTax, progressiveTax)
    taxBreakdown.push({
      bracket: 'Non-Resident (24%)',
      amount: taxPayable,
      rate: NON_RESIDENT_RATE,
      min: 0,
      max: Infinity,
    })
  } else {
    const result = calculateProgressiveTax(chargeableIncome)
    taxPayable = result.total
    taxBreakdown.push(...result.breakdown)
  }

  const effectiveRate = chargeableIncome > 0 ? taxPayable / chargeableIncome : 0
  const marginalRate = getMarginalRate(chargeableIncome, residencyStatus)

  return {
    grossIncome,
    totalDeductions: cpfDeductions,
    assessableIncome,
    totalReliefs: cappedReliefs,
    chargeableIncome,
    taxPayable,
    effectiveRate,
    marginalRate,
    taxBreakdown,
  }
}

/**
 * Get default reliefs with optional CPF amount pre-populated
 */
export function getDefaultReliefs(cpfContributions: number = 0): TaxRelief[] {
  return DEFAULT_RELIEFS.map(relief => {
    if (relief.id === 'cpf-employee') {
      return {
        ...relief,
        claimedAmount: Math.min(cpfContributions, relief.maxAmount),
      }
    }
    return { ...relief }
  })
}
