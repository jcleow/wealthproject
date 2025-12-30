import { apiClient } from '../client'
import type { UserSettings } from '@/types/financial'

export async function getUserSettings(): Promise<UserSettings> {
  const data = await apiClient.get<any>('/settings')
  return {
    id: data.id,
    startingAge: data.startingAge ?? 30,
    terminalAge: data.terminalAge ?? 65,
    yearDisplayFormat: data.yearDisplayFormat ?? 'year_number',
    timeResolution: data.timeResolution ?? 'yearly',
    compoundingFrequency: data.compoundingFrequency ?? 'monthly',
    autoExecuteTools: data.autoExecuteTools ?? false,
    groupItemsByCategory: data.groupItemsByCategory ?? true,
    chartPictureInPicture: data.chartPictureInPicture ?? false,
    dashboardLayout: data.dashboardLayout ?? 'stacked',
    updatedAt: data.updatedAt,
  }
}

export async function updateUserSettings(settings: UserSettings): Promise<UserSettings> {
  const data = await apiClient.put<any>('/settings', {
    startingAge: settings.startingAge,
    terminalAge: settings.terminalAge,
    yearDisplayFormat: settings.yearDisplayFormat,
    timeResolution: settings.timeResolution,
    compoundingFrequency: settings.compoundingFrequency,
    autoExecuteTools: settings.autoExecuteTools,
    groupItemsByCategory: settings.groupItemsByCategory,
    chartPictureInPicture: settings.chartPictureInPicture,
    dashboardLayout: settings.dashboardLayout,
  })
  return {
    id: data.id,
    startingAge: data.startingAge ?? 30,
    terminalAge: data.terminalAge ?? 65,
    yearDisplayFormat: data.yearDisplayFormat ?? 'year_number',
    timeResolution: data.timeResolution ?? 'yearly',
    compoundingFrequency: data.compoundingFrequency ?? 'monthly',
    autoExecuteTools: data.autoExecuteTools ?? false,
    groupItemsByCategory: data.groupItemsByCategory ?? true,
    chartPictureInPicture: data.chartPictureInPicture ?? false,
    dashboardLayout: data.dashboardLayout ?? 'stacked',
    updatedAt: data.updatedAt,
  }
}

export const settingsApi = {
  getUserSettings,
  updateUserSettings,
}
