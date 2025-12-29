"use client"

import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
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

import type {
  PropertyScenarioFull,
  CreateScenarioInput,
  ComputedValues,
  PropertyType as ApiPropertyType,
  PropertySubtype as ApiPropertySubtype,
} from '@/types/propertyPlannerV2'

import { defaultInputsByType, DEFAULT_SALE_FEES } from '@/app/property-planner/hooks/constants'
import {
  usePropertyPlannerV2ScenariosQuery,
  useCreatePropertyPlannerV2ScenarioMutation,
  useUpdatePropertyPlannerV2ScenarioMutation,
  useDeletePropertyPlannerV2ScenarioMutation,
  useTogglePropertyPlannerV2ScenarioMutation,
} from '@/hooks/queries'

import {
  ScenarioList,
  ScenarioDetailView,
  type ResultsTab,
} from './components'

// =============================================================================
// TRANSFORMERS: Convert between frontend and API types
// =============================================================================

/**
 * Map frontend PropertyType to API PropertyType and PropertySubtype
 */
function mapPropertyTypeToApi(frontendType: PropertyType): { propertyType: ApiPropertyType; propertySubtype: ApiPropertySubtype } {
  switch (frontendType) {
    case 'hdb-resale':
      return { propertyType: 'hdb', propertySubtype: 'resale' }
    case 'hdb-bto':
      return { propertyType: 'hdb', propertySubtype: 'bto' }
    case 'ec':
      return { propertyType: 'private', propertySubtype: 'ec' }
    case 'private-resale':
      return { propertyType: 'private', propertySubtype: 'resale' }
    case 'private-new':
      return { propertyType: 'private', propertySubtype: 'new' }
    default:
      return { propertyType: 'hdb', propertySubtype: 'resale' }
  }
}

/**
 * Map API PropertyType and PropertySubtype to frontend PropertyType
 */
function mapPropertyTypeFromApi(propertyType: ApiPropertyType, propertySubtype: ApiPropertySubtype): PropertyType {
  if (propertyType === 'hdb') {
    return propertySubtype === 'bto' ? 'hdb-bto' : 'hdb-resale'
  }
  if (propertySubtype === 'ec') return 'ec'
  if (propertySubtype === 'new') return 'private-new'
  return 'private-resale'
}

/**
 * Convert API scenario to frontend PropertyScenario
 */
