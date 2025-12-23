'use client'

/**
 * Skeleton loader displayed while Chart.js is being lazy-loaded
 * Matches the chart area dimensions and uses glassmorphic styling
 */
export function ChartLoadingSkeleton() {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <div className="relative h-full w-full animate-pulse">
        {/* Chart area skeleton */}
        <div className="absolute inset-0 rounded-lg bg-slate-800/30" />

        {/* Fake axis lines */}
        <div className="absolute bottom-12 left-12 right-4 h-px bg-slate-700/50" />
        <div className="absolute bottom-12 left-12 top-4 w-px bg-slate-700/50" />

        {/* Fake chart area fill */}
        <div
          className="absolute bottom-12 left-12 right-4 top-4 overflow-hidden"
          style={{
            background: `linear-gradient(180deg,
              rgba(79, 129, 255, 0.15) 0%,
              rgba(59, 130, 246, 0.02) 100%)`,
          }}
        >
          {/* Animated shimmer effect */}
          <div
            className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite]"
            style={{
              background:
                'linear-gradient(90deg, transparent, rgba(255,255,255,0.05), transparent)',
            }}
          />
        </div>

        {/* Fake Y-axis labels */}
        <div className="absolute bottom-12 left-2 top-4 flex flex-col justify-between py-4">
          {[...Array(5)].map((_, index) => (
            <div
              key={index}
              className="h-3 w-8 rounded bg-slate-700/30"
            />
          ))}
        </div>

        {/* Fake X-axis labels */}
        <div className="absolute bottom-2 left-12 right-4 flex justify-between px-4">
          {[...Array(6)].map((_, index) => (
            <div
              key={index}
              className="h-3 w-6 rounded bg-slate-700/30"
            />
          ))}
        </div>

        {/* Loading text */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="rounded-lg bg-slate-800/60 px-4 py-2 backdrop-blur-sm">
            <span className="text-sm text-slate-400">Loading chart...</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ChartLoadingSkeleton
