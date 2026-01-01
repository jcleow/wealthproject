"use client"

import { CustomSelect } from '@/components/ui/CustomSelect'

import type { BorrowersStepProps, IncomeOption } from './types'

export function BorrowersStep({
  inputs,
  onChange,
  incomes,
  cpfAccounts,
  exceedsHdbIncomeCeiling,
  exceedsEcIncomeCeiling,
  purchaseDateFormatted,
  householdIncome,
}: BorrowersStepProps) {
  // Helper to format income label - earner name if present, else salary name
  const formatIncomeLabel = (income: IncomeOption) => {
    const displayName = income.earner || income.name
    return `${displayName} - $${income.monthlyAmount.toLocaleString()}/mo`
  }

  // Find matching CPF account by earner name (case-insensitive)
  const findCpfAccountForIncome = (income: IncomeOption) => {
    if (!income.earner) return null
    const earnerLower = income.earner.toLowerCase()
    return cpfAccounts.find(acc => acc.earner?.toLowerCase() === earnerLower)
  }

  return (
    <div className="space-y-4">
      {/* Eligibility Warning */}
      {(exceedsHdbIncomeCeiling || exceedsEcIncomeCeiling) && (
        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
          <p className="text-xs font-medium text-amber-400">
            {exceedsHdbIncomeCeiling ? 'HDB Income Ceiling Notice' : 'EC Income Ceiling Notice'}
          </p>
          <p className="text-xs text-amber-300/70 mt-1">
            Income exceeds typical ceiling. Please verify eligibility.
          </p>
        </div>
      )}

      {/* Borrower 1 */}
      <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
        <span className="text-xs font-medium text-slate-300 mb-3 block">
          {inputs.borrowerType === 'joint' ? 'Borrower 1' : 'Primary Borrower'}
        </span>

        <CustomSelect
          value={inputs.borrower1IncomeId}
          onChange={(value) => {
            onChange('borrower1IncomeId', value as string)
            const selectedIncome = incomes.find(i => i.id === value)
            if (selectedIncome) {
              // Auto-populate OA balance from matching CPF account
              const matchingCpf = findCpfAccountForIncome(selectedIncome)
              if (matchingCpf) {
                const oaBalance = matchingCpf.oaBalance
                onChange('borrower1OaBalance', oaBalance)
                onChange('cpfOaBalance', inputs.borrowerType === 'joint'
                  ? oaBalance + inputs.borrower2OaBalance
                  : oaBalance)
              }
            }
          }}
          options={incomes.map(income => ({
            value: income.id,
            label: formatIncomeLabel(income),
          }))}
          className="w-full"
        />

        {/* OA Balance - Read-only, projected to purchase date */}
        {inputs.borrower1IncomeId && (
          <div className="mt-3 flex items-center justify-between px-3 py-2 rounded-lg bg-white/[0.02] border border-white/[0.04]">
            <span className="text-slate-500 text-xs">Projected OA at {purchaseDateFormatted}</span>
            <span className="text-white text-sm font-mono tabular-nums">${inputs.borrower1OaBalance.toLocaleString()}</span>
          </div>
        )}
      </div>

      {/* Add Joint Borrower */}
      {inputs.borrowerType === 'single' && incomes.length > 1 && (
        <button
          type="button"
          onClick={() => {
            onChange('borrowerType', 'joint')
            const availableIncome = incomes.find(i => i.id !== inputs.borrower1IncomeId)
            if (availableIncome) {
              onChange('borrower2IncomeId', availableIncome.id)
              // Auto-populate OA balance from matching CPF account, fallback to default
              const matchingCpf = findCpfAccountForIncome(availableIncome)
              const borrower2OaBalance = matchingCpf?.oaBalance ?? 62400
              onChange('borrower2OaBalance', borrower2OaBalance)
              onChange('cpfOaBalance', inputs.borrower1OaBalance + borrower2OaBalance)
            }
          }}
          className="w-full py-2 rounded-xl border border-dashed border-white/[0.08] hover:border-white/[0.15] text-slate-500 hover:text-slate-300 text-xs font-medium transition-all"
        >
          + Add joint borrower
        </button>
      )}

      {/* Borrower 2 */}
      {inputs.borrowerType === 'joint' && (
        <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-slate-300">Borrower 2</span>
            <button
              type="button"
              onClick={() => {
                onChange('borrowerType', 'single')
                onChange('borrower2IncomeId', '')
                onChange('borrower2OaBalance', 0)
                onChange('cpfOaBalance', inputs.borrower1OaBalance)
              }}
              className="text-xs text-slate-500 hover:text-red-400 transition-colors"
            >
              Remove
            </button>
          </div>
          <CustomSelect
            value={inputs.borrower2IncomeId || ''}
            onChange={(value) => {
              onChange('borrower2IncomeId', value as string)
              const selectedIncome = incomes.find(i => i.id === value)
              if (selectedIncome) {
                // Auto-populate OA balance from matching CPF account
                const matchingCpf = findCpfAccountForIncome(selectedIncome)
                if (matchingCpf) {
                  const oaBalance = matchingCpf.oaBalance
                  onChange('borrower2OaBalance', oaBalance)
                  onChange('cpfOaBalance', inputs.borrower1OaBalance + oaBalance)
                }
              }
            }}
            options={incomes.filter(i => i.id !== inputs.borrower1IncomeId).map(income => ({
              value: income.id,
              label: formatIncomeLabel(income),
            }))}
            className="w-full"
          />

          {/* OA Balance - Read-only, projected to purchase date */}
          {inputs.borrower2IncomeId && (
            <div className="mt-3 flex items-center justify-between px-3 py-2 rounded-lg bg-white/[0.02] border border-white/[0.04]">
              <span className="text-slate-500 text-xs">Projected OA at {purchaseDateFormatted}</span>
              <span className="text-white text-sm font-mono tabular-nums">${inputs.borrower2OaBalance.toLocaleString()}</span>
            </div>
          )}
        </div>
      )}

      {/* Summary */}
      <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
        <div className="flex justify-between text-xs">
          <span className="text-slate-500">Combined Income</span>
          <span className="text-white font-medium">${householdIncome.toLocaleString()}/mo</span>
        </div>
        <div className="flex justify-between text-xs mt-1">
          <span className="text-slate-500">Combined CPF OA</span>
          <span className="text-white">${inputs.cpfOaBalance.toLocaleString()}</span>
        </div>
      </div>
    </div>
  )
}
