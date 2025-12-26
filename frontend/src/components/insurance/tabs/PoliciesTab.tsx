'use client'

import { FileText, Plus } from 'lucide-react'

export function PoliciesTab() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">Your Policies</h2>
          <p className="text-sm text-slate-400">
            Manage all your insurance policies in one place
          </p>
        </div>
        <button className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-emerald-500/20 transition-all hover:shadow-emerald-500/30">
          <Plus className="h-4 w-4" />
          Add Policy
        </button>
      </div>

      {/* Empty State */}
      <div className="flex flex-col items-center justify-center rounded-2xl border border-white/[0.06] bg-white/[0.02] py-16">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/[0.03]">
          <FileText className="h-8 w-8 text-slate-500" />
        </div>
        <h3 className="mt-4 text-lg font-medium text-white">No policies yet</h3>
        <p className="mt-1 text-sm text-slate-400">
          Add your insurance policies to track coverage and analyze gaps
        </p>
        <button className="mt-6 flex items-center gap-2 rounded-xl border border-white/[0.1] bg-white/[0.03] px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-white/[0.05]">
          <Plus className="h-4 w-4" />
          Add Your First Policy
        </button>
      </div>
    </div>
  )
}
