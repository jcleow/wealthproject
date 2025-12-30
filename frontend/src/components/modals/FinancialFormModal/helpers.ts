import type { GrowthConfig } from '@/types/financial'
import type { FinancialDataType, FormState } from './types'
import { defaultCategories, fallbackGrowthRates } from './config'

// Number formatting utilities
export const roundToDollar = (value: number | string): number => Math.round(Number(value) || 0)

export const toNumeric = (value: string): number => Number.parseFloat(value.replace(/,/g, '')) || 0

export const formatNumberInput = (value: string | number): string => {
  const raw = typeof value === 'number' ? value.toString() : value
  const cleaned = raw.replace(/[^0-9.]/g, '')
  if (!cleaned) return ''
  const [integer, decimal] = cleaned.split('.')
  const formattedInt = new Intl.NumberFormat('en-US').format(Number(integer || 0))
  return decimal !== undefined ? `${formattedInt}.${decimal}` : formattedInt
}

export const toSafeText = (value: string | null | undefined): string => value ?? ''

// Growth rate helpers
export const categoryToGrowthConfigCategory = (type: FinancialDataType, category: string): string => {
  if (type === 'income') return 'income'
  if (type === 'expense') return 'expense'
  if (type === 'liability') return 'liability_debt'

  // Asset categories
  if (category.includes('property') || category.includes('real_estate')) return 'asset_property'
  if (category.includes('cash') || category.includes('savings') || category.includes('bank') || category.includes('cpf')) return 'asset_cash'
  // Default to equity for stocks, crypto, bonds, etc.
  return 'asset_equity'
}

export const getGrowthRateFromConfigs = (
  configs: GrowthConfig[] | undefined,
  category: string,
  fallback: number
): number => {
  if (!configs) return fallback
  const cfg = configs.find(c => c.category === category)
  return cfg?.annualRatePct ?? fallback
}

export const getRateForCategory = (
  type: FinancialDataType,
  category: string,
  growthConfigs?: GrowthConfig[]
): number => {
  const growthConfigCategory = categoryToGrowthConfigCategory(type, category)
  return getGrowthRateFromConfigs(
    growthConfigs,
    growthConfigCategory,
    fallbackGrowthRates[growthConfigCategory] ?? 3.0
  )
}

export const buildDefaultFormState = (type: FinancialDataType, growthConfigs?: GrowthConfig[]): FormState => {
  const defaultCategory = defaultCategories[type] ?? ''
  const growthConfigCategory = categoryToGrowthConfigCategory(type, defaultCategory)
  const rate = getGrowthRateFromConfigs(
    growthConfigs,
    growthConfigCategory,
    fallbackGrowthRates[growthConfigCategory] ?? 3.0
  )
  const liabilityRate = getGrowthRateFromConfigs(growthConfigs, 'liability_debt', -3.0)

  return {
    name: '',
    earner: '',
    amount: '',
    frequency: 'monthly',
    category: defaultCategory,
    annualGrowthRate: rate.toString(),
    interestRateApr: Math.abs(liabilityRate).toString(),
    minimumPayment: '',
    growthRate: rate.toString(),
    notes: '',
    // Asset useful life fields
    terminalValue: '',
    leaseStartYear: '',
    usefulLifeYears: '',
  }
}

// Calculate end date from lease start year and useful life years
export const calculateLeaseEndDate = (leaseStartYear: number, usefulLifeYears: number): string => {
  const endYear = leaseStartYear + usefulLifeYears
  return new Date(Date.UTC(endYear, 0, 1)).toISOString()
}

// Date helpers for versioning
// Use Date.UTC to ensure dates are stored in UTC, avoiding timezone issues
export const calculateVersionStartDate = (
  anchorYear: number,
  selectedYear: number,
  selectedMonth: number
): string => {
  const actualYear = anchorYear + selectedYear
  const actualMonth = selectedMonth - 1 // JS Date uses 0-indexed months
  return new Date(Date.UTC(actualYear, actualMonth, 1)).toISOString()
}

export const calculateStopEndDate = (
  anchorYear: number,
  selectedYear: number,
  selectedMonth: number
): string => {
  const actualYear = anchorYear + selectedYear
  const actualMonth = selectedMonth - 1 // JS Date uses 0-indexed months
  // End date is the last day of the previous month (day 0 = last day of previous month)
  return new Date(Date.UTC(actualYear, actualMonth, 0)).toISOString()
}
