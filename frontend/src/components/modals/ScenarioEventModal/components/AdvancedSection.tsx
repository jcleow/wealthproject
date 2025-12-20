"use client"

import { useState, useRef, useEffect } from 'react'
import * as LucideIcons from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { ScenarioImpact, GrowthStrategy } from '@/types/scenario'
import { ImpactKind, TargetType, Frequency } from '@/types/scenario'
import { getCategoryOptionsForTarget, GROWTH_STRATEGY_OPTIONS } from './impactConfig'

const ChevronDownIcon = LucideIcons.ChevronDown as LucideIcon | undefined
const CheckIcon = LucideIcons.Check as LucideIcon | undefined
const SettingsIcon = LucideIcons.Settings as LucideIcon | undefined

interface AdvancedSectionProps {
  impact: ScenarioImpact
  index: number
  loading: boolean
  onUpdate: (index: number, patch: Partial<ScenarioImpact>) => void
}

export function AdvancedSection({
  impact,
  index,
  loading,
  onUpdate,
}: AdvancedSectionProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [categoryOpen, setCategoryOpen] = useState(false)
  const [strategyOpen, setStrategyOpen] = useState(false)
  const categoryRef = useRef<HTMLDivElement>(null)
  const strategyRef = useRef<HTMLDivElement>(null)

  const categoryOptions = getCategoryOptionsForTarget(impact.targetType)
  const selectedCategory = categoryOptions.find(c => c.value === impact.category)
  const selectedStrategy = GROWTH_STRATEGY_OPTIONS.find(s => s.value === impact.growthStrategy)

  // Show growth options for:
  // - income/expense (unless explicitly one_time for start impacts)
  // - assets and investments always
  // For non-start impacts, we default to showing growth options since the target item likely has a recurring frequency
  const isStartImpact = impact.impactKind === ImpactKind.Start
  const isOneTimeStart = isStartImpact && impact.frequency === Frequency.OneTime
  const showGrowthOptions = (
    (impact.targetType === TargetType.Income || impact.targetType === TargetType.Expense) && !isOneTimeStart
  ) || impact.targetType === TargetType.Asset || impact.targetType === TargetType.Investment

  // Show liability options (Interest Rate, Min Payment) only for liability start impacts
  const showLiabilityOptions = isStartImpact && impact.targetType === TargetType.Liability

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (categoryRef.current && !categoryRef.current.contains(e.target as Node)) {
        setCategoryOpen(false)
      }
      if (strategyRef.current && !strategyRef.current.contains(e.target as Node)) {
        setStrategyOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="mt-4">
      {/* Toggle button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`
          flex items-center gap-2
          text-xs text-slate-500 hover:text-slate-400
          transition-colors duration-200
        `}
      >
        {SettingsIcon && <SettingsIcon className="h-3.5 w-3.5" />}
        <span>Advanced options</span>
        {ChevronDownIcon && (
          <ChevronDownIcon className={`h-3 w-3 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        )}
      </button>

      {/* Advanced options panel */}
      {isOpen && (
        <div className="mt-3 pt-3 border-t border-white/[0.04] space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
          {/* Category selector */}
          {categoryOptions.length > 0 && (
            <div className="relative" ref={categoryRef}>
              <label className="text-[10px] text-slate-500 uppercase tracking-wide mb-1.5 block">
                Category
              </label>
              <button
                type="button"
                onClick={() => !loading && setCategoryOpen(!categoryOpen)}
                disabled={loading}
                className={`
                  flex items-center justify-between gap-2
                  w-full px-3 py-2
                  rounded-lg
                  border border-white/[0.08] hover:border-white/[0.15]
                  bg-white/[0.03] hover:bg-white/[0.05]
                  text-sm text-white text-left
                  disabled:opacity-50 disabled:cursor-not-allowed
                  transition-all duration-200
                  ${categoryOpen ? 'border-blue-500/40' : ''}
                `}
              >
                <span className="truncate">{selectedCategory?.label || 'Select category...'}</span>
                {ChevronDownIcon && (
                  <ChevronDownIcon className={`h-3.5 w-3.5 text-slate-500 shrink-0 transition-transform duration-200 ${categoryOpen ? 'rotate-180' : ''}`} />
                )}
              </button>

              {categoryOpen && (
                <div className="
                  absolute left-0 top-full z-[100] mt-1
                  w-full max-h-48 overflow-y-auto
                  rounded-xl
                  border border-white/[0.12]
                  bg-[#0c0c0c]
                  shadow-2xl shadow-black/60
                  animate-in fade-in slide-in-from-top-2 duration-150
                ">
                  {categoryOptions.map((option) => {
                    const isSelected = option.value === impact.category
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => {
                          onUpdate(index, { category: option.value })
                          setCategoryOpen(false)
                        }}
                        className={`
                          w-full flex items-center gap-2
                          px-3 py-2
                          text-sm text-left
                          transition-all duration-150
                          ${isSelected
                            ? 'bg-blue-500/15 text-white'
                            : 'text-slate-300 hover:bg-white/[0.05]'
                          }
                        `}
                      >
                        <span className="w-4 shrink-0">
                          {isSelected && CheckIcon && (
                            <CheckIcon className="h-3.5 w-3.5 text-blue-400" />
                          )}
                        </span>
                        <span className="truncate">{option.label}</span>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* Growth options - only for applicable types */}
          {showGrowthOptions && (
            <div className="grid grid-cols-2 gap-3">
              {/* Growth strategy - only for income/expense (shown first/left) */}
              {(impact.targetType === TargetType.Income || impact.targetType === TargetType.Expense) && (
                <div className="relative" ref={strategyRef}>
                  <label className="text-[10px] text-slate-500 uppercase tracking-wide mb-1.5 block">
                    Growth Strategy
                  </label>
                  <button
                    type="button"
                    onClick={() => !loading && setStrategyOpen(!strategyOpen)}
                    disabled={loading}
                    className={`
                      flex items-center justify-between gap-2
                      w-full px-3 py-2
                      rounded-lg
                      border border-white/[0.08] hover:border-white/[0.15]
                      bg-white/[0.03] hover:bg-white/[0.05]
                      text-sm text-white text-left
                      disabled:opacity-50 disabled:cursor-not-allowed
                      transition-all duration-200
                      ${strategyOpen ? 'border-blue-500/40' : ''}
                    `}
                  >
                    <span className="truncate">{selectedStrategy?.label || 'Select...'}</span>
                    {ChevronDownIcon && (
                      <ChevronDownIcon className={`h-3.5 w-3.5 text-slate-500 shrink-0 transition-transform duration-200 ${strategyOpen ? 'rotate-180' : ''}`} />
                    )}
                  </button>

                  {strategyOpen && (
                    <div className="
                      absolute left-0 top-full z-[100] mt-1
                      w-full
                      rounded-xl
                      border border-white/[0.12]
                      bg-[#0c0c0c]
                      shadow-2xl shadow-black/60
                      animate-in fade-in slide-in-from-top-2 duration-150
                    ">
                      {GROWTH_STRATEGY_OPTIONS.map((option) => {
                        const isSelected = option.value === impact.growthStrategy
                        return (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => {
                              onUpdate(index, { growthStrategy: option.value as GrowthStrategy })
                              setStrategyOpen(false)
                            }}
                            className={`
                              w-full flex items-center gap-2
                              px-3 py-2
                              text-sm text-left
                              transition-all duration-150
                              ${isSelected
                                ? 'bg-blue-500/15 text-white'
                                : 'text-slate-300 hover:bg-white/[0.05]'
                              }
                            `}
                          >
                            <span className="w-4 shrink-0">
                              {isSelected && CheckIcon && (
                                <CheckIcon className="h-3.5 w-3.5 text-blue-400" />
                              )}
                            </span>
                            <span>{option.label}</span>
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Growth rate - shown second/right, only when growth strategy is not 'none' (for income/expense) or always for assets/investments */}
              {((impact.targetType === TargetType.Income || impact.targetType === TargetType.Expense)
                ? impact.growthStrategy && impact.growthStrategy !== 'none'
                : true) && (
                <div>
                  <label className="text-[10px] text-slate-500 uppercase tracking-wide mb-1.5 block">
                    Growth Rate (%)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={impact.growthRate ?? ''}
                    onChange={(e) => onUpdate(index, { growthRate: e.target.value ? parseFloat(e.target.value) : undefined })}
                    className={`
                      w-full px-3 py-2
                      rounded-lg
                      border border-white/[0.08] hover:border-white/[0.15] focus:border-blue-500/40
                      bg-white/[0.03] hover:bg-white/[0.05] focus:bg-white/[0.05]
                      text-sm text-white placeholder:text-slate-600
                      outline-none
                      disabled:opacity-50 disabled:cursor-not-allowed
                      transition-all duration-200
                    `}
                    placeholder="0.0"
                    disabled={loading}
                  />
                </div>
              )}
            </div>
          )}

          {/* Liability options - Interest Rate and Min Payment for start impacts */}
          {showLiabilityOptions && (
            <div className="grid grid-cols-2 gap-3">
              {/* Interest Rate APR */}
              <div>
                <label className="text-[10px] text-slate-500 uppercase tracking-wide mb-1.5 block">
                  Interest Rate (APR %)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={impact.interestRate ?? ''}
                  onChange={(e) => onUpdate(index, { interestRate: e.target.value ? parseFloat(e.target.value) : undefined })}
                  className={`
                    w-full px-3 py-2
                    rounded-lg
                    border border-white/[0.08] hover:border-white/[0.15] focus:border-blue-500/40
                    bg-white/[0.03] hover:bg-white/[0.05] focus:bg-white/[0.05]
                    text-sm text-white placeholder:text-slate-600
                    outline-none
                    disabled:opacity-50 disabled:cursor-not-allowed
                    transition-all duration-200
                  `}
                  placeholder="0.0"
                  disabled={loading}
                />
              </div>

              {/* Minimum Payment */}
              <div>
                <label className="text-[10px] text-slate-500 uppercase tracking-wide mb-1.5 block">
                  Minimum Payment
                </label>
                <input
                  type="number"
                  step="1"
                  min="0"
                  value={impact.minimumPayment ?? ''}
                  onChange={(e) => onUpdate(index, { minimumPayment: e.target.value ? parseFloat(e.target.value) : undefined })}
                  className={`
                    w-full px-3 py-2
                    rounded-lg
                    border border-white/[0.08] hover:border-white/[0.15] focus:border-blue-500/40
                    bg-white/[0.03] hover:bg-white/[0.05] focus:bg-white/[0.05]
                    text-sm text-white placeholder:text-slate-600
                    outline-none
                    disabled:opacity-50 disabled:cursor-not-allowed
                    transition-all duration-200
                  `}
                  placeholder="0"
                  disabled={loading}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
