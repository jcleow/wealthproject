'use client'

import { Info, ExternalLink } from 'lucide-react'

export function EstimateDisclaimer() {
  return (
    <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
      <div className="flex gap-2">
        <Info className="h-5 w-5 text-blue-400 shrink-0 mt-0.5" />
        <div>
          <div className="text-sm font-medium text-blue-400 mb-1">Estimate Disclaimer</div>
          <p className="text-xs text-blue-300/80">
            These estimates are based on our own regression model and may differ from CPF LIFE&apos;s official calculations.
            Please verify with CPF&apos;s official calculator for accurate figures.
          </p>
          <a
            href="https://www.cpf.gov.sg/member/retirement-income/monthly-payouts/cpf-life"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 mt-2"
          >
            Check CPF LIFE official calculator <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>
    </div>
  )
}
