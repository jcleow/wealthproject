'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { FinancialDataManagement } from './FinancialDataManagement'
import { TaxModePanel } from './TaxModePanel'
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
    <div className="min-h-0 min-w-0 shrink-0 space-y-4">
      {/* Main row: Financial cards + Tax panel */}
      <div className="flex gap-4">
        {/* Financial data cards - shrink when tax mode is on */}
        <div className={isTaxModeEnabled ? 'flex-1 min-w-0' : 'w-full'}>
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
          />
        </div>

        {/* Tax Mode Panel - appears on the right when enabled */}
        <AnimatePresence>
          {isTaxModeEnabled && (
            <motion.div
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 380 }}
              exit={{ opacity: 0, width: 0 }}
              transition={{ duration: 0.2 }}
              className="shrink-0 overflow-hidden"
            >
              <TaxModePanel />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
