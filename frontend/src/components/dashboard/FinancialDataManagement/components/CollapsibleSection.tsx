import { useState, useRef, useEffect, useCallback, type ReactNode } from 'react'
import { ChevronDown, Pencil, Trash2 } from 'lucide-react'
import * as Tooltip from '@radix-ui/react-tooltip'
import clsx from 'clsx'
import { formatCurrency } from '@/lib/format'
import { useColorScheme } from '@/stores'
import { getIconByName } from '../utils'

// Subcomponent for rendering item icons with optional tooltip and click handler
interface ItemIconProps {
  icon: string
  iconColor?: string
  tooltipLabel?: string
  onIconClick?: () => void
}

function ItemIcon({ icon, iconColor, tooltipLabel, onIconClick }: ItemIconProps) {
  const IconComponent = getIconByName(icon)

  const iconElement = IconComponent ? (
    <IconComponent
      className="h-3.5 w-3.5"
      style={{ color: iconColor ?? '#6366f1' }}
    />
  ) : (
    <span
      className="flex h-3.5 w-3.5 items-center justify-center rounded-full text-[8px] font-bold text-white"
      style={{ backgroundColor: iconColor ?? '#6366f1' }}
    >
      {icon.slice(0, 1).toUpperCase()}
    </span>
  )

  if (onIconClick) {
    const button = (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          onIconClick()
        }}
        className="flex-shrink-0 rounded p-0.5 transition hover:bg-white/10"
      >
        {iconElement}
      </button>
    )

    if (tooltipLabel) {
      return (
        <Tooltip.Provider delayDuration={0}>
          <Tooltip.Root>
            <Tooltip.Trigger asChild>
              {button}
            </Tooltip.Trigger>
            <Tooltip.Content
              side="top"
              sideOffset={6}
              className="z-50 rounded-md bg-black px-2 py-1 text-xs text-white shadow-lg"
            >
              {tooltipLabel}
            </Tooltip.Content>
          </Tooltip.Root>
        </Tooltip.Provider>
      )
    }
    return button
  }

  if (tooltipLabel) {
    return (
      <Tooltip.Provider delayDuration={0}>
        <Tooltip.Root>
          <Tooltip.Trigger asChild>
            <span className="flex-shrink-0">{iconElement}</span>
          </Tooltip.Trigger>
          <Tooltip.Content
            side="top"
            sideOffset={6}
            className="z-50 rounded-md bg-black px-2 py-1 text-xs text-white shadow-lg"
          >
            {tooltipLabel}
          </Tooltip.Content>
        </Tooltip.Root>
      </Tooltip.Provider>
    )
  }

  return <span className="flex-shrink-0">{iconElement}</span>
}

interface CollapsibleSectionProps {
  title: string
  total: number
  totalSuffix?: string
  defaultCollapsed?: boolean
  children: ReactNode
}

export function CollapsibleSection({
  title,
  total,
  totalSuffix,
  defaultCollapsed = true,
  children,
}: CollapsibleSectionProps) {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed)
  const colorScheme = useColorScheme()
  const isMonet = colorScheme === 'monet'

  return (
    <div className={clsx(
      "mt-3 border-t pt-3",
      isMonet ? "border-slate-200" : "border-white/[0.06]"
    )}>
      <button
        type="button"
        onClick={() => setIsCollapsed(!isCollapsed)}
        className={clsx(
          "mb-1 flex w-full items-center gap-2 rounded-md px-2 py-1.5 transition-colors",
          isMonet ? "hover:bg-slate-100" : "hover:bg-white/[0.03]"
        )}
      >
        <ChevronDown className={clsx(
          "h-4 w-4 transition-transform shrink-0",
          isMonet ? "text-slate-500" : "text-slate-400",
          isCollapsed && "-rotate-90"
        )} />
        <span className={clsx(
          "text-xs font-medium uppercase tracking-wider",
          isMonet ? "text-slate-600" : "text-slate-400"
        )}>{title}</span>
        <span className={clsx(
          "ml-auto text-sm font-medium",
          isMonet ? "text-slate-700" : "text-slate-300"
        )}>
          {formatCurrency(total)}
          {totalSuffix && <span className={clsx("ml-1 text-xs", isMonet ? "text-slate-500" : "text-slate-500")}>{totalSuffix}</span>}
        </span>
      </button>
      {!isCollapsed && children}
    </div>
  )
}

