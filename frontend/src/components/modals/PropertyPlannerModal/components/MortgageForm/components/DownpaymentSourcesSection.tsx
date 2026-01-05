"use client"

import { Wallet, Landmark } from 'lucide-react'
import { InfoTooltip } from '@/app/property-planner/components/InfoTooltip'
import { CustomDropdown } from '@/components/modals/ScenarioEventModal/components/CustomDropdown'
import { AmountTypeToggle, type AmountTypeOption } from './AmountTypeToggle'
import { CurrencyInput, InlineCurrencyInput } from './CurrencyInput'
import type { MortgageInputs } from '@/app/property-planner/types'
import type { OnChangeHandler } from '../types'

// Amount type options for downpayment CPF OA
const DOWNPAYMENT_CPF_OA_AMOUNT_TYPE_OPTIONS: AmountTypeOption[] = [
  { value: 'max_available', label: 'Max' },
  { value: 'fixed', label: '$' },
]

// Amount type options for downpayment cash
const DOWNPAYMENT_CASH_AMOUNT_TYPE_OPTIONS: AmountTypeOption[] = [
  { value: 'remainder', label: 'Rest' },
  { value: 'fixed', label: '$' },
]

interface CashAccountOption {
  value: string
  label: string
  icon?: React.ReactNode
}

interface DownpaymentSourcesSectionProps {
  inputs: MortgageInputs
  onChange: OnChangeHandler
  cashAccountOptions: CashAccountOption[]
}

/**
 * Downpayment fund sources section - handles CPF OA and Cash for both borrowers.
 */
export function DownpaymentSourcesSection({
  inputs,
  onChange,
  cashAccountOptions,
}: DownpaymentSourcesSectionProps) {
  const isJoint = inputs.borrowerType === 'joint' && !!inputs.borrower2IncomeId

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
            onChange('borrower1DownpaymentCashAmountType', value as 'fixed' | 'remainder')
            if (value === 'remainder') {
              onChange('borrower1DownpaymentCashAmount', 0)
            }
          }}
          amountValue={inputs.borrower1DownpaymentCashAmount}
          onAmountValueChange={(value) => {
            onChange('borrower1DownpaymentCashAmount', value)
            onChange('downpaymentCash', value + inputs.borrower2DownpaymentCashAmount)
          }}
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
                onChange('borrower2DownpaymentCashAmountType', value as 'fixed' | 'remainder')
                if (value === 'remainder') {
                  onChange('borrower2DownpaymentCashAmount', 0)
                }
              }}
              amountValue={inputs.borrower2DownpaymentCashAmount}
              onAmountValueChange={(value) => {
                onChange('borrower2DownpaymentCashAmount', value)
                onChange('downpaymentCash', inputs.borrower1DownpaymentCashAmount + value)
              }}
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

interface BorrowerCashRowProps {
  accountOptions: CashAccountOption[]
  selectedAccountId: string | null | undefined
  onAccountChange: (value: string | null) => void
  amountType: 'fixed' | 'remainder'
  onAmountTypeChange: (value: string) => void
  amountValue: number
  onAmountValueChange: (value: number) => void
}

function BorrowerCashRow({
  accountOptions,
  selectedAccountId,
  onAccountChange,
  amountType,
  onAmountTypeChange,
  amountValue,
  onAmountValueChange,
}: BorrowerCashRowProps) {
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
          {amountType === 'fixed' ? (
            <InlineCurrencyInput
              value={amountValue}
              onChange={onAmountValueChange}
            />
          ) : (
            <span className="text-[10px] text-slate-500">covers remaining</span>
          )}
        </div>
      )}
    </div>
  )
}
