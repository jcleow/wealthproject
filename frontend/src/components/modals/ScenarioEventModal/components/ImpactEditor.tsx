"use client"

import * as LucideIcons from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { ScenarioImpact, ImpactVerb, ScenarioCadence, ItemFrequency, GrowthStrategy } from '@/types/scenario'
import { verbToImpact, impactToVerb } from '@/types/scenario'
import { MonthPicker } from '@/components/ui/MonthPicker'
import { LockedField } from './LockedField'
import { useState, useRef, useEffect } from 'react'
import {
  assetCategoryOptions,
  liabilityCategoryOptions,
  incomeCategoryOptions,
  expenseCategoryOptions,
  investmentCategoryOptions,
} from '@/components/modals/FinancialFormModal/config'

const TrashIcon = LucideIcons.Trash2 as LucideIcon | undefined
const ChevronDownIcon = LucideIcons.ChevronDown as LucideIcon | undefined
const SearchIcon = LucideIcons.Search as LucideIcon | undefined
const CheckIcon = LucideIcons.Check as LucideIcon | undefined
const ArrowRightIcon = LucideIcons.ArrowRight as LucideIcon | undefined
const TrendingUpIcon = LucideIcons.TrendingUp as LucideIcon | undefined
const TrendingDownIcon = LucideIcons.TrendingDown as LucideIcon | undefined
const TargetIcon = LucideIcons.Target as LucideIcon | undefined
const PlusCircleIcon = LucideIcons.PlusCircle as LucideIcon | undefined
const XCircleIcon = LucideIcons.XCircle as LucideIcon | undefined
const SettingsIcon = LucideIcons.Settings as LucideIcon | undefined

// Get category options based on target type
function getCategoryOptionsForTarget(targetType: string) {
  switch (targetType) {
    case 'asset': return assetCategoryOptions
    case 'liability': return liabilityCategoryOptions
    case 'income': return incomeCategoryOptions
    case 'expense': return expenseCategoryOptions
    case 'investment': return investmentCategoryOptions
    default: return []
  }
}

// Growth strategy options
const GROWTH_STRATEGY_OPTIONS = [
  { value: 'none', label: 'No growth' },
  { value: 'annual_step', label: 'Annual step increase' },
  { value: 'compound', label: 'Compound growth' },
]

// Target type options grouped by category
const TARGET_TYPE_GROUPS = [
  {
    label: 'Cash Flow',
    options: [
      { value: 'income', label: 'Income' },
      { value: 'expense', label: 'Expense' },
    ]
  },
  {
    label: 'Assets',
    options: [
      { value: 'cash', label: 'Cash Account' },
      { value: 'investment', label: 'Investment' },
      { value: 'asset', label: 'Non-Cash Asset' },
    ]
  },
  {
    label: 'Liabilities',
    options: [
      { value: 'liability', label: 'Debt/Liability' },
    ]
  },
]

// Get label for a target type value
function getTargetTypeDisplayLabel(value: string): string {
  for (const group of TARGET_TYPE_GROUPS) {
    const option = group.options.find(o => o.value === value)
    if (option) return option.label
  }
  return value
}

export type FinancialItem = { id: string; name: string; amount: number; frequency?: string }

export interface ImpactEditorProps {
  impact: ScenarioImpact
  index: number
  canRemove: boolean
  loading: boolean
  onUpdate: (index: number, patch: Partial<ScenarioImpact>) => void
  onRemove: (index: number) => void
  // Item selector state
  selectedItemId?: string
  onSelectItem: (itemId: string | undefined) => void
  dropdownOpen: boolean
  onDropdownToggle: (open: boolean) => void
  searchQuery: string
  onSearchChange: (query: string) => void
  dropdownRef: (el: HTMLDivElement | null) => void
  newItemName?: string
  onNewItemNameChange: (name: string) => void
  // Data
  items: FinancialItem[]
  isLoadingItems: boolean
}

// Helper: Format amount display based on frequency
function formatAmount(amount: number, frequency?: string) {
  const formatted = new Intl.NumberFormat('en-US').format(amount)
  if (!frequency) return `$${formatted}`
  const freqLabel = frequency === 'monthly' ? '/mo' : frequency === 'annual' ? '/yr' : frequency === 'weekly' ? '/wk' : ''
  return `$${formatted}${freqLabel}`
}

