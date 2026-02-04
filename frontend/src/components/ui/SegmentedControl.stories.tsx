import type { Meta, StoryObj } from '@storybook/react'
import { useState } from 'react'
import { SegmentedControl } from './SegmentedControl'
import { BarChart3, LineChart, Table } from 'lucide-react'

const meta = {
  title: 'UI/SegmentedControl',
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

// --- Basic ---

export const TwoOptions: Story = {
  render: () => {
    const [value, setValue] = useState('monthly')
    return (
      <SegmentedControl
        value={value}
        onChange={setValue}
        options={[
          { value: 'monthly', label: 'Monthly' },
          { value: 'yearly', label: 'Yearly' },
        ]}
      />
    )
  },
}

export const ThreeOptions: Story = {
  render: () => {
    const [value, setValue] = useState('chart')
    return (
      <SegmentedControl
        value={value}
        onChange={setValue}
        options={[
          { value: 'chart', label: 'Chart' },
          { value: 'table', label: 'Table' },
          { value: 'summary', label: 'Summary' },
        ]}
      />
    )
  },
}

export const WithIcons: Story = {
  render: () => {
    const [value, setValue] = useState('line')
    return (
      <SegmentedControl
        value={value}
        onChange={setValue}
        options={[
          { value: 'line', label: 'Line', icon: <LineChart /> },
          { value: 'bar', label: 'Bar', icon: <BarChart3 /> },
          { value: 'table', label: 'Table', icon: <Table /> },
        ]}
      />
    )
  },
}

export const SmallSize: Story = {
  render: () => {
    const [value, setValue] = useState('nominal')
    return (
      <SegmentedControl
        value={value}
        onChange={setValue}
        size="sm"
        options={[
          { value: 'nominal', label: 'Nominal' },
          { value: 'real', label: 'Real' },
        ]}
      />
    )
  },
}
