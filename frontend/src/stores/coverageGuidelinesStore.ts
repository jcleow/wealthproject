/**
 * ⚠️  REFACTOR NEEDED — See GitHub issue for full context.
 *
 * This store uses Zustand persist (localStorage) for the coverage questionnaire wizard.
 * Once backend persistence is in place, this should be refactored to:
 *
 *   1. React Hook Form + Zod for per-step validation in the wizard
 *   2. React Query for server state (replace Zustand persist entirely)
 *   3. Remove localStorage persistence — backend API becomes source of truth
 *
 * Current architecture:
 *   Wizard steps → Zustand store (persist to localStorage) → consumed by multiple components
 *
 * Target architecture:
 *   Wizard steps → RHF useForm() per step (local validation)
 *     → on step complete, mutate via React Query → backend API
 *     → React Query cache serves as shared state for CoverageJourney, JourneyTab, etc.
 *
 * Why this matters:
 *   - RHF gives us proper validation, dirty tracking, error states per field
 *   - React Query gives us cache invalidation, optimistic updates, loading states
 *   - Eliminates localStorage stale data bugs (e.g. NaN from missing fields)
 *   - Aligns with project conventions (CLAUDE.md: "Use RHF for forms, Zustand for shared state")
 */
import { create } from 'zustand'
import { useShallow } from 'zustand/react/shallow'
import { devtools, persist } from 'zustand/middleware'
import type {
  UserCoverageGuidelines,
  GuidelinesPreset,
  GuidelineCoverageType,
  WardClass,
} from '@/types/insurance'
import {
  createDefaultGuidelines,
  guidelinesPresets,
  calculateGuidelineTargets,
} from '@/types/insurance'

// ============================================
// QUESTIONNAIRE TYPES
// ============================================

/**
 * Hospitalization first-principles questions
 * The fundamental choice: Public vs Private hospital
 */
export interface HospitalizationAnswers {
  /** Primary choice: prefer private or public hospital? */
  hospitalPreference: 'private' | 'public' | null
  /** Reason for choice (for user reflection) */
  preferenceReason?: 'doctor_choice' | 'wait_time' | 'cost' | 'other'
  /** If private: willing to pay out-of-pocket for premium comfort? */
  willingToPayPremium?: boolean
  /** If public: comfortable with longer wait times? */
  comfortableWithWait?: boolean
}

/**
 * Life/TPD first-principles questions
 * Core question: Who depends on my income?
 *
 * By default, mortgageBalance, otherDebts, existingAssets are derived from existing
 * financial data via useQuestionnaireAutoPopulate. Users can toggle to manual entry
 * via useManualFinancials. spouseHasIncome/spouseIncome are always derived.
 */
export interface LifeTpdAnswers {
  /** Selected dependent person IDs */
  dependentPersonIds: string[]
  /** Number of financial dependents (not self-sufficient) */
  dependentCount: number
  /** Age of youngest dependent */
  youngestDependentAge: number | null
  /** Years until youngest is financially independent */
  yearsUntilIndependent: number
  /** Future obligations (children's education, etc.) — user-entered */
  futureObligations: number
  /** Selected spouse person ID */
  spousePersonId: string | null
  /** If true, use manually entered values instead of plan data */
  useManualFinancials: boolean
  /** Manual override: mortgage balance (only used when useManualFinancials is true) */
  manualMortgageBalance: number
  /** Manual override: other debts (only used when useManualFinancials is true) */
  manualOtherDebts: number
  /** Manual override: existing assets (only used when useManualFinancials is true) */
  manualExistingAssets: number
}

/**
 * Financial data derived from existing tables (liabilities, assets, incomes).
 * Passed as a parameter to coverage calculations rather than stored in questionnaire.
 */
export interface DerivedFinancials {
  mortgageBalance: number
  otherDebts: number
  existingAssets: number
  spouseHasIncome: boolean
  spouseIncome: number
}

/**
 * Critical Illness first-principles questions
 * Core question: Can I survive 2 years without income?
 */
