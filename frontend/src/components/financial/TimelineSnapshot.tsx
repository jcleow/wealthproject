import type { TimelineYear, TimelineMonth, TimelineItem, TimeResolution } from '@/types/timeline'

interface TimelineSnapshotProps {
  year: number
  month?: number
  timelineYear?: TimelineYear
  timelineMonth?: TimelineMonth
  resolution?: TimeResolution
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
  items.find((item) => (item as any).source_frequency ? (item as any).source_frequency !== 'annual' : item.sourceFrequency && item.sourceFrequency !== 'annual')

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

export function TimelineSnapshot({ year, month, timelineYear, timelineMonth, resolution = 'yearly', loading }: TimelineSnapshotProps) {
  if (loading) {
    return (
      <div className="mb-4 rounded-2xl bg-white/5 p-4">
        <div className="h-5 w-32 animate-pulse rounded bg-white/10" />
      </div>
    )
  }

  // Use monthly data if available and in monthly resolution
  const isMonthly = resolution === 'monthly' && !!timelineMonth
  const data = isMonthly ? timelineMonth : timelineYear

  if (!data) return null

  const assets = data.assets ?? []
  const liabilities = data.liabilities ?? []
  const incomes = data.income ?? []
  const expenses = data.expenses ?? []

  // Use monthly amounts when in monthly mode, otherwise use annual
  const getAmount = (item: TimelineItem) => {
    if (isMonthly) {
      return item.adjMonthlyAmt ?? item.amountMonthly ?? 0
    }
    return item.adjAnnualAmt ?? item.amountAnnual ?? 0
  }

  const totalAssets = assets.reduce((sum, item) => sum + getAmount(item), 0)
  const totalLiabilities = liabilities.reduce((sum, item) => sum + getAmount(item), 0)
  const totalIncome = incomes.reduce((sum, item) => sum + getAmount(item), 0)
  const totalExpenses = expenses.reduce((sum, item) => sum + getAmount(item), 0)

  const nonAnnualSource =
    findNonAnnualSource(assets) ||
    findNonAnnualSource(liabilities) ||
    findNonAnnualSource(incomes) ||
    findNonAnnualSource(expenses)

  // Header text based on resolution
  const headerText = isMonthly && month
    ? `${MONTH_NAMES[month - 1]} (Year ${year}) Snapshot`
    : `Year ${year} Snapshot`

  const descriptionText = isMonthly
    ? 'Monthly amounts with compound growth applied.'
    : 'Annualized amounts returned from the projection engine.'

  return (
    <div className="mb-4 space-y-3 rounded-2xl bg-white/5 p-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-xs uppercase tracking-wide text-gray-400">{headerText}</p>
          <p className="text-sm text-gray-300">
            {descriptionText}
          </p>
        </div>
        {data.hasOverrides && (
          <span className="rounded-full bg-blue-500/15 px-3 py-1 text-xs font-medium text-blue-100">
            Overrides applied
          </span>
        )}
      </div>

      {nonAnnualSource && !isMonthly && (
        <p className="text-xs text-blue-100">
          Annualized from {formatCurrency(nonAnnualSource.sourceAmount ?? 0)}{' '}
          {frequencyLabel[nonAnnualSource.sourceFrequency ?? 'annual'] ?? 'source'}
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <SnapshotCard
          label="Net Worth"
          value={data.netWorth}
          accent="text-blue-200"
          isMonthly={isMonthly}
        />
        <SnapshotCard
          label={isMonthly ? "Monthly Net Savings" : "Net Cash"}
          value={data.netCash}
          accent="text-emerald-200"
          isMonthly={isMonthly}
        />
        <SnapshotCard
          label="Assets"
          value={totalAssets}
          accent="text-blue-200"
          isMonthly={isMonthly}
        />
        <SnapshotCard
          label="Liabilities"
          value={totalLiabilities}
          accent="text-rose-200"
          isMonthly={isMonthly}
        />
        <SnapshotCard
          label="Income"
          value={totalIncome}
          accent="text-emerald-200"
          isMonthly={isMonthly}
        />
        <SnapshotCard
          label="Expenses"
          value={totalExpenses}
          accent="text-amber-200"
          isMonthly={isMonthly}
        />
      </div>
    </div>
  )
}

function SnapshotCard({
  label,
  value,
  accent,
  isMonthly = false,
}: {
  label: string
  value: number
  accent: string
  isMonthly?: boolean
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-3">
      <p className="text-xs text-gray-400">{label}</p>
      <p className={`mt-1 text-lg font-semibold ${accent}`}>
        {formatCurrency(value)}
        {isMonthly && <span className="text-sm font-normal text-gray-400">/mo</span>}
      </p>
    </div>
  )
}
