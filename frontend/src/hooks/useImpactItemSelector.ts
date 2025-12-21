import { useState, useEffect, useRef, useCallback } from 'react'
import type { ScenarioImpact } from '@/types/scenario'

export type FinancialItem = { id: string; name: string; amount: number; frequency?: string }

export interface UseImpactItemSelectorOptions {
  isOpen: boolean
  hydratedImpacts: ScenarioImpact[] | undefined
  allFinancialDataLoading: boolean
  getItemsForType: (targetType: string) => FinancialItem[]
  resolveStableTargetId: (targetType: string, targetId?: string) => string | undefined
}

export interface UseImpactItemSelectorReturn {
  selectedItemId: Record<number, string | undefined>
  setSelectedItemId: React.Dispatch<React.SetStateAction<Record<number, string | undefined>>>
  dropdownOpen: Record<number, boolean>
  setDropdownOpen: React.Dispatch<React.SetStateAction<Record<number, boolean>>>
  itemSearchQuery: Record<number, string>
  setItemSearchQuery: React.Dispatch<React.SetStateAction<Record<number, string>>>
  newItemNames: Record<number, string>
  setNewItemNames: React.Dispatch<React.SetStateAction<Record<number, string>>>
  dropdownRefs: React.MutableRefObject<Record<number, HTMLDivElement | null>>
  selectItem: (index: number, itemId: string | undefined) => void
  setNewItemName: (index: number, name: string) => void
  resetSelections: () => void
}

export function useImpactItemSelector({
  isOpen,
  hydratedImpacts,
  allFinancialDataLoading,
  getItemsForType,
  resolveStableTargetId,
}: UseImpactItemSelectorOptions): UseImpactItemSelectorReturn {
  // State for single item selection per impact (index -> selected item ID)
  const [selectedItemId, setSelectedItemId] = useState<Record<number, string | undefined>>({})
  // State for search query per impact (for searchable dropdown)
  const [itemSearchQuery, setItemSearchQuery] = useState<Record<number, string>>({})
  // State for dropdown open state per impact
  const [dropdownOpen, setDropdownOpen] = useState<Record<number, boolean>>({})
  // State for new item names per impact (for 'starts_at' verb)
  const [newItemNames, setNewItemNames] = useState<Record<number, string>>({})
  // Ref for dropdown containers to detect outside clicks
  const dropdownRefs = useRef<Record<number, HTMLDivElement | null>>({})

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      // Check if any dropdown is open
      const openIndices = Object.entries(dropdownOpen)
        .filter(([, isOpenDropdown]) => isOpenDropdown)
        .map(([idx]) => Number(idx))

      if (openIndices.length === 0) return

      // Check if click was outside all open dropdowns
      for (const idx of openIndices) {
        const ref = dropdownRefs.current[idx]
        if (ref && !ref.contains(e.target as Node)) {
          setDropdownOpen(prev => ({ ...prev, [idx]: false }))
        }
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [dropdownOpen])

  // Hydrate selectedItemId and newItemNames when financial data is loaded
  useEffect(() => {
    if (!isOpen || !hydratedImpacts || allFinancialDataLoading) {
      return
    }

    const initialSelectedId: Record<number, string | undefined> = {}
    const initialNewItemNames: Record<number, string> = {}

    hydratedImpacts.forEach((impact, index) => {
      // Only try to resolve if parentId exists (for delta/override/stop impacts)
      if (impact.parentId) {
        const items = getItemsForType(impact.targetType)
        const stable = resolveStableTargetId(impact.targetType, impact.parentId)

        if (process.env.NODE_ENV === 'development') {
          console.debug(`[useImpactItemSelector] Impact ${index}:`, {
            targetType: impact.targetType,
            parentId: impact.parentId,
            impactKind: impact.impactKind,
            resolvedStable: stable,
            availableItems: items.map(it => ({ id: it.id, name: it.name })),
            matchFound: stable && items.some(it => it.id === stable),
          })
        }

        if (stable) {
          initialSelectedId[index] = stable

          // For 'start' impacts, populate newItemNames with the actual item's name
          if (impact.impactKind === 'start') {
            const matchedItem = items.find(it => it.id === stable)
            if (matchedItem) {
              initialNewItemNames[index] = matchedItem.name
            }
          }
        }
      } else if (impact.impactKind === 'start' && impact.name) {
        // For 'start' impacts without parentId, populate newItemNames from impact.name
        initialNewItemNames[index] = impact.name
      }
    })

    if (process.env.NODE_ENV === 'development') {
      console.debug('[useImpactItemSelector] Setting selectedItemId:', initialSelectedId)
      console.debug('[useImpactItemSelector] Setting newItemNames:', initialNewItemNames)
    }
    setSelectedItemId(initialSelectedId)
    setNewItemNames(prev => ({ ...prev, ...initialNewItemNames }))
  }, [isOpen, hydratedImpacts, allFinancialDataLoading, getItemsForType, resolveStableTargetId])

  // Helper: Select single item for an impact
  const selectItem = useCallback((impactIndex: number, itemId: string | undefined) => {
    setSelectedItemId(prev => ({ ...prev, [impactIndex]: itemId }))
    // Close dropdown and clear search after selection
    setDropdownOpen(prev => ({ ...prev, [impactIndex]: false }))
    setItemSearchQuery(prev => ({ ...prev, [impactIndex]: '' }))
  }, [])

  // Helper: Set new item name for 'starts_at' verb
  const setNewItemName = useCallback((impactIndex: number, name: string) => {
    setNewItemNames(prev => ({ ...prev, [impactIndex]: name }))
  }, [])

  // Reset all selections
  const resetSelections = useCallback(() => {
    setSelectedItemId({})
    setItemSearchQuery({})
    setDropdownOpen({})
    setNewItemNames({})
  }, [])

  return {
    selectedItemId,
    setSelectedItemId,
    dropdownOpen,
    setDropdownOpen,
    itemSearchQuery,
    setItemSearchQuery,
    newItemNames,
    setNewItemNames,
    dropdownRefs,
    selectItem,
    setNewItemName,
    resetSelections,
  }
}
