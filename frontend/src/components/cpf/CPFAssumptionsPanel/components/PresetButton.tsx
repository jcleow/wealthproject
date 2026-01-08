'use client'

import type { AssumptionPreset } from '@/types/cpf'

interface PresetButtonProps {
  preset: AssumptionPreset
  label: string
  description: string
  isSelected: boolean
  onClick: () => void
}

const presetColors: Record<AssumptionPreset, string> = {
  official: 'border-emerald-500/50 bg-emerald-500/20 text-emerald-400',
  conservative: 'border-amber-500/50 bg-amber-500/20 text-amber-400',
  optimistic: 'border-blue-500/50 bg-blue-500/20 text-blue-400',
  custom: 'border-purple-500/50 bg-purple-500/20 text-purple-400',
}

export function PresetButton({
  preset,
  label,
  description,
  isSelected,
  onClick,
}: PresetButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 rounded-lg border p-2 text-left transition ${
        isSelected
          ? presetColors[preset]
          : 'border-white/[0.06] bg-white/[0.02] text-slate-400 hover:border-white/20 hover:text-white'
      }`}
    >
      <div className="text-xs font-medium">{label}</div>
      <div className="text-[10px] opacity-70">{description}</div>
    </button>
  )
}
