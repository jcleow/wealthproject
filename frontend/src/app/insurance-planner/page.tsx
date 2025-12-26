'use client'

import { useState } from 'react'
import { ArrowLeft, Shield, X } from 'lucide-react'
import Link from 'next/link'
import {
  InsuranceTabs,
  type InsuranceTabId,
} from '@/components/insurance/InsuranceTabs'
import { OverviewTab } from '@/components/insurance/tabs/OverviewTab'
import { PoliciesTab } from '@/components/insurance/tabs/PoliciesTab'
import { GapAnalysisTab } from '@/components/insurance/tabs/GapAnalysisTab'
import { RecommendationsTab } from '@/components/insurance/tabs/RecommendationsTab'

// Embedded view component for use within Dashboard
export function InsurancePlannerView({ onClose }: { onClose?: () => void }) {
  const [activeTab, setActiveTab] = useState<InsuranceTabId>('overview')

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header */}
      <header className="shrink-0 border-b border-white/[0.06] bg-white/[0.01]">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 shadow-lg shadow-purple-500/20">
                <Shield className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-white">
                  Insurance Planner
                </h1>
                <p className="text-sm text-slate-400">
                  Analyze coverage gaps and plan your protection
                </p>
              </div>
            </div>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-white/5 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Tab Navigation */}
      <InsuranceTabs activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Main Content - scrollable */}
      <main className="flex-1 overflow-y-auto px-6 py-6">
        {activeTab === 'overview' && <OverviewTab />}
        {activeTab === 'policies' && <PoliciesTab />}
        {activeTab === 'gap-analysis' && <GapAnalysisTab />}
        {activeTab === 'recommendations' && <RecommendationsTab />}
      </main>
    </div>
  )
}

// Standalone page for direct navigation
export default function InsurancePlannerPage() {
  const [activeTab, setActiveTab] = useState<InsuranceTabId>('overview')

  return (
    <div className="min-h-screen bg-[#070B14]">
      {/* Header */}
      <header className="border-b border-white/[0.06] bg-white/[0.01]">
        <div className="mx-auto max-w-7xl px-6 py-4">
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className="flex items-center gap-2 text-slate-400 transition-colors hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="text-sm">Dashboard</span>
            </Link>

            <div className="h-6 w-px bg-white/[0.08]" />

            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 shadow-lg shadow-purple-500/20">
                <Shield className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-white">
                  Insurance Planner
                </h1>
                <p className="text-sm text-slate-400">
                  Analyze coverage gaps and plan your protection
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Tab Navigation */}
      <InsuranceTabs activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-6 py-6">
        {activeTab === 'overview' && <OverviewTab />}
        {activeTab === 'policies' && <PoliciesTab />}
        {activeTab === 'gap-analysis' && <GapAnalysisTab />}
        {activeTab === 'recommendations' && <RecommendationsTab />}
      </main>
    </div>
  )
}
