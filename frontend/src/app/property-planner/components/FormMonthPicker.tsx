'use client'

import { MonthPicker } from '@/components/ui/MonthPicker'
import { cn } from '@/lib/utils'

interface FormMonthPickerProps {
  label: string
  value: string
  onChange: (value: string) => void
  minDate?: string
  defaultViewDate?: string
  helperText?: string
  disabled?: boolean
  className?: string
}

/**
 * FormMonthPicker - A styled month picker component for the property planner forms.
 * Uses the base MonthPicker component from the UI library.
 */
export function FormMonthPicker({
  label,
  value,
  onChange,
  minDate,
  defaultViewDate,
  helperText,
  disabled,
  className,
}: FormMonthPickerProps) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label className="text-xs font-medium text-slate-400 block">{label}</label>
      <MonthPicker
        value={value}
        onChange={onChange}
        minDate={minDate}
        defaultViewDate={defaultViewDate}
        disabled={disabled}
        className="w-full"
      />
      {helperText && (
        <p className="text-[10px] text-slate-500">{helperText}</p>
      )}
    </div>
  )
}
