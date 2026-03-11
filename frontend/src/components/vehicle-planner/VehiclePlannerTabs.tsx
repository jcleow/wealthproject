'use client'

import clsx from 'clsx'
import type { VehicleTabId } from '@/types/vehicle'
import { useColorScheme } from '@/stores'

const TABS: { id: VehicleTabId; label: string }[] = [
  { id: 'vehicle', label: 'Vehicle & Financing' },
  { id: 'costs', label: 'Cost Breakdown' },
  { id: 'depreciation', label: 'Depreciation' },
  { id: 'tco', label: 'Total Cost' },
  { id: 'scenarios', label: 'Scenarios' },
]

interface VehiclePlannerTabsProps {
  activeTab: VehicleTabId
  onTabChange: (tab: VehicleTabId) => void
}

export function VehiclePlannerTabs({ activeTab, onTabChange }: VehiclePlannerTabsProps) {
  const colorScheme = useColorScheme()
  const isMonet = colorScheme === 'monet'

  return (
    <div className="flex items-end">
      {TABS.map((tab) => {
        const isActive = activeTab === tab.id
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            onClick={() => onTabChange(tab.id)}
            className={clsx(
              'text-[13px] whitespace-nowrap transition-colors duration-200',
              isActive
                ? isMonet
                  ? 'text-[#2D2D2D] font-medium border-b-2 border-[#2D2D2D]'
                  : 'text-[#E8E6E1] font-medium border-b-2 border-[#E8E6E1]'
                : isMonet
                  ? 'text-[#9CA3AF] font-normal border-b border-[#E8E6E1]'
                  : 'text-[#9CA3AF] font-normal border-b border-[#2D2D33]'
            )}
            style={{ padding: '10px 20px' }}
          >
            {tab.label}
          </button>
        )
      })}
      {/* Spacer extends the bottom border line across the remaining width */}
      <div
        className={clsx(
          'flex-1',
          isMonet ? 'border-b border-[#E8E6E1]' : 'border-b border-[#2D2D33]'
        )}
        style={{ height: 0 }}
      />
    </div>
  )
}
