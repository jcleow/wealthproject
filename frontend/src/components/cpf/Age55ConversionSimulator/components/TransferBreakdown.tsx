'use client'

import { TrendingUp, AlertTriangle, Info } from 'lucide-react'
import { CPF_CONSTANTS } from '@/lib/cpf-constants'
import { formatCurrency } from '@/lib/format'
import type { ConversionResult } from '../hooks'

interface TransferBreakdownProps {
  result: ConversionResult
}

export function TransferBreakdown({ result }: TransferBreakdownProps) {
  return (
    <>
      <div className="rounded-xl border border-white/[0.08] bg-[#0a0a0a] p-5">
        <h4 className="mb-4 flex items-center gap-2 text-sm font-medium text-white">
          <TrendingUp className="h-4 w-4 text-slate-400" />
          Transfer Breakdown
        </h4>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg bg-purple-500/10 p-3">
            <p className="text-xs text-slate-400">SA → RA</p>
            <p className="font-mono text-lg font-medium text-purple-400">
              {formatCurrency(result.saToRa)}
            </p>
          </div>
          <div className="rounded-lg bg-blue-500/10 p-3">
            <p className="text-xs text-slate-400">OA → RA</p>
            <p className="font-mono text-lg font-medium text-blue-400">
              {formatCurrency(result.oaToRa)}
            </p>
          </div>
          {result.maOverflow > 0 && (
            <div className="rounded-lg bg-cyan-500/10 p-3">
              <p className="text-xs text-slate-400">MA Overflow → RA</p>
              <p className="font-mono text-lg font-medium text-cyan-400">
                {formatCurrency(result.maOverflow)}
              </p>
            </div>
          )}
          {result.cashTopUp > 0 && (
            <div className="rounded-lg bg-orange-500/10 p-3">
              <p className="text-xs text-slate-400">Cash Top-up → RA</p>
              <p className="font-mono text-lg font-medium text-orange-400">
                {formatCurrency(result.cashTopUp)}
              </p>
            </div>
          )}
        </div>

        {result.shortfall > 0 && (
          <div className="mt-4 flex items-start gap-2 rounded-lg border border-amber-500/20 bg-amber-500/10 p-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-400" />
            <p className="text-xs text-amber-200">
              You need an additional {formatCurrency(result.shortfall)} cash
              top-up to reach the Enhanced Retirement Sum.
            </p>
          </div>
        )}
      </div>

      {/* Educational Footer */}
      <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4">
        <div className="flex items-start gap-3">
          <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-400" />
          <div className="space-y-2 text-xs text-slate-400">
            <p>
              <strong className="text-slate-300">
                How RA Formation Works:
              </strong>{' '}
              At age 55, your SA transfers first (up to your target), then OA
              fills any remaining gap. If your MA exceeds the Basic Healthcare
              Sum ({formatCurrency(CPF_CONSTANTS.BHS)}), the excess flows to RA.
            </p>
            <p>
              <strong className="text-slate-300">For ERS:</strong> Auto-transfer
              is capped at FRS ({formatCurrency(CPF_CONSTANTS.FRS)}). The
              remaining{' '}
              {formatCurrency(CPF_CONSTANTS.ERS - CPF_CONSTANTS.FRS)} requires a
              cash top-up via RSTU (Retirement Sum Topping-Up Scheme).
            </p>
            <p>
              <strong className="text-slate-300">CPF LIFE vs RSS:</strong> If
              your RA at age 65 is at least {formatCurrency(CPF_CONSTANTS.MRS)},
              you&apos;ll receive lifelong payouts via CPF LIFE. Below that,
              you&apos;ll be on RSS (drawdown until depleted).
            </p>
          </div>
        </div>
      </div>
    </>
  )
}
