import type { TimelineYear, TimelineItem } from '@/types/timeline'

interface TimelineSnapshotProps {
  year: number
  timelineYear?: TimelineYear
  loading?: boolean
}

const frequencyLabel: Record<string, string> = {
  annual: 'annual',
  monthly: 'monthly',
  weekly: 'weekly',
  biweekly: 'bi-weekly',
  quarterly: 'quarterly',
  semiannual: 'semi-annual',
}

const formatCurrency = (value: number) =>
  `$${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`

const findNonAnnualSource = (items: TimelineItem[]) =>
  items.find((item) => item.source_frequency && item.source_frequency !== 'annual')

export function TimelineSnapshot({ year, timelineYear, loading }: TimelineSnapshotProps) {
  if (loading) {
    return (
      <div className="mb-4 rounded-2xl bg-white/5 p-4">
        <div className="h-5 w-32 animate-pulse rounded bg-white/10" />
      </div>
    )
  }

  if (!timelineYear) return null

  const totalAssets = timelineYear.assets.reduce((sum, item) => sum + item.amount_annual, 0)
  const totalLiabilities = timelineYear.liabilities.reduce(
    (sum, item) => sum + item.amount_annual,
    0
  )
  const totalIncome = timelineYear.income.reduce((sum, item) => sum + item.amount_annual, 0)
  const totalExpenses = timelineYear.expenses.reduce((sum, item) => sum + item.amount_annual, 0)
  const nonAnnualSource =
    findNonAnnualSource(timelineYear.assets) ||
    findNonAnnualSource(timelineYear.liabilities) ||
    findNonAnnualSource(timelineYear.income) ||
    findNonAnnualSource(timelineYear.expenses)

  return (
    <div className="mb-4 space-y-3 rounded-2xl bg-white/5 p-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-xs uppercase tracking-wide text-gray-400">Year {year} Snapshot</p>
          <p className="text-sm text-gray-300">
            Annualized amounts returned from the projection engine.
          </p>
        </div>
        {timelineYear.has_overrides && (
          <span className="rounded-full bg-blue-500/15 px-3 py-1 text-xs font-medium text-blue-100">
            Overrides applied
          </span>
        )}
      </div>

      {nonAnnualSource && (
        <p className="text-xs text-blue-100">
          Annualized from {formatCurrency(nonAnnualSource.source_amount ?? 0)}{' '}
          {frequencyLabel[nonAnnualSource.source_frequency ?? 'annual'] ?? 'source'}
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <SnapshotCard label="Net Worth" value={timelineYear.net_worth} accent="text-blue-200" />
        <SnapshotCard label="Net Cash" value={timelineYear.net_cash} accent="text-emerald-200" />
        <SnapshotCard label="Assets" value={totalAssets} accent="text-blue-200" />
        <SnapshotCard label="Liabilities" value={totalLiabilities} accent="text-rose-200" />
        <SnapshotCard label="Income" value={totalIncome} accent="text-emerald-200" />
        <SnapshotCard label="Expenses" value={totalExpenses} accent="text-amber-200" />
      </div>
    </div>
  )
}

function SnapshotCard({
  label,
  value,
  accent,
}: {
  label: string
  value: number
  accent: string
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-3">
      <p className="text-xs text-gray-400">{label}</p>
      <p className={`mt-1 text-lg font-semibold ${accent}`}>{formatCurrency(value)}</p>
    </div>
  )
}
