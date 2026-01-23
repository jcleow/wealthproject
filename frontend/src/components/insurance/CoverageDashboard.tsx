'use client'

import { useMemo } from 'react'
import {
  Settings,
  Plus,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Stethoscope,
  Shield,
  Heart,
  Zap,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatCurrency } from '@/lib/format'
import { useColorScheme } from '@/stores'
import { getInsuranceTheme, type InsuranceTheme } from '@/lib/insurance-theme'
import {
  useGuidelines,
  useGuidelineTargets,
  useGuidelinesActions,
  useSelectedPersonId,
} from '@/stores/coverageGuidelinesStore'
import {
  guidelineCoverageConfig,
  type GuidelineCoverageType,
  type CoverageCategoryStatus,
  buildCoverageStatus,
} from '@/types/insurance'
import { usePersonFilter } from '@/contexts/PersonFilterContext'
import { PersonSelector } from '@/components/ui/PersonSelector'

// ============================================================================
// Helper to get status color from theme
// ============================================================================

function getStatusColor(score: number, isEmpty: boolean, theme: InsuranceTheme) {
  if (isEmpty) return theme.textMuted
  if (score >= 80) return theme.sage
  if (score >= 50) return theme.sunlightGold
  return theme.coralRose
}

// ============================================================================
// PROTECTION SCORE GAUGE
// ============================================================================

interface ProtectionScoreGaugeProps {
  score: number
  gapCount: number
  isEmpty: boolean
  compact?: boolean
}

