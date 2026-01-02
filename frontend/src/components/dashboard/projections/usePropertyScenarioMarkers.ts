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
    // Debug logging
    console.log('[PropertyMarkers] Scenarios:', scenarios?.length ?? 0, 'DisplayData:', displayData.length, 'Resolution:', dataResolution)

    if (!scenarios || scenarios.length === 0 || displayData.length === 0) {
      return []
    }

    const markers: PropertyMarkerData[] = []

    for (const scenario of scenarios) {
      const sgDetails = scenario.propertySG
      if (!sgDetails) {
        console.log('[PropertyMarkers] Skipping scenario - no propertySG:', scenario.scenario.id)
        continue
      }

      // Get purchase date from rate periods (first period's startDate)
      const purchaseDate = scenario.ratePeriods?.[0]?.startDate?.slice(0, 7)
      if (!purchaseDate) {
        console.log('[PropertyMarkers] Skipping scenario - no purchaseDate:', scenario.scenario.id, 'ratePeriods:', scenario.ratePeriods)
        continue
      }

      console.log('[PropertyMarkers] Processing scenario:', sgDetails.name, 'purchaseDate:', purchaseDate)

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
      if (yearIndex === null || netWorth === null) {
        console.log('[PropertyMarkers] No matching point found for year:', purchaseYear, 'month:', purchaseMonth, 'displayData years:', displayData.slice(0, 5).map(p => p.calendarYear))
        continue
      }

      console.log('[PropertyMarkers] Found match at yearIndex:', yearIndex, 'netWorth:', netWorth)

      // Helper function to find yearIndex for a date
      const findYearIndexForDate = (dateStr: string): number | undefined => {
        const [yStr, mStr] = dateStr.split('-')
        const y = parseInt(yStr, 10)
        const m = parseInt(mStr, 10)

        if (dataResolution === 'monthly') {
          const matchingPoint = displayData.find(
            (point) => point.calendarYear === y && point.calendarMonth === m
          )
          return matchingPoint?.yearIndex
        } else {
          const matchingPoint = displayData.find((point) => point.calendarYear === y)
          return matchingPoint?.yearIndex
        }
      }

      // Build nested milestones (fees and sale - purchase is represented by the main marker)
      const nestedMilestones: PropertyMilestone[] = []

      // Sale milestone (if sale date is set)
      if (sgDetails.saleExpectedDate) {
        nestedMilestones.push({
          id: `${scenario.scenario.id}-sale`,
          type: 'sale',
          date: sgDetails.saleExpectedDate,
          label: 'Sale',
          icon: 'banknote',
          iconColor: '#10b981', // emerald
          yearIndex: findYearIndexForDate(sgDetails.saleExpectedDate),
        })
      }

      // Fee milestones
      if (scenario.fees && scenario.fees.length > 0) {
        for (const fee of scenario.fees) {
          // Determine the fee date:
          // - For purchase fees: use startDate if set, otherwise use purchaseDate
          // - For sale fees: use startDate if set, otherwise use saleExpectedDate
          // - For recurring fees: use startDate
          let feeDate: string | null = null

          if (fee.startDate) {
            feeDate = fee.startDate
          } else if (fee.feeContext === 'purchase' && purchaseDate) {
            feeDate = purchaseDate
          } else if (fee.feeContext === 'sale' && sgDetails.saleExpectedDate) {
            feeDate = sgDetails.saleExpectedDate
          }

          // Skip fees without a valid date
          if (!feeDate) {
            console.log('[PropertyMarkers] Skipping fee - no date:', fee.id, fee.feeType)
            continue
          }

          // Use description as label if available, otherwise capitalize fee type
          const label = fee.description ?? fee.feeType.charAt(0).toUpperCase() + fee.feeType.slice(1).replace(/_/g, ' ')

          nestedMilestones.push({
            id: fee.id,
            type: 'fee',
            date: feeDate,
            label,
            icon: fee.icon,
            iconColor: fee.iconColor,
            amount: fee.amount,
            yearIndex: findYearIndexForDate(feeDate),
          })
        }
      }

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

    console.log('[PropertyMarkers] Total markers created:', markers.length, markers)
    return markers
  }, [scenarios, displayData, dataResolution])
}