export interface CriticalIllnessAnswers {
  /** Months of expenses covered by emergency fund */
  emergencyFundMonths: number
  /** Expected recovery period if diagnosed (months) */
  expectedRecoveryMonths: number
  /** Family support available during recovery? */
  hasFamilySupport: boolean
  /** Monthly expenses if unable to work */
  monthlyExpenses: number
  /** Existing CI coverage from employer or policies */
  existingCiCoverage: number
}

/**
 * Personal Accident first-principles questions
 * Core question: How risky is my lifestyle/occupation?
 */
export interface PersonalAccidentAnswers {
  /** Occupation risk level */
  occupationRisk: 'low' | 'medium' | 'high'
  /** Active lifestyle (sports, adventure activities)? */
  activeLifestyle: boolean
  /** Commute method (affects accident risk) */
  commuteMethod: 'public_transport' | 'car' | 'motorcycle' | 'cycling' | 'walking'
  /** Existing employer PA coverage */
  existingPaCoverage: number
}

/**
 * Self-insurance consideration
 * High net worth individuals may not need full coverage
 */
export interface SelfInsuranceAnswers {
  /** Total liquid net worth (savings, investments, accessible assets) */
  liquidNetWorth: number
  /** Willing to use assets to cover insurance gaps? */
  willingToSelfInsure: boolean
  /** Threshold below which they want insurance coverage */
  selfInsuranceThreshold: number
}

/**
 * Complete questionnaire answers
 */
export interface CoverageQuestionnaireAnswers {
  hospitalization: HospitalizationAnswers
  lifeTpd: LifeTpdAnswers
  criticalIllness: CriticalIllnessAnswers
  personalAccident: PersonalAccidentAnswers
  selfInsurance: SelfInsuranceAnswers
}

/**
 * Default derived financials (zeros)
 */
export function createDefaultDerivedFinancials(): DerivedFinancials {
  return {
    mortgageBalance: 0,
    otherDebts: 0,
    existingAssets: 0,
    spouseHasIncome: false,
    spouseIncome: 0,
  }
}

/**
 * Default questionnaire answers
 */
export function createDefaultQuestionnaireAnswers(): CoverageQuestionnaireAnswers {
  return {
    hospitalization: {
      hospitalPreference: null,
    },
    lifeTpd: {
      dependentPersonIds: [],
      dependentCount: 0,
      youngestDependentAge: null,
      yearsUntilIndependent: 0,
      futureObligations: 0,
      spousePersonId: null,
      useManualFinancials: false,
      manualMortgageBalance: 0,
      manualOtherDebts: 0,
      manualExistingAssets: 0,
    },
    criticalIllness: {
      emergencyFundMonths: 6,
      expectedRecoveryMonths: 12,
      hasFamilySupport: true,
      monthlyExpenses: 0,
      existingCiCoverage: 0,
    },
    personalAccident: {
      occupationRisk: 'low',
      activeLifestyle: false,
      commuteMethod: 'public_transport',
      existingPaCoverage: 0,
    },
    selfInsurance: {
      liquidNetWorth: 0,
      willingToSelfInsure: false,
      selfInsuranceThreshold: 100000,
    },
  }
}

/**
 * Calculate recommended coverage from questionnaire answers + derived financial data
 */
