import type {
  Asset,
  Liability,
  Income,
  Expense,
  CashAccount,
  GrowthConfig,
  PaginatedResponse,
  PaginationParams,
  Frequency,
  IncomeType,
  CpfWageType,
} from '@/types/financial'
import type { PropertyLinkRecord, PropertyScenarioRecord } from '@/types/property'
import type { ScenarioEvent, ScenarioImpactDto } from '@/types/scenario'
import { scenarioEventFromDto } from '@/types/scenario'
import type {
  CPFAccount,
  CPFConfiguration,
  CPFContributionPreview,
  ResidencyStatus,
  CPFConfigData,
} from '@/types/cpf'

// =============================================================================
// Type-safe helpers for API response transformation
// =============================================================================

/** Record type for raw API responses with unknown property values */
type ApiRecord = Record<string, unknown>

/**
 * Safely get a property from an API response, checking multiple key naming conventions.
 * Returns undefined if none of the keys exist.
 */
function get<T>(obj: ApiRecord, ...keys: string[]): T | undefined {
  for (const key of keys) {
    if (obj[key] !== undefined) return obj[key] as T
  }
  return undefined
}

/** Safely get a property with a default value */
function getOr<T>(obj: ApiRecord, defaultValue: T, ...keys: string[]): T {
  return get<T>(obj, ...keys) ?? defaultValue
}

/** Ensure input is an ApiRecord for property access */
function asRecord(input: unknown): ApiRecord {
  if (input && typeof input === 'object' && !Array.isArray(input)) {
    return input as ApiRecord
  }
  return {}
}

// =============================================================================
// Pagination helpers
// =============================================================================

/** Raw paginated response structure from API */
interface RawPaginatedResponse {
  data?: unknown[]
  total?: number
  limit?: number
  offset?: number
  hasMore?: boolean
}

export function normalizePaginatedResponse<T>(
  raw: unknown,
  mapper: (item: ApiRecord) => T,
  params?: PaginationParams
): PaginatedResponse<T> {
  const response = asRecord(raw) as RawPaginatedResponse
  const items = Array.isArray(response.data) ? response.data : []
  return {
    data: items.map(item => mapper(asRecord(item))),
    total: response.total ?? items.length,
    limit: response.limit ?? params?.limit ?? 20,
    offset: response.offset ?? params?.offset ?? 0,
    hasMore: response.hasMore ?? false,
  }
}

// =============================================================================
// Financial mappers
// =============================================================================

export const toAsset = (item: ApiRecord): Asset => ({
  id: get<string>(item, 'id', 'ID') ?? '',
  name: get<string>(item, 'name', 'Name') ?? '',
  category: get<string>(item, 'category', 'Category') ?? '',
  currentValue: get<number>(item, 'current_value', 'currentValue', 'CurrentValue') ?? 0,
  annualGrowthRate: get<number>(item, 'annual_growth_rate', 'annualGrowthRate', 'AnnualGrowthRate') ?? 0,
  startDate: get<string>(item, 'start_date', 'startDate', 'StartDate'),
  endDate: get<string>(item, 'end_date', 'endDate', 'EndDate'),
  terminalValue: get<number>(item, 'terminal_value', 'terminalValue', 'TerminalValue') ?? null,
  leaseStartYear: get<number>(item, 'lease_start_year', 'leaseStartYear', 'LeaseStartYear') ?? null,
  notes: getOr<string>(item, '', 'notes', 'Notes'),
  updatedAt: getOr<string>(item, new Date().toISOString(), 'updated_at', 'updatedAt', 'UpdatedAt'),
  parentId: get<string>(item, 'parent_id', 'parentId', 'ParentID'),
})

