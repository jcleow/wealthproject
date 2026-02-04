'use client'

import { useState, useCallback } from 'react'
import { FormProvider } from 'react-hook-form'
import { AnimatePresence, motion } from 'framer-motion'
import { useOnboardingForm } from './hooks/useOnboardingForm'
import { useOnboardingSubmit } from './hooks/useOnboardingSubmit'
import { StepIndicator } from './components/StepIndicator'
import { PersonalInfoStep } from './components/PersonalInfoStep'
import { IncomeExpensesStep } from './components/IncomeExpensesStep'
import { AssetsLiabilitiesStep } from './components/AssetsLiabilitiesStep'
import { CpfAccountsStep } from './components/CpfAccountsStep'
import { SummaryStep } from './components/SummaryStep'
import type { StepStatus } from './types'

interface OnboardingWizardViewProps {
  onClose: () => void
  onSkipSetup: () => void
  isMonet: boolean
}

const STEP_ANIMATION = {
  initial: { opacity: 0, x: 40 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -40 },
  transition: { duration: 0.25, ease: 'easeInOut' as const },
}

const STEP_ANIMATION_BACK = {
  initial: { opacity: 0, x: -40 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 40 },
  transition: { duration: 0.25, ease: 'easeInOut' as const },
}

export function OnboardingWizardView({ onClose, onSkipSetup, isMonet }: OnboardingWizardViewProps) {
  const { form } = useOnboardingForm()
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [stepStatuses, setStepStatuses] = useState<StepStatus[]>(['active', 'pending', 'pending', 'pending'])
  const [animationDirection, setAnimationDirection] = useState<'forward' | 'back'>('forward')
  const [showSummary, setShowSummary] = useState(false)

  const { submitStep, isSubmitting, submissionError } = useOnboardingSubmit(form)

  // ─── Navigation ─────────────────────────────────────────────────────────────

  const goToStep = useCallback((targetIndex: number) => {
    setAnimationDirection(targetIndex > currentStepIndex ? 'forward' : 'back')
    setCurrentStepIndex(targetIndex)
    setStepStatuses(prev => {
      const next = [...prev]
      next[targetIndex] = 'active'
      return next
    })
  }, [currentStepIndex])

  const handleNext = useCallback(async () => {
    // Validate and submit current step
    const success = await submitStep(currentStepIndex)
    if (!success) return

    // Mark current step completed
    setStepStatuses(prev => {
      const next = [...prev]
      next[currentStepIndex] = 'completed'
      return next
    })

    if (currentStepIndex < 3) {
      // Advance to next step
      setAnimationDirection('forward')
      const nextIndex = currentStepIndex + 1
      setCurrentStepIndex(nextIndex)
      setStepStatuses(prev => {
        const next = [...prev]
        next[nextIndex] = 'active'
        return next
      })
    } else {
      // Last step → show summary
      setShowSummary(true)
    }
  }, [currentStepIndex, submitStep])

  const handleBack = useCallback(() => {
    if (currentStepIndex > 0) {
      setAnimationDirection('back')
      setCurrentStepIndex(currentStepIndex - 1)
    }
  }, [currentStepIndex])


  const handleStepClick = useCallback((stepIndex: number) => {
    goToStep(stepIndex)
  }, [goToStep])

  // ─── Render ─────────────────────────────────────────────────────────────────

  const animation = animationDirection === 'forward' ? STEP_ANIMATION : STEP_ANIMATION_BACK

  const stepComponents = [
    <PersonalInfoStep key="personal" isMonet={isMonet} />,
    <IncomeExpensesStep key="income" isMonet={isMonet} />,
    <AssetsLiabilitiesStep key="assets" isMonet={isMonet} />,
    <CpfAccountsStep key="cpf" isMonet={isMonet} />,
  ]

  const handleBackFromSummary = useCallback(() => {
    setShowSummary(false)
    // Go back to the last step (CPF Accounts)
    setAnimationDirection('back')
    setCurrentStepIndex(3)
    setStepStatuses(prev => {
      const next = [...prev]
      next[3] = 'active'
      return next
    })
  }, [])

  const handleStepClickFromSummary = useCallback((stepIndex: number) => {
    setShowSummary(false)
    setAnimationDirection('back')
    setCurrentStepIndex(stepIndex)
    setStepStatuses(prev => {
      const next = [...prev]
      next[stepIndex] = 'active'
      return next
    })
  }, [])

  if (showSummary) {
    return (
      <FormProvider {...form}>
        <div className="flex flex-col h-full">
          {/* Step Indicator — still visible so users can click back */}
          <StepIndicator
            currentStepIndex={-1}
            stepStatuses={stepStatuses}
            onStepClick={handleStepClickFromSummary}
            isMonet={isMonet}
          />
          <div className={isMonet ? 'border-t border-[var(--monet-lavender)]/10' : 'border-t border-white/[0.06]'} />

          <div className="flex-1 overflow-y-auto">
            <SummaryStep
              stepStatuses={stepStatuses}
              onClose={onClose}
              onBack={handleBackFromSummary}
              isMonet={isMonet}
            />
          </div>
        </div>
      </FormProvider>
    )
  }

  return (
    <FormProvider {...form}>
      <div className="flex flex-col h-full">
        {/* Step Indicator */}
        <StepIndicator
          currentStepIndex={currentStepIndex}
          stepStatuses={stepStatuses}
          onStepClick={handleStepClick}
          isMonet={isMonet}
        />

        {/* Divider */}
        <div className={isMonet ? 'border-t border-[var(--monet-lavender)]/10' : 'border-t border-white/[0.06]'} />

        {/* Step Content */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-5">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStepIndex}
              initial={animation.initial}
              animate={animation.animate}
              exit={animation.exit}
              transition={animation.transition}
            >
              {stepComponents[currentStepIndex]}
            </motion.div>
          </AnimatePresence>

          {/* Error message */}
          {submissionError && (
            <div className="mt-4 px-4 py-3 rounded-xl border border-rose-500/20 bg-rose-500/5">
              <p className="text-sm text-rose-400">{submissionError}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={`flex-shrink-0 px-4 sm:px-6 py-3 border-t ${
          isMonet ? 'border-[var(--monet-lavender)]/10' : 'border-white/[0.06]'
        }`}>
          <div className="flex items-center justify-between">
            {/* Left side: Skip Setup */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onSkipSetup}
                className={`text-xs font-medium transition-colors ${
                  isMonet
                    ? 'text-[var(--monet-text-muted)] hover:text-[var(--monet-text-secondary)]'
                    : 'text-slate-600 hover:text-slate-400'
                }`}
              >
                Skip Setup
              </button>
            </div>

            {/* Right side: Back + Next */}
            <div className="flex items-center gap-2">
              {currentStepIndex > 0 && (
                <button
                  type="button"
                  onClick={handleBack}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    isMonet
                      ? 'text-[var(--monet-text-secondary)] hover:bg-[var(--monet-lavender)]/10'
                      : 'text-slate-400 hover:bg-white/[0.05]'
                  }`}
                >
                  &larr; Back
                </button>
              )}
              <button
                type="button"
                onClick={handleNext}
                disabled={isSubmitting}
                className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  isMonet
                    ? 'bg-[var(--monet-sage)] text-white hover:bg-[var(--monet-sage)]/90'
                    : 'bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 border border-emerald-500/25'
                } disabled:opacity-50`}
              >
                {isSubmitting ? 'Saving...' : currentStepIndex === 3 ? 'Finish \u2192' : 'Next \u2192'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </FormProvider>
  )
}
