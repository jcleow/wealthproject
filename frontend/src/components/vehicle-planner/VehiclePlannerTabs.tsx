'use client'

import { Car, Receipt, TrendingDown, Calculator, GitCompareArrows } from 'lucide-react'
import { useColorScheme } from '@/stores'
import type { VehicleTabId } from '@/types/vehicle'

interface VehiclePlannerTabsProps {
  activeTab: VehicleTabId
  onTabChange: (tab: VehicleTabId) => void
}

const tabs: { id: VehicleTabId; label: string; icon: typeof Car }[] = [
  { id: 'vehicle', label: 'Vehicle & Financing', icon: Car },
  { id: 'costs', label: 'Cost Breakdown', icon: Receipt },
  { id: 'depreciation', label: 'Depreciation', icon: TrendingDown },
  { id: 'tco', label: 'Total Cost', icon: Calculator },
  { id: 'scenarios', label: 'Scenarios', icon: GitCompareArrows },
]

export function VehiclePlannerTabs({ activeTab, onTabChange }: VehiclePlannerTabsProps) {
  const colorScheme = useColorScheme()
  const isMonet = colorScheme === 'monet'

  return (
    <div className="relative z-10">
      <nav className="flex" aria-label="Vehicle planner tabs">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id
          const Icon = tab.icon

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className="relative flex items-center gap-1.5 px-5 py-2.5 text-[13px] font-medium transition-colors duration-200"
              style={{
                color: isActive
                  ? isMonet ? '#3D3D3D' : '#F0F0F0'
                  : isMonet ? '#9B9B9B' : '#71717A',
                borderBottom: `2px solid ${
                  isActive
                    ? isMonet ? '#D4A574' : '#fbbf24'
                    : 'transparent'
                }`,
              }}
              aria-selected={isActive}
              role="tab"
            >
              <Icon className="h-3.5 w-3.5" />
              {tab.label}
            </button>
          )
        })}
        <div
          className="flex-1"
          style={{
            borderBottom: `2px solid ${isMonet ? 'rgba(155, 139, 180, 0.15)' : 'rgba(255, 255, 255, 0.08)'}`,
          }}
        />
      </nav>
    </div>
  )
}
