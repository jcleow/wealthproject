'use client'

import { useMemo, useState, useEffect } from 'react'
import { Sankey, Tooltip, Layer, Rectangle, ResponsiveContainer } from 'recharts'
import { Info, DollarSign, GitBranch, BarChart3, ChevronDown } from 'lucide-react'

import { formatCurrency } from '@/lib/format'
import { useTheme, type AppTheme } from '@/lib/theme'
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

// Factory function to create theme-aware Sankey node component
function createCustomNode(theme: AppTheme) {
  return function CustomNode({ x, y, width, height, payload }: any) {
    const colors: Record<string, string> = {
      'Gross Salary': '#6366f1',
      'Take-Home Pay': theme.sage,
      'Employer CPF': '#ec4899',
      'Ordinary Account (OA)': theme.chartOA,
      'Special Account (SA)': theme.chartSA,
      'MediSave Account (MA)': theme.chartMA,
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
          fill={theme.textPrimary}
          fontSize={12}
          fontWeight={500}
        >
          {payload.name}
        </text>
      </Layer>
    )
  }
}

type VisualizationMode = 'sankey' | 'waterfall'

export function CPFContributionFlow({ profile, className }: CPFContributionFlowProps) {
  const { theme, isMonet } = useTheme()
  const [selectedView, setSelectedView] = useState<'monthly' | 'annual'>('monthly')
  const [visualizationMode, setVisualizationMode] = useState<VisualizationMode>('sankey')
  const [waterfallView, setWaterfallView] = useState<WaterfallView>('salary')
  const [selectedRateGroup, setSelectedRateGroup] = useState<AgeGroup>(() => getAgeGroup(profile.age))
  const [isRatesDropdownOpen, setIsRatesDropdownOpen] = useState(false)

  const { monthlyIncome, annualBonus, age } = profile
  const derivedAgeGroup = getAgeGroup(age)

  // Create theme-aware Sankey node component
  const CustomNode = useMemo(() => createCustomNode(theme), [theme])

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
    <div
      className={`flex flex-col rounded-xl transition-colors duration-300 ${className}`}
      style={{
        background: theme.cardBg,
        border: `1px solid ${theme.cardBorder}`,
      }}
    >
      {/* Header with view toggle */}
      <div
        className="flex flex-col gap-4 p-5 transition-colors duration-300"
        style={{
          borderBottom: `1px solid ${theme.surfaceBorder}`,
        }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between w-full gap-4">
          <div>
            <p className="text-xs uppercase tracking-wide" style={{ color: theme.blue }}>
              CPF Contribution Flow
            </p>
          </div>
          <div
            className="flex rounded-lg p-1 transition-colors duration-300"
            style={{
              background: theme.controlBg,
              border: `1px solid ${theme.controlBorder}`,
            }}
          >
            <button
              onClick={() => setSelectedView('monthly')}
              className="rounded-md px-4 py-1.5 text-sm font-medium transition-all duration-200"
              style={{
                background: selectedView === 'monthly' ? theme.activeBg : 'transparent',
                color: selectedView === 'monthly' ? theme.textPrimary : theme.textMuted,
              }}
            >
              Monthly
            </button>
            <button
              onClick={() => setSelectedView('annual')}
              className="rounded-md px-4 py-1.5 text-sm font-medium transition-all duration-200"
              style={{
                background: selectedView === 'annual' ? theme.activeBg : 'transparent',
                color: selectedView === 'annual' ? theme.textPrimary : theme.textMuted,
              }}
            >
              Annual
            </button>
          </div>
        </div>

        {/* Visualization Mode Toggle */}
        <div className="flex w-full items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div
              className="flex rounded-lg p-0.5 transition-colors duration-300"
              style={{
                background: theme.controlBg,
                border: `1px solid ${theme.controlBorder}`,
              }}
            >
              <button
                onClick={() => setVisualizationMode('sankey')}
                className="flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-all duration-200"
                style={{
                  background: visualizationMode === 'sankey' ? theme.activeBg : 'transparent',
                  color: visualizationMode === 'sankey' ? theme.textPrimary : theme.textMuted,
                }}
              >
                <GitBranch className="h-3.5 w-3.5" />
                Sankey
              </button>
              <button
                onClick={() => setVisualizationMode('waterfall')}
                className="flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-all duration-200"
                style={{
                  background: visualizationMode === 'waterfall' ? theme.activeBg : 'transparent',
                  color: visualizationMode === 'waterfall' ? theme.textPrimary : theme.textMuted,
                }}
              >
                <BarChart3 className="h-3.5 w-3.5" />
                Waterfall
              </button>
            </div>
          </div>

          {/* Waterfall View Toggle - only show when waterfall mode is active */}
          {visualizationMode === 'waterfall' && (
            <div className="flex items-center gap-2">
              <div
                className="flex rounded-lg p-0.5 transition-colors duration-300"
                style={{
                  background: theme.controlBg,
                  border: `1px solid ${theme.controlBorder}`,
                }}
              >
                <button
                  onClick={() => setWaterfallView('salary')}
                  className="rounded-md px-2.5 py-1 text-xs font-medium transition-all duration-200"
                  style={{
                    background: waterfallView === 'salary' ? theme.activeBg : 'transparent',
                    color: waterfallView === 'salary' ? theme.textPrimary : theme.textMuted,
                  }}
                >
                  Salary Flow
                </button>
                <button
                  onClick={() => setWaterfallView('cpf')}
                  className="rounded-md px-2.5 py-1 text-xs font-medium transition-all duration-200"
                  style={{
                    background: waterfallView === 'cpf' ? theme.activeBg : 'transparent',
                    color: waterfallView === 'cpf' ? theme.textPrimary : theme.textMuted,
                  }}
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
          <DollarSign className="h-4 w-4" style={{ color: theme.sage }} />
          <h4 className="text-sm font-medium" style={{ color: theme.textPrimary }}>
            Money Flow Visualization
          </h4>
        </div>

        {/* Compact Contribution Rates Overlay */}
        <div
          className="absolute right-5 top-5 z-10 rounded-lg backdrop-blur-sm transition-colors duration-300"
          style={{
            background: isMonet ? 'rgba(255, 255, 255, 0.9)' : 'rgba(15, 23, 42, 0.95)',
            border: `1px solid ${theme.cardBorder}`,
          }}
        >
          {/* Header - click to toggle */}
          <button
            onClick={() => setIsRatesDropdownOpen(!isRatesDropdownOpen)}
            className="flex w-full items-center justify-between gap-4 px-3 py-2 transition-colors"
            style={{ color: theme.textMuted }}
          >
            <span className="text-[10px] font-medium uppercase tracking-wider">Rates</span>
            <ChevronDown className={`h-3 w-3 transition-transform ${isRatesDropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* Rates display - collapsible */}
          {isRatesDropdownOpen && (
            <div
              className="px-3 py-2 space-y-1"
              style={{ borderTop: `1px solid ${theme.surfaceBorder}` }}
            >
              {/* Age group display */}
              <div className="flex items-center justify-between gap-4 mb-2">
                <span className="text-xs" style={{ color: theme.textMuted }}>Age group</span>
                <span className="text-xs font-medium" style={{ color: theme.blue }}>{AGE_GROUP_LABELS[selectedRateGroup]}</span>
              </div>
              {/* Rates */}
              <div className="space-y-0.5 text-xs">
                <div className="flex items-center justify-between gap-4">
                  <span style={{ color: theme.textMuted }}>Employee</span>
                  <span className="font-mono font-medium" style={{ color: theme.purple }}>{(rates.employee * 100).toFixed(0)}%</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span style={{ color: theme.textMuted }}>Employer</span>
                  <span className="font-mono font-medium" style={{ color: theme.accent }}>{(rates.employer * 100).toFixed(0)}%</span>
                </div>
                <div
                  className="mt-1 flex items-center justify-between gap-4 pt-1"
                  style={{ borderTop: `1px solid ${theme.surfaceBorder}` }}
                >
                  <span style={{ color: theme.textSecondary }}>Total</span>
                  <span className="font-mono font-semibold" style={{ color: theme.textPrimary }}>{(rates.total * 100).toFixed(0)}%</span>
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
                  stroke: isMonet ? theme.primary : '#ffffff',
                  strokeOpacity: isMonet ? 0.3 : 0.2,
                }}
              >
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.[0]) return null
                    const tooltipData = payload[0].payload
                    if (tooltipData.source && tooltipData.target) {
                      return (
                        <div
                          className="rounded-lg px-3 py-2 shadow-xl backdrop-blur"
                          style={{
                            background: isMonet ? 'rgba(255, 255, 255, 0.95)' : 'rgba(15, 23, 40, 0.95)',
                            border: `1px solid ${theme.cardBorder}`,
                          }}
                        >
                          <p className="text-xs" style={{ color: theme.textMuted }}>
                            {tooltipData.source.name} → {tooltipData.target.name}
                          </p>
                          <p className="text-lg font-semibold" style={{ color: theme.textPrimary }}>
                            {formatCurrency(tooltipData.value)}
                          </p>
                        </div>
                      )
                    }
                    return (
                      <div
                        className="rounded-lg px-3 py-2 shadow-xl backdrop-blur"
                        style={{
                          background: isMonet ? 'rgba(255, 255, 255, 0.95)' : 'rgba(15, 23, 40, 0.95)',
                          border: `1px solid ${theme.cardBorder}`,
                        }}
                      >
                        <p className="text-xs" style={{ color: theme.textMuted }}>{tooltipData.name}</p>
                        <p className="text-lg font-semibold" style={{ color: theme.textPrimary }}>
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
      <div
        className="px-5 py-4 transition-colors duration-300"
        style={{
          borderTop: `1px solid ${theme.surfaceBorder}`,
        }}
      >
        <div
          className="flex items-start gap-3 rounded-lg p-3 transition-colors duration-300"
          style={{
            background: isMonet ? `${theme.blue}10` : 'rgba(59, 130, 246, 0.05)',
          }}
        >
          <Info className="mt-0.5 h-4 w-4 flex-shrink-0" style={{ color: theme.blue }} />
          <div className="text-xs" style={{ color: theme.textSecondary }}>
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
