'use client'

import { CheckCircle2, XCircle, Info, ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { GovernmentCoverageStatus } from '@/types/insurance'
import { governmentSchemeInfo } from '@/types/insurance'

interface GovernmentSchemeCardProps {
  schemes: GovernmentCoverageStatus[]
}

export function GovernmentSchemeCard({ schemes }: GovernmentSchemeCardProps) {
  const activeCount = schemes.filter((s) => s.isActive).length

  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-white">Government Schemes</h3>
          <p className="mt-1 text-sm text-slate-400">
            Auto-enrolled coverage via CPF
          </p>
        </div>
        <div className="flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 py-1">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          <span className="text-sm font-medium text-emerald-400">
            {activeCount}/{schemes.length} Active
          </span>
        </div>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {schemes.map((status) => (
          <SchemeItem key={status.scheme} status={status} />
        ))}
      </div>

      <div className="mt-4 flex items-start gap-2 rounded-xl bg-blue-500/10 p-3">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-400" />
        <p className="text-xs text-blue-300">
          These schemes are automatically enrolled for Singapore Citizens and
          Permanent Residents. Premiums are deducted from your CPF MediSave.
        </p>
      </div>
    </div>
  )
}

function SchemeItem({ status }: { status: GovernmentCoverageStatus }) {
  const info = governmentSchemeInfo[status.scheme]

  return (
    <div
      className={cn(
        'rounded-xl border p-4 transition-all',
        status.isActive
          ? 'border-emerald-500/20 bg-emerald-500/5'
          : 'border-white/[0.06] bg-white/[0.02]'
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          {status.isActive ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-400" />
          ) : (
            <XCircle className="h-5 w-5 text-slate-500" />
          )}
          <span
            className={cn(
              'text-sm font-medium',
              status.isActive ? 'text-white' : 'text-slate-400'
            )}
          >
            {info.name}
          </span>
        </div>
        <a
          href={`https://www.cpf.gov.sg/member/healthcare-financing/${status.scheme.replace(/_/g, '-')}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-slate-500 transition-colors hover:text-white"
        >
          <ExternalLink className="h-4 w-4" />
        </a>
      </div>

      <p className="mt-2 text-xs text-slate-400">{info.description}</p>

      {status.isActive && (status.coverageAmount || status.monthlyPayout) && (
        <div className="mt-3 flex items-center gap-2">
          {status.coverageAmount && (
            <span className="rounded-full bg-white/[0.05] px-2 py-0.5 text-xs text-slate-300">
              ${status.coverageAmount.toLocaleString()} coverage
            </span>
          )}
          {status.monthlyPayout && (
            <span className="rounded-full bg-white/[0.05] px-2 py-0.5 text-xs text-slate-300">
              ${status.monthlyPayout}/mo payout
            </span>
          )}
        </div>
      )}

      {!status.isActive && (
        <p className="mt-3 text-xs text-slate-500">
          {status.notes || 'Not enrolled or not applicable'}
        </p>
      )}
    </div>
  )
}
