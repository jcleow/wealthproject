'use client'

import { useState } from 'react'
import { Info, Lock, Unlock } from 'lucide-react'

export type SliderColor = 'emerald' | 'blue' | 'amber' | 'purple'

interface PercentSliderProps {
  label: string
  value: number
  onChange: (value: number) => void
  min: number
  max: number
  step?: number
  tooltip?: string
  color?: SliderColor
  /** If true, value is treated as a decimal (0.025 = 2.5%). If false, value is displayed as-is */
  isPercent?: boolean
  /** Unit to display after the input (default: '%' for percent, '' otherwise) */
  unit?: string
  /** If true, shows the slider. Default: false (input only) */
  showSlider?: boolean
  /** If true, shows as locked (policy rate) with toggle to unlock. Default: false */
  policyLocked?: boolean
  /** Label to show when locked (e.g., "CPF Policy") */
  policyLabel?: string
}

const colorClasses: Record<SliderColor, string> = {
  emerald: 'accent-emerald-500',
  blue: 'accent-blue-500',
  amber: 'accent-amber-500',
  purple: 'accent-purple-500',
}

const textColors: Record<SliderColor, string> = {
  emerald: 'text-emerald-400',
  blue: 'text-blue-400',
  amber: 'text-amber-400',
  purple: 'text-purple-400',
}

const borderColors: Record<SliderColor, string> = {
  emerald: 'focus:border-emerald-500/50',
  blue: 'focus:border-blue-500/50',
  amber: 'focus:border-amber-500/50',
  purple: 'focus:border-purple-500/50',
}

export function PercentSlider({
  label,
  value,
  onChange,
  min,
  max,
  step = 0.005,
  tooltip,
  color = 'emerald',
  isPercent = true,
  unit,
  showSlider = false,
  policyLocked = false,
  policyLabel = 'CPF Policy',
}: PercentSliderProps) {
  const [isLocked, setIsLocked] = useState(policyLocked)

  // Determine the display unit
  const displayUnit = unit !== undefined ? unit : (isPercent ? '%' : '')

  // Display value (convert decimal to percentage if isPercent)
  const displayValue = isPercent ? (value * 100).toFixed(1) : value.toString()
  const displayMin = isPercent ? (min * 100).toFixed(1) : min.toString()
  const displayMax = isPercent ? (max * 100).toFixed(1) : max.toString()

  const handleInputChange = (inputValue: string) => {
    const parsed = parseFloat(inputValue)
    if (!isNaN(parsed)) {
      // Convert back from percentage to decimal if isPercent
      const actualValue = isPercent ? parsed / 100 : parsed
      // Clamp to min/max
      const clampedValue = Math.max(min, Math.min(max, actualValue))
      onChange(clampedValue)
    }
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-slate-400">{label}</span>
          {tooltip && (
            <div className="group relative">
              <Info className="h-3 w-3 cursor-help text-slate-500" />
              <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 -translate-x-1/2 whitespace-nowrap rounded bg-slate-800 px-2 py-1 text-xs text-slate-300 opacity-0 transition-opacity group-hover:opacity-100">
                {tooltip}
              </div>
            </div>
          )}
          {policyLocked && isLocked && (
            <span className="rounded bg-slate-700/50 px-1.5 py-0.5 text-[9px] font-medium text-slate-500">
              {policyLabel}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {policyLocked && (
            <button
              type="button"
              onClick={() => setIsLocked(!isLocked)}
              className={`rounded p-1 transition ${
                isLocked
                  ? 'text-slate-600 hover:bg-white/[0.05] hover:text-slate-400'
                  : 'text-amber-500/70 hover:bg-amber-500/10 hover:text-amber-400'
              }`}
              title={isLocked ? 'Click to customize' : 'Click to reset to policy rate'}
            >
              {isLocked ? (
                <Lock className="h-3 w-3" />
              ) : (
                <Unlock className="h-3 w-3" />
              )}
            </button>
          )}
          {isLocked ? (
            <span className={`w-16 px-2 py-0.5 text-right font-mono text-sm font-medium text-slate-500`}>
              {displayValue}
            </span>
          ) : (
            <input
              type="number"
              value={displayValue}
              onChange={(e) => handleInputChange(e.target.value)}
              step={isPercent ? step * 100 : step}
              min={displayMin}
              max={displayMax}
              className={`w-16 rounded-md border border-white/[0.08] bg-white/[0.03] px-2 py-0.5 text-right font-mono text-sm font-medium ${textColors[color]} ${borderColors[color]} transition focus:bg-white/[0.05] focus:outline-none`}
            />
          )}
          {displayUnit && (
            <span className={`text-xs ${isLocked ? 'text-slate-500' : textColors[color]}`}>
              {displayUnit}
            </span>
          )}
        </div>
      </div>
      {showSlider && !isLocked && (
        <>
          <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={(e) => onChange(parseFloat(e.target.value))}
            className={`h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-white/10 ${colorClasses[color]}`}
          />
          <div className="flex justify-between text-[10px] text-slate-600">
            <span>{displayMin}{displayUnit}</span>
            <span>{displayMax}{displayUnit}</span>
          </div>
        </>
      )}
    </div>
  )
}
