import type { Meta, StoryFn } from '@storybook/react'
import { useState } from 'react'
import { CustomDropdown, type DropdownOption, type DropdownGroup } from './CustomDropdown'
import { TrendingUp, TrendingDown, Wallet, PiggyBank, Landmark } from 'lucide-react'

const meta: Meta<typeof CustomDropdown> = {
  title: 'UI/CustomDropdown',
  component: CustomDropdown,
  tags: ['autodocs'],
  parameters: {
    backgrounds: { default: 'dark' },
  },
}

export default meta

// State wrapper — CustomDropdown is a controlled component
function DropdownDemo<T extends string = string>(props: {
  options?: DropdownOption<T>[]
  groups?: DropdownGroup<T>[]
  initialValue: T
  showIcon?: boolean
  icon?: React.ReactNode
  iconColor?: string
  variant?: 'dark' | 'monet'
  disabled?: boolean
  minWidth?: string
}) {
  const { initialValue, ...rest } = props
  const [value, setValue] = useState<T>(initialValue)
  return <CustomDropdown value={value} onChange={setValue} {...rest} />
}

// --- Stories ---

const frequencyOptions: DropdownOption[] = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'semi-annually', label: 'Semi-Annually' },
  { value: 'annually', label: 'Annually' },
]

export const FlatOptions: StoryFn = () => (
  <DropdownDemo options={frequencyOptions} initialValue="monthly" />
)

const assetGroups: DropdownGroup[] = [
  {
    label: 'Liquid Assets',
    options: [
      { value: 'cash', label: 'Cash & Savings' },
      { value: 'stocks', label: 'Stocks' },
      { value: 'bonds', label: 'Bonds' },
    ],
  },
  {
    label: 'Illiquid Assets',
    options: [
      { value: 'property', label: 'Real Estate' },
      { value: 'business', label: 'Business Equity' },
      { value: 'collectibles', label: 'Collectibles' },
    ],
  },
]

export const GroupedOptions: StoryFn = () => (
  <DropdownDemo groups={assetGroups} initialValue="stocks" minWidth="200px" />
)

const iconOptions: DropdownOption[] = [
  { value: 'income', label: 'Income', icon: <TrendingUp className="h-4 w-4" />, iconColor: 'text-emerald-400' },
  { value: 'expense', label: 'Expense', icon: <TrendingDown className="h-4 w-4" />, iconColor: 'text-rose-400' },
  { value: 'savings', label: 'Savings', icon: <PiggyBank className="h-4 w-4" />, iconColor: 'text-blue-400' },
  { value: 'investment', label: 'Investment', icon: <Landmark className="h-4 w-4" />, iconColor: 'text-amber-400' },
]

export const WithIcons: StoryFn = () => (
  <DropdownDemo
    options={iconOptions}
    initialValue="income"
    showIcon
    icon={<Wallet className="h-4 w-4" />}
    iconColor="text-emerald-400"
    minWidth="180px"
  />
)

export const MonetTheme: StoryFn = () => (
  <DropdownDemo
    options={frequencyOptions}
    initialValue="quarterly"
    variant="monet"
  />
)
MonetTheme.parameters = {
  backgrounds: { default: 'monet' },
}

export const Disabled: StoryFn = () => (
  <DropdownDemo options={frequencyOptions} initialValue="monthly" disabled />
)
