import type {
  Asset,
  Liability,
  Income,
  Expense,
  CashAccount,
  GrowthConfig,
  PaginatedResponse,
  PaginationParams,
} from '@/types/financial'
import type { PropertyLinkRecord, PropertyScenarioRecord } from '@/types/property'
import type { ScenarioEvent, ScenarioImpactDto } from '@/types/scenario'
import { scenarioEventFromDto } from '@/types/scenario'
import type {
  CPFAccount,
  CPFAccountCreatePayload,
  CPFAccountUpdatePayload,
  CPFConfiguration,
  CPFContributionPreview,
} from '@/types/cpf'

// =============================================================================
// Pagination helpers
// =============================================================================

export function normalizePaginatedResponse<T>(
  raw: any,
  mapper: (item: any) => T,
  params?: PaginationParams
): PaginatedResponse<T> {
  const items = Array.isArray(raw?.data) ? raw.data : []
  return {
    data: items.map(mapper),
    total: raw?.total ?? items.length,
    limit: raw?.limit ?? params?.limit ?? 20,
    offset: raw?.offset ?? params?.offset ?? 0,
    hasMore: raw?.hasMore ?? false,
  }
}

// =============================================================================
// Financial mappers
// =============================================================================

export const toAsset = (item: any): Asset => ({
  id: item.id ?? item.ID,
  name: item.name ?? item.Name,
  category: item.category ?? item.Category,
  currentValue: item.current_value ?? item.currentValue ?? item.CurrentValue,
  annualGrowthRate: item.annual_growth_rate ?? item.annualGrowthRate ?? item.AnnualGrowthRate,
  startDate: item.start_date ?? item.startDate ?? item.StartDate,
  endDate: item.end_date ?? item.endDate ?? item.EndDate,
  notes: item.notes ?? item.Notes ?? '',
  updatedAt: item.updated_at ?? item.updatedAt ?? item.UpdatedAt,
  parentId: item.parent_id ?? item.parentId ?? item.ParentID,
})

export const toLiability = (item: any): Liability => ({
  id: item.id ?? item.ID,
  name: item.name ?? item.Name,
  category: item.category ?? item.Category,
  currentBalance: item.current_balance ?? item.currentBalance ?? item.CurrentBalance,
  interestRateApr: item.interest_rate_apr ?? item.interestRateApr ?? item.InterestRateAPR ?? item.InterestRateApr,
  minimumPayment: item.minimum_payment ?? item.minimumPayment ?? item.MinimumPayment,
  startDate: item.start_date ?? item.startDate ?? item.StartDate,
  endDate: item.end_date ?? item.endDate ?? item.EndDate,
  notes: item.notes ?? item.Notes ?? '',
  updatedAt: item.updated_at ?? item.updatedAt ?? item.UpdatedAt,
  parentId: item.parent_id ?? item.parentId ?? item.ParentID,
})

export const toIncome = (item: any): Income => ({
  id: item.id ?? item.ID,
  parentId: item.parent_id ?? item.parentId ?? item.ParentID,
  source: item.source ?? item.Source,
  amount: item.amount ?? item.Amount,
  frequency: item.frequency ?? item.Frequency,
  startDate: item.start_date ?? item.startDate ?? item.StartDate ?? new Date().toISOString(),
  category: item.category ?? item.Category,
  growthRate: item.growth_rate ?? item.growthRate ?? item.GrowthRate ?? 3.0,
  notes: item.notes ?? item.Notes ?? '',
  updatedAt: item.updated_at ?? item.updatedAt ?? item.UpdatedAt,
  incomeType: item.income_type ?? item.incomeType ?? item.IncomeType,
  cpfWageType: item.cpf_wage_type ?? item.cpfWageType ?? item.CpfWageType,
})

export const toExpense = (item: any): Expense => ({
  id: item.id ?? item.ID,
  parentId: item.parent_id ?? item.parentId ?? item.ParentID,
  payee: item.payee ?? item.Payee,
  amount: item.amount ?? item.Amount,
  frequency: item.frequency ?? item.Frequency,
  category: item.category ?? item.Category,
  growthRate: item.growth_rate ?? item.growthRate ?? item.GrowthRate ?? 2.0,
  notes: item.notes ?? item.Notes ?? '',
  updatedAt: item.updated_at ?? item.updatedAt ?? item.UpdatedAt,
})