export const toLiability = (item: ApiRecord): Liability => ({
  id: get<string>(item, 'id', 'ID') ?? '',
  name: get<string>(item, 'name', 'Name') ?? '',
  category: get<string>(item, 'category', 'Category') ?? '',
  currentBalance: get<number>(item, 'current_balance', 'currentBalance', 'CurrentBalance') ?? 0,
  interestRateApr: get<number>(item, 'interest_rate_apr', 'interestRateApr', 'InterestRateAPR', 'InterestRateApr') ?? 0,
  minimumPayment: get<number>(item, 'minimum_payment', 'minimumPayment', 'MinimumPayment') ?? 0,
  startDate: get<string>(item, 'start_date', 'startDate', 'StartDate'),
  endDate: get<string>(item, 'end_date', 'endDate', 'EndDate'),
  notes: getOr<string>(item, '', 'notes', 'Notes'),
  updatedAt: getOr<string>(item, new Date().toISOString(), 'updated_at', 'updatedAt', 'UpdatedAt'),
  parentId: get<string>(item, 'parent_id', 'parentId', 'ParentID'),
})

export const toIncome = (item: ApiRecord): Income => ({
  id: get<string>(item, 'id', 'ID') ?? '',
  parentId: get<string>(item, 'parent_id', 'parentId', 'ParentID'),
  name: get<string>(item, 'name', 'Name') ?? '',
  earner: getOr<string>(item, '', 'earner', 'Earner'),
  personId: get<string>(item, 'personId', 'person_id', 'PersonId') ?? null,
  amount: get<number>(item, 'amount', 'Amount') ?? 0,
  frequency: getOr<Frequency>(item, 'monthly', 'frequency', 'Frequency'),
  startDate: getOr<string>(item, new Date().toISOString(), 'start_date', 'startDate', 'StartDate'),
  category: get<string>(item, 'category', 'Category') ?? '',
  growthRate: getOr<number>(item, 3.0, 'growth_rate', 'growthRate', 'GrowthRate'),
  notes: getOr<string>(item, '', 'notes', 'Notes'),
  updatedAt: getOr<string>(item, new Date().toISOString(), 'updated_at', 'updatedAt', 'UpdatedAt'),
  incomeType: get<IncomeType>(item, 'income_type', 'incomeType', 'IncomeType'),
  cpfWageType: get<CpfWageType>(item, 'cpf_wage_type', 'cpfWageType', 'CpfWageType'),
})

export const toExpense = (item: ApiRecord): Expense => ({
  id: get<string>(item, 'id', 'ID') ?? '',
  parentId: get<string>(item, 'parent_id', 'parentId', 'ParentID'),
  name: get<string>(item, 'name', 'Name') ?? '',
  amount: get<number>(item, 'amount', 'Amount') ?? 0,
  frequency: getOr<Frequency>(item, 'monthly', 'frequency', 'Frequency'),
  category: get<string>(item, 'category', 'Category') ?? '',
  growthRate: getOr<number>(item, 2.0, 'growth_rate', 'growthRate', 'GrowthRate'),
  notes: getOr<string>(item, '', 'notes', 'Notes'),
  updatedAt: getOr<string>(item, new Date().toISOString(), 'updated_at', 'updatedAt', 'UpdatedAt'),
})

export const toCashAccount = (item: ApiRecord): CashAccount => ({
  id: get<string>(item, 'id', 'ID') ?? '',
  name: get<string>(item, 'name', 'Name') ?? '',
  balance: getOr<number>(item, 0, 'balance', 'Balance'),
  interestRate: getOr<number>(item, 1.5, 'interest_rate', 'interestRate', 'InterestRate'),
  bankName: get<string>(item, 'bank_name', 'bankName', 'BankName') ?? null,
  accountType: get<string>(item, 'account_type', 'accountType', 'AccountType') ?? null,
  isAccumulator: getOr<boolean>(item, false, 'is_accumulator', 'isAccumulator', 'IsAccumulator'),
  startYear: getOr<number>(item, 0, 'start_year', 'startYear', 'StartYear'),
  endYear: get<number>(item, 'end_year', 'endYear', 'EndYear') ?? null,
  notes: getOr<string>(item, '', 'notes', 'Notes'),
  createdAt: get<string>(item, 'created_at', 'createdAt', 'CreatedAt'),
  updatedAt: get<string>(item, 'updated_at', 'updatedAt', 'UpdatedAt'),
})