export function calculateRecommendedCoverage(
  answers: CoverageQuestionnaireAnswers,
  annualIncome: number,
  derivedFinancials: DerivedFinancials = createDefaultDerivedFinancials()
): {
  hospitalization: { wardClass: WardClass; rider: boolean }
  lifeTpd: number
  criticalIllness: number
  personalAccident: number
  reasoning: {
    hospitalization: string
    lifeTpd: string
    criticalIllness: string
    personalAccident: string
  }
} {
  const { hospitalization, lifeTpd, criticalIllness, personalAccident, selfInsurance } = answers

  // Hospitalization: based on private vs public preference and ward class
  let wardClass: WardClass = 'B1'
  let rider = true
  let hospitalizationReason = ''

  if (hospitalization.hospitalPreference === 'private') {
    // Private hospitals only offer Class A equivalent coverage
    wardClass = 'A'
    rider = true
    hospitalizationReason = hospitalization.willingToPayPremium
      ? 'Private hospital preference with single room comfort.'
      : 'Private hospital preference. Note: Private ISPs cover Class A wards.'
  } else if (hospitalization.hospitalPreference === 'public') {
    // Public hospitals offer all ward classes (A, B1, B2+, C)
    if (hospitalization.willingToPayPremium) {
      // Wants premium comfort in public hospital
      wardClass = 'B1' // B1 is good balance for public hospital Class A/B1 preference
      rider = true
      hospitalizationReason = 'Public hospital Class A/B1 preference. ISP upgrade recommended.'
    } else if (hospitalization.comfortableWithWait) {
      // Comfortable with Class C
      wardClass = 'C'
      rider = false // MediShield Life covers Class C
      hospitalizationReason = 'Public hospital Class C preference. MediShield Life provides coverage.'
    } else {
      // Class B2+ preference
      wardClass = 'B2_plus'
      rider = true
      hospitalizationReason = 'Public hospital Class B2+ preference. ISP recommended for better coverage.'
    }
  } else {
    hospitalizationReason = 'Standard recommendation: B1 ward with rider for balanced coverage.'
  }

  // Life/TPD: formula-based
  // = (Annual income × years until independent) + debts + obligations - assets
  const incomeReplacement = lifeTpd.dependentCount > 0
    ? annualIncome * lifeTpd.yearsUntilIndependent
    : 0
  const lifeTpdRaw =
    incomeReplacement +
    derivedFinancials.mortgageBalance +
    derivedFinancials.otherDebts +
    lifeTpd.futureObligations -
    derivedFinancials.existingAssets

  // Apply self-insurance reduction
  let lifeTpdFinal = Math.max(0, lifeTpdRaw)
  if (selfInsurance.willingToSelfInsure && selfInsurance.liquidNetWorth > selfInsurance.selfInsuranceThreshold) {
    lifeTpdFinal = Math.max(0, lifeTpdFinal - (selfInsurance.liquidNetWorth - selfInsurance.selfInsuranceThreshold))
  }

  const lifeTpdReason = lifeTpd.dependentCount > 0
    ? `${lifeTpd.dependentCount} dependent(s), ${lifeTpd.yearsUntilIndependent} years of support needed. Includes debts and obligations.`
    : 'No dependents identified. Consider minimum coverage for final expenses only.'

  // Critical Illness: recovery income + ongoing costs
  const recoveryMonths = criticalIllness.expectedRecoveryMonths
  const monthlyNeed = criticalIllness.monthlyExpenses || annualIncome / 12
  const ciRaw =
    (monthlyNeed * recoveryMonths) -
    (criticalIllness.emergencyFundMonths * monthlyNeed) -
    criticalIllness.existingCiCoverage

  let ciFinal = Math.max(0, ciRaw)
  if (selfInsurance.willingToSelfInsure) {
    ciFinal = Math.max(0, ciFinal - selfInsurance.liquidNetWorth * 0.3) // Use up to 30% of assets for CI
  }

  const ciReason = `${recoveryMonths} months recovery period. ${criticalIllness.emergencyFundMonths} months covered by emergency fund.`

  // Personal Accident: risk-based
  const basePA = annualIncome * 2 // 2x income as base
  const riskMultiplier = personalAccident.occupationRisk === 'high' ? 1.5
    : personalAccident.occupationRisk === 'medium' ? 1.25 : 1
  const lifestyleMultiplier = personalAccident.activeLifestyle ? 1.25 : 1
  const commuteMultiplier = personalAccident.commuteMethod === 'motorcycle' ? 1.5
    : personalAccident.commuteMethod === 'cycling' ? 1.25 : 1

  const paRaw = basePA * riskMultiplier * lifestyleMultiplier * commuteMultiplier - personalAccident.existingPaCoverage
  const paFinal = Math.max(0, paRaw)

  const paReason = `${personalAccident.occupationRisk} risk occupation, ${personalAccident.activeLifestyle ? 'active' : 'moderate'} lifestyle.`

  return {
    hospitalization: { wardClass, rider },
    lifeTpd: Math.round(lifeTpdFinal),
    criticalIllness: Math.round(ciFinal),
    personalAccident: Math.round(paFinal),
    reasoning: {
      hospitalization: hospitalizationReason,
      lifeTpd: lifeTpdReason,
      criticalIllness: ciReason,
      personalAccident: paReason,
    },
  }
}

// ============================================
// TYPES
// ============================================

