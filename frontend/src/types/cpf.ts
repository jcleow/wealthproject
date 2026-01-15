// CPF Account Types and Interfaces

// Stored residency status - only 'citizen' or 'pr' is stored in the database.
// The PR year (1, 2, 3+) is computed at runtime from pr_grant_date.
export type ResidencyStatus = 'citizen' | 'pr'

export interface CPFBalances {
  oa: number
  sa: number
  ma: number
  ra: number
}

// Database-backed CPF Account (per-user, versioned)
// Note: dateOfBirth, residencyStatus, prGrantDate are now stored on the Person entity
// but are included here as read-only fields populated via JOIN from the persons table.
// Note: CPF housing usage is derived from property scenarios - see GetCPFOAUsageByAccount().
export interface CPFAccount {
  id: string
  userId: string
  personId?: string | null // FK to persons table (required)
  personName?: string // Display name from persons table (read-only)
  parentId: string // Groups versions of same logical account
  startDate: string // When this version starts
  endDate?: string // When this version ends (null = ongoing)
  oaBalance: number // in dollars (decimal)
  saBalance: number // in dollars (decimal)
  maBalance: number // in dollars (decimal)
  raBalance: number // in dollars (decimal)
  // Person-related fields (read-only, populated via JOIN from persons table)
  dateOfBirth: string
  residencyStatus: ResidencyStatus
  prGrantDate?: string
  gender?: string // 'male' or 'female' (read-only)
  createdAt: string
  updatedAt: string
}

// Note: Person-related fields (dateOfBirth, residencyStatus, prGrantDate) are now
// managed through the Person entity, not through CPF account endpoints.
// Note: CPF housing usage is derived from property scenarios - see GetCPFOAUsageByAccount().
export interface CPFAccountCreatePayload {
  personId: string // Required FK to persons table
  oaBalance?: number
  saBalance?: number
  maBalance?: number
  raBalance?: number
}

export type UpdateMode = 'in_place' | 'versioned'

// Note: CPF housing usage is derived from property scenarios - see GetCPFOAUsageByAccount().
export interface CPFAccountUpdatePayload {
  personId?: string | null
  oaBalance?: number
  saBalance?: number
  maBalance?: number
  raBalance?: number
  updateMode?: UpdateMode
  startDate?: string // Required for versioned updates
}

// Legacy profile type (for existing components)
export interface CPFProfile {
  id: string
  dateOfBirth: string
  age: number
  residencyStatus: 'CITIZEN' | 'PR_YEAR_1' | 'PR_YEAR_2' | 'PR_YEAR_3_PLUS'
  balances: CPFBalances
  monthlyIncome: number
  annualBonus: number
}

// CPF Configuration (versioned policy data)
export interface CPFConfiguration {
  id: string
  year: number
  effectiveFrom: string
  effectiveTo?: string
  config: CPFConfigData
  createdAt: string
  updatedAt: string
}

export interface CPFConfigData {
  owCeiling: number
  annualCeiling: number
  cpfAnnualLimit: number
  retirementSums: {
    brs: number
    frs: number
    ers: number
  }
  bhs: number
  interestRates: {
    oa: number
    sa: number
    ma: number
    ra: number
    extraFirst60k: number
    extraFirst30kAbove55: number
    extraNext30kAbove55: number
  }
  contributionRates: {
    citizenAndPR3Plus: AgeBasedContributionRates
    prYear1: AgeBasedContributionRates
    prYear2: AgeBasedContributionRates
  }
  allocationRates: {
    upTo35: AllocationRates
    above35To45: AllocationRates
    above45To50: AllocationRates
    above50To55: AllocationRates
    above55To60: AllocationRates
    above60To65: AllocationRates
    above65: AllocationRates
  }
}

export interface AgeBasedContributionRates {
  upTo55: RatePair
  above55To60: RatePair
  above60To65: RatePair
  above65To70: RatePair
  above70: RatePair
}

export interface RatePair {
  employee: number
  employer: number
}

export interface AllocationRates {
  oa: number
  sa: number
  ma: number
  ra?: number
}

// CPF Contribution Preview (computed from income)
export interface CPFContributionPreview {
  grossWage: number
  cappedWage: number
  employeeContribution: number
  employerContribution: number
  totalContribution: number
  takeHomePay: number
  allocation: {
    oa: number
    sa: number
    ma: number
    ra: number
  }
  ratesApplied: {
    employee: number
    employer: number
    ageGroup: string
    residencyStatus: ResidencyStatus
  }
}

