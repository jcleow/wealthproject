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

// Amount type options for split configuration
const AMOUNT_TYPE_OPTIONS = [
  { value: 'remainder', label: 'Remainder' },
  { value: 'fixed', label: 'Fixed $' },
  { value: 'percentage', label: 'Percentage %' },
]

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

  // Get selected account names for collapsed view summary
  const summaryText = useMemo(() => {
    const parts: string[] = []
    if (inputs.downpaymentCashAccountId) {
      const account = cashAccounts.find(a => a.id === inputs.downpaymentCashAccountId)
      if (account) parts.push(`DP: ${account.name}`)
    }
    if (inputs.monthlyCashAccountId) {
      const account = cashAccounts.find(a => a.id === inputs.monthlyCashAccountId)
      if (account) parts.push(`Monthly: ${account.name}`)
    }
    return parts.length > 0 ? parts.join(' · ') : null
  }, [inputs.downpaymentCashAccountId, inputs.monthlyCashAccountId, cashAccounts])

  // Get account name helper
  const getAccountName = (accountId: string | null) => {
    if (!accountId) return null
    return cashAccounts.find(a => a.id === accountId)?.name
  }

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
          <span className="text-xs font-medium text-slate-300">Cash Payment Sources</span>
          {summaryText && (
            <span className="text-xs text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full truncate max-w-[180px]">
              {summaryText}
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
        <div className="p-4 border-t border-white/[0.06] space-y-5">
          <p className="text-xs text-slate-500">
            Configure which cash accounts to use for downpayment and monthly mortgage payments.
          </p>

          {/* Downpayment Cash Source */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <label className="text-xs font-medium text-slate-400">Downpayment Cash Source</label>
              <InfoTooltip
                title="Downpayment Cash"
                description="The cash account to draw from for the cash portion of your downpayment. The cash amount is determined by your property price, CPF usage, and minimum cash requirements."
              />
            </div>
            <CustomDropdown
              value={inputs.downpaymentCashAccountId ?? ''}
              onChange={(value) => onChange('downpaymentCashAccountId', value || null)}
              options={cashAccountOptions}
              minWidth="100%"
              showIcon
              icon={<Wallet className="h-4 w-4" />}
              iconColor={inputs.downpaymentCashAccountId ? 'text-emerald-400' : 'text-slate-500'}
            />
            {inputs.downpaymentCash > 0 && (
              <p className="text-[11px] text-slate-600 pl-0.5">
                Cash portion: ${inputs.downpaymentCash.toLocaleString()}
              </p>
            )}
          </div>

          {/* Divider */}
          <div className="h-px bg-white/[0.06]" />

          {/* Monthly Payment Cash Source */}
          <div className="space-y-3">
            <div className="flex items-center gap-1.5">
              <label className="text-xs font-medium text-slate-400">Monthly Payment Cash Source</label>
              <InfoTooltip
                title="Monthly Cash Payment"
                description="Configure how much cash to contribute monthly. CPF OA is used first, then cash is drawn based on your selected strategy."
              />
            </div>
            <CustomDropdown
              value={inputs.monthlyCashAccountId ?? ''}
              onChange={(value) => onChange('monthlyCashAccountId', value || null)}
              options={cashAccountOptions}
              minWidth="100%"
              showIcon
              icon={<Wallet className="h-4 w-4" />}
              iconColor={inputs.monthlyCashAccountId ? 'text-emerald-400' : 'text-slate-500'}
            />

            {/* Amount type selection - only show if account selected */}
            {inputs.monthlyCashAccountId && (
              <div className="space-y-2">
                <div className="flex items-center gap-1.5">
                  <label className="text-xs font-medium text-slate-500">Cash Amount Type</label>
                </div>
                <div className="flex items-center gap-2">
                  {/* Type selector */}
                  <div className="flex items-center shrink-0">
                    {AMOUNT_TYPE_OPTIONS.map((option, idx) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => {
                          onChange('monthlyCashAmountType', option.value as 'fixed' | 'percentage' | 'remainder')
                          // Reset amount when switching to remainder
                          if (option.value === 'remainder') {
                            onChange('monthlyCashAmount', 0)
                          }
                        }}
                        className={cn(
                          "px-2.5 py-1.5 text-xs font-medium border-y transition-colors",
                          idx === 0 && "rounded-l-lg border-l",
                          idx === AMOUNT_TYPE_OPTIONS.length - 1 && "rounded-r-lg border-r",
                          idx > 0 && idx < AMOUNT_TYPE_OPTIONS.length - 1 && "border-l-0",
                          inputs.monthlyCashAmountType === option.value
                            ? "bg-white/[0.08] text-slate-300 border-white/[0.1]"
                            : "bg-transparent text-slate-600 border-white/[0.06] hover:text-slate-400"
                        )}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>

                  {/* Amount input - only for fixed and percentage */}
                  {inputs.monthlyCashAmountType !== 'remainder' && (
                    <div className="flex items-center flex-1 h-9 px-3 rounded-lg border border-white/[0.06] bg-white/[0.02]">
                      {inputs.monthlyCashAmountType === 'fixed' && (
                        <span className="text-slate-500 text-sm">$</span>
                      )}
                      <input
                        type="text"
                        inputMode="numeric"
                        value={inputs.monthlyCashAmount === 0 ? '' : inputs.monthlyCashAmount.toLocaleString()}
                        onChange={(e) => {
                          const raw = e.target.value.replace(/,/g, '')
                          const num = parseFloat(raw) || 0
                          onChange('monthlyCashAmount', num)
                        }}
                        placeholder="0"
                        className="flex-1 min-w-0 bg-transparent border-0 outline-none text-white text-sm font-mono tabular-nums placeholder:text-slate-600 ml-1"
                      />
                      {inputs.monthlyCashAmountType === 'percentage' && (
                        <span className="text-slate-500 text-sm ml-1">%</span>
                      )}
                    </div>
                  )}
                </div>

                {/* Description of the selected type */}
                <p className="text-[11px] text-slate-600 pl-0.5">
                  {inputs.monthlyCashAmountType === 'remainder' && 'Cash covers whatever CPF OA doesn\'t pay.'}
                  {inputs.monthlyCashAmountType === 'fixed' && 'Fixed dollar amount from cash each month.'}
                  {inputs.monthlyCashAmountType === 'percentage' && 'Percentage of total mortgage payment from cash.'}
                </p>
              </div>
            )}
          </div>

          {/* Payment flow visualization */}
          {(inputs.monthlyCpfOa > 0 || inputs.monthlyCashAccountId) && (
            <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
              <p className="text-[10px] uppercase font-semibold text-slate-500 tracking-wider mb-2">
                Monthly Payment Flow
              </p>
              <div className="space-y-2">
                {inputs.monthlyCpfOa > 0 && (
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-blue-500/20 flex items-center justify-center">
                      <Landmark className="h-3 w-3 text-blue-400" />
                    </div>
                    <span className="text-xs text-slate-300">1. CPF OA</span>
                    <span className="text-xs text-slate-500 ml-auto font-mono tabular-nums">
                      ${inputs.monthlyCpfOa.toLocaleString()}/mo
                    </span>
                  </div>
                )}
                {inputs.monthlyCashAccountId && (
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center">
                      <Wallet className="h-3 w-3 text-emerald-400" />
                    </div>
                    <span className="text-xs text-slate-300">
                      {inputs.monthlyCpfOa > 0 ? '2.' : '1.'} {getAccountName(inputs.monthlyCashAccountId)}
                    </span>
                    <span className="text-xs text-slate-500 ml-auto font-mono tabular-nums">
                      {inputs.monthlyCashAmountType === 'remainder' && 'Remainder'}
                      {inputs.monthlyCashAmountType === 'fixed' && `$${inputs.monthlyCashAmount.toLocaleString()}/mo`}
                      {inputs.monthlyCashAmountType === 'percentage' && `${inputs.monthlyCashAmount}%`}
                    </span>
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
