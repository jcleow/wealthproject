'use client'

import { useState, useMemo } from 'react'
import { ArrowRight, Plus, TrendingUp, FileSearch } from 'lucide-react'
import { RiskCoverageSummaryCard } from '../cards/RiskCoverageSummaryCard'
import { GovernmentSchemeCard } from '../cards/GovernmentSchemeCard'
import {
  StressTestMatrix,
  StressTestPreview,
} from '../stress-test/StressTestMatrix'
import type {
  RiskCoverageSummary,
  RiskLayerStatus,
  GovernmentCoverageStatus,
} from '@/types/insurance'
import { createMockStressTestMatrix } from '@/lib/stress-test-calculator'

/**
 * OverviewTab - Restructured for Singapore insurance planning
 *
 * Key changes from original:
 * 1. REMOVED: "47% Protected" score - actuarially meaningless
 * 2. REMOVED: Coverage breakdown with red gap bars - emotionally hostile
 * 3. REMOVED: "Critical Gaps Detected" alert - sales manipulation energy
 * 4. ADDED: Risk Layers view - "3 of 5 risk areas covered"
 * 5. ADDED: Event Stress Test - how Singaporeans think about risk
 * 6. UPDATED: Government schemes with limitation warnings
 */

// Mock data for risk layers (replace with real data from hook)
const mockRiskLayers: RiskLayerStatus[] = [
  {
    layer: 'medical_costs',
    status: 'covered',
    summary: 'Ward B1 with ISP + 5% co-pay rider',
    details: [
      'Integrated Shield Plan (PRUShield Plus)',
      'Annual deductible: $3,000',
      'Co-insurance: 5% (capped at $3,000)',
    ],
    governmentCoverage: [
      { scheme: 'medishield_life', contribution: 'Base coverage for B2/C ward' },
    ],
    privateCoverage: [
      { policyName: 'PRUShield Plus', contribution: 'Covers A/B1 ward' },
    ],
  },
  {
    layer: 'income_interruption',
    status: 'partial',
    summary: 'CI covers ~18 months of income',
    details: [
      'Critical Illness coverage: $100,000',
      'No income protection for non-CI illness',
      'No disability income insurance',
    ],
    privateCoverage: [
      { policyName: 'AIA CI Plus', contribution: '$100K lump sum' },
    ],
    exposureNotes: [
      'Income not protected if illness lasts beyond CI payout period',
      'No coverage for temporary disability or non-critical conditions',
    ],
  },
  {
    layer: 'permanent_disability',
    status: 'partial',
    summary: 'DPS ($70K) + partial private coverage',
    details: [
      'DPS provides $70,000 for TPD',
      'Some life policies include TPD rider',
    ],
    governmentCoverage: [
      { scheme: 'dps', contribution: '$70,000 lump sum (death/TPD only)' },
    ],
    exposureNotes: [
      'May not cover lifestyle maintenance long-term',
      'No income replacement beyond lump sum',
    ],
  },
  {
    layer: 'death_dependency',
    status: 'exposed',
    summary: 'Coverage for ~4 years of family expenses',
    details: [
      'Total life coverage: $350,000',
      'DPS: $70,000',
      '2 dependents (spouse + child)',
      'Outstanding mortgage: $350,000',
    ],
    governmentCoverage: [
      { scheme: 'dps', contribution: '$70,000' },
    ],
    privateCoverage: [
      { policyName: 'Term Life', contribution: '$350,000 death benefit' },
    ],
    exposureNotes: [
      'Coverage insufficient to clear mortgage + support family',
      'Family would need alternative income after ~4 years',
    ],
  },
  {
    layer: 'old_age_care',
    status: 'covered',
    summary: 'CareShield Life ($662/mo for severe disability)',
    details: [
      'CareShield Life enrolled (born after 1980)',
      'Payout: $662/month, increasing to ~$1,000 by age 67',
      'Triggers only for severe disability (3+ ADLs)',
    ],
    governmentCoverage: [
      {
        scheme: 'careshield_life',
        contribution: '$662/mo (severe disability only)',
      },
    ],
  },
]

const mockRiskSummary: RiskCoverageSummary = {
  coveredCount: 2,
  partialCount: 2,
  exposedCount: 1,
  totalLayers: 5,
  layers: mockRiskLayers,
  lastCalculated: new Date().toISOString(),
}

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

export function OverviewTab() {
  const [showFullStressTest, setShowFullStressTest] = useState(false)

  // Generate stress test matrix (in production, this would come from a hook)
  const stressTestMatrix = useMemo(() => createMockStressTestMatrix(), [])

  return (
    <div className="space-y-6">
      {/* Risk Coverage Summary - replaces misleading "47% Protected" */}
      <RiskCoverageSummaryCard summary={mockRiskSummary} />

      {/* Event Stress Test - how Singaporeans think about risk */}
      {showFullStressTest ? (
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6">
          <StressTestMatrix matrix={stressTestMatrix} />
          <button
            type="button"
            onClick={() => setShowFullStressTest(false)}
            className="mt-4 text-sm text-slate-400 hover:text-white"
          >
            Collapse stress test
          </button>
        </div>
      ) : (
        <StressTestPreview
          matrix={stressTestMatrix}
          onExpand={() => setShowFullStressTest(true)}
        />
      )}

      {/* Government Schemes - with limitation warnings */}
      <GovernmentSchemeCard schemes={mockGovernmentSchemes} />

      {/* Quick Actions - removed "Close Gaps" (too aggressive) */}
      <div className="grid gap-4 sm:grid-cols-3">
        <QuickActionCard
          icon={Plus}
          title="Add Policy"
          description="Track a new insurance policy"
          href="#policies"
          color="emerald"
        />
        <QuickActionCard
          icon={FileSearch}
          title="Scenario Analysis"
          description="Test coverage against events"
          href="#scenarios"
          color="blue"
        />
        <QuickActionCard
          icon={TrendingUp}
          title="View Options"
          description="Explore coverage options"
          href="#options"
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
