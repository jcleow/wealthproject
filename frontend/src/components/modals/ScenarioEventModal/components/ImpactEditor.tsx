"use client"

import * as LucideIcons from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { ScenarioImpact, ImpactVerb } from '@/types/scenario'
import { verbToImpact, impactToVerb } from '@/types/scenario'
import { MonthPicker } from '@/components/ui/MonthPicker'

const TrashIcon = LucideIcons.Trash2 as LucideIcon | undefined
const ChevronDownIcon = LucideIcons.ChevronDown as LucideIcon | undefined
const SearchIcon = LucideIcons.Search as LucideIcon | undefined
const CheckIcon = LucideIcons.Check as LucideIcon | undefined

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

  const handleVerbChange = (verb: ImpactVerb) => {
    const { impactKind, amount } = verbToImpact(verb, Math.abs(impact.amount) || 0)
    onUpdate(index, { impactKind, amount })
  }

  const selectedItem = items.find(it => it.id === selectedItemId)
  const filteredItems = searchQuery
    ? items.filter(it => it.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : items

  return (
    <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-medium text-slate-300">Impact {index + 1}</p>
        {canRemove && (
          <button
            type="button"
            onClick={() => onRemove(index)}
            className="text-slate-500 transition-colors hover:text-rose-400 disabled:opacity-50"
            disabled={loading}
          >
            {TrashIcon ? <TrashIcon className="h-3.5 w-3.5" /> : '✕'}
          </button>
        )}
      </div>

      {/* Sentence-builder row */}
      <div className="flex flex-wrap items-center gap-2 text-sm">
        {/* Target type */}
        <select
          value={impact.targetType}
          onChange={(e) => onUpdate(index, { targetType: e.target.value as ScenarioImpact['targetType'] })}
          className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm text-white transition-all focus:border-blue-500/50 focus:outline-none disabled:opacity-50"
          disabled={loading}
        >
          <option value="income">Income</option>
          <option value="expense">Expense</option>
          <option value="asset">Non-Cash Asset</option>
          <option value="investment">Investment</option>
          <option value="liability">Debt/Liability</option>
          <option value="cash">Cash Account</option>
        </select>

        {/* Verb dropdown */}
        <select
          value={currentVerb}
          onChange={(e) => handleVerbChange(e.target.value as ImpactVerb)}
          className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm text-white transition-all focus:border-blue-500/50 focus:outline-none disabled:opacity-50"
          disabled={loading}
        >
          <option value="increases_by">increases by</option>
          <option value="decreases_by">decreases by</option>
          <option value="becomes">becomes</option>
          <option value="starts_at">starts at</option>
          <option value="ends">ends</option>
        </select>

        {/* Amount - hidden when verb is 'ends' */}
        {currentVerb !== 'ends' && (
          <div className="flex items-center gap-1">
            <span className="text-slate-500">$</span>
            <input
              type="text"
              inputMode="numeric"
              value={Number.isFinite(impact.amount) ? new Intl.NumberFormat('en-US').format(Math.abs(impact.amount)) : ''}
              onChange={(e) => {
                const numeric = Number(e.target.value.replace(/[^0-9]/g, ''))
                const { impactKind, amount } = verbToImpact(currentVerb, Number.isNaN(numeric) ? 0 : numeric)
                onUpdate(index, { impactKind, amount })
              }}
              className="w-28 rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm text-white placeholder:text-slate-500 transition-all focus:border-blue-500/50 focus:outline-none disabled:opacity-50"
              placeholder="5,000"
              disabled={loading}
            />
          </div>
        )}

        {/* Cadence - hidden when verb is 'ends' */}
        {currentVerb !== 'ends' && (
          <select
            value={impact.cadence}
            onChange={(e) => onUpdate(index, { cadence: e.target.value as ScenarioImpact['cadence'] })}
            className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm text-white transition-all focus:border-blue-500/50 focus:outline-none disabled:opacity-50"
            disabled={loading}
          >
            <option value="one_time">one-time</option>
            <option value="weekly">weekly</option>
            <option value="bi_weekly">bi-weekly</option>
            <option value="monthly">monthly</option>
            <option value="quarterly">quarterly</option>
            <option value="semi_annual">semi-annually</option>
            <option value="annual">annually</option>
          </select>
        )}
      </div>

      {/* Date range row */}
      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
        <span className="text-slate-500">from</span>
        <MonthPicker
          value={impact.startMonth}
          onChange={(value) => onUpdate(index, { startMonth: value })}
          placeholder="Select month"
          disabled={loading}
        />
        <span className="text-slate-500">to</span>
        <MonthPicker
          value={impact.endMonth}
          onChange={(value) => onUpdate(index, { endMonth: value || undefined })}
          placeholder="Ongoing"
          disabled={loading}
        />
        {!impact.endMonth && <span className="text-slate-600 text-xs">(ongoing)</span>}
      </div>

      {/* Item selector - searchable dropdown for selecting a single item */}
      {currentVerb !== 'starts_at' && (
        <>
          {items.length === 0 && !isLoadingItems ? (
            <div className="mt-3 rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-xs text-amber-400/80">
              No {getTargetTypeLabel(impact.targetType)} items found. Add some in the Financial Data section first.
            </div>
          ) : (
            <div className="mt-3 relative">
              <p className="text-xs text-slate-500 mb-2">
                Which {getTargetTypeLabel(impact.targetType)}?{' '}
                <span className="text-rose-400">*</span>
              </p>
              {isLoadingItems ? (
                <div className="text-xs text-slate-500 animate-pulse rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2">Loading items...</div>
              ) : (
                <div className="relative" ref={dropdownRef}>
                  {/* Dropdown trigger button */}
                  <button
                    type="button"
                    onClick={() => onDropdownToggle(!dropdownOpen)}
                    className="w-full flex items-center justify-between gap-2 rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2.5 text-sm text-left transition-all hover:border-white/[0.15] hover:bg-white/[0.05] focus:border-blue-500/50 focus:outline-none disabled:opacity-50"
                    disabled={loading}
                  >
                    {selectedItem ? (
                      <span className="flex items-center justify-between flex-1 min-w-0">
                        <span className="truncate text-slate-200">{selectedItem.name}</span>
                        <span className="text-slate-500 text-xs ml-2 shrink-0">
                          {formatAmount(selectedItem.amount, selectedItem.frequency)}
                        </span>
                      </span>
                    ) : (
                      <span className="text-slate-500">Select {getTargetTypeLabel(impact.targetType)}...</span>
                    )}
                    {ChevronDownIcon && (
                      <ChevronDownIcon className={`h-4 w-4 text-slate-500 shrink-0 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
                    )}
                  </button>

                  {/* Dropdown menu */}
                  {dropdownOpen && (
                    <div className="absolute z-50 mt-1 w-full rounded-lg border border-white/[0.1] bg-[#0a0a0a]/98 backdrop-blur-xl shadow-xl shadow-black/40">
                      {/* Search input */}
                      <div className="p-2 border-b border-white/[0.06]">
                        <div className="relative">
                          {SearchIcon && (
                            <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
                          )}
                          <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => onSearchChange(e.target.value)}
                            placeholder={`Search ${getTargetTypeLabel(impact.targetType)}...`}
                            className="w-full rounded-md border border-white/[0.08] bg-white/[0.03] pl-8 pr-3 py-1.5 text-xs text-white placeholder:text-slate-500 transition-all focus:border-blue-500/50 focus:outline-none"
                            autoFocus
                          />
                        </div>
                      </div>
                      {/* Options list */}
                      <div className="max-h-48 overflow-y-auto p-1">
                        {filteredItems.length === 0 ? (
                          <div className="px-3 py-2 text-xs text-slate-500">No items match your search</div>
                        ) : (
                          filteredItems.map(item => (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => onSelectItem(item.id)}
                              className={`w-full flex items-center gap-2 rounded-md px-3 py-2 text-xs text-left transition-all ${
                                selectedItemId === item.id
                                  ? 'bg-blue-500/15 text-blue-300 border border-blue-500/20'
                                  : 'text-slate-300 hover:bg-white/[0.05] border border-transparent'
                              }`}
                            >
                              <span className="w-4 shrink-0">
                                {selectedItemId === item.id && CheckIcon && (
                                  <CheckIcon className="h-3.5 w-3.5 text-blue-400" />
                                )}
                              </span>
                              <span className="flex-1 truncate">{item.name}</span>
                              <span className="text-slate-500 shrink-0">
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
        </>
      )}

      {/* New item name input - for 'starts_at' verb */}
      {currentVerb === 'starts_at' && (
        <div className="mt-3">
          <label className="text-xs text-slate-500">
            Name for new {getTargetTypeLabel(impact.targetType)}: <span className="text-rose-400">*</span>
            <input
              type="text"
              value={newItemName || ''}
              onChange={(e) => onNewItemNameChange(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2.5 text-sm text-white placeholder:text-slate-500 transition-all focus:border-blue-500/50 focus:outline-none disabled:opacity-50"
              placeholder={`e.g., ${impact.targetType === 'income' ? 'Side Hustle' : impact.targetType === 'expense' ? 'New Subscription' : impact.targetType === 'asset' ? 'Investment Property' : impact.targetType === 'investment' ? 'New Fund' : impact.targetType === 'cash' ? 'Emergency Fund' : 'Car Loan'}`}
              disabled={loading}
            />
          </label>
        </div>
      )}

      {/* Notes */}
      <div className="mt-3">
        <input
          type="text"
          value={impact.notes ?? ''}
          onChange={(e) => onUpdate(index, { notes: e.target.value })}
          className="w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-xs text-white placeholder:text-slate-500 transition-all focus:border-blue-500/50 focus:outline-none disabled:opacity-50"
          placeholder="Notes (optional)"
          disabled={loading}
        />
      </div>
    </div>
  )
}

export { getTargetTypeLabel, formatAmount }
