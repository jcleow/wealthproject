"use client"

import { useEffect, useRef, useState, useMemo, useCallback } from 'react'
import * as LucideIcons from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { ComponentType } from 'react'
import type { ScenarioEvent, ScenarioImpact, ImpactVerb } from '@/types/scenario'
import { verbToImpact, impactToVerb } from '@/types/scenario'
import { useCreateScenarioEventMutation, useUpdateScenarioEventMutation, useDeleteScenarioEventMutation } from '@/hooks/queries/useScenarioEventsQuery'
import { useScenarioEvent } from '@/hooks/useScenarioEvent'
import { useFinancialData } from '@/hooks/useFinancialDataWithQueries'
import { Modal } from '@/components/ui/Modal'
import { MonthPicker } from '@/components/ui/MonthPicker'

interface ScenarioEventModalProps {
  isOpen: boolean
  onClose: () => void
  onSaved?: (event: ScenarioEvent) => void
  onDeleted?: () => void
  event?: ScenarioEvent
}

const defaultImpact: ScenarioImpact = {
  targetType: 'asset',
  impactKind: 'delta',
  amount: 0,
  currency: 'SGD',
  cadence: 'monthly',
  startMonth: '',
  notes: '',
}

const ICON_OPTIONS = Object.entries(LucideIcons)
  .filter(([key, component]) => {
    if (key === 'default' || key === 'createLucideIcon') return false
    const type = typeof component
    return type === 'function' || type === 'object'
  })
  .map(([key, component]) => {
    const kebab = key
      .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
      .replace(/_/g, '-')
      .toLowerCase()
    return { name: kebab, label: kebab, Icon: component as ComponentType<{ className?: string }> }
  })

