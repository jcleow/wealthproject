'use client'

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { createPortal } from 'react-dom'
import {
  Building2,
  Heart,
  Shield,
  Activity,
  FileText,
  MoreHorizontal,
  Plus,
  ChevronRight,
  Pencil,
  Eye,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatCurrency } from '@/lib/format'
import { useInsurancePoliciesQuery } from '@/hooks/queries/useInsurancePoliciesQuery'
import type { InsurancePolicyRecord } from '@/api/financial/insurance'
import { INSURANCE_TYPOGRAPHY as T } from '@/components/insurance/shared/insurance-typography'
import { PersonViewDropdown } from '@/components/insurance/shared/PersonViewDropdown'
import { useGuidelineTargets, useQuestionnaireAnswers, useCoverageGuidelinesStore } from '@/stores/coverageGuidelinesStore'
import type { CoverageQuestionnaireAnswers } from '@/stores/coverageGuidelinesStore'
import { usePersonsQuery } from '@/hooks/queries/usePersonsQuery'
import { PolicyDetailModal } from '@/components/insurance/modals/PolicyDetailModal'

// ============================================================================
// CATEGORY DEFINITIONS
// Maps the 4 coverage cards from the Pencil design to policy categories
// ============================================================================

interface CategoryDefinition {
  id: string
  title: string
  subtitle: string
  icon: React.ElementType
  matchCategories: string[]
  matchSubcategories?: string[]
  excludeSubcategories?: string[]
  defaultTarget: number
  lucideIcon: string
  detailLabels: string[]
}

const COVERAGE_CATEGORIES: CategoryDefinition[] = [
  {
    id: 'hospitalization',
    title: 'Hospitalization',
    subtitle: 'Ward class & rider coverage',
    icon: Building2,
    matchCategories: ['hospitalization'],
    defaultTarget: 0, // Hospitalization uses different display
    lucideIcon: 'building-2',
    detailLabels: ['Expenses Covered', 'Annual Premium'],
  },
  {
    id: 'life_tpd',
    title: 'Life / TPD',
    subtitle: 'Death & disability coverage',
    icon: Heart,
    matchCategories: ['life'],
    defaultTarget: 500_000,
    lucideIcon: 'heart',
    detailLabels: ['Expenses Covered', 'Dependents'],
  },
  {
    id: 'critical_illness',
    title: 'Critical Illness',
    subtitle: 'Late-stage lump-sum payout',
    icon: Shield,
    matchCategories: ['critical_illness'],
    excludeSubcategories: ['early_ci'],
    defaultTarget: 90_000,
    lucideIcon: 'shield',
    detailLabels: ['Expenses Covered', 'Monthly Expenses', 'Emergency Fund'],
  },
  {
    id: 'early_ci',
    title: 'Early Critical Illness',
    subtitle: 'Early-stage diagnosis payout',
    icon: Shield,
    matchCategories: ['critical_illness'],
    matchSubcategories: ['early_ci'],
    defaultTarget: 100_000,
    lucideIcon: 'shield',
    detailLabels: ['Expenses Covered', 'Monthly Expenses', 'Emergency Fund'],
  },
  {
    id: 'personal_accident',
    title: 'Personal Accident',
    subtitle: 'Accidental injury coverage',
    icon: Activity,
    matchCategories: ['accident'],
    defaultTarget: 270_000,
    lucideIcon: 'activity',
    detailLabels: ['Expenses Covered', 'Risk Level', 'Occupation'],
  },
]

// ============================================================================
// HELPERS
// ============================================================================

/** Shared menu popup style for card action dropdowns */
const cardActionMenuStyle: React.CSSProperties = {
  background: '#111113',
  border: '1px solid rgba(255, 255, 255, 0.08)',
}

