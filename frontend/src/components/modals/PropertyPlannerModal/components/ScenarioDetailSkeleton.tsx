"use client"

import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'

interface ScenarioDetailSkeletonProps {
  isEmbedded?: boolean
}

/**
 * Skeleton loader for ScenarioDetailView to prevent layout shift
 * when opening a property scenario modal in edit mode
 */
export function ScenarioDetailSkeleton({ isEmbedded = false }: ScenarioDetailSkeletonProps) {
  return (
    <div className={cn("mx-auto px-6 py-8", isEmbedded ? "max-w-6xl" : "max-w-7xl")}>
      {/* Header section */}
      <div className="mb-8">
        <div className="flex items-center gap-4">
          {/* Back button skeleton */}
          <Skeleton className="w-10 h-10 rounded-xl" />

          {/* Icon picker skeleton */}
          <Skeleton className="w-10 h-10 rounded-xl" />

          {/* Title and dropdown area */}
          <div className="flex-1 min-w-0 flex items-center justify-between gap-3">
            <Skeleton className="h-8 w-48 rounded-lg" />
            <Skeleton className="h-9 w-36 rounded-lg" />
          </div>
        </div>
      </div>

      {/* Tab navigation skeleton */}
      <div className="flex items-center mb-6">
        <div className="inline-flex items-center gap-1 p-1 bg-white/[0.03] border border-white/[0.06] rounded-lg">
          <Skeleton className="h-8 w-24 rounded-md" />
          <Skeleton className="h-8 w-20 rounded-md" />
          <Skeleton className="h-8 w-24 rounded-md" />
        </div>
      </div>

      {/* Content grid skeleton */}
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
        {/* Left panel - Form skeleton */}
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-xl p-6">
          {/* Section title */}
          <Skeleton className="h-5 w-32 mb-6" />

          {/* Form rows */}
          <div className="space-y-4">
            {/* Property price row */}
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-11 w-full rounded-xl" />
            </div>

            {/* Valuation price row */}
            <div className="space-y-2">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-11 w-full rounded-xl" />
            </div>

            {/* Two column row */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-11 w-full rounded-xl" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-11 w-full rounded-xl" />
              </div>
            </div>

            {/* More form rows */}
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-11 w-full rounded-xl" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-11 w-full rounded-xl" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-11 w-full rounded-xl" />
              </div>
            </div>
          </div>
        </div>

        {/* Right panel - Results skeleton */}
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-xl p-6">
          {/* Section title */}
          <Skeleton className="h-5 w-40 mb-6" />

          {/* Summary cards */}
          <div className="space-y-4">
            <div className="flex items-center justify-between py-3 border-b border-white/[0.06]">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-5 w-24" />
            </div>
            <div className="flex items-center justify-between py-3 border-b border-white/[0.06]">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-5 w-20" />
            </div>
            <div className="flex items-center justify-between py-3 border-b border-white/[0.06]">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-5 w-28" />
            </div>
            <div className="flex items-center justify-between py-3 border-b border-white/[0.06]">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-5 w-24" />
            </div>
            <div className="flex items-center justify-between py-3">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-5 w-20" />
            </div>
          </div>

          {/* Chart area skeleton */}
          <Skeleton className="mt-6 h-48 rounded-xl" />
        </div>
      </div>
    </div>
  )
}
