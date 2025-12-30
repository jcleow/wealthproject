// CPF Account Types and Interfaces

export type ResidencyStatus = 'citizen' | 'pr_year_1' | 'pr_year_2' | 'pr_year_3_plus'

export interface CPFBalances {
  oa: number
  sa: number
  ma: number
  ra: number
}

// Database-backed CPF Account (per-user, versioned)
export interface CPFAccount {
  id: string
  userId: string
  earner?: string // Person who owns this CPF account (e.g., "John", "Sarah")
  parentId: string // Groups versions of same logical account
  startDate: string // When this version starts
  endDate?: string // When this version ends (null = ongoing)
  oaBalance: number // in dollars (decimal)
  saBalance: number // in dollars (decimal)
  maBalance: number // in dollars (decimal)
  raBalance: number // in dollars (decimal)
  oaUsedForHousing: number // in dollars (decimal)
  housingStartDate?: string
  dateOfBirth: string
  residencyStatus: ResidencyStatus
  prGrantDate?: string
  createdAt: string
  updatedAt: string
}

export interface CPFAccountCreatePayload {
  earner?: string
  oaBalance?: number
  saBalance?: number
  maBalance?: number
  raBalance?: number
  oaUsedForHousing?: number
  housingStartDate?: string
  dateOfBirth: string
  residencyStatus: ResidencyStatus
  prGrantDate?: string
}

export type UpdateMode = 'in_place' | 'versioned'

export interface CPFAccountUpdatePayload {
  earner?: string
  oaBalance?: number
  saBalance?: number
  maBalance?: number
  raBalance?: number
  oaUsedForHousing?: number
  housingStartDate?: string
  dateOfBirth?: string
  residencyStatus?: ResidencyStatus
  prGrantDate?: string
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

// SA Shielding Types
export interface ShieldingInstrument {
  type: 'sgsBond' | 'tBill'
  principal: number
  yieldRate: number
  termMonths: number
}

export interface RAFormationEstimate {
  fromSA: number
  fromOA: number
  totalRA: number
  excessSA: number
  excessOA: number
}

export interface ShieldingStrategy {
  shieldingAmount: number
  instruments: ShieldingInstrument[]
  purchaseDate: string
  maturityDate: string
  raFormationWithout: RAFormationEstimate
  raFormationWith: RAFormationEstimate
  benefitAnalysis: {
    saPreserved: number
    interestDifferential: number
    netBenefit: number
  }
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
