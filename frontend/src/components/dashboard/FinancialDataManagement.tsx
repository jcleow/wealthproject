import { useEffect, useState, useMemo } from 'react'
import { Plus, Pencil, Trash2, Home, Info, ArrowDownWideNarrow, ChevronRight } from 'lucide-react'
import * as LucideIcons from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import * as Tooltip from '@radix-ui/react-tooltip'

import { useFinancialDataContext } from '@/contexts/FinancialDataContext'
import { useScenarioEvents } from '@/hooks/useScenarioEvents'
import type { Asset, Expense, Income, Liability } from '../../types/financial'
import type { ScenarioEvent, ScenarioImpact, ScenarioTargetType } from '@/types/scenario'
import type { PropertyLinkRecord } from '../../types/property'
import type { FinancialDataType, FinancialFormValues } from '../modals/FinancialFormModal'
import { FinancialFormModal } from '../modals/FinancialFormModal'
import { PropertyPlannerModal } from '../modals/PropertyPlannerModal'
import { financialApi } from '@/services/financialApi'
import type { TimelineYear, TimelineEditRequest, TimelineEdit, TimelineItemType, TimelineFrequency } from '@/types/timeline'
import { formatCurrency } from '@/lib/format'

type FinancialCategory = FinancialDataType

type CategoryConfig = {
  title: string
  emptyDescription: string
  icon: string
  accent: string
  singular: string
  plural: string
  helper?: string
}

const categoryConfig: Record<FinancialCategory, CategoryConfig> = {
  asset: {
    title: 'Assets',
    emptyDescription: 'No assets added yet',
    icon: '📈',
  accent: 'bg-blue-500',
    singular: 'asset',
    plural: 'assets',
  },
  income: {
    title: 'Income',
    emptyDescription: 'No income added yet',
    icon: '💼',
    accent: 'text-grey-500 bg-white/5 ',
    singular: 'income',
    plural: 'income',
  },
  liability: {
    title: 'Liabilities',
    emptyDescription: 'No liabilities added yet',
    icon: '💳',
    accent: 'bg-rose-500',
    singular: 'liability',
    plural: 'liabilities',
  },
  expense: {
    title: 'Expenses',
    emptyDescription: 'No expenses added yet',
    icon: '💰',
    accent: 'bg-amber-500',
    singular: 'expense',
    plural: 'expenses',
  },
}

// Icon lookup for scenario icons
const iconLookup = Object.entries(LucideIcons).reduce<Record<string, LucideIcon>>((acc, [key, component]) => {
  if (key === 'default' || key === 'createLucideIcon') return acc
  const kebab = key
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/_/g, '-')
    .toLowerCase()
  acc[kebab] = component as LucideIcon
  return acc
}, {})

function getIconByName(name: string): LucideIcon | undefined {
  if (!name) return undefined
  const normalized = name.toLowerCase()
  return iconLookup[normalized]
}

// Helper to find scenario impacts for a financial item
function getAppliedImpacts(
  item: any,
  itemType: ScenarioTargetType,
  scenarioEvents: ScenarioEvent[]
): Array<{ event: ScenarioEvent | null; impact: { eventId?: string; amountAnnual?: number; notes?: string; impactKind?: string } }> {
  const applied = Array.isArray(item.eventImpacts) ? item.eventImpacts : item.event_impacts
  if (!applied || applied.length === 0) return []
  return applied.map((imp: any) => {
    const event = scenarioEvents.find((ev) => ev.id === (imp.eventId ?? imp.event_id)) ?? null
    return {
      event,
      impact: {
        eventId: imp.eventId ?? imp.event_id,
        amountAnnual: imp.amountAnnual ?? imp.amount_annual,
        notes: imp.notes,
        impactKind: imp.impactKind ?? imp.impact_kind,
      },
    }
  })
}

interface ModalState {
  isOpen: boolean
  type: FinancialCategory
  mode: 'create' | 'edit'
  data?: Asset | Income | Liability | Expense
}

