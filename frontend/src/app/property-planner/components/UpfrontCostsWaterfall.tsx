'use client'

import { cn } from '@/lib/utils'
import type { WaterfallItem } from '../types'

interface UpfrontCostsWaterfallProps {
  items: WaterfallItem[]
}

/**
 * UpfrontCostsWaterfall - A vertical waterfall chart for displaying upfront costs.
 * Shows how different cost components stack up to the total.
 */
export function UpfrontCostsWaterfall({ items }: UpfrontCostsWaterfallProps) {
  // Calculate cumulative values for vertical waterfall positioning
  let cumulative = 0
  const waterfallData = items.map((item, index) => {
    const start = item.isTotal ? 0 : cumulative
    const end = item.isTotal ? item.amount : cumulative + item.amount
    if (!item.isTotal) cumulative += item.amount
    return {
      ...item,
      start,
      end,
      index,
    }
  })

  const maxValue = Math.max(...waterfallData.map(data => Math.max(data.start, data.end)))
  const chartHeight = 180

  return (
    <div className="space-y-3">
      {/* Vertical waterfall chart */}
      <div className="flex items-end gap-1 justify-between" style={{ height: chartHeight }}>
        {waterfallData.map((item) => {
          const bottomPercent = (item.start / maxValue) * 100
          const heightPercent = (Math.abs(item.end - item.start) / maxValue) * 100

          return (
            <div key={item.name} className="flex-1 flex flex-col items-center relative h-full">
              {/* Bar container */}
              <div className="relative w-full h-full">
                {/* The floating bar */}
                <div
                  className={cn(
                    "absolute left-1 right-1 rounded-t transition-all",
                    item.color,
                    item.isTotal && "rounded-b"
                  )}
                  style={{
                    bottom: `${bottomPercent}%`,
                    height: `${Math.max(heightPercent, 2)}%`,
                  }}
                />
                {/* Connector line from previous bar's top to this bar's bottom */}
                {!item.isTotal && item.index > 0 && (
                  <div
                    className="absolute left-0 right-1/2 border-t border-dashed border-white/20"
                    style={{ bottom: `${bottomPercent}%` }}
                  />
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* X-axis labels */}
      <div className="flex gap-1 justify-between">
        {waterfallData.map((item) => (
          <div key={item.name} className="flex-1 text-center">
            <p className={cn(
              "text-[10px] truncate px-0.5",
              item.isTotal ? "font-medium text-white" : "text-slate-500"
            )}>
              {item.name}
            </p>
            <p className={cn(
              "text-xs tabular-nums",
              item.isTotal ? "font-semibold text-white" : "text-slate-300"
            )}>
              ${item.amount.toLocaleString()}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
