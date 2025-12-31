import { apiClient } from '../client'
import { toGrowthConfig } from './transformers'
import type { GrowthConfig } from '@/types/financial'

/** Raw API response shape for growth config */
interface RawGrowthConfig {
  category: string
  annualRatePct?: number
  annual_rate_pct?: number
  lowerBoundPct?: number
  lower_bound_pct?: number
  upperBoundPct?: number
  upper_bound_pct?: number
  // Index signature for compatibility with toGrowthConfig's ApiRecord parameter
  [key: string]: unknown
}

/** API response wrapper for growth configs */
interface GrowthConfigsResponse {
  growth: RawGrowthConfig[]
  version: string
}

export async function getGrowthConfigs(): Promise<GrowthConfig[]> {
  const data = await apiClient.get<GrowthConfigsResponse>('/financial/growth')
  return data.growth.map(toGrowthConfig)
}

export async function updateGrowthConfigs(configs: GrowthConfig[]): Promise<GrowthConfig[]> {
  const body = {
    growth: configs.map((cfg) => ({
      category: cfg.category,
      annualRatePct: cfg.annualRatePct,
      lowerBoundPct: cfg.lowerBoundPct,
      upperBoundPct: cfg.upperBoundPct,
    })),
  }
  const data = await apiClient.put<GrowthConfigsResponse>('/financial/growth', body)
  return data.growth.map(toGrowthConfig)
}

export const growthApi = {
  getGrowthConfigs,
  updateGrowthConfigs,
}
