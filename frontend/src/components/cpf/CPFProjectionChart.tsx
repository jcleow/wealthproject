'use client'

import { useMemo, useState } from 'react'
import {
  Area,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'
import { Shield, ShieldCheck, Star, Heart, Info } from 'lucide-react'

import { formatCurrency } from '@/lib/format'
import { CPF_CONSTANTS } from '@/lib/cpf-constants'
import type { CPFProfile, CPFAssumptions, CPFProjectionYear, RetirementProjection } from '@/types/cpf'
import { DEFAULT_CPF_ASSUMPTIONS } from '@/types/cpf'
import { CPFAssumptionsPanel } from './CPFAssumptionsPanel'
import { useCpfBalanceProjectionQuery } from '@/hooks/queries/useCpfQuery'
import type { CPFBalanceProjectionResponse } from '@/api/financial/cpf'

interface CPFProjectionChartProps {
  profile: CPFProfile
  className?: string
}

/**
 * Transforms API response (string decimals) to chart-compatible format (numbers)
 */
function transformProjectionData(
  response: CPFBalanceProjectionResponse
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
  totalRemainingBalance: number  // Combined remaining balance for chart display
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

    // Calculate total remaining balance at START of this year (before payouts)
    const totalRemainingBalance = remainingPremium + remainingRA

    // Calculate bequest value (what beneficiaries get if member passes at this age)
    // This is the balance BEFORE this year's payouts
    const bequestValue = totalRemainingBalance

    projection.push({
      age,
      year,
      monthlyPayout: currentPayout,
      annualPayout,
      cumulativePayouts,
      remainingPremium,
      remainingRA,
      bequestValue,
      totalRemainingBalance,
    })

    // Now subtract this year's payouts for the next iteration
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

    // Escalating plan increases by 2% annually
    if (plan === 'escalating') {
      currentPayout = currentPayout * (1 + escalatingGrowth)
    }
  }

  return projection
}

type AccountKey = 'oa' | 'sa' | 'ma' | 'ra' | 'oaSa'

interface VisibleAccounts {
  oa: boolean
  sa: boolean
  ma: boolean
  ra: boolean
  oaSa: boolean
}

