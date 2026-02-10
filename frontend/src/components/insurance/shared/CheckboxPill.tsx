'use client'

import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { INSURANCE_TYPOGRAPHY as T } from './insurance-typography'

// ─────────────────────────────────────────────────────────────────────────────
// CheckboxPill — a reusable multi-select toggle pill with check icon
// ─────────────────────────────────────────────────────────────────────────────

export interface CheckboxPillProps {
  label: string
  isActive: boolean
  onToggle: () => void
  /** Color of the check icon when inactive (e.g. category-specific accent). Defaults to muted gray. */
  checkColor?: string
  /** Override active background color */
  activeBg?: string
  /** Override active text color */
  activeText?: string
  /** Override inactive background color */
  inactiveBg?: string
  /** Override inactive border color */
  inactiveBorder?: string
  /** Override inactive text color */
  inactiveText?: string
  className?: string
}

const DEFAULT_COLORS = {
  activeBg: '#F0F0F0',
  activeText: '#111113',
  inactiveBg: 'rgba(255, 255, 255, 0.02)',
  inactiveBorder: 'rgba(255, 255, 255, 0.08)',
  inactiveText: '#F0F0F0',
  checkColor: '#71717A',
} as const

export function CheckboxPill({
  label,
  isActive,
  onToggle,
  checkColor = DEFAULT_COLORS.checkColor,
  activeBg = DEFAULT_COLORS.activeBg,
  activeText = DEFAULT_COLORS.activeText,
  inactiveBg = DEFAULT_COLORS.inactiveBg,
  inactiveBorder = DEFAULT_COLORS.inactiveBorder,
  inactiveText = DEFAULT_COLORS.inactiveText,
  className,
}: CheckboxPillProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        'flex items-center gap-1.5 rounded-full px-3 py-[5px] cursor-pointer transition-all duration-150',
        T.chipText,
        className
      )}
      style={
        isActive
          ? { background: activeBg, color: activeText, fontWeight: 500 }
          : { background: inactiveBg, border: `1px solid ${inactiveBorder}`, color: inactiveText }
      }
    >
      <Check
        className="h-3 w-3"
        style={{ color: isActive ? activeText : checkColor }}
      />
      {label}
    </button>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// CheckboxPillGroup — convenience wrapper for rendering a labeled group of pills
// ─────────────────────────────────────────────────────────────────────────────

export interface CheckboxPillOption {
  key: string
  label: string
  checkColor?: string
}

export interface CheckboxPillGroupProps {
  /** Optional label displayed before the pills (e.g. "Analyze:", "Coverage:") */
  label?: string
  options: CheckboxPillOption[]
  activeKeys: Set<string>
  onToggle: (key: string) => void
  /** Label text color */
  labelColor?: string
  className?: string
}

export function CheckboxPillGroup({
  label,
  options,
  activeKeys,
  onToggle,
  labelColor = '#71717A',
  className,
}: CheckboxPillGroupProps) {
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      {label && (
        <span className={T.metaText} style={{ color: labelColor }}>
          {label}
        </span>
      )}
      {options.map((option) => (
        <CheckboxPill
          key={option.key}
          label={option.label}
          isActive={activeKeys.has(option.key)}
          onToggle={() => onToggle(option.key)}
          checkColor={option.checkColor}
        />
      ))}
    </div>
  )
}
