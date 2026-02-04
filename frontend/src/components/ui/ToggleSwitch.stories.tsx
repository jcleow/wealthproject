import type { Meta, StoryObj } from '@storybook/react'
import { useState } from 'react'
import { ToggleSwitch } from './ToggleSwitch'

const meta = {
  title: 'UI/ToggleSwitch',
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

// --- Basic ---

export const On: Story = {
  render: () => {
    const [checked, setChecked] = useState(true)
    return <ToggleSwitch checked={checked} onChange={setChecked} />
  },
}

export const Off: Story = {
  render: () => {
    const [checked, setChecked] = useState(false)
    return <ToggleSwitch checked={checked} onChange={setChecked} />
  },
}

export const WithLabel: Story = {
  render: () => {
    const [checked, setChecked] = useState(true)
    return (
      <div className="w-96">
        <ToggleSwitch
          checked={checked}
          onChange={setChecked}
          label="Dark Mode"
        />
      </div>
    )
  },
}

export const WithDescription: Story = {
  render: () => {
    const [checked, setChecked] = useState(false)
    return (
      <div className="w-96">
        <ToggleSwitch
          checked={checked}
          onChange={setChecked}
          label="Auto-Execute AI Actions"
          description="Execute AI-suggested changes immediately without confirmation"
        />
      </div>
    )
  },
}

export const Disabled: Story = {
  render: () => (
    <div className="flex gap-6">
      <ToggleSwitch checked={false} onChange={() => {}} disabled />
      <ToggleSwitch checked={true} onChange={() => {}} disabled />
    </div>
  ),
}

// --- Settings Row Context ---

export const SettingsRows: Story = {
  name: 'Settings Rows',
  render: () => {
    const [groupItems, setGroupItems] = useState(true)
    const [pipMode, setPipMode] = useState(false)
    const [autoExecute, setAutoExecute] = useState(false)
    return (
      <div className="w-[28rem] space-y-0">
        <div className="py-4 border-b border-white/[0.06]">
          <ToggleSwitch
            checked={groupItems}
            onChange={setGroupItems}
            label="Group Items by Category"
            description="Organize financial items into collapsible category sections"
          />
        </div>
        <div className="py-4 border-b border-white/[0.06]">
          <ToggleSwitch
            checked={pipMode}
            onChange={setPipMode}
            label="Chart Picture-in-Picture"
            description="Show a mini floating chart when scrolling past the main chart"
          />
        </div>
        <div className="py-4">
          <ToggleSwitch
            checked={autoExecute}
            onChange={setAutoExecute}
            label="Auto-Execute AI Actions"
            description="Execute AI-suggested changes immediately without confirmation"
          />
          {autoExecute && (
            <p className="mt-2 text-xs text-amber-400">
              ⚠️ Actions will be executed immediately. Use with caution.
            </p>
          )}
        </div>
      </div>
    )
  },
}
