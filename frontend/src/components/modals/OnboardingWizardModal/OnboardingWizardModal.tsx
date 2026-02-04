'use client'

import { useCallback } from 'react'
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query'
import { X } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { cn } from '@/lib/utils'
import { useColorScheme } from '@/stores'
import { settingsApi } from '@/api/financial'
import { QUERY_KEYS } from '@/lib/queryKeys'
import { OnboardingWizardView } from './OnboardingWizardView'

interface OnboardingWizardModalProps {
  isOpen: boolean
  onClose: () => void
}

export function OnboardingWizardModal({ isOpen, onClose }: OnboardingWizardModalProps) {
  const colorScheme = useColorScheme()
  const isMonet = colorScheme === 'monet'
  const queryClient = useQueryClient()

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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.settings.user })
      // Also invalidate all financial data to pick up newly created items
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.financial.all })
    },
  })

  // Handle skip/dismiss — permanent close
  const handleSkipSetup = useCallback(() => {
    markCompletedMutation.mutate()
    onClose()
  }, [markCompletedMutation, onClose])

  // Handle close (X button) — same as skip
  const handleClose = useCallback(() => {
    markCompletedMutation.mutate()
    onClose()
  }, [markCompletedMutation, onClose])

  // Handle wizard completion (from summary step)
  const handleComplete = useCallback(() => {
    markCompletedMutation.mutate()
    onClose()
  }, [markCompletedMutation, onClose])

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      overlayClassName={isMonet ? 'bg-black/30 backdrop-blur-sm' : 'bg-black/60 backdrop-blur-sm'}
      className={cn(
        'w-full max-w-[900px] min-h-[50vh] max-h-[90vh] mx-4 sm:mx-6 rounded-2xl border overflow-hidden flex flex-col',
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
          onClick={handleClose}
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
    </Modal>
  )
}
