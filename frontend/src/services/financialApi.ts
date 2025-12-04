import type { Asset, Liability, Income, Expense, CashAccount, GrowthConfig, UserSettings, PaginatedResponse, PaginationParams } from '@/types/financial'
import type { CPFAccount, CPFAccountCreatePayload, CPFAccountUpdatePayload, CPFConfiguration, CPFContributionPreview, ResidencyStatus } from '@/types/cpf'
import type { PropertyLinkRecord, PropertyScenarioRecord } from '@/types/property'
import {
  type ScenarioEvent,
  type ScenarioImpactDto,
  scenarioEventFromDto,
  scenarioEventToDto,
  scenarioImpactToDto,
} from '@/types/scenario'
import type { ScenarioEventDTO, ScenarioEventsDTO } from '@/types/api-dtos'
import type { TimelineResponse, TimelineEditRequest } from '@/types/timeline'

function getApiBaseUrl() {
  // Use relative path - requests go through Next.js BFF at /api/v1/*
  // which handles auth and proxies to the Go backend
  return '/api/v1'
}

const API_BASE = getApiBaseUrl()

const normalizeImpact = (impact: any): ScenarioImpactDto => ({
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

async function jsonRequest<T>(url: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  })
  if (!res.ok) {
    const message = await res.text()
    throw new Error(message || res.statusText)
  }
  if (res.status === 204) {
    return undefined as unknown as T
  }
  return res.json()
}

const toAsset = (item: any): Asset => ({
  id: item.id ?? item.ID,
  name: item.name ?? item.Name,
  category: item.category ?? item.Category,
  currentValue: item.current_value ?? item.currentValue ?? item.CurrentValue,
  annualGrowthRate: item.annual_growth_rate ?? item.annualGrowthRate ?? item.AnnualGrowthRate,
  notes: item.notes ?? item.Notes ?? '',
  updatedAt: item.updated_at ?? item.updatedAt ?? item.UpdatedAt,
  parentId: item.parent_id ?? item.parentId ?? item.ParentID,
})

const toLiability = (item: any): Liability => ({
  id: item.id ?? item.ID,
  name: item.name ?? item.Name,
  category: item.category ?? item.Category,
  currentBalance: item.current_balance ?? item.currentBalance ?? item.CurrentBalance,
  interestRateApr: item.interest_rate_apr ?? item.interestRateApr ?? item.InterestRateAPR ?? item.InterestRateApr,
  minimumPayment: item.minimum_payment ?? item.minimumPayment ?? item.MinimumPayment,
  notes: item.notes ?? item.Notes ?? '',
  updatedAt: item.updated_at ?? item.updatedAt ?? item.UpdatedAt,
  parentId: item.parent_id ?? item.parentId ?? item.ParentID,
})

const toIncome = (item: any): Income => ({
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
  // CPF-related fields
  incomeType: item.income_type ?? item.incomeType ?? item.IncomeType,
  cpfWageType: item.cpf_wage_type ?? item.cpfWageType ?? item.CpfWageType,
  cpfApplicable: item.cpf_applicable ?? item.cpfApplicable ?? item.CPFApplicable,
})

