'use client'

import { CheckCircle2, AlertTriangle } from 'lucide-react'
import { CPF_CONSTANTS, type TargetSum } from '@/lib/cpf-constants'
import { formatCurrency } from '@/lib/format'
import type { ConversionResult } from '../hooks'

interface ResultsCardsProps {
  result: ConversionResult
  targetSum: TargetSum
}

export function ResultsCards({ result, targetSum }: ResultsCardsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {/* RA Balance */}
      <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4">
        <p className="mb-1 text-xs text-amber-300">Retirement Account at 55</p>
        <p className="font-mono text-2xl font-semibold text-amber-400">
          {formatCurrency(result.raTotal)}
        </p>
        <p className="mt-1 text-xs text-slate-400">
          {((result.raTotal / CPF_CONSTANTS[targetSum]) * 100).toFixed(0)}% of{' '}
          {targetSum} target
        </p>
      </div>

      {/* Withdrawable */}
      <div className="rounded-xl border border-green-500/20 bg-green-500/10 p-4">
        <p className="mb-1 text-xs text-green-300">Withdrawable (Optional)</p>
        <p className="font-mono text-2xl font-semibold text-green-400">
          {formatCurrency(result.withdrawable)}
        </p>
        <p className="mt-1 text-xs text-slate-400">
          Excess above your {targetSum} target
        </p>
      </div>

      {/* CPF LIFE Indicator */}
      <div
        className={`rounded-xl border p-4 ${
          result.qualifiesForCPFLife
            ? 'border-emerald-500/20 bg-emerald-500/10'
            : 'border-red-500/20 bg-red-500/10'
        }`}
      >
        <p
          className={`mb-1 text-xs ${
            result.qualifiesForCPFLife ? 'text-emerald-300' : 'text-red-300'
          }`}
        >
          Projected RA at 65
        </p>
        <p
          className={`font-mono text-2xl font-semibold ${
            result.qualifiesForCPFLife ? 'text-emerald-400' : 'text-red-400'
          }`}
        >
          {formatCurrency(result.raAt65)}
        </p>
        <div className="mt-2 flex items-center gap-1.5">
          {result.qualifiesForCPFLife ? (
            <>
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              <span className="text-xs text-emerald-300">
                Eligible for CPF LIFE
              </span>
            </>
          ) : (
            <>
              <AlertTriangle className="h-4 w-4 text-red-400" />
              <span className="text-xs text-red-300">
                RSS only (below ${formatCurrency(CPF_CONSTANTS.MRS)} minimum)
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
