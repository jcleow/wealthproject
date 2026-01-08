'use client'

import { CheckCircle2, AlertCircle, Circle } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { CoverageStatus } from '@/types/insurance'

interface CoverageStatusBadgeProps {
  status: CoverageStatus
  size?: 'sm' | 'md' | 'lg'
  showIcon?: boolean
  showLabel?: boolean
  className?: string
}

const statusConfig: Record<
  CoverageStatus,
  {
    label: string
    icon: typeof CheckCircle2
    // Using neutral slate for 'exposed' instead of alarming red
    // This creates calm, engineering-style diagnosis rather than sales manipulation
    bgColor: string
    borderColor: string
    textColor: string
    iconColor: string
  }
> = {
  covered: {
    label: 'Covered',
    icon: CheckCircle2,
    bgColor: 'bg-emerald-500/15',
    borderColor: 'border-emerald-500/20',
    textColor: 'text-emerald-400',
    iconColor: 'text-emerald-400',
  },
  partial: {
    label: 'Partial',
    icon: AlertCircle,
    bgColor: 'bg-amber-500/15',
    borderColor: 'border-amber-500/20',
    textColor: 'text-amber-400',
    iconColor: 'text-amber-400',
  },
  exposed: {
    // IMPORTANT: Using slate (neutral) instead of rose/red
    // This avoids "insurance scam" sentiment and sales manipulation energy
    label: 'Exposed',
    icon: Circle,
    bgColor: 'bg-slate-500/15',
    borderColor: 'border-slate-500/20',
    textColor: 'text-slate-400',
    iconColor: 'text-slate-400',
  },
}

const sizeConfig = {
  sm: {
    badge: 'px-2 py-0.5 text-xs gap-1',
    icon: 'h-3 w-3',
  },
  md: {
    badge: 'px-2.5 py-1 text-xs gap-1.5',
    icon: 'h-3.5 w-3.5',
  },
  lg: {
    badge: 'px-3 py-1.5 text-sm gap-2',
    icon: 'h-4 w-4',
  },
}

export function CoverageStatusBadge({
  status,
  size = 'md',
  showIcon = true,
  showLabel = true,
  className,
}: CoverageStatusBadgeProps) {
  const config = statusConfig[status]
  const sizes = sizeConfig[size]
  const Icon = config.icon

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border font-medium',
        config.bgColor,
        config.borderColor,
        config.textColor,
        sizes.badge,
        className
      )}
    >
      {showIcon && <Icon className={cn(sizes.icon, config.iconColor)} />}
      {showLabel && config.label}
    </span>
  )
}

// Icon-only variant for stress test matrix cells
export function CoverageStatusIcon({
  status,
  size = 'md',
  className,
}: {
  status: CoverageStatus
  size?: 'sm' | 'md' | 'lg'
  className?: string
}) {
  const config = statusConfig[status]
  const Icon = config.icon

  const iconSizes = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6',
  }

  return <Icon className={cn(iconSizes[size], config.iconColor, className)} />
}

// Export config for use in other components
export { statusConfig }