const toExpense = (item: any): Expense => ({
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

const toCashAccount = (item: any): CashAccount => ({
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

const toPropertyLink = (item: any): PropertyLinkRecord => ({
  id: item.id ?? item.ID,
  propertyScenarioId: item.property_scenario_id ?? item.propertyScenarioId ?? item.PropertyScenarioId,
  assetId: item.asset_id ?? item.assetId ?? item.AssetID ?? item.AssetId,
  liabilityId: item.liability_id ?? item.liabilityId ?? item.LiabilityID ?? item.LiabilityId,
  createdAt: item.created_at ?? item.createdAt ?? item.CreatedAt ?? '',
  updatedAt: item.updated_at ?? item.updatedAt ?? item.UpdatedAt ?? '',
})

const toPropertyScenario = (item: any): PropertyScenarioRecord => ({
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

const toGrowthConfig = (item: any): GrowthConfig => ({
  id: item.id ?? item.ID,
  category: item.category ?? item.Category,
  annualRatePct: item.annual_rate_pct ?? item.annualRatePct ?? item.AnnualRatePct ?? 0,
  lowerBoundPct: item.lower_bound_pct ?? item.lowerBoundPct ?? item.LowerBoundPct ?? -50,
  upperBoundPct: item.upper_bound_pct ?? item.upperBoundPct ?? item.UpperBoundPct ?? 50,
  updatedAt: item.updated_at ?? item.updatedAt ?? item.UpdatedAt,
})

// Helper to build URL with pagination params
function buildPaginatedUrl(base: string, params?: PaginationParams): string {
  const url = new URL(base, window.location.origin)
  if (params?.limit !== undefined) url.searchParams.set('limit', params.limit.toString())
  if (params?.offset !== undefined) url.searchParams.set('offset', params.offset.toString())
  return url.pathname + url.search
}

export const financialApi = {
  // Assets
  async listAssets(params?: PaginationParams): Promise<PaginatedResponse<Asset>> {
    const url = buildPaginatedUrl(`${API_BASE}/assets`, params)
    const data = await jsonRequest<any>(url)
    // Handle both paginated response and empty/error cases
    const items = Array.isArray(data?.data) ? data.data : []
    return {
      data: items.map(toAsset),
      total: data?.total ?? items.length,
      limit: data?.limit ?? params?.limit ?? 20,
      offset: data?.offset ?? params?.offset ?? 0,
      hasMore: data?.hasMore ?? false,
    }
  },
  async createAsset(payload: Omit<Asset, 'id' | 'updatedAt'>): Promise<Asset> {
    const body = {
      name: payload.name,
      category: payload.category,
      currentValue: payload.currentValue,
      annualGrowthRate: payload.annualGrowthRate,
      notes: payload.notes,
    }
    const data = await jsonRequest<any>(`${API_BASE}/assets`, { method: 'POST', body: JSON.stringify(body) })
    return toAsset(data)
  },
  async updateAsset(id: string, payload: Partial<Asset>): Promise<Asset> {
    const body: Record<string, any> = {
      name: payload.name,
      category: payload.category,
      currentValue: payload.currentValue,
      annualGrowthRate: payload.annualGrowthRate,
      notes: payload.notes,
    }
    const data = await jsonRequest<any>(`${API_BASE}/assets/${id}`, { method: 'PUT', body: JSON.stringify(body) })
    return toAsset(data)
  },
  async deleteAsset(id: string): Promise<void> {
    await jsonRequest<void>(`${API_BASE}/assets/${id}`, { method: 'DELETE' })
  },
  async convertAssetToProperty(id: string): Promise<Asset> {
    const data = await jsonRequest<any>(`${API_BASE}/assets/${id}/convert-to-property`, { method: 'PUT' })
    return toAsset(data)
  },

  async getScenarioEvent(id: string): Promise<ScenarioEvent> {
    if (!id) throw new Error('Scenario event id is required')
    const data = await jsonRequest<any>(`${API_BASE}/scenario-events/${encodeURIComponent(id)}`)
    if (process.env.NODE_ENV === 'development') {
      const rawImpacts = data.impacts ?? data.Impacts ?? []
      console.debug('[financialApi.getScenarioEvent] response', {
        id: data.id ?? data.ID ?? id,
        impactCount: Array.isArray(rawImpacts) ? rawImpacts.length : null,
        rawImpacts: rawImpacts,
        keys: Object.keys(data || {}),
      })
    }
    const dto = {
      id: data.id ?? data.ID ?? id,
      name: data.name ?? data.Name ?? '',
      description: data.description ?? data.Description ?? '',
      occurs_on: data.occurs_on ?? data.occursOn ?? data.OccursOn ?? '',
      display_icon: data.display_icon ?? data.displayIcon ?? data.DisplayIcon ?? '',
      display_color: data.display_color ?? data.displayColor ?? data.DisplayColor ?? '',
      tags: data.tags ?? data.Tags ?? [],
      scenario_id: data.scenario_id ?? data.scenarioId ?? data.ScenarioID ?? data.ScenarioId,
      is_included: data.is_included ?? data.isIncluded ?? data.IsIncluded ?? true,
      impacts: Array.isArray(data.impacts)
        ? data.impacts.map(normalizeImpact)
        : Array.isArray(data.Impacts)
          ? data.Impacts.map(normalizeImpact)
          : [],
    }
    return scenarioEventFromDto(dto)
  },

  // Liabilities
  async listLiabilities(params?: PaginationParams): Promise<PaginatedResponse<Liability>> {
    const url = buildPaginatedUrl(`${API_BASE}/liabilities`, params)
    const data = await jsonRequest<any>(url)
    // Handle both paginated response and empty/error cases
    const items = Array.isArray(data?.data) ? data.data : []
    return {
      data: items.map(toLiability),
      total: data?.total ?? items.length,
      limit: data?.limit ?? params?.limit ?? 20,
      offset: data?.offset ?? params?.offset ?? 0,
      hasMore: data?.hasMore ?? false,
    }
  },
  async createLiability(payload: Omit<Liability, 'id' | 'updatedAt'>): Promise<Liability> {
    const body = {
      name: payload.name,
      category: payload.category,
      currentBalance: payload.currentBalance,
      interestRateApr: payload.interestRateApr,
      minimumPayment: payload.minimumPayment,
      notes: payload.notes,
    }
    const data = await jsonRequest<any>(`${API_BASE}/liabilities`, { method: 'POST', body: JSON.stringify(body) })
    return toLiability(data)
  },
  async updateLiability(id: string, payload: Partial<Liability>): Promise<Liability> {
    const body: Record<string, any> = {
      name: payload.name,
      category: payload.category,
      currentBalance: payload.currentBalance,
      interestRateApr: payload.interestRateApr,
      minimumPayment: payload.minimumPayment,
      notes: payload.notes,
    }
    const data = await jsonRequest<any>(`${API_BASE}/liabilities/${id}`, { method: 'PUT', body: JSON.stringify(body) })
    return toLiability(data)
  },
  async deleteLiability(id: string): Promise<void> {
    await jsonRequest<void>(`${API_BASE}/liabilities/${id}`, { method: 'DELETE' })
  },
  async convertLiabilityToProperty(id: string): Promise<Liability> {
    const data = await jsonRequest<any>(`${API_BASE}/liabilities/${id}/convert-to-property`, { method: 'PUT' })
    return toLiability(data)
  },

  // Incomes
  async listIncomes(params?: PaginationParams): Promise<PaginatedResponse<Income>> {
    const url = buildPaginatedUrl(`${API_BASE}/cashflow/incomes`, params)
    const data = await jsonRequest<any>(url)
    // Handle both paginated response and empty/error cases
    const items = (data && Array.isArray(data.data)) ? data.data : []
    return {
      data: items.map(toIncome),
      total: data?.total ?? items.length,
      limit: data?.limit ?? params?.limit ?? 20,
      offset: data?.offset ?? params?.offset ?? 0,
      hasMore: data?.hasMore ?? false,
    }
  },
  async createIncome(payload: Omit<Income, 'id' | 'updatedAt'> & { startYear?: number; endYear?: number }): Promise<Income> {
    const startDate = payload.startDate ?? new Date().toISOString()
    const body: Record<string, unknown> = {
      source: payload.source,
      amount: payload.amount,
      frequency: payload.frequency,
      startDate,
      category: payload.category,
      growthRate: payload.growthRate ?? 3.0,
      notes: payload.notes,
    }
    if (payload.startYear !== undefined) {
      body.startYear = payload.startYear
    }
    if (payload.endYear !== undefined) {
      body.endYear = payload.endYear
    }
    const data = await jsonRequest<any>(`${API_BASE}/cashflow/incomes`, { method: 'POST', body: JSON.stringify(body) })
    return toIncome(data)
  },
  async updateIncome(id: string, payload: Partial<Income>): Promise<Income> {
    const body: Record<string, any> = {
      source: payload.source,
      amount: payload.amount,
      frequency: payload.frequency,
      startDate: payload.startDate,
      category: payload.category,
      growthRate: payload.growthRate,
      notes: payload.notes,
    }
    const data = await jsonRequest<any>(`${API_BASE}/cashflow/incomes/${id}`, { method: 'PUT', body: JSON.stringify(body) })
    return toIncome(data)
  },
  async deleteIncome(id: string): Promise<void> {
    await jsonRequest<void>(`${API_BASE}/cashflow/incomes/${id}`, { method: 'DELETE' })
  },

  // Expenses
  async listExpenses(params?: PaginationParams): Promise<PaginatedResponse<Expense>> {
    const url = buildPaginatedUrl(`${API_BASE}/cashflow/expenses`, params)
    const data = await jsonRequest<any>(url)
    // Handle both paginated response and empty/error cases
    const items = Array.isArray(data?.data) ? data.data : []
    return {
      data: items.map(toExpense),
      total: data?.total ?? items.length,
      limit: data?.limit ?? params?.limit ?? 20,
      offset: data?.offset ?? params?.offset ?? 0,
      hasMore: data?.hasMore ?? false,
    }
  },
  async createExpense(payload: Omit<Expense, 'id' | 'updatedAt'> & { startYear?: number; endYear?: number }): Promise<Expense> {
    const body = {
      payee: payload.payee,
      amount: payload.amount,
      frequency: payload.frequency,
      category: payload.category,
      growthRate: payload.growthRate ?? 2.0,
      notes: payload.notes,
      ...(payload.startYear !== undefined && { startYear: payload.startYear }),
      ...(payload.endYear !== undefined && { endYear: payload.endYear }),
    }
    const data = await jsonRequest<Expense>(`${API_BASE}/cashflow/expenses`, { method: 'POST', body: JSON.stringify(body) })
    return toExpense(data)
  },
  async updateExpense(id: string, payload: Partial<Expense>): Promise<Expense> {
    const body = {
      payee: payload.payee,
      amount: payload.amount,
      frequency: payload.frequency,
      category: payload.category,
      growthRate: payload.growthRate,
      notes: payload.notes,
    }
    const data = await jsonRequest<Expense>(`${API_BASE}/cashflow/expenses/${id}`, { method: 'PUT', body: JSON.stringify(body) })
    return toExpense(data)
  },
  async deleteExpense(id: string): Promise<void> {
    await jsonRequest<void>(`${API_BASE}/cashflow/expenses/${id}`, { method: 'DELETE' })
  },

  // Property scenarios (planner) with optional linking
  async createPropertyScenario(payload: {
    propertyType: string
    headline: string
    subheadline?: string
    propertyPrice: number
    downPayment: number
    loanAmount: number
    interestRate: number
    loanTenure: number
    notes?: string
    assetId?: string
    liabilityId?: string
  }): Promise<PropertyScenarioRecord> {
    const body = {
      propertyType: payload.propertyType,
      headline: payload.headline,
      subheadline: payload.subheadline ?? '',
      propertyPrice: payload.propertyPrice,
      downPayment: payload.downPayment || 0,
      loanAmount: payload.loanAmount || 0,
      interestRate: payload.interestRate || 0,
      loanTenure: payload.loanTenure || 0,
      notes: payload.notes ?? '',
      asset_id: payload.assetId,
      liability_id: payload.liabilityId,
    }
    const data = await jsonRequest<any>(`${API_BASE}/property-planner/scenarios`, {
      method: 'POST',
      body: JSON.stringify(body),
    })
    return toPropertyScenario(data)
  },

  // Property links
  async createPropertyLink(payload: { propertyScenarioId?: string; assetId: string; liabilityId: string }): Promise<{
    link: PropertyLinkRecord
    scenario: PropertyScenarioRecord
  }> {
    const body = {
      property_scenario_id: payload.propertyScenarioId,
      asset_id: payload.assetId,
      liability_id: payload.liabilityId,
    }
    const data = await jsonRequest<any>(`${API_BASE}/property-links`, { method: 'POST', body: JSON.stringify(body) })
    return {
      link: toPropertyLink(data.property_link ?? data.link ?? data),
      scenario: toPropertyScenario(data.property_scenario ?? data.scenario ?? data),
    }
  },

  async updatePropertyLink(id: string, payload: { propertyScenarioId: string; assetId: string; liabilityId: string }): Promise<PropertyLinkRecord> {
    const body = {
      property_scenario_id: payload.propertyScenarioId,
      asset_id: payload.assetId,
      liability_id: payload.liabilityId,
    }
    const data = await jsonRequest<any>(`${API_BASE}/property-links/${id}`, { method: 'PUT', body: JSON.stringify(body) })
    return toPropertyLink(data)
  },

  async listPropertyLinks(scenarioId: string): Promise<PropertyLinkRecord[]> {
    const data = await jsonRequest<any[]>(`${API_BASE}/property-links?property_scenario_id=${encodeURIComponent(scenarioId)}`)
    return (data ?? []).map(toPropertyLink)
  },

  async listPropertyLinksByAsset(assetId: string): Promise<PropertyLinkRecord[]> {
    const data = await jsonRequest<any[]>(`${API_BASE}/property-links?asset_id=${encodeURIComponent(assetId)}`)
    return (data ?? []).map(toPropertyLink)
  },

  async listPropertyLinksByLiability(liabilityId: string): Promise<PropertyLinkRecord[]> {
    const data = await jsonRequest<any[]>(`${API_BASE}/property-links?liability_id=${encodeURIComponent(liabilityId)}`)
    return (data ?? []).map(toPropertyLink)
  },

  async listAllPropertyLinks(params?: PaginationParams): Promise<PaginatedResponse<PropertyLinkRecord>> {
    const url = buildPaginatedUrl(`${API_BASE}/property-links`, params)
    const data = await jsonRequest<any>(url)
    // Handle both paginated response and empty/error cases
    const items = (data && Array.isArray(data.data)) ? data.data : []
    return {
      data: items.map(toPropertyLink),
      total: data?.total ?? items.length,
      limit: data?.limit ?? params?.limit ?? 20,
      offset: data?.offset ?? params?.offset ?? 0,
      hasMore: data?.hasMore ?? false,
    }
  },

  async deletePropertyScenario(id: string): Promise<void> {
    if (!id) return
    await jsonRequest<void>(`${API_BASE}/property-planner/scenarios/${id}`, { method: 'DELETE' })
  },

  async getPropertyScenario(id: string): Promise<PropertyScenarioRecord> {
    const data = await jsonRequest<any>(`${API_BASE}/property-planner/scenarios/${id}`)
    return toPropertyScenario(data)
  },

  // Scenario events (universal schema)
  async createScenarioEvent(payload: ScenarioEvent): Promise<ScenarioEvent> {
    const normalizedIcon = payload.displayIcon?.trim()
    if (!normalizedIcon) {
      throw new Error('displayIcon is required when creating a scenario event')
    }
    const body = scenarioEventToDto({
      ...payload,
      displayIcon: normalizedIcon,
      tags: payload.tags ?? [],
      isIncluded: payload.isIncluded ?? true,
    })
    const data = await jsonRequest<any>(`${API_BASE}/scenario-events`, {
      method: 'POST',
      body: JSON.stringify(body),
    })
    const dto = {
      id: data.id ?? data.ID,
      name: data.name ?? data.Name ?? payload.name,
      description: data.description ?? data.Description ?? payload.description,
      occurs_on: data.occurs_on ?? data.OccursOn ?? data.occursOn ?? payload.occursOn,
      display_icon: data.display_icon ?? data.DisplayIcon ?? payload.displayIcon,
      display_color: data.display_color ?? data.DisplayColor ?? payload.displayColor ?? '',
      tags: data.tags ?? data.Tags ?? payload.tags ?? [],
      scenario_id:
        data.scenario_id ?? data.ScenarioID ?? data.ScenarioId ?? data.scenarioId ?? payload.scenarioId,
      is_included: data.is_included ?? data.IsIncluded ?? data.isIncluded ?? payload.isIncluded ?? true,
      impacts: Array.isArray(data.impacts)
        ? data.impacts.map(normalizeImpact)
        : Array.isArray(data.Impacts)
          ? data.Impacts.map(normalizeImpact)
          : Array.isArray(payload.impacts)
            ? payload.impacts.map(scenarioImpactToDto)
            : [],
    }
    return scenarioEventFromDto(dto)
  },

  async updateScenarioEvent(id: string, payload: ScenarioEvent): Promise<ScenarioEvent> {
    if (!id) throw new Error('Scenario event id is required')
    const normalizedIcon = payload.displayIcon?.trim()
    if (!normalizedIcon) {
      throw new Error('displayIcon is required when updating a scenario event')
    }
    const body = scenarioEventToDto({
      ...payload,
      displayIcon: normalizedIcon,
      tags: payload.tags ?? [],
      isIncluded: payload.isIncluded ?? true,
    })
    const data = await jsonRequest<any>(`${API_BASE}/scenario-events/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    })
    const dto = {
      id: data.id ?? data.ID ?? id,
      name: data.name ?? data.Name ?? payload.name,
      description: data.description ?? data.Description ?? payload.description,
      occurs_on: data.occurs_on ?? data.OccursOn ?? data.occursOn ?? payload.occursOn,
      display_icon: data.display_icon ?? data.DisplayIcon ?? payload.displayIcon,
      display_color: data.display_color ?? data.DisplayColor ?? payload.displayColor ?? '',
      tags: data.tags ?? data.Tags ?? payload.tags ?? [],
      scenario_id:
        data.scenario_id ?? data.ScenarioID ?? data.ScenarioId ?? data.scenarioId ?? payload.scenarioId,
      is_included: data.is_included ?? data.IsIncluded ?? data.isIncluded ?? payload.isIncluded ?? true,
      impacts: Array.isArray(data.impacts)
        ? data.impacts.map(normalizeImpact)
        : Array.isArray(data.Impacts)
          ? data.Impacts.map(normalizeImpact)
          : Array.isArray(payload.impacts)
            ? payload.impacts.map(scenarioImpactToDto)
            : [],
    }
    return scenarioEventFromDto(dto)
  },

  async listScenarioEvents(): Promise<ScenarioEvent[]> {
    const normalize = (item: ScenarioEventDTO): ScenarioEvent =>
      scenarioEventFromDto({
        id: item.id ?? item.ID ?? '',
        name: item.name ?? item.Name ?? '',
        description: item.description ?? item.Description ?? '',
        occurs_on: item.occurs_on ?? item.occursOn ?? item.OccursOn ?? '',
        display_icon: item.display_icon ?? item.displayIcon ?? item.DisplayIcon ?? '',
        display_color: item.display_color ?? item.displayColor ?? item.DisplayColor ?? '',
        tags: item.tags ?? item.Tags ?? [],
        scenario_id: item.scenario_id ?? item.scenarioId ?? item.ScenarioID ?? item.ScenarioId ?? undefined,
        is_included: item.is_included ?? item.isIncluded ?? item.IsIncluded ?? true,
        impacts: Array.isArray(item.impacts)
          ? item.impacts.map(normalizeImpact)
          : Array.isArray((item as any).Impacts)
            ? (item as any).Impacts.map(normalizeImpact)
            : [],
      })

    const data = await jsonRequest<ScenarioEventsDTO>(`${API_BASE}/scenario-events`)
    const list = Array.isArray(data) ? data : Array.isArray(data.items) ? data.items : []
    return list.map(normalize)
  },

  async deleteScenarioEvent(id: string): Promise<void> {
    if (!id) throw new Error('Scenario event id is required')
    await jsonRequest<void>(`${API_BASE}/scenario-events/${encodeURIComponent(id)}`, { method: 'DELETE' })
  },

  async deleteAllScenarioEvents(): Promise<void> {
    const events = await financialApi.listScenarioEvents()
    await Promise.all(events.filter(e => e.id).map(event => financialApi.deleteScenarioEvent(event.id!)))
  },

  // Property scenarios list
  async listPropertyScenarios(): Promise<PropertyScenarioRecord[]> {
    const data = await jsonRequest<any[]>(`${API_BASE}/property-planner/scenarios`)
    return data.map(toPropertyScenario)
  },

  // Timeline
  async getTimeline(): Promise<TimelineResponse> {
    // Always include scenarios so timeline items have eventImpacts populated
    const data = await jsonRequest<TimelineResponse>(`${API_BASE}/financial/timeline?include_scenarios=true`)
    return data
  },

  async updateTimelineYear(request: TimelineEditRequest): Promise<TimelineResponse> {
    const data = await jsonRequest<TimelineResponse>(`${API_BASE}/financial/timeline/${request.year}`, {
      method: 'PUT',
      body: JSON.stringify({ edits: request.edits, note: request.note }),
    })
    return data
  },

  // Bulk delete operations for sample data and reset
  async deleteAllAssets(): Promise<void> {
    const result = await financialApi.listAssets({ limit: -1 })
    await Promise.all(result.data.map(asset => financialApi.deleteAsset(asset.id)))
  },

  async deleteAllLiabilities(): Promise<void> {
    const result = await financialApi.listLiabilities({ limit: -1 })
    await Promise.all(result.data.map(liability => financialApi.deleteLiability(liability.id)))
  },

  async deleteAllIncomes(): Promise<void> {
    const result = await financialApi.listIncomes({ limit: -1 })
    await Promise.all(result.data.map(income => financialApi.deleteIncome(income.id)))
  },

  async deleteAllExpenses(): Promise<void> {
    const result = await financialApi.listExpenses({ limit: -1 })
    await Promise.all(result.data.map(expense => financialApi.deleteExpense(expense.id)))
  },

  // Cash Accounts
  async listCashAccounts(): Promise<CashAccount[]> {
    const data = await jsonRequest<any[]>(`${API_BASE}/cash-accounts`)
    return data.map(toCashAccount)
  },

  async getCashAccount(id: string): Promise<CashAccount> {
    const data = await jsonRequest<any>(`${API_BASE}/cash-accounts/${id}`)
    return toCashAccount(data)
  },

  async createCashAccount(payload: Omit<CashAccount, 'id' | 'createdAt' | 'updatedAt'>): Promise<CashAccount> {
    const body = {
      name: payload.name,
      balance: payload.balance,
      interest_rate: payload.interestRate,
      bank_name: payload.bankName,
      account_type: payload.accountType,
      is_accumulator: payload.isAccumulator,
      start_year: payload.startYear,
      end_year: payload.endYear,
      notes: payload.notes,
    }
    const data = await jsonRequest<any>(`${API_BASE}/cash-accounts`, { method: 'POST', body: JSON.stringify(body) })
    return toCashAccount(data)
  },

  async updateCashAccount(id: string, payload: Partial<CashAccount>): Promise<CashAccount> {
    const body: Record<string, any> = {
      name: payload.name,
      balance: payload.balance,
      interest_rate: payload.interestRate,
      bank_name: payload.bankName,
      account_type: payload.accountType,
      is_accumulator: payload.isAccumulator,
      start_year: payload.startYear,
      end_year: payload.endYear,
      notes: payload.notes,
    }
    const data = await jsonRequest<any>(`${API_BASE}/cash-accounts/${id}`, { method: 'PUT', body: JSON.stringify(body) })
    return toCashAccount(data)
  },

  async deleteCashAccount(id: string): Promise<void> {
    await jsonRequest<void>(`${API_BASE}/cash-accounts/${id}`, { method: 'DELETE' })
  },

  async setAccumulatorAccount(id: string): Promise<void> {
    await jsonRequest<void>(`${API_BASE}/cash-accounts/${id}/set-accumulator`, { method: 'PUT' })
  },

  async deleteAllCashAccounts(): Promise<void> {
    const accounts = await financialApi.listCashAccounts()
    await Promise.all(accounts.map(account => financialApi.deleteCashAccount(account.id)))
  },

  // Growth Configs (user defaults)
  async getGrowthConfigs(): Promise<GrowthConfig[]> {
    const data = await jsonRequest<{ growth: any[]; version: string }>(`${API_BASE}/financial/growth`)
    return data.growth.map(toGrowthConfig)
  },

  async updateGrowthConfigs(configs: GrowthConfig[]): Promise<GrowthConfig[]> {
    const body = {
      growth: configs.map(cfg => ({
        category: cfg.category,
        annualRatePct: cfg.annualRatePct,
        lowerBoundPct: cfg.lowerBoundPct,
        upperBoundPct: cfg.upperBoundPct,
      })),
    }
    const data = await jsonRequest<{ growth: any[]; version: string }>(`${API_BASE}/financial/growth`, {
      method: 'PUT',
      body: JSON.stringify(body),
    })
    return data.growth.map(toGrowthConfig)
  },

  // User Settings
  async getUserSettings(): Promise<UserSettings> {
    const data = await jsonRequest<any>(`${API_BASE}/settings`)
    return {
      id: data.id,
      startingAge: data.startingAge ?? 30,
      terminalAge: data.terminalAge ?? 65,
      yearDisplayFormat: data.yearDisplayFormat ?? 'year_number',
      autoExecuteTools: data.autoExecuteTools ?? false,
      updatedAt: data.updatedAt,
    }
  },

  async updateUserSettings(settings: UserSettings): Promise<UserSettings> {
    const data = await jsonRequest<any>(`${API_BASE}/settings`, {
      method: 'PUT',
      body: JSON.stringify({
        startingAge: settings.startingAge,
        terminalAge: settings.terminalAge,
        yearDisplayFormat: settings.yearDisplayFormat,
        autoExecuteTools: settings.autoExecuteTools,
      }),
    })
    return {
      id: data.id,
      startingAge: data.startingAge ?? 30,
      terminalAge: data.terminalAge ?? 65,
      yearDisplayFormat: data.yearDisplayFormat ?? 'year_number',
      autoExecuteTools: data.autoExecuteTools ?? false,
      updatedAt: data.updatedAt,
    }
  },

  // ============================
  // CPF Account APIs
  // ============================

  async getCPFAccount(): Promise<CPFAccount | null> {
    try {
      const data = await jsonRequest<any>(`${API_BASE}/cpf/account`)
      return toCPFAccount(data)
    } catch {
      // Return null if account doesn't exist yet
      return null
    }
  },

  async createCPFAccount(payload: CPFAccountCreatePayload): Promise<CPFAccount> {
    const body = {
      oa_balance: payload.oaBalance ?? 0,
      sa_balance: payload.saBalance ?? 0,
      ma_balance: payload.maBalance ?? 0,
      ra_balance: payload.raBalance ?? 0,
      oa_used_for_housing: payload.oaUsedForHousing ?? 0,
      housing_start_date: payload.housingStartDate,
      date_of_birth: payload.dateOfBirth,
      residency_status: payload.residencyStatus,
      pr_grant_date: payload.prGrantDate,
    }
    const data = await jsonRequest<any>(`${API_BASE}/cpf/account`, {
      method: 'POST',
      body: JSON.stringify(body),
    })
    return toCPFAccount(data)
  },

  async updateCPFAccount(payload: CPFAccountUpdatePayload): Promise<CPFAccount> {
    const body: Record<string, unknown> = {}
    if (payload.oaBalance !== undefined) body.oa_balance = payload.oaBalance
    if (payload.saBalance !== undefined) body.sa_balance = payload.saBalance
    if (payload.maBalance !== undefined) body.ma_balance = payload.maBalance
    if (payload.raBalance !== undefined) body.ra_balance = payload.raBalance
    if (payload.oaUsedForHousing !== undefined) body.oa_used_for_housing = payload.oaUsedForHousing
    if (payload.housingStartDate !== undefined) body.housing_start_date = payload.housingStartDate
    if (payload.dateOfBirth !== undefined) body.date_of_birth = payload.dateOfBirth
    if (payload.residencyStatus !== undefined) body.residency_status = payload.residencyStatus
    if (payload.prGrantDate !== undefined) body.pr_grant_date = payload.prGrantDate

    const data = await jsonRequest<any>(`${API_BASE}/cpf/account`, {
      method: 'PUT',
      body: JSON.stringify(body),
    })
    return toCPFAccount(data)
  },

  // ============================
  // CPF Configuration APIs
  // ============================

  async getCPFConfig(params?: { year?: number; date?: string }): Promise<CPFConfiguration> {
    const searchParams = new URLSearchParams()
    if (params?.year) searchParams.set('year', params.year.toString())
    if (params?.date) searchParams.set('date', params.date)
    const url = `${API_BASE}/cpf/config${searchParams.toString() ? `?${searchParams}` : ''}`
    const data = await jsonRequest<any>(url)
    return toCPFConfiguration(data)
  },

  async listCPFConfigYears(): Promise<number[]> {
    const data = await jsonRequest<{ years: number[] }>(`${API_BASE}/cpf/config/years`)
    return data.years
  },

  // ============================
  // CPF Contribution Preview API
  // ============================

  async getCPFContributionPreview(params: {
    grossWage: number
    age: number
    residencyStatus: ResidencyStatus
    cpfWageType: 'ow' | 'aw'
  }): Promise<CPFContributionPreview> {
    const searchParams = new URLSearchParams({
      gross_wage: params.grossWage.toString(),
      age: params.age.toString(),
      residency_status: params.residencyStatus,
      cpf_wage_type: params.cpfWageType,
    })
    const data = await jsonRequest<any>(`${API_BASE}/cpf/contribution-preview?${searchParams}`)
    return toCPFContributionPreview(data)
  },
}

// CPF type mappers
const toCPFAccount = (item: any): CPFAccount => ({
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

const toCPFConfiguration = (item: any): CPFConfiguration => ({
  id: item.id ?? item.ID,
  year: item.year ?? item.Year,
  effectiveFrom: item.effective_from ?? item.effectiveFrom ?? item.EffectiveFrom,
  effectiveTo: item.effective_to ?? item.effectiveTo ?? item.EffectiveTo,
  config: item.config ?? item.Config,
  createdAt: item.created_at ?? item.createdAt ?? item.CreatedAt,
  updatedAt: item.updated_at ?? item.updatedAt ?? item.UpdatedAt,
})

const toCPFContributionPreview = (item: any): CPFContributionPreview => ({
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
