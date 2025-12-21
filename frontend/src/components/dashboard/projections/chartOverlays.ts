export type ChartType = 'area' | 'line' | 'bar'

export type MetricId =
  | 'netWorth'
  | 'totalAssets'
  | 'totalLiabilities'
  | 'cashBalance'
  | 'annualIncome'
  | 'annualExpenses'
  | 'investments'
  | 'cpf'

export interface MetricConfig {
  id: MetricId
  label: string
  color: string
  gradientId: string
}

export const OVERLAY_METRICS: MetricConfig[] = [
  { id: 'netWorth', label: 'Net Worth', color: '#4f81ff', gradientId: 'netWorthGradient' },
  { id: 'totalAssets', label: 'Assets', color: '#10b981', gradientId: 'assetsGradient' },
  { id: 'totalLiabilities', label: 'Liabilities', color: '#f43f5e', gradientId: 'liabilitiesGradient' },
  { id: 'cashBalance', label: 'Cash', color: '#06b6d4', gradientId: 'cashGradient' },
  { id: 'annualIncome', label: 'Income', color: '#22c55e', gradientId: 'incomeGradient' },
  { id: 'annualExpenses', label: 'Expenses', color: '#f59e0b', gradientId: 'expensesGradient' },
  { id: 'investments', label: 'Investments', color: '#8b5cf6', gradientId: 'investmentsGradient' },
  { id: 'cpf', label: 'CPF', color: '#ec4899', gradientId: 'cpfGradient' },
]

export const MAX_OVERLAYS = 3

export const CHART_TYPE_OPTIONS: { value: ChartType; label: string }[] = [
  { value: 'area', label: 'Area' },
  { value: 'line', label: 'Line' },
  { value: 'bar', label: 'Bar' },
]

export function getMetricConfig(id: MetricId): MetricConfig | undefined {
  return OVERLAY_METRICS.find((m) => m.id === id)
}
