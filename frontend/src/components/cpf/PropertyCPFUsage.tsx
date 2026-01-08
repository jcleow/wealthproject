'use client'

import { useState, useMemo, useCallback } from 'react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { Home, TrendingUp, Calculator, AlertTriangle, ArrowRight, DollarSign, Plus, X } from 'lucide-react'

import { formatCurrency } from '@/lib/format'
import { generateUUID } from '@/lib/utils'
import { CustomDropdown } from '@/components/modals/ScenarioEventModal/components/CustomDropdown'
import type { CPFHousingUsage, PropertySaleAnalysis } from '@/types/cpf'
import {
  mockCPFHousingUsage,
  mockPropertySaleAnalysis,
} from '@/lib/cpf-mock-data'

// Types for property scenarios and grants
export interface PropertyScenario {
  id: string
  name: string
  propertyType: string
  // Add other fields as needed from actual scenario type
}

export interface HousingGrant {
  id: string
  name: string
  amount: number
}

interface PropertyCPFUsageProps {
  /** Property scenarios to select from */
  propertyScenarios?: PropertyScenario[]
  /** Currently selected scenario ID */
  selectedScenarioId?: string | null
  /** Callback when scenario selection changes */
  onScenarioSelect?: (id: string) => void
  /** User-configured housing grants */
  grants?: HousingGrant[]
  /** Callback when grants change */
  onGrantsChange?: (grants: HousingGrant[]) => void
  className?: string
}

