"use client"

import { useState, useEffect, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import type { IncomeAllocation, CreateIncomeAllocationPayload } from '@/api/financial/incomes'
import {
  useIncomeAllocationsQuery,
  useCreateIncomeAllocationMutation,
  useUpdateIncomeAllocationMutation,
  useDeleteIncomeAllocationMutation,
} from '@/hooks/queries/useIncomeAllocationsQuery'
import {
  allocationFormSchema,
  defaultAllocationFormValues,
  type AllocationFormData,
  type AllocationType,
  type AllocationTargetType,
} from '@/lib/validations/allocation'

// Re-export types for backward compatibility
export type { AllocationType }
export type TargetType = AllocationTargetType

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

  // React Hook Form setup
  const form = useForm<AllocationFormData>({
    resolver: zodResolver(allocationFormSchema),
    defaultValues: defaultAllocationFormValues,
  })

  const resetForm = useCallback(() => {
    form.reset(defaultAllocationFormValues)
    setEditingAllocation(null)
    setIsAddingNew(false)
  }, [form])

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

  // Hydrate form when editingAllocation changes
  useEffect(() => {
    if (editingAllocation) {
      let targetType: TargetType = 'investment'
      let targetId = ''

      if (editingAllocation.targetInvestmentId) {
        targetType = 'investment'
        targetId = editingAllocation.targetInvestmentId
      } else if (editingAllocation.targetCashAccountId) {
        targetType = 'cash_account'
        targetId = editingAllocation.targetCashAccountId
      }

      form.reset({
        targetType,
        targetId,
        allocationType: editingAllocation.allocationType as AllocationType,
        allocationValue: editingAllocation.allocationValue.toString(),
        searchTerm: '',
      })
    }
  }, [editingAllocation, form])

  // Watch form values for backward-compatible getters
  const formValues = form.watch()

  const handleSave = useCallback(async () => {
    const currentValues = form.getValues()
    if (!currentValues.targetId || !currentValues.allocationValue) return

    const payload: CreateIncomeAllocationPayload = {
      allocationType: currentValues.allocationType,
      allocationValue: currentValues.allocationValue,
      ...(currentValues.targetType === 'investment'
        ? { targetInvestmentId: currentValues.targetId }
        : { targetCashAccountId: currentValues.targetId }),
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
  }, [form, editingAllocation, incomeId, updateMutation, createMutation, resetForm])

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

  const isFormValid = Boolean(
    formValues.targetId &&
    formValues.allocationValue &&
    parseFloat(formValues.allocationValue) > 0
  )
  const isSaving = createMutation.isPending || updateMutation.isPending
  const isEditingSingleAllocation = Boolean(initialEditAllocationId)

  // Backward-compatible setters that update RHF form state
  const setTargetType = useCallback((type: TargetType) => {
    form.setValue('targetType', type, { shouldDirty: true })
  }, [form])

  const setTargetId = useCallback((id: string) => {
    form.setValue('targetId', id, { shouldDirty: true })
  }, [form])

  const setAllocationType = useCallback((type: AllocationType) => {
    form.setValue('allocationType', type, { shouldDirty: true })
  }, [form])

  const setAllocationValue = useCallback((value: string) => {
    form.setValue('allocationValue', value, { shouldDirty: true })
  }, [form])

  const setSearchTerm = useCallback((term: string) => {
    form.setValue('searchTerm', term, { shouldDirty: true })
  }, [form])

  return {
    allocations,
    allocationsLoading,
    displayAllocations,
    editingAllocation,
    isAddingNew,
    targetType: formValues.targetType,
    targetId: formValues.targetId,
    allocationType: formValues.allocationType,
    allocationValue: formValues.allocationValue,
    searchTerm: formValues.searchTerm,
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
