"use client"

import { Wallet, Landmark } from 'lucide-react'
import { InfoTooltip } from '@/app/property-planner/components/InfoTooltip'
import { CustomDropdown } from '@/components/modals/ScenarioEventModal/components/CustomDropdown'
import { AmountTypeToggle, type AmountTypeOption } from './AmountTypeToggle'
import { CurrencyInput, InlineCurrencyInput } from './CurrencyInput'
import { usePropertyFormInputs } from '../../../hooks'

// Amount type options for downpayment CPF OA
const DOWNPAYMENT_CPF_OA_AMOUNT_TYPE_OPTIONS: AmountTypeOption[] = [
  { value: 'max_available', label: 'Max' },
  { value: 'fixed', label: '$' },
]

// Amount type options for downpayment cash
// - Rest: covers remaining after CPF and other fixed contributions
// - $: fixed dollar amount
// - %Tgt: percentage of the target/required downpayment
// - %Src: percentage of the source cash account balance
const DOWNPAYMENT_CASH_AMOUNT_TYPE_OPTIONS: AmountTypeOption[] = [
  { value: 'remainder', label: 'Rest' },
  { value: 'fixed', label: '$' },
  { value: 'pct_target', label: '%Tgt' },
  { value: 'pct_source', label: '%Src' },
]

interface CashAccountOption {
  value: string
  label: string
  icon?: React.ReactNode
  balance?: number // Account balance for pct_source calculations
}

interface DownpaymentSourcesSectionProps {
  cashAccountOptions: CashAccountOption[]
}

/**
 * Downpayment fund sources section - handles CPF OA and Cash for both borrowers.
 * Uses form context for inputs/onChange - no prop drilling needed.
 */
