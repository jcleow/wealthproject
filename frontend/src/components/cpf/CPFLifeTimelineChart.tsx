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
import { TrendingUp, Info, Calendar, DollarSign, PiggyBank } from 'lucide-react'

import { formatCurrency } from '@/lib/format'
import { cn } from '@/lib/utils'

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

// CPF LIFE payout factors (per $1,000 of RA balance)
const PAYOUT_FACTORS = {
  standard: { 65: 5.50, 66: 5.90, 67: 6.30, 68: 6.80, 69: 7.30, 70: 7.90 },
  basic: { 65: 5.00, 66: 5.40, 67: 5.80, 68: 6.20, 69: 6.70, 70: 7.20 },
  escalating: { 65: 4.40, 66: 4.70, 67: 5.00, 68: 5.40, 69: 5.80, 70: 6.30 },
}

const PLAN_COLORS = {
  standard: { main: '#3b82f6', light: 'rgba(59, 130, 246, 0.1)' },
  basic: { main: '#10b981', light: 'rgba(16, 185, 129, 0.1)' },
  escalating: { main: '#f59e0b', light: 'rgba(245, 158, 11, 0.1)' },
}

const PLAN_INFO = {
  standard: {
    name: 'Standard',
    description: 'Highest monthly payout, level for life',
    icon: DollarSign,
  },
  basic: {
    name: 'Basic',
    description: 'Lower payout, highest bequest to family',
    icon: PiggyBank,
  },
  escalating: {
    name: 'Escalating',
    description: 'Starts lower, increases 2% yearly for inflation protection',
    icon: TrendingUp,
  },
}

type PlanType = keyof typeof PAYOUT_FACTORS
type StartAge = 65 | 66 | 67 | 68 | 69 | 70

interface CPFLifeTimelineChartProps {
  className?: string
}

