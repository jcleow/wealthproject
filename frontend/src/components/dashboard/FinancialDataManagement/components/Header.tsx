import type { TimeResolution, TimelineYear } from '@/types/timeline'

interface HeaderProps {
  selectedYear: number
  onSelectYear?: (year: number) => void
  selectedMonth?: number
  onSelectMonth?: (month: number | null) => void
  anchorYear?: number | null
  anchorMonth?: number | null
  resolution?: TimeResolution
  timelineYears?: TimelineYear[]
  isTimelineLoading: boolean
  viewMode: 'annualized' | 'monthly'
  onViewModeChange: (mode: 'annualized' | 'monthly') => void
}

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

export function Header({
  selectedYear,
  onSelectYear,
  selectedMonth,
  onSelectMonth,
  anchorYear,
  anchorMonth,
  resolution,
  timelineYears,
  isTimelineLoading,
  viewMode,
  onViewModeChange,
}: HeaderProps) {
  const handleYearInput = (value: string) => {
    const yearIndex = Number.parseInt(value, 10)
    if (Number.isNaN(yearIndex)) return
    const clamped = Math.max(0, Math.min(30, yearIndex))

    // Convert index to absolute year
    const baseYear = anchorYear ?? new Date().getFullYear()
    const targetYear =
      timelineYears && timelineYears[clamped]
        ? timelineYears[clamped].year
        : baseYear + clamped

    onSelectYear?.(targetYear)

    // If navigating back to the anchor year, clamp the month selection to the anchor month.
    if (anchorYear && anchorMonth && targetYear === anchorYear) {
      if ((selectedMonth ?? 1) < anchorMonth) {
        onSelectMonth?.(anchorMonth)
      }
    }
  }

  // Calculate year index from selected year
  const baseYear = anchorYear ?? new Date().getFullYear()
  const effectiveYear = selectedYear >= 1900 ? selectedYear : baseYear + (selectedYear ?? 0)
  const yearIndex = effectiveYear - baseYear

  return (
    <div className="px-6 py-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-white">Financial Data</h3>
          <p className="text-sm text-gray-400">
            Manage your income, expenses, assets, and liabilities
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs text-gray-300">
          <YearSelector
            yearIndex={Math.max(0, Math.min(30, yearIndex))}
            onYearChange={handleYearInput}
            isDisabled={isTimelineLoading}
          />

          {resolution === 'monthly' && (
            <>
              <ViewModeSelector
                viewMode={viewMode}
                onViewModeChange={onViewModeChange}
                isDisabled={isTimelineLoading}
              />

              {viewMode === 'monthly' && (
                <MonthSelector
                  selectedMonth={selectedMonth}
                  effectiveYear={effectiveYear}
                  anchorYear={anchorYear}
                  anchorMonth={anchorMonth}
                  onSelectMonth={onSelectMonth}
                  isDisabled={isTimelineLoading}
                />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

interface YearSelectorProps {
  yearIndex: number
  onYearChange: (value: string) => void
  isDisabled: boolean
}

function YearSelector({ yearIndex, onYearChange, isDisabled }: YearSelectorProps) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-transparent px-2 py-1">
      <label className="hidden text-gray-400 sm:block" htmlFor="year-selector">
        Year
      </label>
      <select
        id="year-selector"
        className="w-24 rounded-md border border-white/10 bg-[#0f172a]/60 px-2 py-1 text-sm text-white focus:border-blue-400 focus:outline-none"
        value={yearIndex}
        disabled={isDisabled}
        onChange={(event) => onYearChange(event.target.value)}
      >
        {Array.from({ length: 31 }, (_, idx) => (
          <option key={idx} value={idx}>
            {idx}
          </option>
        ))}
      </select>
    </div>
  )
}

interface ViewModeSelectorProps {
  viewMode: 'annualized' | 'monthly'
  onViewModeChange: (mode: 'annualized' | 'monthly') => void
  isDisabled: boolean
}

function ViewModeSelector({ viewMode, onViewModeChange, isDisabled }: ViewModeSelectorProps) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-transparent px-2 py-1">
      <label className="hidden text-gray-400 sm:block" htmlFor="view-mode-selector">
        View
      </label>
      <select
        id="view-mode-selector"
        className="rounded-md border border-white/10 bg-[#0f172a]/60 px-2 py-1 text-sm text-white focus:border-blue-400 focus:outline-none"
        value={viewMode}
        disabled={isDisabled}
        onChange={(event) => {
          onViewModeChange(event.target.value as 'annualized' | 'monthly')
        }}
      >
        <option value="annualized">Annualized</option>
        <option value="monthly">Monthly</option>
      </select>
    </div>
  )
}

interface MonthSelectorProps {
  selectedMonth?: number
  effectiveYear: number
  anchorYear?: number | null
  anchorMonth?: number | null
  onSelectMonth?: (month: number | null) => void
  isDisabled: boolean
}

function MonthSelector({
  selectedMonth,
  effectiveYear,
  anchorYear,
  anchorMonth,
  onSelectMonth,
  isDisabled,
}: MonthSelectorProps) {
  const baseYear = anchorYear ?? new Date().getFullYear()
  const minMonthForYear = effectiveYear === baseYear ? anchorMonth ?? 1 : 1
  const safeMonth = Math.max(selectedMonth ?? minMonthForYear, minMonthForYear)
  const monthOptions = effectiveYear === baseYear
    ? Array.from({ length: 12 - (minMonthForYear - 1) }, (_, idx) => minMonthForYear + idx)
    : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]

  return (
    <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-transparent px-2 py-1">
      <label className="hidden text-gray-400 sm:block" htmlFor="month-selector">
        Month
      </label>
      <select
        id="month-selector"
        className="rounded-md border border-white/10 bg-[#0f172a]/60 px-2 py-1 text-sm text-white focus:border-blue-400 focus:outline-none"
        value={safeMonth}
        disabled={isDisabled}
        onChange={(event) => {
          const month = Number(event.target.value)
          const clamped = Math.max(month, minMonthForYear)
          onSelectMonth?.(clamped)
        }}
      >
        {monthOptions.map((monthNumber) => (
          <option
            key={monthNumber}
            value={monthNumber}
            disabled={effectiveYear === baseYear && monthNumber < minMonthForYear}
          >
            {MONTH_NAMES[monthNumber - 1]}
          </option>
        ))}
      </select>
    </div>
  )
}