function apiToFrontendScenario(apiScenario: PropertyScenarioFull): PropertyScenario {
  const sgDetails = apiScenario.sgDetails
  if (!sgDetails) {
    // Fallback for non-SG scenarios (not yet supported)
    return {
      id: apiScenario.scenario.id,
      name: 'Unknown',
      propertyType: 'hdb-resale',
      inputs: defaultInputsByType['hdb-resale'],
      saleInputs: getDefaultSaleInputs(defaultInputsByType['hdb-resale'].loanStartMonth, defaultInputsByType['hdb-resale'].propertyPrice),
      isIncluded: true,
      createdAt: new Date(apiScenario.scenario.createdAt).getTime(),
    }
  }

  const propertyType = mapPropertyTypeFromApi(sgDetails.propertyType, sgDetails.propertySubtype)
  const ratePeriod = apiScenario.ratePeriods[0] // Initial loan period

  // Map growth periods to appreciation periods
  const appreciationPeriods: AppreciationPeriod[] = apiScenario.growthPeriods.map((gp) => ({
    id: gp.id,
    startYear: gp.startYear,
    endYear: gp.endYear ?? null,
    rate: parseFloat(gp.growthRate),
  }))

  // Map rate periods to loan segments
  const loanSegments: LoanSegment[] = apiScenario.ratePeriods.map((rp) => ({
    id: rp.id,
    startMonth: rp.startMonth,
    termYears: rp.termYears,
    fixedYears: rp.fixedYears,
    fixedRate: parseFloat(rp.fixedRate),
    floatingRate: parseFloat(rp.floatingRate),
  }))

  // Map fees
  const purchaseFees: FeeItem[] = apiScenario.fees
    .filter(f => f.feeContext === 'purchase')
    .map(f => ({
      id: f.id,
      name: f.feeType,
      type: f.isPercentage ? 'percentage' : 'fixed',
      value: parseFloat(f.amount),
      enabled: true,
    }))

  const saleFees: FeeItem[] = apiScenario.fees
    .filter(f => f.feeContext === 'sale')
    .map(f => ({
      id: f.id,
      name: f.feeType,
      type: f.isPercentage ? 'percentage' : 'fixed',
      value: parseFloat(f.amount),
      enabled: true,
    }))

  const inputs: MortgageInputs = {
    propertyPrice: parseFloat(sgDetails.propertyPrice),
    valuationPrice: parseFloat(sgDetails.valuationPrice || sgDetails.propertyPrice),
    loanAmount: parseFloat(apiScenario.computed?.loanAmount ?? '0'),
    loanType: sgDetails.loanType,
    downpaymentCpfOa: parseFloat(sgDetails.downpaymentCpfOa),
    downpaymentCash: parseFloat(sgDetails.downpaymentCash),
    loanTermYears: ratePeriod?.termYears ?? 25,
    loanStartMonth: ratePeriod?.startMonth ?? new Date().toISOString().slice(0, 7),
    fixedYears: ratePeriod?.fixedYears ?? 0,
    fixedRate: parseFloat(ratePeriod?.fixedRate ?? '2.6'),
    floatingRate: parseFloat(ratePeriod?.floatingRate ?? '3.5'),
    householdIncome: 0, // Will be derived from income IDs
    otherDebt: parseFloat(sgDetails.otherDebt),
    borrowerType: sgDetails.borrowerType,
    cpfOaBalance: 0, // Will be derived from CPF account ID
    monthlyCpfOa: 0,
    grants: parseFloat(sgDetails.grants),
    borrower1IncomeId: sgDetails.borrower1IncomeId || '',
    borrower1OaBalance: 0,
    borrower1LiabilityIds: [],
    borrower2IncomeId: sgDetails.borrower2IncomeId || null,
    borrower2OaBalance: 0,
    borrower2LiabilityIds: [],
    purchaseFees: purchaseFees.length > 0 ? purchaseFees : DEFAULT_SALE_FEES.map(f => ({ ...f })),
    absdRate: 0, // Derived from residency
    appreciationPeriods: appreciationPeriods.length > 0 ? appreciationPeriods : [{ id: 'default', startYear: 1, endYear: null, rate: 3 }],
    loanSegments,
    staggeredDownpayment: null,
  }

  const saleInputs: SaleInputs = {
    expectedSaleDate: sgDetails.saleExpectedDate || getDefaultSaleDate(ratePeriod?.startMonth || new Date().toISOString().slice(0, 7)),
    expectedSalePrice: parseFloat(sgDetails.saleExpectedPrice || String(parseFloat(sgDetails.propertyPrice) * 1.3)),
    fees: saleFees.length > 0 ? saleFees : DEFAULT_SALE_FEES.map(f => ({ ...f })),
  }

  return {
    id: apiScenario.scenario.id,
    name: sgDetails.name,
    propertyType,
    inputs,
    saleInputs,
    isIncluded: sgDetails.isIncluded,
    createdAt: new Date(apiScenario.scenario.createdAt).getTime(),
    icon: sgDetails.icon || undefined,
    iconColor: sgDetails.iconColor || undefined,
  }
}

/**
 * Check if a string is a valid UUID
 */
function isValidUUID(value: string | null | undefined): boolean {
  if (!value) return false
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  return uuidRegex.test(value)
}

/**
 * Convert frontend PropertyScenario to API CreateScenarioInput
 */
