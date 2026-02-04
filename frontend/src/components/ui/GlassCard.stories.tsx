import type { Meta, StoryObj } from '@storybook/react'
import { GlassCard, GlassCardHeader, GlassCardContent, GlassCardFooter } from './GlassCard'
import { GlassButton } from './GlassButton'
import { TrendingUp, TrendingDown, DollarSign, Briefcase, Home, Landmark } from 'lucide-react'

const meta = {
  title: 'UI/GlassCard',
  component: GlassCard,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
  argTypes: {
    variant: {
      control: 'select',
      options: ['surface', 'elevated', 'glass', 'status'],
    },
    padding: {
      control: 'select',
      options: ['none', 'compact', 'default', 'spacious'],
    },
    hover: { control: 'boolean' },
    statusColor: {
      control: 'select',
      options: ['emerald', 'amber', 'rose', 'blue'],
    },
  },
} satisfies Meta<typeof GlassCard>

export default meta
type Story = StoryObj<typeof meta>

// --- Variants ---

export const Surface: Story = {
  args: {
    variant: 'surface',
    className: 'w-80',
    children: (
      <p className="text-sm text-slate-300">Surface card — the default, subtle container.</p>
    ),
  },
}

export const Elevated: Story = {
  args: {
    variant: 'elevated',
    className: 'w-80',
    children: (
      <p className="text-sm text-slate-300">Elevated card — slightly more prominent.</p>
    ),
  },
}

export const Glass: Story = {
  args: {
    variant: 'glass',
    className: 'w-80',
    children: (
      <p className="text-sm text-slate-300">Glass card — frosted glass with backdrop blur.</p>
    ),
  },
}

// --- Summary Stat Card ---

export const SummaryStat: Story = {
  name: 'Summary Stat',
  render: () => (
    <GlassCard variant="surface" padding="compact" hover className="w-48">
      <div className="flex items-center gap-2">
        <div className="h-2 w-2 rounded-full shrink-0 bg-blue-500" />
        <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400">Net Worth</span>
      </div>
      <p className="mt-1 text-xl font-semibold tracking-tight text-slate-100 font-mono tabular-nums">
        $1,234,567
      </p>
      <div className="mt-1 flex items-center gap-1">
        <TrendingUp className="h-3 w-3 text-emerald-400" />
        <span className="text-xs font-mono text-emerald-400">+12.4%</span>
      </div>
    </GlassCard>
  ),
}

// --- Summary Cards Row ---

export const SummaryCardsRow: Story = {
  name: 'Summary Cards Row',
  render: () => (
    <div className="flex gap-3">
      {[
        { label: 'Net Worth', value: '$1,234,567', color: 'bg-blue-500', trend: '+12.4%', trendUp: true },
        { label: 'Assets', value: '$1,890,000', color: 'bg-emerald-500', trend: '+8.2%', trendUp: true },
        { label: 'Liabilities', value: '($655,433)', color: 'bg-rose-500', trend: '-3.1%', trendUp: false },
      ].map((item) => (
        <GlassCard key={item.label} variant="surface" padding="compact" hover className="flex-1">
          <div className="flex items-center gap-2">
            <div className={`h-2 w-2 rounded-full shrink-0 ${item.color}`} />
            <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400">{item.label}</span>
          </div>
          <p className="mt-1 text-xl font-semibold tracking-tight text-slate-100 font-mono tabular-nums">
            {item.value}
          </p>
          <div className="mt-1 flex items-center gap-1">
            {item.trendUp ? <TrendingUp className="h-3 w-3 text-emerald-400" /> : <TrendingDown className="h-3 w-3 text-rose-400" />}
            <span className={`text-xs font-mono ${item.trendUp ? 'text-emerald-400' : 'text-rose-400'}`}>{item.trend}</span>
          </div>
        </GlassCard>
      ))}
    </div>
  ),
}

// --- Category Card (with compound parts) ---

