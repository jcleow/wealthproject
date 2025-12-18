"use client"

import type { MortgageInputs } from '@/types/property'

interface InterestSectionProps {
  inputs: MortgageInputs
  onChange: (field: keyof MortgageInputs, value: string | number) => void
}

export function InterestSection({ inputs, onChange }: InterestSectionProps) {
  const cards = [
    {
      label: 'Fixed Window',
      helper: 'Bank committed period',
      field: 'fixedYears' as const,
      value: inputs.fixedYears,
      min: 1,
      max: 10,
      step: 1,
      suffix: 'years',
      placeholder: '5',
    },
    {
      label: 'Current Rate',
      helper: 'Applied to amortisation',
      field: 'fixedRate' as const,
      value: inputs.fixedRate,
      min: 0,
      max: 6,
      step: 0.1,
      suffix: '%',
      placeholder: '2.5',
    },
    {
      label: 'Next Expected Rate',
      helper: 'Post lock-in assumption',
      field: 'floatingRate' as const,
      value: inputs.floatingRate,
      min: 0,
      max: 7,
      step: 0.1,
      suffix: '%',
      placeholder: '4.0',
    },
  ]

  return (
    <div className="space-y-4">
      <header>
        <h4 className="text-lg font-semibold text-white">Interest Rates</h4>
        <p className="text-sm text-gray-400">Outline your lock-in period and expected floating rate.</p>
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        {cards.map((card) => (
          <div className="space-y-2 rounded-2xl border border-white/10 bg-white/5 p-4" key={card.label}>
            <p className="text-xs uppercase text-gray-400">{card.label}</p>
            <div className="flex items-baseline gap-2">
              <input
                className={`w-full
focus:outline-none
bg-transparent
text-2xl font-semibold text-white`}
                type="number"
                value={card.value === 0 ? '' : card.value}
                min={card.min}
                max={card.max}
                step={card.step}
                onChange={(event) => onChange(card.field, Number(event.target.value) || 0)}
                placeholder={card.placeholder}
              />
              <span className="text-sm text-gray-400">{card.suffix}</span>
            </div>
            <p className="text-xs text-gray-400">{card.helper}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
