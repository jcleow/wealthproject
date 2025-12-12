export type TimelineFrequency =
  | 'annual'
  | 'monthly'
  | 'weekly'
  | 'biweekly'
  | 'quarterly'
  | 'semiannual'

export type TimelineItemType = 'asset' | 'liability' | 'income' | 'expense' | 'cash_account' | 'cpf_contribution'

/** Event impact attached to a timeline item */
export interface TimelineEventImpact {
  eventId: string
  amountAnnual?: number
  amountMonthly?: number
  impactKind?: 'delta' | 'override' | 'start' | 'stop'
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
  createdYear: number
  /** Month when item was created (1-12), used with createdYear */
  createdMonth?: number
  /** Per-item annual growth rate (percentage) */
  growthRate?: number
  /** Scenario event impacts applied to this item */
  eventImpacts?: TimelineEventImpact[]
  /** Indicates this is the designated cash account receiving net savings (cash accounts only) */
  isAccumulator?: boolean
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
  /** Monthly net savings (income - expenses) */
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
  cashAssets: CashAssetResponseV2[]
  cpfAssets: CPFAssetResponseV2[]
  liabilities: LiabilityResponseV2[]
  income: IncomeResponseV2[]
  cpfContributions: CPFContributionResponseV2[]
  expenses: ExpenseResponseV2[]
  // Savings breakdown
  netSavings: string      // income - expenses (monthly)
  netCash: string         // income - expenses - employee CPF (monthly)
  netInvestments: string  // employee CPF contribution (monthly)
  // Other totals
  netWorth: string
  accumulatorAccountId: string
}

/** Non-cash asset in V2 response (decimal values come as strings from backend) */
export interface NonCashAssetResponseV2 {
  id: string
  parentId: string
  name: string
  category: string
  balance: string
  adjBalance: string
  itemType: string
  startDate: string
  createdYear: number
  createdMonth: number
}

/** Cash asset in V2 response (decimal values come as strings from backend) */
export interface CashAssetResponseV2 {
  itemId: string
  name: string
  category: string
  balance: string
  adjBalance: string
  itemType: string
  createdYear: number
  createdMonth: number
  isAccumulator: boolean
}

/** CPF asset in V2 response (decimal values come as strings from backend) */
export interface CPFAssetResponseV2 {
  id: string
  parentId: string
  name: string
  category: string
  balance: string
  adjBalance: string
  itemType: string
  startDate: string
  createdYear: number
  createdMonth: number
}

/** Liability in V2 response (decimal values come as strings from backend) */
export interface LiabilityResponseV2 {
  id: string
  parentId: string
  name: string
  category: string
  annualAmt: string
  adjAnnualAmt: string
  monthlyAmt: string
  adjMonthlyAmt: string
  sourceAmount: string
  itemType: string
  createdYear: number
  createdMonth: number
}

/** Income in V2 response (decimal values come as strings from backend) */
export interface IncomeResponseV2 {
  id: string
  parentId: string
  name: string
  category: string
  amount: string
  adjAmount: string
  sourceFrequency: string
  itemType: string
  createdYear: number
  createdMonth: number
  growthRate: string
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
  sourceFrequency: string
  itemType: string
  createdYear: number
  createdMonth: number
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
  adjAmount: string
  sourceFrequency: string
  itemType: string
  createdYear: number
  createdMonth: number
}
