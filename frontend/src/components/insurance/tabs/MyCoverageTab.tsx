'use client'

import {
  Building2,
  Heart,
  Shield,
  Activity,
  FileText,
  MoreHorizontal,
  Plus,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatCurrency } from '@/lib/format'
import { useInsurancePoliciesQuery } from '@/hooks/queries/useInsurancePoliciesQuery'
import type { InsurancePolicyRecord } from '@/api/financial/insurance'

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
    title: 'Critical Illness / Early CI',
    subtitle: 'Lump-sum payout on diagnosis',
    icon: Shield,
    matchCategories: ['critical_illness'],
    defaultTarget: 90_000,
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

function getAnnualPremium(policy: InsurancePolicyRecord): number {
  switch (policy.premiumFrequency) {
    case 'monthly':
      return policy.premiumAmount * 12
    case 'quarterly':
      return policy.premiumAmount * 4
    case 'annually':
      return policy.premiumAmount
    default:
      return policy.premiumAmount
  }
}

function getCategoryPolicies(
  policies: InsurancePolicyRecord[],
  matchCategories: string[]
): InsurancePolicyRecord[] {
  return policies.filter(
    (p) => p.isActive && matchCategories.includes(p.category)
  )
}

function getCategoryCoverageAmount(policies: InsurancePolicyRecord[]): number {
  return policies.reduce((sum, p) => sum + p.coverageAmount, 0)
}

