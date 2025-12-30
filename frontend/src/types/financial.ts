import { z } from 'zod'

// Entity type constants
export const ASSET_ENTITY = 'asset' as const
export const INCOME_ENTITY = 'income' as const
export const LIABILITY_ENTITY = 'liability' as const
export const EXPENSE_ENTITY = 'expense' as const
export const INVESTMENT_ENTITY = 'investment' as const

export type FinancialEntityType =
  | typeof ASSET_ENTITY
  | typeof INCOME_ENTITY
  | typeof LIABILITY_ENTITY
  | typeof EXPENSE_ENTITY
  | typeof INVESTMENT_ENTITY

// Pagination types
export type PaginatedResponse<T> = {
  data: T[]
  total: number
  limit: number
  offset: number
  hasMore: boolean
}

export type PaginationParams = {
  limit?: number
  offset?: number
}

export const frequencyEnum = z.enum([
  "weekly",
  "biweekly",
  "monthly",
  "quarterly",
  "annual",
  "one_time", // One-time occurrence, does not recur
])

export type Frequency = z.infer<typeof frequencyEnum>

const isoDateTime = z
  .string()
  .refine(
    (value) => !Number.isNaN(Date.parse(value)),
    "Expected an ISO-8601 timestamp"
  )

const optionalNotes = z.string().trim().optional().nullable()

export const assetSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  category: z.string().min(1),
  currentValue: z.number(),
  annualGrowthRate: z.number(),
  startDate: isoDateTime.optional(),
  endDate: isoDateTime.optional(),
  notes: optionalNotes,
  updatedAt: isoDateTime,
  parentId: z.string().optional(),
})

export type Asset = z.infer<typeof assetSchema>

export const liabilitySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  category: z.string().min(1),
  currentBalance: z.number(),
  interestRateApr: z.number(),
  minimumPayment: z.number(),
  startDate: isoDateTime.optional(),
  endDate: isoDateTime.optional(),
  notes: optionalNotes,
  updatedAt: isoDateTime,
  parentId: z.string().optional(),
})

export type Liability = z.infer<typeof liabilitySchema>

export type PropertyLink = {
  id: string
  propertyScenarioId: string
  assetId: string
  liabilityId: string
  createdAt: string
  updatedAt: string
}

export const incomeTypeEnum = z.enum([
  "salary",
  "bonus",
  "commission",
  "rental",
  "dividend",
  "freelance",
  "other",
])

export type IncomeType = z.infer<typeof incomeTypeEnum>

export const cpfWageTypeEnum = z.enum(["ow", "aw"])

export type CpfWageType = z.infer<typeof cpfWageTypeEnum>

export const incomeSchema = z.object({
  id: z.string().min(1),
  parentId: z.string().optional(),
  name: z.string().min(1),
  amount: z.number().positive(),
  frequency: frequencyEnum,
  startDate: isoDateTime,
  endDate: isoDateTime.optional(),
  category: z.string().min(1),
  growthRate: z.number().optional(),
  notes: optionalNotes,
  updatedAt: isoDateTime,
  // CPF-related fields
  incomeType: incomeTypeEnum.optional(),
  cpfWageType: cpfWageTypeEnum.optional().nullable(),
})

export type Income = z.infer<typeof incomeSchema>

export const expenseSchema = z.object({
  id: z.string().min(1),
  parentId: z.string().optional(),
  name: z.string().min(1),
  amount: z.number().positive(),
  frequency: frequencyEnum,
  startDate: isoDateTime.optional(),
  endDate: isoDateTime.optional(),
  category: z.string().min(1),
  growthRate: z.number().optional(),
  notes: optionalNotes,
  updatedAt: isoDateTime,
})

export type Expense = z.infer<typeof expenseSchema>

export type AssetCreatePayload = Omit<Asset, "id" | "updatedAt"> & {
  id?: string
}
export type AssetUpdatePayload = Omit<Asset, "updatedAt">

export type LiabilityCreatePayload = Omit<Liability, "id" | "updatedAt"> & {
  id?: string
}
export type LiabilityUpdatePayload = Omit<Liability, "updatedAt">

export type IncomeCreatePayload = Omit<Income, "id" | "updatedAt"> & {
  id?: string
}
export type IncomeUpdatePayload = Omit<Income, "updatedAt">

export type ExpenseCreatePayload = Omit<Expense, "id" | "updatedAt"> & {
  id?: string
}
export type ExpenseUpdatePayload = Omit<Expense, "updatedAt">

// Cash Account - separate from assets, receives accumulated surplus
export const cashAccountSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  balance: z.number(),
  interestRate: z.number(),
  bankName: z.string().optional().nullable(),
  accountType: z.string().optional().nullable(), // checking, savings, money_market
  isAccumulator: z.boolean(),
  startYear: z.number().optional(),
  endYear: z.number().optional().nullable(),
  notes: optionalNotes,
  createdAt: isoDateTime.optional(),
  updatedAt: isoDateTime.optional(),
})

export type CashAccount = z.infer<typeof cashAccountSchema>

export type CashAccountCreatePayload = Omit<CashAccount, "id" | "createdAt" | "updatedAt"> & {
  id?: string
}
export type CashAccountUpdatePayload = Omit<CashAccount, "createdAt" | "updatedAt">

// Growth Config - user defaults for growth rates by category
export type GrowthConfig = {
  id?: string
  category: string
  annualRatePct: number
  lowerBoundPct: number
  upperBoundPct: number
  updatedAt?: string
}

// Human-readable labels for growth config categories
export const GrowthConfigCategoryLabels: Record<string, string> = {
  asset_cash: 'Cash & Savings',
  asset_equity: 'Stocks & ETFs',
  asset_property: 'Property',
  liability_debt: 'Debt Reduction',
  income: 'Income Growth',
  expense: 'Expense Inflation',
}

// User Settings
export type YearDisplayFormat = 'year_number' | 'actual_year'
export type TimeResolution = 'yearly' | 'monthly'
export type CompoundingFrequency = 'monthly' | 'annual'
export type DashboardLayout = 'stacked' | 'chart-left' | 'chart-right'

export type UserSettings = {
  id?: string
  startingAge: number
  terminalAge: number
  yearDisplayFormat: YearDisplayFormat
  timeResolution: TimeResolution
  compoundingFrequency: CompoundingFrequency
  autoExecuteTools: boolean
  /** Whether to group financial items by category in collapsible sections */
  groupItemsByCategory: boolean
  /** Whether to show a mini floating chart when scrolled out of view */
  chartPictureInPicture: boolean
  /** Dashboard layout preference: stacked (default), chart-left, or chart-right */
  dashboardLayout: DashboardLayout
  updatedAt?: string
}
