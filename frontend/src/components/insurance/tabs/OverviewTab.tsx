'use client'

import { useState } from 'react'
import {
  Shield,
  Stethoscope,
  HeartHandshake,
  Heart,
  CheckCircle2,
  AlertCircle,
  Circle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { CoverageStatus } from '@/types/insurance'

/**
 * OverviewTab - Insurance coverage display with view toggle on right panel
 *
 * Left: Always 4 risk categories (Life, CI, Hospitalisation, LTC)
 * Right: Toggle between:
 *   - "By Life Events": Products matrix within each category
 *   - "By Product": User's policies and their coverage
 */

type ViewMode = 'life_events' | 'by_product'
type RiskCategoryId = 'life' | 'critical_illness' | 'hospitalisation' | 'long_term_care'

// ============================================================================
// RISK CATEGORIES (Left Panel - Always shown)
// ============================================================================

interface RiskCategory {
  id: RiskCategoryId
  label: string
  shortLabel: string
  icon: typeof Shield
  products: ProductType[]
}

interface ProductType {
  id: string
  label: string
  shortLabel: string
  status: CoverageStatus
}

const riskCategories: RiskCategory[] = [
  {
    id: 'life',
    label: 'Life Protection',
    shortLabel: 'Life Protection',
    icon: Shield,
    products: [
      { id: 'term', label: 'Term Life', shortLabel: 'Term Life', status: 'covered' },
      { id: 'whole', label: 'Whole Life', shortLabel: 'Whole Life', status: 'covered' },
      { id: 'dps', label: 'Dependants\' Protection Scheme', shortLabel: 'DPS', status: 'covered' },
    ],
  },
  {
    id: 'critical_illness',
    label: 'Critical Illness',
    shortLabel: 'Critical Illness',
    icon: HeartHandshake,
    products: [
      { id: 'early_ci', label: 'Early Critical Illness', shortLabel: 'Early CI', status: 'covered' },
      { id: 'late_ci', label: 'Late-stage Critical Illness', shortLabel: 'Late CI', status: 'exposed' },
      { id: 'multi_ci', label: 'Multi-pay Critical Illness', shortLabel: 'Multi-pay', status: 'exposed' },
    ],
  },
  {
    id: 'hospitalisation',
    label: 'Hospitalisation',
    shortLabel: 'Hospitalisation',
    icon: Stethoscope,
    products: [
      { id: 'medishield', label: 'MediShield Life', shortLabel: 'MediShield Life', status: 'covered' },
      { id: 'isp', label: 'Integrated Shield Plan', shortLabel: 'ISP', status: 'covered' },
    ],
  },
  {
    id: 'long_term_care',
    label: 'Long-Term Care',
    shortLabel: 'Long-Term Care',
    icon: Heart,
    products: [
      { id: 'careshield', label: 'CareShield Life', shortLabel: 'CareShield Life', status: 'covered' },
      { id: 'supplement', label: 'Private Supplement', shortLabel: 'Supplement', status: 'exposed' },
    ],
  },
]

// ============================================================================
// PRODUCT TYPE COVERAGE (For "By Product" view)
// ============================================================================

interface CoverageItem {
  id: string
  label: string
  shortLabel: string
}

// Coverage items that each product type can provide
const coverageItemsByCategory: Record<RiskCategoryId, CoverageItem[]> = {
  life: [
    { id: 'death', label: 'Death', shortLabel: 'Death' },
    { id: 'tpd', label: 'Total Permanent Disability', shortLabel: 'TPD' },
    { id: 'terminal', label: 'Terminal Illness', shortLabel: 'Terminal' },
  ],
  critical_illness: [
    { id: 'early_stage', label: 'Early Stage', shortLabel: 'Early' },
    { id: 'late_stage', label: 'Late Stage', shortLabel: 'Late' },
    { id: 'multi_claim', label: 'Multi-claim', shortLabel: 'Multi' },
  ],
  hospitalisation: [
    { id: 'inpatient', label: 'Inpatient', shortLabel: 'Inpatient' },
    { id: 'outpatient', label: 'Outpatient', shortLabel: 'Outpatient' },
    { id: 'surgical', label: 'Surgical', shortLabel: 'Surgical' },
  ],
  long_term_care: [
    { id: 'severe_disability', label: 'Severe Disability', shortLabel: 'Severe' },
    { id: 'monthly_payout', label: 'Monthly Payout', shortLabel: 'Payout' },
  ],
}

// What each product type typically covers
const productTypeCoverage: Record<string, Record<string, CoverageStatus>> = {
  // Life Protection products
  term: { death: 'covered', tpd: 'covered', terminal: 'covered' },
  whole: { death: 'covered', tpd: 'covered', terminal: 'partial' },
  dps: { death: 'covered', tpd: 'covered', terminal: 'exposed' },
  // Critical Illness products
  early_ci: { early_stage: 'covered', late_stage: 'exposed', multi_claim: 'exposed' },
  late_ci: { early_stage: 'exposed', late_stage: 'covered', multi_claim: 'exposed' },
  multi_ci: { early_stage: 'covered', late_stage: 'covered', multi_claim: 'covered' },
  // Hospitalisation products
  medishield: { inpatient: 'covered', outpatient: 'partial', surgical: 'covered' },
  isp: { inpatient: 'covered', outpatient: 'covered', surgical: 'covered' },
  // Long-Term Care products
  careshield: { severe_disability: 'covered', monthly_payout: 'covered' },
  supplement: { severe_disability: 'covered', monthly_payout: 'covered' },
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function OverviewTab() {
  const [viewMode, setViewMode] = useState<ViewMode>('life_events')
  const [selectedCategory, setSelectedCategory] = useState<RiskCategoryId | null>(null)

  // Calculate status for each risk category
  const getCategoryOverallStatus = (category: RiskCategory): CoverageStatus => {
    const exposedCount = category.products.filter((p) => p.status === 'exposed').length
    const coveredCount = category.products.filter((p) => p.status === 'covered').length
    if (exposedCount === category.products.length) return 'exposed'
    if (coveredCount === category.products.length) return 'covered'
    return 'partial'
  }

  const statusCounts = riskCategories.reduce(
    (acc, cat) => {
      const status = getCategoryOverallStatus(cat)
      acc[status]++
      return acc
    },
    { covered: 0, partial: 0, exposed: 0 }
  )

  return (
    <div className="space-y-6">
      {/* Main Dashboard - Side by Side */}
      <div className="grid gap-6 lg:grid-cols-[1fr_1px_1fr]">
        {/* LEFT: Risk Categories (Always shown) */}
        <div>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-white">Risk Categories</h2>
              <p className="text-sm text-slate-400">
                <span className="text-white font-medium">{statusCounts.covered}</span> of{' '}
                {riskCategories.length} fully covered
              </p>
            </div>
            <div className="flex gap-1.5">
              <StatusDot status="covered" count={statusCounts.covered} />
              <StatusDot status="partial" count={statusCounts.partial} />
              <StatusDot status="exposed" count={statusCounts.exposed} />
            </div>
          </div>

          {/* Categories Grid */}
          <div className="grid grid-cols-2 gap-4 justify-items-center">
            {riskCategories.map((category) => (
              <CategoryBlock
                key={category.id}
                icon={category.icon}
                label={category.shortLabel}
                status={getCategoryOverallStatus(category)}
                isSelected={selectedCategory === category.id}
                onClick={() => setSelectedCategory(selectedCategory === category.id ? null : category.id)}
              />
            ))}
          </div>
        </div>

        {/* Center Divider */}
        <div className="hidden lg:block bg-white/[0.06]" />

        {/* RIGHT: View Toggle + Matrix */}
        <div>
          {/* View Toggle */}
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-white">
                {viewMode === 'life_events' ? 'Coverage by Products' : 'Your Policies'}
              </h2>
              <p className="text-sm text-slate-400">
                {viewMode === 'life_events' ? 'Products within each risk category' : 'What each policy covers'}
              </p>
            </div>
            <div className="flex items-center gap-1 p-0.5 bg-white/[0.02] border border-white/[0.06] rounded-lg">
              <button
                type="button"
                onClick={() => setViewMode('life_events')}
                className={cn(
                  'px-2.5 py-1 rounded-md text-xs font-medium transition-all duration-200',
                  viewMode === 'life_events'
                    ? 'bg-white/[0.1] text-white'
                    : 'text-slate-500 hover:text-slate-300'
                )}
              >
                By Life Events
              </button>
              <button
                type="button"
                onClick={() => setViewMode('by_product')}
                className={cn(
                  'px-2.5 py-1 rounded-md text-xs font-medium transition-all duration-200',
                  viewMode === 'by_product'
                    ? 'bg-white/[0.1] text-white'
                    : 'text-slate-500 hover:text-slate-300'
                )}
              >
                By Product
              </button>
            </div>
          </div>

          {/* Matrix Content */}
          {viewMode === 'life_events' ? (
            <LifeEventsMatrix selectedCategory={selectedCategory} />
          ) : (
            <ByProductMatrix selectedCategory={selectedCategory} />
          )}

          {/* Legend */}
          <div className="mt-6 flex items-center justify-center gap-4 border-t border-white/[0.06] pt-3">
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <span className="h-3 w-3 rounded bg-emerald-500" />
              Covered
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <span className="h-3 w-3 rounded bg-amber-500" />
              Partial
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <span className="h-3 w-3 rounded bg-slate-600" />
              Not covered
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// LIFE EVENTS MATRIX (Products within categories)
// ============================================================================

function LifeEventsMatrix({ selectedCategory }: { selectedCategory: RiskCategoryId | null }) {
  return (
    <div className="space-y-3">
      {riskCategories.map((category) => (
        <div
          key={category.id}
          className={cn(
            'transition-all duration-200',
            selectedCategory === category.id && 'scale-[1.02]'
          )}
        >
          <div className="text-xs font-medium text-slate-300 mb-2">{category.label}</div>
          <div className="flex gap-3">
            {category.products.map((product) => (
              <ProductSquare
                key={product.id}
                label={product.shortLabel}
                status={product.status}
                title={product.label}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

// ============================================================================
// BY PRODUCT MATRIX (Product types × Coverage items matrix)
// ============================================================================

// Map CI product ownership to coverage status
const ciProductToCoverageItem: Record<string, string> = {
  early_ci: 'early_stage',
  late_ci: 'late_stage',
  multi_ci: 'multi_claim',
}

function ByProductMatrix({ selectedCategory }: { selectedCategory: RiskCategoryId | null }) {
  return (
    <div className="space-y-5">
      {riskCategories.map((category) => {
        const coverageItems = coverageItemsByCategory[category.id]

        // Special case: Critical Illness consolidates to single row
        const isCriticalIllness = category.id === 'critical_illness'

        return (
          <div
            key={category.id}
            className={cn(
              'transition-all duration-200',
              selectedCategory === category.id && 'scale-[1.01]'
            )}
          >
            <div className="text-xs font-medium text-slate-300 mb-3">{category.label}</div>

            {/* Matrix table */}
            <div className="overflow-x-auto">
              <table>
                {/* Column headers (coverage items) */}
                <thead>
                  <tr>
                    <th className="text-left pb-3 pr-6 w-32" />
                    {coverageItems.map((item) => (
                      <th
                        key={item.id}
                        className="text-center pb-3 px-2 text-xs font-medium text-slate-400 w-16"
                      >
                        {item.shortLabel}
                      </th>
                    ))}
                  </tr>
                </thead>
                {/* Rows */}
                <tbody>
                  {isCriticalIllness ? (
                    // Single consolidated row for CI
                    <tr>
                      <td className="text-sm font-medium text-slate-300 pr-6 py-2 whitespace-nowrap">
                        CI
                      </td>
                      {coverageItems.map((item) => {
                        // Find if user has a product that covers this item
                        const coveringProduct = category.products.find(
                          (p) => ciProductToCoverageItem[p.id] === item.id
                        )
                        const status = coveringProduct?.status || 'exposed'
                        return (
                          <td key={item.id} className="text-center px-2 py-2">
                            <StatusCell status={status} title={`Critical Illness - ${item.label}`} />
                          </td>
                        )
                      })}
                    </tr>
                  ) : (
                    // Standard rows for other categories
                    category.products.map((product) => {
                      const coverage = productTypeCoverage[product.id] || {}
                      return (
                        <tr key={product.id}>
                          <td className="text-sm font-medium text-slate-300 pr-6 py-2 whitespace-nowrap">
                            {product.shortLabel}
                          </td>
                          {coverageItems.map((item) => (
                            <td key={item.id} className="text-center px-2 py-2">
                              <StatusCell
                                status={coverage[item.id] || 'exposed'}
                                title={`${product.label} - ${item.label}`}
                              />
                            </td>
                          ))}
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function StatusCell({ status, title }: { status: CoverageStatus; title?: string }) {
  const statusColors = {
    covered: 'bg-emerald-500',
    partial: 'bg-amber-500',
    exposed: 'bg-slate-600',
  }

  return (
    <div
      className={cn(
        'h-8 w-8 mx-auto rounded-md transition-all cursor-default',
        statusColors[status]
      )}
      title={title}
    />
  )
}

// ============================================================================
// SHARED COMPONENTS
// ============================================================================

function CategoryBlock({
  icon: Icon,
  label,
  status,
  isSelected,
  onClick,
}: {
  icon: typeof Shield
  label: string
  status: CoverageStatus
  isSelected: boolean
  onClick: () => void
}) {
  const statusColors = {
    covered: {
      bg: 'bg-emerald-500/15 hover:bg-emerald-500/25',
      border: 'border-emerald-500/30',
      icon: 'text-emerald-400',
    },
    partial: {
      bg: 'bg-amber-500/15 hover:bg-amber-500/25',
      border: 'border-amber-500/30',
      icon: 'text-amber-400',
    },
    exposed: {
      bg: 'bg-slate-500/15 hover:bg-slate-500/25',
      border: 'border-slate-500/30',
      icon: 'text-slate-400',
    },
  }

  const colors = statusColors[status]
  const StatusIcon =
    status === 'covered'
      ? CheckCircle2
      : status === 'partial'
        ? AlertCircle
        : Circle

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'relative flex flex-col items-center justify-center rounded-2xl border p-4 transition-all h-[180px] w-[180px]',
        colors.bg,
        isSelected ? 'border-white/30 ring-2 ring-white/20' : colors.border
      )}
    >
      <Icon className={cn('h-16 w-16 mb-3', colors.icon)} />
      <span className="text-base font-medium text-white text-center leading-tight">
        {label}
      </span>
      <StatusIcon
        className={cn(
          'absolute top-3 right-3 h-6 w-6',
          status === 'covered' && 'text-emerald-400',
          status === 'partial' && 'text-amber-400',
          status === 'exposed' && 'text-slate-400'
        )}
      />
    </button>
  )
}

function ProductSquare({
  label,
  status,
  title,
  size = 'md',
}: {
  label: string
  status: CoverageStatus
  title?: string
  size?: 'sm' | 'md'
}) {
  const statusColors = {
    covered: 'bg-emerald-500/80 hover:bg-emerald-500',
    partial: 'bg-amber-500/80 hover:bg-amber-500',
    exposed: 'bg-slate-600/80 hover:bg-slate-600',
  }

  return (
    <div
      className={cn(
        'flex items-center justify-center rounded-lg font-medium transition-all cursor-default text-center',
        statusColors[status],
        size === 'sm' ? 'h-[56px] w-[56px] text-[11px] leading-tight' : 'h-[80px] w-[80px] text-xs leading-tight'
      )}
      title={title}
    >
      <span className="text-white px-1">{label}</span>
    </div>
  )
}

function StatusDot({ status, count }: { status: CoverageStatus; count: number }) {
  if (count === 0) return null

  const colors = {
    covered: 'bg-emerald-500',
    partial: 'bg-amber-500',
    exposed: 'bg-slate-500',
  }

  return (
    <div className="flex items-center gap-1">
      <span className={cn('h-2 w-2 rounded-full', colors[status])} />
      <span className="text-xs text-slate-500">{count}</span>
    </div>
  )
}