function getCategoryAnnualPremium(policies: InsurancePolicyRecord[]): number {
  return policies.reduce((sum, p) => sum + getAnnualPremium(p), 0)
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

interface MyCoverageTabProps {
  onNavigateToPolicy?: () => void
}

export function MyCoverageTab({ onNavigateToPolicy }: MyCoverageTabProps) {
  const { data: policies = [] } = useInsurancePoliciesQuery()
  const activePolicies = policies.filter((p) => p.isActive)

  // Calculate per-category data
  const categoryData = COVERAGE_CATEGORIES.map((category) => {
    const categoryPolicies = getCategoryPolicies(
      activePolicies,
      category.matchCategories
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

  const coveragePercent =
    categoryData.length > 0
      ? Math.round((coveredCount / categoryData.length) * 100)
      : 0

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
        <h2 className="text-xl font-semibold text-white">Coverage Breakdown</h2>

        {/* Cards Grid - 2x2 */}
        <div className="grid grid-cols-2 gap-5">
          {categoryData.map((category) => {
            if (category.id === 'hospitalization') {
              return (
                <HospitalizationCard
                  key={category.id}
                  category={category}
                  onAddPolicy={onNavigateToPolicy}
                />
              )
            }
            return (
              <ProgressCoverageCard
                key={category.id}
                category={category}
                onAddPolicy={onNavigateToPolicy}
              />
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// COVERAGE SCORE CARD
// Circular progress indicator showing overall coverage %
// ============================================================================

function CoverageScoreCard({ percentage }: { percentage: number }) {
  // Determine color based on coverage level
  const isGood = percentage >= 75
  const isMedium = percentage >= 40 && percentage < 75
  const ringColor = isGood
    ? 'stroke-emerald-500'
    : isMedium
      ? 'stroke-amber-500'
      : 'stroke-slate-500'
  const textColor = isGood
    ? 'text-emerald-400'
    : isMedium
      ? 'text-amber-400'
      : 'text-slate-400'
  const bgRing = isGood
    ? 'bg-emerald-500/10'
    : isMedium
      ? 'bg-amber-500/10'
      : 'bg-slate-500/10'

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
            <span className={cn('text-2xl font-bold font-mono tabular-nums', textColor)}>
              {percentage}%
            </span>
          </div>
        </div>
      </div>

      {/* Label */}
      <div>
        <span className="text-lg font-semibold text-white">Covered</span>
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
      <span className="text-[11px] font-medium font-mono tracking-wider uppercase text-slate-500">
        {label}
      </span>
      <span className="text-2xl font-semibold text-white">{value}</span>
      <span className="text-xs text-slate-500 line-clamp-1">
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
}

function HospitalizationCard({
  category,
  onAddPolicy,
}: {
  category: CategoryCardData
  onAddPolicy?: () => void
}) {
  const { primaryPolicy, annualPremium, hasCoverage } = category
  const Icon = category.icon

  // Derive ward class from notes or subcategory
  const wardClass = primaryPolicy?.subcategory === 'isp' ? 'ISP Plan' : 'MediShield Life'

  return (
    <div className="flex flex-col rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
      {/* Header */}
      <CardHeader
        icon={Icon}
        title={category.title}
        subtitle={category.subtitle}
      />

      {/* Body */}
      <div className="flex-1 flex flex-col gap-4 px-5 py-4">
        {hasCoverage ? (
          <>
            {/* Detail rows */}
            <div className="flex gap-6">
              <div className="flex-1 flex flex-col gap-1">
                <span className="text-[11px] font-medium font-mono tracking-wider uppercase text-slate-500">
                  EXPENSES COVERED
                </span>
                <div className="flex items-center gap-2.5">
                  <span className="text-base font-semibold text-white">
                    ~6 months
                  </span>
                  <span className="text-xs text-slate-500">
                    Based on avg ward stay cost
                  </span>
                </div>
              </div>
              <div className="flex-1 flex flex-col gap-1">
                <span className="text-[11px] font-medium font-mono tracking-wider uppercase text-slate-500">
                  ANNUAL PREMIUM
                </span>
                <div className="flex items-center gap-2.5">
                  <span className="text-base font-semibold text-white">
                    {formatCurrency(annualPremium)}/yr
                  </span>
                  <span className="text-xs text-slate-500">
                    {primaryPolicy?.insurerName
                      ? `${primaryPolicy.insurerName}`
                      : 'MediShield Life'}
                  </span>
                </div>
              </div>
            </div>

            {/* Divider */}
            <div className="h-px bg-white/[0.04]" />

            {/* Policy info footer */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-slate-500" />
                <span className="text-sm text-slate-400">
                  {primaryPolicy?.name ?? 'No policy name'}
                </span>
              </div>
              <span className="text-sm font-medium font-mono tabular-nums text-slate-300">
                {wardClass}
              </span>
            </div>
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
}: {
  category: CategoryCardData
  onAddPolicy?: () => void
}) {
  const {
    coverageAmount,
    defaultTarget,
    annualPremium,
    primaryPolicy,
  } = category
  const Icon = category.icon

  const targetAmount = defaultTarget
  const percentage =
    targetAmount > 0
      ? Math.min(100, Math.round((coverageAmount / targetAmount) * 100))
      : 0
  const gapAmount = Math.max(0, targetAmount - coverageAmount)
  const isFullyCovered = percentage >= 100

  // Progress bar color
  const barColor = isFullyCovered ? 'bg-emerald-500' : 'bg-rose-500'
  const barTextColor = isFullyCovered
    ? 'text-emerald-400'
    : 'text-rose-400'
  const barMessage = isFullyCovered
    ? '100% of target \u2014 fully covered'
    : `${percentage}% of target \u2014 ${formatCurrency(gapAmount)} gap`

  return (
    <div className="flex flex-col rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
      {/* Header */}
      <CardHeader
        icon={Icon}
        title={category.title}
        subtitle={category.subtitle}
      />

      {/* Body */}
      <div className="flex-1 flex flex-col gap-4 px-5 py-4">
        {/* Progress bar section */}
        <div className="flex flex-col gap-2">
          {/* Current / Target row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="text-base font-semibold text-white">
                {formatCurrency(coverageAmount)}
              </span>
              <span className="text-xs text-slate-500">current</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-500">Target:</span>
              <span className="text-xs font-medium text-slate-300">
                {formatCurrency(targetAmount)}
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
          <span className={cn('text-xs font-medium font-mono', barTextColor)}>
            {barMessage}
          </span>
        </div>

        {/* Divider */}
        <div className="h-px bg-white/[0.04]" />

        {/* Coverage details */}
        <div className="flex flex-col gap-2.5">
          <span className="text-[11px] font-medium font-mono tracking-wider uppercase text-slate-500">
            COVERAGE DETAILS
          </span>
          <CoverageDetailStats
            categoryId={category.id}
            policy={primaryPolicy}
            coverageAmount={coverageAmount}
          />
        </div>

        {/* Divider */}
        <div className="h-px bg-white/[0.04]" />

        {/* Policy footer */}
        <div className="flex items-center justify-between">
          {primaryPolicy ? (
            <>
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-slate-500" />
                <span className="text-sm text-slate-400">
                  {primaryPolicy.name}
                </span>
              </div>
              <span className="text-sm font-medium font-mono tabular-nums text-slate-300">
                {formatCurrency(annualPremium)}/yr
              </span>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-slate-500" />
                <span className="text-sm text-slate-400">No active policy</span>
              </div>
              <span className="text-sm font-medium font-mono tabular-nums text-slate-300">
                $0/yr
              </span>
            </>
          )}
        </div>
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
}: {
  categoryId: string
  policy: InsurancePolicyRecord | null
  coverageAmount: number
}) {
  // Category-specific detail stats matching Pencil design layout
  const statSets: Record<string, { label: string; value: string }[]> = {
    life_tpd: [
      {
        label: 'Expenses Covered',
        value: coverageAmount > 0 ? `${Math.floor(coverageAmount / 5000)} months` : '0 months',
      },
      { label: 'Dependents', value: '0' },
    ],
    critical_illness: [
      {
        label: 'Expenses Covered',
        value: coverageAmount > 0 ? `${Math.floor(coverageAmount / 5000)} months` : '0 months',
      },
      { label: 'Monthly Expenses', value: '$5,294' },
      { label: 'Emergency Fund', value: '$3,250' },
    ],
    personal_accident: [
      {
        label: 'Expenses Covered',
        value: coverageAmount > 0 ? `~${Math.max(1, Math.floor(coverageAmount / 18000))} months` : '0 months',
      },
      { label: 'Risk Level', value: 'Medium' },
      { label: 'Occupation', value: 'Moderate' },
    ],
  }

  const stats = statSets[categoryId] ?? []

  return (
    <div className="flex gap-6">
      {stats.map((stat) => (
        <div key={stat.label} className="flex flex-col gap-0.5">
          <span className="text-xs text-slate-500">{stat.label}</span>
          <span className="text-sm font-medium text-slate-200">
            {stat.value}
          </span>
        </div>
      ))}
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
}: {
  icon: React.ElementType
  title: string
  subtitle: string
}) {
  return (
    <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-md bg-white/[0.05]">
          <Icon className="h-[18px] w-[18px] text-slate-400" />
        </div>
        <div className="flex flex-col gap-px">
          <span className="text-base font-semibold text-white">{title}</span>
          <span className="text-xs text-slate-500">{subtitle}</span>
        </div>
      </div>
      <button
        type="button"
        className="flex h-8 w-8 items-center justify-center rounded-md border border-white/[0.06] hover:bg-white/[0.04] transition-colors"
      >
        <MoreHorizontal className="h-4 w-4 text-slate-400" />
      </button>
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
      <p className="text-sm text-slate-500 text-center">
        No active policies in this category
      </p>
      {onAddPolicy && (
        <button
          type="button"
          onClick={onAddPolicy}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          Add Policy
        </button>
      )}
    </div>
  )
}
