"use client"

import { cn } from '@/lib/utils'

export type AmountTypeOption = {
  value: string
  label: string
}

interface AmountTypeToggleProps {
  options: AmountTypeOption[]
  value: string
  onChange: (value: string) => void
  className?: string
}

/**
 * Segmented toggle button for selecting amount types (Fixed, %, Rest, Max, etc.)
 * Reusable across downpayment and monthly payment source configurations.
 */
export function AmountTypeToggle({
  options,
  value,
  onChange,
  className,
}: AmountTypeToggleProps) {
  return (
    <div className={cn("flex items-center shrink-0", className)}>
      {options.map((option, idx) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={cn(
            "px-2.5 py-1.5 text-xs font-medium border-y transition-colors",
            idx === 0 && "rounded-l-lg border-l",
            idx === options.length - 1 && "rounded-r-lg border-r",
            idx > 0 && idx < options.length - 1 && "border-l-0",
            value === option.value
              ? "bg-white/[0.08] text-slate-300 border-white/[0.1]"
              : "bg-transparent text-slate-600 border-white/[0.06] hover:text-slate-400"
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
