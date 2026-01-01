'use client'

import { FinancialDataManagement } from './FinancialDataManagement'
import { useTaxModeOptional } from '@/contexts/TaxModeContext'
import { useTimeline } from '@/hooks/useTimeline'

interface FinancialDataSectionProps {
  /** When true, use compact layout for side-by-side view */
  compact?: boolean
}

/**
 * FinancialDataSection - Wrapper that provides timeline data to FinancialDataManagement.
 *
 * This component now fetches its own timeline data and reads selection state from the
 * Zustand store, eliminating the need for props to be drilled from Dashboard.
 */
export function FinancialDataSection({
  compact = false,
}: FinancialDataSectionProps) {
  const taxMode = useTaxModeOptional()
  const isTaxModeEnabled = taxMode?.isTaxModeEnabled ?? false

  // Get timeline data from hook (this reads selection from store internally)
  const timeline = useTimeline({ resolution: 'monthly' })

  return (
    <div className={compact ? 'min-w-0' : 'min-h-[400px] min-w-0 shrink-0'}>
      {/* FinancialDataManagement renders the header + conditionally the cashflow OR tax content */}
      <FinancialDataManagement
        timelineYear={timeline.selectedYearData}
        timelineMonth={timeline.selectedMonthData}
        timelineMonths={timeline.sliderMonths}
        timelineMonthV2={timeline.selectedMonthDataV2}
        timelineYears={timeline.sliderYears}
        isTimelineLoading={timeline.isLoading}
        onSaveTimelineEdits={timeline.saveEdits}
        showTaxMode={isTaxModeEnabled}
        compact={compact}
      />
    </div>
  )
}
