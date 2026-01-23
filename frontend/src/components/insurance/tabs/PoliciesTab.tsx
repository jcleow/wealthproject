'use client'

import { useState } from 'react'
import { Plus, Shield } from 'lucide-react'
import { AddPolicyModal } from '../modals/AddPolicyModal'
import { useColorScheme } from '@/stores'
import { getInsuranceTheme } from '@/lib/insurance-theme'

export function PoliciesTab() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const colorScheme = useColorScheme()
  const monetColors = getInsuranceTheme(colorScheme)
  const isMonet = colorScheme === 'monet'

  return (
    <div className="space-y-6 p-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2
            className="text-xl font-semibold"
            style={{
              color: monetColors.textPrimary,
              fontFamily: "'Cormorant Garamond', Georgia, serif",
            }}
          >
            Your Policies
          </h2>
          <p className="text-sm mt-1" style={{ color: monetColors.textSecondary }}>
            Manage all your insurance policies in one place
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium text-white transition-all duration-200 hover:scale-105"
          style={{
            background: `linear-gradient(135deg, ${monetColors.lavender}, ${monetColors.lavenderDark})`,
            boxShadow: `0 4px 16px ${monetColors.shadowSoft}`,
          }}
        >
          <Plus className="h-4 w-4" />
          Add Policy
        </button>
      </div>

      {/* Empty State */}
      <div
        className="flex flex-col items-center justify-center rounded-2xl py-16 backdrop-blur-sm"
        style={{
          background: monetColors.cardBg,
          border: `1px solid ${monetColors.cardBorder}`,
          boxShadow: `0 4px 20px ${monetColors.shadowSoft}`,
        }}
      >
        <div
          className="flex h-20 w-20 items-center justify-center rounded-2xl"
          style={{
            background: `linear-gradient(135deg, ${monetColors.lavenderLight}40, ${monetColors.cardBg})`,
            border: `1px solid ${monetColors.lavenderLight}60`,
          }}
        >
          <Shield className="h-10 w-10" style={{ color: monetColors.lavender }} />
        </div>
        <h3
          className="mt-5 text-lg font-semibold"
          style={{
            color: monetColors.textPrimary,
            fontFamily: isMonet ? "'Cormorant Garamond', Georgia, serif" : 'inherit',
          }}
        >
          No policies yet
        </h3>
        <p className="mt-2 text-sm max-w-xs text-center" style={{ color: monetColors.textSecondary }}>
          Add your insurance policies to track coverage and analyze gaps in your protection
        </p>
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="mt-6 flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-medium transition-all duration-200 hover:scale-105"
          style={{
            background: monetColors.cardBgHover,
            border: `1px solid ${monetColors.lavender}40`,
            color: monetColors.lavenderDark,
            boxShadow: `0 2px 12px ${monetColors.shadowSoft}`,
          }}
        >
          <Plus className="h-4 w-4" />
          Add Your First Policy
        </button>
      </div>

      {/* Future: Policy List would go here */}
      {/* Each policy card would use the Monet glass card pattern:
          - background: 'rgba(255, 255, 255, 0.6)'
          - border: '1px solid rgba(155, 139, 180, 0.15)'
          - boxShadow: monetColors.shadowSoft
          - rounded-2xl with hover scale effect
      */}

      {/* Add Policy Modal */}
      <AddPolicyModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={(policy) => {
          console.log('Policy saved:', policy)
          // TODO: Save to backend
        }}
      />
    </div>
  )
}
