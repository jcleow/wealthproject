import type { CPFProjectionYear } from '@/types/cpf'

export type ChartView = 'balance' | 'payout'
export type AccountKey = 'oa' | 'sa' | 'ma' | 'ra' | 'oaSa'
export type PayoutPlan = 'standard' | 'basic' | 'escalating'

export interface VisibleAccounts {
  oa: boolean
  sa: boolean
  ma: boolean
  ra: boolean
  oaSa: boolean
}

export interface PayoutProjectionYear {
  age: number
  year: number
  monthlyPayout: number
  annualPayout: number
  cumulativePayouts: number
  remainingPremium: number
  remainingRA: number
  bequestValue: number
  totalRemainingBalance: number
}

export interface ThresholdAges {
  brs: number | null
  frs: number | null
  ers: number | null
  bhs: number | null
}

export interface Milestone {
  age: number
  label: string
  color: string
}

export interface ChartDataPoint extends Omit<CPFProjectionYear, 'sa' | 'ra'> {
  sa: number | null
  ra: number | null
  retirementSavings: number | null
}

export const ACCOUNT_COLORS = {
  oa: '#3b82f6',
  sa: '#10b981',
  ma: '#f59e0b',
  ra: '#8b5cf6',
  oaSa: '#94a3b8',
} as const

export const THRESHOLD_COLORS = {
  brs: '#facc15',
  frs: '#38bdf8',
  ers: '#a78bfa',
  bhs: '#f472b6',
} as const
