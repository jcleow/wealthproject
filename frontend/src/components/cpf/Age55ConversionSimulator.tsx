'use client'

import { useMemo, useState } from 'react'
import { Sankey, Tooltip, Layer, Rectangle, ResponsiveContainer } from 'recharts'
import {
  Info,
  Calculator,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Home,
  Wallet,
  TrendingUp,
  Clock,
  Infinity,
  Calendar,
} from 'lucide-react'
import { formatCurrency } from '@/lib/format'
import { Age55DecisionFlowchart } from './Age55DecisionFlowchart'

// CPF 2025 Constants
const CPF_CONSTANTS = {
  BRS: 106500, // Basic Retirement Sum
  FRS: 213000, // Full Retirement Sum
  ERS: 426000, // Enhanced Retirement Sum (2x FRS)
  BHS: 75500, // Basic Healthcare Sum
  MRS: 60000, // Minimum for CPF LIFE eligibility
}

// Interest rates for projection
const INTEREST_RATES = {
  oa: 0.025, // 2.5% p.a.
  sa: 0.04, // 4.0% p.a.
  ma: 0.04, // 4.0% p.a.
  ra: 0.04, // 4.0% p.a. (base, can be higher with extra interest)
}

// Color scheme matching the infographic
const COLORS = {
  sa: '#8b5cf6', // Purple - SA
  oa: '#3b82f6', // Blue - OA
  maOverflow: '#06b6d4', // Cyan - MA overflow
  cash: '#f97316', // Orange - Cash top-up
  ra: '#fbbf24', // Gold - RA (CPF LIFE eligible)
  raRss: '#ef4444', // Red - RA (RSS/shortfall)
  excess: '#22c55e', // Green - Excess (withdrawable)
  ma: '#14b8a6', // Teal - MA (remaining)
}

type TargetSum = 'BRS' | 'FRS' | 'ERS'
type InputMode = 'current' | 'manual'

interface ConversionResult {
  saToRa: number
  oaToRa: number
  maOverflow: number
  cashTopUp: number
  raTotal: number
  oaRemaining: number
  saRemaining: number
  withdrawable: number
  maRemaining: number
  raAt65: number
  qualifiesForCPFLife: boolean
  shortfall: number
  // RSS at 65 calculations
  rssMonthlyPayout: number
  rssYearsOfPayout: number
  rssDepletionAge: number
}

function calculateRAConversion(inputs: {
  oaBalance: number
  saBalance: number
  maBalance: number
  targetSum: TargetSum
  hasPropertyPledge: boolean
  cashBalance: number
}): ConversionResult {
  const { oaBalance, saBalance, maBalance, targetSum, cashBalance } = inputs

  // Determine target amount based on selection
  const target = CPF_CONSTANTS[targetSum]

  // Auto-transfer cap: For ERS, only FRS amount is auto-transferred
  const autoTransferCap = targetSum === 'ERS' ? CPF_CONSTANTS.FRS : target

  // Step 1: SA transfers first (all of it, up to cap)
  const saToRa = Math.min(saBalance, autoTransferCap)
  const saRemaining = Math.max(0, saBalance - saToRa)

  // Step 2: OA fills gap
  const remainingNeeded = Math.max(0, autoTransferCap - saToRa)
  const oaToRa = Math.min(oaBalance, remainingNeeded)
  const oaRemaining = oaBalance - oaToRa

  // Step 3: MA overflow (if MA > BHS, excess goes to RA)
  const maOverflow = Math.max(0, maBalance - CPF_CONSTANTS.BHS)
  const maRemaining = Math.min(maBalance, CPF_CONSTANTS.BHS)

  // Step 4: Calculate RA total (auto-transfer portion)
  let raTotal = saToRa + oaToRa + maOverflow

  // Step 5: ERS cash top-up (if applicable)
  let cashTopUp = 0
  let shortfall = 0
  if (targetSum === 'ERS') {
    const ersGap = CPF_CONSTANTS.ERS - raTotal
    if (ersGap > 0) {
      cashTopUp = Math.min(cashBalance, ersGap)
      raTotal += cashTopUp
      shortfall = Math.max(0, ersGap - cashTopUp)
    }
  }

  // Step 6: Calculate withdrawable amount
  const withdrawable = oaRemaining + saRemaining

  // Step 7: Project to age 65 (~4% p.a. for 10 years)
  const raAt65 = raTotal * Math.pow(1.04, 10)
  const qualifiesForCPFLife = raAt65 >= CPF_CONSTANTS.MRS

  // Step 8: Calculate RSS payout details (for those below MRS)
  // RSS is a drawdown scheme - you receive monthly payouts until RA is depleted
  // Typical RSS monthly payout is calculated to last until ~90 years old (25 years from 65)
  // But actual payout depends on RA balance
  const rssTargetYears = 25 // Target: payouts until age 90
  const rssMonthlyPayout = raAt65 / (rssTargetYears * 12)

  // Calculate how long the RSS will actually last at this payout rate
  // Accounting for ~4% interest on remaining balance
  let rssYearsOfPayout = 0
  if (rssMonthlyPayout > 0) {
    // Simplified calculation: with 4% interest, funds last longer
    // Using annuity formula: n = -ln(1 - PV*r/PMT) / ln(1+r)
    const monthlyRate = 0.04 / 12
    const pvRatio = (raAt65 * monthlyRate) / rssMonthlyPayout
    if (pvRatio < 1) {
      rssYearsOfPayout = -Math.log(1 - pvRatio) / (12 * Math.log(1 + monthlyRate))
    } else {
      rssYearsOfPayout = 30 // Effectively perpetual with interest
    }
  }
  const rssDepletionAge = 65 + rssYearsOfPayout

  return {
    saToRa,
    oaToRa,
    maOverflow,
    cashTopUp,
    raTotal,
    oaRemaining,
    saRemaining,
    withdrawable,
    maRemaining,
    raAt65,
    qualifiesForCPFLife,
    shortfall,
    rssMonthlyPayout,
    rssYearsOfPayout,
    rssDepletionAge,
  }
}

