"use client"

import { useState, useEffect, useMemo } from 'react'
import { Button, Dialog, DialogTrigger, Popover } from 'react-aria-components'
import { ChevronLeft, ChevronRight, CalendarIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DatePickerProps {
  value?: string // YYYY-MM-DD format
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  /** Minimum selectable date in YYYY-MM-DD format */
  minDate?: string
  /** Maximum selectable date in YYYY-MM-DD format */
  maxDate?: string
  /** Visual variant */
  variant?: 'dark' | 'monet'
  /** Show error border (validation failed) */
  hasError?: boolean
}

const DAYS_OF_WEEK = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

const MONTHS_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
]

const MONTHS_FULL = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay()
}

function parseDate(dateStr: string | undefined): { year: number; month: number; day: number } | null {
  if (!dateStr) return null
  const [yearStr, monthStr, dayStr] = dateStr.split('-')
  const year = parseInt(yearStr)
  const month = parseInt(monthStr) - 1 // 0-indexed
  const day = parseInt(dayStr)
  if (isNaN(year) || isNaN(month) || isNaN(day)) return null
  return { year, month, day }
}

function formatDateString(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

export function DatePicker({
  value,
  onChange,
  placeholder = 'Select date',
  disabled,
  className,
  minDate,
  maxDate,
  variant = 'dark',
  hasError,
}: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [viewMode, setViewMode] = useState<'days' | 'months' | 'years'>('days')

  const isMonet = variant === 'monet'
  const parsed = parseDate(value)
  const parsedMin = parseDate(minDate)
  const parsedMax = parseDate(maxDate)

  const today = useMemo(() => {
    const now = new Date()
    return { year: now.getFullYear(), month: now.getMonth(), day: now.getDate() }
  }, [])

  const [viewYear, setViewYear] = useState(parsed?.year ?? today.year)
  const [viewMonth, setViewMonth] = useState(parsed?.month ?? today.month)

  // Sync view when value changes
  useEffect(() => {
    if (parsed) {
      setViewYear(parsed.year)
      setViewMonth(parsed.month)
    }
  }, [value]) // eslint-disable-line react-hooks/exhaustive-deps

  const isDayDisabled = (year: number, month: number, day: number): boolean => {
    if (parsedMin) {
      const minVal = parsedMin.year * 10000 + parsedMin.month * 100 + parsedMin.day
      const dayVal = year * 10000 + month * 100 + day
      if (dayVal < minVal) return true
    }
    if (parsedMax) {
      const maxVal = parsedMax.year * 10000 + parsedMax.month * 100 + parsedMax.day
      const dayVal = year * 10000 + month * 100 + day
      if (dayVal > maxVal) return true
    }
    return false
  }

  const isMonthDisabled = (monthIndex: number): boolean => {
    if (parsedMin && viewYear < parsedMin.year) return true
    if (parsedMin && viewYear === parsedMin.year && monthIndex < parsedMin.month) return true
    if (parsedMax && viewYear > parsedMax.year) return true
    if (parsedMax && viewYear === parsedMax.year && monthIndex > parsedMax.month) return true
    return false
  }

  const canGoPreviousMonth = (): boolean => {
    if (!parsedMin) return true
    if (viewYear > parsedMin.year) return true
    if (viewYear === parsedMin.year && viewMonth > parsedMin.month) return true
    return false
  }

  const canGoNextMonth = (): boolean => {
    if (!parsedMax) return true
    if (viewYear < parsedMax.year) return true
    if (viewYear === parsedMax.year && viewMonth < parsedMax.month) return true
    return false
  }

  const handleDaySelect = (day: number) => {
    onChange(formatDateString(viewYear, viewMonth, day))
    setIsOpen(false)
  }

  const handleMonthSelect = (monthIndex: number) => {
    setViewMonth(monthIndex)
    setViewMode('days')
  }

  const handleYearSelect = (year: number) => {
    setViewYear(year)
    setViewMode('months')
  }

  const goToPreviousMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11)
      setViewYear(viewYear - 1)
    } else {
      setViewMonth(viewMonth - 1)
    }
  }

  const goToNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0)
      setViewYear(viewYear + 1)
    } else {
      setViewMonth(viewMonth + 1)
    }
  }

  const formatDisplay = (): string | null => {
    if (!parsed) return null
    return `${parsed.day} ${MONTHS_SHORT[parsed.month]} ${parsed.year}`
  }

  // Build day grid
  const daysInMonth = getDaysInMonth(viewYear, viewMonth)
  const firstDay = getFirstDayOfMonth(viewYear, viewMonth)

  // Year grid calculations
  const yearGridStart = Math.floor(viewYear / 12) * 12
  const yearGridEnd = yearGridStart + 11

  // Theme classes
  const popoverClass = cn(
    'min-w-[280px] p-4 rounded-xl border outline-none shadow-2xl',
    isMonet
      ? 'bg-white border-[var(--monet-lavender)]/20'
      : 'bg-[#0f172a] border-white/10'
  )

  const navButtonClass = cn(
    'p-1.5 rounded-lg focus:outline-none transition-colors disabled:opacity-30 disabled:cursor-not-allowed',
    isMonet
      ? 'text-[var(--monet-text-muted)] hover:text-[var(--monet-text-primary)] hover:bg-[var(--monet-lavender)]/10'
      : 'text-gray-400 hover:text-white hover:bg-white/10'
  )

  const headerTextClass = cn(
    'text-sm font-semibold transition-colors px-2 py-1 rounded',
    isMonet
      ? 'text-[var(--monet-text-primary)] hover:text-[var(--monet-sage)] hover:bg-[var(--monet-lavender)]/10'
      : 'text-white hover:text-blue-400 hover:bg-white/5'
  )

  const dayOfWeekClass = cn(
    'text-[10px] font-medium uppercase',
    isMonet ? 'text-[var(--monet-text-muted)]' : 'text-gray-500'
  )

  const triggerClass = cn(
    'flex items-center gap-2 rounded-lg border text-left text-sm transition-colors focus:outline-none disabled:opacity-50 px-3 py-2 w-full',
    hasError
      ? 'border-rose-500/40 bg-rose-500/5 focus:border-rose-500/60'
      : isMonet
        ? 'bg-[var(--monet-lavender)]/5 border-[var(--monet-lavender)]/15 hover:border-[var(--monet-sage)]/40 focus:border-[var(--monet-sage)]/40'
        : 'bg-white/[0.03] border-white/[0.06] hover:border-white/20 focus:border-blue-500/50',
    className
  )

  const getDayButtonClass = (day: number, isCurrentMonth: boolean) => {
    const isSelected = parsed && parsed.year === viewYear && parsed.month === viewMonth && parsed.day === day
    const isToday = today.year === viewYear && today.month === viewMonth && today.day === day
    const isDisabledDay = !isCurrentMonth || isDayDisabled(viewYear, viewMonth, day)

    return cn(
      'h-8 w-8 rounded-lg text-xs font-medium transition-colors focus:outline-none',
      isDisabledDay && (isMonet ? 'text-gray-300 cursor-not-allowed' : 'text-gray-700 cursor-not-allowed'),
      !isDisabledDay && isSelected && 'bg-blue-500 text-white',
      !isDisabledDay && !isSelected && isToday && (
        isMonet
          ? 'ring-1 ring-[var(--monet-sage)] text-[var(--monet-sage)]'
          : 'ring-1 ring-blue-500 text-blue-400'
      ),
      !isDisabledDay && !isSelected && !isToday && (
        isMonet
          ? 'text-[var(--monet-text-primary)] hover:bg-[var(--monet-lavender)]/15'
          : 'text-gray-300 hover:bg-white/10'
      ),
    )
  }

  const getGridCellClass = (isSelected: boolean, isDisabledCell: boolean) => {
    return cn(
      'rounded-lg px-3 py-2 text-xs font-medium transition-colors focus:outline-none',
      isDisabledCell && (isMonet ? 'text-gray-300 cursor-not-allowed' : 'text-gray-600 cursor-not-allowed'),
      !isDisabledCell && isSelected && 'bg-blue-500 text-white',
      !isDisabledCell && !isSelected && (
        isMonet
          ? 'text-[var(--monet-text-primary)] hover:bg-[var(--monet-lavender)]/15'
          : 'text-gray-300 hover:bg-white/10'
      ),
    )
  }

  return (
    <DialogTrigger isOpen={isOpen} onOpenChange={(open) => {
      setIsOpen(open)
      if (!open) setViewMode('days')
    }}>
      <Button isDisabled={disabled} className={triggerClass}>
        <CalendarIcon className={cn(
          'h-3.5 w-3.5 shrink-0',
          isMonet ? 'text-[var(--monet-text-muted)]' : 'text-slate-500'
        )} />
        <span className={cn(
          'flex-1',
          value
            ? (isMonet ? 'text-[var(--monet-text-primary)]' : 'text-white')
            : (isMonet ? 'text-[var(--monet-text-muted)]' : 'text-slate-600')
        )}>
          {formatDisplay() || placeholder}
        </span>
      </Button>
      <Popover
        placement="bottom start"
        className="z-50 entering:animate-in exiting:animate-out entering:fade-in entering:zoom-in-95 exiting:fade-out exiting:zoom-out-95"
      >
        <Dialog className={popoverClass}>
          {viewMode === 'years' ? (
            <>
              {/* Decade navigation */}
              <div className="flex items-center justify-between mb-3">
                <button type="button" onClick={() => setViewYear(y => y - 12)} className={navButtonClass}>
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className={cn('text-sm font-semibold', isMonet ? 'text-[var(--monet-text-primary)]' : 'text-white')}>
                  {yearGridStart} – {yearGridEnd}
                </span>
                <button type="button" onClick={() => setViewYear(y => y + 12)} className={navButtonClass}>
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {Array.from({ length: 12 }, (_, i) => yearGridStart + i).map((year) => {
                  const isSelected = year === viewYear
                  const isYearDisabled =
                    (parsedMin !== null && year < (parsedMin?.year ?? 0)) ||
                    (parsedMax !== null && year > (parsedMax?.year ?? 9999))
                  return (
                    <button
                      key={year}
                      type="button"
                      disabled={isYearDisabled}
                      onClick={() => handleYearSelect(year)}
                      className={getGridCellClass(isSelected, isYearDisabled)}
                    >
                      {year}
                    </button>
                  )
                })}
              </div>
            </>
          ) : viewMode === 'months' ? (
            <>
              {/* Year navigation */}
              <div className="flex items-center justify-between mb-3">
                <button type="button" onClick={() => setViewYear(y => y - 1)} className={navButtonClass}>
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button type="button" onClick={() => setViewMode('years')} className={headerTextClass}>
                  {viewYear}
                </button>
                <button type="button" onClick={() => setViewYear(y => y + 1)} className={navButtonClass}>
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {MONTHS_SHORT.map((monthLabel, index) => {
                  const isSelected = viewMonth === index
                  const isDisabledMonth = isMonthDisabled(index)
                  return (
                    <button
                      key={monthLabel}
                      type="button"
                      disabled={isDisabledMonth}
                      onClick={() => handleMonthSelect(index)}
                      className={getGridCellClass(isSelected, isDisabledMonth)}
                    >
                      {monthLabel}
                    </button>
                  )
                })}
              </div>
            </>
          ) : (
            <>
              {/* Month/year navigation */}
              <div className="flex items-center justify-between mb-3">
                <button
                  type="button"
                  onClick={goToPreviousMonth}
                  disabled={!canGoPreviousMonth()}
                  className={navButtonClass}
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button type="button" onClick={() => setViewMode('months')} className={headerTextClass}>
                  {MONTHS_FULL[viewMonth]} {viewYear}
                </button>
                <button
                  type="button"
                  onClick={goToNextMonth}
                  disabled={!canGoNextMonth()}
                  className={navButtonClass}
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>

              {/* Day-of-week headers */}
              <div className="grid grid-cols-7 gap-0.5 mb-1">
                {DAYS_OF_WEEK.map((dayLabel) => (
                  <div key={dayLabel} className={cn('h-8 flex items-center justify-center', dayOfWeekClass)}>
                    {dayLabel}
                  </div>
                ))}
              </div>

              {/* Day grid */}
              <div className="grid grid-cols-7 gap-0.5">
                {/* Empty cells for days before the 1st */}
                {Array.from({ length: firstDay }, (_, i) => (
                  <div key={`empty-${i}`} className="h-8 w-8" />
                ))}
                {/* Day buttons */}
                {Array.from({ length: daysInMonth }, (_, i) => {
                  const day = i + 1
                  const isDisabledDay = isDayDisabled(viewYear, viewMonth, day)
                  return (
                    <button
                      key={day}
                      type="button"
                      disabled={isDisabledDay}
                      onClick={() => handleDaySelect(day)}
                      className={cn('flex items-center justify-center', getDayButtonClass(day, true))}
                    >
                      {day}
                    </button>
                  )
                })}
              </div>
            </>
          )}
        </Dialog>
      </Popover>
    </DialogTrigger>
  )
}
