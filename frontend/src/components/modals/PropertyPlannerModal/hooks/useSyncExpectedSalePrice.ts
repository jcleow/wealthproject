"use client"

import { useEffect, useRef } from 'react'
import { usePropertyScenarioFormContext } from './usePropertyScenarioFormContext'
import type { AppreciationPeriod } from '@/app/property-planner/types'

/**
 * Calculate the projected property value at sale date based on appreciation periods.
 * This is a simplified version of calculateAppreciationCurve that returns only the final value.
 */
export function calculateProjectedSalePrice(
  propertyPrice: number,
  purchaseDate: string,
  saleDate: string,
  periods: AppreciationPeriod[]
): number {
  if (!propertyPrice || !purchaseDate || !saleDate || periods.length === 0) {
    return propertyPrice
  }

  const purchaseYear = new Date(purchaseDate + '-01').getFullYear()
  const saleYear = new Date(saleDate + '-01').getFullYear()
  const saleMonth = new Date(saleDate + '-01').getMonth()

  // Calculate total years (including partial year at end)
  const totalYears = Math.max(1, saleYear - purchaseYear + (saleMonth > 0 ? 1 : 0))

  let currentValue = propertyPrice

  for (let year = 1; year <= totalYears; year++) {
    // Find the active period for this year
    const activePeriod = periods.find((period) => {
      const startsBeforeOrAt = period.startYear <= year
      const endsAfterOrAt = period.endYear === null || period.endYear >= year
      return startsBeforeOrAt && endsAfterOrAt
    }) || periods[periods.length - 1] // Fallback to last period

    const rate = activePeriod?.rate || 0

    // Apply compound growth for this year
    currentValue = currentValue * (1 + rate / 100)
  }

  return Math.round(currentValue)
}

/**
 * Hook to automatically sync expectedSalePrice with the projected value from appreciation periods.
 *
 * When appreciation periods, property price, purchase date, or sale date changes,
 * this hook automatically updates the expectedSalePrice to match the projection.
 */
export function useSyncExpectedSalePrice(): void {
  const { watch, setValue, getValues } = usePropertyScenarioFormContext()

  // Watch the dependencies
  const inputs = watch('inputs')
  const saleInputs = watch('saleInputs')

  const propertyPrice = inputs.propertyPrice
  const appreciationPeriods = inputs.appreciationPeriods
  const loanStartMonth = inputs.loanStartMonth // purchase date
  const expectedSaleDate = saleInputs.expectedSaleDate

  // Use ref to track previous values to avoid unnecessary updates
  const prevValuesRef = useRef<{
    propertyPrice: number
    appreciationPeriodsHash: string
    loanStartMonth: string
    expectedSaleDate: string
  } | null>(null)

  useEffect(() => {
    // Create a hash of appreciation periods for comparison
    const appreciationPeriodsHash = JSON.stringify(
      appreciationPeriods.map(p => ({ start: p.startYear, end: p.endYear, rate: p.rate }))
    )

    const currentValues = {
      propertyPrice,
      appreciationPeriodsHash,
      loanStartMonth,
      expectedSaleDate,
    }

    // Check if any dependency has changed
    const prevValues = prevValuesRef.current
    const hasChanged = !prevValues ||
      prevValues.propertyPrice !== currentValues.propertyPrice ||
      prevValues.appreciationPeriodsHash !== currentValues.appreciationPeriodsHash ||
      prevValues.loanStartMonth !== currentValues.loanStartMonth ||
      prevValues.expectedSaleDate !== currentValues.expectedSaleDate

    if (hasChanged) {
      // Calculate projected sale price
      const projectedPrice = calculateProjectedSalePrice(
        propertyPrice,
        loanStartMonth,
        expectedSaleDate,
        appreciationPeriods
      )

      // Update expectedSalePrice if it differs
      // Note: shouldDirty is false because this is a derived/computed value.
      // The form becomes dirty when users change the underlying values
      // (appreciation periods, property price, sale date, etc.)
      const currentSaleInputs = getValues('saleInputs')
      if (currentSaleInputs.expectedSalePrice !== projectedPrice) {
        setValue(
          'saleInputs',
          { ...currentSaleInputs, expectedSalePrice: projectedPrice },
          { shouldDirty: false }
        )
      }

      // Update ref with current values
      prevValuesRef.current = currentValues
    }
  }, [propertyPrice, appreciationPeriods, loanStartMonth, expectedSaleDate, setValue, getValues])
}
