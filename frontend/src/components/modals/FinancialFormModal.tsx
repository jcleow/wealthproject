import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '../ui/sheet'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Textarea } from '../ui/textarea'
import type { Asset, Income, Liability, Expense } from '../../types/financial'

type FinancialDataType = 'asset' | 'income' | 'liability' | 'expense'

interface FinancialFormModalProps {
  type: FinancialDataType
  mode: 'create' | 'edit'
  data?: Asset | Income | Liability | Expense
  isOpen: boolean
  onClose: () => void
  onSave: (data: any) => void
}

const commonFields = z.object({
  name: z.string().min(1, 'Name is required'),
  category: z.string().min(1, 'Category is required'),
  notes: z.string().optional(),
})

const assetFormSchema = commonFields.extend({
  currentValue: z.number().min(0, 'Value must be positive'),
  annualGrowthRate: z.number().min(-100).max(100),
})

const incomeFormSchema = z.object({
  source: z.string().min(1, 'Source is required'),
  amount: z.number().positive('Amount must be positive'),
  frequency: z.enum(['weekly', 'biweekly', 'monthly', 'quarterly', 'yearly']),
  category: z.string().min(1, 'Category is required'),
  notes: z.string().optional(),
})

const liabilityFormSchema = commonFields.extend({
  currentBalance: z.number().min(0, 'Balance must be positive'),
  interestRateApr: z.number().min(0).max(100),
  minimumPayment: z.number().min(0),
})

const expenseFormSchema = z.object({
  payee: z.string().min(1, 'Payee is required'),
  amount: z.number().positive('Amount must be positive'),
  frequency: z.enum(['weekly', 'biweekly', 'monthly', 'quarterly', 'yearly']),
  category: z.string().min(1, 'Category is required'),
  notes: z.string().optional(),
})

const getSchema = (type: FinancialDataType) => {
  switch (type) {
    case 'asset': return assetFormSchema
    case 'income': return incomeFormSchema
    case 'liability': return liabilityFormSchema
    case 'expense': return expenseFormSchema
    default: return commonFields
  }
}

const getDefaultValues = (type: FinancialDataType, data?: any) => {
  if (data) return data

  switch (type) {
    case 'asset':
      return {
        name: '',
        category: '',
        currentValue: 0,
        annualGrowthRate: 7.0,
        notes: '',
      }
    case 'income':
      return {
        source: '',
        amount: 0,
        frequency: 'monthly',
        category: '',
        notes: '',
      }
    case 'liability':
      return {
        name: '',
        category: '',
        currentBalance: 0,
        interestRateApr: 4.5,
        minimumPayment: 0,
        notes: '',
      }
    case 'expense':
      return {
        payee: '',
        amount: 0,
        frequency: 'monthly',
        category: '',
        notes: '',
      }
    default:
      return {}
  }
}

