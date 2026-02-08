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
  ChevronDown,
  ChevronRight,
  Check,
  Pencil,
  Eye,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatCurrency } from '@/lib/format'
import { useInsurancePoliciesQuery } from '@/hooks/queries/useInsurancePoliciesQuery'
import type { InsurancePolicyRecord } from '@/api/financial/insurance'
import { INSURANCE_TYPOGRAPHY as T } from '@/components/insurance/shared/insurance-typography'
import { useGuidelineTargets } from '@/stores/coverageGuidelinesStore'
import { usePersonsQuery } from '@/hooks/queries/usePersonsQuery'
import type { Person } from '@/types/person'

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
  matchCategories: string[]
): InsurancePolicyRecord[] {
  return policies.filter(
    (p) => p.isActive && matchCategories.includes(p.category)
  )
}

function getCategoryCoverageAmount(policies: InsurancePolicyRecord[]): number {
  return policies.reduce((sum, p) => sum + toNum(p.coverageAmount), 0)
}

function getCategoryAnnualPremium(policies: InsurancePolicyRecord[]): number {
  return policies.reduce((sum, p) => sum + getAnnualPremium(p), 0)
}

// ============================================================================
// PERSON HELPERS
// ============================================================================

function getPersonAge(dateOfBirth: string): number {
  const today = new Date()
  const birth = new Date(dateOfBirth)
  let age = today.getFullYear() - birth.getFullYear()
  const monthDiff = today.getMonth() - birth.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--
  }
  return age
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function getRelationshipLabel(relationship: string): string {
  if (relationship === 'self') return 'You'
  return relationship.charAt(0).toUpperCase() + relationship.slice(1)
}

// ============================================================================
// PERSON VIEW DROPDOWN (Pencil design)
// Multi-select with avatar circles, initials, and age/relationship metadata
// ============================================================================