export function PropertyCPFUsage({
  propertyScenarios = [],
  selectedScenarioId,
  onScenarioSelect,
  grants: externalGrants,
  onGrantsChange,
  className,
}: PropertyCPFUsageProps) {
  const [activeTab, setActiveTab] = useState<'usage' | 'sale' | 'grants'>('usage')

  // Internal grants state for when no external control is provided
  const [internalGrants, setInternalGrants] = useState<HousingGrant[]>([])
  const grants = externalGrants ?? internalGrants
  const handleGrantsChange = onGrantsChange ?? setInternalGrants

  // Build scenario dropdown options
  const scenarioOptions = useMemo(() => [
    { value: '', label: 'Select a property scenario...' },
    ...propertyScenarios.map(s => ({
      value: s.id,
      label: s.name || `Property (${s.propertyType})`,
    }))
  ], [propertyScenarios])

  // Calculate total grants
  const totalGrants = useMemo(() =>
    grants.reduce((sum, g) => sum + g.amount, 0),
    [grants]
  )

  // TODO: Map selectedScenarioId to actual usage/sale data
  // For now, still using mock data until integration is complete

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Scenario Selector */}
      {propertyScenarios.length > 0 && (
        <div className="rounded-xl border border-white/[0.08] bg-[#0a0a0a] p-4">
          <div className="flex items-center gap-3">
            <Home className="h-4 w-4 text-blue-400" />
            <span className="text-sm font-medium text-slate-300">Property Scenario</span>
          </div>
          <div className="mt-3">
            <CustomDropdown
              value={selectedScenarioId ?? ''}
              onChange={(value) => onScenarioSelect?.(value)}
              options={scenarioOptions}
              minWidth="100%"
            />
          </div>
          {!selectedScenarioId && (
            <p className="mt-2 text-xs text-slate-500">
              Select a property scenario to view CPF usage details
            </p>
          )}
        </div>
      )}

      {/* Tab Selector */}
      <div className="flex rounded-lg border border-white/[0.08] bg-[#0a0a0a] p-1">
        <button
          onClick={() => setActiveTab('usage')}
          className={`flex-1 rounded-md px-4 py-2.5 text-sm font-medium transition ${
            activeTab === 'usage'
              ? 'bg-blue-500/20 text-blue-400'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          CPF Usage
        </button>
        <button
          onClick={() => setActiveTab('sale')}
          className={`flex-1 rounded-md px-4 py-2.5 text-sm font-medium transition ${
            activeTab === 'sale'
              ? 'bg-emerald-500/20 text-emerald-400'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Sale Simulator
        </button>
        <button
          onClick={() => setActiveTab('grants')}
          className={`flex-1 rounded-md px-4 py-2.5 text-sm font-medium transition ${
            activeTab === 'grants'
              ? 'bg-amber-500/20 text-amber-400'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Housing Grants
        </button>
      </div>

      {activeTab === 'usage' && <CPFUsageTab usage={mockCPFHousingUsage} />}
      {activeTab === 'sale' && (
        <SaleSimulatorTab usage={mockCPFHousingUsage} sale={mockPropertySaleAnalysis} />
      )}
      {activeTab === 'grants' && (
        <HousingGrantsTab
          grants={grants}
          totalGrants={totalGrants}
          onGrantsChange={handleGrantsChange}
        />
      )}
    </div>
  )
}

function CPFUsageTab({ usage }: { usage: CPFHousingUsage }) {
  const downPaymentTotal = usage.downPayment.oaUsed + usage.downPayment.cashUsed
  const monthlyOaCash = usage.totals.totalCashUsed - usage.downPayment.cashUsed

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          icon={<Home className="h-4 w-4" />}
          label="Total OA Used"
          value={usage.totals.totalOAUsed}
          color="blue"
        />
        <SummaryCard
          icon={<DollarSign className="h-4 w-4" />}
          label="Total Cash Used"
          value={usage.totals.totalCashUsed}
          color="slate"
        />
        <SummaryCard
          icon={<TrendingUp className="h-4 w-4" />}
          label="Grants Received"
          value={usage.downPayment.grantReceived}
          color="emerald"
        />
        <SummaryCard
          icon={<Calculator className="h-4 w-4" />}
          label="Accrued Interest"
          value={usage.accruedInterest.totalAccrued}
          color="amber"
        />
      </div>

      {/* Usage Breakdown */}
      <div className="rounded-xl border border-white/[0.08] bg-[#0a0a0a] p-5">
        <h3 className="mb-4 text-sm font-medium text-slate-300">OA Usage Breakdown</h3>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Down Payment */}
          <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4">
            <p className="text-xs font-medium text-slate-500 mb-3">Down Payment</p>
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">CPF OA Used</span>
                <span className="text-white font-mono tabular-nums">{formatCurrency(usage.downPayment.oaUsed)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Cash Used</span>
                <span className="text-white font-mono tabular-nums">{formatCurrency(usage.downPayment.cashUsed)}</span>
              </div>
              {usage.downPayment.grantReceived > 0 && (
                <div className="flex justify-between text-xs">
                  <span className="text-emerald-400">{usage.downPayment.grantType} Grant</span>
                  <span className="text-emerald-400 font-mono tabular-nums">+{formatCurrency(usage.downPayment.grantReceived)}</span>
                </div>
              )}
              <div className="flex justify-between text-xs pt-1.5 border-t border-white/[0.04]">
                <span className="text-slate-300">Total</span>
                <span className="text-white font-medium font-mono tabular-nums">{formatCurrency(downPaymentTotal)}</span>
              </div>
            </div>
          </div>

          {/* Monthly Payments */}
          <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4">
            <p className="text-xs font-medium text-slate-500 mb-3">Monthly Payments (Total)</p>
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">CPF OA for Monthly</span>
                <span className="text-white font-mono tabular-nums">{formatCurrency(usage.totals.oaForMonthlyPayments)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Cash for Monthly</span>
                <span className="text-white font-mono tabular-nums">{formatCurrency(monthlyOaCash)}</span>
              </div>
              <div className="flex justify-between text-xs pt-1.5 border-t border-white/[0.04]">
                <span className="text-slate-300">Total Monthly</span>
                <span className="text-white font-medium font-mono tabular-nums">{formatCurrency(usage.totals.oaForMonthlyPayments + monthlyOaCash)}</span>
              </div>
            </div>
            <p className="mt-3 text-[10px] text-slate-600">
              {usage.monthlyPayments.length} months of payments tracked
            </p>
          </div>
        </div>
      </div>

      {/* Accrued Interest Chart */}
      <div className="rounded-xl border border-white/[0.08] bg-[#0a0a0a] p-5">
        <h3 className="mb-4 text-sm font-medium text-slate-300">
          Accrued Interest Over Time (2.5% p.a.)
        </h3>

        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={usage.accruedInterest.yearlyBreakdown}
              margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id="accruedGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis
                dataKey="year"
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `$${(value / 1000).toFixed(0)}K`}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.[0]) return null
                  const data = payload[0].payload
                  return (
                    <div className={`px-3 py-2
rounded-lg border border-white/10
bg-[#0f1728]/95
shadow-xl backdrop-blur`}>
                      <p className="text-xs font-bold text-slate-400">Year {data.year}</p>
                      <div className="mt-2 space-y-1 text-xs">
                        <div className="flex justify-between gap-4">
                          <span className="text-slate-400">Principal:</span>
                          <span className="text-white">{formatCurrency(data.startingPrincipal)}</span>
                        </div>
                        <div className="flex justify-between gap-4">
                          <span className="text-slate-400">Interest This Year:</span>
                          <span className="text-amber-400">+{formatCurrency(data.interestForYear)}</span>
                        </div>
                        <div className="flex justify-between gap-4 border-t border-white/10 pt-1">
                          <span className="text-slate-400">Cumulative Interest:</span>
                          <span className="font-medium text-white">{formatCurrency(data.cumulativeInterest)}</span>
                        </div>
                      </div>
                    </div>
                  )
                }}
              />
              <Area
                type="monotone"
                dataKey="cumulativeInterest"
                stroke="#f59e0b"
                fill="url(#accruedGradient)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Warning */}
        <div className={`flex items-start
mt-4 gap-3 p-3
rounded-lg border border-amber-500/20
bg-amber-500/5`}>
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-400" />
          <p className="text-xs text-slate-300">
            When you sell your property, you must refund the principal used plus all accrued
            interest back to your CPF account.
          </p>
        </div>
      </div>
    </div>
  )
}

function SaleSimulatorTab({
  usage,
  sale,
}: {
  usage: CPFHousingUsage
  sale: PropertySaleAnalysis
}) {
  const [salePrice, setSalePrice] = useState(sale.grossProceeds.toString())
  const [outstandingLoan, setOutstandingLoan] = useState(sale.outstandingLoan.toString())

  const simulatedSale = useMemo(() => {
    const price = parseFloat(salePrice) || 0
    const loan = parseFloat(outstandingLoan) || 0
    const sellingCosts = Math.round(price * 0.02) // ~2% selling costs

    const principalUsed = usage.totals.totalOAUsed
    const accruedInterest = usage.accruedInterest.totalAccrued
    const totalRefund = principalUsed + accruedInterest

    const netProceeds = price - loan - sellingCosts - totalRefund

    return {
      ...sale,
      grossProceeds: price,
      outstandingLoan: loan,
      sellingCosts,
      cpfRefundRequired: {
        principalUsed,
        accruedInterest,
        totalRefund,
      },
      netCashProceeds: netProceeds,
    }
  }, [salePrice, outstandingLoan, usage, sale])

  return (
    <div className="space-y-6">
      {/* Input Form */}
      <div className="rounded-xl border border-white/[0.08] bg-[#0a0a0a] p-5">
        <h3 className="mb-4 text-sm font-medium text-slate-300">Sale Scenario</h3>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="text-xs text-slate-400">Expected Sale Price</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</span>
              <input
                type="number"
                value={salePrice}
                onChange={(e) => setSalePrice(e.target.value)}
                className={`w-full
py-2.5 pl-8 pr-4
rounded-lg border border-white/[0.08] focus:border-emerald-500/50 focus:outline-none
bg-white/[0.02]
text-sm text-white placeholder:text-slate-600`}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs text-slate-400">Outstanding Loan</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</span>
              <input
                type="number"
                value={outstandingLoan}
                onChange={(e) => setOutstandingLoan(e.target.value)}
                className={`w-full
py-2.5 pl-8 pr-4
rounded-lg border border-white/[0.08] focus:border-emerald-500/50 focus:outline-none
bg-white/[0.02]
text-sm text-white placeholder:text-slate-600`}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Sale Breakdown */}
      <div className="rounded-xl border border-white/[0.08] bg-[#0a0a0a] p-5">
        <h3 className="mb-4 text-sm font-medium text-slate-300">Sale Proceeds Breakdown</h3>

        <div className="space-y-3">
          <FlowRow
            label="Sale Price"
            value={simulatedSale.grossProceeds}
            type="add"
          />
          <FlowRow
            label="Less: Outstanding Loan"
            value={simulatedSale.outstandingLoan}
            type="subtract"
          />
          <FlowRow
            label="Less: Selling Costs (~2%)"
            value={simulatedSale.sellingCosts}
            type="subtract"
          />

          <div className="border-t border-white/[0.06] pt-3">
            <FlowRow
              label="CPF Principal Refund"
              value={simulatedSale.cpfRefundRequired.principalUsed}
              type="subtract"
              highlight="blue"
            />
            <FlowRow
              label="CPF Accrued Interest Refund"
              value={simulatedSale.cpfRefundRequired.accruedInterest}
              type="subtract"
              highlight="amber"
            />
          </div>

          <div className="border-t border-white/[0.06] pt-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-white">Net Cash Proceeds</span>
              <span
                className={`text-xl font-semibold ${
                  simulatedSale.netCashProceeds >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {formatCurrency(simulatedSale.netCashProceeds)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* CPF Refund Destination */}
      <div className="rounded-xl border border-white/[0.08] bg-[#0a0a0a] p-5">
        <h3 className="mb-4 text-sm font-medium text-slate-300">CPF Refund Destination</h3>

        <div className={`flex items-center justify-between
p-4
rounded-lg
bg-white/[0.02]`}>
          <div className="text-center">
            <p className="text-xs text-slate-400">Total Refund</p>
            <p className="text-xl font-semibold text-white">
              {formatCurrency(simulatedSale.cpfRefundRequired.totalRefund)}
            </p>
          </div>

          <ArrowRight className="h-6 w-6 text-slate-500" />

          <div className="text-center">
            <p className="text-xs text-slate-400">To OA</p>
            <p className="text-xl font-semibold text-blue-400">
              {formatCurrency(sale.refundDestination.toOA)}
            </p>
          </div>

          {sale.refundDestination.toRA > 0 && (
            <>
              <span className="text-slate-500">+</span>
              <div className="text-center">
                <p className="text-xs text-slate-400">To RA</p>
                <p className="text-xl font-semibold text-violet-400">
                  {formatCurrency(sale.refundDestination.toRA)}
                </p>
              </div>
            </>
          )}
        </div>

        <p className="mt-3 text-xs text-slate-400">{sale.refundDestination.reason}</p>

        {simulatedSale.netCashProceeds < 0 && (
          <div className={`flex items-start
mt-4 gap-3 p-3
rounded-lg border border-rose-500/20
bg-rose-500/10`}>
            <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-rose-400" />
            <p className="text-xs text-rose-300">
              Warning: Your sale proceeds are insufficient to cover the CPF refund. You will need
              to top up {formatCurrency(Math.abs(simulatedSale.netCashProceeds))} in cash.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

interface HousingGrantsTabProps {
  grants: HousingGrant[]
  totalGrants: number
  onGrantsChange: (grants: HousingGrant[]) => void
}

function HousingGrantsTab({ grants, totalGrants, onGrantsChange }: HousingGrantsTabProps) {
  const addGrant = useCallback(() => {
    onGrantsChange([
      ...grants,
      { id: generateUUID(), name: '', amount: 0 }
    ])
  }, [grants, onGrantsChange])

  const updateGrant = useCallback((id: string, field: 'name' | 'amount', value: string | number) => {
    onGrantsChange(
      grants.map(g => g.id === id ? { ...g, [field]: value } : g)
    )
  }, [grants, onGrantsChange])

  const removeGrant = useCallback((id: string) => {
    onGrantsChange(grants.filter(g => g.id !== id))
  }, [grants, onGrantsChange])

  return (
    <div className="space-y-6">
      {/* Total Grants */}
      <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-5 text-center">
        <p className="text-xs text-emerald-300">Total Housing Grants</p>
        <p className="mt-2 text-4xl font-bold text-emerald-400 font-mono tabular-nums">
          {formatCurrency(totalGrants)}
        </p>
      </div>

      {/* Editable Grant List */}
      <div className="rounded-xl border border-white/[0.08] bg-[#0a0a0a] p-5">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-sm font-medium text-slate-300">Your Housing Grants</h4>
          <button
            type="button"
            onClick={addGrant}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-emerald-400 hover:bg-emerald-500/10 transition"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Grant
          </button>
        </div>

        {grants.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-sm text-slate-500">No grants added yet</p>
            <p className="mt-1 text-xs text-slate-600">
              Click &quot;Add Grant&quot; to add housing grants you&apos;ve received or expect to receive
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {grants.map((grant) => (
              <div
                key={grant.id}
                className="flex items-center gap-3 p-3 rounded-lg border border-white/[0.06] bg-white/[0.02]"
              >
                <input
                  type="text"
                  value={grant.name}
                  onChange={(e) => updateGrant(grant.id, 'name', e.target.value)}
                  placeholder="Grant name (e.g., EHG, FHG)"
                  className="flex-1 bg-transparent border-none text-sm text-white placeholder:text-slate-600 focus:outline-none"
                />
                <div className="relative w-32">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs">$</span>
                  <input
                    type="number"
                    value={grant.amount || ''}
                    onChange={(e) => updateGrant(grant.id, 'amount', Number(e.target.value) || 0)}
                    placeholder="0"
                    className="w-full pl-6 pr-2 py-1.5 rounded-md bg-white/[0.03] border border-white/[0.08] text-sm text-white font-mono tabular-nums text-right focus:outline-none focus:border-emerald-500/50"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeGrant(grant.id)}
                  className="p-1.5 rounded-md text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="rounded-xl border border-white/[0.08] bg-[#0a0a0a] p-4">
        <h4 className="text-sm font-medium text-slate-300">Common Housing Grants</h4>
        <ul className="mt-3 space-y-2 text-xs text-slate-400">
          <li className="flex items-start gap-2">
            <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-emerald-400" />
            <span><strong className="text-slate-300">EHG</strong> – Enhanced CPF Housing Grant (up to $80,000)</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-emerald-400" />
            <span><strong className="text-slate-300">FHG</strong> – Family Grant (up to $50,000)</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-emerald-400" />
            <span><strong className="text-slate-300">PHG</strong> – Proximity Housing Grant (up to $30,000)</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-emerald-400" />
            <span><strong className="text-slate-300">Step-Up</strong> – Step-Up CPF Housing Grant (up to $15,000)</span>
          </li>
        </ul>
      </div>
    </div>
  )
}

// Helper Components

function SummaryCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode
  label: string
  value: number
  color: 'blue' | 'slate' | 'emerald' | 'amber'
}) {
  const colorClasses = {
    blue: 'text-blue-400 bg-blue-500/20',
    slate: 'text-slate-400 bg-slate-500/20',
    emerald: 'text-emerald-400 bg-emerald-500/20',
    amber: 'text-amber-400 bg-amber-500/20',
  }

  return (
    <div className="rounded-xl border border-white/[0.08] bg-[#0a0a0a] p-4">
      <div className={`inline-flex rounded-lg p-2 ${colorClasses[color]}`}>{icon}</div>
      <p className="mt-3 text-xs text-slate-400">{label}</p>
      <p className="mt-1 text-xl font-semibold text-white">{formatCurrency(value)}</p>
    </div>
  )
}

function FlowRow({
  label,
  value,
  type,
  highlight,
}: {
  label: string
  value: number
  type: 'add' | 'subtract'
  highlight?: 'blue' | 'amber'
}) {
  const highlightClasses = {
    blue: 'bg-blue-500/10 border-blue-500/20',
    amber: 'bg-amber-500/10 border-amber-500/20',
  }

  return (
    <div
      className={`flex items-center justify-between rounded-lg p-2 ${
        highlight ? `border ${highlightClasses[highlight]}` : ''
      }`}
    >
      <span className="text-sm text-slate-400">{label}</span>
      <span className={`text-sm font-medium ${type === 'subtract' ? 'text-rose-400' : 'text-white'}`}>
        {type === 'subtract' && '-'}
        {formatCurrency(value)}
      </span>
    </div>
  )
}
