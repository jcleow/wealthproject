'use client'

import { Minimize2 } from 'lucide-react'

export type ZoomLevel = 'yearly' | 'monthly'

export interface ZoomControlsProps {
  /** Current zoom level */
  zoomLevel: ZoomLevel
  /** Callback when zoom level changes */
  onZoomChange: (level: ZoomLevel) => void
  /** Disable zoom in (at maximum zoom) */
  canZoomIn?: boolean
  /** Disable zoom out (at minimum zoom) */
  canZoomOut?: boolean
  /** Optional direct zoom in handler (for button zoom) */
  onZoomIn?: () => void
  /** Optional direct zoom out handler (for button zoom) */
  onZoomOut?: () => void
  /** Additional CSS classes */
  className?: string
}

export function ZoomControls({
  zoomLevel,
  onZoomChange,
  className = '',
}: ZoomControlsProps) {
  const handleReset = () => {
    onZoomChange('yearly')
  }

  // Show reset button when in monthly mode (zoomed in)
  const isZoomedOut = zoomLevel === 'monthly'

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Reset Zoom - only show when zoomed in */}
      {isZoomedOut && (
        <div className="flex flex-col gap-1 rounded-lg border border-white/[0.08] bg-[#0a0a0a]/80 p-1 backdrop-blur-sm">
          <button
            onClick={handleReset}
            className="rounded p-2 transition-colors hover:bg-white/5"
            title="Reset zoom"
            aria-label="Reset to yearly view"
          >
            <Minimize2 className="h-4 w-4 text-gray-300" />
          </button>
        </div>
      )}
    </div>
  )
}
