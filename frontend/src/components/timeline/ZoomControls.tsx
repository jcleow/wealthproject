'use client'

import { ZoomIn, ZoomOut, Minimize2 } from 'lucide-react'

export type ZoomLevel = 'yearly' | 'quarterly' | 'monthly'

export interface ZoomControlsProps {
  /** Current zoom level */
  zoomLevel: ZoomLevel
  /** Callback when zoom level changes */
  onZoomChange: (level: ZoomLevel) => void
  /** Disable zoom in (at maximum zoom) */
  canZoomIn?: boolean
  /** Disable zoom out (at minimum zoom) */
  canZoomOut?: boolean
  /** Additional CSS classes */
  className?: string
}

const ZOOM_LEVELS: ZoomLevel[] = ['yearly', 'quarterly', 'monthly']

export function ZoomControls({
  zoomLevel,
  onZoomChange,
  canZoomIn = true,
  canZoomOut = true,
  className = '',
}: ZoomControlsProps) {
  const currentIndex = ZOOM_LEVELS.indexOf(zoomLevel)

  const handleZoomIn = () => {
    if (currentIndex < ZOOM_LEVELS.length - 1) {
      onZoomChange(ZOOM_LEVELS[currentIndex + 1])
    }
  }

  const handleZoomOut = () => {
    if (currentIndex > 0) {
      onZoomChange(ZOOM_LEVELS[currentIndex - 1])
    }
  }

  const handleReset = () => {
    onZoomChange('yearly')
  }

  const isZoomedIn = currentIndex < ZOOM_LEVELS.length - 1
  const isZoomedOut = currentIndex > 0

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="flex items-center gap-1 rounded-lg border border-gray-700/30 bg-gray-900/40 p-1 backdrop-blur-sm">
        {/* Zoom Out */}
        <button
          onClick={handleZoomOut}
          disabled={!isZoomedOut || !canZoomOut}
          className="rounded p-1.5 transition-colors hover:bg-gray-800/60 disabled:cursor-not-allowed disabled:opacity-40"
          title="Zoom out"
          aria-label="Zoom out to larger time periods"
        >
          <ZoomOut className="h-4 w-4 text-gray-300" />
        </button>

        {/* Current Zoom Level */}
        <div className="min-w-[80px] px-3 text-center text-sm font-medium text-gray-200">
          {zoomLevel === 'yearly' && 'Yearly'}
          {zoomLevel === 'quarterly' && 'Quarterly'}
          {zoomLevel === 'monthly' && 'Monthly'}
        </div>

        {/* Zoom In */}
        <button
          onClick={handleZoomIn}
          disabled={!isZoomedIn || !canZoomIn}
          className="rounded p-1.5 transition-colors hover:bg-gray-800/60 disabled:cursor-not-allowed disabled:opacity-40"
          title="Zoom in"
          aria-label="Zoom in to smaller time periods"
        >
          <ZoomIn className="h-4 w-4 text-gray-300" />
        </button>

        {/* Reset Zoom */}
        {isZoomedOut && (
          <div className="ml-1 border-l border-gray-700/50 pl-1">
            <button
              onClick={handleReset}
              className="rounded p-1.5 transition-colors hover:bg-gray-800/60"
              title="Reset zoom"
              aria-label="Reset to yearly view"
            >
              <Minimize2 className="h-4 w-4 text-gray-300" />
            </button>
          </div>
        )}
      </div>

      {/* Info Text */}
      <div className="text-xs text-gray-400">
        {zoomLevel === 'yearly' && '35-40 years visible'}
        {zoomLevel === 'quarterly' && '~10 years visible'}
        {zoomLevel === 'monthly' && '~3 years visible'}
      </div>
    </div>
  )
}
