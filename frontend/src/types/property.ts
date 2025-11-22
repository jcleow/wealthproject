import { z } from 'zod'

export type PropertyPlannerType = "hdb" | "condo" | "landed"

export const PROPERTY_TYPES: Array<{
  id: PropertyPlannerType
  label: string
  description: string
  icon: string
}> = [
  {
    id: "hdb",
    label: "HDB (BTO / Resale)",
    description: "Grants, MSR/TDSR guardrails, CPF-heavy funding",
    icon: "🏢",
  },
  {
    id: "condo",
    label: "Condo",
    description: "Private loan flexibility, ABSD/LTV tiers",
    icon: "🏙️",
  },
  {
    id: "landed",
    label: "Landed",
    description: "Land/reno reserves, staggered cash calls",
    icon: "🏡",
  },
]

export const mortgageInputsSchema = z.object({
  propertyType: z.enum(['hdb', 'condo', 'landed']),
  loanAmount: z.number().positive('Loan amount must be positive'),
  loanTermYears: z.number().min(5, 'Minimum 5 years').max(35, 'Maximum 35 years'),
  borrowerType: z.enum(['single', 'couple']),
  loanStartMonth: z.string().min(1, 'Loan start month is required'),
  fixedYears: z.number().min(1, 'Minimum 1 year').max(10, 'Maximum 10 years'),
  fixedRate: z.number().min(0, 'Rate cannot be negative').max(10, 'Rate too high'),
  floatingRate: z.number().min(0, 'Rate cannot be negative').max(10, 'Rate too high'),
  householdIncome: z.number().positive('Income must be positive'),
  otherDebt: z.number().min(0, 'Debt cannot be negative'),
})

export type MortgageInputs = z.infer<typeof mortgageInputsSchema>

export interface MortgageCalculationResult {
  monthlyPayment: number
  totalInterest: number
  msrRatio: number
  loanEndDate: string
  amortization: {
    balancePoints: Array<{
      label: string
      balance: number
      year: number
      yearIndex: number
    }>
    composition: Array<{
      label: string
      interest: number
      principal: number
      year: number
      yearIndex: number
    }>
  }
}

export interface PropertyPlannerScenario {
  id?: string
  name: string
  propertyType: PropertyPlannerType
  inputs: MortgageInputs
  calculations?: MortgageCalculationResult
  createdAt: string
  updatedAt: string
}

// Backend-aligned models for property linking flows
export interface PropertyScenarioRecord {
  id: string
  propertyType: string
  headline: string
  propertyPrice: number
  downPayment: number
  loanAmount: number
  interestRate: number
  loanTenure: number
  notes: string
  updatedAt: string
}

export interface PropertyLinkRecord {
  id: string
  propertyScenarioId: string
  assetId: string
  liabilityId: string
  createdAt: string
  updatedAt: string
}