function ProtectionScoreGauge({ score, gapCount, isEmpty, compact = false }: ProtectionScoreGaugeProps) {
  const colorScheme = useColorScheme()
  const monetColors = getInsuranceTheme(colorScheme)

  const size = compact ? 80 : 140
  const strokeWidth = compact ? 8 : 12
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const progress = isEmpty ? 0 : Math.min(100, Math.max(0, score))
  const strokeDashoffset = circumference - (progress / 100) * circumference

  const scoreColor = getStatusColor(score, isEmpty, monetColors)
  const strokeColor = getStatusColor(score, isEmpty, monetColors)

  const getStatusText = () => {
    if (isEmpty) return 'No policies yet'
    if (score >= 80) return 'Well Protected'
    if (score >= 50) return 'Partial Coverage'
    return 'Needs Attention'
  }

  if (compact) {
    return (
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={monetColors.lavenderLight}
            strokeOpacity={0.3}
            strokeWidth={strokeWidth}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            stroke={strokeColor}
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className="text-xl font-bold"
            style={{
              color: scoreColor,
              fontFamily: "'DM Sans', system-ui, sans-serif",
            }}
          >
            {isEmpty ? '—' : `${Math.round(score)}%`}
          </span>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={monetColors.lavenderLight}
            strokeOpacity={0.3}
            strokeWidth={strokeWidth}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            stroke={strokeColor}
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className="text-3xl font-bold"
            style={{
              color: scoreColor,
              fontFamily: "'DM Sans', system-ui, sans-serif",
            }}
          >
            {isEmpty ? '—' : `${Math.round(score)}%`}
          </span>
        </div>
      </div>
      <div className="mt-3 text-center">
        <p
          className="text-sm font-medium"
          style={{ color: scoreColor }}
        >
          {getStatusText()}
        </p>
        {!isEmpty && gapCount > 0 && (
          <p className="text-xs mt-1" style={{ color: monetColors.textMuted }}>
            {gapCount} {gapCount === 1 ? 'gap' : 'gaps'} to address
          </p>
        )}
        {isEmpty && (
          <p className="text-xs mt-1" style={{ color: monetColors.textMuted }}>
            Add policies to see your score
          </p>
        )}
      </div>
    </div>
  )
}

// ============================================================================
// COVERAGE CATEGORY ROW
// ============================================================================

const categoryIcons: Record<GuidelineCoverageType, React.ElementType> = {
  hospitalization: Stethoscope,
  life_tpd: Shield,
  critical_illness: Heart,
  personal_accident: Zap,
}

// Helper to get category colors from theme
function getCategoryColors(categoryType: GuidelineCoverageType, theme: InsuranceTheme) {
  switch (categoryType) {
    case 'hospitalization':
      return { bg: `${theme.coralRose}20`, icon: theme.coralRose }
    case 'life_tpd':
      return { bg: `${theme.lavender}20`, icon: theme.lavender }
    case 'critical_illness':
      return { bg: `${theme.sage}20`, icon: theme.sage }
    case 'personal_accident':
      return { bg: `${theme.sunlightGold}30`, icon: theme.amber }
    default:
      return { bg: `${theme.lavender}20`, icon: theme.lavender }
  }
}

interface CoverageCategoryRowProps {
  category: CoverageCategoryStatus
  isLast?: boolean
}

function CoverageCategoryRow({ category, isLast }: CoverageCategoryRowProps) {
  const colorScheme = useColorScheme()
  const monetColors = getInsuranceTheme(colorScheme)

  const config = guidelineCoverageConfig[category.category]
  const Icon = categoryIcons[category.category]
  const categoryColors = getCategoryColors(category.category, monetColors)

  const getStatusBadge = () => {
    switch (category.status) {
      case 'covered':
        return (
          <span
            className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full"
            style={{
              background: `${monetColors.sage}15`,
              color: monetColors.sage,
            }}
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            Covered
          </span>
        )
      case 'partial':
        return (
          <span
            className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full"
            style={{
              background: `${monetColors.sunlightGold}20`,
              color: monetColors.amber,
            }}
          >
            <AlertTriangle className="h-3.5 w-3.5" />
            Gap
          </span>
        )
      case 'gap':
        return (
          <span
            className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full"
            style={{
              background: `${monetColors.textMuted}15`,
              color: monetColors.textMuted,
            }}
          >
            <AlertTriangle className="h-3.5 w-3.5" />
            No Policy
          </span>
        )
      default:
        return null
    }
  }

  const getProgressColor = () => {
    if (category.percentage >= 100) return monetColors.sage
    if (category.percentage > 0) return monetColors.sunlightGold
    return monetColors.textMuted
  }

  const isHospitalization = category.category === 'hospitalization'

  return (
    <div
      className={cn(
        'group flex items-center justify-between p-4 rounded-2xl transition-all cursor-pointer',
        !isLast && 'mb-3'
      )}
      style={{
        background: monetColors.cardBg,
        border: `1px solid ${monetColors.cardBorder}`,
        boxShadow: `0 2px 8px ${monetColors.shadowSoft}`,
      }}
    >
      <div className="flex items-center gap-4 flex-1 min-w-0">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: categoryColors.bg }}
        >
          <Icon className="h-5 w-5" style={{ color: categoryColors.icon }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-2">
            <h4
              className="font-semibold text-sm"
              style={{
                color: monetColors.textPrimary,
                fontFamily: "'DM Sans', system-ui, sans-serif",
              }}
            >
              {config.label}
            </h4>
            {getStatusBadge()}
          </div>
          <p className="text-[11px] mb-2" style={{ color: monetColors.textMuted }}>
            {isHospitalization ? (
              <>Target: {category.label}</>
            ) : (
              <>
                Target: {formatCurrency(category.target)}
                {category.current > 0 && (
                  <> · Current: {formatCurrency(category.current)}</>
                )}
              </>
            )}
          </p>
          <div className="flex items-center gap-3">
            <div
              className="flex-1 h-1.5 rounded-full overflow-hidden"
              style={{ background: `${monetColors.lavender}20` }}
            >
              <div
                className="h-full rounded-full transition-all duration-700 ease-out"
                style={{
                  width: `${Math.min(100, category.percentage)}%`,
                  background: `linear-gradient(90deg, ${getProgressColor()}, ${getProgressColor()}CC)`,
                }}
              />
            </div>
            <span
              className="text-[10px] font-semibold tabular-nums w-10 text-right"
              style={{ color: monetColors.textSecondary }}
            >
              {category.percentage}%
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// PREMIUM BUDGET BAR
// ============================================================================

interface PremiumBudgetBarProps {
  budget: number
  used: number
  percentageUsed: number
}

function PremiumBudgetBar({ budget, used, percentageUsed }: PremiumBudgetBarProps) {
  const colorScheme = useColorScheme()
  const monetColors = getInsuranceTheme(colorScheme)

  const remaining = Math.max(0, budget - used)

  const getProgressColor = () => {
    if (percentageUsed > 100) return monetColors.coralRose
    if (percentageUsed > 80) return monetColors.sunlightGold
    return monetColors.sage
  }

  return (
    <div
      className="rounded-2xl p-6"
      style={{
        background: monetColors.cardBg,
        border: `1px solid ${monetColors.cardBorder}`,
        boxShadow: `0 4px 16px ${monetColors.shadowSoft}`,
      }}
    >
      <div className="flex items-center gap-2 mb-4">
        <div
          className="w-2 h-2 rounded-full"
          style={{ background: monetColors.lavender }}
        />
        <span
          className="text-[10px] font-bold uppercase tracking-tight"
          style={{ color: monetColors.textMuted }}
        >
          Premium Budget
        </span>
      </div>

      <div className="flex items-center justify-between mb-3">
        <span className="text-sm" style={{ color: monetColors.textSecondary }}>
          Budget: {formatCurrency(budget)}/year
        </span>
        <span
          className="text-sm font-semibold tabular-nums"
          style={{
            color: monetColors.textPrimary,
            fontFamily: "'DM Sans', system-ui, sans-serif",
          }}
        >
          {formatCurrency(used)}/year
        </span>
      </div>

      <div
        className="h-2 rounded-full overflow-hidden mb-3"
        style={{ background: `${monetColors.lavender}20` }}
      >
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{
            width: `${Math.min(100, percentageUsed)}%`,
            background: `linear-gradient(90deg, ${getProgressColor()}, ${getProgressColor()}CC)`,
          }}
        />
      </div>

      <div className="flex items-center justify-between text-xs">
        <span style={{ color: monetColors.textMuted }}>
          {percentageUsed}% of budget used
        </span>
        <span
          className="font-semibold tabular-nums"
          style={{ color: monetColors.sage }}
        >
          {formatCurrency(remaining)} remaining
        </span>
      </div>
    </div>
  )
}

// ============================================================================
// MAIN COVERAGE DASHBOARD
// ============================================================================

interface CoverageDashboardProps {
  onEditTargets?: () => void
  onAddPolicy?: () => void
}

export function CoverageDashboard({ onEditTargets, onAddPolicy }: CoverageDashboardProps) {
  const colorScheme = useColorScheme()
  const monetColors = getInsuranceTheme(colorScheme)

  const guidelines = useGuidelines()
  const targets = useGuidelineTargets()
  const selectedPersonId = useSelectedPersonId()
  const { setSelectedPersonId } = useGuidelinesActions()
  const { includedPersons } = usePersonFilter()

  const selectedPerson = includedPersons.find((p) => p.id === selectedPersonId)

  const coverageStatus = useMemo(() => {
    return buildCoverageStatus(
      guidelines,
      selectedPersonId || '',
      selectedPerson?.name || 'Unknown',
      {
        hospitalization: false,
        life_tpd: 0,
        critical_illness: 0,
        personal_accident: 0,
      },
      {
        monthlyPremium: 0,
        annualPremium: 0,
      }
    )
  }, [guidelines, selectedPersonId, selectedPerson?.name])

  const isEmpty = coverageStatus.categories.every((c) => c.percentage === 0)
  const showPersonTabs = includedPersons.length > 1

  return (
    <div className="p-6">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2
            className="text-lg font-semibold"
            style={{
              color: monetColors.textPrimary,
              fontFamily: "'Cormorant Garamond', Georgia, serif",
            }}
          >
            My Coverage
          </h2>
          <div className="flex items-center gap-2">
            {onEditTargets && (
              <button
                type="button"
                onClick={onEditTargets}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-medium transition-all"
                style={{
                  color: monetColors.textSecondary,
                  background: 'transparent',
                }}
              >
                <Settings className="h-4 w-4" />
                Edit Targets
              </button>
            )}
          </div>
        </div>

        {/* Person Tabs + Score Row */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            {showPersonTabs ? (
              <PersonSelector
                value={selectedPersonId}
                onChange={(id) => id && setSelectedPersonId(id)}
                variant={colorScheme === 'monet' ? 'monet' : 'dark'}
                showCreate={false}
                required
                className="w-48"
              />
            ) : (
              <span
                className="text-sm font-medium"
                style={{
                  color: monetColors.textPrimary,
                  fontFamily: "'DM Sans', system-ui, sans-serif",
                }}
              >
                {selectedPerson?.name || 'No person selected'}
              </span>
            )}
          </div>
          <div className="flex items-center gap-4">
            <ProtectionScoreGauge
              score={coverageStatus.protectionScore}
              gapCount={coverageStatus.gapCount}
              isEmpty={isEmpty}
              compact
            />
            <div className="text-right">
              <p className="text-xs font-medium" style={{ color: monetColors.textMuted }}>
                {isEmpty
                  ? 'No policies yet'
                  : coverageStatus.gapCount > 0
                    ? `${coverageStatus.gapCount} ${coverageStatus.gapCount > 1 ? 'gaps' : 'gap'} to address`
                    : 'Fully covered'}
              </p>
            </div>
          </div>
        </div>

        {/* Stress Test Banner */}
        <div
          className="rounded-2xl px-5 py-4 mb-6 flex items-center justify-between"
          style={{
            background: `${monetColors.lavender}08`,
            border: `1px solid ${monetColors.cardBorder}`,
          }}
        >
          <div className="flex items-center gap-3">
            <Lock className="h-5 w-5" style={{ color: monetColors.textMuted }} />
            <div>
              <span
                className="text-sm font-medium"
                style={{ color: monetColors.textPrimary }}
              >
                Stress Test
              </span>
              <span
                className="ml-2 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full"
                style={{
                  background: `${monetColors.lavender}15`,
                  color: monetColors.textMuted,
                }}
              >
                Coming Soon
              </span>
            </div>
          </div>
          <p className="text-xs hidden sm:block" style={{ color: monetColors.textMuted }}>
            Test your coverage against different scenarios
          </p>
        </div>

        {/* Coverage by Category */}
        <div
          className="rounded-2xl p-6 mb-6"
          style={{
            background: monetColors.cardBg,
            border: `1px solid ${monetColors.cardBorder}`,
            boxShadow: `0 4px 20px ${monetColors.shadowSoft}`,
          }}
        >
          <div className="flex items-center gap-2 mb-4">
            <div
              className="w-2 h-2 rounded-full"
              style={{ background: monetColors.lavender }}
            />
            <span
              className="text-[10px] font-bold uppercase tracking-tight"
              style={{ color: monetColors.textMuted }}
            >
              Coverage by Category
            </span>
          </div>
          {coverageStatus.categories.map((category, index) => (
            <CoverageCategoryRow
              key={category.category}
              category={category}
              isLast={index === coverageStatus.categories.length - 1}
            />
          ))}
        </div>

        {/* Premium Budget */}
        <PremiumBudgetBar
          budget={targets.maxAnnualPremium}
          used={coverageStatus.totalAnnualPremium}
          percentageUsed={coverageStatus.premiumPercentageUsed}
        />

        {/* Add Policy CTA */}
        <div className="mt-6">
          <button
            type="button"
            onClick={onAddPolicy}
            className="w-full flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-6 py-4 text-sm font-medium transition-all"
            style={{
              borderColor: monetColors.cardBorder,
              color: monetColors.textSecondary,
              background: 'transparent',
            }}
          >
            <Plus className="h-5 w-5" />
            Add Your First Policy
          </button>
        </div>
      </div>
    </div>
  )
}
