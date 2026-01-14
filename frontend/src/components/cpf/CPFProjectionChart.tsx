'use client'

import { useMemo, useState } from 'react'
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceDot,
} from 'recharts'

import { formatCurrency } from '@/lib/format'
import type { CPFProfile, CPFAssumptions, CPFProjectionYear, RetirementProjection } from '@/types/cpf'
import { DEFAULT_CPF_ASSUMPTIONS } from '@/types/cpf'
import { generateMockProjection, generateMockRetirementProjection } from '@/lib/cpf-mock-data'
import { CPFAssumptionsPanel } from './CPFAssumptionsPanel'
import { useCpfYearByYearProjectionQuery } from '@/hooks/queries/useCpfQuery'
import type { CPFYearByYearProjectionResponse } from '@/api/financial/cpf'

interface CPFProjectionChartProps {
  profile: CPFProfile
  className?: string
}

/**
 * Transforms API response (string decimals) to chart-compatible format (numbers)
 */
function transformProjectionData(
  response: CPFYearByYearProjectionResponse
): { projection: CPFProjectionYear[]; retirement: RetirementProjection } {
  // Transform snapshots from string decimals to numbers
  const projection: CPFProjectionYear[] = response.snapshots.map((snapshot) => ({
    year: snapshot.year,
    age: snapshot.age,
    oa: parseFloat(snapshot.oa) || 0,
    sa: parseFloat(snapshot.sa) || 0,
    ma: parseFloat(snapshot.ma) || 0,
    ra: parseFloat(snapshot.ra) || 0,
    total: parseFloat(snapshot.total) || 0,
    contributions: parseFloat(snapshot.contributions) || 0,
    interest: parseFloat(snapshot.interest) || 0,
  }))

  // Transform retirement data
  const age55Balances = response.age55Balances
    ? {
        oa: parseFloat(response.age55Balances.oa) || 0,
        sa: parseFloat(response.age55Balances.sa) || 0,
        ma: parseFloat(response.age55Balances.ma) || 0,
        ra: parseFloat(response.age55Balances.ra) || 0,
      }
    : { oa: 0, sa: 0, ma: 0, ra: 0 }

  const age65Balances = response.age65Balances
    ? {
        oa: parseFloat(response.age65Balances.oa) || 0,
        sa: parseFloat(response.age65Balances.sa) || 0,
        ma: parseFloat(response.age65Balances.ma) || 0,
        ra: parseFloat(response.age65Balances.ra) || 0,
      }
    : { oa: 0, sa: 0, ma: 0, ra: 0 }

  const retirement: RetirementProjection = {
    age55Balances,
    age65Balances,
    frsTarget: parseFloat(response.frsAt55) || 0,
    brsTarget: parseFloat(response.brsAt55) || 0,
    ersTarget: parseFloat(response.ersAt55) || 0,
    bhsTarget: parseFloat(response.bhs) || 0,
    cpfLifeEstimates: response.cpfLifeEstimates?.estimates
      ? {
          standard: parseFloat(response.cpfLifeEstimates.estimates.standard.monthlyPayout) || 0,
          basic: parseFloat(response.cpfLifeEstimates.estimates.basic.monthlyPayout) || 0,
          escalating: parseFloat(response.cpfLifeEstimates.estimates.escalating.monthlyPayout) || 0,
        }
      : { standard: 0, basic: 0, escalating: 0 },
  }

  return { projection, retirement }
}

type ChartView = 'balance' | 'payout'

interface PayoutProjectionYear {
  age: number
  year: number
  monthlyPayout: number
  annualPayout: number
  cumulativePayouts: number      // Total payouts received up to this age
  remainingPremium: number       // CPF LIFE premium balance
  remainingRA: number            // For Basic plan: non-premium RA balance (0 for other plans)
  bequestValue: number           // Total bequest if passed at this age
}

/**
 * Generates CPF LIFE payout projection from payout start age to age 100
 * Tracks premium depletion and bequest values based on plan type:
 * - Standard: All RA used as premium, bequest = RA - cumulative payouts
 * - Basic: ~17% RA as premium, rest for payouts until age 90, bequest = remaining RA + remaining premium
 * - Escalating: Same as Standard but payouts grow 2% annually
 */
