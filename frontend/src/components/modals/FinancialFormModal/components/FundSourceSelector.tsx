import { Wallet } from 'lucide-react'
import { CustomDropdown } from '@/components/modals/ScenarioEventModal/components/CustomDropdown'
import type { CashAccount } from '@/types/financial'

type FundSourceSelectorProps = {
  value: string
  onChange: (value: string) => void
  cashAccounts: CashAccount[]
}

/**
 * Dropdown selector for choosing which cash account to pay expenses from.
 * Used in the expense form to link expenses to specific fund flow rules.
 */
export function FundSourceSelector({ value, onChange, cashAccounts }: FundSourceSelectorProps) {
  const options = [
    { value: '', label: 'Auto (from leftover cash)' },
    ...cashAccounts.map((acc) => ({
      value: acc.id,
      label: acc.name,
    })),
  ]

  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-gray-300">Pay from account</label>
      <CustomDropdown
        value={value}
        onChange={onChange}
        options={options}
        showIcon
        icon={<Wallet className="h-4 w-4" />}
        iconColor="text-emerald-400"
        minWidth="100%"
      />
      <p className="mt-1 text-xs text-gray-400">Select which account to use for this expense</p>
    </div>
  )
}
