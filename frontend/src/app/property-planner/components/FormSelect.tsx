'use client'

import { CustomSelect, type SelectOption } from '@/components/ui/CustomSelect'
import { cn } from '@/lib/utils'

interface FormSelectProps {
  label: string
  value: string | number
  onChange: (value: string | number) => void
  options: SelectOption[]
  placeholder?: string
  helperText?: string
  disabled?: boolean
  className?: string
}

/**
 * FormSelect - A styled select component for the property planner forms.
 * Uses the CustomSelect component from the UI library.
 */
export function FormSelect({
  label,
  value,
  onChange,
  options,
  placeholder,
  helperText,
  disabled,
  className,
}: FormSelectProps) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label className="text-xs font-medium text-slate-400 block">{label}</label>
      <CustomSelect
        value={value}
        onChange={onChange}
        options={options}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full"
      />
      {helperText && (
        <p className="text-[10px] text-slate-500">{helperText}</p>
      )}
    </div>
  )
}
