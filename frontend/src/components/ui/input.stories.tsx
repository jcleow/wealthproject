import type { Meta, StoryObj } from '@storybook/react'
import { Input } from './input'

const meta = {
  title: 'UI/Input',
  component: Input,
  tags: ['autodocs'],
  argTypes: {
    type: {
      control: 'select',
      options: ['text', 'email', 'password', 'number', 'search', 'tel', 'url'],
    },
    disabled: { control: 'boolean' },
    placeholder: { control: 'text' },
  },
} satisfies Meta<typeof Input>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    placeholder: 'Enter text...',
  },
}

export const Email: Story = {
  args: {
    type: 'email',
    placeholder: 'name@example.com',
  },
}

export const Password: Story = {
  args: {
    type: 'password',
    placeholder: 'Enter password',
  },
}

export const Number: Story = {
  args: {
    type: 'number',
    placeholder: '0',
  },
}

export const Disabled: Story = {
  args: {
    placeholder: 'Disabled input',
    disabled: true,
  },
}

export const WithValue: Story = {
  args: {
    defaultValue: 'Hello World',
  },
}

export const File: Story = {
  args: {
    type: 'file',
  },
}

export const GlassmorphicVariant: Story = {
  render: () => (
    <input
      className="w-64 rounded-xl bg-white/[0.03] border border-white/[0.06] text-white text-sm py-2.5 px-3 focus:outline-none focus:border-white/20 focus:bg-white/[0.05] placeholder:text-slate-600"
      placeholder="Glassmorphic input"
    />
  ),
  parameters: {
    backgrounds: { default: 'dark' },
  },
}
