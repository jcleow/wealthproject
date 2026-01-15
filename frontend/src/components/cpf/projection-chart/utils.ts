import type { CPFProjectionYear } from '@/types/cpf'
import type { CPFBalanceProjectionResponse } from '@/api/financial/cpf'
import type { PayoutProjectionYear, ChartDataPoint, ThresholdAges } from './types'

interface RetirementProjection {
  age55Balances: { oa: number; sa: number; ma: number; ra: number }
  age65Balances: { oa: number; sa: number; ma: number; ra: number }
  frsTarget: number
  brsTarget: number
  ersTarget: number
  bhsTarget: number
  cpfLifeEstimates: { standard: number; basic: number; escalating: number }
}

/**
 * Transforms API response (string decimals) to chart-compatible format (numbers)
 */
export function transformProjectionData(
  response: CPFBalanceProjectionResponse
): { projection: CPFProjectionYear[]; retirement: RetirementProjection } {
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

/**
 * Transforms projection for chart display with SA/RA lifecycle boundaries
 */
export function transformChartData(projection: CPFProjectionYear[]): ChartDataPoint[] {
  return projection.map((p) => ({
    ...p,
    sa: p.age <= 55 ? p.sa : null,
    ra: p.age >= 55 ? p.ra : null,
    retirementSavings: p.age <= 55 ? p.oa + p.sa : null,
  }))
}

/**
 * Calculate ages when retirement thresholds are reached
 */
export function calculateThresholdAges(
  projection: CPFProjectionYear[],
  retirement: RetirementProjection
): ThresholdAges {
  const pre55Data = projection.filter((p) => p.age <= 55)
  const brsAge = pre55Data.find((p) => p.oa + p.sa >= retirement.brsTarget)?.age ?? null
  const frsAge = pre55Data.find((p) => p.oa + p.sa >= retirement.frsTarget)?.age ?? null
  const ersAge = pre55Data.find((p) => p.oa + p.sa >= retirement.ersTarget)?.age ?? null
  const bhsAge = projection.find((p) => p.ma >= retirement.bhsTarget)?.age ?? null

  return { brs: brsAge, frs: frsAge, ers: ersAge, bhs: bhsAge }
}

/**
 * Generates CPF LIFE payout projection from payout start age to age 100
 */
export function generatePayoutProjection(
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

  const initialPremium = plan === 'basic' ? initialRA * basicPlanPremiumPercent : initialRA
  let remainingPremium = initialPremium
  let remainingRA = plan === 'basic' ? initialRA - initialPremium : 0

  for (let age = payoutStartAge; age <= endAge; age++) {
    const year = birthYear + age
    const annualPayout = currentPayout * 12

    if (plan === 'basic') {
      if (remainingRA > 0 && age < 90) {
        remainingRA = Math.max(0, remainingRA - annualPayout)
      } else {
        remainingPremium = Math.max(0, remainingPremium - annualPayout)
      }
    } else {
      remainingPremium = Math.max(0, remainingPremium - annualPayout)
    }

    cumulativePayouts += annualPayout

    const bequestValue = plan === 'basic' ? remainingRA + remainingPremium : remainingPremium

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

    if (plan === 'escalating') {
      currentPayout = currentPayout * (1 + escalatingGrowth)
    }
  }

  return projection
}

/**
 * Generate tick marks for age axis (every 5 years)
 */
export function generateAgeTicks(startAge: number, endAge: number): number[] {
  const ticks: number[] = []
  const firstTick = Math.ceil(startAge / 5) * 5
  for (let tick = firstTick; tick <= endAge; tick += 5) {
    if (tick >= startAge) {
      ticks.push(tick)
    }
  }
  return ticks
}
