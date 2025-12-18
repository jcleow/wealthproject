'use client'

import { useState, useMemo } from 'react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { Home, TrendingUp, Calculator, AlertTriangle, ArrowRight, DollarSign } from 'lucide-react'

import { formatCurrency } from '@/lib/format'
import type { CPFHousingUsage, PropertySaleAnalysis, GrantCalculationResult } from '@/types/cpf'
import {
  mockCPFHousingUsage,
  mockPropertySaleAnalysis,
  mockGrantCalculation,
} from '@/lib/cpf-mock-data'

interface PropertyCPFUsageProps {
  className?: string
}

export function PropertyCPFUsage({ className }: PropertyCPFUsageProps) {
  const [activeTab, setActiveTab] = useState<'usage' | 'sale' | 'grants'>('usage')

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Tab Selector */}
      <div className="flex rounded-lg border border-white/[0.08] bg-[#0a0a0a] p-1">
        <button
          onClick={() => setActiveTab('usage')}
          className={`flex-1 rounded-md px-4 py-2.5 text-sm font-medium transition ${
            activeTab === 'usage'
              ? 'bg-blue-500/20 text-blue-400'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          CPF Usage
        </button>
        <button
          onClick={() => setActiveTab('sale')}
          className={`flex-1 rounded-md px-4 py-2.5 text-sm font-medium transition ${
            activeTab === 'sale'
              ? 'bg-emerald-500/20 text-emerald-400'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Sale Simulator
        </button>
        <button
          onClick={() => setActiveTab('grants')}
          className={`flex-1 rounded-md px-4 py-2.5 text-sm font-medium transition ${
            activeTab === 'grants'
              ? 'bg-amber-500/20 text-amber-400'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Housing Grants
        </button>
      </div>

      {activeTab === 'usage' && <CPFUsageTab usage={mockCPFHousingUsage} />}
      {activeTab === 'sale' && (
        <SaleSimulatorTab usage={mockCPFHousingUsage} sale={mockPropertySaleAnalysis} />
      )}
      {activeTab === 'grants' && <HousingGrantsTab grants={mockGrantCalculation} />}
    </div>
  )
}

function CPFUsageTab({ usage }: { usage: CPFHousingUsage }) {
  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          icon={<Home className="h-4 w-4" />}
          label="Total OA Used"
          value={usage.totals.totalOAUsed}
          color="blue"
        />
        <SummaryCard
          icon={<DollarSign className="h-4 w-4" />}
          label="Total Cash Used"
          value={usage.totals.totalCashUsed}
          color="slate"
        />
        <SummaryCard
          icon={<TrendingUp className="h-4 w-4" />}
          label="Grants Received"
          value={usage.downPayment.grantReceived}
          color="emerald"
        />
        <SummaryCard
          icon={<Calculator className="h-4 w-4" />}
          label="Accrued Interest"
          value={usage.accruedInterest.totalAccrued}
          color="amber"
        />
      </div>

      {/* Usage Breakdown */}
      <div className="rounded-xl border border-white/[0.08] bg-[#0a0a0a] p-5">
        <h3 className="mb-4 text-sm font-medium text-slate-300">OA Usage Breakdown</h3>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Down Payment */}
          <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4">
            <p className="text-xs text-slate-400">Down Payment</p>
            <div className="mt-3 space-y-2">
              <BreakdownRow
                label="OA Used"
                value={usage.downPayment.oaUsed}
                total={usage.downPayment.oaUsed + usage.downPayment.cashUsed}
                color="bg-blue-500"
              />
              <BreakdownRow
                label="Cash Used"
                value={usage.downPayment.cashUsed}
                total={usage.downPayment.oaUsed + usage.downPayment.cashUsed}
                color="bg-slate-500"
              />
              {usage.downPayment.grantReceived > 0 && (
                <BreakdownRow
                  label={`${usage.downPayment.grantType} Grant`}
                  value={usage.downPayment.grantReceived}
                  total={usage.downPayment.oaUsed + usage.downPayment.cashUsed}
                  color="bg-emerald-500"
                  isBonus
                />
              )}
            </div>
          </div>

          {/* Monthly Payments */}
          <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4">
            <p className="text-xs text-slate-400">Monthly Payments (Total)</p>
            <div className="mt-3 space-y-2">
              <BreakdownRow
                label="OA for Monthly"
                value={usage.totals.oaForMonthlyPayments}
                total={usage.totals.oaForMonthlyPayments + usage.totals.totalCashUsed - usage.downPayment.cashUsed}
                color="bg-blue-500"
              />
              <BreakdownRow
                label="Cash for Monthly"
                value={usage.totals.totalCashUsed - usage.downPayment.cashUsed}
                total={usage.totals.oaForMonthlyPayments + usage.totals.totalCashUsed - usage.downPayment.cashUsed}
                color="bg-slate-500"
              />
            </div>
            <p className="mt-3 text-xs text-slate-500">
              {usage.monthlyPayments.length} months of payments tracked
            </p>
          </div>
        </div>
      </div>

      {/* Accrued Interest Chart */}
      <div className="rounded-xl border border-white/[0.08] bg-[#0a0a0a] p-5">
        <h3 className="mb-4 text-sm font-medium text-slate-300">
          Accrued Interest Over Time (2.5% p.a.)
        </h3>

        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={usage.accruedInterest.yearlyBreakdown}
              margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id="accruedGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis
                dataKey="year"
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `$${(value / 1000).toFixed(0)}K`}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.[0]) return null
                  const data = payload[0].payload
                  return (
                    <div className={`px-3 py-2
rounded-lg border border-white/10
bg-[#0f1728]/95
shadow-xl backdrop-blur`}>
                      <p className="text-xs font-bold text-slate-400">Year {data.year}</p>
                      <div className="mt-2 space-y-1 text-xs">
                        <div className="flex justify-between gap-4">
                          <span className="text-slate-400">Principal:</span>
                          <span className="text-white">{formatCurrency(data.startingPrincipal)}</span>
                        </div>
                        <div className="flex justify-between gap-4">
                          <span className="text-slate-400">Interest This Year:</span>
                          <span className="text-amber-400">+{formatCurrency(data.interestForYear)}</span>
                        </div>
                        <div className="flex justify-between gap-4 border-t border-white/10 pt-1">
                          <span className="text-slate-400">Cumulative Interest:</span>
                          <span className="font-medium text-white">{formatCurrency(data.cumulativeInterest)}</span>
                        </div>
                      </div>
                    </div>
                  )
                }}
              />
              <Area
                type="monotone"
                dataKey="cumulativeInterest"
                stroke="#f59e0b"
                fill="url(#accruedGradient)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Warning */}
        <div className={`flex items-start
mt-4 gap-3 p-3
rounded-lg border border-amber-500/20
bg-amber-500/5`}>
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-400" />
          <p className="text-xs text-slate-300">
            When you sell your property, you must refund the principal used plus all accrued
            interest back to your CPF account.
          </p>
        </div>
      </div>
    </div>
  )
}

function SaleSimulatorTab({
  usage,
  sale,
}: {
  usage: CPFHousingUsage
  sale: PropertySaleAnalysis
}) {
  const [salePrice, setSalePrice] = useState(sale.grossProceeds.toString())
  const [outstandingLoan, setOutstandingLoan] = useState(sale.outstandingLoan.toString())

  const simulatedSale = useMemo(() => {
    const price = parseFloat(salePrice) || 0
    const loan = parseFloat(outstandingLoan) || 0
    const sellingCosts = Math.round(price * 0.02) // ~2% selling costs

    const principalUsed = usage.totals.totalOAUsed
    const accruedInterest = usage.accruedInterest.totalAccrued
    const totalRefund = principalUsed + accruedInterest

    const netProceeds = price - loan - sellingCosts - totalRefund

    return {
      ...sale,
      grossProceeds: price,
      outstandingLoan: loan,
      sellingCosts,
      cpfRefundRequired: {
        principalUsed,
        accruedInterest,
        totalRefund,
      },
      netCashProceeds: netProceeds,
    }
  }, [salePrice, outstandingLoan, usage, sale])

  return (
    <div className="space-y-6">
      {/* Input Form */}
      <div className="rounded-xl border border-white/[0.08] bg-[#0a0a0a] p-5">
        <h3 className="mb-4 text-sm font-medium text-slate-300">Sale Scenario</h3>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="text-xs text-slate-400">Expected Sale Price</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</span>
              <input
                type="number"
                value={salePrice}
                onChange={(e) => setSalePrice(e.target.value)}
                className={`w-full
py-2.5 pl-8 pr-4
rounded-lg border border-white/[0.08] focus:border-emerald-500/50 focus:outline-none
bg-white/[0.02]
text-sm text-white placeholder:text-slate-600`}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs text-slate-400">Outstanding Loan</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</span>
              <input
                type="number"
                value={outstandingLoan}
                onChange={(e) => setOutstandingLoan(e.target.value)}
                className={`w-full
py-2.5 pl-8 pr-4
rounded-lg border border-white/[0.08] focus:border-emerald-500/50 focus:outline-none
bg-white/[0.02]
text-sm text-white placeholder:text-slate-600`}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Sale Breakdown */}
      <div className="rounded-xl border border-white/[0.08] bg-[#0a0a0a] p-5">
        <h3 className="mb-4 text-sm font-medium text-slate-300">Sale Proceeds Breakdown</h3>

        <div className="space-y-3">
          <FlowRow
            label="Sale Price"
            value={simulatedSale.grossProceeds}
            type="add"
          />
          <FlowRow
            label="Less: Outstanding Loan"
            value={simulatedSale.outstandingLoan}
            type="subtract"
          />
          <FlowRow
            label="Less: Selling Costs (~2%)"
            value={simulatedSale.sellingCosts}
            type="subtract"
          />

          <div className="border-t border-white/[0.06] pt-3">
            <FlowRow
              label="CPF Principal Refund"
              value={simulatedSale.cpfRefundRequired.principalUsed}
              type="subtract"
              highlight="blue"
            />
            <FlowRow
              label="CPF Accrued Interest Refund"
              value={simulatedSale.cpfRefundRequired.accruedInterest}
              type="subtract"
              highlight="amber"
            />
          </div>

          <div className="border-t border-white/[0.06] pt-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-white">Net Cash Proceeds</span>
              <span
                className={`text-xl font-semibold ${
                  simulatedSale.netCashProceeds >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {formatCurrency(simulatedSale.netCashProceeds)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* CPF Refund Destination */}
      <div className="rounded-xl border border-white/[0.08] bg-[#0a0a0a] p-5">
        <h3 className="mb-4 text-sm font-medium text-slate-300">CPF Refund Destination</h3>

        <div className={`flex items-center justify-between
p-4
rounded-lg
bg-white/[0.02]`}>
          <div className="text-center">
            <p className="text-xs text-slate-400">Total Refund</p>
            <p className="text-xl font-semibold text-white">
              {formatCurrency(simulatedSale.cpfRefundRequired.totalRefund)}
            </p>
          </div>

          <ArrowRight className="h-6 w-6 text-slate-500" />

          <div className="text-center">
            <p className="text-xs text-slate-400">To OA</p>
            <p className="text-xl font-semibold text-blue-400">
              {formatCurrency(sale.refundDestination.toOA)}
            </p>
          </div>

          {sale.refundDestination.toRA > 0 && (
            <>
              <span className="text-slate-500">+</span>
              <div className="text-center">
                <p className="text-xs text-slate-400">To RA</p>
                <p className="text-xl font-semibold text-violet-400">
                  {formatCurrency(sale.refundDestination.toRA)}
                </p>
              </div>
            </>
          )}
        </div>

        <p className="mt-3 text-xs text-slate-400">{sale.refundDestination.reason}</p>

        {simulatedSale.netCashProceeds < 0 && (
          <div className={`flex items-start
mt-4 gap-3 p-3
rounded-lg border border-rose-500/20
bg-rose-500/10`}>
            <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-rose-400" />
            <p className="text-xs text-rose-300">
              Warning: Your sale proceeds are insufficient to cover the CPF refund. You will need
              to top up {formatCurrency(Math.abs(simulatedSale.netCashProceeds))} in cash.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

function HousingGrantsTab({ grants }: { grants: GrantCalculationResult }) {
  const grantList = [
    {
      key: 'ehg',
      name: 'Enhanced CPF Housing Grant (EHG)',
      ...grants.ehg,
      maxAmount: 80000,
    },
    {
      key: 'fhg',
      name: 'Family Grant (FHG)',
      ...grants.fhg,
      maxAmount: 50000,
    },
    {
      key: 'phg',
      name: 'Proximity Housing Grant (PHG)',
      ...grants.phg,
      maxAmount: 30000,
    },
    {
      key: 'stepUp',
      name: 'Step-Up CPF Housing Grant',
      ...grants.stepUp,
      maxAmount: 15000,
    },
  ]

  return (
    <div className="space-y-6">
      {/* Total Grants */}
      <div className={`p-5
rounded-xl border border-emerald-500/30
bg-emerald-500/10
text-center`}>
        <p className="text-xs text-emerald-300">Total Grants You May Be Eligible For</p>
        <p className="mt-2 text-4xl font-bold text-emerald-400">
          {formatCurrency(grants.totalGrants)}
        </p>
      </div>

      {/* Grant Breakdown */}
      <div className="space-y-4">
        {grantList.map((grant) => (
          <div
            key={grant.key}
            className={`rounded-xl border p-4 ${
              grant.eligible
                ? 'border-emerald-500/30 bg-emerald-500/5'
                : 'border-white/[0.08] bg-[#0a0a0a]'
            }`}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-white">{grant.name}</p>
                <p className="mt-1 text-xs text-slate-400">{grant.reason}</p>
              </div>
              <div className="text-right">
                {grant.eligible ? (
                  <>
                    <p className="text-lg font-semibold text-emerald-400">
                      {formatCurrency(grant.amount)}
                    </p>
                    <p className="text-xs text-emerald-300">Eligible</p>
                  </>
                ) : (
                  <>
                    <p className="text-lg font-semibold text-slate-500">$0</p>
                    <p className="text-xs text-slate-500">Not eligible</p>
                  </>
                )}
              </div>
            </div>

            {/* Progress bar */}
            <div className="mt-3">
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
                <div
                  className={`h-full rounded-full transition-all ${
                    grant.eligible ? 'bg-emerald-500' : 'bg-slate-600'
                  }`}
                  style={{ width: `${(grant.amount / grant.maxAmount) * 100}%` }}
                />
              </div>
              <p className="mt-1 text-xs text-slate-500">
                Max: {formatCurrency(grant.maxAmount)}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Info */}
      <div className="rounded-xl border border-white/[0.08] bg-[#0a0a0a] p-4">
        <h4 className="text-sm font-medium text-slate-300">Grant Eligibility Factors</h4>
        <ul className="mt-3 space-y-2 text-xs text-slate-400">
          <li className="flex items-start gap-2">
            <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-blue-400" />
            <span>EHG is based on household income (up to $9,000/month for max grant)</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-blue-400" />
            <span>FHG requires a family nucleus and first-timer status</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-blue-400" />
            <span>PHG requires living within 4km of parents/children</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-blue-400" />
            <span>Step-Up Grant is for upgrading from 2-room flat to 3-room or larger</span>
          </li>
        </ul>
      </div>
    </div>
  )
}

// Helper Components

function SummaryCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode
  label: string
  value: number
  color: 'blue' | 'slate' | 'emerald' | 'amber'
}) {
  const colorClasses = {
    blue: 'text-blue-400 bg-blue-500/20',
    slate: 'text-slate-400 bg-slate-500/20',
    emerald: 'text-emerald-400 bg-emerald-500/20',
    amber: 'text-amber-400 bg-amber-500/20',
  }

  return (
    <div className="rounded-xl border border-white/[0.08] bg-[#0a0a0a] p-4">
      <div className={`inline-flex rounded-lg p-2 ${colorClasses[color]}`}>{icon}</div>
      <p className="mt-3 text-xs text-slate-400">{label}</p>
      <p className="mt-1 text-xl font-semibold text-white">{formatCurrency(value)}</p>
    </div>
  )
}

function BreakdownRow({
  label,
  value,
  total,
  color,
  isBonus,
}: {
  label: string
  value: number
  total: number
  color: string
  isBonus?: boolean
}) {
  const percentage = total > 0 ? (value / total) * 100 : 0

  return (
    <div>
      <div className="flex items-center justify-between text-xs">
        <span className="text-slate-400">{label}</span>
        <span className={isBonus ? 'text-emerald-400' : 'text-white'}>
          {isBonus && '+'}
          {formatCurrency(value)}
        </span>
      </div>
      <div className={`overflow-hidden
h-1.5 w-full
mt-1
rounded-full
bg-white/[0.06]`}>
        <div
          className={`h-full rounded-full ${color}`}
          style={{ width: `${Math.min(100, percentage)}%` }}
        />
      </div>
    </div>
  )
}

function FlowRow({
  label,
  value,
  type,
  highlight,
}: {
  label: string
  value: number
  type: 'add' | 'subtract'
  highlight?: 'blue' | 'amber'
}) {
  const highlightClasses = {
    blue: 'bg-blue-500/10 border-blue-500/20',
    amber: 'bg-amber-500/10 border-amber-500/20',
  }

  return (
    <div
      className={`flex items-center justify-between rounded-lg p-2 ${
        highlight ? `border ${highlightClasses[highlight]}` : ''
      }`}
    >
      <span className="text-sm text-slate-400">{label}</span>
      <span className={`text-sm font-medium ${type === 'subtract' ? 'text-rose-400' : 'text-white'}`}>
        {type === 'subtract' && '-'}
        {formatCurrency(value)}
      </span>
    </div>
  )
}
