'use client'

import { useState, useMemo, useEffect } from 'react'
import * as Slider from '@radix-ui/react-slider'
import {
  Info,
  Check,
  AlertCircle,
  ChevronDown,
  ArrowRight,
  ArrowLeft,
  RotateCcw,
  Building2,
  Home,
  Clock,
  Briefcase,
  Sparkles,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatCurrency } from '@/lib/format'
import { useColorScheme } from '@/stores'
import { getInsuranceTheme } from '@/lib/insurance-theme'
import {
  useGuidelines,
  useGuidelinesActions,
  useGuidelineTargets,
  useHasConfiguredGuidelines,
  useSelectedPersonId,
  useIsEditingGuidelines,
  useQuestionnaireAnswers,
  useQuestionnaireRecommendations,
} from '@/stores/coverageGuidelinesStore'
import {
  guidelineCoverageConfig,
  wardClassConfig,
  type GuidelineCoverageType,
  type WardClass,
} from '@/types/insurance'
import { PersonSelector } from '@/components/ui/PersonSelector'
import { usePersonFilter } from '@/contexts/PersonFilterContext'
import { useIncomesQuery } from '@/hooks/queries/useIncomesQuery'
import { CoverageDashboard } from '@/components/insurance/CoverageDashboard'
import { CoverageLayersInline } from '@/components/insurance/CoverageLayers'
import { useQuestionnaireAutoPopulate } from '@/hooks/useQuestionnaireAutoPopulate'
import type { Frequency } from '@/types/financial'

// Helper to calculate annual income from frequency
const frequencyMultipliers: Record<Frequency, number> = {
  weekly: 52,
  biweekly: 26,
  monthly: 12,
  quarterly: 4,
  annual: 1,
  one_time: 0, // One-time doesn't contribute to annual income calculation
}

function calculateAnnualIncomeForPerson(
  incomes: { personId?: string | null; amount: number; frequency: Frequency; endDate?: string }[],
  personId: string
): number {
  const currentYear = new Date().getFullYear()
  return incomes
    .filter((income) => {
      // Must belong to selected person
      if (income.personId !== personId) return false
      // Must be active (no end date or end date in future)
      if (income.endDate) {
        const endYear = new Date(income.endDate).getFullYear()
        if (endYear < currentYear) return false
      }
      return true
    })
    .reduce((total, income) => {
      const multiplier = frequencyMultipliers[income.frequency] || 0
      return total + income.amount * multiplier
    }, 0)
}

// ============================================================================
// WIZARD STEP INDICATOR (Monet Impressionist Style)
// ============================================================================

interface WizardStepIndicatorProps {
  currentStep: number
  totalSteps: number
  stepLabels: string[]
}

