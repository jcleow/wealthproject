import type { Asset, Expense, Frequency, Income, Liability } from '@/types/financial'

// Update mode constants for expense versioning
export const UPDATE_MODE_IN_PLACE = 'in_place' as const
export const UPDATE_MODE_VERSIONED = 'versioned' as const
export type UpdateMode = typeof UPDATE_MODE_IN_PLACE | typeof UPDATE_MODE_VERSIONED

// Entity type constants
export const ASSET_ENTITY = 'asset' as const
export const INCOME_ENTITY = 'income' as const
export const LIABILITY_ENTITY = 'liability' as const
export const EXPENSE_ENTITY = 'expense' as const
export const INVESTMENT_ENTITY = 'investment' as const

export type FinancialDataType =
  | typeof ASSET_ENTITY
  | typeof INCOME_ENTITY
  | typeof LIABILITY_ENTITY
  | typeof EXPENSE_ENTITY
  | typeof INVESTMENT_ENTITY

export type FormState = {
  name: string
  amount: string
  frequency: Frequency
  category: string
  annualGrowthRate: string
  interestRateApr: string
  minimumPayment: string
  growthRate: string
  notes: string
}

export type AssetFormValues = {
  type: 'asset'
  id?: string
  name: string
  category: string
  currentValue: number
  annualGrowthRate: number
  notes?: string | null
  updatedAt?: string
}

export type LiabilityFormValues = {
  type: 'liability'
  id?: string
  name: string
  category: string
  currentBalance: number
  interestRateApr: number
  minimumPayment: number
  notes?: string | null
  updatedAt?: string
}

export type IncomeFormValues = {
  type: 'income'
  id?: string
  source: string
  amount: number
  frequency: Frequency
  category: string
  startDate: string
  growthRate?: number
  notes?: string | null
  updatedAt?: string
}

export type ExpenseFormValues = {
  type: 'expense'
  id?: string
  payee: string
  amount: number
  frequency: Frequency
  category: string
  growthRate?: number
  notes?: string | null
  updatedAt?: string
  sourceLiabilityId?: string
  updateMode?: UpdateMode
  startDate?: string
}

export type InvestmentFormValues = {
  type: 'investment'
  id?: string
  name: string
  category: string
  currentValue: number
  annualGrowthRate: number
  notes?: string | null
  updatedAt?: string
}

export type CpfAssetEntry = {
  name: string
  category: string
  currentValue: number
  annualGrowthRate: number
  notes?: string | null
}

export type CpfFormValues = {
  type: 'cpf'
  accounts: CpfAssetEntry[]
}

export type FinancialFormValues =
  | AssetFormValues
  | LiabilityFormValues
  | IncomeFormValues
  | ExpenseFormValues
  | InvestmentFormValues
  | CpfFormValues

/** Timeline item shape for when editing from timeline view */
export interface TimelineItemData {
  itemId?: string
  id?: string
  name?: string
  category?: string
  amountAnnual?: number
  adjAnnualAmt?: number
  sourceAmount?: number
  sourceFrequency?: string
}

export interface FinancialFormModalProps {
  type: FinancialDataType
  mode: 'create' | 'edit'
  data?: Asset | Income | Liability | Expense | TimelineItemData
  isOpen: boolean
  onClose: () => void
  onSave: (payload: FinancialFormValues, mode: 'create' | 'edit') => Promise<void>
  onDelete?: (id: string) => Promise<void>
  onStop?: (id: string, endDate: string) => Promise<void>
  selectedYear?: number
  selectedMonth?: number
  selectedYearLabel?: string
  anchorYear?: number
}

export type CpfFields = {
  ordinaryAccount: string
  specialAccount: string
  medisaveAccount: string
}
