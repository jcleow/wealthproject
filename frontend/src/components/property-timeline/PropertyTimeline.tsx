"use client"

import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import { cn } from '@/lib/utils'

// Milestone type
export interface Milestone {
  id: string
  label: string
  sublabel?: string
  position: number // 0-100 percentage position on timeline
  color?: string
  details?: string[]
}

// Milestone with calculated tier for staggering
interface MilestoneWithTier extends Milestone {
  tier: number // 0 = closest to line, 1 = higher, 2 = highest, etc.
}

// Timeline props
interface PropertyTimelineProps {
  milestones: Milestone[]
  onMilestoneMove?: (id: string, newPosition: number) => void
  startLabel?: string
  endLabel?: string
  leftInfo?: React.ReactNode
  className?: string
}

// Format position to time label
function positionToTimeLabel(position: number, totalYears: number = 35): string {
  const totalWeeks = totalYears * 52
  const weeks = Math.round((position / 100) * totalWeeks)

  if (weeks === 0) return 'Start'
  if (weeks < 12) return `Week ${weeks}`

  const months = Math.round(weeks / 4.33)
  if (months < 24) return `Month ${months}`

  const years = Math.round(months / 12)
  return `Year ${years}`
}

// Calculate tiers for milestones to avoid label collisions
// Milestones within minGap% of each other get staggered to different tiers
function calculateMilestoneTiers(milestones: Milestone[], minGap: number = 8): MilestoneWithTier[] {
  const sorted = [...milestones].sort((a, b) => a.position - b.position)
  const result: MilestoneWithTier[] = []

  for (let i = 0; i < sorted.length; i++) {
    const current = sorted[i]
    let tier = 0

    // Check all previous milestones to find a non-conflicting tier
    for (let j = i - 1; j >= 0; j--) {
      const previous = result[j]
      const gap = current.position - previous.position

      // If too close, need to check if we're on the same tier
      if (gap < minGap) {
        if (previous.tier === tier) {
          tier++ // Move to next tier
        }
      } else {
        // Far enough apart, no more conflicts possible
        break
      }
    }

    result.push({ ...current, tier })
  }

  return result
}

