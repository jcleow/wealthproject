import type { TimeResolution } from '@/types/timeline'
import { DEFAULT_STARTING_AGE, type AxisMode } from './types'
import { useColorScheme } from '@/stores'

// Static array extracted outside component to avoid recreation on each render
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const

interface YearTickProps {
  x?: number
  y?: number
  payload?: { value: number }
  overrideYears: Set<number>
  onSelectYear?: (year: number) => void
  onSelectMonth?: (month: number) => void
  selectedYear?: number
  mode: AxisMode
  startingAge?: number
  resolution?: TimeResolution
  visibleRangeMonths?: number
  baseCalendarYear?: number
}

export function YearTick({
  x = 0,
  y = 0,
  payload,
  overrideYears,
  onSelectYear,
  onSelectMonth,
  selectedYear,
  mode,
  startingAge,
  resolution = 'monthly', // Default to monthly
  visibleRangeMonths,
  baseCalendarYear,
}: YearTickProps) {
  const colorScheme = useColorScheme()
  const isMonet = colorScheme === 'monet'

  if (!payload) return null
  const isOverride = overrideYears.has(payload.value)
  const isSelected = selectedYear === payload.value
  const age = startingAge ?? DEFAULT_STARTING_AGE

  // Theme-aware tick colors
  const tickColor = isMonet
    ? (isSelected ? '#3b82f6' : '#64748b')  // blue-500 selected, slate-500 normal for light mode
    : (isSelected ? '#a5b4fc' : '#cbd5e1')  // indigo-300 selected, slate-300 for dark mode

  let labelValue: string | number

  // Monthly resolution - payload.value is monthIndex (0-based global month index)
  if (resolution === 'monthly' || resolution === undefined) {
    const monthIndex = payload.value
    const yearOffset = Math.floor(monthIndex / 12)  // Years since start (0, 1, 2, ...)
    const month = monthIndex % 12

    // Only show months when visible range is less than 24 months (2 years)
    const showMonths = (visibleRangeMonths ?? 0) < 24

    if (showMonths) {
      // Show month abbreviation with year suffix (e.g., "Sep'25", "Oct'25")
      const calendarYear = (baseCalendarYear ?? new Date().getFullYear()) + yearOffset
      const yearSuffix = `'${String(calendarYear).slice(-2)}`
      labelValue = `${MONTH_NAMES[month]}${yearSuffix}`
    } else {
      // Show year only when showing 2+ years (24+ months)
      labelValue = mode === 'age'
        ? age + yearOffset
        : mode === 'actual_year'
          ? `'${String((baseCalendarYear ?? new Date().getFullYear()) + yearOffset).slice(-2)}`
          : yearOffset
    }
  } else {
    // Yearly resolution - use existing logic
    labelValue = mode === 'age'
      ? age + payload.value
      : mode === 'actual_year'
        ? `'${String((baseCalendarYear ?? new Date().getFullYear()) + payload.value).slice(-2)}`
        : payload.value
  }

  const handleClick = () => {
    if (resolution === 'monthly') {
      // In monthly resolution, payload.value is the global month index (0, 1, 2, ... 420)
      // Convert to calendar year and month (1-12)
      const monthIndex = payload.value
      const yearOffset = Math.floor(monthIndex / 12)
      const month = (monthIndex % 12) + 1 // Convert to 1-based month
      const calendarYear = (baseCalendarYear ?? new Date().getFullYear()) + yearOffset

      if (onSelectYear) onSelectYear(calendarYear)
      if (onSelectMonth) onSelectMonth(month)
    } else {
      // Yearly resolution - payload.value is the year index (0, 1, 2...)
      // Convert to calendar year
      const calendarYear = (baseCalendarYear ?? new Date().getFullYear()) + payload.value
      if (onSelectYear) onSelectYear(calendarYear)
    }
  }

  return (
    <g
      transform={`translate(${x},${y})`}
      className="cursor-pointer"
      onClick={handleClick}
      aria-label={`Year ${payload.value}`}
    >
      <text
        dy={12}
        fill={tickColor}
        fontSize={12}
        fontWeight={isSelected ? 700 : 400}
        textAnchor="middle"
      >
        {labelValue}
      </text>
      {isOverride && (
        <path
          d="M0,14 L7,28 L-7,28 Z"
          fill="#38bdf8"
          data-testid={`override-marker-${payload.value}`}
        />
      )}
    </g>
  )
}
