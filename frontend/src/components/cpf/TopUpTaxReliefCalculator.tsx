'use client'

import { useState, useMemo } from 'react'
import { Calculator, ArrowRight, Info, AlertCircle } from 'lucide-react'

import { formatCurrency } from '@/lib/format'
import { calculateMockRSTU, calculateMockOAtoSATransfer, CPF_LIMITS } from '@/lib/cpf-mock-data'
import type { CPFProfile } from '@/types/cpf'

interface TopUpTaxReliefCalculatorProps {
  profile: CPFProfile
  className?: string
}

export function TopUpTaxReliefCalculator({ profile, className }: TopUpTaxReliefCalculatorProps) {
  const [activeTab, setActiveTab] = useState<'rstu' | 'transfer'>('rstu')

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Tab Selector */}
      <div className="flex rounded-lg border border-white/[0.08] bg-[#0a0a0a] p-1">
        <button
          onClick={() => setActiveTab('rstu')}
          className={`flex-1 rounded-md px-4 py-2.5 text-sm font-medium transition ${
            activeTab === 'rstu'
              ? 'bg-emerald-500/20 text-emerald-400'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          RSTU Tax Relief
        </button>
        <button
          onClick={() => setActiveTab('transfer')}
          className={`flex-1 rounded-md px-4 py-2.5 text-sm font-medium transition ${
            activeTab === 'transfer'
              ? 'bg-blue-500/20 text-blue-400'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          OA to SA Transfer
        </button>
      </div>

      {activeTab === 'rstu' ? (
        <RSTUCalculator profile={profile} />
      ) : (
        <OAtoSATransfer profile={profile} />
      )}
    </div>
  )
}

