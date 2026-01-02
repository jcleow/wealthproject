'use client'

import { useState } from 'react'
import { Check, Plus, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { IconPicker } from '@/components/modals/ScenarioEventModal/components/IconPicker'
import { MonthPicker } from '@/components/ui/MonthPicker'
import type { FeeItem } from '../types'

interface FeeEditorProps {
  fees: FeeItem[]
  onFeesChange: (fees: FeeItem[]) => void
  basePrice: number
  title?: string
  purchaseDate?: string // YYYY-MM format
}

/**
 * Calculate fee amount based on type and base price
 */
function calculateFeeAmount(fee: FeeItem, basePrice: number): number {
  if (!fee.enabled) return 0
  if (fee.type === 'percentage') {
    return basePrice * (fee.value / 100)
  }
  return fee.value
}

/**
 * FeeEditor - Ledger-style expense list with horizontal grid layout.
 * Designed for professional financial workstation feel.
 */
export function FeeEditor({
  fees,
  onFeesChange,
  basePrice,
  title = "Fees & Expenses",
  purchaseDate,
}: FeeEditorProps) {
  const [newFeeName, setNewFeeName] = useState('')
  const [newFeeIcon, setNewFeeIcon] = useState('circle-dot')
  const [newFeeIconColor, setNewFeeIconColor] = useState('#6366f1')
  const [iconSearchQuery, setIconSearchQuery] = useState('')

  // Helper to get month input value from offset
  const getMonthValueFromOffset = (offset: number): string => {
    if (!purchaseDate) return ''
    const [year, month] = purchaseDate.split('-').map(Number)
    const date = new Date(year, month - 1 + offset, 1)
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
  }

  // Helper to convert month value to offset
  const getOffsetFromMonthValue = (monthValue: string): number => {
    if (!purchaseDate || !monthValue) return 0
    const [purchaseYear, purchaseMonth] = purchaseDate.split('-').map(Number)
    const [targetYear, targetMonth] = monthValue.split('-').map(Number)
    return (targetYear - purchaseYear) * 12 + (targetMonth - purchaseMonth)
  }

  const handleToggleFee = (id: string) => {
    onFeesChange(fees.map(fee =>
      fee.id === id ? { ...fee, enabled: !fee.enabled } : fee
    ))
  }

  const handleUpdateFee = (id: string, updates: Partial<FeeItem>) => {
    onFeesChange(fees.map(fee =>
      fee.id === id ? { ...fee, ...updates } : fee
    ))
  }

  const handleDeleteFee = (id: string) => {
    onFeesChange(fees.filter(fee => fee.id !== id))
  }

  const handleAddFee = () => {
    if (!newFeeName.trim()) return

    const newFee: FeeItem = {
      id: `custom-${Date.now()}`,
      name: newFeeName.trim(),
      type: 'fixed',
      value: 0,
      enabled: true,
      dueOffset: 0,
      icon: newFeeIcon,
      iconColor: newFeeIconColor,
    }
    onFeesChange([...fees, newFee])
    setNewFeeName('')
    setNewFeeIcon('circle-dot')
    setNewFeeIconColor('#6366f1')
    setIconSearchQuery('')
  }

  const totalFees = fees.reduce((sum, fee) => {
    return sum + calculateFeeAmount(fee, basePrice)
  }, 0)

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between px-1">
        <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">{title}</span>
        <span className="text-xs text-slate-500 font-mono tabular-nums">
          Total: <span className="text-slate-300">${totalFees.toLocaleString()}</span>
        </span>
      </div>

      {/* Fee rows - ledger style */}
      <div className="space-y-px rounded-lg overflow-hidden border border-white/[0.06] bg-white/[0.01]">
        {fees.map((fee) => {
          const amount = calculateFeeAmount(fee, basePrice)
          const monthValue = getMonthValueFromOffset(fee.dueOffset || 0)

          return (
            <div
              key={fee.id}
              className={cn(
                "group px-3 py-2 transition-colors",
                fee.enabled
                  ? "bg-white/[0.02] hover:bg-white/[0.03]"
                  : "bg-transparent opacity-40"
              )}
            >
              {/* Row 1: [icon] [name] [date] [$|%] [amount] [X] */}
              <div className="flex items-center gap-2">
                {/* Icon with checkbox overlay */}
                <div className="relative shrink-0">
                  <IconPicker
                    iconName={fee.icon || 'circle-dot'}
                    iconColor={fee.iconColor || '#6366f1'}
                    searchQuery=""
                    onIconChange={(name) => handleUpdateFee(fee.id, { icon: name })}
                    onColorChange={(color) => handleUpdateFee(fee.id, { iconColor: color })}
                    onSearchChange={() => {}}
                    disabled={!fee.enabled}
                    compact
                  />
                  {/* Checkbox overlays bottom-right of icon */}
                  <button
                    type="button"
                    onClick={() => handleToggleFee(fee.id)}
                    className={cn(
                      "absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-sm border flex items-center justify-center transition-colors",
                      fee.enabled
                        ? "bg-emerald-500 border-emerald-600"
                        : "bg-slate-800 border-slate-600 hover:border-slate-500"
                    )}
                  >
                    {fee.enabled && <Check className="w-2 h-2 text-white" />}
                  </button>
                </div>

                {/* Name */}
                <input
                  type="text"
                  value={fee.name}
                  onChange={(e) => handleUpdateFee(fee.id, { name: e.target.value })}
                  disabled={!fee.enabled}
                  className={cn(
                    "flex-1 min-w-0 bg-transparent border-0 outline-none text-sm font-medium",
                    fee.enabled ? "text-slate-100" : "text-slate-500"
                  )}
                />

                {/* Date picker */}
                {purchaseDate && (
                  <MonthPicker
                    value={monthValue}
                    onChange={(value) => handleUpdateFee(fee.id, { dueOffset: getOffsetFromMonthValue(value) })}
                    compact
                    disabled={!fee.enabled}
                    className="shrink-0"
                  />
                )}

                {/* Type toggle + Amount */}
                {fee.enabled && (
                  <>
                    {/* Type toggle */}
                    <div className="flex items-center shrink-0">
                      <button
                        type="button"
                        onClick={() => handleUpdateFee(fee.id, { type: 'fixed' })}
                        className={cn(
                          "px-1.5 py-0.5 text-[10px] font-medium rounded-l border-y border-l transition-colors",
                          fee.type === 'fixed'
                            ? "bg-white/[0.06] text-slate-400 border-white/[0.08]"
                            : "bg-transparent text-slate-600 border-white/[0.05] hover:text-slate-500"
                        )}
                      >
                        $
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUpdateFee(fee.id, { type: 'percentage' })}
                        className={cn(
                          "px-1.5 py-0.5 text-[10px] font-medium rounded-r border transition-colors",
                          fee.type === 'percentage'
                            ? "bg-white/[0.06] text-slate-400 border-white/[0.08]"
                            : "bg-transparent text-slate-600 border-white/[0.05] hover:text-slate-500"
                        )}
                      >
                        %
                      </button>
                    </div>

                    {/* Amount */}
                    <input
                      type="text"
                      inputMode="numeric"
                      value={fee.type === 'fixed' ? fee.value.toLocaleString() : String(fee.value)}
                      onChange={(e) => {
                        const rawValue = e.target.value.replace(/[^0-9.]/g, '')
                        handleUpdateFee(fee.id, { value: parseFloat(rawValue) || 0 })
                      }}
                      className="w-16 bg-transparent border-0 outline-none text-xs font-mono tabular-nums text-slate-300 text-right shrink-0"
                    />
                  </>
                )}

                {/* Delete - appears on hover */}
                <button
                  type="button"
                  onClick={() => handleDeleteFee(fee.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                >
                  <X className="w-3.5 h-3.5 text-slate-600 hover:text-red-400 transition-colors" />
                </button>
              </div>

              {/* Row 2: Calculated total for percentage - right-aligned */}
              {fee.enabled && fee.type === 'percentage' && fee.value > 0 && (
                <div className="flex justify-end mt-1 pr-6">
                  <span className="text-[10px] font-mono tabular-nums text-slate-500">
                    = ${amount.toLocaleString()}
                  </span>
                </div>
              )}
            </div>
          )
        })}

        {/* Add new row */}
        <div className="flex items-center gap-3 px-3 h-10 bg-transparent border-t border-white/[0.04]">
          <div className="flex items-center gap-1.5 shrink-0">
            <IconPicker
              iconName={newFeeIcon}
              iconColor={newFeeIconColor}
              searchQuery={iconSearchQuery}
              onIconChange={setNewFeeIcon}
              onColorChange={setNewFeeIconColor}
              onSearchChange={setIconSearchQuery}
              compact
            />
            <div className="w-3.5 h-3.5" /> {/* Spacer for alignment */}
          </div>

          <input
            type="text"
            value={newFeeName}
            onChange={(e) => setNewFeeName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddFee()}
            placeholder="Add expense..."
            className="flex-1 min-w-0 bg-transparent border-0 outline-none text-sm text-slate-400 placeholder:text-slate-600"
          />

          <button
            type="button"
            onClick={handleAddFee}
            disabled={!newFeeName.trim()}
            className={cn(
              "p-1 rounded transition-colors shrink-0",
              newFeeName.trim()
                ? "text-emerald-400 hover:bg-emerald-500/10"
                : "text-slate-700 cursor-not-allowed"
            )}
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

export { calculateFeeAmount }
