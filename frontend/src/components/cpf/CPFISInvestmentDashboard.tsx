'use client'

import { useState } from 'react'
import { TrendingUp, TrendingDown, AlertTriangle, Plus, ChevronRight } from 'lucide-react'

import { formatCurrency } from '@/lib/format'
import { useTheme } from '@/lib/theme'
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
  const { theme, isMonet } = useTheme()

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
      <div
        className="rounded-xl p-5"
        style={{
          background: isMonet ? theme.cardBg : '#0a0a0a',
          border: `1px solid ${theme.cardBorder}`,
        }}
      >
        <h3
          className="mb-4 text-sm font-medium"
          style={{ color: theme.textSecondary }}
        >
          OA Investment Limits
        </h3>
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
        <p className="mt-4 text-xs" style={{ color: theme.textMuted }}>
          Unit trusts, ETFs, T-Bills, and SGS bonds have no percentage limit (100% of investible balance)
        </p>
      </div>

      {/* Investments List */}
      <div
        className="rounded-xl"
        style={{
          background: isMonet ? theme.cardBg : '#0a0a0a',
          border: `1px solid ${theme.cardBorder}`,
        }}
      >
        <div
          className="flex items-center justify-between p-5"
          style={{ borderBottom: `1px solid ${theme.surfaceBorder}` }}
        >
          <h3
            className="text-sm font-medium"
            style={{ color: theme.textSecondary }}
          >
            Your CPFIS Investments
          </h3>
          <div className="flex items-center gap-2">
            {/* Account Filter */}
            <div
              className="flex rounded-lg"
              style={{
                background: theme.surfaceBg,
                border: `1px solid ${theme.cardBorder}`,
              }}
            >
              {(['all', 'OA', 'SA'] as const).map((account) => (
                <button
                  key={account}
                  onClick={() => setSelectedAccount(account)}
                  className="px-3 py-1.5 text-xs font-medium transition"
                  style={{
                    background: selectedAccount === account ? theme.activeBg : 'transparent',
                    color: selectedAccount === account ? theme.textPrimary : theme.textMuted,
                  }}
                >
                  {account === 'all' ? 'All' : account}
                </button>
              ))}
            </div>
            <button
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition"
              style={{
                background: isMonet ? 'rgba(127, 178, 133, 0.15)' : 'rgba(16, 185, 129, 0.1)',
                border: `1px solid ${theme.cardBorder}`,
                color: theme.sage,
              }}
            >
              <Plus className="h-3.5 w-3.5" />
              Add Investment
            </button>
          </div>
        </div>

        {filteredInvestments.length > 0 ? (
          <div style={{ borderColor: theme.surfaceBorder }} className="divide-y divide-inherit">
            {filteredInvestments.map((investment) => (
              <InvestmentRow key={investment.id} investment={investment} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div
              className="rounded-full p-4"
              style={{ background: theme.surfaceBg }}
            >
              <TrendingUp className="h-8 w-8" style={{ color: theme.textMuted }} />
            </div>
            <p className="mt-4 text-sm" style={{ color: theme.textMuted }}>
              No investments found
            </p>
            <p className="mt-1 text-xs" style={{ color: theme.textMuted }}>
              Start investing your CPF to grow your retirement savings
            </p>
          </div>
        )}
      </div>

      {/* Approved Products Info */}
      <div
        className="rounded-xl p-4"
        style={{
          background: isMonet ? 'rgba(212, 165, 116, 0.1)' : 'rgba(245, 158, 11, 0.05)',
          border: `1px solid ${isMonet ? 'rgba(212, 165, 116, 0.2)' : 'rgba(245, 158, 11, 0.2)'}`,
        }}
      >
        <div className="flex items-start gap-3">
          <AlertTriangle
            className="mt-0.5 h-4 w-4 flex-shrink-0"
            style={{ color: theme.amber }}
          />
          <div className="text-xs" style={{ color: theme.textSecondary }}>
            <p className="font-medium" style={{ color: theme.amber }}>
              CPFIS Approved Products Only
            </p>
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
  const { theme, isMonet } = useTheme()
  const isPositive = value >= 0

  return (
    <div
      className="rounded-xl p-4"
      style={{
        background: isMonet ? theme.cardBg : '#0a0a0a',
        border: `1px solid ${theme.cardBorder}`,
      }}
    >
      <p className="text-xs" style={{ color: theme.textMuted }}>
        {label}
      </p>
      <p
        className="mt-1 text-xl font-semibold"
        style={{
          color: isGainLoss
            ? isPositive
              ? theme.sage
              : isMonet
                ? '#E57373'
                : '#fb7185'
            : theme.textPrimary,
        }}
      >
        {isGainLoss && isPositive && '+'}
        {formatCurrency(value)}
      </p>
      <p className="mt-1 text-xs" style={{ color: theme.textMuted }}>
        {subtitle}
      </p>
      {total !== undefined && (
        <div
          className="overflow-hidden h-1.5 w-full mt-2 rounded-full"
          style={{ background: theme.surfaceBg }}
        >
          <div
            className="h-full rounded-full"
            style={{
              width: `${Math.min(100, (value / total) * 100)}%`,
              background: theme.blue,
            }}
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
  const { theme } = useTheme()
  const isNearLimit = percentage >= 80
  const isOverLimit = percentage >= 100

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-sm" style={{ color: theme.textPrimary }}>
          {label}
        </p>
        <p className="text-xs" style={{ color: theme.textMuted }}>
          {limitLabel}
        </p>
      </div>
      <div
        className="h-2 w-full overflow-hidden rounded-full"
        style={{ background: theme.surfaceBg }}
      >
        <div
          className={`h-full rounded-full transition-all ${
            isOverLimit ? 'bg-rose-500' : isNearLimit ? 'bg-amber-500' : color
          }`}
          style={{ width: `${Math.min(100, percentage)}%` }}
        />
      </div>
      <div className="flex items-center justify-between text-xs">
        <span style={{ color: theme.textMuted }}>
          {formatCurrency(allocated)} / {formatCurrency(limit)}
        </span>
        <span
          style={{
            color: isNearLimit
              ? theme.amber
              : theme.sage,
          }}
        >
          {formatCurrency(available)} available
        </span>
      </div>
    </div>
  )
}

function InvestmentRow({ investment }: { investment: CPFISInvestment }) {
  const { theme, isMonet } = useTheme()
  const gainLoss = investment.currentValue - investment.purchasePrice
  const gainLossPercent =
    investment.purchasePrice > 0 ? (gainLoss / investment.purchasePrice) * 100 : 0
  const isPositive = gainLoss >= 0

  const positiveColor = theme.sage
  const negativeColor = isMonet ? '#E57373' : '#fb7185'

  return (
    <div
      className="flex items-center justify-between p-4 transition"
      style={{
        borderBottom: `1px solid ${theme.surfaceBorder}`,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = theme.hoverBg
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'transparent'
      }}
    >
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
          <p className="text-sm font-medium" style={{ color: theme.textPrimary }}>
            {investment.productName}
          </p>
          <div className="flex items-center gap-2 text-xs" style={{ color: theme.textMuted }}>
            <span
              className="rounded px-1.5 py-0.5"
              style={{ background: theme.surfaceBg }}
            >
              {PRODUCT_TYPE_LABELS[investment.productType]}
            </span>
            <span>{investment.units.toLocaleString()} units</span>
            {investment.ter > 0 && <span>TER: {(investment.ter * 100).toFixed(2)}%</span>}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-6">
        <div className="text-right">
          <p className="text-sm font-medium" style={{ color: theme.textPrimary }}>
            {formatCurrency(investment.currentValue)}
          </p>
          <p className="text-xs" style={{ color: theme.textMuted }}>
            Cost: {formatCurrency(investment.purchasePrice)}
          </p>
        </div>
        <div className="flex items-center gap-2 text-right">
          {isPositive ? (
            <TrendingUp className="h-4 w-4" style={{ color: positiveColor }} />
          ) : (
            <TrendingDown className="h-4 w-4" style={{ color: negativeColor }} />
          )}
          <div>
            <p
              className="text-sm font-medium"
              style={{ color: isPositive ? positiveColor : negativeColor }}
            >
              {isPositive && '+'}
              {formatCurrency(gainLoss)}
            </p>
            <p
              className="text-xs"
              style={{
                color: isPositive ? positiveColor : negativeColor,
                opacity: 0.7,
              }}
            >
              {isPositive && '+'}
              {gainLossPercent.toFixed(2)}%
            </p>
          </div>
        </div>
        <ChevronRight className="h-4 w-4" style={{ color: theme.textMuted }} />
      </div>
    </div>
  )
}