export function FinancialFormModal({
  type,
  mode,
  data,
  isOpen,
  onClose,
  onSave
}: FinancialFormModalProps) {
  const schema = getSchema(type)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: getDefaultValues(type, data),
  })

  const onSubmit = async (formData: any) => {
    const newData = {
      ...formData,
      id: data?.id || Date.now().toString(),
      updatedAt: new Date().toISOString(),
    }
    onSave(newData)
    reset()
    onClose()
  }

  const getTitle = () => {
    const action = mode === 'create' ? 'Add' : 'Edit'
    const entityName = type.charAt(0).toUpperCase() + type.slice(1)
    return `${action} ${entityName}`
  }

  const getDescription = () => {
    switch (type) {
      case 'asset': return 'Add assets like savings accounts, investments, or property'
      case 'income': return 'Add income sources like salary, freelance, or investments'
      case 'liability': return 'Add debts and financial obligations you owe'
      case 'expense': return 'Add regular expenses and spending'
      default: return 'Add your financial information'
    }
  }

  const renderFormFields = () => {
    switch (type) {
      case 'asset':
        return (
          <>
            <div className="grid gap-2">
              <label className="text-sm font-medium">Asset Name</label>
              <Input {...register('name')} placeholder="e.g., Savings Account" />
              {errors.name && <p className="text-sm text-red-500">{errors.name.message as string}</p>}
            </div>

            <div className="grid gap-2">
              <label className="text-sm font-medium">Category</label>
              <Input {...register('category')} placeholder="e.g., Cash, Investment" />
              {errors.category && <p className="text-sm text-red-500">{errors.category.message as string}</p>}
            </div>

            <div className="grid gap-2">
              <label className="text-sm font-medium">Current Value ($)</label>
              <Input
                {...register('currentValue', { valueAsNumber: true })}
                type="number"
                step="0.01"
                placeholder="0.00"
              />
              {errors.currentValue && <p className="text-sm text-red-500">{errors.currentValue.message as string}</p>}
            </div>

            <div className="grid gap-2">
              <label className="text-sm font-medium">Annual Growth Rate (%)</label>
              <Input
                {...register('annualGrowthRate', { valueAsNumber: true })}
                type="number"
                step="0.1"
                placeholder="7.0"
              />
              {errors.annualGrowthRate && <p className="text-sm text-red-500">{errors.annualGrowthRate.message as string}</p>}
            </div>
          </>
        )

      case 'income':
        return (
          <>
            <div className="grid gap-2">
              <label className="text-sm font-medium">Income Source</label>
              <Input {...register('source')} placeholder="e.g., Primary Job" />
              {errors.source && <p className="text-sm text-red-500">{errors.source.message as string}</p>}
            </div>

            <div className="grid gap-2">
              <label className="text-sm font-medium">Amount ($)</label>
              <Input
                {...register('amount', { valueAsNumber: true })}
                type="number"
                step="0.01"
                placeholder="0.00"
              />
              {errors.amount && <p className="text-sm text-red-500">{errors.amount.message as string}</p>}
            </div>

            <div className="grid gap-2">
              <label className="text-sm font-medium">Frequency</label>
              <select {...register('frequency')} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option value="weekly">Weekly</option>
                <option value="biweekly">Bi-weekly</option>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="yearly">Yearly</option>
              </select>
              {errors.frequency && <p className="text-sm text-red-500">{errors.frequency.message as string}</p>}
            </div>

            <div className="grid gap-2">
              <label className="text-sm font-medium">Category</label>
              <Input {...register('category')} placeholder="e.g., Salary, Freelance" />
              {errors.category && <p className="text-sm text-red-500">{errors.category.message as string}</p>}
            </div>
          </>
        )

      case 'liability':
        return (
          <>
            <div className="grid gap-2">
              <label className="text-sm font-medium">Liability Name</label>
              <Input {...register('name')} placeholder="e.g., Credit Card" />
              {errors.name && <p className="text-sm text-red-500">{errors.name.message as string}</p>}
            </div>

            <div className="grid gap-2">
              <label className="text-sm font-medium">Category</label>
              <Input {...register('category')} placeholder="e.g., Credit Card, Loan" />
              {errors.category && <p className="text-sm text-red-500">{errors.category.message as string}</p>}
            </div>

            <div className="grid gap-2">
              <label className="text-sm font-medium">Current Balance ($)</label>
              <Input
                {...register('currentBalance', { valueAsNumber: true })}
                type="number"
                step="0.01"
                placeholder="0.00"
              />
              {errors.currentBalance && <p className="text-sm text-red-500">{errors.currentBalance.message as string}</p>}
            </div>

            <div className="grid gap-2">
              <label className="text-sm font-medium">Interest Rate APR (%)</label>
              <Input
                {...register('interestRateApr', { valueAsNumber: true })}
                type="number"
                step="0.1"
                placeholder="4.5"
              />
              {errors.interestRateApr && <p className="text-sm text-red-500">{errors.interestRateApr.message as string}</p>}
            </div>

            <div className="grid gap-2">
              <label className="text-sm font-medium">Minimum Payment ($)</label>
              <Input
                {...register('minimumPayment', { valueAsNumber: true })}
                type="number"
                step="0.01"
                placeholder="0.00"
              />
              {errors.minimumPayment && <p className="text-sm text-red-500">{errors.minimumPayment.message as string}</p>}
            </div>
          </>
        )

      case 'expense':
        return (
          <>
            <div className="grid gap-2">
              <label className="text-sm font-medium">Payee</label>
              <Input {...register('payee')} placeholder="e.g., Grocery Store" />
              {errors.payee && <p className="text-sm text-red-500">{errors.payee.message as string}</p>}
            </div>

            <div className="grid gap-2">
              <label className="text-sm font-medium">Amount ($)</label>
              <Input
                {...register('amount', { valueAsNumber: true })}
                type="number"
                step="0.01"
                placeholder="0.00"
              />
              {errors.amount && <p className="text-sm text-red-500">{errors.amount.message as string}</p>}
            </div>

            <div className="grid gap-2">
              <label className="text-sm font-medium">Frequency</label>
              <select {...register('frequency')} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option value="weekly">Weekly</option>
                <option value="biweekly">Bi-weekly</option>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="yearly">Yearly</option>
              </select>
              {errors.frequency && <p className="text-sm text-red-500">{errors.frequency.message as string}</p>}
            </div>

            <div className="grid gap-2">
              <label className="text-sm font-medium">Category</label>
              <Input {...register('category')} placeholder="e.g., Food, Transportation" />
              {errors.category && <p className="text-sm text-red-500">{errors.category.message as string}</p>}
            </div>
          </>
        )

      default:
        return null
    }
  }

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-[400px] sm:w-[540px]">
        <SheetHeader>
          <SheetTitle>{getTitle()}</SheetTitle>
          <SheetDescription>{getDescription()}</SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-6">
          {renderFormFields()}

          <div className="grid gap-2">
            <label className="text-sm font-medium">Notes (Optional)</label>
            <Textarea {...register('notes')} placeholder="Additional notes..." rows={3} />
          </div>

          <SheetFooter className="gap-2 pt-6">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : mode === 'create' ? 'Add' : 'Update'}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}