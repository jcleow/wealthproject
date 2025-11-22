import { useState, useEffect, useMemo } from 'react'
import { Plus, SlidersHorizontal, Pencil, Trash2, Home, Info } from 'lucide-react'
import * as Tooltip from '@radix-ui/react-tooltip'

import { useFinancialData } from '../../hooks/useFinancialData'
import type { Asset, Expense, Income, Liability, PropertyLink } from '../../types/financial'
import type { FinancialDataType, FinancialFormValues } from '../modals/FinancialFormModal'
import { FinancialFormModal } from '../modals/FinancialFormModal'
import { PropertyPlannerModal } from '../modals/PropertyPlannerModal'
import { financialApi } from '@/services/financialApi'
import type { TimelineYear } from '@/types/timeline'
import type { TimelineEditRequest, TimelineEdit } from '@/types/timeline'
import { formatCurrency } from '@/lib/format'

type FinancialCategory = FinancialDataType

type CategoryConfig = {
  title: string
  emptyDescription: string
  icon: string
  accent: string
  helper?: string
}

const categoryConfig: Record<FinancialCategory, CategoryConfig> = {
  asset: {
    title: 'Assets',
    emptyDescription: 'No assets added yet',
    icon: '📈',
  accent: 'bg-blue-500',
  },
  income: {
    title: 'Income',
    emptyDescription: 'No income added yet',
    icon: '💼',
    accent: 'text-grey-500 bg-white/5 ',
  },
  liability: {
    title: 'Liabilities',
    emptyDescription: 'No liabilities added yet',
    icon: '💳',
    accent: 'bg-rose-500',
  },
  expense: {
    title: 'Expenses',
    emptyDescription: 'No expenses added yet',
    icon: '💰',
    accent: 'bg-amber-500',
  },
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
  } = useFinancialData()

  const [modalState, setModalState] = useState<ModalState>({
    isOpen: false,
    type: 'asset',
    mode: 'create',
  })
  const [activeAnnualizationId, setActiveAnnualizationId] = useState<string | null>(null)
  const [assetLinks, setAssetLinks] = useState<Record<string, PropertyLink[]>>({})
  const [liabilityLinks, setLiabilityLinks] = useState<Record<string, PropertyLink[]>>({})
  const [isPropertyPlannerOpen, setIsPropertyPlannerOpen] = useState(false)
  const [prefill, setPrefill] = useState<{ scenarioId?: string; assetId?: string; liabilityId?: string } | null>(null)
  const formatYearLabel = (year: number) => (year === 0 ? 'BASE' : `Year ${year}`)

  const getItemId = (entry?: { id?: string; item_id?: string; itemId?: string } | null) =>
    entry?.id ?? (entry as any)?.item_id ?? (entry as any)?.itemId ?? ''

  useEffect(() => {
    const fetchLinks = async () => {
      try {
        const assetResults: Record<string, PropertyLink[]> = {}
        await Promise.all(
          yearAssets.map(async (asset) => {
            const assetId = (asset as any).id ?? (asset as any).item_id
            if (!assetId) return
            const links = await financialApi.listPropertyLinksByAsset(assetId)
            assetResults[assetId] = links
          })
        )
        setAssetLinks(assetResults)
        const liabilityResults: Record<string, PropertyLink[]> = {}
        await Promise.all(
          yearLiabilities.map(async (liability) => {
            const liabilityId = (liability as any).id ?? (liability as any).item_id
            if (!liabilityId) return
            const links = await financialApi.listPropertyLinksByLiability(liabilityId)
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

  const handleDeleteItem = async (_category: FinancialCategory, _id: string) => {
    // Placeholder: timeline delete not supported yet
  }

  const handleSettings = (category: FinancialCategory) => {
    if (usingTimeline) return
    console.log(`Settings for ${category}`)
  }

  const handleModalClose = () => {
    setModalState((prev) => ({ ...prev, isOpen: false, data: undefined }))
  }

  const handleModalSave = async (payload: FinancialFormValues, mode: 'create' | 'edit') => {
    const timestamp = payload.updatedAt ?? new Date().toISOString()

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
            ? (payload as any).source ?? payload.name
            : payload.type === 'expense'
              ? (payload as any).payee ?? payload.name
              : payload.name,
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

  const summarizeAmount = (item: any) => {
    if ('amount_annual' in item) return item.amount_annual ?? 0
    if ('amountAnnual' in item) return item.amountAnnual ?? 0
    if ('currentValue' in item) return item.currentValue
    if ('currentBalance' in item) return item.currentBalance
    return item.amount ?? 0
  }

  const getAnnualizationLabel = (item: any) => {
    const sourceAmount = item?.source_amount ?? item?.sourceAmount
    const sourceFrequency = item?.source_frequency ?? item?.sourceFrequency
    if (!sourceAmount || !sourceFrequency || sourceFrequency === 'annual') return null
    return `Annualized from ${formatCurrency(Number(sourceAmount), 'en-US', '$')} ${sourceFrequency}`
  }

  const getNetWorthForYear = () => {
    if (timelineYear?.net_worth !== undefined) return Math.round(timelineYear.net_worth)
    return 0
  }

  const getMonthlySavingsForYear = () => {
    // Fall back to zero if timeline lacks P&L breakdown; use income/expenses annualized.
    const totalIncome = yearIncomes.reduce((sum, it) => sum + (it.amount_annual ?? 0), 0)
    const totalExpenses = yearExpenses.reduce((sum, it) => sum + (it.amount_annual ?? 0), 0)
    return Math.round(Math.max((totalIncome - totalExpenses) / 12, 0))
  }

  const openPlannerFromLink = (link: PropertyLink) => {
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
    const clamped = Math.max(0, Math.min(20, parsed))
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
                  {Array.from({ length: 21 }, (_, idx) => (
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
                const data = getDataForCategory(key)
                const hasData = data.length > 0
                const description = hasData
                  ? `${data.length} ${config.title.toLowerCase()}${
                      data.length > 1 ? 's' : ''
                    }`
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
                        <div className="space-y-2 text-left text-sm max-h-64 overflow-auto pr-1">
                          {data.map((item: any, index) => (
                            <div
                              key={getItemId(item) || index}
                              className="group/item relative flex items-center justify-between gap-3 overflow-hidden rounded-md px-2 py-1 text-gray-200"
                            >
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
                                {key !== 'income' && key !== 'expense' && (() => {
                                  const link =
                                    key === 'asset'
                                      ? (assetLinks[item.id as string]?.[0] ?? null)
                                      : (liabilityLinks[item.id as string]?.[0] ?? null)
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
                                  {formatCurrency(summarizeAmount(item))}
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
                          ))}
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
                <p className="mt-4 text-3xl font-bold text-white">
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
                <p className="mt-4 text-3xl font-bold text-white">
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