function PersonViewDropdown({
  persons,
  selectedIds,
  onToggle,
}: {
  persons: Person[]
  selectedIds: Set<string>
  onToggle: (personId: string) => void
}) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) return
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  const selectedCount = selectedIds.size === 0 ? persons.length : selectedIds.size
  const triggerLabel = `${selectedCount} person${selectedCount !== 1 ? 's' : ''}`

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-sm px-3 py-1.5 text-xs transition-all duration-200"
        style={{ border: '1px solid rgba(255, 255, 255, 0.08)' }}
      >
        <span className="text-slate-500">Viewing for</span>
        <span className="font-medium text-slate-200">{triggerLabel}</span>
        <ChevronDown
          className="h-3.5 w-3.5 text-slate-500 transition-transform duration-200"
          style={{ transform: isOpen ? 'rotate(180deg)' : undefined }}
        />
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div
          className="absolute right-0 top-full z-30 mt-1 w-[240px] rounded-lg py-2 shadow-xl"
          style={{
            background: '#111113',
            border: '1px solid rgba(255, 255, 255, 0.08)',
          }}
        >
          {persons.map((person) => {
            const isSelected = selectedIds.size === 0 || selectedIds.has(person.id)
            const age = getPersonAge(person.dateOfBirth)
            const initials = getInitials(person.name)
            const relationshipLabel = getRelationshipLabel(person.relationship ?? 'self')
            const avatarColor = person.displayColor || '#64748b'

            return (
              <button
                key={person.id}
                type="button"
                onClick={() => onToggle(person.id)}
                className="flex w-full items-center gap-2.5 px-3.5 py-2.5 transition-colors hover:bg-white/[0.04]"
                style={{ background: isSelected ? '#1A1A1D' : undefined }}
              >
                {/* Checkbox */}
                <div
                  className="flex h-4 w-4 shrink-0 items-center justify-center"
                  style={{
                    borderRadius: 3,
                    background: isSelected ? '#F0F0F0' : 'transparent',
                    border: isSelected ? 'none' : '1.5px solid #52525B',
                  }}
                >
                  {isSelected && <Check className="h-2.5 w-2.5 text-[#111113]" />}
                </div>

                {/* Avatar circle */}
                <div
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
                  style={{ background: avatarColor }}
                >
                  <span className="text-[10px] font-semibold text-white">{initials}</span>
                </div>

                {/* Info */}
                <div className="flex flex-col items-start gap-px min-w-0">
                  <span className="text-xs font-medium text-slate-200 truncate w-full text-left">
                    {person.name}
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Age {age} · {relationshipLabel}
                  </span>
                </div>
              </button>
            )
          })}

          {persons.length === 0 && (
            <div className="px-3.5 py-3 text-xs text-center text-slate-500">
              No persons added yet
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

interface MyCoverageTabProps {
  onNavigateToPolicy?: () => void
}

export function MyCoverageTab({ onNavigateToPolicy }: MyCoverageTabProps) {
  const { data: policies = [] } = useInsurancePoliciesQuery()
  const { data: personsData } = usePersonsQuery()
  const persons = useMemo(() => personsData ?? [], [personsData])
  const [selectedPersonIds, setSelectedPersonIds] = useState<Set<string>>(new Set())
  const [targetDisplayMode, setTargetDisplayMode] = useState<TargetDisplayMode>('cash')
  const guidelineTargets = useGuidelineTargets()

  const handleTogglePerson = (personId: string) => {
    setSelectedPersonIds((prev) => {
      const next = new Set(prev)
      if (next.has(personId)) {
        next.delete(personId)
      } else {
        next.add(personId)
      }
      return next
    })
  }

  // Filter active policies by selected persons (empty set = show all)
  const activePolicies = useMemo(() => {
    const active = policies.filter((p) => p.isActive)
    if (selectedPersonIds.size === 0) return active
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
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white">Coverage Breakdown</h2>
          {persons.length > 1 && (
            <PersonViewDropdown
              persons={persons}
              selectedIds={selectedPersonIds}
              onToggle={handleTogglePerson}
            />
          )}
        </div>

        {/* Cards Grid - 2x2 */}
        <div className="grid grid-cols-2 gap-5">
          {categoryData.map((category) => {
            if (category.id === 'hospitalization') {
              return (
                <HospitalizationCard
                  key={category.id}
                  category={category}
                  onAddPolicy={onNavigateToPolicy}
                  onViewPolicies={onNavigateToPolicy}
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
                targetDisplayMode={targetDisplayMode}
                onChangeTargetDisplay={setTargetDisplayMode}
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
  targetDisplayMode,
  onChangeTargetDisplay,
}: {
  category: CategoryCardData
  onAddPolicy?: () => void
  onViewPolicies?: () => void
  targetDisplayMode: TargetDisplayMode
  onChangeTargetDisplay: (mode: TargetDisplayMode) => void
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
              <div className="flex-1 flex flex-col gap-1">
                <span className={cn(T.cardLabel, 'text-slate-500')}>
                  EXPENSES COVERED
                </span>
                <div className="flex items-center gap-2.5">
                  <span className={cn(T.cardDetailValue, 'text-white')}>
                    ~6 months
                  </span>
                  <span className={cn(T.cardDescription, 'text-slate-500')}>
                    Based on avg ward stay cost
                  </span>
                </div>
              </div>
              <div className="flex-1 flex flex-col gap-1">
                <span className={cn(T.cardLabel, 'text-slate-500')}>
                  ANNUAL PREMIUM
                </span>
                <div className="flex items-center gap-2.5">
                  <span className={cn(T.cardDetailValue, 'text-white')}>
                    {formatCurrency(annualPremium)}/yr
                  </span>
                  <span className={cn(T.cardDescription, 'text-slate-500')}>
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
                <span className={cn(T.bodyText, 'text-slate-400')}>
                  {primaryPolicy?.name ?? 'No policy name'}
                </span>
                {primaryPolicy?.personName && (
                  <span className={cn(T.metaText, 'text-slate-500')}>
                    · {primaryPolicy.personName}
                  </span>
                )}
              </div>
              <span className="text-[13px] font-medium font-mono tabular-nums text-slate-300">
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
  onViewPolicies,
  targetDisplayMode,
  onChangeTargetDisplay,
}: {
  category: CategoryCardData
  onAddPolicy?: () => void
  onViewPolicies?: () => void
  targetDisplayMode: TargetDisplayMode
  onChangeTargetDisplay: (mode: TargetDisplayMode) => void
}) {
  const {
    coverageAmount,
    resolvedTarget,
    annualPremium,
    primaryPolicy,
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
                {formatCurrency(safeCoverage)}
              </span>
              <span className={cn(T.metaText, 'text-slate-500')}>current</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className={cn(T.metaText, 'text-slate-500')}>Target:</span>
              <span className={cn(T.metaText, 'font-medium text-slate-300')}>
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
                <span className={cn(T.bodyText, 'text-slate-400')}>
                  {primaryPolicy.name}
                </span>
                {primaryPolicy.personName && (
                  <span className={cn(T.metaText, 'text-slate-500')}>
                    · {primaryPolicy.personName}
                  </span>
                )}
              </div>
              <span className="text-[13px] font-medium font-mono tabular-nums text-slate-300">
                {formatCurrency(annualPremium)}/yr
              </span>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-slate-500" />
                <span className={cn(T.bodyText, 'text-slate-400')}>No active policy</span>
              </div>
              <span className="text-[13px] font-medium font-mono tabular-nums text-slate-300">
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

  const menuStyle = {
    background: '#111113',
    border: '1px solid rgba(255, 255, 255, 0.08)',
  }

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
          style={{ ...menuStyle, top: dropdownPos.top, left: dropdownPos.left }}
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

          {/* View Policies */}
          <button
            type="button"
            onClick={() => { onViewPolicies?.(); setIsOpen(false) }}
            className="flex w-full items-center gap-2.5 rounded px-3 py-2 text-[13px] transition-colors hover:bg-white/[0.04]"
          >
            <FileText className="h-3.5 w-3.5 text-slate-500" />
            <span className="text-slate-200">View Policies</span>
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
          style={{ ...menuStyle, top: submenuPos.top, left: submenuPos.left }}
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
