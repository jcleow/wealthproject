import { useState, useRef, useEffect } from 'react'
import { Plus, Wallet, BarChart3, Shield, ChevronRight } from 'lucide-react'
import clsx from 'clsx'
import { useColorScheme } from '@/stores'
import { formatCurrency } from '@/lib/format'
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
  /** Total amount to display as subtitle like Stitch */
  total?: number
}

export function CategoryCardHeader({
  category,
  showMonthlyData,
  sortDirection: _sortDirection,
  onToggleSortDirection: _onToggleSortDirection,
  onAddItem,
  onAddInvestment,
  onAddCpf,
  isCollapsed = false,
  onToggleCollapse,
  total,
}: CategoryCardHeaderProps) {
  const colorScheme = useColorScheme()
  const isMonet = colorScheme === 'monet'
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
    <div className={clsx(
      "flex items-center justify-between px-4 py-3",
      // No border - Stitch style uses clean cards without internal borders
    )}>
      {/* Left side: Icon + Title/Total - clickable to expand */}
      <button
        type="button"
        onClick={onToggleCollapse}
        className="flex flex-1 items-center gap-3 hover:opacity-80 transition-opacity"
      >
        {/* Icon container - solid colored background with white icon like Stitch */}
        <div className={clsx(
          "rounded-xl p-2.5 shadow-sm shrink-0",
          isMonet ? config.iconBgLight : config.iconBg
        )}>
          <IconComponent className={clsx(
            "h-5 w-5",
            isMonet ? config.iconColorLight : config.iconColor
          )} />
        </div>
        <div className="flex flex-col items-start min-w-0">
          <h4 className={clsx(
            "text-sm font-semibold",
            isMonet ? "text-slate-800" : "text-slate-100"
          )}>{getTitle()}</h4>
          {total !== undefined && (
            <span className={clsx(
              "text-xs tabular-nums",
              isMonet ? "text-slate-500" : "text-slate-400"
            )}>
              {formatCurrency(total)}
            </span>
          )}
        </div>
      </button>

      {/* Right side: Add button + Chevron */}
      <div className="flex items-center gap-2 shrink-0">
        {showAssetDropdown ? (
          <div className="relative" ref={menuRef}>
            <button
              onClick={(e) => {
                e.stopPropagation()
                setShowAssetMenu(!showAssetMenu)
              }}
              className={clsx(
                "h-8 w-8 rounded-full flex items-center justify-center transition-all",
                isMonet
                  ? "bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700"
                  : "bg-white/[0.06] text-slate-400 hover:bg-white/[0.1] hover:text-slate-200"
              )}
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
            onClick={(e) => {
              e.stopPropagation()
              onAddItem()
            }}
            className={clsx(
              "h-8 w-8 rounded-full flex items-center justify-center transition-all",
              isMonet
                ? "bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700"
                : "bg-white/[0.06] text-slate-400 hover:bg-white/[0.1] hover:text-slate-200"
            )}
            type="button"
            title="Add Item"
          >
            <Plus className="h-4 w-4" />
          </button>
        )}

        {/* Chevron at far right - Stitch style */}
        {onToggleCollapse && (
          <button
            type="button"
            onClick={onToggleCollapse}
            className={clsx(
              "p-1 rounded-md transition-colors",
              isMonet
                ? "hover:bg-slate-100 text-slate-400"
                : "hover:bg-white/5 text-slate-500"
            )}
          >
            <ChevronRight
              className={clsx(
                "h-5 w-5 transition-transform duration-200",
                !isCollapsed ? 'rotate-90' : ''
              )}
            />
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