export function ScenarioEventModal({
  isOpen,
  onClose,
  onSaved,
  onDeleted,
  event,
}: ScenarioEventModalProps) {
  const { data: fetchedEvent, isFetching } = useScenarioEvent(event?.id, isOpen && Boolean(event?.id), event)
  const hydratedEvent = fetchedEvent ?? event
  const normalizeMonth = (value?: string | null) => (value ? value.slice(0, 7) : '')
  const [form, setForm] = useState<{
    name: string
    occursOn: string
    description: string
    displayIcon: string
    iconColor: string
    isIncluded: boolean
    impacts: ScenarioImpact[]
    iconSearch: string
  }>({
    name: '',
    occursOn: '',
    description: '',
    displayIcon: 'sparkles',
    iconColor: '#0ea5e9',
    isIncluded: true,
    impacts: [{ ...defaultImpact }],
    iconSearch: '',
  })
  const [error, setError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const prevOccursOn = useRef<string>('')

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
        .filter(([, isOpen]) => isOpen)
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

  // Financial data for item selector
  const { assets, liabilities, incomes, expenses, loading: financialDataLoading } = useFinancialData()

  // Helper: Get items for a given target type
  // Use the stable id for matching: prefer parentId when present, else id.
  type FinancialItem = { id: string; name: string; amount: number; frequency?: string }
  const getItemsForType = useMemo(() => {
    return (targetType: string, _startMonth?: string): FinancialItem[] => {
      // Note: We no longer filter by date - show all items and let user choose
      // Items that don't exist yet at the scenario date will simply have no effect
      switch (targetType) {
        case 'income':
          return incomes.map(inc => ({ id: inc.parentId ?? inc.id, name: inc.source, amount: inc.amount, frequency: inc.frequency }))
        case 'expense':
          return expenses.map(exp => ({ id: exp.parentId ?? exp.id, name: exp.payee, amount: exp.amount, frequency: exp.frequency }))
        case 'asset':
          return assets.map(a => ({ id: a.parentId ?? a.id, name: a.name, amount: a.currentValue }))
        case 'liability':
          return liabilities.map(l => ({ id: l.parentId ?? l.id, name: l.name, amount: l.currentBalance }))
        default:
          return []
      }
    }
  }, [assets, liabilities, incomes, expenses])

  // Resolve a stable target id for a given type/id.
  // The targetId from the backend might be the actual item ID, but getItemsForType
  // uses parentId ?? id. We need to find the item that matches either way.
  const resolveStableTargetId = useCallback(
    (targetType: string, targetId?: string) => {
      if (!targetId) return undefined

      // Get raw items to check both id and parentId
      let rawItems: Array<{ id: string; parentId?: string; name: string }> = []
      switch (targetType) {
        case 'income':
          rawItems = incomes.map(inc => ({ id: inc.id, parentId: inc.parentId, name: inc.source }))
          break
        case 'expense':
          rawItems = expenses.map(exp => ({ id: exp.id, parentId: exp.parentId, name: exp.payee }))
          break
        case 'asset':
          rawItems = assets.map(a => ({ id: a.id, parentId: a.parentId, name: a.name }))
          break
        case 'liability':
          rawItems = liabilities.map(l => ({ id: l.id, parentId: l.parentId, name: l.name }))
          break
      }

      // Find item where targetId matches either id or parentId
      const match = rawItems.find(it => it.id === targetId || it.parentId === targetId)
      if (match) {
        // Return the stable id (parentId ?? id) that getItemsForType uses
        return match.parentId ?? match.id
      }

      return targetId
    },
    [assets, liabilities, incomes, expenses]
  )

  // Helper: Select single item for an impact
  const selectItem = (impactIndex: number, itemId: string | undefined) => {
    setSelectedItemId(prev => ({ ...prev, [impactIndex]: itemId }))
    // Close dropdown and clear search after selection
    setDropdownOpen(prev => ({ ...prev, [impactIndex]: false }))
    setItemSearchQuery(prev => ({ ...prev, [impactIndex]: '' }))
  }

  // Helper: Set new item name for 'starts_at' verb
  const setNewItemName = (impactIndex: number, name: string) => {
    setNewItemNames(prev => ({ ...prev, [impactIndex]: name }))
  }

  // Helper: Format amount display based on frequency
  const formatAmount = (amount: number, frequency?: string) => {
    const formatted = new Intl.NumberFormat('en-US').format(amount)
    if (!frequency) return `$${formatted}`
    const freqLabel = frequency === 'monthly' ? '/mo' : frequency === 'annual' ? '/yr' : frequency === 'weekly' ? '/wk' : ''
    return `$${formatted}${freqLabel}`
  }

  const createMutation = useCreateScenarioEventMutation()
  const updateMutation = useUpdateScenarioEventMutation()
  const deleteMutation = useDeleteScenarioEventMutation()
  const saving = createMutation.isLoading || updateMutation.isLoading
  const deleting = deleteMutation.isLoading
  const PlusIcon = LucideIcons.Plus as LucideIcon | undefined
  const TrashIcon = LucideIcons.Trash2 as LucideIcon | undefined
  const CloseIcon = LucideIcons.X as LucideIcon | undefined
  const SparklesIcon = LucideIcons.Sparkles as LucideIcon | undefined
  const ChevronDownIcon = LucideIcons.ChevronDown as LucideIcon | undefined
  const SearchIcon = LucideIcons.Search as LucideIcon | undefined
  const CheckIcon = LucideIcons.Check as LucideIcon | undefined

  const iconOptions = ICON_OPTIONS
  const SelectedIcon = iconOptions.find((opt) => opt.name === form.displayIcon)?.Icon
  const searchTerm = form.iconSearch.trim().toLowerCase()
  const hasSearch = searchTerm.length > 0
  const filteredIcons = hasSearch
    ? iconOptions.filter(
        (opt) => opt.name.toLowerCase().includes(searchTerm) || opt.label.toLowerCase().includes(searchTerm)
      )
    : []

  // Hydrate form when event changes
  useEffect(() => {
    if (!isOpen) return
    if (hydratedEvent) {
      const normalizedImpacts = hydratedEvent.impacts && hydratedEvent.impacts.length > 0
        ? hydratedEvent.impacts.map((impact) => ({
            ...impact,
            startMonth: normalizeMonth(impact.startMonth) || normalizeMonth(hydratedEvent.occursOn),
            endMonth: normalizeMonth(impact.endMonth) || undefined,
          }))
        : [{ ...defaultImpact, startMonth: normalizeMonth(hydratedEvent.occursOn) }]

      setForm({
        name: hydratedEvent.name ?? '',
        occursOn: normalizeMonth(hydratedEvent.occursOn),
        description: hydratedEvent.description ?? '',
        displayIcon: hydratedEvent.displayIcon ?? 'sparkles',
        iconColor: hydratedEvent.displayColor ?? '#0ea5e9',
        isIncluded: hydratedEvent.isIncluded ?? true,
        impacts: normalizedImpacts,
        iconSearch: hydratedEvent.displayIcon ?? '',
      })
      prevOccursOn.current = hydratedEvent.occursOn ?? ''

      setNewItemNames({})
      setConfirmDelete(false)
    } else {
      setForm({
        name: '',
        occursOn: '',
        description: '',
        displayIcon: 'sparkles',
        iconColor: '#0ea5e9',
        isIncluded: true,
        impacts: [{ ...defaultImpact }],
        iconSearch: '',
      })
      prevOccursOn.current = ''
      setSelectedItemId({})
      setItemSearchQuery({})
      setDropdownOpen({})
      setNewItemNames({})
      setConfirmDelete(false)
    }
  }, [hydratedEvent, isOpen])

  // Separate effect to hydrate selectedItemId and newItemNames when financial data is loaded
  // This needs to run when: modal is open, we have impacts, and financial data is ready
  useEffect(() => {
    if (!isOpen || !hydratedEvent?.impacts || financialDataLoading) {
      return
    }

    const initialSelectedId: Record<number, string | undefined> = {}
    const initialNewItemNames: Record<number, string> = {}

    hydratedEvent.impacts.forEach((impact, index) => {
      // Only try to resolve if targetId exists
      if (impact.targetId) {
        const items = getItemsForType(impact.targetType)
        const stable = resolveStableTargetId(impact.targetType, impact.targetId)

        if (process.env.NODE_ENV === 'development') {
          console.debug(`[ScenarioEventModal] Impact ${index}:`, {
            targetType: impact.targetType,
            targetId: impact.targetId,
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
      }
    })

    if (process.env.NODE_ENV === 'development') {
      console.debug('[ScenarioEventModal] Setting selectedItemId:', initialSelectedId)
      console.debug('[ScenarioEventModal] Setting newItemNames:', initialNewItemNames)
    }
    setSelectedItemId(initialSelectedId)
    setNewItemNames(prev => ({ ...prev, ...initialNewItemNames }))
  }, [isOpen, hydratedEvent?.impacts, financialDataLoading, assets, liabilities, incomes, expenses, getItemsForType, resolveStableTargetId])

  // Keep impacts aligned to occurs_on unless user overrides
  useEffect(() => {
    if (!form.occursOn) return
    const month = form.occursOn.slice(0, 7)
    setForm((prev) => ({
      ...prev,
      impacts: prev.impacts.map((impact) => {
        if (!impact.startMonth || impact.startMonth === prevOccursOn.current.slice(0, 7)) {
          return { ...impact, startMonth: month }
        }
        return impact
      }),
    }))
    prevOccursOn.current = form.occursOn
  }, [form.occursOn])

  const handleImpactChange = (index: number, update: Partial<ScenarioImpact>) => {
    setForm((prev) => ({
      ...prev,
      impacts: prev.impacts.map((impact, idx) => (idx === index ? { ...impact, ...update } : impact)),
    }))

    // Clear selected item when startMonth or targetType changes (item may no longer be valid)
    if ('startMonth' in update || 'targetType' in update) {
      setSelectedItemId((prev) => ({ ...prev, [index]: undefined }))
      setItemSearchQuery((prev) => ({ ...prev, [index]: '' }))
    }

    // If the user selects a target item directly, mirror it into selectedItemId
    if ('targetId' in update && update.targetId) {
      const stable = resolveStableTargetId(update.targetType || '', update.targetId) ?? update.targetId
      setSelectedItemId((prev) => ({ ...prev, [index]: stable }))
    }
  }

  const addImpact = () =>
    setForm((prev) => ({
      ...prev,
      impacts: [
        ...prev.impacts,
        { ...defaultImpact, startMonth: prev.occursOn ? prev.occursOn.slice(0, 7) : defaultImpact.startMonth },
      ],
    }))

  const removeImpact = (index: number) =>
    setForm((prev) => ({ ...prev, impacts: prev.impacts.filter((_, idx) => idx !== index) }))

  const handleSave = async () => {
    setError(null)
    if (!form.name.trim()) {
      setError('Name is required.')
      return
    }
    if (!form.occursOn) {
      setError('Occurs on date is required.')
      return
    }
    const normalizedIcon =
      form.displayIcon.trim() || hydratedEvent?.displayIcon || event?.displayIcon || ''
    if (!normalizedIcon) {
      setError('Icon is required.')
      return
    }

    // Validate item selection and new item names
    for (let i = 0; i < form.impacts.length; i++) {
      const impact = form.impacts[i]
      const verb = impactToVerb(impact.impactKind, impact.amount)
      const items = getItemsForType(impact.targetType, impact.startMonth)

      if (verb === 'starts_at') {
        // Require name for new items
        if (!newItemNames[i]?.trim()) {
          setError(`Impact ${i + 1}: Please provide a name for the new ${impact.targetType}.`)
          return
        }
      } else {
        // Require an item to be selected (only if items exist)
        const selected = selectedItemId[i]
        if (items.length > 0 && !selected) {
          setError(`Impact ${i + 1}: Please select a ${impact.targetType} to affect.`)
          return
        }
      }
    }

    // Build impacts array (one per impact since we now use single selection)
    const expandedImpacts: ScenarioImpact[] = []
    form.impacts.forEach((impact, index) => {
      const verb = impactToVerb(impact.impactKind, impact.amount)
      const baseImpact = {
        ...impact,
        amount: Number(impact.amount) || 0,
        currency: 'SGD',
        startMonth: impact.startMonth || form.occursOn.slice(0, 7),
      }

      if (verb === 'starts_at') {
        // For new items, store the name in notes (or a dedicated field if available)
        const itemName = newItemNames[index]?.trim() || ''
        expandedImpacts.push({
          ...baseImpact,
          notes: itemName ? `New: ${itemName}${baseImpact.notes ? ` - ${baseImpact.notes}` : ''}` : baseImpact.notes,
        })
      } else {
        const targetId = selectedItemId[index]
        if (!targetId) {
          // No selection - try to use existing targetId normalized to stable id
          const stable = resolveStableTargetId(impact.targetType, impact.targetId)
          expandedImpacts.push({ ...baseImpact, targetId: stable })
        } else {
          expandedImpacts.push({ ...baseImpact, targetId })
        }
      }
    })

      const payload: ScenarioEvent = {
        name: form.name.trim(),
        description: form.description.trim(),
        occursOn: form.occursOn,
        displayIcon: normalizedIcon,
        displayColor: form.iconColor || hydratedEvent?.displayColor || event?.displayColor,
        tags: [],
        isIncluded: form.isIncluded,
        impacts: expandedImpacts,
    }
    try {
      const existingEvent = hydratedEvent ?? event
      const eventId = existingEvent?.id
      const saved = eventId
        ? await updateMutation.mutateAsync({ id: eventId, event: { ...existingEvent, ...payload } as ScenarioEvent })
        : await createMutation.mutateAsync(payload)
      onSaved?.(saved)
      onClose()
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : 'Unable to create scenario.'
      setError(message)
    }
  }

  const loadingState = saving || deleting || isFetching

  const handleDelete = async () => {
    const eventId = hydratedEvent?.id ?? event?.id
    if (!eventId) return

    try {
      await deleteMutation.mutateAsync(eventId)
      onDeleted?.()
      onClose()
    } catch (deleteError) {
      const message = deleteError instanceof Error ? deleteError.message : 'Unable to delete scenario.'
      setError(message)
    }
  }

  const renderIconOption = (IconComp?: ComponentType<{ className?: string }>) => (IconComp ? <IconComp className="h-4 w-4" /> : null)

  return (
    <Modal isOpen={isOpen} onClose={onClose} overlayClassName="bg-black/80 backdrop-blur-sm p-4 sm:p-6">
      <div className="relative w-full max-w-4xl overflow-hidden rounded-2xl border border-white/[0.1] bg-[#0a0a0a]/95 backdrop-blur-xl text-white shadow-xl shadow-black/50">
        <div className="max-h-[80vh] overflow-y-auto p-6 pr-3 custom-scrollbar">
          {isFetching && (
            <div className="mb-4 rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-xs text-slate-300 animate-pulse">
              Loading scenario...
            </div>
          )}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-[0.25em] text-slate-500 font-medium">Scenario</p>
              <h2 className="text-xl font-semibold tracking-tight text-white mt-1">{event ? 'Edit Scenario Event' : 'Create a new scenario'}</h2>
              <p className="text-sm text-slate-500 mt-0.5">Define event details and financial impacts.</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-xs font-medium text-slate-400 transition-all hover:border-white/[0.15] hover:bg-white/[0.06] hover:text-slate-200 disabled:opacity-50 disabled:pointer-events-none"
                onClick={() => {
                  const exampleOccurs = new Date()
                  exampleOccurs.setFullYear(exampleOccurs.getFullYear() + 3)
                  const monthStr = exampleOccurs.toISOString().slice(0, 7)
                  setForm((prev) => ({
                    ...prev,
                    name: 'Job Loss',
                    description: 'Unexpected layoff leads to complete income loss. Time to tap into emergency fund and cut discretionary spending.',
                    occursOn: monthStr,
                    displayIcon: 'briefcase-business',
                    iconColor: '#ef4444',
                    isIncluded: true,
                    impacts: [
                      {
                        targetType: 'income',
                        impactKind: 'override',
                        amount: 0,
                        currency: 'SGD',
                        cadence: 'monthly',
                        startMonth: monthStr,
                        endMonth: undefined,
                        notes: 'Primary salary drops to zero until new employment',
                      },
                    ],
                    iconSearch: 'briefcase-business',
                  }))
                }}
                disabled={loadingState}
              >
                {SparklesIcon ? <SparklesIcon className="h-3.5 w-3.5 text-blue-400" /> : '★'}
                Example
              </button>
              <button
                type="button"
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.03] text-slate-400 transition-all hover:border-white/[0.15] hover:bg-white/[0.06] hover:text-white"
                onClick={onClose}
                aria-label="Close scenario modal"
              >
                {CloseIcon ? <CloseIcon className="h-4 w-4" /> : '×'}
              </button>
            </div>
          </div>

          {/* Toggle Section */}
          <div className="mt-5 flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
            <div className="text-sm text-slate-300">Include in projections</div>
            <button
              type="button"
              onClick={() => setForm((prev) => ({ ...prev, isIncluded: !prev.isIncluded }))}
              className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
                form.isIncluded
                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:border-emerald-500/50'
                  : 'border-white/[0.08] bg-white/[0.03] text-slate-400 hover:border-white/[0.15]'
              }`}
              aria-pressed={form.isIncluded}
            >
              <span
                className={`flex h-4 w-8 items-center rounded-full p-[2px] transition-all ${
                  form.isIncluded ? 'bg-emerald-500/60 justify-end' : 'bg-white/10 justify-start'
                }`}
              >
                <span className={`h-3 w-3 rounded-full transition-colors ${form.isIncluded ? 'bg-white' : 'bg-slate-400'}`} />
              </span>
              {form.isIncluded ? 'Enabled' : 'Disabled'}
            </button>
          </div>

          {/* Form Fields */}
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <label className="space-y-1.5 text-sm">
              <span className="text-sm font-medium text-slate-300">Name</span>
              <input
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                className="w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2.5 text-white placeholder:text-slate-500 transition-all focus:border-blue-500/50 focus:bg-white/[0.05] focus:outline-none disabled:opacity-50"
                placeholder="e.g., Job Loss"
                disabled={loadingState}
              />
            </label>
            <div className="space-y-1.5 text-sm">
              <span className="text-sm font-medium text-slate-300">Occurs on (month)</span>
              <MonthPicker
                value={form.occursOn}
                onChange={(value) => setForm((prev) => ({ ...prev, occursOn: value }))}
                placeholder="Select month"
                disabled={loadingState}
                className="w-full"
              />
            </div>
            <label className="space-y-1.5 text-sm">
              <span className="text-sm font-medium text-slate-300">Icon</span>
              <div className="flex items-center gap-2">
                <span
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/[0.08]"
                  style={{ backgroundColor: form.iconColor || '#111827' }}
                  aria-label="Icon color preview"
                >
                  {SelectedIcon ? <SelectedIcon className="h-5 w-5 text-white" /> : null}
                </span>
                <input
                  value={form.iconSearch}
                  onChange={(e) => {
                    const next = e.target.value
                    setForm((prev) => ({
                      ...prev,
                      iconSearch: next,
                      displayIcon: next || prev.displayIcon,
                    }))
                  }}
                  className="w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2.5 text-white placeholder:text-slate-500 transition-all focus:border-blue-500/50 focus:bg-white/[0.05] focus:outline-none disabled:opacity-50"
                  placeholder="Search icon e.g., briefcase, heart, home"
                  disabled={loadingState}
                />
                <input
                  type="color"
                  value={form.iconColor}
                  onChange={(e) => setForm((prev) => ({ ...prev, iconColor: e.target.value }))}
                  className="h-10 w-14 cursor-pointer rounded-lg border border-white/[0.08] bg-white/[0.03]"
                  title="Icon background color"
                  disabled={loadingState}
                />
              </div>
              <div className="relative">
                <div className="mt-2 grid max-h-48 grid-cols-3 gap-1.5 overflow-auto rounded-lg border border-white/[0.08] bg-[#0a0a0a]/90 p-2 shadow-lg shadow-black/30">
                  {!hasSearch && (
                    <div className="col-span-3 py-3 text-center text-xs text-slate-500">Type to search for an icon.</div>
                  )}
                  {hasSearch &&
                    filteredIcons.slice(0, 24).map((opt, idx) => (
                      <button
                        key={`${opt.name}-${idx}`}
                        type="button"
                        onClick={() => {
                          setForm((prev) => ({ ...prev, displayIcon: opt.name, iconSearch: opt.name }))
                        }}
                        className="flex items-center gap-2 rounded-md border border-white/[0.06] bg-white/[0.02] px-2 py-1.5 text-left text-xs text-slate-300 transition-all hover:border-white/[0.12] hover:bg-white/[0.05] hover:text-white disabled:opacity-50"
                        disabled={loadingState}
                      >
                        <span className="flex h-5 w-5 items-center justify-center rounded bg-white/[0.05]">
                          {renderIconOption(opt.Icon)}
                        </span>
                        <span className="truncate text-[11px]">{opt.label}</span>
                      </button>
                    ))}
                  {hasSearch && filteredIcons.length === 0 && (
                    <div className="col-span-3 py-3 text-center text-xs text-slate-500">No icons match that search.</div>
                  )}
                </div>
              </div>
            </label>
            <div className="md:col-span-2 space-y-1.5 text-sm">
              <span className="text-sm font-medium text-slate-300">Description</span>
              <textarea
                value={form.description}
                onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                rows={2}
                className="w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2.5 text-white placeholder:text-slate-500 transition-all focus:border-blue-500/50 focus:bg-white/[0.05] focus:outline-none resize-none disabled:opacity-50"
                placeholder="What is this scenario about?"
                disabled={loadingState}
              />
            </div>
          </div>

          {/* Impacts Section */}
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
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-xs font-medium text-slate-400 transition-all hover:border-white/[0.15] hover:bg-white/[0.06] hover:text-slate-200 disabled:opacity-50"
                onClick={addImpact}
                disabled={loadingState}
              >
                {PlusIcon ? <PlusIcon className="h-3.5 w-3.5" /> : '+'}
                Add impact
              </button>
            </div>

            <div className="space-y-3">
              {form.impacts.map((impact, index) => {
                const currentVerb = impactToVerb(impact.impactKind, impact.amount)
                const handleVerbChange = (verb: ImpactVerb) => {
                  const { impactKind, amount } = verbToImpact(verb, Math.abs(impact.amount) || 0)
                  handleImpactChange(index, { impactKind, amount })
                }
                return (
                <div key={index} className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-medium text-slate-300">Impact {index + 1}</p>
                    {form.impacts.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeImpact(index)}
                        className="text-slate-500 transition-colors hover:text-rose-400 disabled:opacity-50"
                        disabled={loadingState}
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
                      onChange={(e) => handleImpactChange(index, { targetType: e.target.value as ScenarioImpact['targetType'] })}
                      className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm text-white transition-all focus:border-blue-500/50 focus:outline-none disabled:opacity-50"
                      disabled={loadingState}
                    >
                      <option value="income">Income</option>
                      <option value="expense">Expense</option>
                      <option value="asset">Asset</option>
                      <option value="liability">Liability</option>
                    </select>

                    {/* Verb dropdown */}
                    <select
                      value={currentVerb}
                      onChange={(e) => handleVerbChange(e.target.value as ImpactVerb)}
                      className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm text-white transition-all focus:border-blue-500/50 focus:outline-none disabled:opacity-50"
                      disabled={loadingState}
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
                            handleImpactChange(index, { impactKind, amount })
                          }}
                          className="w-28 rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm text-white placeholder:text-slate-500 transition-all focus:border-blue-500/50 focus:outline-none disabled:opacity-50"
                          placeholder="5,000"
                          disabled={loadingState}
                        />
                      </div>
                    )}

                    {/* Cadence - hidden when verb is 'ends' */}
                    {currentVerb !== 'ends' && (
                      <select
                        value={impact.cadence}
                        onChange={(e) => handleImpactChange(index, { cadence: e.target.value as ScenarioImpact['cadence'] })}
                        className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm text-white transition-all focus:border-blue-500/50 focus:outline-none disabled:opacity-50"
                        disabled={loadingState}
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
                      onChange={(value) => handleImpactChange(index, { startMonth: value })}
                      placeholder="Select month"
                      disabled={loadingState}
                    />
                    <span className="text-slate-500">to</span>
                    <MonthPicker
                      value={impact.endMonth}
                      onChange={(value) => handleImpactChange(index, { endMonth: value || undefined })}
                      placeholder="Ongoing"
                      disabled={loadingState}
                    />
                    {!impact.endMonth && <span className="text-slate-600 text-xs">(ongoing)</span>}
                  </div>

                  {/* Item selector - searchable dropdown for selecting a single item */}
                  {currentVerb !== 'starts_at' && impact.startMonth && (() => {
                    const items = getItemsForType(impact.targetType, impact.startMonth)
                    const selected = selectedItemId[index]
                    const selectedItem = items.find(it => it.id === selected)
                    const isOpen = dropdownOpen[index] ?? false
                    const searchQuery = itemSearchQuery[index] ?? ''
                    const filteredItems = searchQuery
                      ? items.filter(it => it.name.toLowerCase().includes(searchQuery.toLowerCase()))
                      : items

                    if (items.length === 0 && !financialDataLoading) {
                      return (
                        <div className="mt-3 rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-xs text-amber-400/80">
                          No {impact.targetType} items found. Add some in the Financial Data section first.
                        </div>
                      )
                    }
                    return (
                      <div className="mt-3 relative">
                        <p className="text-xs text-slate-500 mb-2">
                          Which {impact.targetType}?{' '}
                          <span className="text-rose-400">*</span>
                        </p>
                        {financialDataLoading ? (
                          <div className="text-xs text-slate-500 animate-pulse rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2">Loading items...</div>
                        ) : (
                          <div className="relative" ref={el => { dropdownRefs.current[index] = el }}>
                            {/* Dropdown trigger button */}
                            <button
                              type="button"
                              onClick={() => setDropdownOpen(prev => ({ ...prev, [index]: !isOpen }))}
                              className="w-full flex items-center justify-between gap-2 rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2.5 text-sm text-left transition-all hover:border-white/[0.15] hover:bg-white/[0.05] focus:border-blue-500/50 focus:outline-none disabled:opacity-50"
                              disabled={loadingState}
                            >
                              {selectedItem ? (
                                <span className="flex items-center justify-between flex-1 min-w-0">
                                  <span className="truncate text-slate-200">{selectedItem.name}</span>
                                  <span className="text-slate-500 text-xs ml-2 shrink-0">
                                    {formatAmount(selectedItem.amount, selectedItem.frequency)}
                                  </span>
                                </span>
                              ) : (
                                <span className="text-slate-500">Select {impact.targetType}...</span>
                              )}
                              {ChevronDownIcon && (
                                <ChevronDownIcon className={`h-4 w-4 text-slate-500 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                              )}
                            </button>

                            {/* Dropdown menu */}
                            {isOpen && (
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
                                      onChange={(e) => setItemSearchQuery(prev => ({ ...prev, [index]: e.target.value }))}
                                      placeholder={`Search ${impact.targetType}...`}
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
                                        onClick={() => selectItem(index, item.id)}
                                        className={`w-full flex items-center gap-2 rounded-md px-3 py-2 text-xs text-left transition-all ${
                                          selected === item.id
                                            ? 'bg-blue-500/15 text-blue-300 border border-blue-500/20'
                                            : 'text-slate-300 hover:bg-white/[0.05] border border-transparent'
                                        }`}
                                      >
                                        <span className="w-4 shrink-0">
                                          {selected === item.id && CheckIcon && (
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
                    )
                  })()}

                  {/* New item name input - for 'starts_at' verb */}
                  {currentVerb === 'starts_at' && (
                    <div className="mt-3">
                      <label className="text-xs text-slate-500">
                        Name for new {impact.targetType}: <span className="text-rose-400">*</span>
                        <input
                          type="text"
                          value={newItemNames[index] || ''}
                          onChange={(e) => setNewItemName(index, e.target.value)}
                          className="mt-1.5 w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2.5 text-sm text-white placeholder:text-slate-500 transition-all focus:border-blue-500/50 focus:outline-none disabled:opacity-50"
                          placeholder={`e.g., ${impact.targetType === 'income' ? 'Side Hustle' : impact.targetType === 'expense' ? 'New Subscription' : impact.targetType === 'asset' ? 'Investment Property' : 'Car Loan'}`}
                          disabled={loadingState}
                        />
                      </label>
                    </div>
                  )}

                  {/* Notes */}
                  <div className="mt-3">
                    <input
                      type="text"
                      value={impact.notes ?? ''}
                      onChange={(e) => handleImpactChange(index, { notes: e.target.value })}
                      className="w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-xs text-white placeholder:text-slate-500 transition-all focus:border-blue-500/50 focus:outline-none disabled:opacity-50"
                      placeholder="Notes (optional)"
                      disabled={loadingState}
                    />
                  </div>
                </div>
              )})}
            </div>
          </div>

          {error && (
            <div className="mt-4 rounded-lg border border-rose-500/20 bg-rose-500/5 px-3 py-2.5 text-sm text-rose-400">
              {error}
            </div>
          )}

          {/* Footer Actions */}
          <div className="mt-6 flex items-center justify-between gap-3 border-t border-white/[0.06] pt-5">
            {event ? (
              confirmDelete ? (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-rose-400">Delete this scenario?</span>
                  <button
                    type="button"
                    className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-sm font-medium text-rose-400 transition-all hover:border-rose-500/50 hover:bg-rose-500/20 disabled:opacity-50"
                    onClick={handleDelete}
                    disabled={loadingState}
                  >
                    {deleting ? 'Deleting…' : 'Yes, delete'}
                  </button>
                  <button
                    type="button"
                    className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-sm text-slate-400 transition-all hover:border-white/[0.15] hover:bg-white/[0.06]"
                    onClick={() => setConfirmDelete(false)}
                    disabled={deleting}
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-rose-500/20 bg-rose-500/5 px-3 py-2 text-sm font-medium text-rose-400 transition-all hover:border-rose-500/40 hover:bg-rose-500/10 disabled:opacity-50"
                  onClick={() => setConfirmDelete(true)}
                  disabled={loadingState}
                >
                  {TrashIcon ? <TrashIcon className="h-3.5 w-3.5" /> : null}
                  Delete
                </button>
              )
            ) : (
              <div />
            )}
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-4 py-2 text-sm font-medium text-slate-400 transition-all hover:border-white/[0.15] hover:bg-white/[0.06] hover:text-slate-200 disabled:opacity-50"
                onClick={onClose}
                disabled={saving || deleting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-blue-600/20 transition-all hover:bg-blue-500 hover:shadow-blue-500/30 disabled:opacity-50 disabled:pointer-events-none"
                onClick={handleSave}
                disabled={loadingState}
              >
                {saving ? 'Saving…' : event ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  )
}
