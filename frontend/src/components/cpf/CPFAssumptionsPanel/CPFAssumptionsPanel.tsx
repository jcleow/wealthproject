'use client'

import { useState, useCallback } from 'react'
import {
  Settings2,
  ChevronDown,
  ChevronUp,
  Info,
  RotateCcw,
  Percent,
  TrendingUp,
  Zap,
  HelpCircle,
} from 'lucide-react'
import type { CPFAssumptions, AssumptionPreset } from '@/types/cpf'
import { DEFAULT_CPF_ASSUMPTIONS, ASSUMPTION_PRESETS } from '@/types/cpf'
import { PercentSlider, PresetButton, AssumptionsInfoModal } from './components'

interface CPFAssumptionsPanelProps {
  assumptions: CPFAssumptions
  onChange: (assumptions: CPFAssumptions) => void
  className?: string
  collapsible?: boolean
  defaultExpanded?: boolean
}

export function CPFAssumptionsPanel({
  assumptions,
  onChange,
  className = '',
  collapsible = true,
  defaultExpanded = false,
}: CPFAssumptionsPanelProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)
  const [activePreset, setActivePreset] = useState<AssumptionPreset>('official')
  const [showInfoModal, setShowInfoModal] = useState(false)

  const handlePresetChange = useCallback(
    (preset: AssumptionPreset) => {
      setActivePreset(preset)
      if (preset !== 'custom') {
        const presetData = ASSUMPTION_PRESETS[preset]
        onChange({
          ...DEFAULT_CPF_ASSUMPTIONS,
          ...presetData.assumptions,
          interestRates: {
            ...DEFAULT_CPF_ASSUMPTIONS.interestRates,
            ...(presetData.assumptions.interestRates || {}),
          },
        })
      }
    },
    [onChange]
  )

  const handleValueChange = useCallback(
    (path: string, value: number | boolean | string) => {
      setActivePreset('custom')
      const newAssumptions = { ...assumptions }

      if (path.startsWith('interestRates.')) {
        const key = path.split('.')[1] as keyof CPFAssumptions['interestRates']
        newAssumptions.interestRates = {
          ...newAssumptions.interestRates,
          [key]: value,
        }
      } else {
        ;(newAssumptions as Record<string, unknown>)[path] = value
      }

      onChange(newAssumptions)
    },
    [assumptions, onChange]
  )

  const handleReset = useCallback(() => {
    setActivePreset('official')
    onChange(DEFAULT_CPF_ASSUMPTIONS)
  }, [onChange])

  const header = (
    <div
      className={`flex items-center justify-between ${collapsible ? 'cursor-pointer' : ''}`}
      onClick={() => collapsible && setIsExpanded(!isExpanded)}
    >
      <div className="flex items-center gap-2">
        <Settings2 className="h-4 w-4 text-slate-400" />
        <span className="text-sm font-medium text-slate-300">
          Projection Assumptions
        </span>
        {activePreset !== 'official' && (
          <span className="rounded-full bg-purple-500/20 px-2 py-0.5 text-[10px] text-purple-400">
            {activePreset === 'custom'
              ? 'Custom'
              : ASSUMPTION_PRESETS[activePreset].label}
          </span>
        )}
      </div>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            setShowInfoModal(true)
          }}
          className="rounded-lg p-1.5 text-slate-500 transition hover:bg-blue-500/10 hover:text-blue-400"
          title="View all assumption factors"
        >
          <HelpCircle className="h-4 w-4" />
        </button>
        {collapsible && (
          <button
            type="button"
            className="p-1 text-slate-400 transition hover:text-white"
          >
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>
        )}
      </div>
    </div>
  )

  if (collapsible && !isExpanded) {
    return (
      <>
        <div
          className={`rounded-xl border border-white/[0.08] bg-[#0a0a0a] p-4 ${className}`}
        >
          {header}
        </div>
        {showInfoModal && (
          <AssumptionsInfoModal onClose={() => setShowInfoModal(false)} />
        )}
      </>
    )
  }

  return (
    <div
      className={`rounded-xl border border-white/[0.08] bg-[#0a0a0a] ${className}`}
    >
      <div className="border-b border-white/[0.06] p-4">{header}</div>

      <div className="space-y-5 p-4">
        {/* Preset Selection */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wider text-slate-500">
              Quick Presets
            </span>
            <button
              type="button"
              onClick={handleReset}
              className="flex items-center gap-1 text-xs text-slate-500 transition hover:text-slate-300"
            >
              <RotateCcw className="h-3 w-3" />
              Reset
            </button>
          </div>
          <div className="flex gap-2">
            <PresetButton
              preset="official"
              label="Official"
              description="CPF defaults"
              isSelected={activePreset === 'official'}
              onClick={() => handlePresetChange('official')}
            />
            <PresetButton
              preset="conservative"
              label="Conservative"
              description="Lower growth"
              isSelected={activePreset === 'conservative'}
              onClick={() => handlePresetChange('conservative')}
            />
            <PresetButton
              preset="optimistic"
              label="Optimistic"
              description="Higher returns"
              isSelected={activePreset === 'optimistic'}
              onClick={() => handlePresetChange('optimistic')}
            />
          </div>
        </div>

        {/* Interest Rates Section */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Percent className="h-3.5 w-3.5 text-emerald-400" />
            <span className="text-xs uppercase tracking-wider text-slate-400">
              Interest Rates
            </span>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <PercentSlider
              label="OA Rate"
              value={assumptions.interestRates.oa}
              onChange={(v) => handleValueChange('interestRates.oa', v)}
              min={0.01}
              max={0.05}
              color="blue"
              tooltip="Ordinary Account base rate"
            />
            <PercentSlider
              label="SA Rate"
              value={assumptions.interestRates.sa}
              onChange={(v) => {
                handleValueChange('interestRates.sa', v)
                handleValueChange('interestRates.ma', v)
              }}
              min={0.02}
              max={0.06}
              color="emerald"
              tooltip="Special & MediSave Account rate"
            />
            <PercentSlider
              label="RA Rate"
              value={assumptions.interestRates.ra}
              onChange={(v) => handleValueChange('interestRates.ra', v)}
              min={0.02}
              max={0.06}
              color="emerald"
              tooltip="Retirement Account rate"
            />
            <PercentSlider
              label="Extra Interest (First $60k)"
              value={assumptions.interestRates.extraFirst60k}
              onChange={(v) =>
                handleValueChange('interestRates.extraFirst60k', v)
              }
              min={0}
              max={0.02}
              color="purple"
              tooltip="Additional interest on first $60,000 of combined balances"
            />
            <PercentSlider
              label="Extra Interest (55+, First $30k)"
              value={assumptions.interestRates.extraFirst30kAbove55}
              onChange={(v) =>
                handleValueChange('interestRates.extraFirst30kAbove55', v)
              }
              min={0}
              max={0.02}
              color="purple"
              tooltip="Additional extra interest for members aged 55+"
            />
          </div>
        </div>

        {/* Growth Rates Section */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-3.5 w-3.5 text-amber-400" />
            <span className="text-xs uppercase tracking-wider text-slate-400">
              Growth Rates
            </span>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <PercentSlider
              label="Inflation Rate"
              value={assumptions.inflationRate}
              onChange={(v) => handleValueChange('inflationRate', v)}
              min={0}
              max={0.05}
              color="amber"
              tooltip="Applied to income goals for future value"
            />
            <PercentSlider
              label="FRS Growth Rate"
              value={assumptions.frsGrowthRate}
              onChange={(v) => handleValueChange('frsGrowthRate', v)}
              min={0.02}
              max={0.05}
              color="amber"
              tooltip="Annual growth of retirement sum targets"
            />
            <PercentSlider
              label="Salary Growth Rate"
              value={assumptions.salaryGrowthRate}
              onChange={(v) => handleValueChange('salaryGrowthRate', v)}
              min={0}
              max={0.08}
              color="blue"
              tooltip="Annual salary increment assumption"
            />
            <PercentSlider
              label="Escalating Plan Growth"
              value={assumptions.escalatingPlanGrowth}
              onChange={(v) => handleValueChange('escalatingPlanGrowth', v)}
              min={0.01}
              max={0.03}
              color="purple"
              tooltip="Annual payout increase for Escalating Plan"
            />
          </div>
        </div>

        {/* CPF LIFE Section */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Zap className="h-3.5 w-3.5 text-purple-400" />
            <span className="text-xs uppercase tracking-wider text-slate-400">
              CPF LIFE
            </span>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <PercentSlider
                label="Payout Start Age"
                value={assumptions.payoutStartAge}
                onChange={(v) => handleValueChange('payoutStartAge', Math.round(v) as 65 | 66 | 67 | 68 | 69 | 70)}
                min={65}
                max={70}
                step={1}
                color="purple"
                isPercent={false}
                tooltip="Age to start CPF LIFE payouts (65-70)"
                showSlider
              />
              {assumptions.payoutStartAge > 65 && (
                <div className="text-[10px] text-emerald-400">
                  +{(assumptions.payoutStartAge - 65) * 7}% bonus for deferring to age {assumptions.payoutStartAge}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Info Footer */}
        <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
          <div className="flex items-start gap-2">
            <Info className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-blue-400" />
            <p className="text-[11px] leading-relaxed text-slate-500">
              These assumptions are based on{' '}
              <a
                href="https://www.cpf.gov.sg/member/tnc/detailed-notes-for-cpf-planner-retirement-income"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:underline"
              >
                CPF&apos;s official methodology
              </a>
              . Actual results may vary based on policy changes, market
              conditions, and individual circumstances.{' '}
              <button
                type="button"
                onClick={() => setShowInfoModal(true)}
                className="text-blue-400 hover:underline"
              >
                View all factors →
              </button>
            </p>
          </div>
        </div>
      </div>

      {/* Info Modal */}
      {showInfoModal && (
        <AssumptionsInfoModal onClose={() => setShowInfoModal(false)} />
      )}
    </div>
  )
}
