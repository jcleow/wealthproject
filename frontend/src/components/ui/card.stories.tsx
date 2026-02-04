import type { Meta, StoryObj } from '@storybook/react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './card'
import { Button } from './button'

const meta = {
  title: 'UI/Card',
  component: Card,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
} satisfies Meta<typeof Card>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => (
    <Card className="w-[350px]">
      <CardHeader>
        <CardTitle>Card Title</CardTitle>
        <CardDescription>Card description goes here.</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          This is the card content area. It can contain any kind of content.
        </p>
      </CardContent>
      <CardFooter>
        <Button className="w-full">Action</Button>
      </CardFooter>
    </Card>
  ),
}

export const Glassmorphic: Story = {
  render: () => (
    <Card className="w-[350px] rounded-2xl border-white/[0.06] bg-white/[0.02] backdrop-blur-xl shadow-none">
      <CardHeader>
        <CardTitle className="text-lg text-white">Net Worth</CardTitle>
        <CardDescription className="text-slate-400">
          Your total financial snapshot
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-bold font-mono tabular-nums text-emerald-400">
          $1,234,567
        </p>
        <p className="mt-1 text-xs text-slate-500">+12.4% from last month</p>
      </CardContent>
    </Card>
  ),
  parameters: {
    backgrounds: { default: 'dark' },
  },
}

export const SimpleContent: Story = {
  render: () => (
    <Card className="w-[350px] p-6">
      <p className="text-sm">A simple card with just padding and text content.</p>
    </Card>
  ),
}

export const WithHeaderAndFooter: Story = {
  render: () => (
    <Card className="w-[400px]">
      <CardHeader>
        <CardTitle>Create Scenario</CardTitle>
        <CardDescription>Add a new financial scenario to explore.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="text-sm font-medium text-foreground">Name</label>
          <input
            className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            placeholder="e.g. Early Retirement"
          />
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline">Cancel</Button>
        <Button>Create</Button>
      </CardFooter>
    </Card>
  ),
}
