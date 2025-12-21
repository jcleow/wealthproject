import clsx from 'clsx'
import { Mouse, Hand } from 'lucide-react'

import { ZoomControls, type ZoomLevel } from '@/components/timeline/ZoomControls'

export interface ChartZoomControlsProps {
  scrollMode: 'page' | 'zoom'
  onScrollModeToggle: () => void
  zoomLevel: ZoomLevel
  onZoomLevelChange: (level: ZoomLevel) => void
  canZoomIn: boolean
  canZoomOut: boolean
  onZoomIn: () => void
  onZoomOut: () => void
}

/**
 * Floating zoom controls panel for the chart.
 * Includes scroll mode toggle and zoom in/out buttons.
 */
export function ChartZoomControls({
  scrollMode,
  onScrollModeToggle,
  zoomLevel,
  onZoomLevelChange,
  canZoomIn,
  canZoomOut,
  onZoomIn,
  onZoomOut,
}: ChartZoomControlsProps) {
  return (
    <div className="absolute right-4 top-1/2 z-10 flex -translate-y-1/2 flex-col gap-3">
      {/* Scroll mode toggle */}
      <button
        onClick={onScrollModeToggle}
        className={clsx(
          'flex flex-col items-center gap-1',
          'p-2',
          'border border-white/[0.08] rounded-lg',
          'bg-[#0a0a0a]/80 hover:bg-white/5',
          'backdrop-blur-sm',
          'transition-colors'
        )}
        title={
          scrollMode === 'page'
            ? 'Switch to scroll-to-zoom mode'
            : 'Switch to page scroll mode'
        }
        type="button"
      >
        {scrollMode === 'page' ? (
          <Mouse className="h-4 w-4 text-gray-400" />
        ) : (
          <Hand className="h-4 w-4 text-blue-400" />
        )}
        <span className="text-[9px] text-gray-400">
          {scrollMode === 'page' ? 'Scroll' : 'Zoom'}
        </span>
      </button>

      {/* Zoom controls */}
      <ZoomControls
        zoomLevel={zoomLevel}
        onZoomChange={onZoomLevelChange}
        canZoomIn={canZoomIn}
        canZoomOut={canZoomOut}
        onZoomIn={onZoomIn}
        onZoomOut={onZoomOut}
      />
    </div>
  )
}
