'use client'

import { useMemo, useState } from 'react'
import type { CPFProfile, CPFAssumptions } from '@/types/cpf'
import { DEFAULT_CPF_ASSUMPTIONS } from '@/types/cpf'
import { CPFAssumptionsPanel } from './CPFAssumptionsPanel'
import { useCpfBalanceProjectionQuery } from '@/hooks/queries/useCpfQuery'
import {
  type ChartView,
  type AccountKey,
  type VisibleAccounts,
  type Milestone,
  transformProjectionData,
  transformChartData,
  calculateThresholdAges,
  generatePayoutProjection,
  BalanceLegend,
  PayoutLegend,
  ChartViewToggle,
  BalanceChart,
  PayoutChart,
  BalanceAtAgeCard,
  CPFLifePayoutCard,
  RetirementTargetsCard,
} from './projection-chart'

interface CPFProjectionChartProps {
  profile: CPFProfile
  className?: string
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
    setVisibleAccounts((prev) => ({ ...prev, [account]: !prev[account] }))
  }

  const {
    data: apiResponse,
    isLoading,
    isFetching,
    error,
  } = useCpfBalanceProjectionQuery(profile.id, {
    retirementAge: assumptions.retirementAge,
    payoutStartAge: assumptions.payoutStartAge,
  })

  const { projection, retirement } = useMemo(() => {
    if (!apiResponse) return { projection: null, retirement: null }
    return transformProjectionData(apiResponse)
  }, [apiResponse])

  const chartData = useMemo(() => {
    if (!projection) return undefined
    return transformChartData(projection)
  }, [projection])

  const thresholdAges = useMemo(() => {
    if (!projection || !retirement) return { brs: null, frs: null, ers: null, bhs: null }
    return calculateThresholdAges(projection, retirement)
  }, [projection, retirement])

  const payoutProjection = useMemo(() => {
    if (!retirement || !projection) return []
    const monthlyPayout = retirement.cpfLifeEstimates[assumptions.cpfLifePlan]
    if (!monthlyPayout || monthlyPayout <= 0) return []

    const currentYear = new Date().getFullYear()
    const birthYear = currentYear - profile.age
    const payoutStartSnapshot = projection.find((p) => p.age === assumptions.payoutStartAge)
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
  }, [
    projection,
    retirement,
    assumptions.cpfLifePlan,
    profile.age,
    assumptions.payoutStartAge,
    assumptions.basicPlanPremiumPercent,
    assumptions.escalatingPlanGrowth,
  ])

  const milestones: Milestone[] = [
    { age: 55, label: 'RA Formation', color: '#f59e0b' },
    { age: assumptions.payoutStartAge, label: 'CPF LIFE Start', color: '#10b981' },
  ]

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
      <CPFAssumptionsPanel
        assumptions={assumptions}
        onChange={setAssumptions}
        collapsible={true}
        defaultExpanded={false}
      />

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
        <RetirementTargetsCard
          projectedYear={projection.find((p) => p.age === profile.age)?.year ?? new Date().getFullYear()}
          frsGrowthRate={assumptions.frsGrowthRate}
        />
      </div>

      <div className="rounded-xl border border-white/[0.08] bg-[#0a0a0a] p-5">
        <ChartHeader
          chartView={chartView}
          onChartViewChange={setChartView}
          visibleAccounts={visibleAccounts}
          onToggleAccount={toggleAccount}
          selectedPlan={assumptions.cpfLifePlan}
          isFetching={isFetching}
          hasError={!!error}
        />

        <div className="h-80">
          {chartView === 'balance' && chartData ? (
            <BalanceChart
              data={chartData}
              visibleAccounts={visibleAccounts}
              thresholdAges={thresholdAges}
              milestones={milestones}
            />
          ) : (
            <PayoutChart
              data={payoutProjection}
              payoutStartAge={assumptions.payoutStartAge}
              selectedPlan={assumptions.cpfLifePlan}
            />
          )}
        </div>
      </div>
    </div>
  )
}

interface ChartHeaderProps {
  chartView: ChartView
  onChartViewChange: (view: ChartView) => void
  visibleAccounts: VisibleAccounts
  onToggleAccount: (account: AccountKey) => void
  selectedPlan: 'standard' | 'basic' | 'escalating'
  isFetching: boolean
  hasError: boolean
}

function ChartHeader({
  chartView,
  onChartViewChange,
  visibleAccounts,
  onToggleAccount,
  selectedPlan,
  isFetching,
  hasError,
}: ChartHeaderProps) {
  return (
    <div className="mb-4 flex items-center justify-end gap-3">
      {isFetching && <span className="text-[10px] text-slate-500 animate-pulse">Updating...</span>}
      {!isFetching && hasError && <span className="text-[10px] text-amber-400">Using estimates</span>}

      {chartView === 'balance' ? (
        <BalanceLegend visibleAccounts={visibleAccounts} onToggleAccount={onToggleAccount} />
      ) : (
        <PayoutLegend selectedPlan={selectedPlan} />
      )}

      <div className="h-4 w-px bg-white/[0.08]" />
      <ChartViewToggle value={chartView} onChange={onChartViewChange} />
    </div>
  )
}
