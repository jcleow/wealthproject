"use client"

import { useMemo, useEffect, useRef } from 'react'
import { CustomSelect } from '@/components/ui/CustomSelect'
import { Wallet } from 'lucide-react'
import { useCashAccountsQuery, usePropertyPaymentRulesQuery } from '@/hooks/queries'
import { usePropertyFormInputs } from '../../hooks'

import type { IncomeOption, ProjectedCpfAccount } from './types'
import { DownpaymentSourcesSection } from './components/DownpaymentSourcesSection'
import { MonthlyPaymentSourcesSection } from './components/MonthlyPaymentSourcesSection'
import {
  formatIncomeLabel,
  findCpfAccountForIncome,
  selectBorrower1Income,
  selectBorrower2Income,
  DEFAULT_OA_BALANCE,
} from './utils/borrowerSelection'

interface BorrowersStepProps {
  incomes: IncomeOption[]
  cpfAccounts: ProjectedCpfAccount[]
  exceedsHdbIncomeCeiling: boolean
  exceedsEcIncomeCeiling: boolean
  purchaseDateFormatted: string
  householdIncome: number
  propertySgId?: string | null
}

/**
 * Borrowers step - handles borrower selection and fund sources.
 * Uses form context for inputs/onChange - no prop drilling needed.
 */
