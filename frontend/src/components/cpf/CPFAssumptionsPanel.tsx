'use client'

import { useState, useEffect } from 'react'
import { Settings, ChevronDown, ChevronUp, Loader2, Check, RotateCcw } from 'lucide-react'
import { useCPFAssumptions } from '@/hooks/queries/useCPFAssumptionsQuery'
import type { CPFAssumptions, CPFAssumptionsUpdatePayload, AssumptionPreset, CPFLifePlan } from '@/types/cpf'

interface CPFAssumptionsPanelProps {
  className?: string
}

const PRESETS: { value: AssumptionPreset; label: string; description: string }[] = [
  { value: 'official', label: 'Official', description: 'CPF Board published rates' },
  { value: 'conservative', label: 'Conservative', description: 'Lower growth expectations' },
  { value: 'optimistic', label: 'Optimistic', description: 'Higher growth projections' },
  { value: 'custom', label: 'Custom', description: 'Your own assumptions' },
]

const CPF_LIFE_PLANS: { value: CPFLifePlan; label: string }[] = [
  { value: 'standard', label: 'Standard' },
  { value: 'basic', label: 'Basic' },
  { value: 'escalating', label: 'Escalating' },
]

export function CPFAssumptionsPanel({ className }: CPFAssumptionsPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [localAssumptions, setLocalAssumptions] = useState<CPFAssumptions | null>(null)
  const [hasChanges, setHasChanges] = useState(false)

  const {
    assumptions,
    isLoading,
    isError,
    updateAssumptionsAsync,
    isUpdating,
  } = useCPFAssumptions()

  // Sync local state when assumptions load
  useEffect(() => {
    if (assumptions && !localAssumptions) {
      setLocalAssumptions(assumptions)
    }
  }, [assumptions, localAssumptions])

  // Track changes
  useEffect(() => {
    if (assumptions && localAssumptions) {
      const changed = JSON.stringify(assumptions) !== JSON.stringify(localAssumptions)
      setHasChanges(changed)
    }
  }, [assumptions, localAssumptions])

  const handleSave = async () => {
    if (!localAssumptions || !hasChanges) return

    const payload: CPFAssumptionsUpdatePayload = {
      interestRates: localAssumptions.interestRates,
      growthRates: localAssumptions.growthRates,
      employment: localAssumptions.employment,
      cpfLife: localAssumptions.cpfLife,
      presetName: 'custom',
    }

    try {
      const updated = await updateAssumptionsAsync(payload)
      setLocalAssumptions(updated)
      setHasChanges(false)
    } catch {
      // Error handled by mutation
    }
  }

  const handleReset = () => {
    if (assumptions) {
      setLocalAssumptions(assumptions)
      setHasChanges(false)
    }
  }

  const updateInterestRate = (field: keyof CPFAssumptions['interestRates'], value: number) => {
    if (!localAssumptions) return
    setLocalAssumptions({
      ...localAssumptions,
      interestRates: { ...localAssumptions.interestRates, [field]: value },
    })
  }

  const updateGrowthRate = (field: keyof CPFAssumptions['growthRates'], value: number) => {
    if (!localAssumptions) return
    setLocalAssumptions({
      ...localAssumptions,
      growthRates: { ...localAssumptions.growthRates, [field]: value },
    })
  }

  const updateEmployment = (field: keyof CPFAssumptions['employment'], value: number | boolean) => {
    if (!localAssumptions) return
    setLocalAssumptions({
      ...localAssumptions,
      employment: { ...localAssumptions.employment, [field]: value },
    })
  }

  const updateCpfLife = (field: keyof CPFAssumptions['cpfLife'], value: number | string) => {
    if (!localAssumptions) return
    setLocalAssumptions({
      ...localAssumptions,
      cpfLife: { ...localAssumptions.cpfLife, [field]: value },
    })
  }

  if (isLoading) {
    return (
      <div className={`rounded-xl border border-white/[0.08] bg-[#0a0a0a] p-4 ${className}`}>
        <div className="flex items-center gap-2 text-slate-400">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">Loading assumptions...</span>
        </div>
      </div>
    )
  }

  if (isError || !localAssumptions) {
    return (
      <div className={`rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 ${className}`}>
        <p className="text-sm text-amber-400">
          Create a CPF account first to configure assumptions.
        </p>
      </div>
    )
  }

  return (
    <div className={`rounded-xl border border-white/[0.08] bg-[#0a0a0a] ${className}`}>
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center justify-between p-4 text-left transition hover:bg-white/[0.02]"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-500/20">
            <Settings className="h-4 w-4 text-slate-400" />
          </div>
          <div>
            <h3 className="text-sm font-medium text-white">Projection Assumptions</h3>
            <p className="text-xs text-slate-500">
              {PRESETS.find(p => p.value === localAssumptions.presetName)?.label || 'Custom'} preset
              {hasChanges && ' (unsaved changes)'}
            </p>
          </div>
        </div>
        {isExpanded ? (
          <ChevronUp className="h-4 w-4 text-slate-400" />
        ) : (
          <ChevronDown className="h-4 w-4 text-slate-400" />
        )}
      </button>

      {/* Content */}
      {isExpanded && (
        <div className="border-t border-white/[0.06] p-4 space-y-6">
          {/* Interest Rates */}
          <Section title="Interest Rates">
            <div className="grid gap-3 sm:grid-cols-2">
              <PercentInput
                label="OA Rate"
                value={localAssumptions.interestRates.oa}
                onChange={(v) => updateInterestRate('oa', v)}
              />
              <PercentInput
                label="SA/MA/RA Rate"
                value={localAssumptions.interestRates.sa}
                onChange={(v) => {
                  updateInterestRate('sa', v)
                  updateInterestRate('ma', v)
                  updateInterestRate('ra', v)
                }}
              />
              <PercentInput
                label="Extra (First $60k)"
                value={localAssumptions.interestRates.extraFirst60k}
                onChange={(v) => updateInterestRate('extraFirst60k', v)}
              />
              <PercentInput
                label="Extra 55+ (First $30k)"
                value={localAssumptions.interestRates.extraFirst30kAbove55}
                onChange={(v) => updateInterestRate('extraFirst30kAbove55', v)}
              />
            </div>
          </Section>

          {/* Growth Rates */}
          <Section title="Growth Rates">
            <div className="grid gap-3 sm:grid-cols-3">
              <PercentInput
                label="Inflation"
                value={localAssumptions.growthRates.inflation}
                onChange={(v) => updateGrowthRate('inflation', v)}
              />
              <PercentInput
                label="FRS Growth"
                value={localAssumptions.growthRates.frs}
                onChange={(v) => updateGrowthRate('frs', v)}
              />
              <PercentInput
                label="Salary Growth"
                value={localAssumptions.growthRates.salary}
                onChange={(v) => updateGrowthRate('salary', v)}
              />
            </div>
          </Section>

          {/* Employment */}
          <Section title="Employment">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Retirement Age</label>
                <input
                  type="number"
                  min={55}
                  max={70}
                  value={localAssumptions.employment.retirementAge}
                  onChange={(e) => updateEmployment('retirementAge', parseInt(e.target.value) || 65)}
                  className="w-full rounded-lg bg-white/[0.03] border border-white/[0.06] text-white text-sm py-2 px-3 focus:outline-none focus:border-white/20"
                />
              </div>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={localAssumptions.employment.assumeContinuous}
                    onChange={(e) => updateEmployment('assumeContinuous', e.target.checked)}
                    className="h-4 w-4 rounded border-white/20 bg-white/[0.03] text-emerald-500 focus:ring-emerald-500/50"
                  />
                  <span className="text-sm text-slate-300">Continuous employment</span>
                </label>
              </div>
            </div>
          </Section>

          {/* CPF LIFE */}
          <Section title="CPF LIFE">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Plan Type</label>
                <select
                  value={localAssumptions.cpfLife.plan}
                  onChange={(e) => updateCpfLife('plan', e.target.value)}
                  className="w-full rounded-lg bg-white/[0.03] border border-white/[0.06] text-white text-sm py-2 px-3 focus:outline-none focus:border-white/20"
                >
                  {CPF_LIFE_PLANS.map((plan) => (
                    <option key={plan.value} value={plan.value}>
                      {plan.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Payout Start Age</label>
                <input
                  type="number"
                  min={65}
                  max={70}
                  value={localAssumptions.cpfLife.payoutStartAge}
                  onChange={(e) => updateCpfLife('payoutStartAge', parseInt(e.target.value) || 65)}
                  className="w-full rounded-lg bg-white/[0.03] border border-white/[0.06] text-white text-sm py-2 px-3 focus:outline-none focus:border-white/20"
                />
              </div>
            </div>
          </Section>

          {/* Actions */}
          <div className="flex items-center justify-between pt-2 border-t border-white/[0.06]">
            <button
              onClick={handleReset}
              disabled={!hasChanges || isUpdating}
              className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset
            </button>
            <button
              onClick={handleSave}
              disabled={!hasChanges || isUpdating}
              className="flex items-center gap-1.5 rounded-lg bg-emerald-500/20 px-4 py-2 text-sm font-medium text-emerald-400 transition hover:bg-emerald-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isUpdating ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Check className="h-3.5 w-3.5" />
              )}
              Save Changes
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-3">{title}</h4>
      {children}
    </div>
  )
}

function PercentInput({
  label,
  value,
  onChange,
}: {
  label: string
  value: number
  onChange: (value: number) => void
}) {
  const displayValue = (value * 100).toFixed(2)

  return (
    <div>
      <label className="block text-xs text-slate-400 mb-1.5">{label}</label>
      <div className="relative">
        <input
          type="number"
          step="0.1"
          min="0"
          max="20"
          value={displayValue}
          onChange={(e) => onChange(parseFloat(e.target.value) / 100 || 0)}
          className="w-full rounded-lg bg-white/[0.03] border border-white/[0.06] text-white text-sm py-2 px-3 pr-8 focus:outline-none focus:border-white/20"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-500">%</span>
      </div>
    </div>
  )
}
