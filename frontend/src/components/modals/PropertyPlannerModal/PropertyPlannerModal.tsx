"use client"

import { Modal } from '@/components/ui/Modal'
import { PropertyPlannerView } from './PropertyPlannerView'
import { Building2 } from 'lucide-react'

interface PropertyPlannerModalProps {
  isOpen: boolean
  onClose: () => void
}

export function PropertyPlannerModal({ isOpen, onClose }: PropertyPlannerModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      overlayClassName="bg-black/60 backdrop-blur-sm"
      className="w-full max-w-[1022px] min-h-[50vh] max-h-[90vh] mx-4 sm:mx-6 rounded-2xl border border-white/[0.08] bg-[#0a0a0a] overflow-hidden flex flex-col"
    >
      {/* Modal Header */}
      <div className="flex-shrink-0 px-4 sm:px-6 pt-4 sm:pt-6 pb-3 sm:pb-4 border-b border-white/[0.06]">
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-gradient-to-br from-violet-500/20 to-violet-600/5 border border-violet-500/20 flex items-center justify-center flex-shrink-0">
            <Building2 className="w-4 h-4 sm:w-5 sm:h-5 text-violet-400" />
          </div>
          <div className="min-w-0">
            <h2 className="text-base sm:text-lg font-semibold text-white tracking-tight">Property Scenarios</h2>
            <p className="text-xs sm:text-sm text-slate-500 truncate">Create and compare different property purchase scenarios</p>
          </div>
        </div>
      </div>

      {/* Modal Content */}
      <div className="flex-1 overflow-y-auto">
        <PropertyPlannerView onClose={onClose} />
      </div>
    </Modal>
  )
}
