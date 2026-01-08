'use client'

import { useMemo } from 'react'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  type ChartOptions,
} from 'chart.js'
import { Bar } from 'react-chartjs-2'
import { formatCurrency } from '@/lib/format'

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)

export type WaterfallView = 'salary' | 'cpf'

interface CPFContributionWaterfallProps {
  salary: number
  cappedWage?: number // Optional, reserved for future use
  employeeContrib: number
  employerContrib: number
  oaContrib: number
  saContrib: number
  maContrib: number
  activeView: WaterfallView
  className?: string
}

export function CPFContributionWaterfall({
  salary,
  employeeContrib,
  employerContrib,
  oaContrib,
  saContrib,
  maContrib,
  activeView,
  className,
}: CPFContributionWaterfallProps) {

  const takeHome = salary - employeeContrib
  const totalCpf = employeeContrib + employerContrib

  // Salary waterfall: Gross → -Employee CPF → Take-Home
  const salaryChartData = useMemo(() => {
    return {
      labels: ['Gross Salary', 'Employee CPF', 'Take-Home Pay'],
      datasets: [
        // Invisible base for floating effect
        {
          label: 'Base',
          data: [0, takeHome, 0],
          backgroundColor: 'transparent',
          borderWidth: 0,
          barPercentage: 0.6,
          categoryPercentage: 0.7,
        },
        // Visible bars
        {
          label: 'Amount',
          data: [salary, employeeContrib, takeHome],
          backgroundColor: ['#3b82f6', '#ef4444', '#22c55e'],
          borderRadius: 6,
          barPercentage: 0.6,
          categoryPercentage: 0.7,
        },
      ],
    }
  }, [salary, employeeContrib, takeHome])

  // CPF allocation waterfall: Total CPF → OA → SA → MA
  const cpfChartData = useMemo(() => {
    const afterOa = totalCpf - oaContrib
    const afterSa = afterOa - saContrib

    return {
      labels: ['Total CPF', 'OA', 'SA', 'MA'],
      datasets: [
        // Invisible base for floating effect
        {
          label: 'Base',
          data: [0, afterOa, afterSa, 0],
          backgroundColor: 'transparent',
          borderWidth: 0,
          barPercentage: 0.6,
          categoryPercentage: 0.7,
        },
        // Visible bars
        {
          label: 'Amount',
          data: [totalCpf, oaContrib, saContrib, maContrib],
          backgroundColor: ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b'],
          borderRadius: 6,
          barPercentage: 0.6,
          categoryPercentage: 0.7,
        },
      ],
    }
  }, [totalCpf, oaContrib, saContrib, maContrib])

  const chartData = activeView === 'salary' ? salaryChartData : cpfChartData

  const options: ChartOptions<'bar'> = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: 'rgba(12, 12, 12, 0.95)',
        titleColor: '#fff',
        bodyColor: '#94a3b8',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
        padding: 12,
        displayColors: true,
        callbacks: {
          label: (context) => {
            if (context.dataset.label === 'Base') return ''
            return formatCurrency(context.parsed.y ?? 0)
          },
        },
        filter: (tooltipItem) => tooltipItem.dataset.label !== 'Base',
      },
    },
    scales: {
      x: {
        stacked: true,
        grid: {
          display: false,
        },
        ticks: {
          color: '#94a3b8',
          font: { size: 11 },
          maxRotation: 0,
        },
        border: {
          color: 'rgba(255, 255, 255, 0.1)',
        },
      },
      y: {
        stacked: true,
        grid: {
          color: 'rgba(255, 255, 255, 0.04)',
        },
        ticks: {
          color: '#64748b',
          callback: (value) => formatCurrency(Number(value)),
        },
        border: {
          display: false,
        },
      },
    },
  }), [])

  return (
    <div className={`flex flex-col ${className}`}>
      {/* Chart */}
      <div className="flex-1 min-h-[300px]">
        <Bar data={chartData} options={options} />
      </div>

      {/* Breakdown - changes based on view */}
      <div className="mt-6 px-4 pb-4">
        {activeView === 'salary' ? (
          <div>
            <h4 className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-3">Salary Breakdown</h4>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded bg-blue-500" />
                  <span className="text-slate-300">Gross Salary</span>
                </div>
                <span className="font-mono text-white">{formatCurrency(salary)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded bg-red-500" />
                  <span className="text-red-400">Employee CPF</span>
                </div>
                <span className="font-mono text-red-400">({formatCurrency(employeeContrib)})</span>
              </div>
              <div className="border-t border-white/[0.08] pt-2 flex justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded bg-green-500" />
                  <span className="text-green-400 font-medium">Take-Home Pay</span>
                </div>
                <span className="font-mono text-green-400 font-medium">{formatCurrency(takeHome)}</span>
              </div>
            </div>
          </div>
        ) : (
          <div>
            <h4 className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-3">CPF Allocation</h4>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded bg-violet-500" />
                  <span className="text-violet-400">Total CPF</span>
                </div>
                <span className="font-mono text-violet-400">{formatCurrency(totalCpf)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded bg-blue-500" />
                  <span className="text-blue-400">Ordinary Account (OA)</span>
                </div>
                <span className="font-mono text-blue-400">{formatCurrency(oaContrib)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded bg-emerald-500" />
                  <span className="text-emerald-400">Special Account (SA)</span>
                </div>
                <span className="font-mono text-emerald-400">{formatCurrency(saContrib)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded bg-amber-500" />
                  <span className="text-amber-400">MediSave Account (MA)</span>
                </div>
                <span className="font-mono text-amber-400">{formatCurrency(maContrib)}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
