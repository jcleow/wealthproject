import { Income } from '@/types/financial'
import { FinancialFormModal, FinancialFormModalProps } from './FinancialFormModal'

type IncomeModalProps = Omit<FinancialFormModalProps, 'type' | 'data' | 'onSave'> & {
  data?: Income
  onSave: (data: Income, mode: 'create' | 'edit') => void
}

export function IncomeModal(props: IncomeModalProps) {
  return (
    <FinancialFormModal
      {...props}
      type="income"
      data={props.data}
      onSave={props.onSave}
    />
  )
}
