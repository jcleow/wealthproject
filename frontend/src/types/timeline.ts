export type TimelineFrequency =
  | 'annual'
  | 'monthly'
  | 'weekly'
  | 'biweekly'
  | 'quarterly'
  | 'semiannual'

// Backend sends: nonCashAsset, cashAsset, investment, liabilities, income, expense, cpf_contribution, cpf_account
// Frontend also uses normalized values: asset, liability, cash_account for UI logic
export type TimelineItemType =
  // Backend values
  | 'nonCashAsset'
  | 'cashAsset'
  | 'investment'
  | 'liabilities'
  | 'income'
  | 'expense'
  | 'cpf_contribution'
  | 'cpf_account'
  // Normalized values used in UI logic
  | 'asset'
  | 'liability'
  | 'cash_account'

/** Event impact attached to a timeline item */
export interface TimelineEventImpact {
  eventId: string
  amountAnnual?: number
  amountMonthly?: number
  impactKind?: 'delta' | 'override' | 'start' | 'stop'
  notes?: string
}

/** Applied impact in V2 response (decimal values as strings from backend) */
export interface AppliedImpactV2 {
  eventId: string
  amountAnnual: string
  amountMonthly: string
  impactKind: 'delta' | 'override' | 'start' | 'stop'
  notes?: string
}

export interface TimelineItem {
  itemId: string
  rowId?: string
  parentId?: string
  name: string
  category: string
  amountAnnual: number
  adjAnnualAmt?: number
  /** Monthly amount (when resolution is monthly) */
  amountMonthly?: number
  /** Adjusted monthly amount after growth (when resolution is monthly) */
  adjMonthlyAmt?: number
  sourceAmount?: number
  sourceFrequency?: TimelineFrequency
  itemType: TimelineItemType
  startYear: number
  /** Month when item started (1-12), used with startYear */
  startMonth?: number
  /** Per-item annual growth rate (percentage) */
  growthRate?: number
  /** Scenario event impacts applied to this item */
  eventImpacts?: TimelineEventImpact[]
  /** Indicates this is the designated cash account receiving net savings (cash accounts only) */
  isAccumulator?: boolean
  /** Link to liability this expense pays down (expenses only - identifies debt repayments) */
  sourceLiabilityId?: string
}

export interface GrowthApplied {
  category: string
  annualRatePct: number
}

export interface TimelineYear {
  year: number
  assets: TimelineItem[]
  cashAccounts: TimelineItem[]
  liabilities: TimelineItem[]
  income: TimelineItem[]
  expenses: TimelineItem[]
  netCash: number
  netWorth: number
  hasOverrides: boolean
  growthApplied: GrowthApplied[]
  // Cash accumulation tracking
  annualNetSavings?: number
  accumulatedCashStart?: number
  accumulatedCashEnd?: number
  interestEarned?: number
  accumulatorAccountId?: string
}

/** Timeline month for monthly resolution */
export interface TimelineMonth {
  /** Calendar year (e.g., 2025) */
  year: number
  /** Month number (1-12) */
  month: number
  /** Year index (0-based, e.g., 0, 1, 2...) */
  yearIndex: number
  /** Global month index (0-based, e.g., 0-419 for 35 years) */
  monthIndex: number
  assets: TimelineItem[]
  cashAccounts: TimelineItem[]
  liabilities: TimelineItem[]
  income: TimelineItem[]
  expenses: TimelineItem[]
  /** Monthly net cash (income - CPF - expenses) */
  netCash: number
  netWorth: number
  hasOverrides: boolean
  growthApplied: GrowthApplied[]
  // Monthly cash accumulation tracking
  monthlyNetSavings?: number
  accumulatedCashStart?: number
  accumulatedCashEnd?: number
  interestEarned?: number
  accumulatorAccountId?: string
}

export type TimeResolution = 'yearly' | 'monthly'

export interface TimelineResponse {
  resolution: TimeResolution
  version: string
  years?: TimelineYear[]
  months?: TimelineMonth[]
  scenariosApplied?: string[]
}

export interface TimelineEdit {
  itemId?: string
  name?: string
  itemType: TimelineItemType
  category?: string
  amount: number
  frequency?: TimelineFrequency // Only required for income/expense
  sourceLiabilityId?: string // Only for debt repayment expenses
}

export interface TimelineEditRequest {
  year: number
  edits: TimelineEdit[]
  note?: string
}

// ========== Timeline V2 Types ==========

/** V2 Response for monthly snapshot endpoint */
export interface TimelineV2Response {
  months: MonthDetailResponseV2[]
}