export const toCashAccount = (item: any): CashAccount => ({
  id: item.id ?? item.ID,
  name: item.name ?? item.Name,
  balance: item.balance ?? item.Balance ?? 0,
  interestRate: item.interest_rate ?? item.interestRate ?? item.InterestRate ?? 1.5,
  bankName: item.bank_name ?? item.bankName ?? item.BankName ?? null,
  accountType: item.account_type ?? item.accountType ?? item.AccountType ?? null,
  isAccumulator: item.is_accumulator ?? item.isAccumulator ?? item.IsAccumulator ?? false,
  startYear: item.start_year ?? item.startYear ?? item.StartYear ?? 0,
  endYear: item.end_year ?? item.endYear ?? item.EndYear ?? null,
  notes: item.notes ?? item.Notes ?? '',
  createdAt: item.created_at ?? item.createdAt ?? item.CreatedAt,
  updatedAt: item.updated_at ?? item.updatedAt ?? item.UpdatedAt,
})

export const toPropertyLink = (item: any): PropertyLinkRecord => ({
  id: item.id ?? item.ID,
  propertyScenarioId: item.property_scenario_id ?? item.propertyScenarioId ?? item.PropertyScenarioId,
  assetId: item.asset_id ?? item.assetId ?? item.AssetID ?? item.AssetId,
  liabilityId: item.liability_id ?? item.liabilityId ?? item.LiabilityID ?? item.LiabilityId,
  createdAt: item.created_at ?? item.createdAt ?? item.CreatedAt ?? '',
  updatedAt: item.updated_at ?? item.updatedAt ?? item.UpdatedAt ?? '',
})

export const toPropertyScenario = (item: any): PropertyScenarioRecord => ({
  id: item.id ?? item.ID ?? '',
  propertyType: item.property_type ?? item.propertyType ?? '',
  headline: item.headline ?? '',
  propertyPrice: Number(item.property_price ?? item.propertyPrice ?? 0),
  downPayment: Number(item.down_payment ?? item.downPayment ?? 0),
  loanAmount: Number(item.loan_amount ?? item.loanAmount ?? 0),
  interestRate: Number(item.interest_rate ?? item.interestRate ?? 0),
  loanTenure: Number(item.loan_tenure ?? item.loanTenure ?? 0),
  notes: item.notes ?? '',
  updatedAt: item.updated_at ?? item.updatedAt ?? item.UpdatedAt ?? '',
})

export const toGrowthConfig = (item: any): GrowthConfig => ({
  id: item.id ?? item.ID,
  category: item.category ?? item.Category,
  annualRatePct: item.annual_rate_pct ?? item.annualRatePct ?? item.AnnualRatePct ?? 0,
  lowerBoundPct: item.lower_bound_pct ?? item.lowerBoundPct ?? item.LowerBoundPct ?? -50,
  upperBoundPct: item.upper_bound_pct ?? item.upperBoundPct ?? item.UpperBoundPct ?? 50,
  updatedAt: item.updated_at ?? item.updatedAt ?? item.UpdatedAt,
})

// =============================================================================
// CPF mappers
// =============================================================================

export const toCPFAccount = (item: any): CPFAccount => ({
  id: item.id ?? item.ID,
  userId: item.user_id ?? item.userId ?? item.UserID,
  oaBalance: item.oa_balance ?? item.oaBalance ?? item.OABalance ?? 0,
  saBalance: item.sa_balance ?? item.saBalance ?? item.SABalance ?? 0,
  maBalance: item.ma_balance ?? item.maBalance ?? item.MABalance ?? 0,
  raBalance: item.ra_balance ?? item.raBalance ?? item.RABalance ?? 0,
  oaUsedForHousing: item.oa_used_for_housing ?? item.oaUsedForHousing ?? item.OAUsedForHousing ?? 0,
  housingStartDate: item.housing_start_date ?? item.housingStartDate ?? item.HousingStartDate,
  dateOfBirth: item.date_of_birth ?? item.dateOfBirth ?? item.DateOfBirth,
  residencyStatus: item.residency_status ?? item.residencyStatus ?? item.ResidencyStatus ?? 'citizen',
  prGrantDate: item.pr_grant_date ?? item.prGrantDate ?? item.PRGrantDate,
  createdAt: item.created_at ?? item.createdAt ?? item.CreatedAt,
  updatedAt: item.updated_at ?? item.updatedAt ?? item.UpdatedAt,
})