/** Safely coerce any value to a finite number (guards against string/NaN from API) */
function toNum(value: unknown): number {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

function getAnnualPremium(policy: InsurancePolicyRecord): number {
  const amount = toNum(policy.premiumAmount)
  switch (policy.premiumFrequency) {
    case 'monthly':
      return amount * 12
    case 'quarterly':
      return amount * 4
    case 'annually':
      return amount
    default:
      return amount
  }
}

function getCategoryPolicies(
  policies: InsurancePolicyRecord[],
  matchCategories: string[],
  matchSubcategories?: string[],
  excludeSubcategories?: string[],
): InsurancePolicyRecord[] {
  return policies.filter((p) => {
    if (!p.isActive) return false
    if (!matchCategories.includes(p.category)) return false
    if (matchSubcategories && matchSubcategories.length > 0) {
      return p.subcategory != null && matchSubcategories.includes(p.subcategory)
    }
    if (excludeSubcategories && excludeSubcategories.length > 0) {
      return p.subcategory == null || !excludeSubcategories.includes(p.subcategory)
    }
    return true
  })
}

function getCategoryCoverageAmount(policies: InsurancePolicyRecord[]): number {
  return policies.reduce((sum, p) => sum + toNum(p.coverageAmount), 0)
}

function getCategoryAnnualPremium(policies: InsurancePolicyRecord[]): number {
  return policies.reduce((sum, p) => sum + getAnnualPremium(p), 0)
}

// PersonViewDropdown is imported from @/components/insurance/shared/PersonViewDropdown

/** Format a dollar amount as months of income or expenses, or as raw cash */
function formatTargetAmount(
  amount: number,
  mode: TargetDisplayMode,
  monthlyIncome: number,
  monthlyExpenses: number,
): string {
  if (mode === 'months_income' && monthlyIncome > 0) {
    const months = Math.round(amount / monthlyIncome)
    return `${months} mo. income`
  }
  if (mode === 'months_expenses' && monthlyExpenses > 0) {
    const months = Math.round(amount / monthlyExpenses)
    return `${months} mo. expenses`
  }
  return formatCurrency(amount)
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

interface MyCoverageTabProps {
  onNavigateToPolicy?: () => void
  onEditTargets?: () => void
}

export function MyCoverageTab({ onNavigateToPolicy, onEditTargets }: MyCoverageTabProps) {
  const { data: policies = [] } = useInsurancePoliciesQuery()
  const { data: personsData } = usePersonsQuery()
  const persons = useMemo(() => personsData ?? [], [personsData])
  const [selectedPersonIds, setSelectedPersonIds] = useState<Set<string> | null>(null)
  const [targetDisplayMode, setTargetDisplayMode] = useState<TargetDisplayMode>('cash')
  const [selectedPolicy, setSelectedPolicy] = useState<InsurancePolicyRecord | null>(null)
  const guidelineTargets = useGuidelineTargets()
  const annualIncome = useCoverageGuidelinesStore((s) => s.guidelines.annualIncome)
  const questionnaireAnswers = useQuestionnaireAnswers()
  const monthlyIncome = annualIncome / 12
  const monthlyExpenses = questionnaireAnswers.criticalIllness.monthlyExpenses || annualIncome / 12

  const handleTogglePerson = (personId: string) => {
    setSelectedPersonIds((prev) => {
      // null = "all selected" (no filter applied).
      // Clicking a person in this state deselects them (show all except clicked).
      if (prev === null) {
        return new Set(persons.filter((p) => p.id !== personId).map((p) => p.id))
      }
      const next = new Set(prev)
      if (next.has(personId)) {
        next.delete(personId)
      } else {
        next.add(personId)
      }
      // If all persons are now selected, collapse back to null (all selected)
      if (next.size === persons.length) {
        return null
      }
      return next
    })
  }

  // Filter active policies by selected persons (null = show all)
  const activePolicies = useMemo(() => {
    const active = policies.filter((p) => p.isActive)
    if (selectedPersonIds === null) return active
    return active.filter((p) => p.personId && selectedPersonIds.has(p.personId))
  }, [policies, selectedPersonIds])

  // Map category IDs to guideline store targets (falls back to hardcoded default)
  const targetForCategory = (categoryId: string, fallback: number): number => {
    const storeTarget = guidelineTargets[categoryId as keyof typeof guidelineTargets]
    return typeof storeTarget === 'number' && storeTarget > 0 ? storeTarget : fallback
  }

  // Calculate per-category data
  const categoryData = COVERAGE_CATEGORIES.map((category) => {
    const categoryPolicies = getCategoryPolicies(
      activePolicies,
      category.matchCategories,
      category.matchSubcategories,
      category.excludeSubcategories,
    )
    const coverageAmount = getCategoryCoverageAmount(categoryPolicies)
    const annualPremium = getCategoryAnnualPremium(categoryPolicies)
    const hasCoverage = categoryPolicies.length > 0
    const primaryPolicy = categoryPolicies[0] ?? null

    return {
      ...category,
      categoryPolicies,
      coverageAmount,
      annualPremium,
      hasCoverage,
      primaryPolicy,
      resolvedTarget: targetForCategory(category.id, category.defaultTarget),
    }
  })

  // Summary metrics
  const coveredCount = categoryData.filter((c) => c.hasCoverage).length
  const gapCount = categoryData.length - coveredCount
  const totalAnnualPremium = categoryData.reduce(
    (sum, c) => sum + c.annualPremium,
    0
  )

  const coveredCategoryNames = categoryData
    .filter((c) => c.hasCoverage)
    .map((c) => c.title)
    .join(', ')
  const gapCategoryNames = categoryData
    .filter((c) => !c.hasCoverage)
    .map((c) => c.title)
    .join(', ')

  // Weighted coverage score: average of (coverage / target) across non-hospitalization categories
  const coveragePercent = (() => {
    const scoreable = categoryData.filter((c) => c.id !== 'hospitalization' && c.resolvedTarget > 0)
    if (scoreable.length === 0) return 0
    const totalRatio = scoreable.reduce((sum, c) => {
      const ratio = Math.min(1, toNum(c.coverageAmount) / c.resolvedTarget)
      return sum + ratio
    }, 0)
    return Math.round((totalRatio / scoreable.length) * 100)
  })()

  return (
    <div className="p-8 space-y-8">
      {/* Summary Row */}
      <div className="flex gap-5">
        {/* Coverage Score Card */}
        <CoverageScoreCard percentage={coveragePercent} />

        {/* Metrics Card */}
        <div className="flex flex-1 rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
          <MetricCell
            label="COVERED"
            value={`${coveredCount} of ${categoryData.length}`}
            description={coveredCategoryNames || 'None yet'}
            hasBorderRight
          />
          <MetricCell
            label="COVERAGE GAPS"
            value={gapCount > 0 ? `${gapCount} area${gapCount !== 1 ? 's' : ''}` : 'None'}
            description={gapCategoryNames || 'All categories covered'}
            hasBorderRight
          />
          <MetricCell
            label="ANNUAL PREMIUM"
            value={formatCurrency(totalAnnualPremium)}
            description="% of annual income"
          />
        </div>
      </div>

      {/* Coverage Breakdown */}
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white">Coverage Breakdown</h2>
          {persons.length > 1 && (
            <PersonViewDropdown
              persons={persons}
              selectedIds={selectedPersonIds}
              onToggle={handleTogglePerson}
              onSelectAll={() => setSelectedPersonIds((prev) => prev === null ? new Set() : null)}
            />
          )}
        </div>

        {/* Cards Grid */}
        <div className="grid grid-cols-2 gap-5">
          {categoryData.map((category) => {
            if (category.id === 'hospitalization') {
              return (
                <HospitalizationCard
                  key={category.id}
                  category={category}
                  onAddPolicy={onNavigateToPolicy}
                  onViewPolicies={onNavigateToPolicy}
                  onEditTargets={onEditTargets}
                  onPolicyClick={setSelectedPolicy}
                  targetDisplayMode={targetDisplayMode}
                  onChangeTargetDisplay={setTargetDisplayMode}
                />
              )
            }
            return (
              <ProgressCoverageCard
                key={category.id}
                category={category}
                onAddPolicy={onNavigateToPolicy}
                onViewPolicies={onNavigateToPolicy}
                onEditTargets={onEditTargets}
                onPolicyClick={setSelectedPolicy}
                targetDisplayMode={targetDisplayMode}
                onChangeTargetDisplay={setTargetDisplayMode}
                monthlyIncome={monthlyIncome}
                monthlyExpenses={monthlyExpenses}
                questionnaireAnswers={questionnaireAnswers}
              />
            )
          })}
        </div>
      </div>

      {/* Policy Detail Modal */}
      <PolicyDetailModal
        isOpen={selectedPolicy !== null}
        onClose={() => setSelectedPolicy(null)}
        policy={selectedPolicy}
        onEdit={() => {
          setSelectedPolicy(null)
          // TODO: open edit modal for this policy
        }}
        onDelete={() => {
          setSelectedPolicy(null)
          // TODO: delete this policy via API
        }}
      />
    </div>
  )
}

// ============================================================================
// COVERAGE SCORE CARD
// Circular progress indicator showing overall coverage %
// ============================================================================

function CoverageScoreCard({ percentage }: { percentage: number }) {
  // Determine color based on coverage level: green (100%), amber (30-99%), red (<30%)
  const isGood = percentage >= 100
  const isMedium = percentage >= 30
  const ringColor = isGood
    ? 'stroke-emerald-500'
    : isMedium
      ? 'stroke-amber-500'
      : 'stroke-red-500'
  const textColor = isGood
    ? 'text-emerald-400'
    : isMedium
      ? 'text-amber-400'
      : 'text-red-400'
  const bgRing = isGood
    ? 'bg-emerald-500/10'
    : isMedium
      ? 'bg-amber-500/10'
      : 'bg-red-500/10'

  // SVG circle progress
  const radius = 38
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (percentage / 100) * circumference

  return (
    <div className="flex items-center gap-5 rounded-xl border border-white/[0.06] bg-white/[0.02] px-6 py-5 w-[280px] shrink-0">
      {/* Circle */}
      <div className="relative h-[88px] w-[88px] shrink-0">
        <svg className="h-full w-full -rotate-90" viewBox="0 0 88 88">
          {/* Background ring */}
          <circle
            cx="44"
            cy="44"
            r={radius}
            fill="none"
            className="stroke-white/[0.06]"
            strokeWidth="5"
          />
          {/* Progress ring */}
          <circle
            cx="44"
            cy="44"
            r={radius}
            fill="none"
            className={ringColor}
            strokeWidth="5"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            style={{ transition: 'stroke-dashoffset 0.6s ease' }}
          />
        </svg>
        {/* Center text */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            className={cn(
              'flex h-[72px] w-[72px] items-center justify-center rounded-full',
              bgRing
            )}
          >
            <span className={cn('text-xl font-bold font-mono tabular-nums', textColor)}>
              {percentage}%
            </span>
          </div>
        </div>
      </div>

      {/* Label */}
      <div>
        <span className={cn(T.sectionTitle, 'text-white')}>Covered</span>
      </div>
    </div>
  )
}

// ============================================================================
// METRIC CELL
// Individual metric in the summary strip
// ============================================================================

function MetricCell({
  label,
  value,
  description,
  hasBorderRight,
}: {
  label: string
  value: string
  description: string
  hasBorderRight?: boolean
}) {
  return (
    <div
      className={cn(
        'flex-1 flex flex-col gap-1.5 p-6',
        hasBorderRight && 'border-r border-white/[0.06]'
      )}
    >
      <span className={cn(T.cardLabel, 'text-slate-500')}>
        {label}
      </span>
      <span className={cn(T.cardValue, 'text-white')}>{value}</span>
      <span className={cn(T.cardDescription, 'text-slate-500 line-clamp-1')}>
        {description}
      </span>
    </div>
  )
}

// ============================================================================
// HOSPITALIZATION CARD
// Special card layout for hospitalization - no progress bar,
// shows key-value details instead
// ============================================================================

interface CategoryCardData {
  id: string
  title: string
  subtitle: string
  icon: React.ElementType
  categoryPolicies: InsurancePolicyRecord[]
  coverageAmount: number
  annualPremium: number
  hasCoverage: boolean
  primaryPolicy: InsurancePolicyRecord | null
  defaultTarget: number
  resolvedTarget: number
}

function HospitalizationCard({
  category,
  onAddPolicy,
  onViewPolicies,
  onEditTargets,
  onPolicyClick,
  targetDisplayMode,
  onChangeTargetDisplay,
}: {
  category: CategoryCardData
  onAddPolicy?: () => void
  onViewPolicies?: () => void
  onEditTargets?: () => void
  onPolicyClick?: (policy: InsurancePolicyRecord) => void
  targetDisplayMode: TargetDisplayMode
  onChangeTargetDisplay: (mode: TargetDisplayMode) => void
}) {
  const { categoryPolicies, annualPremium, hasCoverage } = category
  const Icon = category.icon

  return (
    <div className="flex flex-col rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
      {/* Header */}
      <CardHeader
        icon={Icon}
        title={category.title}
        subtitle={category.subtitle}
        onEditTargets={onEditTargets}
        onViewPolicies={onViewPolicies}
        targetDisplayMode={targetDisplayMode}
        onChangeTargetDisplay={onChangeTargetDisplay}
      />

      {/* Body */}
      <div className="flex-1 flex flex-col gap-4 px-5 py-4">
        {hasCoverage ? (
          <>
            {/* Detail rows */}
            <div className="flex gap-6">
              <div className="flex flex-col gap-0.5">
                <span className={cn(T.metaText, 'text-slate-500')}>
                  Expenses Covered
                </span>
                <span className={cn(T.bodyText, 'font-medium text-slate-200')}>
                  ~6 months
                </span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className={cn(T.metaText, 'text-slate-500')}>
                  Annual Premium
                </span>
                <span className={cn(T.bodyText, 'font-medium text-slate-200')}>
                  {formatCurrency(annualPremium)}/yr
                </span>
              </div>
            </div>

            {/* Divider */}
            <div className="h-px bg-white/[0.04]" />

            {/* Policy list */}
            <PolicyList policies={categoryPolicies} annualPremium={annualPremium} onPolicyClick={onPolicyClick} />
          </>
        ) : (
          <EmptyPolicyState onAddPolicy={onAddPolicy} />
        )}
      </div>
    </div>
  )
}

// ============================================================================
// PROGRESS COVERAGE CARD
// Card with progress bar showing current vs target coverage
// Used for Life/TPD, Critical Illness, Personal Accident
// ============================================================================

function ProgressCoverageCard({
  category,
  onViewPolicies,
  onEditTargets,
  onPolicyClick,
  targetDisplayMode,
  onChangeTargetDisplay,
  monthlyIncome,
  monthlyExpenses,
  questionnaireAnswers,
}: {
  category: CategoryCardData
  onAddPolicy?: () => void
  onViewPolicies?: () => void
  onEditTargets?: () => void
  onPolicyClick?: (policy: InsurancePolicyRecord) => void
  targetDisplayMode: TargetDisplayMode
  onChangeTargetDisplay: (mode: TargetDisplayMode) => void
  monthlyIncome: number
  monthlyExpenses: number
  questionnaireAnswers: CoverageQuestionnaireAnswers
}) {
  const {
    coverageAmount,
    resolvedTarget,
    annualPremium,
    categoryPolicies,
  } = category
  const Icon = category.icon

  const targetAmount = toNum(resolvedTarget)
  const safeCoverage = toNum(coverageAmount)
  const percentage =
    targetAmount > 0
      ? Math.min(100, Math.round((safeCoverage / targetAmount) * 100))
      : 0
  const gapAmount = Math.max(0, targetAmount - safeCoverage)
  const isFullyCovered = percentage >= 100

  // Progress bar color: green (100%), amber (30-99%), red (<30%)
  const isLowCoverage = percentage < 30
  const barColor = isFullyCovered ? 'bg-emerald-500' : isLowCoverage ? 'bg-red-500' : 'bg-amber-600'
  const barTextColor = isFullyCovered
    ? 'text-emerald-400'
    : isLowCoverage
      ? 'text-red-400'
      : 'text-amber-500'

  const displayCoverage = formatTargetAmount(safeCoverage, targetDisplayMode, monthlyIncome, monthlyExpenses)
  const displayTarget = formatTargetAmount(targetAmount, targetDisplayMode, monthlyIncome, monthlyExpenses)
  const displayGap = formatTargetAmount(gapAmount, targetDisplayMode, monthlyIncome, monthlyExpenses)
  const barMessage = isFullyCovered
    ? '100% of target \u2014 fully covered'
    : `${percentage}% of target \u2014 ${displayGap} gap`

  return (
    <div className="flex flex-col rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
      {/* Header */}
      <CardHeader
        icon={Icon}
        title={category.title}
        subtitle={category.subtitle}
        onEditTargets={onEditTargets}
        onViewPolicies={onViewPolicies}
        targetDisplayMode={targetDisplayMode}
        onChangeTargetDisplay={onChangeTargetDisplay}
      />

      {/* Body */}
      <div className="flex-1 flex flex-col gap-4 px-5 py-4">
        {/* Progress bar section */}
        <div className="flex flex-col gap-2">
          {/* Current / Target row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className={cn(T.cardDetailValue, 'text-white')}>
                {displayCoverage}
              </span>
              <span className={cn(T.metaText, 'text-slate-500')}>current</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className={cn(T.metaText, 'text-slate-500')}>Target:</span>
              <span className={cn(T.metaText, 'font-medium text-slate-300')}>
                {displayTarget}
              </span>
            </div>
          </div>

          {/* Track */}
          <div className="h-2 w-full rounded bg-white/[0.06] overflow-hidden">
            <div
              className={cn('h-full rounded transition-all duration-500', barColor)}
              style={{ width: `${Math.min(percentage, 100)}%` }}
            />
          </div>

          {/* Percentage message */}
          <span className={cn(T.metaText, 'font-medium font-mono', barTextColor)}>
            {barMessage}
          </span>
        </div>

        {/* Divider */}
        <div className="h-px bg-white/[0.04]" />

        {/* Coverage details */}
        <div className="flex flex-col gap-2.5">
          <CoverageDetailStats
            categoryId={category.id}
            coverageAmount={coverageAmount}
            monthlyExpenses={monthlyExpenses}
            questionnaireAnswers={questionnaireAnswers}
          />
        </div>

        {/* Divider */}
        <div className="h-px bg-white/[0.04]" />

        {/* Policy list */}
        <PolicyList policies={categoryPolicies} annualPremium={annualPremium} onPolicyClick={onPolicyClick} />
      </div>
    </div>
  )
}

// ============================================================================
// POLICY LIST
// Shows all contributing policies for a category card (multi-person aware)
// ============================================================================

function PolicyList({
  policies,
  annualPremium,
  onAddPolicy,
  onPolicyClick,
}: {
  policies: InsurancePolicyRecord[]
  annualPremium: number
  onAddPolicy?: () => void
  onPolicyClick?: (policy: InsurancePolicyRecord) => void
}) {
  if (policies.length === 0) {
    return (
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-slate-500" />
          <span className={cn(T.bodyText, 'text-slate-400')}>No active policy</span>
        </div>
        {onAddPolicy && (
          <button
            type="button"
            onClick={onAddPolicy}
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200 transition-colors"
          >
            <Plus className="h-3 w-3" />
            Add
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {policies.map((policy) => (
        <button
          key={policy.id}
          type="button"
          onClick={() => onPolicyClick?.(policy)}
          className="flex items-center justify-between w-full text-left rounded px-1 -mx-1 py-0.5 transition-colors hover:bg-white/[0.04]"
        >
          <div className="flex items-center gap-2 min-w-0">
            <FileText className="h-3.5 w-3.5 shrink-0 text-slate-500" />
            <span className={cn(T.metaText, 'text-slate-300 truncate')}>
              {policy.name}
            </span>
            {policy.personName && (
              <span className={cn(T.metaText, 'text-slate-500 shrink-0')}>
                · {policy.personName}
              </span>
            )}
          </div>
          <span className="text-[11px] font-medium font-mono tabular-nums text-slate-400 shrink-0 ml-2">
            {formatCurrency(toNum(policy.coverageAmount))}
          </span>
        </button>
      ))}
      <div className="flex items-center justify-between pt-1 border-t border-white/[0.04]">
        <span className={cn(T.metaText, 'text-slate-500')}>
          {policies.length === 1 ? 'Annual premium' : `${policies.length} policies · Total premium`}
        </span>
        <span className="text-[11px] font-medium font-mono tabular-nums text-slate-300">
          {formatCurrency(annualPremium)}/yr
        </span>
      </div>
    </div>
  )
}

// ============================================================================
// COVERAGE DETAIL STATS
// Shows category-specific stat pairs beneath the progress bar
// ============================================================================

function CoverageDetailStats({
  categoryId,
  coverageAmount,
  monthlyExpenses,
  questionnaireAnswers,
}: {
  categoryId: string
  coverageAmount: number
  monthlyExpenses: number
  questionnaireAnswers: CoverageQuestionnaireAnswers
}) {
  const ciAnswers = questionnaireAnswers.criticalIllness
  const paAnswers = questionnaireAnswers.personalAccident
  const lifeTpdAnswers = questionnaireAnswers.lifeTpd

  // Compute "months of expenses covered" using real monthly expenses
  const expensesMonths = monthlyExpenses > 0
    ? Math.floor(coverageAmount / monthlyExpenses)
    : 0

  // Emergency fund amount = emergency fund months * monthly expenses
  const emergencyFundAmount = ciAnswers.emergencyFundMonths * (ciAnswers.monthlyExpenses || monthlyExpenses)

  // Map occupation risk to display label
  const riskLevelLabels: Record<string, string> = {
    low: 'Low',
    medium: 'Medium',
    high: 'High',
  }

  // Category-specific detail stats using real questionnaire data
  const statSets: Record<string, { label: string; value: string }[]> = {
    life_tpd: [
      {
        label: 'Expenses Covered',
        value: coverageAmount > 0 ? `${expensesMonths} months` : '0 months',
      },
      { label: 'Dependents', value: String(lifeTpdAnswers.dependentCount) },
    ],
    critical_illness: [
      {
        label: 'Expenses Covered',
        value: coverageAmount > 0 ? `${expensesMonths} months` : '0 months',
      },
      { label: 'Monthly Expenses', value: formatCurrency(ciAnswers.monthlyExpenses || monthlyExpenses) },
      { label: 'Emergency Fund', value: formatCurrency(emergencyFundAmount) },
    ],
    early_ci: [
      {
        label: 'Expenses Covered',
        value: coverageAmount > 0 ? `${expensesMonths} months` : '0 months',
      },
      { label: 'Monthly Expenses', value: formatCurrency(ciAnswers.monthlyExpenses || monthlyExpenses) },
      { label: 'Emergency Fund', value: formatCurrency(emergencyFundAmount) },
    ],
    personal_accident: [
      {
        label: 'Expenses Covered',
        value: coverageAmount > 0 ? `~${expensesMonths} months` : '0 months',
      },
      { label: 'Risk Level', value: riskLevelLabels[paAnswers.occupationRisk] ?? 'Unknown' },
      { label: 'Commute', value: paAnswers.commuteMethod.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) },
    ],
  }

  const stats = statSets[categoryId] ?? []

  return (
    <div className="flex gap-6">
      {stats.map((stat) => (
        <div key={stat.label} className="flex flex-col gap-0.5">
          <span className={cn(T.metaText, 'text-slate-500')}>{stat.label}</span>
          <span className={cn(T.bodyText, 'font-medium text-slate-200')}>
            {stat.value}
          </span>
        </div>
      ))}
    </div>
  )
}

// ============================================================================
// TARGET DISPLAY MODE
// ============================================================================

type TargetDisplayMode = 'cash' | 'months_income' | 'months_expenses'

const TARGET_DISPLAY_OPTIONS: { value: TargetDisplayMode; label: string }[] = [
  { value: 'months_income', label: 'Months of Income' },
  { value: 'months_expenses', label: 'Months of Expenses' },
  { value: 'cash', label: 'Cash Amount' },
]

// ============================================================================
// CARD ACTION MENU (Ellipsis dropdown + nested submenu)
// ============================================================================

function CardActionMenu({
  onEditTargets,
  onViewPolicies,
  targetDisplayMode,
  onChangeTargetDisplay,
}: {
  onEditTargets?: () => void
  onViewPolicies?: () => void
  targetDisplayMode: TargetDisplayMode
  onChangeTargetDisplay: (mode: TargetDisplayMode) => void
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [showSubmenu, setShowSubmenu] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const submenuTriggerRef = useRef<HTMLButtonElement>(null)
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 })
  const [submenuPos, setSubmenuPos] = useState({ top: 0, left: 0 })

  // Compute dropdown position from trigger button's bounding rect
  const updateDropdownPos = useCallback(() => {
    if (!triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    setDropdownPos({
      top: rect.bottom + 4,
      left: rect.right - 210, // right-align: dropdown right edge = trigger right edge
    })
  }, [])

  // Compute submenu position from the "View Target As" row's bounding rect
  const updateSubmenuPos = useCallback(() => {
    if (!dropdownRef.current) return
    const dropdownRect = dropdownRef.current.getBoundingClientRect()
    if (submenuTriggerRef.current) {
      const triggerRect = submenuTriggerRef.current.getBoundingClientRect()
      setSubmenuPos({
        top: triggerRect.top,
        left: dropdownRect.right + 4,
      })
    }
  }, [])

  useEffect(() => {
    if (!isOpen) return
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node
      if (
        triggerRef.current?.contains(target) ||
        dropdownRef.current?.contains(target)
      ) return
      // Also check if click is inside the portal submenu
      const submenuEl = document.getElementById('card-action-submenu')
      if (submenuEl?.contains(target)) return
      setIsOpen(false)
      setShowSubmenu(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  // Update position when dropdown opens
  useEffect(() => {
    if (isOpen) updateDropdownPos()
  }, [isOpen, updateDropdownPos])

  // Update submenu position when it opens
  useEffect(() => {
    if (showSubmenu) updateSubmenuPos()
  }, [showSubmenu, updateSubmenuPos])

  return (
    <div className="relative">
      {/* Ellipsis trigger */}
      <button
        ref={triggerRef}
        type="button"
        onClick={() => { setIsOpen(!isOpen); setShowSubmenu(false) }}
        className="flex h-[30px] w-[30px] items-center justify-center rounded-md hover:bg-white/[0.04] transition-colors"
        style={{ border: '1px solid rgba(255, 255, 255, 0.08)' }}
      >
        <MoreHorizontal className="h-3.5 w-3.5 text-slate-200" />
      </button>

      {/* Main dropdown — portaled to document.body */}
      {isOpen && createPortal(
        <div
          ref={dropdownRef}
          className="fixed z-[9999] w-[210px] rounded-lg py-1.5 shadow-xl"
          style={{ ...cardActionMenuStyle, top: dropdownPos.top, left: dropdownPos.left }}
        >
          {/* Edit Targets */}
          <button
            type="button"
            onClick={() => { onEditTargets?.(); setIsOpen(false) }}
            className="flex w-full items-center gap-2.5 rounded px-3 py-2 text-[13px] transition-colors hover:bg-white/[0.04]"
          >
            <Pencil className="h-3.5 w-3.5 text-slate-500" />
            <span className="text-slate-200">Edit Targets</span>
          </button>

          {/* Divider */}
          <div className="my-1 h-px w-full" style={{ background: 'rgba(255, 255, 255, 0.06)' }} />

          {/* View Target As → submenu trigger */}
          <button
            ref={submenuTriggerRef}
            type="button"
            onMouseEnter={() => setShowSubmenu(true)}
            onClick={() => setShowSubmenu(!showSubmenu)}
            className={cn(
              'flex w-full items-center justify-between rounded px-3 py-2 text-[13px] transition-colors',
              showSubmenu ? 'bg-white/[0.04]' : 'hover:bg-white/[0.04]'
            )}
          >
            <div className="flex items-center gap-2.5">
              <Eye className="h-3.5 w-3.5 text-slate-500" />
              <span className={showSubmenu ? 'text-slate-200 font-medium' : 'text-slate-200'}>
                View Target As
              </span>
            </div>
            <ChevronRight className="h-3.5 w-3.5 text-slate-500" />
          </button>
        </div>,
        document.body
      )}

      {/* Submenu — also portaled to document.body */}
      {isOpen && showSubmenu && createPortal(
        <div
          id="card-action-submenu"
          className="fixed z-[10000] w-[200px] rounded-lg py-1.5 shadow-xl"
          style={{ ...cardActionMenuStyle, top: submenuPos.top, left: submenuPos.left }}
          onMouseLeave={() => setShowSubmenu(false)}
        >
          {TARGET_DISPLAY_OPTIONS.map((option) => {
            const isSelected = targetDisplayMode === option.value
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChangeTargetDisplay(option.value)
                  setIsOpen(false)
                  setShowSubmenu(false)
                }}
                className={cn(
                  'flex w-full items-center gap-2.5 rounded px-3 py-2 text-[13px] transition-colors',
                  isSelected ? 'bg-white/[0.04]' : 'hover:bg-white/[0.04]'
                )}
              >
                <div
                  className={cn(
                    'flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border',
                    isSelected ? 'border-slate-200' : 'border-slate-600'
                  )}
                >
                  {isSelected && <div className="h-2 w-2 rounded-full bg-slate-200" />}
                </div>
                <span className={isSelected ? 'text-slate-200 font-medium' : 'text-slate-500'}>
                  {option.label}
                </span>
              </button>
            )
          })}
        </div>,
        document.body
      )}
    </div>
  )
}

// ============================================================================
// SHARED SUB-COMPONENTS
// ============================================================================

function CardHeader({
  icon: Icon,
  title,
  subtitle,
  onEditTargets,
  onViewPolicies,
  targetDisplayMode,
  onChangeTargetDisplay,
}: {
  icon: React.ElementType
  title: string
  subtitle: string
  onEditTargets?: () => void
  onViewPolicies?: () => void
  targetDisplayMode: TargetDisplayMode
  onChangeTargetDisplay: (mode: TargetDisplayMode) => void
}) {
  return (
    <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-white/[0.05]">
          <Icon className={cn(T.categoryIconSize, 'text-slate-400')} />
        </div>
        <div className="flex flex-col gap-px">
          <span className={cn(T.sectionTitle, 'text-white')}>{title}</span>
          <span className={cn(T.metaText, 'text-slate-500')}>{subtitle}</span>
        </div>
      </div>
      <CardActionMenu
        onEditTargets={onEditTargets}
        onViewPolicies={onViewPolicies}
        targetDisplayMode={targetDisplayMode}
        onChangeTargetDisplay={onChangeTargetDisplay}
      />
    </div>
  )
}

function EmptyPolicyState({
  onAddPolicy,
}: {
  onAddPolicy?: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center py-6 gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/[0.04]">
        <Shield className="h-5 w-5 text-slate-500" />
      </div>
      <p className={cn(T.bodyText, 'text-slate-500 text-center')}>
        No active policies in this category
      </p>
      {onAddPolicy && (
        <button
          type="button"
          onClick={onAddPolicy}
          className={cn(T.bodyText, 'flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 transition-colors')}
        >
          <Plus className="h-3.5 w-3.5" />
          Add Policy
        </button>
      )}
    </div>
  )
}
