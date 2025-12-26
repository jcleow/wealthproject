'use client'

import { useMemo } from 'react'
import { TrendingUp, ArrowUpRight } from 'lucide-react'
import type { AppreciationPeriod } from '../types'
import { AppreciationChart, calculateAppreciationCurve } from './AppreciationChart'
import { AppreciationEditor } from './AppreciationEditor'
import { formatCurrency } from '../hooks/useCalculations'

interface PropertyAppreciationPanelProps {
  propertyPrice: number
  purchaseDate: string
  saleDate: string
  appreciationPeriods: AppreciationPeriod[]
  onPeriodsChange: (periods: AppreciationPeriod[]) => void
}

/**
 * PropertyAppreciationPanel - A complete panel showing property value appreciation
 * with a chart visualization and period editor.
 */
export function PropertyAppreciationPanel({
  propertyPrice,
  purchaseDate,
  saleDate,
  appreciationPeriods,
  onPeriodsChange,
}: PropertyAppreciationPanelProps) {
  // Calculate appreciation data for summary
  const appreciationData = useMemo(() => {
    const dataPoints = calculateAppreciationCurve(
      propertyPrice,
      purchaseDate,
      saleDate,
      appreciationPeriods
    )

    const finalValue = dataPoints[dataPoints.length - 1]?.propertyValue || propertyPrice
    const totalGain = finalValue - propertyPrice
    const totalGainPercent = (totalGain / propertyPrice) * 100
    const holdingYears = dataPoints.length - 1

    return {
      initialValue: propertyPrice,
      finalValue,
      totalGain,
      totalGainPercent,
      holdingYears,
    }
  }, [propertyPrice, purchaseDate, saleDate, appreciationPeriods])

  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-xl overflow-hidden">
      {/* Summary Header */}
      <div className="p-5 border-b border-white/[0.06]">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/15 flex items-center justify-center">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-sm font-medium text-white">Property Value Projection</h3>
            <p className="text-xs text-slate-500">
              {appreciationData.holdingYears} year{appreciationData.holdingYears !== 1 ? 's' : ''} holding period
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-xs text-slate-500 mb-0.5">Purchase Price</p>
            <p className="text-sm font-medium text-white">
              {formatCurrency(appreciationData.initialValue)}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-0.5">Value at Sale</p>
            <p className="text-sm font-medium text-emerald-400">
              {formatCurrency(appreciationData.finalValue)}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-0.5">Total Gain</p>
            <div className="flex items-center gap-1.5">
              <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-sm font-medium text-emerald-400">
                {formatCurrency(appreciationData.totalGain)}
              </span>
              <span className="text-xs text-slate-500">
                ({appreciationData.totalGainPercent.toFixed(1)}%)
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Chart Section */}
      <div className="p-4 border-b border-white/[0.06]">
        <AppreciationChart
          initialPrice={propertyPrice}
          purchaseDate={purchaseDate}
          saleDate={saleDate}
          appreciationPeriods={appreciationPeriods}
        />
      </div>

      {/* Period Editor Section */}
      <div className="p-4">
        <AppreciationEditor
          periods={appreciationPeriods}
          onPeriodsChange={onPeriodsChange}
        />
      </div>
    </div>
  )
}
