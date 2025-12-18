"use client"

import { Loader2 } from 'lucide-react'

interface FormFooterProps {
  lastSavedAt: string | null
  isSavingDraft: boolean
  onSavePlan: () => void
  onGenerate: () => void
  isValid: boolean
  assetInput: string
  liabilityInput: string
  scenarioId: string | null
  helperMessage: string | null
}

export function FormFooter({
  lastSavedAt,
  isSavingDraft,
  onSavePlan,
  onGenerate,
  isValid,
  assetInput,
  liabilityInput,
  scenarioId,
  helperMessage,
}: FormFooterProps) {
  return (
    <>
      <div className="mt-3 flex flex-wrap gap-3 text-xs text-gray-300">
        {assetInput && <span className="rounded-full bg-white/5 px-3 py-1">Asset: {assetInput}</span>}
        {liabilityInput && <span className="rounded-full bg-white/5 px-3 py-1">Loan: {liabilityInput}</span>}
        {scenarioId && <span className="rounded-full bg-white/5 px-3 py-1">Scenario ID: {scenarioId}</span>}
        {helperMessage && <span className="text-blue-200">{helperMessage}</span>}
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4">
        <div className="text-xs text-gray-400">
          {lastSavedAt
            ? `Last saved ${new Date(lastSavedAt).toLocaleTimeString()}`
            : 'Draft not saved yet'}
        </div>
        <div className="flex items-center gap-2">
          <button
            className="rounded-full border border-white/15 bg-[#030712] px-4 py-2 text-sm text-gray-200 transition hover:border-white/30 disabled:opacity-50"
            type="button"
            onClick={onSavePlan}
            disabled={isSavingDraft}
          >
            {isSavingDraft ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Saving...
              </span>
            ) : (
              'Save Plan'
            )}
          </button>
          <button
            className="rounded-full bg-emerald-500 px-5 py-2 text-sm font-semibold text-white shadow-[0_10px_30px_rgba(16,185,129,0.35)] transition hover:bg-emerald-400 disabled:opacity-50"
            type="button"
            onClick={onGenerate}
            disabled={!isValid}
          >
            Generate Overview
          </button>
        </div>
      </div>
    </>
  )
}
