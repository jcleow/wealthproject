import type { Meta, StoryFn } from '@storybook/react'
import { useState } from 'react'
import { CustomSelect, type SelectOption } from './CustomSelect'

const meta: Meta<typeof CustomSelect> = {
  title: 'UI/CustomSelect',
  component: CustomSelect,
  tags: ['autodocs'],
  parameters: {
    backgrounds: { default: 'dark' },
  },
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'compact', 'minimal'],
    },
    disabled: { control: 'boolean' },
  },
}

export default meta

const sampleOptions: SelectOption[] = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'annually', label: 'Annually' },
]

const categoryOptions: SelectOption[] = [
  { value: 'housing', label: 'Housing' },
  { value: 'transport', label: 'Transportation' },
  { value: 'food', label: 'Food & Dining' },
  { value: 'utilities', label: 'Utilities' },
  { value: 'healthcare', label: 'Healthcare' },
  { value: 'entertainment', label: 'Entertainment' },
  { value: 'other', label: 'Other', disabled: true },
]

function SelectDemo(props: {
  options: SelectOption[]
  variant?: 'default' | 'compact' | 'minimal'
  placeholder?: string
  disabled?: boolean
  initialValue?: string | number
}) {
  const [value, setValue] = useState<string | number>(props.initialValue ?? '')
  return (
    <div className="w-56">
      <CustomSelect
        value={value}
        onChange={setValue}
        options={props.options}
        variant={props.variant}
        placeholder={props.placeholder}
        disabled={props.disabled}
      />
    </div>
  )
}

export const Default: StoryFn = () => (
  <SelectDemo options={sampleOptions} initialValue="monthly" />
)

export const Compact: StoryFn = () => (
  <SelectDemo options={sampleOptions} variant="compact" initialValue="quarterly" />
)

export const Minimal: StoryFn = () => (
  <SelectDemo options={sampleOptions} variant="minimal" initialValue="annually" />
)

export const WithPlaceholder: StoryFn = () => (
  <SelectDemo options={categoryOptions} placeholder="Select category..." />
)

export const WithDisabledOption: StoryFn = () => (
  <SelectDemo options={categoryOptions} placeholder="Select category..." />
)
WithDisabledOption.parameters = {
  docs: { description: { story: 'The "Other" option is disabled and cannot be selected.' } },
}

export const Disabled: StoryFn = () => (
  <SelectDemo options={sampleOptions} initialValue="monthly" disabled />
)

export const AllVariants: StoryFn = () => (
  <div className="flex flex-col gap-6">
    <div>
      <p className="text-xs text-slate-500 mb-2">Default</p>
      <SelectDemo options={sampleOptions} initialValue="monthly" />
    </div>
    <div>
      <p className="text-xs text-slate-500 mb-2">Compact</p>
      <SelectDemo options={sampleOptions} variant="compact" initialValue="quarterly" />
    </div>
    <div>
      <p className="text-xs text-slate-500 mb-2">Minimal</p>
      <SelectDemo options={sampleOptions} variant="minimal" initialValue="annually" />
    </div>
  </div>
)
