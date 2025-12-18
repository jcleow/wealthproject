"use client"

import type { GrowthConfig } from '@/types/financial'
import { GrowthConfigCategoryLabels } from '@/types/financial'

interface GrowthRatesSettingsProps {
  configs: GrowthConfig[]
  onRateChange: (category: string, value: string) => void
}

export function GrowthRatesSettings({ configs, onRateChange }: GrowthRatesSettingsProps) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-400">
        These rates are used as defaults when creating new financial items.
      </p>
      <div className="space-y-2">
        {configs.map(cfg => (
          <div
            key={cfg.category}
            className="flex items-center justify-between rounded-lg border border-white/[0.06] bg-[#111111] px-4 py-3"
          >
            <span className="text-sm text-slate-200">
              {GrowthConfigCategoryLabels[cfg.category] ?? cfg.category}
            </span>
            <div className="flex items-center gap-2">
              <input
                type="number"
                step="0.1"
                value={cfg.annualRatePct}
                onChange={e => onRateChange(cfg.category, e.target.value)}
                className="w-20 rounded-md border border-white/[0.08] bg-[#1a1a1a] px-2 py-1 text-right text-sm text-slate-200 focus:border-blue-500 focus:outline-none"
              />
              <span className="text-sm text-slate-400">%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
