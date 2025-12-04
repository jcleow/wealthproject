import type { TimeResolution } from '@/types/timeline'
import type { ZoomLevel } from '@/components/timeline/ZoomControls'
import { DEFAULT_STARTING_AGE, BASE_CALENDAR_YEAR, type AxisMode } from './types'

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
  zoomLevel?: ZoomLevel
  visibleRangeMonths?: number
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
  resolution,
  zoomLevel,
  visibleRangeMonths,
}: YearTickProps) {
  if (!payload) return null
  const isOverride = overrideYears.has(payload.value)
  const isSelected = selectedYear === payload.value
  const age = startingAge ?? DEFAULT_STARTING_AGE

  let labelValue: string | number

  if (resolution === 'monthly') {
    const monthIndex = payload.value
    const year = Math.floor(monthIndex / 12)
    const month = monthIndex % 12

    // Only show months when visible range is less than 24 months (2 years)
    const showMonths = (visibleRangeMonths ?? 0) < 24

    if (showMonths) {
      // Show month abbreviation with year suffix (e.g., "Sep'25", "Oct'25")
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
      const calendarYear = BASE_CALENDAR_YEAR + year
      const yearSuffix = `'${String(calendarYear).slice(-2)}`
      labelValue = `${monthNames[month]}${yearSuffix}`
    } else {
      // Show year only when showing 2+ years (24+ months)
      labelValue = mode === 'age'
        ? age + year
        : mode === 'actual_year'
          ? `'${String(BASE_CALENDAR_YEAR + year).slice(-2)}`
          : year
    }
  } else {
    // Yearly resolution - use existing logic
    labelValue = mode === 'age'
      ? age + payload.value
      : mode === 'actual_year'
        ? `'${String(BASE_CALENDAR_YEAR + payload.value).slice(-2)}`
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
