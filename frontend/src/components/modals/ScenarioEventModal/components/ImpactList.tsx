"use client"

import * as LucideIcons from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { ScenarioImpact } from '@/types/scenario'
import { ImpactEditor } from './ImpactEditor'
import type { UseImpactItemSelectorReturn, UseFinancialItemsReturn } from '../hooks'

const PlusIcon = LucideIcons.Plus as LucideIcon | undefined
const LayersIcon = LucideIcons.Layers as LucideIcon | undefined

interface ImpactListProps {
  impacts: ScenarioImpact[]
  onUpdate: (index: number, patch: Partial<ScenarioImpact>) => void
  onAdd: () => void
  onRemove: (index: number) => void
  loading: boolean
  itemSelector: UseImpactItemSelectorReturn
  financialItems: UseFinancialItemsReturn
  /** The "Occurs On" date from the parent scenario, used as minDate for impact dates. Format: YYYY-MM */
  occursOn?: string
}

export function ImpactList({
  impacts,
  onUpdate,
  onAdd,
  onRemove,
  loading,
  itemSelector,
  financialItems,
  occursOn,
}: ImpactListProps) {
  const {
    selectedItemId,
    dropdownOpen,
    setDropdownOpen,
    itemSearchQuery,
    setItemSearchQuery,
    newItemNames,
    dropdownRefs,
    selectItem,
    setNewItemName,
  } = itemSelector

  const { getItemsForType, isLoadingForType } = financialItems

  return (
    <div className="mt-8">
      {/* Section header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="
            flex items-center justify-center
            h-8 w-8
            rounded-xl
            bg-gradient-to-br from-violet-500/20 to-purple-500/20
            border border-white/[0.06]
          ">
            {LayersIcon && <LayersIcon className="h-4 w-4 text-violet-400" />}
          </div>
          <div>
            <h3 className="text-sm font-medium text-white">Financial Impacts</h3>
            <p className="text-xs text-slate-500">
              Define what changes when this scenario occurs
            </p>
          </div>
        </div>
        <button
          type="button"
          className={`
            group inline-flex items-center gap-2
            px-3.5 py-2
            rounded-xl
            border border-white/[0.06] hover:border-violet-500/30
            bg-white/[0.02] hover:bg-violet-500/5
            text-xs font-medium text-slate-400 hover:text-violet-400
            disabled:opacity-50 disabled:cursor-not-allowed
            transition-all duration-200
          `}
          onClick={onAdd}
          disabled={loading}
        >
          {PlusIcon && <PlusIcon className="h-3.5 w-3.5" />}
          Add Impact
        </button>
      </div>

      {/* Impacts list */}
      <div className="space-y-4">
        {impacts.map((impact, index) => {
          const items = getItemsForType(impact.targetType)
          const isLoadingItems = isLoadingForType(impact.targetType, items)

          return (
            <ImpactEditor
              key={index}
              impact={impact}
              index={index}
              canRemove={impacts.length > 1}
              loading={loading}
              onUpdate={onUpdate}
              onRemove={onRemove}
              selectedItemId={selectedItemId[index]}
              onSelectItem={(itemId) => selectItem(index, itemId)}
              dropdownOpen={dropdownOpen[index] ?? false}
              onDropdownToggle={(open) => setDropdownOpen(prev => ({ ...prev, [index]: open }))}
              searchQuery={itemSearchQuery[index] ?? ''}
              onSearchChange={(query) => setItemSearchQuery(prev => ({ ...prev, [index]: query }))}
              dropdownRef={(el) => { dropdownRefs.current[index] = el }}
              newItemName={newItemNames[index]}
              onNewItemNameChange={(name) => setNewItemName(index, name)}
              items={items}
              isLoadingItems={isLoadingItems}
              occursOn={occursOn}
            />
          )
        })}
      </div>
    </div>
  )
}
