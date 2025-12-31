'use client'

import { useState, useMemo, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import clsx from 'clsx'
import { useFinancialDataContext } from '@/contexts/FinancialDataContext'
import { useTaxModeOptional } from '@/contexts/TaxModeContext'
import { usePersonFilter } from '@/contexts/PersonFilterContext'
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
  useStopInvestmentMutation,
  useDeleteIncomeAllocationMutation,
  useStopIncomeAllocationMutation,
  useStopExpenseMutation,
  useStopAssetMutation,
  useStopLiabilityMutation,
  useStopIncomeMutation,
  useCpfAccountQuery,
  useCreateCpfAccountMutation,
  useUpdateCpfAccountMutation,
  useDeleteCpfAccountMutation,
} from '@/hooks/queries'
import type { TimelineItem } from '@/types/timeline'
import type { PropertyLinkRecord } from '@/types/property'
import type { FinancialFormValues, TimelineItemData } from '@/components/modals/FinancialFormModal'
import { FinancialFormModal } from '@/components/modals/FinancialFormModal'
import {
  ASSET_ENTITY,
  INCOME_ENTITY,
  LIABILITY_ENTITY,
  EXPENSE_ENTITY,
  INVESTMENT_ENTITY,
} from '@/types/financial'
import { DeleteConfirmationModal } from '@/components/modals/FinancialFormModal/DeleteConfirmationModal'
import { CashAccountFormModal } from '@/components/modals/CashAccountFormModal/CashAccountFormModal'
import { IncomeAllocationModal } from '@/components/modals/IncomeAllocationModal/IncomeAllocationModal'
import { CpfAccountFormModal } from '@/components/modals/CpfAccountFormModal/CpfAccountFormModal'
import { settingsApi } from '@/api/financial'
import { QUERY_KEYS } from '@/lib/queryKeys'
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
import { TaxModeModal } from '../TaxModePanel/TaxModeModal'

export type { FinancialDataManagementProps }

