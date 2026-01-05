"use client"

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { CustomDropdown } from '@/components/modals/ScenarioEventModal/components/CustomDropdown'
import type { FundFlowAmountType } from '@/types/fundFlowRules'

// Amount type options for the form dropdown
const AMOUNT_TYPE_OPTIONS: Array<{ value: FundFlowAmountType; label: string; description: string }> = [
  { value: 'max_available', label: 'Max Available', description: 'Use as much as possible from this source' },
  { value: 'fixed', label: 'Fixed Amount', description: 'A specific dollar amount each month' },
  { value: 'percentage', label: 'Percentage', description: 'A percentage of the monthly payment' },
  { value: 'target_required', label: 'Target Required', description: 'Pay exactly what the property/loan requires' },
  { value: 'remainder', label: 'Remainder', description: 'Whatever is left after higher priority rules' },
]

interface SourceOption {
  value: string
  label: string
  icon?: React.ReactNode
}

interface SourceGroup {
  label: string
  options: SourceOption[]
}

interface NewRuleState {
  sourceType: 'cpf' | 'cash' | null
  sourceId: string
  amountType: FundFlowAmountType
  amountValue: string
}

interface AddRuleFormProps {
  newRule: NewRuleState
  onNewRuleChange: (updates: Partial<NewRuleState>) => void
  onSourceChange: (value: string) => void
  sourceOptions: SourceGroup[]
  onSubmit: () => void
  onCancel: () => void
  isSubmitting: boolean
}

/**
 * Form for adding a new payment rule with source, amount type, and value configuration.
 */
export function AddRuleForm({
  newRule,
  onNewRuleChange,
  onSourceChange,
  sourceOptions,
  onSubmit,
  onCancel,
  isSubmitting,
}: AddRuleFormProps) {
  const showAmountInput = newRule.amountType === 'fixed' || newRule.amountType === 'percentage'

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="overflow-hidden"
    >
      <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-4">
        {/* Source Selection */}
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-2">
            Payment Source
          </label>
          <CustomDropdown
            value={newRule.sourceId ? `${newRule.sourceType}:${newRule.sourceId}` : ''}
            onChange={onSourceChange}
            groups={sourceOptions}
            minWidth="100%"
          />
        </div>

        {/* Amount Type */}
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-2">
            Amount Type
          </label>
          <CustomDropdown
            value={newRule.amountType}
            onChange={(value) => onNewRuleChange({ amountType: value as FundFlowAmountType })}
            options={AMOUNT_TYPE_OPTIONS.map(o => ({ value: o.value, label: o.label }))}
            minWidth="100%"
          />
        </div>

        {/* Amount Value (for fixed/percentage) */}
        {showAmountInput && (
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-2">
              {newRule.amountType === 'fixed' ? 'Amount ($)' : 'Percentage (%)'}
            </label>
            <input
              type="number"
              value={newRule.amountValue}
              onChange={(e) => onNewRuleChange({ amountValue: e.target.value })}
              placeholder={newRule.amountType === 'fixed' ? '1000' : '50'}
              className="w-full rounded-xl bg-white/[0.03] border border-white/[0.06] text-white text-sm py-2.5 px-3 focus:outline-none focus:border-white/20 focus:bg-white/[0.05] placeholder:text-slate-600"
            />
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-slate-300 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSubmit}
            disabled={!newRule.sourceId || isSubmitting}
            className={cn(
              "px-4 py-2 text-xs font-medium rounded-lg transition-all",
              newRule.sourceId
                ? "bg-white/10 text-white hover:bg-white/15"
                : "bg-white/5 text-slate-600 cursor-not-allowed"
            )}
          >
            {isSubmitting ? 'Adding...' : 'Add Rule'}
          </button>
        </div>
      </div>
    </motion.div>
  )
}
