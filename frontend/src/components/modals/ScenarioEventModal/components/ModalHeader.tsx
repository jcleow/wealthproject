"use client"

import * as LucideIcons from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

const CloseIcon = LucideIcons.X as LucideIcon | undefined
const SparklesIcon = LucideIcons.Sparkles as LucideIcon | undefined

interface HeaderTitleProps {
  isEditing: boolean
}

function HeaderTitle({ isEditing }: HeaderTitleProps) {
  return (
    <div>
      <p className="text-[10px] font-medium uppercase tracking-[0.25em] text-slate-500">
        Scenario
      </p>
      <h2 className="mt-1 text-xl font-semibold tracking-tight text-white">
        {isEditing ? 'Edit Scenario Event' : 'Create a new scenario'}
      </h2>
      <p className="mt-0.5 text-sm text-slate-500">
        Define event details and financial impacts.
      </p>
    </div>
  )
}

interface ToggleButtonProps {
  isIncluded: boolean
  onToggle: (value: boolean) => void
  disabled?: boolean
}

function ToggleButton({ isIncluded, onToggle, disabled }: ToggleButtonProps) {
  return (
    <button
      type="button"
      onClick={() => onToggle(!isIncluded)}
      disabled={disabled}
      className={`
        flex items-center gap-2 rounded-full border px-3 py-1.5
        text-xs font-medium transition-all disabled:opacity-50
        ${isIncluded
          ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
          : 'border-white/[0.08] bg-white/[0.03] text-slate-400'
        }
      `}
    >
      <span
        className={`
          flex h-4 w-8 items-center rounded-full p-[2px] transition-all
          ${isIncluded ? 'justify-end bg-emerald-500/60' : 'justify-start bg-white/10'}
        `}
      >
        <span className={`h-3 w-3 rounded-full ${isIncluded ? 'bg-white' : 'bg-slate-400'}`} />
      </span>
      {isIncluded ? 'Enabled' : 'Disabled'}
    </button>
  )
}

interface ExampleButtonProps {
  onClick: () => void
  disabled?: boolean
}

function ExampleButton({ onClick, disabled }: ExampleButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`
        inline-flex items-center gap-2 px-3 py-2
        rounded-lg border border-white/[0.08] hover:border-white/[0.15]
        bg-white/[0.03] hover:bg-white/[0.06]
        text-xs font-medium text-slate-400 hover:text-slate-200
        disabled:opacity-50 transition-all
      `}
    >
      {SparklesIcon && <SparklesIcon className="h-3.5 w-3.5 text-blue-400" />}
      Example
    </button>
  )
}

interface CloseButtonProps {
  onClick: () => void
}

function CloseButton({ onClick }: CloseButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Close"
      className={`
        flex h-9 w-9 items-center justify-center
        rounded-lg border border-white/[0.08] hover:border-white/[0.15]
        bg-white/[0.03] hover:bg-white/[0.06]
        text-slate-400 hover:text-white transition-all
      `}
    >
      {CloseIcon ? <CloseIcon className="h-4 w-4" /> : '×'}
    </button>
  )
}

interface ModalHeaderProps {
  isEditing: boolean
  onExample: () => void
  onClose: () => void
  disabled?: boolean
  isIncluded: boolean
  onToggleIncluded: (value: boolean) => void
}

export function ModalHeader({
  isEditing,
  onExample,
  onClose,
  disabled,
  isIncluded,
  onToggleIncluded,
}: ModalHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <HeaderTitle isEditing={isEditing} />
      <div className="flex items-center gap-2">
        <ToggleButton
          isIncluded={isIncluded}
          onToggle={onToggleIncluded}
          disabled={disabled}
        />
        <ExampleButton onClick={onExample} disabled={disabled} />
        <CloseButton onClick={onClose} />
      </div>
    </div>
  )
}
