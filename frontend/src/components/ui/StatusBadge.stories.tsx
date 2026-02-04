import type { Meta, StoryObj } from '@storybook/react'
import { StatusBadge } from './StatusBadge'
import { CheckCircle2, AlertTriangle, XCircle, Clock, Shield, Info } from 'lucide-react'

const meta = {
  title: 'UI/StatusBadge',
  component: StatusBadge,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    status: {
      control: 'select',
      options: ['success', 'warning', 'danger', 'info', 'neutral', 'purple'],
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
    },
  },
} satisfies Meta<typeof StatusBadge>

export default meta
type Story = StoryObj<typeof meta>

// --- Single Status ---

export const Success: Story = {
  args: { status: 'success', children: 'Active', icon: <CheckCircle2 /> },
}

export const Warning: Story = {
  args: { status: 'warning', children: 'Pending', icon: <AlertTriangle /> },
}

export const Danger: Story = {
  args: { status: 'danger', children: 'Overdue', icon: <XCircle /> },
}

export const InfoStatus: Story = {
  args: { status: 'info', children: 'New', icon: <Info /> },
}

export const Neutral: Story = {
  args: { status: 'neutral', children: 'Draft', icon: <Clock /> },
}

export const Purple: Story = {
  args: { status: 'purple', children: 'Premium' },
}

// --- All Statuses ---

export const AllStatuses: Story = {
  name: 'All Statuses',
  render: () => (
    <div className="flex flex-wrap gap-2">
      <StatusBadge status="success" icon={<CheckCircle2 />}>Active</StatusBadge>
      <StatusBadge status="warning" icon={<AlertTriangle />}>Pending</StatusBadge>
      <StatusBadge status="danger" icon={<XCircle />}>Overdue</StatusBadge>
      <StatusBadge status="info" icon={<Info />}>New</StatusBadge>
      <StatusBadge status="neutral" icon={<Clock />}>Draft</StatusBadge>
      <StatusBadge status="purple">Premium</StatusBadge>
    </div>
  ),
}

// --- All Sizes ---

export const AllSizes: Story = {
  name: 'All Sizes',
  render: () => (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <span className="text-xs text-slate-500 w-8">sm</span>
        <StatusBadge status="success" size="sm" icon={<Shield />}>Covered</StatusBadge>
        <StatusBadge status="warning" size="sm">Partial</StatusBadge>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs text-slate-500 w-8">md</span>
        <StatusBadge status="success" size="md" icon={<Shield />}>Covered</StatusBadge>
        <StatusBadge status="warning" size="md">Partial</StatusBadge>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs text-slate-500 w-8">lg</span>
        <StatusBadge status="success" size="lg" icon={<Shield />}>Covered</StatusBadge>
        <StatusBadge status="warning" size="lg">Partial</StatusBadge>
      </div>
    </div>
  ),
}

// --- In Context ---

export const InlineInCard: Story = {
  name: 'Inline in Card',
  render: () => (
    <div className="flex items-center gap-3 px-4 py-3 rounded-lg border border-white/[0.06] bg-[#111111] w-80">
      <div className="flex-1">
        <span className="text-sm text-slate-200">Life Insurance</span>
        <p className="text-xs text-slate-500 mt-0.5">$500k coverage</p>
      </div>
      <StatusBadge status="success" icon={<CheckCircle2 />}>Active</StatusBadge>
    </div>
  ),
}

export const CoverageBadges: Story = {
  name: 'Coverage Badges',
  render: () => (
    <div className="flex flex-wrap gap-2">
      <StatusBadge status="success" icon={<Shield />}>Life</StatusBadge>
      <StatusBadge status="success" icon={<Shield />}>Health</StatusBadge>
      <StatusBadge status="warning" icon={<AlertTriangle />}>Disability</StatusBadge>
      <StatusBadge status="danger" icon={<XCircle />}>Critical Illness</StatusBadge>
      <StatusBadge status="neutral" icon={<Clock />}>Long-term Care</StatusBadge>
    </div>
  ),
}