export const toPropertyLink = (item: ApiRecord): PropertyLinkRecord => ({
  id: get<string>(item, 'id', 'ID') ?? '',
  propertyScenarioId: get<string>(item, 'property_scenario_id', 'propertyScenarioId', 'PropertyScenarioId') ?? '',
  assetId: getOr<string>(item, '', 'asset_id', 'assetId', 'AssetID', 'AssetId'),
  liabilityId: getOr<string>(item, '', 'liability_id', 'liabilityId', 'LiabilityID', 'LiabilityId'),
  createdAt: getOr<string>(item, '', 'created_at', 'createdAt', 'CreatedAt'),
  updatedAt: getOr<string>(item, '', 'updated_at', 'updatedAt', 'UpdatedAt'),
})

export const toPropertyScenario = (item: ApiRecord): PropertyScenarioRecord => ({
  id: getOr<string>(item, '', 'id', 'ID'),
  propertyType: getOr<string>(item, '', 'property_type', 'propertyType'),
  headline: getOr<string>(item, '', 'headline'),
  propertyPrice: Number(get<number | string>(item, 'property_price', 'propertyPrice') ?? 0),
  downPayment: Number(get<number | string>(item, 'down_payment', 'downPayment') ?? 0),
  loanAmount: Number(get<number | string>(item, 'loan_amount', 'loanAmount') ?? 0),
  interestRate: Number(get<number | string>(item, 'interest_rate', 'interestRate') ?? 0),
  loanTenure: Number(get<number | string>(item, 'loan_tenure', 'loanTenure') ?? 0),
  notes: getOr<string>(item, '', 'notes'),
  updatedAt: getOr<string>(item, '', 'updated_at', 'updatedAt', 'UpdatedAt'),
})

export const toGrowthConfig = (item: ApiRecord): GrowthConfig => ({
  id: get<string>(item, 'id', 'ID') ?? '',
  category: get<string>(item, 'category', 'Category') ?? '',
  annualRatePct: getOr<number>(item, 0, 'annual_rate_pct', 'annualRatePct', 'AnnualRatePct'),
  lowerBoundPct: getOr<number>(item, -50, 'lower_bound_pct', 'lowerBoundPct', 'LowerBoundPct'),
  upperBoundPct: getOr<number>(item, 50, 'upper_bound_pct', 'upperBoundPct', 'UpperBoundPct'),
  updatedAt: get<string>(item, 'updated_at', 'updatedAt', 'UpdatedAt'),
})

// =============================================================================
// CPF mappers
// =============================================================================

export const toCPFAccount = (item: ApiRecord): CPFAccount => {
  // Backend returns decimal values as strings, parse them to numbers
  const parseBalance = (val: unknown): number => {
    if (val === undefined || val === null) return 0
    return typeof val === 'string' ? parseFloat(val) || 0 : Number(val) || 0
  }

  const id = get<string>(item, 'id') ?? ''
  const createdAt = getOr<string>(item, new Date().toISOString(), 'createdAt', 'created_at')

  return {
    id,
    userId: getOr<string>(item, '', 'userId', 'user_id'),
    earner: getOr<string>(item, '', 'earner', 'Earner'),
    personId: get<string>(item, 'personId', 'person_id', 'PersonId') ?? null,
    parentId: getOr<string>(item, id, 'parentId', 'parent_id'),
    startDate: getOr<string>(item, createdAt, 'startDate', 'start_date'),
    endDate: get<string>(item, 'endDate', 'end_date'),
    oaBalance: parseBalance(get(item, 'oaBalance', 'oa_balance', 'OABalance')),
    saBalance: parseBalance(get(item, 'saBalance', 'sa_balance', 'SABalance')),
    maBalance: parseBalance(get(item, 'maBalance', 'ma_balance', 'MABalance')),
    raBalance: parseBalance(get(item, 'raBalance', 'ra_balance', 'RABalance')),
    oaUsedForHousing: parseBalance(get(item, 'oaUsedForHousing', 'oa_used_for_housing', 'OAUsedForHousing')),
    housingStartDate: get<string>(item, 'housingStartDate', 'housing_start_date'),
    dateOfBirth: getOr<string>(item, '', 'dateOfBirth', 'date_of_birth'),
    residencyStatus: getOr<ResidencyStatus>(item, 'citizen', 'residencyStatus', 'residency_status'),
    prGrantDate: get<string>(item, 'prGrantDate', 'pr_grant_date'),
    createdAt,
    updatedAt: getOr<string>(item, new Date().toISOString(), 'updatedAt', 'updated_at'),
  }
}

