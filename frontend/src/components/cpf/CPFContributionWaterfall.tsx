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
import { ArrowRight } from 'lucide-react'

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)

interface CPFContributionWaterfallProps {
  salary: number
  cappedWage?: number // Optional, reserved for future use
  employeeContrib: number
  employerContrib: number
  oaContrib: number
  saContrib: number
  maContrib: number
  className?: string
}

export function CPFContributionWaterfall({
  salary,
  employeeContrib,
  employerContrib,
  oaContrib,
  saContrib,
  maContrib,
  className,
}: CPFContributionWaterfallProps) {
  const takeHome = salary - employeeContrib
  const totalCpf = employeeContrib + employerContrib

  // Waterfall data: shows step-by-step breakdown
  const chartData = useMemo(() => {
    return {
      labels: ['Gross\nSalary', 'Employee\nCPF', 'Take-Home\nPay', 'Employer\nCPF', 'Total\nCPF', 'OA', 'SA', 'MA'],
      datasets: [
        // Invisible base for waterfall effect
        {
          label: 'Base',
          data: [0, salary - employeeContrib, 0, 0, 0, totalCpf - oaContrib - saContrib - maContrib, totalCpf - saContrib - maContrib, totalCpf - maContrib],
          backgroundColor: 'transparent',
          borderWidth: 0,
          barPercentage: 0.6,
        },
        // Actual values
        {
          label: 'Amount',
          data: [salary, employeeContrib, takeHome, employerContrib, totalCpf, oaContrib, saContrib, maContrib],
          backgroundColor: [
            '#6366f1', // Gross - indigo
            '#ef4444', // Employee CPF - red (deduction)
            '#22c55e', // Take-home - green
            '#22c55e', // Employer CPF - green (benefit)
            '#8b5cf6', // Total CPF - violet
            '#3b82f6', // OA - blue
            '#10b981', // SA - emerald
            '#f59e0b', // MA - amber
          ],
          borderRadius: 6,
          barPercentage: 0.6,
        },
      ],
    }
  }, [salary, employeeContrib, employerContrib, takeHome, totalCpf, oaContrib, saContrib, maContrib])

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
      {/* Flow Description */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.06] overflow-x-auto">
        <div className="flex items-center gap-2 text-xs whitespace-nowrap">
          <span className="px-2 py-1 rounded bg-indigo-500/20 text-indigo-300">Gross Salary</span>
          <ArrowRight className="h-3 w-3 text-slate-500" />
          <span className="px-2 py-1 rounded bg-red-500/20 text-red-300">− Employee CPF</span>
          <ArrowRight className="h-3 w-3 text-slate-500" />
          <span className="px-2 py-1 rounded bg-green-500/20 text-green-300">Take-Home</span>
        </div>
        <div className="w-px h-4 bg-white/10 mx-2" />
        <div className="flex items-center gap-2 text-xs whitespace-nowrap">
          <span className="px-2 py-1 rounded bg-violet-500/20 text-violet-300">Total CPF</span>
          <ArrowRight className="h-3 w-3 text-slate-500" />
          <span className="px-2 py-1 rounded bg-blue-500/20 text-blue-300">OA</span>
          <span className="text-slate-500">+</span>
          <span className="px-2 py-1 rounded bg-emerald-500/20 text-emerald-300">SA</span>
          <span className="text-slate-500">+</span>
          <span className="px-2 py-1 rounded bg-amber-500/20 text-amber-300">MA</span>
        </div>
      </div>

      {/* Chart */}
      <div className="flex-1 min-h-[350px] p-4">
        <Bar data={chartData} options={options} />
      </div>

      {/* Breakdown Cards */}
      <div className="grid grid-cols-2 gap-3 px-4 pb-4">
        {/* Salary Breakdown */}
        <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-3">
          <h4 className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-2">Salary Breakdown</h4>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-300">Gross Salary</span>
              <span className="font-mono text-white">{formatCurrency(salary)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-red-400">− Employee CPF</span>
              <span className="font-mono text-red-400">({formatCurrency(employeeContrib)})</span>
            </div>
            <div className="border-t border-white/[0.08] pt-2 flex justify-between text-sm">
              <span className="text-green-400 font-medium">Take-Home Pay</span>
              <span className="font-mono text-green-400 font-medium">{formatCurrency(takeHome)}</span>
            </div>
          </div>
        </div>

        {/* CPF Allocation */}
        <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-3">
          <h4 className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-2">CPF Allocation</h4>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-violet-400">Total CPF</span>
              <span className="font-mono text-violet-400">{formatCurrency(totalCpf)}</span>
            </div>
            <div className="pl-3 space-y-1 border-l-2 border-violet-500/30">
              <div className="flex justify-between text-sm">
                <span className="text-blue-400">OA</span>
                <span className="font-mono text-blue-400">{formatCurrency(oaContrib)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-emerald-400">SA</span>
                <span className="font-mono text-emerald-400">{formatCurrency(saContrib)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-amber-400">MA</span>
                <span className="font-mono text-amber-400">{formatCurrency(maContrib)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
