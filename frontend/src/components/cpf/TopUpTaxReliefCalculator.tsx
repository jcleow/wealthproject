'use client'

import { useState, useMemo } from 'react'
import { Calculator, ArrowRight, Info, AlertCircle } from 'lucide-react'

import { formatCurrency } from '@/lib/format'
import { CurrencyInput } from '@/components/ui/CurrencyInput'
import { calculateMockRSTU, calculateMockOAtoSATransfer, CPF_LIMITS } from '@/lib/cpf-mock-data'
import { useTheme } from '@/lib/theme'
import type { CPFProfile } from '@/types/cpf'

interface TopUpTaxReliefCalculatorProps {
  profile: CPFProfile
  className?: string
}

export function TopUpTaxReliefCalculator({ profile, className }: TopUpTaxReliefCalculatorProps) {
  const [activeTab, setActiveTab] = useState<'rstu' | 'transfer'>('rstu')
  const { theme, isMonet } = useTheme()

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Tab Selector */}
      <div
        className="flex rounded-lg p-1"
        style={{
          background: isMonet ? theme.controlBg : '#0a0a0a',
          border: `1px solid ${theme.controlBorder}`,
        }}
      >
        <button
          onClick={() => setActiveTab('rstu')}
          className="flex-1 rounded-md px-4 py-2.5 text-sm font-medium transition"
          style={{
            background: activeTab === 'rstu'
              ? isMonet ? 'rgba(127, 178, 133, 0.15)' : 'rgba(52, 211, 153, 0.2)'
              : 'transparent',
            color: activeTab === 'rstu'
              ? theme.sage
              : theme.textMuted,
          }}
        >
          RSTU Tax Relief
        </button>
        <button
          onClick={() => setActiveTab('transfer')}
          className="flex-1 rounded-md px-4 py-2.5 text-sm font-medium transition"
          style={{
            background: activeTab === 'transfer'
              ? isMonet ? 'rgba(123, 163, 201, 0.15)' : 'rgba(96, 165, 250, 0.2)'
              : 'transparent',
            color: activeTab === 'transfer'
              ? theme.blue
              : theme.textMuted,
          }}
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
  const [selfTopUp, setSelfTopUp] = useState(0)
  const [familyTopUp, setFamilyTopUp] = useState(0)
  const { theme, isMonet } = useTheme()

  const annualIncome = profile.monthlyIncome * 12 + profile.annualBonus

  const result = useMemo(() => {
    return calculateMockRSTU(selfTopUp, familyTopUp, annualIncome)
  }, [selfTopUp, familyTopUp, annualIncome])

  return (
    <div className="space-y-6">
      {/* Info Banner */}
      <div
        className="p-4 rounded-xl"
        style={{
          background: isMonet ? 'rgba(127, 178, 133, 0.08)' : 'rgba(52, 211, 153, 0.05)',
          border: `1px solid ${isMonet ? 'rgba(127, 178, 133, 0.2)' : 'rgba(52, 211, 153, 0.2)'}`,
        }}
      >
        <div className="flex items-start gap-3">
          <Info className="mt-0.5 h-4 w-4 flex-shrink-0" style={{ color: theme.sage }} />
          <div className="text-xs" style={{ color: theme.textSecondary }}>
            <p className="font-medium" style={{ color: isMonet ? theme.sageDark : theme.sageLight }}>
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
      <div
        className="rounded-xl p-5"
        style={{
          background: isMonet ? theme.cardBg : '#0a0a0a',
          border: `1px solid ${theme.cardBorder}`,
        }}
      >
        <h3 className="mb-4 text-sm font-medium" style={{ color: theme.textSecondary }}>
          Calculate Your Tax Relief
        </h3>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="text-xs" style={{ color: theme.textMuted }}>Self Top-up Amount</label>
            <CurrencyInput
              value={selfTopUp}
              onChange={setSelfTopUp}
              placeholder="0"
              size="sm"
            />
            <p className="text-xs" style={{ color: theme.textMuted }}>
              Max relief: ${CPF_LIMITS.rstuSelfCap.toLocaleString()}
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-xs" style={{ color: theme.textMuted }}>Family Top-up Amount</label>
            <CurrencyInput
              value={familyTopUp}
              onChange={setFamilyTopUp}
              placeholder="0"
              size="sm"
            />
            <p className="text-xs" style={{ color: theme.textMuted }}>
              Max relief: ${CPF_LIMITS.rstuFamilyCap.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Your Income Info */}
        <div
          className="mt-4 rounded-lg p-3"
          style={{
            background: theme.surfaceBg,
          }}
        >
          <div className="flex items-center justify-between text-xs">
            <span style={{ color: theme.textMuted }}>Your estimated annual income</span>
            <span className="font-medium" style={{ color: theme.textPrimary }}>
              {formatCurrency(annualIncome)}
            </span>
          </div>
          <div className="mt-1 flex items-center justify-between text-xs">
            <span style={{ color: theme.textMuted }}>Marginal tax rate</span>
            <span className="font-medium" style={{ color: theme.amber }}>
              {(result.marginalTaxRate * 100).toFixed(1)}%
            </span>
          </div>
        </div>
      </div>

      {/* Results */}
      <div
        className="rounded-xl p-5"
        style={{
          background: isMonet ? theme.cardBg : '#0a0a0a',
          border: `1px solid ${theme.cardBorder}`,
        }}
      >
        <div className="flex items-center gap-2 mb-4">
          <Calculator className="h-4 w-4" style={{ color: theme.sage }} />
          <h3 className="text-sm font-medium" style={{ color: theme.textSecondary }}>Tax Relief Summary</h3>
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
          <div
            className="p-4 rounded-lg"
            style={{
              background: isMonet ? 'rgba(127, 178, 133, 0.1)' : 'rgba(52, 211, 153, 0.1)',
              border: `1px solid ${isMonet ? 'rgba(127, 178, 133, 0.3)' : 'rgba(52, 211, 153, 0.3)'}`,
            }}
          >
            <p className="text-xs" style={{ color: isMonet ? theme.sageDark : theme.sageLight }}>
              Total Tax Savings
            </p>
            <p className="mt-1 text-2xl font-semibold" style={{ color: theme.sage }}>
              {formatCurrency(result.taxSavings)}
            </p>
            <p
              className="mt-1 text-xs"
              style={{ color: isMonet ? 'rgba(90, 138, 94, 0.7)' : 'rgba(52, 211, 153, 0.7)' }}
            >
              On {formatCurrency(result.totalRelief)} relief
            </p>
          </div>
        </div>

        {/* Optimization Tips */}
        {result.selfReliefRemaining > 0 && (
          <div
            className="flex items-start mt-4 gap-3 p-3 rounded-lg"
            style={{
              background: isMonet ? 'rgba(123, 163, 201, 0.08)' : 'rgba(96, 165, 250, 0.05)',
            }}
          >
            <Info className="mt-0.5 h-4 w-4 flex-shrink-0" style={{ color: theme.blue }} />
            <p className="text-xs" style={{ color: theme.textSecondary }}>
              <span className="font-medium" style={{ color: theme.blueLight }}>Tip: </span>
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
  const [transferAmount, setTransferAmount] = useState(0)
  const { theme, isMonet } = useTheme()

  const result = useMemo(() => {
    return calculateMockOAtoSATransfer(
      profile.balances.oa,
      profile.balances.sa,
      profile.age,
      transferAmount
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
      <div
        className="rounded-xl p-4"
        style={{
          background: isMonet ? 'rgba(212, 165, 116, 0.08)' : 'rgba(251, 191, 36, 0.05)',
          border: `1px solid ${isMonet ? 'rgba(212, 165, 116, 0.2)' : 'rgba(251, 191, 36, 0.2)'}`,
        }}
      >
        <div className="flex items-start gap-3">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" style={{ color: theme.amber }} />
          <div className="text-xs" style={{ color: theme.textSecondary }}>
            <p className="font-medium" style={{ color: isMonet ? theme.amber : theme.amberLight }}>
              One-Way Transfer
            </p>
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
        <div
          className="rounded-xl p-4"
          style={{
            background: isMonet ? theme.cardBg : '#0a0a0a',
            border: `1px solid ${theme.cardBorder}`,
          }}
        >
          <p className="text-xs" style={{ color: theme.textMuted }}>Current OA Balance</p>
          <p className="mt-1 text-xl font-semibold" style={{ color: theme.blue }}>
            {formatCurrency(profile.balances.oa)}
          </p>
          <p className="mt-1 text-xs" style={{ color: theme.textMuted }}>Earns 2.5% p.a.</p>
        </div>
        <div
          className="rounded-xl p-4"
          style={{
            background: isMonet ? theme.cardBg : '#0a0a0a',
            border: `1px solid ${theme.cardBorder}`,
          }}
        >
          <p className="text-xs" style={{ color: theme.textMuted }}>Current SA Balance</p>
          <p className="mt-1 text-xl font-semibold" style={{ color: theme.sage }}>
            {formatCurrency(profile.balances.sa)}
          </p>
          <p className="mt-1 text-xs" style={{ color: theme.textMuted }}>Earns 4.0% p.a.</p>
        </div>
      </div>

      {/* Transfer Calculator */}
      <div
        className="rounded-xl p-5"
        style={{
          background: isMonet ? theme.cardBg : '#0a0a0a',
          border: `1px solid ${theme.cardBorder}`,
        }}
      >
        <h3 className="mb-4 text-sm font-medium" style={{ color: theme.textSecondary }}>
          Transfer Calculator
        </h3>

        {!result.allowed ? (
          <div
            className="rounded-lg p-4 text-center"
            style={{
              background: isMonet ? 'rgba(232, 168, 152, 0.1)' : 'rgba(244, 63, 94, 0.1)',
            }}
          >
            <AlertCircle
              className="mx-auto h-8 w-8"
              style={{ color: isMonet ? theme.coralRose : '#fb7185' }}
            />
            <p
              className="mt-2 text-sm font-medium"
              style={{ color: isMonet ? theme.coralRose : '#fda4af' }}
            >
              {result.blockedReason}
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs" style={{ color: theme.textMuted }}>Transfer Amount</label>
                <span className="text-xs" style={{ color: theme.sage }}>
                  Max: {formatCurrency(result.maxTransferable)}
                </span>
              </div>
              <CurrencyInput
                value={transferAmount}
                onChange={setTransferAmount}
                placeholder="0"
                maxValue={result.maxTransferable}
                size="sm"
              />
              <p className="text-xs" style={{ color: theme.textMuted }}>
                FRS limit: {formatCurrency(CPF_LIMITS.frs2024)} − Your SA:{' '}
                {formatCurrency(profile.balances.sa)} = {formatCurrency(result.maxTransferable)}{' '}
                transferable
              </p>
            </div>

            {/* Transfer Preview */}
            {result.actualTransfer > 0 && (
              <div className="mt-6">
                <div
                  className="flex items-center justify-between p-4 rounded-lg"
                  style={{
                    background: theme.surfaceBg,
                  }}
                >
                  <div className="text-center">
                    <p className="text-xs" style={{ color: theme.textMuted }}>From OA</p>
                    <p className="text-lg font-semibold" style={{ color: theme.blue }}>
                      {formatCurrency(profile.balances.oa)}
                    </p>
                    <p
                      className="text-xs"
                      style={{ color: isMonet ? theme.coralRose : '#fb7185' }}
                    >
                      −{formatCurrency(result.actualTransfer)}
                    </p>
                  </div>

                  <ArrowRight className="h-6 w-6" style={{ color: theme.textMuted }} />

                  <div className="text-center">
                    <p className="text-xs" style={{ color: theme.textMuted }}>To SA</p>
                    <p className="text-lg font-semibold" style={{ color: theme.sage }}>
                      {formatCurrency(profile.balances.sa)}
                    </p>
                    <p className="text-xs" style={{ color: theme.sage }}>
                      +{formatCurrency(result.actualTransfer)}
                    </p>
                  </div>
                </div>

                {/* Benefits */}
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div
                    className="rounded-lg p-3"
                    style={{
                      background: theme.surfaceBg,
                      border: `1px solid ${theme.surfaceBorder}`,
                    }}
                  >
                    <p className="text-xs" style={{ color: theme.textMuted }}>
                      Extra Interest Earned (Year 1)
                    </p>
                    <p className="mt-1 text-lg font-semibold" style={{ color: theme.sage }}>
                      +{formatCurrency(interestDifferential)}
                    </p>
                    <p className="text-xs" style={{ color: theme.textMuted }}>
                      1.5% differential (4% vs 2.5%)
                    </p>
                  </div>
                  <div
                    className="rounded-lg p-3"
                    style={{
                      background: theme.surfaceBg,
                      border: `1px solid ${theme.surfaceBorder}`,
                    }}
                  >
                    <p className="text-xs" style={{ color: theme.textMuted }}>Tax Relief Eligible</p>
                    <p className="mt-1 text-lg font-semibold" style={{ color: theme.amber }}>
                      {formatCurrency(Math.min(result.taxReliefEligible, CPF_LIMITS.rstuSelfCap))}
                    </p>
                    <p className="text-xs" style={{ color: theme.textMuted }}>
                      Under RSTU scheme (up to $8K)
                    </p>
                  </div>
                </div>

                {result.warnings.length > 0 && (
                  <div
                    className="mt-4 rounded-lg p-3"
                    style={{
                      background: isMonet ? 'rgba(212, 165, 116, 0.1)' : 'rgba(251, 191, 36, 0.1)',
                    }}
                  >
                    {result.warnings.map((warning, i) => (
                      <p
                        key={i}
                        className="text-xs"
                        style={{ color: isMonet ? theme.amber : theme.amberLight }}
                      >
                        {warning}
                      </p>
                    ))}
                  </div>
                )}

                <button
                  className="w-full mt-4 py-2.5 rounded-lg text-sm font-medium transition"
                  style={{
                    background: theme.blue,
                    color: theme.textOnPrimary,
                  }}
                >
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
  const { theme, isMonet } = useTheme()
  const percentage = cap > 0 ? (value / cap) * 100 : 0

  return (
    <div
      className="rounded-lg p-4"
      style={{
        background: theme.surfaceBg,
        border: `1px solid ${theme.surfaceBorder}`,
      }}
    >
      <p className="text-xs" style={{ color: theme.textMuted }}>{label}</p>
      <p className="mt-1 text-xl font-semibold" style={{ color: theme.textPrimary }}>
        {formatCurrency(value)}
      </p>
      <div
        className="overflow-hidden h-1.5 w-full mt-2 rounded-full"
        style={{
          background: isMonet ? 'rgba(155, 139, 180, 0.1)' : 'rgba(255, 255, 255, 0.06)',
        }}
      >
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${percentage}%`,
            background: theme.sage,
          }}
        />
      </div>
      <p className="mt-1 text-xs" style={{ color: theme.textMuted }}>
        {formatCurrency(remaining)} remaining of ${cap.toLocaleString()} cap
      </p>
    </div>
  )
}
