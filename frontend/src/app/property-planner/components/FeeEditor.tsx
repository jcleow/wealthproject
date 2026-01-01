'use client'

import { useState } from 'react'
import { Check, Plus, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { IconPicker } from '@/components/modals/ScenarioEventModal/components/IconPicker'
import { Input } from '@/components/ui/input'
import { CustomSelect } from '@/components/ui/CustomSelect'
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
 * FeeEditor - A component for managing a list of fees/expenses.
 * Supports both fixed and percentage-based fees with icon customization.
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

  // Helper to format date for display
  const formatDateDisplay = (monthValue: string): string => {
    if (!monthValue) return ''
    const [year, month] = monthValue.split('-').map(Number)
    const date = new Date(year, month - 1, 1)
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-white/80">{title}</h4>
        <span className="text-sm text-white/60">
          Total: <span className="font-mono tabular-nums text-white/80">${totalFees.toLocaleString()}</span>
        </span>
      </div>

      {/* Existing fees */}
      <div className="space-y-2">
        {fees.map((fee) => {
          const amount = calculateFeeAmount(fee, basePrice)
          return (
            <div
              key={fee.id}
              className={cn(
                "p-3 rounded-lg border transition-all",
                fee.enabled
                  ? "bg-white/5 border-white/10"
                  : "bg-white/[0.02] border-white/5"
              )}
            >
              {/* Top row: icon, toggle, name, date badge, delete */}
              <div className="flex items-center gap-2 mb-2">
                {/* Icon Picker */}
                <IconPicker
                  iconName={fee.icon || 'circle-dot'}
                  iconColor={fee.iconColor || '#6366f1'}
                  searchQuery=""
                  onIconChange={(name) => handleUpdateFee(fee.id, { icon: name })}
                  onColorChange={(color) => handleUpdateFee(fee.id, { iconColor: color })}
                  onSearchChange={() => {}}
                  disabled={!fee.enabled}
                />

                {/* Toggle */}
                <button
                  type="button"
                  onClick={() => handleToggleFee(fee.id)}
                  className={cn(
                    "w-5 h-5 rounded border-2 flex items-center justify-center transition-colors shrink-0",
                    fee.enabled
                      ? "bg-indigo-500 border-indigo-500"
                      : "bg-transparent border-white/30 hover:border-white/50"
                  )}
                >
                  {fee.enabled && <Check className="w-3 h-3 text-white" />}
                </button>

                {/* Fee name - editable */}
                <Input
                  type="text"
                  value={fee.name}
                  onChange={(e) => handleUpdateFee(fee.id, { name: e.target.value })}
                  disabled={!fee.enabled}
                  className={cn(
                    "flex-1 min-w-0 bg-transparent border-0 text-sm focus:ring-0 h-auto py-0",
                    fee.enabled ? "text-white/90" : "text-white/40"
                  )}
                />

                {/* Date badge */}
                {purchaseDate && fee.dueOffset !== undefined && (
                  <span className="text-xs px-2 py-0.5 rounded bg-white/5 text-white/50 shrink-0">
                    {formatDateDisplay(getMonthValueFromOffset(fee.dueOffset))}
                  </span>
                )}

                {/* Delete button */}
                <button
                  type="button"
                  onClick={() => handleDeleteFee(fee.id)}
                  className="p-1 hover:bg-white/10 rounded transition-colors shrink-0"
                >
                  <X className="w-4 h-4 text-white/40 hover:text-red-400" />
                </button>
              </div>

              {/* Bottom row: date, type, value, calculated amount */}
              {fee.enabled && (
                <div className="flex items-center gap-3 pl-8 mt-2.5">
                  {/* Due date input */}
                  {purchaseDate && (
                    <MonthPicker
                      value={getMonthValueFromOffset(fee.dueOffset || 0)}
                      onChange={(value) => handleUpdateFee(fee.id, { dueOffset: getOffsetFromMonthValue(value) })}
                      className="w-36"
                    />
                  )}

                  {/* Type selector */}
                  <CustomSelect
                    value={fee.type}
                    onChange={(value) => handleUpdateFee(fee.id, { type: value as 'percentage' | 'fixed' })}
                    options={[
                      { value: 'percentage', label: '%' },
                      { value: 'fixed', label: 'Fixed' },
                    ]}
                    variant="compact"
                    className="w-20"
                  />

                  {/* Value input */}
                  <div className="flex items-center gap-1.5">
                    {fee.type === 'fixed' && <span className="text-white/50 text-sm font-medium">$</span>}
                    <Input
                      type="text"
                      inputMode="numeric"
                      value={fee.type === 'fixed' ? fee.value.toLocaleString() : fee.value}
                      onChange={(e) => {
                        const rawValue = e.target.value.replace(/[^0-9.]/g, '')
                        handleUpdateFee(fee.id, { value: parseFloat(rawValue) || 0 })
                      }}
                      className="w-20 bg-white/[0.08] text-sm text-white text-right rounded-lg px-2.5 py-1.5 border-white/[0.1] h-auto font-mono tabular-nums"
                    />
                    {fee.type === 'percentage' && <span className="text-white/50 text-sm font-medium">%</span>}
                  </div>

                  {/* Calculated amount */}
                  <span className="text-sm text-white/60 ml-auto font-mono tabular-nums">
                    = ${amount.toLocaleString()}
                  </span>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Add new fee */}
      <div className="pt-2 border-t border-white/10">
        <div className="flex items-center gap-2">
          {/* Icon Picker for new fee */}
          <IconPicker
            iconName={newFeeIcon}
            iconColor={newFeeIconColor}
            searchQuery={iconSearchQuery}
            onIconChange={setNewFeeIcon}
            onColorChange={setNewFeeIconColor}
            onSearchChange={setIconSearchQuery}
          />

          {/* Fee name input */}
          <Input
            type="text"
            value={newFeeName}
            onChange={(e) => setNewFeeName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddFee()}
            placeholder="Add new expense..."
            className="flex-1 bg-white/5 text-sm text-white placeholder:text-white/30 rounded-lg px-3 py-2 border-white/10"
          />

          {/* Add button */}
          <button
            type="button"
            onClick={handleAddFee}
            disabled={!newFeeName.trim()}
            className={cn(
              "p-2 rounded-lg transition-colors shrink-0",
              newFeeName.trim()
                ? "bg-indigo-500 hover:bg-indigo-600 text-white"
                : "bg-white/5 text-white/30 cursor-not-allowed"
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
