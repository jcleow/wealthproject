import type { Asset, Liability, Income, Expense } from '@/types/financial'

const API_BASE = '/api/v1'

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
  id: item.id,
  name: item.name,
  category: item.category,
  currentValue: item.current_value,
  annualGrowthRate: item.annual_growth_rate,
  notes: item.notes ?? '',
  updatedAt: item.updated_at,
})

const toLiability = (item: any): Liability => ({
  id: item.id,
  name: item.name,
  category: item.category,
  currentBalance: item.current_balance,
  interestRateApr: item.interest_rate_apr,
  minimumPayment: item.minimum_payment,
  notes: item.notes ?? '',
  updatedAt: item.updated_at,
})

const toIncome = (item: any): Income => ({
  id: item.id,
  source: item.source,
  amount: item.amount,
  frequency: item.frequency,
  startDate: item.start_date ?? new Date().toISOString(),
  category: item.category,
  notes: item.notes ?? '',
  updatedAt: item.updated_at,
})

const toExpense = (item: any): Expense => ({
  id: item.id,
  payee: item.payee,
  amount: item.amount,
  frequency: item.frequency,
  category: item.category,
  notes: item.notes ?? '',
  updatedAt: item.updated_at,
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
}
