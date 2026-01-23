export const DEFAULT_STARTING_AGE = 30
export const DEFAULT_TERMINAL_AGE = 65
export const BASE_CALENDAR_YEAR = new Date().getFullYear()
export const AREA_ANIMATION_MS = 700
export const MARKER_BUFFER_MS = 400

export const chartColors = {
  axis: '#64748b',  // slate-500 - darker for better contrast on light bg
  grid: 'rgba(100, 116, 139, 0.12)',  // subtle grid that works on both
  gradientStart: 'rgba(74, 144, 217, 0.20)',
  gradientEnd: 'rgba(74, 144, 217, 0.02)',
  stroke: '#3B82F6',  // blue-500 - vibrant line color
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
