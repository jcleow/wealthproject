"use client"

import { useEffect, useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { growthApi, settingsApi } from '@/api/financial'
import type { GrowthConfig, UserSettings, YearDisplayFormat } from '@/types/financial'
import { QUERY_KEYS } from '@/lib/queryKeys'

export type SettingsSection = 'general' | 'growth-rates'

export interface UseSettingsFormOptions {
  isOpen: boolean
  onClose: () => void
}

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
  handleYearDisplayFormatChange: (value: YearDisplayFormat) => void
  handleAutoExecuteToolsChange: (enabled: boolean) => void

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

  const [editedConfigs, setEditedConfigs] = useState<GrowthConfig[]>([])
  const [hasGrowthChanges, setHasGrowthChanges] = useState(false)

  const [editedSettings, setEditedSettings] = useState<UserSettings>({
    startingAge: 30,
    terminalAge: 65,
    yearDisplayFormat: 'year_number',
    timeResolution: 'yearly',
    autoExecuteTools: false
  })
  const [hasSettingsChanges, setHasSettingsChanges] = useState(false)

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

  const updateGrowthMutation = useMutation({
    mutationFn: (configs: GrowthConfig[]) => growthApi.updateGrowthConfigs(configs),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.financial.growth })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.financial.timeline })
      setHasGrowthChanges(false)
      onClose()
    },
  })

  const updateSettingsMutation = useMutation({
    mutationFn: (settings: UserSettings) => settingsApi.updateUserSettings(settings),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.settings.user })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.financial.timeline })
      setHasSettingsChanges(false)
      onClose()
    },
  })

  useEffect(() => {
    if (configs) {
      setEditedConfigs(configs)
      setHasGrowthChanges(false)
    }
  }, [configs])

  useEffect(() => {
    if (settings) {
      setEditedSettings(settings)
      setHasSettingsChanges(false)
    }
  }, [settings])

  const handleRateChange = useCallback((category: string, value: string) => {
    const numValue = parseFloat(value) || 0
    setEditedConfigs(prev =>
      prev.map(cfg =>
        cfg.category === category ? { ...cfg, annualRatePct: numValue } : cfg
      )
    )
    setHasGrowthChanges(true)
  }, [])

  const handleStartingAgeChange = useCallback((value: string) => {
    const numValue = value === '' ? 0 : parseInt(value, 10)
    if (!isNaN(numValue)) {
      setEditedSettings(prev => ({ ...prev, startingAge: numValue }))
      setHasSettingsChanges(true)
    }
  }, [])

  const handleTerminalAgeChange = useCallback((value: string) => {
    const numValue = value === '' ? 0 : parseInt(value, 10)
    if (!isNaN(numValue)) {
      setEditedSettings(prev => ({ ...prev, terminalAge: numValue }))
      setHasSettingsChanges(true)
    }
  }, [])

  const handleYearDisplayFormatChange = useCallback((value: YearDisplayFormat) => {
    setEditedSettings(prev => ({ ...prev, yearDisplayFormat: value }))
    setHasSettingsChanges(true)
  }, [])

  const handleAutoExecuteToolsChange = useCallback((enabled: boolean) => {
    setEditedSettings(prev => ({ ...prev, autoExecuteTools: enabled }))
    setHasSettingsChanges(true)
  }, [])

  const handleSave = useCallback(() => {
    if (activeSection === 'growth-rates' && hasGrowthChanges) {
      updateGrowthMutation.mutate(editedConfigs)
    } else if (activeSection === 'general' && hasSettingsChanges) {
      updateSettingsMutation.mutate(editedSettings)
    }
  }, [activeSection, hasGrowthChanges, hasSettingsChanges, editedConfigs, editedSettings, updateGrowthMutation, updateSettingsMutation])

  const handleReset = useCallback(() => {
    if (activeSection === 'growth-rates' && configs) {
      setEditedConfigs(configs)
      setHasGrowthChanges(false)
    } else if (activeSection === 'general' && settings) {
      setEditedSettings(settings)
      setHasSettingsChanges(false)
    }
  }, [activeSection, configs, settings])

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
    handleSave,
    handleReset,
    hasChanges,
    isLoading,
    isPending,
  }
}
