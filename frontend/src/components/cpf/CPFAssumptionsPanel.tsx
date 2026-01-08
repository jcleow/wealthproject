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
  Calendar,
  Zap,
  HelpCircle,
  X,
} from 'lucide-react'
import type {
  CPFAssumptions,
  AssumptionPreset,
} from '@/types/cpf'
import {
  DEFAULT_CPF_ASSUMPTIONS,
  ASSUMPTION_PRESETS,
} from '@/types/cpf'

// Assumption documentation for the info modal
const ASSUMPTION_DOCS: {
  category: string
  icon: React.ReactNode
  items: { factor: string; defaultValue: string; description: string }[]
}[] = [
  {
    category: 'Interest Rates',
    icon: <Percent className="h-4 w-4 text-emerald-400" />,
    items: [
      {
        factor: 'OA Interest Rate',
        defaultValue: '2.5% p.a.',
        description: 'Ordinary Account base rate. OA earns lower interest as funds can be used for housing/education.',
      },
      {
        factor: 'SA/RA/MA Interest Rate',
        defaultValue: '4.0% p.a.',
        description: 'Special, Retirement, and MediSave accounts earn a floor rate of 4% as these are long-term retirement savings.',
      },
      {
        factor: 'Extra Interest (First $60k)',
        defaultValue: '+1.0%',
        description: 'Additional interest on first $60,000 of combined balances (OA capped at $20k for this calculation).',
      },
      {
        factor: 'Extra Interest (55+, First $30k)',
        defaultValue: '+1.0%',
        description: 'Members aged 55+ earn an additional 1% on their first $30,000 of combined balances.',
      },
    ],
  },
  {
    category: 'Growth Rates',
    icon: <TrendingUp className="h-4 w-4 text-amber-400" />,
    items: [
      {
        factor: 'Inflation Rate',
        defaultValue: '2.0%',
        description: 'Applied to income goals to calculate future purchasing power. CPF uses 2% based on historical Singapore inflation.',
      },
      {
        factor: 'FRS Growth Rate',
        defaultValue: '3.5%',
        description: 'Annual growth rate for Full/Basic/Enhanced Retirement Sums. Higher than inflation to account for rising living standards and life expectancy.',
      },
      {
        factor: 'Salary Growth Rate',
        defaultValue: '3.0%',
        description: 'Assumed annual salary increment. CPF applies this at end of each December in projections.',
      },
      {
        factor: 'Escalating Plan Growth',
        defaultValue: '2.0%',
        description: 'Annual payout increase for CPF LIFE Escalating Plan to help maintain purchasing power against inflation.',
      },
    ],
  },
  {
    category: 'CPF LIFE Payout Factors',
    icon: <Zap className="h-4 w-4 text-purple-400" />,
    items: [
      {
        factor: 'Standard Plan',
        defaultValue: '$5.50 per $1,000 RA (at 65)',
        description: 'Highest monthly payout but lower bequest. Best for those prioritizing income over inheritance.',
      },
      {
        factor: 'Basic Plan',
        defaultValue: '$5.00 per $1,000 RA (at 65)',
        description: 'Lower payout but higher bequest. 10-20% of RA reserved as premium, rest paid out until age 90.',
      },
      {
        factor: 'Escalating Plan',
        defaultValue: '$4.40 per $1,000 RA (at 65)',
        description: 'Starts lowest but grows 2% yearly. Provides inflation protection for longer retirements.',
      },
      {
        factor: 'Deferral Bonus',
        defaultValue: '+7% per year (up to age 70)',
        description: 'Delaying payout start increases monthly amount. Maximum +35% at age 70.',
      },
    ],
  },
  {
    category: 'Fixed Constants (2025)',
    icon: <Calendar className="h-4 w-4 text-blue-400" />,
    items: [
      {
        factor: 'Full Retirement Sum (FRS)',
        defaultValue: '$213,000',
        description: 'Target savings for standard retirement income. Set by CPF Board annually.',
      },
      {
        factor: 'Basic Retirement Sum (BRS)',
        defaultValue: '$106,500',
        description: 'Half of FRS. Allows property pledge to meet retirement requirements.',
      },
      {
        factor: 'Enhanced Retirement Sum (ERS)',
        defaultValue: '$426,000',
        description: '2x FRS (increased from 3x in 2025). Maximum amount for higher CPF LIFE payouts.',
      },
      {
        factor: 'Ordinary Wage Ceiling',
        defaultValue: '$7,400/month',
        description: 'Maximum monthly wage subject to CPF contributions.',
      },
    ],
  },
]

