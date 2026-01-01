import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import type { ZoomLevel } from '@/components/timeline/ZoomControls'
import type { TimeResolution } from '@/types/timeline'

/**
 * Timeline UI state - manages selection and navigation state.
 *
 * This store handles synchronous UI state while data fetching
 * remains with React Query in useTimeline hook.
 */
export interface TimelineState {
  // Selection state
  selectedYear: number | null
  selectedMonth: number | null

  // Navigation constraints (earliest allowed date)
  anchorYear: number | null
  anchorMonth: number | null

  // View settings
  resolution: TimeResolution
  zoomLevel: ZoomLevel

  // Actions
  setSelectedYear: (year: number) => void
  setSelectedMonth: (month: number | null) => void
  setAnchor: (year: number | null, month: number | null) => void
  setResolution: (resolution: TimeResolution) => void
  setZoomLevel: (level: ZoomLevel) => void

  /**
   * Jump to a specific date, respecting anchor constraints
   */
  jumpToDate: (year: number, month?: number) => void

  /**
   * Initialize selection from loaded data (called by useTimeline)
   */
  initializeSelection: (year: number, month: number | null) => void

  /**
   * Reset to initial state
   */
  reset: () => void
}

const initialState = {
  selectedYear: null,
  selectedMonth: null,
  anchorYear: null,
  anchorMonth: null,
  resolution: 'monthly' as TimeResolution,
  zoomLevel: 'yearly' as ZoomLevel,
}

export const useTimelineStore = create<TimelineState>()(
  devtools(
    (set, get) => ({
      ...initialState,

      setSelectedYear: (year) => {
        const { anchorYear, anchorMonth, selectedMonth } = get()

        // Clamp to anchor if trying to go before it
        if (anchorYear !== null && year < anchorYear) {
          set({ selectedYear: anchorYear, selectedMonth: anchorMonth ?? 1 })
          return
        }

        // If same year as anchor, ensure month is valid
        if (anchorYear !== null && year === anchorYear && anchorMonth !== null) {
          const effectiveMonth = selectedMonth ?? 1
          if (effectiveMonth < anchorMonth) {
            set({ selectedYear: year, selectedMonth: anchorMonth })
            return
          }
        }

        set({ selectedYear: year })
      },

      setSelectedMonth: (month) => {
        const { selectedYear, anchorYear, anchorMonth } = get()

        // Clamp to anchor if trying to go before it
        if (
          anchorYear !== null &&
          anchorMonth !== null &&
          selectedYear === anchorYear &&
          month !== null &&
          month < anchorMonth
        ) {
          set({ selectedMonth: anchorMonth })
          return
        }

        set({ selectedMonth: month })
      },

      setAnchor: (year, month) => {
        set({ anchorYear: year, anchorMonth: month })
      },

      setResolution: (resolution) => {
        set({ resolution })
      },

      setZoomLevel: (level) => {
        set({ zoomLevel: level })
      },

      jumpToDate: (year, month) => {
        const { anchorYear, anchorMonth } = get()
        let targetYear = year
        let targetMonth = month ?? null

        // Clamp to anchor
        if (anchorYear !== null) {
          if (targetYear < anchorYear) {
            targetYear = anchorYear
            targetMonth = anchorMonth
          } else if (targetYear === anchorYear && anchorMonth !== null) {
            if (targetMonth !== null && targetMonth < anchorMonth) {
              targetMonth = anchorMonth
            }
          }
        }

        set({ selectedYear: targetYear, selectedMonth: targetMonth })
      },

      initializeSelection: (year, month) => {
        const { selectedYear } = get()
        // Only initialize if not already set
        if (selectedYear === null) {
          set({ selectedYear: year, selectedMonth: month })
        }
      },

      reset: () => {
        set(initialState)
      },
    }),
    { name: 'timeline-store' }
  )
)

/**
 * Selector for selection state only (for components that just need current selection)
 */
export const useTimelineSelection = () =>
  useTimelineStore((state) => ({
    selectedYear: state.selectedYear,
    selectedMonth: state.selectedMonth,
    setSelectedYear: state.setSelectedYear,
    setSelectedMonth: state.setSelectedMonth,
  }))

/**
 * Selector for view settings only
 */
export const useTimelineViewSettings = () =>
  useTimelineStore((state) => ({
    resolution: state.resolution,
    zoomLevel: state.zoomLevel,
    setResolution: state.setResolution,
    setZoomLevel: state.setZoomLevel,
  }))

/**
 * Selector for anchor/constraint state
 */
export const useTimelineAnchor = () =>
  useTimelineStore((state) => ({
    anchorYear: state.anchorYear,
    anchorMonth: state.anchorMonth,
    setAnchor: state.setAnchor,
  }))