function WizardStepIndicator({ currentStep, totalSteps, stepLabels }: WizardStepIndicatorProps) {
  const colorScheme = useColorScheme()
  const monetWizard = getInsuranceTheme(colorScheme)

  return (
    <div className="flex items-center justify-center mb-12">
      {Array.from({ length: totalSteps }).map((_, index) => {
        const stepNumber = index + 1
        const isComplete = stepNumber < currentStep
        const isCurrent = stepNumber === currentStep

        return (
          <div key={index} className="flex items-center">
            <div className="flex flex-col items-center">
              {/* Minimal step indicator */}
              <div
                className="flex h-8 w-8 items-center justify-center rounded-full transition-all duration-500"
                style={{
                  background: isComplete
                    ? monetWizard.sage
                    : isCurrent
                      ? monetWizard.cardBgHover
                      : 'transparent',
                  border: `1.5px solid ${
                    isComplete
                      ? monetWizard.sage
                      : isCurrent
                        ? monetWizard.lavender
                        : `${monetWizard.lavender}30`
                  }`,
                  boxShadow: isCurrent ? `0 2px 12px ${monetWizard.shadowSoft}` : 'none',
                }}
              >
                {isComplete ? (
                  <Check className="h-4 w-4 text-white" />
                ) : (
                  <span
                    className="text-xs font-medium"
                    style={{
                      color: isCurrent ? monetWizard.lavender : monetWizard.textMuted,
                    }}
                  >
                    {stepNumber}
                  </span>
                )}
              </div>
              <span
                className="mt-2 text-[10px] uppercase tracking-wider"
                style={{
                  color: isCurrent ? monetWizard.textPrimary : monetWizard.textMuted,
                }}
              >
                {stepLabels[index]}
              </span>
            </div>

            {/* Thin connector line */}
            {index < totalSteps - 1 && (
              <div
                className="mx-6 h-px w-12 transition-all duration-500"
                style={{
                  background: isComplete
                    ? monetWizard.sage
                    : `${monetWizard.lavender}25`,
                }}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ============================================================================
// WIZARD STEP 1: PERSON & INCOME
// ============================================================================

interface WizardStep1Props {
  onNext: () => void
}

function WizardStep1Income({ onNext }: WizardStep1Props) {
  const colorScheme = useColorScheme()
  const monetWizard = getInsuranceTheme(colorScheme)

  const guidelines = useGuidelines()
  const selectedPersonId = useSelectedPersonId()
  const { setAnnualIncome, setSelectedPersonId } = useGuidelinesActions()
  const { includedPersons } = usePersonFilter()
  const { data: incomes = [] } = useIncomesQuery()

  // Calculate annual income when person changes
  const calculatedIncome = useMemo(() => {
    if (!selectedPersonId) return 0
    return calculateAnnualIncomeForPerson(incomes, selectedPersonId)
  }, [incomes, selectedPersonId])

  // Auto-select first person if none selected and persons exist
  useEffect(() => {
    if (!selectedPersonId && includedPersons.length > 0) {
      setSelectedPersonId(includedPersons[0].id)
    }
  }, [selectedPersonId, includedPersons, setSelectedPersonId])

  // Update store when calculated income changes
  useEffect(() => {
    if (calculatedIncome > 0) {
      setAnnualIncome(calculatedIncome)
    }
  }, [calculatedIncome, setAnnualIncome])

  const selectedPerson = includedPersons.find((p) => p.id === selectedPersonId)
  const hasNoIncome = selectedPersonId && calculatedIncome === 0
  const canProceed = guidelines.annualIncome > 0

  return (
    <div className="max-w-md mx-auto">
      {/* Header - minimal */}
      <div className="text-center mb-10">
        <p
          className="text-[11px] font-medium uppercase tracking-[0.15em] mb-3"
          style={{ color: monetWizard.lavender }}
        >
          Step 1 of 3
        </p>
        <h2
          className="text-2xl font-light tracking-tight mb-2"
          style={{
            color: monetWizard.textPrimary,
            fontFamily: "'Cormorant Garamond', Georgia, serif",
          }}
        >
          Who are we planning for?
        </h2>
        <p className="text-sm" style={{ color: monetWizard.textMuted }}>
          Select a person to calculate their coverage needs
        </p>
      </div>

      {/* Person selector - glass card */}
      <div
        className="rounded-3xl p-6 mb-6 backdrop-blur-md"
        style={{
          background: monetWizard.cardBg,
          border: `1px solid ${monetWizard.cardBorder}`,
          boxShadow: `0 8px 32px ${monetWizard.shadowSoft}`,
        }}
      >
        <label
          className="block text-[10px] uppercase tracking-wider mb-3"
          style={{ color: monetWizard.textMuted }}
        >
          Select person
        </label>
        <PersonSelector
          value={selectedPersonId}
          onChange={setSelectedPersonId}
          placeholder="Select a person"
          required
          variant={colorScheme === 'monet' ? 'monet' : 'dark'}
          showCreate={false}
        />

        {/* Income display */}
        {selectedPersonId && (
          <div
            className="mt-6 pt-6"
            style={{ borderTop: `1px solid ${monetWizard.cardBorder}` }}
          >
            <div className="flex items-center justify-between mb-3">
              <span
                className="text-[10px] uppercase tracking-wider"
                style={{ color: monetWizard.textMuted }}
              >
                Annual income
              </span>
              {calculatedIncome > 0 && (
                <span
                  className="text-[10px] uppercase tracking-wider"
                  style={{ color: monetWizard.sage }}
                >
                  Auto-detected
                </span>
              )}
            </div>
            <div
              className="text-3xl font-light tabular-nums"
              style={{
                color: monetWizard.textPrimary,
                fontFamily: "'Cormorant Garamond', Georgia, serif",
              }}
            >
              {formatCurrency(calculatedIncome)}
            </div>

            {hasNoIncome && (
              <div
                className="mt-4 flex items-start gap-3 rounded-xl p-4"
                style={{
                  background: `${monetWizard.amber}08`,
                  border: `1px solid ${monetWizard.amber}20`,
                }}
              >
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" style={{ color: monetWizard.amber }} />
                <p className="text-xs" style={{ color: monetWizard.textSecondary }}>
                  No income found for {selectedPerson?.name}. Add income in Financial Data first.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Info box - subtle */}
      <div
        className="flex items-start gap-3 rounded-2xl p-4 mb-8"
        style={{
          background: `${monetWizard.lavender}08`,
          border: `1px solid ${monetWizard.lavender}15`,
        }}
      >
        <Info className="h-4 w-4 shrink-0 mt-0.5" style={{ color: monetWizard.lavender }} />
        <p className="text-xs leading-relaxed" style={{ color: monetWizard.textMuted }}>
          Coverage targets are calculated as multiples of income (e.g., 10× for life insurance).
        </p>
      </div>

      {/* Next button - pill shape */}
      <button
        type="button"
        onClick={onNext}
        disabled={!canProceed}
        className="w-full flex items-center justify-center gap-2 rounded-full px-6 py-4 text-sm font-medium uppercase tracking-wider transition-all duration-300"
        style={{
          background: canProceed ? monetWizard.sage : `${monetWizard.lavender}20`,
          color: canProceed ? 'white' : monetWizard.textMuted,
          boxShadow: canProceed ? `0 4px 20px ${monetWizard.sage}40` : 'none',
          cursor: canProceed ? 'pointer' : 'not-allowed',
        }}
      >
        Continue
        <ArrowRight className="h-4 w-4" />
      </button>
    </div>
  )
}

// ============================================================================
// WIZARD STEP 2: COVERAGE MULTIPLIERS
// ============================================================================

interface WizardStep2Props {
  onNext: () => void
  onBack: () => void
}

// Educational tooltips for each coverage type
const coverageEducation: Record<GuidelineCoverageType, { title: string; points: string[]; extra?: string[] }> = {
  hospitalization: {
    title: 'Why Hospitalization Coverage?',
    points: [
      'MediShield Life only covers B2/C wards with high co-pay',
      'ISP (Integrated Shield Plan) covers higher ward classes',
      'Riders reduce your out-of-pocket costs (but new rules apply from Apr 2026)',
      'Hospital bills can easily exceed $100K for major surgeries',
    ],
    extra: [
      '── Ward Classes ──',
      'Class A: Single room, air-con, private bathroom. Highest premiums.',
      'Class B1: 4-bed room, air-con. Good balance of comfort and cost.',
      'Class B2+: 6-bed room, air-con. Affordable with decent comfort.',
      'Class C: 8+ bed room, fan-cooled. Lowest premiums, covered by MediShield Life.',
      '── About Riders ──',
      'A rider is an add-on to your ISP that reduces co-payment and deductible.',
      'Without rider: You pay deductible ($1,500-$3,500) + 5-10% of remaining bill.',
      'With rider: Reduced but not zero out-of-pocket for covered treatments.',
      '── NEW RULES (Apr 2026) ──',
      '⚠️ From April 2026, new riders cannot fully cover deductibles.',
      'New riders will be ~30% cheaper but require minimum $1,500-$3,500 deductible.',
      'Co-pay remains 5% of bill after deductible, but cap doubles to $6,000/year.',
      'Existing policies bought before Nov 2025 remain unchanged.',
      'Policies bought Nov 2025 - Mar 2026 convert after Apr 2028.',
    ],
  },
  life_tpd: {
    title: 'Why Life/TPD Coverage?',
    points: [
      '10× income replaces earnings for ~10 years',
      'Covers mortgage, children\'s education, daily expenses',
      'TPD (Total Permanent Disability) pays if you can\'t work',
      'DPS ($70K) from CPF is often insufficient alone',
    ],
  },
  critical_illness: {
    title: 'Why Critical Illness Coverage?',
    points: [
      'Pays lump sum on diagnosis (cancer, heart attack, stroke)',
      '5× income covers treatment + income loss during recovery',
      '1 in 4 Singaporeans will develop cancer by age 75',
      'Covers expenses not covered by hospitalization plans',
    ],
  },
  personal_accident: {
    title: 'Why Personal Accident Coverage?',
    points: [
      'Covers accidental injuries and death',
      'Often includes fractures, burns, disabilities',
      'Usually very affordable premiums',
      'Complements life insurance for accident scenarios',
    ],
  },
}

function CoverageMultiplierCard({
  coverageType,
  showEducation = false,
}: {
  coverageType: GuidelineCoverageType
  showEducation?: boolean
}) {
  const colorScheme = useColorScheme()
  const monetWizard = getInsuranceTheme(colorScheme)

  const [isExpanded, setIsExpanded] = useState(false)
  const guidelines = useGuidelines()
  const targets = useGuidelineTargets()
  const { setMultiplier, toggleCoverage, setHospitalizationPreferences } = useGuidelinesActions()

  const config = guidelineCoverageConfig[coverageType]
  const coverage = guidelines.coverages[coverageType]
  const education = coverageEducation[coverageType]

  const isHospitalization = coverageType === 'hospitalization'
  const multiplier = isHospitalization ? 0 : ((coverage as { incomeMultiplier: number }).incomeMultiplier ?? 1)
  const targetAmount = isHospitalization ? 0 : (targets[coverageType as keyof typeof targets] ?? 0)

  // Subtle accent colors for active state
  const accentColorMap: Record<string, string> = {
    emerald: monetWizard.sage,
    blue: monetWizard.blue,
    purple: monetWizard.purple,
    amber: monetWizard.amber,
  }

  const accent = accentColorMap[config.color] || monetWizard.lavender

  return (
    <div
      className="group rounded-2xl p-6 transition-all duration-300 backdrop-blur-sm"
      style={{
        background: monetWizard.cardBg,
        border: `1px solid ${coverage.isEnabled ? `${accent}25` : monetWizard.cardBorder}`,
        boxShadow: coverage.isEnabled
          ? `0 4px 24px ${accent}12`
          : `0 2px 16px ${monetWizard.shadowSoft}`,
      }}
    >
      {/* Header - horizontal layout */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h3
                className="text-sm font-medium tracking-tight"
                style={{ color: monetWizard.textPrimary }}
              >
                {config.label}
              </h3>
              {!config.isRequired && (
                <span
                  className="text-[10px] uppercase tracking-wider"
                  style={{ color: monetWizard.textMuted }}
                >
                  Optional
                </span>
              )}
            </div>
            <p
              className="text-xs mt-0.5"
              style={{ color: monetWizard.textMuted }}
            >
              {config.description}
            </p>
          </div>
        </div>

        {/* Sleek toggle */}
        <button
          type="button"
          onClick={() => toggleCoverage(coverageType)}
          className="relative h-5 w-10 rounded-full transition-all duration-300 shrink-0"
          style={{
            background: coverage.isEnabled
              ? accent
              : `${monetWizard.lavender}25`,
          }}
        >
          <span
            className="absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all duration-300"
            style={{
              left: coverage.isEnabled ? '22px' : '2px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            }}
          />
        </button>
      </div>

      {/* Learn More - subtle link */}
      {showEducation && (
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-1.5 mt-4 text-[11px] uppercase tracking-wider transition-all duration-200 hover:opacity-70"
          style={{ color: monetWizard.textMuted }}
        >
          <span>{isExpanded ? 'Hide' : 'Learn more'}</span>
          <ChevronDown
            className={cn(
              'h-3 w-3 transition-transform duration-300',
              isExpanded && 'rotate-180'
            )}
          />
        </button>
      )}

      {/* Expanded Education Section - clean */}
      {showEducation && isExpanded && (
        <div
          className="mt-4 pt-4"
          style={{ borderTop: `1px solid ${monetWizard.cardBorder}` }}
        >
          <p
            className="text-xs font-medium mb-3"
            style={{ color: monetWizard.textSecondary }}
          >
            {education.title}
          </p>
          <ul className="space-y-2">
            {education.points.map((point, i) => (
              <li
                key={i}
                className="flex items-start gap-2 text-xs leading-relaxed"
                style={{ color: monetWizard.textMuted }}
              >
                <span style={{ color: accent }}>·</span>
                {point}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Content - when enabled */}
      {coverage.isEnabled && (
        <div className="mt-5 pt-5" style={{ borderTop: `1px solid ${monetWizard.cardBorder}` }}>
          {isHospitalization ? (
            // Hospitalization: minimal ward selection
            <div className="space-y-4">
              <div className="flex gap-2">
                {(['A', 'B1', 'B2_plus', 'C'] as WardClass[]).map((ward) => {
                  const wardConfig = wardClassConfig[ward]
                  const isSelected =
                    guidelines.coverages.hospitalization.preferredWardClass === ward

                  return (
                    <button
                      key={ward}
                      type="button"
                      onClick={() => setHospitalizationPreferences({ preferredWardClass: ward })}
                      className="flex-1 py-2.5 rounded-xl text-xs font-medium transition-all duration-200"
                      style={{
                        background: isSelected ? accent : monetWizard.surfaceBg,
                        color: isSelected ? 'white' : monetWizard.textSecondary,
                        boxShadow: isSelected ? `0 2px 8px ${accent}30` : 'none',
                      }}
                    >
                      {wardConfig.label}
                    </button>
                  )
                })}
              </div>

              {/* Rider toggle - inline */}
              <div className="flex items-center justify-between">
                <span
                  className="text-xs"
                  style={{ color: monetWizard.textMuted }}
                >
                  Include rider
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setHospitalizationPreferences({
                      recommendsRider: !guidelines.coverages.hospitalization.recommendsRider,
                    })
                  }
                  className="relative h-4 w-8 rounded-full transition-all duration-300"
                  style={{
                    background: guidelines.coverages.hospitalization.recommendsRider
                      ? accent
                      : `${monetWizard.lavender}25`,
                  }}
                >
                  <span
                    className="absolute top-0.5 h-3 w-3 rounded-full bg-white transition-all duration-300"
                    style={{
                      left: guidelines.coverages.hospitalization.recommendsRider ? '17px' : '2px',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                    }}
                  />
                </button>
              </div>
            </div>
          ) : (
            // Income-based: elegant slider
            <div>
              <div className="flex items-baseline justify-between mb-4">
                <div className="flex items-baseline gap-1.5">
                  <span
                    className="text-3xl font-light tabular-nums"
                    style={{
                      color: monetWizard.textPrimary,
                      fontFamily: "'Cormorant Garamond', Georgia, serif",
                    }}
                  >
                    {multiplier}×
                  </span>
                  <span
                    className="text-xs uppercase tracking-wider"
                    style={{ color: monetWizard.textMuted }}
                  >
                    income
                  </span>
                </div>
                <span
                  className="text-sm font-mono tabular-nums"
                  style={{ color: accent }}
                >
                  {formatCurrency(targetAmount as number)}
                </span>
              </div>

              {/* Custom sleek slider */}
              <div className="relative h-1 rounded-full" style={{ background: `${monetWizard.lavender}15` }}>
                <div
                  className="absolute left-0 top-0 h-full rounded-full transition-all duration-200"
                  style={{
                    width: `${((multiplier - 1) / 19) * 100}%`,
                    background: `linear-gradient(90deg, ${accent}60, ${accent})`,
                  }}
                />
                <input
                  type="range"
                  min={1}
                  max={20}
                  step={1}
                  value={multiplier}
                  onChange={(e) => setMultiplier(coverageType, parseInt(e.target.value))}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
              </div>

              <div
                className="flex justify-between text-[10px] mt-2"
                style={{ color: monetWizard.textMuted }}
              >
                <span>1×</span>
                <span>10×</span>
                <span>20×</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ============================================================================
// GUIDED QUESTIONNAIRE COMPONENTS
// First-principles approach to coverage recommendations
// ============================================================================

type QuestionnaireSection = 'hospitalization' | 'life_tpd' | 'critical_illness' | 'personal_accident' | 'self_insurance'

const sectionOrder: QuestionnaireSection[] = [
  'hospitalization',
  'life_tpd',
  'critical_illness',
  'personal_accident',
  'self_insurance',
]

const sectionConfig: Record<QuestionnaireSection, { title: string; emoji: string; color: string }> = {
  hospitalization: { title: 'Hospitalization', emoji: '🏥', color: 'emerald' },
  life_tpd: { title: 'Life / TPD', emoji: '😇', color: 'blue' },
  critical_illness: { title: 'Critical Illness', emoji: '🩺', color: 'purple' },
  personal_accident: { title: 'Personal Accident', emoji: '🚗', color: 'amber' },
  self_insurance: { title: 'Self-Insurance', emoji: '💰', color: 'slate' },
}

// Option card component for single/multiple choice questions (Monet style)
function OptionCard({
  isSelected,
  onClick,
  icon,
  title,
  description,
  color = 'emerald',
}: {
  isSelected: boolean
  onClick: () => void
  icon: React.ReactNode
  title: string
  description: string
  color?: string
}) {
  const colorScheme = useColorScheme()
  const monetWizard = getInsuranceTheme(colorScheme)

  // Monet-inspired color mapping
  const colorStyles: Record<string, { bg: string; border: string; accent: string }> = {
    emerald: {
      bg: `${monetWizard.sageLight}50`,
      border: `${monetWizard.sage}50`,
      accent: monetWizard.sage,
    },
    blue: {
      bg: `${monetWizard.blueLight}50`,
      border: `${monetWizard.blue}50`,
      accent: monetWizard.blue,
    },
    purple: {
      bg: `${monetWizard.purpleLight}50`,
      border: `${monetWizard.purple}50`,
      accent: monetWizard.purple,
    },
    amber: {
      bg: `${monetWizard.amberLight}50`,
      border: `${monetWizard.amber}50`,
      accent: monetWizard.amber,
    },
  }

  const styles = colorStyles[color] || colorStyles.emerald

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-2xl p-5 text-left transition-all duration-300 hover:scale-[1.01]"
      style={{
        background: isSelected ? styles.bg : monetWizard.cardBg,
        border: `1px solid ${isSelected ? styles.border : monetWizard.cardBorder}`,
        boxShadow: isSelected
          ? `0 6px 20px ${monetWizard.shadowMedium}`
          : `0 2px 10px ${monetWizard.shadowSoft}`,
      }}
    >
      <div className="flex items-start gap-4">
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
          style={{
            background: isSelected
              ? `linear-gradient(135deg, ${styles.accent}, ${styles.accent}80)`
              : monetWizard.surfaceBg,
            boxShadow: isSelected ? `0 2px 8px ${monetWizard.shadowSoft}` : 'none',
          }}
        >
          {icon}
        </div>
        <div className="flex-1">
          <p
            className="font-medium"
            style={{
              color: isSelected ? monetWizard.textPrimary : monetWizard.textSecondary,
              fontFamily: "'DM Sans', system-ui, sans-serif",
            }}
          >
            {title}
          </p>
          <p
            className="text-sm mt-1"
            style={{ color: monetWizard.textMuted }}
          >
            {description}
          </p>
        </div>
        {isSelected && (
          <div
            className="flex h-6 w-6 items-center justify-center rounded-full shrink-0"
            style={{ background: monetWizard.sage }}
          >
            <Check className="h-4 w-4 text-white" />
          </div>
        )}
      </div>
    </button>
  )
}

// Number input with label (Monet style)
function NumberInput({
  label,
  value,
  onChange,
  placeholder = '0',
  prefix = '$',
  helpText,
  preFilled,
  preFilledSource,
}: {
  label: string
  value: number
  onChange: (value: number) => void
  placeholder?: string
  prefix?: string
  helpText?: string
  preFilled?: boolean
  preFilledSource?: string
}) {
  const colorScheme = useColorScheme()
  const monetWizard = getInsuranceTheme(colorScheme)

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="block text-sm" style={{ color: monetWizard.textSecondary }}>
          {label}
        </label>
        {preFilled && value > 0 && (
          <span
            className="text-[10px] px-2 py-0.5 rounded-full"
            style={{
              background: `${monetWizard.sageLight}60`,
              color: monetWizard.sageDark,
            }}
          >
            {preFilledSource || 'Pre-filled'}
          </span>
        )}
      </div>
      <div className="relative">
        {prefix && (
          <span
            className="absolute left-4 top-1/2 -translate-y-1/2"
            style={{ color: monetWizard.textMuted }}
          >
            {prefix}
          </span>
        )}
        <input
          type="number"
          value={value || ''}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          placeholder={placeholder}
          className="w-full rounded-xl text-sm py-3.5 transition-all duration-200"
          style={{
            background: monetWizard.inputBg,
            border: `1px solid ${preFilled && value > 0 ? monetWizard.sage + '50' : monetWizard.cardBorder}`,
            color: monetWizard.textPrimary,
            paddingLeft: prefix ? '2rem' : '1rem',
            paddingRight: '1rem',
          }}
        />
      </div>
      {helpText && (
        <p className="text-xs mt-2" style={{ color: monetWizard.textMuted }}>
          {helpText}
        </p>
      )}
    </div>
  )
}

// Section progress indicator (Monet style - flowing dots)
function SectionProgressDots({ current, total }: { current: number; total: number }) {
  const colorScheme = useColorScheme()
  const monetWizard = getInsuranceTheme(colorScheme)

  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className="h-2 rounded-full transition-all duration-500"
          style={{
            width: i === current ? '1.5rem' : '0.5rem',
            background: i === current
              ? `linear-gradient(90deg, ${monetWizard.lavender}, ${monetWizard.lavenderLight})`
              : i < current
                ? monetWizard.sage
                : monetWizard.cardBorder,
          }}
        />
      ))}
    </div>
  )
}

// HOSPITALIZATION QUESTIONNAIRE
function HospitalizationQuestionnaire({
  onNext,
  onBack,
}: {
  onNext: () => void
  onBack: () => void
}) {
  const colorScheme = useColorScheme()
  const monetWizard = getInsuranceTheme(colorScheme)

  const answers = useQuestionnaireAnswers()
  const { setHospitalizationAnswers } = useGuidelinesActions()
  const [subStep, setSubStep] = useState(0)
  const [showLearnMore, setShowLearnMore] = useState(false)

  const hospitalPref = answers.hospitalization.hospitalPreference

  // Sub-step 0: Public vs Private choice
  // Sub-step 1: Follow-up based on choice
  const totalSubSteps = hospitalPref ? 2 : 1

  const canProceed = subStep === 0 ? hospitalPref !== null : true

  const handleNext = () => {
    if (subStep < totalSubSteps - 1) {
      setSubStep(subStep + 1)
    } else {
      onNext()
    }
  }

  const handleBack = () => {
    if (subStep > 0) {
      setSubStep(subStep - 1)
    } else {
      onBack()
    }
  }

  return (
    <div className="max-w-xl mx-auto">
      <SectionProgressDots current={subStep} total={totalSubSteps} />

      {/* Header - Monet style */}
      <div className="text-center mb-8">
        <h2
          className="text-2xl font-semibold mb-3"
          style={{
            color: monetWizard.textPrimary,
            fontFamily: "'Cormorant Garamond', Georgia, serif",
          }}
        >
          Hospitalization Coverage
        </h2>
        <p style={{ color: monetWizard.textSecondary }}>
          {subStep === 0
            ? 'Where would you prefer to be treated?'
            : hospitalPref === 'private'
              ? 'Which room type do you prefer?'
              : 'Which ward class suits you best?'}
        </p>
      </div>

      {subStep === 0 ? (
        // Step 0: Clean Public vs Private choice
        <div className="space-y-3 mb-8">
          <OptionCard
            isSelected={hospitalPref === 'private'}
            onClick={() => setHospitalizationAnswers({ hospitalPreference: 'private' })}
            icon={<Building2 className="h-5 w-5 text-blue-400" />}
            title="Private Hospital"
            description="Choose your specialist, shorter wait times. Higher premiums."
            color="blue"
          />
          <OptionCard
            isSelected={hospitalPref === 'public'}
            onClick={() => setHospitalizationAnswers({ hospitalPreference: 'public' })}
            icon={<Home className="h-5 w-5 text-emerald-400" />}
            title="Public Hospital"
            description="Government subsidies, same medical quality. Lower premiums."
            color="emerald"
          />

          {/* Collapsible Learn More section */}
          <button
            type="button"
            onClick={() => setShowLearnMore(!showLearnMore)}
            className="w-full mt-4 flex items-center justify-between px-4 py-3 rounded-xl text-sm transition-all"
            style={{
              background: monetWizard.surfaceBg,
              border: `1px solid ${monetWizard.cardBorder}`,
              color: monetWizard.textSecondary,
            }}
          >
            <span className="flex items-center gap-2">
              <Info className="h-4 w-4" style={{ color: monetWizard.textMuted }} />
              Learn more about hospital types & 2026 changes
            </span>
            <ChevronDown
              className={cn('h-4 w-4 transition-transform', showLearnMore && 'rotate-180')}
              style={{ color: monetWizard.textMuted }}
            />
          </button>

          {showLearnMore && (
            <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
              {/* What's the difference */}
              <div
                className="p-4 rounded-2xl"
                style={{
                  background: monetWizard.surfaceBg,
                  border: `1px solid ${monetWizard.cardBorder}`,
                }}
              >
                <p className="text-xs font-medium mb-2" style={{ color: monetWizard.textPrimary }}>What's the real difference?</p>
                <ul className="text-xs space-y-1" style={{ color: monetWizard.textSecondary }}>
                  <li>• <strong>Private:</strong> Choose your specialist, shorter wait (days vs months)</li>
                  <li>• <strong>Public:</strong> All ward classes available (A, B1, B2+, C), government subsidies</li>
                  <li>• Public Class A/B1 offers similar comfort at lower cost than private</li>
                </ul>
              </div>

              {/* 2026 Rules */}
              <div
                className="p-4 rounded-2xl"
                style={{
                  background: `${monetWizard.amberLight}30`,
                  border: `1px solid ${monetWizard.amber}20`,
                }}
              >
                <p className="text-xs font-medium mb-1" style={{ color: monetWizard.amber }}>
                  New MOH Rules from April 2026
                </p>
                <p className="text-xs" style={{ color: monetWizard.textSecondary }}>
                  New IP riders can no longer fully cover deductibles ($1,500-$3,500 minimum out-of-pocket).
                  Existing policies bought before Nov 2025 are unaffected.
                </p>
              </div>

              {/* Coverage layers */}
              <CoverageLayersInline />
            </div>
          )}
        </div>
      ) : hospitalPref === 'private' ? (
        // Step 1 (Private): Room type preference
        <div className="space-y-3 mb-8">
          <OptionCard
            isSelected={answers.hospitalization.willingToPayPremium === true}
            onClick={() => setHospitalizationAnswers({ willingToPayPremium: true })}
            icon={<Sparkles className="h-5 w-5" style={{ color: monetWizard.amber }} />}
            title="Single Room"
            description="Private bathroom, full choice of doctors. ~$3,500 deductible from 2026."
            color="amber"
          />
          <OptionCard
            isSelected={answers.hospitalization.willingToPayPremium === false}
            onClick={() => setHospitalizationAnswers({ willingToPayPremium: false })}
            icon={<Check className="h-5 w-5" style={{ color: monetWizard.sage }} />}
            title="Shared Room (2-4 beds)"
            description="Air-conditioned with shared facilities. Lower premiums than single room."
            color="emerald"
          />

          <p className="text-xs text-center pt-2" style={{ color: monetWizard.textMuted }}>
            From Apr 2026: Minimum $3,500 deductible + 5% co-pay (capped at $6K/year)
          </p>
        </div>
      ) : (
        // Step 1 (Public): Ward class preference
        <div className="space-y-3 mb-8">
          <OptionCard
            isSelected={answers.hospitalization.willingToPayPremium === true}
            onClick={() => setHospitalizationAnswers({ willingToPayPremium: true, comfortableWithWait: false })}
            icon={<Sparkles className="h-5 w-5" style={{ color: monetWizard.blue }} />}
            title="Class A / B1"
            description="Single room or 4-bed with air-con. Requires ISP upgrade. ~$2,500-3,500 deductible."
            color="blue"
          />
          <OptionCard
            isSelected={answers.hospitalization.willingToPayPremium === false && answers.hospitalization.comfortableWithWait === false}
            onClick={() => setHospitalizationAnswers({ willingToPayPremium: false, comfortableWithWait: false })}
            icon={<Check className="h-5 w-5" style={{ color: monetWizard.sage }} />}
            title="Class B2+"
            description="Air-con 6-bed rooms. Good subsidies. Requires ISP upgrade. ~$2,000 deductible."
            color="emerald"
          />
          <OptionCard
            isSelected={answers.hospitalization.comfortableWithWait === true && answers.hospitalization.willingToPayPremium !== true}
            onClick={() => setHospitalizationAnswers({ willingToPayPremium: false, comfortableWithWait: true })}
            icon={<Clock className="h-5 w-5" style={{ color: monetWizard.textMuted }} />}
            title="Class C"
            description="Fan-cooled open ward. Maximum subsidies. Covered by MediShield Life alone."
            color="emerald"
          />

          <p className="text-xs text-center pt-2" style={{ color: monetWizard.textMuted }}>
            MediShield Life covers Class B2/C. Class A/B1 needs an Integrated Shield Plan (ISP).
          </p>
        </div>
      )}

      {/* Navigation - Monet style */}
      <div className="flex gap-3 justify-end">
        <button
          type="button"
          onClick={handleBack}
          className="flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-medium transition-all duration-300 hover:scale-[1.02]"
          style={{
            background: monetWizard.cardBg,
            border: `1px solid ${monetWizard.cardBorder}`,
            color: monetWizard.textSecondary,
          }}
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
        <button
          type="button"
          onClick={handleNext}
          disabled={!canProceed}
          className="flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-medium transition-all duration-300 hover:scale-[1.02]"
          style={{
            background: canProceed
              ? `linear-gradient(135deg, ${monetWizard.sageDark}, ${monetWizard.sage})`
              : 'rgba(155, 155, 155, 0.2)',
            color: canProceed ? 'white' : monetWizard.textMuted,
            boxShadow: canProceed ? `0 4px 16px ${monetWizard.shadowMedium}` : 'none',
            cursor: canProceed ? 'pointer' : 'not-allowed',
          }}
        >
          Continue
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

// LIFE/TPD QUESTIONNAIRE
function LifeTpdQuestionnaire({
  onNext,
  onBack,
}: {
  onNext: () => void
  onBack: () => void
}) {
  const colorScheme = useColorScheme()
  const monetWizard = getInsuranceTheme(colorScheme)

  const answers = useQuestionnaireAnswers()
  const guidelines = useGuidelines()
  const { setLifeTpdAnswers } = useGuidelinesActions()
  const [subStep, setSubStep] = useState(0)
  const selectedPersonId = useSelectedPersonId()
  const autoPopulate = useQuestionnaireAutoPopulate(selectedPersonId)

  const totalSubSteps = 2 // Dependents, then finances

  const handleNext = () => {
    if (subStep < totalSubSteps - 1) {
      setSubStep(subStep + 1)
    } else {
      onNext()
    }
  }

  const handleBack = () => {
    if (subStep > 0) {
      setSubStep(subStep - 1)
    } else {
      onBack()
    }
  }

  // Calculate recommended coverage based on answers
  const incomeReplacement = answers.lifeTpd.dependentCount > 0
    ? guidelines.annualIncome * answers.lifeTpd.yearsUntilIndependent
    : 0
  const totalNeeded = incomeReplacement +
    answers.lifeTpd.mortgageBalance +
    answers.lifeTpd.otherDebts +
    answers.lifeTpd.futureObligations -
    answers.lifeTpd.existingAssets

  return (
    <div className="max-w-xl mx-auto">
      <SectionProgressDots current={subStep} total={totalSubSteps} />

      {/* Header - Monet style */}
      <div className="text-center mb-8">
        <h2
          className="text-2xl font-semibold mb-3"
          style={{
            color: monetWizard.textPrimary,
            fontFamily: "'Cormorant Garamond', Georgia, serif",
          }}
        >
          Life / TPD Coverage
        </h2>
        <p style={{ color: monetWizard.textSecondary }}>
          {subStep === 0
            ? 'Who depends on your income?'
            : 'What financial obligations need to be covered?'}
        </p>
      </div>

      {subStep === 0 ? (
        // Step 0: Dependents
        <div className="space-y-5 mb-8">
          <div>
            <label className="block text-sm mb-3" style={{ color: monetWizard.textSecondary }}>
              How many people financially depend on you?
            </label>
            <div className="grid grid-cols-5 gap-2">
              {[0, 1, 2, 3, 4].map((count) => (
                <button
                  key={count}
                  type="button"
                  onClick={() => setLifeTpdAnswers({ dependentCount: count })}
                  className="rounded-xl py-3 text-center font-medium transition-all duration-200"
                  style={{
                    background: answers.lifeTpd.dependentCount === count
                      ? `${monetWizard.blueLight}60`
                      : monetWizard.surfaceBg,
                    border: `1px solid ${answers.lifeTpd.dependentCount === count ? monetWizard.blue + '50' : monetWizard.cardBorder}`,
                    color: answers.lifeTpd.dependentCount === count ? monetWizard.textPrimary : monetWizard.textSecondary,
                  }}
                >
                  {count === 4 ? '4+' : count}
                </button>
              ))}
            </div>
            <p className="text-xs mt-2" style={{ color: monetWizard.textMuted }}>
              Include spouse (if not working), children, elderly parents you support
            </p>
          </div>

          {answers.lifeTpd.dependentCount > 0 && (
            <>
              <NumberInput
                label="Age of youngest dependent"
                value={answers.lifeTpd.youngestDependentAge || 0}
                onChange={(value) => {
                  setLifeTpdAnswers({
                    youngestDependentAge: value,
                    yearsUntilIndependent: Math.max(0, 22 - value), // Assume independence at 22
                  })
                }}
                placeholder="0"
                prefix=""
                helpText="We'll calculate years of support needed until financial independence (usually 22)"
              />

              <div
                className="flex items-center gap-3 p-4 rounded-2xl"
                style={{
                  background: monetWizard.surfaceBg,
                  border: `1px solid ${monetWizard.cardBorder}`,
                }}
              >
                <button
                  type="button"
                  onClick={() => setLifeTpdAnswers({ spouseHasIncome: !answers.lifeTpd.spouseHasIncome })}
                  className="relative h-6 w-11 rounded-full transition-colors shrink-0"
                  style={{
                    background: answers.lifeTpd.spouseHasIncome ? monetWizard.sage : monetWizard.cardBorder,
                  }}
                >
                  <span
                    className="absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all shadow-sm"
                    style={{
                      left: answers.lifeTpd.spouseHasIncome ? '22px' : '2px',
                    }}
                  />
                </button>
                <div>
                  <p className="text-sm" style={{ color: monetWizard.textPrimary }}>Spouse has their own income</p>
                  <p className="text-xs" style={{ color: monetWizard.textMuted }}>This reduces the coverage needed</p>
                </div>
              </div>

              {answers.lifeTpd.spouseHasIncome && (
                <NumberInput
                  label="Spouse's annual income"
                  value={answers.lifeTpd.spouseIncome}
                  onChange={(value) => setLifeTpdAnswers({ spouseIncome: value })}
                  placeholder="0"
                  helpText="Used to reduce coverage needed (assumes spouse covers 50% of expenses)"
                  preFilled={autoPopulate.sources.income && autoPopulate.computed.spouseIncome > 0}
                  preFilledSource="From incomes"
                />
              )}
            </>
          )}

          {answers.lifeTpd.dependentCount === 0 && (
            <div
              className="p-4 rounded-2xl"
              style={{
                background: `${monetWizard.sageLight}40`,
                border: `1px solid ${monetWizard.sage}25`,
              }}
            >
              <p className="text-sm" style={{ color: monetWizard.sageDark }}>
                <strong>No dependents?</strong> You may only need minimal coverage for final expenses
                (funeral costs, outstanding debts). Consider if this changes in the future.
              </p>
            </div>
          )}
        </div>
      ) : (
        // Step 1: Financial obligations
        <div className="space-y-5 mb-6">
          {/* Pre-filled data banner - Monet style */}
          {autoPopulate.sources.liabilities && autoPopulate.computed.totalMortgage > 0 && (
            <div
              className="p-4 rounded-2xl flex items-center gap-2"
              style={{
                background: `${monetWizard.sageLight}40`,
                border: `1px solid ${monetWizard.sage}25`,
              }}
            >
              <Check className="h-4 w-4" style={{ color: monetWizard.sage }} />
              <p className="text-xs" style={{ color: monetWizard.sageDark }}>
                We found financial data from your profile. Fields marked with{' '}
                <span
                  className="px-1 rounded text-[10px]"
                  style={{ background: `${monetWizard.sage}20`, color: monetWizard.sageDark }}
                >
                  Pre-filled
                </span>{' '}
                are auto-populated — feel free to adjust.
              </p>
            </div>
          )}

          <NumberInput
            label="Outstanding mortgage balance"
            value={answers.lifeTpd.mortgageBalance}
            onChange={(value) => setLifeTpdAnswers({ mortgageBalance: value })}
            placeholder="0"
            helpText="Life insurance can pay off the mortgage so family keeps the home"
            preFilled={autoPopulate.sources.liabilities}
            preFilledSource="From liabilities"
          />

          <NumberInput
            label="Other debts (car loans, education loans, etc.)"
            value={answers.lifeTpd.otherDebts}
            onChange={(value) => setLifeTpdAnswers({ otherDebts: value })}
            preFilled={autoPopulate.sources.liabilities}
            preFilledSource="From liabilities"
          />

          <NumberInput
            label="Future obligations (children's education fund, etc.)"
            value={answers.lifeTpd.futureObligations}
            onChange={(value) => setLifeTpdAnswers({ futureObligations: value })}
            helpText="University education in Singapore costs ~$50-100K per child"
          />

          <NumberInput
            label="Existing savings/investments that could cover expenses"
            value={answers.lifeTpd.existingAssets}
            onChange={(value) => setLifeTpdAnswers({ existingAssets: value })}
            helpText="Assets that could be liquidated if needed (reduces coverage needed)"
            preFilled={autoPopulate.sources.assets}
            preFilledSource="From assets"
          />

          {/* Calculated recommendation - Monet style */}
          <div
            className="p-4 rounded-2xl"
            style={{
              background: `${monetWizard.blueLight}40`,
              border: `1px solid ${monetWizard.blue}25`,
            }}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm" style={{ color: monetWizard.blue }}>Calculated coverage needed:</span>
              <span className="font-mono tabular-nums font-semibold" style={{ color: monetWizard.textPrimary }}>
                {formatCurrency(Math.max(0, totalNeeded))}
              </span>
            </div>
            <p className="text-xs font-mono tabular-nums" style={{ color: monetWizard.textSecondary }}>
              = {formatCurrency(incomeReplacement)} (income replacement) +
              {formatCurrency(answers.lifeTpd.mortgageBalance + answers.lifeTpd.otherDebts)} (debts) +
              {formatCurrency(answers.lifeTpd.futureObligations)} (obligations) -
              {formatCurrency(answers.lifeTpd.existingAssets)} (assets)
            </p>
          </div>
        </div>
      )}

      {/* Navigation - Monet style */}
      <div className="flex gap-3 justify-end">
        <button
          type="button"
          onClick={handleBack}
          className="flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-medium transition-all duration-300 hover:scale-[1.02]"
          style={{
            background: monetWizard.cardBg,
            border: `1px solid ${monetWizard.cardBorder}`,
            color: monetWizard.textSecondary,
          }}
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
        <button
          type="button"
          onClick={handleNext}
          className="flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-medium transition-all duration-300 hover:scale-[1.02]"
          style={{
            background: `linear-gradient(135deg, ${monetWizard.sageDark}, ${monetWizard.sage})`,
            color: 'white',
            boxShadow: `0 4px 16px ${monetWizard.shadowMedium}`,
          }}
        >
          Continue
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

// CRITICAL ILLNESS QUESTIONNAIRE
function CriticalIllnessQuestionnaire({
  onNext,
  onBack,
}: {
  onNext: () => void
  onBack: () => void
}) {
  const colorScheme = useColorScheme()
  const monetWizard = getInsuranceTheme(colorScheme)

  const answers = useQuestionnaireAnswers()
  const guidelines = useGuidelines()
  const { setCriticalIllnessAnswers } = useGuidelinesActions()

  const monthlyIncome = guidelines.annualIncome / 12
  const monthlyExpenses = answers.criticalIllness.monthlyExpenses || monthlyIncome * 0.7

  // Calculate recommendation
  const totalNeeded = (monthlyExpenses * answers.criticalIllness.expectedRecoveryMonths) -
    (answers.criticalIllness.emergencyFundMonths * monthlyExpenses) -
    answers.criticalIllness.existingCiCoverage

  return (
    <div className="max-w-xl mx-auto">
      {/* Header - Monet style */}
      <div className="text-center mb-8">
        <h2
          className="text-2xl font-semibold mb-3"
          style={{
            color: monetWizard.textPrimary,
            fontFamily: "'Cormorant Garamond', Georgia, serif",
          }}
        >
          Critical Illness Coverage
        </h2>
        <p style={{ color: monetWizard.textSecondary }}>
          Can you survive financially during a long recovery period?
        </p>
      </div>

      <div className="space-y-5 mb-6">
        <div>
          <label className="block text-sm mb-3" style={{ color: monetWizard.textSecondary }}>
            If diagnosed with a critical illness, how long would you need to recover?
          </label>
          <div
            className="p-4 rounded-xl"
            style={{
              background: monetWizard.surfaceBg,
              border: `1px solid ${monetWizard.cardBorder}`,
            }}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={answers.criticalIllness.expectedRecoveryMonths}
                  onChange={(e) => {
                    const raw = e.target.value
                    if (raw === '') {
                      setCriticalIllnessAnswers({ expectedRecoveryMonths: 0 })
                      return
                    }
                    const val = parseInt(raw, 10)
                    if (!isNaN(val) && val >= 0) {
                      setCriticalIllnessAnswers({ expectedRecoveryMonths: val })
                    }
                  }}
                  onBlur={(e) => {
                    const val = parseInt(e.target.value, 10)
                    if (isNaN(val) || val < 1) {
                      setCriticalIllnessAnswers({ expectedRecoveryMonths: 12 })
                    }
                  }}
                  className="w-20 text-2xl font-semibold tabular-nums text-center rounded-lg focus:outline-none focus:ring-2 transition-all"
                  style={{
                    color: monetWizard.textPrimary,
                    background: monetWizard.cardBg,
                    border: `1px solid ${monetWizard.cardBorder}`,
                  }}
                />
                <span className="text-lg" style={{ color: monetWizard.textSecondary }}>months</span>
              </div>
              <span
                className="text-xs px-2 py-1 rounded-lg"
                style={{
                  background: `${monetWizard.purpleLight}40`,
                  color: monetWizard.purple,
                }}
              >
                {answers.criticalIllness.expectedRecoveryMonths <= 6
                  ? 'mild'
                  : answers.criticalIllness.expectedRecoveryMonths <= 12
                  ? 'typical'
                  : answers.criticalIllness.expectedRecoveryMonths <= 24
                  ? 'serious'
                  : 'severe'}
              </span>
            </div>
            <Slider.Root
              className="relative flex items-center h-5 w-full select-none"
              min={3}
              max={48}
              step={1}
              value={[Math.min(48, Math.max(3, answers.criticalIllness.expectedRecoveryMonths))]}
              onValueChange={(value) => setCriticalIllnessAnswers({ expectedRecoveryMonths: value[0] })}
              aria-label="Recovery months"
            >
              <Slider.Track
                className="relative h-2 w-full rounded-full"
                style={{ background: monetWizard.cardBorder }}
              >
                <Slider.Range
                  className="absolute h-full rounded-full"
                  style={{ background: monetWizard.purple }}
                />
              </Slider.Track>
              <Slider.Thumb
                className="block h-5 w-5 rounded-full shadow-md focus:outline-none focus:ring-2 hover:scale-110 transition-transform cursor-grab active:cursor-grabbing"
                style={{
                  background: monetWizard.purple,
                  border: '2px solid white',
                  boxShadow: `0 2px 8px ${monetWizard.shadowMedium}`,
                }}
              />
            </Slider.Root>
            <div className="flex justify-between mt-2 text-xs" style={{ color: monetWizard.textMuted }}>
              <span>3 mo</span>
              <span>48 mo+</span>
            </div>
          </div>
        </div>

        <NumberInput
          label="Monthly expenses if unable to work"
          value={answers.criticalIllness.monthlyExpenses}
          onChange={(value) => setCriticalIllnessAnswers({ monthlyExpenses: value })}
          placeholder={Math.round(monthlyIncome * 0.7).toString()}
          helpText={`Default estimate: 70% of monthly income (${formatCurrency(Math.round(monthlyIncome * 0.7))})`}
        />

        <div>
          <label className="block text-sm mb-3" style={{ color: monetWizard.textSecondary }}>
            How many months can your emergency fund cover?
          </label>
          <div
            className="p-4 rounded-xl"
            style={{
              background: monetWizard.surfaceBg,
              border: `1px solid ${monetWizard.cardBorder}`,
            }}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={answers.criticalIllness.emergencyFundMonths}
                  onChange={(e) => {
                    const raw = e.target.value
                    if (raw === '') {
                      setCriticalIllnessAnswers({ emergencyFundMonths: 0 })
                      return
                    }
                    const val = parseInt(raw, 10)
                    if (!isNaN(val) && val >= 0) {
                      setCriticalIllnessAnswers({ emergencyFundMonths: val })
                    }
                  }}
                  onBlur={(e) => {
                    const val = parseInt(e.target.value, 10)
                    if (isNaN(val) || val < 0) {
                      setCriticalIllnessAnswers({ emergencyFundMonths: 0 })
                    }
                  }}
                  className="w-20 text-2xl font-semibold tabular-nums text-center rounded-lg focus:outline-none focus:ring-2 transition-all"
                  style={{
                    color: monetWizard.textPrimary,
                    background: monetWizard.cardBg,
                    border: `1px solid ${monetWizard.cardBorder}`,
                  }}
                />
                <span className="text-lg" style={{ color: monetWizard.textSecondary }}>months</span>
              </div>
              {answers.criticalIllness.emergencyFundMonths >= 6 && (
                <span
                  className="text-xs px-2 py-1 rounded-lg"
                  style={{
                    background: `${monetWizard.sageLight}40`,
                    color: monetWizard.sageDark,
                  }}
                >
                  {answers.criticalIllness.emergencyFundMonths >= 12 ? 'excellent' : 'good'}
                </span>
              )}
            </div>
            <Slider.Root
              className="relative flex items-center h-5 w-full select-none"
              min={0}
              max={24}
              step={1}
              value={[Math.min(24, answers.criticalIllness.emergencyFundMonths)]}
              onValueChange={(value) => setCriticalIllnessAnswers({ emergencyFundMonths: value[0] })}
              aria-label="Emergency fund months"
            >
              <Slider.Track
                className="relative h-2 w-full rounded-full"
                style={{ background: monetWizard.cardBorder }}
              >
                <Slider.Range
                  className="absolute h-full rounded-full"
                  style={{ background: monetWizard.sage }}
                />
              </Slider.Track>
              <Slider.Thumb
                className="block h-5 w-5 rounded-full shadow-md focus:outline-none focus:ring-2 hover:scale-110 transition-transform cursor-grab active:cursor-grabbing"
                style={{
                  background: monetWizard.sage,
                  border: '2px solid white',
                  boxShadow: `0 2px 8px ${monetWizard.shadowMedium}`,
                }}
              />
            </Slider.Root>
            <div className="flex justify-between mt-2 text-xs" style={{ color: monetWizard.textMuted }}>
              <span>0 mo</span>
              <span>24 mo+</span>
            </div>
          </div>
        </div>

        <NumberInput
          label="Existing CI coverage (employer or personal policies)"
          value={answers.criticalIllness.existingCiCoverage}
          onChange={(value) => setCriticalIllnessAnswers({ existingCiCoverage: value })}
          placeholder="0"
          helpText="Check your employment benefits and existing policies"
        />

        {/* Calculated recommendation - Monet style */}
        <div
          className="p-4 rounded-2xl"
          style={{
            background: `${monetWizard.purpleLight}40`,
            border: `1px solid ${monetWizard.purple}25`,
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm" style={{ color: monetWizard.purple }}>Recommended CI coverage:</span>
            <span className="font-mono tabular-nums font-semibold" style={{ color: monetWizard.textPrimary }}>
              {formatCurrency(Math.max(0, totalNeeded))}
            </span>
          </div>
          <p className="text-xs font-mono tabular-nums" style={{ color: monetWizard.textSecondary }}>
            = ({formatCurrency(monthlyExpenses)} × {answers.criticalIllness.expectedRecoveryMonths} months) -
            ({answers.criticalIllness.emergencyFundMonths} months emergency fund) -
            ({formatCurrency(answers.criticalIllness.existingCiCoverage)} existing)
          </p>
        </div>

        <div
          className="p-4 rounded-2xl"
          style={{
            background: monetWizard.surfaceBg,
            border: `1px solid ${monetWizard.cardBorder}`,
          }}
        >
          <p className="text-xs" style={{ color: monetWizard.textMuted }}>
            <strong style={{ color: monetWizard.textSecondary }}>Key insight:</strong> Critical illness coverage
            replaces income during recovery. The payout is a lump sum, not monthly payments,
            so you have flexibility in how you use it.
          </p>
        </div>
      </div>

      {/* Navigation - Monet style */}
      <div className="flex gap-3 justify-end">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-medium transition-all duration-300 hover:scale-[1.02]"
          style={{
            background: monetWizard.cardBg,
            border: `1px solid ${monetWizard.cardBorder}`,
            color: monetWizard.textSecondary,
          }}
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
        <button
          type="button"
          onClick={onNext}
          className="flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-medium transition-all duration-300 hover:scale-[1.02]"
          style={{
            background: `linear-gradient(135deg, ${monetWizard.sageDark}, ${monetWizard.sage})`,
            color: 'white',
            boxShadow: `0 4px 16px ${monetWizard.shadowMedium}`,
          }}
        >
          Continue
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

// PERSONAL ACCIDENT QUESTIONNAIRE
function PersonalAccidentQuestionnaire({
  onNext,
  onBack,
}: {
  onNext: () => void
  onBack: () => void
}) {
  const colorScheme = useColorScheme()
  const monetWizard = getInsuranceTheme(colorScheme)

  const answers = useQuestionnaireAnswers()
  const { setPersonalAccidentAnswers } = useGuidelinesActions()

  return (
    <div className="max-w-xl mx-auto">
      {/* Header - Monet style */}
      <div className="text-center mb-8">
        <h2
          className="text-2xl font-semibold mb-3"
          style={{
            color: monetWizard.textPrimary,
            fontFamily: "'Cormorant Garamond', Georgia, serif",
          }}
        >
          Personal Accident Coverage
        </h2>
        <p style={{ color: monetWizard.textSecondary }}>
          How risky is your lifestyle and occupation?
        </p>
      </div>

      <div className="space-y-5 mb-6">
        <div>
          <label className="block text-sm mb-3" style={{ color: monetWizard.textSecondary }}>
            What's your occupation risk level?
          </label>
          <div className="space-y-2">
            <OptionCard
              isSelected={answers.personalAccident.occupationRisk === 'low'}
              onClick={() => setPersonalAccidentAnswers({ occupationRisk: 'low' })}
              icon={<Briefcase className="h-5 w-5" style={{ color: monetWizard.sage }} />}
              title="Low Risk (Office/Desk job)"
              description="Professional services, administrative, work-from-home"
              color="emerald"
            />
            <OptionCard
              isSelected={answers.personalAccident.occupationRisk === 'medium'}
              onClick={() => setPersonalAccidentAnswers({ occupationRisk: 'medium' })}
              icon={<Briefcase className="h-5 w-5" style={{ color: monetWizard.amber }} />}
              title="Medium Risk (Field work/Healthcare)"
              description="Sales, healthcare workers, teachers, light manual work"
              color="amber"
            />
            <OptionCard
              isSelected={answers.personalAccident.occupationRisk === 'high'}
              onClick={() => setPersonalAccidentAnswers({ occupationRisk: 'high' })}
              icon={<AlertCircle className="h-5 w-5" style={{ color: monetWizard.coralRose }} />}
              title="High Risk (Manual labor/Dangerous)"
              description="Construction, delivery riders, machinery operators"
              color="amber"
            />
          </div>
        </div>

        <NumberInput
          label="Existing PA coverage (employer or personal)"
          value={answers.personalAccident.existingPaCoverage}
          onChange={(value) => setPersonalAccidentAnswers({ existingPaCoverage: value })}
          placeholder="0"
        />
      </div>

      {/* Navigation - Monet style */}
      <div className="flex gap-3 justify-end">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-medium transition-all duration-300 hover:scale-[1.02]"
          style={{
            background: monetWizard.cardBg,
            border: `1px solid ${monetWizard.cardBorder}`,
            color: monetWizard.textSecondary,
          }}
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
        <button
          type="button"
          onClick={onNext}
          className="flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-medium transition-all duration-300 hover:scale-[1.02]"
          style={{
            background: `linear-gradient(135deg, ${monetWizard.sageDark}, ${monetWizard.sage})`,
            color: 'white',
            boxShadow: `0 4px 16px ${monetWizard.shadowMedium}`,
          }}
        >
          Continue
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

// SELF-INSURANCE QUESTIONNAIRE
function SelfInsuranceQuestionnaire({
  onNext,
  onBack,
}: {
  onNext: () => void
  onBack: () => void
}) {
  const colorScheme = useColorScheme()
  const monetWizard = getInsuranceTheme(colorScheme)

  const answers = useQuestionnaireAnswers()
  const { setSelfInsuranceAnswers, applyQuestionnaireRecommendations } = useGuidelinesActions()
  const recommendations = useQuestionnaireRecommendations()
  const selectedPersonId = useSelectedPersonId()
  const autoPopulate = useQuestionnaireAutoPopulate(selectedPersonId)

  const handleContinue = () => {
    // Apply all questionnaire recommendations to the guidelines
    applyQuestionnaireRecommendations()
    onNext()
  }

  return (
    <div className="max-w-xl mx-auto">
      {/* Header - Monet style */}
      <div className="text-center mb-8">
        <h2
          className="text-2xl font-semibold mb-3"
          style={{
            color: monetWizard.textPrimary,
            fontFamily: "'Cormorant Garamond', Georgia, serif",
          }}
        >
          Self-Insurance Capability
        </h2>
        <p style={{ color: monetWizard.textSecondary }}>
          Can your assets cover some risks, reducing the need for insurance?
        </p>
      </div>

      <div className="space-y-5 mb-6">
        <NumberInput
          label="Total liquid net worth (savings, investments, accessible assets)"
          value={answers.selfInsurance.liquidNetWorth}
          onChange={(value) => setSelfInsuranceAnswers({ liquidNetWorth: value })}
          placeholder="0"
          helpText="Assets you could access within 1-3 months if needed"
          preFilled={autoPopulate.sources.assets}
          preFilledSource="From assets"
        />

        <div
          className="flex items-center gap-3 p-4 rounded-2xl"
          style={{
            background: monetWizard.surfaceBg,
            border: `1px solid ${monetWizard.cardBorder}`,
          }}
        >
          <button
            type="button"
            onClick={() => setSelfInsuranceAnswers({ willingToSelfInsure: !answers.selfInsurance.willingToSelfInsure })}
            className="relative h-6 w-11 rounded-full transition-colors shrink-0"
            style={{
              background: answers.selfInsurance.willingToSelfInsure ? monetWizard.sage : monetWizard.cardBorder,
            }}
          >
            <span
              className="absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all shadow-sm"
              style={{
                left: answers.selfInsurance.willingToSelfInsure ? '22px' : '2px',
              }}
            />
          </button>
          <div>
            <p className="text-sm" style={{ color: monetWizard.textPrimary }}>Willing to use assets to cover insurance gaps</p>
            <p className="text-xs" style={{ color: monetWizard.textMuted }}>This can reduce your recommended coverage amounts</p>
          </div>
        </div>

        {answers.selfInsurance.willingToSelfInsure && (
          <NumberInput
            label="Keep this amount protected (don't use for self-insurance)"
            value={answers.selfInsurance.selfInsuranceThreshold}
            onChange={(value) => setSelfInsuranceAnswers({ selfInsuranceThreshold: value })}
            placeholder="100000"
            helpText="Assets above this threshold can offset insurance needs"
          />
        )}

        {/* Preview of recommendations - Monet style */}
        <div
          className="rounded-2xl p-5"
          style={{
            background: `${monetWizard.sageLight}40`,
            border: `1px solid ${monetWizard.sage}25`,
          }}
        >
          <p className="text-sm font-medium mb-4" style={{ color: monetWizard.textPrimary }}>Based on your answers, we recommend:</p>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm" style={{ color: monetWizard.textSecondary }}>Hospitalization</span>
              <span className="text-sm" style={{ color: monetWizard.textPrimary }}>
                {wardClassConfig[recommendations.hospitalization.wardClass].label}
                {recommendations.hospitalization.rider && ' + Rider'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm" style={{ color: monetWizard.textSecondary }}>Life / TPD</span>
              <span className="text-sm font-mono tabular-nums" style={{ color: monetWizard.textPrimary }}>{formatCurrency(recommendations.lifeTpd)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm" style={{ color: monetWizard.textSecondary }}>Critical Illness</span>
              <span className="text-sm font-mono tabular-nums" style={{ color: monetWizard.textPrimary }}>{formatCurrency(recommendations.criticalIllness)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm" style={{ color: monetWizard.textSecondary }}>Personal Accident</span>
              <span className="text-sm font-mono tabular-nums" style={{ color: monetWizard.textPrimary }}>{formatCurrency(recommendations.personalAccident)}</span>
            </div>
          </div>
        </div>

        <div
          className="p-4 rounded-2xl"
          style={{
            background: `${monetWizard.blueLight}40`,
            border: `1px solid ${monetWizard.blue}25`,
          }}
        >
          <p className="text-xs" style={{ color: monetWizard.blue }}>
            <strong>Remember:</strong> These are personalized recommendations based on your
            specific situation. You can adjust them in the next step.
          </p>
        </div>
      </div>

      {/* Navigation - Monet style */}
      <div className="flex gap-3 justify-end">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-medium transition-all duration-300 hover:scale-[1.02]"
          style={{
            background: monetWizard.cardBg,
            border: `1px solid ${monetWizard.cardBorder}`,
            color: monetWizard.textSecondary,
          }}
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
        <button
          type="button"
          onClick={handleContinue}
          className="flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-medium transition-all duration-300 hover:scale-[1.02]"
          style={{
            background: `linear-gradient(135deg, ${monetWizard.sageDark}, ${monetWizard.sage})`,
            color: 'white',
            boxShadow: `0 4px 16px ${monetWizard.shadowMedium}`,
          }}
        >
          Apply Recommendations
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

// MAIN WIZARD STEP 2 - Guided Questionnaire
function WizardStep2Questionnaire({ onNext, onBack }: WizardStep2Props) {
  const colorScheme = useColorScheme()
  const monetWizard = getInsuranceTheme(colorScheme)

  const [currentSection, setCurrentSection] = useState<QuestionnaireSection>('hospitalization')
  const [hasAutoPopulated, setHasAutoPopulated] = useState(false)

  const selectedPersonId = useSelectedPersonId()
  const { setLifeTpdAnswers, setCriticalIllnessAnswers, setSelfInsuranceAnswers } = useGuidelinesActions()
  const autoPopulateData = useQuestionnaireAutoPopulate(selectedPersonId)

  // Auto-populate questionnaire data on first mount
  useEffect(() => {
    if (!hasAutoPopulated && !autoPopulateData.isLoading) {
      // Only populate if we have actual data from the app
      const { lifeTpd, criticalIllness, selfInsurance, sources } = autoPopulateData

      // Populate Life/TPD answers if we have relevant data
      if (sources.persons || sources.liabilities || sources.assets) {
        setLifeTpdAnswers({
          ...lifeTpd,
          // Keep futureObligations as user input since we can't infer it
        })
      }

      // Populate Critical Illness answers if we have income data
      if (sources.income || sources.assets) {
        setCriticalIllnessAnswers(criticalIllness)
      }

      // Populate Self Insurance answers if we have asset data
      if (sources.assets) {
        setSelfInsuranceAnswers(selfInsurance)
      }

      setHasAutoPopulated(true)
    }
  }, [
    hasAutoPopulated,
    autoPopulateData,
    setLifeTpdAnswers,
    setCriticalIllnessAnswers,
    setSelfInsuranceAnswers,
  ])

  const currentIndex = sectionOrder.indexOf(currentSection)

  const handleSectionNext = () => {
    if (currentIndex < sectionOrder.length - 1) {
      setCurrentSection(sectionOrder[currentIndex + 1])
    } else {
      onNext()
    }
  }

  const handleSectionBack = () => {
    if (currentIndex > 0) {
      setCurrentSection(sectionOrder[currentIndex - 1])
    } else {
      onBack()
    }
  }

  return (
    <div>
      {/* Section indicator - minimal pill style */}
      <div className="flex items-center justify-center gap-1 mb-8">
        {sectionOrder.map((section, i) => {
          const config = sectionConfig[section]
          const isCurrent = section === currentSection
          const isPast = i < currentIndex

          return (
            <div
              key={section}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs transition-all duration-300"
              style={{
                background: isCurrent ? monetWizard.cardBgHover : 'transparent',
                color: isCurrent
                  ? monetWizard.textPrimary
                  : isPast
                    ? monetWizard.sage
                    : monetWizard.textMuted,
                boxShadow: isCurrent ? '0 2px 12px rgba(155, 139, 180, 0.15)' : 'none',
              }}
            >
              <span
                className="font-medium"
                style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}
              >
                {config.title}
              </span>
            </div>
          )
        })}
      </div>

      {/* Render current section questionnaire */}
      {currentSection === 'hospitalization' && (
        <HospitalizationQuestionnaire onNext={handleSectionNext} onBack={handleSectionBack} />
      )}
      {currentSection === 'life_tpd' && (
        <LifeTpdQuestionnaire onNext={handleSectionNext} onBack={handleSectionBack} />
      )}
      {currentSection === 'critical_illness' && (
        <CriticalIllnessQuestionnaire onNext={handleSectionNext} onBack={handleSectionBack} />
      )}
      {currentSection === 'personal_accident' && (
        <PersonalAccidentQuestionnaire onNext={handleSectionNext} onBack={handleSectionBack} />
      )}
      {currentSection === 'self_insurance' && (
        <SelfInsuranceQuestionnaire onNext={handleSectionNext} onBack={handleSectionBack} />
      )}
    </div>
  )
}

// ============================================================================
// WIZARD STEP 3: SUMMARY & BUDGET
// ============================================================================

interface WizardStep3Props {
  onComplete: () => void
  onBack: () => void
}

function WizardStep3Summary({ onComplete, onBack }: WizardStep3Props) {
  const colorScheme = useColorScheme()
  const monetWizard = getInsuranceTheme(colorScheme)

  const guidelines = useGuidelines()
  const targets = useGuidelineTargets()
  const { setMaxPremiumPercentage } = useGuidelinesActions()

  const percentage = Math.round(guidelines.maxPremiumPercentage * 100)

  const coverageTypes: GuidelineCoverageType[] = [
    'hospitalization',
    'life_tpd',
    'critical_illness',
    'personal_accident',
  ]

  // Calculate slider fill percentage for gradient
  const sliderFillPercent = ((percentage - 5) / 15) * 100

  return (
    <div className="max-w-lg mx-auto">
      {/* Header - elegant Monet style */}
      <div className="text-center mb-10">
        <div
          className="inline-flex h-16 w-16 items-center justify-center rounded-3xl mb-5"
          style={{
            background: `linear-gradient(145deg, ${monetWizard.sunlightGold}, ${monetWizard.sunlightGoldLight})`,
            boxShadow: `0 8px 32px ${monetWizard.sunlightGold}30`,
          }}
        >
          <Check className="h-7 w-7 text-white" />
        </div>
        <h2
          className="text-2xl font-light tracking-tight mb-3"
          style={{
            color: monetWizard.textPrimary,
            fontFamily: "'Cormorant Garamond', Georgia, serif",
          }}
        >
          Review your guidelines
        </h2>
        <p
          className="text-sm"
          style={{ color: monetWizard.textSecondary }}
        >
          Here&apos;s a summary of your coverage targets. You can always adjust these later.
        </p>
      </div>

      {/* Summary card - glass morphism */}
      <div
        className="rounded-3xl p-6 mb-6 backdrop-blur-md"
        style={{
          background: monetWizard.cardBg,
          border: `1px solid ${monetWizard.sage}25`,
          boxShadow: `0 8px 32px ${monetWizard.sage}15`,
        }}
      >
        <div
          className="flex items-center justify-between mb-5 pb-5"
          style={{ borderBottom: `1px solid ${monetWizard.textMuted}20` }}
        >
          <span style={{ color: monetWizard.textSecondary }}>Annual Income</span>
          <span
            className="text-xl font-semibold font-mono tabular-nums"
            style={{ color: monetWizard.textPrimary }}
          >
            {formatCurrency(guidelines.annualIncome)}
          </span>
        </div>

        <div className="space-y-4">
          {coverageTypes.map((type) => {
            const config = guidelineCoverageConfig[type]
            const coverage = guidelines.coverages[type]

            if (!coverage.isEnabled) {
              return (
                <div key={type} className="flex items-center justify-between opacity-50">
                  <span style={{ color: monetWizard.textMuted }}>{config.shortLabel}</span>
                  <span className="text-sm" style={{ color: monetWizard.textMuted }}>
                    Disabled
                  </span>
                </div>
              )
            }

            const isHospitalization = type === 'hospitalization'

            return (
              <div key={type} className="flex items-center justify-between">
                <span style={{ color: monetWizard.textSecondary }}>{config.shortLabel}</span>
                <span className="font-mono tabular-nums font-medium" style={{ color: monetWizard.textPrimary }}>
                  {isHospitalization
                    ? `${wardClassConfig[guidelines.coverages.hospitalization.preferredWardClass].label}${
                        guidelines.coverages.hospitalization.recommendsRider ? ' + Rider' : ''
                      }`
                    : formatCurrency(targets[type as keyof typeof targets] as number)}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Premium budget - refined glass card */}
      <div
        className="rounded-3xl p-6 mb-10 backdrop-blur-md"
        style={{
          background: monetWizard.surfaceBg,
          border: `1px solid ${monetWizard.cardBorder}`,
          boxShadow: '0 4px 24px rgba(155, 139, 180, 0.08)',
        }}
      >
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3
              className="font-medium text-sm"
              style={{ color: monetWizard.textPrimary }}
            >
              Maximum Premium Budget
            </h3>
            <p className="text-xs mt-0.5" style={{ color: monetWizard.textMuted }}>
              % of income you&apos;re willing to spend on insurance
            </p>
          </div>
          <span
            className="text-2xl font-semibold"
            style={{ color: monetWizard.sage }}
          >
            {percentage}%
          </span>
        </div>

        {/* Custom slider with Monet styling */}
        <div className="relative h-8 flex items-center">
          <input
            type="range"
            min={5}
            max={20}
            step={1}
            value={percentage}
            onChange={(e) => setMaxPremiumPercentage(parseInt(e.target.value) / 100)}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
          />
          <div
            className="absolute left-0 right-0 h-2 rounded-full"
            style={{ background: `${monetWizard.sage}20` }}
          />
          <div
            className="absolute left-0 h-2 rounded-full transition-all duration-150"
            style={{
              width: `${sliderFillPercent}%`,
              background: `linear-gradient(90deg, ${monetWizard.sage}, ${monetWizard.sageLight})`,
            }}
          />
          <div
            className="absolute h-5 w-5 rounded-full transition-all duration-150"
            style={{
              left: `calc(${sliderFillPercent}% - 10px)`,
              background: monetWizard.sage,
              boxShadow: `0 2px 8px ${monetWizard.sage}40`,
            }}
          />
        </div>
        <div className="flex justify-between text-[10px] mt-2" style={{ color: monetWizard.textMuted }}>
          <span>5%</span>
          <span>10%</span>
          <span>15%</span>
          <span>20%</span>
        </div>

        <div
          className="mt-5 p-4 rounded-2xl"
          style={{
            background: `${monetWizard.sage}10`,
            border: `1px solid ${monetWizard.sage}20`,
          }}
        >
          <div className="flex items-center justify-between">
            <span className="text-sm" style={{ color: monetWizard.textSecondary }}>
              Max annual premiums
            </span>
            <span className="font-mono tabular-nums font-semibold" style={{ color: monetWizard.sage }}>
              ≤ {formatCurrency(targets.maxAnnualPremium)}
            </span>
          </div>
          <p className="text-xs font-mono tabular-nums mt-1" style={{ color: monetWizard.textMuted }}>
            ≈ {formatCurrency(Math.round(targets.maxAnnualPremium / 12))}/month
          </p>
        </div>
      </div>

      {/* Navigation - sleek pill buttons */}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={onBack}
          className="flex-1 rounded-full px-6 py-3.5 text-sm font-medium transition-all duration-300 hover:translate-y-[-1px]"
          style={{
            background: monetWizard.cardBg,
            color: monetWizard.textSecondary,
            border: `1px solid ${monetWizard.cardBorder}`,
            boxShadow: '0 2px 12px rgba(155, 139, 180, 0.1)',
          }}
        >
          Back
        </button>
        <button
          type="button"
          onClick={onComplete}
          className="flex-1 flex items-center justify-center gap-2 rounded-full px-6 py-3.5 text-sm font-medium text-white transition-all duration-300 hover:translate-y-[-1px]"
          style={{
            background: monetWizard.sage,
            boxShadow: `0 4px 20px ${monetWizard.sage}40`,
          }}
        >
          <Check className="h-4 w-4" />
          Save My Guidelines
        </button>
      </div>
    </div>
  )
}

// ============================================================================
// CONFIGURED VIEW (Edit mode - after wizard completion)
// ============================================================================

interface ConfiguredGuidelinesViewProps {
  onDone?: () => void
}

function ConfiguredGuidelinesView({ onDone }: ConfiguredGuidelinesViewProps) {
  const colorScheme = useColorScheme()
  const monetWizard = getInsuranceTheme(colorScheme)

  const guidelines = useGuidelines()
  const targets = useGuidelineTargets()
  const { setMaxPremiumPercentage, resetToDefaults } = useGuidelinesActions()
  const [showResetConfirm, setShowResetConfirm] = useState(false)

  const percentage = Math.round(guidelines.maxPremiumPercentage * 100)

  const coverageTypes: GuidelineCoverageType[] = [
    'hospitalization',
    'life_tpd',
    'critical_illness',
    'personal_accident',
  ]

  return (
    <div className="py-10">
      <div className="mx-auto max-w-5xl px-8">
        {/* Header - minimal and elegant */}
        <div className="flex items-end justify-between mb-10">
          <div>
            <p
              className="text-[11px] font-medium uppercase tracking-[0.15em] mb-2"
              style={{ color: monetWizard.lavender }}
            >
              Coverage Settings
            </p>
            <h2
              className="text-2xl font-light tracking-tight"
              style={{
                color: monetWizard.textPrimary,
                fontFamily: "'Cormorant Garamond', Georgia, serif",
              }}
            >
              Edit Coverage Targets
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setShowResetConfirm(true)}
              className="flex items-center gap-2 px-4 py-2 text-xs font-medium uppercase tracking-wider transition-all duration-300 hover:opacity-70"
              style={{ color: monetWizard.textMuted }}
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset
            </button>
            {onDone && (
              <button
                type="button"
                onClick={onDone}
                className="flex items-center gap-2 rounded-full px-6 py-2.5 text-xs font-medium uppercase tracking-wider text-white transition-all duration-300 hover:translate-y-[-1px]"
                style={{
                  background: monetWizard.sage,
                  boxShadow: `0 4px 20px ${monetWizard.sage}40`,
                }}
              >
                <Check className="h-3.5 w-3.5" />
                Done
              </button>
            )}
          </div>
        </div>

        {/* Reset confirmation - sleek inline alert */}
        {showResetConfirm && (
          <div
            className="mb-8 px-6 py-4 rounded-2xl backdrop-blur-sm flex items-center justify-between"
            style={{
              background: `linear-gradient(135deg, ${monetWizard.amber}08, ${monetWizard.amber}12)`,
              border: `1px solid ${monetWizard.amber}20`,
            }}
          >
            <p className="text-sm" style={{ color: monetWizard.textSecondary }}>
              Reset all guidelines to default values?
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                className="px-4 py-1.5 text-xs font-medium uppercase tracking-wider transition-all"
                style={{ color: monetWizard.textMuted }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  resetToDefaults()
                  setShowResetConfirm(false)
                }}
                className="px-4 py-1.5 rounded-full text-xs font-medium text-white transition-all"
                style={{ background: monetWizard.amber }}
              >
                Confirm
              </button>
            </div>
          </div>
        )}

        <div className="grid lg:grid-cols-12 gap-8">
          {/* Coverage cards - 8 columns */}
          <div className="lg:col-span-8 space-y-3">
            {coverageTypes.map((type) => (
              <CoverageMultiplierCard key={type} coverageType={type} showEducation />
            ))}
          </div>

          {/* Summary sidebar - 4 columns, sticky */}
          <div className="lg:col-span-4">
            <div className="sticky top-6 space-y-4">
              {/* Summary card - glass effect */}
              <div
                className="rounded-3xl p-6 backdrop-blur-md"
                style={{
                  background: monetWizard.cardBg,
                  border: `1px solid ${monetWizard.cardBorder}`,
                  boxShadow: '0 8px 32px rgba(155, 139, 180, 0.08)',
                }}
              >
                <p
                  className="text-[10px] font-medium uppercase tracking-[0.2em] mb-4"
                  style={{ color: monetWizard.textMuted }}
                >
                  Your Targets
                </p>
                <div className="space-y-3">
                  {coverageTypes.map((type) => {
                    const config = guidelineCoverageConfig[type]
                    const coverage = guidelines.coverages[type]

                    if (!coverage.isEnabled) return null

                    const isHospitalization = type === 'hospitalization'

                    return (
                      <div
                        key={type}
                        className="flex items-center justify-between py-2"
                        style={{
                          borderBottom: `1px solid ${monetWizard.cardBorder}`,
                        }}
                      >
                        <span
                          className="text-sm"
                          style={{ color: monetWizard.textSecondary }}
                        >
                          {config.shortLabel}
                        </span>
                        <span
                          className="text-sm font-mono tabular-nums"
                          style={{ color: monetWizard.textPrimary }}
                        >
                          {isHospitalization
                            ? wardClassConfig[guidelines.coverages.hospitalization.preferredWardClass]
                                .label
                            : formatCurrency(targets[type as keyof typeof targets] as number)}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Premium budget - refined slider */}
              <div
                className="rounded-3xl p-6 backdrop-blur-md"
                style={{
                  background: monetWizard.cardBg,
                  border: `1px solid ${monetWizard.cardBorder}`,
                  boxShadow: '0 8px 32px rgba(155, 139, 180, 0.08)',
                }}
              >
                <div className="flex items-baseline justify-between mb-5">
                  <p
                    className="text-[10px] font-medium uppercase tracking-[0.2em]"
                    style={{ color: monetWizard.textMuted }}
                  >
                    Premium Budget
                  </p>
                  <span
                    className="text-2xl font-light tabular-nums"
                    style={{
                      color: monetWizard.textPrimary,
                      fontFamily: "'Cormorant Garamond', Georgia, serif",
                    }}
                  >
                    {percentage}%
                  </span>
                </div>

                {/* Custom sleek slider track */}
                <div className="relative h-1 rounded-full mb-2" style={{ background: `${monetWizard.lavender}20` }}>
                  <div
                    className="absolute left-0 top-0 h-full rounded-full transition-all duration-200"
                    style={{
                      width: `${((percentage - 5) / 15) * 100}%`,
                      background: `linear-gradient(90deg, ${monetWizard.lavender}60, ${monetWizard.sage}80)`,
                    }}
                  />
                  <input
                    type="range"
                    min={5}
                    max={20}
                    step={1}
                    value={percentage}
                    onChange={(e) => setMaxPremiumPercentage(parseInt(e.target.value) / 100)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                </div>

                <div
                  className="flex justify-between text-[10px] mb-4"
                  style={{ color: monetWizard.textMuted }}
                >
                  <span>5%</span>
                  <span>20%</span>
                </div>

                <div
                  className="text-center pt-4"
                  style={{ borderTop: `1px solid ${monetWizard.cardBorder}` }}
                >
                  <p
                    className="text-xl font-mono tabular-nums"
                    style={{ color: monetWizard.sage }}
                  >
                    {formatCurrency(targets.maxAnnualPremium)}
                  </p>
                  <p
                    className="text-[10px] uppercase tracking-wider mt-1"
                    style={{ color: monetWizard.textMuted }}
                  >
                    per year max
                  </p>
                </div>
              </div>

              {/* Last updated - subtle */}
              <p
                className="text-[10px] text-center tracking-wider"
                style={{ color: monetWizard.textMuted }}
              >
                Updated{' '}
                {new Date(guidelines.updatedAt).toLocaleDateString('en-SG', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

interface GuidelinesTabProps {
  onNavigateToPolicy?: () => void
}

export function GuidelinesTab({ onNavigateToPolicy }: GuidelinesTabProps) {
  const hasConfigured = useHasConfiguredGuidelines()
  const isEditing = useIsEditingGuidelines()
  const { markAsConfigured, setIsEditing } = useGuidelinesActions()
  const [wizardStep, setWizardStep] = useState(1)

  // If configured and not editing, show the dashboard
  if (hasConfigured && !isEditing) {
    return (
      <CoverageDashboard
        onEditTargets={() => setIsEditing(true)}
        onAddPolicy={onNavigateToPolicy}
      />
    )
  }

  // If configured but editing, show the edit view
  if (hasConfigured && isEditing) {
    return (
      <ConfiguredGuidelinesView
        onDone={() => setIsEditing(false)}
      />
    )
  }

  // Wizard flow for first-time setup
  const stepLabels = ['Income', 'Questions', 'Review']

  const handleComplete = () => {
    markAsConfigured()
  }

  return (
    <div className="py-8 px-6">
      {/* Wizard step indicator */}
      <WizardStepIndicator
        currentStep={wizardStep}
        totalSteps={3}
        stepLabels={stepLabels}
      />

      {/* Wizard steps */}
      {wizardStep === 1 && <WizardStep1Income onNext={() => setWizardStep(2)} />}
      {wizardStep === 2 && (
        <WizardStep2Questionnaire
          onNext={() => setWizardStep(3)}
          onBack={() => setWizardStep(1)}
        />
      )}
      {wizardStep === 3 && (
        <WizardStep3Summary onComplete={handleComplete} onBack={() => setWizardStep(2)} />
      )}
    </div>
  )
}
