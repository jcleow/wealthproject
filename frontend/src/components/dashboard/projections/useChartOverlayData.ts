import { useMemo } from 'react'
import type { ProjectionPoint } from './types'
import type { MetricId } from './chartOverlays'

/**
 * Enhances projection data with fake values for overlay metrics.
 * This is a temporary solution - in production, these would come from the timeline API.
 */
export function useChartOverlayData(
  baseProjection: ProjectionPoint[],
  selectedMetrics: MetricId[]
): ProjectionPoint[] {
  return useMemo(() => {
    // If only using base metrics, no enhancement needed
    const needsEnhancement = selectedMetrics.some(
      (m) => !['netWorth', 'totalAssets', 'totalLiabilities'].includes(m)
    )

    if (!needsEnhancement || baseProjection.length === 0) {
      return baseProjection
    }

    return baseProjection.map((point, index) => {
      const yearFactor = index / Math.max(1, baseProjection.length - 1)
      const enhanced = { ...point }

      // Cash Balance: ~10-15% of assets with growth
      if (selectedMetrics.includes('cashBalance') && enhanced.cashBalance === undefined) {
        enhanced.cashBalance = Math.round(
          point.totalAssets * (0.1 + 0.05 * Math.sin(index * 0.3)) * (1 + yearFactor * 0.5)
        )
      }

      // Annual Income: base 80k growing ~80% over timeline
      if (selectedMetrics.includes('annualIncome') && enhanced.annualIncome === undefined) {
        const baseIncome = 80000
        enhanced.annualIncome = Math.round(baseIncome * (1 + yearFactor * 0.8))
      }

      // Annual Expenses: base 55k growing ~50% over timeline
      if (selectedMetrics.includes('annualExpenses') && enhanced.annualExpenses === undefined) {
        const baseExpenses = 55000
        enhanced.annualExpenses = Math.round(baseExpenses * (1 + yearFactor * 0.5))
      }

      // Investments: ~50-70% of assets
      if (selectedMetrics.includes('investments') && enhanced.investments === undefined) {
        enhanced.investments = Math.round(point.totalAssets * (0.5 + 0.2 * yearFactor))
      }

      // CPF: base 50k + 20k annual contribution with 3% growth
      if (selectedMetrics.includes('cpf') && enhanced.cpf === undefined) {
        const baseCPF = 50000
        const annualContribution = 20000
        const yearsElapsed = Math.floor(index / 12) // Assuming monthly data
        enhanced.cpf = Math.round(baseCPF + yearsElapsed * annualContribution * 1.03)
      }

      return enhanced
    })
  }, [baseProjection, selectedMetrics])
}
