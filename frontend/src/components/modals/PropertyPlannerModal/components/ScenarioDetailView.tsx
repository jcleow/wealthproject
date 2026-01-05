"use client"

import { useMemo } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import {
  Home,
  Banknote,
  TrendingUp,
} from 'lucide-react'

import type {
  PropertyType,
  PropertyScenario,
  MortgageInputs,
  SaleInputs,
  FeeItem,
  AppreciationPeriod,
  LoanSegment,
  StaggeredDownpayment,
  GrantItem,
} from '@/app/property-planner/types'

import type { ComputedValues } from '@/types/propertyPlannerV2'
import type { ProjectedCpfAccount } from './MortgageForm/types'

import {
  calculateMortgage,
  calculateSaleProceeds,
} from '@/app/property-planner/hooks'

import { useCpfAccountsQuery } from '@/hooks/queries/useCpfQuery'
import { useCashAccountsQuery } from '@/hooks/queries/useCashAccountsQuery'

import { propertyOptions } from '../constants'
import { MortgageForm } from './MortgageForm'
import { SaleParametersForm } from './SaleParametersForm'
import { TabbedResultsPanel, type ResultsTab } from './TabbedResultsPanel'

interface ScenarioDetailViewProps {
  selectedType: PropertyType
  inputs: MortgageInputs
  saleInputs: SaleInputs
  activeResultsTab: ResultsTab
  editingScenario: PropertyScenario | null
  /** @deprecated Now handled in modal header - kept for standalone page */
  editingScenarioName?: string
  /** @deprecated Now handled in modal header - kept for standalone page */
  editingScenarioPurchaseIcon?: string
  /** @deprecated Now handled in modal header - kept for standalone page */
  editingScenarioPurchaseIconColor?: string
  /** @deprecated Now handled in modal header - kept for standalone page */
  editingScenarioPurchaseIconSearch?: string
  /** Sale milestone icon name */
  editingScenarioSaleIcon?: string
  /** Sale milestone icon color */
  editingScenarioSaleIconColor?: string
  /** Sale milestone icon search query */
  editingScenarioSaleIconSearch?: string
  isEmbedded: boolean
  /** @deprecated Use modal footer hasChanges indicator instead */
  hasChanges?: boolean
  computedValues?: ComputedValues | null
  onInputChange: (field: keyof MortgageInputs, value: number | string | string[] | FeeItem[] | AppreciationPeriod[] | LoanSegment[] | StaggeredDownpayment | GrantItem[] | null) => void
  onSaleInputChange: (field: keyof SaleInputs, value: string | number | boolean | FeeItem[] | null) => void
  onActiveResultsTabChange: (tab: ResultsTab) => void
  /** @deprecated Now handled in modal header - kept for standalone page */
  onSelectedTypeChange?: (type: PropertyType) => void
  /** @deprecated Now handled in modal header - kept for standalone page */
  onEditingScenarioNameChange?: (name: string) => void
  /** @deprecated Now handled in modal header - kept for standalone page */
  onEditingScenarioPurchaseIconChange?: (icon: string) => void
  /** @deprecated Now handled in modal header - kept for standalone page */
  onEditingScenarioPurchaseIconColorChange?: (color: string) => void
  /** @deprecated Now handled in modal header - kept for standalone page */
  onEditingScenarioPurchaseIconSearchChange?: (search: string) => void
  /** Callback to update sale icon */
  onEditingScenarioSaleIconChange?: (icon: string) => void
  /** Callback to update sale icon color */
  onEditingScenarioSaleIconColorChange?: (color: string) => void
  /** Callback to update sale icon search query */
  onEditingScenarioSaleIconSearchChange?: (search: string) => void
  /** @deprecated Now handled in modal footer */
  onSaveAndClose?: () => void
  onBack: () => void
  /** @deprecated Now handled in modal header */
  onJumpToDate?: (year: number, month: number) => void
}

