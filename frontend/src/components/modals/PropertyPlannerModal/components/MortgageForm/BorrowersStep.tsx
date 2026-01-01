"use client"

import { CustomSelect } from '@/components/ui/CustomSelect'
import { InfoTooltip } from '@/app/property-planner/components/InfoTooltip'

import type { BorrowersStepProps, IncomeOption } from './types'

// Reusable input component for CPF amounts
function CpfInput({
  label,
  tooltipTitle,
  tooltipDescription,
  value,
  onChange,
  placeholder,
}: {
  label: string
  tooltipTitle: string
  tooltipDescription: string
  value: number
  onChange: (value: number) => void
  placeholder?: string
}) {
  return (
    <div className="mt-3 space-y-1.5">
      <div className="flex items-center gap-1.5">
        <label className="text-xs font-medium text-slate-400">{label}</label>
        <InfoTooltip title={tooltipTitle} description={tooltipDescription} />
      </div>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">$</span>
        <input
          type="text"
          inputMode="numeric"
          value={value === 0 ? '' : value.toLocaleString()}
          onChange={(e) => {
            const raw = e.target.value.replace(/,/g, '')
            const num = parseFloat(raw) || 0
            onChange(num)
          }}
          placeholder={placeholder || '0'}
          className="w-full pl-7 pr-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.06] text-white text-sm font-mono tabular-nums focus:outline-none focus:border-white/20 focus:bg-white/[0.05] placeholder:text-slate-600"
        />
      </div>
    </div>
  )
}

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
  // Helper to format income label - person name if present, else salary name
  const formatIncomeLabel = (income: IncomeOption) => {
    const displayName = income.personName || income.name
    return `${displayName} - $${income.monthlyAmount.toLocaleString()}/mo`
  }

  // Find matching CPF account by personId
  const findCpfAccountForIncome = (income: IncomeOption) => {
    if (!income.personId) return null
    return cpfAccounts.find(acc => acc.personId === income.personId)
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

        {/* CPF OA for Downpayment */}
        {inputs.borrower1IncomeId && (
          <CpfInput
            label="CPF OA for Downpayment"
            tooltipTitle="CPF OA for Downpayment"
            tooltipDescription="Amount from CPF OA to use for downpayment. Cannot exceed your projected OA balance."
            value={inputs.borrower1DownpaymentCpfOa}
            onChange={(value) => {
              // Cap at OA balance
              const cappedValue = Math.min(value, inputs.borrower1OaBalance)
              onChange('borrower1DownpaymentCpfOa', cappedValue)
              // Update combined downpaymentCpfOa
              onChange('downpaymentCpfOa', cappedValue + inputs.borrower2DownpaymentCpfOa)
            }}
          />
        )}

        {/* Monthly CPF OA Payment */}
        {inputs.borrower1IncomeId && (
          <CpfInput
            label="Monthly CPF OA Payment"
            tooltipTitle="Monthly CPF Contribution"
            tooltipDescription="Fixed monthly amount from CPF OA to pay towards mortgage. This is deducted from your OA each month."
            value={inputs.borrower1MonthlyCpfOa}
            onChange={(value) => {
              onChange('borrower1MonthlyCpfOa', value)
              // Update combined monthlyCpfOa
              onChange('monthlyCpfOa', value + inputs.borrower2MonthlyCpfOa)
            }}
          />
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
              // Reset borrower 2's CPF contribution fields
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
                // Reset borrower 2's CPF contribution fields and update combined totals
                onChange('borrower2DownpaymentCpfOa', 0)
                onChange('borrower2MonthlyCpfOa', 0)
                onChange('downpaymentCpfOa', inputs.borrower1DownpaymentCpfOa)
                onChange('monthlyCpfOa', inputs.borrower1MonthlyCpfOa)
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

          {/* CPF OA for Downpayment */}
          {inputs.borrower2IncomeId && (
            <CpfInput
              label="CPF OA for Downpayment"
              tooltipTitle="CPF OA for Downpayment"
              tooltipDescription="Amount from CPF OA to use for downpayment. Cannot exceed your projected OA balance."
              value={inputs.borrower2DownpaymentCpfOa}
              onChange={(value) => {
                // Cap at OA balance
                const cappedValue = Math.min(value, inputs.borrower2OaBalance)
                onChange('borrower2DownpaymentCpfOa', cappedValue)
                // Update combined downpaymentCpfOa
                onChange('downpaymentCpfOa', inputs.borrower1DownpaymentCpfOa + cappedValue)
              }}
            />
          )}

          {/* Monthly CPF OA Payment */}
          {inputs.borrower2IncomeId && (
            <CpfInput
              label="Monthly CPF OA Payment"
              tooltipTitle="Monthly CPF Contribution"
              tooltipDescription="Fixed monthly amount from CPF OA to pay towards mortgage. This is deducted from your OA each month."
              value={inputs.borrower2MonthlyCpfOa}
              onChange={(value) => {
                onChange('borrower2MonthlyCpfOa', value)
                // Update combined monthlyCpfOa
                onChange('monthlyCpfOa', inputs.borrower1MonthlyCpfOa + value)
              }}
            />
          )}
        </div>
      )}

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
        <div className="flex justify-between text-xs">
          <span className="text-slate-500">CPF OA for Downpayment</span>
          <span className="text-emerald-400 font-mono tabular-nums">${inputs.downpaymentCpfOa.toLocaleString()}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-slate-500">Monthly CPF OA Payment</span>
          <span className="text-emerald-400 font-mono tabular-nums">${inputs.monthlyCpfOa.toLocaleString()}/mo</span>
        </div>
      </div>
    </div>
  )
}
