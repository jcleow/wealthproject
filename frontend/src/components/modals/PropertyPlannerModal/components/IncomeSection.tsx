"use client"

import type { MortgageInputs } from '@/types/property'
import { formatCurrency, formatPercentage, calculateMortgage } from '@/utils/mortgage-calculations'

interface IncomeSectionProps {
  inputs: MortgageInputs
  calculation: ReturnType<typeof calculateMortgage>
  onChange: (field: keyof MortgageInputs, value: string | number) => void
}

export function IncomeSection({ inputs, calculation, onChange }: IncomeSectionProps) {
  const withinLimit = calculation.msrRatio <= 0.3
  const msrPercent = formatPercentage(calculation.msrRatio)

  return (
    <div className="space-y-4">
      <header>
        <h4 className="text-lg font-semibold text-white">Income & MSR</h4>
        <p className="text-sm text-gray-400">Stress-test your loan against the 30% MSR guideline.</p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-medium text-gray-300">
          Monthly Household Income
          <input
            className="mt-1 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-lg font-semibold text-white placeholder:text-gray-500 focus:border-blue-400 focus:outline-none"
            inputMode="numeric"
            onChange={(event) => {
              const raw = event.target.value.replace(/[^0-9]/g, '')
              onChange('householdIncome', Number(raw) || 0)
            }}
            type="text"
            value={inputs.householdIncome ? inputs.householdIncome.toLocaleString() : ''}
            placeholder="10,000"
          />
          <p className="mt-1 text-xs text-gray-500">Include both borrowers for couples.</p>
        </label>
        <label className="text-sm font-medium text-gray-300">
          Other Monthly Debt Obligations
          <input
            className="mt-1 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-lg font-semibold text-white placeholder:text-gray-500 focus:border-blue-400 focus:outline-none"
            inputMode="numeric"
            onChange={(event) => {
              const raw = event.target.value.replace(/[^0-9]/g, '')
              onChange('otherDebt', Number(raw) || 0)
            }}
            type="text"
            value={inputs.otherDebt ? inputs.otherDebt.toLocaleString() : ''}
            placeholder="500"
          />
        </label>
      </div>

      <div
        className={`rounded-2xl border px-4 py-4 ${
          withinLimit ? 'border-emerald-400/40 bg-[#0b2419]' : 'border-amber-400/40 bg-[#26160b]'
        }`}
      >
        <div className="flex items-center gap-3 pl-1">
          <div>
            <p className="text-xs uppercase tracking-wide text-white/70">Estimated MSR</p>
            <p className="text-2xl font-semibold text-white">{msrPercent}</p>
            <p className="text-xs text-white/70">
              {withinLimit ? 'Below 30% threshold' : 'Above 30% MSR — consider tweaking loan'}
            </p>
          </div>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-[#24324d] bg-black/30 p-3 text-sm">
            <p className="text-gray-400">Estimated Monthly Payment</p>
            <p className="text-lg font-semibold text-white">{formatCurrency(calculation.monthlyPayment)}</p>
          </div>
          <div className="rounded-xl border border-[#24324d] bg-black/30 p-3 text-sm">
            <p className="text-gray-400">Household Income</p>
            <p className="text-lg font-semibold text-white">{formatCurrency(inputs.householdIncome)}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
