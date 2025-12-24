'use client'

import { ArrowRight, Plus, TrendingUp, AlertTriangle } from 'lucide-react'
import { ProtectionScoreCard } from '../cards/ProtectionScoreCard'
import { CoverageBreakdownCard } from '../cards/CoverageBreakdownCard'
import { GovernmentSchemeCard } from '../cards/GovernmentSchemeCard'
import type { CoverageGap, GovernmentCoverageStatus } from '@/types/insurance'

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

const mockGovernmentSchemes: GovernmentCoverageStatus[] = [
  {
    scheme: 'medishield_life',
    isActive: true,
    notes: 'Active since 2016',
  },
  {
    scheme: 'careshield_life',
    isActive: true,
    monthlyPayout: 662,
    notes: 'Enrolled - born after 1980',
  },
  {
    scheme: 'dps',
    isActive: true,
    coverageAmount: 70000,
    notes: 'Auto-enrolled via CPF',
  },
  {
    scheme: 'eldershield',
    isActive: false,
    notes: 'Replaced by CareShield Life',
  },
]

// Calculate overall protection score (weighted average)
const calculateOverallScore = (gaps: CoverageGap[]): number => {
  const weights: Record<string, number> = {
    life: 0.35,
    critical_illness: 0.25,
    hospitalization: 0.2,
    disability: 0.2,
  }

  let weightedSum = 0
  let totalWeight = 0

  for (const gap of gaps) {
    const weight = weights[gap.category] || 0.1
    weightedSum += gap.coveragePercentage * weight
    totalWeight += weight
  }

  return Math.round(weightedSum / totalWeight)
}

const overallScore = calculateOverallScore(mockGaps)
const totalGap = mockGaps.reduce((sum, g) => sum + Math.max(0, g.gap), 0)
const criticalGaps = mockGaps.filter((g) => g.priority === 'critical')

export function OverviewTab() {
  return (
    <div className="space-y-6">
      {/* Alert for critical gaps */}
      {criticalGaps.length > 0 && (
        <div className="flex items-start gap-3 rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-rose-400" />
          <div>
            <h3 className="font-medium text-rose-400">
              {criticalGaps.length} Critical Gap{criticalGaps.length > 1 ? 's' : ''} Detected
            </h3>
            <p className="mt-1 text-sm text-rose-300/80">
              Your {criticalGaps.map((g) => g.categoryLabel).join(' and ')} coverage
              is below 30%. This leaves you vulnerable to significant financial risk.
            </p>
            <button className="mt-3 flex items-center gap-1.5 text-sm font-medium text-rose-400 transition-colors hover:text-rose-300">
              View Recommendations
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        {/* Protection Score */}
        <ProtectionScoreCard
          score={overallScore}
          totalGap={totalGap}
          trend="stable"
          lastUpdated="Today"
        />

        {/* Coverage Breakdown */}
        <CoverageBreakdownCard gaps={mockGaps} />
      </div>

      {/* Government Schemes */}
      <GovernmentSchemeCard schemes={mockGovernmentSchemes} />

      {/* Quick Actions */}
      <div className="grid gap-4 sm:grid-cols-3">
        <QuickActionCard
          icon={Plus}
          title="Add Policy"
          description="Track a new insurance policy"
          href="#"
          color="emerald"
        />
        <QuickActionCard
          icon={TrendingUp}
          title="View Gap Analysis"
          description="Detailed coverage comparison"
          href="#"
          color="blue"
        />
        <QuickActionCard
          icon={AlertTriangle}
          title="Close Gaps"
          description="Get personalized recommendations"
          href="#"
          color="amber"
        />
      </div>
    </div>
  )
}

function QuickActionCard({
  icon: Icon,
  title,
  description,
  href,
  color,
}: {
  icon: React.ElementType
  title: string
  description: string
  href: string
  color: 'emerald' | 'blue' | 'amber'
}) {
  const colorClasses = {
    emerald: {
      icon: 'bg-emerald-500/15 text-emerald-400',
      hover: 'hover:border-emerald-500/30',
    },
    blue: {
      icon: 'bg-blue-500/15 text-blue-400',
      hover: 'hover:border-blue-500/30',
    },
    amber: {
      icon: 'bg-amber-500/15 text-amber-400',
      hover: 'hover:border-amber-500/30',
    },
  }

  const classes = colorClasses[color]

  return (
    <a
      href={href}
      className={`group flex items-center gap-4 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 transition-all ${classes.hover}`}
    >
      <div
        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${classes.icon}`}
      >
        <Icon className="h-6 w-6" />
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="font-medium text-white">{title}</h3>
        <p className="mt-0.5 text-sm text-slate-400">{description}</p>
      </div>
      <ArrowRight className="h-5 w-5 text-slate-500 transition-transform group-hover:translate-x-1 group-hover:text-white" />
    </a>
  )
}
