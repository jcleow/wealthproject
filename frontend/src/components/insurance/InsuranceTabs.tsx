'use client'

import { cn } from '@/lib/utils'
import { FileText, Shield, TrendingUp } from 'lucide-react'
import { useColorScheme } from '@/stores'

export type InsuranceTabId = 'overview' | 'journey' | 'policies'

interface InsuranceTabsProps {
  activeTab: InsuranceTabId
  onTabChange: (tab: InsuranceTabId) => void
}

// Monet color palette
const monetTabColors = {
  lavender: '#9B8BB4',
  lavenderLight: '#C4B8D9',
  sage: '#7FB285',
  textPrimary: '#3D3D3D',
  textSecondary: '#6B6B6B',
  textMuted: '#9B9B9B',
}

// Dark mode color palette
const darkTabColors = {
  primary: '#a78bfa',
  primaryLight: '#c4b5fd',
  success: '#34d399',
  textPrimary: '#f1f5f9',
  textSecondary: '#94a3b8',
  textMuted: '#64748b',
}

const tabs: { id: InsuranceTabId; label: string; icon: React.ElementType }[] = [
  { id: 'overview', label: 'My Coverage', icon: Shield },
  { id: 'journey', label: 'Journey', icon: TrendingUp },
  { id: 'policies', label: 'Policies', icon: FileText },
]

export function InsuranceTabs({ activeTab, onTabChange }: InsuranceTabsProps) {
  const colorScheme = useColorScheme()
  const isMonet = colorScheme === 'monet'
  const colors = isMonet ? monetTabColors : darkTabColors

  return (
    <div
      className="relative z-10 transition-colors duration-300"
      style={{
        background: isMonet ? 'rgba(255, 255, 255, 0.4)' : 'rgba(17, 17, 17, 0.8)',
        borderBottom: isMonet
          ? '1px solid rgba(155, 139, 180, 0.1)'
          : '1px solid rgba(255, 255, 255, 0.06)',
        backdropFilter: 'blur(8px)',
      }}
    >
      <div className="max-w-7xl px-8">
        <nav className="flex gap-2 py-2" aria-label="Insurance planner tabs">
          {tabs.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id

            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={cn(
                  'group relative flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-300',
                  isActive && 'transform scale-[1.02]'
                )}
                style={{
                  background: isActive
                    ? isMonet
                      ? 'rgba(255, 255, 255, 0.85)'
                      : 'rgba(255, 255, 255, 0.08)'
                    : 'transparent',
                  color: isActive ? colors.textPrimary : colors.textMuted,
                  boxShadow: isActive
                    ? isMonet
                      ? '0 4px 20px rgba(155, 139, 180, 0.15), 0 2px 8px rgba(155, 139, 180, 0.1)'
                      : '0 4px 20px rgba(0, 0, 0, 0.3)'
                    : 'none',
                }}
                aria-selected={isActive}
                role="tab"
              >
                <Icon
                  className="h-4 w-4 transition-all duration-300"
                  style={{
                    color: isActive
                      ? isMonet
                        ? monetTabColors.lavender
                        : darkTabColors.primary
                      : colors.textMuted,
                  }}
                />
                <span style={{ fontFamily: isMonet ? "'DM Sans', system-ui, sans-serif" : 'inherit' }}>
                  {tab.label}
                </span>

                {/* Subtle active indicator */}
                {isActive && (
                  <span
                    className="absolute bottom-1 left-1/2 -translate-x-1/2 h-0.5 w-8 rounded-full"
                    style={{
                      background: isMonet
                        ? `linear-gradient(90deg, ${monetTabColors.lavenderLight}, ${monetTabColors.lavender})`
                        : `linear-gradient(90deg, ${darkTabColors.primaryLight}, ${darkTabColors.primary})`,
                    }}
                  />
                )}

                {/* Hover effect for inactive tabs */}
                {!isActive && (
                  <span
                    className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10"
                    style={{
                      background: isMonet ? 'rgba(255, 255, 255, 0.5)' : 'rgba(255, 255, 255, 0.05)',
                    }}
                  />
                )}
              </button>
            )
          })}
        </nav>
      </div>
    </div>
  )
}
