'use client'

import { Calendar, GraduationCap, Home, Sunset } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { CoverageMilestone } from '@/lib/coverage-journey-utils'

// =============================================================================
// Types
// =============================================================================

interface MilestoneAlertsProps {
  milestones: CoverageMilestone[]
  currentYear: number
  className?: string
}

// =============================================================================
// Helpers
// =============================================================================

function getMilestoneIcon(category: CoverageMilestone['category']) {
  switch (category) {
    case 'dependent':
      return GraduationCap
    case 'debt':
      return Home
    case 'retirement':
      return Sunset
    default:
      return Calendar
  }
}

function getMilestoneColor(category: CoverageMilestone['category']) {
  switch (category) {
    case 'dependent':
      return {
        bg: 'bg-blue-500/10',
        border: 'border-blue-500/20',
        icon: 'text-blue-400',
        text: 'text-blue-400',
      }
    case 'debt':
      return {
        bg: 'bg-emerald-500/10',
        border: 'border-emerald-500/20',
        icon: 'text-emerald-400',
        text: 'text-emerald-400',
      }
    case 'retirement':
      return {
        bg: 'bg-amber-500/10',
        border: 'border-amber-500/20',
        icon: 'text-amber-400',
        text: 'text-amber-400',
      }
    default:
      return {
        bg: 'bg-slate-500/10',
        border: 'border-slate-500/20',
        icon: 'text-slate-400',
        text: 'text-slate-400',
      }
  }
}

function formatYearsFromNow(targetYear: number, currentYear: number): string {
  const yearsAway = targetYear - currentYear
  if (yearsAway <= 0) return 'Now'
  if (yearsAway === 1) return 'In 1 year'
  return `In ${yearsAway} years`
}

// =============================================================================
// Component
// =============================================================================

export function MilestoneAlerts({
  milestones,
  currentYear,
  className,
}: MilestoneAlertsProps) {
  if (milestones.length === 0) {
    return (
      <div className={cn('px-4 py-6 text-center', className)}>
        <p className="text-sm text-slate-500">
          No upcoming milestones detected
        </p>
      </div>
    )
  }

  return (
    <div className={cn('space-y-3', className)}>
      {/* Timeline visual */}
      <div className="relative flex items-center justify-between px-4 py-3">
        {/* Timeline line */}
        <div className="absolute left-4 right-4 top-1/2 h-px bg-white/[0.08]" />

        {/* Timeline dots */}
        <div className="relative flex items-center justify-between w-full">
          {/* Now marker */}
          <div className="flex flex-col items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-emerald-500 ring-4 ring-emerald-500/20" />
            <span className="text-[10px] font-medium text-emerald-400">NOW</span>
          </div>

          {/* Milestone markers */}
          {milestones.slice(0, 3).map((milestone, idx) => {
            const colors = getMilestoneColor(milestone.category)
            const yearsAway = milestone.year - currentYear
            const position = Math.min(90, (yearsAway / 30) * 100 + 10)

            return (
              <div
                key={idx}
                className="flex flex-col items-center gap-1"
                style={{ position: 'absolute', left: `${position}%`, transform: 'translateX(-50%)' }}
              >
                <div className={cn('w-2.5 h-2.5 rounded-full', colors.bg, 'ring-2', colors.border)} />
                <span className="text-[9px] text-slate-500 whitespace-nowrap max-w-[60px] text-center truncate">
                  {milestone.year}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Milestone Cards */}
      <div className="space-y-2">
        {milestones.map((milestone, idx) => {
          const Icon = getMilestoneIcon(milestone.category)
          const colors = getMilestoneColor(milestone.category)

          return (
            <div
              key={idx}
              className={cn(
                'px-4 py-3 rounded-xl border transition-all duration-200',
                colors.bg,
                colors.border,
                'hover:bg-white/[0.03]'
              )}
            >
              <div className="flex items-start gap-3">
                {/* Icon */}
                <div className={cn('p-2 rounded-lg', colors.bg)}>
                  <Icon className={cn('h-4 w-4', colors.icon)} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium text-slate-500">
                      {milestone.year}
                    </span>
                    <span className="text-[10px] text-slate-600">•</span>
                    <span className="text-[10px] text-slate-600">
                      {formatYearsFromNow(milestone.year, currentYear)}
                    </span>
                  </div>

                  <h4 className="text-sm font-medium text-white mb-0.5">
                    {milestone.event}
                  </h4>

                  <p className="text-xs text-slate-400 mb-2">
                    {milestone.description}
                  </p>

                  {/* Impact */}
                  <div className={cn('inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs', colors.bg)}>
                    <span className={colors.text}>{milestone.impact}</span>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// =============================================================================
// Compact Variant (single line summary)
// =============================================================================

interface MilestoneSummaryProps {
  milestones: CoverageMilestone[]
  currentYear: number
  className?: string
}

export function MilestoneSummary({
  milestones,
  currentYear,
  className,
}: MilestoneSummaryProps) {
  const nextMilestone = milestones[0]

  if (!nextMilestone) {
    return null
  }

  const colors = getMilestoneColor(nextMilestone.category)
  const Icon = getMilestoneIcon(nextMilestone.category)

  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs',
        colors.bg,
        'border',
        colors.border,
        className
      )}
    >
      <Icon className={cn('h-3.5 w-3.5', colors.icon)} />
      <span className="text-slate-400">
        Next: <span className="text-slate-300">{nextMilestone.event}</span>
      </span>
      <span className="text-slate-600">•</span>
      <span className={colors.text}>
        {formatYearsFromNow(nextMilestone.year, currentYear)}
      </span>
    </div>
  )
}
