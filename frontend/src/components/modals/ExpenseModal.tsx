import { Expense } from '@/types/financial'
import { FinancialFormModal, FinancialFormModalProps } from './FinancialFormModal'

type ExpenseModalProps = Omit<FinancialFormModalProps, 'type' | 'data' | 'onSave'> & {
  data?: Expense
  onSave: (data: Expense, mode: 'create' | 'edit') => void
}

export function ExpenseModal(props: ExpenseModalProps) {
  return (
    <FinancialFormModal
      {...props}
      type="expense"
      data={props.data}
      onSave={props.onSave}
    />
  )
}
