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
}

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
]

const MONTH_FULL = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

export function MonthPicker({ value, onChange, placeholder = 'Select month', disabled, className }: MonthPickerProps) {
  const [isOpen, setIsOpen] = useState(false)

  // Parse value to get year and month
  const currentYear = value ? parseInt(value.split('-')[0]) : new Date().getFullYear()
  const currentMonth = value ? parseInt(value.split('-')[1]) - 1 : null // 0-indexed

  const [viewYear, setViewYear] = useState(currentYear)

  // Reset view year when value changes
  useEffect(() => {
    if (value) {
      setViewYear(parseInt(value.split('-')[0]))
    }
  }, [value])

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
    <DialogTrigger isOpen={isOpen} onOpenChange={setIsOpen}>
      <Button
        isDisabled={disabled}
        className={`flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-left text-xs text-white hover:border-white/20 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400 disabled:opacity-50 ${className || ''}`}
      >
        <span className={value ? 'text-white' : 'text-gray-500'}>
          {formatDisplay() || placeholder}
        </span>
        <CalendarIcon className="h-3.5 w-3.5 text-gray-400 ml-auto" />
      </Button>
      <Popover
        placement="bottom start"
        className="z-50 entering:animate-in entering:fade-in entering:zoom-in-95 exiting:animate-out exiting:fade-out exiting:zoom-out-95"
      >
        <Dialog className="rounded-xl border border-white/10 bg-[#0f172a] p-4 shadow-2xl outline-none min-w-[240px]">
          {/* Year navigation */}
          <div className="flex items-center justify-between mb-4">
            <button
              type="button"
              onClick={() => setViewYear(y => y - 1)}
              className="rounded-lg p-1.5 text-gray-400 hover:bg-white/10 hover:text-white focus:outline-none"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm font-semibold text-white">{viewYear}</span>
            <button
              type="button"
              onClick={() => setViewYear(y => y + 1)}
              className="rounded-lg p-1.5 text-gray-400 hover:bg-white/10 hover:text-white focus:outline-none"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Month grid */}
          <div className="grid grid-cols-3 gap-2">
            {MONTHS.map((month, index) => {
              const isSelected = currentMonth === index && currentYear === viewYear
              return (
                <button
                  key={month}
                  type="button"
                  onClick={() => handleMonthSelect(index)}
                  className={`rounded-lg px-3 py-2 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    isSelected
                      ? 'bg-blue-500 text-white'
                      : 'text-gray-300 hover:bg-white/10'
                  }`}
                >
                  {month}
                </button>
              )
            })}
          </div>
        </Dialog>
      </Popover>
    </DialogTrigger>
  )
}
