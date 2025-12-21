"use client"

import * as LucideIcons from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { ScenarioImpact, ImpactVerb, ScenarioCadence, ItemFrequency } from '@/types/scenario'
import { verbToImpact, impactToVerb } from '@/types/scenario'

// Extracted components
import { CustomDropdown } from './CustomDropdown'
import { ItemSelector, type FinancialItem } from './ItemSelector'
import { AdvancedSection } from './AdvancedSection'
import { DateRangeRow } from './DateRangeRow'
import { LockedField } from './LockedField'
import {
  TARGET_TYPE_GROUPS,
  VERB_OPTIONS,
  CADENCE_OPTIONS,
  FREQUENCY_OPTIONS,
  getTargetTypeLabel,
  getVerbColor,
  formatAmount,
} from './impactConfig'

const TrashIcon = LucideIcons.Trash2 as LucideIcon | undefined
const ArrowRightIcon = LucideIcons.ArrowRight as LucideIcon | undefined
const TrendingUpIcon = LucideIcons.TrendingUp as LucideIcon | undefined
const TrendingDownIcon = LucideIcons.TrendingDown as LucideIcon | undefined
const TargetIcon = LucideIcons.Target as LucideIcon | undefined
const PlusCircleIcon = LucideIcons.PlusCircle as LucideIcon | undefined
const XCircleIcon = LucideIcons.XCircle as LucideIcon | undefined

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

  const handleVerbChange = (verb: ImpactVerb) => {
    const { impactKind, amount } = verbToImpact(verb, Math.abs(impact.amount) || 0)
    onUpdate(index, { impactKind, amount })
  }

  // Determine whether to show cadence/frequency selector based on item type and verb
  const isCashFlowItem = impact.targetType === 'income' || impact.targetType === 'expense'
  const isBalanceSheetItem = impact.targetType === 'asset' || impact.targetType === 'liability' ||
                             impact.targetType === 'cash' || impact.targetType === 'investment'
  const isDeltaVerb = currentVerb === 'increases_by' || currentVerb === 'decreases_by'
  const isStartImpact = currentVerb === 'starts_at'

  // Show frequency selector for start impacts on cash flow items
  const showFrequencySelector = isCashFlowItem && isStartImpact

  // Show cadence selector for recurring modifications
  const showCadenceSelector = (isCashFlowItem && currentVerb !== 'ends' && !isStartImpact) ||
                              (isBalanceSheetItem && isDeltaVerb)

  // Build verb options with icons
  const verbOptionsWithIcons = VERB_OPTIONS.map(opt => ({
    ...opt,
    icon: (() => {
      const Icon = getVerbIcon(opt.value)
      return Icon ? <Icon className="h-3.5 w-3.5" /> : null
    })(),
    iconColor: getVerbColor(opt.value),
  }))

  return (
    <div className="
      group relative
      rounded-2xl
      border border-white/[0.06] hover:border-white/[0.1]
      bg-gradient-to-br from-white/[0.02] to-transparent
      p-5
      transition-all duration-300
    ">
      {/* Header: Index badge + delete */}
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

      {/* Sentence builder */}
      <div className="space-y-3">
        {/* Row 1: Type + Verb + Amount + Cadence/Frequency */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Target type dropdown */}
          <CustomDropdown
            value={impact.targetType}
            onChange={(val) => onUpdate(index, { targetType: val as ScenarioImpact['targetType'] })}
            groups={TARGET_TYPE_GROUPS}
            disabled={loading}
            minWidth="140px"
          />

          {/* Visual connector */}
          {ArrowRightIcon && (
            <ArrowRightIcon className="h-3.5 w-3.5 text-slate-600 shrink-0" />
          )}

          {/* Verb dropdown with icon */}
          <CustomDropdown
            value={currentVerb}
            onChange={(val) => handleVerbChange(val as ImpactVerb)}
            options={verbOptionsWithIcons}
            disabled={loading}
            minWidth="140px"
            showIcon
            icon={VerbIcon && <VerbIcon className="h-3.5 w-3.5" />}
            iconColor={verbColor}
          />

          {/* Amount input - hidden when verb is 'ends' */}
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
                className={`
                  px-3 py-2 w-28
                  rounded-lg font-mono
                  border border-white/[0.08] hover:border-white/[0.15] focus:border-blue-500/40
                  bg-white/[0.03] hover:bg-white/[0.05] focus:bg-white/[0.05]
                  text-sm text-white placeholder:text-slate-600
                  outline-none
                  disabled:opacity-50 disabled:cursor-not-allowed
                  transition-all duration-200
                `}
                placeholder="5,000"
                disabled={loading}
              />
            </div>
          )}

          {/* Cadence dropdown for recurring modifications */}
          {showCadenceSelector && (
            <CustomDropdown
              value={impact.cadence || 'monthly'}
              onChange={(val) => onUpdate(index, { cadence: val as ScenarioCadence })}
              options={CADENCE_OPTIONS}
              disabled={loading}
              minWidth="110px"
            />
          )}

          {/* Frequency dropdown for start impacts */}
          {showFrequencySelector && (
            <CustomDropdown
              value={impact.frequency || 'monthly'}
              onChange={(val) => onUpdate(index, { frequency: val as ItemFrequency })}
              options={FREQUENCY_OPTIONS}
              disabled={loading}
              minWidth="110px"
            />
          )}
        </div>

        {/* Row 2: Date range */}
        <DateRangeRow
          startMonth={impact.startMonth}
          endMonth={impact.endMonth}
          isOneTime={impact.frequency === 'one_time'}
          disabled={loading}
          onStartChange={(value) => onUpdate(index, { startMonth: value })}
          onEndChange={(value) => onUpdate(index, { endMonth: value })}
        />
      </div>

      {/* Item selector - for non-start impacts */}
      {currentVerb !== 'starts_at' && (
        <div className="mt-4 pt-4 border-t border-white/[0.04]">
          <ItemSelector
            targetType={impact.targetType}
            items={items}
            isLoadingItems={isLoadingItems}
            selectedItemId={selectedItemId}
            onSelectItem={onSelectItem}
            dropdownOpen={dropdownOpen}
            onDropdownToggle={onDropdownToggle}
            searchQuery={searchQuery}
            onSearchChange={onSearchChange}
            dropdownRef={dropdownRef}
            disabled={loading}
          />
        </div>
      )}

      {/* New item name input - for 'starts_at' verb */}
      {currentVerb === 'starts_at' && (
        <div className="mt-4 pt-4 border-t border-white/[0.04]">
          {selectedItemId ? (
            <LockedField
              value={newItemName || ''}
              onChange={onNewItemNameChange}
              label="name"
              placeholder={`e.g., ${getNamePlaceholder(impact.targetType)}`}
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
                placeholder={`e.g., ${getNamePlaceholder(impact.targetType)}`}
                disabled={loading}
              />
            </>
          )}
        </div>
      )}

      {/* Advanced section for all impacts except 'ends' */}
      {currentVerb !== 'ends' && (
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

// Helper for placeholder text
function getNamePlaceholder(targetType: string): string {
  switch (targetType) {
    case 'income': return 'Side Hustle'
    case 'expense': return 'New Subscription'
    case 'asset': return 'Investment Property'
    case 'investment': return 'New Fund'
    case 'cash': return 'Emergency Fund'
    case 'liability': return 'Car Loan'
    default: return 'New Item'
  }
}

// Re-export helpers used elsewhere
export { getTargetTypeLabel, formatAmount }
export type { FinancialItem }