export interface FinancialDataManagementProps {
  selectedYear?: number
  onSelectYear?: (year: number) => void
  timelineYear?: TimelineYear
  isTimelineLoading?: boolean
  onSaveTimelineEdits?: (payload: TimelineEditRequest) => Promise<void>
}

export function FinancialDataManagement({
  selectedYear = 0,
  onSelectYear,
  timelineYear,
  isTimelineLoading = false,
  onSaveTimelineEdits,
}: FinancialDataManagementProps) {
  const usingTimeline = true
  const yearAssets = useMemo(() => timelineYear?.assets ?? [], [timelineYear?.assets])
  const yearLiabilities = useMemo(() => timelineYear?.liabilities ?? [], [timelineYear?.liabilities])
  const yearIncomes = useMemo(() => timelineYear?.income ?? [], [timelineYear?.income])
  const yearExpenses = useMemo(() => timelineYear?.expenses ?? [], [timelineYear?.expenses])

  const {
    addAsset,
    addIncome,
    addLiability,
    addExpense,
    updateAsset,
    updateIncome,
    updateLiability,
    updateExpense,
    deleteAsset,
    deleteIncome,
    deleteLiability,
    deleteExpense,
    refresh,
  } = useFinancialDataContext()

  const { events: scenarioEvents } = useScenarioEvents()

  const [modalState, setModalState] = useState<ModalState>({
    isOpen: false,
    type: 'asset',
    mode: 'create',
  })
  const [activeAnnualizationId, setActiveAnnualizationId] = useState<string | null>(null)
  const [assetLinks, setAssetLinks] = useState<Record<string, PropertyLinkRecord[]>>({})
  const [liabilityLinks, setLiabilityLinks] = useState<Record<string, PropertyLinkRecord[]>>({})
  const [sortDirections, setSortDirections] = useState<Record<FinancialCategory, 'asc' | 'desc'>>({
    asset: 'desc',
    income: 'desc',
    liability: 'desc',
    expense: 'desc',
  })
  const [expandedScenarioItems, setExpandedScenarioItems] = useState<Set<string>>(new Set())

  const toggleScenarioExpanded = (itemId: string) => {
    setExpandedScenarioItems((prev) => {
      const next = new Set(prev)
      if (next.has(itemId)) next.delete(itemId)
      else next.add(itemId)
      return next
    })
  }
  const mergedLinks = (() => {
    const map: Record<string, PropertyLinkRecord> = {}
    const add = (id: string | undefined, link: PropertyLinkRecord) => {
      if (!id) return
      if (!map[id]) map[id] = link
    }
    Object.entries(assetLinks).forEach(([itemId, links]) => {
      links.forEach(link => {
        add(itemId, link)
        add(link.assetId, link)
        add(link.liabilityId, link)
      })
    })
    Object.entries(liabilityLinks).forEach(([itemId, links]) => {
      links.forEach(link => {
        add(itemId, link)
        add(link.assetId, link)
        add(link.liabilityId, link)
      })
    })
    return map
  })()
  const firstLink = Object.values(mergedLinks)[0] ?? null
  const [isPropertyPlannerOpen, setIsPropertyPlannerOpen] = useState(false)
  const [prefill, setPrefill] = useState<{ scenarioId?: string; assetId?: string; liabilityId?: string } | null>(null)
  const formatYearLabel = (year: number) => (year === 0 ? 'BASE' : `Year ${year}`)

  const getItemId = (
    entry?: { id?: string; item_id?: string; itemId?: string; parent_id?: string; parentId?: string } | null
  ) =>
    entry?.id ??
    (entry as any)?.item_id ??
    (entry as any)?.itemId ??
    (entry as any)?.parent_id ??
    (entry as any)?.parentId ??
    ''

  useEffect(() => {
    const fetchLinks = async () => {
      try {
        // Fetch all assets and liabilities once at the beginning
        const [allAssets, allLiabilities] = await Promise.all([
          financialApi.listAssets(),
          financialApi.listLiabilities()
        ])

        // Create maps for quick lookup
        const assetsByParentId = new Map(allAssets.map(a => [a.parentId, a]))
        const liabilitiesByParentId = new Map(allLiabilities.map(l => [l.parentId, l]))

        // Fetch asset links
        const assetResults: Record<string, PropertyLinkRecord[]> = {}
        await Promise.all(
          yearAssets.map(async (asset) => {
            const assetId = getItemId(asset)
            if (!assetId) return

            // First try with the timeline item_id
            let links = await financialApi.listPropertyLinksByAsset(assetId)

            // If no links found, try to find the actual asset using this as parent_id
            if (links.length === 0) {
              const actualAsset = assetsByParentId.get(assetId)
              if (actualAsset) {
                links = await financialApi.listPropertyLinksByAsset(actualAsset.id)
              }
            }

            assetResults[assetId] = links
          })
        )
        setAssetLinks(assetResults)

        // Fetch liability links
        const liabilityResults: Record<string, PropertyLinkRecord[]> = {}
        await Promise.all(
          yearLiabilities.map(async (liability) => {
            const liabilityId = getItemId(liability)
            if (!liabilityId) return

            // First try with the timeline item_id
            let links = await financialApi.listPropertyLinksByLiability(liabilityId)

            // If no links found, try to find the actual liability using this as parent_id
            if (links.length === 0) {
              const actualLiability = liabilitiesByParentId.get(liabilityId)
              if (actualLiability) {
                links = await financialApi.listPropertyLinksByLiability(actualLiability.id)
              }
            }

            liabilityResults[liabilityId] = links
          })
        )
        setLiabilityLinks(liabilityResults)
      } catch (error) {
        console.error('Failed to fetch property links', error)
      }
    }
    if (yearAssets.length || yearLiabilities.length) {
      void fetchLinks()
    } else {
      setAssetLinks({})
      setLiabilityLinks({})
    }
  }, [yearAssets, yearLiabilities])

  const handleAddItem = (category: FinancialCategory) => {
    setModalState({
      isOpen: true,
      type: category,
      mode: 'create',
      data: undefined,
    })
  }

  const handleEditItem = (category: FinancialCategory, entry: Asset | Income | Liability | Expense) => {
    const normalizedEntry = (() => {
      const id = getItemId(entry)
      if (!id) return entry
      if ('id' in entry && entry.id === id) return entry
      return { ...(entry as any), id } as Asset | Income | Liability | Expense
    })()
    setModalState({
      isOpen: true,
      type: category,
      mode: 'edit',
      data: normalizedEntry,
    })
  }

  const handleDeleteItem = async (category: FinancialCategory, id: string) => {
    try {
      // For timeline mode, we need to handle deletion differently
      // Timeline items cannot be deleted directly via API
      if (usingTimeline && timelineYear) {
        const resolveFrequency = (item: any): TimelineFrequency =>
          (item.sourceFrequency ?? item.source_frequency ?? item.frequency ?? 'annual') as TimelineFrequency

        const currentItems = (() => {
          switch (category) {
            case 'asset':
              return yearAssets
            case 'liability':
              return yearLiabilities
            case 'income':
              return yearIncomes
            case 'expense':
              return yearExpenses
            default:
              return []
          }
        })()

        const target = currentItems.find(item => getItemId(item) === id)
        if (!target) {
          console.warn('Timeline item not found for delete', { category, id })
          return
        }

        // Save the updated timeline
        if (onSaveTimelineEdits) {
          await onSaveTimelineEdits({
            year: selectedYear,
            edits: [
              {
                itemId: getItemId(target),
                itemType: category as TimelineItemType,
                category: target.category ?? 'other',
                amount: 0,
                frequency: resolveFrequency(target),
              },
            ],
            note: `Removed ${category}`,
          })
        }
      } else {
        // Original non-timeline deletion logic
        switch (category) {
          case 'asset':
            await deleteAsset(id)
            break
          case 'liability':
            await deleteLiability(id)
            break
          case 'income':
            await deleteIncome(id)
            break
          case 'expense':
            await deleteExpense(id)
            break
        }
        await refresh()
      }
    } catch (error) {
      console.error(`Failed to delete ${category}:`, error)
    }
  }


  const handleModalClose = () => {
    setModalState((prev) => ({ ...prev, isOpen: false, data: undefined }))
  }

  const handleModalSave = async (payload: FinancialFormValues, mode: 'create' | 'edit') => {
    const timestamp = ('updatedAt' in payload ? payload.updatedAt : null) ?? new Date().toISOString()

    if (usingTimeline && onSaveTimelineEdits) {
      const mapFrequency = (freq: any): TimelineEdit['frequency'] => {
        if (freq === 'yearly') return 'annual'
        return freq ?? 'annual'
      }

      const itemId =
        getItemId(payload as any) || getItemId(modalState.data as any)

      const amount =
        'currentValue' in payload
          ? Math.round(payload.currentValue)
          : 'currentBalance' in payload
            ? Math.round(payload.currentBalance)
            : 'amount' in payload
              ? Math.round((payload as any).amount)
              : 0

      const edit: TimelineEdit = {
        itemId: itemId || undefined,
        name:
          payload.type === 'income'
            ? (payload as any).source ?? ('name' in payload ? payload.name : '')
            : payload.type === 'expense'
              ? (payload as any).payee ?? ('name' in payload ? payload.name : '')
              : 'name' in payload ? payload.name : '',
        itemType: payload.type === 'cpf' ? 'asset' : (payload.type as any),
        category: (payload as any).category ?? '',
        amount,
        frequency: mapFrequency((payload as any).frequency),
      }

      const request: TimelineEditRequest = {
        year: selectedYear,
        edits: [edit],
      }
      await onSaveTimelineEdits(request)
      handleModalClose()
      return
    }

    switch (payload.type) {
      case 'cpf': {
        await Promise.all(
          payload.accounts.map(account =>
            addAsset({
              name: account.name,
              category: account.category,
              currentValue: account.currentValue,
              annualGrowthRate: account.annualGrowthRate,
              notes: account.notes ?? undefined,
            })
          )
        )
        await refresh()
        break
      }
      case 'asset': {
        const { type: _type, id: _id, updatedAt: _updatedAt, ...values } = payload
        if (mode === 'edit' && modalState.data) {
          const targetId = getItemId(modalState.data)
          if (!targetId) throw new Error('Unable to update asset: missing item id')
          await updateAsset(targetId, { ...values, updatedAt: timestamp })
        } else {
          await addAsset(values)
        }
        break
      }
      case 'income': {
        const { type: _type, id: _id, updatedAt: _updatedAt, ...values } = payload
        if (mode === 'edit' && modalState.data) {
          const targetId = getItemId(modalState.data)
          if (!targetId) throw new Error('Unable to update income: missing item id')
          await updateIncome(targetId, { ...values, updatedAt: timestamp })
        } else {
          await addIncome(values)
        }
        break
      }
      case 'liability': {
        const { type: _type, id: _id, updatedAt: _updatedAt, ...values } = payload
        if (mode === 'edit' && modalState.data) {
          const targetId = getItemId(modalState.data)
          if (!targetId) throw new Error('Unable to update liability: missing item id')
          await updateLiability(targetId, { ...values, updatedAt: timestamp })
        } else {
          await addLiability(values)
        }
        break
      }
      case 'expense': {
        const { type: _type, id: _id, updatedAt: _updatedAt, ...values } = payload
        if (mode === 'edit' && modalState.data) {
          const targetId = getItemId(modalState.data)
          if (!targetId) throw new Error('Unable to update expense: missing item id')
          await updateExpense(targetId, { ...values, updatedAt: timestamp })
        } else {
          await addExpense(values)
        }
        break
      }
    }

    handleModalClose()
  }

  const handleModalDelete = async (id: string) => {
    await handleDeleteItem(modalState.type, id)
    handleModalClose()
  }

  const getDataForCategory = (category: FinancialCategory) => {
    switch (category) {
      case 'asset':
        return yearAssets
      case 'income':
        return yearIncomes
      case 'liability':
        return yearLiabilities
      case 'expense':
        return yearExpenses
    }
  }

  const formatCountLabel = (count: number, config: CategoryConfig) => {
    const noun = count === 1 ? config.singular : config.plural
    return `${count} ${noun}`
  }

  const sortItems = (items: any[], direction: 'asc' | 'desc') =>
    [...items].sort((a, b) =>
      direction === 'desc' ? summarizeAmount(b) - summarizeAmount(a) : summarizeAmount(a) - summarizeAmount(b)
    )

  const summarizeAmount = (item: any) => {
    if ('adjAnnualAmt' in item) return item.adjAnnualAmt ?? item.amountAnnual ?? 0
    if ('adj_annual_amt' in item) return item.adj_annual_amt ?? item.amount_annual ?? 0
    if ('amountAnnual' in item) return item.amountAnnual ?? 0
    if ('amount_annual' in item) return item.amount_annual ?? 0
    if ('currentValue' in item) return item.currentValue
    if ('currentBalance' in item) return item.currentBalance
    return item.amount ?? 0
  }

  const getDisplayAmount = (item: any) =>
    item?.adjAnnualAmt ??
    item?.adj_annual_amt ??
    item?.amountAnnual ??
    item?.amount_annual ??
    summarizeAmount(item) ??
    0

  const getAnnualizationLabel = (item: any) => {
    const sourceAmount = item?.sourceAmount ?? item?.source_amount
    const sourceFrequency = item?.sourceFrequency ?? item?.source_frequency
    if (!sourceAmount || !sourceFrequency || sourceFrequency === 'annual') return null
    return `Annualized from ${formatCurrency(Number(sourceAmount), 'en-US', '$')} ${sourceFrequency}`
  }

  const getNetWorthForYear = () => {
    if ((timelineYear as any)?.netWorth !== undefined) return Math.round((timelineYear as any).netWorth)
    if (timelineYear?.net_worth !== undefined) return Math.round(timelineYear.net_worth)
    return 0
  }

  const getMonthlySavingsForYear = () => {
    // Fall back to zero if timeline lacks P&L breakdown; use income/expenses annualized.
    const totalIncome = yearIncomes.reduce((sum, it) => sum + (summarizeAmount(it) ?? 0), 0)
    const totalExpenses = yearExpenses.reduce((sum, it) => sum + (summarizeAmount(it) ?? 0), 0)
    return Math.round(Math.max((totalIncome - totalExpenses) / 12, 0))
  }

  const openPlannerFromLink = (link: PropertyLinkRecord) => {
    setPrefill({
      scenarioId: link.propertyScenarioId,
      assetId: link.assetId,
      liabilityId: link.liabilityId,
    })
    setIsPropertyPlannerOpen(true)
  }

  const handleYearInput = (value: string) => {
    const parsed = Number.parseInt(value, 10)
    if (Number.isNaN(parsed)) return
    const clamped = Math.max(0, Math.min(30, parsed))
    onSelectYear?.(clamped)
  }

  return (
    <>
      <div id="financial-data-section" className="flex h-full flex-col border-0 bg-midnight-900 text-white">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-white">Financial Data</h3>
              <p className="text-sm text-gray-400">
                Manage your income, expenses, assets, and liabilities
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-300">
              <label className="hidden sm:block text-gray-400" htmlFor="year-selector">
                Year
              </label>
              <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-transparent px-2 py-1">
                <select
                  id="year-selector"
                  className="w-24 rounded-md border border-white/10 bg-[#0f172a]/60 px-2 py-1 text-sm text-white focus:border-blue-400 focus:outline-none"
                  value={selectedYear}
                  disabled={isTimelineLoading}
                  onChange={(event) => handleYearInput(event.target.value)}
                >
                  {Array.from({ length: 31 }, (_, idx) => (
                    <option key={idx} value={idx}>
                      {idx}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-auto px-6 py-6">
          <div className="flex h-full flex-col gap-6">
            <div className="grid flex-1 content-stretch gap-6 auto-rows-[1fr] lg:grid-cols-2">
            {(Object.keys(categoryConfig) as FinancialCategory[]).map(
              (key) => {
                const config = categoryConfig[key]
                const direction = sortDirections[key]
                const data = sortItems(getDataForCategory(key), direction)
                const hasData = data.length > 0
                const description = hasData
                  ? formatCountLabel(data.length, config)
                  : config.emptyDescription

                return (
                  <div
                    key={key}
                    className="flex h-full w-full min-w-0 flex-col rounded-2xl bg-white/5 shadow-lg"
                  >
                    <div className="p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <div
                            className={`flex h-10 w-10 items-center justify-center rounded-full ${config.accent}`}
                          >
                            <span className="text-lg">{config.icon}</span>
                          </div>
                          <div className="min-w-0">
                            <h4 className="truncate text-base font-semibold text-white">
                              {config.title}
                            </h4>
                            <p className="text-xs text-gray-400">
                              {description}
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-shrink-0 items-center gap-2">
                          <button
                            type="button"
                            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/5 text-gray-300 transition hover:bg-white/10"
                            aria-label={`Sort ${direction === 'desc' ? 'high to low' : 'low to high'}`}
                            onClick={() =>
                              setSortDirections((prev) => ({
                                ...prev,
                                [key]: prev[key] === 'desc' ? 'asc' : 'desc',
                              }))
                            }
                          >
                            <ArrowDownWideNarrow
                              className={`h-4 w-4 ${direction === 'desc' ? 'text-blue-200' : 'rotate-180 text-blue-200'}`}
                            />
                          </button>
                          {/* <button
                            onClick={() => handleSettings(key)}
                            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/5 text-gray-300 transition hover:bg-white/10 disabled:opacity-50"
                            type="button"
                            disabled={usingTimeline}
                          >
                            <SlidersHorizontal className="h-4 w-4" />
                          </button> */}
                          <button
                            onClick={() => handleAddItem(key)}
                            className="flex h-8 w-8 items-center justify-center rounded-full text-grey-500 bg-white/5 transition hover:bg-white/10 disabled:opacity-50"
                            type="button"
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-1 flex-col justify-start gap-3 px-4 py-6 text-gray-300">
                      {hasData ? (
                        <div className="space-y-2 text-left text-sm max-h-64 overflow-auto pr-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                          {data.map((item: any, index) => {
                            const itemId = getItemId(item) || `${key}-${index}`
                            const scenarioImpacts = getAppliedImpacts(item, key as ScenarioTargetType, scenarioEvents)
                            const hasScenarios = scenarioImpacts.length > 0
                            const isExpanded = expandedScenarioItems.has(itemId)

                            return (
                              <div key={itemId}>
                                {/* Main line item row */}
                                <div className="group/item relative flex items-center justify-between gap-3 overflow-hidden rounded-md px-2 py-1 text-gray-200">
                                  <div className="flex min-w-0 items-center gap-2">
                                    <span className="truncate text-sm">
                                      {'name' in item
                                        ? item.name
                                        : 'source' in item
                                        ? item.source
                                        : 'payee' in item
                                        ? item.payee
                                        : 'Entry'}
                                    </span>
                                    {/* Indicators aligned immediately after label */}
                                    {hasScenarios && <span className="h-2 w-2 flex-shrink-0 rounded-full bg-amber-400" />}
                                    {getAnnualizationLabel(item) && (
                                      <Tooltip.Provider delayDuration={0}>
                                        <Tooltip.Root
                                          open={activeAnnualizationId === (item.id ?? `${key}-${index}`)}
                                          onOpenChange={(open) => {
                                            const id = item.id ?? `${key}-${index}`
                                            setActiveAnnualizationId(open ? id : null)
                                          }}
                                          disableHoverableContent
                                        >
                                          <Tooltip.Trigger asChild>
                                            <button
                                              type="button"
                                              onClick={() => {
                                                const id = item.id ?? `${key}-${index}`
                                                setActiveAnnualizationId((prev) => (prev === id ? null : id))
                                              }}
                                              className="flex h-4 w-4 items-center justify-center rounded-full text-gray-400 transition hover:text-white"
                                                aria-label="Show annualized source"
                                              >
                                                <Info className="h-3.5 w-3.5" />
                                              </button>
                                          </Tooltip.Trigger>
                                          <Tooltip.Content
                                            side="top"
                                            sideOffset={6}
                                            className="z-50 rounded-md bg-black px-2 py-1 text-xs text-white shadow-lg"
                                          >
                                            {getAnnualizationLabel(item)}
                                          </Tooltip.Content>
                                        </Tooltip.Root>
                                      </Tooltip.Provider>
                                    )}
                                    {/* Caret after indicators */}
                                    {hasScenarios && (
                                      <button
                                        type="button"
                                        onClick={() => toggleScenarioExpanded(itemId)}
                                        className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded text-gray-400 transition hover:bg-white/10 hover:text-white"
                                        aria-label={isExpanded ? 'Collapse scenarios' : 'Expand scenarios'}
                                      >
                                        <ChevronRight className={`h-3.5 w-3.5 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                                      </button>
                                    )}
                                    {key !== 'income' && key !== 'expense' && (() => {
                                      const id = getItemId(item)
                                      if (!id) return null
                                      let link =
                                        mergedLinks[id] ??
                                        (key === 'asset'
                                          ? (assetLinks[id]?.[0] ?? null)
                                          : (liabilityLinks[id]?.[0] ?? null))
                                      if (!link && firstLink) {
                                        const onlyOneItemInCategory = data.length === 1
                                        if (onlyOneItemInCategory) {
                                          link = firstLink
                                        }
                                      }
                                      if (!link) return null
                                      return (
                                        <button
                                          type="button"
                                          onClick={() => openPlannerFromLink(link)}
                                          className="flex h-6 w-6 items-center justify-center rounded-full bg-white/10 text-blue-100 transition hover:bg-white/20"
                                          title="Open property scenario"
                                        >
                                          <Home className="h-4 w-4" />
                                        </button>
                                      )
                                    })()}
                                  </div>
                                  <div className="relative flex items-center gap-2">
                                    <span className="text-sm text-gray-400 transition-opacity duration-200 group-hover/item:opacity-0">
                                      {formatCurrency(item.adjAnnualAmt ?? item.adj_annual_amt ?? getDisplayAmount(item))}
                                    </span>
                                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center gap-2 opacity-0 transition-opacity duration-200 group-hover/item:pointer-events-auto group-hover/item:opacity-100">
                                      <button
                                        onClick={() => handleEditItem(key, item)}
                                        className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-xs text-gray-200 transition hover:bg-white/20"
                                        type="button"
                                      >
                                        <Pencil className="h-3.5 w-3.5" />
                                      </button>
                                      <button
                                        onClick={() => {
                                          const id = getItemId(item)
                                          if (id) void handleDeleteItem(key, id)
                                        }}
                                        className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-xs text-gray-200 transition hover:bg-rose-500/30 hover:text-rose-50"
                                        type="button"
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </button>
                                    </div>
                                  </div>
                                </div>

                                {/* Expanded scenario impacts */}
                                    {isExpanded && (
                                      <div className="space-y-1">
                                    <div className="flex w-full items-center justify-between rounded pl-4 pr-2 py-1.5 text-sm text-gray-300">
                                          <div className="flex items-center gap-2">
                                            <span className="text-xs italic">Original</span>
                                          </div>
                                          <span className="text-xs italic">
                                            {formatCurrency(item.amountAnnual ?? (item as any).amount_annual ?? 0)}
                                          </span>
                                        </div>
                                        {scenarioImpacts.map(({ event, impact }) => {
                                          const Icon = getIconByName(event.displayIcon ?? '')
                                          const isDisabled = !event.isIncluded
                                          return (
                                            <button
                                              key={`${event.id}-${impact.targetId}`}
                                              type="button"
                                              onClick={() => {
                                            // TODO: Open scenario modal for editing
                                            console.log('Edit scenario:', event)
                                          }}
                                              className={`flex w-full items-center justify-between rounded pl-4 pr-2 py-1.5 text-sm transition hover:bg-white/5 ${
                                                isDisabled ? 'opacity-50' : ''
                                              }`}
                                            >
                                              <div className="flex items-center gap-2">
                                                <span className={`text-xs italic ${isDisabled ? 'line-through' : ''}`}>
                                                  {event?.name ?? 'Scenario'}
                                                </span>
                                                {Icon ? (
                                                  <Icon
                                                    className="h-3.5 w-3.5 flex-shrink-0"
                                                    style={{ color: event?.displayColor ?? '#888' }}
                                                  />
                                                ) : (
                                                  <span
                                                    className="flex h-3.5 w-3.5 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
                                                    style={{ backgroundColor: event?.displayColor ?? '#888' }}
                                                  >
                                                    {(event?.displayIcon ?? '?').slice(0, 1).toUpperCase()}
                                                  </span>
                                                )}
                                              </div>
                                              <div className="flex items-center gap-2">
                                                {(() => {
                                                  const impactAmt =
                                                    (impact as any).amountAnnual ??
                                                    (impact as any).amount_annual ??
                                                    (typeof impact.amount === 'number' ? impact.amount : 0)
                                                  const impactClass = impactAmt < 0 ? 'text-rose-400' : 'text-emerald-400'
                                                  return (
                                                    <span className={`text-xs italic ${impactClass}`}>
                                                      {formatCurrency(impactAmt)}
                                                    </span>
                                                  )
                                                })()}
                                              </div>
                                            </button>
                                          )
                                        })}
                                      </div>
                                    )}
                              </div>
                            )
                          })}
                          {data.length > 3 && (
                            <p className="text-xs text-gray-500">
                              +{data.length - 3} more
                            </p>
                          )}
                        </div>
                      ) : (
                        <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
                          <p className="text-sm">{config.emptyDescription}</p>
                          <p className="text-xs text-gray-500">
                            Click the + button to add your first entry
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )
              }
            )}
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="rounded-2xl bg-white/5 p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-semibold text-white">Net Worth</h4>
                    <p className="text-xs text-gray-400">
                      Assets minus liabilities
                    </p>
                  </div>
                  <div className="h-2 w-2 rounded-full bg-blue-400" />
                </div>
                <p className="mt-4 text-xl font-bold text-white">
                  {formatCurrency(getNetWorthForYear())}
                </p>
              </div>
              <div className="rounded-2xl bg-white/5 p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-semibold text-white">
                      Savings
                    </h4>
                    <p className="text-xs text-gray-400">
                      Income minus expenses
                    </p>
                  </div>
                  <div className="h-2 w-2 rounded-full bg-emerald-400" />
                </div>
                <p className="mt-4 text-2xl font-bold text-white">
                  {formatCurrency(getMonthlySavingsForYear())}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <FinancialFormModal
        mode={modalState.mode}
        data={modalState.data}
        isOpen={modalState.isOpen}
        onClose={handleModalClose}
        onSave={handleModalSave}
        type={modalState.type}
        selectedYear={selectedYear}
        selectedYearLabel={formatYearLabel(selectedYear)}
        onDelete={
          modalState.mode === 'edit' && getItemId(modalState.data) ? handleModalDelete : undefined
        }
      />
      <PropertyPlannerModal
        isOpen={isPropertyPlannerOpen}
        onClose={() => {
          setIsPropertyPlannerOpen(false)
          setPrefill(null)
        }}
        prefill={prefill ?? undefined}
      />
    </>
  )
}
