import { useState, useRef, useEffect } from 'react'
import { Plus, ArrowDownWideNarrow, Wallet, BarChart3, Shield, ChevronDown } from 'lucide-react'
import { categoryConfig } from '../../config'
import type { FinancialCategory } from '../../types'

interface CategoryCardHeaderProps {
  category: FinancialCategory
  showMonthlyData: boolean
  sortDirection: 'asc' | 'desc'
  onToggleSortDirection: () => void
  onAddItem: () => void
  onAddInvestment?: () => void
  onAddCpf?: () => void
  isCollapsed?: boolean
  onToggleCollapse?: () => void
}

export function CategoryCardHeader({
  category,
  showMonthlyData,
  sortDirection,
  onToggleSortDirection,
  onAddItem,
  onAddInvestment,
  onAddCpf,
  isCollapsed = false,
  onToggleCollapse,
}: CategoryCardHeaderProps) {
  const config = categoryConfig[category]
  const [showAssetMenu, setShowAssetMenu] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowAssetMenu(false)
      }
    }
    if (showAssetMenu) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showAssetMenu])

  const getTitle = () => {
    if (category === 'income') {
      return showMonthlyData ? 'Monthly Income' : 'Annual Income'
    }
    if (category === 'expense') {
      return showMonthlyData ? 'Monthly Expenses' : 'Annual Expenses'
    }
    return config.title
  }

  const IconComponent = config.icon
  const showAssetDropdown = category === 'asset' && (onAddInvestment || onAddCpf)

  return (
    <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/[0.04]">
      <button
        type="button"
        onClick={onToggleCollapse}
        className="flex items-center gap-2.5 hover:opacity-80 transition-opacity"
      >
        <div className={`rounded-lg border p-1.5 ${config.gradientBg}`}>
          <IconComponent className={`h-4 w-4 ${config.textColor}`} />
        </div>
        <h4 className="text-sm font-medium text-slate-200">{getTitle()}</h4>
        {onToggleCollapse && (
          <ChevronDown
            className={`h-3.5 w-3.5 text-slate-500 transition-transform duration-200 ${isCollapsed ? '-rotate-90' : ''}`}
          />
        )}
      </button>
      <div className="flex items-center gap-0.5">
        <button
          type="button"
          className="p-1.5 rounded-md hover:bg-white/5 text-slate-500 hover:text-slate-300 transition-colors"
          aria-label={`Sort ${sortDirection === 'desc' ? 'high to low' : 'low to high'}`}
          onClick={onToggleSortDirection}
        >
          <ArrowDownWideNarrow
            className={`h-4 w-4 ${sortDirection === 'desc' ? '' : 'rotate-180'}`}
          />
        </button>

        {showAssetDropdown ? (
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setShowAssetMenu(!showAssetMenu)}
              className="p-1.5 rounded-md hover:bg-white/5 text-slate-500 hover:text-slate-300 transition-colors"
              type="button"
              title="Add Item"
            >
              <Plus className="h-4 w-4" />
            </button>
            {showAssetMenu && (
              <AssetAddMenu
                onAddAsset={() => {
                  onAddItem()
                  setShowAssetMenu(false)
                }}
                onAddInvestment={onAddInvestment ? () => {
                  onAddInvestment()
                  setShowAssetMenu(false)
                } : undefined}
                onAddCpf={onAddCpf ? () => {
                  onAddCpf()
                  setShowAssetMenu(false)
                } : undefined}
              />
            )}
          </div>
        ) : (
          <button
            onClick={onAddItem}
            className="p-1.5 rounded-md hover:bg-white/5 text-slate-500 hover:text-slate-300 transition-colors"
            type="button"
            title="Add Item"
          >
            <Plus className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  )
}

interface AssetAddMenuProps {
  onAddAsset: () => void
  onAddInvestment?: () => void
  onAddCpf?: () => void
}

function AssetAddMenu({ onAddAsset, onAddInvestment, onAddCpf }: AssetAddMenuProps) {
  return (
    <div className="absolute right-0 top-full z-50 w-40 mt-1 py-1 rounded-lg border border-white/10 bg-[#151515] shadow-xl">
      <button
        onClick={onAddAsset}
        className="flex items-center w-full gap-2 px-3 py-2 hover:bg-white/5 text-left text-sm text-slate-300 transition-colors"
        type="button"
      >
        <Wallet className="h-4 w-4 text-emerald-400" />
        Asset
      </button>
      {onAddInvestment && (
        <button
          onClick={onAddInvestment}
          className="flex items-center w-full gap-2 px-3 py-2 hover:bg-white/5 text-left text-sm text-slate-300 transition-colors"
          type="button"
        >
          <BarChart3 className="h-4 w-4 text-purple-400" />
          Investment
        </button>
      )}
      {onAddCpf && (
        <button
          onClick={onAddCpf}
          className="flex items-center w-full gap-2 px-3 py-2 hover:bg-white/5 text-left text-sm text-slate-300 transition-colors"
          type="button"
        >
          <Shield className="h-4 w-4 text-blue-400" />
          CPF Account
        </button>
      )}
    </div>
  )
}
