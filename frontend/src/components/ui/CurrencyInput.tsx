"use client"

import { cn } from '@/lib/utils'

interface CurrencyInputProps {
  value: number
  onChange: (value: number) => void
  placeholder?: string
  maxValue?: number
  className?: string
  /** Show percentage symbol instead of dollar */
  isPercentage?: boolean
  /** Use larger text size (text-sm instead of text-xs) */
  size?: 'sm' | 'default'
}

/**
 * Currency/percentage input with formatting and optional max cap.
 * Handles comma formatting and numeric parsing.
 */
export function CurrencyInput({
  value,
  onChange,
  placeholder = "0",
  maxValue,
  className,
  isPercentage = false,
  size = 'default',
}: CurrencyInputProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/,/g, '')
    const num = parseFloat(raw) || 0
    const cappedValue = maxValue !== undefined && maxValue > 0 ? Math.min(num, maxValue) : num
    onChange(cappedValue)
  }

  const textSize = size === 'sm' ? 'text-sm' : 'text-xs'

  return (
    <div className={cn("relative", className)}>
      {!isPercentage && (
        <span className={cn("absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground", textSize)}>$</span>
      )}
      <input
        type="text"
        inputMode="numeric"
        value={value === 0 ? '' : value.toLocaleString()}
        onChange={handleChange}
        placeholder={placeholder}
        className={cn(
          "w-full py-2 rounded-lg bg-white/[0.03] border border-white/[0.06] text-foreground font-mono tabular-nums focus:outline-none focus:border-white/20 placeholder:text-muted-foreground",
          textSize,
          isPercentage ? "pl-3 pr-6" : "pl-7 pr-3"
        )}
      />
      {isPercentage && (
        <span className={cn("absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground", textSize)}>%</span>
      )}
    </div>
  )
}

interface InlineCurrencyInputProps {
  value: number
  onChange: (value: number) => void
  placeholder?: string
  className?: string
  /** Show percentage symbol instead of dollar */
  isPercentage?: boolean
}

/**
 * Inline currency/percentage input (no border wrapper, used inside flex containers).
 */
export function InlineCurrencyInput({
  value,
  onChange,
  placeholder = "0",
  className,
  isPercentage = false,
}: InlineCurrencyInputProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/,/g, '')
    const num = parseFloat(raw) || 0
    onChange(num)
  }

  return (
    <div className={cn("flex items-center flex-1 h-8 px-2.5 rounded-lg border border-white/[0.06] bg-white/[0.02]", className)}>
      {!isPercentage && (
        <span className="text-muted-foreground text-xs">$</span>
      )}
      <input
        type="text"
        inputMode="numeric"
        value={value === 0 ? '' : value.toLocaleString()}
        onChange={handleChange}
        placeholder={placeholder}
        className="flex-1 min-w-0 bg-transparent border-0 outline-none text-foreground text-xs font-mono tabular-nums placeholder:text-muted-foreground ml-1"
      />
      {isPercentage && (
        <span className="text-muted-foreground text-xs ml-1">%</span>
      )}
    </div>
  )
}
