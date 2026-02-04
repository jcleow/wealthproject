"use client"

import { useEffect, useState, useCallback } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { growthApi, settingsApi } from '@/api/financial'
import type { GrowthConfig, UserSettings } from '@/types/financial'
import { QUERY_KEYS } from '@/lib/queryKeys'
import {
  generalSettingsSchema,
  growthRateSchema,
  defaultGeneralSettingsValues,
  type GeneralSettingsFormData,
} from '@/lib/validations/settings'
import { z } from 'zod'

export type SettingsSection = 'general' | 'growth-rates'

export interface UseSettingsFormOptions {
  isOpen: boolean
  onClose: () => void
}

// Schema for growth rates array form
const growthRatesFormSchema = z.object({
  rates: z.array(growthRateSchema),
})

type GrowthRatesFormData = z.infer<typeof growthRatesFormSchema>

export interface UseSettingsFormReturn {
  // Section
  activeSection: SettingsSection
  setActiveSection: (section: SettingsSection) => void

  // Growth configs
  editedConfigs: GrowthConfig[]
  hasGrowthChanges: boolean
  isLoadingConfigs: boolean
  handleRateChange: (category: string, value: string) => void

  // User settings
  editedSettings: UserSettings
  hasSettingsChanges: boolean
  isLoadingSettings: boolean
  handleStartingAgeChange: (value: string) => void
  handleTerminalAgeChange: (value: string) => void
  handleYearDisplayFormatChange: (value: UserSettings['yearDisplayFormat']) => void
  handleAutoExecuteToolsChange: (enabled: boolean) => void
  handleGroupItemsByCategoryChange: (enabled: boolean) => void
  handleChartPictureInPictureChange: (enabled: boolean) => void

  // Actions
  handleSave: () => void
  handleReset: () => void
  hasChanges: boolean
  isLoading: boolean
  isPending: boolean
}

