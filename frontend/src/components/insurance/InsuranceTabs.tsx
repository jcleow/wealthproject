'use client'

import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  FileText,
} from 'lucide-react'

export type InsuranceTabId =
  | 'overview'
  | 'policies'

interface InsuranceTabsProps {
  activeTab: InsuranceTabId
  onTabChange: (tab: InsuranceTabId) => void
}

const tabs: { id: InsuranceTabId; label: string; icon: React.ElementType }[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'policies', label: 'Policies', icon: FileText },
]

export function InsuranceTabs({ activeTab, onTabChange }: InsuranceTabsProps) {
  return (
    <div className="border-b border-white/[0.06] bg-white/[0.01]">
      <div className="mx-auto max-w-7xl px-6">
        <nav className="flex gap-1" aria-label="Insurance planner tabs">
          {tabs.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id

            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={cn(
                  'group relative flex items-center gap-2 px-4 py-3 text-sm font-medium transition-all duration-200',
                  isActive
                    ? 'text-white'
                    : 'text-slate-400 hover:text-slate-200'
                )}
                aria-selected={isActive}
                role="tab"
              >
                <Icon
                  className={cn(
                    'h-4 w-4 transition-colors',
                    isActive ? 'text-emerald-400' : 'text-slate-500 group-hover:text-slate-400'
                  )}
                />
                <span>{tab.label}</span>

                {/* Active indicator */}
                {isActive && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-emerald-500 to-emerald-400" />
                )}
              </button>
            )
          })}
        </nav>
      </div>
    </div>
  )
}
