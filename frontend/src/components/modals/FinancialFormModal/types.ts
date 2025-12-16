import type { Asset, Expense, Frequency, Income, Liability } from '@/types/financial'

export type FinancialDataType = 'asset' | 'income' | 'liability' | 'expense' | 'investment'

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
  updateMode?: 'in_place' | 'versioned'
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