export const CategoryCard: Story = {
  name: 'Category Card',
  render: () => (
    <GlassCard variant="elevated" padding="none" className="w-80 overflow-hidden">
      <GlassCardHeader className="px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center h-7 w-7 rounded-lg bg-emerald-500/15">
            <DollarSign className="h-4 w-4 text-emerald-400" />
          </div>
          <span className="text-sm font-medium text-slate-200">Income</span>
        </div>
        <span className="text-sm font-semibold font-mono tabular-nums text-emerald-400">$8,500</span>
      </GlassCardHeader>
      <GlassCardContent className="p-3 space-y-2 py-0">
        {[
          { name: 'Salary', amount: '$7,000', icon: Briefcase },
          { name: 'Rental Income', amount: '$1,200', icon: Home },
          { name: 'Investments', amount: '$300', icon: Landmark },
        ].map((item) => (
          <div key={item.name} className="flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-white/[0.03] transition-colors">
            <div className="flex items-center gap-2">
              <item.icon className="h-3.5 w-3.5 text-slate-500" />
              <span className="text-sm text-slate-300">{item.name}</span>
            </div>
            <span className="text-sm font-mono tabular-nums text-slate-200">{item.amount}</span>
          </div>
        ))}
      </GlassCardContent>
    </GlassCard>
  ),
}

// --- Status-Colored Cards ---

export const StatusCards: Story = {
  name: 'Status-Colored Cards',
  render: () => (
    <div className="flex gap-3">
      <GlassCard variant="status" statusColor="emerald" className="flex-1">
        <span className="text-xs font-medium text-emerald-400">Covered</span>
        <p className="mt-1 text-lg font-semibold text-emerald-300">85%</p>
      </GlassCard>
      <GlassCard variant="status" statusColor="amber" className="flex-1">
        <span className="text-xs font-medium text-amber-400">Partial</span>
        <p className="mt-1 text-lg font-semibold text-amber-300">10%</p>
      </GlassCard>
      <GlassCard variant="status" statusColor="rose" className="flex-1">
        <span className="text-xs font-medium text-rose-400">Gap</span>
        <p className="mt-1 text-lg font-semibold text-rose-300">5%</p>
      </GlassCard>
    </div>
  ),
}

// --- Modal Container ---

export const ModalContainer: Story = {
  name: 'Modal Container',
  render: () => (
    <GlassCard variant="elevated" padding="spacious" className="w-full max-w-lg shadow-2xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-blue-300">Settings</p>
          <h2 className="text-lg font-semibold text-white">General Settings</h2>
        </div>
        <GlassButton variant="icon" aria-label="Close">✕</GlassButton>
      </div>
      <div className="space-y-4">
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-gray-200">Display Name</label>
          <input
            defaultValue="John Doe"
            className="w-full px-3 py-2 rounded-lg border border-white/10 focus:border-emerald-400 focus:outline-none bg-white/5 text-sm text-white placeholder:text-gray-500"
          />
        </div>
      </div>
      <GlassCardFooter className="pt-6">
        <GlassButton variant="secondary" className="flex-1">Cancel</GlassButton>
        <GlassButton variant="primary" className="flex-1">Save Changes</GlassButton>
      </GlassCardFooter>
    </GlassCard>
  ),
}

// --- Glass Panel ---

export const GlassPanel: Story = {
  name: 'Glass Panel',
  render: () => (
    <GlassCard variant="glass" padding="spacious" className="w-80">
      <h3 className="text-lg font-semibold text-white">Net Worth</h3>
      <p className="text-sm text-slate-400 mt-1">Your total financial snapshot</p>
      <p className="text-3xl font-bold font-mono tabular-nums text-emerald-400 mt-4">
        $1,234,567
      </p>
      <p className="mt-1 text-xs text-slate-500">+12.4% from last month</p>
    </GlassCard>
  ),
}
