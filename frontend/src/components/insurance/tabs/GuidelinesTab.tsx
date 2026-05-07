'use client'

import { useState, useMemo, useEffect } from 'react'
import * as Slider from '@radix-ui/react-slider'
import * as Tooltip from '@radix-ui/react-tooltip'
import {
  Info,
  Check,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  RotateCcw,
  Building2,
  Home,
  Clock,
  Briefcase,
  Sparkles,
  Plus,
  User,
  Edit3,
  ExternalLink,
} from 'lucide-react'
import { formatCurrency } from '@/lib/format'
import { useColorScheme } from '@/stores'
import { getInsuranceTheme } from '@/lib/insurance-theme'
import {
  useGuidelines,
  useGuidelinesActions,
  useGuidelineTargets,
  useHasConfiguredGuidelines,
  useSelectedPersonId,
  useReferenceMode,
  useQuestionnaireAnswers,
  useQuestionnaireRecommendations,
} from '@/stores/coverageGuidelinesStore'
import type { ReferenceMode, DerivedFinancials, LifeTpdAnswers } from '@/stores/coverageGuidelinesStore'
import {
  guidelineCoverageConfig,
  wardClassConfig,
  type GuidelineCoverageType,
  type WardClass,
} from '@/types/insurance'
import { PersonSelector } from '@/components/ui/PersonSelector'
import { CustomDropdown } from '@/components/modals/ScenarioEventModal/components/CustomDropdown'
import { usePersonFilter } from '@/contexts/PersonFilterContext'
import { useIncomesQuery } from '@/hooks/queries/useIncomesQuery'
import { useExpensesQuery } from '@/hooks/queries/useExpensesQuery'
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

/**
 * Calculate total annual expenses (household-level, no personId filtering).
 * Only includes active expenses (no endDate or future endDate).
 */
function calculateAnnualExpenses(
  expenses: { amount: number; frequency: Frequency; endDate?: string }[]
): number {
  const currentYear = new Date().getFullYear()
  return expenses
    .filter((expense) => {
      if (expense.endDate) {
        const endYear = new Date(expense.endDate).getFullYear()
        if (endYear < currentYear) return false
      }
      return true
    })
    .reduce((total, expense) => {
      const multiplier = frequencyMultipliers[expense.frequency] || 0
      return total + expense.amount * multiplier
    }, 0)
}

/**
 * Build DerivedFinancials — respects the manual override toggle.
 * When useManualFinancials is true, uses user-entered values.
 * Otherwise uses auto-populated values from the financial plan.
 */
function toDerivedFinancials(
  computed: {
    totalMortgage: number
    totalOtherDebts: number
    totalAssets: number
    spouseHasIncome: boolean
    spouseIncome: number
  },
  lifeTpd?: LifeTpdAnswers
): DerivedFinancials {
  if (lifeTpd?.useManualFinancials) {
    return {
      mortgageBalance: lifeTpd.manualMortgageBalance ?? 0,
      otherDebts: lifeTpd.manualOtherDebts ?? 0,
      existingAssets: lifeTpd.manualExistingAssets ?? 0,
      spouseHasIncome: computed.spouseHasIncome,
      spouseIncome: computed.spouseIncome,
    }
  }
  return {
    mortgageBalance: computed.totalMortgage,
    otherDebts: computed.totalOtherDebts,
    existingAssets: computed.totalAssets,
    spouseHasIncome: computed.spouseHasIncome,
    spouseIncome: computed.spouseIncome,
  }
}

/**
 * TODO(human): Format a coverage target amount as a multiplier of expenses.
 * Decides whether to show annual or monthly comparison,
 * how to round the multiplier, and what text to display.
 */
function formatExpenseMultiplier(
  targetAmount: number,
  annualExpenses: number
): string {
  // Placeholder — human will implement this
  if (annualExpenses <= 0) return 'Add expenses to see this comparison'
  const multiplier = targetAmount / annualExpenses
  return `≈ ${multiplier.toFixed(1)}× your annual expenses`
}

// ============================================================================
// REFERENCE MODE TOGGLE
// ============================================================================

