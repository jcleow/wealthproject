"use client"

import { useState, useCallback } from 'react'
import { Modal } from '@/components/ui/Modal'
import { PropertyPlannerView, type FooterState, type HeaderState } from './PropertyPlannerView'
import { Save, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { PropertyPlannerModalHeader } from './components/PropertyPlannerModalHeader'

interface PropertyPlannerModalProps {
  isOpen: boolean
  onClose: () => void
  /** Optional scenario ID to directly open in edit mode */
  initialScenarioId?: string
  /** Callback to jump to a specific date on the timeline */
  onJumpToDate?: (year: number, month: number) => void
}

export function PropertyPlannerModal({ isOpen, onClose, initialScenarioId, onJumpToDate }: PropertyPlannerModalProps) {
  const [footerState, setFooterState] = useState<FooterState | null>(null)
  const [headerState, setHeaderState] = useState<HeaderState | null>(null)

  const handleFooterStateChange = useCallback((state: FooterState | null) => {
    setFooterState(state)
  }, [])

  const handleHeaderStateChange = useCallback((state: HeaderState | null) => {
    setHeaderState(state)
  }, [])

  // Handle close with unsaved changes confirmation
  const handleClose = useCallback(() => {
    if (footerState?.hasChanges) {
      const confirmed = window.confirm('You have unsaved changes. Are you sure you want to close? Changes will be lost.')
      if (!confirmed) return
    }
    onClose()
  }, [footerState?.hasChanges, onClose])

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      overlayClassName="bg-black/60 backdrop-blur-sm"
      className="w-full max-w-[1200px] min-h-[50vh] max-h-[90vh] mx-4 sm:mx-6 rounded-2xl border border-white/[0.08] bg-[#0a0a0a] overflow-hidden flex flex-col"
    >
      <PropertyPlannerModalHeader headerState={headerState} onClose={handleClose} />

      {/* Modal Content */}
      <div className="flex-1 overflow-y-auto">
        <PropertyPlannerView
          onClose={handleClose}
          initialScenarioId={initialScenarioId}
          onFooterStateChange={handleFooterStateChange}
          onHeaderStateChange={handleHeaderStateChange}
          onJumpToDate={onJumpToDate}
        />
      </div>

      {/* Modal Footer - only show when editing */}
      {footerState?.isEditing && (
        <div className="flex-shrink-0 px-4 sm:px-6 py-3 sm:py-4 border-t border-white/[0.06] bg-[#0a0a0a]">
          <div className="flex items-center justify-end">
            {footerState.isSaving ? (
              <div className="flex items-center gap-2 px-4 py-2 text-slate-400">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm font-medium">Saving...</span>
              </div>
            ) : (
              <button
                type="button"
                onClick={footerState.onSave}
                disabled={!footerState.hasChanges}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                  footerState.hasChanges
                    ? "bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 border border-emerald-500/25"
                    : "bg-white/[0.03] text-slate-500 border border-white/[0.06] cursor-not-allowed"
                )}
              >
                <Save className="w-4 h-4" />
                Save Changes
              </button>
            )}
          </div>
        </div>
      )}
    </Modal>
  )
}
