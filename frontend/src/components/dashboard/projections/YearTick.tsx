import type { TimeResolution } from '@/types/timeline'
import { DEFAULT_STARTING_AGE, type AxisMode } from './types'

interface YearTickProps {
  x?: number
  y?: number
  payload?: { value: number }
  overrideYears: Set<number>
  onSelectYear?: (year: number) => void
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
  selectedYear,
  mode,
  startingAge,
  resolution = 'monthly', // Default to monthly
  visibleRangeMonths,
  baseCalendarYear,
}: YearTickProps) {
  if (!payload) return null
  const isOverride = overrideYears.has(payload.value)
  const isSelected = selectedYear === payload.value
  const age = startingAge ?? DEFAULT_STARTING_AGE

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
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
      const calendarYear = (baseCalendarYear ?? new Date().getFullYear()) + yearOffset
      const yearSuffix = `'${String(calendarYear).slice(-2)}`
      labelValue = `${monthNames[month]}${yearSuffix}`
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
    if (onSelectYear) onSelectYear(payload.value)
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
        fill={isSelected ? '#a5b4fc' : '#cbd5e1'}
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
