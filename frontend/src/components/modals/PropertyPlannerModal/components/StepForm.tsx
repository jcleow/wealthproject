"use client"

import type { MortgageInputs } from '@/types/property'
import type { Asset, Liability } from '@/types/financial'
import { calculateMortgage } from '@/utils/mortgage-calculations'
import { StepOne } from './StepOne'
import { InterestSection } from './InterestSection'
import { IncomeSection } from './IncomeSection'
import type { OverrideFlags } from '../hooks'

interface StepFormProps {
  inputs: MortgageInputs
  onChange: (field: keyof MortgageInputs, value: string | number) => void
  calculation: ReturnType<typeof calculateMortgage>
  selectedAssetId: string
  assets: Asset[]
  selectedLiabilityId: string
  liabilities: Liability[]
  liabilityInput: string
  onChangeLiabilityInput: (value: string) => void
  onLiabilityFocus: () => void
  onLiabilityBlur: () => void
  overrideFlags?: OverrideFlags
}

export function StepForm({
  inputs,
  onChange,
  calculation,
  selectedAssetId,
  assets,
  selectedLiabilityId: _selectedLiabilityId,
  liabilities,
  liabilityInput,
  onChangeLiabilityInput,
  onLiabilityFocus,
  onLiabilityBlur,
  overrideFlags,
}: StepFormProps) {
  return (
    <div className="space-y-6">
      <StepOne
        inputs={inputs}
        onChange={onChange}
        selectedAssetId={selectedAssetId}
        assets={assets}
        liabilities={liabilities}
        liabilityInput={liabilityInput}
        onChangeLiabilityInput={onChangeLiabilityInput}
        onLiabilityFocus={onLiabilityFocus}
        onLiabilityBlur={onLiabilityBlur}
        overrideFlags={overrideFlags}
      />
      <div className="border-t border-white/10" />
      <InterestSection inputs={inputs} onChange={onChange} />
      <div className="border-t border-white/10" />
      <IncomeSection inputs={inputs} calculation={calculation} onChange={onChange} />
    </div>
  )
}
