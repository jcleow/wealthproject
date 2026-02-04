'use client'

import { useMemo, useState } from 'react'
import { Shield, TrendingDown, AlertCircle, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { numericStyles } from '@/lib/utils'
import { usePersonsQuery } from '@/hooks/queries/usePersonsQuery'
import { useQuestionnaireAutoPopulate } from '@/hooks/useQuestionnaireAutoPopulate'
import { usePersonFilter } from '@/contexts/PersonFilterContext'
import {
  detectLifeStage,
  generateCoverageProjection,
  calculateMilestones,
  calculateAge,
  formatCoverageAmount,
  type PersonCoverageContext,
} from '@/lib/coverage-journey-utils'
import { LifeStagePills, LifeStageIndicator } from './LifeStagePills'
import { CoverageNeedsCurve } from './CoverageNeedsCurve'
import { MilestoneAlerts } from './MilestoneAlerts'

// =============================================================================
// Types
// =============================================================================

interface CoverageJourneyProps {
  className?: string
}

interface CoverageComparisonRowProps {
  category: string
  icon: React.ReactNode
  recommended: number
  current: number
  isAmount?: boolean
}

// =============================================================================
// Sub-Components
// =============================================================================

function CoverageComparisonRow({
  category,
  icon,
  recommended,
  current,
  isAmount = true,
}: CoverageComparisonRowProps) {
  const gap = recommended - current
  const isExcess = gap < 0
  const isOnTarget = gap === 0

  const getStatus = () => {
    if (isOnTarget) return { label: 'On Target', color: 'text-emerald-400', icon: CheckCircle2 }
    if (isExcess) return { label: `+${formatCoverageAmount(Math.abs(gap))}`, color: 'text-emerald-400', icon: CheckCircle2 }
    return { label: `Gap: ${formatCoverageAmount(gap)}`, color: 'text-amber-400', icon: AlertCircle }
  }

  const status = getStatus()
  const StatusIcon = status.icon

  return (
    <div className="flex items-center gap-4 py-3 border-b border-white/[0.04] last:border-0">
      {/* Category */}
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <span className="text-slate-400">{icon}</span>
        <span className="text-sm text-slate-300">{category}</span>
      </div>

      {/* Recommended */}
      <div className="w-28 text-right">
        <span className={numericStyles.muted}>
          {isAmount ? formatCoverageAmount(recommended) : recommended}
        </span>
      </div>

      {/* Current */}
      <div className="w-28 text-right">
        <span className={numericStyles.base}>
          {isAmount ? formatCoverageAmount(current) : current}
        </span>
      </div>

      {/* Status */}
      <div className="w-32 flex items-center justify-end gap-1.5">
        <StatusIcon className={cn('h-3.5 w-3.5', status.color)} />
        <span className={cn('text-xs font-medium', status.color)}>
          {status.label}
        </span>
      </div>
    </div>
  )
}

// =============================================================================
// Main Component
// =============================================================================

export function CoverageJourney({ className }: CoverageJourneyProps) {
  const { includedPersons } = usePersonFilter()
  const { data: persons, isLoading: personsLoading } = usePersonsQuery()

  // Get first included person
  const selectedPersonId = includedPersons[0]?.id ?? null
  const selectedPerson = persons?.find(p => p.id === selectedPersonId)

  // Auto-populated financial data
  const autoPopulated = useQuestionnaireAutoPopulate(selectedPersonId)

  // Selected age for exploration (defaults to current age)
  const currentAge = selectedPerson ? calculateAge(selectedPerson.dateOfBirth) : 35
  const [selectedAge, setSelectedAge] = useState(currentAge)

  // Build context for calculations
  const coverageContext: PersonCoverageContext = useMemo(() => {
    // Get dependents from persons data
    const dependents = (persons ?? [])
      .filter(p => p.id !== selectedPersonId && p.isIncluded)
      .map(p => ({
        name: p.name,
        age: calculateAge(p.dateOfBirth),
      }))
      .filter(d => d.age < 22) // Only count dependents under 22

    return {
      age: currentAge,
      annualIncome: autoPopulated.computed.primaryPersonIncome || 60000, // Default $60k
      dependents,
      mortgageBalance: autoPopulated.computed.totalMortgage,
      mortgageEndYear: autoPopulated.computed.totalMortgage > 0
        ? new Date().getFullYear() + 25 // Assume 25-year mortgage
        : null,
      retirementAge: 65,
    }
  }, [currentAge, autoPopulated, persons, selectedPersonId])

  // Calculate life stage
  const lifeStage = useMemo(() => {
    return detectLifeStage(currentAge, coverageContext.dependents)
  }, [currentAge, coverageContext.dependents])

  // Generate projections
  const projections = useMemo(() => {
    return generateCoverageProjection(coverageContext, 25, 75)
  }, [coverageContext])

  // Calculate milestones
  const milestones = useMemo(() => {
    return calculateMilestones(coverageContext)
  }, [coverageContext])

  // Get recommended coverage at selected age
  const selectedProjection = useMemo(() => {
    return projections.find(p => p.age === selectedAge) ?? projections.find(p => p.age === currentAge)
  }, [projections, selectedAge, currentAge])

  // Current year
  const currentYear = new Date().getFullYear()

  // Loading state
  if (personsLoading || autoPopulated.isLoading) {
    return (
      <div className={cn('animate-pulse space-y-4', className)}>
        <div className="h-12 bg-white/[0.03] rounded-xl" />
        <div className="h-[300px] bg-white/[0.03] rounded-xl" />
        <div className="h-32 bg-white/[0.03] rounded-xl" />
      </div>
    )
  }

  // No person selected
  if (!selectedPerson) {
    return (
      <div className={cn('text-center py-12', className)}>
        <Shield className="h-12 w-12 mx-auto mb-4 text-slate-600" />
        <p className="text-sm text-slate-400">Select a person to view their coverage journey</p>
      </div>
    )
  }

  const isCurrentAge = selectedAge === currentAge
  const yearsFromNow = selectedAge - currentAge

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Coverage Journey</h2>
          <p className="text-sm text-slate-400">
            How your insurance needs change over time
          </p>
        </div>
        <LifeStageIndicator stage={lifeStage} />
      </div>

      {/* Life Stage Pills */}
      <div className="px-4 py-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
        <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-3">
          Your Life Stage
        </div>
        <LifeStagePills currentStage={lifeStage} />
      </div>

      {/* Coverage Needs Curve */}
      <div className="px-4 py-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
        <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-3">
          Coverage Needs Over Time
        </div>
        <CoverageNeedsCurve
          projections={projections}
          milestones={milestones}
          currentAge={currentAge}
          selectedAge={selectedAge}
          onAgeSelect={setSelectedAge}
        />
      </div>

      {/* Coverage Comparison at Selected Age */}
      <div className="px-4 py-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">
              At Age {selectedAge}
            </div>
            <div className="text-sm text-slate-400">
              {isCurrentAge ? (
                <span className="text-emerald-400">Your current age</span>
              ) : yearsFromNow > 0 ? (
                <span>{yearsFromNow} years from now</span>
              ) : (
                <span>{Math.abs(yearsFromNow)} years ago</span>
              )}
            </div>
          </div>
          {!isCurrentAge && (
            <button
              type="button"
              onClick={() => setSelectedAge(currentAge)}
              className="text-xs text-slate-400 hover:text-slate-300 transition-colors"
            >
              ← Back to current
            </button>
          )}
        </div>

        {selectedProjection && (
          <div className="space-y-1">
            {/* Header row */}
            <div className="flex items-center gap-4 pb-2 border-b border-white/[0.08]">
              <div className="flex-1 text-xs font-medium text-slate-500">Category</div>
              <div className="w-28 text-right text-xs font-medium text-slate-500">Recommended</div>
              <div className="w-28 text-right text-xs font-medium text-slate-500">Current</div>
              <div className="w-32 text-right text-xs font-medium text-slate-500">Status</div>
            </div>

            <CoverageComparisonRow
              category="Life/TPD"
              icon={<Shield className="h-4 w-4" />}
              recommended={selectedProjection.recommendedLifeTpd}
              current={0} // Will be from policies in future
            />
            <CoverageComparisonRow
              category="Critical Illness"
              icon={<TrendingDown className="h-4 w-4" />}
              recommended={selectedProjection.recommendedCriticalIllness}
              current={0}
            />
            <CoverageComparisonRow
              category="Personal Accident"
              icon={<AlertCircle className="h-4 w-4" />}
              recommended={selectedProjection.recommendedPersonalAccident}
              current={0}
            />
          </div>
        )}
      </div>

      {/* Milestones */}
      {milestones.length > 0 && (
        <div className="px-4 py-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
          <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-3">
            Upcoming Milestones
          </div>
          <MilestoneAlerts
            milestones={milestones}
            currentYear={currentYear}
          />
        </div>
      )}
    </div>
  )
}
