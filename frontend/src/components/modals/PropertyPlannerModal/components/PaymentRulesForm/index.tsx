"use client"

import { useState, useCallback, useMemo } from 'react'
import { AnimatePresence } from 'framer-motion'
import { numericStyles } from '@/lib/utils'
import { formatCurrency } from '@/lib/format'
import { Plus, Wallet, Landmark, AlertCircle } from 'lucide-react'

import {
  usePropertyPaymentRulesQuery,
  useCreateFundFlowRuleMutation,
  useDeleteFundFlowRuleMutation,
  useUpdateFundFlowRuleMutation,
  useCashAccountsQuery,
} from '@/hooks/queries'
import { useCpfAccountsQuery } from '@/hooks/queries/useCpfQuery'
import type { FundFlowRule, FundFlowRuleCreatePayload, FundFlowAmountType } from '@/types/fundFlowRules'

import { RuleListItem } from './RuleListItem'
import { AddRuleForm } from './AddRuleForm'

interface PaymentRulesFormProps {
  /** The property SG ID from the database */
  propertyId: string
  /** Monthly mortgage payment amount for validation */
  monthlyPayment?: number
  /** Purchase/loan start date for setting rule start date */
  startDate: string
}

interface NewRuleState {
  sourceType: 'cpf' | 'cash' | null
  sourceId: string
  amountType: FundFlowAmountType
  amountValue: string
}

const INITIAL_NEW_RULE: NewRuleState = {
  sourceType: null,
  sourceId: '',
  amountType: 'max_available',
  amountValue: '',
}

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
  const [newRule, setNewRule] = useState<NewRuleState>(INITIAL_NEW_RULE)
  const [expandedRuleId, setExpandedRuleId] = useState<string | null>(null)

  // Sort rules by priority
  const sortedRules = useMemo(() => {
    return [...existingRules].sort((a, b) => a.priority - b.priority)
  }, [existingRules])

  // Build source options for dropdown
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

  // Handle source selection in add form
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
        setNewRule(INITIAL_NEW_RULE)
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

  // Calculate total coverage for summary display
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
            <RuleListItem
              key={rule.id}
              rule={rule}
              index={index}
              totalRules={sortedRules.length}
              isExpanded={expandedRuleId === rule.id}
              onToggleExpand={() => setExpandedRuleId(expandedRuleId === rule.id ? null : rule.id)}
              onMovePriority={(direction) => handleMovePriority(rule.id, direction)}
              onDelete={() => handleDeleteRule(rule.id)}
              getSourceName={getSourceName}
            />
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
          <AddRuleForm
            newRule={newRule}
            onNewRuleChange={(updates) => setNewRule(prev => ({ ...prev, ...updates }))}
            onSourceChange={handleSourceChange}
            sourceOptions={sourceOptions}
            onSubmit={handleCreateRule}
            onCancel={() => {
              setIsAddingRule(false)
              setNewRule(INITIAL_NEW_RULE)
            }}
            isSubmitting={createMutation.isPending}
          />
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
