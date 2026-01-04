"use client"

import { useState, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn, numericStyles } from '@/lib/utils'
import { formatCurrency } from '@/lib/format'
import {
  Plus,
  Trash2,
  Wallet,
  Landmark,
  AlertCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'

import { CustomDropdown } from '@/components/modals/ScenarioEventModal/components/CustomDropdown'
import {
  usePropertyPaymentRulesQuery,
  useCreateFundFlowRuleMutation,
  useDeleteFundFlowRuleMutation,
  useUpdateFundFlowRuleMutation,
  useCashAccountsQuery,
} from '@/hooks/queries'
import { useCpfAccountsQuery } from '@/hooks/queries/useCpfQuery'
import type { FundFlowRule, FundFlowRuleCreatePayload } from '@/types/fundFlowRules'

interface PaymentRulesFormProps {
  /** The property SG ID from the database */
  propertyId: string
  /** Monthly mortgage payment amount for validation */
  monthlyPayment?: number
  /** Purchase/loan start date for setting rule start date */
  startDate: string
}

type AmountType = 'fixed' | 'percentage' | 'remainder' | 'max_available'

interface NewRuleState {
  sourceType: 'cpf' | 'cash' | null
  sourceId: string
  amountType: AmountType
  amountValue: string
}

const AMOUNT_TYPE_OPTIONS = [
  { value: 'max_available', label: 'Max Available', description: 'Use as much as possible from this source' },
  { value: 'fixed', label: 'Fixed Amount', description: 'A specific dollar amount each month' },
  { value: 'percentage', label: 'Percentage', description: 'A percentage of the monthly payment' },
  { value: 'remainder', label: 'Remainder', description: 'Whatever is left after higher priority rules' },
]

export function PaymentRulesForm({
  propertyId,
  monthlyPayment = 0,
  startDate,
}: PaymentRulesFormProps) {
  // Queries
  const { data: existingRules = [], isLoading: rulesLoading } = usePropertyPaymentRulesQuery(propertyId)
  const { data: cashAccounts = [] } = useCashAccountsQuery()
  const { data: cpfAccounts = [] } = useCpfAccountsQuery()

  // Mutations
  const createMutation = useCreateFundFlowRuleMutation()
  const updateMutation = useUpdateFundFlowRuleMutation()
  const deleteMutation = useDeleteFundFlowRuleMutation()

  // Local state
  const [isAddingRule, setIsAddingRule] = useState(false)
  const [newRule, setNewRule] = useState<NewRuleState>({
    sourceType: null,
    sourceId: '',
    amountType: 'max_available',
    amountValue: '',
  })
  const [expandedRuleId, setExpandedRuleId] = useState<string | null>(null)

  // Sort rules by priority
  const sortedRules = useMemo(() => {
    return [...existingRules].sort((a, b) => a.priority - b.priority)
  }, [existingRules])

  // Build source options
  const sourceOptions = useMemo(() => {
    const cpfOptions = cpfAccounts.map(acc => ({
      value: `cpf:${acc.id}`,
      label: acc.personName ? `CPF OA (${acc.personName})` : 'CPF OA',
      icon: <Landmark className="h-4 w-4 text-blue-400" />,
    }))

    const cashOptions = cashAccounts.map(acc => ({
      value: `cash:${acc.id}`,
      label: acc.name,
      icon: <Wallet className="h-4 w-4 text-emerald-400" />,
    }))

    return [
      { label: 'CPF Accounts', options: cpfOptions },
      { label: 'Cash Accounts', options: cashOptions },
    ]
  }, [cpfAccounts, cashAccounts])

  // Get source display name
  const getSourceName = useCallback((rule: FundFlowRule): string => {
    if (rule.sourceCpfAccountId) {
      const acc = cpfAccounts.find(a => a.id === rule.sourceCpfAccountId)
      return acc?.personName ? `CPF OA (${acc.personName})` : 'CPF OA'
    }
    if (rule.sourceCashAccountId) {
      const acc = cashAccounts.find(a => a.id === rule.sourceCashAccountId)
      return acc?.name || 'Cash Account'
    }
    return 'Unknown'
  }, [cpfAccounts, cashAccounts])

  // Get source icon
  const getSourceIcon = useCallback((rule: FundFlowRule) => {
    if (rule.sourceCpfAccountId) {
      return <Landmark className="h-4 w-4 text-blue-400" />
    }
    return <Wallet className="h-4 w-4 text-emerald-400" />
  }, [])

  // Format amount display
  const formatAmount = useCallback((rule: FundFlowRule): string => {
    switch (rule.amountType) {
      case 'fixed':
        return formatCurrency(parseFloat(rule.amountValue || '0'))
      case 'percentage':
        return `${rule.amountValue}%`
      case 'remainder':
        return 'Remainder'
      case 'max_available':
        return 'Max Available'
      default:
        return rule.amountValue || ''
    }
  }, [])

  // Handle source selection
  const handleSourceChange = useCallback((value: string) => {
    const [type, id] = value.split(':')
    setNewRule(prev => ({
      ...prev,
      sourceType: type as 'cpf' | 'cash',
      sourceId: id,
    }))
  }, [])

  // Handle creating a new rule
  const handleCreateRule = useCallback(() => {
    if (!newRule.sourceId || !newRule.sourceType) return

    // Calculate next priority
    const nextPriority = existingRules.length > 0
      ? Math.max(...existingRules.map(r => r.priority)) + 1
      : 0

    const payload: FundFlowRuleCreatePayload = {
      name: `Payment Rule ${nextPriority + 1}`,
      ruleType: 'payment',
      sourceCpfAccountId: newRule.sourceType === 'cpf' ? newRule.sourceId : undefined,
      sourceCashAccountId: newRule.sourceType === 'cash' ? newRule.sourceId : undefined,
      targetPropertyId: propertyId,
      amountType: newRule.amountType,
      amountValue: newRule.amountType === 'fixed' || newRule.amountType === 'percentage'
        ? newRule.amountValue
        : undefined,
      priority: nextPriority,
      startDate,
    }

    createMutation.mutate(payload, {
      onSuccess: () => {
        setIsAddingRule(false)
        setNewRule({
          sourceType: null,
          sourceId: '',
          amountType: 'max_available',
          amountValue: '',
        })
      },
    })
  }, [newRule, existingRules, propertyId, startDate, createMutation])

  // Handle deleting a rule
  const handleDeleteRule = useCallback((id: string) => {
    deleteMutation.mutate(id)
  }, [deleteMutation])

  // Handle priority reordering
  const handleMovePriority = useCallback((ruleId: string, direction: 'up' | 'down') => {
    const ruleIndex = sortedRules.findIndex(r => r.id === ruleId)
    if (ruleIndex === -1) return

    const swapIndex = direction === 'up' ? ruleIndex - 1 : ruleIndex + 1
    if (swapIndex < 0 || swapIndex >= sortedRules.length) return

    const currentRule = sortedRules[ruleIndex]
    const swapRule = sortedRules[swapIndex]

    // Swap priorities
    updateMutation.mutate({
      id: currentRule.id,
      updates: { priority: swapRule.priority },
    })
    updateMutation.mutate({
      id: swapRule.id,
      updates: { priority: currentRule.priority },
    })
  }, [sortedRules, updateMutation])

  // Calculate total coverage
  const totalCoverage = useMemo(() => {
    let fixedTotal = 0
    let percentageTotal = 0
    let hasRemainder = false
    let hasMaxAvailable = false

    for (const rule of existingRules) {
      switch (rule.amountType) {
        case 'fixed':
          fixedTotal += parseFloat(rule.amountValue || '0')
          break
        case 'percentage':
          percentageTotal += parseFloat(rule.amountValue || '0')
          break
        case 'remainder':
          hasRemainder = true
          break
        case 'max_available':
          hasMaxAvailable = true
          break
      }
    }

    return { fixedTotal, percentageTotal, hasRemainder, hasMaxAvailable }
  }, [existingRules])

  if (rulesLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-white/[0.03] rounded animate-pulse" />
        <div className="h-24 bg-white/[0.03] rounded animate-pulse" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-sm font-medium text-white mb-1">Payment Sources</h3>
        <p className="text-xs text-slate-500">
          Configure how your monthly mortgage payment of{' '}
          <span className={numericStyles.medium}>{formatCurrency(monthlyPayment)}</span>{' '}
          will be funded. Rules are processed in priority order.
        </p>
      </div>

      {/* Coverage Summary */}
      {existingRules.length > 0 && (
        <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400">Coverage</span>
            <div className="flex items-center gap-3">
              {totalCoverage.fixedTotal > 0 && (
                <span className="text-slate-300">
                  Fixed: <span className={numericStyles.base}>{formatCurrency(totalCoverage.fixedTotal)}</span>
                </span>
              )}
              {totalCoverage.percentageTotal > 0 && (
                <span className="text-slate-300">
                  Percentage: <span className={numericStyles.base}>{totalCoverage.percentageTotal}%</span>
                </span>
              )}
              {(totalCoverage.hasRemainder || totalCoverage.hasMaxAvailable) && (
                <span className="text-emerald-400">+ Flexible</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Existing Rules List */}
      <div className="space-y-2">
        <AnimatePresence mode="popLayout">
          {sortedRules.map((rule, index) => (
            <motion.div
              key={rule.id}
              layout
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="group rounded-xl bg-white/[0.02] border border-white/[0.06] overflow-hidden"
            >
              {/* Rule Header */}
              <div
                className="flex items-center gap-3 p-3 cursor-pointer hover:bg-white/[0.02] transition-colors"
                onClick={() => setExpandedRuleId(expandedRuleId === rule.id ? null : rule.id)}
              >
                {/* Priority Controls */}
                <div className="flex flex-col gap-0.5">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleMovePriority(rule.id, 'up')
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
                      handleMovePriority(rule.id, 'down')
                    }}
                    disabled={index === sortedRules.length - 1}
                    className={cn(
                      "p-0.5 rounded transition-colors",
                      index === sortedRules.length - 1 ? "text-slate-700 cursor-not-allowed" : "text-slate-500 hover:text-slate-300"
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
                  {getSourceIcon(rule)}
                  <span className="text-sm text-white truncate">{getSourceName(rule)}</span>
                </div>

                {/* Amount */}
                <div className={cn(numericStyles.medium, "text-right")}>
                  {formatAmount(rule)}
                </div>

                {/* Delete Button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDeleteRule(rule.id)
                  }}
                  className="p-1.5 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Expanded Details */}
              <AnimatePresence>
                {expandedRuleId === rule.id && (
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
                          {AMOUNT_TYPE_OPTIONS.find(o => o.value === rule.amountType)?.label}
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
          ))}
        </AnimatePresence>
      </div>

      {/* Empty State */}
      {existingRules.length === 0 && !isAddingRule && (
        <div className="text-center py-8 px-4 rounded-xl border border-dashed border-white/[0.08]">
          <AlertCircle className="h-8 w-8 text-slate-600 mx-auto mb-3" />
          <p className="text-sm text-slate-400 mb-1">No payment sources configured</p>
          <p className="text-xs text-slate-600 mb-4">
            Add sources to automate your mortgage payments
          </p>
        </div>
      )}

      {/* Add Rule Form */}
      <AnimatePresence>
        {isAddingRule && (
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
                  onChange={handleSourceChange}
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
                  onChange={(value) => setNewRule(prev => ({ ...prev, amountType: value as AmountType }))}
                  options={AMOUNT_TYPE_OPTIONS.map(o => ({ value: o.value, label: o.label }))}
                  minWidth="100%"
                />
              </div>

              {/* Amount Value (for fixed/percentage) */}
              {(newRule.amountType === 'fixed' || newRule.amountType === 'percentage') && (
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-2">
                    {newRule.amountType === 'fixed' ? 'Amount ($)' : 'Percentage (%)'}
                  </label>
                  <input
                    type="number"
                    value={newRule.amountValue}
                    onChange={(e) => setNewRule(prev => ({ ...prev, amountValue: e.target.value }))}
                    placeholder={newRule.amountType === 'fixed' ? '1000' : '50'}
                    className="w-full rounded-xl bg-white/[0.03] border border-white/[0.06] text-white text-sm py-2.5 px-3 focus:outline-none focus:border-white/20 focus:bg-white/[0.05] placeholder:text-slate-600"
                  />
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddingRule(false)
                    setNewRule({
                      sourceType: null,
                      sourceId: '',
                      amountType: 'max_available',
                      amountValue: '',
                    })
                  }}
                  className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-slate-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCreateRule}
                  disabled={!newRule.sourceId || createMutation.isPending}
                  className={cn(
                    "px-4 py-2 text-xs font-medium rounded-lg transition-all",
                    newRule.sourceId
                      ? "bg-white/10 text-white hover:bg-white/15"
                      : "bg-white/5 text-slate-600 cursor-not-allowed"
                  )}
                >
                  {createMutation.isPending ? 'Adding...' : 'Add Rule'}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Rule Button */}
      {!isAddingRule && (
        <button
          type="button"
          onClick={() => setIsAddingRule(true)}
          className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-dashed border-white/[0.08] text-slate-400 hover:text-slate-300 hover:border-white/[0.12] hover:bg-white/[0.02] transition-all"
        >
          <Plus className="h-4 w-4" />
          <span className="text-sm font-medium">Add Payment Source</span>
        </button>
      )}
    </div>
  )
}
