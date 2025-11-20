import { Asset } from '@/types/financial'
import { FinancialFormModal, FinancialFormModalProps } from './FinancialFormModal'

type AssetModalProps = Omit<FinancialFormModalProps, 'type' | 'data' | 'onSave'> & {
  data?: Asset
  onSave: (data: Asset, mode: 'create' | 'edit') => void
}

export function AssetModal(props: AssetModalProps) {
  return (
    <FinancialFormModal
      {...props}
      type="asset"
      data={props.data}
      onSave={props.onSave}
    />
  )
}
