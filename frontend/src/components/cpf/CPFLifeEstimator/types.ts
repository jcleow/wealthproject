import type { CPFLifeEstimateResponse } from '@/api/financial/cpf'

export type PlanType = 'standard' | 'basic' | 'escalating'
export type StartAge = 65 | 66 | 67 | 68 | 69 | 70
export type Gender = 'male' | 'female'

export interface Payouts {
  standard: number
  basic: number
  escalating: number
  escalatingAt75: number
  escalatingAt85: number
}

export interface RAInputNodeData {
  raBalance: number
  startAge: StartAge
  birthYear: number
  gender: Gender
  onChange: (field: string, value: number | string) => void
  isLoading: boolean
}

export interface PlanNodeData {
  planType: PlanType
  payout: number
  description: string
  pros: string[]
  cons: string[]
  color: string
  isSelected: boolean
  isLoading: boolean
  onClick: () => void
}

export interface ProjectionNodeData {
  monthlyPayout: number
  planType: PlanType
  startAge: number
  payoutAt75?: number
  payoutAt85?: number
  isLoading: boolean
}

export interface CPFLifeEstimatorState {
  raBalance: number
  startAge: StartAge
  birthYear: number
  gender: Gender
  selectedPlan: PlanType
  estimates: CPFLifeEstimateResponse | null
  isLoading: boolean
}
