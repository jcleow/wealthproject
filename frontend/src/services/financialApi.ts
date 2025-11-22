import type { Asset, Liability, Income, Expense } from '@/types/financial'
import type { PropertyLinkRecord, PropertyScenarioRecord } from '@/types/property'

function getApiBaseUrl() {
  const envURL = process.env.NEXT_PUBLIC_GO_BACKEND_BASE_URL?.trim()
  if (envURL) return envURL.endsWith('/api/v1') ? envURL : `${envURL.replace(/\/$/, '')}/api/v1`

  // Fallback: assume local Go server on 8080 if no Next.js rewrite is configured
  if (typeof window !== 'undefined') {
    return 'http://localhost:8080/api/v1'
  }
  return 'http://localhost:8080/api/v1'
}

const API_BASE = getApiBaseUrl()

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
})

const toIncome = (item: any): Income => ({
  id: item.id ?? item.ID,
  source: item.source ?? item.Source,
  amount: item.amount ?? item.Amount,
  frequency: item.frequency ?? item.Frequency,
  startDate: item.start_date ?? item.startDate ?? item.StartDate ?? new Date().toISOString(),
  category: item.category ?? item.Category,
  notes: item.notes ?? item.Notes ?? '',
  updatedAt: item.updated_at ?? item.updatedAt ?? item.UpdatedAt,
})

const toExpense = (item: any): Expense => ({
  id: item.id ?? item.ID,
  payee: item.payee ?? item.Payee,
  amount: item.amount ?? item.Amount,
  frequency: item.frequency ?? item.Frequency,
  category: item.category ?? item.Category,
  notes: item.notes ?? item.Notes ?? '',
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

export const financialApi = {
  // Assets
  async listAssets(): Promise<Asset[]> {
    const data = await jsonRequest<any[]>(`${API_BASE}/assets`)
    return data.map(toAsset)
  },
  async createAsset(payload: Omit<Asset, 'id' | 'updatedAt'>): Promise<Asset> {
    const body = {
      name: payload.name,
      category: payload.category,
      current_value: payload.currentValue,
      annual_growth_rate: payload.annualGrowthRate,
      notes: payload.notes,
    }
    const data = await jsonRequest<any>(`${API_BASE}/assets`, { method: 'POST', body: JSON.stringify(body) })
    return toAsset(data)
  },
  async updateAsset(id: string, payload: Partial<Asset>): Promise<Asset> {
    const body: Record<string, any> = {
      name: payload.name,
      category: payload.category,
      current_value: payload.currentValue,
      annual_growth_rate: payload.annualGrowthRate,
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

  // Liabilities
  async listLiabilities(): Promise<Liability[]> {
    const data = await jsonRequest<any[]>(`${API_BASE}/liabilities`)
    return data.map(toLiability)
  },
  async createLiability(payload: Omit<Liability, 'id' | 'updatedAt'>): Promise<Liability> {
    const body = {
      name: payload.name,
      category: payload.category,
      current_balance: payload.currentBalance,
      interest_rate_apr: payload.interestRateApr,
      minimum_payment: payload.minimumPayment,
      notes: payload.notes,
    }
    const data = await jsonRequest<any>(`${API_BASE}/liabilities`, { method: 'POST', body: JSON.stringify(body) })
    return toLiability(data)
  },
  async updateLiability(id: string, payload: Partial<Liability>): Promise<Liability> {
    const body: Record<string, any> = {
      name: payload.name,
      category: payload.category,
      current_balance: payload.currentBalance,
      interest_rate_apr: payload.interestRateApr,
      minimum_payment: payload.minimumPayment,
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
  async listIncomes(): Promise<Income[]> {
    const data = await jsonRequest<any[]>(`${API_BASE}/cashflow/incomes`)
    return data.map(toIncome)
  },
  async createIncome(payload: Omit<Income, 'id' | 'updatedAt'>): Promise<Income> {
    const body = {
      source: payload.source,
      amount: payload.amount,
      frequency: payload.frequency,
      start_date: payload.startDate,
      category: payload.category,
      notes: payload.notes,
    }
    const data = await jsonRequest<any>(`${API_BASE}/cashflow/incomes`, { method: 'POST', body: JSON.stringify(body) })
    return toIncome(data)
  },
  async updateIncome(id: string, payload: Partial<Income>): Promise<Income> {
    const body: Record<string, any> = {
      source: payload.source,
      amount: payload.amount,
      frequency: payload.frequency,
      start_date: payload.startDate,
      category: payload.category,
      notes: payload.notes,
    }
    const data = await jsonRequest<any>(`${API_BASE}/cashflow/incomes/${id}`, { method: 'PUT', body: JSON.stringify(body) })
    return toIncome(data)
  },
  async deleteIncome(id: string): Promise<void> {
    await jsonRequest<void>(`${API_BASE}/cashflow/incomes/${id}`, { method: 'DELETE' })
  },

  // Expenses
  async listExpenses(): Promise<Expense[]> {
    const data = await jsonRequest<any[]>(`${API_BASE}/cashflow/expenses`)
    return data.map(toExpense)
  },
  async createExpense(payload: Omit<Expense, 'id' | 'updatedAt'>): Promise<Expense> {
    const body = {
      payee: payload.payee,
      amount: payload.amount,
      frequency: payload.frequency,
      category: payload.category,
      notes: payload.notes,
    }
    const data = await jsonRequest<any>(`${API_BASE}/cashflow/expenses`, { method: 'POST', body: JSON.stringify(body) })
    return toExpense(data)
  },
  async updateExpense(id: string, payload: Partial<Expense>): Promise<Expense> {
    const body: Record<string, any> = {
      payee: payload.payee,
      amount: payload.amount,
      frequency: payload.frequency,
      category: payload.category,
      notes: payload.notes,
    }
    const data = await jsonRequest<any>(`${API_BASE}/cashflow/expenses/${id}`, { method: 'PUT', body: JSON.stringify(body) })
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
      property_type: payload.propertyType,
      headline: payload.headline,
      subheadline: payload.subheadline ?? '',
      property_price: payload.propertyPrice,
      down_payment: payload.downPayment || 0,
      loan_amount: payload.loanAmount || 0,
      interest_rate: payload.interestRate || 0,
      loan_tenure: payload.loanTenure || 0,
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
    return data.map(toPropertyLink)
  },
}