export type ReferenceMode = 'income' | 'expenses'

export interface CoverageGuidelinesState {
  // Guidelines data
  guidelines: UserCoverageGuidelines
  hasConfiguredGuidelines: boolean
  selectedPersonId: string | null

  // Questionnaire answers
  questionnaireAnswers: CoverageQuestionnaireAnswers

  // UI state
  isEditing: boolean
  referenceMode: ReferenceMode

  // Actions
  setSelectedPersonId: (personId: string | null) => void
  setReferenceMode: (mode: ReferenceMode) => void
  setAnnualIncome: (income: number) => void
  setMaxPremiumPercentage: (percentage: number) => void
  applyPreset: (preset: Exclude<GuidelinesPreset, 'custom'>) => void
  setMultiplier: (coverageType: GuidelineCoverageType, multiplier: number) => void
  toggleCoverage: (coverageType: GuidelineCoverageType) => void
  setHospitalizationPreferences: (prefs: {
    preferredWardClass?: WardClass
    recommendsRider?: boolean
  }) => void
  setNotes: (coverageType: GuidelineCoverageType, notes: string) => void
  resetToDefaults: () => void
  setIsEditing: (isEditing: boolean) => void
  markAsConfigured: () => void
  unmarkAsConfigured: () => void

  // Questionnaire actions
  setHospitalizationAnswers: (answers: Partial<HospitalizationAnswers>) => void
  setLifeTpdAnswers: (answers: Partial<LifeTpdAnswers>) => void
  setCriticalIllnessAnswers: (answers: Partial<CriticalIllnessAnswers>) => void
  setPersonalAccidentAnswers: (answers: Partial<PersonalAccidentAnswers>) => void
  setSelfInsuranceAnswers: (answers: Partial<SelfInsuranceAnswers>) => void
  applyQuestionnaireRecommendations: (derivedFinancials?: DerivedFinancials) => void
}

// ============================================
// STORE
// ============================================

const initialState = {
  guidelines: createDefaultGuidelines(),
  hasConfiguredGuidelines: false,
  selectedPersonId: null as string | null,
  questionnaireAnswers: createDefaultQuestionnaireAnswers(),
  isEditing: false,
  referenceMode: 'income' as ReferenceMode,
}