function frontendToApiCreateInput(scenario: PropertyScenario): CreateScenarioInput {
  const { propertyType: apiType, propertySubtype } = mapPropertyTypeToApi(scenario.propertyType)

  // Only pass income IDs if they are valid UUIDs (filter out placeholder values like 'income-1')
  // Use || undefined to ensure null values become undefined (API expects string | undefined)
  const borrower1IncomeId = isValidUUID(scenario.inputs.borrower1IncomeId)
    ? scenario.inputs.borrower1IncomeId
    : undefined
  const borrower2IncomeId = isValidUUID(scenario.inputs.borrower2IncomeId)
    ? (scenario.inputs.borrower2IncomeId || undefined)
    : undefined

  return {
    country: 'SG',
    sgDetails: {
      name: scenario.name,
      propertyType: apiType,
      propertySubtype: propertySubtype,
      icon: scenario.icon,
      iconColor: scenario.iconColor,
      isIncluded: scenario.isIncluded,
      propertyPrice: String(scenario.inputs.propertyPrice),
      valuationPrice: String(scenario.inputs.valuationPrice),
      loanType: scenario.inputs.loanType,
      downpaymentCpfOa: String(scenario.inputs.downpaymentCpfOa),
      downpaymentCash: String(scenario.inputs.downpaymentCash),
      borrowerType: scenario.inputs.borrowerType,
      borrower1IncomeId,
      borrower2IncomeId,
      otherDebt: String(scenario.inputs.otherDebt),
      propertyCount: 0,
      grants: String(scenario.inputs.grants),
      saleExpectedDate: scenario.saleInputs.expectedSaleDate,
      saleExpectedPrice: String(scenario.saleInputs.expectedSalePrice),
    },
    fees: [
      ...scenario.inputs.purchaseFees.filter(f => f.enabled).map(f => ({
        feeContext: 'purchase' as const,
        feeType: f.name,
        amount: String(f.value),
        isPercentage: f.type === 'percentage',
      })),
      ...scenario.saleInputs.fees.filter(f => f.enabled).map(f => ({
        feeContext: 'sale' as const,
        feeType: f.name,
        amount: String(f.value),
        isPercentage: f.type === 'percentage',
      })),
    ],
    growthPeriods: scenario.inputs.appreciationPeriods.map(ap => ({
      startYear: ap.startYear,
      endYear: ap.endYear ?? undefined,
      growthRate: String(ap.rate),
      growthStrategy: 'annual_step' as const,
    })),
    ratePeriods: scenario.inputs.loanSegments.length > 0
      ? scenario.inputs.loanSegments.map(ls => ({
          startMonth: ls.startMonth,
          termYears: ls.termYears,
          fixedYears: ls.fixedYears,
          fixedRate: String(ls.fixedRate),
          floatingRate: String(ls.floatingRate),
        }))
      : [{
          startMonth: scenario.inputs.loanStartMonth,
          termYears: scenario.inputs.loanTermYears,
          fixedYears: scenario.inputs.fixedYears,
          fixedRate: String(scenario.inputs.fixedRate),
          floatingRate: String(scenario.inputs.floatingRate),
        }],
  }
}

function getDefaultSaleInputs(loanStartMonth: string, propertyPrice: number): SaleInputs {
  return {
    expectedSaleDate: getDefaultSaleDate(loanStartMonth),
    expectedSalePrice: Math.round(propertyPrice * 1.3),
    fees: DEFAULT_SALE_FEES.map(f => ({ ...f })),
  }
}

