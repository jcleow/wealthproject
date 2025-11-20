import { Liability } from '@/types/financial'
import { FinancialFormModal, FinancialFormModalProps } from './FinancialFormModal'

type LiabilityModalProps = Omit<FinancialFormModalProps, 'type' | 'data' | 'onSave'> & {
  data?: Liability
  onSave: (data: Liability, mode: 'create' | 'edit') => void
}

export function LiabilityModal(props: LiabilityModalProps) {
  return (
    <FinancialFormModal
      {...props}
      type="liability"
      data={props.data}
      onSave={props.onSave}
    />
  )
}
