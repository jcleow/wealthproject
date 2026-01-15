'use client'

import { useState } from 'react'
import { Bug, Calculator, Loader2 } from 'lucide-react'
import { CustomDropdown } from '@/components/modals/ScenarioEventModal/components/CustomDropdown'
import { numericStyles } from '@/lib/utils'
import { calculateCPFLifeEstimate, type CPFLifeEstimateResponse } from '@/api/financial/cpf'

type Gender = 'male' | 'female'
type Plan = 'standard' | 'basic' | 'escalating'

function formatCurrency(value: string | number): string {
  const num = typeof value === 'string' ? parseFloat(value) : value
  return new Intl.NumberFormat('en-SG', {
    style: 'currency',
    currency: 'SGD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num)
}

export function CPFLifePayoutDebug() {
  // Only render in development
  if (process.env.NODE_ENV !== 'development') {
    return null
  }

  // Use string state for inputs to allow editing without immediate reset
  const [birthYearInput, setBirthYearInput] = useState('1970')
  const [gender, setGender] = useState<Gender>('female')
  const [plan, setPlan] = useState<Plan>('standard')
  const [balanceInput, setBalanceInput] = useState('500000')
  const [isExpanded, setIsExpanded] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<CPFLifeEstimateResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleCalculate = async () => {
    const birthYear = parseInt(birthYearInput) || 1970
    const balance = parseInt(balanceInput) || 0

    setIsLoading(true)
    setError(null)
    try {
      const response = await calculateCPFLifeEstimate({
        birthYear,
        gender,
        raBalanceAt65: balance.toString(),
        payoutStartAge: 65,
      })
      setResult(response)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to calculate')
    } finally {
      setIsLoading(false)
    }
  }

  // Get the selected plan's data
  const selectedPlanData = result?.estimates?.[plan]

  if (!isExpanded) {
    return (
      <button
        onClick={() => setIsExpanded(true)}
        className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-lg bg-amber-500/20 border border-amber-500/30 px-3 py-2 text-amber-400 text-sm font-medium hover:bg-amber-500/30 transition-colors"
      >
        <Bug className="h-4 w-4" />
        CPF LIFE Debug
      </button>
    )
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-80 rounded-xl border border-amber-500/30 bg-slate-900/95 backdrop-blur-xl shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3">
        <div className="flex items-center gap-2">
          <Calculator className="h-4 w-4 text-amber-400" />
          <span className="text-sm font-semibold text-white">CPF LIFE Payout Debug</span>
        </div>
        <button
          onClick={() => setIsExpanded(false)}
          className="text-slate-400 hover:text-white text-lg leading-none"
        >
          ×
        </button>
      </div>

      {/* Inputs */}
      <div className="p-4 space-y-3">
        <div className="text-xs font-medium text-amber-400 uppercase tracking-wider">
          Your Inputs
        </div>

        {/* Birth Year */}
        <div className="flex items-center justify-between">
          <label className="text-sm text-slate-400">Birth Year:</label>
          <input
            type="text"
            inputMode="numeric"
            value={birthYearInput}
            onChange={(e) => setBirthYearInput(e.target.value.replace(/[^0-9]/g, ''))}
            className="w-24 rounded-lg bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 text-sm text-white text-right focus:outline-none focus:border-amber-500/40"
          />
        </div>

        {/* Gender */}
        <div className="flex items-center justify-between">
          <label className="text-sm text-slate-400">Gender:</label>
          <CustomDropdown
            value={gender}
            onChange={(val) => setGender(val as Gender)}
            options={[
              { value: 'male', label: 'Male' },
              { value: 'female', label: 'Female' },
            ]}
            minWidth="100px"
          />
        </div>

        {/* Plan */}
        <div className="flex items-center justify-between">
          <label className="text-sm text-slate-400">Plan:</label>
          <CustomDropdown
            value={plan}
            onChange={(val) => setPlan(val as Plan)}
            options={[
              { value: 'standard', label: 'Standard' },
              { value: 'basic', label: 'Basic' },
              { value: 'escalating', label: 'Escalating' },
            ]}
            minWidth="100px"
          />
        </div>

        {/* RA Balance */}
        <div className="flex items-center justify-between">
          <label className="text-sm text-slate-400">RA Balance at 65:</label>
          <input
            type="text"
            inputMode="numeric"
            value={balanceInput}
            onChange={(e) => setBalanceInput(e.target.value.replace(/[^0-9]/g, ''))}
            className="w-28 rounded-lg bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 text-sm text-white text-right focus:outline-none focus:border-amber-500/40"
          />
        </div>

        {/* Calculate Button */}
        <button
          onClick={handleCalculate}
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-2 rounded-lg bg-amber-500/20 border border-amber-500/30 px-4 py-2 text-amber-400 text-sm font-medium hover:bg-amber-500/30 transition-colors disabled:opacity-50"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Calculating...
            </>
          ) : (
            <>
              <Calculator className="h-4 w-4" />
              Calculate (Backend)
            </>
          )}
        </button>

        {error && (
          <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
            {error}
          </div>
        )}
      </div>

      {/* Predicted Payout */}
      {result && selectedPlanData && (
        <>
          <div className="border-t border-white/[0.06] p-4 space-y-3">
            <div className="text-xs font-medium text-emerald-400 uppercase tracking-wider">
              Predicted Payout ({plan})
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-400">Monthly Payout:</span>
              <span className={`${numericStyles.medium} text-lg text-emerald-400`}>
                {formatCurrency(selectedPlanData.monthlyPayout)}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-400">Annual Payout:</span>
              <span className={numericStyles.base}>
                {formatCurrency(selectedPlanData.annualPayout)}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-400">Payout Rate:</span>
              <span className={numericStyles.base}>
                {selectedPlanData.payoutRate}%
              </span>
            </div>
          </div>

          {/* Compare All Plans */}
          <div className="border-t border-white/[0.06] p-4 space-y-2">
            <div className="text-xs font-medium text-blue-400 uppercase tracking-wider">
              Compare All Plans
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-400">Standard:</span>
              <span className={`${numericStyles.base} ${plan === 'standard' ? 'text-white font-medium' : ''}`}>
                {formatCurrency(result.estimates.standard.monthlyPayout)}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-400">Basic:</span>
              <span className={`${numericStyles.base} ${plan === 'basic' ? 'text-white font-medium' : ''}`}>
                {formatCurrency(result.estimates.basic.monthlyPayout)}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-400">Escalating (at start):</span>
              <span className={`${numericStyles.base} ${plan === 'escalating' ? 'text-white font-medium' : ''}`}>
                {formatCurrency(result.estimates.escalating.monthlyPayout)}
              </span>
            </div>
          </div>
        </>
      )}

      {/* Formula Reference */}
      <div className="border-t border-white/[0.06] px-4 py-2">
        <p className="text-[10px] text-slate-500 font-mono">
          Data from backend: /api/v2/cpf/calculators/cpflife-estimate
        </p>
      </div>
    </div>
  )
}