export function useSettingsForm({ isOpen, onClose }: UseSettingsFormOptions): UseSettingsFormReturn {
  const queryClient = useQueryClient()
  const [activeSection, setActiveSection] = useState<SettingsSection>('general')

  // React Query - fetch data
  const { data: configs, isLoading: isLoadingConfigs } = useQuery({
    queryKey: QUERY_KEYS.financial.growth,
    queryFn: () => growthApi.getGrowthConfigs(),
    enabled: isOpen,
  })

  const { data: settings, isLoading: isLoadingSettings } = useQuery({
    queryKey: QUERY_KEYS.settings.user,
    queryFn: () => settingsApi.getUserSettings(),
    enabled: isOpen,
  })

  // General settings form (RHF)
  const generalForm = useForm<GeneralSettingsFormData>({
    resolver: zodResolver(generalSettingsSchema),
    defaultValues: defaultGeneralSettingsValues,
  })

  // Growth rates form (RHF with useFieldArray)
  const growthForm = useForm<GrowthRatesFormData>({
    resolver: zodResolver(growthRatesFormSchema),
    defaultValues: { rates: [] },
  })

  // useFieldArray gives us field identity tracking (though we don't use the fields array directly here)
  useFieldArray({
    control: growthForm.control,
    name: 'rates',
  })

  // Reset general settings form when settings data changes
  useEffect(() => {
    if (settings) {
      generalForm.reset({
        startingAge: settings.startingAge,
        terminalAge: settings.terminalAge,
        yearDisplayFormat: settings.yearDisplayFormat,
        autoExecuteTools: settings.autoExecuteTools,
        groupItemsByCategory: settings.groupItemsByCategory,
        chartPictureInPicture: settings.chartPictureInPicture,
      })
    }
  }, [settings, generalForm])

  // Reset growth rates form when configs data changes
  useEffect(() => {
    if (configs) {
      growthForm.reset({
        rates: configs.map(cfg => ({
          category: cfg.category,
          annualRatePct: cfg.annualRatePct,
        })),
      })
    }
  }, [configs, growthForm])

  // Mutations
  const updateGrowthMutation = useMutation({
    mutationFn: (updatedConfigs: GrowthConfig[]) => growthApi.updateGrowthConfigs(updatedConfigs),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.financial.growth })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.financial.timeline })
      growthForm.reset(growthForm.getValues()) // Mark as clean
      onClose()
    },
  })

  const updateSettingsMutation = useMutation({
    mutationFn: (updatedSettings: UserSettings) => settingsApi.updateUserSettings(updatedSettings),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.settings.user })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.financial.timeline })
      generalForm.reset(generalForm.getValues()) // Mark as clean
      onClose()
    },
  })

  // Build backward-compatible editedSettings from RHF form state
  const generalFormValues = generalForm.watch()
  const editedSettings: UserSettings = {
    startingAge: generalFormValues.startingAge,
    terminalAge: generalFormValues.terminalAge,
    yearDisplayFormat: generalFormValues.yearDisplayFormat,
    autoExecuteTools: generalFormValues.autoExecuteTools,
    groupItemsByCategory: generalFormValues.groupItemsByCategory,
    chartPictureInPicture: generalFormValues.chartPictureInPicture,
    // Keep existing values for fields not in the form
    timeResolution: settings?.timeResolution ?? 'yearly',
    compoundingFrequency: settings?.compoundingFrequency ?? 'monthly',
    dashboardLayout: settings?.dashboardLayout ?? 'stacked',
    onboardingCompleted: settings?.onboardingCompleted ?? false,
  }

  // Build backward-compatible editedConfigs from RHF form state
  const growthFormValues = growthForm.watch()
  const editedConfigs: GrowthConfig[] = growthFormValues.rates.map((rate, index) => ({
    category: rate.category,
    annualRatePct: rate.annualRatePct,
    // Preserve original config data if available
    id: configs?.[index]?.id,
    lowerBoundPct: configs?.[index]?.lowerBoundPct ?? 0,
    upperBoundPct: configs?.[index]?.upperBoundPct ?? 0,
  }))

  // Backward-compatible handlers that update RHF form state
  const handleStartingAgeChange = useCallback((value: string) => {
    const numValue = value === '' ? 0 : parseInt(value, 10)
    if (!isNaN(numValue)) {
      generalForm.setValue('startingAge', numValue, { shouldDirty: true })
    }
  }, [generalForm])

  const handleTerminalAgeChange = useCallback((value: string) => {
    const numValue = value === '' ? 0 : parseInt(value, 10)
    if (!isNaN(numValue)) {
      generalForm.setValue('terminalAge', numValue, { shouldDirty: true })
    }
  }, [generalForm])

  const handleYearDisplayFormatChange = useCallback((value: UserSettings['yearDisplayFormat']) => {
    generalForm.setValue('yearDisplayFormat', value, { shouldDirty: true })
  }, [generalForm])

  const handleAutoExecuteToolsChange = useCallback((enabled: boolean) => {
    generalForm.setValue('autoExecuteTools', enabled, { shouldDirty: true })
  }, [generalForm])

  const handleGroupItemsByCategoryChange = useCallback((enabled: boolean) => {
    generalForm.setValue('groupItemsByCategory', enabled, { shouldDirty: true })
  }, [generalForm])

  const handleChartPictureInPictureChange = useCallback((enabled: boolean) => {
    generalForm.setValue('chartPictureInPicture', enabled, { shouldDirty: true })
  }, [generalForm])

  const handleRateChange = useCallback((category: string, value: string) => {
    const numValue = parseFloat(value) || 0
    const rateIndex = growthFormValues.rates.findIndex(r => r.category === category)
    if (rateIndex !== -1) {
      growthForm.setValue(`rates.${rateIndex}.annualRatePct`, numValue, { shouldDirty: true })
    }
  }, [growthForm, growthFormValues.rates])

  const handleSave = useCallback(() => {
    if (activeSection === 'growth-rates' && growthForm.formState.isDirty) {
      // Map form data back to GrowthConfig format
      const updatedConfigs: GrowthConfig[] = growthFormValues.rates.map((rate, index) => ({
        category: rate.category,
        annualRatePct: rate.annualRatePct,
        id: configs?.[index]?.id,
        lowerBoundPct: configs?.[index]?.lowerBoundPct ?? 0,
        upperBoundPct: configs?.[index]?.upperBoundPct ?? 0,
      }))
      updateGrowthMutation.mutate(updatedConfigs)
    } else if (activeSection === 'general' && generalForm.formState.isDirty) {
      updateSettingsMutation.mutate(editedSettings)
    }
  }, [activeSection, growthForm.formState.isDirty, generalForm.formState.isDirty, growthFormValues.rates, configs, editedSettings, updateGrowthMutation, updateSettingsMutation])

  const handleReset = useCallback(() => {
    if (activeSection === 'growth-rates' && configs) {
      growthForm.reset({
        rates: configs.map(cfg => ({
          category: cfg.category,
          annualRatePct: cfg.annualRatePct,
        })),
      })
    } else if (activeSection === 'general' && settings) {
      generalForm.reset({
        startingAge: settings.startingAge,
        terminalAge: settings.terminalAge,
        yearDisplayFormat: settings.yearDisplayFormat,
        autoExecuteTools: settings.autoExecuteTools,
        groupItemsByCategory: settings.groupItemsByCategory,
        chartPictureInPicture: settings.chartPictureInPicture,
      })
    }
  }, [activeSection, configs, settings, growthForm, generalForm])

  // Use RHF isDirty instead of manual tracking
  const hasGrowthChanges = growthForm.formState.isDirty
  const hasSettingsChanges = generalForm.formState.isDirty
  const hasChanges = activeSection === 'growth-rates' ? hasGrowthChanges : hasSettingsChanges
  const isLoading = activeSection === 'growth-rates' ? isLoadingConfigs : isLoadingSettings
  const isPending = activeSection === 'growth-rates' ? updateGrowthMutation.isPending : updateSettingsMutation.isPending

  return {
    activeSection,
    setActiveSection,
    editedConfigs,
    hasGrowthChanges,
    isLoadingConfigs,
    handleRateChange,
    editedSettings,
    hasSettingsChanges,
    isLoadingSettings,
    handleStartingAgeChange,
    handleTerminalAgeChange,
    handleYearDisplayFormatChange,
    handleAutoExecuteToolsChange,
    handleGroupItemsByCategoryChange,
    handleChartPictureInPictureChange,
    handleSave,
    handleReset,
    hasChanges,
    isLoading,
    isPending,
  }
}
