'use client'

import { X } from 'lucide-react'
import clsx from 'clsx'

import { Modal } from '@/components/ui/Modal'
import { LayoutPreviewItem } from './LayoutPreviewItem'
import { LAYOUT_OPTIONS, type DashboardLayout } from './layoutTypes'
import { useColorScheme } from '@/stores'

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
  const colorScheme = useColorScheme()
  const isMonet = colorScheme === 'monet'

  const handleLayoutSelect = (layout: DashboardLayout) => {
    onLayoutChange(layout)
    onClose()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      overlayClassName={isMonet ? 'bg-black/30 backdrop-blur-sm' : 'bg-black/60 backdrop-blur-sm'}
    >
      <div
        className={clsx(
          'w-[480px] max-w-[90vw]',
          'rounded-2xl',
          'shadow-2xl',
          isMonet
            ? 'border border-[var(--monet-lavender)]/20 bg-white'
            : 'border border-white/[0.08] bg-[#0c0c0c]'
        )}
      >
        {/* Header */}
        <div className={clsx(
          'flex items-center justify-between px-6 py-4 border-b',
          isMonet ? 'border-[var(--monet-lavender)]/10' : 'border-white/[0.06]'
        )}>
          <h2 className={clsx(
            'text-lg font-medium',
            isMonet ? 'text-[var(--monet-text-primary)]' : 'text-white'
          )}>Choose Layout</h2>
          <button
            type="button"
            onClick={onClose}
            className={clsx(
              'p-1.5 rounded-lg transition-colors',
              isMonet
                ? 'text-[var(--monet-text-muted)] hover:text-[var(--monet-text-primary)] hover:bg-[var(--monet-lavender)]/10'
                : 'text-slate-400 hover:text-white hover:bg-white/[0.06]'
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
                isMonet={isMonet}
              />
            ))}
          </div>

          {/* Helper text */}
          <p className={clsx(
            'mt-4 text-center text-xs',
            isMonet ? 'text-[var(--monet-text-muted)]' : 'text-slate-500'
          )}>
            Side-by-side layouts require a minimum screen width of 1280px
          </p>
        </div>
      </div>
    </Modal>
  )
}