// Info Modal Component
function AssumptionsInfoModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative max-h-[85vh] w-full max-w-2xl overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0a0a0a] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/20">
              <HelpCircle className="h-4 w-4 text-blue-400" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">Projection Assumptions</h2>
              <p className="text-xs text-slate-400">Based on CPF official methodology</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-white/[0.05] hover:text-white transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="max-h-[calc(85vh-120px)] overflow-y-auto p-5">
          <div className="space-y-6">
            {ASSUMPTION_DOCS.map((section) => (
              <div key={section.category}>
                <div className="mb-3 flex items-center gap-2">
                  {section.icon}
                  <h3 className="text-sm font-medium text-slate-300">{section.category}</h3>
                </div>
                <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-white/[0.06] bg-white/[0.02]">
                        <th className="px-3 py-2 text-left font-medium text-slate-400">Factor</th>
                        <th className="px-3 py-2 text-left font-medium text-slate-400">Default</th>
                        <th className="px-3 py-2 text-left font-medium text-slate-400">Description</th>
                      </tr>
                    </thead>
                    <tbody>
                      {section.items.map((item, idx) => (
                        <tr
                          key={item.factor}
                          className={idx < section.items.length - 1 ? 'border-b border-white/[0.04]' : ''}
                        >
                          <td className="px-3 py-2.5 font-medium text-slate-300 whitespace-nowrap">
                            {item.factor}
                          </td>
                          <td className="px-3 py-2.5 font-mono text-emerald-400 whitespace-nowrap">
                            {item.defaultValue}
                          </td>
                          <td className="px-3 py-2.5 text-slate-400 leading-relaxed">
                            {item.description}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-white/[0.06] px-5 py-3">
          <p className="text-[11px] text-slate-500">
            Source:{' '}
            <a
              href="https://www.cpf.gov.sg/member/tnc/detailed-notes-for-cpf-planner-retirement-income"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:underline"
            >
              CPF Detailed Notes for Retirement Income Planner
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}

interface CPFAssumptionsPanelProps {
  assumptions: CPFAssumptions
  onChange: (assumptions: CPFAssumptions) => void
  className?: string
  collapsible?: boolean
  defaultExpanded?: boolean
}

function PercentSlider({
  label,
  value,
  onChange,
  min,
  max,
  step = 0.005,
  tooltip,
  color = 'emerald',
}: {
  label: string
  value: number
  onChange: (value: number) => void
  min: number
  max: number
  step?: number
  tooltip?: string
  color?: 'emerald' | 'blue' | 'amber' | 'purple'
}) {
  const colorClasses = {
    emerald: 'accent-emerald-500',
    blue: 'accent-blue-500',
    amber: 'accent-amber-500',
    purple: 'accent-purple-500',
  }

  const textColors = {
    emerald: 'text-emerald-400',
    blue: 'text-blue-400',
    amber: 'text-amber-400',
    purple: 'text-purple-400',
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-slate-400">{label}</span>
          {tooltip && (
            <div className="group relative">
              <Info className="h-3 w-3 text-slate-500 cursor-help" />
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-slate-800 text-xs text-slate-300 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                {tooltip}
              </div>
            </div>
          )}
        </div>
        <span className={`font-mono text-sm font-medium ${textColors[color]}`}>
          {(value * 100).toFixed(1)}%
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className={`w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer ${colorClasses[color]}`}
      />
      <div className="flex justify-between text-[10px] text-slate-600">
        <span>{(min * 100).toFixed(1)}%</span>
        <span>{(max * 100).toFixed(1)}%</span>
      </div>
    </div>
  )
}

function PresetButton({
  preset,
  label,
  description,
  isSelected,
  onClick,
}: {
  preset: AssumptionPreset
  label: string
  description: string
  isSelected: boolean
  onClick: () => void
}) {
  const colors = {
    official: 'border-emerald-500/50 bg-emerald-500/20 text-emerald-400',
    conservative: 'border-amber-500/50 bg-amber-500/20 text-amber-400',
    optimistic: 'border-blue-500/50 bg-blue-500/20 text-blue-400',
    custom: 'border-purple-500/50 bg-purple-500/20 text-purple-400',
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 rounded-lg border p-2 text-left transition ${
        isSelected
          ? colors[preset]
          : 'border-white/[0.06] bg-white/[0.02] text-slate-400 hover:border-white/20 hover:text-white'
      }`}
    >
      <div className="text-xs font-medium">{label}</div>
      <div className="text-[10px] opacity-70">{description}</div>
    </button>
  )
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
        (newAssumptions as Record<string, unknown>)[path] = value
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
        <span className="text-sm font-medium text-slate-300">Projection Assumptions</span>
        {activePreset !== 'official' && (
          <span className="rounded-full bg-purple-500/20 px-2 py-0.5 text-[10px] text-purple-400">
            {activePreset === 'custom' ? 'Custom' : ASSUMPTION_PRESETS[activePreset].label}
          </span>
        )}
      </div>
      <div className="flex items-center gap-1">
        {/* Help Button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            setShowInfoModal(true)
          }}
          className="p-1.5 text-slate-500 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition"
          title="View all assumption factors"
        >
          <HelpCircle className="h-4 w-4" />
        </button>
        {collapsible && (
          <button type="button" className="p-1 text-slate-400 hover:text-white transition">
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        )}
      </div>
    </div>
  )

  if (collapsible && !isExpanded) {
    return (
      <>
        <div className={`rounded-xl border border-white/[0.08] bg-[#0a0a0a] p-4 ${className}`}>
          {header}
        </div>
        {showInfoModal && <AssumptionsInfoModal onClose={() => setShowInfoModal(false)} />}
      </>
    )
  }

  return (
    <div className={`rounded-xl border border-white/[0.08] bg-[#0a0a0a] ${className}`}>
      <div className="p-4 border-b border-white/[0.06]">{header}</div>

      <div className="p-4 space-y-5">
        {/* Preset Selection */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 uppercase tracking-wider">Quick Presets</span>
            <button
              type="button"
              onClick={handleReset}
              className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300 transition"
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
            <span className="text-xs text-slate-400 uppercase tracking-wider">Interest Rates</span>
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
              label="SA/RA Rate"
              value={assumptions.interestRates.sa}
              onChange={(v) => {
                handleValueChange('interestRates.sa', v)
                handleValueChange('interestRates.ra', v)
                handleValueChange('interestRates.ma', v)
              }}
              min={0.02}
              max={0.06}
              color="emerald"
              tooltip="Special, MediSave & Retirement Account rate"
            />
            <PercentSlider
              label="Extra Interest (First $60k)"
              value={assumptions.interestRates.extraFirst60k}
              onChange={(v) => handleValueChange('interestRates.extraFirst60k', v)}
              min={0}
              max={0.02}
              color="purple"
              tooltip="Additional interest on first $60,000 of combined balances"
            />
            <PercentSlider
              label="Extra Interest (55+, First $30k)"
              value={assumptions.interestRates.extraFirst30kAbove55}
              onChange={(v) => handleValueChange('interestRates.extraFirst30kAbove55', v)}
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
            <span className="text-xs text-slate-400 uppercase tracking-wider">Growth Rates</span>
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

        {/* Employment Section */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Calendar className="h-3.5 w-3.5 text-blue-400" />
            <span className="text-xs text-slate-400 uppercase tracking-wider">Employment</span>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">Retirement Age</span>
                <span className="font-mono text-sm font-medium text-blue-400">
                  {assumptions.retirementAge}
                </span>
              </div>
              <input
                type="range"
                min={55}
                max={70}
                step={1}
                value={assumptions.retirementAge}
                onChange={(e) => handleValueChange('retirementAge', parseInt(e.target.value))}
                className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
              <div className="flex justify-between text-[10px] text-slate-600">
                <span>55</span>
                <span>70</span>
              </div>
            </div>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={assumptions.assumeContinuousEmployment}
                onChange={(e) => handleValueChange('assumeContinuousEmployment', e.target.checked)}
                className="h-4 w-4 rounded accent-blue-500"
              />
              <div>
                <div className="text-xs text-slate-300">Continuous Employment</div>
                <div className="text-[10px] text-slate-500">Assume employed until retirement</div>
              </div>
            </label>
          </div>
        </div>

        {/* CPF LIFE Section */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Zap className="h-3.5 w-3.5 text-purple-400" />
            <span className="text-xs text-slate-400 uppercase tracking-wider">CPF LIFE</span>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <span className="text-xs text-slate-400">Plan Type</span>
              <div className="flex gap-1">
                {(['standard', 'basic', 'escalating'] as const).map((plan) => (
                  <button
                    key={plan}
                    type="button"
                    onClick={() => handleValueChange('cpfLifePlan', plan)}
                    className={`flex-1 rounded-lg py-1.5 text-xs font-medium transition ${
                      assumptions.cpfLifePlan === plan
                        ? 'bg-purple-500/20 text-purple-400 border border-purple-500/50'
                        : 'bg-white/[0.02] text-slate-500 border border-white/[0.06] hover:text-white'
                    }`}
                  >
                    {plan.charAt(0).toUpperCase() + plan.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <span className="text-xs text-slate-400">Payout Start Age</span>
              <div className="flex gap-1">
                {([65, 67, 70] as const).map((age) => (
                  <button
                    key={age}
                    type="button"
                    onClick={() => handleValueChange('payoutStartAge', age)}
                    className={`flex-1 rounded-lg py-1.5 text-xs font-medium transition ${
                      assumptions.payoutStartAge === age
                        ? 'bg-purple-500/20 text-purple-400 border border-purple-500/50'
                        : 'bg-white/[0.02] text-slate-500 border border-white/[0.06] hover:text-white'
                    }`}
                  >
                    {age}
                  </button>
                ))}
              </div>
              {assumptions.payoutStartAge > 65 && (
                <div className="text-[10px] text-emerald-400">
                  +{(assumptions.payoutStartAge - 65) * 7}% bonus for deferring
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Info Footer */}
        <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
          <div className="flex items-start gap-2">
            <Info className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-blue-400" />
            <p className="text-[11px] text-slate-500 leading-relaxed">
              These assumptions are based on{' '}
              <a
                href="https://www.cpf.gov.sg/member/tnc/detailed-notes-for-cpf-planner-retirement-income"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:underline"
              >
                CPF&apos;s official methodology
              </a>
              . Actual results may vary based on policy changes, market conditions, and individual circumstances.
              {' '}
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
      {showInfoModal && <AssumptionsInfoModal onClose={() => setShowInfoModal(false)} />}
    </div>
  )
}
