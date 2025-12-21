'use client'

import { useMemo, useState } from 'react'
import { Sankey, Tooltip, Layer, Rectangle, ResponsiveContainer } from 'recharts'
import { Info, DollarSign, Percent } from 'lucide-react'

import { formatCurrency } from '@/lib/format'
import type { CPFProfile } from '@/types/cpf'
import { CPF_LIMITS } from '@/lib/cpf-mock-data'

// CPF contribution rates by age group (as of 2024)
const CPF_RATES = {
  '55_and_below': {
    employee: 0.20,
    employer: 0.17,
    total: 0.37,
    allocation: { oa: 0.6217, sa: 0.1621, ma: 0.2162 }, // Proportions of total
  },
  '55_to_60': {
    employee: 0.15,
    employer: 0.15,
    total: 0.30,
    allocation: { oa: 0.5000, sa: 0.1167, ma: 0.3833 },
  },
  '60_to_65': {
    employee: 0.095,
    employer: 0.115,
    total: 0.21,
    allocation: { oa: 0.3810, sa: 0.1190, ma: 0.5000 },
  },
  '65_to_70': {
    employee: 0.07,
    employer: 0.09,
    total: 0.16,
    allocation: { oa: 0.2500, sa: 0.0625, ma: 0.6875 },
  },
  'above_70': {
    employee: 0.05,
    employer: 0.075,
    total: 0.125,
    allocation: { oa: 0.2000, sa: 0.0800, ma: 0.7200 },
  },
}

function getAgeGroup(age: number): keyof typeof CPF_RATES {
  if (age <= 55) return '55_and_below'
  if (age <= 60) return '55_to_60'
  if (age <= 65) return '60_to_65'
  if (age <= 70) return '65_to_70'
  return 'above_70'
}

const ACCOUNT_INFO = {
  oa: {
    name: 'Ordinary Account (OA)',
    color: '#3b82f6',
    description: 'For housing, insurance, investment and education',
    rate: '2.5% p.a.',
  },
  sa: {
    name: 'Special Account (SA)',
    color: '#10b981',
    description: 'For retirement savings and approved investments',
    rate: '4.0% p.a.',
  },
  ma: {
    name: 'MediSave Account (MA)',
    color: '#f59e0b',
    description: 'For healthcare and medical insurance',
    rate: '4.0% p.a.',
  },
}

interface CPFContributionFlowProps {
  profile: CPFProfile
  className?: string
}

// Custom node component for Sankey
function CustomNode({ x, y, width, height, payload }: any) {
  const colors: Record<string, string> = {
    'Gross Salary': '#6366f1',
    'Take-Home Pay': '#22c55e',
    'Employer CPF': '#ec4899',
    'Ordinary Account (OA)': '#3b82f6',
    'Special Account (SA)': '#10b981',
    'MediSave Account (MA)': '#f59e0b',
  }

  // Left side nodes get labels on left, right side nodes get labels on right
  const isLeftNode = payload.name === 'Gross Salary' || payload.name === 'Employer CPF'

  const textX = isLeftNode ? x - 8 : x + width + 8
  const textY = y + height / 2
  const textAnchor: 'start' | 'end' = isLeftNode ? 'end' : 'start'

  return (
    <Layer>
      <Rectangle
        x={x}
        y={y}
        width={width}
        height={height}
        fill={colors[payload.name] || '#64748b'}
        fillOpacity={0.9}
        rx={4}
        ry={4}
      />
      <text
        x={textX}
        y={textY}
        textAnchor={textAnchor}
        dominantBaseline="middle"
        className="fill-white text-xs font-medium"
      >
        {payload.name}
      </text>
    </Layer>
  )
}

