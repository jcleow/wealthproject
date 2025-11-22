import { useState, useEffect } from 'react'
import { Plus, SlidersHorizontal, Pencil, Trash2, Home } from 'lucide-react'

import { useFinancialData } from '../../hooks/useFinancialData'
import type { Asset, Expense, Income, Liability, PropertyLink } from '../../types/financial'
import type { FinancialDataType, FinancialFormValues } from '../modals/FinancialFormModal'
import { FinancialFormModal } from '../modals/FinancialFormModal'
import { PropertyPlannerModal } from '../modals/PropertyPlannerModal'
import { financialApi } from '@/services/financialApi'
import type { TimelineYear } from '@/types/timeline'

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
}

export function FinancialDataManagement({
  selectedYear = 0,
  onSelectYear,
  timelineYear,
  isTimelineLoading = false,
}: FinancialDataManagementProps) {
  const {
    assets,
    incomes,
    liabilities,
    expenses,
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
    getNetWorth,
    getMonthlySavings,
  } = useFinancialData()

  const [modalState, setModalState] = useState<ModalState>({
    isOpen: false,
    type: 'asset',
    mode: 'create',
  })
  const [assetLinks, setAssetLinks] = useState<Record<string, PropertyLink[]>>({})
  const [liabilityLinks, setLiabilityLinks] = useState<Record<string, PropertyLink[]>>({})
  const [isPropertyPlannerOpen, setIsPropertyPlannerOpen] = useState(false)
  const [prefill, setPrefill] = useState<{ scenarioId?: string; assetId?: string; liabilityId?: string } | null>(null)

  useEffect(() => {
    const fetchLinks = async () => {
      try {
        const assetResults: Record<string, PropertyLink[]> = {}
        await Promise.all(
          assets.map(async (asset) => {
            const links = await financialApi.listPropertyLinksByAsset(asset.id)
            assetResults[asset.id] = links
          })
        )
        setAssetLinks(assetResults)
        const liabilityResults: Record<string, PropertyLink[]> = {}
        await Promise.all(
          liabilities.map(async (liability) => {
            const links = await financialApi.listPropertyLinksByLiability(liability.id)
            liabilityResults[liability.id] = links
          })
        )
        setLiabilityLinks(liabilityResults)
      } catch (error) {
        console.error('Failed to fetch property links', error)
      }
    }
    if (assets.length || liabilities.length) {
      void fetchLinks()
    } else {
      setAssetLinks({})
      setLiabilityLinks({})
    }
  }, [assets, liabilities])

  const handleAddItem = (category: FinancialCategory) => {
    setModalState({
      isOpen: true,
      type: category,
      mode: 'create',
      data: undefined,
    })
  }

  const handleEditItem = (category: FinancialCategory, entry: Asset | Income | Liability | Expense) => {
    setModalState({
      isOpen: true,
      type: category,
      mode: 'edit',
      data: entry,
    })
  }

  const handleDeleteItem = async (category: FinancialCategory, id: string) => {
    switch (category) {
      case 'asset':
        await deleteAsset(id)
        break
      case 'income':
        await deleteIncome(id)
        break
      case 'liability':
        await deleteLiability(id)
        break
      case 'expense':
        await deleteExpense(id)
        break
    }
  }

  const handleSettings = (category: FinancialCategory) => {
    console.log(`Settings for ${category}`)
  }

  const handleModalClose = () => {
    setModalState((prev) => ({ ...prev, isOpen: false, data: undefined }))
  }

  const handleModalSave = async (payload: FinancialFormValues, mode: 'create' | 'edit') => {
    const timestamp = payload.updatedAt ?? new Date().toISOString()

    switch (payload.type) {
      case 'cpf': {
        // Create OA, SA, and MA assets in parallel
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
          await updateAsset(modalState.data.id, { ...values, updatedAt: timestamp })
        } else {
          await addAsset(values)
        }
        break
      }
      case 'income': {
        const { type: _type, id: _id, updatedAt: _updatedAt, ...values } = payload
        if (mode === 'edit' && modalState.data) {
          await updateIncome(modalState.data.id, { ...values, updatedAt: timestamp })
        } else {
          await addIncome(values)
        }
        break
      }
      case 'liability': {
        const { type: _type, id: _id, updatedAt: _updatedAt, ...values } = payload
        if (mode === 'edit' && modalState.data) {
          await updateLiability(modalState.data.id, { ...values, updatedAt: timestamp })
        } else {
          await addLiability(values)
        }
        break
      }
      case 'expense': {
        const { type: _type, id: _id, updatedAt: _updatedAt, ...values } = payload
        if (mode === 'edit' && modalState.data) {
          await updateExpense(modalState.data.id, { ...values, updatedAt: timestamp })
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
        return assets
      case 'income':
        return incomes
      case 'liability':
        return liabilities
      case 'expense':
        return expenses
    }
  }

  const summarizeAmount = (item: any) => {
    if ('currentValue' in item) return item.currentValue
    if ('currentBalance' in item) return item.currentBalance
    return item.amount ?? 0
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
                <input
                  id="year-selector"
                  list="year-options"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  className="w-20 rounded-md border border-white/10 bg-[#0f172a]/60 px-2 py-1 text-sm text-white placeholder-gray-500 focus:border-blue-400 focus:outline-none"
                  value={selectedYear}
                  disabled={isTimelineLoading}
                  onChange={(event) => handleYearInput(event.target.value)}
                />
                <datalist id="year-options">
                  {Array.from({ length: 21 }, (_, idx) => idx).map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </datalist>
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
                          <button
                            onClick={() => handleSettings(key)}
                            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/5 text-gray-300 transition hover:bg-white/10"
                            type="button"
                          >
                            <SlidersHorizontal className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleAddItem(key)}
                            className="flex h-8 w-8 items-center justify-center rounded-full text-grey-500 bg-white/5 transition hover:bg-white/10"
                            type="button"
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-1 flex-col justify-start gap-3 px-4 py-6 text-gray-300">
                      {hasData ? (
                        <div className="space-y-2 text-left text-sm">
                          {data.slice(0, 3).map((item: any, index) => (
                            <div
                              key={item.id || index}
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
                                  $
                                  {summarizeAmount(item).toLocaleString(undefined, {
                                    maximumFractionDigits: 0,
                                  })}
                                </span>
                                <div className="absolute inset-y-0 right-0 flex items-center gap-2 opacity-0 transition-opacity duration-200 group-hover/item:opacity-100">
                                  <button
                                    onClick={() => handleEditItem(key, item)}
                                    className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-xs text-gray-200 transition hover:bg-white/20"
                                    type="button"
                                  >
                                    <Pencil className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    onClick={() => item.id && handleDeleteItem(key, item.id)}
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
                  ${getNetWorth().toLocaleString()}
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
                  ${getMonthlySavings().toLocaleString()}
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
        onDelete={
          modalState.mode === 'edit' && modalState.data?.id ? handleModalDelete : undefined
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
