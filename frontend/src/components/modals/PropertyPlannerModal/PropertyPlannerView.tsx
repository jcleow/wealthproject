"use client"

import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { usePropertyScenarioForm } from './hooks'
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
  GrantItem,
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
  ScenarioDetailSkeleton,
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
  const sgDetails = apiScenario.propertySG
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
    startMonth: rp.startDate.slice(0, 7), // Extract YYYY-MM from ISO date
    termYears: rp.termYears,
    rate: parseFloat(rp.rate),
    rateType: rp.rateType,
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
      icon: f.icon,
      iconColor: f.iconColor,
    }))

  const saleFees: FeeItem[] = apiScenario.fees
    .filter(f => f.feeContext === 'sale')
    .map(f => ({
      id: f.id,
      name: f.feeType,
      type: f.isPercentage ? 'percentage' : 'fixed',
      value: parseFloat(f.amount),
      enabled: true,
      icon: f.icon,
      iconColor: f.iconColor,
    }))

  // Map grants from the API grants array
  const grants: GrantItem[] = (apiScenario.grants || []).map(g => ({
    id: g.id,
    name: g.name,
    amount: parseFloat(g.amount),
  }))

  const inputs: MortgageInputs = {
    propertyPrice: parseFloat(sgDetails.propertyPrice),
    valuationPrice: parseFloat(sgDetails.valuationPrice || sgDetails.propertyPrice),
    loanAmount: parseFloat(apiScenario.computed?.loanAmount ?? '0'),
    loanType: sgDetails.loanType,
    downpaymentCpfOa: parseFloat(sgDetails.downpaymentCpfOa),
    downpaymentCash: parseFloat(sgDetails.downpaymentCash),
    loanTermYears: ratePeriod?.termYears ?? 25,
    loanStartMonth: ratePeriod?.startDate?.slice(0, 7) ?? new Date().toISOString().slice(0, 7),
    fixedYears: 0, // Deprecated - use loanSegments with rateType
    fixedRate: parseFloat(ratePeriod?.rate ?? '2.6'),
    floatingRate: parseFloat(ratePeriod?.rate ?? '2.6'), // Same as fixedRate for backwards compat
    householdIncome: 0, // Will be derived from income IDs
    otherDebt: parseFloat(sgDetails.otherDebt),
    borrowerType: sgDetails.borrowerType,
    cpfOaBalance: parseFloat(apiScenario.computed?.projectedBorrower1OA ?? '0') + parseFloat(apiScenario.computed?.projectedBorrower2OA ?? '0'),
    monthlyCpfOa: 0,
    grants,
    borrower1IncomeId: sgDetails.borrower1IncomeId || '',
    borrower1OaBalance: parseFloat(apiScenario.computed?.projectedBorrower1OA ?? '0'),
    borrower1LiabilityIds: [],
    borrower2IncomeId: sgDetails.borrower2IncomeId || null,
    borrower2OaBalance: parseFloat(apiScenario.computed?.projectedBorrower2OA ?? '0'),
    borrower2LiabilityIds: [],
    // Per-borrower CPF OA tracking
    borrower1DownpaymentCpfOa: parseFloat(sgDetails.borrower1DownpaymentCpfOa ?? '0'),
    borrower2DownpaymentCpfOa: parseFloat(sgDetails.borrower2DownpaymentCpfOa ?? '0'),
    borrower1MonthlyCpfOa: parseFloat(sgDetails.borrower1MonthlyCpfOa ?? '0'),
    borrower2MonthlyCpfOa: parseFloat(sgDetails.borrower2MonthlyCpfOa ?? '0'),
    // Lease tenure
    leaseRemainingYears: sgDetails.leaseRemainingYears ?? 99,
    purchaseFees: purchaseFees.length > 0 ? purchaseFees : DEFAULT_SALE_FEES.map(f => ({ ...f })),
    absdRate: 0, // Derived from residency
    appreciationPeriods: appreciationPeriods.length > 0 ? appreciationPeriods : [{ id: 'default', startYear: 1, endYear: null, rate: 3 }],
    loanSegments,
    staggeredDownpayment: null,
  }

  const saleInputs: SaleInputs = {
    expectedSaleDate: sgDetails.saleExpectedDate || getDefaultSaleDate(ratePeriod?.startDate?.slice(0, 7) || new Date().toISOString().slice(0, 7)),
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
    purchaseIcon: sgDetails.purchaseIcon || undefined,
    purchaseIconColor: sgDetails.purchaseIconColor || undefined,
    saleIcon: sgDetails.saleIcon || undefined,
    saleIconColor: sgDetails.saleIconColor || undefined,
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
    propertySG: {
      name: scenario.name,
      propertyType: apiType,
      propertySubtype: propertySubtype,
      purchaseIcon: scenario.purchaseIcon,
      purchaseIconColor: scenario.purchaseIconColor,
      saleIcon: scenario.saleIcon,
      saleIconColor: scenario.saleIconColor,
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
      saleExpectedDate: scenario.saleInputs.expectedSaleDate,
      saleExpectedPrice: String(scenario.saleInputs.expectedSalePrice),
    },
    // Transform grants array to API format
    grants: scenario.inputs.grants.map(g => ({
      name: g.name,
      amount: String(g.amount),
    })),
    fees: [
      ...scenario.inputs.purchaseFees.filter(f => f.enabled).map(f => ({
        feeContext: 'purchase' as const,
        feeType: f.name,
        amount: String(f.value),
        isPercentage: f.type === 'percentage',
        icon: f.icon,
        iconColor: f.iconColor,
      })),
      ...scenario.saleInputs.fees.filter(f => f.enabled).map(f => ({
        feeContext: 'sale' as const,
        feeType: f.name,
        amount: String(f.value),
        isPercentage: f.type === 'percentage',
        icon: f.icon,
        iconColor: f.iconColor,
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
          rate: String(ls.rate),
          rateType: ls.rateType,
        }))
      : [{
          startMonth: scenario.inputs.loanStartMonth,
          termYears: scenario.inputs.loanTermYears,
          rate: String(scenario.inputs.fixedRate),
          rateType: 'fixed' as const,
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

export interface HeaderState {
  name: string
  icon: string
  iconColor: string
  iconSearch: string
  propertyType: PropertyType
  loanStartMonth: string
  onBack: () => void
  onNameChange: (name: string) => void
  onIconChange: (icon: string) => void
  onIconColorChange: (color: string) => void
  onIconSearchChange: (search: string) => void
  onPropertyTypeChange: (type: PropertyType) => void
  onJumpToDate?: (year: number, month: number) => void
}

interface PropertyPlannerViewProps {
  onClose?: () => void
  /** Optional scenario ID to directly open in edit mode */
  initialScenarioId?: string
  /** Callback to report footer state to parent */
  onFooterStateChange?: (state: FooterState | null) => void
  /** Callback to report header state to parent for contextual header */
  onHeaderStateChange?: (state: HeaderState | null) => void
  /** Callback to jump to a specific date on the timeline */
  onJumpToDate?: (year: number, month: number) => void
}

export function PropertyPlannerView({ onClose, initialScenarioId, onFooterStateChange, onHeaderStateChange, onJumpToDate }: PropertyPlannerViewProps) {
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

  // Local state for editing (non-form state)
  const [editingScenarioId, setEditingScenarioId] = useState<string | null>(null)
  const [activeResultsTab, setActiveResultsTab] = useState<ResultsTab>('purchase')

  // Form state managed by React Hook Form
  const {
    form,
    isDirty,
    values: formValues,
    initializeWithScenario,
    resetToDefaults,
    markAsSaved,
    updateInput,
    updateSaleInput,
    updatePropertyType,
  } = usePropertyScenarioForm()

  // Derive form values for use in the component
  const selectedType = formValues.propertyType
  const inputs = formValues.inputs
  const saleInputs = formValues.saleInputs
  const editingScenarioName = formValues.name
  const editingScenarioPurchaseIcon = formValues.purchaseIcon
  const editingScenarioPurchaseIconColor = formValues.purchaseIconColor
  const editingScenarioPurchaseIconSearch = formValues.purchaseIconSearch
  const editingScenarioSaleIcon = formValues.saleIcon
  const editingScenarioSaleIconColor = formValues.saleIconColor
  const editingScenarioSaleIconSearch = formValues.saleIconSearch

  const editingScenario = editingScenarioId ? scenarios.find(s => s.id === editingScenarioId) : null

  // Track if we've handled the initial scenario to avoid re-triggering
  const initialScenarioHandledRef = useRef(false)

  // Get computed values from the API scenario (not the transformed frontend scenario)
  const editingApiScenario = editingScenarioId ? apiScenarios?.find(s => s.scenario.id === editingScenarioId) : null
  const computedValues: ComputedValues | null = editingApiScenario?.computed ?? null


  const handleEditScenario = useCallback((scenario: PropertyScenario) => {
    setEditingScenarioId(scenario.id)
    initializeWithScenario(scenario)
  }, [initializeWithScenario])

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

  // Save without closing - uses React Hook Form's reset to clear dirty state
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
        purchaseIcon: editingScenarioPurchaseIcon,
        purchaseIconColor: editingScenarioPurchaseIconColor,
        saleIcon: editingScenarioSaleIcon,
        saleIconColor: editingScenarioSaleIconColor,
      }
      const apiInput = frontendToApiCreateInput(updatedScenario)
      updateMutation.mutate({ id: editingScenarioId, input: apiInput })

      // Clear dirty state by updating form's baseline
      markAsSaved()
    }
  }, [editingScenarioId, editingScenarioName, inputs, saleInputs, selectedType, editingScenarioPurchaseIcon, editingScenarioPurchaseIconColor, editingScenarioSaleIcon, editingScenarioSaleIconColor, editingScenario, updateMutation, markAsSaved])

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
        purchaseIcon: editingScenarioPurchaseIcon,
        purchaseIconColor: editingScenarioPurchaseIconColor,
        saleIcon: editingScenarioSaleIcon,
        saleIconColor: editingScenarioSaleIconColor,
      }
      const apiInput = frontendToApiCreateInput(updatedScenario)
      updateMutation.mutate({ id: editingScenarioId, input: apiInput })
    }
    setEditingScenarioId(null)
    resetToDefaults()
  }, [editingScenarioId, editingScenarioName, inputs, saleInputs, selectedType, editingScenarioPurchaseIcon, editingScenarioPurchaseIconColor, editingScenarioSaleIcon, editingScenarioSaleIconColor, editingScenario, updateMutation, resetToDefaults])

  // Back button handler - shows confirmation if there are unsaved changes
  const handleBack = useCallback(() => {
    if (isDirty) {
      const confirmed = window.confirm('You have unsaved changes. Are you sure you want to go back? Changes will be lost.')
      if (!confirmed) return
    }
    setEditingScenarioId(null)
    resetToDefaults()
  }, [isDirty, resetToDefaults])

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

  const handleInputChange = useCallback((
    field: keyof MortgageInputs,
    value: number | string | string[] | FeeItem[] | AppreciationPeriod[] | LoanSegment[] | StaggeredDownpayment | GrantItem[] | null,
    shouldDirty = true
  ) => {
    updateInput(field, value as MortgageInputs[typeof field], shouldDirty)
  }, [updateInput])

  const handleSaleInputChange = useCallback((
    field: keyof SaleInputs,
    value: string | number | boolean | FeeItem[],
    shouldDirty = true
  ) => {
    updateSaleInput(field, value as SaleInputs[typeof field], shouldDirty)
  }, [updateSaleInput])

  // Form field setters using React Hook Form
  const setSelectedType = useCallback((type: PropertyType | null) => {
    if (type) {
      updatePropertyType(type)
    }
  }, [updatePropertyType])

  const setEditingScenarioName = useCallback((name: string) => {
    form.setValue('name', name, { shouldDirty: true })
  }, [form])

  const setEditingScenarioPurchaseIcon = useCallback((icon: string) => {
    form.setValue('purchaseIcon', icon, { shouldDirty: true })
  }, [form])

  const setEditingScenarioPurchaseIconColor = useCallback((color: string) => {
    form.setValue('purchaseIconColor', color, { shouldDirty: true })
  }, [form])

  const setEditingScenarioPurchaseIconSearch = useCallback((search: string) => {
    form.setValue('purchaseIconSearch', search, { shouldDirty: false }) // Search doesn't affect dirty state
  }, [form])

  const setEditingScenarioSaleIcon = useCallback((icon: string) => {
    form.setValue('saleIcon', icon, { shouldDirty: true })
  }, [form])

  const setEditingScenarioSaleIconColor = useCallback((color: string) => {
    form.setValue('saleIconColor', color, { shouldDirty: true })
  }, [form])

  const setEditingScenarioSaleIconSearch = useCallback((search: string) => {
    form.setValue('saleIconSearch', search, { shouldDirty: false }) // Search doesn't affect dirty state
  }, [form])

  // Tab change - no confirmation needed since tabs show different views of the same scenario
  const handleTabChange = useCallback((newTab: ResultsTab) => {
    setActiveResultsTab(newTab)
  }, [])

  // Use ref to store handleSave to avoid infinite loop in useEffect
  const handleSaveRef = useRef(handleSave)
  handleSaveRef.current = handleSave

  // Report footer state to parent for modal footer rendering
  useEffect(() => {
    if (onFooterStateChange) {
      if (selectedType) {
        onFooterStateChange({
          hasChanges: isDirty,
          isSaving: updateMutation.isPending,
          onSave: () => handleSaveRef.current(),
          isEditing: true,
        })
      } else {
        onFooterStateChange(null)
      }
    }
  }, [onFooterStateChange, selectedType, isDirty, updateMutation.isPending])

  // Use refs to store handlers to avoid infinite loop in useEffect
  const handleBackRef = useRef(handleBack)
  handleBackRef.current = handleBack
  const setEditingScenarioNameRef = useRef(setEditingScenarioName)
  setEditingScenarioNameRef.current = setEditingScenarioName
  const setEditingScenarioPurchaseIconRef = useRef(setEditingScenarioPurchaseIcon)
  setEditingScenarioPurchaseIconRef.current = setEditingScenarioPurchaseIcon
  const setEditingScenarioPurchaseIconColorRef = useRef(setEditingScenarioPurchaseIconColor)
  setEditingScenarioPurchaseIconColorRef.current = setEditingScenarioPurchaseIconColor
  const setEditingScenarioPurchaseIconSearchRef = useRef(setEditingScenarioPurchaseIconSearch)
  setEditingScenarioPurchaseIconSearchRef.current = setEditingScenarioPurchaseIconSearch
  const setSelectedTypeRef = useRef(setSelectedType)
  setSelectedTypeRef.current = setSelectedType

  // Report header state to parent for contextual modal header
  useEffect(() => {
    if (onHeaderStateChange) {
      if (selectedType) {
        onHeaderStateChange({
          name: editingScenarioName,
          icon: editingScenarioPurchaseIcon,
          iconColor: editingScenarioPurchaseIconColor,
          iconSearch: editingScenarioPurchaseIconSearch,
          propertyType: selectedType,
          loanStartMonth: inputs.loanStartMonth,
          onBack: () => handleBackRef.current(),
          onNameChange: (name) => setEditingScenarioNameRef.current(name),
          onIconChange: (icon) => setEditingScenarioPurchaseIconRef.current(icon),
          onIconColorChange: (color) => setEditingScenarioPurchaseIconColorRef.current(color),
          onIconSearchChange: (search) => setEditingScenarioPurchaseIconSearchRef.current(search),
          onPropertyTypeChange: (type) => setSelectedTypeRef.current(type),
          onJumpToDate,
        })
      } else {
        onHeaderStateChange(null)
      }
    }
  }, [onHeaderStateChange, selectedType, editingScenarioName, editingScenarioPurchaseIcon, editingScenarioPurchaseIconColor, editingScenarioPurchaseIconSearch, inputs.loanStartMonth, onJumpToDate])

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
          {/* Show skeleton only on initial load when opening directly to edit mode */}
          {initialScenarioId && !selectedType && !initialScenarioHandledRef.current ? (
            <ScenarioDetailSkeleton key="skeleton" isEmbedded={isEmbedded} />
          ) : !selectedType ? (
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
              propertySgId={editingApiScenario?.propertySG?.id}
              editingScenarioName={editingScenarioName}
              editingScenarioPurchaseIcon={editingScenarioPurchaseIcon}
              editingScenarioPurchaseIconColor={editingScenarioPurchaseIconColor}
              editingScenarioPurchaseIconSearch={editingScenarioPurchaseIconSearch}
              editingScenarioSaleIcon={editingScenarioSaleIcon}
              editingScenarioSaleIconColor={editingScenarioSaleIconColor}
              editingScenarioSaleIconSearch={editingScenarioSaleIconSearch}
              isEmbedded={isEmbedded}
              computedValues={computedValues}
              onInputChange={handleInputChange}
              onSaleInputChange={handleSaleInputChange}
              onActiveResultsTabChange={handleTabChange}
              onSelectedTypeChange={setSelectedType}
              onEditingScenarioNameChange={setEditingScenarioName}
              onEditingScenarioPurchaseIconChange={setEditingScenarioPurchaseIcon}
              onEditingScenarioPurchaseIconColorChange={setEditingScenarioPurchaseIconColor}
              onEditingScenarioPurchaseIconSearchChange={setEditingScenarioPurchaseIconSearch}
              onEditingScenarioSaleIconChange={setEditingScenarioSaleIcon}
              onEditingScenarioSaleIconColorChange={setEditingScenarioSaleIconColor}
              onEditingScenarioSaleIconSearchChange={setEditingScenarioSaleIconSearch}
              onSaveAndClose={handleSaveAndClose}
              onBack={handleBack}
              hasChanges={isDirty}
              onJumpToDate={onJumpToDate}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