export function CPFContributionFlow({ profile, className }: CPFContributionFlowProps) {
  const [selectedView, setSelectedView] = useState<'monthly' | 'annual'>('monthly')

  const { monthlyIncome, annualBonus, age } = profile
  const ageGroup = getAgeGroup(age)
  const rates = CPF_RATES[ageGroup]

  const calculations = useMemo(() => {
    // Apply OW ceiling
    const cappedMonthlyOW = Math.min(monthlyIncome, CPF_LIMITS.owCeiling)
    const annualOW = cappedMonthlyOW * 12

    // Calculate AW ceiling
    const awCeiling = CPF_LIMITS.annualCeiling - annualOW
    const cappedAnnualBonus = Math.min(annualBonus, awCeiling)

    // Total wages subject to CPF
    const totalWagesSubjectToCPF = annualOW + cappedAnnualBonus

    // Contributions
    const employeeCPF = totalWagesSubjectToCPF * rates.employee
    const employerCPF = totalWagesSubjectToCPF * rates.employer
    const totalCPF = employeeCPF + employerCPF

    // Allocation to accounts
    const oaContribution = totalCPF * rates.allocation.oa
    const saContribution = totalCPF * rates.allocation.sa
    const maContribution = totalCPF * rates.allocation.ma

    // Take-home pay (gross - employee CPF)
    const annualGross = monthlyIncome * 12 + annualBonus
    const takeHome = annualGross - employeeCPF

    return {
      annual: {
        grossSalary: annualGross,
        cappedWages: totalWagesSubjectToCPF,
        excessWages: annualGross - totalWagesSubjectToCPF,
        employeeCPF,
        employerCPF,
        totalCPF,
        oaContribution,
        saContribution,
        maContribution,
        takeHome,
      },
      monthly: {
        grossSalary: annualGross / 12,
        cappedWages: totalWagesSubjectToCPF / 12,
        excessWages: (annualGross - totalWagesSubjectToCPF) / 12,
        employeeCPF: employeeCPF / 12,
        employerCPF: employerCPF / 12,
        totalCPF: totalCPF / 12,
        oaContribution: oaContribution / 12,
        saContribution: saContribution / 12,
        maContribution: maContribution / 12,
        takeHome: takeHome / 12,
      },
    }
  }, [monthlyIncome, annualBonus, rates])

  const data = selectedView === 'monthly' ? calculations.monthly : calculations.annual

  // Sankey data structure - simplified to avoid overlapping flows
  // Structure: Gross Salary -> Take-Home Pay (top) + directly to CPF accounts (bottom)
  const sankeyData = useMemo(() => {
    return {
      nodes: [
        { name: 'Gross Salary' },         // 0 - left
        { name: 'Take-Home Pay' },        // 1 - right top
        { name: 'Employer CPF' },         // 2 - left bottom (bonus contribution)
        { name: 'Ordinary Account (OA)' }, // 3 - right
        { name: 'MediSave Account (MA)' }, // 4 - right
        { name: 'Special Account (SA)' },  // 5 - right
      ],
      links: [
        // Gross Salary -> Take-Home Pay (largest flow, at top)
        { source: 0, target: 1, value: data.takeHome },
        // Gross Salary -> CPF accounts (employee contribution portion)
        { source: 0, target: 3, value: data.oaContribution * (data.employeeCPF / data.totalCPF) },
        { source: 0, target: 4, value: data.maContribution * (data.employeeCPF / data.totalCPF) },
        { source: 0, target: 5, value: data.saContribution * (data.employeeCPF / data.totalCPF) },
        // Employer CPF -> CPF accounts (employer contribution portion)
        { source: 2, target: 3, value: data.oaContribution * (data.employerCPF / data.totalCPF) },
        { source: 2, target: 4, value: data.maContribution * (data.employerCPF / data.totalCPF) },
        { source: 2, target: 5, value: data.saContribution * (data.employerCPF / data.totalCPF) },
      ],
    }
  }, [data])

  const ageGroupLabel = ageGroup
    .replace(/_/g, ' ')
    .replace('and below', '& below')
    .replace('to', '-')
    .replace('above', '>')

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header with view toggle */}
      <div className={`flex flex-col sm:flex-row sm:items-center sm:justify-between
gap-4`}>
        <div>
          <h3 className="text-lg font-medium text-white">CPF Contribution Flow</h3>
          <p className="text-sm text-slate-400">
            How your salary flows into CPF accounts (Age group: {ageGroupLabel})
          </p>
        </div>
        <div className="flex rounded-lg border border-white/10 bg-white/5 p-1">
          <button
            onClick={() => setSelectedView('monthly')}
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition ${
              selectedView === 'monthly'
                ? 'bg-white/10 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setSelectedView('annual')}
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition ${
              selectedView === 'annual'
                ? 'bg-white/10 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Annual
          </button>
        </div>
      </div>

      {/* Contribution Rates Card */}
      <div className="rounded-xl border border-white/[0.08] bg-[#0a0a0a] p-5">
        <div className="mb-4 flex items-center gap-2">
          <Percent className="h-4 w-4 text-purple-400" />
          <h4 className="text-sm font-medium text-white">Current Contribution Rates</h4>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-lg bg-purple-500/10 p-3 text-center">
            <p className="text-xs text-slate-400">Employee</p>
            <p className="text-xl font-semibold text-purple-400">{(rates.employee * 100).toFixed(0)}%</p>
          </div>
          <div className="rounded-lg bg-pink-500/10 p-3 text-center">
            <p className="text-xs text-slate-400">Employer</p>
            <p className="text-xl font-semibold text-pink-400">{(rates.employer * 100).toFixed(0)}%</p>
          </div>
          <div className="rounded-lg bg-indigo-500/10 p-3 text-center">
            <p className="text-xs text-slate-400">Total</p>
            <p className="text-xl font-semibold text-indigo-400">{(rates.total * 100).toFixed(0)}%</p>
          </div>
        </div>
      </div>

      {/* Sankey Chart */}
      <div className="rounded-xl border border-white/[0.08] bg-[#0a0a0a] p-5">
        <div className="mb-4 flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-green-400" />
          <h4 className="text-sm font-medium text-white">Money Flow Visualization</h4>
        </div>

        <div className="h-[400px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <Sankey
              data={sankeyData}
              node={<CustomNode />}
              nodePadding={50}
              nodeWidth={12}
              linkCurvature={0.5}
              margin={{ top: 40, right: 180, bottom: 20, left: 100 }}
              link={{
                stroke: '#ffffff',
                strokeOpacity: 0.2,
              }}
            >
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.[0]) return null
                  const data = payload[0].payload
                  if (data.source && data.target) {
                    return (
                      <div className={`px-3 py-2
rounded-lg border border-white/10
bg-[#0f1728]/95
shadow-xl backdrop-blur`}>
                        <p className="text-xs text-slate-400">
                          {data.source.name} → {data.target.name}
                        </p>
                        <p className="text-lg font-semibold text-white">
                          {formatCurrency(data.value)}
                        </p>
                      </div>
                    )
                  }
                  return (
                    <div className={`px-3 py-2
rounded-lg border border-white/10
bg-[#0f1728]/95
shadow-xl backdrop-blur`}>
                      <p className="text-xs text-slate-400">{data.name}</p>
                      <p className="text-lg font-semibold text-white">
                        {formatCurrency(data.value)}
                      </p>
                    </div>
                  )
                }}
              />
            </Sankey>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Breakdown Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Left: Salary Breakdown */}
        <div className="rounded-xl border border-white/[0.08] bg-[#0a0a0a] p-5">
          <h4 className="mb-4 text-sm font-medium text-white">Salary Breakdown</h4>
          <div className="space-y-3">
            <div className={`flex items-center justify-between
p-3
rounded-lg
bg-indigo-500/10`}>
              <span className="text-sm text-slate-300">Gross Salary</span>
              <span className="font-semibold text-indigo-400">{formatCurrency(data.grossSalary)}</span>
            </div>
            <div className={`flex items-center justify-between
p-3
rounded-lg
bg-purple-500/10`}>
              <span className="text-sm text-slate-300">Employee CPF (-)</span>
              <span className="font-semibold text-purple-400">-{formatCurrency(data.employeeCPF)}</span>
            </div>
            <div className={`flex items-center justify-between
p-3
rounded-lg
bg-green-500/10`}>
              <span className="text-sm text-slate-300">Take-Home Pay</span>
              <span className="font-semibold text-green-400">{formatCurrency(data.takeHome)}</span>
            </div>
            <div className="my-2 border-t border-white/5" />
            <div className={`flex items-center justify-between
p-3
rounded-lg
bg-pink-500/10`}>
              <span className="text-sm text-slate-300">Employer CPF (+)</span>
              <span className="font-semibold text-pink-400">+{formatCurrency(data.employerCPF)}</span>
            </div>
            <div className={`flex items-center justify-between
p-3
rounded-lg
bg-amber-500/10`}>
              <span className="text-sm text-slate-300">Total CPF Contribution</span>
              <span className="font-semibold text-amber-400">{formatCurrency(data.totalCPF)}</span>
            </div>
          </div>
        </div>

        {/* Right: Account Allocation */}
        <div className="rounded-xl border border-white/[0.08] bg-[#0a0a0a] p-5">
          <h4 className="mb-4 text-sm font-medium text-white">Account Allocation</h4>
          <div className="space-y-3">
            {Object.entries(ACCOUNT_INFO).map(([key, info]) => {
              const amount = data[`${key}Contribution` as keyof typeof data] as number
              const percentage = (amount / data.totalCPF) * 100

              return (
                <div key={key} className="group relative">
                  <div
                    className="flex items-center justify-between rounded-lg p-3"
                    style={{ backgroundColor: `${info.color}15` }}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: info.color }}
                      />
                      <span className="text-sm text-slate-300">{info.name}</span>
                      <div className="relative">
                        <Info className="h-3.5 w-3.5 cursor-help text-slate-500" />
                        <div className={`absolute bottom-full left-1/2 z-50
pointer-events-none mb-2
opacity-0 group-hover:opacity-100
transition-opacity
-translate-x-1/2`}>
                          <div className={`w-48
px-3 py-2
rounded-lg border border-white/10
bg-[#0f1728]/95
text-xs
shadow-xl backdrop-blur`}>
                            <p className="font-medium text-white">{info.rate}</p>
                            <p className="mt-0.5 text-slate-300">{info.description}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="font-semibold" style={{ color: info.color }}>
                        {formatCurrency(amount)}
                      </span>
                      <span className="ml-2 text-xs text-slate-500">({percentage.toFixed(1)}%)</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Ceiling Info */}
          {data.excessWages > 0 && (
            <div className={`flex items-start
mt-4 gap-2 p-3
rounded-lg
bg-amber-500/10`}>
              <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-400" />
              <p className="text-xs text-amber-200">
                {formatCurrency(data.excessWages)} of your {selectedView} income exceeds the CPF
                wage ceiling and does not attract CPF contributions.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Info Footer */}
      <div className={`flex items-start
gap-3 p-4
rounded-lg border border-white/[0.06]
bg-white/[0.02]`}>
        <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-400" />
        <div className="text-xs text-slate-400">
          <p>
            CPF contribution rates vary by age group. Rates shown are for Singapore Citizens and
            3rd year+ Permanent Residents. The OW ceiling is ${CPF_LIMITS.owCeiling.toLocaleString()}/month
            and the annual ceiling is ${CPF_LIMITS.annualCeiling.toLocaleString()}.
          </p>
        </div>
      </div>
    </div>
  )
}
