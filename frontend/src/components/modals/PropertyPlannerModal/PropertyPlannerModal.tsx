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
      className="w-[1022px] min-h-[1104px] max-h-[90vh] rounded-2xl border border-white/[0.08] bg-[#0a0a0a] overflow-hidden flex flex-col"
    >
      {/* Modal Header */}
      <div className="flex-shrink-0 px-6 pt-6 pb-4 border-b border-white/[0.06]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500/20 to-violet-600/5 border border-violet-500/20 flex items-center justify-center">
            <Building2 className="w-5 h-5 text-violet-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white tracking-tight">Property Scenarios</h2>
            <p className="text-sm text-slate-500">Create and compare different property purchase scenarios</p>
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
