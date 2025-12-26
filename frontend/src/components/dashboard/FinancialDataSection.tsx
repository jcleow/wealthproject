'use client'

import { FinancialDataManagement } from './FinancialDataManagement'
import { useTaxModeOptional } from '@/contexts/TaxModeContext'
import type { TimelineYear, TimelineMonth, TimeResolution, MonthDetailResponseV2, TimelineEditRequest } from '@/types/timeline'
import type { ZoomLevel } from '@/components/timeline/ZoomControls'

interface FinancialDataSectionProps {
  selectedYear: number
  onSelectYear: (year: number) => void
  selectedMonth: number
  onSelectMonth: (month: number | null) => void
  timelineYear?: TimelineYear
  timelineMonth?: TimelineMonth
  timelineMonths?: TimelineMonth[]
  timelineMonthV2?: MonthDetailResponseV2
  timelineYears?: TimelineYear[]
  anchorYear: number | null
  anchorMonth: number | null
  resolution: TimeResolution
  zoomLevel: ZoomLevel
  isTimelineLoading: boolean
  onSaveTimelineEdits: (payload: TimelineEditRequest) => Promise<void>
}

export function FinancialDataSection({
  selectedYear,
  onSelectYear,
  selectedMonth,
  onSelectMonth,
  timelineYear,
  timelineMonth,
  timelineMonths,
  timelineMonthV2,
  timelineYears,
  anchorYear,
  anchorMonth,
  resolution,
  zoomLevel,
  isTimelineLoading,
  onSaveTimelineEdits,
}: FinancialDataSectionProps) {
  const taxMode = useTaxModeOptional()
  const isTaxModeEnabled = taxMode?.isTaxModeEnabled ?? false

  return (
    <div className="min-h-[400px] min-w-0 shrink-0">
      {/* FinancialDataManagement renders the header + conditionally the cashflow OR tax content */}
      <FinancialDataManagement
        selectedYear={selectedYear}
        onSelectYear={onSelectYear}
        selectedMonth={selectedMonth}
        onSelectMonth={onSelectMonth}
        timelineYear={timelineYear}
        timelineMonth={timelineMonth}
        timelineMonths={timelineMonths}
        timelineMonthV2={timelineMonthV2}
        timelineYears={timelineYears}
        anchorYear={anchorYear}
        anchorMonth={anchorMonth}
        resolution={resolution}
        zoomLevel={zoomLevel}
        isTimelineLoading={isTimelineLoading}
        onSaveTimelineEdits={onSaveTimelineEdits}
        showTaxMode={isTaxModeEnabled}
      />
    </div>
  )
}
