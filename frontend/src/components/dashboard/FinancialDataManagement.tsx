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
      description: '',
      icon: <div className="text-lg">📈</div>,
      bgColor: 'bg-gray-800',
      iconBg: 'bg-blue-500',
      hasData: false,
      buttonColor: 'bg-emerald-500 hover:bg-emerald-600'
    },
    income: {
      title: 'Income',
      description: '',
      icon: <div className="text-lg">💼</div>,
      bgColor: 'bg-gray-800',
      iconBg: 'bg-emerald-500',
      hasData: false,
      buttonColor: 'bg-emerald-500 hover:bg-emerald-600'
    },
    liabilities: {
      title: 'Liabilities',
      description: 'All debts and financial obligations you owe',
      icon: <div className="text-lg">💳</div>,
      bgColor: 'bg-gray-800',
      iconBg: 'bg-red-500',
      hasData: false,
      buttonColor: 'bg-emerald-500 hover:bg-emerald-600'
    },
    expenses: {
      title: 'Expenses',
      description: '',
      icon: <div className="text-lg">💰</div>,
      bgColor: 'bg-gray-800',
      iconBg: 'bg-orange-500',
      hasData: false,
      buttonColor: 'bg-emerald-500 hover:bg-emerald-600'
    },
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
    <div className="h-full w-full overflow-auto bg-gray-900 p-6 text-white">
      <div className="mb-6">
        <h2 className="mb-1 font-semibold text-white text-xl">Financial Data</h2>
        <p className="text-gray-400 text-sm">
          Manage your income, expenses, assets, and liabilities
        </p>
      </div>

      <div className="flex flex-col gap-6 lg:min-w-0 lg:flex-row">
        {/* Left Column - Assets & Liabilities */}
        <div className="flex min-w-0 flex-1 flex-col space-y-6">
          {leftColumnCategories.map(({ key, config }) => (
            <FinancialCard
              key={key}
              title={config.title}
              description={config.description}
              icon={config.icon}
              iconBg={config.iconBg}
              onAddItem={() => handleAddItem(key)}
            />
          ))}

          {/* Net Worth Summary */}
          <div className="mt-auto rounded-lg border border-gray-700 bg-gray-800 p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-white">Net Worth</h3>
                <p className="text-gray-400 text-sm">Assets minus liabilities</p>
              </div>
              <div className="font-bold text-lg text-emerald-400">$0</div>
            </div>
          </div>
        </div>

        {/* Right Column - Income & Expenses */}
        <div className="flex min-w-0 flex-1 flex-col space-y-6">
          {rightColumnCategories.map(({ key, config }) => (
            <FinancialCard
              key={key}
              title={config.title}
              description={config.description}
              icon={config.icon}
              iconBg={config.iconBg}
              onAddItem={() => handleAddItem(key)}
            />
          ))}

          {/* Savings Summary */}
          <div className="mt-auto rounded-lg border border-gray-700 bg-gray-800 p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-white">Savings</h3>
                <p className="text-gray-400 text-sm">Income minus expenses</p>
              </div>
              <div className="font-bold text-lg text-emerald-400">$0</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

interface FinancialCardProps {
  title: string
  description: string
  icon: React.ReactNode
  iconBg: string
  onAddItem: () => void
}

function FinancialCard({ title, description, icon, iconBg, onAddItem }: FinancialCardProps) {
  const getIconColor = () => {
    if (title === 'Income') return 'text-emerald-500'
    if (title === 'Expenses') return 'text-orange-500'
    if (title === 'Assets') return 'text-blue-500'
    if (title === 'Liabilities') return 'text-red-500'
    return 'text-gray-500'
  }

  return (
    <div className="flex w-full min-w-0 flex-col rounded-lg border border-gray-700 bg-gray-800">
      {/* Header */}
      <div className="border-gray-700 border-b p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className={`flex h-8 w-8 items-center justify-center rounded-full bg-gray-700 ${getIconColor()}`}>
              {icon}
            </div>
            <div className="min-w-0">
              <h3 className="truncate font-semibold text-white">{title}</h3>
              {description && <p className="text-gray-400 text-sm">{description}</p>}
            </div>
          </div>
          <div className="flex flex-shrink-0 items-center gap-2">
            <button
              className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500 transition-colors hover:bg-emerald-600"
              onClick={onAddItem}
              type="button"
            >
              <Plus className="h-4 w-4 text-white" />
            </button>
          </div>
        </div>
      </div>

      {/* Items */}
      <div className="flex-1 p-4">
        <div className="py-8 text-center text-gray-500">
          <p className="text-sm">No {title.toLowerCase()} added yet</p>
          <p className="mt-1 text-xs">Click the + button to add your first entry</p>
        </div>
      </div>
    </div>
  )
}