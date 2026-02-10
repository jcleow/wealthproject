import type { VehicleCategory, FuelType, VesPeriod } from '@/types/vehicle'
import { VES_BANDS } from './constants'

export function formatVehicleCategory(category: VehicleCategory): string {
  switch (category) {
    case 'car_cat_a': return 'Car (Cat A)'
    case 'car_cat_b': return 'Car (Cat B)'
    case 'motorcycle_cat_d': return 'Motorcycle (Cat D)'
  }
}

export function formatVehicleCategoryShort(category: VehicleCategory): string {
  switch (category) {
    case 'car_cat_a': return 'Cat A'
    case 'car_cat_b': return 'Cat B'
    case 'motorcycle_cat_d': return 'Cat D'
  }
}

export function formatFuelType(fuelType: FuelType): string {
  switch (fuelType) {
    case 'petrol': return 'Petrol'
    case 'diesel': return 'Diesel'
    case 'electric': return 'Electric'
    case 'hybrid_petrol': return 'Hybrid (Petrol)'
    case 'hybrid_diesel': return 'Hybrid (Diesel)'
  }
}

export function formatVesPeriod(period: VesPeriod): string {
  switch (period) {
    case '2024_2025': return '2024–2025'
    case '2026': return '2026'
    case '2027': return '2027'
  }
}

export function getVesBandLabel(co2: number | null, fuelType: FuelType, period: VesPeriod): string {
  if (co2 === null) return 'N/A'
  const isEv = fuelType === 'electric'
  const bands = VES_BANDS[period]

  const bandLabels: Record<string, string[]> = {
    '2024_2025': ['A1', 'A2', 'B', 'C1', 'C2'],
    '2026': ['A', 'B', 'C1', 'C2', 'C3'],
    '2027': ['A', 'B', 'C1', 'C2', 'C3'],
  }

  const labels = bandLabels[period]

  for (let i = 0; i < bands.length; i++) {
    const band = bands[i] as { maxCo2: number; amount: number; evOnly?: boolean }
    if (band.evOnly && !isEv) continue
    if (co2 <= band.maxCo2) {
      return `Band ${labels[i]}`
    }
  }
  return 'N/A'
}

export function isElectric(fuelType: FuelType): boolean {
  return fuelType === 'electric'
}

export function isCar(category: VehicleCategory): boolean {
  return category === 'car_cat_a' || category === 'car_cat_b'
}
