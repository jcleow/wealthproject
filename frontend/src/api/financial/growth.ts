import { apiClient } from '../client'
import { toGrowthConfig } from './transformers'
import type { GrowthConfig } from '@/types/financial'

export async function getGrowthConfigs(): Promise<GrowthConfig[]> {
  const data = await apiClient.get<{ growth: any[]; version: string }>('/financial/growth')
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
  const data = await apiClient.put<{ growth: any[]; version: string }>('/financial/growth', body)
  return data.growth.map(toGrowthConfig)
}

export const growthApi = {
  getGrowthConfigs,
  updateGrowthConfigs,
}
