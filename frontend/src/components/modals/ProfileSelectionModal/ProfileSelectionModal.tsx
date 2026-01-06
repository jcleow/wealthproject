'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import clsx from 'clsx'
import { Modal } from '@/components/ui/Modal'
import { ProfileCard } from './ProfileCard'
import { FINANCIAL_PROFILES } from './profileConfigs'
import type { ProfileSelectionModalProps } from './types'

/**
 * Modal for selecting a Singapore financial profile template
 * Displays a grid of artistic gradient cards representing different life stages
 */
export function ProfileSelectionModal({
  isOpen,
  onClose,
  onSelectProfile,
  isLoading = false,
  loadingProfileId = null,
}: ProfileSelectionModalProps) {
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null)

  const handleSelectProfile = async (profileId: string) => {
    setSelectedProfileId(profileId)
    try {
      await onSelectProfile(profileId)
      // Modal will be closed by parent after successful load
    } catch (error) {
      // Reset selection on error so user can try again
      setSelectedProfileId(null)
      throw error
    }
  }

  const handleClose = () => {
    if (!isLoading) {
      setSelectedProfileId(null)
      onClose()
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      overlayClassName="bg-black/70 backdrop-blur-sm"
      className={clsx(
        // Glassmorphic container
        'w-full max-w-4xl mx-4',
        'rounded-3xl',
        'border border-white/[0.08]',
        'bg-slate-900/95 backdrop-blur-xl',
        'shadow-2xl shadow-black/50',
        'max-h-[90vh] overflow-hidden',
        'flex flex-col'
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between p-6 pb-4 border-b border-white/[0.06]">
        <div>
          <h2 className="text-2xl font-semibold text-white">
            Choose Your Financial Profile
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Select a template that matches your life stage in Singapore
          </p>
        </div>
        <button
          type="button"
          onClick={handleClose}
          disabled={isLoading}
          className={clsx(
            'p-2 rounded-lg',
            'text-slate-400 hover:text-white',
            'hover:bg-white/[0.05]',
            'transition-colors',
            isLoading && 'opacity-50 cursor-not-allowed'
          )}
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Profile Grid */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FINANCIAL_PROFILES.map((profile) => (
            <ProfileCard
              key={profile.id}
              profile={profile}
              onSelect={handleSelectProfile}
              isLoading={isLoading && (loadingProfileId === profile.id || selectedProfileId === profile.id)}
              isSelected={selectedProfileId === profile.id}
              disabled={isLoading && selectedProfileId !== profile.id}
            />
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-white/[0.06] bg-black/20">
        <p className="text-xs text-slate-500 text-center">
          Each profile includes realistic CPF balances, income, expenses, and life milestones typical for Singapore
        </p>
      </div>
    </Modal>
  )
}
