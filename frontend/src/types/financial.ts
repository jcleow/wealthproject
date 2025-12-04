import { z } from 'zod'

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
  "yearly",
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

export const wageTypeEnum = z.enum(["ow", "aw"])

export type WageType = z.infer<typeof wageTypeEnum>

export const incomeSchema = z.object({
  id: z.string().min(1),
  parentId: z.string().optional(),
  source: z.string().min(1),
  amount: z.number().positive(),
  frequency: frequencyEnum,
  startDate: isoDateTime,
  category: z.string().min(1),
  growthRate: z.number().optional(),
  notes: optionalNotes,
  updatedAt: isoDateTime,
  // CPF-related fields
  incomeType: incomeTypeEnum.optional(),
  wageType: wageTypeEnum.optional().nullable(),
  cpfApplicable: z.boolean().optional(),
})

export type Income = z.infer<typeof incomeSchema>

export const expenseSchema = z.object({
  id: z.string().min(1),
  parentId: z.string().optional(),
  payee: z.string().min(1),
  amount: z.number().positive(),
  frequency: frequencyEnum,
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

export type UserSettings = {
  id?: string
  startingAge: number
  terminalAge: number
  yearDisplayFormat: YearDisplayFormat
  autoExecuteTools: boolean
  updatedAt?: string
}
