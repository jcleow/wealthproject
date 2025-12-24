'use client'

import { cn } from '@/lib/utils'

interface ToggleOption<T extends string> {
  value: T
  label: string
  disabled?: boolean
}

interface FormToggleGroupProps<T extends string> {
  label: string
  value: T
  onChange: (value: T) => void
  options: ToggleOption<T>[]
  helperText?: string
  className?: string
}

/**
 * FormToggleGroup - A styled toggle button group for the property planner forms.
 * Following the design system's glassmorphic styling.
 */
export function FormToggleGroup<T extends string>({
  label,
  value,
  onChange,
  options,
  helperText,
  className,
}: FormToggleGroupProps<T>) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label className="text-xs font-medium text-slate-400 block">{label}</label>
      <div className="flex items-center gap-1 p-1 bg-white/[0.02] border border-white/[0.06] rounded-xl">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => !option.disabled && onChange(option.value)}
            disabled={option.disabled}
            className={cn(
              "flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all duration-200",
              value === option.value
                ? "bg-white/10 text-white"
                : option.disabled
                  ? "text-slate-700 cursor-not-allowed"
                  : "text-slate-400 hover:text-slate-200"
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
      {helperText && (
        <p className="text-[10px] text-slate-500">{helperText}</p>
      )}
    </div>
  )
}
