"use client"

import { useState, useCallback } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { IconPicker } from '@/components/modals/ScenarioEventModal/components/IconPicker'
import { Input } from '@/components/ui/input'
import { CustomSelect } from '@/components/ui/CustomSelect'
import {
  ArrowLeft,
  Home,
  Check,
  Plus,
  X,
  Trash2,
  Pencil,
  Loader2,
} from 'lucide-react'

import type {
  PropertyType,
  PropertyScenario,
} from '@/app/property-planner/types'

import { LucideIcon } from '@/app/property-planner/components'
import { formatCurrency } from '@/app/property-planner/hooks'
import { defaultInputsByType } from '@/app/property-planner/hooks/constants'
import { propertyOptions } from '../constants'

interface ScenarioListProps {
  scenarios: PropertyScenario[]
  onEditScenario: (scenario: PropertyScenario) => void
  onDeleteScenario: (id: string) => void
  onToggleInclude: (id: string) => void
  onAddScenario: (scenario: PropertyScenario) => void
  isEmbedded: boolean
  isLoading?: boolean
}

function getDefaultSaleInputs(loanStartMonth: string, propertyPrice: number) {
  const startDate = new Date(loanStartMonth + '-01')
  startDate.setFullYear(startDate.getFullYear() + 10)
  const { DEFAULT_SALE_FEES } = require('@/app/property-planner/hooks/constants')
  return {
    expectedSaleDate: startDate.toISOString().slice(0, 7),
    expectedSalePrice: Math.round(propertyPrice * 1.3),
    fees: DEFAULT_SALE_FEES.map((f: any) => ({ ...f })),
    // Sale proceeds destinations - null by default (user selects)
    borrower1CpfRefundAccountId: null,
    borrower2CpfRefundAccountId: null,
    netCashProceedsAccountId: null,
  }
}

