import type { Meta, StoryObj } from '@storybook/react'
import { GlassButton } from './GlassButton'
import { Plus, Settings, Trash2, Download, ArrowRight, LogIn, X } from 'lucide-react'

const meta = {
  title: 'UI/GlassButton',
  component: GlassButton,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'destructive', 'ghost', 'icon'],
    },
    size: {
      control: 'select',
      options: ['sm', 'default', 'lg', 'full'],
    },
    loading: { control: 'boolean' },
    disabled: { control: 'boolean' },
  },
} satisfies Meta<typeof GlassButton>

export default meta
type Story = StoryObj<typeof meta>

// --- Variants ---

export const Primary: Story = {
  args: { children: 'Save Changes' },
}

export const Secondary: Story = {
  args: { variant: 'secondary', children: 'Cancel' },
}

export const Destructive: Story = {
  args: { variant: 'destructive', children: 'Delete Account' },
}

export const Ghost: Story = {
  args: { variant: 'ghost', children: 'Skip for now' },
}

export const Icon: Story = {
  args: { variant: 'icon', icon: <X className="h-4 w-4" />, 'aria-label': 'Close' },
}

export const AllVariants: Story = {
  name: 'All Variants',
  render: () => (
    <div className="flex flex-wrap items-center gap-3">
      <GlassButton variant="primary">Primary</GlassButton>
      <GlassButton variant="secondary">Secondary</GlassButton>
      <GlassButton variant="destructive">Destructive</GlassButton>
      <GlassButton variant="ghost">Ghost</GlassButton>
      <GlassButton variant="icon" icon={<Settings className="h-4 w-4" />} aria-label="Settings" />
    </div>
  ),
}

// --- Sizes ---

export const AllSizes: Story = {
  name: 'All Sizes',
  render: () => (
    <div className="flex flex-wrap items-center gap-3">
      <GlassButton size="sm">Small</GlassButton>
      <GlassButton size="default">Default</GlassButton>
      <GlassButton size="lg">Large</GlassButton>
    </div>
  ),
}

export const FullWidth: Story = {
  render: () => (
    <div className="w-80">
      <GlassButton size="full">Sign In</GlassButton>
    </div>
  ),
}

// --- With Icons ---

export const WithIcons: Story = {
  name: 'With Icons',
  render: () => (
    <div className="flex flex-wrap items-center gap-3">
      <GlassButton icon={<Plus className="h-4 w-4" />}>Add Item</GlassButton>
      <GlassButton variant="secondary" icon={<Download className="h-4 w-4" />}>Export</GlassButton>
      <GlassButton variant="destructive" icon={<Trash2 className="h-4 w-4" />}>Delete</GlassButton>
      <GlassButton variant="ghost" icon={<ArrowRight className="h-4 w-4" />}>Next</GlassButton>
    </div>
  ),
}

// --- States ---

export const Loading: Story = {
  args: { loading: true, children: 'Saving...' },
}

export const Disabled: Story = {
  args: { disabled: true, children: 'Disabled' },
}

// --- Compositions ---

export const ActionPair: Story = {
  name: 'Action Pair (Cancel + Save)',
  render: () => (
    <div className="flex gap-3">
      <GlassButton variant="secondary">Cancel</GlassButton>
      <GlassButton variant="primary">Save Changes</GlassButton>
    </div>
  ),
}

export const SidebarNav: Story = {
  name: 'Sidebar Navigation',
  render: () => (
    <div className="flex flex-col gap-1 w-56">
      <GlassButton variant="ghost" className="justify-start" icon={<Settings className="h-4 w-4" />}>
        General
      </GlassButton>
      <GlassButton variant="ghost" className="justify-start bg-white/[0.08] text-white" icon={<Download className="h-4 w-4" />}>
        Export
      </GlassButton>
      <GlassButton variant="ghost" className="justify-start" icon={<Trash2 className="h-4 w-4" />}>
        Danger Zone
      </GlassButton>
    </div>
  ),
}

export const LoginButtons: Story = {
  name: 'Login Page Buttons',
  render: () => (
    <div className="flex flex-col gap-3 w-80">
      <GlassButton size="full" icon={<LogIn className="h-4 w-4" />}>
        Sign In
      </GlassButton>
      <GlassButton variant="secondary" size="full">
        Create Account
      </GlassButton>
    </div>
  ),
}