// CPFIS Types
export interface CPFISLimits {
  oaReserved: number // 20000
  saReserved: number // 40000
  stocksLimit: number // 0.35
  goldLimit: number // 0.10
}

export interface CPFISInvestment {
  id: string
  account: 'OA' | 'SA'
  productType: 'etf' | 'unit_trust' | 'sgs' | 'tbill' | 'stock' | 'gold'
  productName: string
  units: number
  purchasePrice: number
  purchaseDate: string
  currentValue: number
  ter: number
  status: 'active' | 'sold' | 'matured'
}

export interface InvestibleBalance {
  oaInvestible: number
  saInvestible: number
  totalInvestible: number
  stocksAllocated: number
  goldAllocated: number
  otherAllocated: number
  stocksAvailable: number
  goldAvailable: number
  otherAvailable: number
}

// Top-up & Tax Relief Types
export interface RSTUResult {
  selfRelief: number
  familyRelief: number
  totalRelief: number
  selfReliefRemaining: number
  familyReliefRemaining: number
  taxSavings: number
  marginalTaxRate: number
}

export interface OAtoSATransferResult {
  maxTransferable: number
  actualTransfer: number
  newOABalance: number
  newSABalance: number
  taxReliefEligible: number
  allowed: boolean
  blockedReason?: string
  warnings: string[]
}

// CPF Housing Types
export interface CPFHousingUsage {
  propertyScenarioId: string
  downPayment: {
    oaUsed: number
    cashUsed: number
    grantReceived: number
    grantType: 'EHG' | 'FHG' | 'PHG' | 'STEP_UP' | null
  }
  monthlyPayments: MonthlyPayment[]
  totals: {
    totalOAUsed: number
    totalCashUsed: number
    oaForDownPayment: number
    oaForMonthlyPayments: number
  }
  accruedInterest: AccruedInterestSchedule
}

export interface MonthlyPayment {
  month: string
  oaUsed: number
  cashUsed: number
  principalPortion: number
  interestPortion: number
}

export interface AccruedInterestSchedule {
  asOfDate: string
  totalAccrued: number
  yearlyBreakdown: YearlyAccrued[]
}

export interface YearlyAccrued {
  year: number
  startingPrincipal: number
  interestForYear: number
  cumulativeInterest: number
}

export interface PropertySaleAnalysis {
  saleDate: string
  grossProceeds: number
  outstandingLoan: number
  sellingCosts: number
  cpfRefundRequired: {
    principalUsed: number
    accruedInterest: number
    totalRefund: number
  }
  refundDestination: {
    toOA: number
    toRA: number
    reason: string
  }
  netCashProceeds: number
  warnings: string[]
}

// CPF Projection Types
export interface CPFProjectionYear {
  year: number
  age: number
  oa: number
  sa: number
  ma: number
  ra: number
  total: number
  contributions: number
  interest: number
}

export interface RetirementProjection {
  age55Balances: CPFBalances
  age65Balances: CPFBalances
  frsTarget: number
  brsTarget: number
  ersTarget: number
  bhsTarget: number // Basic Healthcare Sum (MediSave cap)
  cpfLifeEstimates: {
    standard: number
    basic: number
    escalating: number
  }
}

// Education Scheme Types
export interface EducationLoan {
  id: string
  borrower: 'self' | 'child' | 'spouse' | 'sibling'
  institution: string
  course: string
  principal: number
  interestRate: number
  withdrawalDate: string
  repaymentStartDate: string
  repaymentEndDate: string
  monthlyRepayment: number
  totalRepayment: number
  totalInterest: number
  status: 'active' | 'paid' | 'waived'
}

// Housing Grants Types
export interface GrantCalculationResult {
  ehg: { eligible: boolean; amount: number; reason: string }
  fhg: { eligible: boolean; amount: number; reason: string }
  phg: { eligible: boolean; amount: number; reason: string }
  stepUp: { eligible: boolean; amount: number; reason: string }
  totalGrants: number
  warnings: string[]
}

// ============================================================================
// CPF Projection Assumptions (User-Adjustable)
// ============================================================================

/**
 * Assumptions used for CPF projections.
 * Based on CPF's official methodology:
 * @see https://www.cpf.gov.sg/member/tnc/detailed-notes-for-cpf-planner-retirement-income
 */
export interface CPFAssumptions {
  // Interest Rates
  interestRates: {
    oa: number // OA base rate (default: 2.5%)
    sa: number // SA base rate (default: 4.0%)
    ma: number // MA base rate (default: 4.0%)
    ra: number // RA base rate (default: 4.0%)
    extraFirst60k: number // Extra interest on first $60k (default: 1.0%)
    extraFirst30kAbove55: number // Additional extra on first $30k for 55+ (default: 1.0%)
  }

