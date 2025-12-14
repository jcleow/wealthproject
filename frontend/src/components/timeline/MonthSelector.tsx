'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'

export interface MonthSelectorProps {
  /** Current selected year */
  year: number
  /** Current selected month (1-12) */
  month: number
  /** Callback when year/month changes */
  onMonthChange: (year: number, month: number) => void
  /** Minimum year (inclusive) */
  minYear?: number
  /** Maximum year (inclusive) */
  maxYear?: number
  /** Additional CSS classes */
  className?: string
}

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

const MONTH_ABBREV = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export function MonthSelector({
  year,
  month,
  onMonthChange,
  minYear = 0,
  maxYear = 30,
  className = '',
}: MonthSelectorProps) {
  const isAtStart = year === minYear && month === 1
  const isAtEnd = year === maxYear && month === 12

  const handlePrevious = () => {
    if (isAtStart) return

    if (month === 1) {
      // Go to December of previous year
      onMonthChange(year - 1, 12)
    } else {
      // Go to previous month in same year
      onMonthChange(year, month - 1)
    }
  }

  const handleNext = () => {
    if (isAtEnd) return

    if (month === 12) {
      // Go to January of next year
      onMonthChange(year + 1, 1)
    } else {
      // Go to next month in same year
      onMonthChange(year, month + 1)
    }
  }

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Previous Month Button */}
      <button
        onClick={handlePrevious}
        disabled={isAtStart}
        className="rounded-lg border border-gray-700/30 bg-gray-900/40 p-2 backdrop-blur-sm transition-colors hover:bg-gray-800/60 disabled:cursor-not-allowed disabled:opacity-40"
        title="Previous month"
        aria-label="Go to previous month"
      >
        <ChevronLeft className="h-4 w-4 text-gray-300" />
      </button>

      {/* Month/Year Display */}
      <div className="flex items-baseline gap-2">
        {/* Month Dropdown */}
        <select
          value={month}
          onChange={(e) => onMonthChange(year, parseInt(e.target.value, 10))}
          className="rounded-lg border border-gray-700/30 bg-gray-900/40 px-3 py-2 text-sm font-medium text-gray-200 backdrop-blur-sm transition-colors hover:bg-gray-800/60 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          aria-label="Select month"
        >
          {MONTH_NAMES.map((name, index) => (
            <option key={name} value={index + 1} className="bg-gray-900 text-gray-200">
              {name}
            </option>
          ))}
        </select>

        {/* Year Display/Dropdown */}
        <select
          value={year}
          onChange={(e) => onMonthChange(parseInt(e.target.value, 10), 1)}
          className="rounded-lg border border-gray-700/30 bg-gray-900/40 px-3 py-2 text-sm font-medium text-gray-200 backdrop-blur-sm transition-colors hover:bg-gray-800/60 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          aria-label="Select year"
        >
          {Array.from({ length: maxYear - minYear + 1 }, (_, i) => minYear + i).map((y) => (
            <option key={y} value={y} className="bg-gray-900 text-gray-200">
              Year {y}
            </option>
          ))}
        </select>
      </div>

      {/* Next Month Button */}
      <button
        onClick={handleNext}
        disabled={isAtEnd}
        className="rounded-lg border border-gray-700/30 bg-gray-900/40 p-2 backdrop-blur-sm transition-colors hover:bg-gray-800/60 disabled:cursor-not-allowed disabled:opacity-40"
        title="Next month"
        aria-label="Go to next month"
      >
        <ChevronRight className="h-4 w-4 text-gray-300" />
      </button>

      {/* Quick Month Navigation */}
      <div className="ml-2 flex gap-1">
        {MONTH_ABBREV.map((abbrev, index) => {
          const isSelected = month === index + 1
          return (
            <button
              key={abbrev}
              onClick={() => onMonthChange(year, index + 1)}
              className={`rounded px-2 py-1 text-xs font-medium transition-colors ${
                isSelected
                  ? 'bg-blue-600/20 text-blue-400 ring-1 ring-blue-500/40'
                  : 'text-gray-400 hover:bg-gray-800/40 hover:text-gray-300'
              }`}
              title={MONTH_NAMES[index]}
              aria-label={`Go to ${MONTH_NAMES[index]}`}
              aria-current={isSelected ? 'true' : undefined}
            >
              {abbrev}
            </button>
          )
        })}
      </div>
    </div>
  )
}
