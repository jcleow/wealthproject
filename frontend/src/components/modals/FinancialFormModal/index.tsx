import { Trash2, ChevronDown } from 'lucide-react'
import { useState, useEffect } from 'react'

import { Modal } from '@/components/ui/Modal'
import { CustomSelect } from '@/components/ui/CustomSelect'
import { PersonSelector } from '@/components/ui/PersonSelector'
import { FundSourceSelector } from './components/FundSourceSelector'
import { type Frequency, type Asset } from '@/types/financial'
import { formatCurrency } from '@/lib/format'

import type { FinancialFormModalProps } from './types'
import {
  MORTGAGE_CATEGORY,
  getCategoryOptions,
  getNormalizedCategory,
  getModalTitle,
  getModalIcon,
  getNameLabel,
  getAmountLabel,
} from './config'
import { MinPaymentWarningModal } from './MinPaymentWarningModal'
import { DeleteConfirmationModal } from './DeleteConfirmationModal'
import { CpfForm } from './CpfForm'
import { useFinancialForm } from './hooks/useFinancialForm'

// Re-export types for consumers
export type { FinancialDataType, FinancialFormValues, FinancialFormModalProps, CpfFormValues, TimelineItemData } from './types'

// Useful life preset options
const USEFUL_LIFE_OPTIONS = [
  { value: '', label: 'No limit (perpetual)' },
  { value: '99', label: '99-year lease' },
  { value: '999', label: '999-year lease' },
  { value: 'custom', label: 'Custom...' },
]

