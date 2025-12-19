"use client"

import * as LucideIcons from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { ScenarioImpact, ImpactVerb, ScenarioCadence } from '@/types/scenario'
import { verbToImpact, impactToVerb } from '@/types/scenario'
import { MonthPicker } from '@/components/ui/MonthPicker'
import { useState, useRef, useEffect } from 'react'

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

  // State for custom target type dropdown
  const [targetTypeOpen, setTargetTypeOpen] = useState(false)
  const targetTypeRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (targetTypeRef.current && !targetTypeRef.current.contains(event.target as Node)) {
        setTargetTypeOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleVerbChange = (verb: ImpactVerb) => {
    const { impactKind, amount } = verbToImpact(verb, Math.abs(impact.amount) || 0)
    onUpdate(index, { impactKind, amount })
  }

  // Determine whether to show cadence selector based on item type and verb
  // See PRD for full mapping table
  const isCashFlowItem = impact.targetType === 'income' || impact.targetType === 'expense'
  const isBalanceSheetItem = impact.targetType === 'asset' || impact.targetType === 'liability' ||
                             impact.targetType === 'cash' || impact.targetType === 'investment'
  const isDeltaVerb = currentVerb === 'increases_by' || currentVerb === 'decreases_by'

  // Show cadence selector for:
  // - Income/Expense: all verbs except 'ends' (they're recurring flows)
  // - Asset/Liability/Cash/Investment: only delta verbs (recurring contributions/payments)
  const showCadenceSelector = (isCashFlowItem && currentVerb !== 'ends') ||
                              (isBalanceSheetItem && isDeltaVerb)

  const handleTargetTypeChange = (value: string) => {
    onUpdate(index, { targetType: value as ScenarioImpact['targetType'] })
    setTargetTypeOpen(false)
  }

  const selectedItem = items.find(it => it.id === selectedItemId)
  const filteredItems = searchQuery
    ? items.filter(it => it.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : items

  // Styled select wrapper
  const SelectWrapper = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
    <div className={`relative ${className}`}>
      {children}
      {ChevronDownIcon && <ChevronDownIcon className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500 pointer-events-none" />}
    </div>
  )

  const selectStyles = `
    appearance-none cursor-pointer
    pl-3 pr-8 py-2
    rounded-lg
    border border-white/[0.08] hover:border-white/[0.15] focus:border-blue-500/40
    bg-white/[0.03] hover:bg-white/[0.05]
    text-sm text-white
    outline-none
    disabled:opacity-50 disabled:cursor-not-allowed
    transition-all duration-200
  `

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
            h-6 w-6
            rounded-full
            bg-white/[0.05]
            text-[10px] font-bold text-slate-500
          ">
            {index + 1}
          </span>
          <span className="text-xs text-slate-500 uppercase tracking-wider">Impact</span>
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

          {/* Verb dropdown with icon */}
          <div className="relative">
            <div className={`absolute left-2.5 top-1/2 -translate-y-1/2 ${verbColor}`}>
              {VerbIcon && <VerbIcon className="h-3.5 w-3.5" />}
            </div>
            <select
              value={currentVerb}
              onChange={(e) => handleVerbChange(e.target.value as ImpactVerb)}
              className={`${selectStyles} pl-8`}
              disabled={loading}
            >
              <option value="increases_by">increases by</option>
              <option value="decreases_by">decreases by</option>
              <option value="becomes">becomes</option>
              <option value="starts_at">starts at</option>
              <option value="ends">ends</option>
            </select>
            {ChevronDownIcon && <ChevronDownIcon className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500 pointer-events-none" />}
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

          {/* Cadence - shown for income/expense (all except 'ends'), and for balance sheet items (only delta verbs) */}
          {showCadenceSelector && (
            <SelectWrapper>
              <select
                value={impact.cadence}
                onChange={(e) => onUpdate(index, { cadence: e.target.value as ScenarioCadence })}
                className={selectStyles}
                disabled={loading}
              >
                <option value="monthly">monthly</option>
                <option value="annual">annually</option>
              </select>
            </SelectWrapper>
          )}
        </div>

        {/* Row 2: Date range */}
        <div className="flex flex-wrap items-center gap-2 pl-0.5">
          <span className="text-xs text-slate-500 uppercase tracking-wide">From</span>
          <MonthPicker
            value={impact.startMonth}
            onChange={(value) => onUpdate(index, { startMonth: value })}
            placeholder="Select month"
            disabled={loading}
          />
          <span className="text-xs text-slate-500 uppercase tracking-wide">to</span>
          <MonthPicker
            value={impact.endMonth}
            onChange={(value) => onUpdate(index, { endMonth: value || undefined })}
            placeholder="Ongoing"
            disabled={loading}
          />
          {!impact.endMonth && (
            <span className="text-[10px] text-slate-600 bg-white/[0.03] px-2 py-0.5 rounded-full">
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
              <label className="text-xs text-slate-500 mb-2 block">
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
                    <span className="truncate text-white">{selectedItem.name}</span>
                    <span className="text-slate-500 text-xs ml-2 shrink-0 font-mono">
                      {formatAmount(selectedItem.amount, selectedItem.frequency)}
                    </span>
                  </span>
                ) : (
                  <span className="text-slate-500">Choose an item...</span>
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
                            text-sm text-left
                            transition-all duration-150
                            ${selectedItemId === item.id
                              ? 'bg-blue-500/15 text-white border border-blue-500/20'
                              : 'text-slate-300 hover:bg-white/[0.05] border border-transparent'
                            }
                          `}
                        >
                          <span className="w-5 shrink-0 flex items-center justify-center">
                            {selectedItemId === item.id && CheckIcon && (
                              <CheckIcon className="h-4 w-4 text-blue-400" />
                            )}
                          </span>
                          <span className="flex-1 truncate">{item.name}</span>
                          <span className="text-slate-500 text-xs font-mono shrink-0">
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
          <label className="text-xs text-slate-500 mb-2 block">
            Name for new {getTargetTypeLabel(impact.targetType)} <span className="text-rose-400">*</span>
          </label>
          <input
            type="text"
            value={newItemName || ''}
            onChange={(e) => onNewItemNameChange(e.target.value)}
            className={`
              w-full
              px-4 py-3
              rounded-xl
              border border-white/[0.08] hover:border-white/[0.15] focus:border-blue-500/40
              bg-white/[0.03] hover:bg-white/[0.05] focus:bg-white/[0.05]
              text-sm text-white placeholder:text-slate-500
              outline-none
              disabled:opacity-50 disabled:cursor-not-allowed
              transition-all duration-200
            `}
            placeholder={`e.g., ${impact.targetType === 'income' ? 'Side Hustle' : impact.targetType === 'expense' ? 'New Subscription' : impact.targetType === 'asset' ? 'Investment Property' : impact.targetType === 'investment' ? 'New Fund' : impact.targetType === 'cash' ? 'Emergency Fund' : 'Car Loan'}`}
            disabled={loading}
          />
        </div>
      )}

      {/* Notes */}
      <div className="mt-3">
        <input
          type="text"
          value={impact.notes ?? ''}
          onChange={(e) => onUpdate(index, { notes: e.target.value })}
          className={`
            w-full
            px-4 py-2.5
            rounded-xl
            border border-white/[0.06] hover:border-white/[0.1] focus:border-white/[0.15]
            bg-white/[0.02] hover:bg-white/[0.03] focus:bg-white/[0.03]
            text-xs text-slate-400 placeholder:text-slate-600
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

export { getTargetTypeLabel, formatAmount }
