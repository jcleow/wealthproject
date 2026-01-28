'use client'

import { useMemo, useState } from 'react'
import type { CPFProfile, CPFAssumptions } from '@/types/cpf'
import { DEFAULT_CPF_ASSUMPTIONS } from '@/types/cpf'
import { CPFAssumptionsPanel } from './CPFAssumptionsPanel'
import { useCpfBalanceProjectionQuery, useCpfConfigQuery } from '@/hooks/queries/useCpfQuery'
import { useTheme } from '@/lib/theme'
import {
  type ChartView,
  type AccountKey,
  type VisibleAccounts,
  type Milestone,
  type RetirementSumBase,
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
  /** Currently selected age (controlled by parent slider) */
  selectedAge?: number
  /** Callback when age is changed via chart interaction */
  onAgeChange?: (age: number) => void
}

export function CPFProjectionChart({
  profile,
  className,
  selectedAge: externalSelectedAge,
  onAgeChange,
}: CPFProjectionChartProps) {
  const { theme } = useTheme()
  const [assumptions, setAssumptions] = useState<CPFAssumptions>(DEFAULT_CPF_ASSUMPTIONS)
  const [chartView, setChartView] = useState<ChartView>('balance')

  // Use external selectedAge if provided, otherwise fall back to profile.age
  const selectedAge = externalSelectedAge ?? profile.age
  const setSelectedAge = onAgeChange ?? (() => {})
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

  // Fetch CPF config for retirement sum base values (avoids hardcoding)
  const { data: cpfConfig } = useCpfConfigQuery()

  // Derive retirement sum base from API config (for threshold calculations)
  const retirementSumBase = useMemo<RetirementSumBase | undefined>(() => {
    if (!cpfConfig?.config?.retirementSums) return undefined
    return {
      brs: cpfConfig.config.retirementSums.brs,
      frs: cpfConfig.config.retirementSums.frs,
      ers: cpfConfig.config.retirementSums.ers,
      bhs: cpfConfig.config.bhs,
      policyYear: cpfConfig.year,
    }
  }, [cpfConfig])

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
        <div
          className="rounded-xl p-5"
          style={{
            background: theme.cardBg,
            border: `1px solid ${theme.cardBorder}`,
          }}
        >
          <div className="flex flex-col items-center justify-center h-80 gap-2">
            {isLoading ? (
              <span className="animate-pulse" style={{ color: theme.textMuted }}>
                Loading projection...
              </span>
            ) : (
              <>
                <span style={{ color: theme.textMuted }}>No CPF account found</span>
                <span className="text-xs" style={{ color: theme.textMuted }}>
                  Create a CPF account to see projections
                </span>
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
          displayAge={selectedAge}
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

      <div
        className="rounded-xl p-5"
        style={{
          background: theme.cardBg,
          border: `1px solid ${theme.cardBorder}`,
        }}
      >
        <ChartHeader
          chartView={chartView}
          onChartViewChange={setChartView}
          visibleAccounts={visibleAccounts}
          onToggleAccount={toggleAccount}
          selectedPlan={assumptions.cpfLifePlan}
          isFetching={isFetching}
          hasError={!!error}
          theme={theme}
        />

        <div className="h-80">
          {chartView === 'balance' && chartData ? (
            <BalanceChart
              data={chartData}
              visibleAccounts={visibleAccounts}
              thresholdAges={thresholdAges}
              milestones={milestones}
              selectedAge={selectedAge}
              onAgeSelect={setSelectedAge}
              frsGrowthRate={assumptions.frsGrowthRate}
              retirementSumBase={retirementSumBase}
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
  theme: ReturnType<typeof useTheme>['theme']
}

function ChartHeader({
  chartView,
  onChartViewChange,
  visibleAccounts,
  onToggleAccount,
  selectedPlan,
  isFetching,
  hasError,
  theme,
}: ChartHeaderProps) {
  return (
    <div className="mb-4 flex items-center justify-end gap-3">
      {isFetching && (
        <span className="text-[10px] animate-pulse" style={{ color: theme.textMuted }}>
          Updating...
        </span>
      )}
      {!isFetching && hasError && (
        <span className="text-[10px]" style={{ color: theme.warning }}>
          Using estimates
        </span>
      )}

      {chartView === 'balance' ? (
        <BalanceLegend visibleAccounts={visibleAccounts} onToggleAccount={onToggleAccount} />
      ) : (
        <PayoutLegend selectedPlan={selectedPlan} />
      )}

      <div className="h-4 w-px" style={{ background: theme.cardBorder }} />
      <ChartViewToggle value={chartView} onChange={onChartViewChange} />
    </div>
  )
}
