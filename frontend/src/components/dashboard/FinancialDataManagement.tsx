import { useEffect, useState, useMemo } from 'react'
import { Plus, Pencil, Trash2, Home, Info, ArrowDownWideNarrow, ChevronRight, Star, ArrowUpRight, ArrowDownRight, Wallet, TrendingUp, CreditCard, Activity } from 'lucide-react'
import * as LucideIcons from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import * as Tooltip from '@radix-ui/react-tooltip'

import { useFinancialDataContext } from '@/contexts/FinancialDataContext'
import { useScenarioEvents } from '@/hooks/useScenarioEvents'
import {
  useCashAccountsQuery,
  useCreateCashAccountMutation,
  useUpdateCashAccountMutation,
  useDeleteCashAccountMutation,
  useSetAccumulatorMutation,
} from '@/hooks/queries'
import type { Asset, Expense, Income, Liability, CashAccount } from '../../types/financial'
import type { ScenarioEvent, ScenarioTargetType } from '@/types/scenario'
import type { PropertyLinkRecord } from '../../types/property'
import type { FinancialDataType, FinancialFormValues } from '../modals/FinancialFormModal'
import { FinancialFormModal } from '../modals/FinancialFormModal'
import { CashAccountFormModal } from '../modals/CashAccountFormModal'
import { PropertyPlannerModal } from '../modals/PropertyPlannerModal'
import { financialApi } from '@/services/financialApi'
import type { TimelineYear, TimelineMonth, TimeResolution, TimelineEditRequest, TimelineEdit, TimelineItemType, TimelineFrequency, TimelineItem, TimelineEventImpact } from '@/types/timeline'
import { formatCurrency } from '@/lib/format'
import type { ZoomLevel } from '@/components/timeline/ZoomControls'

type FinancialCategory = FinancialDataType

type CategoryConfig = {
  title: string
  emptyDescription: string
  icon: LucideIcon
  accent: string
  gradientBg: string
  textColor: string
  progressColor: string
  singular: string
  plural: string
  helper?: string
}

