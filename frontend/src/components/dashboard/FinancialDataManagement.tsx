import { Plus, Filter } from 'lucide-react'

type FinancialCategory = 'assets' | 'income' | 'liabilities' | 'expenses'

interface CategoryConfig {
  title: string
  description: string
  icon: React.ReactNode
  bgColor: string
  iconBg: string
  hasData: boolean
  amount?: string
  buttonColor: string
}

export function FinancialDataManagement() {
  const handleAddItem = (category: string) => {
    console.log(`Add ${category} clicked`);
    // TODO: Open modal or form to add new item
  };

  const handleFilter = (category: string) => {
    console.log(`Filter ${category} clicked`);
    // TODO: Implement filtering
  };
  const categories: Record<FinancialCategory, CategoryConfig> = {
    assets: {
      title: 'Assets',
      description: 'No assets added yet',
      icon: <div className="text-xl">📊</div>,
      bgColor: 'bg-gray-800',
      iconBg: 'bg-emerald-500',
      hasData: false,
      buttonColor: 'bg-emerald-500 hover:bg-emerald-600'
    },
    income: {
      title: 'Income',
      description: 'No income added yet',
      icon: <div className="text-xl">🏦</div>,
      bgColor: 'bg-gray-800',
      iconBg: 'bg-blue-500',
      hasData: false,
      buttonColor: 'bg-blue-500 hover:bg-blue-600'
    },
    liabilities: {
      title: 'Liabilities',
      description: 'All debts and financial obligations you owe',
      icon: <div className="text-xl">💳</div>,
      bgColor: 'bg-gray-800',
      iconBg: 'bg-red-500',
      hasData: false,
      buttonColor: 'bg-gray-600 hover:bg-gray-700'
    },
    expenses: {
      title: 'Expenses',
      description: 'No expenses added yet',
      icon: <div className="text-xl">💰</div>,
      bgColor: 'bg-gray-800',
      iconBg: 'bg-orange-500',
      hasData: false,
      buttonColor: 'bg-orange-500 hover:bg-orange-600'
    },
  }

  return (
    <div className="flex h-full flex-col bg-gray-900">
      <div className="border-b border-white/10 px-6 py-4">
        <h3 className="font-semibold text-white text-lg">Financial Data</h3>
        <p className="text-sm text-gray-400">
          Manage your income, expenses, assets, and liabilities
        </p>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="grid gap-4 md:grid-cols-2">
          {Object.entries(categories).map(([key, config]) => (
            <div
              key={key}
              className={`${config.bgColor} rounded-lg border border-gray-700 p-5 transition-all hover:border-gray-600`}
            >
              <div className="mb-4 flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex items-center justify-center w-8 h-8">
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
                  {key === 'assets' || key === 'income' ? (
                    <button
                      onClick={() => handleAddItem(key)}
                      className={`rounded-full p-1.5 text-white ${config.buttonColor} transition-colors`}
                    >
                      <Plus className="h-5 w-5" />
                    </button>
                  ) : key === 'liabilities' && (
                    <button
                      onClick={() => handleAddItem(key)}
                      className={`rounded-full p-1.5 text-white ${config.buttonColor} transition-colors`}
                    >
                      <Plus className="h-5 w-5" />
                    </button>
                  )}
                  {key === 'expenses' && (
                    <button
                      onClick={() => handleAddItem(key)}
                      className={`rounded-full p-1.5 text-white ${config.buttonColor} transition-colors`}
                    >
                      <Plus className="h-5 w-5" />
                    </button>
                  )}
                </div>
              </div>

              <div className="flex min-h-[100px] items-center justify-center">
                {config.hasData ? (
                  <div className="text-center">
                    <p className="text-3xl font-bold text-white">{config.amount}</p>
                  </div>
                ) : (
                  <div className="text-center">
                    <p className="mb-3 text-sm text-gray-400">{config.description}</p>
                    <button className="text-sm text-gray-400 hover:text-gray-300">
                      Click the + button to add your first entry
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Summary Cards */}
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border border-gray-700 bg-gray-800 p-5">
            <div className="mb-3 flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-blue-400"></div>
              <span className="text-sm font-medium text-gray-300">Net Worth</span>
            </div>
            <p className="text-3xl font-bold text-white">$0</p>
            <p className="text-sm text-gray-400 mt-1">Assets minus liabilities</p>
          </div>

          <div className="rounded-lg border border-gray-700 bg-gray-800 p-5">
            <div className="mb-3 flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-green-400"></div>
              <span className="text-sm font-medium text-gray-300">Monthly Savings</span>
            </div>
            <p className="text-3xl font-bold text-white">$0</p>
            <p className="text-sm text-gray-400 mt-1">Income minus expenses</p>
          </div>
        </div>
      </div>
    </div>
  )
}