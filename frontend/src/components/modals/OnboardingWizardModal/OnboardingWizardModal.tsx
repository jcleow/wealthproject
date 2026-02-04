'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query'
import { X, AlertTriangle } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { cn } from '@/lib/utils'
import { useColorScheme } from '@/stores'
import { settingsApi } from '@/api/financial'
import { QUERY_KEYS } from '@/lib/queryKeys'
import type { UserSettings } from '@/types/financial'
import { OnboardingWizardView } from './OnboardingWizardView'

interface OnboardingWizardModalProps {
  isOpen: boolean
  onClose: () => void
}

export function OnboardingWizardModal({ isOpen, onClose }: OnboardingWizardModalProps) {
  const colorScheme = useColorScheme()
  const isMonet = colorScheme === 'monet'
  const queryClient = useQueryClient()
  const [showExitConfirm, setShowExitConfirm] = useState(false)
  const showExitConfirmRef = useRef(false)

  // Keep ref in sync so the keydown listener always sees current state
  useEffect(() => {
    showExitConfirmRef.current = showExitConfirm
  }, [showExitConfirm])

  // Intercept Escape at the document level before the Modal's handler
  // When confirmation is showing, Escape should dismiss it (not close the modal)
  useEffect(() => {
    if (!isOpen) return

    const handleEscapeIntercept = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showExitConfirmRef.current) {
        e.stopImmediatePropagation()
        setShowExitConfirm(false)
      }
    }

    // Use capture phase to fire before the Modal's listener
    document.addEventListener('keydown', handleEscapeIntercept, true)
    return () => document.removeEventListener('keydown', handleEscapeIntercept, true)
  }, [isOpen])

  // Get current settings for the mutation
  const { data: userSettings } = useQuery({
    queryKey: QUERY_KEYS.settings.user,
    queryFn: () => settingsApi.getUserSettings(),
    staleTime: 5 * 60 * 1000,
  })

  // Mark onboarding as completed
  const markCompletedMutation = useMutation({
    mutationFn: () => {
      if (!userSettings) throw new Error('Settings not loaded')
      return settingsApi.updateUserSettings({
        ...userSettings,
        onboardingCompleted: true,
      })
    },
    onMutate: () => {
      // Optimistically update the cache so Dashboard's auto-trigger useEffect
      // immediately sees onboardingCompleted: true, preventing re-trigger on refresh
      const currentSettings = queryClient.getQueryData<UserSettings>(QUERY_KEYS.settings.user)
      if (currentSettings) {
        queryClient.setQueryData<UserSettings>(QUERY_KEYS.settings.user, {
          ...currentSettings,
          onboardingCompleted: true,
        })
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.settings.user })
      // Also invalidate all financial data to pick up newly created items
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.financial.all })
    },
  })

  // Intercept close attempts (Escape, X button, overlay click) — show confirmation
  const handleCloseAttempt = useCallback(() => {
    setShowExitConfirm(true)
  }, [])

  // Confirm exit — actually close and mark completed
  const handleConfirmExit = useCallback(() => {
    setShowExitConfirm(false)
    markCompletedMutation.mutate()
    onClose()
  }, [markCompletedMutation, onClose])

  // Cancel exit — dismiss the confirmation and stay in wizard
  const handleCancelExit = useCallback(() => {
    setShowExitConfirm(false)
  }, [])

  // Handle skip/dismiss — explicit action, no confirmation needed
  const handleSkipSetup = useCallback(() => {
    markCompletedMutation.mutate()
    onClose()
  }, [markCompletedMutation, onClose])

  // Handle wizard completion (from summary step) — no confirmation needed
  const handleComplete = useCallback(() => {
    markCompletedMutation.mutate()
    onClose()
  }, [markCompletedMutation, onClose])

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleCloseAttempt}
      overlayClassName={isMonet ? 'bg-black/30 backdrop-blur-sm' : 'bg-black/60 backdrop-blur-sm'}
      className={cn(
        'w-full max-w-[900px] min-h-[80vh] max-h-[90vh] mx-4 sm:mx-6 rounded-2xl border overflow-hidden flex flex-col relative',
        isMonet
          ? 'border-[var(--monet-lavender)]/20 bg-white'
          : 'border-white/[0.08] bg-[#0a0a0a]'
      )}
    >
      {/* Header */}
      <div className={cn(
        'flex items-center justify-between px-4 sm:px-6 py-4 border-b flex-shrink-0',
        isMonet
          ? 'border-[var(--monet-lavender)]/10'
          : 'border-white/[0.06]'
      )}>
        <h2 className={cn(
          'text-base font-semibold',
          isMonet ? 'text-[var(--monet-text-primary)]' : 'text-white'
        )}>
          Set Up Your Financial Plan
        </h2>
        <button
          type="button"
          onClick={handleCloseAttempt}
          className={cn(
            'p-1.5 rounded-lg transition-colors',
            isMonet
              ? 'text-[var(--monet-text-muted)] hover:text-[var(--monet-text-primary)] hover:bg-[var(--monet-lavender)]/10'
              : 'text-slate-500 hover:text-white hover:bg-white/[0.05]'
          )}
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
        <OnboardingWizardView
          onClose={handleComplete}
          onSkipSetup={handleSkipSetup}
          isMonet={isMonet}
        />
      </div>

      {/* Exit Confirmation Overlay */}
      {showExitConfirm && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/40 backdrop-blur-[2px] rounded-2xl">
          <div className={cn(
            'mx-6 w-full max-w-sm rounded-xl border p-5 shadow-xl',
            isMonet
              ? 'bg-white border-[var(--monet-lavender)]/20'
              : 'bg-[#141414] border-white/[0.08]'
          )}>
            <div className="flex items-start gap-3 mb-4">
              <div className={cn(
                'flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center',
                isMonet ? 'bg-amber-100' : 'bg-amber-500/15'
              )}>
                <AlertTriangle className={cn('w-4.5 h-4.5', isMonet ? 'text-amber-600' : 'text-amber-400')} />
              </div>
              <div>
                <h3 className={cn(
                  'text-sm font-semibold mb-1',
                  isMonet ? 'text-[var(--monet-text-primary)]' : 'text-white'
                )}>
                  Exit setup?
                </h3>
                <p className={cn(
                  'text-xs leading-relaxed',
                  isMonet ? 'text-[var(--monet-text-secondary)]' : 'text-slate-400'
                )}>
                  Your progress won&apos;t be saved. You can always set up your financial plan later from the dashboard.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={handleCancelExit}
                className={cn(
                  'px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors',
                  isMonet
                    ? 'text-[var(--monet-text-secondary)] hover:bg-[var(--monet-lavender)]/10'
                    : 'text-slate-400 hover:bg-white/[0.05]'
                )}
              >
                Continue Setup
              </button>
              <button
                type="button"
                onClick={handleConfirmExit}
                className={cn(
                  'px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors',
                  isMonet
                    ? 'bg-rose-500 text-white hover:bg-rose-600'
                    : 'bg-rose-500/15 text-rose-400 hover:bg-rose-500/25 border border-rose-500/25'
                )}
              >
                Exit Setup
              </button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  )
}
