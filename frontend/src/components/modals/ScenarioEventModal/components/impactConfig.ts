import type { ImpactVerb } from '@/types/scenario'
import {
  assetCategoryOptions,
  liabilityCategoryOptions,
  incomeCategoryOptions,
  expenseCategoryOptions,
  investmentCategoryOptions,
} from '@/components/modals/FinancialFormModal/config'

// Get category options based on target type
export function getCategoryOptionsForTarget(targetType: string) {
  switch (targetType) {
    case 'asset': return assetCategoryOptions
    case 'liability': return liabilityCategoryOptions
    case 'income': return incomeCategoryOptions
    case 'expense': return expenseCategoryOptions
    case 'investment': return investmentCategoryOptions
    default: return []
  }
}

// Growth strategy options (values match DB: fixed, annual_step, compound_monthly)
export const GROWTH_STRATEGY_OPTIONS = [
  { value: 'fixed', label: 'No growth' },
  { value: 'annual_step', label: 'Annual step increase' },
  { value: 'compound_monthly', label: 'Compound growth' },
]

// Target type options grouped by category
export const TARGET_TYPE_GROUPS = [
  {
    label: 'Cash Flow',
    options: [
      { value: 'income', label: 'Income' },
      { value: 'expense', label: 'Expense' },
    ]
  },
  {
    label: 'Assets',
    options: [
      { value: 'cash', label: 'Cash Account' },
      { value: 'investment', label: 'Investment' },
      { value: 'asset', label: 'Non-Cash Asset' },
    ]
  },
  {
    label: 'Liabilities',
    options: [
      { value: 'liability', label: 'Debt/Liability' },
    ]
  },
]

// Verb options for dropdown
export const VERB_OPTIONS: { value: ImpactVerb; label: string }[] = [
  { value: 'increases_by', label: 'increases by' },
  { value: 'decreases_by', label: 'decreases by' },
  { value: 'becomes', label: 'becomes' },
  { value: 'starts_at', label: 'starts at' },
  { value: 'ends', label: 'ends' },
]

// Cadence options
export const CADENCE_OPTIONS = [
  { value: 'monthly', label: 'monthly' },
  { value: 'annual', label: 'annually' },
]

// Frequency options (includes one_time for start impacts)
export const FREQUENCY_OPTIONS = [
  { value: 'one_time', label: 'one-time' },
  { value: 'monthly', label: 'monthly' },
  { value: 'annual', label: 'annually' },
]

// Get label for a target type value
export function getTargetTypeDisplayLabel(value: string): string {
  for (const group of TARGET_TYPE_GROUPS) {
    const option = group.options.find(o => o.value === value)
    if (option) return option.label
  }
  return value
}

// Get human-readable label for target type
export function getTargetTypeLabel(targetType: string): string {
  switch (targetType) {
    case 'income': return 'income source'
    case 'expense': return 'expense'
    case 'asset': return 'non-cash asset'
    case 'investment': return 'investment'
    case 'liability': return 'debt/liability'
    case 'cash': return 'cash account'
    default: return targetType
  }
}

// Format amount display based on frequency
export function formatAmount(amount: number, frequency?: string) {
  const formatted = new Intl.NumberFormat('en-US').format(amount)
  if (!frequency) return `$${formatted}`
  const freqLabel = frequency === 'monthly' ? '/mo' : frequency === 'annual' ? '/yr' : frequency === 'weekly' ? '/wk' : ''
  return `$${formatted}${freqLabel}`
}

// Get verb color class
export function getVerbColor(verb: ImpactVerb) {
  switch (verb) {
    case 'increases_by': return 'text-emerald-400'
    case 'decreases_by': return 'text-rose-400'
    case 'becomes': return 'text-blue-400'
    case 'starts_at': return 'text-violet-400'
    case 'ends': return 'text-orange-400'
    default: return 'text-slate-400'
  }
}
