import { useMemo } from 'react'
import type { TimeResolution } from '@/types/timeline'
import type { ProjectionPoint } from './types'
import type { PropertyMarkerData, PropertyMilestone } from './chartjs/types'
import { usePropertyPlannerV2ScenariosQuery } from '@/hooks/queries'

/**
 * Hook that builds property scenario markers from the property planner API.
 * Positions markers on the chart at the purchase date for each scenario.
 */
export function usePropertyScenarioMarkers(
  displayData: ProjectionPoint[],
  dataResolution: TimeResolution
): PropertyMarkerData[] {
  const { data: scenarios } = usePropertyPlannerV2ScenariosQuery()

  return useMemo(() => {
    if (!scenarios || scenarios.length === 0 || displayData.length === 0) {
      return []
    }

    const markers: PropertyMarkerData[] = []

    for (const scenario of scenarios) {
      const sgDetails = scenario.sgDetails
      if (!sgDetails) continue

      // Get purchase date from rate periods (first period's startMonth)
      const purchaseDate = scenario.ratePeriods?.[0]?.startMonth
      if (!purchaseDate) continue

      // Parse purchase date (YYYY-MM format)
      const [yearStr, monthStr] = purchaseDate.split('-')
      const purchaseYear = parseInt(yearStr, 10)
      const purchaseMonth = parseInt(monthStr, 10)

      // Find the matching data point on the chart
      let yearIndex: number | null = null
      let netWorth: number | null = null

      if (dataResolution === 'monthly') {
        // For monthly resolution, find exact month match
        const matchingPoint = displayData.find(
          (point) => point.calendarYear === purchaseYear && point.calendarMonth === purchaseMonth
        )
        if (matchingPoint) {
          yearIndex = matchingPoint.yearIndex
          netWorth = matchingPoint.netWorth
        }
      } else {
        // For yearly resolution, find the year
        const matchingPoint = displayData.find((point) => point.calendarYear === purchaseYear)
        if (matchingPoint) {
          yearIndex = matchingPoint.yearIndex
          netWorth = matchingPoint.netWorth
        }
      }

      // Skip if we couldn't find a matching data point (outside chart range)
      if (yearIndex === null || netWorth === null) continue

      // Build nested milestones
      const nestedMilestones: PropertyMilestone[] = []

      // Purchase milestone
      nestedMilestones.push({
        id: `${scenario.scenario.id}-purchase`,
        type: 'purchase',
        date: purchaseDate,
        label: 'Purchase',
        icon: 'key',
        iconColor: sgDetails.iconColor || '#6366f1',
      })

      // Sale milestone (if sale date is set)
      if (sgDetails.saleExpectedDate) {
        nestedMilestones.push({
          id: `${scenario.scenario.id}-sale`,
          type: 'sale',
          date: sgDetails.saleExpectedDate,
          label: 'Sale',
          icon: 'banknote',
          iconColor: '#10b981', // emerald
        })
      }

      // Fee milestones (for fees with specific dates and icons - recurring fees could be added here)
      // For now, we don't have icons on fees, but structure is ready for expansion

      markers.push({
        yearIndex,
        netWorth,
        type: 'property',
        propertyScenarioId: scenario.scenario.id,
        name: sgDetails.name,
        icon: sgDetails.icon || 'home',
        iconColor: sgDetails.iconColor || '#6366f1',
        isIncluded: sgDetails.isIncluded,
        nestedMilestones,
      })
    }

    return markers
  }, [scenarios, displayData, dataResolution])
}