const categoryConfig: Record<FinancialCategory, CategoryConfig> = {
  asset: {
    title: 'Assets',
    emptyDescription: 'No assets added yet',
    icon: Wallet,
    accent: 'bg-emerald-500',
    gradientBg: 'bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 border-emerald-500/20',
    textColor: 'text-emerald-400',
    progressColor: 'bg-emerald-500',
    singular: 'asset',
    plural: 'assets',
  },
  income: {
    title: 'Annual Income',
    emptyDescription: 'No income added yet',
    icon: TrendingUp,
    accent: 'bg-blue-500',
    gradientBg: 'bg-gradient-to-br from-blue-500/20 to-blue-500/5 border-blue-500/20',
    textColor: 'text-blue-400',
    progressColor: 'bg-blue-500',
    singular: 'income',
    plural: 'income',
  },
  liability: {
    title: 'Liabilities',
    emptyDescription: 'No liabilities added yet',
    icon: CreditCard,
    accent: 'bg-rose-500',
    gradientBg: 'bg-gradient-to-br from-rose-500/20 to-rose-500/5 border-rose-500/20',
    textColor: 'text-rose-400',
    progressColor: 'bg-rose-500',
    singular: 'liability',
    plural: 'liabilities',
  },
  expense: {
    title: 'Annual Expenses',
    emptyDescription: 'No expenses added yet',
    icon: Activity,
    accent: 'bg-amber-500',
    gradientBg: 'bg-gradient-to-br from-amber-500/20 to-amber-500/5 border-amber-500/20',
    textColor: 'text-amber-400',
    progressColor: 'bg-amber-500',
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

/** Result of looking up scenario impacts on a timeline item */
interface AppliedImpact {
  event: ScenarioEvent | null
  impact: TimelineEventImpact
}

/** Helper to find scenario impacts for a financial item */
function getAppliedImpacts(
  item: TimelineItem,
  _itemType: ScenarioTargetType,
  scenarioEvents: ScenarioEvent[]
): AppliedImpact[] {
  const applied = item.eventImpacts
  if (!applied || applied.length === 0) return []
  return applied.map((imp) => {
    const event = scenarioEvents.find((ev) => ev.id === imp.eventId) ?? null
    return { event, impact: imp }
  })
}

/** Union type for any editable financial item (from timeline or raw API) */
type EditableFinancialItem = Asset | Income | Liability | Expense | TimelineItem

interface ModalState {
  isOpen: boolean
  type: FinancialCategory
  mode: 'create' | 'edit'
  data?: EditableFinancialItem
}

export interface FinancialDataManagementProps {
  selectedYear?: number
  onSelectYear?: (year: number) => void
  selectedMonth?: number
  onSelectMonth?: (month: number | null) => void
  timelineYear?: TimelineYear
  timelineMonth?: TimelineMonth
  resolution?: TimeResolution
  zoomLevel?: ZoomLevel
  isTimelineLoading?: boolean
  onSaveTimelineEdits?: (payload: TimelineEditRequest) => Promise<void>
}

export function FinancialDataManagement({
  selectedYear = 0,
  onSelectYear,
  selectedMonth,
  onSelectMonth,
  timelineYear,
  timelineMonth,
  resolution,
  isTimelineLoading = false,
  onSaveTimelineEdits,
}: FinancialDataManagementProps) {
  const usingTimeline = true
  const [viewMode, setViewMode] = useState<'annualized' | 'monthly'>('annualized')

  // Determine if we should show monthly data
  const showMonthlyData = viewMode === 'monthly' && resolution === 'monthly' && timelineMonth

  // Use monthly data if a month is selected, otherwise use yearly data
  const timelineAssets = useMemo(() =>
    showMonthlyData ? (timelineMonth?.assets ?? []) : (timelineYear?.assets ?? []),
    [showMonthlyData, timelineMonth?.assets, timelineYear?.assets]
  )
  const timelineCashAccounts = useMemo(() =>
    showMonthlyData ? (timelineMonth?.cashAccounts ?? []) : (timelineYear?.cashAccounts ?? []),
    [showMonthlyData, timelineMonth?.cashAccounts, timelineYear?.cashAccounts]
  )
  // Merge assets and cash accounts for display - cash accounts appear as assets
  const yearAssets = useMemo(() => [...timelineAssets, ...timelineCashAccounts], [timelineAssets, timelineCashAccounts])
  const yearLiabilities = useMemo(() =>
    showMonthlyData ? (timelineMonth?.liabilities ?? []) : (timelineYear?.liabilities ?? []),
    [showMonthlyData, timelineMonth?.liabilities, timelineYear?.liabilities]
  )
  const yearIncomes = useMemo(() =>
    showMonthlyData ? (timelineMonth?.income ?? []) : (timelineYear?.income ?? []),
    [showMonthlyData, timelineMonth?.income, timelineYear?.income]
  )
  const yearExpenses = useMemo(() =>
    showMonthlyData ? (timelineMonth?.expenses ?? []) : (timelineYear?.expenses ?? []),
    [showMonthlyData, timelineMonth?.expenses, timelineYear?.expenses]
  )

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

  // Cash accounts
  const { data: cashAccounts = [] } = useCashAccountsQuery()
  const createCashAccountMutation = useCreateCashAccountMutation()
  const updateCashAccountMutation = useUpdateCashAccountMutation()
  const deleteCashAccountMutation = useDeleteCashAccountMutation()
  const setAccumulatorMutation = useSetAccumulatorMutation()

  // Cash account modal state
  const [cashAccountModalState, setCashAccountModalState] = useState<{
    isOpen: boolean
    mode: 'create' | 'edit'
    data?: CashAccount
  }>({ isOpen: false, mode: 'create' })

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
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null)

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

  type ItemWithId = { id?: string; itemId?: string; parentId?: string } | TimelineItem | Asset | Income | Liability | Expense | null | undefined

  const getItemId = (entry: ItemWithId): string => {
    if (!entry) return ''
    if ('id' in entry && entry.id) return entry.id
    if ('itemId' in entry && entry.itemId) return entry.itemId
    if ('parentId' in entry && entry.parentId) return entry.parentId
    return ''
  }

  useEffect(() => {
    const fetchLinks = async () => {
      try {
        // Fetch all property links in a single API call (limit: -1 means no limit)
        const allLinksResult = await financialApi.listAllPropertyLinks({ limit: -1 })
        const allLinks = allLinksResult.data

        // Also fetch assets/liabilities for parent_id mapping (limit: -1 means no limit)
        const [assetsResult, liabilitiesResult] = await Promise.all([
          financialApi.listAssets({ limit: -1 }),
          financialApi.listLiabilities({ limit: -1 })
        ])

        // Create maps for quick lookup: id -> parentId
        const assetIdToParentId = new Map(assetsResult.data.map(a => [a.id, a.parentId]))
        const liabilityIdToParentId = new Map(liabilitiesResult.data.map(l => [l.id, l.parentId]))

        // Build asset links map: group links by assetId (and also by parentId for timeline items)
        const assetResults: Record<string, PropertyLinkRecord[]> = {}
        const liabilityResults: Record<string, PropertyLinkRecord[]> = {}

        for (const link of allLinks) {
          // Map by asset ID
          if (!assetResults[link.assetId]) {
            assetResults[link.assetId] = []
          }
          assetResults[link.assetId].push(link)

          // Also map by parent ID if different (for timeline items that use parentId)
          const assetParentId = assetIdToParentId.get(link.assetId)
          if (assetParentId && assetParentId !== link.assetId) {
            if (!assetResults[assetParentId]) {
              assetResults[assetParentId] = []
            }
            assetResults[assetParentId].push(link)
          }

          // Map by liability ID
          if (!liabilityResults[link.liabilityId]) {
            liabilityResults[link.liabilityId] = []
          }
          liabilityResults[link.liabilityId].push(link)

          // Also map by parent ID if different
          const liabilityParentId = liabilityIdToParentId.get(link.liabilityId)
          if (liabilityParentId && liabilityParentId !== link.liabilityId) {
            if (!liabilityResults[liabilityParentId]) {
              liabilityResults[liabilityParentId] = []
            }
            liabilityResults[liabilityParentId].push(link)
          }
        }

        setAssetLinks(assetResults)
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

  const handleEditItem = (category: FinancialCategory, entry: EditableFinancialItem) => {
    const normalizedEntry = (() => {
      const id = getItemId(entry)
      if (!id) return entry
      if ('id' in entry && entry.id === id) return entry
      // For TimelineItem, add id from itemId for modal compatibility
      return { ...entry, id } as EditableFinancialItem
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
        const resolveFrequency = (item: TimelineItem): TimelineFrequency =>
          item.sourceFrequency ?? 'annual'

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
      const mapFrequency = (freq: string | undefined): TimelineFrequency => {
        if (freq === 'yearly') return 'annual'
        if (freq === 'monthly' || freq === 'weekly' || freq === 'biweekly' || freq === 'quarterly' || freq === 'semiannual' || freq === 'annual') {
          return freq
        }
        return 'annual'
      }

      // Extract itemId from payload or modal data
      const payloadId = 'id' in payload ? payload.id : undefined
      const modalDataId = modalState.data ? getItemId(modalState.data) : undefined
      const itemId = payloadId || modalDataId

      // Extract amount based on payload type
      const amount = (() => {
        switch (payload.type) {
          case 'asset':
            return Math.round(payload.currentValue)
          case 'liability':
            return Math.round(payload.currentBalance)
          case 'income':
          case 'expense':
            return Math.round(payload.amount)
          case 'cpf':
            return 0 // CPF is handled separately
        }
      })()

      // Extract name based on payload type
      const name = (() => {
        switch (payload.type) {
          case 'asset':
          case 'liability':
            return payload.name
          case 'income':
            return payload.source
          case 'expense':
            return payload.payee
          case 'cpf':
            return ''
        }
      })()

      // Extract category and frequency based on payload type
      const category = payload.type !== 'cpf' ? payload.category : ''
      const frequency = payload.type === 'income' || payload.type === 'expense'
        ? mapFrequency(payload.frequency)
        : 'annual'

      const edit: TimelineEdit = {
        itemId: itemId || undefined,
        name,
        itemType: payload.type === 'cpf' ? 'asset' : payload.type,
        category,
        amount,
        frequency,
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

  const sortItems = (items: TimelineItem[], direction: 'asc' | 'desc'): TimelineItem[] =>
    [...items].sort((a, b) =>
      direction === 'desc' ? summarizeAmount(b) - summarizeAmount(a) : summarizeAmount(a) - summarizeAmount(b)
    )

  const summarizeAmount = (item: TimelineItem): number => {
    return item.adjAnnualAmt ?? item.amountAnnual ?? 0
  }

  const getDisplayAmount = (item: TimelineItem): number =>
    item.adjAnnualAmt ?? item.amountAnnual ?? 0

  const getAnnualizationLabel = (item: TimelineItem): string | null => {
    const sourceAmount = item.sourceAmount
    const sourceFrequency = item.sourceFrequency
    if (!sourceAmount || !sourceFrequency || sourceFrequency === 'annual') return null
    return `Annualized from ${formatCurrency(Number(sourceAmount), 'en-US', '$')} ${sourceFrequency}`
  }

  const getNetWorthForYear = () => {
    if (timelineYear?.netWorth !== undefined) return Math.round(timelineYear.netWorth)
    return 0
  }

  const getAnnualSavingsForYear = () => {
    // Use annualized income/expenses from timeline
    const totalIncome = yearIncomes.reduce((sum, it) => sum + (summarizeAmount(it) ?? 0), 0)
    const totalExpenses = yearExpenses.reduce((sum, it) => sum + (summarizeAmount(it) ?? 0), 0)
    return Math.round(totalIncome - totalExpenses)
  }

  const getCategoryTotal = (_category: FinancialCategory, data: TimelineItem[]): number => {
    return data.reduce((sum, item) => {
      const amount = item.adjAnnualAmt ?? item.amountAnnual ?? 0
      return sum + amount
    }, 0)
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
      <div
        id="financial-data-section"
        className="flex h-full flex-col bg-transparent text-white"
        onClick={(e) => {
          // Deselect when clicking outside of line items
          if (selectedItemId && (e.target as HTMLElement).closest('[data-line-item]') === null) {
            setSelectedItemId(null)
          }
        }}
      >
        <div className="px-6 py-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-white">Financial Data</h3>
              <p className="text-sm text-gray-400">
                Manage your income, expenses, assets, and liabilities
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs text-gray-300">              
              <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-transparent px-2 py-1">
                <label className="hidden text-gray-400 sm:block" htmlFor="year-selector">
                  Year
                </label>
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

              {resolution === 'monthly' && (
                <>
                  <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-transparent px-2 py-1">
                    <label className="hidden text-gray-400 sm:block" htmlFor="view-mode-selector">
                      View
                    </label>
                    <select
                      id="view-mode-selector"
                      className="rounded-md border border-white/10 bg-[#0f172a]/60 px-2 py-1 text-sm text-white focus:border-blue-400 focus:outline-none"
                      value={viewMode}
                      disabled={isTimelineLoading}
                      onChange={(event) => {
                        const mode = event.target.value as 'annualized' | 'monthly'
                        setViewMode(mode)
                      }}
                    >
                      <option value="annualized">Annualized</option>
                      <option value="monthly">Monthly</option>
                    </select>
                  </div>

                  {viewMode === 'monthly' && (
                    <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-transparent px-2 py-1">
                      <label className="hidden text-gray-400 sm:block" htmlFor="month-selector">
                        Month
                      </label>
                      <select
                        id="month-selector"
                        className="rounded-md border border-white/10 bg-[#0f172a]/60 px-2 py-1 text-sm text-white focus:border-blue-400 focus:outline-none"
                        value={selectedMonth ?? 1}
                        disabled={isTimelineLoading}
                        onChange={(event) => {
                          const month = Number(event.target.value)
                          onSelectMonth?.(month)
                        }}
                      >
                        <option value={1}>January</option>
                        <option value={2}>February</option>
                        <option value={3}>March</option>
                        <option value={4}>April</option>
                        <option value={5}>May</option>
                        <option value={6}>June</option>
                        <option value={7}>July</option>
                        <option value={8}>August</option>
                        <option value={9}>September</option>
                        <option value={10}>October</option>
                        <option value={11}>November</option>
                        <option value={12}>December</option>
                      </select>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-auto px-6 py-6">
          <div className="flex h-full flex-col gap-6">
            <div className="grid flex-1 content-stretch gap-4 auto-rows-[1fr] lg:grid-cols-2">
            {(Object.keys(categoryConfig) as FinancialCategory[]).map(
              (key) => {
                const config = categoryConfig[key]
                const direction = sortDirections[key]
                const data = sortItems(getDataForCategory(key), direction)
                const hasData = data.length > 0

                // Calculate a mock trend (in real app, compare to previous period)
                const categoryTotal = getCategoryTotal(key, data)
                const mockTrend = key === 'asset' ? 12.5 : key === 'income' ? 5.2 : key === 'liability' ? -2.1 : 1.2
                const isPositiveTrend = mockTrend >= 0
                const IconComponent = config.icon

                return (
                  <div
                    key={key}
                    className="flex w-full min-w-0 max-h-[350px] flex-col overflow-hidden rounded-2xl border border-white/[0.1] bg-[#0a0a0a]/60 transition-all hover:border-white/[0.15]"
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-white/[0.04] px-4 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <div className={`rounded-lg border p-1.5 ${config.gradientBg}`}>
                          <IconComponent className={`h-4 w-4 ${config.textColor}`} />
                        </div>
                        <h4 className="text-sm font-medium text-slate-200">{config.title}</h4>
                      </div>
                      <div className="flex items-center gap-0.5">
                        <button
                          type="button"
                          className="rounded-md p-1.5 text-slate-500 transition-colors hover:bg-white/5 hover:text-slate-300"
                          aria-label={`Sort ${direction === 'desc' ? 'high to low' : 'low to high'}`}
                          onClick={() =>
                            setSortDirections((prev) => ({
                              ...prev,
                              [key]: prev[key] === 'desc' ? 'asc' : 'desc',
                            }))
                          }
                        >
                          <ArrowDownWideNarrow
                            className={`h-4 w-4 ${direction === 'desc' ? '' : 'rotate-180'}`}
                          />
                        </button>
                        <button
                          onClick={() => handleAddItem(key)}
                          className="rounded-md p-1.5 text-slate-500 transition-colors hover:bg-white/5 hover:text-slate-300"
                          type="button"
                          title="Add Item"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    {/* Total & Trend */}
                    <div className="border-b border-white/[0.04] px-4 py-2.5">
                      <div className="text-2xl font-light tracking-tight text-slate-100">
                        {formatCurrency(categoryTotal)}
                      </div>
                      <div className="mt-1 flex items-center gap-2">
                        <div className={`flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${isPositiveTrend ? 'bg-emerald-500/15 text-emerald-400' : 'bg-rose-500/15 text-rose-400'}`}>
                          {isPositiveTrend ? <ArrowUpRight className="h-2.5 w-2.5" /> : <ArrowDownRight className="h-2.5 w-2.5" />}
                          {Math.abs(mockTrend)}%
                        </div>
                        <span className="text-[10px] text-slate-500">vs last month</span>
                      </div>
                    </div>

                    {/* List Items */}
                    <div className="scrollbar-hide flex-1 overflow-y-auto px-3 py-2">
                        {hasData ? (
                          <>
                          {data.map((item: any, index) => {
                            const itemId = getItemId(item) || `${key}-${index}`
                            const scenarioImpacts = getAppliedImpacts(item, key as ScenarioTargetType, scenarioEvents)
                            const hasScenarios = scenarioImpacts.length > 0
                            const isExpanded = expandedScenarioItems.has(itemId)

                            const isSelected = selectedItemId === itemId

                            return (
                              <div key={itemId}>
                                {/* Main line item row */}
                                <div
                                  data-line-item
                                  onClick={() => setSelectedItemId(isSelected ? null : itemId)}
                                  onDoubleClick={() => {
                                    const id = getItemId(item)
                                    if (item.itemType === 'cash_account') {
                                      const cashAccount = cashAccounts.find(ca => ca.id === id)
                                      if (cashAccount) {
                                        setCashAccountModalState({ isOpen: true, mode: 'edit', data: cashAccount })
                                      }
                                    } else {
                                      handleEditItem(key, item)
                                    }
                                  }}
                                  className={`group/item relative flex cursor-default items-center justify-between rounded-lg px-2 py-2 transition-colors ${isSelected ? 'bg-white/[0.08]' : 'hover:bg-white/[0.04]'}`}
                                >
                                  {/* Left side: name */}
                                  <div className="flex min-w-0 items-center gap-2">
                                    <span className={`truncate text-sm transition-colors ${isSelected ? 'text-slate-100' : 'text-slate-300'}`}>
                                      {'name' in item
                                        ? item.name
                                        : 'source' in item
                                        ? item.source
                                        : 'payee' in item
                                        ? item.payee
                                        : 'Entry'}
                                    </span>
                                    {/* Accumulator star */}
                                    {item.isAccumulator && (
                                      <Tooltip.Provider delayDuration={0}>
                                        <Tooltip.Root>
                                          <Tooltip.Trigger asChild>
                                            <Star className="h-2.5 w-2.5 flex-shrink-0 fill-amber-400 text-amber-400" />
                                          </Tooltip.Trigger>
                                          <Tooltip.Content
                                            side="top"
                                            sideOffset={6}
                                            className="z-50 rounded-md bg-black px-2 py-1 text-xs text-white shadow-lg"
                                          >
                                            Accumulator - receives surplus cash
                                          </Tooltip.Content>
                                        </Tooltip.Root>
                                      </Tooltip.Provider>
                                    )}
                                    {/* Scenario indicator */}
                                    {hasScenarios && <span className="h-1 w-1 flex-shrink-0 rounded-full bg-amber-400" />}
                                    {/* Annualization info */}
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
                                              className="flex h-3.5 w-3.5 items-center justify-center rounded text-slate-600 transition hover:text-slate-300"
                                              aria-label="Show annualized source"
                                            >
                                              <Info className="h-2.5 w-2.5" />
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
                                    {/* Scenario expand caret */}
                                    {hasScenarios && (
                                      <button
                                        type="button"
                                        onClick={() => toggleScenarioExpanded(itemId)}
                                        className="flex h-3.5 w-3.5 flex-shrink-0 items-center justify-center rounded text-slate-600 transition hover:text-slate-300"
                                        aria-label={isExpanded ? 'Collapse scenarios' : 'Expand scenarios'}
                                      >
                                        <ChevronRight className={`h-2.5 w-2.5 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                                      </button>
                                    )}
                                    {/* Property link */}
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
                                          className="flex h-4 w-4 items-center justify-center rounded bg-white/5 text-blue-300 transition hover:bg-white/10"
                                          title="Open property scenario"
                                        >
                                          <Home className="h-2.5 w-2.5" />
                                        </button>
                                      )
                                    })()}
                                  </div>

                                  {/* Right side: amount with hover actions */}
                                  <div className="flex items-center gap-1">
                                    {/* Value */}
                                    <span className={`font-mono text-sm text-slate-300 transition-opacity ${isSelected ? 'opacity-0' : 'opacity-100'}`}>
                                      {formatCurrency(item.adjAnnualAmt ?? item.adj_annual_amt ?? getDisplayAmount(item))}
                                    </span>

                                    {/* Actions - shown on click */}
                                    <div className={`absolute right-2 flex items-center gap-0.5 transition-opacity ${isSelected ? 'opacity-100 pointer-events-auto' : 'pointer-events-none opacity-0'}`}>
                                      {/* Set as accumulator button for cash accounts */}
                                      {item.itemType === 'cash_account' && !item.isAccumulator && (
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            const id = getItemId(item)
                                            if (id) setAccumulatorMutation.mutate(id)
                                          }}
                                          className="rounded p-1 text-slate-500 transition-colors hover:bg-amber-500/20 hover:text-amber-300"
                                          type="button"
                                          title="Set as accumulator"
                                        >
                                          <Star className="h-3 w-3" />
                                        </button>
                                      )}
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          const id = getItemId(item)
                                          if (item.itemType === 'cash_account') {
                                            const cashAccount = cashAccounts.find(ca => ca.id === id)
                                            if (cashAccount) {
                                              setCashAccountModalState({ isOpen: true, mode: 'edit', data: cashAccount })
                                            }
                                          } else {
                                            handleEditItem(key, item)
                                          }
                                        }}
                                        className="rounded p-1 text-slate-500 transition-colors hover:bg-blue-500/20 hover:text-blue-300"
                                        type="button"
                                        title="Edit"
                                      >
                                        <Pencil className="h-3 w-3" />
                                      </button>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          const id = getItemId(item)
                                          if (!id) return
                                          if (item.itemType === 'cash_account') {
                                            if (confirm('Are you sure you want to delete this cash account?')) {
                                              deleteCashAccountMutation.mutate(id)
                                            }
                                          } else {
                                            void handleDeleteItem(key, id)
                                          }
                                        }}
                                        className="rounded p-1 text-slate-500 transition-colors hover:bg-rose-500/20 hover:text-rose-300"
                                        type="button"
                                        title="Delete"
                                      >
                                        <Trash2 className="h-3 w-3" />
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
                                            {formatCurrency(item.amountAnnual ?? 0)}
                                          </span>
                                        </div>
                                        {scenarioImpacts.map(({ event, impact }) => {
                                          if (!event) return null
                                          const Icon = getIconByName(event.displayIcon ?? '')
                                          const isDisabled = !event.isIncluded
                                          return (
                                            <button
                                              key={`${event.id}-${impact.eventId}`}
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
                                                  const impactAmt = impact.amountAnnual ?? 0
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
                          </>
                        ) : (
                          <div className="flex flex-1 flex-col items-center justify-center gap-1 py-6 text-center">
                            <p className="text-[11px] text-slate-500">{config.emptyDescription}</p>
                            <p className="text-[10px] text-slate-600">
                              Click + to add
                            </p>
                          </div>
                        )}
                    </div>
                  </div>
                )
              }
            )}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-white/[0.1] bg-[#0a0a0a]/60 p-4 transition-all hover:border-white/[0.15]">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium text-slate-200">Net Worth</h4>
                    <p className="text-xs text-slate-500">Assets minus liabilities</p>
                  </div>
                  <div className="h-2 w-2 rounded-full bg-blue-400" />
                </div>
                <p className="mt-3 text-2xl font-light tracking-tight text-slate-100">
                  {formatCurrency(getNetWorthForYear())}
                </p>
              </div>
              <div className="rounded-2xl border border-white/[0.1] bg-[#0a0a0a]/60 p-4 transition-all hover:border-white/[0.15]">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium text-slate-200">Savings</h4>
                    <p className="text-xs text-slate-500">Income minus expenses</p>
                  </div>
                  <div className="h-2 w-2 rounded-full bg-emerald-400" />
                </div>
                <p className="mt-3 text-2xl font-light tracking-tight text-slate-100">
                  {formatCurrency(getAnnualSavingsForYear())}
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
      <CashAccountFormModal
        mode={cashAccountModalState.mode}
        data={cashAccountModalState.data}
        isOpen={cashAccountModalState.isOpen}
        onClose={() => setCashAccountModalState({ isOpen: false, mode: 'create' })}
        onSave={async (payload, mode) => {
          if (mode === 'edit' && cashAccountModalState.data?.id) {
            await updateCashAccountMutation.mutateAsync({
              id: cashAccountModalState.data.id,
              updates: payload,
            })
          } else {
            await createCashAccountMutation.mutateAsync(payload)
          }
        }}
        onDelete={async (id) => {
          await deleteCashAccountMutation.mutateAsync(id)
        }}
      />
    </>
  )
}
