import type { Meta, StoryFn } from '@storybook/react'
import { useState } from 'react'
import { CurrencyInput, InlineCurrencyInput } from './CurrencyInput'

const meta: Meta<typeof CurrencyInput> = {
  title: 'UI/CurrencyInput',
  component: CurrencyInput,
  tags: ['autodocs'],
  parameters: {
    backgrounds: { default: 'dark' },
  },
  argTypes: {
    isPercentage: { control: 'boolean' },
    size: { control: 'select', options: ['default', 'sm'] },
    maxValue: { control: 'number' },
  },
}

export default meta

// Interactive wrapper to manage state
function CurrencyInputDemo(props: {
  initialValue?: number
  isPercentage?: boolean
  size?: 'default' | 'sm'
  maxValue?: number
  placeholder?: string
}) {
  const [value, setValue] = useState(props.initialValue ?? 0)
  return (
    <div className="w-48">
      <CurrencyInput
        value={value}
        onChange={setValue}
        isPercentage={props.isPercentage}
        size={props.size}
        maxValue={props.maxValue}
        placeholder={props.placeholder}
      />
      <p className="mt-2 text-xs text-slate-500 font-mono">
        Raw value: {value}
      </p>
    </div>
  )
}

export const Dollar: StoryFn = () => <CurrencyInputDemo initialValue={50000} />

export const Percentage: StoryFn = () => <CurrencyInputDemo initialValue={7.5} isPercentage />

export const WithMaxValue: StoryFn = () => <CurrencyInputDemo initialValue={0} maxValue={100} isPercentage />
WithMaxValue.parameters = {
  docs: { description: { story: 'Capped at 100%. Try typing a larger number.' } },
}

export const LargerSize: StoryFn = () => <CurrencyInputDemo initialValue={1250000} size="sm" />

export const Empty: StoryFn = () => <CurrencyInputDemo placeholder="Enter amount" />

// InlineCurrencyInput stories

function InlineDemo(props: { isPercentage?: boolean; initialValue?: number }) {
  const [value, setValue] = useState(props.initialValue ?? 0)
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-slate-400">Amount:</span>
      <InlineCurrencyInput
        value={value}
        onChange={setValue}
        isPercentage={props.isPercentage}
      />
      <span className="text-xs text-slate-500 font-mono">{value}</span>
    </div>
  )
}

export const InlineDollar: StoryFn = () => <InlineDemo initialValue={2500} />
InlineDollar.storyName = 'Inline — Dollar'

export const InlinePercentage: StoryFn = () => <InlineDemo initialValue={8.5} isPercentage />
InlinePercentage.storyName = 'Inline — Percentage'
