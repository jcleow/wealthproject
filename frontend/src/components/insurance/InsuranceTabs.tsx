'use client'

import { useColorScheme } from '@/stores'

export type InsuranceTabId = 'overview' | 'journey' | 'policies'

interface InsuranceTabsProps {
  activeTab: InsuranceTabId
  onTabChange: (tab: InsuranceTabId) => void
}

const tabs: { id: InsuranceTabId; label: string }[] = [
  { id: 'overview', label: 'Coverage' },
  { id: 'journey', label: 'Journey' },
  { id: 'policies', label: 'Policies' },
]

export function InsuranceTabs({ activeTab, onTabChange }: InsuranceTabsProps) {
  const colorScheme = useColorScheme()
  const isMonet = colorScheme === 'monet'

  return (
    <div className="relative z-10">
      <nav className="flex" aria-label="Insurance planner tabs">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className="relative px-5 py-2.5 text-[13px] font-medium transition-colors duration-200"
              style={{
                color: isActive
                  ? isMonet ? '#3D3D3D' : '#F0F0F0'
                  : isMonet ? '#9B9B9B' : '#71717A',
                borderBottom: `2px solid ${
                  isActive
                    ? isMonet ? '#9B8BB4' : '#F0F0F0'
                    : 'transparent'
                }`,
              }}
              aria-selected={isActive}
              role="tab"
            >
              {tab.label}
            </button>
          )
        })}
        {/* Spacer — extends the bottom border line across remaining width */}
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