function ReferenceModeToggle() {
  const colorScheme = useColorScheme()
  const monetWizard = getInsuranceTheme(colorScheme)
  const referenceMode = useReferenceMode()
  const { setReferenceMode } = useGuidelinesActions()

  const options: { value: ReferenceMode; label: string }[] = [
    { value: 'income', label: 'vs Income' },
    { value: 'expenses', label: 'vs Expenses' },
  ]

  return (
    <div
      className="inline-flex rounded-lg p-0.5"
      style={{
        background: `${monetWizard.lavender}08`,
        border: `1px solid ${monetWizard.cardBorder}`,
      }}
    >
      {options.map((option) => {
        const isActive = referenceMode === option.value
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => setReferenceMode(option.value)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all duration-150"
            style={{
              background: isActive ? `${monetWizard.lavender}18` : 'transparent',
              color: isActive ? monetWizard.textPrimary : monetWizard.textMuted,
            }}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
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
  reasoning,
  showInputs = false,
  annualExpenses = 0,
}: {
  coverageType: GuidelineCoverageType
  showEducation?: boolean
  reasoning?: string
  showInputs?: boolean
  annualExpenses?: number
}) {
  const colorScheme = useColorScheme()
  const monetWizard = getInsuranceTheme(colorScheme)

  const guidelines = useGuidelines()
  const targets = useGuidelineTargets()
  const referenceMode = useReferenceMode()
  const answers = useQuestionnaireAnswers()
  const selectedPersonId = useSelectedPersonId()
  const autoPopulate = useQuestionnaireAutoPopulate(selectedPersonId)
  const derivedFinancials = toDerivedFinancials(autoPopulate.computed, answers.lifeTpd)
  const {
    setMultiplier,
    toggleCoverage,
    setHospitalizationPreferences,
    setLifeTpdAnswers,
    setCriticalIllnessAnswers,
    setPersonalAccidentAnswers,
    applyQuestionnaireRecommendations,
  } = useGuidelinesActions()

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

  // Helper to parse currency input (removes $, commas, and other non-numeric chars except . and -)
  const parseCurrency = (value: string): number => {
    const cleaned = value.replace(/[^0-9.\-]/g, '')
    const num = parseFloat(cleaned)
    return isNaN(num) ? 0 : Math.round(num)
  }

  // Helper to format number for input display
  const formatInputCurrency = (value: number): string => {
    if (value === 0) return ''
    return Math.round(value).toLocaleString()
  }

  // Recompute recommendations when inputs change
  const handleInputChange = () => {
    // Small delay to allow state to update
    setTimeout(() => applyQuestionnaireRecommendations(derivedFinancials), 0)
  }

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
              {/* Learn More Tooltip */}
              {showEducation && (
                <Tooltip.Provider delayDuration={200}>
                  <Tooltip.Root>
                    <Tooltip.Trigger asChild>
                      <button
                        type="button"
                        className="p-0.5 rounded-full transition-opacity hover:opacity-70"
                      >
                        <Info className="h-3.5 w-3.5" style={{ color: monetWizard.textMuted }} />
                      </button>
                    </Tooltip.Trigger>
                    <Tooltip.Portal>
                      <Tooltip.Content
                        side="bottom"
                        align="start"
                        sideOffset={8}
                        className="z-[9999] max-w-xs rounded-xl p-4 shadow-xl animate-in fade-in-0 zoom-in-95"
                        style={{
                          background: colorScheme === 'monet' ? '#ffffff' : '#1a1a1a',
                          border: `1px solid ${monetWizard.cardBorder}`,
                        }}
                      >
                        <p
                          className="text-xs font-medium mb-2"
                          style={{ color: monetWizard.textSecondary }}
                        >
                          {education.title}
                        </p>
                        <ul className="space-y-1.5">
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
                        <Tooltip.Arrow style={{ fill: colorScheme === 'monet' ? '#ffffff' : '#1a1a1a' }} />
                      </Tooltip.Content>
                    </Tooltip.Portal>
                  </Tooltip.Root>
                </Tooltip.Provider>
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
            // Income-based: editable inputs layout
            <div className="space-y-4">
              {/* Editable Inputs - type-specific */}
              {showInputs && coverageType === 'life_tpd' && (
                <div
                  className="rounded-xl p-4"
                  style={{
                    background: monetWizard.surfaceBg,
                    border: `1px solid ${accent}25`,
                  }}
                >
                  <p
                    className="text-[10px] uppercase tracking-wider mb-3"
                    style={{ color: accent }}
                  >
                    Your situation
                  </p>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                    <div>
                      <label className="text-[10px] uppercase tracking-wider" style={{ color: monetWizard.textMuted }}>
                        Dependents
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={10}
                        value={answers.lifeTpd.dependentCount}
                        onChange={(e) => {
                          setLifeTpdAnswers({ dependentCount: parseInt(e.target.value) || 0 })
                          handleInputChange()
                        }}
                        className="w-full mt-1 px-2 py-1.5 rounded-lg text-xs font-mono tabular-nums bg-transparent border focus:outline-none focus:ring-1"
                        style={{
                          color: monetWizard.textPrimary,
                          borderColor: monetWizard.cardBorder,
                        }}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase tracking-wider" style={{ color: monetWizard.textMuted }}>
                        Years to support
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={30}
                        value={answers.lifeTpd.yearsUntilIndependent}
                        onChange={(e) => {
                          setLifeTpdAnswers({ yearsUntilIndependent: parseInt(e.target.value) || 0 })
                          handleInputChange()
                        }}
                        className="w-full mt-1 px-2 py-1.5 rounded-lg text-xs font-mono tabular-nums bg-transparent border focus:outline-none focus:ring-1"
                        style={{
                          color: monetWizard.textPrimary,
                          borderColor: monetWizard.cardBorder,
                        }}
                      />
                    </div>
                  </div>

                  {/* Financial data source toggle */}
                  <div className="mt-3 pt-3" style={{ borderTop: `1px solid ${monetWizard.cardBorder}` }}>
                    <div className="flex items-center justify-between mb-3">
                      <p
                        className="text-[10px] uppercase tracking-wider"
                        style={{ color: accent }}
                      >
                        Debts &amp; assets
                      </p>
                      <div
                        className="inline-flex rounded-md p-0.5"
                        style={{
                          background: monetWizard.surfaceBg,
                          border: `1px solid ${monetWizard.cardBorder}`,
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            setLifeTpdAnswers({ useManualFinancials: false })
                            handleInputChange()
                          }}
                          className="px-2 py-0.5 rounded text-[10px] font-medium transition-all duration-150 flex items-center gap-1"
                          style={{
                            background: !answers.lifeTpd.useManualFinancials ? `${accent}20` : 'transparent',
                            color: !answers.lifeTpd.useManualFinancials ? monetWizard.textPrimary : monetWizard.textMuted,
                          }}
                        >
                          <ExternalLink className="h-2.5 w-2.5" />
                          Use plan data
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setLifeTpdAnswers({
                              useManualFinancials: true,
                              // Seed manual values from plan data if starting fresh
                              ...(!answers.lifeTpd.manualMortgageBalance &&
                                !answers.lifeTpd.manualOtherDebts &&
                                !answers.lifeTpd.manualExistingAssets
                                ? {
                                    manualMortgageBalance: autoPopulate.computed.totalMortgage,
                                    manualOtherDebts: autoPopulate.computed.totalOtherDebts,
                                    manualExistingAssets: autoPopulate.computed.totalAssets,
                                  }
                                : {}),
                            })
                            handleInputChange()
                          }}
                          className="px-2 py-0.5 rounded text-[10px] font-medium transition-all duration-150 flex items-center gap-1"
                          style={{
                            background: answers.lifeTpd.useManualFinancials ? `${accent}20` : 'transparent',
                            color: answers.lifeTpd.useManualFinancials ? monetWizard.textPrimary : monetWizard.textMuted,
                          }}
                        >
                          <Edit3 className="h-2.5 w-2.5" />
                          Enter my own
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                      <div>
                        <label className="text-[10px] uppercase tracking-wider" style={{ color: monetWizard.textMuted }}>
                          Mortgage ($)
                        </label>
                        <input
                          type="text"
                          value={formatInputCurrency(
                            answers.lifeTpd.useManualFinancials
                              ? (answers.lifeTpd.manualMortgageBalance ?? 0)
                              : autoPopulate.computed.totalMortgage
                          )}
                          onChange={(e) => {
                            setLifeTpdAnswers({ manualMortgageBalance: parseCurrency(e.target.value) })
                            handleInputChange()
                          }}
                          disabled={!answers.lifeTpd.useManualFinancials}
                          placeholder="0"
                          className="w-full mt-1 px-2 py-1.5 rounded-lg text-xs font-mono tabular-nums bg-transparent border focus:outline-none focus:ring-1 disabled:opacity-50"
                          style={{
                            color: monetWizard.textPrimary,
                            borderColor: answers.lifeTpd.useManualFinancials ? monetWizard.cardBorder : `${monetWizard.cardBorder}80`,
                          }}
                        />
                      </div>
                      <div>
                        <label className="text-[10px] uppercase tracking-wider" style={{ color: monetWizard.textMuted }}>
                          Other debts ($)
                        </label>
                        <input
                          type="text"
                          value={formatInputCurrency(
                            answers.lifeTpd.useManualFinancials
                              ? (answers.lifeTpd.manualOtherDebts ?? 0)
                              : autoPopulate.computed.totalOtherDebts
                          )}
                          onChange={(e) => {
                            setLifeTpdAnswers({ manualOtherDebts: parseCurrency(e.target.value) })
                            handleInputChange()
                          }}
                          disabled={!answers.lifeTpd.useManualFinancials}
                          placeholder="0"
                          className="w-full mt-1 px-2 py-1.5 rounded-lg text-xs font-mono tabular-nums bg-transparent border focus:outline-none focus:ring-1 disabled:opacity-50"
                          style={{
                            color: monetWizard.textPrimary,
                            borderColor: answers.lifeTpd.useManualFinancials ? monetWizard.cardBorder : `${monetWizard.cardBorder}80`,
                          }}
                        />
                      </div>
                      <div>
                        <label className="text-[10px] uppercase tracking-wider" style={{ color: monetWizard.textMuted }}>
                          Existing assets ($)
                        </label>
                        <input
                          type="text"
                          value={formatInputCurrency(
                            answers.lifeTpd.useManualFinancials
                              ? (answers.lifeTpd.manualExistingAssets ?? 0)
                              : autoPopulate.computed.totalAssets
                          )}
                          onChange={(e) => {
                            setLifeTpdAnswers({ manualExistingAssets: parseCurrency(e.target.value) })
                            handleInputChange()
                          }}
                          disabled={!answers.lifeTpd.useManualFinancials}
                          placeholder="0"
                          className="w-full mt-1 px-2 py-1.5 rounded-lg text-xs font-mono tabular-nums bg-transparent border focus:outline-none focus:ring-1 disabled:opacity-50"
                          style={{
                            color: monetWizard.textPrimary,
                            borderColor: answers.lifeTpd.useManualFinancials ? monetWizard.cardBorder : `${monetWizard.cardBorder}80`,
                          }}
                        />
                      </div>
                    </div>
                    {!answers.lifeTpd.useManualFinancials && (
                      <p className="text-[10px] mt-2 flex items-center gap-1" style={{ color: monetWizard.textMuted }}>
                        <ExternalLink className="h-2.5 w-2.5" />
                        Sourced from your financial plan — edit liabilities &amp; assets there to update
                      </p>
                    )}
                  </div>
                </div>
              )}

              {showInputs && coverageType === 'critical_illness' && (
                <div
                  className="rounded-xl p-4"
                  style={{
                    background: monetWizard.surfaceBg,
                    border: `1px solid ${accent}25`,
                  }}
                >
                  <p
                    className="text-[10px] uppercase tracking-wider mb-3"
                    style={{ color: accent }}
                  >
                    Your situation
                  </p>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                    <div>
                      <label className="text-[10px] uppercase tracking-wider" style={{ color: monetWizard.textMuted }}>
                        Emergency fund (months)
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={36}
                        value={answers.criticalIllness.emergencyFundMonths}
                        onChange={(e) => {
                          setCriticalIllnessAnswers({ emergencyFundMonths: parseInt(e.target.value) || 0 })
                          handleInputChange()
                        }}
                        className="w-full mt-1 px-2 py-1.5 rounded-lg text-xs font-mono tabular-nums bg-transparent border focus:outline-none focus:ring-1"
                        style={{
                          color: monetWizard.textPrimary,
                          borderColor: monetWizard.cardBorder,
                        }}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase tracking-wider" style={{ color: monetWizard.textMuted }}>
                        Recovery period (months)
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={36}
                        value={answers.criticalIllness.expectedRecoveryMonths}
                        onChange={(e) => {
                          setCriticalIllnessAnswers({ expectedRecoveryMonths: parseInt(e.target.value) || 0 })
                          handleInputChange()
                        }}
                        className="w-full mt-1 px-2 py-1.5 rounded-lg text-xs font-mono tabular-nums bg-transparent border focus:outline-none focus:ring-1"
                        style={{
                          color: monetWizard.textPrimary,
                          borderColor: monetWizard.cardBorder,
                        }}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase tracking-wider" style={{ color: monetWizard.textMuted }}>
                        Monthly expenses ($)
                      </label>
                      <input
                        type="text"
                        value={formatInputCurrency(answers.criticalIllness.monthlyExpenses)}
                        onChange={(e) => {
                          setCriticalIllnessAnswers({ monthlyExpenses: parseCurrency(e.target.value) })
                          handleInputChange()
                        }}
                        placeholder="0"
                        className="w-full mt-1 px-2 py-1.5 rounded-lg text-xs font-mono tabular-nums bg-transparent border focus:outline-none focus:ring-1"
                        style={{
                          color: monetWizard.textPrimary,
                          borderColor: monetWizard.cardBorder,
                        }}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase tracking-wider" style={{ color: monetWizard.textMuted }}>
                        Existing coverage ($)
                      </label>
                      <input
                        type="text"
                        value={formatInputCurrency(answers.criticalIllness.existingCiCoverage)}
                        onChange={(e) => {
                          setCriticalIllnessAnswers({ existingCiCoverage: parseCurrency(e.target.value) })
                          handleInputChange()
                        }}
                        placeholder="0"
                        className="w-full mt-1 px-2 py-1.5 rounded-lg text-xs font-mono tabular-nums bg-transparent border focus:outline-none focus:ring-1"
                        style={{
                          color: monetWizard.textPrimary,
                          borderColor: monetWizard.cardBorder,
                        }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {showInputs && coverageType === 'personal_accident' && (
                <div
                  className="rounded-xl p-4"
                  style={{
                    background: monetWizard.surfaceBg,
                    border: `1px solid ${accent}25`,
                  }}
                >
                  <p
                    className="text-[10px] uppercase tracking-wider mb-3"
                    style={{ color: accent }}
                  >
                    Your situation
                  </p>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                    <div>
                      <label className="text-[10px] uppercase tracking-wider block mb-1" style={{ color: monetWizard.textMuted }}>
                        Occupation risk
                      </label>
                      <CustomDropdown
                        value={answers.personalAccident.occupationRisk}
                        onChange={(value) => {
                          setPersonalAccidentAnswers({ occupationRisk: value as 'low' | 'medium' | 'high' })
                          handleInputChange()
                        }}
                        options={[
                          { value: 'low', label: 'Low (Office)' },
                          { value: 'medium', label: 'Medium (Field)' },
                          { value: 'high', label: 'High (Manual)' },
                        ]}
                        minWidth="100%"
                        variant="monet"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="text-[10px] uppercase tracking-wider" style={{ color: monetWizard.textMuted }}>
                        Existing PA coverage ($)
                      </label>
                      <input
                        type="text"
                        value={formatInputCurrency(answers.personalAccident.existingPaCoverage)}
                        onChange={(e) => {
                          setPersonalAccidentAnswers({ existingPaCoverage: parseCurrency(e.target.value) })
                          handleInputChange()
                        }}
                        placeholder="0"
                        className="w-full mt-1 px-2 py-1.5 rounded-lg text-xs font-mono tabular-nums bg-transparent border focus:outline-none focus:ring-1"
                        style={{
                          color: monetWizard.textPrimary,
                          borderColor: monetWizard.cardBorder,
                        }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Target amount - editable input */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <p
                    className="text-[10px] uppercase tracking-wider"
                    style={{ color: monetWizard.textMuted }}
                  >
                    Coverage target
                  </p>
                  <ReferenceModeToggle />
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-xl" style={{ color: accent }}>$</span>
                  <input
                    type="text"
                    value={formatInputCurrency(targetAmount as number)}
                    onChange={(e) => {
                      const newTarget = parseCurrency(e.target.value)
                      const income = guidelines.annualIncome || 1
                      const newMultiplier = Math.max(1, Math.min(20, Math.round(newTarget / income)))
                      setMultiplier(coverageType, newMultiplier)
                    }}
                    className="text-2xl font-light font-mono tabular-nums bg-transparent border-b-2 focus:outline-none transition-colors"
                    style={{
                      color: accent,
                                borderColor: `${accent}30`,
                      width: `${Math.max(3, String(targetAmount).length) + 1}ch`,
                    }}
                  />
                </div>
                <p
                  className="text-[11px] mt-1.5"
                  style={{ color: monetWizard.textMuted }}
                >
                  {referenceMode === 'expenses'
                    ? formatExpenseMultiplier(targetAmount as number, annualExpenses)
                    : `≈ ${multiplier}× your annual income`}
                </p>
              </div>
            </div>
          )}

          {/* Reasoning display - shows why this coverage was recommended */}
          {reasoning && (
            <div
              className="flex items-start gap-2 mt-4 pt-4"
              style={{ borderTop: `1px solid ${monetWizard.cardBorder}` }}
            >
              <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" style={{ color: monetWizard.lavender }} />
              <p
                className="text-xs leading-relaxed"
                style={{ color: monetWizard.textSecondary }}
              >
                {reasoning}
              </p>
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
  // Hex alpha: 18 ≈ 9%, 30 ≈ 19%, 60 ≈ 38%
  const colorStyles: Record<string, { bg: string; border: string; accent: string }> = {
    emerald: {
      bg: `${monetWizard.sage}18`,
      border: `${monetWizard.sage}60`,
      accent: monetWizard.sage,
    },
    blue: {
      bg: `${monetWizard.blue}18`,
      border: `${monetWizard.blue}60`,
      accent: monetWizard.blue,
    },
    purple: {
      bg: `${monetWizard.purple}18`,
      border: `${monetWizard.purple}60`,
      accent: monetWizard.purple,
    },
    amber: {
      bg: `${monetWizard.amber}18`,
      border: `${monetWizard.amber}60`,
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
              ? `${styles.accent}30`
              : `${monetWizard.textMuted}12`,
            border: `1px solid ${isSelected ? `${styles.accent}40` : `${monetWizard.textMuted}15`}`,
          }}
        >
          {icon}
        </div>
        <div className="flex-1">
          <p
            className="font-medium"
            style={{
              color: isSelected ? monetWizard.textPrimary : monetWizard.textSecondary,
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

      {/* Header with inline info button */}
      <div className="text-center mb-8">
        <div className="flex items-center justify-center gap-2 mb-3">
          <h2
            className="text-2xl font-semibold"
            style={{ color: monetWizard.textPrimary }}
          >
            Hospitalization Coverage
          </h2>
          <Tooltip.Provider delayDuration={200}>
            <Tooltip.Root>
              <Tooltip.Trigger asChild>
                <button
                  type="button"
                  className="p-1 rounded-full transition-opacity hover:opacity-70"
                >
                  <Info className="h-4 w-4" style={{ color: monetWizard.textMuted }} />
                </button>
              </Tooltip.Trigger>
              <Tooltip.Portal>
                <Tooltip.Content
                  side="bottom"
                  align="center"
                  sideOffset={8}
                  className="z-[9999] max-w-sm rounded-xl p-4 shadow-xl animate-in fade-in-0 zoom-in-95"
                  style={{
                    background: colorScheme === 'monet' ? '#ffffff' : '#1a1a1a',
                    border: `1px solid ${monetWizard.cardBorder}`,
                  }}
                >
                  <div className="mb-3">
                    <p className="text-xs font-medium mb-2" style={{ color: monetWizard.textPrimary }}>
                      Private vs Public
                    </p>
                    <ul className="text-xs space-y-1" style={{ color: monetWizard.textSecondary }}>
                      <li>• <strong>Private:</strong> Choose your specialist, shorter wait (days vs months)</li>
                      <li>• <strong>Public:</strong> All ward classes (A, B1, B2+, C), government subsidies</li>
                      <li>• Public Class A/B1 offers similar comfort at lower cost</li>
                    </ul>
                  </div>
                  <div
                    className="p-3 rounded-lg"
                    style={{
                      background: `${monetWizard.amber}15`,
                      border: `1px solid ${monetWizard.amber}20`,
                    }}
                  >
                    <p className="text-xs font-medium mb-1" style={{ color: monetWizard.amber }}>
                      MOH Rules from April 2026
                    </p>
                    <p className="text-xs" style={{ color: monetWizard.textSecondary }}>
                      New IP riders can no longer fully cover deductibles ($1,500–$3,500 minimum out-of-pocket).
                      Existing policies bought before Nov 2025 are unaffected.
                    </p>
                  </div>
                  <Tooltip.Arrow style={{ fill: colorScheme === 'monet' ? '#ffffff' : '#1a1a1a' }} />
                </Tooltip.Content>
              </Tooltip.Portal>
            </Tooltip.Root>
          </Tooltip.Provider>
        </div>
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
  const lifeTpdFinancials = toDerivedFinancials(autoPopulate.computed, answers.lifeTpd)
  const { includedPersons } = usePersonFilter()
  const { data: incomes = [] } = useIncomesQuery()

  // Other persons (excluding primary) as potential dependents
  const otherPersons = useMemo(() => {
    return includedPersons
      .filter((p) => p.id !== selectedPersonId)
      .map((p) => {
        const today = new Date()
        const birth = new Date(p.dateOfBirth)
        let age = today.getFullYear() - birth.getFullYear()
        const monthDiff = today.getMonth() - birth.getMonth()
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
          age--
        }
        return { ...p, age: Math.max(0, age) }
      })
  }, [includedPersons, selectedPersonId])

  // Derive dependent count and youngest age from selected person IDs
  const handleDependentSelection = (personId: string) => {
    const currentIds = answers.lifeTpd.dependentPersonIds || []
    const isSelected = currentIds.includes(personId)
    const newIds = isSelected
      ? currentIds.filter((id) => id !== personId)
      : [...currentIds, personId]

    // Calculate youngest age from selected dependents
    const selectedDependents = otherPersons.filter((p) => newIds.includes(p.id))
    const youngestAge = selectedDependents.length > 0
      ? Math.min(...selectedDependents.map((p) => p.age))
      : null
    const yearsUntilIndependent = youngestAge !== null ? Math.max(0, 22 - youngestAge) : 0

    // If the deselected person was the spouse, clear spouse too
    const spouseCleared = isSelected && personId === answers.lifeTpd.spousePersonId
      ? { spousePersonId: null }
      : {}

    setLifeTpdAnswers({
      dependentPersonIds: newIds,
      dependentCount: newIds.length,
      youngestDependentAge: youngestAge,
      yearsUntilIndependent,
      ...spouseCleared,
    })
  }

  // Auto-calculate spouse income when spouse is selected
  const spouseIncome = useMemo(() => {
    if (!answers.lifeTpd.spousePersonId) return 0
    return calculateAnnualIncomeForPerson(incomes, answers.lifeTpd.spousePersonId)
  }, [incomes, answers.lifeTpd.spousePersonId])

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

  // Calculate recommended coverage based on answers + financial data
  const incomeReplacement = answers.lifeTpd.dependentCount > 0
    ? guidelines.annualIncome * answers.lifeTpd.yearsUntilIndependent
    : 0
  const sanitizedObligations = Math.max(0, answers.lifeTpd.futureObligations)
  const totalNeeded = incomeReplacement +
    lifeTpdFinancials.mortgageBalance +
    lifeTpdFinancials.otherDebts +
    sanitizedObligations -
    lifeTpdFinancials.existingAssets

  return (
    <div className="max-w-xl mx-auto">
      <SectionProgressDots current={subStep} total={totalSubSteps} />

      {/* Header - Monet style */}
      <div className="text-center mb-8">
        <h2
          className="text-2xl font-semibold mb-3"
          style={{
            color: monetWizard.textPrimary,
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
        // Step 0: Dependents — select from persons list
        <div className="space-y-5 mb-8">
          <div>
            <label className="block text-sm mb-3" style={{ color: monetWizard.textSecondary }}>
              Who financially depends on you?
            </label>

            {otherPersons.length > 0 ? (
              <div className="space-y-2">
                {otherPersons.map((person) => {
                  const isSelected = (answers.lifeTpd.dependentPersonIds || []).includes(person.id)
                  return (
                    <button
                      key={person.id}
                      type="button"
                      onClick={() => handleDependentSelection(person.id)}
                      className="w-full flex items-center justify-between rounded-xl px-4 py-3 transition-all duration-200"
                      style={{
                        background: isSelected ? `${monetWizard.blue}18` : monetWizard.surfaceBg,
                        border: `1px solid ${isSelected ? `${monetWizard.blue}60` : monetWizard.cardBorder}`,
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-medium"
                          style={{
                            background: person.displayColor || monetWizard.blue,
                            color: '#fff',
                          }}
                        >
                          {person.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="text-left">
                          <p className="text-sm font-medium" style={{ color: monetWizard.textPrimary }}>
                            {person.name}
                          </p>
                          <p className="text-xs" style={{ color: monetWizard.textMuted }}>
                            Age {person.age}
                            {person.relationship && person.relationship !== 'self'
                              ? ` · ${person.relationship.charAt(0).toUpperCase() + person.relationship.slice(1)}`
                              : person.age < 18 ? ' · Child' : person.age >= 65 ? ' · Elderly' : ''}
                          </p>
                        </div>
                      </div>
                      <div
                        className="h-5 w-5 rounded-md flex items-center justify-center transition-all"
                        style={{
                          background: isSelected ? monetWizard.blue : 'transparent',
                          border: `1.5px solid ${isSelected ? monetWizard.blue : monetWizard.cardBorder}`,
                        }}
                      >
                        {isSelected && <Check className="h-3 w-3 text-white" />}
                      </div>
                    </button>
                  )
                })}
              </div>
            ) : (
              <div
                className="p-4 rounded-2xl text-center"
                style={{
                  background: monetWizard.surfaceBg,
                  border: `1px solid ${monetWizard.cardBorder}`,
                }}
              >
                <p className="text-sm" style={{ color: monetWizard.textMuted }}>
                  No other persons added. Add family members in the main app to select them here.
                </p>
              </div>
            )}

            {(answers.lifeTpd.dependentPersonIds || []).length > 0 && (
              <p className="text-xs mt-2" style={{ color: monetWizard.textMuted }}>
                {answers.lifeTpd.dependentCount} dependent{answers.lifeTpd.dependentCount !== 1 ? 's' : ''} selected
                {answers.lifeTpd.youngestDependentAge !== null && (
                  <> · Youngest age {answers.lifeTpd.youngestDependentAge} · {answers.lifeTpd.yearsUntilIndependent} years until independent</>
                )}
              </p>
            )}
          </div>

          {(answers.lifeTpd.dependentPersonIds || []).length > 0 && (
            <div>
              <label className="text-[10px] uppercase tracking-wider block mb-2" style={{ color: monetWizard.textMuted }}>
                Spouse / Partner (has own income)
              </label>
              <PersonSelector
                value={answers.lifeTpd.spousePersonId}
                onChange={(personId) => {
                  setLifeTpdAnswers({ spousePersonId: personId })
                }}
                placeholder="None"
                variant={colorScheme === 'monet' ? 'monet' : 'dark'}
                showCreate={false}
                excludePersonIds={[
                  ...(selectedPersonId ? [selectedPersonId] : []),
                  ...otherPersons.filter((p) => p.relationship === 'child').map((p) => p.id),
                ]}
              />
              <p className="text-xs mt-1.5" style={{ color: monetWizard.textMuted }}>
                {answers.lifeTpd.spousePersonId
                  ? spouseIncome > 0
                    ? `Annual income: ${formatCurrency(spouseIncome)} — reduces coverage needed`
                    : 'No income found for this person'
                  : 'Select if spouse/partner has their own income — this reduces coverage needed'}
              </p>
            </div>
          )}

          {(answers.lifeTpd.dependentPersonIds || []).length === 0 && otherPersons.length > 0 && (
            <div
              className="p-4 rounded-2xl"
              style={{
                background: `${monetWizard.sage}12`,
                border: `1px solid ${monetWizard.sage}25`,
              }}
            >
              <p className="text-sm" style={{ color: monetWizard.textSecondary }}>
                <strong>No dependents?</strong> You may only need minimal coverage for final expenses
                (funeral costs, outstanding debts). Consider if this changes in the future.
              </p>
            </div>
          )}
        </div>
      ) : (
        // Step 1: Financial obligations
        <div className="space-y-5 mb-6">
          {/* Auto-fetched financial summary */}
          <div
            className="rounded-2xl p-4 space-y-3"
            style={{
              background: monetWizard.surfaceBg,
              border: `1px solid ${monetWizard.cardBorder}`,
            }}
          >
            <div className="flex items-center gap-2 mb-1">
              <Check className="h-3.5 w-3.5" style={{ color: monetWizard.sage }} />
              <p className="text-[10px] uppercase tracking-wider" style={{ color: monetWizard.sage }}>
                From your financial data
              </p>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm" style={{ color: monetWizard.textSecondary }}>
                Outstanding mortgage
              </span>
              <span className="text-sm font-mono tabular-nums font-medium" style={{ color: monetWizard.textPrimary }}>
                {formatCurrency(lifeTpdFinancials.mortgageBalance)}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm" style={{ color: monetWizard.textSecondary }}>
                Other debts
              </span>
              <span className="text-sm font-mono tabular-nums font-medium" style={{ color: monetWizard.textPrimary }}>
                {formatCurrency(lifeTpdFinancials.otherDebts)}
              </span>
            </div>

            <div
              className="flex items-center justify-between pt-3"
              style={{ borderTop: `1px solid ${monetWizard.cardBorder}` }}
            >
              <span className="text-sm" style={{ color: monetWizard.textSecondary }}>
                Existing assets
              </span>
              <span className="text-sm font-mono tabular-nums font-medium" style={{ color: monetWizard.textPrimary }}>
                {formatCurrency(lifeTpdFinancials.existingAssets)}
              </span>
            </div>

            {!autoPopulate.sources.liabilities && !autoPopulate.sources.assets && (
              <p className="text-xs" style={{ color: monetWizard.textMuted }}>
                No financial data found. Add liabilities and assets in the main app for automatic calculation.
              </p>
            )}
          </div>

          <NumberInput
            label="Future obligations (children's education fund, etc.)"
            value={Math.max(0, answers.lifeTpd.futureObligations)}
            onChange={(value) => setLifeTpdAnswers({ futureObligations: Math.max(0, value) })}
            helpText="University education in Singapore costs ~$50-100K per child"
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
              {formatCurrency(lifeTpdFinancials.mortgageBalance + lifeTpdFinancials.otherDebts)} (debts) +
              {formatCurrency(sanitizedObligations)} (obligations) -
              {formatCurrency(lifeTpdFinancials.existingAssets)} (assets)
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
  const selectedPersonId = useSelectedPersonId()
  const autoPopulate = useQuestionnaireAutoPopulate(selectedPersonId)
  const selfInsuranceDerivedFinancials = toDerivedFinancials(autoPopulate.computed, answers.lifeTpd)
  const recommendations = useQuestionnaireRecommendations(selfInsuranceDerivedFinancials)

  const handleContinue = () => {
    // Apply all questionnaire recommendations to the guidelines
    applyQuestionnaireRecommendations(selfInsuranceDerivedFinancials)
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
// CONFIGURED VIEW COMPONENTS
// ============================================================================

/**
 * Person selector dropdown for guidelines
 */
function PersonSelectorBar() {
  const colorScheme = useColorScheme()
  const monetWizard = getInsuranceTheme(colorScheme)
  const selectedPersonId = useSelectedPersonId()
  const { setSelectedPersonId } = useGuidelinesActions()

  return (
    <div
      className="flex items-center gap-3 rounded-2xl px-5 py-3 mb-6"
      style={{
        background: `${monetWizard.lavender}08`,
        border: `1px solid ${monetWizard.lavender}15`,
      }}
    >
      <User className="h-4 w-4 shrink-0" style={{ color: monetWizard.lavender }} />
      <span className="text-sm" style={{ color: monetWizard.textSecondary }}>
        Coverage for
      </span>
      <PersonSelector
        value={selectedPersonId}
        onChange={setSelectedPersonId}
        placeholder="Select person"
        variant={colorScheme === 'monet' ? 'monet' : 'dark'}
        showCreate={false}
      />
    </div>
  )
}

// ============================================================================
// CONFIGURED VIEW (Edit mode - after wizard completion)
// ============================================================================

interface ConfiguredGuidelinesViewProps {
  onAddPolicy?: () => void
}

function ConfiguredGuidelinesView({ onAddPolicy }: ConfiguredGuidelinesViewProps) {
  const colorScheme = useColorScheme()
  const monetWizard = getInsuranceTheme(colorScheme)

  const guidelines = useGuidelines()
  const targets = useGuidelineTargets()
  const answers = useQuestionnaireAnswers()
  const referenceMode = useReferenceMode()
  const selectedPersonId = useSelectedPersonId()
  const { setMaxPremiumPercentage, resetToDefaults, unmarkAsConfigured } = useGuidelinesActions()
  const [showResetConfirm, setShowResetConfirm] = useState(false)

  // Fetch expenses for "vs Expenses" mode
  const { data: expensesData } = useExpensesQuery()
  const expenses = expensesData?.expenses ?? []
  const annualExpenses = useMemo(() => calculateAnnualExpenses(expenses), [expenses])

  // Derived financials from existing data (liabilities, assets, incomes)
  const autoPopulateData = useQuestionnaireAutoPopulate(selectedPersonId)
  const reviewDerivedFinancials = toDerivedFinancials(autoPopulateData.computed, answers.lifeTpd)
  const recommendations = useQuestionnaireRecommendations(reviewDerivedFinancials)

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
                  }}
            >
              My Coverage Targets
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={unmarkAsConfigured}
              className="flex items-center gap-2 px-4 py-2 text-xs font-medium uppercase tracking-wider transition-all duration-300 hover:opacity-70"
              style={{ color: monetWizard.lavender }}
            >
              <Edit3 className="h-3.5 w-3.5" />
              Edit Answers
            </button>
            <button
              type="button"
              onClick={() => setShowResetConfirm(true)}
              className="flex items-center gap-2 px-4 py-2 text-xs font-medium uppercase tracking-wider transition-all duration-300 hover:opacity-70"
              style={{ color: monetWizard.textMuted }}
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset
            </button>
            {onAddPolicy && (
              <button
                type="button"
                onClick={onAddPolicy}
                className="flex items-center gap-2 rounded-full px-6 py-2.5 text-xs font-medium uppercase tracking-wider text-white transition-all duration-300 hover:translate-y-[-1px]"
                style={{
                  background: monetWizard.sage,
                  boxShadow: `0 4px 20px ${monetWizard.sage}40`,
                }}
              >
                <Plus className="h-3.5 w-3.5" />
                Add Policy
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

        {/* Person selector */}
        <PersonSelectorBar />

        <div className="grid lg:grid-cols-12 gap-8">
          {/* Coverage cards - 8 columns */}
          <div className="lg:col-span-8 space-y-3">
            {coverageTypes.map((type) => {
              // Map coverage type to reasoning key
              const reasoningKey = type === 'life_tpd' ? 'lifeTpd' : type === 'critical_illness' ? 'criticalIllness' : type === 'personal_accident' ? 'personalAccident' : type
              const reasoning = recommendations.reasoning[reasoningKey as keyof typeof recommendations.reasoning]
              return (
                <CoverageMultiplierCard
                  key={type}
                  coverageType={type}
                  showEducation
                  reasoning={reasoning}
                  showInputs
                  annualExpenses={annualExpenses}
                />
              )
            })}
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
                <div className="flex items-center justify-between mb-4">
                  <p
                    className="text-[10px] font-medium uppercase tracking-[0.2em]"
                    style={{ color: monetWizard.textMuted }}
                  >
                    Your Targets
                  </p>
                  <ReferenceModeToggle />
                </div>
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
                        <div className="text-right">
                          <span
                            className="text-sm font-mono tabular-nums"
                            style={{ color: monetWizard.textPrimary }}
                          >
                            {isHospitalization
                              ? wardClassConfig[guidelines.coverages.hospitalization.preferredWardClass]
                                  .label
                              : formatCurrency(targets[type as keyof typeof targets] as number)}
                          </span>
                          {!isHospitalization && referenceMode === 'expenses' && (
                            <p
                              className="text-[10px] mt-0.5"
                              style={{ color: monetWizard.textMuted }}
                            >
                              {formatExpenseMultiplier(
                                targets[type as keyof typeof targets] as number,
                                annualExpenses
                              )}
                            </p>
                          )}
                        </div>
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
  onClose?: () => void
}

export function GuidelinesTab({ onNavigateToPolicy, onClose }: GuidelinesTabProps) {
  const hasConfigured = useHasConfiguredGuidelines()
  const { markAsConfigured } = useGuidelinesActions()
  const [wizardStep, setWizardStep] = useState(1)

  // If configured, show the editable guidelines view directly
  if (hasConfigured) {
    return <ConfiguredGuidelinesView onAddPolicy={onNavigateToPolicy} />
  }

  // Wizard flow for first-time setup
  const stepLabels = ['Income', 'Questions', 'Review']

  const handleComplete = () => {
    markAsConfigured()
    onClose?.()
  }

  return (
    <div className="p-8">
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
