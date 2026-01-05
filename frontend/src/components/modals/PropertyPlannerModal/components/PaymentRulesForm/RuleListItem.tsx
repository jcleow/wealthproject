"use client"

import { motion, AnimatePresence } from 'framer-motion'
import { cn, numericStyles } from '@/lib/utils'
import { formatCurrency } from '@/lib/format'
import { Trash2, Wallet, Landmark, ChevronDown, ChevronUp } from 'lucide-react'
import type { FundFlowRule, FundFlowAmountType } from '@/types/fundFlowRules'

// Amount type display options
const AMOUNT_TYPE_LABELS: Record<FundFlowAmountType, string> = {
  max_available: 'Max Available',
  fixed: 'Fixed Amount',
  percentage: 'Percentage',
  target_required: 'Target Required',
  remainder: 'Remainder',
}

interface RuleListItemProps {
  rule: FundFlowRule
  index: number
  totalRules: number
  isExpanded: boolean
  onToggleExpand: () => void
  onMovePriority: (direction: 'up' | 'down') => void
  onDelete: () => void
  getSourceName: (rule: FundFlowRule) => string
}

/**
 * Individual payment rule list item with priority controls, expand/collapse, and delete.
 */
export function RuleListItem({
  rule,
  index,
  totalRules,
  isExpanded,
  onToggleExpand,
  onMovePriority,
  onDelete,
  getSourceName,
}: RuleListItemProps) {
  // Get source icon based on source type
  const SourceIcon = rule.sourceCpfAccountId ? Landmark : Wallet
  const sourceIconColor = rule.sourceCpfAccountId ? 'text-blue-400' : 'text-emerald-400'

  // Format amount for display
  const formattedAmount = (() => {
    switch (rule.amountType) {
      case 'fixed':
        return formatCurrency(parseFloat(rule.amountValue || '0'))
      case 'percentage':
        return `${rule.amountValue}%`
      case 'remainder':
        return 'Remainder'
      case 'max_available':
        return 'Max Available'
      case 'target_required':
        return 'Target Required'
      default:
        return rule.amountValue || ''
    }
  })()

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      className="group rounded-xl bg-white/[0.02] border border-white/[0.06] overflow-hidden"
    >
      {/* Rule Header */}
      <div
        className="flex items-center gap-3 p-3 cursor-pointer hover:bg-white/[0.02] transition-colors"
        onClick={onToggleExpand}
      >
        {/* Priority Controls */}
        <div className="flex flex-col gap-0.5">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onMovePriority('up')
            }}
            disabled={index === 0}
            className={cn(
              "p-0.5 rounded transition-colors",
              index === 0 ? "text-slate-700 cursor-not-allowed" : "text-slate-500 hover:text-slate-300"
            )}
          >
            <ChevronUp className="h-3 w-3" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onMovePriority('down')
            }}
            disabled={index === totalRules - 1}
            className={cn(
              "p-0.5 rounded transition-colors",
              index === totalRules - 1 ? "text-slate-700 cursor-not-allowed" : "text-slate-500 hover:text-slate-300"
            )}
          >
            <ChevronDown className="h-3 w-3" />
          </button>
        </div>

        {/* Priority Badge */}
        <div className="w-6 h-6 rounded-full bg-white/[0.06] flex items-center justify-center">
          <span className="text-xs font-medium text-slate-400">{index + 1}</span>
        </div>

        {/* Source Icon & Name */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <SourceIcon className={cn("h-4 w-4", sourceIconColor)} />
          <span className="text-sm text-white truncate">{getSourceName(rule)}</span>
        </div>

        {/* Amount */}
        <div className={cn(numericStyles.medium, "text-right")}>
          {formattedAmount}
        </div>

        {/* Delete Button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onDelete()
          }}
          className="p-1.5 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Expanded Details */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-white/[0.04] overflow-hidden"
          >
            <div className="p-3 space-y-2 text-xs text-slate-400">
              <div className="flex justify-between">
                <span>Amount Type</span>
                <span className="text-slate-300">
                  {AMOUNT_TYPE_LABELS[rule.amountType]}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Start Date</span>
                <span className="text-slate-300">{rule.startDate}</span>
              </div>
              {rule.endDate && (
                <div className="flex justify-between">
                  <span>End Date</span>
                  <span className="text-slate-300">{rule.endDate}</span>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