export function PropertyTimeline({
  milestones: initialMilestones,
  onMilestoneMove,
  startLabel = 'Start',
  endLabel = 'Year 35',
  leftInfo,
  className,
}: PropertyTimelineProps) {
  const [milestones, setMilestones] = useState(initialMilestones)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const timelineRef = useRef<HTMLDivElement>(null)

  // Update milestones when props change
  useEffect(() => {
    setMilestones(initialMilestones)
  }, [initialMilestones])

  // Handle drag start
  const handleMouseDown = useCallback((id: string, e: React.MouseEvent) => {
    e.preventDefault()
    setDraggingId(id)
  }, [])

  // Handle drag move
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!draggingId || !timelineRef.current) return

    const rect = timelineRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const newPosition = Math.max(0, Math.min(100, (x / rect.width) * 100))

    setMilestones(prev =>
      prev.map(m => m.id === draggingId ? { ...m, position: newPosition } : m)
    )
  }, [draggingId])

  // Handle drag end
  const handleMouseUp = useCallback(() => {
    if (draggingId) {
      const milestone = milestones.find(m => m.id === draggingId)
      if (milestone && onMilestoneMove) {
        onMilestoneMove(draggingId, milestone.position)
      }
      setDraggingId(null)
    }
  }, [draggingId, milestones, onMilestoneMove])

  // Global mouse event listeners
  useEffect(() => {
    if (draggingId) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = 'grabbing'
      document.body.style.userSelect = 'none'

      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
        document.body.style.cursor = ''
        document.body.style.userSelect = ''
      }
    }
  }, [draggingId, handleMouseMove, handleMouseUp])

  // Calculate tiers for staggered labels to avoid collisions
  const milestonesWithTiers = useMemo(
    () => calculateMilestoneTiers(milestones),
    [milestones]
  )

  // Get max tier for dynamic height calculation
  const maxTier = useMemo(
    () => Math.max(...milestonesWithTiers.map(m => m.tier), 0),
    [milestonesWithTiers]
  )

  // Base stem height + extra height per tier
  const baseStemHeight = 40
  const tierHeight = 50

  return (
    <div className={cn('py-6', className)}>
      <div className="flex gap-6">
        {/* Left info panel */}
        {leftInfo && (
          <div className="w-64 flex-shrink-0">
            {leftInfo}
          </div>
        )}

        {/* Timeline */}
        <div className="flex-1">
          {/* Timeline bar with milestones */}
          <div
            ref={timelineRef}
            className="relative h-1 bg-white rounded-full"
            style={{ marginTop: `${baseStemHeight + (maxTier + 1) * tierHeight}px` }}
          >
            {/* Milestone markers - entire column is draggable */}
            {milestonesWithTiers.map((milestone) => {
              const stemHeight = baseStemHeight + milestone.tier * tierHeight

              return (
                <div
                  key={milestone.id}
                  className={cn(
                    'absolute -translate-x-1/2',
                    'cursor-grab select-none',
                    draggingId === milestone.id && 'cursor-grabbing'
                  )}
                  style={{
                    left: `${milestone.position}%`,
                    bottom: '-6px',
                  }}
                  onMouseDown={(e) => handleMouseDown(milestone.id, e)}
                >
                  {/* Container for the entire draggable unit */}
                  <div className="flex flex-col items-center">
                    {/* Labels at top */}
                    <div
                      className={cn(
                        'text-center whitespace-nowrap pb-2',
                        'hover:opacity-80 transition-opacity',
                        draggingId === milestone.id && 'opacity-80'
                      )}
                    >
                      <div className={cn(
                        'text-sm font-medium',
                        milestone.color || 'text-white'
                      )}>
                        {milestone.label}
                      </div>
                      {milestone.sublabel && (
                        <div className="text-xs text-slate-400 mt-0.5">
                          {milestone.sublabel}
                        </div>
                      )}
                      {milestone.details && milestone.details.length > 0 && (
                        <div className="text-xs text-slate-500 mt-1">
                          {milestone.details.map((detail, i) => (
                            <div key={i}>{detail}</div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Vertical stem line - height varies by tier */}
                    <div
                      className={cn(
                        'w-px bg-slate-600',
                        draggingId === milestone.id && 'bg-slate-400'
                      )}
                      style={{ height: `${stemHeight}px` }}
                    />

                    {/* Dot marker at bottom */}
                    <div
                      className={cn(
                        'w-3 h-3 rounded-full bg-white border-2 border-black',
                        'hover:scale-125 transition-transform',
                        draggingId === milestone.id && 'scale-125 bg-blue-400'
                      )}
                    />
                  </div>
                </div>
              )
            })}

            {/* Arrow at end */}
            <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1">
              <div className="w-0 h-0 border-t-[6px] border-t-transparent border-b-[6px] border-b-transparent border-l-[10px] border-l-white" />
            </div>
          </div>

          {/* Time labels below */}
          <div className="relative h-8 mt-2">
            {/* Start label */}
            <div className="absolute left-0 text-xs text-slate-400">
              {startLabel}
            </div>

            {/* Milestone time labels */}
            {milestonesWithTiers.map((milestone) => (
              <div
                key={milestone.id}
                className="absolute transform -translate-x-1/2 text-xs text-slate-400"
                style={{ left: `${milestone.position}%` }}
              >
                {positionToTimeLabel(milestone.position)}
              </div>
            ))}

            {/* End label */}
            <div className="absolute right-0 text-xs text-slate-400">
              {endLabel}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Scenario info panel component
interface ScenarioInfoProps {
  title: string
  subtitle: string
  price: string
  highlights: Array<{ label: string; value: string; color?: string }>
  className?: string
}

export function ScenarioInfo({ title, subtitle, price, highlights, className }: ScenarioInfoProps) {
  return (
    <div className={cn('rounded-lg bg-pink-600 p-4', className)}>
      <div className="text-xs text-pink-200 uppercase tracking-wider">{subtitle}</div>
      <div className="text-xl font-bold text-white">{title}</div>
      <div className="text-lg font-semibold text-white mt-1">{price}</div>

      <div className="mt-4 space-y-2 text-sm">
        {highlights.map((item, i) => (
          <div key={i} className="flex items-start gap-2">
            <span className="text-pink-200">•</span>
            <span>
              <span className="text-pink-200">{item.label}: </span>
              <span className={item.color || 'text-white'}>{item.value}</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default PropertyTimeline
