"use client"

import { Wallet, Landmark } from 'lucide-react'
import { InfoTooltip } from '@/app/property-planner/components/InfoTooltip'
import { CustomDropdown } from '@/components/modals/ScenarioEventModal/components/CustomDropdown'
import { AmountTypeToggle, type AmountTypeOption } from './AmountTypeToggle'
import { CurrencyInput, InlineCurrencyInput } from './CurrencyInput'
import { calculateMonthlyOaInflow } from '@/app/property-planner/hooks'
import { usePropertyFormInputs } from '../../../hooks'
import type { IncomeOption } from '../types'

// Amount type options for monthly cash split configuration
const MONTHLY_AMOUNT_TYPE_OPTIONS: AmountTypeOption[] = [
  { value: 'remainder', label: 'Rest' },
  { value: 'fixed', label: '$' },
  { value: 'percentage', label: '%' },
]

interface CashAccountOption {
  value: string
  label: string
  icon?: React.ReactNode
}

interface MonthlyPaymentSourcesSectionProps {
  incomes: IncomeOption[]
  cashAccountOptions: CashAccountOption[]
}

/**
 * Monthly payment fund sources section - handles CPF OA and Cash for both borrowers.
 * Uses form context for inputs/onChange - no prop drilling needed.
 */
export function MonthlyPaymentSourcesSection({
  incomes,
  cashAccountOptions,
}: MonthlyPaymentSourcesSectionProps) {
  const { inputs, onChange } = usePropertyFormInputs()
  const isJoint = inputs.borrowerType === 'joint' && !!inputs.borrower2IncomeId

  const borrower1Income = incomes.find(i => i.id === inputs.borrower1IncomeId)
  const borrower2Income = incomes.find(i => i.id === inputs.borrower2IncomeId)

  return (
    <div className="pt-4 border-t border-white/[0.06]">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">Monthly Payment Sources</span>
        <InfoTooltip
          title="Monthly Payment Sources"
          description="Configure how your monthly mortgage payment will be funded - each borrower can specify their CPF OA and cash contributions."
        />
      </div>

      <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-3">
        {/* Borrower 1 */}
        {isJoint && (
          <div className="text-[10px] font-medium text-slate-500 uppercase tracking-wide">Borrower 1</div>
        )}

        {/* Borrower 1 CPF OA */}
        <MonthlyCpfOaRow
          amountValue={inputs.borrower1MonthlyCpfOa}
          onAmountValueChange={(value) => {
            onChange('borrower1MonthlyCpfOa', value)
            onChange('monthlyCpfOa', value + inputs.borrower2MonthlyCpfOa)
          }}
          estimatedOaInflow={borrower1Income ? calculateMonthlyOaInflow(borrower1Income.monthlyAmount) : undefined}
          showEstimate={!!inputs.borrower1IncomeId}
        />

        {/* Borrower 1 Cash */}
        <MonthlyCashRow
          accountOptions={cashAccountOptions}
          selectedAccountId={inputs.borrower1MonthlyCashAccountId}
          onAccountChange={(value) => onChange('borrower1MonthlyCashAccountId', value)}
          amountType={inputs.borrower1MonthlyCashAmountType}
          onAmountTypeChange={(value) => {
            onChange('borrower1MonthlyCashAmountType', value as 'fixed' | 'percentage' | 'remainder')
            if (value === 'remainder') {
              onChange('borrower1MonthlyCashAmount', 0)
            }
          }}
          amountValue={inputs.borrower1MonthlyCashAmount}
          onAmountValueChange={(value) => onChange('borrower1MonthlyCashAmount', value)}
        />

        {/* Borrower 2 */}
        {isJoint && (
          <>
            <div className="pt-2 border-t border-white/[0.04]">
              <div className="text-[10px] font-medium text-slate-500 uppercase tracking-wide mb-2">Borrower 2</div>
            </div>

            {/* Borrower 2 CPF OA */}
            <MonthlyCpfOaRow
              amountValue={inputs.borrower2MonthlyCpfOa}
              onAmountValueChange={(value) => {
                onChange('borrower2MonthlyCpfOa', value)
                onChange('monthlyCpfOa', inputs.borrower1MonthlyCpfOa + value)
              }}
              estimatedOaInflow={borrower2Income ? calculateMonthlyOaInflow(borrower2Income.monthlyAmount) : undefined}
              showEstimate={true}
            />

            {/* Borrower 2 Cash */}
            <MonthlyCashRow
              accountOptions={cashAccountOptions}
              selectedAccountId={inputs.borrower2MonthlyCashAccountId}
              onAccountChange={(value) => onChange('borrower2MonthlyCashAccountId', value)}
              amountType={inputs.borrower2MonthlyCashAmountType}
              onAmountTypeChange={(value) => {
                onChange('borrower2MonthlyCashAmountType', value as 'fixed' | 'percentage' | 'remainder')
                if (value === 'remainder') {
                  onChange('borrower2MonthlyCashAmount', 0)
                }
              }}
              amountValue={inputs.borrower2MonthlyCashAmount}
              onAmountValueChange={(value) => onChange('borrower2MonthlyCashAmount', value)}
            />
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
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// Internal subcomponents
// ═══════════════════════════════════════════════════════════════════════════════

interface MonthlyCpfOaRowProps {
  amountValue: number
  onAmountValueChange: (value: number) => void
  estimatedOaInflow?: number
  showEstimate?: boolean
}

function MonthlyCpfOaRow({
  amountValue,
  onAmountValueChange,
  estimatedOaInflow,
  showEstimate,
}: MonthlyCpfOaRowProps) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-3">
        <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0">
          <Landmark className="h-3.5 w-3.5 text-blue-400" />
        </div>
        <span className="text-xs text-slate-300 flex-1">CPF OA</span>
        <div className="w-28">
          <CurrencyInput
            value={amountValue}
            onChange={onAmountValueChange}
          />
        </div>
      </div>
      {showEstimate && estimatedOaInflow !== undefined && (
        <p className="text-[10px] text-slate-600 pl-9">
          Est. monthly OA: ${estimatedOaInflow.toLocaleString()}/mo
        </p>
      )}
    </div>
  )
}

interface MonthlyCashRowProps {
  accountOptions: CashAccountOption[]
  selectedAccountId: string | null | undefined
  onAccountChange: (value: string | null) => void
  amountType: 'fixed' | 'percentage' | 'remainder'
  onAmountTypeChange: (value: string) => void
  amountValue: number
  onAmountValueChange: (value: number) => void
}

function MonthlyCashRow({
  accountOptions,
  selectedAccountId,
  onAccountChange,
  amountType,
  onAmountTypeChange,
  amountValue,
  onAmountValueChange,
}: MonthlyCashRowProps) {
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
            options={MONTHLY_AMOUNT_TYPE_OPTIONS}
            value={amountType}
            onChange={onAmountTypeChange}
          />
          {amountType !== 'remainder' ? (
            <InlineCurrencyInput
              value={amountValue}
              onChange={onAmountValueChange}
              isPercentage={amountType === 'percentage'}
            />
          ) : (
            <span className="text-[10px] text-slate-500">covers remaining</span>
          )}
        </div>
      )}
    </div>
  )
}