// Helper: Get human-readable label for target type
function getTargetTypeLabel(targetType: string): string {
  switch (targetType) {
    case 'income': return 'income source'
    case 'expense': return 'expense'
    case 'asset': return 'non-cash asset'
    case 'investment': return 'investment'
    case 'liability': return 'debt/liability'
    case 'cash': return 'cash account'
    default: return targetType
  }
}

// Get icon for verb
function getVerbIcon(verb: ImpactVerb) {
  switch (verb) {
    case 'increases_by': return TrendingUpIcon
    case 'decreases_by': return TrendingDownIcon
    case 'becomes': return TargetIcon
    case 'starts_at': return PlusCircleIcon
    case 'ends': return XCircleIcon
    default: return ArrowRightIcon
  }
}

// Get color for verb
function getVerbColor(verb: ImpactVerb) {
  switch (verb) {
    case 'increases_by': return 'text-emerald-400'
    case 'decreases_by': return 'text-rose-400'
    case 'becomes': return 'text-blue-400'
    case 'starts_at': return 'text-violet-400'
    case 'ends': return 'text-orange-400'
    default: return 'text-slate-400'
  }
}

export function ImpactEditor({
  impact,
  index,
  canRemove,
  loading,
  onUpdate,
  onRemove,
  selectedItemId,
  onSelectItem,
  dropdownOpen,
  onDropdownToggle,
  searchQuery,
  onSearchChange,
  dropdownRef,
  newItemName,
  onNewItemNameChange,
  items,
  isLoadingItems,
}: ImpactEditorProps) {
  const currentVerb = impactToVerb(impact.impactKind, impact.amount)
  const VerbIcon = getVerbIcon(currentVerb)
  const verbColor = getVerbColor(currentVerb)

  // State for custom dropdowns
  const [targetTypeOpen, setTargetTypeOpen] = useState(false)
  const [verbOpen, setVerbOpen] = useState(false)
  const [cadenceOpen, setCadenceOpen] = useState(false)
  const [frequencyOpen, setFrequencyOpen] = useState(false)
  const targetTypeRef = useRef<HTMLDivElement>(null)
  const verbRef = useRef<HTMLDivElement>(null)
  const cadenceRef = useRef<HTMLDivElement>(null)
  const frequencyRef = useRef<HTMLDivElement>(null)

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (targetTypeRef.current && !targetTypeRef.current.contains(event.target as Node)) {
        setTargetTypeOpen(false)
      }
      if (verbRef.current && !verbRef.current.contains(event.target as Node)) {
        setVerbOpen(false)
      }
      if (cadenceRef.current && !cadenceRef.current.contains(event.target as Node)) {
        setCadenceOpen(false)
      }
      if (frequencyRef.current && !frequencyRef.current.contains(event.target as Node)) {
        setFrequencyOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleVerbChange = (verb: ImpactVerb) => {
    const { impactKind, amount } = verbToImpact(verb, Math.abs(impact.amount) || 0)
    onUpdate(index, { impactKind, amount })
  }

  // Determine whether to show cadence/frequency selector based on item type and verb
  // See PRD for full mapping table
  const isCashFlowItem = impact.targetType === 'income' || impact.targetType === 'expense'
  const isBalanceSheetItem = impact.targetType === 'asset' || impact.targetType === 'liability' ||
                             impact.targetType === 'cash' || impact.targetType === 'investment'
  const isDeltaVerb = currentVerb === 'increases_by' || currentVerb === 'decreases_by'
  const isStartImpact = currentVerb === 'starts_at'

  // Show frequency selector for start impacts on cash flow items (can be one_time, monthly, annual)
  const showFrequencySelector = isCashFlowItem && isStartImpact

  // Show cadence selector for:
  // - Income/Expense: delta/override verbs (they're recurring flows) - NOT for start impacts
  // - Asset/Liability/Cash/Investment: only delta verbs (recurring contributions/payments)
  const showCadenceSelector = (isCashFlowItem && currentVerb !== 'ends' && !isStartImpact) ||
                              (isBalanceSheetItem && isDeltaVerb)

  const handleTargetTypeChange = (value: string) => {
    onUpdate(index, { targetType: value as ScenarioImpact['targetType'] })
    setTargetTypeOpen(false)
  }

  const selectedItem = items.find(it => it.id === selectedItemId)
  const filteredItems = searchQuery
    ? items.filter(it => it.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : items

  const inputStyles = `
    px-3 py-2
    rounded-lg
    border border-white/[0.08] hover:border-white/[0.15] focus:border-blue-500/40
    bg-white/[0.03] hover:bg-white/[0.05] focus:bg-white/[0.05]
    text-sm text-white placeholder:text-slate-600
    outline-none
    disabled:opacity-50 disabled:cursor-not-allowed
    transition-all duration-200
  `

  return (
    <div className="
      group relative
      rounded-2xl
      border border-white/[0.06] hover:border-white/[0.1]
      bg-gradient-to-br from-white/[0.02] to-transparent
      p-5
      transition-all duration-300
    ">
      {/* Index badge + delete */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="
            flex items-center justify-center
            h-5 w-5
            rounded-full
            bg-white/[0.05]
            text-[10px] font-semibold text-slate-500
          ">
            {index + 1}
          </span>
          <span className="text-xs text-slate-500 uppercase tracking-wide">Impact</span>
        </div>
        {canRemove && (
          <button
            type="button"
            onClick={() => onRemove(index)}
            className={`
              flex items-center gap-1.5
              px-2 py-1
              rounded-lg
              text-slate-600 hover:text-rose-400
              hover:bg-rose-500/10
              disabled:opacity-50
              transition-all duration-200
            `}
            disabled={loading}
          >
            {TrashIcon && <TrashIcon className="h-3.5 w-3.5" />}
            <span className="text-xs">Remove</span>
          </button>
        )}
      </div>

      {/* Sentence builder - visual flow */}
      <div className="space-y-3">
        {/* Row 1: Type + Verb + Amount */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Target type - custom dropdown that always drops down */}
          <div className="relative" ref={targetTypeRef}>
            <button
              type="button"
              onClick={() => !loading && setTargetTypeOpen(!targetTypeOpen)}
              disabled={loading}
              className={`
                flex items-center justify-between gap-2
                pl-3 pr-8 py-2
                min-w-[140px]
                rounded-lg
                border border-white/[0.08] hover:border-white/[0.15]
                bg-white/[0.03] hover:bg-white/[0.05]
                text-sm text-white text-left
                disabled:opacity-50 disabled:cursor-not-allowed
                transition-all duration-200
                ${targetTypeOpen ? 'border-blue-500/40' : ''}
              `}
            >
              <span>{getTargetTypeDisplayLabel(impact.targetType)}</span>
              {ChevronDownIcon && (
                <ChevronDownIcon className={`absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500 transition-transform duration-200 ${targetTypeOpen ? 'rotate-180' : ''}`} />
              )}
            </button>

            {/* Custom dropdown menu - always drops DOWN */}
            {targetTypeOpen && (
              <div className="
                absolute left-0 top-full z-[100] mt-1
                min-w-[180px]
                rounded-xl
                border border-white/[0.12]
                bg-[#0c0c0c]
                shadow-2xl shadow-black/60
                overflow-hidden
                animate-in fade-in slide-in-from-top-2 duration-150
              ">
                {TARGET_TYPE_GROUPS.map((group) => (
                  <div key={group.label}>
                    {/* Group header */}
                    <div className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500 bg-white/[0.02]">
                      {group.label}
                    </div>
                    {/* Group options */}
                    {group.options.map((option) => {
                      const isSelected = option.value === impact.targetType
                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => handleTargetTypeChange(option.value)}
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
                ))}
              </div>
            )}
          </div>

          {/* Visual connector */}
          {ArrowRightIcon && (
            <ArrowRightIcon className="h-3.5 w-3.5 text-slate-600 shrink-0" />
          )}

          {/* Verb dropdown with icon - custom dropdown */}
          <div className="relative" ref={verbRef}>
            <button
              type="button"
              onClick={() => !loading && setVerbOpen(!verbOpen)}
              disabled={loading}
              className={`
                flex items-center justify-between gap-2
                pl-8 pr-8 py-2
                min-w-[140px]
                rounded-lg
                border border-white/[0.08] hover:border-white/[0.15]
                bg-white/[0.03] hover:bg-white/[0.05]
                text-sm text-white text-left
                disabled:opacity-50 disabled:cursor-not-allowed
                transition-all duration-200
                ${verbOpen ? 'border-blue-500/40' : ''}
              `}
            >
              <div className={`absolute left-2.5 top-1/2 -translate-y-1/2 ${verbColor}`}>
                {VerbIcon && <VerbIcon className="h-3.5 w-3.5" />}
              </div>
              <span>{currentVerb === 'increases_by' ? 'increases by' : currentVerb === 'decreases_by' ? 'decreases by' : currentVerb === 'becomes' ? 'becomes' : currentVerb === 'starts_at' ? 'starts at' : 'ends'}</span>
              {ChevronDownIcon && (
                <ChevronDownIcon className={`absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500 transition-transform duration-200 ${verbOpen ? 'rotate-180' : ''}`} />
              )}
            </button>

            {/* Verb dropdown menu */}
            {verbOpen && (
              <div className="
                absolute left-0 top-full z-[100] mt-1
                min-w-[160px]
                rounded-xl
                border border-white/[0.12]
                bg-[#0c0c0c]
                shadow-2xl shadow-black/60
                overflow-hidden
                animate-in fade-in slide-in-from-top-2 duration-150
              ">
                {[
                  { value: 'increases_by', label: 'increases by' },
                  { value: 'decreases_by', label: 'decreases by' },
                  { value: 'becomes', label: 'becomes' },
                  { value: 'starts_at', label: 'starts at' },
                  { value: 'ends', label: 'ends' },
                ].map((option) => {
                  const isSelected = option.value === currentVerb
                  const OptionIcon = getVerbIcon(option.value as ImpactVerb)
                  const optionColor = getVerbColor(option.value as ImpactVerb)
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => {
                        handleVerbChange(option.value as ImpactVerb)
                        setVerbOpen(false)
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
                      <span className={`w-4 shrink-0 ${optionColor}`}>
                        {OptionIcon && <OptionIcon className="h-3.5 w-3.5" />}
                      </span>
                      <span>{option.label}</span>
                      {isSelected && CheckIcon && (
                        <CheckIcon className="h-3.5 w-3.5 text-blue-400 ml-auto" />
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Amount - hidden when verb is 'ends' */}
          {currentVerb !== 'ends' && (
            <div className="flex items-center gap-1">
              <span className="text-slate-500 text-sm font-medium">$</span>
              <input
                type="text"
                inputMode="numeric"
                value={Number.isFinite(impact.amount) ? new Intl.NumberFormat('en-US').format(Math.abs(impact.amount)) : ''}
                onChange={(e) => {
                  const numeric = Number(e.target.value.replace(/[^0-9]/g, ''))
                  const { impactKind, amount } = verbToImpact(currentVerb, Number.isNaN(numeric) ? 0 : numeric)
                  onUpdate(index, { impactKind, amount })
                }}
                className={`${inputStyles} w-28 font-mono`}
                placeholder="5,000"
                disabled={loading}
              />
            </div>
          )}

          {/* Cadence - custom dropdown matching target type style */}
          {showCadenceSelector && (
            <div className="relative" ref={cadenceRef}>
              <button
                type="button"
                onClick={() => !loading && setCadenceOpen(!cadenceOpen)}
                disabled={loading}
                className={`
                  flex items-center justify-between gap-2
                  pl-3 pr-8 py-2
                  min-w-[110px]
                  rounded-lg
                  border border-white/[0.08] hover:border-white/[0.15]
                  bg-white/[0.03] hover:bg-white/[0.05]
                  text-sm text-white text-left
                  disabled:opacity-50 disabled:cursor-not-allowed
                  transition-all duration-200
                  ${cadenceOpen ? 'border-blue-500/40' : ''}
                `}
              >
                <span>{impact.cadence === 'monthly' ? 'monthly' : 'annually'}</span>
                {ChevronDownIcon && (
                  <ChevronDownIcon className={`absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500 transition-transform duration-200 ${cadenceOpen ? 'rotate-180' : ''}`} />
                )}
              </button>

              {/* Cadence dropdown menu */}
              {cadenceOpen && (
                <div className="
                  absolute left-0 top-full z-[100] mt-1
                  min-w-[120px]
                  rounded-xl
                  border border-white/[0.12]
                  bg-[#0c0c0c]
                  shadow-2xl shadow-black/60
                  overflow-hidden
                  animate-in fade-in slide-in-from-top-2 duration-150
                ">
                  {[
                    { value: 'monthly', label: 'monthly' },
                    { value: 'annual', label: 'annually' },
                  ].map((option) => {
                    const isSelected = option.value === impact.cadence
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => {
                          onUpdate(index, { cadence: option.value as ScenarioCadence })
                          setCadenceOpen(false)
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

          {/* Frequency - for start impacts on cash flow items (includes one_time option) */}
          {showFrequencySelector && (
            <div className="relative" ref={frequencyRef}>
              <button
                type="button"
                onClick={() => !loading && setFrequencyOpen(!frequencyOpen)}
                disabled={loading}
                className={`
                  flex items-center justify-between gap-2
                  pl-3 pr-8 py-2
                  min-w-[110px]
                  rounded-lg
                  border border-white/[0.08] hover:border-white/[0.15]
                  bg-white/[0.03] hover:bg-white/[0.05]
                  text-sm text-white text-left
                  disabled:opacity-50 disabled:cursor-not-allowed
                  transition-all duration-200
                  ${frequencyOpen ? 'border-blue-500/40' : ''}
                `}
              >
                <span>{impact.frequency === 'one_time' ? 'one-time' : impact.frequency === 'annual' ? 'annually' : 'monthly'}</span>
                {ChevronDownIcon && (
                  <ChevronDownIcon className={`absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500 transition-transform duration-200 ${frequencyOpen ? 'rotate-180' : ''}`} />
                )}
              </button>

              {/* Frequency dropdown menu */}
              {frequencyOpen && (
                <div className="
                  absolute left-0 top-full z-[100] mt-1
                  min-w-[120px]
                  rounded-xl
                  border border-white/[0.12]
                  bg-[#0c0c0c]
                  shadow-2xl shadow-black/60
                  overflow-hidden
                  animate-in fade-in slide-in-from-top-2 duration-150
                ">
                  {[
                    { value: 'one_time', label: 'one-time' },
                    { value: 'monthly', label: 'monthly' },
                    { value: 'annual', label: 'annually' },
                  ].map((option) => {
                    const isSelected = option.value === impact.frequency
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => {
                          onUpdate(index, { frequency: option.value as ItemFrequency })
                          setFrequencyOpen(false)
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
        </div>

        {/* Row 2: Date range */}
        <div className="flex flex-wrap items-center gap-2 pl-0.5">
          <span className="text-[11px] text-slate-500 uppercase tracking-wide">From</span>
          <MonthPicker
            value={impact.startMonth}
            onChange={(value) => onUpdate(index, { startMonth: value })}
            placeholder="Select month"
            disabled={loading}
          />
          <span className="text-[11px] text-slate-500 uppercase tracking-wide">to</span>
          <MonthPicker
            value={impact.endMonth}
            onChange={(value) => onUpdate(index, { endMonth: value || undefined })}
            placeholder="Ongoing"
            disabled={loading}
          />
          {!impact.endMonth && (
            <span className="text-[10px] text-slate-600 bg-white/[0.04] px-2 py-0.5 rounded-full border border-white/[0.04]">
              indefinite
            </span>
          )}
        </div>
      </div>

      {/* Item selector */}
      {currentVerb !== 'starts_at' && (
        <div className="mt-4 pt-4 border-t border-white/[0.04]">
          {items.length === 0 && !isLoadingItems ? (
            <div className={`
              px-4 py-3
              rounded-xl
              border border-amber-500/20
              bg-amber-500/5
              text-xs text-amber-400/80
            `}>
              No {getTargetTypeLabel(impact.targetType)} items found. Add some in the Financial Data section first.
            </div>
          ) : isLoadingItems ? (
            <div className={`
              px-4 py-3
              rounded-xl
              border border-white/[0.08]
              bg-white/[0.02]
              text-xs text-slate-500
              animate-pulse
            `}>
              Loading items...
            </div>
          ) : (
            <div className="relative" ref={dropdownRef}>
              <label className="text-xs text-slate-500 uppercase tracking-wide mb-2 block">
                Select {getTargetTypeLabel(impact.targetType)} <span className="text-rose-400">*</span>
              </label>
              {/* Dropdown trigger button */}
              <button
                type="button"
                onClick={() => onDropdownToggle(!dropdownOpen)}
                className={`
                  flex items-center justify-between
                  w-full
                  gap-2 px-4 py-3
                  rounded-xl
                  border border-white/[0.08] hover:border-white/[0.15] focus:border-blue-500/40
                  bg-white/[0.03] hover:bg-white/[0.05]
                  text-sm text-left
                  outline-none
                  disabled:opacity-50 disabled:cursor-not-allowed
                  transition-all duration-200
                `}
                disabled={loading}
              >
                {selectedItem ? (
                  <span className="flex items-center justify-between flex-1 min-w-0">
                    <span className="truncate text-white text-sm">{selectedItem.name}</span>
                    <span className="text-slate-400 text-xs ml-2 shrink-0 font-mono">
                      {formatAmount(selectedItem.amount, selectedItem.frequency)}
                    </span>
                  </span>
                ) : (
                  <span className="text-slate-500 text-sm">Choose an item...</span>
                )}
                {ChevronDownIcon && (
                  <ChevronDownIcon className={`h-4 w-4 text-slate-500 shrink-0 transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`} />
                )}
              </button>

              {/* Dropdown menu */}
              {dropdownOpen && (
                <div className={`
                  absolute z-[100]
                  w-full
                  mt-2
                  rounded-xl
                  border border-white/[0.12]
                  bg-[#0a0a0a]
                  shadow-2xl shadow-black/60
                  overflow-hidden
                  animate-in fade-in slide-in-from-top-2 duration-200
                `}>
                  {/* Search input */}
                  <div className="p-3 border-b border-white/[0.06]">
                    <div className="relative">
                      {SearchIcon && (
                        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                      )}
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => onSearchChange(e.target.value)}
                        placeholder={`Search ${getTargetTypeLabel(impact.targetType)}...`}
                        className={`
                          w-full
                          pl-10 pr-4 py-2.5
                          rounded-lg
                          border border-white/[0.08] focus:border-blue-500/40
                          bg-white/[0.03] focus:bg-white/[0.05]
                          text-sm text-white placeholder:text-slate-500
                          outline-none
                          transition-all duration-200
                        `}
                        autoFocus
                      />
                    </div>
                  </div>
                  {/* Options list */}
                  <div className="max-h-52 overflow-y-auto p-2 custom-scrollbar">
                    {filteredItems.length === 0 ? (
                      <div className="px-4 py-6 text-center text-xs text-slate-500">
                        No items match your search
                      </div>
                    ) : (
                      filteredItems.map(item => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => onSelectItem(item.id)}
                          className={`
                            w-full flex items-center gap-3
                            rounded-lg px-3 py-2.5
                            text-left
                            transition-all duration-150
                            ${selectedItemId === item.id
                              ? 'bg-blue-500/15 text-white border border-blue-500/20'
                              : 'text-slate-300 hover:bg-white/[0.05] border border-transparent'
                            }
                          `}
                        >
                          <span className="w-5 shrink-0 flex items-center justify-center">
                            {selectedItemId === item.id && CheckIcon && (
                              <CheckIcon className="h-3.5 w-3.5 text-blue-400" />
                            )}
                          </span>
                          <span className="flex-1 truncate text-sm">{item.name}</span>
                          <span className="text-slate-400 text-xs font-mono shrink-0">
                            {formatAmount(item.amount, item.frequency)}
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* New item name input - for 'starts_at' verb */}
      {currentVerb === 'starts_at' && (
        <div className="mt-4 pt-4 border-t border-white/[0.04]">
          {/* Use LockedField for existing items (has selectedItemId), regular input for new */}
          {selectedItemId ? (
            <LockedField
              value={newItemName || ''}
              onChange={onNewItemNameChange}
              label="name"
              placeholder={`e.g., ${impact.targetType === 'income' ? 'Side Hustle' : impact.targetType === 'expense' ? 'New Subscription' : impact.targetType === 'asset' ? 'Investment Property' : impact.targetType === 'investment' ? 'New Fund' : impact.targetType === 'cash' ? 'Emergency Fund' : 'Car Loan'}`}
              disabled={loading}
              isNew={false}
            />
          ) : (
            <>
              <label className="text-xs text-slate-500 uppercase tracking-wide mb-2 block">
                Name for new {getTargetTypeLabel(impact.targetType)} <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                value={newItemName || ''}
                onChange={(e) => onNewItemNameChange(e.target.value)}
                className={`
                  w-full
                  px-0 py-2
                  bg-transparent
                  border-0 border-b border-white/[0.08] hover:border-white/[0.15] focus:border-blue-500/50
                  text-sm text-white placeholder:text-slate-600
                  outline-none
                  caret-blue-400
                  disabled:opacity-50 disabled:cursor-not-allowed
                  transition-all duration-200
                `}
                placeholder={`e.g., ${impact.targetType === 'income' ? 'Side Hustle' : impact.targetType === 'expense' ? 'New Subscription' : impact.targetType === 'asset' ? 'Investment Property' : impact.targetType === 'investment' ? 'New Fund' : impact.targetType === 'cash' ? 'Emergency Fund' : 'Car Loan'}`}
                disabled={loading}
              />
            </>
          )}
        </div>
      )}

      {/* Advanced section for start impacts */}
      {currentVerb === 'starts_at' && (
        <AdvancedSection
          impact={impact}
          index={index}
          loading={loading}
          onUpdate={onUpdate}
        />
      )}

      {/* Notes */}
      <div className="mt-4">
        <input
          type="text"
          value={impact.notes ?? ''}
          onChange={(e) => onUpdate(index, { notes: e.target.value })}
          className={`
            w-full
            px-0 py-2
            bg-transparent
            border-0 border-b border-white/[0.06] hover:border-white/[0.1] focus:border-white/[0.15]
            text-sm text-slate-400 placeholder:text-slate-600
            outline-none
            disabled:opacity-50 disabled:cursor-not-allowed
            transition-all duration-200
          `}
          placeholder="Add a note (optional)"
          disabled={loading}
        />
      </div>
    </div>
  )
}

// Advanced section component for start impacts
function AdvancedSection({
  impact,
  index,
  loading,
  onUpdate,
}: {
  impact: ScenarioImpact
  index: number
  loading: boolean
  onUpdate: (index: number, patch: Partial<ScenarioImpact>) => void
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [categoryOpen, setCategoryOpen] = useState(false)
  const [strategyOpen, setStrategyOpen] = useState(false)
  const categoryRef = useRef<HTMLDivElement>(null)
  const strategyRef = useRef<HTMLDivElement>(null)

  const categoryOptions = getCategoryOptionsForTarget(impact.targetType)
  const selectedCategory = categoryOptions.find(c => c.value === impact.category)
  const selectedStrategy = GROWTH_STRATEGY_OPTIONS.find(s => s.value === impact.growthStrategy)

  // Show growth options for income/expense (not one-time) and assets/investments
  const showGrowthOptions = (
    (impact.targetType === 'income' || impact.targetType === 'expense') && impact.frequency !== 'one_time'
  ) || impact.targetType === 'asset' || impact.targetType === 'investment'

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
              {/* Growth rate */}
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

              {/* Growth strategy - only for income/expense */}
              {(impact.targetType === 'income' || impact.targetType === 'expense') && (
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
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export { getTargetTypeLabel, formatAmount }