  // Growth Rates
  inflationRate: number // Inflation rate for income goals (default: 2.0%)
  frsGrowthRate: number // FRS/BRS/ERS annual growth (default: 3.5%)
  salaryGrowthRate: number // Annual salary increment (default: 3.0%)

  // Employment
  // Note: Employment status is derived from income entries in the timeline
  retirementAge: number // Age to stop contributions (default: 65)

  // CPF LIFE
  cpfLifePlan: 'standard' | 'basic' | 'escalating'
  payoutStartAge: 65 | 66 | 67 | 68 | 69 | 70
  escalatingPlanGrowth: number // Annual growth for escalating plan (default: 2.0%)
  basicPlanPremiumPercent: number // Portion of RA set aside as CPF LIFE premium for Basic plan (10-20%, default: 17%)
}

/**
 * Default assumptions matching CPF's official methodology
 */
export const DEFAULT_CPF_ASSUMPTIONS: CPFAssumptions = {
  interestRates: {
    oa: 0.025, // 2.5%
    sa: 0.04, // 4.0%
    ma: 0.04, // 4.0%
    ra: 0.04, // 4.0%
    extraFirst60k: 0.01, // 1.0%
    extraFirst30kAbove55: 0.01, // 1.0%
  },
  inflationRate: 0.02, // 2.0%
  frsGrowthRate: 0.035, // 3.5%
  salaryGrowthRate: 0.03, // 3.0%
  retirementAge: 65,
  cpfLifePlan: 'standard',
  payoutStartAge: 65,
  escalatingPlanGrowth: 0.02, // 2.0%
  basicPlanPremiumPercent: 0.17, // 17% of RA set aside as premium for Basic plan
}

/**
 * Preset scenarios for quick selection
 */
export type AssumptionPreset = 'official' | 'conservative' | 'optimistic' | 'custom'

/**
 * CPF Assumptions as returned from API (includes id and cpfAccountId)
 */
export interface CPFAssumptionsResponse {
  id: string
  cpfAccountId: string
  interestRates: {
    oa: string
    sa: string
    ma: string
    ra: string
    extraFirst60K: string
    extraFirst30KAbove55: string
  }
  growthRates: {
    frs: string
  }
  employment: {
    retirementAge: number
  }
  cpfLife: {
    plan: 'standard' | 'basic' | 'escalating'
    payoutStartAge: number
    escalatingGrowth: string
  }
  presetName: AssumptionPreset
}

/**
 * Input payload for updating CPF assumptions
 */
export interface CPFAssumptionsUpdateInput {
  interestRates?: {
    oa?: string
    sa?: string
    ma?: string
    ra?: string
    extraFirst60K?: string
    extraFirst30KAbove55?: string
  }
  growthRates?: {
    frs?: string
  }
  employment?: {
    retirementAge?: number
  }
  cpfLife?: {
    plan?: 'standard' | 'basic' | 'escalating'
    payoutStartAge?: number
    escalatingGrowth?: string
  }
  presetName?: AssumptionPreset
}

export const ASSUMPTION_PRESETS: Record<Exclude<AssumptionPreset, 'custom'>, {
  label: string
  description: string
  assumptions: Partial<CPFAssumptions>
}> = {
  official: {
    label: 'CPF Official',
    description: 'Based on CPF planner methodology',
    assumptions: DEFAULT_CPF_ASSUMPTIONS,
  },
  conservative: {
    label: 'Conservative',
    description: 'Lower growth, prepare for uncertainty',
    assumptions: {
      interestRates: {
        oa: 0.025,
        sa: 0.035, // Lower SA/RA rates
        ma: 0.035,
        ra: 0.035,
        extraFirst60k: 0.01,
        extraFirst30kAbove55: 0.01,
      },
      inflationRate: 0.03, // Higher inflation
      frsGrowthRate: 0.04, // Higher FRS growth = harder to meet
      salaryGrowthRate: 0.02, // Lower salary growth
    },
  },
  optimistic: {
    label: 'Optimistic',
    description: 'Higher returns, favorable conditions',
    assumptions: {
      interestRates: {
        oa: 0.03, // Higher OA
        sa: 0.045, // Higher SA/RA
        ma: 0.045,
        ra: 0.045,
        extraFirst60k: 0.01,
        extraFirst30kAbove55: 0.01,
      },
      inflationRate: 0.015, // Lower inflation
      frsGrowthRate: 0.03, // Lower FRS growth = easier to meet
      salaryGrowthRate: 0.04, // Higher salary growth
    },
  },
}