/** Single month detail in V2 response (decimal values come as strings from backend) */
export interface MonthDetailResponseV2 {
  year: number
  month: number
  allYearsIndex: number
  allMonthsIndex: number
  nonCashAssets: NonCashAssetResponseV2[]
  investments: InvestmentResponseV2[]
  cashAssets: CashAssetResponseV2[]
  cpfAssets: CPFAssetResponseV2[]
  liabilities: LiabilityResponseV2[]
  income: IncomeResponseV2[]
  cpfContributions: CPFContributionResponseV2[]
  expenses: ExpenseResponseV2[]
  incomeAllocations: IncomeAllocationResponseV2[]
  // Savings breakdown
  netSavings: string      // income - employee CPF - expenses (monthly)
  netCash: string         // income - employee CPF - expenses - investments (monthly)
  netInvestments: string  // employee CPF contribution (monthly)
  // Other totals
  netWorth: string
  accumulatorAccountId: string
}

/** Income allocation in V2 response - filtered by month */
export interface IncomeAllocationResponseV2 {
  id: string
  incomeId: string
  parentId: string
  startDate: string
  endDate?: string
  targetCashAccountId?: string
  targetInvestmentId?: string
  allocationType: 'percentage' | 'fixed'
  allocationValue: string // decimal as string
}

/** Non-cash asset in V2 response (decimal values come as strings from backend) */
export interface NonCashAssetResponseV2 {
  id: string
  parentId: string
  name: string
  category: string
  balance: string
  eventAdjBalance: string
  itemType: TimelineItemType
  startDate: string
  startYear: number
  startMonth: number
  eventImpacts?: AppliedImpactV2[]
}

/** Investment in V2 response (decimal values come as strings from backend) */
export interface InvestmentResponseV2 {
  id: string
  parentId: string
  name: string
  category: string
  balance: string
  eventAdjBalance: string
  growthRate: string
  itemType: TimelineItemType
  startDate: string
  startYear: number
  startMonth: number
  eventImpacts?: AppliedImpactV2[]
}

/** Cash asset in V2 response (decimal values come as strings from backend) */
export interface CashAssetResponseV2 {
  itemId: string
  name: string
  category: string
  balance: string
  eventAdjBalance: string
  itemType: TimelineItemType
  startYear: number
  startMonth: number
  isAccumulator: boolean
  eventImpacts?: AppliedImpactV2[]
}

/** CPF asset in V2 response (decimal values come as strings from backend) */
export interface CPFAssetResponseV2 {
  id: string
  parentId: string
  name: string
  category: string
  balance: string
  eventAdjBalance: string
  itemType: TimelineItemType
  startDate: string
  startYear: number
  startMonth: number
}

/** Liability in V2 response (decimal values come as strings from backend) */
export interface LiabilityResponseV2 {
  id: string
  parentId: string
  name: string
  category: string
  balance: string
  eventAdjBalance: string
  sourceAmount: string
  itemType: TimelineItemType
  startYear: number
  startMonth: number
  eventImpacts?: AppliedImpactV2[]
}

/** Income in V2 response (decimal values come as strings from backend) */
export interface IncomeResponseV2 {
  id: string
  parentId: string
  name: string
  category: string
  amount: string
  eventAdjAmount: string
  sourceFrequency: TimelineFrequency
  itemType: TimelineItemType
  startYear: number
  startMonth: number
  growthRate: string
  eventImpacts?: AppliedImpactV2[]
}

/** CPF contribution in V2 response (decimal values come as strings from backend) */
export interface CPFContributionResponseV2 {
  id: string
  parentId: string
  name: string
  category: string
  employeeContribution: string
  employerContribution: string
  totalContribution: string
  sourceFrequency: TimelineFrequency
  itemType: TimelineItemType
  startYear: number
  startMonth: number
  allocationOa: string
  allocationSa: string
  allocationMa: string
  allocationRa: string
}

/** Expense in V2 response (decimal values come as strings from backend) */
export interface ExpenseResponseV2 {
  id: string
  parentId: string
  name: string
  category: string
  amount: string
  eventAdjAmount: string
  sourceFrequency: TimelineFrequency
  itemType: TimelineItemType
  startYear: number
  startMonth: number
  /** Link to liability this expense pays down (debt repayment) */
  sourceLiabilityId?: string
  eventImpacts?: AppliedImpactV2[]
}

// ========== Timeline V2 Chart Types ==========

/** Yearly summary for chart display */
export interface TimelineChartYear {
  year: number
  allYearsIndex: number
  netWorth: string // decimal as string from backend
}

/** Monthly summary for chart display */
export interface TimelineChartMonth {
  month: number
  allMonthsIndex: number
  netWorth: string // decimal as string from backend
}

/** V2 Response for chart endpoint */
export interface TimelineChartResponse {
  resolution: TimeResolution
  years?: TimelineChartYear[]
  months?: TimelineChartMonth[]
  scenarioIds: string[]
}