export function CPFProjectionChart({ profile, className }: CPFProjectionChartProps) {
  const [assumptions, setAssumptions] = useState<CPFAssumptions>(DEFAULT_CPF_ASSUMPTIONS)
  const [chartView, setChartView] = useState<ChartView>('balance')
  const [visibleAccounts, setVisibleAccounts] = useState<VisibleAccounts>({
    oa: true,
    sa: true,
    ma: true,
    ra: true,
    oaSa: true,
  })

  const toggleAccount = (account: AccountKey) => {
    setVisibleAccounts((prev) => ({
      ...prev,
      [account]: !prev[account],
    }))
  }

  // Fetch real projection data from backend
  // Use isFetching to show loading indicator while keeping previous data visible
  const {
    data: apiResponse,
    isLoading,
    isFetching,
    error,
  } = useCpfBalanceProjectionQuery(profile.id, {
    retirementAge: assumptions.retirementAge,
    payoutStartAge: assumptions.payoutStartAge,
  })

  // Transform API response - with keepPreviousData in the query hook,
  // apiResponse will retain previous data during refetch, so no ref needed
  const { projection, retirement } = useMemo(() => {
    if (!apiResponse) {
      return { projection: null, retirement: null }
    }
    return transformProjectionData(apiResponse)
  }, [apiResponse])

  // Transform projection for chart display:
  // - SA ends at age 55 (becomes part of RA)
  // - RA begins at age 55
  // - OA+SA line shows retirement savings progress until 55
  const chartData = useMemo(() => {
    if (!projection) return undefined
    return projection.map((p) => ({
      ...p,
      // SA only exists before age 55
      sa: p.age <= 55 ? p.sa : null,
      // RA only exists from age 55 onwards
      ra: p.age >= 55 ? p.ra : null,
      // OA+SA line stops at age 55 when RA is formed
      retirementSavings: p.age <= 55 ? p.oa + p.sa : null,
    }))
  }, [projection])

  // Generate payout projection for the selected CPF LIFE plan
  const payoutProjection = useMemo(() => {
    if (!retirement || !projection) return []

    const monthlyPayout = retirement.cpfLifeEstimates[assumptions.cpfLifePlan]
    if (!monthlyPayout || monthlyPayout <= 0) return []

    // Calculate birth year from profile age
    const currentYear = new Date().getFullYear()
    const birthYear = currentYear - profile.age

    // Get initial RA balance at the actual payout start age from projection data
    // This accounts for interest growth between age 65 and the payout start age
    const payoutStartSnapshot = projection.find(p => p.age === assumptions.payoutStartAge)
    const initialRA = payoutStartSnapshot?.ra ?? retirement.age65Balances.ra

    return generatePayoutProjection(
      monthlyPayout,
      assumptions.payoutStartAge,
      assumptions.cpfLifePlan,
      birthYear,
      initialRA,
      assumptions.basicPlanPremiumPercent,
      assumptions.escalatingPlanGrowth
    )
  }, [projection, retirement, assumptions.cpfLifePlan, profile.age, assumptions.payoutStartAge, assumptions.basicPlanPremiumPercent, assumptions.escalatingPlanGrowth])

  const milestones = [
    { age: 55, label: 'RA Formation', color: '#f59e0b' },
    { age: assumptions.payoutStartAge, label: 'CPF LIFE Start', color: '#10b981' },
  ]

  // Calculate ages when retirement thresholds are reached (using OA+SA before age 55)
  const thresholdAges = useMemo(() => {
    if (!projection || !retirement) return { brs: null, frs: null, ers: null, bhs: null }

    // BRS/FRS/ERS track OA+SA (retirement savings before RA formation at 55)
    // Only look at ages <= 55 since that's when the retirementSavings line exists
    const pre55Data = projection.filter((p) => p.age <= 55)
    const brsAge = pre55Data.find((p) => p.oa + p.sa >= retirement.brsTarget)?.age ?? null
    const frsAge = pre55Data.find((p) => p.oa + p.sa >= retirement.frsTarget)?.age ?? null
    const ersAge = pre55Data.find((p) => p.oa + p.sa >= retirement.ersTarget)?.age ?? null
    // BHS tracks MA balance
    const bhsAge = projection.find((p) => p.ma >= retirement.bhsTarget)?.age ?? null

    return { brs: brsAge, frs: frsAge, ers: ersAge, bhs: bhsAge }
  }, [projection, retirement])

  // Custom dot renderer for OA+SA line (shows BRS/FRS/ERS markers)
  const renderRetirementSavingsDot = (props: any) => {
    const { cx, cy, payload } = props
    if (!cx || !cy || payload.retirementSavings === null) return null

    const markers: Array<{ label: string; color: string; icon: string }> = []

    // Check if this age matches any threshold
    if (payload.age === thresholdAges.brs) {
      markers.push({ label: 'BRS', color: '#facc15', icon: 'shield' })
    }
    if (payload.age === thresholdAges.frs) {
      markers.push({ label: 'FRS', color: '#38bdf8', icon: 'shield-check' })
    }
    if (payload.age === thresholdAges.ers) {
      markers.push({ label: 'ERS', color: '#a78bfa', icon: 'star' })
    }

    if (markers.length === 0) return null

    const iconPaths: Record<string, string> = {
      'shield': 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
      'shield-check': 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z M9 12l2 2 4-4',
      'star': 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z',
    }

    return (
      <g>
        {markers.map((m, idx) => (
          <g key={m.label} transform={`translate(${cx}, ${cy - idx * 26})`}>
            <circle r={11} fill={m.color} stroke="rgba(0,0,0,0.5)" strokeWidth={1.5} />
            <g transform="translate(-5.5, -5.5) scale(0.46)">
              <path
                d={iconPaths[m.icon]}
                fill="none"
                stroke="white"
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </g>
            <text x={16} y={4} fill={m.color} fontSize={10} fontWeight={600}>
              {m.label}
            </text>
          </g>
        ))}
      </g>
    )
  }

  // Custom dot renderer for MA line (shows BHS marker)
  const renderMADot = (props: any) => {
    const { cx, cy, payload } = props
    if (!cx || !cy || payload.age !== thresholdAges.bhs) return null

    return (
      <g transform={`translate(${cx}, ${cy})`}>
        <circle r={11} fill="#f472b6" stroke="rgba(0,0,0,0.5)" strokeWidth={1.5} />
        <g transform="translate(-5.5, -5.5) scale(0.46)">
          <path
            d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
            fill="none"
            stroke="white"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
        <text x={16} y={4} fill="#f472b6" fontSize={10} fontWeight={600}>
          BHS
        </text>
      </g>
    )
  }

  // Show loading/empty state only on initial load (when there's no data yet)
  // With keepPreviousData in the query, apiResponse retains previous data during refetch,
  // so projection/retirement remain valid and this early return won't trigger during refetch
  if (!projection || !retirement) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="rounded-xl border border-white/[0.08] bg-[#0a0a0a] p-5">
          <div className="flex flex-col items-center justify-center h-80 gap-2">
            {isLoading ? (
              <span className="text-slate-400 animate-pulse">Loading projection...</span>
            ) : (
              <>
                <span className="text-slate-400">No CPF account found</span>
                <span className="text-xs text-slate-500">Create a CPF account to see projections</span>
              </>
            )}
          </div>
        </div>
      </div>
    )
  }

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
        <BalanceAtAgeCard
          displayAge={profile.age}
          projection={projection}
          currentAge={profile.age}
          currentBalances={profile.balances}
        />
        <CPFLifePayoutCard
          estimates={retirement.cpfLifeEstimates}
          payoutStartAge={assumptions.payoutStartAge}
          selectedPlan={assumptions.cpfLifePlan}
        />
        <RetirementTargetsCard />
      </div>

      {/* Main Chart */}
      <div className="rounded-xl border border-white/[0.08] bg-[#0a0a0a] p-5">
        <div className="mb-4 flex items-center justify-end gap-3">
          {isFetching && (
            <span className="text-[10px] text-slate-500 animate-pulse">Updating...</span>
          )}
          {!isFetching && !!error && (
            <span className="text-[10px] text-amber-400">Using estimates</span>
          )}

          {/* Legend */}
          {chartView === 'balance' ? (
            <div className="flex items-center gap-2">
              {[
                { key: 'oa' as AccountKey, label: 'OA', color: '#3b82f6', dashed: false },
                { key: 'sa' as AccountKey, label: 'SA', color: '#10b981', dashed: false },
                { key: 'ma' as AccountKey, label: 'MA', color: '#f59e0b', dashed: false },
                { key: 'ra' as AccountKey, label: 'RA', color: '#8b5cf6', dashed: false },
                { key: 'oaSa' as AccountKey, label: 'OA+SA', color: '#94a3b8', dashed: true },
              ].map((item) => {
                const isVisible = visibleAccounts[item.key]
                return (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => toggleAccount(item.key)}
                    className={`flex items-center gap-1 px-1 py-0.5 rounded transition-all duration-150 hover:bg-white/[0.05] ${
                      isVisible ? '' : 'opacity-40'
                    }`}
                    title={isVisible ? `Hide ${item.label}` : `Show ${item.label}`}
                  >
                    {item.dashed ? (
                      <svg width="12" height="3" className="flex-shrink-0">
                        <line x1="0" y1="1.5" x2="12" y2="1.5" stroke={item.color} strokeWidth="3" strokeDasharray="3 2" />
                      </svg>
                    ) : (
                      <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                    )}
                    <span className={`text-xs ${isVisible ? 'text-slate-400' : 'text-slate-600'}`}>
                      {item.label}
                    </span>
                  </button>
                )
              })}
              <div className="h-3 w-px bg-white/[0.06] mx-1" />
              {[
                { label: 'BRS', color: '#facc15', Icon: Shield },
                { label: 'FRS', color: '#38bdf8', Icon: ShieldCheck },
                { label: 'ERS', color: '#a78bfa', Icon: Star },
                { label: 'BHS', color: '#f472b6', Icon: Heart },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-1">
                  <div
                    className="flex items-center justify-center w-5 h-5 rounded-full"
                    style={{ backgroundColor: item.color }}
                  >
                    <item.Icon className="w-3 h-3 text-white" strokeWidth={2.5} />
                  </div>
                  <span className="text-xs text-slate-500">{item.label}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <div className="h-1.5 w-1.5 rounded-full bg-violet-500" />
              <span className="text-[10px] text-slate-400">Balance</span>
              <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 ml-2" />
              <span className="text-[10px] text-slate-400">
                {assumptions.cpfLifePlan.charAt(0).toUpperCase() + assumptions.cpfLifePlan.slice(1)} Payout
              </span>
            </div>
          )}

          <div className="h-4 w-px bg-white/[0.08]" />

          {/* Chart View Toggle */}
          <div className="flex rounded-lg bg-white/[0.03] p-0.5 border border-white/[0.06]">
            <button
              type="button"
              onClick={() => setChartView('balance')}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all duration-150 ${
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
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all duration-150 ${
                chartView === 'payout'
                  ? 'bg-white/[0.1] text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              Payout
            </button>
          </div>
        </div>

        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            {chartView === 'balance' ? (
              <ComposedChart data={chartData} margin={{ top: 40, right: 30, left: 0, bottom: 0 }}>
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
                  ticks={projection && projection.length > 0
                    ? Array.from(
                        { length: Math.ceil((projection[projection.length - 1].age - projection[0].age) / 5) + 1 },
                        (_, i) => Math.ceil(projection[0].age / 5) * 5 + i * 5
                      ).filter(age => age >= projection[0].age && age <= projection[projection.length - 1].age)
                    : undefined
                  }
                />
                <YAxis
                  domain={['dataMin', 'dataMax']}
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

                {visibleAccounts.oa && (
                  <Area
                    type="monotone"
                    dataKey="oa"
                    stackId="0"
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
                    stackId="2"
                    stroke="#f59e0b"
                    fill="url(#maChartGradient)"
                    strokeWidth={2}
                    dot={renderMADot}
                    activeDot={false}
                  />
                )}
                {visibleAccounts.ra && (
                  <Area
                    type="monotone"
                    dataKey="ra"
                    stackId="3"
                    stroke="#8b5cf6"
                    fill="url(#raChartGradient)"
                    strokeWidth={2}
                  />
                )}

                {/* OA+SA line until age 55 - shows retirement savings progress with BRS/FRS/ERS markers */}
                {visibleAccounts.oaSa && (
                  <Line
                    type="monotone"
                    dataKey="retirementSavings"
                    stroke="#94a3b8"
                    strokeWidth={2}
                    strokeDasharray="4 4"
                    dot={renderRetirementSavingsDot}
                    activeDot={false}
                    connectNulls={false}
                  />
                )}

              </ComposedChart>
            ) : (
              <ComposedChart
                key={`payout-${assumptions.cpfLifePlan}-${assumptions.payoutStartAge}`}
                data={payoutProjection}
                margin={{ top: 20, right: 60, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="payoutGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="balanceGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.5} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.1} />
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
                {/* Left Y-axis for monthly payout */}
                <YAxis
                  yAxisId="left"
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `$${(value / 1000).toFixed(1)}K`}
                />
                {/* Right Y-axis for remaining balance */}
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `$${(value / 1000).toFixed(0)}K`}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.[0]) return null
                    const data = payload[0].payload as PayoutProjectionYear
                    return (
                      <div className="min-w-[220px] px-3 py-2 rounded-lg border border-white/10 bg-[#0f1728]/95 shadow-xl backdrop-blur">
                        <p className="text-xs font-bold text-slate-400">
                          Age {data.age} ({data.year})
                        </p>
                        <div className="mt-2 space-y-1">
                          <div className="flex items-center justify-between gap-4 text-xs">
                            <span className="flex items-center gap-1.5 text-emerald-400">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                              Monthly Payout
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

                        {/* Balance and Bequest Info */}
                        <div className="mt-2 pt-2 border-t border-white/10 space-y-1">
                          <div className="flex items-center justify-between gap-4 text-xs">
                            <span className="flex items-center gap-1.5 text-violet-400">
                              <span className="h-1.5 w-1.5 rounded-full bg-violet-400" />
                              Remaining Balance
                            </span>
                            <span className="font-mono font-semibold text-violet-300">
                              {formatCurrency(data.totalRemainingBalance)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-4 text-xs">
                            <span className="text-slate-500">Total Received</span>
                            <span className="font-mono text-slate-400">
                              {formatCurrency(data.cumulativePayouts)}
                            </span>
                          </div>
                          {assumptions.cpfLifePlan === 'basic' && data.remainingRA > 0 && (
                            <div className="flex items-center justify-between gap-4 text-xs">
                              <span className="text-slate-500 pl-3">└ RA Balance</span>
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

                        {assumptions.cpfLifePlan === 'escalating' && (
                          <p className="mt-2 text-xs text-slate-500">
                            Payouts increase +2% annually
                          </p>
                        )}
                      </div>
                    )
                  }}
                />

                {/* Reference line for payout start age */}
                <ReferenceLine
                  yAxisId="left"
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

                {/* Bars showing remaining balance (premium + RA for basic plan) */}
                <Bar
                  yAxisId="right"
                  dataKey="totalRemainingBalance"
                  fill="url(#balanceGradient)"
                  stroke="#8b5cf6"
                  strokeWidth={1}
                  radius={[2, 2, 0, 0]}
                  name="Remaining Balance"
                />

                {/* Line showing monthly payout */}
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="monthlyPayout"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, fill: '#10b981' }}
                />

              </ComposedChart>
            )}
          </ResponsiveContainer>
        </div>

      </div>
    </div>
  )
}