export function FinancialDataManagement({
  selectedYear = 0,
  onSelectYear,
  selectedMonth,
  onSelectMonth,
  timelineYear,
  timelineMonth,
  timelineMonths,
  timelineMonthV2,
  timelineYears,
  anchorYear,
  anchorMonth,
  resolution,
  isTimelineLoading = false,
  showTaxMode: _showTaxMode = false,
  compact = false,
}: FinancialDataManagementProps) {
  // V2 data is available when the feature flag is enabled and data is loaded
  const hasV2Data = !!timelineMonthV2
  const [viewMode, setViewMode] = useState<'annualized' | 'monthly'>('monthly')

  // Determine if we should show monthly data
  // For V2: use timelineMonthV2, for V1: use timelineMonth
  const hasMonthData = hasV2Data ? !!timelineMonthV2 : !!timelineMonth
  const showMonthlyData = viewMode === 'monthly' && resolution === 'monthly' && hasMonthData

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

  // Person filtering
  const { shouldShowData } = usePersonFilter()

  const { events: scenarioEvents } = useScenarioEvents()

  // User settings for display preferences
  const { data: userSettings } = useQuery({
    queryKey: QUERY_KEYS.settings.user,
    queryFn: () => settingsApi.getUserSettings(),
    staleTime: 5 * 60 * 1000,
  })
  const groupItemsByCategory = userSettings?.groupItemsByCategory ?? true

  const { data: cashAccounts = [] } = useCashAccountsQuery()
  const createCashAccountMutation = useCreateCashAccountMutation()
  const updateCashAccountMutation = useUpdateCashAccountMutation()
  const deleteCashAccountMutation = useDeleteCashAccountMutation()
  const setAccumulatorMutation = useSetAccumulatorMutation()
  const createInvestmentMutation = useCreateInvestmentMutation()
  const updateInvestmentMutation = useUpdateInvestmentMutation()
  const deleteInvestmentMutation = useDeleteInvestmentMutation()
  const stopExpenseMutation = useStopExpenseMutation()
  const stopAssetMutation = useStopAssetMutation()
  const stopLiabilityMutation = useStopLiabilityMutation()
  const stopIncomeMutation = useStopIncomeMutation()
  const stopInvestmentMutation = useStopInvestmentMutation()
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
        allocationValue: alloc.allocationValue, // Keep as string to avoid precision loss
        createdAt: '', // Not needed for display
      }))
  }, [timelineMonthV2?.incomeAllocations])
  const deleteAllocationMutation = useDeleteIncomeAllocationMutation()
  const stopAllocationMutation = useStopIncomeAllocationMutation()
  // CPF account queries
  const { data: cpfAccount } = useCpfAccountQuery()
  const createCpfAccountMutation = useCreateCpfAccountMutation()
  const updateCpfAccountMutation = useUpdateCpfAccountMutation()
  const deleteCpfAccountMutation = useDeleteCpfAccountMutation()

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

  // Property snapshots from V2 timeline
  const propertySnapshots = useMemo(() => {
    if (hasV2Data && timelineMonthV2) {
      return timelineMonthV2.properties ?? []
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
      return timelineMonthV2.income
        .map(incomeV2ToTimelineItem)
        .filter((item) => shouldShowData(item.personId))
    }
    const items = showMonthlyData ? (timelineMonth?.income ?? []) : (timelineYear?.income ?? [])
    return items.filter((item) => shouldShowData(item.personId))
  }, [hasV2Data, timelineMonthV2, showMonthlyData, timelineMonth, timelineYear, shouldShowData])

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
  const [cpfModalState, setCpfModalState] = useState<{ isOpen: boolean; mode: 'create' | 'edit' }>({
    isOpen: false,
    mode: 'edit',
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
  // Track collapse state for each category card (for ResizableCard height management)
  const [cardCollapseStates, setCardCollapseStates] = useState<Record<FinancialCategory, boolean>>({
    asset: compact,
    income: compact,
    liability: compact,
    expense: compact,
    investment: compact,
  })
  const [allocationModalState, setAllocationModalState] = useState<{
    isOpen: boolean
    incomeId: string
    incomeName: string
    incomeAmount: number
    initialEditAllocationId?: string
  }>({ isOpen: false, incomeId: '', incomeName: '', incomeAmount: 0 })
  const [debtRepaymentDeleteState, setDebtRepaymentDeleteState] = useState<{
    isOpen: boolean
    item: TimelineItem | null
    deleteMode: 'stop' | 'delete'
    isDeleting: boolean
  }>({ isOpen: false, item: null, deleteMode: 'stop', isDeleting: false })

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
      // Check if we're at anchor month - always use direct delete at anchor
      // selectedYear and anchorYear are both actual calendar years (e.g., 2025)
      // selectedMonth and anchorMonth are both actual months (1-12)
      const isAtAnchorMonth = selectedYear === anchorYear && selectedMonth === anchorMonth
      console.log('[handleDeleteItem]', { category, id, selectedYear, selectedMonth, anchorYear, anchorMonth, isAtAnchorMonth })

      // At anchor month or for investments, use direct API delete
      // Timeline edits (amount: 0) are only for future months where we want versioned "stop"
      if (isAtAnchorMonth || category === 'investment') {
        // Use direct delete API
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
        return
      }

      // For future months, use the stop API to set end_date (soft delete)
      // Calculate end_date as last day of the month before the selected month in UTC
      // Day 0 of a month = last day of previous month
      const stopEndDate = new Date(Date.UTC(selectedYear, (selectedMonth ?? 1) - 1, 0)).toISOString()

      switch (category) {
        case 'asset':
          await stopAssetMutation.mutateAsync({ id, endDate: stopEndDate })
          break
        case 'liability':
          await stopLiabilityMutation.mutateAsync({ id, endDate: stopEndDate })
          break
        case 'income':
          await stopIncomeMutation.mutateAsync({ id, endDate: stopEndDate })
          break
        case 'expense':
          await stopExpenseMutation.mutateAsync({ id, endDate: stopEndDate })
          break
      }
      return
    } catch (error) {
      console.error(`Failed to delete ${category}:`, error)
    }
  }

  const handleModalClose = () => {
    setModalState((prev) => ({ ...prev, isOpen: false, data: undefined }))
  }

  const handleModalSave = async (payload: FinancialFormValues, mode: 'create' | 'edit') => {
    const timestamp = ('updatedAt' in payload ? payload.updatedAt : null) ?? new Date().toISOString()

    // Check if this is a debt repayment expense (has sourceLiabilityId)
    // Debt repayments should use direct API updates, not timeline edits, to preserve the liability link
    const isDebtRepayment = payload.type === 'expense' && 'sourceLiabilityId' in payload && !!payload.sourceLiabilityId

    // Check if we're at anchor month (base month) - edits at anchor should use direct API updates
    // to avoid creating duplicate records. Timeline edits always create new versions.
    // selectedYear and anchorYear are both actual calendar years (e.g., 2025)
    // selectedMonth and anchorMonth are both actual months (1-12)
    const isAtAnchorMonth = selectedYear === anchorYear && selectedMonth === anchorMonth

    console.log('[handleModalSave]', {
      mode,
      type: payload.type,
      selectedYear,
      selectedMonth,
      anchorYear,
      anchorMonth,
      isAtAnchorMonth,
      isDebtRepayment,
    })

    // Check if we're in a future month (not at anchor)
    const isFutureMonth = !isAtAnchorMonth

    // For future month edits (not at anchor), use versioned updates that stop+create
    // This properly handles versioning by setting end_date on parent and creating new version
    const isFutureMonthEdit = mode === 'edit' && isFutureMonth && !isDebtRepayment

    // Calculate startDate for future months (first day of selected month in UTC)
    // Used for both CREATE (new items start at selected month) and EDIT (versioned updates)
    // Use Date.UTC to avoid timezone issues - we want 2026-02-01T00:00:00Z not local time
    const futureMonthStartDate = isFutureMonth && selectedYear && selectedMonth
      ? new Date(Date.UTC(selectedYear, selectedMonth - 1, 1)).toISOString()
      : undefined

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
              ...(futureMonthStartDate && { startDate: futureMonthStartDate }),
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
          await updateAsset(targetId, {
            ...values,
            updatedAt: timestamp,
            ...(isFutureMonthEdit && { updateMode: 'versioned', startDate: futureMonthStartDate }),
          })
        } else {
          await addAsset({
            ...values,
            ...(futureMonthStartDate && { startDate: futureMonthStartDate }),
          })
        }
        break
      }
      case 'income': {
        const { type: _type, id: _id, updatedAt: _updatedAt, ...values } = payload
        if (mode === 'edit' && modalState.data) {
          const targetId = getItemId(modalState.data)
          if (!targetId) throw new Error('Unable to update income: missing item id')
          await updateIncome(targetId, {
            ...values,
            updatedAt: timestamp,
            ...(isFutureMonthEdit && { updateMode: 'versioned', startDate: futureMonthStartDate }),
          })
        } else {
          await addIncome({
            ...values,
            // Override the form's startDate with selected month if in future
            ...(futureMonthStartDate && { startDate: futureMonthStartDate }),
          })
        }
        break
      }
      case 'liability': {
        const { type: _type, id: _id, updatedAt: _updatedAt, ...values } = payload
        if (mode === 'edit' && modalState.data) {
          const targetId = getItemId(modalState.data)
          if (!targetId) throw new Error('Unable to update liability: missing item id')
          await updateLiability(targetId, {
            ...values,
            updatedAt: timestamp,
            ...(isFutureMonthEdit && { updateMode: 'versioned', startDate: futureMonthStartDate }),
          })
        } else {
          await addLiability({
            ...values,
            ...(futureMonthStartDate && { startDate: futureMonthStartDate }),
          })
        }
        break
      }
      case 'expense': {
        const { type: _type, id: _id, updatedAt: _updatedAt, sourceLiabilityId, ...values } = payload

        if (mode === 'edit' && modalState.data) {
          const targetId = getItemId(modalState.data)
          if (!targetId) throw new Error('Unable to update expense: missing item id')
          await updateExpense(targetId, {
            ...values,
            sourceLiabilityId,
            updatedAt: timestamp,
            ...(isFutureMonthEdit && { updateMode: 'versioned', startDate: futureMonthStartDate }),
          })
        } else {
          await addExpense({
            ...values,
            ...(futureMonthStartDate && { startDate: futureMonthStartDate }),
          })
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
          await createInvestmentMutation.mutateAsync({
            ...values,
            ...(futureMonthStartDate && { startDate: futureMonthStartDate }),
          })
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

  const handleModalStopExpense = async (id: string, endDate: string) => {
    await stopExpenseMutation.mutateAsync({ id, endDate })
    handleModalClose()
  }

  const handleModalStopAsset = async (id: string, endDate: string) => {
    await stopAssetMutation.mutateAsync({ id, endDate })
    handleModalClose()
  }

  const handleModalStopLiability = async (id: string, endDate: string) => {
    await stopLiabilityMutation.mutateAsync({ id, endDate })
    handleModalClose()
  }

  const handleModalStopIncome = async (id: string, endDate: string) => {
    await stopIncomeMutation.mutateAsync({ id, endDate })
    handleModalClose()
  }

  const handleModalStopInvestment = async (id: string, endDate: string) => {
    await stopInvestmentMutation.mutateAsync({ id, endDate })
    handleModalClose()
  }

  const handleManageAllocations = (item: TimelineItem) => {
    const id = getItemId(item)
    if (!id) return
    const name = item.name ?? 'Income'
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
    const name = income.name ?? 'Income'
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
  // At anchor month: delete the allocation entirely
  // At future month: stop the allocation by setting end_date to last day of previous month
  const handleDeleteAllocation = async (allocation: IncomeAllocation) => {
    // Check if we're past the anchor month (future month)
    const isAtAnchor = selectedYear === anchorYear && selectedMonth === anchorMonth
    const isFutureMonth = !isAtAnchor

    if (isFutureMonth) {
      // Stop allocation at this future point - set end_date to last day of previous month
      if (!confirm('This will stop the allocation from this month onwards. The allocation will remain active for previous months. Continue?')) return

      // Calculate end_date as last day of previous month using utility function
      const endDate = calculateAllocationEndDate(selectedYear, selectedMonth ?? 1, anchorYear)

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

  // ========== Debt Repayment Delete Handler ==========
  // Determine if we're in a future month (not anchor)
  const isAtAnchorForDebt = selectedYear === anchorYear && selectedMonth === anchorMonth
  const isFutureMonth = !isAtAnchorForDebt

  const handleDeleteDebtRepayment = (item: TimelineItem) => {
    // At future months, show confirmation modal with versioning options
    if (isFutureMonth) {
      setDebtRepaymentDeleteState({
        isOpen: true,
        item,
        deleteMode: 'stop',
        isDeleting: false,
      })
      return
    }

    // At anchor month, do a simple hard delete
    if (!confirm('Are you sure you want to delete this debt repayment?')) return
    void deleteExpense(item.itemId)
  }

  const handleConfirmDebtRepaymentDelete = async () => {
    const { item, deleteMode } = debtRepaymentDeleteState
    if (!item?.itemId) return

    setDebtRepaymentDeleteState(prev => ({ ...prev, isDeleting: true }))
    try {
      if (deleteMode === 'stop' && selectedYear !== undefined) {
        const effectiveMonth = selectedMonth ?? 1
        const endDate = calculateAllocationEndDate(selectedYear, effectiveMonth, anchorYear)
        await stopExpenseMutation.mutateAsync({ id: item.itemId, endDate })
      } else {
        await deleteExpense(item.itemId)
      }
      setDebtRepaymentDeleteState({ isOpen: false, item: null, deleteMode: 'stop', isDeleting: false })
    } catch (error) {
      console.error('Failed to delete debt repayment:', error)
      setDebtRepaymentDeleteState(prev => ({ ...prev, isDeleting: false }))
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
      annualGrowthRate: item.growthRate ?? 6.0,
      notes: '',
    }
    setModalState({
      isOpen: true,
      type: 'investment',
      mode: 'edit',
      data: investmentData as TimelineItemData,
    })
  }

  const handleDeleteInvestment = async (id: string) => {
    try {
      await deleteInvestmentMutation.mutateAsync(id)
    } catch (error) {
      console.error('Failed to delete investment:', error)
    }
  }

  // ========== CPF Handlers ==========
  const handleAddCpf = () => {
    setCpfModalState({ isOpen: true, mode: 'create' })
  }

  // Edit CPF - use FinancialFormModal for per-item editing (like investments)
  const handleEditCpf = (_item: TimelineItem) => {
    setCpfModalState({ isOpen: true, mode: cpfAccount ? 'edit' : 'create' })
  }

  // Delete CPF - use existing asset delete flow
  const handleDeleteCpf = async (id: string) => {
    if (!confirm('Are you sure you want to delete this CPF account? This cannot be undone.')) return
    try {
      await deleteCpfAccountMutation.mutateAsync(id)
    } catch (error) {
      console.error('Failed to delete CPF account:', error)
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

  // Tax modal - use context directly so Header button can control it
  const taxModeContext = useTaxModeOptional()
  const isTaxModalOpen = taxModeContext?.isTaxModeEnabled ?? false
  const closeTaxModal = taxModeContext?.disableTaxMode

  // ========== Render ==========
  return (
    <>
      <div
        id="financial-data-section"
        className="flex flex-col bg-transparent text-white h-full"
        onClick={(e) => {
          if (selectedItemId && (e.target as HTMLElement).closest('[data-line-item]') === null) {
            setSelectedItemId(null)
          }
        }}
      >
        <Header
          selectedYear={selectedYear}
          onSelectYear={onSelectYear}
          selectedCalendarMonth={selectedMonth}
          onSelectMonth={onSelectMonth}
          anchorAbsoluteYear={anchorYear}
          anchorCalendarMonth={anchorMonth}
          resolution={resolution}
          timelineYears={timelineYears}
          timelineMonths={timelineMonths}
          isTimelineLoading={isTimelineLoading}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          compact={compact}
        />

        {/* Cashflow cards - always visible */}
        <div className={clsx(
          'flex-1 overflow-auto',
          compact ? 'px-4 py-4' : 'px-6 py-6'
        )}>
            <div className={clsx('flex h-full flex-col', compact ? 'gap-4' : 'gap-6')}>
              <div className={clsx(
                'grid',
                compact ? 'grid-cols-1 gap-3' : 'gap-4 lg:grid-cols-2'
              )}>
                {(Object.keys(categoryConfig) as FinancialCategory[]).filter((key) => key !== 'investment').map((key) => (
                  <ResizableCard key={key} id={key} isCollapsed={cardCollapseStates[key]}>
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
                    investmentAssets={key === 'asset' ? investmentAssets : undefined}
                    cpfAssets={key === 'asset' ? cpfAssets : undefined}
                    propertySnapshots={(key === 'asset' || key === 'liability') ? propertySnapshots : undefined}
                    cpfContributionsRaw={key === 'income' ? cpfContributionsRaw : undefined}
                    hasInvestmentsSection={key === 'income' ? hasInvestmentsSection : false}
                    monthlyInvestments={key === 'income' ? monthlyInvestments : 0}
                    onAddInvestment={key === 'asset' ? handleAddInvestment : undefined}
                    onAddCpf={key === 'asset' ? handleAddCpf : undefined}
                    onEditInvestment={key === 'asset' ? handleEditInvestment : undefined}
                    onDeleteInvestment={key === 'asset' ? handleDeleteInvestment : undefined}
                    onManageAllocations={key === 'income' ? handleManageAllocations : undefined}
                    investmentAllocations={key === 'income' ? investmentAllocations : undefined}
                    investments={key === 'income' ? investmentAssets : undefined}
                    onEditAllocation={key === 'income' ? handleEditAllocation : undefined}
                    onDeleteAllocation={key === 'income' ? handleDeleteAllocation : undefined}
                    onDeleteDebtRepayment={key === 'expense' ? handleDeleteDebtRepayment : undefined}
                    onEditCpf={key === 'asset' ? handleEditCpf : undefined}
                    onDeleteCpf={key === 'asset' ? handleDeleteCpf : undefined}
                    groupItemsByCategory={groupItemsByCategory}
                    compact={compact}
                    onCollapseChange={(isCollapsed) =>
                      setCardCollapseStates((prev) => ({ ...prev, [key]: isCollapsed }))
                    }
                  />
                  </ResizableCard>
                ))}
              </div>

              <SummaryCards
                netWorth={getNetWorthForYear()}
                annualSavings={getAnnualSavingsForYear()}
                hasV2Data={hasV2Data}
                timelineMonthV2={timelineMonthV2}
                compact={compact}
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
        selectedMonth={selectedMonth}
        selectedYearLabel={formatYearLabel(selectedYear)}
        anchorYear={anchorYear ?? undefined}
        onDelete={
          modalState.mode === 'edit' && getItemId(modalState.data) ? handleModalDelete : undefined
        }
        onStop={
          modalState.mode === 'edit' && getItemId(modalState.data)
            ? modalState.type === EXPENSE_ENTITY
              ? handleModalStopExpense
              : modalState.type === ASSET_ENTITY
                ? handleModalStopAsset
                : modalState.type === LIABILITY_ENTITY
                  ? handleModalStopLiability
                  : modalState.type === INCOME_ENTITY
                    ? handleModalStopIncome
                    : modalState.type === INVESTMENT_ENTITY
                      ? handleModalStopInvestment
                      : undefined
            : undefined
        }
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
      <CpfAccountFormModal
        isOpen={cpfModalState.isOpen}
        mode={cpfModalState.mode}
        cpfAccount={cpfAccount}
        onClose={() => setCpfModalState({ isOpen: false, mode: 'edit' })}
        onCreate={async (payload) => {
          await createCpfAccountMutation.mutateAsync(payload)
        }}
        onSave={async (id, updates) => {
          await updateCpfAccountMutation.mutateAsync({ id, updates })
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
      <DeleteConfirmationModal
        isOpen={debtRepaymentDeleteState.isOpen}
        onCancel={() => setDebtRepaymentDeleteState({ isOpen: false, item: null, deleteMode: 'stop', isDeleting: false })}
        onConfirm={handleConfirmDebtRepaymentDelete}
        isDeleting={debtRepaymentDeleteState.isDeleting}
        deleteMode={debtRepaymentDeleteState.deleteMode}
        onDeleteModeChange={(mode) => setDebtRepaymentDeleteState(prev => ({ ...prev, deleteMode: mode }))}
        selectedYearLabel={formatYearLabel(selectedYear)}
        selectedYear={selectedYear}
        selectedMonth={selectedMonth}
        anchorYear={anchorYear}
      />
      <TaxModeModal
        isOpen={isTaxModalOpen}
        onClose={() => closeTaxModal?.()}
      />
    </>
  )
}
