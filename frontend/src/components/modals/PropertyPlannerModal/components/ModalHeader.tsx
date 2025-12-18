"use client"

import { X } from 'lucide-react'
import type { Asset } from '@/types/financial'
import { Input } from '@/components/ui/input'
import { formatCurrency } from '@/utils/mortgage-calculations'

interface ModalHeaderProps {
  assetInput: string
  onAssetInputChange: (value: string) => void
  onAssetFocus: () => void
  onAssetBlur: () => void
  assets: Asset[]
  selectedAssetId: string
  onClose: () => void
}

export function ModalHeader({
  assetInput,
  onAssetInputChange,
  onAssetFocus,
  onAssetBlur,
  assets,
  selectedAssetId,
  onClose,
}: ModalHeaderProps) {
  return (
    <div className="flex items-center justify-between border-b border-white/10 bg-gradient-to-br from-gray-900 via-gray-950 to-black px-8 py-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold text-white">Property Planner</h2>
        <p className="text-sm text-gray-300">
          Model how your housing loan impacts cash, CPF, and MSR in three guided steps.
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-[12px]">
          <span className="text-sm font-medium uppercase tracking-[0.14em] text-gray-300">
            Currently modeling:
          </span>
          <div className="flex items-center gap-2">
            <Input
              list="property-assets"
              value={assetInput}
              onChange={(event) => onAssetInputChange(event.target.value)}
              onFocus={onAssetFocus}
              onBlur={onAssetBlur}
              placeholder="Select or type a property asset"
              className="h-10 min-w-[260px] rounded-full border border-white/20 bg-white/5 px-4 text-sm font-semibold text-white focus:border-white/10 focus:outline-none focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0 focus:shadow-none"
            />
            <datalist id="property-assets">
              {assets.map((asset) => (
                <option key={asset.id} value={asset.name} />
              ))}
            </datalist>
            {selectedAssetId && (
              <span className="text-sm text-gray-300">
                {formatCurrency(assets.find((a) => a.id === selectedAssetId)?.currentValue ?? 0)}
              </span>
            )}
          </div>
        </div>
      </div>
      <button
        onClick={onClose}
        className="rounded-full p-2 text-gray-400 transition hover:bg-white/10 hover:text-white"
        type="button"
        aria-label="Close mortgage planner"
      >
        <X className="h-6 w-6" />
      </button>
    </div>
  )
}
