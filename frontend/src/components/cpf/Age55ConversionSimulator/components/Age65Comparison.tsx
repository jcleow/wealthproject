'use client'

import { Calendar, Infinity, Clock } from 'lucide-react'
import { CPF_CONSTANTS } from '@/lib/cpf-constants'
import { formatCurrency } from '@/lib/format'
import type { ConversionResult } from '../hooks'

interface Age65ComparisonProps {
  result: ConversionResult
}

export function Age65Comparison({ result }: Age65ComparisonProps) {
  return (
    <div className="rounded-xl border border-white/[0.08] bg-[#0a0a0a] p-5">
      <h4 className="mb-4 flex items-center gap-2 text-sm font-medium text-white">
        <Calendar className="h-4 w-4 text-purple-400" />
        At Age 65: Retirement Payout Scheme
      </h4>

      <div className="grid gap-4 md:grid-cols-2">
        {/* CPF LIFE Option */}
        <div
          className={`rounded-xl border p-4 ${
            result.qualifiesForCPFLife
              ? 'border-emerald-500/30 bg-emerald-500/10'
              : 'border-white/[0.06] bg-white/[0.02] opacity-60'
          }`}
        >
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Infinity className="h-4 w-4 text-emerald-400" />
              <span className="text-sm font-medium text-white">CPF LIFE</span>
            </div>
            {result.qualifiesForCPFLife ? (
              <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs text-emerald-400">
                Eligible
              </span>
            ) : (
              <span className="rounded-full bg-slate-500/20 px-2 py-0.5 text-xs text-slate-400">
                Not Eligible
              </span>
            )}
          </div>
          <p className="mb-3 text-xs text-slate-400">
            Lifelong monthly payouts that never run out, regardless of how long
            you live.
          </p>
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">Minimum RA required</span>
              <span className="font-mono text-slate-300">
                {formatCurrency(CPF_CONSTANTS.MRS)}
              </span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">Your projected RA at 65</span>
              <span
                className={`font-mono ${result.qualifiesForCPFLife ? 'text-emerald-400' : 'text-red-400'}`}
              >
                {formatCurrency(result.raAt65)}
              </span>
            </div>
            {result.qualifiesForCPFLife && (
              <div className="mt-2 rounded-lg bg-emerald-500/10 p-2">
                <p className="text-xs text-emerald-300">
                  ✓ You qualify for CPF LIFE! Visit the CPF website to estimate
                  your monthly payouts based on your chosen plan (Standard,
                  Basic, or Escalating).
                </p>
              </div>
            )}
          </div>
        </div>

        {/* RSS Option */}
        <div
          className={`rounded-xl border p-4 ${
            !result.qualifiesForCPFLife
              ? 'border-red-500/30 bg-red-500/10'
              : 'border-white/[0.06] bg-white/[0.02] opacity-60'
          }`}
        >
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-red-400" />
              <span className="text-sm font-medium text-white">
                RSS (Retirement Sum Scheme)
              </span>
            </div>
            {!result.qualifiesForCPFLife ? (
              <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-xs text-red-400">
                Your Scheme
              </span>
            ) : (
              <span className="rounded-full bg-slate-500/20 px-2 py-0.5 text-xs text-slate-400">
                N/A
              </span>
            )}
          </div>
          <p className="mb-3 text-xs text-slate-400">
            Monthly drawdown from your RA until it&apos;s depleted. Payouts stop
            when funds run out.
          </p>
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">Estimated monthly payout</span>
              <span className="font-mono text-slate-300">
                {formatCurrency(result.rssMonthlyPayout)}
              </span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">Estimated duration</span>
              <span className="font-mono text-slate-300">
                ~{Math.round(result.rssYearsOfPayout)} years
              </span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">Funds depleted by age</span>
              <span className="font-mono text-slate-300">
                ~{Math.round(result.rssDepletionAge)}
              </span>
            </div>
            {!result.qualifiesForCPFLife && (
              <div className="mt-2 rounded-lg bg-amber-500/10 p-2">
                <p className="text-xs text-amber-300">
                  ⚠️ Consider topping up your RA to at least{' '}
                  {formatCurrency(CPF_CONSTANTS.MRS)} by age 65 to qualify for
                  CPF LIFE&apos;s lifelong payouts.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Gap to CPF LIFE */}
      {!result.qualifiesForCPFLife && (
        <div className="mt-4 rounded-lg border border-purple-500/20 bg-purple-500/10 p-3">
          <p className="text-xs text-purple-200">
            <strong>To qualify for CPF LIFE:</strong> You need an additional{' '}
            <span className="font-mono font-semibold">
              {formatCurrency(CPF_CONSTANTS.MRS - result.raAt65)}
            </span>{' '}
            in your RA by age 65. Consider RSTU top-ups or voluntary
            contributions to close this gap.
          </p>
        </div>
      )}
    </div>
  )
}
