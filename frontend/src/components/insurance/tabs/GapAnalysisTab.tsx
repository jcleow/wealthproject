'use client'

import { TrendingDown, AlertTriangle, CheckCircle2 } from 'lucide-react'
import {
  insuranceCategoryConfig,
  type CoverageGap,
  formatCoverageAmount,
} from '@/types/insurance'

// Mock data for visualization
const mockGaps: CoverageGap[] = [
  {
    category: 'life',
    categoryLabel: 'Life Insurance',
    needed: 900000,
    current: 350000,
    gap: 550000,
    coveragePercentage: 39,
    priority: 'high',
    recommendation: 'Consider adding $550K term life coverage',
  },
  {
    category: 'critical_illness',
    categoryLabel: 'Critical Illness',
    needed: 340000,
    current: 100000,
    gap: 240000,
    coveragePercentage: 29,
    priority: 'critical',
    recommendation: 'Urgent: Add CI coverage to protect against income loss',
  },
  {
    category: 'hospitalization',
    categoryLabel: 'Hospitalization',
    needed: 100,
    current: 95,
    gap: 5,
    coveragePercentage: 95,
    priority: 'low',
    recommendation: 'Coverage is adequate with ISP + MediShield Life',
  },
  {
    category: 'disability',
    categoryLabel: 'Disability',
    needed: 200000,
    current: 70000,
    gap: 130000,
    coveragePercentage: 35,
    priority: 'high',
    recommendation: 'Consider income protection insurance',
  },
]

export function GapAnalysisTab() {
  const criticalGaps = mockGaps.filter((g) => g.priority === 'critical')
  const highGaps = mockGaps.filter((g) => g.priority === 'high')
  const adequateGaps = mockGaps.filter(
    (g) => g.priority === 'low' || g.priority === 'medium'
  )

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-white">Gap Analysis</h2>
        <p className="text-sm text-slate-400">
          Compare your coverage needs against what you have
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <SummaryCard
          icon={AlertTriangle}
          iconColor="text-rose-400"
          iconBg="bg-rose-500/15"
          label="Critical Gaps"
          value={criticalGaps.length}
          description="Needs immediate attention"
        />
        <SummaryCard
          icon={TrendingDown}
          iconColor="text-amber-400"
          iconBg="bg-amber-500/15"
          label="High Priority"
          value={highGaps.length}
          description="Should address soon"
        />
        <SummaryCard
          icon={CheckCircle2}
          iconColor="text-emerald-400"
          iconBg="bg-emerald-500/15"
          label="Adequate Coverage"
          value={adequateGaps.length}
          description="Well protected"
        />
      </div>

      {/* Coverage Bars */}
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6">
        <h3 className="mb-6 text-lg font-medium text-white">
          Coverage vs Needs
        </h3>
        <div className="space-y-6">
          {mockGaps.map((gap) => (
            <CoverageBar key={gap.category} gap={gap} />
          ))}
        </div>
      </div>

      {/* Gap Details */}
      <div className="grid gap-4 md:grid-cols-2">
        {mockGaps
          .filter((g) => g.priority === 'critical' || g.priority === 'high')
          .map((gap) => (
            <GapDetailCard key={gap.category} gap={gap} />
          ))}
      </div>
    </div>
  )
}

function SummaryCard({
  icon: Icon,
  iconColor,
  iconBg,
  label,
  value,
  description,
}: {
  icon: React.ElementType
  iconColor: string
  iconBg: string
  label: string
  value: number
  description: string
}) {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
      <div className="flex items-center gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${iconBg}`}>
          <Icon className={`h-5 w-5 ${iconColor}`} />
        </div>
        <div>
          <p className="text-sm text-slate-400">{label}</p>
          <p className="text-2xl font-bold text-white">{value}</p>
        </div>
      </div>
      <p className="mt-3 text-xs text-slate-500">{description}</p>
    </div>
  )
}

function CoverageBar({ gap }: { gap: CoverageGap }) {
  const config = insuranceCategoryConfig[gap.category]
  const percentage = Math.min(gap.coveragePercentage, 100)
  const hasGap = gap.gap > 0

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-white">
            {config?.label || gap.categoryLabel}
          </span>
          {gap.priority === 'critical' && (
            <span className="rounded-full bg-rose-500/15 px-2 py-0.5 text-xs font-medium text-rose-400">
              Critical
            </span>
          )}
        </div>
        <div className="text-right">
          <span className="text-sm text-slate-300">
            {formatCoverageAmount(gap.current)}
          </span>
          <span className="text-slate-500"> / </span>
          <span className="text-sm text-slate-400">
            {formatCoverageAmount(gap.needed)}
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="relative h-3 overflow-hidden rounded-full bg-white/[0.05]">
        {/* Current coverage */}
        <div
          className="absolute left-0 top-0 h-full rounded-full bg-emerald-500 transition-all duration-500"
          style={{ width: `${percentage}%` }}
        />
        {/* Gap indicator */}
        {hasGap && (
          <div
            className="absolute top-0 h-full rounded-r-full bg-rose-500/30"
            style={{
              left: `${percentage}%`,
              width: `${100 - percentage}%`,
            }}
          />
        )}
      </div>

      <div className="mt-1 flex items-center justify-between text-xs">
        <span className="text-slate-500">{gap.coveragePercentage}% covered</span>
        {hasGap && (
          <span className="text-rose-400">
            Gap: {formatCoverageAmount(gap.gap)}
          </span>
        )}
      </div>
    </div>
  )
}

function GapDetailCard({ gap }: { gap: CoverageGap }) {
  const priorityColors = {
    critical: {
      border: 'border-rose-500/20',
      bg: 'bg-rose-500/10',
      text: 'text-rose-400',
      badge: 'bg-rose-500/15 text-rose-400',
    },
    high: {
      border: 'border-amber-500/20',
      bg: 'bg-amber-500/10',
      text: 'text-amber-400',
      badge: 'bg-amber-500/15 text-amber-400',
    },
    medium: {
      border: 'border-blue-500/20',
      bg: 'bg-blue-500/10',
      text: 'text-blue-400',
      badge: 'bg-blue-500/15 text-blue-400',
    },
    low: {
      border: 'border-emerald-500/20',
      bg: 'bg-emerald-500/10',
      text: 'text-emerald-400',
      badge: 'bg-emerald-500/15 text-emerald-400',
    },
  }

  const colors = priorityColors[gap.priority]

  return (
    <div
      className={`rounded-2xl border ${colors.border} ${colors.bg} p-5`}
    >
      <div className="flex items-start justify-between">
        <div>
          <span
            className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${colors.badge}`}
          >
            {gap.priority.charAt(0).toUpperCase() + gap.priority.slice(1)} Priority
          </span>
          <h4 className="mt-2 text-lg font-medium text-white">
            {gap.categoryLabel}
          </h4>
        </div>
        <div className="text-right">
          <p className={`text-2xl font-bold ${colors.text}`}>
            {formatCoverageAmount(gap.gap)}
          </p>
          <p className="text-xs text-slate-500">coverage gap</p>
        </div>
      </div>

      <p className="mt-3 text-sm text-slate-300">{gap.recommendation}</p>

      <button
        className={`mt-4 w-full rounded-lg border ${colors.border} bg-white/[0.03] py-2 text-sm font-medium text-white transition-all hover:bg-white/[0.06]`}
      >
        Close This Gap
      </button>
    </div>
  )
}