export const toCPFConfiguration = (item: any): CPFConfiguration => ({
  id: item.id ?? item.ID,
  year: item.year ?? item.Year,
  effectiveFrom: item.effective_from ?? item.effectiveFrom ?? item.EffectiveFrom,
  effectiveTo: item.effective_to ?? item.effectiveTo ?? item.EffectiveTo,
  config: item.config ?? item.Config,
  createdAt: item.created_at ?? item.createdAt ?? item.CreatedAt,
  updatedAt: item.updated_at ?? item.updatedAt ?? item.UpdatedAt,
})

export const toCPFContributionPreview = (item: any): CPFContributionPreview => ({
  grossWage: item.gross_wage ?? item.grossWage ?? item.GrossWage,
  cappedWage: item.capped_wage ?? item.cappedWage ?? item.CappedWage,
  employeeContribution: item.employee_contribution ?? item.employeeContribution ?? item.EmployeeContribution,
  employerContribution: item.employer_contribution ?? item.employerContribution ?? item.EmployerContribution,
  totalContribution: item.total_contribution ?? item.totalContribution ?? item.TotalContribution,
  takeHomePay: item.take_home_pay ?? item.takeHomePay ?? item.TakeHomePay,
  allocation: {
    oa: item.allocation?.oa ?? item.Allocation?.OA ?? 0,
    sa: item.allocation?.sa ?? item.Allocation?.SA ?? 0,
    ma: item.allocation?.ma ?? item.Allocation?.MA ?? 0,
    ra: item.allocation?.ra ?? item.Allocation?.RA ?? 0,
  },
  ratesApplied: {
    employee: item.rates_applied?.employee ?? item.ratesApplied?.employee ?? 0,
    employer: item.rates_applied?.employer ?? item.ratesApplied?.employer ?? 0,
    ageGroup: item.rates_applied?.age_group ?? item.ratesApplied?.ageGroup ?? '',
    residencyStatus: item.rates_applied?.residency_status ?? item.ratesApplied?.residencyStatus ?? 'citizen',
  },
})

// =============================================================================
// Scenario helpers
// =============================================================================

export const normalizeImpact = (impact: any): ScenarioImpactDto => ({
  target_type: impact.target_type ?? impact.TargetType ?? impact.targetType ?? 'asset',
  target_id: impact.target_id ?? impact.TargetID ?? impact.targetId ?? undefined,
  impact_kind: impact.impact_kind ?? impact.ImpactKind ?? impact.impactKind ?? 'delta',
  amount: Number(impact.amount ?? impact.Amount ?? 0),
  currency: impact.currency ?? impact.Currency ?? 'SGD',
  cadence: impact.cadence ?? impact.Cadence ?? 'monthly',
  start_month: (impact.start_month ?? impact.StartMonth ?? impact.startMonth ?? '').slice(0, 7),
  end_month: impact.end_month
    ? impact.end_month.slice(0, 7)
    : impact.EndMonth
      ? impact.EndMonth.slice(0, 7)
      : impact.endMonth
        ? impact.endMonth.slice(0, 7)
        : undefined,
  notes: impact.notes ?? impact.Notes ?? '',
})

export const normalizeScenarioEvent = (data: any): ScenarioEvent => {
  const rawImpacts = data.impacts ?? data.Impacts ?? []
  const impacts = Array.isArray(rawImpacts) ? rawImpacts.map(normalizeImpact) : []

  return scenarioEventFromDto({
    id: data.id ?? data.ID ?? '',
    name: data.name ?? data.Name ?? '',
    description: data.description ?? data.Description ?? '',
    occurs_on: data.occurs_on ?? data.occursOn ?? data.OccursOn ?? '',
    display_icon: data.display_icon ?? data.displayIcon ?? data.DisplayIcon ?? '',
    display_color: data.display_color ?? data.displayColor ?? data.DisplayColor ?? '',
    tags: data.tags ?? data.Tags ?? [],
    scenario_id: data.scenario_id ?? data.scenarioId ?? data.ScenarioID ?? data.ScenarioId ?? undefined,
    is_included: data.is_included ?? data.isIncluded ?? data.IsIncluded ?? true,
    impacts,
  })
}

export const normalizeScenarioEventList = (payload: any): ScenarioEvent[] => {
  const items = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.items)
      ? payload.items
      : []

  return items.map(normalizeScenarioEvent)
}