export const useCoverageGuidelinesStore = create<CoverageGuidelinesState>()(
  devtools(
    persist(
      (set) => ({
        ...initialState,

        // Person selection
        setSelectedPersonId: (personId) => set({ selectedPersonId: personId }),

        // Reference mode toggle
        setReferenceMode: (mode) => set({ referenceMode: mode }),

        // Income and budget
        setAnnualIncome: (income) =>
          set((state) => ({
            guidelines: {
              ...state.guidelines,
              annualIncome: income,
              preset: 'custom',
              updatedAt: new Date().toISOString(),
            },
          })),

        setMaxPremiumPercentage: (percentage) =>
          set((state) => ({
            guidelines: {
              ...state.guidelines,
              maxPremiumPercentage: Math.max(0, Math.min(0.25, percentage)),
              preset: 'custom',
              updatedAt: new Date().toISOString(),
            },
          })),

        // Preset application
        applyPreset: (preset) =>
          set((state) => {
            const presetConfig = guidelinesPresets[preset]
            return {
              guidelines: {
                ...state.guidelines,
                preset,
                maxPremiumPercentage: presetConfig.maxPremiumPercentage,
                coverages: {
                  ...state.guidelines.coverages,
                  life_tpd: {
                    ...state.guidelines.coverages.life_tpd,
                    incomeMultiplier: presetConfig.life_tpd,
                  },
                  critical_illness: {
                    ...state.guidelines.coverages.critical_illness,
                    incomeMultiplier: presetConfig.critical_illness,
                  },
                  personal_accident: {
                    ...state.guidelines.coverages.personal_accident,
                    incomeMultiplier: presetConfig.personal_accident,
                  },
                },
                updatedAt: new Date().toISOString(),
              },
            }
          }),

        // Individual multiplier adjustment
        setMultiplier: (coverageType, multiplier) =>
          set((state) => {
            if (coverageType === 'hospitalization') return state

            return {
              guidelines: {
                ...state.guidelines,
                preset: 'custom',
                coverages: {
                  ...state.guidelines.coverages,
                  [coverageType]: {
                    ...state.guidelines.coverages[coverageType],
                    incomeMultiplier: Math.max(0, Math.min(20, multiplier)),
                  },
                },
                updatedAt: new Date().toISOString(),
              },
            }
          }),

        // Toggle coverage enabled/disabled
        toggleCoverage: (coverageType) =>
          set((state) => ({
            guidelines: {
              ...state.guidelines,
              preset: 'custom',
              coverages: {
                ...state.guidelines.coverages,
                [coverageType]: {
                  ...state.guidelines.coverages[coverageType],
                  isEnabled: !state.guidelines.coverages[coverageType].isEnabled,
                },
              },
              updatedAt: new Date().toISOString(),
            },
          })),

        // Hospitalization-specific settings
        setHospitalizationPreferences: (prefs) =>
          set((state) => ({
            guidelines: {
              ...state.guidelines,
              preset: 'custom',
              coverages: {
                ...state.guidelines.coverages,
                hospitalization: {
                  ...state.guidelines.coverages.hospitalization,
                  ...(prefs.preferredWardClass !== undefined && {
                    preferredWardClass: prefs.preferredWardClass,
                  }),
                  ...(prefs.recommendsRider !== undefined && {
                    recommendsRider: prefs.recommendsRider,
                  }),
                },
              },
              updatedAt: new Date().toISOString(),
            },
          })),

        // Notes
        setNotes: (coverageType, notes) =>
          set((state) => ({
            guidelines: {
              ...state.guidelines,
              coverages: {
                ...state.guidelines.coverages,
                [coverageType]: {
                  ...state.guidelines.coverages[coverageType],
                  notes,
                },
              },
              updatedAt: new Date().toISOString(),
            },
          })),

        // Reset
        resetToDefaults: () =>
          set({
            guidelines: createDefaultGuidelines(),
            hasConfiguredGuidelines: false,
            selectedPersonId: null,
            questionnaireAnswers: createDefaultQuestionnaireAnswers(),
          }),

        // UI state
        setIsEditing: (isEditing) => set({ isEditing }),

        markAsConfigured: () => set({ hasConfiguredGuidelines: true }),

        // Return to wizard without clearing questionnaire answers
        unmarkAsConfigured: () => set({ hasConfiguredGuidelines: false }),

        // Questionnaire actions
        setHospitalizationAnswers: (answers) =>
          set((state) => ({
            questionnaireAnswers: {
              ...state.questionnaireAnswers,
              hospitalization: { ...state.questionnaireAnswers.hospitalization, ...answers },
            },
          })),

        setLifeTpdAnswers: (answers) =>
          set((state) => ({
            questionnaireAnswers: {
              ...state.questionnaireAnswers,
              lifeTpd: { ...state.questionnaireAnswers.lifeTpd, ...answers },
            },
          })),

        setCriticalIllnessAnswers: (answers) =>
          set((state) => ({
            questionnaireAnswers: {
              ...state.questionnaireAnswers,
              criticalIllness: { ...state.questionnaireAnswers.criticalIllness, ...answers },
            },
          })),

        setPersonalAccidentAnswers: (answers) =>
          set((state) => ({
            questionnaireAnswers: {
              ...state.questionnaireAnswers,
              personalAccident: { ...state.questionnaireAnswers.personalAccident, ...answers },
            },
          })),

        setSelfInsuranceAnswers: (answers) =>
          set((state) => ({
            questionnaireAnswers: {
              ...state.questionnaireAnswers,
              selfInsurance: { ...state.questionnaireAnswers.selfInsurance, ...answers },
            },
          })),

        applyQuestionnaireRecommendations: (derivedFinancials) =>
          set((state) => {
            const recommendations = calculateRecommendedCoverage(
              state.questionnaireAnswers,
              state.guidelines.annualIncome,
              derivedFinancials
            )

            // Convert recommended coverage to income multipliers for the guidelines
            const annualIncome = state.guidelines.annualIncome || 60000
            const lifeTpdMultiplier = Math.max(1, Math.round(recommendations.lifeTpd / annualIncome))
            const ciMultiplier = Math.max(1, Math.round(recommendations.criticalIllness / annualIncome))
            const paMultiplier = Math.max(1, Math.round(recommendations.personalAccident / annualIncome))

            return {
              guidelines: {
                ...state.guidelines,
                preset: 'custom',
                coverages: {
                  ...state.guidelines.coverages,
                  hospitalization: {
                    ...state.guidelines.coverages.hospitalization,
                    preferredWardClass: recommendations.hospitalization.wardClass,
                    recommendsRider: recommendations.hospitalization.rider,
                  },
                  life_tpd: {
                    ...state.guidelines.coverages.life_tpd,
                    incomeMultiplier: lifeTpdMultiplier,
                  },
                  critical_illness: {
                    ...state.guidelines.coverages.critical_illness,
                    incomeMultiplier: ciMultiplier,
                  },
                  personal_accident: {
                    ...state.guidelines.coverages.personal_accident,
                    incomeMultiplier: paMultiplier,
                  },
                },
                updatedAt: new Date().toISOString(),
              },
            }
          }),
      }),
      {
        name: 'coverage-guidelines-storage',
        partialize: (state) => ({
          guidelines: state.guidelines,
          hasConfiguredGuidelines: state.hasConfiguredGuidelines,
          selectedPersonId: state.selectedPersonId,
          questionnaireAnswers: state.questionnaireAnswers,
          referenceMode: state.referenceMode,
        }),
      }
    ),
    { name: 'coverage-guidelines-store' }
  )
)