/** Default CPF configuration data structure */
const defaultCPFConfigData: CPFConfigData = {
  owCeiling: 6800,
  annualCeiling: 102000,
  cpfAnnualLimit: 37740,
  retirementSums: { brs: 99400, frs: 198800, ers: 298200 },
  bhs: 71500,
  interestRates: { oa: 2.5, sa: 4.0, ma: 4.0, ra: 4.0, extraFirst60k: 1.0, extraFirst30kAbove55: 2.0, extraNext30kAbove55: 1.0 },
  contributionRates: {
    citizenAndPR3Plus: {
      upTo55: { employee: 20, employer: 17 },
      above55To60: { employee: 15, employer: 14.5 },
      above60To65: { employee: 9.5, employer: 11.5 },
      above65To70: { employee: 7.5, employer: 9 },
      above70: { employee: 5, employer: 7.5 },
    },
    prYear1: {
      upTo55: { employee: 5, employer: 4 },
      above55To60: { employee: 5, employer: 4 },
      above60To65: { employee: 5, employer: 4 },
      above65To70: { employee: 5, employer: 4 },
      above70: { employee: 5, employer: 4 },
    },
    prYear2: {
      upTo55: { employee: 15, employer: 9 },
      above55To60: { employee: 12.5, employer: 8 },
      above60To65: { employee: 7.5, employer: 6 },
      above65To70: { employee: 5, employer: 4 },
      above70: { employee: 5, employer: 4 },
    },
  },
  allocationRates: {
    upTo35: { oa: 0.6216, sa: 0.1621, ma: 0.2162 },
    above35To45: { oa: 0.5675, sa: 0.1891, ma: 0.2432 },
    above45To50: { oa: 0.5135, sa: 0.2162, ma: 0.2702 },
    above50To55: { oa: 0.4054, sa: 0.2973, ma: 0.2973 },
    above55To60: { oa: 0.4407, sa: 0.1017, ma: 0.4576 },
    above60To65: { oa: 0.2381, sa: 0.0952, ma: 0.6667 },
    above65: { oa: 0.08, sa: 0.08, ma: 0.84 },
  },
}

export const toCPFConfiguration = (item: ApiRecord): CPFConfiguration => ({
  id: get<string>(item, 'id', 'ID') ?? '',
  year: get<number>(item, 'year', 'Year') ?? 0,
  effectiveFrom: getOr<string>(item, '', 'effective_from', 'effectiveFrom', 'EffectiveFrom'),
  effectiveTo: get<string>(item, 'effective_to', 'effectiveTo', 'EffectiveTo'),
  config: getOr<CPFConfigData>(item, defaultCPFConfigData, 'config', 'Config'),
  createdAt: getOr<string>(item, new Date().toISOString(), 'created_at', 'createdAt', 'CreatedAt'),
  updatedAt: getOr<string>(item, new Date().toISOString(), 'updated_at', 'updatedAt', 'UpdatedAt'),
})

export const toCPFContributionPreview = (item: ApiRecord): CPFContributionPreview => {
  const allocation = asRecord(get(item, 'allocation', 'Allocation'))
  const ratesApplied = asRecord(get(item, 'rates_applied', 'ratesApplied'))

  return {
    grossWage: get<number>(item, 'gross_wage', 'grossWage', 'GrossWage') ?? 0,
    cappedWage: get<number>(item, 'capped_wage', 'cappedWage', 'CappedWage') ?? 0,
    employeeContribution: get<number>(item, 'employee_contribution', 'employeeContribution', 'EmployeeContribution') ?? 0,
    employerContribution: get<number>(item, 'employer_contribution', 'employerContribution', 'EmployerContribution') ?? 0,
    totalContribution: get<number>(item, 'total_contribution', 'totalContribution', 'TotalContribution') ?? 0,
    takeHomePay: get<number>(item, 'take_home_pay', 'takeHomePay', 'TakeHomePay') ?? 0,
    allocation: {
      oa: getOr<number>(allocation, 0, 'oa', 'OA'),
      sa: getOr<number>(allocation, 0, 'sa', 'SA'),
      ma: getOr<number>(allocation, 0, 'ma', 'MA'),
      ra: getOr<number>(allocation, 0, 'ra', 'RA'),
    },
    ratesApplied: {
      employee: getOr<number>(ratesApplied, 0, 'employee'),
      employer: getOr<number>(ratesApplied, 0, 'employer'),
      ageGroup: getOr<string>(ratesApplied, '', 'age_group', 'ageGroup'),
      residencyStatus: getOr<ResidencyStatus>(ratesApplied, 'citizen', 'residency_status', 'residencyStatus'),
    },
  }
}