function generatePayoutProjection(
  monthlyPayout: number,
  payoutStartAge: number,
  plan: 'standard' | 'basic' | 'escalating',
  birthYear: number,
  initialRA: number,
  basicPlanPremiumPercent: number,
  escalatingGrowth: number = 0.02
): PayoutProjectionYear[] {
  const endAge = 100
  const projection: PayoutProjectionYear[] = []

  let currentPayout = monthlyPayout
  let cumulativePayouts = 0

  // For Basic plan: split RA into premium and non-premium portions
  // Premium is set aside for lifelong payouts (kicks in after RA depletes or at age 90)
  // Non-premium RA is used for payouts first
  const initialPremium = plan === 'basic' ? initialRA * basicPlanPremiumPercent : initialRA
  let remainingPremium = initialPremium
  let remainingRA = plan === 'basic' ? initialRA - initialPremium : 0

  for (let age = payoutStartAge; age <= endAge; age++) {
    const year = birthYear + age
    const annualPayout = currentPayout * 12

    // Calculate remaining balances after this year's payouts
    if (plan === 'basic') {
      // Basic plan: draw from remaining RA first until depleted or age 90
      if (remainingRA > 0 && age < 90) {
        // Draw from RA portion
        remainingRA = Math.max(0, remainingRA - annualPayout)
      } else {
        // Draw from premium portion (after RA depleted or at age 90+)
        remainingPremium = Math.max(0, remainingPremium - annualPayout)
      }
    } else {
      // Standard and Escalating: all payouts from premium
      remainingPremium = Math.max(0, remainingPremium - annualPayout)
    }

    cumulativePayouts += annualPayout

    // Calculate bequest value (what beneficiaries get if member passes at this age)
    const bequestValue = plan === 'basic'
      ? remainingRA + remainingPremium
      : remainingPremium

    projection.push({
      age,
      year,
      monthlyPayout: currentPayout,
      annualPayout,
      cumulativePayouts,
      remainingPremium,
      remainingRA,
      bequestValue,
    })

    // Escalating plan increases by 2% annually
    if (plan === 'escalating') {
      currentPayout = currentPayout * (1 + escalatingGrowth)
    }
  }

  return projection
}

type AccountKey = 'oa' | 'sa' | 'ma' | 'ra'

interface VisibleAccounts {
  oa: boolean
  sa: boolean
  ma: boolean
  ra: boolean
}

