'use client'

import { useState, useMemo, useCallback } from 'react'
import { useFinancialDataContext } from '@/contexts/FinancialDataContext'
import { useScenarioEvents } from '@/hooks/useScenarioEvents'
import {
  useCashAccountsQuery,
  useCreateCashAccountMutation,
  useUpdateCashAccountMutation,
  useDeleteCashAccountMutation,
  useSetAccumulatorMutation,
  useCreateInvestmentMutation,
  useUpdateInvestmentMutation,
  useDeleteInvestmentMutation,
  useDeleteIncomeAllocationMutation,
  useStopIncomeAllocationMutation,
} from '@/hooks/queries'
import type { TimelineItem, TimelineEditRequest, TimelineEdit, TimelineFrequency } from '@/types/timeline'
import type { PropertyLinkRecord } from '@/types/property'
import type { FinancialFormValues } from '@/components/modals/FinancialFormModal'
import { FinancialFormModal } from '@/components/modals/FinancialFormModal'
import { CashAccountFormModal } from '@/components/modals/CashAccountFormModal'
import { PropertyPlannerModal } from '@/components/modals/PropertyPlannerModal'
import { IncomeAllocationModal } from '@/components/modals/IncomeAllocationModal'
// import { financialApi } from '@/api/financial'
import type { IncomeAllocation } from '@/api/financial/incomes'

// Local imports
import type { FinancialDataManagementProps, FinancialCategory, ModalState, CashAccountModalState, EditableFinancialItem } from './types'
import { categoryConfig } from './config'
import {
  parseDecimal,
  nonCashAssetV2ToTimelineItem,
  investmentV2ToTimelineItem,
  cashAssetV2ToTimelineItem,
  cpfAssetV2ToTimelineItem,
  liabilityV2ToTimelineItem,
  incomeV2ToTimelineItem,
  expenseV2ToTimelineItem,
} from './converters'
import { getItemId, calculateAllocationEndDate } from './utils'
import { Header } from './components/Header'
import { CategoryCard } from './components/CategoryCard'
import { ResizableCard } from './components/ResizableCard'
import { SummaryCards } from './components/SummaryCards'

export type { FinancialDataManagementProps }

