"use client"

import { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { Wallet, Landmark } from 'lucide-react'
import { AmountTypeToggle, type AmountTypeOption } from './AmountTypeToggle'
import { CurrencyInput, InlineCurrencyInput } from './CurrencyInput'
import { CustomDropdown } from '@/components/modals/ScenarioEventModal/components/CustomDropdown'

type SourceType = 'cpf' | 'cash'

interface FundSourceRowProps {
  /** Type of fund source */
  sourceType: SourceType
  /** Current amount type selection */
  amountType: string
  /** Handler for amount type change */
  onAmountTypeChange: (value: string) => void
  /** Amount type options */
  amountTypeOptions: AmountTypeOption[]
  /** Current amount value */
  amountValue: number
  /** Handler for amount value change */
  onAmountValueChange: (value: number) => void
  /** Max value for amount (e.g., OA balance) */
  maxAmountValue?: number
  /** For CPF: show as read-only with max value display */
  showMaxDisplay?: boolean
  /** Maximum available value for display */
  maxDisplayValue?: number
  /** For Cash: account dropdown options */
  accountOptions?: Array<{ value: string; label: string; icon?: ReactNode }>
  /** Selected account ID */
  selectedAccountId?: string | null
  /** Handler for account selection */
  onAccountChange?: (accountId: string | null) => void
  /** Additional info line (e.g., "Est. monthly OA: $xxx/mo") */
  infoText?: string
  /** Whether this is a percentage type that needs % suffix */
  isPercentageType?: boolean
  /** Whether this row type only shows input when specific amount type selected */
  showInputForTypes?: string[]
  /** Custom label (defaults to "CPF OA" or account name) */
  label?: string
}

/**
 * Reusable fund source row for downpayment and monthly payment configurations.
 * Supports CPF OA (fixed amount or max available) and Cash (dropdown + amount type).
 */
export function FundSourceRow({
  sourceType,
  amountType,
  onAmountTypeChange,
  amountTypeOptions,
  amountValue,
  onAmountValueChange,
  maxAmountValue,
  showMaxDisplay,
  maxDisplayValue,
  accountOptions,
  selectedAccountId,
  onAccountChange,
  infoText,
  isPercentageType,
  showInputForTypes,
  label,
}: FundSourceRowProps) {
  const isCpf = sourceType === 'cpf'
  const Icon = isCpf ? Landmark : Wallet
  const iconColor = isCpf ? 'text-blue-400' : 'text-emerald-400'
  const bgColor = isCpf ? 'bg-blue-500/20' : 'bg-emerald-500/20'
  const defaultLabel = isCpf ? 'CPF OA' : 'Cash'

  // Determine if we should show input based on amount type
  const shouldShowInput = showInputForTypes
    ? showInputForTypes.includes(amountType)
    : amountType !== 'remainder' && amountType !== 'max_available'

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        {/* Icon */}
        <div className={cn("w-6 h-6 rounded-full flex items-center justify-center shrink-0", bgColor)}>
          <Icon className={cn("h-3.5 w-3.5", iconColor)} />
        </div>

        {/* Label or Account Dropdown */}
        {isCpf ? (
          <span className="text-xs text-slate-300 flex-1">{label || defaultLabel}</span>
        ) : (
          <div className="flex-1 min-w-0">
            <CustomDropdown
              value={selectedAccountId ?? ''}
              onChange={(value) => onAccountChange?.(value || null)}
              options={accountOptions || []}
              minWidth="100%"
              className="[&_button]:py-1.5 [&_button]:text-xs"
            />
          </div>
        )}

        {/* Amount Type Toggle + Value */}
        {(isCpf || selectedAccountId) && (
          <div className="flex items-center gap-2">
            <AmountTypeToggle
              options={amountTypeOptions}
              value={amountType}
              onChange={onAmountTypeChange}
            />

            {shouldShowInput ? (
              <div className="w-28">
                <CurrencyInput
                  value={amountValue}
                  onChange={onAmountValueChange}
                  maxValue={maxAmountValue}
                  isPercentage={isPercentageType}
                />
              </div>
            ) : showMaxDisplay && maxDisplayValue !== undefined ? (
              <span className="text-[10px] text-slate-500 w-28 text-right font-mono tabular-nums">
                ${maxDisplayValue.toLocaleString()}
              </span>
            ) : null}
          </div>
        )}
      </div>

      {/* Cash: Amount type selector row (only if account selected) */}
      {!isCpf && selectedAccountId && (
        <div className="flex items-center gap-2 pl-9">
          <AmountTypeToggle
            options={amountTypeOptions}
            value={amountType}
            onChange={onAmountTypeChange}
          />

          {shouldShowInput ? (
            <InlineCurrencyInput
              value={amountValue}
              onChange={onAmountValueChange}
              isPercentage={isPercentageType}
            />
          ) : amountType === 'remainder' ? (
            <span className="text-[10px] text-slate-500">covers remaining</span>
          ) : null}
        </div>
      )}

      {/* Info text (e.g., estimated monthly OA) */}
      {infoText && (
        <p className="text-[10px] text-slate-600 pl-9">{infoText}</p>
      )}
    </div>
  )
}
