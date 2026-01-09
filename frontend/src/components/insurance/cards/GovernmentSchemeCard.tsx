'use client'

import { useState } from 'react'
import {
  CheckCircle2,
  XCircle,
  Info,
  ExternalLink,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { EXTERNAL_LINKS } from '@/lib/external-links'
import type { GovernmentCoverageStatus, GovernmentScheme } from '@/types/insurance'
import {
  governmentSchemeInfo,
  governmentSchemeLimitations,
} from '@/types/insurance'

interface GovernmentSchemeCardProps {
  schemes: GovernmentCoverageStatus[]
  className?: string
}

/**
 * GovernmentSchemeCard - With limitation warnings
 *
 * Key changes from original:
 * 1. Adds prominent "Base Safety Net" warning
 * 2. Removes green "active" badges that imply sufficient coverage
 * 3. Shows trigger conditions and what's NOT covered
 * 4. Uses neutral colors instead of emerald
 */
export function GovernmentSchemeCard({
  schemes,
  className,
}: GovernmentSchemeCardProps) {
  const activeCount = schemes.filter((s) => s.isActive).length

  return (
    <div
      className={cn(
        'rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6',
        className
      )}
    >
      {/* Warning banner - CRITICAL for setting correct expectations */}
      <div className="mb-5 flex items-start gap-3 rounded-xl border border-slate-500/20 bg-slate-500/10 p-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-slate-400" />
        <div>
          <p className="text-sm font-medium text-slate-300">
            Base Safety Net - Not Financial Protection
          </p>
          <p className="mt-1 text-xs text-slate-400">
            Government schemes cover survival-level needs. They do NOT replace
            your income during illness, maintain your current lifestyle, or
            fully protect your family's financial security.
          </p>
        </div>
      </div>

      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-white">Government Schemes</h3>
          <p className="mt-0.5 text-sm text-slate-400">
            Auto-enrolled via CPF
          </p>
        </div>
        {/* Neutral status indicator instead of green "active" badge */}
        <div className="flex items-center gap-1.5 rounded-full bg-white/[0.05] px-3 py-1">
          <span className="text-sm text-slate-400">
            {activeCount} of {schemes.length} enrolled
          </span>
        </div>
      </div>

      {/* Schemes grid */}
      <div className="grid gap-3 sm:grid-cols-2">
        {schemes.map((status) => (
          <SchemeItemExpanded key={status.scheme} status={status} />
        ))}
      </div>

      {/* CPF premium note */}
      <div className="mt-4 flex items-start gap-2 rounded-xl bg-blue-500/5 border border-blue-500/10 p-3">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-400" />
        <p className="text-xs text-slate-400">
          Premiums are deducted from your CPF MediSave. Check your CPF statement
          for actual premium amounts.
        </p>
      </div>
    </div>
  )
}

function SchemeItemExpanded({ status }: { status: GovernmentCoverageStatus }) {
  const [isExpanded, setIsExpanded] = useState(false)
  const info = governmentSchemeInfo[status.scheme]
  const limitations = governmentSchemeLimitations[status.scheme]

  // URLs for each scheme - centralized in external-links.ts
  const schemeUrls: Record<GovernmentScheme, string> = {
    medishield_life: EXTERNAL_LINKS.cpf.medishieldLife.url,
    careshield_life: EXTERNAL_LINKS.cpf.careshieldLife.url,
    eldershield: EXTERNAL_LINKS.cpf.eldershield.url,
    dps: EXTERNAL_LINKS.cpf.dps.url,
  }

  return (
    <div
      className={cn(
        'rounded-xl border transition-all',
        // Use neutral colors instead of emerald for active
        status.isActive
          ? 'border-white/[0.08] bg-white/[0.03]'
          : 'border-white/[0.06] bg-white/[0.02] opacity-60'
      )}
    >
      {/* Main content */}
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            {status.isActive ? (
              <CheckCircle2 className="h-4 w-4 text-slate-400" />
            ) : (
              <XCircle className="h-4 w-4 text-slate-600" />
            )}
            <span
              className={cn(
                'text-sm font-medium',
                status.isActive ? 'text-white' : 'text-slate-500'
              )}
            >
              {info.name}
            </span>
          </div>
          <a
            href={schemeUrls[status.scheme]}
            target="_blank"
            rel="noopener noreferrer"
            className="text-slate-500 transition-colors hover:text-white"
          >
            <ExternalLink className="h-4 w-4" />
          </a>
        </div>

        {/* Coverage amount/payout */}
        {status.isActive && (status.coverageAmount || status.monthlyPayout) && (
          <div className="mt-2 flex flex-wrap gap-2">
            {status.coverageAmount && (
              <span className="rounded bg-white/[0.05] px-2 py-0.5 text-xs text-slate-300">
                ${status.coverageAmount.toLocaleString()}
              </span>
            )}
            {status.monthlyPayout && (
              <span className="rounded bg-white/[0.05] px-2 py-0.5 text-xs text-slate-300">
                ${status.monthlyPayout}/mo
              </span>
            )}
          </div>
        )}

        {/* Trigger condition - always visible */}
        <div className="mt-3">
          <p className="text-xs text-slate-500">
            <span className="font-medium text-slate-400">Triggers when: </span>
            {limitations.triggerCondition.description}
          </p>
        </div>

        {/* Warning message */}
        <p className="mt-2 text-xs text-amber-400/80">
          {limitations.warningMessage}
        </p>

        {/* Expand button */}
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="mt-2 flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300"
        >
          {isExpanded ? (
            <>
              <ChevronUp className="h-3 w-3" />
              Hide limitations
            </>
          ) : (
            <>
              <ChevronDown className="h-3 w-3" />
              What this doesn't cover
            </>
          )}
        </button>
      </div>

      {/* Expanded limitations */}
      {isExpanded && (
        <div className="border-t border-white/[0.06] px-4 pb-4 pt-3">
          <h5 className="mb-2 text-xs font-medium uppercase tracking-wider text-slate-500">
            Does NOT Cover
          </h5>
          <ul className="space-y-1">
            {limitations.doesNotCover.map((item, i) => (
              <li
                key={i}
                className="flex items-start gap-2 text-xs text-slate-400"
              >
                <XCircle className="mt-0.5 h-3 w-3 shrink-0 text-slate-600" />
                {item}
              </li>
            ))}
          </ul>

          <h5 className="mb-2 mt-3 text-xs font-medium uppercase tracking-wider text-slate-500">
            Key Limitations
          </h5>
          <ul className="space-y-1">
            {limitations.keyLimitations.map((item, i) => (
              <li
                key={i}
                className="flex items-start gap-2 text-xs text-slate-400"
              >
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-slate-600" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

// Compact version for quick reference
export function GovernmentSchemeCompact({
  schemes,
  className,
}: GovernmentSchemeCardProps) {
  const activeSchemes = schemes.filter((s) => s.isActive)

  return (
    <div
      className={cn(
        'rounded-xl border border-white/[0.06] bg-white/[0.02] p-3',
        className
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Info className="h-4 w-4 text-slate-400" />
          <span className="text-sm text-slate-300">Government Coverage</span>
        </div>
        <span className="text-xs text-slate-500">
          {activeSchemes.length} enrolled
        </span>
      </div>
      <p className="mt-1 text-xs text-slate-500">
        Base safety net only - not full protection
      </p>
    </div>
  )
}
