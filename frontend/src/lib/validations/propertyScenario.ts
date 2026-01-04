import { z } from 'zod'
import type {
  PropertyType,
  BorrowerType,
  LoanType,
  FeeItem,
  AppreciationPeriod,
  LoanSegment,
  StaggeredDownpayment,
  GrantItem,
  MortgageInputs,
  SaleInputs,
} from '@/app/property-planner/types'

// ============================================
// NESTED SCHEMAS
// ============================================

const feeItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(['percentage', 'fixed']),
  value: z.number(),
  enabled: z.boolean(),
  dueOffset: z.number().optional(),
  icon: z.string().optional(),
  iconColor: z.string().optional(),
})

const appreciationPeriodSchema = z.object({
  id: z.string(),
  startYear: z.number(),
  endYear: z.number().nullable(),
  rate: z.number(),
})

const loanSegmentSchema = z.object({
  id: z.string(),
  startMonth: z.string(),
  termYears: z.number(),
  rate: z.number(),
  rateType: z.enum(['fixed', 'floating']),
})

const staggeredDownpaymentSchema = z.object({
  enabled: z.boolean(),
  firstInstalmentPercent: z.number(),
  secondInstalmentPercent: z.number(),
  firstInstalmentMonth: z.string(),
  secondInstalmentMonth: z.string(),
})

const grantItemSchema = z.object({
  id: z.string().optional(),
  name: z.string(),
  amount: z.number(),
})

// ============================================
// MORTGAGE INPUTS SCHEMA
// ============================================

const mortgageInputsSchema = z.object({
  propertyPrice: z.number(),
  valuationPrice: z.number(),
  loanAmount: z.number(),
  loanType: z.enum(['bank', 'hdb'] as const) as z.ZodType<LoanType>,
  downpaymentCpfOa: z.number(),
  downpaymentCash: z.number(),
  loanTermYears: z.number(),
  loanStartMonth: z.string(),
  fixedYears: z.number(),
  fixedRate: z.number(),
  floatingRate: z.number(),
  householdIncome: z.number(),
  otherDebt: z.number(),
  borrowerType: z.enum(['single', 'joint'] as const) as z.ZodType<BorrowerType>,
  cpfOaBalance: z.number(),
  monthlyCpfOa: z.number(),
  grants: z.array(grantItemSchema),
  borrower1IncomeId: z.string(),
  borrower1OaBalance: z.number(),
  borrower1LiabilityIds: z.array(z.string()),
  borrower2IncomeId: z.string().nullable(),
  borrower2OaBalance: z.number(),
  borrower2LiabilityIds: z.array(z.string()),
  borrower1DownpaymentCpfOa: z.number(),
  borrower2DownpaymentCpfOa: z.number(),
  borrower1MonthlyCpfOa: z.number(),
  borrower2MonthlyCpfOa: z.number(),
  // Monthly payment cash split
  monthlyCashAccountId: z.string().nullable(),
  monthlyCashAmountType: z.enum(['fixed', 'percentage', 'remainder']),
  monthlyCashAmount: z.number(),
  // Downpayment cash source
  downpaymentCashAccountId: z.string().nullable(),
  leaseRemainingYears: z.number().nullable(),
  purchaseFees: z.array(feeItemSchema),
  absdRate: z.number(),
  appreciationPeriods: z.array(appreciationPeriodSchema),
  loanSegments: z.array(loanSegmentSchema),
  staggeredDownpayment: staggeredDownpaymentSchema.nullable(),
})

// ============================================
// SALE INPUTS SCHEMA
// ============================================

const saleInputsSchema = z.object({
  expectedSaleDate: z.string(),
  expectedSalePrice: z.number(),
  fees: z.array(feeItemSchema),
})

// ============================================
// MAIN FORM SCHEMA
// ============================================

export const propertyScenarioFormSchema = z.object({
  name: z.string().min(1, 'Scenario name is required'),
  propertyType: z.enum(['hdb-resale', 'hdb-bto', 'ec', 'private-resale', 'private-new'] as const).nullable() as z.ZodType<PropertyType | null>,
  purchaseIcon: z.string(),
  purchaseIconColor: z.string(),
  purchaseIconSearch: z.string(),
  saleIcon: z.string(),
  saleIconColor: z.string(),
  saleIconSearch: z.string(),
  inputs: mortgageInputsSchema as z.ZodType<MortgageInputs>,
  saleInputs: saleInputsSchema as z.ZodType<SaleInputs>,
})

export type PropertyScenarioFormData = z.infer<typeof propertyScenarioFormSchema>

// Re-export nested types for convenience
export type { FeeItem, AppreciationPeriod, LoanSegment, StaggeredDownpayment, GrantItem }
