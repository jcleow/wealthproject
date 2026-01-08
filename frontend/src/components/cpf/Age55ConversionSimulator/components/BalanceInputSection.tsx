'use client'

import { CPF_COLORS } from '@/lib/cpf-constants'
import { formatCurrency } from '@/lib/format'
import { CurrencyInput } from '@/components/ui/CurrencyInput'

type InputMode = 'current' | 'manual'

interface BalanceInputSectionProps {
  inputMode: InputMode
  currentAge: number
  setCurrentAge: (age: number) => void
  currentOA: number
  setCurrentOA: (val: number) => void
  currentSA: number
  setCurrentSA: (val: number) => void
  currentMA: number
  setCurrentMA: (val: number) => void
  manualOA: number
  setManualOA: (val: number) => void
  manualSA: number
  setManualSA: (val: number) => void
  manualMA: number
  setManualMA: (val: number) => void
  balancesAt55: { oa: number; sa: number; ma: number }
}

export function BalanceInputSection({
  inputMode,
  currentAge,
  setCurrentAge,
  currentOA,
  setCurrentOA,
  currentSA,
  setCurrentSA,
  currentMA,
  setCurrentMA,
  manualOA,
  setManualOA,
  manualSA,
  setManualSA,
  manualMA,
  setManualMA,
  balancesAt55,
}: BalanceInputSectionProps) {
  return (
    <div className="rounded-xl border border-white/[0.08] bg-[#0a0a0a] p-5">
      <h4 className="mb-4 text-sm font-medium text-white">
        {inputMode === 'current'
          ? 'Current CPF Balances'
          : 'Expected Balances at Age 55'}
      </h4>

      {inputMode === 'current' && (
        <div className="mb-4">
          <label className="mb-1 block text-xs text-slate-400">
            Current Age
          </label>
          <input
            type="number"
            value={currentAge}
            onChange={(e) =>
              setCurrentAge(Math.min(54, Math.max(20, Number(e.target.value))))
            }
            className="w-full rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-2 text-sm text-white focus:border-white/20 focus:outline-none"
            min={20}
            max={54}
          />
          <p className="mt-1 text-xs text-slate-500">
            {55 - currentAge} years until age 55
          </p>
        </div>
      )}

      <div className="space-y-3">
        {/* OA Input */}
        <div>
          <label className="mb-1 flex items-center gap-2 text-xs text-slate-400">
            <div
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: CPF_COLORS.oa }}
            />
            Ordinary Account (OA)
          </label>
          <CurrencyInput
            value={inputMode === 'current' ? currentOA : manualOA}
            onChange={inputMode === 'current' ? setCurrentOA : setManualOA}
            size="sm"
          />
        </div>

        {/* SA Input */}
        <div>
          <label className="mb-1 flex items-center gap-2 text-xs text-slate-400">
            <div
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: CPF_COLORS.sa }}
            />
            Special Account (SA)
          </label>
          <CurrencyInput
            value={inputMode === 'current' ? currentSA : manualSA}
            onChange={inputMode === 'current' ? setCurrentSA : setManualSA}
            size="sm"
          />
        </div>

        {/* MA Input */}
        <div>
          <label className="mb-1 flex items-center gap-2 text-xs text-slate-400">
            <div
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: CPF_COLORS.ma }}
            />
            MediSave Account (MA)
          </label>
          <CurrencyInput
            value={inputMode === 'current' ? currentMA : manualMA}
            onChange={inputMode === 'current' ? setCurrentMA : setManualMA}
            size="sm"
          />
        </div>
      </div>

      {/* Projected balances (shown in current mode) */}
      {inputMode === 'current' && (
        <div className="mt-4 rounded-lg border border-amber-500/20 bg-amber-500/10 p-3">
          <p className="mb-2 text-xs font-medium text-amber-300">
            Projected balances at age 55 (with interest)
          </p>
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div>
              <p className="text-slate-400">OA</p>
              <p className="font-mono text-blue-400">
                {formatCurrency(balancesAt55.oa)}
              </p>
            </div>
            <div>
              <p className="text-slate-400">SA</p>
              <p className="font-mono text-purple-400">
                {formatCurrency(balancesAt55.sa)}
              </p>
            </div>
            <div>
              <p className="text-slate-400">MA</p>
              <p className="font-mono text-teal-400">
                {formatCurrency(balancesAt55.ma)}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
