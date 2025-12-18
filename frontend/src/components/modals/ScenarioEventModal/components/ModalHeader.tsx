"use client"

import * as LucideIcons from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

const CloseIcon = LucideIcons.X as LucideIcon | undefined
const SparklesIcon = LucideIcons.Sparkles as LucideIcon | undefined

interface ModalHeaderProps {
  isEditing: boolean
  onExample: () => void
  onClose: () => void
  disabled?: boolean
}

export function ModalHeader({ isEditing, onExample, onClose, disabled }: ModalHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <p className={`text-[10px] tracking-[0.25em] text-slate-500 font-medium
uppercase`}>Scenario</p>
        <h2 className="text-xl font-semibold tracking-tight text-white mt-1">
          {isEditing ? 'Edit Scenario Event' : 'Create a new scenario'}
        </h2>
        <p className="text-sm text-slate-500 mt-0.5">Define event details and financial impacts.</p>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          className={`inline-flex items-center
gap-2 px-3 py-2
rounded-lg border border-white/[0.08] hover:border-white/[0.15]
bg-white/[0.03] hover:bg-white/[0.06]
text-xs font-medium text-slate-400 hover:text-slate-200
disabled:opacity-50
transition-all`}
          onClick={onExample}
          disabled={disabled}
        >
          {SparklesIcon && <SparklesIcon className="h-3.5 w-3.5 text-blue-400" />}
          Example
        </button>
        <button
          type="button"
          className={`flex items-center justify-center
h-9 w-9
rounded-lg border border-white/[0.08] hover:border-white/[0.15]
bg-white/[0.03] hover:bg-white/[0.06]
text-slate-400 hover:text-white
transition-all`}
          onClick={onClose}
          aria-label="Close"
        >
          {CloseIcon ? <CloseIcon className="h-4 w-4" /> : '×'}
        </button>
      </div>
    </div>
  )
}
