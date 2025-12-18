"use client"

import * as LucideIcons from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { ScenarioImpact } from '@/types/scenario'
import { ImpactEditor } from './ImpactEditor'
import type { UseImpactItemSelectorReturn, UseFinancialItemsReturn } from '../hooks'

const PlusIcon = LucideIcons.Plus as LucideIcon | undefined

interface ImpactListProps {
  impacts: ScenarioImpact[]
  onUpdate: (index: number, patch: Partial<ScenarioImpact>) => void
  onAdd: () => void
  onRemove: (index: number) => void
  loading: boolean
  itemSelector: UseImpactItemSelectorReturn
  financialItems: UseFinancialItemsReturn
}

export function ImpactList({
  impacts,
  onUpdate,
  onAdd,
  onRemove,
  loading,
  itemSelector,
  financialItems,
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
    <div className="mt-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-white">Impacts</p>
          <p className="text-xs text-slate-500 mt-0.5">
            Describe what changes in this scenario.
          </p>
        </div>
        <button
          type="button"
          className={`inline-flex items-center
gap-1.5 px-3 py-2
rounded-lg border border-white/[0.08] hover:border-white/[0.15]
bg-white/[0.03] hover:bg-white/[0.06]
text-xs font-medium text-slate-400 hover:text-slate-200
disabled:opacity-50
transition-all`}
          onClick={onAdd}
          disabled={loading}
        >
          {PlusIcon ? <PlusIcon className="h-3.5 w-3.5" /> : '+'}
          Add impact
        </button>
      </div>

      <div className="space-y-3">
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
            />
          )
        })}
      </div>
    </div>
  )
}
