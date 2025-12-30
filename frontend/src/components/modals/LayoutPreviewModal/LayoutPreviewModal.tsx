'use client'

import { X } from 'lucide-react'
import clsx from 'clsx'

import { Modal } from '@/components/ui/Modal'
import { LayoutPreviewItem } from './LayoutPreviewItem'
import { LAYOUT_OPTIONS, type DashboardLayout } from './layoutTypes'

interface LayoutPreviewModalProps {
  isOpen: boolean
  onClose: () => void
  currentLayout: DashboardLayout
  onLayoutChange: (layout: DashboardLayout) => void
}

export function LayoutPreviewModal({
  isOpen,
  onClose,
  currentLayout,
  onLayoutChange,
}: LayoutPreviewModalProps) {
  const handleLayoutSelect = (layout: DashboardLayout) => {
    onLayoutChange(layout)
    onClose()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      overlayClassName="bg-black/60 backdrop-blur-sm"
    >
      <div
        className={clsx(
          'w-[480px] max-w-[90vw]',
          'rounded-2xl',
          'border border-white/[0.08]',
          'bg-[#0c0c0c]',
          'shadow-2xl'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
          <h2 className="text-lg font-medium text-white">Choose Layout</h2>
          <button
            type="button"
            onClick={onClose}
            className={clsx(
              'p-1.5 rounded-lg',
              'text-slate-400 hover:text-white',
              'hover:bg-white/[0.06]',
              'transition-colors'
            )}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Layout options */}
        <div className="p-6">
          <div className="grid grid-cols-3 gap-4">
            {LAYOUT_OPTIONS.map((option) => (
              <LayoutPreviewItem
                key={option.id}
                option={option}
                isSelected={currentLayout === option.id}
                onSelect={handleLayoutSelect}
              />
            ))}
          </div>

          {/* Helper text */}
          <p className="mt-4 text-center text-xs text-slate-500">
            Side-by-side layouts require a minimum screen width of 1280px
          </p>
        </div>
      </div>
    </Modal>
  )
}
