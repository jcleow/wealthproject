import { useCallback, useMemo } from 'react'
import * as Slider from '@radix-ui/react-slider'
import { useQuery } from '@tanstack/react-query'

import type { TimeResolution, TimelineYear, TimelineMonth } from '@/types/timeline'
import { settingsApi } from '@/api/financial'
import { QUERY_KEYS } from '@/lib/queryKeys'
import { DEFAULT_STARTING_AGE } from '@/components/dashboard/projections/types'
import { calculateActualYear } from '../utils'

interface HeaderProps {
  selectedYear: number
  onSelectYear?: (year: number) => void
  selectedMonth?: number
  onSelectMonth?: (month: number | null) => void
  anchorYear?: number | null
  anchorMonth?: number | null
  resolution?: TimeResolution
  timelineYears?: TimelineYear[]
  timelineMonths?: TimelineMonth[]
  isTimelineLoading: boolean
  viewMode: 'annualized' | 'monthly'
  onViewModeChange: (mode: 'annualized' | 'monthly') => void
}

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

export function Header({
  selectedYear,
  onSelectYear,
  selectedMonth,
  onSelectMonth,
  anchorYear,
  anchorMonth,
  resolution,
  timelineYears,
  timelineMonths,
  isTimelineLoading,
  viewMode,
  onViewModeChange,
}: HeaderProps) {
  const { data: userSettings } = useQuery({
    queryKey: QUERY_KEYS.settings.user,
    queryFn: () => settingsApi.getUserSettings(),
    staleTime: 5 * 60 * 1000,
  })

  const handleYearInput = (value: string) => {
    const yearIndex = Number.parseInt(value, 10)
    if (Number.isNaN(yearIndex)) return
    const clamped = Math.max(0, Math.min(30, yearIndex))

    // Convert index to absolute year
    const baseYear = anchorYear ?? new Date().getFullYear()
    const targetYear =
      timelineYears && timelineYears[clamped]
        ? timelineYears[clamped].year
        : baseYear + clamped

    onSelectYear?.(targetYear)

    // Always switch to the earliest available month when changing years
    if (anchorYear && anchorMonth && targetYear === anchorYear) {
      // For anchor year, earliest month is the anchor month
      onSelectMonth?.(anchorMonth)
    } else {
      // For other years, earliest month is January
      onSelectMonth?.(1)
    }
  }

  // Calculate year index from selected year
  const baseYear = anchorYear ?? new Date().getFullYear()
  const effectiveYear = calculateActualYear(selectedYear, anchorYear)
  const yearIndex = effectiveYear - baseYear
  const startingAge = userSettings?.startingAge ?? DEFAULT_STARTING_AGE
  const ageBaseYear = anchorYear ?? timelineYears?.[0]?.year ?? baseYear
  const displayAge = Math.max(0, startingAge + (effectiveYear - ageBaseYear))
  const minMonthForEffectiveYear = effectiveYear === baseYear ? anchorMonth ?? 1 : 1
  const displayMonth = Math.max(selectedMonth ?? minMonthForEffectiveYear, minMonthForEffectiveYear)

  const monthRange = useMemo(() => {
    if (!timelineMonths || timelineMonths.length === 0) return null
    const sorted = [...timelineMonths].sort((a, b) => {
      if (a.year === b.year) return a.month - b.month
      return a.year - b.year
    })
    const first = sorted[0]
    const last = sorted[sorted.length - 1]
    const startIndex = first.year * 12 + (first.month - 1)
    const endIndex = last.year * 12 + (last.month - 1)
    return {
      first,
      last,
      startIndex,
      endIndex,
      sliderMax: Math.max(endIndex - startIndex, 0),
    }
  }, [timelineMonths])

  const sliderValue = useMemo(() => {
    if (!monthRange) return 0
    const currentMonthIndex = effectiveYear * 12 + (displayMonth - 1)
    const rawValue = currentMonthIndex - monthRange.startIndex
    return Math.min(Math.max(rawValue, 0), monthRange.sliderMax)
  }, [displayMonth, effectiveYear, monthRange])

  const handleSliderChange = useCallback(
    (value: number[]) => {
      if (!monthRange || value[0] === undefined) return
      const clamped = Math.min(Math.max(value[0], 0), monthRange.sliderMax)
      const absoluteMonthIndex = monthRange.startIndex + clamped
      const targetYear = Math.floor(absoluteMonthIndex / 12)
      const targetMonth = (absoluteMonthIndex % 12) + 1
      onSelectYear?.(targetYear)
      onSelectMonth?.(targetMonth)
    },
    [monthRange, onSelectMonth, onSelectYear]
  )

  const shouldShowSlider = resolution === 'monthly' && viewMode === 'monthly' && !!monthRange
  const isSliderDisabled = isTimelineLoading || !monthRange || monthRange.sliderMax === 0

  return (
    <div className="px-6 py-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-white">Financial Data</h3>
          <p className="text-sm text-gray-400">{`${effectiveYear} (Age ${displayAge})`}</p>
        </div>
        <div className="flex items-center gap-3 text-xs text-gray-300">
          <div className="flex flex-col items-end gap-2">
            <div className="flex flex-wrap items-center justify-end gap-3">
              {resolution === 'monthly' && (
                <ViewModeSelector
                  viewMode={viewMode}
                  onViewModeChange={onViewModeChange}
                  isDisabled={isTimelineLoading}
                />
              )}

              <YearSelector
                yearIndex={Math.max(0, Math.min(30, yearIndex))}
                onYearChange={handleYearInput}
                isDisabled={isTimelineLoading}
              />

              {resolution === 'monthly' && viewMode === 'monthly' && (
                <MonthSelector
                  selectedMonth={displayMonth}
                  effectiveYear={effectiveYear}
                  anchorYear={anchorYear}
                  anchorMonth={anchorMonth}
                  onSelectMonth={onSelectMonth}
                  isDisabled={isTimelineLoading}
                />
              )}
            </div>

            {shouldShowSlider && (
              <div className="w-full min-w-[260px] max-w-md">
                <Slider.Root
                  className={`relative
flex items-center
h-10 w-full
px-3
rounded-lg border border-white/10
bg-[#0f172a]/40
select-none`}
                  min={0}
                  max={monthRange?.sliderMax ?? 0}
                  step={1}
                  value={[sliderValue]}
                  onValueChange={handleSliderChange}
                  disabled={isSliderDisabled}
                  aria-label="Timeline month slider"
                >
                  <Slider.Track className="relative h-1.5 w-full rounded-full bg-white/10">
                    <Slider.Range className="absolute h-full rounded-full bg-blue-500" />
                  </Slider.Track>
                  <Slider.Thumb className={`block
h-4 w-4
rounded-full border border-white/40 focus:outline-none focus:ring-2 focus:ring-blue-400
bg-white
shadow-[0_0_0_5px_rgba(59,130,246,0.25)] disabled:opacity-50
transition-colors`} />
                </Slider.Root>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

interface YearSelectorProps {
  yearIndex: number
  onYearChange: (value: string) => void
  isDisabled: boolean
}

function YearSelector({ yearIndex, onYearChange, isDisabled }: YearSelectorProps) {
  return (
    <div className={`flex items-center
gap-2 px-2 py-1
rounded-lg border border-white/10
bg-transparent`}>
      <label className="hidden text-gray-400 sm:block" htmlFor="year-selector">
        Year
      </label>
      <select
        id="year-selector"
        className={`w-24
px-2 py-1
rounded-md border border-white/10 focus:border-blue-400 focus:outline-none
bg-[#0f172a]/60
text-sm text-white`}
        value={yearIndex}
        disabled={isDisabled}
        onChange={(event) => onYearChange(event.target.value)}
      >
        {Array.from({ length: 31 }, (_, idx) => (
          <option key={idx} value={idx}>
            {idx}
          </option>
        ))}
      </select>
    </div>
  )
}

interface ViewModeSelectorProps {
  viewMode: 'annualized' | 'monthly'
  onViewModeChange: (mode: 'annualized' | 'monthly') => void
  isDisabled: boolean
}

function ViewModeSelector({ viewMode, onViewModeChange, isDisabled }: ViewModeSelectorProps) {
  return (
    <div className={`flex items-center
gap-2 px-2 py-1
rounded-lg border border-white/10
bg-transparent`}>
      <label className="hidden text-gray-400 sm:block" htmlFor="view-mode-selector">
        View
      </label>
      <select
        id="view-mode-selector"
        className={`px-2 py-1
rounded-md border border-white/10 focus:border-blue-400 focus:outline-none
bg-[#0f172a]/60
text-sm text-white`}
        value={viewMode}
        disabled={isDisabled}
        onChange={(event) => {
          onViewModeChange(event.target.value as 'annualized' | 'monthly')
        }}
      >
        <option value="annualized">Annualized</option>
        <option value="monthly">Monthly</option>
      </select>
    </div>
  )
}

interface MonthSelectorProps {
  selectedMonth?: number
  effectiveYear: number
  anchorYear?: number | null
  anchorMonth?: number | null
  onSelectMonth?: (month: number | null) => void
  isDisabled: boolean
}

function MonthSelector({
  selectedMonth,
  effectiveYear,
  anchorYear,
  anchorMonth,
  onSelectMonth,
  isDisabled,
}: MonthSelectorProps) {
  const baseYear = anchorYear ?? new Date().getFullYear()
  const minMonthForYear = effectiveYear === baseYear ? anchorMonth ?? 1 : 1
  const safeMonth = Math.max(selectedMonth ?? minMonthForYear, minMonthForYear)
  const monthOptions = effectiveYear === baseYear
    ? Array.from({ length: 12 - (minMonthForYear - 1) }, (_, idx) => minMonthForYear + idx)
    : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]

  return (
    <div className={`flex items-center
gap-2 px-2 py-1
rounded-lg border border-white/10
bg-transparent`}>
      <label className="hidden text-gray-400 sm:block" htmlFor="month-selector">
        Month
      </label>
      <select
        id="month-selector"
        className={`px-2 py-1
rounded-md border border-white/10 focus:border-blue-400 focus:outline-none
bg-[#0f172a]/60
text-sm text-white`}
        value={safeMonth}
        disabled={isDisabled}
        onChange={(event) => {
          const month = Number(event.target.value)
          const clamped = Math.max(month, minMonthForYear)
          onSelectMonth?.(clamped)
        }}
      >
        {monthOptions.map((monthNumber) => (
          <option
            key={monthNumber}
            value={monthNumber}
            disabled={effectiveYear === baseYear && monthNumber < minMonthForYear}
          >
            {MONTH_NAMES[monthNumber - 1]}
          </option>
        ))}
      </select>
    </div>
  )
}