export function DownpaymentSourcesSection({
  cashAccountOptions,
}: DownpaymentSourcesSectionProps) {
  const { inputs, onChange } = usePropertyFormInputs()
  const isJoint = inputs.borrowerType === 'joint' && !!inputs.borrower2IncomeId

  // Required downpayment = property price - loan amount
  // If loan amount isn't computed yet, fall back to 25% (standard HDB/bank requirement)
  const requiredDownpayment = inputs.loanAmount > 0
    ? inputs.propertyPrice - inputs.loanAmount
    : Math.round(inputs.propertyPrice * 0.25)

  const totalCpfOa = inputs.borrower1DownpaymentCpfOa + inputs.borrower2DownpaymentCpfOa

  // Calculate fixed cash contributions (only count if amountType is 'fixed')
  const borrower1FixedCash = inputs.borrower1DownpaymentCashAmountType === 'fixed'
    ? inputs.borrower1DownpaymentCashAmount : 0
  const borrower2FixedCash = inputs.borrower2DownpaymentCashAmountType === 'fixed'
    ? inputs.borrower2DownpaymentCashAmount : 0

  // Total cash remainder after CPF and fixed cash contributions
  const totalCashRemainder = Math.max(0, requiredDownpayment - totalCpfOa - borrower1FixedCash - borrower2FixedCash)

  // Calculate per-borrower remainder based on who has "Rest" selected
  // If only one borrower has "Rest", they cover the full remainder
  // If both have "Rest", split evenly between them
  const borrower1HasRemainder = inputs.borrower1DownpaymentCashAmountType === 'remainder'
  const borrower2HasRemainder = inputs.borrower2DownpaymentCashAmountType === 'remainder'

  let borrower1Remainder = 0
  let borrower2Remainder = 0

  if (borrower1HasRemainder && borrower2HasRemainder) {
    // Both selected "Rest" - split evenly
    borrower1Remainder = Math.round(totalCashRemainder / 2)
    borrower2Remainder = totalCashRemainder - borrower1Remainder // Ensure no rounding loss
  } else if (borrower1HasRemainder) {
    // Only Borrower 1 covers remainder
    borrower1Remainder = totalCashRemainder
  } else if (borrower2HasRemainder) {
    // Only Borrower 2 covers remainder
    borrower2Remainder = totalCashRemainder
  }

  return (
    <div className="pt-4 border-t border-white/[0.06]">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">Downpayment Sources</span>
        <InfoTooltip
          title="Downpayment Fund Sources"
          description="Configure how your downpayment will be funded - each borrower can specify their CPF OA and cash contributions."
        />
      </div>

      <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-3">
        {/* Borrower 1 */}
        {isJoint && (
          <div className="text-[10px] font-medium text-slate-500 uppercase tracking-wide">Borrower 1</div>
        )}

        {/* Borrower 1 CPF OA */}
        <BorrowerCpfOaRow
          amountType={inputs.borrower1DownpaymentCpfOaAmountType}
          onAmountTypeChange={(value) => {
            onChange('borrower1DownpaymentCpfOaAmountType', value as 'fixed' | 'max_available')
            if (value === 'max_available') {
              onChange('borrower1DownpaymentCpfOa', inputs.borrower1OaBalance)
              onChange('downpaymentCpfOa', inputs.borrower1OaBalance + inputs.borrower2DownpaymentCpfOa)
            }
          }}
          amountValue={inputs.borrower1DownpaymentCpfOa}
          onAmountValueChange={(value) => {
            const cappedValue = inputs.borrower1OaBalance > 0 ? Math.min(value, inputs.borrower1OaBalance) : value
            onChange('borrower1DownpaymentCpfOa', cappedValue)
            onChange('downpaymentCpfOa', cappedValue + inputs.borrower2DownpaymentCpfOa)
          }}
          maxValue={inputs.borrower1OaBalance}
        />

        {/* Borrower 1 Cash */}
        <BorrowerCashRow
          accountOptions={cashAccountOptions}
          selectedAccountId={inputs.borrower1DownpaymentCashAccountId}
          onAccountChange={(value) => onChange('borrower1DownpaymentCashAccountId', value)}
          amountType={inputs.borrower1DownpaymentCashAmountType}
          onAmountTypeChange={(value) => {
            onChange('borrower1DownpaymentCashAmountType', value as DownpaymentCashAmountType)
            if (value === 'remainder') {
              onChange('borrower1DownpaymentCashAmount', 0)
            }
          }}
          amountValue={inputs.borrower1DownpaymentCashAmount}
          onAmountValueChange={(value) => {
            onChange('borrower1DownpaymentCashAmount', value)
            onChange('downpaymentCash', value + inputs.borrower2DownpaymentCashAmount)
          }}
          remainderAmount={borrower1Remainder}
          requiredDownpayment={requiredDownpayment}
        />

        {/* Borrower 2 */}
        {isJoint && (
          <>
            <div className="pt-2 border-t border-white/[0.04]">
              <div className="text-[10px] font-medium text-slate-500 uppercase tracking-wide mb-2">Borrower 2</div>
            </div>

            {/* Borrower 2 CPF OA */}
            <BorrowerCpfOaRow
              amountType={inputs.borrower2DownpaymentCpfOaAmountType}
              onAmountTypeChange={(value) => {
                onChange('borrower2DownpaymentCpfOaAmountType', value as 'fixed' | 'max_available')
                if (value === 'max_available') {
                  onChange('borrower2DownpaymentCpfOa', inputs.borrower2OaBalance)
                  onChange('downpaymentCpfOa', inputs.borrower1DownpaymentCpfOa + inputs.borrower2OaBalance)
                }
              }}
              amountValue={inputs.borrower2DownpaymentCpfOa}
              onAmountValueChange={(value) => {
                const cappedValue = Math.min(value, inputs.borrower2OaBalance)
                onChange('borrower2DownpaymentCpfOa', cappedValue)
                onChange('downpaymentCpfOa', inputs.borrower1DownpaymentCpfOa + cappedValue)
              }}
              maxValue={inputs.borrower2OaBalance}
            />

            {/* Borrower 2 Cash */}
            <BorrowerCashRow
              accountOptions={cashAccountOptions}
              selectedAccountId={inputs.borrower2DownpaymentCashAccountId}
              onAccountChange={(value) => onChange('borrower2DownpaymentCashAccountId', value)}
              amountType={inputs.borrower2DownpaymentCashAmountType}
              onAmountTypeChange={(value) => {
                onChange('borrower2DownpaymentCashAmountType', value as DownpaymentCashAmountType)
                if (value === 'remainder') {
                  onChange('borrower2DownpaymentCashAmount', 0)
                }
              }}
              amountValue={inputs.borrower2DownpaymentCashAmount}
              onAmountValueChange={(value) => {
                onChange('borrower2DownpaymentCashAmount', value)
                onChange('downpaymentCash', inputs.borrower1DownpaymentCashAmount + value)
              }}
              remainderAmount={borrower2Remainder}
              requiredDownpayment={requiredDownpayment}
            />
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
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// Internal subcomponents
// ═══════════════════════════════════════════════════════════════════════════════

interface BorrowerCpfOaRowProps {
  amountType: 'fixed' | 'max_available'
  onAmountTypeChange: (value: string) => void
  amountValue: number
  onAmountValueChange: (value: number) => void
  maxValue: number
}

function BorrowerCpfOaRow({
  amountType,
  onAmountTypeChange,
  amountValue,
  onAmountValueChange,
  maxValue,
}: BorrowerCpfOaRowProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0">
          <Landmark className="h-3.5 w-3.5 text-blue-400" />
        </div>
        <span className="text-xs text-slate-300 flex-1">CPF OA</span>
        <div className="flex items-center gap-2">
          <AmountTypeToggle
            options={DOWNPAYMENT_CPF_OA_AMOUNT_TYPE_OPTIONS}
            value={amountType}
            onChange={onAmountTypeChange}
          />
          {amountType === 'fixed' ? (
            <div className="w-28">
              <CurrencyInput
                value={amountValue}
                onChange={onAmountValueChange}
                maxValue={maxValue}
              />
            </div>
          ) : (
            <span className="text-[10px] text-slate-500 w-28 text-right font-mono tabular-nums">
              ${maxValue.toLocaleString()}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// Amount Input Subcomponents
// ═══════════════════════════════════════════════════════════════════════════════

interface FixedAmountInputProps {
  value: number
  onChange: (value: number) => void
}

function FixedAmountInput({ value, onChange }: FixedAmountInputProps) {
  return <InlineCurrencyInput value={value} onChange={onChange} />
}

interface PercentageAmountInputProps {
  value: number
  onChange: (value: number) => void
  computedAmount: number
}

function PercentageAmountInput({ value, onChange, computedAmount }: PercentageAmountInputProps) {
  return (
    <div className="flex items-center gap-1.5">
      <InlineCurrencyInput value={value} onChange={onChange} isPercentage />
      <span className="text-[10px] text-slate-500 font-mono tabular-nums">
        = ${computedAmount.toLocaleString()}
      </span>
    </div>
  )
}

interface RemainderDisplayProps {
  amount: number
}

function RemainderDisplay({ amount }: RemainderDisplayProps) {
  return (
    <span className="text-[10px] text-slate-500 font-mono tabular-nums">
      ${amount.toLocaleString()} remaining
    </span>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// Amount Input Renderer
// ═══════════════════════════════════════════════════════════════════════════════

type DownpaymentCashAmountType = 'fixed' | 'pct_target' | 'pct_source' | 'remainder'

interface AmountInputConfig {
  amountType: DownpaymentCashAmountType
  value: number
  onChange: (value: number) => void
  remainderAmount: number
  pctTargetAmount: number
  pctSourceAmount: number
}

function renderAmountInput(config: AmountInputConfig): React.ReactNode {
  const { amountType, value, onChange, remainderAmount, pctTargetAmount, pctSourceAmount } = config

  switch (amountType) {
    case 'fixed':
      return <FixedAmountInput value={value} onChange={onChange} />
    case 'pct_target':
      return <PercentageAmountInput value={value} onChange={onChange} computedAmount={pctTargetAmount} />
    case 'pct_source':
      return <PercentageAmountInput value={value} onChange={onChange} computedAmount={pctSourceAmount} />
    case 'remainder':
      return <RemainderDisplay amount={remainderAmount} />
    default:
      return null
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// BorrowerCashRow Component
// ═══════════════════════════════════════════════════════════════════════════════

interface BorrowerCashRowProps {
  accountOptions: CashAccountOption[]
  selectedAccountId: string | null | undefined
  onAccountChange: (value: string | null) => void
  amountType: DownpaymentCashAmountType
  onAmountTypeChange: (value: string) => void
  amountValue: number
  onAmountValueChange: (value: number) => void
  /** Computed remainder amount to display when amountType is 'remainder' */
  remainderAmount?: number
  /** Required downpayment for pct_target calculations */
  requiredDownpayment?: number
}

function BorrowerCashRow({
  accountOptions,
  selectedAccountId,
  onAccountChange,
  amountType,
  onAmountTypeChange,
  amountValue,
  onAmountValueChange,
  remainderAmount = 0,
  requiredDownpayment = 0,
}: BorrowerCashRowProps) {
  // Get selected account's balance for pct_source display
  const selectedAccount = accountOptions.find(opt => opt.value === selectedAccountId)
  const sourceBalance = selectedAccount?.balance ?? 0

  // Calculate computed amounts for percentage modes
  const pctTargetAmount = Math.round((amountValue / 100) * requiredDownpayment)
  const pctSourceAmount = Math.round((amountValue / 100) * sourceBalance)

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
          <Wallet className="h-3.5 w-3.5 text-emerald-400" />
        </div>
        <div className="flex-1 min-w-0">
          <CustomDropdown
            value={selectedAccountId ?? ''}
            onChange={(value) => onAccountChange(value || null)}
            options={accountOptions}
            minWidth="100%"
            className="[&_button]:py-1.5 [&_button]:text-xs"
          />
        </div>
      </div>

      {/* Amount type selector - only if cash account selected */}
      {selectedAccountId && (
        <div className="flex items-center gap-2 pl-9">
          <AmountTypeToggle
            options={DOWNPAYMENT_CASH_AMOUNT_TYPE_OPTIONS}
            value={amountType}
            onChange={onAmountTypeChange}
          />
          {renderAmountInput({
            amountType,
            value: amountValue,
            onChange: onAmountValueChange,
            remainderAmount,
            pctTargetAmount,
            pctSourceAmount,
          })}
        </div>
      )}
    </div>
  )
}
