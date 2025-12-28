"use client"

import { useState, useCallback, useEffect } from 'react'
import { AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

import type {
  PropertyType,
  PropertyScenario,
  MortgageInputs,
  SaleInputs,
  FeeItem,
  AppreciationPeriod,
  LoanSegment,
  StaggeredDownpayment,
} from '@/app/property-planner/types'

import { defaultInputsByType, DEFAULT_SALE_FEES } from '@/app/property-planner/hooks/constants'

import {
  ScenarioList,
  ScenarioDetailView,
  type ResultsTab,
} from './components'

function getDefaultSaleInputs(loanStartMonth: string, propertyPrice: number): SaleInputs {
  const startDate = new Date(loanStartMonth + '-01')
  startDate.setFullYear(startDate.getFullYear() + 10)
  return {
    expectedSaleDate: startDate.toISOString().slice(0, 7),
    expectedSalePrice: Math.round(propertyPrice * 1.3),
    fees: DEFAULT_SALE_FEES.map(f => ({ ...f })),
  }
}

export function PropertyPlannerView({ onClose }: { onClose?: () => void }) {
  const [scenarios, setScenarios] = useState<PropertyScenario[]>([])
  const [editingScenarioId, setEditingScenarioId] = useState<string | null>(null)

  const [selectedType, setSelectedType] = useState<PropertyType | null>(null)
  const [inputs, setInputs] = useState<MortgageInputs>(defaultInputsByType['hdb-resale'])
  const [saleInputs, setSaleInputs] = useState<SaleInputs>(() =>
    getDefaultSaleInputs(defaultInputsByType['hdb-resale'].loanStartMonth, defaultInputsByType['hdb-resale'].propertyPrice)
  )
  const [activeResultsTab, setActiveResultsTab] = useState<ResultsTab>('purchase')
  const [editingScenarioName, setEditingScenarioName] = useState('')
  const [editingScenarioIcon, setEditingScenarioIcon] = useState('home')
  const [editingScenarioIconColor, setEditingScenarioIconColor] = useState('#6366f1')
  const [editingScenarioIconSearch, setEditingScenarioIconSearch] = useState('')

  const editingScenario = editingScenarioId ? scenarios.find(s => s.id === editingScenarioId) : null

  const handleEditScenario = useCallback((scenario: PropertyScenario) => {
    setEditingScenarioId(scenario.id)
    setEditingScenarioName(scenario.name)
    setSelectedType(scenario.propertyType)
    setInputs(scenario.inputs)
    setSaleInputs(scenario.saleInputs)
    setEditingScenarioIcon(scenario.icon || 'home')
    setEditingScenarioIconColor(scenario.iconColor || '#6366f1')
    setEditingScenarioIconSearch('')
  }, [])

  const handleSaveAndClose = useCallback(() => {
    if (editingScenarioId) {
      setScenarios(prev => prev.map(s =>
        s.id === editingScenarioId ? { ...s, name: editingScenarioName, inputs, saleInputs, propertyType: selectedType!, icon: editingScenarioIcon, iconColor: editingScenarioIconColor } : s
      ))
    }
    setEditingScenarioId(null)
    setEditingScenarioName('')
    setSelectedType(null)
  }, [editingScenarioId, editingScenarioName, inputs, saleInputs, selectedType, editingScenarioIcon, editingScenarioIconColor])

  const handleDeleteScenario = useCallback((id: string) => {
    setScenarios(prev => prev.filter(s => s.id !== id))
  }, [])

  const handleToggleInclude = useCallback((id: string) => {
    setScenarios(prev => prev.map(s => s.id === id ? { ...s, isIncluded: !s.isIncluded } : s))
  }, [])

  const handleAddScenario = useCallback((scenario: PropertyScenario) => {
    setScenarios(prev => [...prev, scenario])
  }, [])

  useEffect(() => {
    if (editingScenarioId && selectedType) {
      setScenarios(prev => prev.map(s =>
        s.id === editingScenarioId ? { ...s, name: editingScenarioName, inputs, saleInputs, propertyType: selectedType, icon: editingScenarioIcon, iconColor: editingScenarioIconColor } : s
      ))
    }
  }, [editingScenarioId, editingScenarioName, inputs, saleInputs, selectedType, editingScenarioIcon, editingScenarioIconColor])

  const handleInputChange = useCallback((field: keyof MortgageInputs, value: number | string | string[] | FeeItem[] | AppreciationPeriod[] | LoanSegment[] | StaggeredDownpayment | null) => {
    setInputs(prev => ({ ...prev, [field]: value }))
  }, [])

  const handleSaleInputChange = useCallback((field: keyof SaleInputs, value: string | number | boolean | FeeItem[]) => {
    setSaleInputs(prev => ({ ...prev, [field]: value }))
  }, [])

  const isEmbedded = !!onClose

  return (
    <div className={cn("flex flex-col", isEmbedded ? "h-full" : "min-h-screen bg-gray-950")}>
      {!isEmbedded && (
        <>
          <div className="fixed inset-0 bg-gradient-to-br from-gray-950 via-gray-950 to-gray-900" />
          <div className="fixed inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(59,130,246,0.08),transparent)]" />
        </>
      )}

      <div className={cn("relative", isEmbedded ? "flex-1" : "z-10")}>
        <AnimatePresence mode="wait">
          {!selectedType ? (
            <ScenarioList
              key="scenario-list"
              scenarios={scenarios}
              onEditScenario={handleEditScenario}
              onDeleteScenario={handleDeleteScenario}
              onToggleInclude={handleToggleInclude}
              onAddScenario={handleAddScenario}
              isEmbedded={isEmbedded}
            />
          ) : (
            <ScenarioDetailView
              key="scenario-detail"
              selectedType={selectedType}
              inputs={inputs}
              saleInputs={saleInputs}
              activeResultsTab={activeResultsTab}
              editingScenario={editingScenario ?? null}
              editingScenarioName={editingScenarioName}
              editingScenarioIcon={editingScenarioIcon}
              editingScenarioIconColor={editingScenarioIconColor}
              editingScenarioIconSearch={editingScenarioIconSearch}
              isEmbedded={isEmbedded}
              onInputChange={handleInputChange}
              onSaleInputChange={handleSaleInputChange}
              onActiveResultsTabChange={setActiveResultsTab}
              onSelectedTypeChange={setSelectedType}
              onEditingScenarioNameChange={setEditingScenarioName}
              onEditingScenarioIconChange={setEditingScenarioIcon}
              onEditingScenarioIconColorChange={setEditingScenarioIconColor}
              onEditingScenarioIconSearchChange={setEditingScenarioIconSearch}
              onSaveAndClose={handleSaveAndClose}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