export function FinancialFormModal({
  type,
  mode,
  data,
  isOpen,
  onClose,
  onSave,
  onDelete,
  onStop,
  selectedYear,
  selectedMonth,
  selectedYearLabel,
  anchorYear,
}: FinancialFormModalProps) {
  const [showUsefulLife, setShowUsefulLife] = useState(false)
  const [usefulLifePreset, setUsefulLifePreset] = useState('')

  // Auto-expand useful life section when editing asset with lease data
  useEffect(() => {
    if (!isOpen) {
      setShowUsefulLife(false)
      setUsefulLifePreset('')
      return
    }
    if (type === 'asset' && mode === 'edit' && data) {
      const asset = data as Asset
      // Show useful life section if terminal value is set (indicates leasehold/depreciating asset)
      if (asset.terminalValue != null) {
        setShowUsefulLife(true)
      }
    }
  }, [isOpen, type, mode, data])

  const form = useFinancialForm({
    type,
    mode,
    data,
    isOpen,
    onSave,
    onDelete,
    onStop,
    onClose,
    selectedYear,
    selectedMonth,
    anchorYear,
  })

  const normalizedCategory = getNormalizedCategory(type)
  const categoryOptions = getCategoryOptions(type)

  // Category select options (include current category if not in list)
  const categorySelectOptions =
    categoryOptions.some((opt) => opt.value === form.formData.category) || !form.formData.category
      ? categoryOptions
      : [...categoryOptions, { value: form.formData.category, label: form.formData.category }]

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={form.isBusy ? undefined : onClose}
        overlayClassName="bg-black/60"
        className={`overflow-hidden
w-full max-w-md
mx-4
rounded-2xl border border-white/[0.08]
bg-gradient-to-br from-[#0a0a0a] to-[#0f0f0f]
shadow-xl`}
      >
        {/* Header */}
        <div className={`p-6
border-b border-white/[0.06]
bg-gradient-to-r from-[#0a0a0a] to-[#0f0f0f]`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`flex items-center justify-center
h-10 w-10
rounded-full
bg-gradient-to-br from-emerald-500 to-emerald-600
shadow-lg shadow-emerald-500/20`}>
                <span className="text-lg text-white">{getModalIcon(normalizedCategory)}</span>
              </div>
              <div className="flex flex-col gap-1">
                <h2 className="text-lg font-semibold text-white">
                  {getModalTitle(mode, normalizedCategory)}
                </h2>
                <span className="text-xs font-medium text-emerald-400">
                  {selectedYearLabel ?? (selectedYear === 0 ? 'BASE' : `Year ${selectedYear ?? 0}`)}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {mode === 'edit' && data && form.getDataId() && onDelete && (
                <button
                  type="button"
                  className={`flex items-center justify-center
h-8 w-8
rounded-lg
hover:bg-red-600/20
text-gray-400 hover:text-red-400
transition-all`}
                  disabled={form.isBusy}
                  onClick={form.handleDelete}
                  title="Delete item"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
              <button
                type="button"
                className={`flex items-center justify-center
h-8 w-8
rounded-lg
hover:bg-white/10
text-gray-400 hover:text-white
transition-all`}
                disabled={form.isBusy}
                onClick={onClose}
                title="Close"
              >
                ✕
              </button>
            </div>
          </div>
        </div>

        {/* Form */}
        <form className="space-y-5 p-6" onSubmit={form.handleSubmit}>
          {/* CPF mode toggle for assets */}
          {type === 'asset' && mode === 'create' && (
            <div className="flex items-center gap-2 rounded-lg bg-white/[0.02] p-1">
              <button
                type="button"
                className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-all ${
                  !form.isCpfMode
                    ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-500/20'
                    : 'text-gray-300 hover:text-white'
                }`}
                onClick={() => form.setIsCpfMode(false)}
              >
                Standard asset
              </button>
              <button
                type="button"
                className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-all ${
                  form.isCpfMode
                    ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-500/20'
                    : 'text-gray-300 hover:text-white'
                }`}
                onClick={() => form.setIsCpfMode(true)}
              >
                CPF balances
              </button>
            </div>
          )}

          {/* Standard form fields */}
          {!form.isCpfMode && (
            <>
              {/* Name field */}
              <div>
                <label className="mb-2.5 block text-sm font-medium text-gray-200">
                  {getNameLabel(normalizedCategory)}
                </label>
                <input
                  type="text"
                  required
                  className={`w-full
px-3.5 py-2.5 placeholder-gray-500
rounded-lg border border-white/[0.08] focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/20
bg-white/[0.03] focus:bg-white/[0.05]
text-white
transition-all`}
                  placeholder="Enter name"
                  value={form.formData.name}
                  onChange={(e) => form.updateFormField('name', e.target.value)}
                />
              </div>

              {/* Person field for incomes - required */}
              {normalizedCategory === 'incomes' && (
                <div>
                  <label className="mb-2.5 block text-sm font-medium text-gray-200">
                    Person <span className="text-red-400">*</span>
                  </label>
                  <PersonSelector
                    value={form.formData.personId}
                    onChange={(personId) => form.updateFormField('personId', personId)}
                    placeholder="Select person"
                    required
                    error={form.formErrors.personId}
                  />
                  {form.formErrors.personId ? (
                    <p className="mt-1 text-xs text-red-400">
                      Please select a person for this income
                    </p>
                  ) : (
                    <p className="mt-1 text-xs text-gray-500">
                      Who earns this income?
                    </p>
                  )}
                </div>
              )}

              {/* Amount and frequency row */}
              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="mb-2.5 block text-sm font-medium text-gray-200">
                    {getAmountLabel(normalizedCategory)}
                  </label>
                  <input
                    inputMode="decimal"
                    required
                    className={`w-full
px-3.5 py-2.5 placeholder-gray-500
rounded-lg border border-white/[0.08] focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/20
bg-white/[0.03] focus:bg-white/[0.05]
text-white
transition-all`}
                    placeholder={`e.g., ${formatCurrency(100000)}`}
                    value={form.formData.amount}
                    onChange={(e) => form.updateFormField('amount', form.formatNumberInput(e.target.value))}
                    onBlur={() => form.updateFormField('amount', form.formatNumberInput(form.formData.amount))}
                  />
                </div>

                {/* Frequency for income/expense */}
                {(normalizedCategory === 'incomes' || normalizedCategory === 'expenses') && (
                  <div>
                    <label className="mb-2.5 block text-sm font-medium text-gray-200">Frequency</label>
                    <CustomSelect
                      value={form.formData.frequency}
                      onChange={(val) => form.updateFormField('frequency', val as Frequency)}
                      options={[
                        { value: 'one_time', label: 'One-time' },
                        { value: 'monthly', label: 'Monthly' },
                        { value: 'annual', label: 'Annual' },
                      ]}
                      className="w-full"
                    />
                  </div>
                )}

                {/* Growth rate for assets/investments */}
                {(normalizedCategory === 'assets' || normalizedCategory === 'investments') && (
                  <div>
                    <label className="mb-2.5 block text-sm font-medium text-gray-200">
                      Annual Growth Rate (%)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      className={`w-full
px-3.5 py-2.5 placeholder-gray-500
rounded-lg border border-white/[0.08] focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/20
bg-white/[0.03] focus:bg-white/[0.05]
text-white
transition-all`}
                      placeholder="7.0"
                      value={form.formData.annualGrowthRate}
                      onChange={(e) => form.updateFormField('annualGrowthRate', e.target.value)}
                    />
                  </div>
                )}
              </div>

              {/* Useful Life section for assets (collapsible) */}
              {normalizedCategory === 'assets' && (
                <div className="rounded-lg border border-white/[0.06] bg-white/[0.02]">
                  <button
                    type="button"
                    className="flex w-full items-center justify-between p-3 text-left"
                    onClick={() => setShowUsefulLife(!showUsefulLife)}
                  >
                    <span className="text-sm font-medium text-gray-300">
                      Useful Life / Lease Settings
                      {form.formData.usefulLifeYears && (
                        <span className="ml-2 text-emerald-400">
                          ({form.formData.usefulLifeYears} years)
                        </span>
                      )}
                    </span>
                    <ChevronDown
                      className={`h-4 w-4 text-gray-400 transition-transform ${
                        showUsefulLife ? 'rotate-180' : ''
                      }`}
                    />
                  </button>

                  {showUsefulLife && (
                    <div className="space-y-4 border-t border-white/[0.06] p-3">
                      <p className="text-xs text-gray-500">
                        For leasehold properties, set when the lease expires. The asset value will become the terminal value at expiry.
                      </p>

                      {/* Lease Type Preset */}
                      <div>
                        <label className="mb-2 block text-sm font-medium text-gray-300">
                          Lease Type
                        </label>
                        <CustomSelect
                          value={usefulLifePreset}
                          onChange={(val) => {
                            setUsefulLifePreset(val as string)
                            if (val === '') {
                              form.updateFormField('usefulLifeYears', '')
                              form.updateFormField('terminalValue', '')
                            } else if (val === '99' || val === '999') {
                              form.updateFormField('usefulLifeYears', val)
                              form.updateFormField('terminalValue', '0')
                            }
                            // For 'custom', let user fill in values
                          }}
                          options={USEFUL_LIFE_OPTIONS}
                          className="w-full"
                        />
                      </div>

                      {/* Custom fields shown when preset is selected */}
                      {(usefulLifePreset === '99' || usefulLifePreset === '999' || usefulLifePreset === 'custom') && (
                        <>
                          <div className="grid grid-cols-2 gap-3">
                            {/* Lease Start Year */}
                            <div>
                              <label className="mb-2 block text-sm font-medium text-gray-300">
                                Lease Start Year
                              </label>
                              <input
                                type="number"
                                min="1900"
                                max="2100"
                                className={`w-full
px-3 py-2 placeholder-gray-400
rounded-lg border border-gray-600 focus:border-emerald-500 focus:outline-none
bg-gray-700
text-white`}
                                placeholder="e.g., 1990"
                                value={form.formData.leaseStartYear}
                                onChange={(e) => form.updateFormField('leaseStartYear', e.target.value)}
                              />
                            </div>

                            {/* Useful Life Years */}
                            <div>
                              <label className="mb-2 block text-sm font-medium text-gray-300">
                                Lease Duration (years)
                              </label>
                              <input
                                type="number"
                                min="1"
                                max="999"
                                className={`w-full
px-3 py-2 placeholder-gray-400
rounded-lg border border-gray-600 focus:border-emerald-500 focus:outline-none
bg-gray-700
text-white`}
                                placeholder="99"
                                value={form.formData.usefulLifeYears}
                                onChange={(e) => form.updateFormField('usefulLifeYears', e.target.value)}
                                disabled={usefulLifePreset === '99' || usefulLifePreset === '999'}
                              />
                            </div>
                          </div>

                          {/* Terminal Value */}
                          <div>
                            <label className="mb-2 block text-sm font-medium text-gray-300">
                              Terminal Value at Expiry
                            </label>
                            <input
                              inputMode="decimal"
                              className={`w-full
px-3 py-2 placeholder-gray-400
rounded-lg border border-gray-600 focus:border-emerald-500 focus:outline-none
bg-gray-700
text-white`}
                              placeholder="0"
                              value={form.formData.terminalValue}
                              onChange={(e) => form.updateFormField('terminalValue', form.formatNumberInput(e.target.value))}
                            />
                            <p className="mt-1 text-xs text-gray-500">
                              Value at lease expiry. Usually 0 for standard leaseholds.
                            </p>
                          </div>

                          {/* Show calculated end year */}
                          {form.formData.leaseStartYear && form.formData.usefulLifeYears && (
                            <div className="rounded-lg bg-emerald-500/10 p-2 text-center">
                              <span className="text-sm text-emerald-400">
                                Lease expires in{' '}
                                <strong>
                                  {Number(form.formData.leaseStartYear) + Number(form.formData.usefulLifeYears)}
                                </strong>
                              </span>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Liability specific fields */}
              {normalizedCategory === 'liabilities' && (
                <div className="grid grid-cols-2 gap-3.5">
                  <div>
                    <label className="mb-2.5 block text-sm font-medium text-gray-200">
                      Interest Rate APR (%)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      className={`w-full
px-3.5 py-2.5 placeholder-gray-500
rounded-lg border border-white/[0.08] focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/20
bg-white/[0.03] focus:bg-white/[0.05]
text-white
transition-all`}
                      placeholder="4.5"
                      value={form.formData.interestRateApr}
                      onChange={(e) => form.updateFormField('interestRateApr', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="mb-2.5 block text-sm font-medium text-gray-200">
                      Min Payment
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      className={`w-full
px-3.5 py-2.5 placeholder-gray-500
rounded-lg border border-white/[0.08] focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/20
bg-white/[0.03] focus:bg-white/[0.05]
text-white
transition-all`}
                      placeholder="100"
                      value={form.formData.minimumPayment}
                      onChange={(e) => form.updateFormField('minimumPayment', e.target.value)}
                    />
                  </div>
                </div>
              )}

              {/* Growth rate for income/expense */}
              {(normalizedCategory === 'incomes' || normalizedCategory === 'expenses') && (
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-300">
                    Annual Growth Rate (%)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    className={`w-full
px-3 py-2 placeholder-gray-400
rounded-lg border border-gray-600 focus:border-emerald-500 focus:outline-none
bg-gray-700
text-white`}
                    placeholder={normalizedCategory === 'incomes' ? '3.0' : '2.0'}
                    value={form.formData.growthRate}
                    onChange={(e) => form.updateFormField('growthRate', e.target.value)}
                  />
                  <p className="mt-1 text-xs text-gray-400">
                    {normalizedCategory === 'incomes'
                      ? 'Expected annual increase in income (e.g., salary raises)'
                      : 'Expected annual increase in expenses (e.g., inflation)'}
                  </p>
                </div>
              )}

              {/* Fund source account for expenses */}
              {normalizedCategory === 'expenses' && !form.isDebtRepayment && form.cashAccounts.length > 0 && (
                <FundSourceSelector
                  value={form.formData.fundSourceAccountId}
                  onChange={(val) => form.updateFormField('fundSourceAccountId', val)}
                  cashAccounts={form.cashAccounts}
                />
              )}

              {/* Category selector */}
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-300">Category</label>
                <CustomSelect
                  value={form.formData.category}
                  onChange={(val) => form.handleCategoryChange(String(val))}
                  options={categorySelectOptions}
                  className="w-full"
                />

                {type === 'liability' && form.formData.category === '' && (
                  <button
                    type="button"
                    className={`w-full sm:w-auto
mt-2 px-3 py-2
rounded-lg border border-blue-400/70
bg-blue-500/10 hover:bg-blue-500/20
text-sm text-blue-100
transition`}
                    onClick={() => form.handleCategoryChange(MORTGAGE_CATEGORY)}
                  >
                    Default to mortgage
                  </button>
                )}
              </div>

              {/* Notes */}
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-300">
                  Notes (optional)
                </label>
                <textarea
                  rows={3}
                  className={`w-full
px-3 py-2 placeholder-gray-400
rounded-lg border border-gray-600 focus:border-emerald-500 focus:outline-none
bg-gray-700
text-white`}
                  placeholder="Add additional details"
                  value={form.formData.notes}
                  onChange={(e) => form.updateFormField('notes', e.target.value)}
                />
              </div>

              {/* Update scope selector for expenses at future months (not for debt repayments) */}
              {type === 'expense' && mode === 'edit' && form.isFutureMonth && !form.isDebtRepayment && (
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-200">Apply changes to</label>
                  <div className="flex rounded-lg bg-white/[0.03] p-1">
                    <button
                      type="button"
                      onClick={() => form.setApplyFromThisMonthOnly(true)}
                      className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-all ${
                        form.applyFromThisMonthOnly
                          ? 'bg-white/10 text-white shadow-sm'
                          : 'text-gray-500 hover:text-gray-300'
                      }`}
                    >
                      This month onwards
                    </button>
                    <button
                      type="button"
                      onClick={() => form.setApplyFromThisMonthOnly(false)}
                      className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-all ${
                        !form.applyFromThisMonthOnly
                          ? 'bg-white/10 text-white shadow-sm'
                          : 'text-gray-500 hover:text-gray-300'
                      }`}
                    >
                      From the start
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {/* CPF form */}
          {form.isCpfMode && <CpfForm fields={form.cpfFields} errors={form.cpfErrors} onChange={form.setCpfFields} />}

          {/* Footer buttons */}
          <div className="flex justify-between border-t border-gray-700 pt-4">
            <button
              type="button"
              className="px-4 py-2 text-gray-400 transition-colors hover:text-white"
              disabled={form.isBusy}
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={`px-6 py-2
rounded-lg
bg-emerald-500 hover:bg-emerald-600 disabled:bg-gray-600
text-white
transition-colors`}
              disabled={form.isBusy}
            >
              {form.isSaving ? 'Saving...' : mode === 'edit' ? 'Update' : 'Add'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Min payment warning modal */}
      <MinPaymentWarningModal
        isOpen={form.showMinPaymentWarning}
        onCancel={form.handleMinPaymentWarningCancel}
        onConfirm={form.handleMinPaymentWarningConfirm}
        isSaving={form.isSaving}
        newAmount={form.pendingPayload?.type === 'expense' ? form.pendingPayload.amount : 0}
        minPayment={form.getLinkedLiabilityMinPayment() ?? 0}
      />

      {/* Delete confirmation modal */}
      <DeleteConfirmationModal
        isOpen={form.showDeleteConfirmation}
        onCancel={form.handleDeleteConfirmationCancel}
        onConfirm={form.handleConfirmDelete}
        isDeleting={form.isDeleting}
        deleteMode={form.deleteMode}
        onDeleteModeChange={form.setDeleteMode}
        selectedYearLabel={selectedYearLabel}
        selectedYear={selectedYear}
      />
    </>
  )
}
