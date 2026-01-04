"use client"

import { useState, useMemo } from 'react'
import { CustomSelect } from '@/components/ui/CustomSelect'
import { InfoTooltip } from '@/app/property-planner/components/InfoTooltip'
import { calculateMonthlyOaInflow } from '@/app/property-planner/hooks'
import { cn } from '@/lib/utils'
import { Wallet, Landmark, ChevronDown, ChevronUp } from 'lucide-react'
import { CustomDropdown } from '@/components/modals/ScenarioEventModal/components/CustomDropdown'
import { useCashAccountsQuery } from '@/hooks/queries'

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

// Monthly CPF OA input with $ / % toggle - ledger style
function MonthlyCpfOaInput({
  value,
  onChange,
  monthlyIncome,
}: {
  value: number
  onChange: (value: number) => void
  monthlyIncome: number
}) {
  const [mode, setMode] = useState<'fixed' | 'percentage'>('fixed')
  const [percentValue, setPercentValue] = useState(0)
  const estimatedMonthlyOa = calculateMonthlyOaInflow(monthlyIncome)

  // Calculate the actual dollar amount based on mode
  const calculatedAmount = mode === 'percentage'
    ? Math.round(estimatedMonthlyOa * (percentValue / 100))
    : value

  // When switching to percentage mode, convert current value to percentage
  const handleModeChange = (newMode: 'fixed' | 'percentage') => {
    if (newMode === 'percentage' && mode === 'fixed' && estimatedMonthlyOa > 0) {
      // Convert current fixed value to percentage
      const pct = Math.round((value / estimatedMonthlyOa) * 100)
      setPercentValue(pct)
    } else if (newMode === 'fixed' && mode === 'percentage') {
      // Convert percentage to fixed value
      onChange(calculatedAmount)
    }
    setMode(newMode)
  }

  // Handle value change based on mode
  const handleValueChange = (rawValue: string) => {
    const num = parseFloat(rawValue.replace(/[^0-9.]/g, '')) || 0
    if (mode === 'percentage') {
      setPercentValue(num)
      onChange(Math.round(estimatedMonthlyOa * (num / 100)))
    } else {
      onChange(num)
    }
  }

  return (
    <div className="mt-3 space-y-1">
      <div className="flex items-center gap-1.5">
        <label className="text-xs font-medium text-slate-400">Monthly CPF OA Payment</label>
        <InfoTooltip
          title="Monthly CPF Contribution"
          description="Monthly amount from CPF OA to pay towards mortgage. Enter a fixed amount or a percentage of your estimated monthly OA contribution."
        />
      </div>

      {/* Input row with external toggle */}
      <div className="flex items-center gap-2">
        {/* $ / % toggle - outside input */}
        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={() => handleModeChange('fixed')}
            className={cn(
              "px-2 py-1.5 text-xs font-medium rounded-l-lg border-y border-l transition-colors",
              mode === 'fixed'
                ? "bg-white/[0.08] text-slate-300 border-white/[0.1]"
                : "bg-transparent text-slate-600 border-white/[0.06] hover:text-slate-400"
            )}
          >
            $
          </button>
          <button
            type="button"
            onClick={() => handleModeChange('percentage')}
            className={cn(
              "px-2 py-1.5 text-xs font-medium rounded-r-lg border transition-colors",
              mode === 'percentage'
                ? "bg-white/[0.08] text-slate-300 border-white/[0.1]"
                : "bg-transparent text-slate-600 border-white/[0.06] hover:text-slate-400"
            )}
          >
            %
          </button>
        </div>

        {/* Input field */}
        <div className="flex items-center flex-1 h-9 px-3 rounded-lg border border-white/[0.06] bg-white/[0.02]">
          {mode === 'fixed' && <span className="text-slate-500 text-sm">$</span>}
          <input
            type="text"
            inputMode="numeric"
            value={mode === 'fixed'
              ? (value === 0 ? '' : value.toLocaleString())
              : (percentValue === 0 ? '' : percentValue)
            }
            onChange={(e) => handleValueChange(e.target.value)}
            placeholder="0"
            className="flex-1 min-w-0 bg-transparent border-0 outline-none text-white text-sm font-mono tabular-nums placeholder:text-slate-600 ml-1"
          />
          {mode === 'percentage' && <span className="text-slate-500 text-sm ml-1">%</span>}

          {/* Show calculated amount for percentage mode */}
          {mode === 'percentage' && percentValue > 0 && (
            <>
              <div className="h-5 w-px bg-white/[0.08] mx-3" />
              <span className="text-xs font-mono tabular-nums text-slate-500 shrink-0">
                = ${calculatedAmount.toLocaleString()}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Helper text */}
      {estimatedMonthlyOa > 0 && (
        <p className="text-[11px] text-slate-600 pl-0.5">
          Est. monthly OA contribution: ${estimatedMonthlyOa.toLocaleString()}/mo
        </p>
      )}
    </div>
  )
}

// Payment Source Configuration Section
function PaymentSourceSection({
  inputs,
  onChange,
}: {
  inputs: BorrowersStepProps['inputs']
  onChange: BorrowersStepProps['onChange']
}) {
  const [isExpanded, setIsExpanded] = useState(false)
  const { data: cashAccounts = [] } = useCashAccountsQuery()

  // Build dropdown options for cash accounts
  const cashAccountOptions = useMemo(() => {
    const options = [
      { value: '', label: 'None (CPF only)' },
      ...cashAccounts.map(acc => ({
        value: acc.id,
        label: acc.name,
        icon: <Wallet className="h-4 w-4 text-emerald-400" />,
      }))
    ]
    return options
  }, [cashAccounts])

  // Get selected account name for collapsed view
  const selectedAccountName = useMemo(() => {
    if (!inputs.cashAccountFallbackId) return null
    const account = cashAccounts.find(a => a.id === inputs.cashAccountFallbackId)
    return account?.name
  }, [inputs.cashAccountFallbackId, cashAccounts])

  return (
    <div className="rounded-xl border border-white/[0.06] overflow-hidden">
      {/* Header - always visible */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-3 bg-white/[0.02] hover:bg-white/[0.03] transition-colors"
      >
        <div className="flex items-center gap-2">
          <Wallet className="h-4 w-4 text-slate-400" />
          <span className="text-xs font-medium text-slate-300">Payment Sources</span>
          {selectedAccountName && (
            <span className="text-xs text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
              {selectedAccountName}
            </span>
          )}
        </div>
        {isExpanded ? (
          <ChevronUp className="h-4 w-4 text-slate-500" />
        ) : (
          <ChevronDown className="h-4 w-4 text-slate-500" />
        )}
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="p-4 border-t border-white/[0.06] space-y-3">
          <p className="text-xs text-slate-500">
            CPF OA contributions from borrowers are used first. Select a cash account to cover any remaining mortgage payment.
          </p>

          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5">
              <label className="text-xs font-medium text-slate-400">Fallback Cash Account</label>
              <InfoTooltip
                title="Fallback Payment Source"
                description="When monthly CPF OA contributions don't cover the full mortgage payment, the remaining amount will be drawn from this cash account."
              />
            </div>
            <CustomDropdown
              value={inputs.cashAccountFallbackId ?? ''}
              onChange={(value) => onChange('cashAccountFallbackId', value || null)}
              options={cashAccountOptions}
              minWidth="100%"
              showIcon
              icon={<Wallet className="h-4 w-4" />}
              iconColor={inputs.cashAccountFallbackId ? 'text-emerald-400' : 'text-slate-500'}
            />
          </div>

          {/* Payment flow visualization */}
          {inputs.monthlyCpfOa > 0 && (
            <div className="mt-4 p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
              <p className="text-[10px] uppercase font-semibold text-slate-500 tracking-wider mb-2">
                Payment Priority
              </p>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-blue-500/20 flex items-center justify-center">
                    <Landmark className="h-3 w-3 text-blue-400" />
                  </div>
                  <span className="text-xs text-slate-300">1. CPF OA</span>
                  <span className="text-xs text-slate-500 ml-auto font-mono tabular-nums">
                    ${inputs.monthlyCpfOa.toLocaleString()}/mo
                  </span>
                </div>
                {inputs.cashAccountFallbackId && (
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center">
                      <Wallet className="h-3 w-3 text-emerald-400" />
                    </div>
                    <span className="text-xs text-slate-300">2. {selectedAccountName}</span>
                    <span className="text-xs text-slate-500 ml-auto">Remainder</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
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
          <MonthlyCpfOaInput
            value={inputs.borrower1MonthlyCpfOa}
            onChange={(value) => {
              onChange('borrower1MonthlyCpfOa', value)
              // Update combined monthlyCpfOa
              onChange('monthlyCpfOa', value + inputs.borrower2MonthlyCpfOa)
            }}
            monthlyIncome={incomes.find(i => i.id === inputs.borrower1IncomeId)?.monthlyAmount || 0}
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
            <MonthlyCpfOaInput
              value={inputs.borrower2MonthlyCpfOa}
              onChange={(value) => {
                onChange('borrower2MonthlyCpfOa', value)
                // Update combined monthlyCpfOa
                onChange('monthlyCpfOa', inputs.borrower1MonthlyCpfOa + value)
              }}
              monthlyIncome={incomes.find(i => i.id === inputs.borrower2IncomeId)?.monthlyAmount || 0}
            />
          )}
        </div>
      )}

      {/* Payment Source Configuration */}
      <PaymentSourceSection inputs={inputs} onChange={onChange} />

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
