'use client'

import { useState, useRef, useEffect } from 'react'
import { ChevronLeft, ChevronRight, ChevronDown, Check } from 'lucide-react'

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

// Custom dropdown for month selection
function MonthDropdown({
  value,
  onChange,
  options,
  ariaLabel,
}: {
  value: number
  onChange: (value: number) => void
  options: { value: number; label: string }[]
  ariaLabel: string
}) {
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
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`px-3 py-2
          flex items-center justify-between gap-2
          w-[130px]
          rounded-lg border border-gray-700/30
          bg-gray-900/40 hover:bg-gray-800/60
          text-sm font-medium text-gray-200
          backdrop-blur-sm
          transition-colors
          ${isOpen ? 'border-blue-500' : ''}`}
        aria-label={ariaLabel}
      >
        <span>{selectedOption?.label ?? ''}</span>
        <ChevronDown className={`h-3.5 w-3.5 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="
          absolute left-0 top-full z-[100] mt-1
          min-w-[130px]
          rounded-xl
          border border-white/[0.12]
          bg-[#0c0c0c]
          shadow-2xl shadow-black/60
          overflow-hidden
          animate-in fade-in slide-in-from-top-2 duration-150
        ">
          <div className="max-h-60 overflow-y-auto py-1 custom-scrollbar">
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
                    px-3 py-2
                    text-sm text-left
                    transition-all duration-150
                    ${isSelected
                      ? 'bg-blue-500/15 text-white'
                      : 'text-slate-300 hover:bg-white/[0.05]'
                    }
                  `}
                >
                  <span className="w-4 shrink-0">
                    {isSelected && <Check className="h-3.5 w-3.5 text-blue-400" />}
                  </span>
                  <span>{opt.label}</span>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// Custom dropdown for year selection
function YearDropdown({
  value,
  onChange,
  options,
  ariaLabel,
}: {
  value: number
  onChange: (value: number) => void
  options: { value: number; label: string }[]
  ariaLabel: string
}) {
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
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`px-3 py-2
          flex items-center gap-2
          rounded-lg border border-gray-700/30
          bg-gray-900/40 hover:bg-gray-800/60
          text-sm font-medium text-gray-200
          backdrop-blur-sm
          transition-colors
          ${isOpen ? 'border-blue-500' : ''}`}
        aria-label={ariaLabel}
      >
        <span>{selectedOption?.label ?? ''}</span>
        <ChevronDown className={`h-3.5 w-3.5 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="
          absolute left-0 top-full z-[100] mt-1
          min-w-[100px]
          rounded-xl
          border border-white/[0.12]
          bg-[#0c0c0c]
          shadow-2xl shadow-black/60
          overflow-hidden
          animate-in fade-in slide-in-from-top-2 duration-150
        ">
          <div className="max-h-60 overflow-y-auto py-1 custom-scrollbar">
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
                    px-3 py-2
                    text-sm text-left
                    transition-all duration-150
                    ${isSelected
                      ? 'bg-blue-500/15 text-white'
                      : 'text-slate-300 hover:bg-white/[0.05]'
                    }
                  `}
                >
                  <span className="w-4 shrink-0">
                    {isSelected && <Check className="h-3.5 w-3.5 text-blue-400" />}
                  </span>
                  <span>{opt.label}</span>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

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
        className={`p-2
rounded-lg border border-gray-700/30
bg-gray-900/40 hover:bg-gray-800/60
backdrop-blur-sm disabled:opacity-40
transition-colors disabled:cursor-not-allowed`}
        title="Previous month"
        aria-label="Go to previous month"
      >
        <ChevronLeft className="h-4 w-4 text-gray-300" />
      </button>

      {/* Month/Year Display */}
      <div className="flex items-baseline gap-2">
        {/* Month Dropdown */}
        <MonthDropdown
          value={month}
          onChange={(val) => onMonthChange(year, val)}
          options={MONTH_NAMES.map((name, index) => ({ value: index + 1, label: name }))}
          ariaLabel="Select month"
        />

        {/* Year Display/Dropdown */}
        <YearDropdown
          value={year}
          onChange={(val) => onMonthChange(val, 1)}
          options={Array.from({ length: maxYear - minYear + 1 }, (_, i) => ({
            value: minYear + i,
            label: `Year ${minYear + i}`,
          }))}
          ariaLabel="Select year"
        />
      </div>

      {/* Next Month Button */}
      <button
        onClick={handleNext}
        disabled={isAtEnd}
        className={`p-2
rounded-lg border border-gray-700/30
bg-gray-900/40 hover:bg-gray-800/60
backdrop-blur-sm disabled:opacity-40
transition-colors disabled:cursor-not-allowed`}
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
