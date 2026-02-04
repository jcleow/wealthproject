import type { Meta, StoryObj } from '@storybook/react'
import { FormField } from './FormField'

const meta = {
  title: 'UI/FormField',
  component: FormField,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  args: {
    label: 'Field Label',
  },
  argTypes: {
    type: {
      control: 'select',
      options: ['text', 'number', 'date', 'email', 'password'],
    },
    layout: {
      control: 'select',
      options: ['vertical', 'horizontal'],
    },
  },
} satisfies Meta<typeof FormField>

export default meta
type Story = StoryObj<typeof meta>

// --- Basic ---

export const Default: Story = {
  args: {
    label: 'Full Name',
    placeholder: 'John Doe',
  },
}

export const WithError: Story = {
  args: {
    label: 'Email Address',
    type: 'email',
    placeholder: 'name@example.com',
    error: 'Please enter a valid email address',
    defaultValue: 'not-an-email',
  },
}

export const WithHint: Story = {
  args: {
    label: 'Starting Age',
    type: 'number',
    hint: 'Your current age, used to calculate timeline years',
    defaultValue: 30,
  },
}

export const Required: Story = {
  args: {
    label: 'Salary',
    type: 'number',
    required: true,
    placeholder: '0.00',
  },
}

export const NumberWithSuffix: Story = {
  name: 'Number with Suffix (%)',
  args: {
    label: 'Growth Rate',
    type: 'number',
    step: '0.1',
    defaultValue: 7.5,
    suffix: '%',
  },
}

export const Password: Story = {
  args: {
    label: 'Password',
    type: 'password',
    placeholder: 'Enter password',
    required: true,
  },
}

// --- Layouts ---

export const Horizontal: Story = {
  args: {
    label: 'Growth Rate',
    type: 'number',
    layout: 'horizontal',
    hint: 'Annual expected return',
    defaultValue: 7.5,
    suffix: '%',
    inputClassName: 'w-24',
  },
}

export const TwoColumnGrid: Story = {
  name: '2-Column Form Grid',
  render: () => (
    <div className="grid grid-cols-2 gap-4 w-96">
      <FormField label="Ordinary Account" type="number" placeholder="45000.00" />
      <FormField label="Special Account" type="number" placeholder="20000.00" />
      <FormField label="MediSave Account" type="number" placeholder="15000.00" />
      <FormField label="Retirement Account" type="number" placeholder="0.00" />
    </div>
  ),
}

// --- Compositions ---

export const LoginForm: Story = {
  name: 'Login Form',
  render: () => (
    <div className="w-80 space-y-4">
      <FormField
        label="Email"
        type="email"
        placeholder="name@example.com"
      />
      <FormField
        label="Password"
        type="password"
        placeholder="Enter password"
      />
    </div>
  ),
}

export const SettingsFields: Story = {
  name: 'Settings Fields',
  render: () => (
    <div className="w-96 space-y-6">
      <FormField
        label="Starting Age"
        type="number"
        hint="Your current age, used to calculate timeline years"
        defaultValue={30}
        inputClassName="w-32"
      />
      <FormField
        label="Terminal Age"
        type="number"
        hint="Planning horizon end age (e.g., retirement age)"
        defaultValue={65}
        inputClassName="w-32"
      />
      <FormField
        label="Inflation Rate"
        type="number"
        step="0.1"
        hint="Expected annual inflation"
        defaultValue={3.0}
        suffix="%"
        inputClassName="w-24"
      />
    </div>
  ),
}
