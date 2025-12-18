"use client"

import { useState, useCallback } from 'react'
import { Modal } from '@/components/ui/Modal'
import { calculateMortgage } from '@/utils/mortgage-calculations'

import { usePropertyPlannerForm, useAssetLiabilitySelector, areInputsValid } from './hooks'
import { ModalHeader, StepForm, MortgageOverview, FormFooter } from './components'
import { handleSaveLink, handleApplyPlan, saveDraft } from './logic'

interface PropertyPlannerModalProps {
  isOpen: boolean
  onClose: () => void
  prefill?: { scenarioId?: string; assetId?: string; liabilityId?: string }
}

export function PropertyPlannerModal({ isOpen, onClose, prefill }: PropertyPlannerModalProps) {
  const [helperMessage, setHelperMessage] = useState<string | null>(null)
  const [, setIsLinking] = useState(false)

  const form = usePropertyPlannerForm({ isOpen, prefill })
  const selector = useAssetLiabilitySelector({
    isOpen,
    selectedType: form.selectedType,
    prefillScenario: form.prefillScenario,
    setInputs: form.setInputs,
    setOverrideFlags: form.setOverrideFlags,
    setLocationDraft: form.setLocationDraft,
    setHelperMessage,
  })

  const calculation = calculateMortgage(form.inputs)
  const msrWithinLimit = calculation.msrRatio <= 0.3

  const formattedLoanEnd = (() => {
    if (!calculation.loanEndDate) return ''
    const [year, month] = calculation.loanEndDate.split('-').map(Number)
    if (!year || !month) return calculation.loanEndDate
    return new Date(year, month - 1).toLocaleDateString('en-SG', { year: 'numeric', month: 'short' })
  })()

  const handleGenerate = useCallback(() => {
    if (!areInputsValid(form.inputs)) return
    form.setIsComplete(true)
  }, [form])

  const handleEdit = useCallback(() => form.setIsComplete(false), [form])

  const handleSavePlan = useCallback(async () => {
    if (!selector.selectedAssetId || !selector.selectedLiabilityId) {
      setHelperMessage('Select both asset and loan before saving.')
      return
    }
    if (!areInputsValid(form.inputs)) {
      setHelperMessage('Fill in property price, loan, tenure, and rates before saving.')
      return
    }
    form.setIsSavingDraft(true)
    setIsLinking(true)
    try {
      await handleSaveLink({
        assetInput: selector.assetInput,
        liabilityInput: selector.liabilityInput,
        inputs: form.inputs,
        selectedAssetId: selector.selectedAssetId,
        selectedLiabilityId: selector.selectedLiabilityId,
        assets: selector.assets,
        liabilities: selector.liabilities,
        selectedType: form.selectedType,
        locationDraft: form.locationDraft,
        calculation,
        setAssets: selector.setAssets,
        setLiabilities: selector.setLiabilities,
        setSelectedAssetId: selector.setSelectedAssetId,
        setSelectedLiabilityId: selector.setSelectedLiabilityId,
        setScenarioId: form.setScenarioId,
        setHelperMessage,
      })
      form.setLastSavedAt(saveDraft(form.inputs))
    } finally {
      form.setIsSavingDraft(false)
      setIsLinking(false)
    }
  }, [form, selector, calculation])

  const handleApply = useCallback(async () => {
    setIsLinking(true)
    try {
      await handleApplyPlan({
        selectedAssetId: selector.selectedAssetId,
        selectedLiabilityId: selector.selectedLiabilityId,
        inputs: form.inputs,
        assets: selector.assets,
        liabilities: selector.liabilities,
        calculation,
        setHelperMessage,
        onClose,
      })
    } finally {
      setIsLinking(false)
    }
  }, [form.inputs, selector, calculation, onClose])

  const handleClose = useCallback(() => {
    form.setIsComplete(false)
    onClose()
  }, [form, onClose])

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      overlayClassName="bg-black/90"
      className={`relative
overflow-hidden
h-[96vh] w-full max-w-6xl
mx-4
rounded-3xl border border-white/10
bg-gray-950
shadow-[0_25px_80px_rgba(0,0,0,0.6)]`}
    >
      <ModalHeader
        assetInput={selector.assetInput}
        onAssetInputChange={selector.handleAssetInput}
        onAssetFocus={selector.handleAssetFocus}
        onAssetBlur={selector.handleAssetBlur}
        assets={selector.assets}
        selectedAssetId={selector.selectedAssetId}
        onClose={handleClose}
      />

      <div className="flex h-full overflow-hidden">
        <div
          className={`flex-1 overflow-auto
px-6 py-6 sm:px-8
bg-gradient-to-b from-[#0f1a2f] via-[#0c1528] to-[#0a1122]`}
          style={{ paddingBottom: '10rem' }}
        >
          {!form.isComplete ? (
            <div className="space-y-6">
              <section className={`p-6
rounded-3xl border border-white/10
bg-[#030712]
shadow-xl`}>
                <StepForm
                  inputs={form.inputs}
                  onChange={form.handleInputChange}
                  calculation={calculation}
                  selectedAssetId={selector.selectedAssetId}
                  assets={selector.assets}
                  selectedLiabilityId={selector.selectedLiabilityId}
                  liabilities={selector.liabilities}
                  liabilityInput={selector.liabilityInput}
                  onChangeLiabilityInput={selector.handleLiabilityInput}
                  onLiabilityFocus={selector.handleLiabilityFocus}
                  onLiabilityBlur={selector.handleLiabilityBlur}
                  overrideFlags={form.overrideFlags}
                />
                <FormFooter
                  lastSavedAt={form.lastSavedAt}
                  isSavingDraft={form.isSavingDraft}
                  onSavePlan={handleSavePlan}
                  onGenerate={handleGenerate}
                  isValid={form.hasValidInputs}
                  assetInput={selector.assetInput}
                  liabilityInput={selector.liabilityInput}
                  scenarioId={form.scenarioId}
                  helperMessage={helperMessage}
                />
              </section>
            </div>
          ) : (
            <MortgageOverview
              calculation={calculation}
              onEdit={handleEdit}
              loanAmount={form.inputs.loanAmount}
              formattedLoanEnd={formattedLoanEnd}
              msrWithinLimit={msrWithinLimit}
              handleApplyPlan={handleApply}
            />
          )}
        </div>
      </div>
    </Modal>
  )
}
