import { useState } from 'react'
import { Plus, SlidersHorizontal, Sparkles } from 'lucide-react'

import { useFinancialData } from '../../hooks/useFinancialData'
import type { Asset, Expense, Income, Liability } from '../../types/financial'
import { FinancialFormModal } from '../modals/FinancialFormModal'

type FinancialCategory = 'asset' | 'income' | 'liability' | 'expense'

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
    helper: 'Add CPF balances to start',
  },
  income: {
    title: 'Income',
    emptyDescription: 'No income added yet',
    icon: '💼',
    accent: 'bg-emerald-500',
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

export function FinancialDataManagement() {
  const {
    assets,
    incomes,
    liabilities,
    expenses,
    addAsset,
    addIncome,
    addLiability,
    addExpense,
    getNetWorth,
    getMonthlySavings,
  } = useFinancialData()

  const [modalState, setModalState] = useState<ModalState>({
    isOpen: false,
    type: 'asset',
    mode: 'create',
  })

  const handleAddItem = (category: FinancialCategory) => {
    setModalState({
      isOpen: true,
      type: category,
      mode: 'create',
    })
  }

  const handleSettings = (category: FinancialCategory) => {
    console.log(`Settings for ${category}`)
  }

  const handleModalClose = () => {
    setModalState((prev) => ({ ...prev, isOpen: false }))
  }

  const handleModalSave = (data: any) => {
    switch (modalState.type) {
      case 'asset':
        addAsset(data)
        break
      case 'income':
        addIncome(data)
        break
      case 'liability':
        addLiability(data)
        break
      case 'expense':
        addExpense(data)
        break
    }
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

  return (
    <>
      <div className="flex h-full flex-col bg-black text-white">
        <div className="border-b border-white/10 px-6 py-4">
          <h3 className="text-lg font-semibold text-white">Financial Data</h3>
          <p className="text-sm text-gray-400">
            Manage your income, expenses, assets, and liabilities
          </p>
        </div>

        <div className="flex-1 overflow-auto px-6 py-6">
          <div className="grid gap-6 lg:grid-cols-2">
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
                    className="flex w-full min-w-0 flex-col rounded-2xl border border-white/10 bg-white/5 shadow-lg"
                  >
                    <div className="border-b border-white/5 p-4">
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
                            className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 text-gray-300 transition hover:bg-white/10"
                            type="button"
                          >
                            <SlidersHorizontal className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleAddItem(key)}
                            className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500 text-white transition hover:bg-emerald-600"
                            type="button"
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-1 flex-col justify-center gap-3 px-4 py-6 text-center text-gray-300">
                      {hasData ? (
                        <div className="space-y-2 text-left text-sm">
                          {data.slice(0, 3).map((item: any, index) => (
                            <div
                              key={item.id || index}
                              className="flex items-center justify-between text-gray-200"
                            >
                              <span className="truncate text-sm">
                                {'name' in item
                                  ? item.name
                                  : 'source' in item
                                  ? item.source
                                  : 'payee' in item
                                  ? item.payee
                                  : 'Entry'}
                              </span>
                              <span className="text-sm text-gray-400">
                                $
                                {summarizeAmount(item).toLocaleString(
                                  undefined,
                                  { maximumFractionDigits: 0 }
                                )}
                              </span>
                            </div>
                          ))}
                          {data.length > 3 && (
                            <p className="text-xs text-gray-500">
                              +{data.length - 3} more
                            </p>
                          )}
                        </div>
                      ) : (
                        <>
                          <p className="text-sm">{config.emptyDescription}</p>
                          <p className="text-xs text-gray-500">
                            Click the + button to add your first entry
                          </p>
                          {config.helper && (
                            <div className="mx-auto inline-flex items-center gap-1 rounded-full border border-white/10 px-3 py-1 text-xs text-blue-200">
                              <Sparkles className="h-3 w-3" />
                              {config.helper}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                )
              }
            )}
          </div>

          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
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
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
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

      <FinancialFormModal
        type={modalState.type}
        mode={modalState.mode}
        data={modalState.data}
        isOpen={modalState.isOpen}
        onClose={handleModalClose}
        onSave={handleModalSave}
      />
    </>
  )
}
