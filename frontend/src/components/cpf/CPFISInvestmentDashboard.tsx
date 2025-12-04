'use client'

import { useState } from 'react'
import { TrendingUp, TrendingDown, AlertTriangle, Plus, ChevronRight } from 'lucide-react'

import { formatCurrency } from '@/lib/format'
import type { CPFISInvestment, InvestibleBalance } from '@/types/cpf'
import { CPF_LIMITS } from '@/lib/cpf-mock-data'

const PRODUCT_TYPE_LABELS: Record<string, string> = {
  etf: 'ETF',
  unit_trust: 'Unit Trust',
  sgs: 'SGS Bond',
  tbill: 'T-Bill',
  stock: 'Stock',
  gold: 'Gold',
}

const PRODUCT_TYPE_COLORS: Record<string, string> = {
  etf: 'bg-blue-500',
  unit_trust: 'bg-purple-500',
  sgs: 'bg-emerald-500',
  tbill: 'bg-cyan-500',
  stock: 'bg-orange-500',
  gold: 'bg-yellow-500',
}

interface CPFISInvestmentDashboardProps {
  investments: CPFISInvestment[]
  investibleBalance: InvestibleBalance
  oaBalance: number
  saBalance: number
  className?: string
}

export function CPFISInvestmentDashboard({
  investments,
  investibleBalance,
  oaBalance,
  saBalance,
  className,
}: CPFISInvestmentDashboardProps) {
  const [selectedAccount, setSelectedAccount] = useState<'all' | 'OA' | 'SA'>('all')

  // Filter investments by account
  const filteredInvestments =
    selectedAccount === 'all'
      ? investments
      : investments.filter((inv) => inv.account === selectedAccount)

  // Calculate totals
  const totalInvested = investments.reduce((sum, inv) => sum + inv.purchasePrice, 0)
  const totalCurrentValue = investments.reduce((sum, inv) => sum + inv.currentValue, 0)
  const totalGainLoss = totalCurrentValue - totalInvested
  const totalGainLossPercent = totalInvested > 0 ? (totalGainLoss / totalInvested) * 100 : 0

  // Calculate limit usage
  const stocksUsagePercent =
    investibleBalance.oaInvestible > 0
      ? ((investibleBalance.stocksAllocated /
          (investibleBalance.oaInvestible * CPF_LIMITS.cpfisStocksLimit)) *
          100)
      : 0
  const goldUsagePercent =
    investibleBalance.oaInvestible > 0
      ? ((investibleBalance.goldAllocated /
          (investibleBalance.oaInvestible * CPF_LIMITS.cpfisGoldLimit)) *
          100)
      : 0

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Investible Balance Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <BalanceCard
          label="OA Investible"
          value={investibleBalance.oaInvestible}
          subtitle={`$${CPF_LIMITS.cpfisOAReserve.toLocaleString()} reserve required`}
          total={oaBalance}
        />
        <BalanceCard
          label="SA Investible"
          value={investibleBalance.saInvestible}
          subtitle={`$${CPF_LIMITS.cpfisSAReserve.toLocaleString()} reserve required`}
          total={saBalance}
        />
        <BalanceCard
          label="Total Invested"
          value={totalCurrentValue}
          subtitle={`Cost basis: ${formatCurrency(totalInvested)}`}
        />
        <BalanceCard
          label="Total Gain/Loss"
          value={totalGainLoss}
          subtitle={`${totalGainLossPercent >= 0 ? '+' : ''}${totalGainLossPercent.toFixed(2)}%`}
          isGainLoss
        />
      </div>

      {/* Asset Class Limits */}
      <div className="rounded-xl border border-white/[0.08] bg-[#0a0a0a] p-5">
        <h3 className="mb-4 text-sm font-medium text-slate-300">OA Investment Limits</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <LimitBar
            label="Stocks / Property Funds"
            allocated={investibleBalance.stocksAllocated}
            limit={investibleBalance.oaInvestible * CPF_LIMITS.cpfisStocksLimit}
            available={investibleBalance.stocksAvailable}
            percentage={stocksUsagePercent}
            limitLabel="35% of investible OA"
            color="bg-orange-500"
          />
          <LimitBar
            label="Gold"
            allocated={investibleBalance.goldAllocated}
            limit={investibleBalance.oaInvestible * CPF_LIMITS.cpfisGoldLimit}
            available={investibleBalance.goldAvailable}
            percentage={goldUsagePercent}
            limitLabel="10% of investible OA"
            color="bg-yellow-500"
          />
        </div>
        <p className="mt-4 text-xs text-slate-500">
          Unit trusts, ETFs, T-Bills, and SGS bonds have no percentage limit (100% of investible balance)
        </p>
      </div>

      {/* Investments List */}
      <div className="rounded-xl border border-white/[0.08] bg-[#0a0a0a]">
        <div className="flex items-center justify-between border-b border-white/[0.04] p-5">
          <h3 className="text-sm font-medium text-slate-300">Your CPFIS Investments</h3>
          <div className="flex items-center gap-2">
            {/* Account Filter */}
            <div className="flex rounded-lg border border-white/[0.08] bg-white/[0.02]">
              {(['all', 'OA', 'SA'] as const).map((account) => (
                <button
                  key={account}
                  onClick={() => setSelectedAccount(account)}
                  className={`px-3 py-1.5 text-xs font-medium transition ${
                    selectedAccount === account
                      ? 'bg-white/[0.08] text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {account === 'all' ? 'All' : account}
                </button>
              ))}
            </div>
            <button className="flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-400 transition hover:bg-emerald-500/20">
              <Plus className="h-3.5 w-3.5" />
              Add Investment
            </button>
          </div>
        </div>

        {filteredInvestments.length > 0 ? (
          <div className="divide-y divide-white/[0.04]">
            {filteredInvestments.map((investment) => (
              <InvestmentRow key={investment.id} investment={investment} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="rounded-full bg-white/[0.04] p-4">
              <TrendingUp className="h-8 w-8 text-slate-500" />
            </div>
            <p className="mt-4 text-sm text-slate-400">No investments found</p>
            <p className="mt-1 text-xs text-slate-500">
              Start investing your CPF to grow your retirement savings
            </p>
          </div>
        )}
      </div>

      {/* Approved Products Info */}
      <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-400" />
          <div className="text-xs text-slate-300">
            <p className="font-medium text-amber-300">CPFIS Approved Products Only</p>
            <p className="mt-1">
              Only invest in CPFIS-approved products. Popular choices include STI ETF, Infinity
              Global Stock Index Fund, Singapore Savings Bonds, and T-Bills. SA investments are
              limited to lower-risk products.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

// Sub-components

function BalanceCard({
  label,
  value,
  subtitle,
  total,
  isGainLoss,
}: {
  label: string
  value: number
  subtitle: string
  total?: number
  isGainLoss?: boolean
}) {
  const isPositive = value >= 0

  return (
    <div className="rounded-xl border border-white/[0.08] bg-[#0a0a0a] p-4">
      <p className="text-xs text-slate-400">{label}</p>
      <p
        className={`mt-1 text-xl font-semibold ${
          isGainLoss ? (isPositive ? 'text-emerald-400' : 'text-rose-400') : 'text-white'
        }`}
      >
        {isGainLoss && isPositive && '+'}
        {formatCurrency(value)}
      </p>
      <p className="mt-1 text-xs text-slate-500">{subtitle}</p>
      {total !== undefined && (
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
          <div
            className="h-full rounded-full bg-blue-500"
            style={{ width: `${Math.min(100, (value / total) * 100)}%` }}
          />
        </div>
      )}
    </div>
  )
}

function LimitBar({
  label,
  allocated,
  limit,
  available,
  percentage,
  limitLabel,
  color,
}: {
  label: string
  allocated: number
  limit: number
  available: number
  percentage: number
  limitLabel: string
  color: string
}) {
  const isNearLimit = percentage >= 80
  const isOverLimit = percentage >= 100

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-sm text-white">{label}</p>
        <p className="text-xs text-slate-400">{limitLabel}</p>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-white/[0.06]">
        <div
          className={`h-full rounded-full transition-all ${
            isOverLimit ? 'bg-rose-500' : isNearLimit ? 'bg-amber-500' : color
          }`}
          style={{ width: `${Math.min(100, percentage)}%` }}
        />
      </div>
      <div className="flex items-center justify-between text-xs">
        <span className="text-slate-400">
          {formatCurrency(allocated)} / {formatCurrency(limit)}
        </span>
        <span className={isNearLimit ? 'text-amber-400' : 'text-emerald-400'}>
          {formatCurrency(available)} available
        </span>
      </div>
    </div>
  )
}

function InvestmentRow({ investment }: { investment: CPFISInvestment }) {
  const gainLoss = investment.currentValue - investment.purchasePrice
  const gainLossPercent =
    investment.purchasePrice > 0 ? (gainLoss / investment.purchasePrice) * 100 : 0
  const isPositive = gainLoss >= 0

  return (
    <div className="flex items-center justify-between p-4 transition hover:bg-white/[0.02]">
      <div className="flex items-center gap-4">
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-lg ${
            PRODUCT_TYPE_COLORS[investment.productType]
          }`}
        >
          <span className="text-xs font-bold text-white">
            {investment.account}
          </span>
        </div>
        <div>
          <p className="text-sm font-medium text-white">{investment.productName}</p>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="rounded bg-white/[0.06] px-1.5 py-0.5">
              {PRODUCT_TYPE_LABELS[investment.productType]}
            </span>
            <span>{investment.units.toLocaleString()} units</span>
            {investment.ter > 0 && <span>TER: {(investment.ter * 100).toFixed(2)}%</span>}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-6">
        <div className="text-right">
          <p className="text-sm font-medium text-white">{formatCurrency(investment.currentValue)}</p>
          <p className="text-xs text-slate-400">Cost: {formatCurrency(investment.purchasePrice)}</p>
        </div>
        <div className="flex items-center gap-2 text-right">
          {isPositive ? (
            <TrendingUp className="h-4 w-4 text-emerald-400" />
          ) : (
            <TrendingDown className="h-4 w-4 text-rose-400" />
          )}
          <div>
            <p className={`text-sm font-medium ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
              {isPositive && '+'}
              {formatCurrency(gainLoss)}
            </p>
            <p className={`text-xs ${isPositive ? 'text-emerald-400/70' : 'text-rose-400/70'}`}>
              {isPositive && '+'}
              {gainLossPercent.toFixed(2)}%
            </p>
          </div>
        </div>
        <ChevronRight className="h-4 w-4 text-slate-500" />
      </div>
    </div>
  )
}
