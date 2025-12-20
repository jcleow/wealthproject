"use client"

import * as LucideIcons from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { getTargetTypeLabel, formatAmount } from './impactConfig'

const ChevronDownIcon = LucideIcons.ChevronDown as LucideIcon | undefined
const SearchIcon = LucideIcons.Search as LucideIcon | undefined
const CheckIcon = LucideIcons.Check as LucideIcon | undefined

export type FinancialItem = { id: string; name: string; amount: number; frequency?: string }

interface ItemSelectorProps {
  targetType: string
  items: FinancialItem[]
  isLoadingItems: boolean
  selectedItemId?: string
  onSelectItem: (itemId: string | undefined) => void
  dropdownOpen: boolean
  onDropdownToggle: (open: boolean) => void
  searchQuery: string
  onSearchChange: (query: string) => void
  dropdownRef: (el: HTMLDivElement | null) => void
  disabled?: boolean
}

export function ItemSelector({
  targetType,
  items,
  isLoadingItems,
  selectedItemId,
  onSelectItem,
  dropdownOpen,
  onDropdownToggle,
  searchQuery,
  onSearchChange,
  dropdownRef,
  disabled,
}: ItemSelectorProps) {
  const selectedItem = items.find(it => it.id === selectedItemId)
  const filteredItems = searchQuery
    ? items.filter(it => it.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : items

  if (items.length === 0 && !isLoadingItems) {
    return (
      <div className={`
        px-4 py-3
        rounded-xl
        border border-amber-500/20
        bg-amber-500/5
        text-xs text-amber-400/80
      `}>
        No {getTargetTypeLabel(targetType)} items found. Add some in the Financial Data section first.
      </div>
    )
  }

  if (isLoadingItems) {
    return (
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
    )
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <label className="text-xs text-slate-500 uppercase tracking-wide mb-2 block">
        Select {getTargetTypeLabel(targetType)} <span className="text-rose-400">*</span>
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
        disabled={disabled}
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
                placeholder={`Search ${getTargetTypeLabel(targetType)}...`}
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
  )
}