function projectBalancesToAge55(
  currentAge: number,
  oaBalance: number,
  saBalance: number,
  maBalance: number
): { oa: number; sa: number; ma: number } {
  const yearsToAge55 = Math.max(0, 55 - currentAge)

  return {
    oa: oaBalance * Math.pow(1 + INTEREST_RATES.oa, yearsToAge55),
    sa: saBalance * Math.pow(1 + INTEREST_RATES.sa, yearsToAge55),
    ma: maBalance * Math.pow(1 + INTEREST_RATES.ma, yearsToAge55),
  }
}

// Custom Sankey node component
function CustomNode({ x, y, width, height, payload }: any) {
  const nodeColors: Record<string, string> = {
    SA: COLORS.sa,
    OA: COLORS.oa,
    'MA Overflow': COLORS.maOverflow,
    'Cash Top-up': COLORS.cash,
    'Retirement Account': COLORS.ra,
    'RA (RSS)': COLORS.raRss,
    Withdrawable: COLORS.excess,
    MediSave: COLORS.ma,
  }

  const isLeftNode = ['SA', 'OA', 'MA Overflow', 'Cash Top-up'].includes(payload.name)
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
        fill={nodeColors[payload.name] || '#64748b'}
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

interface Age55ConversionSimulatorProps {
  className?: string
}

export function Age55ConversionSimulator({ className }: Age55ConversionSimulatorProps) {
  // Input mode state
  const [inputMode, setInputMode] = useState<InputMode>('manual')

  // Current balances mode inputs
  const [currentAge, setCurrentAge] = useState(35)
  const [currentOA, setCurrentOA] = useState(50000)
  const [currentSA, setCurrentSA] = useState(30000)
  const [currentMA, setCurrentMA] = useState(25000)

  // Manual mode inputs (balances at 55)
  const [manualOA, setManualOA] = useState(150000)
  const [manualSA, setManualSA] = useState(180000)
  const [manualMA, setManualMA] = useState(68000)

  // Target selection
  const [targetSum, setTargetSum] = useState<TargetSum>('FRS')
  const [hasPropertyPledge, setHasPropertyPledge] = useState(false)
  const [cashBalance, setCashBalance] = useState(0)

  // Calculate projected or manual balances
  const balancesAt55 = useMemo(() => {
    if (inputMode === 'current') {
      return projectBalancesToAge55(currentAge, currentOA, currentSA, currentMA)
    }
    return { oa: manualOA, sa: manualSA, ma: manualMA }
  }, [inputMode, currentAge, currentOA, currentSA, currentMA, manualOA, manualSA, manualMA])

  // Calculate conversion results
  const result = useMemo(() => {
    return calculateRAConversion({
      oaBalance: balancesAt55.oa,
      saBalance: balancesAt55.sa,
      maBalance: balancesAt55.ma,
      targetSum,
      hasPropertyPledge,
      cashBalance: targetSum === 'ERS' ? cashBalance : 0,
    })
  }, [balancesAt55, targetSum, hasPropertyPledge, cashBalance])

  // Build Sankey data
  const sankeyData = useMemo(() => {
    const nodes: { name: string }[] = []
    const links: { source: number; target: number; value: number }[] = []

    // Always add SA if it contributes
    if (result.saToRa > 0) {
      nodes.push({ name: 'SA' })
    }

    // Always add OA if it contributes
    if (result.oaToRa > 0 || result.oaRemaining > 0) {
      nodes.push({ name: 'OA' })
    }

    // Add MA Overflow if applicable
    if (result.maOverflow > 0) {
      nodes.push({ name: 'MA Overflow' })
    }

    // Add Cash Top-up if ERS and cash provided
    if (result.cashTopUp > 0) {
      nodes.push({ name: 'Cash Top-up' })
    }

    // Right side nodes
    const raNodeName = result.qualifiesForCPFLife ? 'Retirement Account' : 'RA (RSS)'
    nodes.push({ name: raNodeName })

    if (result.withdrawable > 0) {
      nodes.push({ name: 'Withdrawable' })
    }

    if (result.maRemaining > 0) {
      nodes.push({ name: 'MediSave' })
    }

    // Build links
    const getNodeIndex = (name: string) => nodes.findIndex((n) => n.name === name)

    const raIndex = getNodeIndex(raNodeName)

    // SA → RA
    if (result.saToRa > 0) {
      links.push({ source: getNodeIndex('SA'), target: raIndex, value: result.saToRa })
    }

    // OA → RA
    if (result.oaToRa > 0) {
      links.push({ source: getNodeIndex('OA'), target: raIndex, value: result.oaToRa })
    }

    // OA → Withdrawable
    if (result.oaRemaining > 0 && result.withdrawable > 0) {
      const withdrawIndex = getNodeIndex('Withdrawable')
      if (withdrawIndex >= 0) {
        links.push({ source: getNodeIndex('OA'), target: withdrawIndex, value: result.oaRemaining })
      }
    }

    // MA Overflow → RA
    if (result.maOverflow > 0) {
      links.push({ source: getNodeIndex('MA Overflow'), target: raIndex, value: result.maOverflow })
    }

    // Cash → RA
    if (result.cashTopUp > 0) {
      links.push({ source: getNodeIndex('Cash Top-up'), target: raIndex, value: result.cashTopUp })
    }

    return { nodes, links }
  }, [result])

  const targetLabels: Record<TargetSum, string> = {
    BRS: `Basic (${formatCurrency(CPF_CONSTANTS.BRS)})`,
    FRS: `Full (${formatCurrency(CPF_CONSTANTS.FRS)})`,
    ERS: `Enhanced (${formatCurrency(CPF_CONSTANTS.ERS)})`,
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="flex items-center gap-2 text-lg font-medium text-white">
            <Calculator className="h-5 w-5 text-amber-400" />
            Age 55 RA Conversion Simulator
          </h3>
          <p className="text-sm text-slate-400">
            See how your CPF balances convert to a Retirement Account at age 55
          </p>
        </div>

        {/* Input Mode Toggle */}
        <div className="flex rounded-lg border border-white/10 bg-white/5 p-1">
          <button
            onClick={() => setInputMode('current')}
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition ${
              inputMode === 'current' ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Project from Current
          </button>
          <button
            onClick={() => setInputMode('manual')}
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition ${
              inputMode === 'manual' ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Enter at Age 55
          </button>
        </div>
      </div>

      {/* Input Section */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Balance Inputs */}
        <div className="rounded-xl border border-white/[0.08] bg-[#0a0a0a] p-5">
          <h4 className="mb-4 text-sm font-medium text-white">
            {inputMode === 'current' ? 'Current CPF Balances' : 'Expected Balances at Age 55'}
          </h4>

          {inputMode === 'current' && (
            <div className="mb-4">
              <label className="mb-1 block text-xs text-slate-400">Current Age</label>
              <input
                type="number"
                value={currentAge}
                onChange={(e) => setCurrentAge(Math.min(54, Math.max(20, Number(e.target.value))))}
                className="w-full rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-2 text-sm text-white focus:border-white/20 focus:outline-none"
                min={20}
                max={54}
              />
              <p className="mt-1 text-xs text-slate-500">
                {55 - currentAge} years until age 55
              </p>
            </div>
          )}

          <div className="space-y-3">
            {/* OA Input */}
            <div>
              <label className="mb-1 flex items-center gap-2 text-xs text-slate-400">
                <div className="h-2 w-2 rounded-full" style={{ backgroundColor: COLORS.oa }} />
                Ordinary Account (OA)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-500">
                  $
                </span>
                <input
                  type="number"
                  value={inputMode === 'current' ? currentOA : manualOA}
                  onChange={(e) =>
                    inputMode === 'current'
                      ? setCurrentOA(Number(e.target.value))
                      : setManualOA(Number(e.target.value))
                  }
                  className="w-full rounded-lg border border-white/[0.06] bg-white/[0.03] py-2 pl-7 pr-3 text-sm text-white focus:border-white/20 focus:outline-none"
                />
              </div>
            </div>

            {/* SA Input */}
            <div>
              <label className="mb-1 flex items-center gap-2 text-xs text-slate-400">
                <div className="h-2 w-2 rounded-full" style={{ backgroundColor: COLORS.sa }} />
                Special Account (SA)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-500">
                  $
                </span>
                <input
                  type="number"
                  value={inputMode === 'current' ? currentSA : manualSA}
                  onChange={(e) =>
                    inputMode === 'current'
                      ? setCurrentSA(Number(e.target.value))
                      : setManualSA(Number(e.target.value))
                  }
                  className="w-full rounded-lg border border-white/[0.06] bg-white/[0.03] py-2 pl-7 pr-3 text-sm text-white focus:border-white/20 focus:outline-none"
                />
              </div>
            </div>

            {/* MA Input */}
            <div>
              <label className="mb-1 flex items-center gap-2 text-xs text-slate-400">
                <div className="h-2 w-2 rounded-full" style={{ backgroundColor: COLORS.ma }} />
                MediSave Account (MA)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-500">
                  $
                </span>
                <input
                  type="number"
                  value={inputMode === 'current' ? currentMA : manualMA}
                  onChange={(e) =>
                    inputMode === 'current'
                      ? setCurrentMA(Number(e.target.value))
                      : setManualMA(Number(e.target.value))
                  }
                  className="w-full rounded-lg border border-white/[0.06] bg-white/[0.03] py-2 pl-7 pr-3 text-sm text-white focus:border-white/20 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Projected balances (shown in current mode) */}
          {inputMode === 'current' && (
            <div className="mt-4 rounded-lg border border-amber-500/20 bg-amber-500/10 p-3">
              <p className="mb-2 text-xs font-medium text-amber-300">
                Projected balances at age 55 (with interest)
              </p>
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div>
                  <p className="text-slate-400">OA</p>
                  <p className="font-mono text-blue-400">{formatCurrency(balancesAt55.oa)}</p>
                </div>
                <div>
                  <p className="text-slate-400">SA</p>
                  <p className="font-mono text-purple-400">{formatCurrency(balancesAt55.sa)}</p>
                </div>
                <div>
                  <p className="text-slate-400">MA</p>
                  <p className="font-mono text-teal-400">{formatCurrency(balancesAt55.ma)}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Target Selection */}
        <div className="rounded-xl border border-white/[0.08] bg-[#0a0a0a] p-5">
          <h4 className="mb-4 text-sm font-medium text-white">Retirement Sum Target</h4>

          <div className="space-y-3">
            {(['BRS', 'FRS', 'ERS'] as TargetSum[]).map((target) => (
              <label
                key={target}
                className={`flex cursor-pointer items-center justify-between rounded-lg border p-3 transition ${
                  targetSum === target
                    ? 'border-amber-500/50 bg-amber-500/10'
                    : 'border-white/[0.06] bg-white/[0.02] hover:border-white/20'
                }`}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="targetSum"
                    value={target}
                    checked={targetSum === target}
                    onChange={() => setTargetSum(target)}
                    className="h-4 w-4 accent-amber-500"
                  />
                  <div>
                    <p className="text-sm font-medium text-white">{targetLabels[target]}</p>
                    <p className="text-xs text-slate-400">
                      {target === 'BRS' && 'With property pledge'}
                      {target === 'FRS' && 'Standard retirement sum'}
                      {target === 'ERS' && 'Higher payouts (requires cash top-up)'}
                    </p>
                  </div>
                </div>
                {targetSum === target && (
                  <CheckCircle2 className="h-5 w-5 text-amber-400" />
                )}
              </label>
            ))}
          </div>

          {/* Property Pledge (for BRS) */}
          {targetSum === 'BRS' && (
            <label className="mt-4 flex cursor-pointer items-center gap-3 rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
              <input
                type="checkbox"
                checked={hasPropertyPledge}
                onChange={(e) => setHasPropertyPledge(e.target.checked)}
                className="h-4 w-4 rounded accent-amber-500"
              />
              <div className="flex items-center gap-2">
                <Home className="h-4 w-4 text-slate-400" />
                <span className="text-sm text-slate-300">I have a property pledge</span>
              </div>
            </label>
          )}

          {/* Cash Top-up (for ERS) */}
          {targetSum === 'ERS' && (
            <div className="mt-4">
              <label className="mb-1 flex items-center gap-2 text-xs text-slate-400">
                <Wallet className="h-3.5 w-3.5" />
                Cash for RSTU Top-up (Optional)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-500">
                  $
                </span>
                <input
                  type="number"
                  value={cashBalance}
                  onChange={(e) => setCashBalance(Math.max(0, Number(e.target.value)))}
                  className="w-full rounded-lg border border-white/[0.06] bg-white/[0.03] py-2 pl-7 pr-3 text-sm text-white focus:border-white/20 focus:outline-none"
                  placeholder="0"
                />
              </div>
              <p className="mt-1 text-xs text-slate-500">
                Auto-transfer caps at FRS ({formatCurrency(CPF_CONSTANTS.FRS)}). Cash top-up needed
                for the remaining {formatCurrency(CPF_CONSTANTS.ERS - CPF_CONSTANTS.FRS)}.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Decision Flowchart */}
      <Age55DecisionFlowchart saBalance={balancesAt55.sa} oaBalance={balancesAt55.oa} />

      {/* Sankey Flow Chart */}
      <div className="rounded-xl border border-white/[0.08] bg-[#0a0a0a] p-5">
        <div className="mb-4 flex items-center gap-2">
          <ArrowRight className="h-4 w-4 text-amber-400" />
          <h4 className="text-sm font-medium text-white">Money Flow at Age 55</h4>
        </div>

        <div className="h-[350px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <Sankey
              data={sankeyData}
              node={<CustomNode />}
              nodePadding={40}
              nodeWidth={12}
              linkCurvature={0.5}
              margin={{ top: 20, right: 180, bottom: 20, left: 120 }}
              link={{
                stroke: '#ffffff',
                strokeOpacity: 0.15,
              }}
            >
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.[0]) return null
                  const data = payload[0].payload
                  if (data.source && data.target) {
                    return (
                      <div className="rounded-lg border border-white/10 bg-[#0f1728]/95 px-3 py-2 shadow-xl backdrop-blur">
                        <p className="text-xs text-slate-400">
                          {data.source.name} → {data.target.name}
                        </p>
                        <p className="text-lg font-semibold text-white">
                          {formatCurrency(data.value)}
                        </p>
                      </div>
                    )
                  }
                  return null
                }}
              />
            </Sankey>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Results Panel */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* RA Balance */}
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4">
          <p className="mb-1 text-xs text-amber-300">Retirement Account at 55</p>
          <p className="font-mono text-2xl font-semibold text-amber-400">
            {formatCurrency(result.raTotal)}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            {((result.raTotal / CPF_CONSTANTS[targetSum]) * 100).toFixed(0)}% of{' '}
            {targetSum} target
          </p>
        </div>

        {/* Withdrawable */}
        <div className="rounded-xl border border-green-500/20 bg-green-500/10 p-4">
          <p className="mb-1 text-xs text-green-300">Withdrawable (Optional)</p>
          <p className="font-mono text-2xl font-semibold text-green-400">
            {formatCurrency(result.withdrawable)}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            Excess above your {targetSum} target
          </p>
        </div>

        {/* CPF LIFE Indicator */}
        <div
          className={`rounded-xl border p-4 ${
            result.qualifiesForCPFLife
              ? 'border-emerald-500/20 bg-emerald-500/10'
              : 'border-red-500/20 bg-red-500/10'
          }`}
        >
          <p
            className={`mb-1 text-xs ${
              result.qualifiesForCPFLife ? 'text-emerald-300' : 'text-red-300'
            }`}
          >
            Projected RA at 65
          </p>
          <p
            className={`font-mono text-2xl font-semibold ${
              result.qualifiesForCPFLife ? 'text-emerald-400' : 'text-red-400'
            }`}
          >
            {formatCurrency(result.raAt65)}
          </p>
          <div className="mt-2 flex items-center gap-1.5">
            {result.qualifiesForCPFLife ? (
              <>
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                <span className="text-xs text-emerald-300">Eligible for CPF LIFE</span>
              </>
            ) : (
              <>
                <AlertTriangle className="h-4 w-4 text-red-400" />
                <span className="text-xs text-red-300">
                  RSS only (below ${formatCurrency(CPF_CONSTANTS.MRS)} minimum)
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Age 65: RSS vs CPF LIFE Section */}
      <div className="rounded-xl border border-white/[0.08] bg-[#0a0a0a] p-5">
        <h4 className="mb-4 flex items-center gap-2 text-sm font-medium text-white">
          <Calendar className="h-4 w-4 text-purple-400" />
          At Age 65: Retirement Payout Scheme
        </h4>

        <div className="grid gap-4 md:grid-cols-2">
          {/* CPF LIFE Option */}
          <div
            className={`rounded-xl border p-4 ${
              result.qualifiesForCPFLife
                ? 'border-emerald-500/30 bg-emerald-500/10'
                : 'border-white/[0.06] bg-white/[0.02] opacity-60'
            }`}
          >
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Infinity className="h-4 w-4 text-emerald-400" />
                <span className="text-sm font-medium text-white">CPF LIFE</span>
              </div>
              {result.qualifiesForCPFLife ? (
                <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs text-emerald-400">
                  Eligible
                </span>
              ) : (
                <span className="rounded-full bg-slate-500/20 px-2 py-0.5 text-xs text-slate-400">
                  Not Eligible
                </span>
              )}
            </div>
            <p className="mb-3 text-xs text-slate-400">
              Lifelong monthly payouts that never run out, regardless of how long you live.
            </p>
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Minimum RA required</span>
                <span className="font-mono text-slate-300">{formatCurrency(CPF_CONSTANTS.MRS)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Your projected RA at 65</span>
                <span className={`font-mono ${result.qualifiesForCPFLife ? 'text-emerald-400' : 'text-red-400'}`}>
                  {formatCurrency(result.raAt65)}
                </span>
              </div>
              {result.qualifiesForCPFLife && (
                <div className="mt-2 rounded-lg bg-emerald-500/10 p-2">
                  <p className="text-xs text-emerald-300">
                    ✓ You qualify for CPF LIFE! Visit the CPF website to estimate your monthly payouts
                    based on your chosen plan (Standard, Basic, or Escalating).
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* RSS Option */}
          <div
            className={`rounded-xl border p-4 ${
              !result.qualifiesForCPFLife
                ? 'border-red-500/30 bg-red-500/10'
                : 'border-white/[0.06] bg-white/[0.02] opacity-60'
            }`}
          >
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-red-400" />
                <span className="text-sm font-medium text-white">RSS (Retirement Sum Scheme)</span>
              </div>
              {!result.qualifiesForCPFLife ? (
                <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-xs text-red-400">
                  Your Scheme
                </span>
              ) : (
                <span className="rounded-full bg-slate-500/20 px-2 py-0.5 text-xs text-slate-400">
                  N/A
                </span>
              )}
            </div>
            <p className="mb-3 text-xs text-slate-400">
              Monthly drawdown from your RA until it&apos;s depleted. Payouts stop when funds run out.
            </p>
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Estimated monthly payout</span>
                <span className="font-mono text-slate-300">{formatCurrency(result.rssMonthlyPayout)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Estimated duration</span>
                <span className="font-mono text-slate-300">~{Math.round(result.rssYearsOfPayout)} years</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Funds depleted by age</span>
                <span className="font-mono text-slate-300">~{Math.round(result.rssDepletionAge)}</span>
              </div>
              {!result.qualifiesForCPFLife && (
                <div className="mt-2 rounded-lg bg-amber-500/10 p-2">
                  <p className="text-xs text-amber-300">
                    ⚠️ Consider topping up your RA to at least {formatCurrency(CPF_CONSTANTS.MRS)} by age 65
                    to qualify for CPF LIFE&apos;s lifelong payouts.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Gap to CPF LIFE */}
        {!result.qualifiesForCPFLife && (
          <div className="mt-4 rounded-lg border border-purple-500/20 bg-purple-500/10 p-3">
            <p className="text-xs text-purple-200">
              <strong>To qualify for CPF LIFE:</strong> You need an additional{' '}
              <span className="font-mono font-semibold">
                {formatCurrency(CPF_CONSTANTS.MRS - result.raAt65)}
              </span>{' '}
              in your RA by age 65. Consider RSTU top-ups or voluntary contributions to close this gap.
            </p>
          </div>
        )}
      </div>

      {/* Transfer Breakdown */}
      <div className="rounded-xl border border-white/[0.08] bg-[#0a0a0a] p-5">
        <h4 className="mb-4 flex items-center gap-2 text-sm font-medium text-white">
          <TrendingUp className="h-4 w-4 text-slate-400" />
          Transfer Breakdown
        </h4>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg bg-purple-500/10 p-3">
            <p className="text-xs text-slate-400">SA → RA</p>
            <p className="font-mono text-lg font-medium text-purple-400">
              {formatCurrency(result.saToRa)}
            </p>
          </div>
          <div className="rounded-lg bg-blue-500/10 p-3">
            <p className="text-xs text-slate-400">OA → RA</p>
            <p className="font-mono text-lg font-medium text-blue-400">
              {formatCurrency(result.oaToRa)}
            </p>
          </div>
          {result.maOverflow > 0 && (
            <div className="rounded-lg bg-cyan-500/10 p-3">
              <p className="text-xs text-slate-400">MA Overflow → RA</p>
              <p className="font-mono text-lg font-medium text-cyan-400">
                {formatCurrency(result.maOverflow)}
              </p>
            </div>
          )}
          {result.cashTopUp > 0 && (
            <div className="rounded-lg bg-orange-500/10 p-3">
              <p className="text-xs text-slate-400">Cash Top-up → RA</p>
              <p className="font-mono text-lg font-medium text-orange-400">
                {formatCurrency(result.cashTopUp)}
              </p>
            </div>
          )}
        </div>

        {result.shortfall > 0 && (
          <div className="mt-4 flex items-start gap-2 rounded-lg border border-amber-500/20 bg-amber-500/10 p-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-400" />
            <p className="text-xs text-amber-200">
              You need an additional {formatCurrency(result.shortfall)} cash top-up to reach the
              Enhanced Retirement Sum.
            </p>
          </div>
        )}
      </div>

      {/* Educational Footer */}
      <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4">
        <div className="flex items-start gap-3">
          <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-400" />
          <div className="space-y-2 text-xs text-slate-400">
            <p>
              <strong className="text-slate-300">How RA Formation Works:</strong> At age 55, your
              SA transfers first (up to your target), then OA fills any remaining gap. If your MA
              exceeds the Basic Healthcare Sum ({formatCurrency(CPF_CONSTANTS.BHS)}), the excess
              flows to RA.
            </p>
            <p>
              <strong className="text-slate-300">For ERS:</strong> Auto-transfer is capped at FRS
              ({formatCurrency(CPF_CONSTANTS.FRS)}). The remaining{' '}
              {formatCurrency(CPF_CONSTANTS.ERS - CPF_CONSTANTS.FRS)} requires a cash top-up via
              RSTU (Retirement Sum Topping-Up Scheme).
            </p>
            <p>
              <strong className="text-slate-300">CPF LIFE vs RSS:</strong> If your RA at age 65 is
              at least {formatCurrency(CPF_CONSTANTS.MRS)}, you&apos;ll receive lifelong payouts via
              CPF LIFE. Below that, you&apos;ll be on RSS (drawdown until depleted).
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