function RSTUCalculator({ profile }: { profile: CPFProfile }) {
  const [selfTopUp, setSelfTopUp] = useState('')
  const [familyTopUp, setFamilyTopUp] = useState('')

  const annualIncome = profile.monthlyIncome * 12 + profile.annualBonus

  const result = useMemo(() => {
    const self = parseFloat(selfTopUp) || 0
    const family = parseFloat(familyTopUp) || 0
    return calculateMockRSTU(self, family, annualIncome)
  }, [selfTopUp, familyTopUp, annualIncome])

  return (
    <div className="space-y-6">
      {/* Info Banner */}
      <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
        <div className="flex items-start gap-3">
          <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-400" />
          <div className="text-xs text-slate-300">
            <p className="font-medium text-emerald-300">
              Retirement Sum Topping-Up (RSTU) Scheme
            </p>
            <p className="mt-1">
              Top up your SA/RA (or your family members&apos;) to enjoy tax relief of up to $16,000
              per year ($8,000 self + $8,000 family).
            </p>
          </div>
        </div>
      </div>

      {/* Input Form */}
      <div className="rounded-xl border border-white/[0.08] bg-[#0a0a0a] p-5">
        <h3 className="mb-4 text-sm font-medium text-slate-300">Calculate Your Tax Relief</h3>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="text-xs text-slate-400">Self Top-up Amount</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</span>
              <input
                type="number"
                value={selfTopUp}
                onChange={(e) => setSelfTopUp(e.target.value)}
                placeholder="0"
                className="w-full rounded-lg border border-white/[0.08] bg-white/[0.02] py-2.5 pl-8 pr-4 text-sm text-white placeholder:text-slate-600 focus:border-emerald-500/50 focus:outline-none"
              />
            </div>
            <p className="text-xs text-slate-500">
              Max relief: ${CPF_LIMITS.rstuSelfCap.toLocaleString()}
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-xs text-slate-400">Family Top-up Amount</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</span>
              <input
                type="number"
                value={familyTopUp}
                onChange={(e) => setFamilyTopUp(e.target.value)}
                placeholder="0"
                className="w-full rounded-lg border border-white/[0.08] bg-white/[0.02] py-2.5 pl-8 pr-4 text-sm text-white placeholder:text-slate-600 focus:border-emerald-500/50 focus:outline-none"
              />
            </div>
            <p className="text-xs text-slate-500">
              Max relief: ${CPF_LIMITS.rstuFamilyCap.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Your Income Info */}
        <div className="mt-4 rounded-lg bg-white/[0.02] p-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400">Your estimated annual income</span>
            <span className="font-medium text-white">{formatCurrency(annualIncome)}</span>
          </div>
          <div className="mt-1 flex items-center justify-between text-xs">
            <span className="text-slate-400">Marginal tax rate</span>
            <span className="font-medium text-amber-400">
              {(result.marginalTaxRate * 100).toFixed(1)}%
            </span>
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="rounded-xl border border-white/[0.08] bg-[#0a0a0a] p-5">
        <div className="flex items-center gap-2 mb-4">
          <Calculator className="h-4 w-4 text-emerald-400" />
          <h3 className="text-sm font-medium text-slate-300">Tax Relief Summary</h3>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <ResultCard
            label="Self Relief"
            value={result.selfRelief}
            remaining={result.selfReliefRemaining}
            cap={CPF_LIMITS.rstuSelfCap}
          />
          <ResultCard
            label="Family Relief"
            value={result.familyRelief}
            remaining={result.familyReliefRemaining}
            cap={CPF_LIMITS.rstuFamilyCap}
          />
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4">
            <p className="text-xs text-emerald-300">Total Tax Savings</p>
            <p className="mt-1 text-2xl font-semibold text-emerald-400">
              {formatCurrency(result.taxSavings)}
            </p>
            <p className="mt-1 text-xs text-emerald-300/70">
              On {formatCurrency(result.totalRelief)} relief
            </p>
          </div>
        </div>

        {/* Optimization Tips */}
        {result.selfReliefRemaining > 0 && (
          <div className="mt-4 flex items-start gap-3 rounded-lg bg-blue-500/5 p-3">
            <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-400" />
            <p className="text-xs text-slate-300">
              <span className="font-medium text-blue-300">Tip: </span>
              You can still top up {formatCurrency(result.selfReliefRemaining)} to your SA/RA to
              maximize your tax relief this year.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

function OAtoSATransfer({ profile }: { profile: CPFProfile }) {
  const [transferAmount, setTransferAmount] = useState('')

  const result = useMemo(() => {
    const amount = parseFloat(transferAmount) || 0
    return calculateMockOAtoSATransfer(
      profile.balances.oa,
      profile.balances.sa,
      profile.age,
      amount
    )
  }, [transferAmount, profile])

  const interestDifferential = useMemo(() => {
    const amount = result.actualTransfer
    // SA earns 4%, OA earns 2.5%, difference is 1.5%
    return amount * 0.015
  }, [result.actualTransfer])

  return (
    <div className="space-y-6">
      {/* Warning Banner */}
      <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-400" />
          <div className="text-xs text-slate-300">
            <p className="font-medium text-amber-300">One-Way Transfer</p>
            <p className="mt-1">
              OA to SA transfers are <strong>irreversible</strong>. Once transferred, funds cannot
              be moved back to OA. SA funds can only be used for retirement and approved
              investments, not housing.
            </p>
          </div>
        </div>
      </div>

      {/* Current Balances */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-white/[0.08] bg-[#0a0a0a] p-4">
          <p className="text-xs text-slate-400">Current OA Balance</p>
          <p className="mt-1 text-xl font-semibold text-blue-400">
            {formatCurrency(profile.balances.oa)}
          </p>
          <p className="mt-1 text-xs text-slate-500">Earns 2.5% p.a.</p>
        </div>
        <div className="rounded-xl border border-white/[0.08] bg-[#0a0a0a] p-4">
          <p className="text-xs text-slate-400">Current SA Balance</p>
          <p className="mt-1 text-xl font-semibold text-emerald-400">
            {formatCurrency(profile.balances.sa)}
          </p>
          <p className="mt-1 text-xs text-slate-500">Earns 4.0% p.a.</p>
        </div>
      </div>

      {/* Transfer Calculator */}
      <div className="rounded-xl border border-white/[0.08] bg-[#0a0a0a] p-5">
        <h3 className="mb-4 text-sm font-medium text-slate-300">Transfer Calculator</h3>

        {!result.allowed ? (
          <div className="rounded-lg bg-rose-500/10 p-4 text-center">
            <AlertCircle className="mx-auto h-8 w-8 text-rose-400" />
            <p className="mt-2 text-sm font-medium text-rose-300">{result.blockedReason}</p>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs text-slate-400">Transfer Amount</label>
                <span className="text-xs text-emerald-400">
                  Max: {formatCurrency(result.maxTransferable)}
                </span>
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</span>
                <input
                  type="number"
                  value={transferAmount}
                  onChange={(e) => setTransferAmount(e.target.value)}
                  placeholder="0"
                  max={result.maxTransferable}
                  className="w-full rounded-lg border border-white/[0.08] bg-white/[0.02] py-2.5 pl-8 pr-4 text-sm text-white placeholder:text-slate-600 focus:border-blue-500/50 focus:outline-none"
                />
              </div>
              <p className="text-xs text-slate-500">
                FRS limit: {formatCurrency(CPF_LIMITS.frs2024)} − Your SA:{' '}
                {formatCurrency(profile.balances.sa)} = {formatCurrency(result.maxTransferable)}{' '}
                transferable
              </p>
            </div>

            {/* Transfer Preview */}
            {result.actualTransfer > 0 && (
              <div className="mt-6">
                <div className="flex items-center justify-between rounded-lg bg-white/[0.02] p-4">
                  <div className="text-center">
                    <p className="text-xs text-slate-400">From OA</p>
                    <p className="text-lg font-semibold text-blue-400">
                      {formatCurrency(profile.balances.oa)}
                    </p>
                    <p className="text-xs text-rose-400">
                      −{formatCurrency(result.actualTransfer)}
                    </p>
                  </div>

                  <ArrowRight className="h-6 w-6 text-slate-500" />

                  <div className="text-center">
                    <p className="text-xs text-slate-400">To SA</p>
                    <p className="text-lg font-semibold text-emerald-400">
                      {formatCurrency(profile.balances.sa)}
                    </p>
                    <p className="text-xs text-emerald-400">
                      +{formatCurrency(result.actualTransfer)}
                    </p>
                  </div>
                </div>

                {/* Benefits */}
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
                    <p className="text-xs text-slate-400">Extra Interest Earned (Year 1)</p>
                    <p className="mt-1 text-lg font-semibold text-emerald-400">
                      +{formatCurrency(interestDifferential)}
                    </p>
                    <p className="text-xs text-slate-500">1.5% differential (4% vs 2.5%)</p>
                  </div>
                  <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
                    <p className="text-xs text-slate-400">Tax Relief Eligible</p>
                    <p className="mt-1 text-lg font-semibold text-amber-400">
                      {formatCurrency(Math.min(result.taxReliefEligible, CPF_LIMITS.rstuSelfCap))}
                    </p>
                    <p className="text-xs text-slate-500">Under RSTU scheme (up to $8K)</p>
                  </div>
                </div>

                {result.warnings.length > 0 && (
                  <div className="mt-4 rounded-lg bg-amber-500/10 p-3">
                    {result.warnings.map((warning, i) => (
                      <p key={i} className="text-xs text-amber-300">
                        {warning}
                      </p>
                    ))}
                  </div>
                )}

                <button className="mt-4 w-full rounded-lg bg-blue-500 py-2.5 text-sm font-medium text-white transition hover:bg-blue-600">
                  Transfer {formatCurrency(result.actualTransfer)} to SA
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function ResultCard({
  label,
  value,
  remaining,
  cap,
}: {
  label: string
  value: number
  remaining: number
  cap: number
}) {
  const percentage = cap > 0 ? (value / cap) * 100 : 0

  return (
    <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4">
      <p className="text-xs text-slate-400">{label}</p>
      <p className="mt-1 text-xl font-semibold text-white">{formatCurrency(value)}</p>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
        <div
          className="h-full rounded-full bg-emerald-500 transition-all"
          style={{ width: `${percentage}%` }}
        />
      </div>
      <p className="mt-1 text-xs text-slate-500">
        {formatCurrency(remaining)} remaining of ${cap.toLocaleString()} cap
      </p>
    </div>
  )
}
