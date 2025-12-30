import { useCallback, useMemo, useState, useRef, useEffect } from 'react'
import * as Slider from '@radix-ui/react-slider'
import { useQuery } from '@tanstack/react-query'
import { Check, ChevronDown, Receipt, Users } from 'lucide-react'

import type { TimeResolution, TimelineYear, TimelineMonth } from '@/types/timeline'
import { useTaxModeOptional } from '@/contexts/TaxModeContext'
import { usePersonFilterOptional } from '@/contexts/PersonFilterContext'
import { settingsApi } from '@/api/financial'
import { QUERY_KEYS } from '@/lib/queryKeys'
import { DEFAULT_STARTING_AGE } from '@/components/dashboard/projections/types'
import { calculateActualYear } from '../utils'

/**
 * Timeline Navigation Props
 *
 * Year values:
 * - `selectedYear`: Can be either a relative offset (0, 1, 2...) or absolute year (2024, 2025...).
 *   The `calculateActualYear` utility handles both formats.
 * - `anchorAbsoluteYear`: The absolute calendar year when the timeline starts (e.g., 2024)
 *
 * Month values (calendar month numbers):
 * - All month values use 1-12 representing January-December within a calendar year
 * - `selectedCalendarMonth`: The currently selected month (1-12)
 * - `anchorCalendarMonth`: The month when the timeline starts (1-12, e.g., 12 for December)
 */
interface HeaderProps {
  selectedYear: number
  onSelectYear?: (year: number) => void
  /** Calendar month number (1-12, where 1=January, 12=December) */
  selectedCalendarMonth?: number
  onSelectMonth?: (month: number | null) => void
  /** Absolute calendar year when timeline starts */
  anchorAbsoluteYear?: number | null
  /** Calendar month number when timeline starts (1-12) */
  anchorCalendarMonth?: number | null
  resolution?: TimeResolution
  timelineYears?: TimelineYear[]
  timelineMonths?: TimelineMonth[]
  isTimelineLoading: boolean
  viewMode: 'annualized' | 'monthly'
  onViewModeChange: (mode: 'annualized' | 'monthly') => void
  /** When true, stack title and controls vertically for compact sidebar */
  compact?: boolean
}

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

