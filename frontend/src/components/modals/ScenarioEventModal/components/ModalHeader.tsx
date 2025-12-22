"use client"

import * as LucideIcons from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

const CloseIcon = LucideIcons.X as LucideIcon | undefined
const ZapIcon = LucideIcons.Zap as LucideIcon | undefined

interface HeaderTitleProps {
  isEditing: boolean
}

function HeaderTitle({ isEditing }: HeaderTitleProps) {
  return (
    <div className="flex items-center gap-4">
      {/* Decorative icon */}
      <div className="relative">
        <div className="
          flex items-center justify-center
          h-12 w-12
          rounded-2xl
          bg-gradient-to-br from-blue-500/20 to-purple-500/20
          border border-white/[0.08]
        ">
          {ZapIcon && <ZapIcon className="h-5 w-5 text-blue-400" />}
        </div>
        {/* Subtle glow */}
        <div className="absolute inset-0 rounded-2xl bg-blue-500/10 blur-xl -z-10" />
      </div>

      <div>
        <h2 className="text-lg font-semibold tracking-tight text-white">
          {isEditing ? 'Edit Scenario' : 'New Scenario'}
        </h2>
        <p className="text-sm text-slate-500">
          Model a financial event and its impacts
        </p>
      </div>
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
        group relative flex items-center gap-2.5
        rounded-full border px-3 py-2
        text-xs font-medium
        transition-all duration-300 ease-out
        disabled:opacity-50 disabled:cursor-not-allowed
        ${isIncluded
          ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/15'
          : 'border-white/[0.08] bg-white/[0.02] text-slate-500 hover:border-white/[0.15] hover:text-slate-400'
        }
      `}
    >
      {/* Toggle track */}
      <span
        className={`
          relative flex h-5 w-9 items-center rounded-full p-[3px]
          transition-all duration-300 ease-out
          ${isIncluded
            ? 'bg-emerald-500/50'
            : 'bg-white/[0.08]'
          }
        `}
      >
        {/* Toggle knob */}
        <span
          className={`
            h-3.5 w-3.5 rounded-full shadow-sm
            transition-all duration-300 ease-out
            ${isIncluded
              ? 'translate-x-[14px] bg-emerald-400'
              : 'translate-x-0 bg-slate-500'
            }
          `}
        />
      </span>
      <span className="min-w-[52px]">
        {isIncluded ? 'Active' : 'Inactive'}
      </span>
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
        rounded-xl
        border border-white/[0.06] hover:border-white/[0.15]
        bg-white/[0.02] hover:bg-white/[0.05]
        text-slate-500 hover:text-white
        transition-all duration-200
      `}
    >
      {CloseIcon ? <CloseIcon className="h-4 w-4" /> : '×'}
    </button>
  )
}

interface ModalHeaderProps {
  isEditing: boolean
  onClose: () => void
  disabled?: boolean
  isIncluded: boolean
  onToggleIncluded: (value: boolean) => void
}

export function ModalHeader({
  isEditing,
  onClose,
  disabled,
  isIncluded,
  onToggleIncluded,
}: ModalHeaderProps) {
  return (
    <div className="flex items-start justify-between pb-6 border-b border-white/[0.06]">
      <HeaderTitle isEditing={isEditing} />
      <div className="flex items-center gap-2">
        <ToggleButton
          isIncluded={isIncluded}
          onToggle={onToggleIncluded}
          disabled={disabled}
        />
        <CloseButton onClick={onClose} />
      </div>
    </div>
  )
}
