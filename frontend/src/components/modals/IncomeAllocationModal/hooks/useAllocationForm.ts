"use client"

import { useState, useEffect, useCallback } from 'react'
import type { IncomeAllocation, CreateIncomeAllocationPayload } from '@/api/financial/incomes'
import {
  useIncomeAllocationsQuery,
  useCreateIncomeAllocationMutation,
  useUpdateIncomeAllocationMutation,
  useDeleteIncomeAllocationMutation,
} from '@/hooks/queries/useIncomeAllocationsQuery'

export type AllocationType = 'percentage' | 'fixed'
export type TargetType = 'cash_account' | 'investment'

export interface UseAllocationFormOptions {
  incomeId: string
  isOpen: boolean
  initialEditAllocationId?: string
}

export interface UseAllocationFormReturn {
  // Data
  allocations: IncomeAllocation[]
  allocationsLoading: boolean
  displayAllocations: IncomeAllocation[]

  // Form state
  editingAllocation: IncomeAllocation | null
  isAddingNew: boolean
  targetType: TargetType
  targetId: string
  allocationType: AllocationType
  allocationValue: string
  searchTerm: string

  // Computed
  totalPercentageAllocated: number
  totalFixedAllocated: number
  isFormValid: boolean
  isSaving: boolean
  isEditingSingleAllocation: boolean

  // Actions
  setTargetType: (type: TargetType) => void
  setTargetId: (id: string) => void
  setAllocationType: (type: AllocationType) => void
  setAllocationValue: (value: string) => void
  setSearchTerm: (term: string) => void
  setEditingAllocation: (allocation: IncomeAllocation | null) => void
  setIsAddingNew: (adding: boolean) => void
  resetForm: () => void
  handleSave: () => Promise<void>
  handleDelete: (allocation: IncomeAllocation) => Promise<void>
}

export function useAllocationForm({
  incomeId,
  isOpen,
  initialEditAllocationId,
}: UseAllocationFormOptions): UseAllocationFormReturn {
  const { data: allocations = [], isLoading: allocationsLoading } = useIncomeAllocationsQuery(incomeId)

  const createMutation = useCreateIncomeAllocationMutation()
  const updateMutation = useUpdateIncomeAllocationMutation()
  const deleteMutation = useDeleteIncomeAllocationMutation()

  const [editingAllocation, setEditingAllocation] = useState<IncomeAllocation | null>(null)
  const [isAddingNew, setIsAddingNew] = useState(false)
  const [hasAutoSelected, setHasAutoSelected] = useState(false)

  const [targetType, setTargetType] = useState<TargetType>('investment')
  const [targetId, setTargetId] = useState('')
  const [allocationType, setAllocationType] = useState<AllocationType>('percentage')
  const [allocationValue, setAllocationValue] = useState('')
  const [searchTerm, setSearchTerm] = useState('')

  const resetForm = useCallback(() => {
    setTargetType('investment')
    setTargetId('')
    setAllocationType('percentage')
    setAllocationValue('')
    setSearchTerm('')
    setEditingAllocation(null)
    setIsAddingNew(false)
  }, [])

  useEffect(() => {
    if (!isOpen) {
      resetForm()
      setHasAutoSelected(false)
    }
  }, [isOpen, resetForm])

  // Auto-select the allocation for editing when initialEditAllocationId is provided
  useEffect(() => {
    if (isOpen && initialEditAllocationId && allocations.length > 0 && !hasAutoSelected) {
      const targetAllocation = allocations.find((a) => a.id === initialEditAllocationId)
      if (targetAllocation) {
        setEditingAllocation(targetAllocation)
        setHasAutoSelected(true)
      }
    }
  }, [isOpen, initialEditAllocationId, allocations, hasAutoSelected])

  useEffect(() => {
    if (editingAllocation) {
      if (editingAllocation.targetInvestmentId) {
        setTargetType('investment')
        setTargetId(editingAllocation.targetInvestmentId)
      } else if (editingAllocation.targetCashAccountId) {
        setTargetType('cash_account')
        setTargetId(editingAllocation.targetCashAccountId)
      }
      setAllocationType(editingAllocation.allocationType)
      setAllocationValue(editingAllocation.allocationValue.toString())
    }
  }, [editingAllocation])

  const handleSave = useCallback(async () => {
    if (!targetId || !allocationValue) return

    const payload: CreateIncomeAllocationPayload = {
      allocationType,
      allocationValue,
      ...(targetType === 'investment'
        ? { targetInvestmentId: targetId }
        : { targetCashAccountId: targetId }),
    }

    if (editingAllocation) {
      await updateMutation.mutateAsync({
        incomeId,
        allocationId: editingAllocation.id,
        payload,
      })
    } else {
      await createMutation.mutateAsync({ incomeId, payload })
    }

    resetForm()
  }, [targetId, allocationValue, allocationType, targetType, editingAllocation, incomeId, updateMutation, createMutation, resetForm])

  const handleDelete = useCallback(async (allocation: IncomeAllocation) => {
    if (!confirm('Are you sure you want to delete this allocation?')) return
    await deleteMutation.mutateAsync({ incomeId, allocationId: allocation.id })
  }, [incomeId, deleteMutation])

  const displayAllocations = initialEditAllocationId
    ? allocations.filter((a) => a.id === initialEditAllocationId)
    : allocations

  const totalPercentageAllocated = allocations
    .filter((a) => a.allocationType === 'percentage')
    .reduce((sum, a) => sum + parseFloat(a.allocationValue), 0)

  const totalFixedAllocated = allocations
    .filter((a) => a.allocationType === 'fixed')
    .reduce((sum, a) => sum + parseFloat(a.allocationValue), 0)

  const isFormValid = Boolean(targetId && allocationValue && parseFloat(allocationValue) > 0)
  const isSaving = createMutation.isPending || updateMutation.isPending
  const isEditingSingleAllocation = Boolean(initialEditAllocationId)

  return {
    allocations,
    allocationsLoading,
    displayAllocations,
    editingAllocation,
    isAddingNew,
    targetType,
    targetId,
    allocationType,
    allocationValue,
    searchTerm,
    totalPercentageAllocated,
    totalFixedAllocated,
    isFormValid,
    isSaving,
    isEditingSingleAllocation,
    setTargetType,
    setTargetId,
    setAllocationType,
    setAllocationValue,
    setSearchTerm,
    setEditingAllocation,
    setIsAddingNew,
    resetForm,
    handleSave,
    handleDelete,
  }
}
