'use client'

import {
  Shield,
  Heart,
  Building2,
  Accessibility,
  AlertTriangle,
  Plus,
  ChevronRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { InsuranceCategory, CoverageGap } from '@/types/insurance'
import { formatCoverageAmount, insuranceCategoryConfig } from '@/types/insurance'

interface CoverageBreakdownCardProps {
  gaps: CoverageGap[]
  onViewDetails?: (category: InsuranceCategory) => void
}

const categoryIcons: Record<InsuranceCategory, React.ElementType> = {
  life: Shield,
  critical_illness: Heart,
  hospitalization: Building2,
  disability: Accessibility,
  accident: AlertTriangle,
  custom: Plus,
}

export function CoverageBreakdownCard({
  gaps,
  onViewDetails,
}: CoverageBreakdownCardProps) {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6">
      <h3 className="text-lg font-medium text-white">Coverage Breakdown</h3>
      <p className="mt-1 text-sm text-slate-400">By insurance category</p>

      <div className="mt-6 space-y-4">
        {gaps.map((gap) => (
          <CoverageRow
            key={gap.category}
            gap={gap}
            onViewDetails={onViewDetails}
          />
        ))}
      </div>
    </div>
  )
}

function CoverageRow({
  gap,
  onViewDetails,
}: {
  gap: CoverageGap
  onViewDetails?: (category: InsuranceCategory) => void
}) {
  const config = insuranceCategoryConfig[gap.category]
  const Icon = categoryIcons[gap.category] || Shield
  const percentage = Math.min(gap.coveragePercentage, 100)

  const colorClasses = {
    blue: {
      icon: 'bg-blue-500/15 text-blue-400',
      bar: 'bg-blue-500',
      badge: 'bg-blue-500/15 text-blue-400',
    },
    purple: {
      icon: 'bg-purple-500/15 text-purple-400',
      bar: 'bg-purple-500',
      badge: 'bg-purple-500/15 text-purple-400',
    },
    emerald: {
      icon: 'bg-emerald-500/15 text-emerald-400',
      bar: 'bg-emerald-500',
      badge: 'bg-emerald-500/15 text-emerald-400',
    },
    amber: {
      icon: 'bg-amber-500/15 text-amber-400',
      bar: 'bg-amber-500',
      badge: 'bg-amber-500/15 text-amber-400',
    },
    rose: {
      icon: 'bg-rose-500/15 text-rose-400',
      bar: 'bg-rose-500',
      badge: 'bg-rose-500/15 text-rose-400',
    },
    slate: {
      icon: 'bg-slate-500/15 text-slate-400',
      bar: 'bg-slate-500',
      badge: 'bg-slate-500/15 text-slate-400',
    },
  }

  const colors = colorClasses[config?.color as keyof typeof colorClasses] || colorClasses.slate

  const priorityBadge = {
    critical: { bg: 'bg-rose-500/15', text: 'text-rose-400', label: 'Critical' },
    high: { bg: 'bg-amber-500/15', text: 'text-amber-400', label: 'High' },
    medium: { bg: 'bg-blue-500/15', text: 'text-blue-400', label: 'Medium' },
    low: { bg: 'bg-emerald-500/15', text: 'text-emerald-400', label: 'OK' },
  }

  const badge = priorityBadge[gap.priority]

  return (
    <button
      onClick={() => onViewDetails?.(gap.category)}
      className="group w-full text-left transition-all"
    >
      <div className="flex items-center gap-3">
        {/* Icon */}
        <div
          className={cn(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
            colors.icon
          )}
        >
          <Icon className="h-5 w-5" />
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-white">
                {config?.shortLabel || gap.category}
              </span>
              <span
                className={cn(
                  'rounded-full px-2 py-0.5 text-xs font-medium',
                  badge.bg,
                  badge.text
                )}
              >
                {badge.label}
              </span>
            </div>
            <span className="text-sm tabular-nums text-slate-300">
              {percentage}%
            </span>
          </div>

          {/* Progress bar */}
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/[0.05]">
            <div
              className={cn('h-full rounded-full transition-all duration-500', colors.bar)}
              style={{ width: `${percentage}%` }}
            />
          </div>

          {/* Details */}
          <div className="mt-1.5 flex items-center justify-between text-xs">
            <span className="text-slate-500">
              {formatCoverageAmount(gap.current)} of{' '}
              {formatCoverageAmount(gap.needed)}
            </span>
            {gap.gap > 0 && (
              <span className="flex items-center gap-1 text-rose-400">
                Gap: {formatCoverageAmount(gap.gap)}
                <ChevronRight className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100" />
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  )
}
