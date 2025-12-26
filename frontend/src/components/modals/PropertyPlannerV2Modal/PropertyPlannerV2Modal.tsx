"use client"

import { Modal } from '@/components/ui/Modal'
import { PropertyPlannerV2View } from '@/app/property-planner/page'

interface PropertyPlannerV2ModalProps {
  isOpen: boolean
  onClose: () => void
}

export function PropertyPlannerV2Modal({ isOpen, onClose }: PropertyPlannerV2ModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      overlayClassName="bg-black/60 backdrop-blur-sm"
      className="w-[1022px] min-h-[1104px] max-h-[90vh] rounded-2xl border border-white/[0.08] bg-[#0a0a0a] overflow-hidden"
    >
      <div className="h-full overflow-y-auto">
        <PropertyPlannerV2View onClose={onClose} />
      </div>
    </Modal>
  )
}
