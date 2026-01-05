"use client"

import { useMemo } from 'react'
import { CustomSelect } from '@/components/ui/CustomSelect'
import { InfoTooltip } from '@/app/property-planner/components/InfoTooltip'
import { calculateMonthlyOaInflow } from '@/app/property-planner/hooks'
import { cn } from '@/lib/utils'
import { Wallet, Landmark } from 'lucide-react'
import { CustomDropdown } from '@/components/modals/ScenarioEventModal/components/CustomDropdown'
import { useCashAccountsQuery } from '@/hooks/queries'

import type { BorrowersStepProps, IncomeOption } from './types'

// Amount type options for monthly cash split configuration
const MONTHLY_AMOUNT_TYPE_OPTIONS = [
  { value: 'remainder', label: 'Rest' },
  { value: 'fixed', label: '$' },
  { value: 'percentage', label: '%' },
]

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
  const { data: cashAccounts = [] } = useCashAccountsQuery()

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
        </div>
      )}

      {/* ═══════ DOWNPAYMENT FUND SOURCES ═══════ */}
      <div className="pt-4 border-t border-white/[0.06]">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">Downpayment Sources</span>
          <InfoTooltip
            title="Downpayment Fund Sources"
            description="Configure how your downpayment will be funded - each borrower can specify their CPF OA and cash contributions."
          />
        </div>

        <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-3">
          {/* Borrower 1 Downpayment - Always show */}
          {inputs.borrowerType === 'joint' && (
            <div className="text-[10px] font-medium text-slate-500 uppercase tracking-wide">Borrower 1</div>
          )}
          {/* CPF OA */}
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0">
              <Landmark className="h-3.5 w-3.5 text-blue-400" />
            </div>
            <span className="text-xs text-slate-300 flex-1">CPF OA</span>
            <div className="w-28">
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 text-xs">$</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={inputs.borrower1DownpaymentCpfOa === 0 ? '' : inputs.borrower1DownpaymentCpfOa.toLocaleString()}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/,/g, '')
                    const num = parseFloat(raw) || 0
                    const cappedValue = inputs.borrower1OaBalance > 0 ? Math.min(num, inputs.borrower1OaBalance) : num
                    onChange('borrower1DownpaymentCpfOa', cappedValue)
                    onChange('downpaymentCpfOa', cappedValue + inputs.borrower2DownpaymentCpfOa)
                  }}
                  placeholder="0"
                  className="w-full pl-6 pr-2 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.06] text-white text-xs font-mono tabular-nums focus:outline-none focus:border-white/20 placeholder:text-slate-600"
                />
              </div>
            </div>
          </div>
          {/* Cash */}
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
              <Wallet className="h-3.5 w-3.5 text-emerald-400" />
            </div>
            <div className="flex-1 min-w-0">
              <CustomDropdown
                value={inputs.borrower1DownpaymentCashAccountId ?? ''}
                onChange={(value) => onChange('borrower1DownpaymentCashAccountId', value || null)}
                options={cashAccountOptions}
                minWidth="100%"
                className="[&_button]:py-1.5 [&_button]:text-xs"
              />
            </div>
            <div className="w-28">
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 text-xs">$</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={inputs.borrower1DownpaymentCashAmount === 0 ? '' : inputs.borrower1DownpaymentCashAmount.toLocaleString()}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/,/g, '')
                    const num = parseFloat(raw) || 0
                    onChange('borrower1DownpaymentCashAmount', num)
                    onChange('downpaymentCash', num + inputs.borrower2DownpaymentCashAmount)
                  }}
                  placeholder="0"
                  className="w-full pl-6 pr-2 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.06] text-white text-xs font-mono tabular-nums focus:outline-none focus:border-white/20 placeholder:text-slate-600"
                />
              </div>
            </div>
          </div>

          {/* Borrower 2 Downpayment */}
          {inputs.borrowerType === 'joint' && inputs.borrower2IncomeId && (
            <>
              <div className="pt-2 border-t border-white/[0.04]">
                <div className="text-[10px] font-medium text-slate-500 uppercase tracking-wide mb-2">Borrower 2</div>
              </div>
              {/* CPF OA */}
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0">
                  <Landmark className="h-3.5 w-3.5 text-blue-400" />
                </div>
                <span className="text-xs text-slate-300 flex-1">CPF OA</span>
                <div className="w-28">
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 text-xs">$</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={inputs.borrower2DownpaymentCpfOa === 0 ? '' : inputs.borrower2DownpaymentCpfOa.toLocaleString()}
                      onChange={(e) => {
                        const raw = e.target.value.replace(/,/g, '')
                        const num = parseFloat(raw) || 0
                        const cappedValue = Math.min(num, inputs.borrower2OaBalance)
                        onChange('borrower2DownpaymentCpfOa', cappedValue)
                        onChange('downpaymentCpfOa', inputs.borrower1DownpaymentCpfOa + cappedValue)
                      }}
                      placeholder="0"
                      className="w-full pl-6 pr-2 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.06] text-white text-xs font-mono tabular-nums focus:outline-none focus:border-white/20 placeholder:text-slate-600"
                    />
                  </div>
                </div>
              </div>
              {/* Cash */}
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
                  <Wallet className="h-3.5 w-3.5 text-emerald-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <CustomDropdown
                    value={inputs.borrower2DownpaymentCashAccountId ?? ''}
                    onChange={(value) => onChange('borrower2DownpaymentCashAccountId', value || null)}
                    options={cashAccountOptions}
                    minWidth="100%"
                    className="[&_button]:py-1.5 [&_button]:text-xs"
                  />
                </div>
                <div className="w-28">
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 text-xs">$</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={inputs.borrower2DownpaymentCashAmount === 0 ? '' : inputs.borrower2DownpaymentCashAmount.toLocaleString()}
                      onChange={(e) => {
                        const raw = e.target.value.replace(/,/g, '')
                        const num = parseFloat(raw) || 0
                        onChange('borrower2DownpaymentCashAmount', num)
                        onChange('downpaymentCash', inputs.borrower1DownpaymentCashAmount + num)
                      }}
                      placeholder="0"
                      className="w-full pl-6 pr-2 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.06] text-white text-xs font-mono tabular-nums focus:outline-none focus:border-white/20 placeholder:text-slate-600"
                    />
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Total */}
          <div className="pt-2 border-t border-white/[0.04] flex items-center justify-between">
            <span className="text-xs text-slate-500">Total Downpayment</span>
            <span className="text-xs font-medium text-white font-mono tabular-nums">
              ${(inputs.downpaymentCpfOa + inputs.downpaymentCash).toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* ═══════ MONTHLY PAYMENT FUND SOURCES ═══════ */}
      <div className="pt-4 border-t border-white/[0.06]">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">Monthly Payment Sources</span>
          <InfoTooltip
            title="Monthly Payment Sources"
            description="Configure how your monthly mortgage payment will be funded - each borrower can specify their CPF OA and cash contributions."
          />
        </div>

        <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-3">
          {/* Borrower 1 Monthly - Always show */}
          {inputs.borrowerType === 'joint' && (
            <div className="text-[10px] font-medium text-slate-500 uppercase tracking-wide">Borrower 1</div>
          )}
          {/* CPF OA */}
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0">
                <Landmark className="h-3.5 w-3.5 text-blue-400" />
              </div>
              <span className="text-xs text-slate-300 flex-1">CPF OA</span>
              <div className="w-28">
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 text-xs">$</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={inputs.borrower1MonthlyCpfOa === 0 ? '' : inputs.borrower1MonthlyCpfOa.toLocaleString()}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/,/g, '')
                      const num = parseFloat(raw) || 0
                      onChange('borrower1MonthlyCpfOa', num)
                      onChange('monthlyCpfOa', num + inputs.borrower2MonthlyCpfOa)
                    }}
                    placeholder="0"
                    className="w-full pl-6 pr-2 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.06] text-white text-xs font-mono tabular-nums focus:outline-none focus:border-white/20 placeholder:text-slate-600"
                  />
                </div>
              </div>
            </div>
            {inputs.borrower1IncomeId && (
              <p className="text-[10px] text-slate-600 pl-9">
                Est. monthly OA: ${calculateMonthlyOaInflow(incomes.find(i => i.id === inputs.borrower1IncomeId)?.monthlyAmount || 0).toLocaleString()}/mo
              </p>
            )}
          </div>
          {/* Cash */}
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
                <Wallet className="h-3.5 w-3.5 text-emerald-400" />
              </div>
              <div className="flex-1 min-w-0">
                <CustomDropdown
                  value={inputs.borrower1MonthlyCashAccountId ?? ''}
                  onChange={(value) => onChange('borrower1MonthlyCashAccountId', value || null)}
                  options={cashAccountOptions}
                  minWidth="100%"
                  className="[&_button]:py-1.5 [&_button]:text-xs"
                />
              </div>
            </div>
            {/* Amount type selector - only if cash account selected */}
            {inputs.borrower1MonthlyCashAccountId && (
              <div className="flex items-center gap-2 pl-9">
                <div className="flex items-center shrink-0">
                  {MONTHLY_AMOUNT_TYPE_OPTIONS.map((option, idx) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => {
                        onChange('borrower1MonthlyCashAmountType', option.value as 'fixed' | 'percentage' | 'remainder')
                        if (option.value === 'remainder') {
                          onChange('borrower1MonthlyCashAmount', 0)
                        }
                      }}
                      className={cn(
                        "px-2 py-1 text-[10px] font-medium border-y transition-colors",
                        idx === 0 && "rounded-l-md border-l",
                        idx === MONTHLY_AMOUNT_TYPE_OPTIONS.length - 1 && "rounded-r-md border-r",
                        idx > 0 && idx < MONTHLY_AMOUNT_TYPE_OPTIONS.length - 1 && "border-l-0",
                        inputs.borrower1MonthlyCashAmountType === option.value
                          ? "bg-white/[0.08] text-slate-300 border-white/[0.1]"
                          : "bg-transparent text-slate-600 border-white/[0.06] hover:text-slate-400"
                      )}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
                {inputs.borrower1MonthlyCashAmountType !== 'remainder' && (
                  <div className="flex items-center flex-1 h-7 px-2 rounded-md border border-white/[0.06] bg-white/[0.02]">
                    {inputs.borrower1MonthlyCashAmountType === 'fixed' && (
                      <span className="text-slate-500 text-xs">$</span>
                    )}
                    <input
                      type="text"
                      inputMode="numeric"
                      value={inputs.borrower1MonthlyCashAmount === 0 ? '' : inputs.borrower1MonthlyCashAmount.toLocaleString()}
                      onChange={(e) => {
                        const raw = e.target.value.replace(/,/g, '')
                        const num = parseFloat(raw) || 0
                        onChange('borrower1MonthlyCashAmount', num)
                      }}
                      placeholder="0"
                      className="flex-1 min-w-0 bg-transparent border-0 outline-none text-white text-xs font-mono tabular-nums placeholder:text-slate-600 ml-1"
                    />
                    {inputs.borrower1MonthlyCashAmountType === 'percentage' && (
                      <span className="text-slate-500 text-xs ml-1">%</span>
                    )}
                  </div>
                )}
                {inputs.borrower1MonthlyCashAmountType === 'remainder' && (
                  <span className="text-[10px] text-slate-500">covers remaining</span>
                )}
              </div>
            )}
          </div>

          {/* Borrower 2 Monthly */}
          {inputs.borrowerType === 'joint' && inputs.borrower2IncomeId && (
            <>
              <div className="pt-2 border-t border-white/[0.04]">
                <div className="text-[10px] font-medium text-slate-500 uppercase tracking-wide mb-2">Borrower 2</div>
              </div>
              {/* CPF OA */}
              <div className="space-y-1">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0">
                    <Landmark className="h-3.5 w-3.5 text-blue-400" />
                  </div>
                  <span className="text-xs text-slate-300 flex-1">CPF OA</span>
                  <div className="w-28">
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 text-xs">$</span>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={inputs.borrower2MonthlyCpfOa === 0 ? '' : inputs.borrower2MonthlyCpfOa.toLocaleString()}
                        onChange={(e) => {
                          const raw = e.target.value.replace(/,/g, '')
                          const num = parseFloat(raw) || 0
                          onChange('borrower2MonthlyCpfOa', num)
                          onChange('monthlyCpfOa', inputs.borrower1MonthlyCpfOa + num)
                        }}
                        placeholder="0"
                        className="w-full pl-6 pr-2 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.06] text-white text-xs font-mono tabular-nums focus:outline-none focus:border-white/20 placeholder:text-slate-600"
                      />
                    </div>
                  </div>
                </div>
                <p className="text-[10px] text-slate-600 pl-9">
                  Est. monthly OA: ${calculateMonthlyOaInflow(incomes.find(i => i.id === inputs.borrower2IncomeId)?.monthlyAmount || 0).toLocaleString()}/mo
                </p>
              </div>
              {/* Cash */}
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
                    <Wallet className="h-3.5 w-3.5 text-emerald-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <CustomDropdown
                      value={inputs.borrower2MonthlyCashAccountId ?? ''}
                      onChange={(value) => onChange('borrower2MonthlyCashAccountId', value || null)}
                      options={cashAccountOptions}
                      minWidth="100%"
                      className="[&_button]:py-1.5 [&_button]:text-xs"
                    />
                  </div>
                </div>
                {/* Amount type selector - only if cash account selected */}
                {inputs.borrower2MonthlyCashAccountId && (
                  <div className="flex items-center gap-2 pl-9">
                    <div className="flex items-center shrink-0">
                      {MONTHLY_AMOUNT_TYPE_OPTIONS.map((option, idx) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => {
                            onChange('borrower2MonthlyCashAmountType', option.value as 'fixed' | 'percentage' | 'remainder')
                            if (option.value === 'remainder') {
                              onChange('borrower2MonthlyCashAmount', 0)
                            }
                          }}
                          className={cn(
                            "px-2 py-1 text-[10px] font-medium border-y transition-colors",
                            idx === 0 && "rounded-l-md border-l",
                            idx === MONTHLY_AMOUNT_TYPE_OPTIONS.length - 1 && "rounded-r-md border-r",
                            idx > 0 && idx < MONTHLY_AMOUNT_TYPE_OPTIONS.length - 1 && "border-l-0",
                            inputs.borrower2MonthlyCashAmountType === option.value
                              ? "bg-white/[0.08] text-slate-300 border-white/[0.1]"
                              : "bg-transparent text-slate-600 border-white/[0.06] hover:text-slate-400"
                          )}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                    {inputs.borrower2MonthlyCashAmountType !== 'remainder' && (
                      <div className="flex items-center flex-1 h-7 px-2 rounded-md border border-white/[0.06] bg-white/[0.02]">
                        {inputs.borrower2MonthlyCashAmountType === 'fixed' && (
                          <span className="text-slate-500 text-xs">$</span>
                        )}
                        <input
                          type="text"
                          inputMode="numeric"
                          value={inputs.borrower2MonthlyCashAmount === 0 ? '' : inputs.borrower2MonthlyCashAmount.toLocaleString()}
                          onChange={(e) => {
                            const raw = e.target.value.replace(/,/g, '')
                            const num = parseFloat(raw) || 0
                            onChange('borrower2MonthlyCashAmount', num)
                          }}
                          placeholder="0"
                          className="flex-1 min-w-0 bg-transparent border-0 outline-none text-white text-xs font-mono tabular-nums placeholder:text-slate-600 ml-1"
                        />
                        {inputs.borrower2MonthlyCashAmountType === 'percentage' && (
                          <span className="text-slate-500 text-xs ml-1">%</span>
                        )}
                      </div>
                    )}
                    {inputs.borrower2MonthlyCashAmountType === 'remainder' && (
                      <span className="text-[10px] text-slate-500">covers remaining</span>
                    )}
                  </div>
                )}
              </div>
            </>
          )}

          {/* Total Monthly */}
          <div className="pt-2 border-t border-white/[0.04] flex items-center justify-between">
            <span className="text-xs text-slate-500">Total Monthly Payment</span>
            <span className="text-xs font-medium text-white font-mono tabular-nums">
              ${inputs.monthlyCpfOa.toLocaleString()}/mo + cash
            </span>
          </div>
        </div>
      </div>

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
