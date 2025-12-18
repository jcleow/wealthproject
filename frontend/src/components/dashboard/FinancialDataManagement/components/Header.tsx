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
        {/* Unified timeline control bar */}
        <div className="flex flex-col items-end gap-3">
          <div className="flex items-center gap-1 p-1 rounded-xl border border-white/[0.08] bg-white/[0.02] backdrop-blur-sm">
            {resolution === 'monthly' && (
              <>
                <SelectField
                  label="View"
                  id="view-mode-selector"
                  value={viewMode}
                  disabled={isTimelineLoading}
                  onChange={(e) => onViewModeChange(e.target.value as 'annualized' | 'monthly')}
                  options={[
                    { value: 'annualized', label: 'Annualized' },
                    { value: 'monthly', label: 'Monthly' },
                  ]}
                />
                <div className="w-px h-6 bg-white/[0.08]" />
              </>
            )}

            <SelectField
              label="Year"
              id="year-selector"
              value={Math.max(0, Math.min(30, yearIndex))}
              disabled={isTimelineLoading}
              onChange={(e) => handleYearInput(e.target.value)}
              options={Array.from({ length: 31 }, (_, idx) => ({ value: idx, label: String(idx) }))}
              className="w-16"
            />

            {resolution === 'monthly' && viewMode === 'monthly' && (
              <>
                <div className="w-px h-6 bg-white/[0.08]" />
                <MonthSelector
                  selectedMonth={displayMonth}
                  effectiveYear={effectiveYear}
                  anchorYear={anchorYear}
                  anchorMonth={anchorMonth}
                  onSelectMonth={onSelectMonth}
                  isDisabled={isTimelineLoading}
                />
              </>
            )}
          </div>

          {shouldShowSlider && (
            <Slider.Root
              className="relative flex items-center h-6 w-72 select-none"
              min={0}
              max={monthRange?.sliderMax ?? 0}
              step={1}
              value={[sliderValue]}
              onValueChange={handleSliderChange}
              disabled={isSliderDisabled}
              aria-label="Timeline month slider"
            >
              <Slider.Track className="relative h-1 w-full rounded-full bg-slate-700/60">
                <Slider.Range className="absolute h-full rounded-full bg-gradient-to-r from-blue-500 to-blue-400" />
              </Slider.Track>
              <Slider.Thumb className="block h-4 w-4 rounded-full bg-white border-2 border-blue-400 shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500/30 hover:scale-110 disabled:opacity-50 transition-transform cursor-grab active:cursor-grabbing" />
            </Slider.Root>
          )}
        </div>
      </div>
    </div>
  )
}

interface SelectFieldProps {
  label: string
  id: string
  value: string | number
  disabled?: boolean
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void
  options: { value: string | number; label: string }[]
  className?: string
}

function SelectField({ label, id, value, disabled, onChange, options, className }: SelectFieldProps) {
  return (
    <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/[0.04] transition-colors">
      <label className="text-[10px] font-medium uppercase tracking-wider text-slate-500" htmlFor={id}>
        {label}
      </label>
      <select
        id={id}
        className={`appearance-none cursor-pointer bg-transparent text-sm font-medium text-white pr-5 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed ${className ?? ''}`}
        style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%2394a3b8' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: 'right 0 center', backgroundRepeat: 'no-repeat', backgroundSize: '1rem' }}
        value={value}
        disabled={disabled}
        onChange={onChange}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
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
    <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/[0.04] transition-colors">
      <label className="text-[10px] font-medium uppercase tracking-wider text-slate-500" htmlFor="month-selector">
        Month
      </label>
      <select
        id="month-selector"
        className="appearance-none cursor-pointer bg-transparent text-sm font-medium text-white pr-5 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
        style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%2394a3b8' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: 'right 0 center', backgroundRepeat: 'no-repeat', backgroundSize: '1rem' }}
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