export function BorrowersStep({
  incomes,
  cpfAccounts,
  exceedsHdbIncomeCeiling,
  exceedsEcIncomeCeiling,
  purchaseDateFormatted,
  householdIncome,
  propertySgId,
}: BorrowersStepProps) {
  const { inputs, onChange } = usePropertyFormInputs()
  const { data: cashAccounts = [] } = useCashAccountsQuery()

  // Query fund flow rules for this property (only when editing existing scenario)
  // Note: Uses propertySgId (property_sg.id), not scenarioId (property_scenarios.id)
  const { data: paymentRules = [] } = usePropertyPaymentRulesQuery(propertySgId ?? undefined)

  // Track if we've already applied fund flow rules to avoid re-applying on every render
  const hasAppliedRulesRef = useRef(false)

  // Build dropdown options for cash accounts
  const cashAccountOptions = useMemo(() => {
    return [
      { value: '', label: 'Select cash account...' },
      ...cashAccounts.map(acc => ({
        value: acc.id,
        label: acc.name,
        icon: <Wallet className="h-4 w-4 text-emerald-400" />,
      }))
    ]
  }, [cashAccounts])

  // Pre-select cash accounts from fund flow rules when editing an existing scenario
  useEffect(() => {
    if (hasAppliedRulesRef.current || paymentRules.length === 0) return

    const cashRule = paymentRules.find(rule => rule.sourceCashAccountId)

    if (cashRule?.sourceCashAccountId) {
      if (!inputs.borrower1DownpaymentCashAccountId) {
        onChange('borrower1DownpaymentCashAccountId', cashRule.sourceCashAccountId, false)
      }
      if (!inputs.borrower1MonthlyCashAccountId) {
        onChange('borrower1MonthlyCashAccountId', cashRule.sourceCashAccountId, false)
        if (cashRule.amountType === 'remainder') {
          onChange('borrower1MonthlyCashAmountType', 'remainder', false)
        }
      }
      hasAppliedRulesRef.current = true
    }
  }, [paymentRules, inputs.borrower1DownpaymentCashAccountId, inputs.borrower1MonthlyCashAccountId, onChange])

  return (
    <div className="space-y-4">
      {/* Eligibility Warning */}
      <EligibilityWarning
        exceedsHdbIncomeCeiling={exceedsHdbIncomeCeiling}
        exceedsEcIncomeCeiling={exceedsEcIncomeCeiling}
      />

      {/* Borrower 1 */}
      <BorrowerCard
        label={inputs.borrowerType === 'joint' ? 'Borrower 1' : 'Primary Borrower'}
        incomeId={inputs.borrower1IncomeId}
        onIncomeChange={(value) => {
          onChange('borrower1IncomeId', value)
          const result = selectBorrower1Income(
            value,
            incomes,
            cpfAccounts,
            inputs.borrowerType,
            inputs.borrower2OaBalance
          )
          if (result) {
            onChange('borrower1OaBalance', result.borrower1OaBalance)
            onChange('cpfOaBalance', result.combinedCpfOaBalance)
          }
        }}
        incomeOptions={incomes.map(income => ({
          value: income.id,
          label: formatIncomeLabel(income),
        }))}
        oaBalance={inputs.borrower1OaBalance}
        purchaseDateFormatted={purchaseDateFormatted}
        showOaBalance={!!inputs.borrower1IncomeId}
      />

      {/* Add Joint Borrower */}
      {inputs.borrowerType === 'single' && incomes.length > 1 && (
        <button
          type="button"
          onClick={() => {
            onChange('borrowerType', 'joint')
            const availableIncome = incomes.find(i => i.id !== inputs.borrower1IncomeId)
            if (availableIncome) {
              onChange('borrower2IncomeId', availableIncome.id)
              const matchingCpf = findCpfAccountForIncome(availableIncome, cpfAccounts)
              const borrower2OaBalance = matchingCpf?.oaBalance ?? DEFAULT_OA_BALANCE
              onChange('borrower2OaBalance', borrower2OaBalance)
              onChange('cpfOaBalance', inputs.borrower1OaBalance + borrower2OaBalance)
              onChange('borrower2DownpaymentCpfOa', 0)
              onChange('borrower2MonthlyCpfOa', 0)
            }
          }}
          className="w-full py-2 rounded-xl border border-dashed border-white/[0.08] hover:border-white/[0.15] text-slate-500 hover:text-slate-300 text-xs font-medium transition-all"
        >
          + Add joint borrower
        </button>
      )}

      {/* Borrower 2 */}
      {inputs.borrowerType === 'joint' && (
        <BorrowerCard
          label="Borrower 2"
          incomeId={inputs.borrower2IncomeId || ''}
          onIncomeChange={(value) => {
            onChange('borrower2IncomeId', value)
            const result = selectBorrower2Income(
              value,
              incomes,
              cpfAccounts,
              inputs.borrower1OaBalance
            )
            if (result) {
              onChange('borrower2OaBalance', result.borrower2OaBalance)
              onChange('cpfOaBalance', result.combinedCpfOaBalance)
            }
          }}
          incomeOptions={incomes.filter(i => i.id !== inputs.borrower1IncomeId).map(income => ({
            value: income.id,
            label: formatIncomeLabel(income),
          }))}
          oaBalance={inputs.borrower2OaBalance}
          purchaseDateFormatted={purchaseDateFormatted}
          showOaBalance={!!inputs.borrower2IncomeId}
          onRemove={() => {
            onChange('borrowerType', 'single')
            onChange('borrower2IncomeId', '')
            onChange('borrower2OaBalance', 0)
            onChange('cpfOaBalance', inputs.borrower1OaBalance)
            onChange('borrower2DownpaymentCpfOa', 0)
            onChange('borrower2MonthlyCpfOa', 0)
            onChange('downpaymentCpfOa', inputs.borrower1DownpaymentCpfOa)
            onChange('monthlyCpfOa', inputs.borrower1MonthlyCpfOa)
          }}
        />
      )}

      {/* Downpayment Sources Section */}
      <DownpaymentSourcesSection
        cashAccountOptions={cashAccountOptions}
      />

      {/* Monthly Payment Sources Section */}
      <MonthlyPaymentSourcesSection
        incomes={incomes}
        cashAccountOptions={cashAccountOptions}
      />

      {/* Summary */}
      <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] space-y-1">
        <div className="flex justify-between text-xs">
          <span className="text-slate-500">Combined Income</span>
          <span className="text-white font-medium">${householdIncome.toLocaleString()}/mo</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-slate-500">Combined CPF OA Balance</span>
          <span className="text-white font-mono tabular-nums">${inputs.cpfOaBalance.toLocaleString()}</span>
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// Internal subcomponents (kept in same file for locality, not exported)
// ═══════════════════════════════════════════════════════════════════════════════

interface EligibilityWarningProps {
  exceedsHdbIncomeCeiling: boolean
  exceedsEcIncomeCeiling: boolean
}

function EligibilityWarning({ exceedsHdbIncomeCeiling, exceedsEcIncomeCeiling }: EligibilityWarningProps) {
  if (!exceedsHdbIncomeCeiling && !exceedsEcIncomeCeiling) return null

  return (
    <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
      <p className="text-xs font-medium text-amber-400">
        {exceedsHdbIncomeCeiling ? 'HDB Income Ceiling Notice' : 'EC Income Ceiling Notice'}
      </p>
      <p className="text-xs text-amber-300/70 mt-1">
        Income exceeds typical ceiling. Please verify eligibility.
      </p>
    </div>
  )
}

interface BorrowerCardProps {
  label: string
  incomeId: string
  onIncomeChange: (value: string) => void
  incomeOptions: Array<{ value: string; label: string }>
  oaBalance: number
  purchaseDateFormatted: string
  showOaBalance: boolean
  onRemove?: () => void
}

function BorrowerCard({
  label,
  incomeId,
  onIncomeChange,
  incomeOptions,
  oaBalance,
  purchaseDateFormatted,
  showOaBalance,
  onRemove,
}: BorrowerCardProps) {
  return (
    <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-slate-300">{label}</span>
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="text-xs text-slate-500 hover:text-red-400 transition-colors"
          >
            Remove
          </button>
        )}
      </div>

      <div className="flex items-center gap-3">
        <CustomSelect
          value={incomeId}
          onChange={(value) => onIncomeChange(value as string)}
          options={incomeOptions}
          className="flex-1"
        />

        {showOaBalance && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.02] border border-white/[0.04] whitespace-nowrap">
            <span className="text-slate-500 text-xs">OA at {purchaseDateFormatted}</span>
            <span className="text-white text-sm font-mono tabular-nums">${oaBalance.toLocaleString()}</span>
          </div>
        )}
      </div>
    </div>
  )
}