// =============================================================================
// Scenario helpers
// =============================================================================

export const normalizeImpact = (impact: ApiRecord): ScenarioImpactDto => {
  const startDateRaw = get<string>(impact, 'startDate', 'start_date', 'StartDate', 'start_month', 'startMonth') ?? ''
  const endDateRaw = get<string>(impact, 'endDate', 'end_date', 'EndDate')

  return {
    impactKind: getOr<string>(impact, 'delta', 'impactKind', 'impact_kind', 'ImpactKind') as ScenarioImpactDto['impactKind'],
    targetType: getOr<string>(impact, 'asset', 'targetType', 'target_type', 'TargetType') as ScenarioImpactDto['targetType'],
    parentId: get<string>(impact, 'parentId', 'parent_id', 'ParentId'),
    amount: String(get(impact, 'amount', 'Amount') ?? '0'),
    currency: getOr<string>(impact, 'SGD', 'currency', 'Currency'),
    cadence: getOr<string>(impact, 'monthly', 'cadence', 'Cadence') as ScenarioImpactDto['cadence'],
    startDate: startDateRaw.slice(0, 10),
    endDate: endDateRaw ? endDateRaw.slice(0, 10) : undefined,
    name: get<string>(impact, 'name', 'Name', 'target_name', 'targetName'),
    frequency: get<string>(impact, 'frequency', 'Frequency', 'target_frequency', 'targetFrequency'),
    notes: getOr<string>(impact, '', 'notes', 'Notes'),
    // Advanced fields for start impacts (growthRate also used for percentage deltas)
    category: get<string>(impact, 'category', 'Category'),
    growthRate: get<number>(impact, 'growthRate', 'growth_rate', 'GrowthRate'),
    growthStrategy: get<string>(impact, 'growthStrategy', 'growth_strategy', 'GrowthStrategy'),
    // Liability-specific fields
    interestRate: get<number>(impact, 'interestRate', 'interest_rate', 'InterestRate'),
    minimumPayment: get<number>(impact, 'minimumPayment', 'minimum_payment', 'MinimumPayment'),
  }
}

export const normalizeScenarioEvent = (data: unknown): ScenarioEvent => {
  const record = asRecord(data)
  const rawImpacts = get<unknown[]>(record, 'impacts', 'Impacts') ?? []
  const impacts = Array.isArray(rawImpacts) ? rawImpacts.map(i => normalizeImpact(asRecord(i))) : []

  return scenarioEventFromDto({
    id: getOr<string>(record, '', 'id', 'ID'),
    name: getOr<string>(record, '', 'name', 'Name'),
    description: getOr<string>(record, '', 'description', 'Description'),
    occursOn: getOr<string>(record, '', 'occursOn', 'occurs_on', 'OccursOn'),
    displayIcon: getOr<string>(record, '', 'displayIcon', 'display_icon', 'DisplayIcon'),
    displayColor: getOr<string>(record, '', 'displayColor', 'display_color', 'DisplayColor'),
    tags: get<string[]>(record, 'tags', 'Tags') ?? [],
    scenarioId: get<string>(record, 'scenarioId', 'scenario_id', 'ScenarioID', 'ScenarioId'),
    isIncluded: getOr<boolean>(record, true, 'isIncluded', 'is_included', 'IsIncluded'),
    impacts,
  })
}

export const normalizeScenarioEventList = (payload: unknown): ScenarioEvent[] => {
  if (Array.isArray(payload)) {
    return payload.map(normalizeScenarioEvent)
  }
  const record = asRecord(payload)
  const items = get<unknown[]>(record, 'items') ?? []
  return items.map(normalizeScenarioEvent)
}
