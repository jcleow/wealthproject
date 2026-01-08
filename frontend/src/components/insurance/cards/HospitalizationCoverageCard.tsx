'use client'

import { useState } from 'react'
import {
  Building2,
  ChevronDown,
  ChevronUp,
  Info,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { HospitalizationCoverage, WardClass } from '@/types/insurance'
import {
  wardClassConfig,
  ispTierConfig,
  riderTypeConfig,
} from '@/types/insurance'

interface HospitalizationCoverageCardProps {
  coverage: HospitalizationCoverage
  className?: string
}

/**
 * HospitalizationCoverageCard - Singapore-specific hospitalization display
 *
 * Key design principles:
 * 1. Shows ward class preference, NOT dollar coverage
 * 2. Explains ISP tier and what it actually covers
 * 3. Shows rider type and out-of-pocket implications
 * 4. Displays realistic out-of-pocket estimates
 * 5. Warns if coverage is inadequate for preferred ward
 */
export function HospitalizationCoverageCard({
  coverage,
  className,
}: HospitalizationCoverageCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const wardConfig = wardClassConfig[coverage.preferredWardClass]
  const ispConfig = ispTierConfig[coverage.ispTier]
  const riderConfig = riderTypeConfig[coverage.riderType]

  const coveredWardConfig = wardClassConfig[ispConfig.wardClassCovered]

  return (
    <div
      className={cn(
        'rounded-2xl border border-white/[0.06] bg-white/[0.02]',
        className
      )}
    >
      {/* Header */}
      <div className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/15">
              <Building2 className="h-6 w-6 text-blue-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">
                Hospitalization Coverage
              </h2>
              <p className="text-sm text-slate-400">
                {coverage.ispPlanName || ispConfig.label}
                {coverage.ispProvider && ` by ${coverage.ispProvider}`}
              </p>
            </div>
          </div>

          {/* Adequacy indicator */}
          {coverage.isAdequateForPreferredWard ? (
            <div className="flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 py-1.5 text-xs font-medium text-emerald-400">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Adequate
            </div>
          ) : (
            <div className="flex items-center gap-1.5 rounded-full bg-amber-500/15 px-3 py-1.5 text-xs font-medium text-amber-400">
              <AlertTriangle className="h-3.5 w-3.5" />
              Upgrade Needed
            </div>
          )}
        </div>

        {/* Inadequacy warning */}
        {!coverage.isAdequateForPreferredWard && (
          <div className="mt-4 flex items-start gap-3 rounded-xl border border-amber-500/20 bg-amber-500/10 p-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
            <div>
              <p className="text-sm font-medium text-amber-300">
                Coverage Gap for Preferred Ward
              </p>
              <p className="mt-1 text-xs text-amber-400/80">
                Your ISP ({ispConfig.label}) covers up to {coveredWardConfig.label} ward,
                but you prefer {wardConfig.label} ward. You'll pay the difference
                out-of-pocket if you choose {wardConfig.label}.
              </p>
            </div>
          </div>
        )}

        {/* Ward Class and ISP at a Glance */}
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {/* Ward Class */}
          <WardClassDisplay
            preferredWard={coverage.preferredWardClass}
            coveredWard={ispConfig.wardClassCovered}
          />

          {/* ISP + Rider */}
          <div className="rounded-xl bg-white/[0.03] p-4">
            <p className="mb-2 text-xs font-medium uppercase tracking-wider text-slate-500">
              Insurance Plan
            </p>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-400">ISP Tier</span>
                <span className="text-sm font-medium text-white">
                  {ispConfig.label}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-400">Rider</span>
                <span className="text-sm font-medium text-white">
                  {riderConfig.label}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-400">Deductible</span>
                <span className="font-mono text-sm font-medium text-white">
                  ${coverage.annualDeductible.toLocaleString()}/yr
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Out-of-Pocket Estimates */}
        <div className="mt-4">
          <p className="mb-2 text-xs font-medium uppercase tracking-wider text-slate-500">
            Estimated Out-of-Pocket
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <OutOfPocketEstimate
              label={coverage.outOfPocketEstimate.typicalClaim.scenario}
              amount={coverage.outOfPocketEstimate.typicalClaim.amount}
              variant="typical"
            />
            <OutOfPocketEstimate
              label={coverage.outOfPocketEstimate.majorClaim.scenario}
              amount={coverage.outOfPocketEstimate.majorClaim.amount}
              variant="major"
            />
          </div>
        </div>

        {/* Expand button */}
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-white/[0.03] py-2.5 text-sm text-slate-400 transition-colors hover:bg-white/[0.05] hover:text-white"
        >
          {isExpanded ? (
            <>
              <ChevronUp className="h-4 w-4" />
              Hide details
            </>
          ) : (
            <>
              <ChevronDown className="h-4 w-4" />
              Coverage details
            </>
          )}
        </button>
      </div>

      {/* Expanded details */}
      {isExpanded && (
        <div className="border-t border-white/[0.06] p-6">
          {/* How it works */}
          <div className="mb-6">
            <h3 className="mb-3 text-sm font-medium text-white">
              How Your Coverage Works
            </h3>
            <div className="space-y-3">
              <CoverageFlowStep
                step={1}
                title="MediShield Life"
                description="Government scheme covers base ward (B2/C). Premiums paid from MediSave."
                isActive
              />
              <CoverageFlowStep
                step={2}
                title={`${ispConfig.label} ISP`}
                description={`Upgrades coverage to ${coveredWardConfig.label} ward. Higher annual limit.`}
                isActive
              />
              <CoverageFlowStep
                step={3}
                title={riderConfig.label}
                description={
                  coverage.riderType === 'none'
                    ? 'No rider - you pay co-insurance (10% typically).'
                    : coverage.riderType === 'full'
                      ? 'Full rider - covers co-insurance and deductible.'
                      : `${riderConfig.label} - covers co-insurance except ${Math.round(riderConfig.outOfPocketRatio * 100)}% out-of-pocket.`
                }
                isActive={coverage.riderType !== 'none'}
              />
            </div>
          </div>

          {/* Key Numbers */}
          <div className="mb-6 rounded-xl bg-white/[0.03] p-4">
            <h4 className="mb-3 text-xs font-medium uppercase tracking-wider text-slate-500">
              Key Numbers
            </h4>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex justify-between">
                <span className="text-sm text-slate-400">Annual Deductible</span>
                <span className="font-mono text-sm text-slate-300">
                  ${coverage.annualDeductible.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-slate-400">Co-insurance</span>
                <span className="font-mono text-sm text-slate-300">
                  {coverage.coInsurancePercentage}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-slate-400">Annual Limit</span>
                <span className="font-mono text-sm text-slate-300">
                  {coverage.annualLimit
                    ? `$${coverage.annualLimit.toLocaleString()}`
                    : 'Unlimited'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-slate-400">Panel Restrictions</span>
                <span className="text-sm text-slate-300">
                  {coverage.hasPanelRestrictions ? 'Yes' : 'No'}
                </span>
              </div>
            </div>
          </div>

          {/* Panel restrictions note */}
          {coverage.hasPanelRestrictions && coverage.panelDescription && (
            <div className="mb-6 flex items-start gap-2 rounded-xl bg-amber-500/5 border border-amber-500/10 p-3">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
              <div>
                <p className="text-sm font-medium text-amber-300">
                  Panel Restrictions Apply
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  {coverage.panelDescription}
                </p>
              </div>
            </div>
          )}

          {/* Educational note */}
          <div className="flex items-start gap-2 rounded-xl bg-blue-500/5 border border-blue-500/10 p-3">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-400" />
            <div>
              <p className="text-xs text-slate-400">
                Out-of-pocket estimates are for standard procedures at your preferred
                ward class. Actual costs vary by hospital, procedure, and length of stay.
              </p>
              <a
                href="https://www.moh.gov.sg/cost-financing/fee-benchmarks-and-டbill-amount-information"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300"
              >
                MOH Fee Benchmarks
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Ward class visual display
function WardClassDisplay({
  preferredWard,
  coveredWard,
}: {
  preferredWard: WardClass
  coveredWard: WardClass
}) {
  const wards: WardClass[] = ['A', 'B1', 'B2_plus', 'C']
  const preferredIndex = wards.indexOf(preferredWard)
  const coveredIndex = wards.indexOf(coveredWard)

  return (
    <div className="rounded-xl bg-white/[0.03] p-4">
      <p className="mb-2 text-xs font-medium uppercase tracking-wider text-slate-500">
        Ward Class
      </p>
      <div className="flex items-center gap-1.5">
        {wards.map((ward, index) => {
          const config = wardClassConfig[ward]
          const isPreferred = index === preferredIndex
          const isCovered = index >= coveredIndex

          return (
            <div
              key={ward}
              className={cn(
                'flex h-10 flex-1 items-center justify-center rounded-lg text-xs font-medium transition-colors',
                isPreferred && isCovered && 'bg-emerald-500/20 text-emerald-400',
                isPreferred && !isCovered && 'bg-amber-500/20 text-amber-400',
                !isPreferred && isCovered && 'bg-white/[0.05] text-slate-400',
                !isPreferred && !isCovered && 'bg-white/[0.02] text-slate-600'
              )}
              title={config.description}
            >
              {config.label}
            </div>
          )
        })}
      </div>
      <div className="mt-2 flex items-center justify-between text-xs">
        <span className="text-slate-500">
          Prefer: <span className="text-white">{wardClassConfig[preferredWard].label}</span>
        </span>
        <span className="text-slate-500">
          Covered: <span className="text-slate-300">{wardClassConfig[coveredWard].label}</span>
        </span>
      </div>
    </div>
  )
}

// Out-of-pocket estimate display
function OutOfPocketEstimate({
  label,
  amount,
  variant,
}: {
  label: string
  amount: number
  variant: 'typical' | 'major'
}) {
  return (
    <div
      className={cn(
        'rounded-xl p-3',
        variant === 'typical' ? 'bg-emerald-500/5' : 'bg-amber-500/5'
      )}
    >
      <p className="mb-1 text-xs text-slate-500">{label}</p>
      <p
        className={cn(
          'font-mono text-lg font-medium',
          variant === 'typical' ? 'text-emerald-400' : 'text-amber-400'
        )}
      >
        ${amount.toLocaleString()}
      </p>
    </div>
  )
}

// Coverage flow step
function CoverageFlowStep({
  step,
  title,
  description,
  isActive,
}: {
  step: number
  title: string
  description: string
  isActive: boolean
}) {
  return (
    <div
      className={cn(
        'flex items-start gap-3 rounded-xl border p-3 transition-colors',
        isActive
          ? 'border-white/[0.08] bg-white/[0.03]'
          : 'border-white/[0.04] bg-white/[0.01] opacity-50'
      )}
    >
      <div
        className={cn(
          'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-medium',
          isActive ? 'bg-blue-500/20 text-blue-400' : 'bg-white/[0.05] text-slate-500'
        )}
      >
        {step}
      </div>
      <div>
        <p className="text-sm font-medium text-white">{title}</p>
        <p className="mt-0.5 text-xs text-slate-400">{description}</p>
      </div>
    </div>
  )
}

// Compact version for list views
export function HospitalizationCoverageCompact({
  coverage,
  className,
}: HospitalizationCoverageCardProps) {
  const wardConfig = wardClassConfig[coverage.preferredWardClass]
  const ispConfig = ispTierConfig[coverage.ispTier]
  const riderConfig = riderTypeConfig[coverage.riderType]

  return (
    <div
      className={cn(
        'flex items-center gap-4 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4',
        className
      )}
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/15">
        <Building2 className="h-5 w-5 text-blue-400" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-medium text-white">
          {wardConfig.label} Ward • {ispConfig.label}
        </p>
        <p className="text-sm text-slate-400">
          {riderConfig.label} • ${coverage.annualDeductible.toLocaleString()} deductible
        </p>
      </div>
      {coverage.isAdequateForPreferredWard ? (
        <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400" />
      ) : (
        <AlertTriangle className="h-5 w-5 shrink-0 text-amber-400" />
      )}
    </div>
  )
}
