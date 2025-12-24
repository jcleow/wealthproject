'use client'

import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface FormInputProps {
  label: string
  value: string | number
  onChange: (value: string) => void
  prefix?: string
  suffix?: string
  type?: 'text' | 'number' | 'month'
  inputMode?: 'numeric' | 'text'
  min?: number
  max?: number
  step?: number
  helperText?: string
  disabled?: boolean
  readOnly?: boolean
  className?: string
}

/**
 * FormInput - A styled input component for the property planner forms.
 * Uses the base Input component from the UI library with glassmorphic styling.
 */
export function FormInput({
  label,
  value,
  onChange,
  prefix,
  suffix,
  type = 'text',
  inputMode = 'numeric',
  min,
  max,
  step,
  helperText,
  disabled,
  readOnly,
  className,
}: FormInputProps) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label className="text-xs font-medium text-slate-400 block">{label}</label>
      <div className="relative">
        {prefix && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium pointer-events-none">
            {prefix}
          </span>
        )}
        <Input
          type={type}
          inputMode={type === 'text' ? inputMode : undefined}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          min={min}
          max={max}
          step={step}
          disabled={disabled}
          readOnly={readOnly}
          className={cn(
            "w-full rounded-xl bg-white/[0.05] border-white/[0.10] text-white text-sm",
            "py-2.5 transition-all duration-200",
            "hover:border-white/[0.15] hover:bg-white/[0.06]",
            "focus:border-white/30 focus:bg-white/[0.08] focus:ring-1 focus:ring-white/10",
            "placeholder:text-slate-500",
            prefix ? "pl-7" : "px-3",
            suffix ? "pr-10" : "pr-3",
            readOnly && "bg-white/[0.02] border-white/[0.04] text-slate-400 cursor-not-allowed",
            disabled && "opacity-50 cursor-not-allowed"
          )}
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs pointer-events-none">
            {suffix}
          </span>
        )}
      </div>
      {helperText && (
        <p className="text-[10px] text-slate-500">{helperText}</p>
      )}
    </div>
  )
}
