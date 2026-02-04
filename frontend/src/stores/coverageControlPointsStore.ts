import { create } from 'zustand'
import { useShallow } from 'zustand/react/shallow'
import { devtools, persist } from 'zustand/middleware'
import { generateUUID } from '@/lib/utils'
import type { CoverageControlPoint, InterpolationMode } from '@/types/insurance'

// ============================================
// TYPES
// ============================================

interface CoverageControlPointsState {
  // Data
  controlPoints: CoverageControlPoint[]

  // Display settings
  interpolationMode: InterpolationMode
  showRecommendedBaseline: boolean

  // Actions
  addControlPoint: (
    point: Omit<CoverageControlPoint, 'id' | 'createdAt' | 'updatedAt'>
  ) => CoverageControlPoint
  updateControlPoint: (id: string, updates: Partial<CoverageControlPoint>) => void
  deleteControlPoint: (id: string) => void

  // Settings
  setInterpolationMode: (mode: InterpolationMode) => void
  setShowRecommendedBaseline: (show: boolean) => void

  // Bulk actions
  resetToRecommended: (personId: string) => void
  clearAllControlPoints: () => void
}

// ============================================
// STORE
// ============================================

const initialState = {
  controlPoints: [] as CoverageControlPoint[],
  interpolationMode: 'linear' as InterpolationMode,
  showRecommendedBaseline: true,
}

export const useCoverageControlPointsStore = create<CoverageControlPointsState>()(
  devtools(
    persist(
      (set) => ({
        ...initialState,

        // Add a new control point
        addControlPoint: (pointData) => {
          const now = new Date().toISOString()
          const newPoint: CoverageControlPoint = {
            ...pointData,
            id: generateUUID(),
            createdAt: now,
            updatedAt: now,
          }

          set((state) => ({
            controlPoints: [...state.controlPoints, newPoint].sort(
              (a, b) => a.age - b.age
            ),
          }))

          return newPoint
        },

        // Update an existing control point
        updateControlPoint: (id, updates) =>
          set((state) => ({
            controlPoints: state.controlPoints
              .map((point) =>
                point.id === id
                  ? { ...point, ...updates, updatedAt: new Date().toISOString() }
                  : point
              )
              .sort((a, b) => a.age - b.age),
          })),

        // Delete a control point
        deleteControlPoint: (id) =>
          set((state) => ({
            controlPoints: state.controlPoints.filter((point) => point.id !== id),
          })),

        // Settings
        setInterpolationMode: (mode) => set({ interpolationMode: mode }),

        setShowRecommendedBaseline: (show) => set({ showRecommendedBaseline: show }),

        // Reset control points for a specific person
        resetToRecommended: (personId) =>
          set((state) => ({
            controlPoints: state.controlPoints.filter(
              (point) => point.personId !== personId
            ),
          })),

        // Clear all control points
        clearAllControlPoints: () =>
          set({
            controlPoints: [],
          }),
      }),
      {
        name: 'coverage-control-points-storage',
        partialize: (state) => ({
          controlPoints: state.controlPoints,
          interpolationMode: state.interpolationMode,
          showRecommendedBaseline: state.showRecommendedBaseline,
        }),
      }
    ),
    { name: 'coverage-control-points-store' }
  )
)

// ============================================
// SELECTORS
// ============================================

/**
 * Get all control points
 */
export const useControlPoints = () =>
  useCoverageControlPointsStore((s) => s.controlPoints)

/**
 * Get control points for a specific person
 * Uses useShallow to prevent infinite loops from .filter() creating new array references
 */
export const useControlPointsForPerson = (personId: string | null) =>
  useCoverageControlPointsStore(
    useShallow((s) =>
      personId
        ? s.controlPoints.filter((p) => p.personId === personId)
        : []
    )
  )

/**
 * Get interpolation mode
 */
export const useInterpolationMode = () =>
  useCoverageControlPointsStore((s) => s.interpolationMode)

/**
 * Get baseline visibility setting
 */
export const useShowRecommendedBaseline = () =>
  useCoverageControlPointsStore((s) => s.showRecommendedBaseline)

/**
 * Get all actions
 */
export const useControlPointsActions = () =>
  useCoverageControlPointsStore(
    useShallow((s) => ({
      addControlPoint: s.addControlPoint,
      updateControlPoint: s.updateControlPoint,
      deleteControlPoint: s.deleteControlPoint,
      setInterpolationMode: s.setInterpolationMode,
      setShowRecommendedBaseline: s.setShowRecommendedBaseline,
      resetToRecommended: s.resetToRecommended,
      clearAllControlPoints: s.clearAllControlPoints,
    }))
  )

// ============================================
// HELPER: Find control point at exact age
// ============================================

export function findControlPointAtAge(
  controlPoints: CoverageControlPoint[],
  age: number
): CoverageControlPoint | undefined {
  return controlPoints.find((p) => p.age === age)
}

// ============================================
// HELPER: Find surrounding control points for interpolation
// ============================================

export function findSurroundingControlPoints(
  controlPoints: CoverageControlPoint[],
  age: number
): { before: CoverageControlPoint | null; after: CoverageControlPoint | null } {
  const sorted = [...controlPoints].sort((a, b) => a.age - b.age)

  let before: CoverageControlPoint | null = null
  let after: CoverageControlPoint | null = null

  for (const point of sorted) {
    if (point.age <= age) {
      before = point
    } else if (point.age > age && !after) {
      after = point
      break
    }
  }

  return { before, after }
}
