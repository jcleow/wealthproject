import { useState } from 'react'
import { Plus, Filter } from 'lucide-react'
import { useFinancialData } from '../../hooks/useFinancialData'
import { FinancialFormModal } from '../modals/FinancialFormModal'
import type { Asset, Income, Liability, Expense } from '../../types/financial'

type FinancialCategory = 'asset' | 'income' | 'liability' | 'expense'

interface CategoryConfig {
  title: string
  description: string
  icon: React.ReactNode
  bgColor: string
  iconBg: string
  buttonColor: string
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
    getMonthlySavings
  } = useFinancialData()

  const [modalState, setModalState] = useState<ModalState>({
    isOpen: false,
    type: 'asset',
    mode: 'create'
  })

  const handleAddItem = (category: FinancialCategory) => {
    setModalState({
      isOpen: true,
      type: category,
      mode: 'create'
    })
  }

  const handleFilter = (category: string) => {
    console.log(`Filter ${category} clicked`)
    // TODO: Implement filtering
  }

  const handleModalClose = () => {
    setModalState(prev => ({ ...prev, isOpen: false }))
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
      case 'asset': return assets
      case 'income': return incomes
      case 'liability': return liabilities
      case 'expense': return expenses
    }
  }

  const categories: Record<FinancialCategory, CategoryConfig> = {
    asset: {
      title: 'Assets',
      description: assets.length === 0 ? 'No assets added yet' : `${assets.length} asset${assets.length > 1 ? 's' : ''}`,
      icon: <div className="text-lg">📈</div>,
      bgColor: 'bg-gray-800',
      iconBg: 'bg-blue-500',
      buttonColor: 'bg-emerald-500 hover:bg-emerald-600'
    },
    income: {
      title: 'Income',
      description: incomes.length === 0 ? 'No income added yet' : `${incomes.length} income source${incomes.length > 1 ? 's' : ''}`,
      icon: <div className="text-lg">💼</div>,
      bgColor: 'bg-gray-800',
      iconBg: 'bg-emerald-500',
      buttonColor: 'bg-emerald-500 hover:bg-emerald-600'
    },
    liability: {
      title: 'Liabilities',
      description: liabilities.length === 0 ? 'No liabilities added yet' : `${liabilities.length} liabilit${liabilities.length > 1 ? 'ies' : 'y'}`,
      icon: <div className="text-lg">💳</div>,
      bgColor: 'bg-gray-800',
      iconBg: 'bg-red-500',
      buttonColor: 'bg-emerald-500 hover:bg-emerald-600'
    },
    expense: {
      title: 'Expenses',
      description: expenses.length === 0 ? 'No expenses added yet' : `${expenses.length} expense${expenses.length > 1 ? 's' : ''}`,
      icon: <div className="text-lg">💰</div>,
      bgColor: 'bg-gray-800',
      iconBg: 'bg-orange-500',
      buttonColor: 'bg-emerald-500 hover:bg-emerald-600'
    }
  }

  const leftColumnCategories = [
    { key: 'assets', config: categories.assets },
    { key: 'liabilities', config: categories.liabilities }
  ]

  const rightColumnCategories = [
    { key: 'income', config: categories.income },
    { key: 'expenses', config: categories.expenses }
  ]

  return (
    <>
      <div className="flex h-full flex-col bg-gray-900">
        <div className="border-b border-white/10 px-6 py-4">
          <h3 className="font-semibold text-white text-lg">Financial Data</h3>
          <p className="text-sm text-gray-400">
            Manage your income, expenses, assets, and liabilities
          </p>
        </div>

        <div className="flex-1 overflow-auto p-6">
          <div className="grid gap-4 md:grid-cols-2">
            {Object.entries(categories).map(([key, config]) => {
              const category = key as FinancialCategory
              const data = getDataForCategory(category)
              const hasData = data.length > 0

              return (
                <div
                  key={key}
                  className={`${config.bgColor} rounded-xl border border-gray-700 p-5 transition-all hover:border-gray-600`}
                >
                  <div className="mb-4 flex items-start justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center justify-center w-9 h-9">
                        {config.icon}
                      </div>
                      <h4 className="font-medium text-white text-base">{config.title}</h4>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleFilter(key)}
                        className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-slate-600/50 hover:text-white"
                      >
                        <Filter className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleAddItem(category)}
                        className={`rounded-full p-1.5 text-white ${config.buttonColor} transition-colors`}
                      >
                        <Plus className="h-5 w-5" />
                      </button>
                    </div>
                  </div>

                  <div className="flex min-h-[100px] flex-col justify-center">
                    {hasData ? (
                      <div className="space-y-2">
                        <p className="text-sm text-gray-400 mb-2">{config.description}</p>
                        <div className="space-y-1 max-h-20 overflow-auto">
                          {data.slice(0, 3).map((item: any, index) => (
                            <div key={item.id || index} className="flex justify-between text-sm">
                              <span className="text-gray-300 truncate">
                                {'name' in item ? item.name :
                                 'source' in item ? item.source :
                                 'payee' in item ? item.payee : 'Unknown'}
                              </span>
                              <span className="text-gray-400">
                                ${('currentValue' in item ? item.currentValue :
                                   'currentBalance' in item ? item.currentBalance :
                                   item.amount).toLocaleString()}
                              </span>
                            </div>
                          ))}
                          {data.length > 3 && (
                            <p className="text-xs text-gray-500">+{data.length - 3} more</p>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center">
                        <p className="mb-3 text-sm text-gray-400">{config.description}</p>
                        <button
                          onClick={() => handleAddItem(category)}
                          className="text-sm text-gray-400 hover:text-gray-300"
                        >
                          Click the + button to add your first entry
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Summary Cards */}
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border border-gray-700 bg-gray-800 p-5">
              <div className="mb-3 flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-blue-400"></div>
                <span className="text-sm font-medium text-gray-300">Net Worth</span>
              </div>
              <p className="text-3xl font-bold text-white">${getNetWorth().toLocaleString()}</p>
              <p className="text-sm text-gray-400 mt-1">Assets minus liabilities</p>
            </div>

            <div className="rounded-lg border border-gray-700 bg-gray-800 p-5">
              <div className="mb-3 flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-green-400"></div>
                <span className="text-sm font-medium text-gray-300">Monthly Savings</span>
              </div>
              <p className="text-3xl font-bold text-white">${getMonthlySavings().toLocaleString()}</p>
              <p className="text-sm text-gray-400 mt-1">Income minus expenses</p>
            </div>
          </div>
        </div>
      </div>

      {/* Financial Form Modal */}
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

