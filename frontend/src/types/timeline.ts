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
  | 'property_fee'
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
  growthRate?: number  // Percentage delta (e.g., 5 for +5%)
}

/** Applied impact in V2 response (decimal values as strings from backend) */
export interface AppliedImpactV2 {
  eventId: string
  amountAnnual: string
  amountMonthly: string
  impactKind: 'delta' | 'override' | 'start' | 'stop'
  notes?: string
  growthRate?: number  // Percentage delta (e.g., 5 for +5%)
}

export interface TimelineItem {
  itemId: string
  rowId?: string
  parentId?: string
  name: string
  personId?: string | null
  personName?: string
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
  /** If set, this item was created by a scenario start impact */
  scenarioEventId?: string
  /** Icon name for property fee items */
  icon?: string
  /** Icon color for property fee items */
  iconColor?: string
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
  /** Pre-calculated total assets (when available from V2 chart API) */
  totalAssets?: number
  /** Pre-calculated total liabilities (when available from V2 chart API) */
  totalLiabilities?: number
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
  /** Pre-calculated total assets (when available from V2 chart API) */
  totalAssets?: number
  /** Pre-calculated total liabilities (when available from V2 chart API) */
  totalLiabilities?: number
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
  cpfRefunds: CPFRefundResponseV2[]
  expenses: ExpenseResponseV2[]
  incomeAllocations: IncomeAllocationResponseV2[]
  properties: PropertySnapshotV2[]
  // Savings breakdown
  netSavings: string      // income - employee CPF - expenses (monthly)
  netCash: string         // income - employee CPF - expenses - investments (monthly)
  netInvestments: string  // employee CPF contribution (monthly)
  // Other totals
  totalAssets: string
  totalLiabilities: string
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
  /** If set, this item was created by a scenario start impact */
  scenarioEventId?: string
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
  /** If set, this item was created by a scenario start impact */
  scenarioEventId?: string
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
  personId: string
  personName?: string
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
  /** If set, this item was created by a scenario start impact */
  scenarioEventId?: string
}

/** Income in V2 response (decimal values come as strings from backend) */
export interface IncomeResponseV2 {
  id: string
  parentId: string
  name: string
  personId?: string | null
  personName?: string
  category: string
  amount: string // Monthly amount
  eventAdjAmount: string // Monthly amount with scenario impacts
  annualAmount: string // Sum of 12 monthly amounts (accounts for growth)
  eventAdjAnnualAmount: string // Sum of 12 monthly amounts with scenario impacts
  sourceFrequency: TimelineFrequency
  itemType: TimelineItemType
  startYear: number
  startMonth: number
  growthRate: string
  eventImpacts?: AppliedImpactV2[]
  /** If set, this item was created by a scenario start impact */
  scenarioEventId?: string
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

/** CPF refund from property sale in V2 response */
export interface CPFRefundResponseV2 {
  id: string
  name: string
  propertyName: string
  totalRefund: string
  refundDate: string
  targetAccountId: string
  itemType: 'cpf_refund'
}

/** Expense in V2 response (decimal values come as strings from backend) */
export interface ExpenseResponseV2 {
  id: string
  parentId: string
  name: string
  category: string
  amount: string // Monthly amount
  eventAdjAmount: string // Monthly amount with scenario impacts
  annualAmount: string // Sum of 12 monthly amounts (accounts for growth)
  eventAdjAnnualAmount: string // Sum of 12 monthly amounts with scenario impacts
  sourceFrequency: TimelineFrequency
  itemType: TimelineItemType
  startYear: number
  startMonth: number
  /** Link to liability this expense pays down (debt repayment) */
  sourceLiabilityId?: string
  eventImpacts?: AppliedImpactV2[]
  /** If set, this item was created by a scenario start impact */
  scenarioEventId?: string
  /** Icon name for property fee items */
  icon?: string
  /** Icon color for property fee items */
  iconColor?: string
}

// ========== Timeline V2 Chart Types ==========

/** Yearly summary for chart display */
export interface TimelineChartYear {
  year: number
  allYearsIndex: number
  totalAssets: string // decimal as string from backend
  totalLiabilities: string // decimal as string from backend
  netWorth: string // decimal as string from backend
}

/** Monthly summary for chart display */
export interface TimelineChartMonth {
  month: number
  allMonthsIndex: number
  totalAssets: string // decimal as string from backend
  totalLiabilities: string // decimal as string from backend
  netWorth: string // decimal as string from backend
}

/** V2 Response for chart endpoint */
export interface TimelineChartResponse {
  resolution: TimeResolution
  years?: TimelineChartYear[]
  months?: TimelineChartMonth[]
  scenarioIds: string[]
}

// ========== Property Snapshot Types ==========

/** Fee associated with a property event (purchase, recurring, or sale) */
export interface PropertyFeeSnapshotV2 {
  id: string
  name: string
  feeContext: 'purchase' | 'recurring' | 'sale'
  amount: string
  date: string
}

/** Property scenario snapshot in timeline V2 response */
export interface PropertySnapshotV2 {
  id: string
  name: string
  icon?: string
  iconColor?: string
  propertyValue: string   // Current/projected value at this point
  mortgageBalance: string // Current/projected outstanding balance
  netEquity: string       // PropertyValue - MortgageBalance
  purchaseDate: string    // First rate period start_month
  saleDate?: string
  fees: PropertyFeeSnapshotV2[]
  mortgagePayment?: MortgagePaymentSnapshotV2 // Monthly payment breakdown
}

/** Mortgage payment breakdown in timeline V2 response */
export interface MortgagePaymentSnapshotV2 {
  monthlyTotal: string     // Total monthly payment
  principalPortion: string // Principal paid this month
  interestPortion: string  // Interest paid this month
  currentRate: string      // Current interest rate (APR %)
  rateType: string         // "fixed" or "floating"
}
