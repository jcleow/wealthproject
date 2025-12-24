'use client'

import {
  TrendingUp,
  Clock,
  DollarSign,
  ChevronRight,
  Sparkles,
  Shield,
} from 'lucide-react'
import type { InsuranceRecommendation } from '@/types/insurance'
import { formatCoverageAmount, insuranceCategoryConfig } from '@/types/insurance'

// Mock recommendations
const mockRecommendations: InsuranceRecommendation[] = [
  {
    id: '1',
    category: 'critical_illness',
    type: 'early_ci',
    priority: 1,
    suggestedCoverage: 240000,
    estimatedMonthlyPremium: { min: 45, max: 75 },
    rationale:
      'You have a significant CI coverage gap. Early-stage CI plans provide payouts at diagnosis, giving you flexibility during treatment.',
    actionItems: [
      'Compare early-stage CI plans from major insurers',
      'Consider multi-pay CI for comprehensive protection',
      'Factor in existing rider coverage if any',
    ],
  },
  {
    id: '2',
    category: 'life',
    type: 'term_life',
    priority: 2,
    suggestedCoverage: 550000,
    estimatedMonthlyPremium: { min: 35, max: 55 },
    rationale:
      'Term life insurance is the most cost-effective way to protect your dependents. At your age, locking in rates now is advantageous.',
    actionItems: [
      'Compare 20-year vs 30-year term policies',
      'Consider decreasing term to match mortgage timeline',
      'Review convertibility options',
    ],
  },
  {
    id: '3',
    category: 'disability',
    type: 'income_protection',
    priority: 3,
    suggestedCoverage: 130000,
    estimatedMonthlyPremium: { min: 25, max: 40 },
    rationale:
      'Income protection ensures you can maintain your lifestyle if you become unable to work. CareShield Life covers severe disability, but income protection fills the gap.',
    actionItems: [
      'Review existing CPF coverage (DPS)',
      'Consider occupation-specific riders',
      'Compare benefit periods (2 years vs 5 years)',
    ],
  },
]

export function RecommendationsTab() {
  const totalMonthlyMin = mockRecommendations.reduce(
    (sum, r) => sum + r.estimatedMonthlyPremium.min,
    0
  )
  const totalMonthlyMax = mockRecommendations.reduce(
    (sum, r) => sum + r.estimatedMonthlyPremium.max,
    0
  )

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">Recommendations</h2>
          <p className="text-sm text-slate-400">
            Personalized actions to close your coverage gaps
          </p>
        </div>
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 text-right">
          <p className="text-xs text-slate-400">Est. monthly to close all gaps</p>
          <p className="text-lg font-semibold text-white">
            ${totalMonthlyMin} - ${totalMonthlyMax}
          </p>
        </div>
      </div>

      {/* AI Insight */}
      <div className="flex items-start gap-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15">
          <Sparkles className="h-5 w-5 text-emerald-400" />
        </div>
        <div>
          <h3 className="font-medium text-white">Priority Focus</h3>
          <p className="mt-1 text-sm text-slate-300">
            Based on your profile, we recommend addressing Critical Illness
            coverage first. At 29% coverage, this represents your biggest
            protection gap and the highest financial risk.
          </p>
        </div>
      </div>

      {/* Recommendation Cards */}
      <div className="space-y-4">
        {mockRecommendations.map((rec, index) => (
          <RecommendationCard key={rec.id} recommendation={rec} index={index} />
        ))}
      </div>

      {/* Summary */}
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6">
        <h3 className="text-lg font-medium text-white">
          Impact of Following All Recommendations
        </h3>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <ImpactCard
            icon={Shield}
            label="Protection Score"
            before="67%"
            after="94%"
            improvement="+27%"
          />
          <ImpactCard
            icon={DollarSign}
            label="Coverage Gap"
            before="$920K"
            after="$0"
            improvement="Closed"
          />
          <ImpactCard
            icon={Clock}
            label="Monthly Premium"
            before="$120"
            after="$225-$290"
            improvement="+$105-170"
          />
        </div>
      </div>
    </div>
  )
}

function RecommendationCard({
  recommendation,
  index,
}: {
  recommendation: InsuranceRecommendation
  index: number
}) {
  const config = insuranceCategoryConfig[recommendation.category]
  const priorityColors = {
    1: 'border-rose-500/30 bg-rose-500/5',
    2: 'border-amber-500/30 bg-amber-500/5',
    3: 'border-blue-500/30 bg-blue-500/5',
    4: 'border-slate-500/30 bg-slate-500/5',
    5: 'border-slate-500/30 bg-slate-500/5',
  }

  const priorityBadgeColors = {
    1: 'bg-rose-500/15 text-rose-400 border-rose-500/20',
    2: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
    3: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
    4: 'bg-slate-500/15 text-slate-400 border-slate-500/20',
    5: 'bg-slate-500/15 text-slate-400 border-slate-500/20',
  }

  return (
    <div
      className={`rounded-2xl border ${priorityColors[recommendation.priority]} p-6 transition-all hover:border-white/[0.1]`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/[0.05] text-xl font-bold text-slate-400">
            #{index + 1}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-medium text-white">
                {config?.label || recommendation.category}
              </h3>
              <span
                className={`rounded-full border px-2 py-0.5 text-xs font-medium ${priorityBadgeColors[recommendation.priority]}`}
              >
                Priority {recommendation.priority}
              </span>
            </div>
            <p className="mt-1 text-sm text-slate-400">
              {recommendation.type.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
            </p>
          </div>
        </div>

        <div className="text-right">
          <p className="text-xl font-semibold text-white">
            {formatCoverageAmount(recommendation.suggestedCoverage)}
          </p>
          <p className="text-sm text-slate-400">
            ~${recommendation.estimatedMonthlyPremium.min}-$
            {recommendation.estimatedMonthlyPremium.max}/mo
          </p>
        </div>
      </div>

      <p className="mt-4 text-sm text-slate-300">{recommendation.rationale}</p>

      <div className="mt-4 rounded-xl bg-white/[0.03] p-4">
        <h4 className="text-xs font-medium uppercase tracking-wider text-slate-500">
          Action Items
        </h4>
        <ul className="mt-2 space-y-2">
          {recommendation.actionItems.map((item, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
              <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
              {item}
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-4 flex gap-3">
        <button className="flex-1 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 py-2.5 text-sm font-medium text-white shadow-lg shadow-emerald-500/20 transition-all hover:shadow-emerald-500/30">
          Add This Coverage
        </button>
        <button className="rounded-xl border border-white/[0.1] bg-white/[0.03] px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-white/[0.06]">
          Learn More
        </button>
      </div>
    </div>
  )
}

function ImpactCard({
  icon: Icon,
  label,
  before,
  after,
  improvement,
}: {
  icon: React.ElementType
  label: string
  before: string
  after: string
  improvement: string
}) {
  return (
    <div className="rounded-xl bg-white/[0.03] p-4">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-slate-400" />
        <span className="text-sm text-slate-400">{label}</span>
      </div>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="text-sm text-slate-500 line-through">{before}</span>
        <TrendingUp className="h-4 w-4 text-emerald-400" />
        <span className="text-lg font-semibold text-white">{after}</span>
      </div>
      <p className="mt-1 text-xs text-emerald-400">{improvement}</p>
    </div>
  )
}
