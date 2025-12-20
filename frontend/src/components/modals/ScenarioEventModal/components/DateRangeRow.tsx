"use client"

import { MonthPicker } from '@/components/ui/MonthPicker'

interface DateRangeRowProps {
  startMonth: string
  endMonth?: string
  isOneTime: boolean
  disabled?: boolean
  onStartChange: (value: string) => void
  onEndChange: (value: string | undefined) => void
}

export function DateRangeRow({
  startMonth,
  endMonth,
  isOneTime,
  disabled,
  onStartChange,
  onEndChange,
}: DateRangeRowProps) {
  if (isOneTime) {
    // One-time items: just "AT [date]"
    return (
      <div className="flex flex-wrap items-center gap-2 pl-0.5">
        <span className="text-[11px] text-slate-500 uppercase tracking-wide">At</span>
        <MonthPicker
          value={startMonth}
          onChange={(value) => {
            onStartChange(value)
            onEndChange(value)
          }}
          placeholder="Select month"
          disabled={disabled}
        />
      </div>
    )
  }

  // Recurring items: "FROM [date] TO [date]"
  return (
    <div className="flex flex-wrap items-center gap-2 pl-0.5">
      <span className="text-[11px] text-slate-500 uppercase tracking-wide">From</span>
      <MonthPicker
        value={startMonth}
        onChange={onStartChange}
        placeholder="Select month"
        disabled={disabled}
      />
      <span className="text-[11px] text-slate-500 uppercase tracking-wide">to</span>
      <MonthPicker
        value={endMonth}
        onChange={(value) => onEndChange(value || undefined)}
        placeholder="Ongoing"
        disabled={disabled}
      />
      {!endMonth && (
        <span className="text-[10px] text-slate-600 bg-white/[0.04] px-2 py-0.5 rounded-full border border-white/[0.04]">
          indefinite
        </span>
      )}
    </div>
  )
}
