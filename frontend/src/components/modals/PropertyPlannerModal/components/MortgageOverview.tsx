"use client"

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  BarChart,
  Bar,
} from 'recharts'
import { Calendar, Percent, PiggyBank, TrendingDown } from 'lucide-react'
import { calculateMortgage, formatCurrency, formatPercentage } from '@/utils/mortgage-calculations'

const formatCompactCurrency = (value: number) =>
  new Intl.NumberFormat('en-SG', {
    style: 'currency',
    currency: 'SGD',
    notation: 'compact',
    maximumFractionDigits: 1,
    minimumFractionDigits: 0,
  }).format(value)

interface MortgageOverviewProps {
  calculation: ReturnType<typeof calculateMortgage>
  onEdit: () => void
  loanAmount: number
  formattedLoanEnd: string
  msrWithinLimit: boolean
  handleApplyPlan: () => void
}

export function MortgageOverview({ calculation, onEdit, loanAmount, formattedLoanEnd, msrWithinLimit, handleApplyPlan }: MortgageOverviewProps) {
  const { monthlyPayment, totalInterest, msrRatio, amortization } = calculation
  const balanceYearTicks = amortization.balancePoints.map((point) => point.yearIndex)
  const compositionYearTicks = amortization.composition.map((point) => point.yearIndex)
  const balanceDomain: [number, number] = [
    Math.max(0, (balanceYearTicks[0] ?? 0) - 0.5),
    (balanceYearTicks[balanceYearTicks.length - 1] ?? 1) + 0.5,
  ]
  const compositionDomain: [number, number] = [
    Math.max(0, (compositionYearTicks[0] ?? 0) - 0.5),
    (compositionYearTicks[compositionYearTicks.length - 1] ?? 1) + 0.5,
  ]

  return (
    <section className={`space-y-6 p-6
rounded-3xl border border-white/10
bg-[#030712]
text-white
shadow-[0_15px_40px_rgba(0,0,0,0.45)]`}>
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-[0.18em] text-gray-500">Mortgage Overview</p>
          <h3 className="text-2xl font-semibold text-white">Mortgage Overview</h3>
          <p className="text-sm text-gray-400">Your complete mortgage summary and projections.</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {[
          { label: 'Monthly Payment', value: formatCurrency(monthlyPayment), icon: PiggyBank },
          { label: 'Total Interest', value: formatCurrency(totalInterest), icon: TrendingDown },
          {
            label: 'MSR %',
            value: formatPercentage(msrRatio),
            helper: msrWithinLimit ? 'Below 30% threshold' : 'Exceeds 30% threshold',
            icon: Percent,
          },
          { label: 'Loan End Date', value: formattedLoanEnd, icon: Calendar },
        ].map((card) => (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4" key={card.label}>
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <card.icon className="h-4 w-4" />
              {card.label}
            </div>
            <p className="mt-2 text-2xl font-semibold text-white">{card.value}</p>
            {card.helper ? (
              <p className={`text-xs ${msrWithinLimit ? 'text-emerald-300' : 'text-amber-300'}`}>{card.helper}</p>
            ) : null}
          </div>
        ))}
      </div>

      <div className="space-y-4">
        {[
          {
            title: 'Loan Balance Over Time',
            helper: `Loan balance chart: ${formatCurrency(loanAmount)} → $0`,
            hasData: amortization.balancePoints.length > 0,
            render: (height: number) => (
              <ResponsiveContainer width="100%" height={height}>
                <AreaChart data={amortization.balancePoints} margin={{ bottom: 32, left: 16, right: 0 }}>
                  <defs>
                    <linearGradient id="loanBalanceGradient" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="5%" stopColor="#60A5FA" stopOpacity={0.6} />
                      <stop offset="95%" stopColor="#60A5FA" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#1f2937" strokeDasharray="3 3" />
                  <XAxis
                    dataKey="yearIndex"
                    type="number"
                    domain={balanceDomain}
                    ticks={balanceYearTicks}
                    allowDecimals={false}
                    stroke="#9CA3AF"
                    fontSize={12}
                    tickMargin={10}
                    tickFormatter={(value) => `${value}`}
                    label={{ value: 'Year', position: 'bottom', offset: 0, fill: '#9CA3AF' }}
                  />
                  <YAxis
                    stroke="#9CA3AF"
                    fontSize={12}
                    tickFormatter={(value) => formatCompactCurrency(value as number)}
                  />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#111827', border: '1px solid rgba(255,255,255,0.1)' }}
                    labelFormatter={(value) => `Year ${value}`}
                    formatter={(value: number) => formatCurrency(value)}
                  />
                  <Area
                    dataKey="balance"
                    type="monotone"
                    stroke="#3B82F6"
                    strokeWidth={3}
                    fill="url(#loanBalanceGradient)"
                    name="Remaining Balance"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ),
          },
          {
            title: 'Interest vs Principal Payments',
            helper: 'See how your payment composition changes each year.',
            hasData: amortization.composition.length > 0,
            render: (height: number) => (
              <ResponsiveContainer width="100%" height={height}>
                <BarChart data={amortization.composition} barCategoryGap="20%" barGap={4} margin={{ bottom: 36, left: 16, right: 0 }}>
                  <CartesianGrid stroke="#1f2937" strokeDasharray="3 3" />
                  <XAxis
                    dataKey="yearIndex"
                    type="number"
                    domain={compositionDomain}
                    ticks={compositionYearTicks}
                    allowDecimals={false}
                    stroke="#9CA3AF"
                    fontSize={11}
                    tickMargin={14}
                    tickFormatter={(value) => `${value}`}
                    label={{ value: 'Year', position: 'bottom', offset: 0, fill: '#9CA3AF' }}
                  />
                  <YAxis
                    stroke="#9CA3AF"
                    fontSize={12}
                    tickFormatter={(value) => formatCompactCurrency(value as number)}
                  />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#111827', border: '1px solid rgba(255,255,255,0.1)' }}
                    labelFormatter={(value) => `Year ${value}`}
                    formatter={(value: number, name) => [
                      formatCurrency(value),
                      name === 'interest' ? 'Interest' : 'Principal',
                    ]}
                  />
                  <Legend wrapperStyle={{ paddingTop: 12 }} />
                  <Bar dataKey="interest" stackId="payments" fill="rgba(248, 113, 113, 0.8)" stroke="#F87171" />
                  <Bar dataKey="principal" stackId="payments" fill="rgba(59, 130, 246, 0.7)" stroke="#3B82F6" />
                </BarChart>
              </ResponsiveContainer>
            ),
          },
        ].map((section) => (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4" key={section.title}>
            <p className="text-sm font-semibold text-white">{section.title}</p>
            <p className="text-xs text-gray-400">{section.helper}</p>
            <div className="mt-3 rounded-xl border border-white/10 bg-gray-950 p-3" style={{ minHeight: 320 }}>
              {section.hasData ? (
                section.render(300)
              ) : (
                <div className="flex items-center justify-center text-xs text-gray-500" style={{ minHeight: 300 }}>
                  Not enough payment history yet.
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 flex justify-end gap-3">
        <button
          className={`px-4 py-2
rounded-full border border-white/15 hover:border-white/30
bg-[#030712]
text-sm text-gray-200
transition`}
          onClick={onEdit}
          type="button"
        >
          Adjust inputs
        </button>
        <button
          className={`px-5 py-2
rounded-full
bg-[#2d76f8] hover:bg-[#3d84ff]
text-sm font-semibold text-white
shadow-[0_8px_20px_rgba(45,118,248,0.35)] disabled:opacity-50
transition`}
          type="button"
          onClick={handleApplyPlan}
        >
          Apply to Plan
        </button>
      </div>
    </section>
  )
}