function BalanceAtAgeCard({
  displayAge,
  projection,
  currentAge,
  currentBalances,
}: {
  displayAge: number
  projection: CPFProjectionYear[]
  currentAge?: number
  currentBalances?: { oa: number; sa: number; ma: number; ra: number }
}) {
  // Use current balances if displaying current age, otherwise use projection data
  // This ensures the initial balance matches the overview's current balance,
  // while future ages show projected end-of-year balances
  const isCurrentAge = currentAge !== undefined && displayAge === currentAge
  const selectedData = projection.find((p) => p.age === displayAge)

  const balances = isCurrentAge && currentBalances
    ? currentBalances
    : selectedData
      ? { oa: selectedData.oa, sa: selectedData.sa, ma: selectedData.ma, ra: selectedData.ra }
      : { oa: 0, sa: 0, ma: 0, ra: 0 }
  const total = balances.oa + balances.sa + balances.ma + balances.ra
  const year = selectedData?.year ?? new Date().getFullYear()

  // SA only exists before age 55, RA from 55 onwards
  const accounts = [
    { label: 'OA', value: balances.oa, color: '#3b82f6', show: true },
    { label: 'SA', value: balances.sa, color: '#10b981', show: displayAge <= 55 },
    { label: 'MA', value: balances.ma, color: '#f59e0b', show: true },
    { label: 'RA', value: balances.ra, color: '#8b5cf6', show: displayAge >= 55 },
  ].filter((acc) => acc.show)

  return (
    <div className="rounded-xl border border-white/[0.08] bg-[#0a0a0a] p-4">
      <div className="flex items-center justify-between mb-1">
        <p className="text-xs text-slate-400">Total CPF Balance at Age {displayAge}</p>
        <p className="text-xs text-slate-500">{year}</p>
      </div>
      <p className="text-xl font-semibold text-white">{formatCurrency(total)}</p>

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
}: {
  estimates: { standard: number; basic: number; escalating: number }
  payoutStartAge: number
  selectedPlan: 'standard' | 'basic' | 'escalating'
}) {
  const amount = estimates[selectedPlan]
  const planLabel = selectedPlan.charAt(0).toUpperCase() + selectedPlan.slice(1)

  return (
    <div className="rounded-xl border border-white/[0.08] bg-[#0a0a0a] p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <p className="text-xs text-slate-400">Est. CPF LIFE Payout</p>
          <div className="group relative">
            <Info className="h-3.5 w-3.5 text-slate-500 cursor-help" />
            <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block z-50">
              <div className="rounded-xl bg-[#1a1a2e] border border-white/10 px-4 py-3 text-sm text-slate-300 shadow-xl min-w-[280px]">
                <p className="font-semibold text-slate-100 mb-2">Disclaimer</p>
                <p className="leading-relaxed">These are our own estimates based on current CPF rules. Please check the official CPF website for accurate projections.</p>
              </div>
            </div>
          </div>
        </div>
        <p className="text-xs text-slate-500">Starting at age {payoutStartAge}</p>
      </div>
      <p className="mt-1 text-xl font-semibold text-white">
        {formatCurrency(amount)}/mo
      </p>

      {/* Plan info - display only */}
      <div className="mt-3 flex items-center gap-2">
        <span className="rounded-full bg-purple-500/20 px-2 py-0.5 text-[10px] font-medium text-purple-300">
          {planLabel} Plan
        </span>
        {selectedPlan === 'escalating' && (
          <span className="text-[10px] text-slate-500">+2%/yr</span>
        )}
      </div>
    </div>
  )
}

function RetirementTargetsCard() {
  const targets = [
    { label: 'BRS', value: CPF_CONSTANTS.BRS, color: '#facc15' },
    { label: 'FRS', value: CPF_CONSTANTS.FRS, color: '#38bdf8' },
    { label: 'ERS', value: CPF_CONSTANTS.ERS, color: '#a78bfa' },
    { label: 'BHS', value: CPF_CONSTANTS.BHS, color: '#f472b6' },
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