export function CPFLifeTimelineChart({ className }: CPFLifeTimelineChartProps) {
  const [raBalance, setRaBalance] = useState(213000) // FRS 2025
  const [startAge, setStartAge] = useState<StartAge>(65)
  const [selectedPlans, setSelectedPlans] = useState<PlanType[]>(['standard', 'escalating'])
  const [showCumulative, setShowCumulative] = useState(false)

  const togglePlan = (plan: PlanType) => {
    if (selectedPlans.includes(plan)) {
      if (selectedPlans.length > 1) {
        setSelectedPlans(selectedPlans.filter(p => p !== plan))
      }
    } else {
      setSelectedPlans([...selectedPlans, plan])
    }
  }

  // Generate projection data for all plans
  const projectionData = useMemo(() => {
    const years = Array.from({ length: 31 }, (_, i) => startAge + i) // Up to age 95
    const raInThousands = raBalance / 1000

    const calculatePayout = (plan: PlanType, age: number): number => {
      const basePayout = raInThousands * PAYOUT_FACTORS[plan][startAge]
      if (plan === 'escalating') {
        const yearsFromStart = age - startAge
        return basePayout * Math.pow(1.02, yearsFromStart)
      }
      return basePayout
    }

    const data: Record<PlanType, { monthly: number[]; cumulative: number[] }> = {
      standard: { monthly: [], cumulative: [] },
      basic: { monthly: [], cumulative: [] },
      escalating: { monthly: [], cumulative: [] },
    }

    for (const plan of ['standard', 'basic', 'escalating'] as PlanType[]) {
      let cumulative = 0
      for (const age of years) {
        const monthly = calculatePayout(plan, age)
        cumulative += monthly * 12
        data[plan].monthly.push(monthly)
        data[plan].cumulative.push(cumulative)
      }
    }

    return { years, data }
  }, [raBalance, startAge])

  // Calculate key metrics
  const metrics = useMemo(() => {
    const raInThousands = raBalance / 1000
    return {
      standard: {
        initialMonthly: raInThousands * PAYOUT_FACTORS.standard[startAge],
        at10Years: raInThousands * PAYOUT_FACTORS.standard[startAge] * 12 * 10,
        at20Years: raInThousands * PAYOUT_FACTORS.standard[startAge] * 12 * 20,
      },
      basic: {
        initialMonthly: raInThousands * PAYOUT_FACTORS.basic[startAge],
        at10Years: raInThousands * PAYOUT_FACTORS.basic[startAge] * 12 * 10,
        at20Years: raInThousands * PAYOUT_FACTORS.basic[startAge] * 12 * 20,
      },
      escalating: {
        initialMonthly: raInThousands * PAYOUT_FACTORS.escalating[startAge],
        // Escalating increases 2% per year
        at10Years: (() => {
          let total = 0
          const base = raInThousands * PAYOUT_FACTORS.escalating[startAge]
          for (let i = 0; i < 10; i++) {
            total += base * Math.pow(1.02, i) * 12
          }
          return total
        })(),
        at20Years: (() => {
          let total = 0
          const base = raInThousands * PAYOUT_FACTORS.escalating[startAge]
          for (let i = 0; i < 20; i++) {
            total += base * Math.pow(1.02, i) * 12
          }
          return total
        })(),
      },
    }
  }, [raBalance, startAge])

  // Chart configuration
  const chartData = {
    labels: projectionData.years.map(age => `Age ${age}`),
    datasets: selectedPlans.map(plan => ({
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
      },
      y: {
        grid: {
          color: 'rgba(255, 255, 255, 0.04)',
        },
        ticks: {
          color: '#64748b',
          callback: (value: number | string) => formatCurrency(Number(value)),
        },
      },
    },
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="flex items-center gap-2 text-lg font-semibold text-white">
            <TrendingUp className="h-5 w-5 text-emerald-400" />
            CPF LIFE Payout Comparison
          </h3>
          <p className="mt-1 text-sm text-slate-400">
            Compare how different plans perform over your retirement
          </p>
        </div>
      </div>

      {/* Input Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 rounded-xl border border-white/[0.08] bg-white/[0.02]">
        <div>
          <label className="flex items-center gap-2 text-xs font-medium text-violet-400 mb-2">
            <PiggyBank className="h-3.5 w-3.5" />
            Retirement Account Balance at Payout Start
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</span>
            <input
              type="number"
              value={raBalance}
              onChange={(e) => setRaBalance(Math.max(0, Number(e.target.value)))}
              className="w-full py-2.5 pl-7 pr-3 rounded-lg border border-white/[0.08] bg-white/[0.02] text-white text-lg font-semibold focus:border-violet-500/50 focus:outline-none"
            />
          </div>
          <input
            type="range"
            min={60000}
            max={500000}
            step={5000}
            value={raBalance}
            onChange={(e) => setRaBalance(Number(e.target.value))}
            className="w-full mt-2 accent-violet-500"
          />
          <div className="mt-1 flex justify-between text-xs text-slate-500">
            <span>$60K (min for LIFE)</span>
            <span>$500K</span>
          </div>
        </div>

        <div>
          <label className="flex items-center gap-2 text-xs font-medium text-emerald-400 mb-2">
            <Calendar className="h-3.5 w-3.5" />
            Payout Start Age
          </label>
          <div className="grid grid-cols-6 gap-2">
            {([65, 66, 67, 68, 69, 70] as StartAge[]).map(age => (
              <button
                key={age}
                onClick={() => setStartAge(age)}
                className={cn(
                  "py-2 rounded-lg text-sm font-medium transition-all",
                  startAge === age
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                    : "bg-white/[0.02] text-slate-400 border border-white/[0.06] hover:bg-white/[0.04]"
                )}
              >
                {age}
              </button>
            ))}
          </div>
          {startAge > 65 && (
            <p className="mt-2 text-xs text-emerald-400">
              +{(startAge - 65) * 7}% higher payouts by deferring {startAge - 65} year{startAge > 66 ? 's' : ''}
            </p>
          )}
        </div>
      </div>

      {/* Plan Selection */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {(['standard', 'basic', 'escalating'] as PlanType[]).map(plan => {
          const info = PLAN_INFO[plan]
          const Icon = info.icon
          const isSelected = selectedPlans.includes(plan)
          const colors = PLAN_COLORS[plan]

          return (
            <button
              key={plan}
              onClick={() => togglePlan(plan)}
              className={cn(
                "p-4 rounded-xl border text-left transition-all",
                isSelected
                  ? "border-2"
                  : "border-white/[0.08] bg-[#0a0a0a] hover:border-white/[0.12] opacity-60"
              )}
              style={{
                borderColor: isSelected ? colors.main : undefined,
                backgroundColor: isSelected ? colors.light : undefined,
              }}
            >
              <div className="flex items-center gap-2 mb-2">
                <Icon className="h-4 w-4" style={{ color: colors.main }} />
                <span className="font-medium text-white">{info.name}</span>
                {isSelected && (
                  <span className="ml-auto text-xs px-1.5 py-0.5 rounded bg-white/10 text-slate-300">
                    Active
                  </span>
                )}
              </div>
              <div className="text-xl font-bold text-white">
                {formatCurrency(metrics[plan].initialMonthly)}
                <span className="text-sm font-normal text-slate-400">/mo</span>
              </div>
              <p className="mt-1 text-xs text-slate-500">{info.description}</p>
            </button>
          )
        })}
      </div>

      {/* Chart */}
      <div className="p-4 rounded-xl border border-white/[0.08] bg-[#0a0a0a]">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            {selectedPlans.map(plan => (
              <div key={plan} className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: PLAN_COLORS[plan].main }}
                />
                <span className="text-sm text-slate-300">{PLAN_INFO[plan].name}</span>
              </div>
            ))}
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

        <div className="h-[350px]">
          <Line data={chartData} options={chartOptions} />
        </div>
      </div>

      {/* Comparison Table */}
      <div className="p-4 rounded-xl border border-white/[0.08] bg-[#0a0a0a]">
        <h4 className="text-sm font-medium text-white mb-4">Plan Comparison Summary</h4>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.06]">
                <th className="px-4 py-2 text-left text-xs font-medium text-slate-400">Plan</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-slate-400">Initial Monthly</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-slate-400">After 10 Years</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-slate-400">After 20 Years</th>
              </tr>
            </thead>
            <tbody>
              {(['standard', 'basic', 'escalating'] as PlanType[]).map(plan => {
                const m = metrics[plan]
                return (
                  <tr key={plan} className="border-b border-white/[0.04]">
                    <td className="px-4 py-3">
                      <span
                        className="font-medium"
                        style={{ color: PLAN_COLORS[plan].main }}
                      >
                        {PLAN_INFO[plan].name}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-white font-mono">
                      {formatCurrency(m.initialMonthly)}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-300 font-mono">
                      {formatCurrency(m.at10Years)}
                    </td>
                    <td className="px-4 py-3 text-right text-emerald-400 font-mono">
                      {formatCurrency(m.at20Years)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Insight */}
      <div className="flex items-start gap-3 p-4 rounded-lg bg-amber-500/5 border border-amber-500/10">
        <Info className="h-4 w-4 text-amber-400 mt-0.5 flex-shrink-0" />
        <div className="text-xs text-slate-300 space-y-1">
          <p className="font-medium text-amber-300">Key Insight</p>
          <p className="text-slate-400">
            <strong className="text-amber-400">Standard</strong> gives you the highest income immediately.
            <strong className="text-emerald-400"> Basic</strong> leaves more for your family.
            <strong className="text-blue-400"> Escalating</strong> overtakes Standard around year 15-17 and provides better inflation protection for longer retirements.
          </p>
        </div>
      </div>
    </div>
  )
}
