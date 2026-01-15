'use client'

import { Home, Wallet, TrendingUp, Gift, ArrowDownToLine, Building2, AlertTriangle } from 'lucide-react'
import { formatCurrency } from '@/lib/format'

interface PerPersonUsage {
  id: string
  name: string
  cpfUsed: number
  accruedInterest: number
}

interface AggregateStats {
  activeCount: number
  draftCount: number
  totalCpfUsed: number
  totalAccruedInterest: number
  totalGrants: number
  mustRefundAtSale: number
  oaBalanceAvailable: number
  oaAfterHousing: number
  perPersonUsage: PerPersonUsage[]
}

interface CPFOverviewStatsProps {
  stats: AggregateStats
}

interface StatCardProps {
  icon: React.ReactNode
  label: string
  value: string | number
  subValue?: string
  breakdown?: { label: string; value: number }[]
  variant?: 'default' | 'success' | 'warning' | 'danger'
}

function StatCard({ icon, label, value, subValue, breakdown, variant = 'default' }: StatCardProps) {
  const variantStyles = {
    default: {
      iconBg: 'bg-slate-500/20',
      iconColor: 'text-slate-400',
      valueBg: '',
    },
    success: {
      iconBg: 'bg-emerald-500/20',
      iconColor: 'text-emerald-400',
      valueBg: '',
    },
    warning: {
      iconBg: 'bg-amber-500/20',
      iconColor: 'text-amber-400',
      valueBg: '',
    },
    danger: {
      iconBg: 'bg-rose-500/20',
      iconColor: 'text-rose-400',
      valueBg: 'text-rose-400',
    },
  }

  const styles = variantStyles[variant]

  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
      <div className="flex items-start justify-between">
        <div className={`inline-flex rounded-lg p-2 ${styles.iconBg}`}>
          <span className={styles.iconColor}>{icon}</span>
        </div>
      </div>
      <p className="mt-3 text-xs text-slate-500">{label}</p>
      <p className={`mt-1 text-xl font-semibold font-mono tabular-nums ${styles.valueBg || 'text-white'}`}>
        {typeof value === 'number' ? formatCurrency(value) : value}
      </p>
      {subValue && (
        <p className="mt-0.5 text-xs text-slate-500">{subValue}</p>
      )}
      {breakdown && breakdown.length > 0 && (
        <div className="mt-2 pt-2 border-t border-white/[0.04] space-y-0.5">
          {breakdown.map((item, i) => (
            <div key={i} className="flex items-center gap-1.5 text-[10px]">
              <span className="text-slate-600">▪</span>
              <span className="text-slate-500">{item.label}:</span>
              <span className="text-slate-400 font-mono tabular-nums">{formatCurrency(item.value)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function CPFOverviewStats({ stats }: CPFOverviewStatsProps) {
  const {
    activeCount,
    totalCpfUsed,
    totalAccruedInterest,
    totalGrants,
    mustRefundAtSale,
    oaBalanceAvailable,
    oaAfterHousing,
    perPersonUsage,
  } = stats

  // Build per-person breakdown for CPF used
  const cpfUsedBreakdown = perPersonUsage.map(p => ({
    label: p.name,
    value: p.cpfUsed,
  }))

  // Build per-person breakdown for accrued interest
  const interestBreakdown = perPersonUsage.map(p => ({
    label: p.name,
    value: p.accruedInterest,
  }))

  return (
    <div className="space-y-4">
      {/* Primary Stats Row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={<Home className="h-4 w-4" />}
          label="Properties"
          value={`${activeCount}`}
          subValue="Active"
          variant="default"
        />
        <StatCard
          icon={<Wallet className="h-4 w-4" />}
          label="Total CPF Used"
          value={totalCpfUsed}
          breakdown={cpfUsedBreakdown}
          variant="default"
        />
        <StatCard
          icon={<TrendingUp className="h-4 w-4" />}
          label="Accrued Interest"
          value={totalAccruedInterest}
          subValue="at 2.5% p.a."
          breakdown={interestBreakdown}
          variant="warning"
        />
        <StatCard
          icon={<Gift className="h-4 w-4" />}
          label="Total Grants"
          value={totalGrants}
          subValue="(not refunded at sale)"
          variant="success"
        />
      </div>

      {/* Secondary Stats Row */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          icon={<ArrowDownToLine className="h-4 w-4" />}
          label="Must Refund at Sale"
          value={mustRefundAtSale}
          subValue="principal + interest"
          variant="warning"
        />
        <StatCard
          icon={<Building2 className="h-4 w-4" />}
          label="OA Balance Available"
          value={oaBalanceAvailable}
          subValue="current balance"
          variant="default"
        />
        <StatCard
          icon={oaAfterHousing < 0 ? <AlertTriangle className="h-4 w-4" /> : <Wallet className="h-4 w-4" />}
          label="OA After Housing"
          value={oaAfterHousing}
          subValue={oaAfterHousing < 0 ? 'Warning: negative balance' : 'OA - CPF used'}
          variant={oaAfterHousing < 0 ? 'danger' : 'default'}
        />
      </div>
    </div>
  )
}