export function FinancialDataManagement({
  selectedYear = 0,
  onSelectYear,
  selectedMonth,
  onSelectMonth,
  timelineYear,
  timelineMonth,
  timelineMonthV2,
  timelineYears,
  anchorYear,
  anchorMonth,
  resolution,
  isTimelineLoading = false,
  onSaveTimelineEdits,
}: FinancialDataManagementProps) {
  // V2 data is available when the feature flag is enabled and data is loaded
  const hasV2Data = !!timelineMonthV2
  const usingTimeline = true
  const [viewMode, setViewMode] = useState<'annualized' | 'monthly'>('monthly')

  // Determine if we should show monthly data
  const showMonthlyData = viewMode === 'monthly' && resolution === 'monthly' && timelineMonth

  // ========== Data from context and queries ==========
  const {
    addAsset,
    addIncome,
    addLiability,
    addExpense,
    updateAsset,
    updateIncome,
    updateLiability,
    updateExpense,
    deleteAsset,
    deleteIncome,
    deleteLiability,
    deleteExpense,
    refresh,
  } = useFinancialDataContext()

  const { events: scenarioEvents } = useScenarioEvents()
  const { data: cashAccounts = [] } = useCashAccountsQuery()
  const createCashAccountMutation = useCreateCashAccountMutation()
  const updateCashAccountMutation = useUpdateCashAccountMutation()
  const deleteCashAccountMutation = useDeleteCashAccountMutation()
  const setAccumulatorMutation = useSetAccumulatorMutation()
  const createInvestmentMutation = useCreateInvestmentMutation()
  const updateInvestmentMutation = useUpdateInvestmentMutation()
  const deleteInvestmentMutation = useDeleteInvestmentMutation()
  // Get investment allocations from snapshot (filtered by month) instead of direct API
  const investmentAllocations = useMemo(() => {
    if (!timelineMonthV2?.incomeAllocations) return []
    // Filter for investment allocations only and convert to expected format
    return timelineMonthV2.incomeAllocations
      .filter(alloc => alloc.targetInvestmentId)
      .map(alloc => ({
        id: alloc.id,
        incomeId: alloc.incomeId,
        parentId: alloc.parentId,
        startDate: alloc.startDate,
        endDate: alloc.endDate,
        targetCashAccountId: alloc.targetCashAccountId,
        targetInvestmentId: alloc.targetInvestmentId,
        allocationType: alloc.allocationType,
        allocationValue: Number(alloc.allocationValue),
        createdAt: '', // Not needed for display
      }))
  }, [timelineMonthV2?.incomeAllocations])
  const deleteAllocationMutation = useDeleteIncomeAllocationMutation()
  const stopAllocationMutation = useStopIncomeAllocationMutation()

  // ========== V2 Data Extraction ==========
  const yearAssets = useMemo(() => {
    if (hasV2Data && timelineMonthV2) {
      const nonCashItems = timelineMonthV2.nonCashAssets.map(nonCashAssetV2ToTimelineItem)
      const cashItems = timelineMonthV2.cashAssets.map(cashAssetV2ToTimelineItem)
      return [...nonCashItems, ...cashItems]
    }
    const timelineAssets = showMonthlyData ? (timelineMonth?.assets ?? []) : (timelineYear?.assets ?? [])
    const timelineCashAccounts = showMonthlyData ? (timelineMonth?.cashAccounts ?? []) : (timelineYear?.cashAccounts ?? [])
    return [...timelineAssets, ...timelineCashAccounts]
  }, [hasV2Data, timelineMonthV2, showMonthlyData, timelineMonth, timelineYear])

  const investmentAssets = useMemo(() => {
    if (hasV2Data && timelineMonthV2) {
      return (timelineMonthV2.investments ?? []).map(investmentV2ToTimelineItem)
    }
    return []
  }, [hasV2Data, timelineMonthV2])

  const cpfAssets = useMemo(() => {
    if (hasV2Data && timelineMonthV2) {
      return timelineMonthV2.cpfAssets.map(cpfAssetV2ToTimelineItem)
    }
    return []
  }, [hasV2Data, timelineMonthV2])

  const yearLiabilities = useMemo(() => {
    if (hasV2Data && timelineMonthV2) {
      return timelineMonthV2.liabilities.map(liabilityV2ToTimelineItem)
    }
    return showMonthlyData ? (timelineMonth?.liabilities ?? []) : (timelineYear?.liabilities ?? [])
  }, [hasV2Data, timelineMonthV2, showMonthlyData, timelineMonth, timelineYear])

  const yearIncomes = useMemo(() => {
    if (hasV2Data && timelineMonthV2) {
      return timelineMonthV2.income.map(incomeV2ToTimelineItem)
    }
    return showMonthlyData ? (timelineMonth?.income ?? []) : (timelineYear?.income ?? [])
  }, [hasV2Data, timelineMonthV2, showMonthlyData, timelineMonth, timelineYear])

  const cpfContributionsRaw = useMemo(() => {
    if (hasV2Data && timelineMonthV2) {
      return timelineMonthV2.cpfContributions
    }
    return []
  }, [hasV2Data, timelineMonthV2])

  const monthlyInvestments = useMemo(() => {
    if (hasV2Data && timelineMonthV2) {
      return parseDecimal(timelineMonthV2.netInvestments)
    }
    return 0
  }, [hasV2Data, timelineMonthV2])
  const hasInvestmentsSection = hasV2Data && timelineMonthV2?.netInvestments !== undefined


  const yearExpenses = useMemo(() => {
    if (hasV2Data && timelineMonthV2) {
      return timelineMonthV2.expenses.map(expenseV2ToTimelineItem)
    }
    return showMonthlyData ? (timelineMonth?.expenses ?? []) : (timelineYear?.expenses ?? [])
  }, [hasV2Data, timelineMonthV2, showMonthlyData, timelineMonth, timelineYear])

  // ========== Local state ==========
  const [modalState, setModalState] = useState<ModalState>({
    isOpen: false,
    type: 'asset',
    mode: 'create',
  })
  const [cashAccountModalState, setCashAccountModalState] = useState<CashAccountModalState>({
    isOpen: false,
    mode: 'create',
  })
  const [activeAnnualizationId, setActiveAnnualizationId] = useState<string | null>(null)
  const [assetLinks] = useState<Record<string, PropertyLinkRecord[]>>({})
  const [liabilityLinks] = useState<Record<string, PropertyLinkRecord[]>>({})
  const [sortDirections, setSortDirections] = useState<Record<FinancialCategory, 'asc' | 'desc'>>({
    asset: 'desc',
    income: 'desc',
    liability: 'desc',
    expense: 'desc',
    investment: 'desc',
  })
  const [expandedScenarioItems, setExpandedScenarioItems] = useState<Set<string>>(new Set())
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null)
  const [isPropertyPlannerOpen, setIsPropertyPlannerOpen] = useState(false)
  const [prefill, setPrefill] = useState<{ scenarioId?: string; assetId?: string; liabilityId?: string } | null>(null)
  const [allocationModalState, setAllocationModalState] = useState<{
    isOpen: boolean
    incomeId: string
    incomeName: string
    incomeAmount: number
    initialEditAllocationId?: string
  }>({ isOpen: false, incomeId: '', incomeName: '', incomeAmount: 0 })

  // ========== Computed values ==========
  const mergedLinks = useMemo(() => {
    const map: Record<string, PropertyLinkRecord> = {}
    const add = (id: string | undefined, link: PropertyLinkRecord) => {
      if (!id) return
      if (!map[id]) map[id] = link
    }
    Object.entries(assetLinks).forEach(([itemId, links]) => {
      links.forEach(link => {
        add(itemId, link)
        add(link.assetId, link)
        add(link.liabilityId, link)
      })
    })
    Object.entries(liabilityLinks).forEach(([itemId, links]) => {
      links.forEach(link => {
        add(itemId, link)
        add(link.assetId, link)
        add(link.liabilityId, link)
      })
    })
    return map
  }, [assetLinks, liabilityLinks])

  const firstLink = Object.values(mergedLinks)[0] ?? null

  // ========== Callbacks ==========
  const summarizeAmount = useCallback((item: TimelineItem): number => {
    if (showMonthlyData) {
      return item.adjMonthlyAmt ?? item.amountMonthly ?? 0
    }
    return item.adjAnnualAmt ?? item.amountAnnual ?? 0
  }, [showMonthlyData])

  const getDisplayAmount = useCallback((item: TimelineItem): number => {
    const isSnapshot = item.itemType === 'asset' ||
                       item.itemType === 'liability' ||
                       item.itemType === 'cash_account'

    if (isSnapshot) {
      return item.adjMonthlyAmt ?? item.amountMonthly ?? item.amountAnnual ?? 0
    }

    if (showMonthlyData) {
      return item.adjMonthlyAmt ?? item.amountMonthly ?? 0
    }
    return item.adjAnnualAmt ?? item.amountAnnual ?? 0
  }, [showMonthlyData])

  const getNetWorthForYear = useCallback(() => {
    // Prefer V2 data which includes investments, CPF, and cash in the calculation
    if (hasV2Data && timelineMonthV2?.netWorth !== undefined) {
      return Math.round(parseDecimal(timelineMonthV2.netWorth))
    }
    if (timelineYear?.netWorth !== undefined) return Math.round(timelineYear.netWorth)
    return 0
  }, [hasV2Data, timelineMonthV2, timelineYear])

  const getAnnualSavingsForYear = useCallback(() => {
    const totalIncome = yearIncomes.reduce((sum, it) => sum + (summarizeAmount(it) ?? 0), 0)
    const totalExpenses = yearExpenses.reduce((sum, it) => sum + (summarizeAmount(it) ?? 0), 0)
    return Math.round(totalIncome - totalExpenses)
  }, [yearIncomes, yearExpenses, summarizeAmount])

  const toggleScenarioExpanded = useCallback((itemId: string) => {
    setExpandedScenarioItems((prev) => {
      const next = new Set(prev)
      if (next.has(itemId)) next.delete(itemId)
      else next.add(itemId)
      return next
    })
  }, [])

  const formatYearLabel = (year: number) => (year === 0 ? 'BASE' : `Year ${year}`)

  // ========== Effects ==========
  // Property links effect disabled - not currently used
  // If property links are needed, uncomment this effect
  /*
  useEffect(() => {
    const fetchLinks = async () => {
      try {
        const allLinksResult = await financialApi.listAllPropertyLinks({ limit: -1 })
        const allLinks = allLinksResult.data

        const [assetsResult, liabilitiesResult] = await Promise.all([
          financialApi.listAssets({ limit: -1 }),
          financialApi.listLiabilities({ limit: -1 })
        ])

        const assetIdToParentId = new Map(assetsResult.data.map(a => [a.id, a.parentId]))
        const liabilityIdToParentId = new Map(liabilitiesResult.data.map(l => [l.id, l.parentId]))

        const assetResults: Record<string, PropertyLinkRecord[]> = {}
        const liabilityResults: Record<string, PropertyLinkRecord[]> = {}

        for (const link of allLinks) {
          if (!assetResults[link.assetId]) {
            assetResults[link.assetId] = []
          }
          assetResults[link.assetId].push(link)

          const assetParentId = assetIdToParentId.get(link.assetId)
          if (assetParentId && assetParentId !== link.assetId) {
            if (!assetResults[assetParentId]) {
              assetResults[assetParentId] = []
            }
            assetResults[assetParentId].push(link)
          }

          if (!liabilityResults[link.liabilityId]) {
            liabilityResults[link.liabilityId] = []
          }
          liabilityResults[link.liabilityId].push(link)

          const liabilityParentId = liabilityIdToParentId.get(link.liabilityId)
          if (liabilityParentId && liabilityParentId !== link.liabilityId) {
            if (!liabilityResults[liabilityParentId]) {
              liabilityResults[liabilityParentId] = []
            }
            liabilityResults[liabilityParentId].push(link)
          }
        }

        setAssetLinks(assetResults)
        setLiabilityLinks(liabilityResults)
      } catch (error) {
        console.error('Failed to fetch property links', error)
      }
    }
    if (yearAssets.length || yearLiabilities.length) {
      void fetchLinks()
    } else {
      setAssetLinks({})
      setLiabilityLinks({})
    }
  }, [yearAssets, yearLiabilities])
  */

  // ========== Handlers ==========
  const handleAddItem = (category: FinancialCategory) => {
    setModalState({
      isOpen: true,
      type: category,
      mode: 'create',
      data: undefined,
    })
  }

  const handleEditItem = (category: FinancialCategory, entry: EditableFinancialItem) => {
    const normalizedEntry = (() => {
      const id = getItemId(entry)
      if (!id) return entry
      if ('id' in entry && entry.id === id) return entry
      return { ...entry, id } as EditableFinancialItem
    })()
    setModalState({
      isOpen: true,
      type: category,
      mode: 'edit',
      data: normalizedEntry,
    })
  }

  const handleDeleteItem = async (category: FinancialCategory, id: string) => {
    try {
      // Investments are handled separately from timeline edits
      if (category !== 'investment' && usingTimeline && onSaveTimelineEdits && selectedYear > 0) {
        const isFlow = category === 'income' || category === 'expense'
        const edit: TimelineEdit = {
          itemId: id,
          itemType: category,
          amount: 0,
          ...(isFlow && { frequency: 'annual' as const }),
        }

        const request: TimelineEditRequest = {
          year: selectedYear,
          edits: [edit],
        }
        await onSaveTimelineEdits(request)
        return
      }

      switch (category) {
        case 'asset':
          await deleteAsset(id)
          break
        case 'liability':
          await deleteLiability(id)
          break
        case 'income':
          await deleteIncome(id)
          break
        case 'expense':
          await deleteExpense(id)
          break
        case 'investment':
          await deleteInvestmentMutation.mutateAsync(id)
          break
      }
      await refresh()
    } catch (error) {
      console.error(`Failed to delete ${category}:`, error)
    }
  }

  const handleModalClose = () => {
    setModalState((prev) => ({ ...prev, isOpen: false, data: undefined }))
  }

  const handleModalSave = async (payload: FinancialFormValues, mode: 'create' | 'edit') => {
    const timestamp = ('updatedAt' in payload ? payload.updatedAt : null) ?? new Date().toISOString()

    // Investments are handled separately from timeline edits
    if (payload.type !== 'investment' && usingTimeline && onSaveTimelineEdits) {
      const mapFrequency = (freq: string | undefined): TimelineFrequency => {
        if (freq === 'monthly' || freq === 'weekly' || freq === 'biweekly' || freq === 'quarterly' || freq === 'semiannual' || freq === 'annual') {
          return freq
        }
        return 'annual'
      }

      const payloadId = 'id' in payload ? payload.id : undefined
      const modalDataId = modalState.data ? getItemId(modalState.data) : undefined
      const itemId = payloadId || modalDataId

      const amount = (() => {
        switch (payload.type) {
          case 'asset':
            return Math.round(payload.currentValue)
          case 'liability':
            return Math.round(payload.currentBalance)
          case 'income':
          case 'expense':
            return Math.round(payload.amount)
          case 'cpf':
            return 0
        }
      })()

      const name = (() => {
        switch (payload.type) {
          case 'asset':
          case 'liability':
            return payload.name
          case 'income':
            return payload.source
          case 'expense':
            return payload.payee
          case 'cpf':
            return ''
        }
      })()

      const category = payload.type !== 'cpf' ? payload.category : ''
      const isFlow = payload.type === 'income' || payload.type === 'expense'

      const edit: TimelineEdit = {
        itemId: itemId || undefined,
        name,
        itemType: payload.type === 'cpf' ? 'asset' : payload.type,
        category,
        amount,
        ...(isFlow && { frequency: mapFrequency(payload.frequency) }),
      }

      const request: TimelineEditRequest = {
        year: selectedYear,
        edits: [edit],
      }
      await onSaveTimelineEdits(request)
      handleModalClose()
      return
    }

    switch (payload.type) {
      case 'cpf': {
        await Promise.all(
          payload.accounts.map(account =>
            addAsset({
              name: account.name,
              category: account.category,
              currentValue: account.currentValue,
              annualGrowthRate: account.annualGrowthRate,
              notes: account.notes ?? undefined,
            })
          )
        )
        await refresh()
        break
      }
      case 'asset': {
        const { type: _type, id: _id, updatedAt: _updatedAt, ...values } = payload
        if (mode === 'edit' && modalState.data) {
          const targetId = getItemId(modalState.data)
          if (!targetId) throw new Error('Unable to update asset: missing item id')
          await updateAsset(targetId, { ...values, updatedAt: timestamp })
        } else {
          await addAsset(values)
        }
        break
      }
      case 'income': {
        const { type: _type, id: _id, updatedAt: _updatedAt, ...values } = payload
        if (mode === 'edit' && modalState.data) {
          const targetId = getItemId(modalState.data)
          if (!targetId) throw new Error('Unable to update income: missing item id')
          await updateIncome(targetId, { ...values, updatedAt: timestamp })
        } else {
          await addIncome(values)
        }
        break
      }
      case 'liability': {
        const { type: _type, id: _id, updatedAt: _updatedAt, ...values } = payload
        if (mode === 'edit' && modalState.data) {
          const targetId = getItemId(modalState.data)
          if (!targetId) throw new Error('Unable to update liability: missing item id')
          await updateLiability(targetId, { ...values, updatedAt: timestamp })
        } else {
          await addLiability(values)
        }
        break
      }
      case 'expense': {
        const { type: _type, id: _id, updatedAt: _updatedAt, ...values } = payload
        if (mode === 'edit' && modalState.data) {
          const targetId = getItemId(modalState.data)
          if (!targetId) throw new Error('Unable to update expense: missing item id')
          await updateExpense(targetId, { ...values, updatedAt: timestamp })
        } else {
          await addExpense(values)
        }
        break
      }
      case 'investment': {
        const { type: _type, id: _id, updatedAt: _updatedAt, ...values } = payload
        if (mode === 'edit' && modalState.data) {
          const targetId = getItemId(modalState.data)
          if (!targetId) throw new Error('Unable to update investment: missing item id')
          await updateInvestmentMutation.mutateAsync({ id: targetId, updates: { ...values, updatedAt: timestamp } })
        } else {
          await createInvestmentMutation.mutateAsync(values)
        }
        await refresh()
        break
      }
    }

    handleModalClose()
  }

  const handleModalDelete = async (id: string) => {
    await handleDeleteItem(modalState.type, id)
    handleModalClose()
  }

  const openPlannerFromLink = (link: PropertyLinkRecord) => {
    setPrefill({
      scenarioId: link.propertyScenarioId,
      assetId: link.assetId,
      liabilityId: link.liabilityId,
    })
    setIsPropertyPlannerOpen(true)
  }

  const handleManageAllocations = (item: TimelineItem) => {
    const id = getItemId(item)
    if (!id) return
    const name = 'source' in item ? (item as any).source : item.name ?? 'Income'
    const amount = item.amountAnnual ?? (item.amountMonthly ?? 0) * 12
    setAllocationModalState({
      isOpen: true,
      incomeId: id,
      incomeName: name,
      incomeAmount: amount,
    })
  }

  // Open allocation modal for the income that has this allocation
  const handleEditAllocation = (allocation: IncomeAllocation) => {
    const income = yearIncomes.find((i) => getItemId(i) === allocation.incomeId)
    if (!income) return
    const name = 'source' in income ? (income as any).source : income.name ?? 'Income'
    const amount = income.amountAnnual ?? (income.amountMonthly ?? 0) * 12
    setAllocationModalState({
      isOpen: true,
      incomeId: allocation.incomeId,
      incomeName: name,
      incomeAmount: amount,
      initialEditAllocationId: allocation.id,
    })
  }

  // Delete or stop an allocation
  // At base (selectedYear=0, selectedMonth=0): delete the allocation entirely
  // At future month: stop the allocation by setting end_date to last day of previous month
  const handleDeleteAllocation = async (allocation: IncomeAllocation) => {
    const isFutureMonth = selectedYear > 0 || (selectedMonth !== undefined && selectedMonth > 0)

    if (isFutureMonth) {
      // Stop allocation at this future point - set end_date to last day of previous month
      if (!confirm('This will stop the allocation from this month onwards. The allocation will remain active for previous months. Continue?')) return

      // Calculate end_date as last day of previous month using utility function
      const endDate = calculateAllocationEndDate(selectedYear, selectedMonth ?? 0, anchorYear)

      try {
        await stopAllocationMutation.mutateAsync({
          incomeId: allocation.incomeId,
          allocationId: allocation.id,
          endDate,
        })
      } catch (error) {
        console.error('Failed to stop allocation:', error)
      }
    } else {
      // At base - delete the allocation entirely
      if (!confirm('Are you sure you want to delete this allocation?')) return
      try {
        await deleteAllocationMutation.mutateAsync({
          incomeId: allocation.incomeId,
          allocationId: allocation.id,
        })
      } catch (error) {
        console.error('Failed to delete allocation:', error)
      }
    }
  }

  // ========== Investment Handlers ==========
  const handleAddInvestment = () => {
    setModalState({
      isOpen: true,
      type: 'investment',
      mode: 'create',
      data: undefined,
    })
  }

  const handleEditInvestment = (item: TimelineItem) => {
    // Convert TimelineItem to investment-like shape for the modal
    // Use the non-adjusted balance as currentValue (original value before growth applied)
    const investmentData = {
      id: item.itemId,
      name: item.name,
      category: item.category || 'stocks_portfolio',
      // Use amountMonthly (original balance) not adjMonthlyAmt (after growth)
      currentValue: item.amountMonthly ?? item.adjMonthlyAmt ?? 0,
      annualGrowthRate: item.growthRate ?? 7.0,
      notes: '',
    }
    setModalState({
      isOpen: true,
      type: 'investment',
      mode: 'edit',
      data: investmentData as any,
    })
  }

  const handleDeleteInvestment = async (id: string) => {
    try {
      await deleteInvestmentMutation.mutateAsync(id)
    } catch (error) {
      console.error('Failed to delete investment:', error)
    }
  }

  const getDataForCategory = (category: FinancialCategory): TimelineItem[] => {
    switch (category) {
      case 'asset':
        return yearAssets
      case 'income':
        return yearIncomes
      case 'liability':
        return yearLiabilities
      case 'expense':
        return yearExpenses
      case 'investment':
        return investmentAssets
      default:
        return []
    }
  }

  // ========== Render ==========
  return (
    <>
      <div
        id="financial-data-section"
        className="flex h-full flex-col bg-transparent text-white"
        onClick={(e) => {
          if (selectedItemId && (e.target as HTMLElement).closest('[data-line-item]') === null) {
            setSelectedItemId(null)
          }
        }}
      >
        <Header
          selectedYear={selectedYear}
          onSelectYear={onSelectYear}
          selectedMonth={selectedMonth}
          onSelectMonth={onSelectMonth}
          anchorYear={anchorYear}
          anchorMonth={anchorMonth}
          resolution={resolution}
          timelineYears={timelineYears}
          isTimelineLoading={isTimelineLoading}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
        />

        <div className="flex-1 overflow-auto px-6 py-6">
          <div className="flex h-full flex-col gap-6">
            <div className="grid gap-4 lg:grid-cols-2">
              {(Object.keys(categoryConfig) as FinancialCategory[]).filter((key) => key !== 'investment').map((key) => (
                <ResizableCard key={key} id={key}>
                <CategoryCard
                  category={key}
                  data={getDataForCategory(key)}
                  sortDirection={sortDirections[key]}
                  onToggleSortDirection={() =>
                    setSortDirections((prev) => ({
                      ...prev,
                      [key]: prev[key] === 'desc' ? 'asc' : 'desc',
                    }))
                  }
                  onAddItem={() => handleAddItem(key)}
                  onEditItem={handleEditItem}
                  onDeleteItem={handleDeleteItem}
                  selectedItemId={selectedItemId}
                  onSelectItem={setSelectedItemId}
                  expandedScenarioItems={expandedScenarioItems}
                  onToggleScenarioExpanded={toggleScenarioExpanded}
                  scenarioEvents={scenarioEvents}
                  showMonthlyData={!!showMonthlyData}
                  getDisplayAmount={getDisplayAmount}
                  summarizeAmount={summarizeAmount}
                  activeAnnualizationId={activeAnnualizationId}
                  setActiveAnnualizationId={setActiveAnnualizationId}
                  cashAccounts={cashAccounts}
                  onSetAccumulator={(id) => setAccumulatorMutation.mutate(id)}
                  onOpenCashAccountEdit={(cashAccount) =>
                    setCashAccountModalState({ isOpen: true, mode: 'edit', data: cashAccount })
                  }
                  onDeleteCashAccount={(id) => deleteCashAccountMutation.mutate(id)}
                  mergedLinks={mergedLinks}
                  assetLinks={assetLinks}
                  liabilityLinks={liabilityLinks}
                  firstLink={firstLink}
                  onOpenPropertyPlanner={openPlannerFromLink}
                  investmentAssets={key === 'asset' ? investmentAssets : undefined}
                  cpfAssets={key === 'asset' ? cpfAssets : undefined}
                  cpfContributionsRaw={key === 'income' ? cpfContributionsRaw : undefined}
                  hasInvestmentsSection={key === 'income' ? hasInvestmentsSection : false}
                  monthlyInvestments={key === 'income' ? monthlyInvestments : 0}
                  onAddInvestment={key === 'asset' ? handleAddInvestment : undefined}
                  onEditInvestment={key === 'asset' ? handleEditInvestment : undefined}
                  onDeleteInvestment={key === 'asset' ? handleDeleteInvestment : undefined}
                  onManageAllocations={key === 'income' ? handleManageAllocations : undefined}
                  investmentAllocations={key === 'income' ? investmentAllocations : undefined}
                  investments={key === 'income' ? investmentAssets : undefined}
                  onEditAllocation={key === 'income' ? handleEditAllocation : undefined}
                  onDeleteAllocation={key === 'income' ? handleDeleteAllocation : undefined}
                />
                </ResizableCard>
              ))}
            </div>

            <SummaryCards
              netWorth={getNetWorthForYear()}
              annualSavings={getAnnualSavingsForYear()}
              hasV2Data={hasV2Data}
              timelineMonthV2={timelineMonthV2}
            />
          </div>
        </div>
      </div>

      <FinancialFormModal
        mode={modalState.mode}
        data={modalState.data}
        isOpen={modalState.isOpen}
        onClose={handleModalClose}
        onSave={handleModalSave}
        type={modalState.type}
        selectedYear={selectedYear}
        selectedYearLabel={formatYearLabel(selectedYear)}
        onDelete={
          modalState.mode === 'edit' && getItemId(modalState.data) ? handleModalDelete : undefined
        }
      />
      <PropertyPlannerModal
        isOpen={isPropertyPlannerOpen}
        onClose={() => {
          setIsPropertyPlannerOpen(false)
          setPrefill(null)
        }}
        prefill={prefill ?? undefined}
      />
      <CashAccountFormModal
        mode={cashAccountModalState.mode}
        data={cashAccountModalState.data}
        isOpen={cashAccountModalState.isOpen}
        onClose={() => setCashAccountModalState({ isOpen: false, mode: 'create' })}
        onSave={async (payload, mode) => {
          if (mode === 'edit' && cashAccountModalState.data?.id) {
            await updateCashAccountMutation.mutateAsync({
              id: cashAccountModalState.data.id,
              updates: payload,
            })
          } else {
            await createCashAccountMutation.mutateAsync(payload)
          }
        }}
        onDelete={async (id) => {
          await deleteCashAccountMutation.mutateAsync(id)
        }}
      />
      <IncomeAllocationModal
        isOpen={allocationModalState.isOpen}
        onClose={() => setAllocationModalState((prev) => ({ ...prev, isOpen: false, initialEditAllocationId: undefined }))}
        incomeId={allocationModalState.incomeId}
        incomeName={allocationModalState.incomeName}
        incomeAmount={allocationModalState.incomeAmount}
        initialEditAllocationId={allocationModalState.initialEditAllocationId}
      />
    </>
  )
}
