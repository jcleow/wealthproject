import type {
  PropertyType,
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

// Common onChange handler type
export type OnChangeHandler = (
  field: keyof MortgageInputs,
  value: number | string | string[] | FeeItem[] | AppreciationPeriod[] | LoanSegment[] | StaggeredDownpayment | GrantItem[] | null
) => void

export interface MortgageFormProps {
  inputs: MortgageInputs
  onChange: OnChangeHandler
  propertyType: PropertyType
}

// Step component props - base interface
export interface StepProps {
  inputs: MortgageInputs
  onChange: OnChangeHandler
}

// PropertyAndFinancingStep props (merged step)
export interface PropertyAndFinancingStepProps extends StepProps {
  isResale: boolean
  isBTO: boolean
  isHDB: boolean
  effectivePrice: number
  downpaymentOnValuation: number
  maxLtv: number
  cashOverValuation: number
}

// BorrowersStep props
export interface BorrowersStepProps extends StepProps {
  incomes: IncomeOption[]
  cpfAccounts: ProjectedCpfAccount[]
  exceedsHdbIncomeCeiling: boolean
  exceedsEcIncomeCeiling: boolean
  purchaseDateFormatted: string
  householdIncome: number
}

// TermsStep props
export interface TermsStepProps extends StepProps {
  propertyType: PropertyType
}

// LoanTypeToggle props
export interface LoanTypeToggleProps {
  isHDB: boolean
  inputs: MortgageInputs
  onChange: OnChangeHandler
  effectivePrice: number
  downpaymentOnValuation: number
}