function getDefaultSaleDate(loanStartMonth: string): string {
  const startDate = new Date(loanStartMonth + '-01')
  startDate.setFullYear(startDate.getFullYear() + 10)
  return startDate.toISOString().slice(0, 7)
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export interface FooterState {
  hasChanges: boolean
  isSaving: boolean
  onSave: () => void
  isEditing: boolean
}

interface PropertyPlannerViewProps {
  onClose?: () => void
  /** Optional scenario ID to directly open in edit mode */
  initialScenarioId?: string
  /** Callback to report footer state to parent */
  onFooterStateChange?: (state: FooterState | null) => void
}

export function PropertyPlannerView({ onClose, initialScenarioId, onFooterStateChange }: PropertyPlannerViewProps) {
  // API hooks
  const { data: apiScenarios, isLoading } = usePropertyPlannerV2ScenariosQuery()
  const createMutation = useCreatePropertyPlannerV2ScenarioMutation()
  const updateMutation = useUpdatePropertyPlannerV2ScenarioMutation()
  const deleteMutation = useDeletePropertyPlannerV2ScenarioMutation()
  const toggleMutation = useTogglePropertyPlannerV2ScenarioMutation()

  // Transform API scenarios to frontend format
  const scenarios = useMemo<PropertyScenario[]>(() => {
    if (!apiScenarios) return []
    return apiScenarios.map(apiToFrontendScenario)
  }, [apiScenarios])

  // Local state for editing
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
  const [hasChanges, setHasChanges] = useState(false)

  // Track initial values to detect changes
  const initialValuesRef = useRef<{
    name: string
    type: PropertyType | null
    inputs: MortgageInputs
    saleInputs: SaleInputs
    icon: string
    iconColor: string
  } | null>(null)

  const editingScenario = editingScenarioId ? scenarios.find(s => s.id === editingScenarioId) : null

  // Track if we've handled the initial scenario to avoid re-triggering
  const initialScenarioHandledRef = useRef(false)

  // Get computed values from the API scenario (not the transformed frontend scenario)
  const editingApiScenario = editingScenarioId ? apiScenarios?.find(s => s.scenario.id === editingScenarioId) : null
  const computedValues: ComputedValues | null = editingApiScenario?.computed ?? null

  // Detect changes by comparing current values to initial values
  useEffect(() => {
    if (!initialValuesRef.current) {
      setHasChanges(false)
      return
    }

    const initial = initialValuesRef.current
    const changed =
      initial.name !== editingScenarioName ||
      initial.type !== selectedType ||
      initial.icon !== editingScenarioIcon ||
      initial.iconColor !== editingScenarioIconColor ||
      JSON.stringify(initial.inputs) !== JSON.stringify(inputs) ||
      JSON.stringify(initial.saleInputs) !== JSON.stringify(saleInputs)

    setHasChanges(changed)
  }, [editingScenarioName, selectedType, editingScenarioIcon, editingScenarioIconColor, inputs, saleInputs])

  const handleEditScenario = useCallback((scenario: PropertyScenario) => {
    setEditingScenarioId(scenario.id)
    setEditingScenarioName(scenario.name)
    setSelectedType(scenario.propertyType)
    setInputs(scenario.inputs)
    setSaleInputs(scenario.saleInputs)
    setEditingScenarioIcon(scenario.icon || 'home')
    setEditingScenarioIconColor(scenario.iconColor || '#6366f1')
    setEditingScenarioIconSearch('')

    // Store initial values for dirty tracking
    initialValuesRef.current = {
      name: scenario.name,
      type: scenario.propertyType,
      inputs: scenario.inputs,
      saleInputs: scenario.saleInputs,
      icon: scenario.icon || 'home',
      iconColor: scenario.iconColor || '#6366f1',
    }
    setHasChanges(false)
  }, [])

  // Handle initial scenario ID - open edit mode when data is loaded
  useEffect(() => {
    if (
      initialScenarioId &&
      !initialScenarioHandledRef.current &&
      scenarios.length > 0 &&
      !isLoading
    ) {
      const scenarioToEdit = scenarios.find(s => s.id === initialScenarioId)
      if (scenarioToEdit) {
        handleEditScenario(scenarioToEdit)
        initialScenarioHandledRef.current = true
      }
    }
  }, [initialScenarioId, scenarios, isLoading, handleEditScenario])

  // Save without closing - updates initial values ref to reset dirty state
  const handleSave = useCallback(() => {
    if (editingScenarioId && selectedType) {
      const updatedScenario: PropertyScenario = {
        id: editingScenarioId,
        name: editingScenarioName,
        propertyType: selectedType,
        inputs,
        saleInputs,
        isIncluded: editingScenario?.isIncluded ?? true,
        createdAt: editingScenario?.createdAt ?? Date.now(),
        icon: editingScenarioIcon,
        iconColor: editingScenarioIconColor,
      }
      const apiInput = frontendToApiCreateInput(updatedScenario)
      updateMutation.mutate({ id: editingScenarioId, input: apiInput })

      // Update initial values ref to mark as saved
      initialValuesRef.current = {
        name: editingScenarioName,
        type: selectedType,
        inputs,
        saleInputs,
        icon: editingScenarioIcon,
        iconColor: editingScenarioIconColor,
      }
      setHasChanges(false)
    }
  }, [editingScenarioId, editingScenarioName, inputs, saleInputs, selectedType, editingScenarioIcon, editingScenarioIconColor, editingScenario, updateMutation])

  const handleSaveAndClose = useCallback(() => {
    if (editingScenarioId && selectedType) {
      const updatedScenario: PropertyScenario = {
        id: editingScenarioId,
        name: editingScenarioName,
        propertyType: selectedType,
        inputs,
        saleInputs,
        isIncluded: editingScenario?.isIncluded ?? true,
        createdAt: editingScenario?.createdAt ?? Date.now(),
        icon: editingScenarioIcon,
        iconColor: editingScenarioIconColor,
      }
      const apiInput = frontendToApiCreateInput(updatedScenario)
      updateMutation.mutate({ id: editingScenarioId, input: apiInput })
    }
    setEditingScenarioId(null)
    setEditingScenarioName('')
    setSelectedType(null)
    initialValuesRef.current = null
    setHasChanges(false)
  }, [editingScenarioId, editingScenarioName, inputs, saleInputs, selectedType, editingScenarioIcon, editingScenarioIconColor, editingScenario, updateMutation])

  const handleDeleteScenario = useCallback((id: string) => {
    deleteMutation.mutate(id)
  }, [deleteMutation])

  const handleToggleInclude = useCallback((id: string) => {
    const scenario = scenarios.find(s => s.id === id)
    if (scenario) {
      toggleMutation.mutate({ id, isIncluded: !scenario.isIncluded })
    }
  }, [scenarios, toggleMutation])

  const handleAddScenario = useCallback((scenario: PropertyScenario) => {
    const apiInput = frontendToApiCreateInput(scenario)
    createMutation.mutate(apiInput)
  }, [createMutation])

  const handleInputChange = useCallback((field: keyof MortgageInputs, value: number | string | string[] | FeeItem[] | AppreciationPeriod[] | LoanSegment[] | StaggeredDownpayment | null) => {
    setInputs(prev => ({ ...prev, [field]: value }))
  }, [])

  const handleSaleInputChange = useCallback((field: keyof SaleInputs, value: string | number | boolean | FeeItem[]) => {
    setSaleInputs(prev => ({ ...prev, [field]: value }))
  }, [])

  // Tab change with unsaved changes confirmation
  const handleTabChangeWithConfirmation = useCallback((newTab: ResultsTab) => {
    if (hasChanges) {
      const confirmed = window.confirm('You have unsaved changes. Are you sure you want to switch tabs? Changes will be lost.')
      if (!confirmed) return
    }
    setActiveResultsTab(newTab)
  }, [hasChanges])

  // Use ref to store handleSave to avoid infinite loop in useEffect
  const handleSaveRef = useRef(handleSave)
  handleSaveRef.current = handleSave

  // Report footer state to parent for modal footer rendering
  useEffect(() => {
    if (onFooterStateChange) {
      if (selectedType) {
        onFooterStateChange({
          hasChanges,
          isSaving: updateMutation.isPending,
          onSave: () => handleSaveRef.current(),
          isEditing: true,
        })
      } else {
        onFooterStateChange(null)
      }
    }
  }, [onFooterStateChange, selectedType, hasChanges, updateMutation.isPending])

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
              isLoading={isLoading}
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
              computedValues={computedValues}
              onInputChange={handleInputChange}
              onSaleInputChange={handleSaleInputChange}
              onActiveResultsTabChange={handleTabChangeWithConfirmation}
              onSelectedTypeChange={setSelectedType}
              onEditingScenarioNameChange={setEditingScenarioName}
              onEditingScenarioIconChange={setEditingScenarioIcon}
              onEditingScenarioIconColorChange={setEditingScenarioIconColor}
              onEditingScenarioIconSearchChange={setEditingScenarioIconSearch}
              onSaveAndClose={handleSaveAndClose}
              hasChanges={hasChanges}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