// Reusable item row component for use inside CollapsibleSection
interface CollapsibleItemProps {
  id: string
  name: string
  amount: number
  amountSuffix?: string  // e.g., '/mo', '/yr', '%'
  formatAsCurrency?: boolean  // Default true, set false for percentages
  isSelected: boolean
  onSelect: (id: string) => void
  onEdit?: () => void
  onDelete?: () => void
  icon?: string  // Lucide icon name (kebab-case)
  iconColor?: string  // Hex color for icon
  tooltipLabel?: string  // Optional tooltip text when hovering icon
  onIconClick?: () => void  // Optional click handler for icon (e.g., open modal)
}

export function CollapsibleItem({
  id,
  name,
  amount,
  amountSuffix,
  formatAsCurrency = true,
  isSelected,
  onSelect,
  onEdit,
  onDelete,
  icon,
  iconColor,
  tooltipLabel,
  onIconClick,
}: CollapsibleItemProps) {
  const colorScheme = useColorScheme()
  const isMonet = colorScheme === 'monet'

  // For percentage suffix, don't format as currency
  const shouldFormatAsCurrency = formatAsCurrency && amountSuffix !== '%'
  const displayAmount = shouldFormatAsCurrency ? formatCurrency(amount) : amount

  return (
    <div
      onClick={() => onSelect(id)}
      className={clsx(
        "relative flex cursor-pointer items-center justify-between rounded-lg px-2 py-2 transition-colors",
        isMonet
          ? (isSelected ? "bg-slate-100" : "hover:bg-slate-50")
          : (isSelected ? "bg-white/[0.06]" : "hover:bg-white/[0.04]")
      )}
    >
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <span className={clsx("text-sm", isMonet ? "text-slate-700" : "text-slate-300")}>{name}</span>
        {icon && (
          <ItemIcon
            icon={icon}
            iconColor={iconColor}
            tooltipLabel={tooltipLabel}
            onIconClick={onIconClick}
          />
        )}
      </div>
      <span className={clsx(
        "font-mono tabular-nums text-sm transition-opacity",
        isMonet ? "text-slate-600" : "text-slate-300",
        isSelected && "opacity-0"
      )}>
        {displayAmount}
        {amountSuffix && <span className={clsx("ml-1 text-xs", isMonet ? "text-slate-500" : "text-slate-400")}>{amountSuffix}</span>}
      </span>
      {isSelected && (onEdit || onDelete) && (
        <div className="absolute right-2 flex items-center gap-0.5">
          {onEdit && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onEdit()
              }}
              className={clsx(
                "p-1 rounded transition-colors",
                isMonet ? "hover:bg-blue-100 text-slate-500 hover:text-blue-600" : "hover:bg-blue-500/20 text-slate-400 hover:text-blue-300"
              )}
              type="button"
              title="Edit"
            >
              <Pencil className="h-3 w-3" />
            </button>
          )}
          {onDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onDelete()
              }}
              className={clsx(
                "p-1 rounded transition-colors",
                isMonet ? "hover:bg-rose-100 text-slate-500 hover:text-rose-600" : "hover:bg-rose-500/20 text-slate-400 hover:text-rose-300"
              )}
              type="button"
              title="Delete"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// Hook to manage selection state with click-outside handling
export function useCollapsibleSelection() {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const sectionRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (sectionRef.current && !sectionRef.current.contains(event.target as Node)) {
        setSelectedId(null)
      }
    }
    if (selectedId) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [selectedId])

  const handleSelect = useCallback((id: string) => {
    setSelectedId((prev) => (prev === id ? null : id))
  }, [])

  return { selectedId, handleSelect, sectionRef }
}