// ============================================
// SELECTORS
// ============================================

export const useGuidelines = () => useCoverageGuidelinesStore((s) => s.guidelines)
export const useHasConfiguredGuidelines = () =>
  useCoverageGuidelinesStore((s) => s.hasConfiguredGuidelines)
export const useSelectedPersonId = () =>
  useCoverageGuidelinesStore((s) => s.selectedPersonId)
export const useIsEditingGuidelines = () => useCoverageGuidelinesStore((s) => s.isEditing)
export const useReferenceMode = () => useCoverageGuidelinesStore((s) => s.referenceMode)

// Computed selector for target amounts
export const useGuidelineTargets = () => {
  const guidelines = useCoverageGuidelinesStore((s) => s.guidelines)
  return calculateGuidelineTargets(guidelines)
}

// Questionnaire answers selector
export const useQuestionnaireAnswers = () =>
  useCoverageGuidelinesStore((s) => s.questionnaireAnswers)

// Computed selector for recommendations based on questionnaire + derived financials
export const useQuestionnaireRecommendations = (derivedFinancials?: DerivedFinancials) => {
  const answers = useCoverageGuidelinesStore((s) => s.questionnaireAnswers)
  const income = useCoverageGuidelinesStore((s) => s.guidelines.annualIncome)
  return calculateRecommendedCoverage(answers, income, derivedFinancials)
}

// Actions selector - useShallow prevents infinite loops from new object references
export const useGuidelinesActions = () =>
  useCoverageGuidelinesStore(
    useShallow((s) => ({
      setSelectedPersonId: s.setSelectedPersonId,
      setReferenceMode: s.setReferenceMode,
      setAnnualIncome: s.setAnnualIncome,
      setMaxPremiumPercentage: s.setMaxPremiumPercentage,
      applyPreset: s.applyPreset,
      setMultiplier: s.setMultiplier,
      toggleCoverage: s.toggleCoverage,
      setHospitalizationPreferences: s.setHospitalizationPreferences,
      setNotes: s.setNotes,
      resetToDefaults: s.resetToDefaults,
      setIsEditing: s.setIsEditing,
      markAsConfigured: s.markAsConfigured,
      unmarkAsConfigured: s.unmarkAsConfigured,
      // Questionnaire actions
      setHospitalizationAnswers: s.setHospitalizationAnswers,
      setLifeTpdAnswers: s.setLifeTpdAnswers,
      setCriticalIllnessAnswers: s.setCriticalIllnessAnswers,
      setPersonalAccidentAnswers: s.setPersonalAccidentAnswers,
      setSelfInsuranceAnswers: s.setSelfInsuranceAnswers,
      applyQuestionnaireRecommendations: s.applyQuestionnaireRecommendations,
    }))
  )
