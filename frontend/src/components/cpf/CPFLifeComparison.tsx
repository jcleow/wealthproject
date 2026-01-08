'use client'

import { useState, useMemo } from 'react'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  type TooltipItem,
} from 'chart.js'
import { Line } from 'react-chartjs-2'
import { TrendingUp, Info, ExternalLink, Calculator } from 'lucide-react'

import { formatCurrency } from '@/lib/format'
import { cn } from '@/lib/utils'
import { CurrencyInput } from '@/components/ui/CurrencyInput'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
)

const PLAN_COLORS = {
  standard: { main: '#3b82f6', light: 'rgba(59, 130, 246, 0.1)' },
  basic: { main: '#10b981', light: 'rgba(16, 185, 129, 0.1)' },
  escalating: { main: '#f59e0b', light: 'rgba(245, 158, 11, 0.1)' },
}

const PLAN_INFO = {
  standard: {
    name: 'Standard',
    description: 'Level payouts for life',
  },
  basic: {
    name: 'Basic',
    description: 'Lower payout, higher bequest',
  },
  escalating: {
    name: 'Escalating',
    description: 'Increases 2% yearly',
  },
}

type PlanType = keyof typeof PLAN_INFO

interface CPFLifeComparisonProps {
  className?: string
}

export function CPFLifeComparison({ className }: CPFLifeComparisonProps) {
  // User-entered monthly payouts from CPF website
  const [standardPayout, setStandardPayout] = useState<number>(0)
  const [basicPayout, setBasicPayout] = useState<number>(0)
  const [escalatingPayout, setEscalatingPayout] = useState<number>(0)
  const [startAge, setStartAge] = useState<number>(65)
  const [showCumulative, setShowCumulative] = useState(false)

  const hasEnteredValues = standardPayout > 0 || basicPayout > 0 || escalatingPayout > 0

  // Generate projection data based on user-entered payouts
  const projectionData = useMemo(() => {
    if (!hasEnteredValues) return null

    const years = Array.from({ length: 31 }, (_, i) => startAge + i) // Up to age 95

    const data: Record<PlanType, { monthly: number[]; cumulative: number[] }> = {
      standard: { monthly: [], cumulative: [] },
      basic: { monthly: [], cumulative: [] },
      escalating: { monthly: [], cumulative: [] },
    }

    // Standard & Basic: flat payouts
    // Escalating: increases 2% per year
    let standardCumulative = 0
    let basicCumulative = 0
    let escalatingCumulative = 0

    for (let i = 0; i < years.length; i++) {
      // Standard (flat)
      data.standard.monthly.push(standardPayout)
      standardCumulative += standardPayout * 12
      data.standard.cumulative.push(standardCumulative)

      // Basic (flat)
      data.basic.monthly.push(basicPayout)
      basicCumulative += basicPayout * 12
      data.basic.cumulative.push(basicCumulative)

      // Escalating (2% increase per year)
      const escalatingMonthly = escalatingPayout * Math.pow(1.02, i)
      data.escalating.monthly.push(escalatingMonthly)
      escalatingCumulative += escalatingMonthly * 12
      data.escalating.cumulative.push(escalatingCumulative)
    }

    return { years, data }
  }, [standardPayout, basicPayout, escalatingPayout, startAge, hasEnteredValues])

  // Find crossover point where escalating overtakes standard
  const crossoverAge = useMemo(() => {
    if (!hasEnteredValues || escalatingPayout === 0 || standardPayout === 0) return null
    if (escalatingPayout >= standardPayout) return startAge // Already higher

    // Find when escalating monthly exceeds standard monthly
    for (let i = 0; i < 30; i++) {
      const escalatingAtYear = escalatingPayout * Math.pow(1.02, i)
      if (escalatingAtYear >= standardPayout) {
        return startAge + i
      }
    }
    return null
  }, [escalatingPayout, standardPayout, startAge, hasEnteredValues])

  // Chart configuration
  const chartData = useMemo(() => {
    if (!projectionData) return null

    const activePlans = [
      standardPayout > 0 ? 'standard' : null,
      basicPayout > 0 ? 'basic' : null,
      escalatingPayout > 0 ? 'escalating' : null,
    ].filter((p): p is PlanType => p !== null)

    return {
      labels: projectionData.years.map(age => `${age}`),
      datasets: activePlans.map(plan => ({
        label: PLAN_INFO[plan].name,
        data: showCumulative
          ? projectionData.data[plan].cumulative
          : projectionData.data[plan].monthly,
        borderColor: PLAN_COLORS[plan].main,
        backgroundColor: PLAN_COLORS[plan].light,
        borderWidth: 2,
        fill: true,
        tension: 0.4,
        pointRadius: 0,
        pointHoverRadius: 6,
        pointHoverBackgroundColor: PLAN_COLORS[plan].main,
      })),
    }
  }, [projectionData, showCumulative, standardPayout, basicPayout, escalatingPayout])

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: 'rgba(15, 23, 40, 0.95)',
        titleColor: '#fff',
        bodyColor: '#94a3b8',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
        padding: 12,
        callbacks: {
          title: (items: TooltipItem<'line'>[]) => `Age ${items[0]?.label}`,
          label: (context: TooltipItem<'line'>) => {
            const value = context.raw as number
            const label = context.dataset.label ?? 'Unknown'
            return `${label}: ${formatCurrency(value)}${showCumulative ? ' total' : '/mo'}`
          },
        },
      },
    },
    scales: {
      x: {
        grid: {
          color: 'rgba(255, 255, 255, 0.04)',
        },
        ticks: {
          color: '#64748b',
          maxTicksLimit: 10,
        },
        title: {
          display: true,
          text: 'Age',
          color: '#64748b',
        },
      },
      y: {
        grid: {
          color: 'rgba(255, 255, 255, 0.04)',
        },
        ticks: {
          color: '#64748b',
          callback: (value: number | string) => formatCurrency(Number(value)),
        },
        title: {
          display: true,
          text: showCumulative ? 'Total Received' : 'Monthly Payout',
          color: '#64748b',
        },
      },
    },
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div>
        <h3 className="flex items-center gap-2 text-lg font-semibold text-white">
          <TrendingUp className="h-5 w-5 text-emerald-400" />
          CPF LIFE Plan Comparison
        </h3>
        <p className="mt-1 text-sm text-slate-400">
          Enter your estimated payouts from CPF to compare plans over time
        </p>
      </div>

      {/* Link to CPF Calculator */}
      <a
        href="https://www.cpf.gov.sg/member/retirement-income/monthly-payouts/cpf-life"
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          "flex items-center gap-3 p-4 rounded-xl border transition-all",
          "border-blue-500/20 bg-blue-500/5 hover:bg-blue-500/10 hover:border-blue-500/30"
        )}
      >
        <Calculator className="h-5 w-5 text-blue-400" />
        <div className="flex-1">
          <div className="text-sm font-medium text-white">Get your payout estimates</div>
          <div className="text-xs text-slate-400">Use the official CPF LIFE page to get accurate figures</div>
        </div>
        <ExternalLink className="h-4 w-4 text-blue-400" />
      </a>

      {/* Input Section */}
      <div className="p-4 rounded-xl border border-white/[0.08] bg-white/[0.02]">
        <div className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-4">
          Enter your monthly payout estimates
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Standard Plan Input */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-blue-400 mb-2">
              <div className="w-2 h-2 rounded-full bg-blue-500" />
              Standard Plan
            </label>
            <CurrencyInput
              value={standardPayout}
              onChange={(val) => setStandardPayout(Math.max(0, val))}
              placeholder="e.g. 1,420"
              size="sm"
            />
            <p className="mt-1 text-xs text-slate-500">Highest initial payout</p>
          </div>

          {/* Basic Plan Input */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-emerald-400 mb-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              Basic Plan
            </label>
            <CurrencyInput
              value={basicPayout}
              onChange={(val) => setBasicPayout(Math.max(0, val))}
              placeholder="e.g. 1,070"
              size="sm"
            />
            <p className="mt-1 text-xs text-slate-500">Higher bequest to family</p>
          </div>

          {/* Escalating Plan Input */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-amber-400 mb-2">
              <div className="w-2 h-2 rounded-full bg-amber-500" />
              Escalating Plan
            </label>
            <CurrencyInput
              value={escalatingPayout}
              onChange={(val) => setEscalatingPayout(Math.max(0, val))}
              placeholder="e.g. 1,190"
              size="sm"
            />
            <p className="mt-1 text-xs text-slate-500">+2% increase yearly</p>
          </div>
        </div>

        {/* Start Age */}
        <div className="mt-4 pt-4 border-t border-white/[0.06]">
          <label className="text-xs font-medium text-slate-400 mb-2 block">
            Payout Start Age
          </label>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={65}
              max={70}
              value={startAge}
              onChange={(e) => setStartAge(Number(e.target.value))}
              className="flex-1 accent-violet-500"
            />
            <span className="text-lg font-semibold text-white w-12">{startAge}</span>
          </div>
        </div>
      </div>

      {/* Chart */}
      {hasEnteredValues && chartData && (
        <div className="p-4 rounded-xl border border-white/[0.08] bg-[#0a0a0a]">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              {standardPayout > 0 && (
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-500" />
                  <span className="text-sm text-slate-300">Standard</span>
                </div>
              )}
              {basicPayout > 0 && (
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-emerald-500" />
                  <span className="text-sm text-slate-300">Basic</span>
                </div>
              )}
              {escalatingPayout > 0 && (
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-amber-500" />
                  <span className="text-sm text-slate-300">Escalating</span>
                </div>
              )}
            </div>

            {/* Toggle Monthly/Cumulative */}
            <div className="flex items-center gap-1 p-0.5 rounded-lg bg-white/[0.03] border border-white/[0.08]">
              <button
                onClick={() => setShowCumulative(false)}
                className={cn(
                  "px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                  !showCumulative
                    ? "bg-white/[0.1] text-white"
                    : "text-slate-500 hover:text-slate-300"
                )}
              >
                Monthly
              </button>
              <button
                onClick={() => setShowCumulative(true)}
                className={cn(
                  "px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                  showCumulative
                    ? "bg-white/[0.1] text-white"
                    : "text-slate-500 hover:text-slate-300"
                )}
              >
                Cumulative
              </button>
            </div>
          </div>

          <div className="h-[300px]">
            <Line data={chartData} options={chartOptions} />
          </div>

          {/* Crossover insight */}
          {crossoverAge && crossoverAge > startAge && (
            <div className="mt-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <p className="text-sm text-amber-300">
                <strong>Crossover Point:</strong> Escalating plan monthly payout exceeds Standard at age {crossoverAge}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Comparison Table */}
      {hasEnteredValues && projectionData && (
        <div className="p-4 rounded-xl border border-white/[0.08] bg-[#0a0a0a]">
          <h4 className="text-sm font-medium text-white mb-4">Cumulative Payouts Over Time</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  <th className="px-4 py-2 text-left text-xs font-medium text-slate-400">Age</th>
                  {standardPayout > 0 && (
                    <th className="px-4 py-2 text-right text-xs font-medium text-blue-400">Standard</th>
                  )}
                  {basicPayout > 0 && (
                    <th className="px-4 py-2 text-right text-xs font-medium text-emerald-400">Basic</th>
                  )}
                  {escalatingPayout > 0 && (
                    <th className="px-4 py-2 text-right text-xs font-medium text-amber-400">Escalating</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {[0, 5, 10, 15, 20, 25, 30].map((yearsFromStart) => {
                  const age = startAge + yearsFromStart
                  if (yearsFromStart >= projectionData.years.length) return null
                  return (
                    <tr key={age} className="border-b border-white/[0.04]">
                      <td className="px-4 py-2 text-white">{age}</td>
                      {standardPayout > 0 && (
                        <td className="px-4 py-2 text-right text-slate-300 font-mono">
                          {formatCurrency(projectionData.data.standard.cumulative[yearsFromStart])}
                        </td>
                      )}
                      {basicPayout > 0 && (
                        <td className="px-4 py-2 text-right text-slate-300 font-mono">
                          {formatCurrency(projectionData.data.basic.cumulative[yearsFromStart])}
                        </td>
                      )}
                      {escalatingPayout > 0 && (
                        <td className="px-4 py-2 text-right text-slate-300 font-mono">
                          {formatCurrency(projectionData.data.escalating.cumulative[yearsFromStart])}
                        </td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!hasEnteredValues && (
        <div className="p-8 rounded-xl border border-dashed border-white/[0.1] bg-white/[0.02] text-center">
          <Calculator className="mx-auto h-10 w-10 text-slate-500" />
          <p className="mt-3 text-sm text-slate-400">
            Enter at least one plan&apos;s monthly payout to see the comparison
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Get your estimates from the CPF LIFE Estimator above
          </p>
        </div>
      )}

      {/* Disclaimer */}
      <div className="flex items-start gap-3 p-4 rounded-lg bg-slate-500/5 border border-white/[0.06]">
        <Info className="h-4 w-4 text-slate-400 mt-0.5 flex-shrink-0" />
        <div className="text-xs text-slate-400">
          <p>
            This tool visualizes CPF LIFE payouts based on estimates you provide.
            The escalating plan assumes a 2% annual increase as per CPF LIFE terms.
            Actual payouts may vary. Always verify with{' '}
            <a
              href="https://www.cpf.gov.sg"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:underline"
            >
              cpf.gov.sg
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
