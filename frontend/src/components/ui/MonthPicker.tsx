"use client"

import { useState, useEffect } from 'react'
import { Button, Dialog, DialogTrigger, Popover } from 'react-aria-components'
import { ChevronLeft, ChevronRight, CalendarIcon } from 'lucide-react'

interface MonthPickerProps {
  value?: string // YYYY-MM format
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  /** Minimum selectable date in YYYY-MM format. Months before this will be disabled. */
  minDate?: string
  /** Default view date in YYYY-MM format. Calendar opens to this month's year when no value is set. */
  defaultViewDate?: string
  /** Use compact styling with smaller padding and text */
  compact?: boolean
}

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
]

const MONTH_FULL = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

export function MonthPicker({ value, onChange, placeholder = 'Select month', disabled, className, minDate, defaultViewDate, compact }: MonthPickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [showYearGrid, setShowYearGrid] = useState(false)

  // Parse minDate
  const minYear = minDate ? parseInt(minDate.split('-')[0]) : undefined
  const minMonth = minDate ? parseInt(minDate.split('-')[1]) - 1 : undefined // 0-indexed

  // Parse defaultViewDate
  const defaultYear = defaultViewDate ? parseInt(defaultViewDate.split('-')[0]) : undefined

  // Parse value to get year and month
  const currentYear = value ? parseInt(value.split('-')[0]) : new Date().getFullYear()
  const currentMonth = value ? parseInt(value.split('-')[1]) - 1 : null // 0-indexed

  // Default view year: value > defaultViewDate > current year
  const initialViewYear = value ? parseInt(value.split('-')[0]) : (defaultYear ?? new Date().getFullYear())
  const [viewYear, setViewYear] = useState(initialViewYear)

  // Reset view year when value or defaultViewDate changes
  useEffect(() => {
    if (value) {
      setViewYear(parseInt(value.split('-')[0]))
    } else if (defaultYear) {
      setViewYear(defaultYear)
    }
  }, [value, defaultYear])

  // Check if a month is disabled (before minDate)
  const isMonthDisabled = (monthIndex: number): boolean => {
    if (minYear === undefined || minMonth === undefined) return false
    if (viewYear < minYear) return true
    if (viewYear === minYear && monthIndex < minMonth) return true
    return false
  }

  // Check if we can navigate to previous year
  const canGoToPreviousYear = minYear === undefined || viewYear > minYear

  // Year grid calculations - show 12 years at a time
  const yearGridStart = Math.floor(viewYear / 12) * 12
  const yearGridEnd = yearGridStart + 11
  const canGoToPreviousDecade = minYear === undefined || yearGridStart > minYear

  const handleYearSelect = (year: number) => {
    setViewYear(year)
    setShowYearGrid(false)
  }

  const handleMonthSelect = (monthIndex: number) => {
    const month = String(monthIndex + 1).padStart(2, '0')
    onChange(`${viewYear}-${month}`)
    setIsOpen(false)
  }

  const formatDisplay = () => {
    if (!value) return null
    const [year, month] = value.split('-')
    return `${MONTH_FULL[parseInt(month) - 1]} ${year}`
  }

  return (
    <DialogTrigger isOpen={isOpen} onOpenChange={(open) => {
      setIsOpen(open)
      if (!open) setShowYearGrid(false) // Reset to month view when closing
    }}>
      <Button
        isDisabled={disabled}
        className={`flex items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.03] text-left text-white hover:border-white/20 focus:border-blue-500/50 focus:outline-none disabled:opacity-50 ${compact ? 'px-2 py-1.5 text-xs' : 'px-3 py-2.5'} ${className || ''}`}
      >
        <span className={value ? 'text-white' : 'text-slate-500'}>
          {formatDisplay() || placeholder}
        </span>
        <CalendarIcon className={`${compact ? 'h-3.5 w-3.5' : 'h-4 w-4'} text-slate-500 ml-auto shrink-0`} />
      </Button>
      <Popover
        placement="bottom start"
        className={`z-50
entering:animate-in exiting:animate-out
entering:fade-in entering:zoom-in-95 exiting:fade-out exiting:zoom-out-95`}
      >
        <Dialog className={`min-w-[240px]
p-4
rounded-xl border border-white/10 outline-none
bg-[#0f172a]
shadow-2xl`}>
          {showYearGrid ? (
            <>
              {/* Decade navigation */}
              <div className="flex items-center justify-between mb-4">
                <button
                  type="button"
                  onClick={() => setViewYear(y => y - 12)}
                  disabled={!canGoToPreviousDecade}
                  className="p-1.5 rounded-lg focus:outline-none hover:bg-white/10 text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="text-sm font-semibold text-white">
                  {yearGridStart} - {yearGridEnd}
                </span>
                <button
                  type="button"
                  onClick={() => setViewYear(y => y + 12)}
                  className="p-1.5 rounded-lg focus:outline-none hover:bg-white/10 text-gray-400 hover:text-white"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>

              {/* Year grid */}
              <div className="grid grid-cols-3 gap-2">
                {Array.from({ length: 12 }, (_, i) => yearGridStart + i).map((year) => {
                  const isSelected = year === viewYear
                  const isDisabled = minYear !== undefined && year < minYear
                  return (
                    <button
                      key={year}
                      type="button"
                      disabled={isDisabled}
                      onClick={() => handleYearSelect(year)}
                      className={`rounded-lg px-3 py-2 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        isDisabled
                          ? 'text-gray-600 cursor-not-allowed'
                          : isSelected
                            ? 'bg-blue-500 text-white'
                            : 'text-gray-300 hover:bg-white/10'
                      }`}
                    >
                      {year}
                    </button>
                  )
                })}
              </div>
            </>
          ) : (
            <>
              {/* Year navigation */}
              <div className="flex items-center justify-between mb-4">
                <button
                  type="button"
                  onClick={() => setViewYear(y => y - 1)}
                  disabled={!canGoToPreviousYear}
                  className="p-1.5 rounded-lg focus:outline-none hover:bg-white/10 text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setShowYearGrid(true)}
                  className="text-sm font-semibold text-white hover:text-blue-400 transition-colors px-2 py-1 rounded hover:bg-white/5"
                >
                  {viewYear}
                </button>
                <button
                  type="button"
                  onClick={() => setViewYear(y => y + 1)}
                  className="p-1.5 rounded-lg focus:outline-none hover:bg-white/10 text-gray-400 hover:text-white"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>

              {/* Month grid */}
              <div className="grid grid-cols-3 gap-2">
                {MONTHS.map((month, index) => {
                  const isSelected = currentMonth === index && currentYear === viewYear
                  const isDisabled = isMonthDisabled(index)
                  return (
                    <button
                      key={month}
                      type="button"
                      disabled={isDisabled}
                      onClick={() => handleMonthSelect(index)}
                      className={`rounded-lg px-3 py-2 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        isDisabled
                          ? 'text-gray-600 cursor-not-allowed'
                          : isSelected
                            ? 'bg-blue-500 text-white'
                            : 'text-gray-300 hover:bg-white/10'
                      }`}
                    >
                      {month}
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
