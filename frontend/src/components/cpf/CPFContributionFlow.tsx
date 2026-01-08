'use client'

import { useMemo, useState, useEffect } from 'react'
import { Sankey, Tooltip, Layer, Rectangle, ResponsiveContainer } from 'recharts'
import { Info, DollarSign, GitBranch, BarChart3, ChevronDown } from 'lucide-react'

import { formatCurrency } from '@/lib/format'
import { CPFContributionWaterfall, type WaterfallView } from './CPFContributionWaterfall'
import type { CPFProfile } from '@/types/cpf'
import { CPF_LIMITS } from '@/lib/cpf-mock-data'

// CPF contribution rates by age group (as of 2024)
type AgeGroup = '55_and_below' | '55_to_60' | '60_to_65' | '65_to_70' | 'above_70'

const CPF_RATES: Record<AgeGroup, { employee: number; employer: number; total: number; allocation: { oa: number; sa: number; ma: number } }> = {
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

const AGE_GROUP_LABELS: Record<AgeGroup, string> = {
  '55_and_below': '55 & below',
  '55_to_60': '55-60',
  '60_to_65': '60-65',
  '65_to_70': '65-70',
  'above_70': '>70',
}

function getAgeGroup(age: number): keyof typeof CPF_RATES {
  if (age <= 55) return '55_and_below'
  if (age <= 60) return '55_to_60'
  if (age <= 65) return '60_to_65'
  if (age <= 70) return '65_to_70'
  return 'above_70'
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

type VisualizationMode = 'sankey' | 'waterfall'

export function CPFContributionFlow({ profile, className }: CPFContributionFlowProps) {
  const [selectedView, setSelectedView] = useState<'monthly' | 'annual'>('monthly')
  const [visualizationMode, setVisualizationMode] = useState<VisualizationMode>('sankey')
  const [waterfallView, setWaterfallView] = useState<WaterfallView>('salary')
  const [selectedRateGroup, setSelectedRateGroup] = useState<AgeGroup>(() => getAgeGroup(profile.age))
  const [isRatesDropdownOpen, setIsRatesDropdownOpen] = useState(false)

  const { monthlyIncome, annualBonus, age } = profile
  const derivedAgeGroup = getAgeGroup(age)

  // Sync rate group when age changes
  useEffect(() => {
    setSelectedRateGroup(derivedAgeGroup)
  }, [derivedAgeGroup])

  const rates = CPF_RATES[selectedRateGroup]

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

  return (
    <div className={`flex flex-col rounded-xl border border-white/[0.08] bg-[#0a0a0a] ${className}`}>
      {/* Header with view toggle */}
      <div className="flex flex-col gap-4 border-b border-white/[0.04] p-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between w-full gap-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-blue-300">CPF Contribution Flow</p>
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

        {/* Visualization Mode Toggle */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="flex rounded-lg border border-white/[0.08] bg-white/[0.03] p-0.5">
              <button
                onClick={() => setVisualizationMode('sankey')}
                className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition ${
                  visualizationMode === 'sankey'
                    ? 'bg-white/[0.1] text-white'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                <GitBranch className="h-3.5 w-3.5" />
                Sankey
              </button>
              <button
                onClick={() => setVisualizationMode('waterfall')}
                className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition ${
                  visualizationMode === 'waterfall'
                    ? 'bg-white/[0.1] text-white'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                <BarChart3 className="h-3.5 w-3.5" />
                Waterfall
              </button>
            </div>
          </div>

          {/* Waterfall View Toggle - only show when waterfall mode is active */}
          {visualizationMode === 'waterfall' && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">View:</span>
              <div className="flex rounded-lg border border-white/[0.08] bg-white/[0.03] p-0.5">
                <button
                  onClick={() => setWaterfallView('salary')}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
                    waterfallView === 'salary'
                      ? 'bg-white/[0.1] text-white'
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  Salary Flow
                </button>
                <button
                  onClick={() => setWaterfallView('cpf')}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
                    waterfallView === 'cpf'
                      ? 'bg-white/[0.1] text-white'
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  CPF Allocation
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Chart Section */}
      <div className="relative flex-1 p-5">
        <div className="mb-4 flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-green-400" />
          <h4 className="text-sm font-medium text-white">Money Flow Visualization</h4>
        </div>

        {/* Compact Contribution Rates Overlay */}
        <div className="absolute right-5 top-5 z-10 rounded-lg border border-white/[0.08] bg-slate-900/95 backdrop-blur-sm">
          {/* Header - click to toggle */}
          <button
            onClick={() => setIsRatesDropdownOpen(!isRatesDropdownOpen)}
            className="flex w-full items-center justify-between gap-4 px-3 py-2 hover:bg-white/[0.02] transition-colors"
          >
            <span className="text-[10px] font-medium uppercase tracking-wider text-slate-500">Rates</span>
            <ChevronDown className={`h-3 w-3 text-slate-400 transition-transform ${isRatesDropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* Rates display - collapsible */}
          {isRatesDropdownOpen && (
            <div className="border-t border-white/[0.06] px-3 py-2 space-y-1">
              {/* Age group display */}
              <div className="flex items-center justify-between gap-4 mb-2">
                <span className="text-xs text-slate-400">Age group</span>
                <span className="text-xs font-medium text-blue-400">{AGE_GROUP_LABELS[selectedRateGroup]}</span>
              </div>
              {/* Rates */}
              <div className="space-y-0.5 text-xs">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-slate-400">Employee</span>
                  <span className="font-mono font-medium text-purple-400">{(rates.employee * 100).toFixed(0)}%</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-slate-400">Employer</span>
                  <span className="font-mono font-medium text-pink-400">{(rates.employer * 100).toFixed(0)}%</span>
                </div>
                <div className="mt-1 flex items-center justify-between gap-4 border-t border-white/[0.06] pt-1">
                  <span className="text-slate-300">Total</span>
                  <span className="font-mono font-semibold text-white">{(rates.total * 100).toFixed(0)}%</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sankey Chart */}
        {visualizationMode === 'sankey' && (
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
                    const tooltipData = payload[0].payload
                    if (tooltipData.source && tooltipData.target) {
                      return (
                        <div className="rounded-lg border border-white/10 bg-[#0f1728]/95 px-3 py-2 shadow-xl backdrop-blur">
                          <p className="text-xs text-slate-400">
                            {tooltipData.source.name} → {tooltipData.target.name}
                          </p>
                          <p className="text-lg font-semibold text-white">
                            {formatCurrency(tooltipData.value)}
                          </p>
                        </div>
                      )
                    }
                    return (
                      <div className="rounded-lg border border-white/10 bg-[#0f1728]/95 px-3 py-2 shadow-xl backdrop-blur">
                        <p className="text-xs text-slate-400">{tooltipData.name}</p>
                        <p className="text-lg font-semibold text-white">
                          {formatCurrency(tooltipData.value)}
                        </p>
                      </div>
                    )
                  }}
                />
              </Sankey>
            </ResponsiveContainer>
          </div>
        )}

        {/* Waterfall Chart */}
        {visualizationMode === 'waterfall' && (
          <CPFContributionWaterfall
            salary={data.grossSalary}
            employeeContrib={data.employeeCPF}
            employerContrib={data.employerCPF}
            oaContrib={data.oaContribution}
            saContrib={data.saContribution}
            maContrib={data.maContribution}
            activeView={waterfallView}
            className="min-h-[400px]"
          />
        )}
      </div>

      {/* Info Footer */}
      <div className="border-t border-white/[0.04] px-5 py-4">
        <div className="flex items-start gap-3 rounded-lg bg-blue-500/5 p-3">
          <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-400" />
          <div className="text-xs text-slate-300">
            <p>
              CPF contribution rates vary by age group. Rates shown are for Singapore Citizens and
              3rd year+ Permanent Residents. The OW ceiling is ${CPF_LIMITS.owCeiling.toLocaleString()}/month
              and the annual ceiling is ${CPF_LIMITS.annualCeiling.toLocaleString()}.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