export function Header({
  selectedYear,
  onSelectYear,
  selectedCalendarMonth,
  onSelectMonth,
  anchorAbsoluteYear,
  anchorCalendarMonth,
  resolution,
  timelineYears,
  timelineMonths,
  isTimelineLoading,
  viewMode,
  onViewModeChange,
  compact = false,
}: HeaderProps) {
  const [yearDisplayMode, setYearDisplayMode] = useState<'calendar' | 'relative'>('calendar')

  const { data: userSettings } = useQuery({
    queryKey: QUERY_KEYS.settings.user,
    queryFn: () => settingsApi.getUserSettings(),
    staleTime: 5 * 60 * 1000,
  })

  // Default anchor year to current year if not provided
  const resolvedAnchorYear = anchorAbsoluteYear ?? new Date().getFullYear()

  const handleYearInput = (value: string) => {
    const relativeYearIdx = Number.parseInt(value, 10)
    if (Number.isNaN(relativeYearIdx)) return
    const clamped = Math.max(0, Math.min(30, relativeYearIdx))

    // Convert relative index to absolute year
    const targetAbsoluteYear =
      timelineYears && timelineYears[clamped]
        ? timelineYears[clamped].year
        : resolvedAnchorYear + clamped

    onSelectYear?.(targetAbsoluteYear)

    // Always switch to the earliest available month when changing years
    if (anchorAbsoluteYear && anchorCalendarMonth && targetAbsoluteYear === anchorAbsoluteYear) {
      // For anchor year, earliest month is the anchor month
      onSelectMonth?.(anchorCalendarMonth)
    } else {
      // For other years, earliest month is January
      onSelectMonth?.(1)
    }
  }

  // Derive absolute year from selectedYear (which can be relative or absolute)
  const absoluteYear = calculateActualYear(selectedYear, anchorAbsoluteYear)
  /** Year offset from anchor (0 = anchor year, 1 = next year, etc.) */
  const relativeYearIndex = absoluteYear - resolvedAnchorYear
  const startingAge = userSettings?.startingAge ?? DEFAULT_STARTING_AGE
  const ageBaseYear = anchorAbsoluteYear ?? timelineYears?.[0]?.year ?? resolvedAnchorYear
  const displayAge = Math.max(0, startingAge + (absoluteYear - ageBaseYear))
  /** Minimum allowed calendar month for the current year (anchor month if in anchor year, else January) */
  const minCalendarMonthForYear = absoluteYear === resolvedAnchorYear ? anchorCalendarMonth ?? 1 : 1
  /** Calendar month to display (1-12), clamped to valid range */
  const displayCalendarMonth = Math.max(selectedCalendarMonth ?? minCalendarMonthForYear, minCalendarMonthForYear)

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

  // Slider value and max depend on view mode
  const sliderMax = useMemo(() => {
    if (viewMode === 'annualized') {
      return 30 // Relative year indices 0-30
    }
    return monthRange?.sliderMax ?? 0
  }, [viewMode, monthRange])

  const sliderValue = useMemo(() => {
    if (viewMode === 'annualized') {
      return Math.max(0, Math.min(30, relativeYearIndex))
    }
    if (!monthRange) return 0
    // Calculate slider position from absolute year and calendar month
    // Use the raw selectedCalendarMonth (falling back to anchor month) to avoid clamping issues
    const calendarMonthForSlider = selectedCalendarMonth ?? monthRange.first.month
    const currentMonthIndex = absoluteYear * 12 + (calendarMonthForSlider - 1)
    const rawValue = currentMonthIndex - monthRange.startIndex
    return Math.max(rawValue, 0)
  }, [viewMode, relativeYearIndex, selectedCalendarMonth, absoluteYear, monthRange])

  const handleSliderChange = useCallback(
    (value: number[]) => {
      if (value[0] === undefined) return

      if (viewMode === 'annualized') {
        // Slider controls relative year index in annualized mode
        const clampedRelativeYear = Math.min(Math.max(value[0], 0), 30)
        handleYearInput(String(clampedRelativeYear))
      } else {
        // Slider controls month in monthly mode
        if (!monthRange) return
        const clampedSliderValue = Math.min(Math.max(value[0], 0), monthRange.sliderMax)
        const absoluteMonthIndex = monthRange.startIndex + clampedSliderValue
        const targetAbsoluteYear = Math.floor(absoluteMonthIndex / 12)
        /** Calendar month (1-12) derived from absolute month index */
        const targetCalendarMonth = (absoluteMonthIndex % 12) + 1
        onSelectYear?.(targetAbsoluteYear)
        onSelectMonth?.(targetCalendarMonth)
      }
    },
    [viewMode, monthRange, onSelectMonth, onSelectYear, handleYearInput]
  )

  const shouldShowSlider = resolution === 'monthly' && !!monthRange
  const isSliderDisabled = isTimelineLoading || sliderMax === 0

  // Tax mode - just need the toggle to open the modal
  const taxMode = useTaxModeOptional()
  const toggleTaxMode = taxMode?.enableTaxMode

  // Person filter - to open the persons modal
  const personFilter = usePersonFilterOptional()
  const openPersonsModal = personFilter?.openPersonsModal
  const hasExcludedPersons = personFilter ? personFilter.persons.some((p) => !p.isIncluded) : false

  return (
    <div className={compact ? 'px-4 py-3' : 'px-6 py-4'}>
      <div className={compact ? 'flex flex-col gap-3' : 'flex items-start justify-between gap-3'}>
        <div className="flex items-baseline gap-2">
          <h3 className={compact ? 'text-base font-semibold text-white' : 'text-lg font-semibold text-white'}>Financial Data</h3>
          <p className={compact ? 'text-xs text-gray-400' : 'text-sm text-gray-400'}>{`${absoluteYear} (Age ${displayAge})`}</p>
        </div>
        {/* Unified timeline control bar */}
        <div className={`relative z-[50] flex flex-col rounded-xl border border-white/[0.08] bg-white/[0.02] backdrop-blur-sm ${compact ? 'w-full' : ''}`}>
          <div className="flex items-center gap-1 p-1">
            {resolution === 'monthly' && (
              <>
                <SelectField
                  label="View"
                  id="view-mode-selector"
                  value={viewMode}
                  disabled={isTimelineLoading}
                  onChange={(val) => onViewModeChange(val as 'annualized' | 'monthly')}
                  options={[
                    { value: 'annualized', label: 'Yearly' },
                    { value: 'monthly', label: 'Monthly' },
                  ]}
                />
                <div className="w-px h-6 bg-white/[0.08]" />
              </>
            )}

            <SelectField
              label="Year"
              id="year-selector"
              value={Math.max(0, Math.min(30, relativeYearIndex))}
              disabled={isTimelineLoading}
              onChange={(val) => handleYearInput(String(val))}
              options={Array.from({ length: 31 }, (_, idx) => ({
                value: idx,
                label: yearDisplayMode === 'calendar'
                  ? String(resolvedAnchorYear + idx)
                  : `+${idx}`
              }))}
              className="w-16"
              onLabelClick={() => setYearDisplayMode(m => m === 'calendar' ? 'relative' : 'calendar')}
              labelTitle="Click to toggle year format"
            />

            {resolution === 'monthly' && (
              <>
                <div className="w-px h-6 bg-white/[0.08]" />
                <MonthSelector
                  selectedCalendarMonth={displayCalendarMonth}
                  absoluteYear={absoluteYear}
                  anchorAbsoluteYear={anchorAbsoluteYear}
                  anchorCalendarMonth={anchorCalendarMonth}
                  onSelectMonth={onSelectMonth}
                  isDisabled={isTimelineLoading || viewMode === 'annualized'}
                />
              </>
            )}
          </div>

          {shouldShowSlider && (
            <div className="border-t border-white/[0.08] px-3 py-2">
              <Slider.Root
                className="relative flex items-center h-5 w-full select-none px-[7px]"
                min={0}
                max={sliderMax}
                step={1}
                value={[sliderValue]}
                onValueChange={handleSliderChange}
                disabled={isSliderDisabled}
                aria-label={viewMode === 'annualized' ? 'Timeline year slider' : 'Timeline month slider'}
              >
                <Slider.Track className="relative h-1 w-full rounded-full bg-slate-700/60">
                  <Slider.Range className="absolute h-full rounded-full bg-gradient-to-r from-blue-500 to-blue-400" />
                </Slider.Track>
                <Slider.Thumb className="block h-3.5 w-3.5 rounded-full bg-white border-2 border-blue-400 shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500/30 hover:scale-110 disabled:opacity-50 transition-transform cursor-grab active:cursor-grabbing" />
              </Slider.Root>
            </div>
          )}

          {/* Icon Toolbar */}
          <div className="flex items-center justify-center gap-1 px-2 py-1.5 border-t border-white/[0.08]">
            {/* Tax Estimate Icon */}
            <button
              type="button"
              onClick={() => toggleTaxMode?.()}
              title="Tax Estimate"
              className="
                flex items-center justify-center
                p-1.5 rounded-md
                text-slate-400 hover:text-amber-400 hover:bg-amber-500/10
                transition-all duration-200
              "
            >
              <Receipt className="h-4 w-4" />
            </button>

            {/* Persons Filter Icon */}
            <button
              type="button"
              onClick={() => openPersonsModal?.()}
              title="Manage Persons"
              className={`
                relative flex items-center justify-center
                p-1.5 rounded-md
                transition-all duration-200
                ${hasExcludedPersons
                  ? 'text-blue-400 hover:text-blue-300 hover:bg-blue-500/10'
                  : 'text-slate-400 hover:text-slate-300 hover:bg-white/[0.06]'
                }
              `}
            >
              <Users className="h-4 w-4" />
              {hasExcludedPersons && (
                <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-blue-500" />
              )}
            </button>
          </div>
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
  onChange: (value: string | number) => void
  options: { value: string | number; label: string }[]
  className?: string
  onLabelClick?: () => void
  labelTitle?: string
}

function SelectField({ label, id, value, disabled, onChange, options, className, onLabelClick, labelTitle }: SelectFieldProps) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const selectedOption = options.find(opt => opt.value === value)

  return (
    <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/[0.04] transition-colors" ref={containerRef}>
      <label
        className={`text-[10px] font-medium uppercase tracking-wider text-slate-500 ${onLabelClick ? 'cursor-pointer hover:text-slate-300 transition-colors' : ''}`}
        htmlFor={onLabelClick ? undefined : id}
        onClick={onLabelClick}
        title={labelTitle}
      >
        {label}
      </label>
      <div className={`relative ${className ?? ''}`}>
        <button
          type="button"
          id={id}
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
          className={`
            flex items-center justify-between gap-2 w-full
            appearance-none cursor-pointer
            bg-transparent
            text-sm font-medium text-white
            focus:outline-none
            disabled:opacity-50 disabled:cursor-not-allowed
            ${isOpen ? 'text-blue-400' : ''}
          `}
        >
          <span>{selectedOption?.label ?? ''}</span>
          <ChevronDown className={`h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {isOpen && (
          <div className="
            absolute left-0 top-full z-[100] mt-1
            min-w-[100px]
            rounded-lg
            border border-white/[0.12]
            bg-[#0c0c0c]
            shadow-xl shadow-black/50
            overflow-hidden
            animate-in fade-in slide-in-from-top-2 duration-150
          ">
            <div className="max-h-48 overflow-y-auto py-1 custom-scrollbar">
              {options.map((opt) => {
                const isSelected = opt.value === value
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      onChange(opt.value)
                      setIsOpen(false)
                    }}
                    className={`
                      w-full flex items-center gap-2
                      px-3 py-1.5
                      text-sm text-left
                      transition-all duration-150
                      ${isSelected
                        ? 'bg-blue-500/15 text-white'
                        : 'text-slate-300 hover:bg-white/[0.05]'
                      }
                    `}
                  >
                    <span className="w-3 shrink-0">
                      {isSelected && <Check className="h-3 w-3 text-blue-400" />}
                    </span>
                    <span>{opt.label}</span>
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

interface MonthSelectorProps {
  /** Calendar month number (1-12) */
  selectedCalendarMonth?: number
  /** Absolute calendar year (e.g., 2024) */
  absoluteYear: number
  /** Absolute calendar year when timeline starts */
  anchorAbsoluteYear?: number | null
  /** Calendar month number when timeline starts (1-12) */
  anchorCalendarMonth?: number | null
  onSelectMonth?: (month: number | null) => void
  isDisabled: boolean
}

function MonthSelector({
  selectedCalendarMonth,
  absoluteYear,
  anchorAbsoluteYear,
  anchorCalendarMonth,
  onSelectMonth,
  isDisabled,
}: MonthSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const resolvedAnchorYear = anchorAbsoluteYear ?? new Date().getFullYear()
  /** Minimum calendar month allowed for current year (anchor month if in anchor year, else January) */
  const minCalendarMonth = absoluteYear === resolvedAnchorYear ? anchorCalendarMonth ?? 1 : 1
  const safeCalendarMonth = Math.max(selectedCalendarMonth ?? minCalendarMonth, minCalendarMonth)
  /** Available calendar months (1-12) for the current year */
  const monthOptions = absoluteYear === resolvedAnchorYear
    ? Array.from({ length: 12 - (minCalendarMonth - 1) }, (_, idx) => minCalendarMonth + idx)
    : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]

  return (
    <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/[0.04] transition-colors" ref={containerRef}>
      <label className="text-[10px] font-medium uppercase tracking-wider text-slate-500" htmlFor="month-selector">
        Month
      </label>
      <div className="relative w-[100px]">
        <button
          type="button"
          id="month-selector"
          onClick={() => !isDisabled && setIsOpen(!isOpen)}
          disabled={isDisabled}
          className={`
            flex items-center justify-between gap-1 w-full
            appearance-none cursor-pointer
            bg-transparent
            text-sm font-medium text-white
            focus:outline-none
            disabled:opacity-50 disabled:cursor-not-allowed
            ${isOpen ? 'text-blue-400' : ''}
          `}
        >
          <span>{MONTH_NAMES[safeCalendarMonth - 1]}</span>
          <ChevronDown className={`h-3.5 w-3.5 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {isOpen && (
          <div className="
            absolute left-0 top-full z-[100] mt-1
            min-w-[120px]
            rounded-lg
            border border-white/[0.12]
            bg-[#0c0c0c]
            shadow-xl shadow-black/50
            overflow-hidden
            animate-in fade-in slide-in-from-top-2 duration-150
          ">
            <div className="max-h-48 overflow-y-auto py-1 custom-scrollbar">
              {monthOptions.map((calendarMonth) => {
                const isSelected = calendarMonth === safeCalendarMonth
                const isMonthDisabled = absoluteYear === resolvedAnchorYear && calendarMonth < minCalendarMonth
                return (
                  <button
                    key={calendarMonth}
                    type="button"
                    disabled={isMonthDisabled}
                    onClick={() => {
                      const clampedCalendarMonth = Math.max(calendarMonth, minCalendarMonth)
                      onSelectMonth?.(clampedCalendarMonth)
                      setIsOpen(false)
                    }}
                    className={`
                      w-full flex items-center gap-2
                      px-3 py-1.5
                      text-sm text-left
                      transition-all duration-150
                      ${isMonthDisabled
                        ? 'opacity-50 cursor-not-allowed text-slate-500'
                        : isSelected
                          ? 'bg-blue-500/15 text-white'
                          : 'text-slate-300 hover:bg-white/[0.05]'
                      }
                    `}
                  >
                    <span className="w-3 shrink-0">
                      {isSelected && <Check className="h-3 w-3 text-blue-400" />}
                    </span>
                    <span>{MONTH_NAMES[calendarMonth - 1]}</span>
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