export function ScenarioList({
  scenarios,
  onEditScenario,
  onDeleteScenario,
  onToggleInclude,
  onAddScenario,
  isEmbedded,
  isLoading = false,
}: ScenarioListProps) {
  const [isCreatingNew, setIsCreatingNew] = useState(false)
  const [newRowName, setNewRowName] = useState('')
  const [newRowType, setNewRowType] = useState<PropertyType>('hdb-resale')
  const [newRowIcon, setNewRowIcon] = useState('home')
  const [newRowIconColor, setNewRowIconColor] = useState('#6366f1')
  const [newRowIconSearch, setNewRowIconSearch] = useState('')

  const handleStartNewRow = useCallback(() => {
    setNewRowName(`Property ${scenarios.length + 1}`)
    setNewRowType('hdb-resale')
    setNewRowIcon('home')
    setNewRowIconColor('#6366f1')
    setNewRowIconSearch('')
    setIsCreatingNew(true)
  }, [scenarios.length])

  const handleConfirmNewRow = useCallback(() => {
    const price = defaultInputsByType[newRowType].propertyPrice
    const defaults = defaultInputsByType[newRowType]
    const originalLtv = defaults.loanAmount / defaults.propertyPrice
    const newLoanAmount = Math.floor(price * originalLtv)

    const newScenario: PropertyScenario = {
      id: `scenario-${Date.now()}`,
      name: newRowName || `Property ${scenarios.length + 1}`,
      propertyType: newRowType,
      inputs: { ...defaults, propertyPrice: price, valuationPrice: price, loanAmount: newLoanAmount },
      saleInputs: getDefaultSaleInputs(defaults.loanStartMonth, price),
      isIncluded: true,
      createdAt: Date.now(),
      purchaseIcon: newRowIcon,
      purchaseIconColor: newRowIconColor,
      saleIcon: 'banknote',
      saleIconColor: '#10b981',
    }
    onAddScenario(newScenario)
    setIsCreatingNew(false)
    setNewRowName('')
  }, [newRowName, newRowType, newRowIcon, newRowIconColor, scenarios.length, onAddScenario])

  const handleCancelNewRow = useCallback(() => {
    setIsCreatingNew(false)
    setNewRowName('')
  }, [])

  return (
    <motion.div
      key="selection"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, y: -20 }}
      className={cn("mx-auto px-6", isEmbedded ? "max-w-5xl py-8" : "max-w-6xl py-16")}
    >
      {!isEmbedded && (
        <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.05 }} className="mb-12">
          <Link href="/dashboard" className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-300 transition-colors text-sm font-medium">
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
        </motion.div>
      )}

      {!isEmbedded && (
        <div className="mb-8">
          <motion.h1 className="text-3xl md:text-4xl font-semibold text-white mb-2 tracking-tight" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            Property Scenarios
          </motion.h1>
          <motion.p className="text-sm text-slate-500" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
            Create and compare different property purchase scenarios
          </motion.p>
        </div>
      )}

      <motion.div className="space-y-2" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
          </div>
        ) : scenarios.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-sm text-slate-500 mb-4">No property scenarios yet</p>
            <p className="text-xs text-slate-600">Create your first scenario to start planning</p>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-4 px-4 pb-1">
              <span className="text-[10px] uppercase tracking-wider text-slate-600 font-medium w-5 text-center" title="Include in timeline projections">Active</span>
            </div>
            {scenarios.map((scenario, index) => {
          const option = propertyOptions.find(o => o.id === scenario.propertyType)
          return (
            <motion.div
              key={scenario.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.05 * index }}
              className={cn(
                "group flex items-center gap-4 p-4 rounded-xl border transition-all cursor-pointer",
                scenario.isIncluded ? "bg-white/[0.03] border-white/[0.08] hover:bg-white/[0.05]" : "bg-white/[0.01] border-white/[0.04] opacity-60 hover:opacity-80"
              )}
              onClick={() => onEditScenario(scenario)}
            >
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onToggleInclude(scenario.id) }}
                className={cn(
                  "w-5 h-5 rounded border-2 flex items-center justify-center transition-colors shrink-0",
                  scenario.isIncluded ? "bg-emerald-500 border-emerald-500" : "bg-transparent border-slate-600 hover:border-slate-500"
                )}
              >
                {scenario.isIncluded && <Check className="w-3 h-3 text-white" />}
              </button>

              {scenario.purchaseIcon ? (
                <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: scenario.purchaseIconColor || '#6366f1' }}>
                  <LucideIcon name={scenario.purchaseIcon} className="w-5 h-5 text-white" />
                </div>
              ) : (
                <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center shrink-0 bg-gradient-to-br", option?.color || 'from-slate-500/20 to-slate-600/5')}>
                  <span className={option?.accentColor || 'text-slate-400'}>{option?.icon || <Home className="w-5 h-5" />}</span>
                </div>
              )}

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-sm font-medium text-white truncate">{scenario.name}</span>
                  <span className={cn("text-xs px-2 py-0.5 rounded-md", option?.accentColor || 'text-slate-400', "bg-white/[0.04]")}>{option?.title}</span>
                </div>
                <div className="text-xs text-slate-500">
                  {formatCurrency(scenario.inputs.propertyPrice)} · {scenario.inputs.loanTermYears}yr loan
                </div>
              </div>

              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button type="button" onClick={(e) => { e.stopPropagation(); onEditScenario(scenario) }} className="p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors">
                  <Pencil className="w-4 h-4" />
                </button>
                <button type="button" onClick={(e) => { e.stopPropagation(); onDeleteScenario(scenario.id) }} className="p-2 rounded-lg hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )
        })}
          </>
        )}

        <AnimatePresence>
          {isCreatingNew && (
            <motion.div
              initial={{ opacity: 0, height: 0, overflow: 'hidden' }}
              animate={{ opacity: 1, height: 'auto', overflow: 'visible' }}
              exit={{ opacity: 0, height: 0, overflow: 'hidden' }}
              transition={{ overflow: { delay: 0.15 } }}
            >
              <div className="flex items-center gap-3 p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5">
                <IconPicker
                  iconName={newRowIcon}
                  iconColor={newRowIconColor}
                  searchQuery={newRowIconSearch}
                  onIconChange={setNewRowIcon}
                  onColorChange={setNewRowIconColor}
                  onSearchChange={setNewRowIconSearch}
                />
                <Input
                  type="text"
                  value={newRowName}
                  onChange={(e) => setNewRowName(e.target.value)}
                  placeholder="Scenario name"
                  className="w-40 rounded-lg bg-white/[0.05] border-white/[0.1] text-white text-sm py-2 px-3 focus:border-emerald-500/50 placeholder:text-slate-500"
                  autoFocus
                />
                <CustomSelect
                  value={newRowType}
                  onChange={(value) => {
                    const type = value as PropertyType
                    setNewRowType(type)
                  }}
                  options={propertyOptions.map(option => ({ value: option.id, label: option.title }))}
                  className="w-44"
                />
                <div className="flex items-center gap-1 ml-auto">
                  <button type="button" onClick={handleConfirmNewRow} className="p-2 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 transition-colors">
                    <Check className="w-4 h-4" />
                  </button>
                  <button type="button" onClick={handleCancelNewRow} className="p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {!isCreatingNew && !isLoading && (
          <motion.button
            type="button"
            onClick={handleStartNewRow}
            className="w-full flex items-center justify-center gap-2 p-4 rounded-xl border border-dashed border-white/[0.08] text-slate-500 hover:text-slate-300 hover:border-white/[0.15] hover:bg-white/[0.02] transition-all"
            whileHover={{ scale: 1.005 }}
            whileTap={{ scale: 0.995 }}
          >
            <Plus className="w-4 h-4" />
            <span className="text-sm font-medium">Add Property Scenario</span>
          </motion.button>
        )}
      </motion.div>
    </motion.div>
  )
}
