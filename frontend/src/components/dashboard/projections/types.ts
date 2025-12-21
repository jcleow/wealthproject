export const DEFAULT_STARTING_AGE = 30
export const DEFAULT_TERMINAL_AGE = 65
export const BASE_CALENDAR_YEAR = new Date().getFullYear()
export const AREA_ANIMATION_MS = 700
export const MARKER_BUFFER_MS = 400

export const chartColors = {
  axis: '#aeb6c9',
  grid: 'rgba(86, 91, 100, 0.6)',
  gradientStart: '#4f81ff',
  gradientEnd: 'rgba(59, 130, 246, 0.08)',
  stroke: '#7db0ff',
}

export type AxisMode = 'age' | 'year_number' | 'actual_year'

export type ProjectionPoint = {
  yearIndex: number
  yearLabel: string
  netWorth: number
  totalAssets: number
  totalLiabilities: number
  calendarYear: number
  /** Month (1-12) when available for monthly data */
  calendarMonth?: number
  hasNonAnnualSource?: boolean
  hasOverride?: boolean
  // Additional overlay metrics (populated by useChartOverlayData)
  cashBalance?: number
  annualIncome?: number
  annualExpenses?: number
  investments?: number
  cpf?: number
}