export function ScenarioDetailView({
  selectedType,
  inputs,
  saleInputs,
  activeResultsTab,
  editingScenario,
  editingScenarioSaleIcon,
  editingScenarioSaleIconColor,
  editingScenarioSaleIconSearch,
  isEmbedded,
  computedValues = null,
  onInputChange,
  onSaleInputChange,
  onActiveResultsTabChange,
  onEditingScenarioSaleIconChange,
  onEditingScenarioSaleIconColorChange,
  onEditingScenarioSaleIconSearchChange,
  onBack,
}: ScenarioDetailViewProps) {
  const selectedOption = propertyOptions.find(o => o.id === selectedType)
  const calculation = useMemo(() => calculateMortgage(inputs), [inputs])
  const saleResult = useMemo(() =>
    calculateSaleProceeds(saleInputs, inputs, calculation.amortization, calculation.monthlyPayment),
    [saleInputs, inputs, calculation.amortization, calculation.monthlyPayment]
  )

  // Fetch CPF and cash accounts for sale proceeds destination selection
  const { data: cpfAccounts = [] } = useCpfAccountsQuery()
  const { data: cashAccounts = [] } = useCashAccountsQuery()

  // Transform CPF accounts to the format expected by the sale form
  const projectedCpfAccounts: ProjectedCpfAccount[] = useMemo(() => {
    return cpfAccounts.map((account) => ({
      id: account.id,
      personId: account.personId,
      personName: account.personName,
      oaBalance: account.oaBalance,
    }))
  }, [cpfAccounts])

  return (
    <motion.div
      key="detail"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={cn("mx-auto px-6 py-8", isEmbedded ? "max-w-6xl" : "max-w-7xl")}
    >
      {/* Breadcrumb navigation for standalone page */}
      {!isEmbedded && (
        <div className="flex items-center gap-2 text-sm mb-6">
          <Link href="/dashboard" className="text-slate-500 hover:text-slate-300 transition-colors font-medium">Dashboard</Link>
          <span className="text-slate-700">/</span>
          <button type="button" onClick={onBack} className="text-slate-500 hover:text-slate-300 transition-colors font-medium">Property Scenarios</button>
          <span className="text-slate-700">/</span>
          <span className="text-slate-300 font-medium">{editingScenario?.name || selectedOption?.title}</span>
        </div>
      )}

      <div className="flex items-center mb-6">
        <div className="inline-flex items-center gap-1 p-1 bg-white/[0.03] border border-white/[0.06] rounded-lg">
          <button
            type="button"
            onClick={() => onActiveResultsTabChange('purchase')}
            className={cn(
              "px-4 py-1.5 rounded-md text-sm font-medium transition-all duration-200 flex items-center gap-2",
              activeResultsTab === 'purchase' ? "bg-white/10 text-white" : "text-slate-500 hover:text-slate-300"
            )}
          >
            <Home className="w-3.5 h-3.5" />
            Purchase
          </button>
          <button
            type="button"
            onClick={() => onActiveResultsTabChange('sale')}
            className={cn(
              "px-4 py-1.5 rounded-md text-sm font-medium transition-all duration-200 flex items-center gap-2",
              activeResultsTab === 'sale' ? "bg-white/10 text-white" : "text-slate-500 hover:text-slate-300"
            )}
          >
            <Banknote className="w-3.5 h-3.5" />
            Sale
          </button>
          <button
            type="button"
            onClick={() => onActiveResultsTabChange('appreciation')}
            className={cn(
              "px-4 py-1.5 rounded-md text-sm font-medium transition-all duration-200 flex items-center gap-2",
              activeResultsTab === 'appreciation' ? "bg-white/10 text-white" : "text-slate-500 hover:text-slate-300"
            )}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            Projection
          </button>
        </div>
      </div>

      <div className={cn(
        "grid gap-6",
        activeResultsTab === 'appreciation' ? "grid-cols-1" : "grid-cols-1 lg:grid-cols-2"
      )}>
        {activeResultsTab !== 'appreciation' && (
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-xl p-6">
            <AnimatePresence mode="wait">
              {activeResultsTab === 'purchase' ? (
                <motion.div key="mortgage-form" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} transition={{ duration: 0.2 }}>
                  <MortgageForm inputs={inputs} onChange={onInputChange} propertyType={selectedType} scenarioId={editingScenario?.id} />
                </motion.div>
              ) : activeResultsTab === 'sale' ? (
                <motion.div key="sale-form" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} transition={{ duration: 0.2 }}>
                  <SaleParametersForm
                    saleInputs={saleInputs}
                    onSaleInputChange={onSaleInputChange}
                    saleResult={saleResult}
                    propertyPrice={inputs.propertyPrice}
                    propertyType={selectedType}
                    borrowerType={inputs.borrowerType}
                    cpfAccounts={projectedCpfAccounts}
                    cashAccounts={cashAccounts}
                    saleIcon={editingScenarioSaleIcon}
                    saleIconColor={editingScenarioSaleIconColor}
                    saleIconSearch={editingScenarioSaleIconSearch}
                    onSaleIconChange={onEditingScenarioSaleIconChange}
                    onSaleIconColorChange={onEditingScenarioSaleIconColorChange}
                    onSaleIconSearchChange={onEditingScenarioSaleIconSearchChange}
                  />
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        )}

        <TabbedResultsPanel
          calculation={calculation}
          propertyType={selectedType}
          saleInputs={saleInputs}
          saleResult={saleResult}
          propertyPrice={inputs.propertyPrice}
          activeTab={activeResultsTab}
          absdRate={inputs.absdRate}
          appreciationPeriods={inputs.appreciationPeriods}
          onPeriodsChange={(periods) => onInputChange('appreciationPeriods', periods)}
          purchaseDate={inputs.loanStartMonth}
          borrowerType={inputs.borrowerType}
          cpfAccounts={projectedCpfAccounts}
          cashAccounts={cashAccounts}
          computedValues={computedValues}
        />
      </div>
    </motion.div>
  )
}
