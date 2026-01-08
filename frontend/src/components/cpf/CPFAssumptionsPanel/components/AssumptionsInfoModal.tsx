'use client'

import { HelpCircle, X } from 'lucide-react'
import { ASSUMPTION_DOCS } from '@/lib/cpf-assumptions-docs'

interface AssumptionsInfoModalProps {
  onClose: () => void
}

export function AssumptionsInfoModal({ onClose }: AssumptionsInfoModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative max-h-[85vh] w-full max-w-2xl overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0a0a0a] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/20">
              <HelpCircle className="h-4 w-4 text-blue-400" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">
                Projection Assumptions
              </h2>
              <p className="text-xs text-slate-400">
                Based on CPF official methodology
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 transition hover:bg-white/[0.05] hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="max-h-[calc(85vh-120px)] overflow-y-auto p-5">
          <div className="space-y-6">
            {ASSUMPTION_DOCS.map((section) => (
              <div key={section.category}>
                <div className="mb-3 flex items-center gap-2">
                  {section.icon}
                  <h3 className="text-sm font-medium text-slate-300">
                    {section.category}
                  </h3>
                </div>
                <div className="overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.02]">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-white/[0.06] bg-white/[0.02]">
                        <th className="px-3 py-2 text-left font-medium text-slate-400">
                          Factor
                        </th>
                        <th className="px-3 py-2 text-left font-medium text-slate-400">
                          Default
                        </th>
                        <th className="px-3 py-2 text-left font-medium text-slate-400">
                          Description
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {section.items.map((item, idx) => (
                        <tr
                          key={item.factor}
                          className={
                            idx < section.items.length - 1
                              ? 'border-b border-white/[0.04]'
                              : ''
                          }
                        >
                          <td className="whitespace-nowrap px-3 py-2.5 font-medium text-slate-300">
                            {item.factor}
                          </td>
                          <td className="whitespace-nowrap px-3 py-2.5 font-mono text-emerald-400">
                            {item.defaultValue}
                          </td>
                          <td className="px-3 py-2.5 leading-relaxed text-slate-400">
                            {item.description}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-white/[0.06] px-5 py-3">
          <p className="text-[11px] text-slate-500">
            Source:{' '}
            <a
              href="https://www.cpf.gov.sg/member/tnc/detailed-notes-for-cpf-planner-retirement-income"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:underline"
            >
              CPF Detailed Notes for Retirement Income Planner
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