export function CPFProjectionChart({ profile, className }: CPFProjectionChartProps) {
  const [assumptions, setAssumptions] = useState<CPFAssumptions>(DEFAULT_CPF_ASSUMPTIONS)
  const [chartView, setChartView] = useState<ChartView>('balance')
  const [selectedPayoutPlan, setSelectedPayoutPlan] = useState<'standard' | 'basic' | 'escalating'>('standard')
  const [visibleAccounts, setVisibleAccounts] = useState<VisibleAccounts>({
    oa: true,
    sa: true,
    ma: true,
    ra: true,
  })

  const toggleAccount = (account: AccountKey) => {
    setVisibleAccounts((prev) => ({
      ...prev,
      [account]: !prev[account],
    }))
  }

  // Fetch real projection data from backend
  const {
    data: apiResponse,
    isLoading,
    error,
  } = useCpfYearByYearProjectionQuery(profile.id, {
    retirementAge: assumptions.retirementAge,
    payoutStartAge: assumptions.payoutStartAge,
  })

  // Transform API response or fall back to mock data
  const { projection, retirement } = useMemo(() => {
    if (apiResponse) {
      return transformProjectionData(apiResponse)
    }
    // Fall back to mock data while loading or on error
    const mockProjection = generateMockProjection(profile, assumptions)
    const mockRetirement = generateMockRetirementProjection(mockProjection)
    return { projection: mockProjection, retirement: mockRetirement }
  }, [apiResponse, profile, assumptions])

  // Generate payout projection for the selected CPF LIFE plan
  const payoutProjection = useMemo(() => {
    const monthlyPayout = retirement.cpfLifeEstimates[selectedPayoutPlan]
    if (!monthlyPayout || monthlyPayout <= 0) return []

    // Calculate birth year from profile age
    const currentYear = new Date().getFullYear()
    const birthYear = currentYear - profile.age

    // Get initial RA balance at payout start age (use age 65 balance as proxy)
    const initialRA = retirement.age65Balances.ra

    return generatePayoutProjection(
      monthlyPayout,
      assumptions.payoutStartAge,
      selectedPayoutPlan,
      birthYear,
      initialRA,
      assumptions.basicPlanPremiumPercent,
      assumptions.escalatingPlanGrowth
    )
  }, [retirement.cpfLifeEstimates, retirement.age65Balances.ra, selectedPayoutPlan, profile.age, assumptions.payoutStartAge, assumptions.basicPlanPremiumPercent, assumptions.escalatingPlanGrowth])

  const milestones = [
    { age: 55, label: 'RA Formation', color: '#f59e0b' },
    { age: 65, label: 'CPF LIFE Start', color: '#10b981' },
  ]

  // Find when each retirement sum threshold is reached
  const thresholdMarkers = useMemo(() => {
    const markers: Array<{
      label: string
      color: string
      age: number
      yValue: number // The y-coordinate for the marker (total for BRS/FRS/ERS, MA for BHS)
      target: number
      reached: boolean
    }> = []

    // BRS/FRS/ERS track total balance
    const totalThresholds = [
      { target: retirement.brsTarget, label: 'BRS', color: '#facc15' }, // yellow
      { target: retirement.frsTarget, label: 'FRS', color: '#38bdf8' }, // sky blue
      { target: retirement.ersTarget, label: 'ERS', color: '#a78bfa' }, // violet
    ]

    for (const threshold of totalThresholds) {
      if (threshold.target <= 0) continue

      // Find first data point where total >= threshold
      const crossingPoint = projection.find((p) => p.total >= threshold.target)

      if (crossingPoint) {
        markers.push({
          label: threshold.label,
          color: threshold.color,
          age: crossingPoint.age,
          yValue: crossingPoint.total,
          target: threshold.target,
          reached: true,
        })
      } else if (projection.length > 0) {
        // Threshold not reached - don't show marker
        markers.push({
          label: threshold.label,
          color: threshold.color,
          age: projection[projection.length - 1].age,
          yValue: projection[projection.length - 1].total,
          target: threshold.target,
          reached: false,
        })
      }
    }

    // BHS tracks MediSave (MA) balance specifically
    if (retirement.bhsTarget > 0) {
      const bhsCrossingPoint = projection.find((p) => p.ma >= retirement.bhsTarget)

      if (bhsCrossingPoint) {
        markers.push({
          label: 'BHS',
          color: '#f472b6', // pink
          age: bhsCrossingPoint.age,
          yValue: bhsCrossingPoint.total, // Use total for y-position on stacked chart
          target: retirement.bhsTarget,
          reached: true,
        })
      } else if (projection.length > 0) {
        markers.push({
          label: 'BHS',
          color: '#f472b6',
          age: projection[projection.length - 1].age,
          yValue: projection[projection.length - 1].total,
          target: retirement.bhsTarget,
          reached: false,
        })
      }
    }

    return markers
  }, [projection, retirement.brsTarget, retirement.frsTarget, retirement.ersTarget, retirement.bhsTarget])

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Assumptions Panel */}
      <CPFAssumptionsPanel
        assumptions={assumptions}
        onChange={setAssumptions}
        collapsible={true}
        defaultExpanded={false}
      />

      {/* Retirement Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Age55And65Card
          age55Balances={retirement.age55Balances}
          age65RA={retirement.age65Balances.ra}
        />
        <CPFLifePayoutCard
          estimates={retirement.cpfLifeEstimates}
          payoutStartAge={assumptions.payoutStartAge}
          selectedPlan={selectedPayoutPlan}
          onPlanChange={setSelectedPayoutPlan}
        />
        <RetirementTargetsCard
          brs={retirement.brsTarget}
          frs={retirement.frsTarget}
          ers={retirement.ersTarget}
          bhs={retirement.bhsTarget}
        />
      </div>

      {/* Main Chart */}
      <div className="rounded-xl border border-white/[0.08] bg-[#0a0a0a] p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-medium text-slate-300">
                {chartView === 'balance' ? 'CPF Balance Projection' : 'CPF LIFE Payout Projection'}
              </h3>
              {isLoading && (
                <span className="text-xs text-slate-500 animate-pulse">Loading...</span>
              )}
              {!isLoading && !!error && (
                <span className="text-xs text-amber-400">Using estimates</span>
              )}
            </div>
            <p className="text-xs text-slate-500">
              {chartView === 'balance' ? (
                projection.length > 0
                  ? `Age ${projection[0].age} to ${projection[projection.length - 1].age}`
                  : `Age ${profile.age} to 100`
              ) : (
                payoutProjection.length > 0
                  ? `Age ${payoutProjection[0].age} to ${payoutProjection[payoutProjection.length - 1].age}`
                  : `Age ${assumptions.payoutStartAge} to 100`
              )}
            </p>
          </div>
          <div className="flex items-center gap-4">
            {/* Legend - show different legend based on view */}
            {chartView === 'balance' ? (
              <div className="flex items-center gap-6">
                {/* Account legend - clickable to toggle visibility */}
                <div className="flex items-center gap-3">
                  {[
                    { key: 'oa' as AccountKey, label: 'OA', color: '#3b82f6' },
                    { key: 'sa' as AccountKey, label: 'SA', color: '#10b981' },
                    { key: 'ma' as AccountKey, label: 'MA', color: '#f59e0b' },
                    { key: 'ra' as AccountKey, label: 'RA', color: '#8b5cf6' },
                  ].map((item) => {
                    const isVisible = visibleAccounts[item.key]
                    return (
                      <button
                        key={item.label}
                        type="button"
                        onClick={() => toggleAccount(item.key)}
                        className={`flex items-center gap-1.5 px-1.5 py-0.5 rounded transition-all duration-150 hover:bg-white/[0.05] ${
                          isVisible ? '' : 'opacity-40'
                        }`}
                        title={isVisible ? `Hide ${item.label}` : `Show ${item.label}`}
                      >
                        <div
                          className={`h-2 w-2 rounded-full transition-opacity ${isVisible ? '' : 'opacity-50'}`}
                          style={{ backgroundColor: item.color }}
                        />
                        <span className={`text-xs ${isVisible ? 'text-slate-400' : 'text-slate-600 line-through'}`}>
                          {item.label}
                        </span>
                      </button>
                    )
                  })}
                </div>
                {/* Retirement sum thresholds legend */}
                <div className="flex items-center gap-3 pl-3 border-l border-white/[0.08]">
                  {[
                    { label: 'BRS', color: '#facc15' },
                    { label: 'FRS', color: '#38bdf8' },
                    { label: 'ERS', color: '#a78bfa' },
                    { label: 'BHS', color: '#f472b6' },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center gap-1.5">
                      <div
                        className="h-2.5 w-2.5 rounded-full border-2"
                        style={{ backgroundColor: item.color, borderColor: '#0a0a0a' }}
                      />
                      <span className="text-xs text-slate-500">{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                {/* Payout legend */}
                <div className="flex items-center gap-1.5">
                  <div className="h-2 w-2 rounded-full bg-emerald-500" />
                  <span className="text-xs text-slate-400">
                    {selectedPayoutPlan.charAt(0).toUpperCase() + selectedPayoutPlan.slice(1)} Plan
                  </span>
                </div>
              </div>
            )}

            {/* Chart View Toggle - positioned at far right */}
            <div className="flex rounded-lg bg-white/[0.03] p-0.5 border border-white/[0.06]">
              <button
                type="button"
                onClick={() => setChartView('balance')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-150 ${
                  chartView === 'balance'
                    ? 'bg-white/[0.1] text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                Balance
              </button>
              <button
                type="button"
                onClick={() => setChartView('payout')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-150 ${
                  chartView === 'payout'
                    ? 'bg-white/[0.1] text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                Payout
              </button>
            </div>
          </div>
        </div>

        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            {chartView === 'balance' ? (
              <AreaChart data={projection} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="oaChartGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="saChartGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="maChartGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="raChartGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis
                  dataKey="age"
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  interval="preserveStartEnd"
                  ticks={projection.length > 0
                    ? Array.from(
                        { length: Math.ceil((projection[projection.length - 1].age - projection[0].age) / 5) + 1 },
                        (_, i) => Math.ceil(projection[0].age / 5) * 5 + i * 5
                      ).filter(age => age >= projection[0].age && age <= projection[projection.length - 1].age)
                    : undefined
                  }
                />
                <YAxis
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) =>
                    value >= 1000000
                      ? `$${(value / 1000000).toFixed(1)}M`
                      : `$${(value / 1000).toFixed(0)}K`
                  }
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.[0]) return null
                    const data = payload[0].payload

                    // Find thresholds achieved at this age
                    const achievedAtThisAge = thresholdMarkers.filter(
                      (m) => m.reached && m.age === data.age
                    )

                    return (
                      <div className="min-w-[200px] px-3 py-2 rounded-lg border border-white/10 bg-[#0f1728]/95 shadow-xl backdrop-blur">
                        <p className="text-xs font-bold text-slate-400">
                          Age {data.age} ({data.year})
                        </p>
                        <div className="mt-2 space-y-1">
                          {visibleAccounts.oa && <TooltipRow label="OA" value={data.oa} color="#3b82f6" />}
                          {visibleAccounts.sa && <TooltipRow label="SA" value={data.sa} color="#10b981" />}
                          {visibleAccounts.ma && <TooltipRow label="MA" value={data.ma} color="#f59e0b" />}
                          {visibleAccounts.ra && data.ra > 0 && <TooltipRow label="RA" value={data.ra} color="#8b5cf6" />}
                          <div className="border-t border-white/10 pt-1">
                            <TooltipRow label="Total" value={data.total} color="#fff" bold />
                          </div>
                        </div>
                        <div className="mt-2 border-t border-white/10 pt-2 text-xs text-slate-500">
                          <p>Contributions: {formatCurrency(data.contributions)}</p>
                          <p>Interest: {formatCurrency(data.interest)}</p>
                        </div>

                        {/* Show achieved thresholds */}
                        {achievedAtThisAge.length > 0 && (
                          <div className="mt-2 border-t border-white/10 pt-2">
                            <p className="text-xs font-medium text-slate-300 mb-1.5">Milestones Reached</p>
                            <div className="space-y-1">
                              {achievedAtThisAge.map((threshold) => (
                                <div
                                  key={threshold.label}
                                  className="flex items-center justify-between text-xs"
                                >
                                  <span className="flex items-center gap-1.5" style={{ color: threshold.color }}>
                                    <span
                                      className="h-2 w-2 rounded-full"
                                      style={{ backgroundColor: threshold.color }}
                                    />
                                    {threshold.label}
                                  </span>
                                  <span className="font-mono tabular-nums text-slate-300">
                                    {formatCurrency(threshold.target)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  }}
                />

                {/* Reference lines for milestones (vertical) */}
                {milestones.map((m) => (
                  <ReferenceLine
                    key={m.age}
                    x={m.age}
                    stroke={m.color}
                    strokeDasharray="5 5"
                    label={{
                      value: m.label,
                      fill: m.color,
                      fontSize: 11,
                      fontWeight: 600,
                      position: 'insideTopRight',
                    }}
                  />
                ))}

                {/* Milestone markers for retirement sum thresholds */}
                {thresholdMarkers
                  .filter((m) => m.reached)
                  .map((marker) => (
                    <ReferenceDot
                      key={marker.label}
                      x={marker.age}
                      y={marker.yValue}
                      r={6}
                      fill={marker.color}
                      stroke="#0a0a0a"
                      strokeWidth={2}
                      label={{
                        value: marker.label,
                        fill: marker.color,
                        fontSize: 10,
                        fontWeight: 600,
                        position: 'top',
                        offset: 10,
                      }}
                    />
                  ))}

                {visibleAccounts.oa && (
                  <Area
                    type="monotone"
                    dataKey="oa"
                    stackId="1"
                    stroke="#3b82f6"
                    fill="url(#oaChartGradient)"
                    strokeWidth={2}
                  />
                )}
                {visibleAccounts.sa && (
                  <Area
                    type="monotone"
                    dataKey="sa"
                    stackId="1"
                    stroke="#10b981"
                    fill="url(#saChartGradient)"
                    strokeWidth={2}
                  />
                )}
                {visibleAccounts.ma && (
                  <Area
                    type="monotone"
                    dataKey="ma"
                    stackId="1"
                    stroke="#f59e0b"
                    fill="url(#maChartGradient)"
                    strokeWidth={2}
                  />
                )}
                {visibleAccounts.ra && (
                  <Area
                    type="monotone"
                    dataKey="ra"
                    stackId="1"
                    stroke="#8b5cf6"
                    fill="url(#raChartGradient)"
                    strokeWidth={2}
                  />
                )}

              </AreaChart>
            ) : (
              <LineChart data={payoutProjection} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="payoutGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis
                  dataKey="age"
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  interval="preserveStartEnd"
                  ticks={payoutProjection.length > 0
                    ? Array.from(
                        { length: Math.ceil((payoutProjection[payoutProjection.length - 1].age - payoutProjection[0].age) / 5) + 1 },
                        (_, i) => Math.ceil(payoutProjection[0].age / 5) * 5 + i * 5
                      ).filter(age => age >= payoutProjection[0].age && age <= payoutProjection[payoutProjection.length - 1].age)
                    : undefined
                  }
                />
                <YAxis
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `$${(value / 1000).toFixed(1)}K`}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.[0]) return null
                    const data = payload[0].payload as PayoutProjectionYear
                    return (
                      <div className="min-w-[200px] px-3 py-2 rounded-lg border border-white/10 bg-[#0f1728]/95 shadow-xl backdrop-blur">
                        <p className="text-xs font-bold text-slate-400">
                          Age {data.age} ({data.year})
                        </p>
                        <div className="mt-2 space-y-1">
                          <div className="flex items-center justify-between gap-4 text-xs">
                            <span className="flex items-center gap-1.5 text-emerald-400">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                              Monthly
                            </span>
                            <span className="font-mono font-semibold text-white">
                              {formatCurrency(data.monthlyPayout)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-4 text-xs">
                            <span className="text-slate-400">Annual</span>
                            <span className="font-mono text-slate-300">
                              {formatCurrency(data.annualPayout)}
                            </span>
                          </div>
                        </div>

                        {/* Premium and Bequest Info */}
                        <div className="mt-2 pt-2 border-t border-white/10 space-y-1">
                          <div className="flex items-center justify-between gap-4 text-xs">
                            <span className="text-slate-500">Total Received</span>
                            <span className="font-mono text-slate-400">
                              {formatCurrency(data.cumulativePayouts)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-4 text-xs">
                            <span className="text-slate-500">Remaining Premium</span>
                            <span className="font-mono text-slate-400">
                              {formatCurrency(data.remainingPremium)}
                            </span>
                          </div>
                          {selectedPayoutPlan === 'basic' && data.remainingRA > 0 && (
                            <div className="flex items-center justify-between gap-4 text-xs">
                              <span className="text-slate-500">Remaining RA</span>
                              <span className="font-mono text-slate-400">
                                {formatCurrency(data.remainingRA)}
                              </span>
                            </div>
                          )}
                          <div className="flex items-center justify-between gap-4 text-xs pt-1 border-t border-white/5">
                            <span className="flex items-center gap-1.5 text-amber-400">
                              <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                              Bequest
                            </span>
                            <span className="font-mono font-semibold text-amber-400">
                              {formatCurrency(data.bequestValue)}
                            </span>
                          </div>
                        </div>

                        {selectedPayoutPlan === 'escalating' && (
                          <p className="mt-2 text-xs text-slate-500">
                            +2% annual increase
                          </p>
                        )}
                      </div>
                    )
                  }}
                />

                {/* Reference line for payout start age */}
                <ReferenceLine
                  x={assumptions.payoutStartAge}
                  stroke="#10b981"
                  strokeDasharray="5 5"
                  label={{
                    value: 'Payout Start',
                    fill: '#10b981',
                    fontSize: 11,
                    fontWeight: 600,
                    position: 'insideTopRight',
                  }}
                />

                <Line
                  type="monotone"
                  dataKey="monthlyPayout"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, fill: '#10b981' }}
                />

              </LineChart>
            )}
          </ResponsiveContainer>
        </div>

      </div>
    </div>
  )
}

function Age55And65Card({
  age55Balances,
  age65RA,
}: {
  age55Balances: { oa: number; sa: number; ma: number; ra: number }
  age65RA: number
}) {
  const total55 = age55Balances.oa + age55Balances.sa + age55Balances.ma + age55Balances.ra

  const accounts = [
    { label: 'OA', value: age55Balances.oa, color: '#3b82f6' },
    { label: 'SA', value: age55Balances.sa, color: '#10b981' },
    { label: 'MA', value: age55Balances.ma, color: '#f59e0b' },
    { label: 'RA', value: age55Balances.ra, color: '#8b5cf6' },
  ]

  return (
    <div className="rounded-xl border border-white/[0.08] bg-[#0a0a0a] p-4">
      {/* Age 55 Section */}
      <div>
        <p className="text-xs text-slate-400">Total CPF Balance at Age 55</p>
        <p className="mt-1 text-xl font-semibold text-white">{formatCurrency(total55)}</p>

        {/* Account breakdown */}
        <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1">
          {accounts.map((acc) => (
            <div key={acc.label} className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: acc.color }} />
                <span className="text-slate-500">{acc.label}</span>
              </span>
              <span className="font-mono tabular-nums text-slate-400">{formatCurrency(acc.value)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Divider */}
      <div className="my-3 border-t border-white/[0.06]" />

      {/* Age 65 Section */}
      <div>
        <p className="text-xs text-slate-400">Projected RA at 65</p>
        <p className="mt-1 text-lg font-semibold text-violet-400">{formatCurrency(age65RA)}</p>
      </div>
    </div>
  )
}

function TooltipRow({
  label,
  value,
  color,
  bold,
}: {
  label: string
  value: number
  color: string
  bold?: boolean
}) {
  return (
    <div className="flex items-center justify-between gap-4 text-xs">
      <span className="flex items-center gap-1.5" style={{ color }}>
        <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
        {label}
      </span>
      <span className={`font-mono ${bold ? 'font-semibold text-white' : 'text-slate-200'}`}>
        {formatCurrency(value)}
      </span>
    </div>
  )
}

function CPFLifePayoutCard({
  estimates,
  payoutStartAge,
  selectedPlan,
  onPlanChange,
}: {
  estimates: { standard: number; basic: number; escalating: number }
  payoutStartAge: number
  selectedPlan: 'standard' | 'basic' | 'escalating'
  onPlanChange: (plan: 'standard' | 'basic' | 'escalating') => void
}) {

  const plans = [
    { key: 'standard' as const, label: 'Standard', amount: estimates.standard },
    { key: 'basic' as const, label: 'Basic', amount: estimates.basic },
    { key: 'escalating' as const, label: 'Escalating', amount: estimates.escalating },
  ]

  const currentPlan = plans.find((p) => p.key === selectedPlan)!

  return (
    <div className="rounded-xl border border-white/[0.08] bg-[#0a0a0a] p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-400">Est. CPF LIFE Payout</p>
        <p className="text-xs text-slate-500">Starting at age {payoutStartAge}</p>
      </div>
      <p className="mt-1 text-xl font-semibold text-emerald-400">
        {formatCurrency(currentPlan.amount)}/mo
      </p>

      {/* Plan toggle */}
      <div className="mt-3 flex rounded-lg bg-white/[0.03] p-0.5 border border-white/[0.06]">
        {plans.map((plan) => (
          <button
            key={plan.key}
            type="button"
            onClick={() => onPlanChange(plan.key)}
            className={`flex-1 py-1.5 px-2 rounded-md text-xs font-medium transition-all duration-150 ${
              selectedPlan === plan.key
                ? 'bg-white/[0.1] text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            {plan.label}
          </button>
        ))}
      </div>
    </div>
  )
}

function RetirementTargetsCard({
  brs,
  frs,
  ers,
  bhs,
}: {
  brs: number
  frs: number
  ers: number
  bhs: number
}) {
  const targets = [
    { label: 'BRS', value: brs, color: '#facc15' },
    { label: 'FRS', value: frs, color: '#38bdf8' },
    { label: 'ERS', value: ers, color: '#a78bfa' },
    { label: 'BHS', value: bhs, color: '#f472b6' },
  ]

  return (
    <div className="rounded-xl border border-white/[0.08] bg-[#0a0a0a] p-4">
      <p className="text-xs text-slate-400">2026 Retirement Targets</p>
      <div className="mt-3 space-y-2">
        {targets.map((target) => (
          <div key={target.label} className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5">
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: target.color }}
              />
              <span className="text-slate-400">{target.label}</span>
            </span>
            <span className="font-mono tabular-nums text-slate-300">
              {formatCurrency(target.value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
