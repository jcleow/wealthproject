/**
 * Feature flags for gradual migration and feature rollouts
 */

/**
 * Enable Timeline V2 API for financial data cards
 * When true: Cards use /api/v2/financial/timeline/snapshot
 * When false: Cards use /api/v1/financial/timeline (current behavior)
 *
 * Note: Chart and edit operations (POST/PUT/DELETE) always use V1
 */
export const useTimelineV2 = process.env.NEXT_PUBLIC_USE_TIMELINE_V2 === 'true'

/**
 * Enable Chart.js for the Net Worth Projection chart
 * When true: Uses Chart.js with canvas-rendered markers (better zoom behavior)
 * When false: Uses Recharts (current behavior, default)
 *
 * Chart.js advantages:
 * - Scenario markers drawn directly on canvas (scale properly during zoom)
 * - Better performance for large datasets
 * - Native zoom/pan support
 */
export const useChartJS = process.env.NEXT_PUBLIC_USE_CHARTJS === 'true'
