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

import type { PropertyScenario } from '@/app/property-planner/types'
import type { ComputedValues } from '@/types/propertyPlannerV2'
import type { ProjectedCpfAccount } from './MortgageForm/types'

import {
  calculateMortgage,
  calculateSaleProceeds,
} from '@/app/property-planner/hooks'

import { useCpfAccountsQuery } from '@/hooks/queries/useCpfQuery'
import { useCashAccountsQuery } from '@/hooks/queries/useCashAccountsQuery'
import { usePropertyFormInputs, usePropertyFormSaleInputs } from '../hooks'

import { propertyOptions } from '../constants'
import { MortgageForm } from './MortgageForm'
import { SaleParametersForm } from './SaleParametersForm'
import { TabbedResultsPanel, type ResultsTab } from './TabbedResultsPanel'

interface ScenarioDetailViewProps {
  activeResultsTab: ResultsTab
  editingScenario: PropertyScenario | null
  /** Sale milestone icon name */
  editingScenarioSaleIcon?: string
  /** Sale milestone icon color */
  editingScenarioSaleIconColor?: string
  /** Sale milestone icon search query */
  editingScenarioSaleIconSearch?: string
  isEmbedded: boolean
  computedValues?: ComputedValues | null
  onActiveResultsTabChange: (tab: ResultsTab) => void
  /** Callback to update sale icon */
  onEditingScenarioSaleIconChange?: (icon: string) => void
  /** Callback to update sale icon color */
  onEditingScenarioSaleIconColorChange?: (color: string) => void
  /** Callback to update sale icon search query */
  onEditingScenarioSaleIconSearchChange?: (search: string) => void
  onBack: () => void
}

/**
 * ScenarioDetailView - displays the property scenario detail with forms and results.
 * Uses form context for inputs - no prop drilling needed.
 */
export function ScenarioDetailView({
  activeResultsTab,
  editingScenario,
  editingScenarioSaleIcon,
  editingScenarioSaleIconColor,
  editingScenarioSaleIconSearch,
  isEmbedded,
  computedValues = null,
  onActiveResultsTabChange,
  onEditingScenarioSaleIconChange,
  onEditingScenarioSaleIconColorChange,
  onEditingScenarioSaleIconSearchChange,
  onBack,
}: ScenarioDetailViewProps) {
  const { inputs, onChange: onInputChange, propertyType } = usePropertyFormInputs()
  const { saleInputs } = usePropertyFormSaleInputs()

  const selectedType = propertyType ?? 'hdb-resale'
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

      <div className="flex items-center justify-between mb-6">
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
        </div>

        <button
          type="button"
          onClick={() => onActiveResultsTabChange('appreciation')}
          className={cn(
            "px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2",
            "bg-white/[0.03] border border-white/[0.06]",
            activeResultsTab === 'appreciation' ? "bg-white/10 text-white border-white/10" : "text-slate-500 hover:text-slate-300 hover:bg-white/[0.05]"
          )}
        >
          <TrendingUp className="w-3.5 h-3.5" />
          Projection
        </button>
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
                  <MortgageForm propertySgId={editingScenario?.propertySgId} />
                </motion.div>
              ) : activeResultsTab === 'sale' ? (
                <motion.div key="sale-form" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} transition={{ duration: 0.2 }}>
                  <SaleParametersForm
                    saleResult={saleResult}
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
