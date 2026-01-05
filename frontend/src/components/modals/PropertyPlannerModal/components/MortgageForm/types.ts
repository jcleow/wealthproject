import type {
  MortgageInputs,
  FeeItem,
  AppreciationPeriod,
  LoanSegment,
  StaggeredDownpayment,
  GrantItem,
} from '@/app/property-planner/types'

// Income option type for dropdowns
export type IncomeOption = {
  id: string
  name: string
  personId?: string | null
  personName?: string
  monthlyAmount: number
}

// Projected CPF account for borrower selection
export type ProjectedCpfAccount = {
  id: string
  personId?: string | null
  personName?: string
  oaBalance: number
}

// Common onChange handler type used by internal subcomponents
// Note: Top-level step components now use usePropertyFormInputs() hook instead
// shouldDirty defaults to true - set to false for derived/computed values
export type OnChangeHandler = (
  field: keyof MortgageInputs,
  value: number | string | string[] | FeeItem[] | AppreciationPeriod[] | LoanSegment[] | StaggeredDownpayment | GrantItem[] | null,
  shouldDirty?: boolean
) => void
