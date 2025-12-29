"use client"

import { useMemo } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { IconPicker } from '@/components/modals/ScenarioEventModal/components/IconPicker'
import { CustomDropdown } from '@/components/modals/ScenarioEventModal/components/CustomDropdown'
import {
  ArrowLeft,
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
} from '@/app/property-planner/types'

import type { ComputedValues } from '@/types/propertyPlannerV2'

import {
  calculateMortgage,
  calculateSaleProceeds,
} from '@/app/property-planner/hooks'

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
  editingScenarioName: string
  editingScenarioIcon: string
  editingScenarioIconColor: string
  editingScenarioIconSearch: string
  isEmbedded: boolean
  /** @deprecated Use modal footer hasChanges indicator instead */
  hasChanges?: boolean
  computedValues?: ComputedValues | null
  onInputChange: (field: keyof MortgageInputs, value: number | string | string[] | FeeItem[] | AppreciationPeriod[] | LoanSegment[] | StaggeredDownpayment | null) => void
  onSaleInputChange: (field: keyof SaleInputs, value: string | number | boolean | FeeItem[]) => void
  onActiveResultsTabChange: (tab: ResultsTab) => void
  onSelectedTypeChange: (type: PropertyType) => void
  onEditingScenarioNameChange: (name: string) => void
  onEditingScenarioIconChange: (icon: string) => void
  onEditingScenarioIconColorChange: (color: string) => void
  onEditingScenarioIconSearchChange: (search: string) => void
  onSaveAndClose: () => void
}

export function ScenarioDetailView({
  selectedType,
  inputs,
  saleInputs,
  activeResultsTab,
  editingScenario,
  editingScenarioName,
  editingScenarioIcon,
  editingScenarioIconColor,
  editingScenarioIconSearch,
  isEmbedded,
  hasChanges = false,
  computedValues = null,
  onInputChange,
  onSaleInputChange,
  onActiveResultsTabChange,
  onSelectedTypeChange,
  onEditingScenarioNameChange,
  onEditingScenarioIconChange,
  onEditingScenarioIconColorChange,
  onEditingScenarioIconSearchChange,
  onSaveAndClose,
}: ScenarioDetailViewProps) {
  const selectedOption = propertyOptions.find(o => o.id === selectedType)
  const calculation = useMemo(() => calculateMortgage(inputs), [inputs])
  const saleResult = useMemo(() =>
    calculateSaleProceeds(saleInputs, inputs, calculation.amortization, calculation.monthlyPayment),
    [saleInputs, inputs, calculation.amortization, calculation.monthlyPayment]
  )

  return (
    <motion.div
      key="detail"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={cn("mx-auto px-6 py-8", isEmbedded ? "max-w-6xl" : "max-w-7xl")}
    >
      <div className="mb-8">
        {!isEmbedded && (
          <div className="flex items-center gap-2 text-sm mb-6">
            <Link href="/dashboard" className="text-slate-500 hover:text-slate-300 transition-colors font-medium">Dashboard</Link>
            <span className="text-slate-700">/</span>
            <button type="button" onClick={onSaveAndClose} className="text-slate-500 hover:text-slate-300 transition-colors font-medium">Property Scenarios</button>
            <span className="text-slate-700">/</span>
            <span className="text-slate-300 font-medium">{editingScenario?.name || selectedOption?.title}</span>
          </div>
        )}

        <div className="flex items-center gap-4">
          <button type="button" onClick={onSaveAndClose} className="p-2 rounded-xl bg-white/[0.03] border border-white/[0.06] text-slate-400 hover:text-white hover:bg-white/[0.06] transition-all">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <IconPicker
            iconName={editingScenarioIcon}
            iconColor={editingScenarioIconColor}
            searchQuery={editingScenarioIconSearch}
            onIconChange={onEditingScenarioIconChange}
            onColorChange={onEditingScenarioIconColorChange}
            onSearchChange={onEditingScenarioIconSearchChange}
          />
          <div className="flex-1 min-w-0 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={editingScenarioName}
                onChange={(e) => onEditingScenarioNameChange(e.target.value)}
                className="text-2xl font-semibold text-white tracking-tight bg-transparent border-none outline-none focus:ring-0 placeholder:text-slate-600 hover:bg-white/[0.03] focus:bg-white/[0.05] rounded-lg px-2 py-1 -ml-2 transition-colors"
                placeholder="Scenario name"
              />
              {hasChanges && (
                <span className="text-xs text-amber-400/80 font-medium">Unsaved changes</span>
              )}
            </div>
            <CustomDropdown
              value={selectedType}
              onChange={(value) => onSelectedTypeChange(value as PropertyType)}
              options={propertyOptions.map(opt => ({
                value: opt.id,
                label: opt.title,
              }))}
              minWidth="140px"
            />
          </div>
        </div>
      </div>

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
                  <MortgageForm inputs={inputs} onChange={onInputChange} propertyType={selectedType} />
                </motion.div>
              ) : activeResultsTab === 'sale' ? (
                <motion.div key="sale-form" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} transition={{ duration: 0.2 }}>
                  <SaleParametersForm saleInputs={saleInputs} onSaleInputChange={onSaleInputChange} saleResult={saleResult} propertyPrice={inputs.propertyPrice} propertyType={selectedType} />
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
          computedValues={computedValues}
        />
      </div>
    </motion.div>
  )
}
