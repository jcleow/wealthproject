'use client'

import { Heart, Shield, Activity, Building2, X, Trash2, Pencil, Calendar, Landmark } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { formatCurrency } from '@/lib/format'
import type { InsurancePolicyRecord } from '@/api/financial/insurance'
import { getMediSavePayability, getCpfAccountLabel } from '@/lib/medisave-utils'

// ============================================================================
// DARK PALETTE (matches Pencil design KZCh7)
// ============================================================================

const D = {
  modalBg: '#1A1A1D',
  cardBg: '#222226',
  border: '#2D2D33',
  textPrimary: '#F0F0F0',
  textSecondary: '#A1A1AA',
  textMuted: '#71717A',
  textDim: '#52525B',
  statusGreen: '#22C55E',
  deleteRed: '#C53D43',
  categoryBlue: '#3D5A80',
  linkedPurple: '#A78BFA',
} as const

// ============================================================================
// CATEGORY → ICON / COLOR MAPPING
// ============================================================================

const CATEGORY_CONFIG: Record<string, { icon: React.ElementType; color: string }> = {
  life: { icon: Heart, color: '#3D5A80' },
  critical_illness: { icon: Shield, color: '#6B7280' },
  accident: { icon: Activity, color: '#E5A100' },
  hospitalization: { icon: Building2, color: '#3D5A80' },
}

function getCategoryConfig(category: string) {
  return CATEGORY_CONFIG[category] ?? CATEGORY_CONFIG.life
}

// ============================================================================
// HELPERS
// ============================================================================

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '\u2014'
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return '\u2014'
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function computeAnnualPremium(amount: number, frequency: string): number {
  switch (frequency) {
    case 'monthly': return amount * 12
    case 'quarterly': return amount * 4
    case 'annually': return amount
    default: return amount
  }
}

function computeDurationLabel(startDate: string, endDate: string | null): string | null {
  const start = new Date(startDate)
  if (isNaN(start.getTime())) return null
  const now = new Date()
  const activeYears = Math.max(0, Math.floor((now.getTime() - start.getTime()) / (365.25 * 86400000)))

  if (!endDate) return `${activeYears} yr${activeYears !== 1 ? 's' : ''} active`
  const end = new Date(endDate)
  if (isNaN(end.getTime())) return `${activeYears} yr${activeYears !== 1 ? 's' : ''} active`
  const remainingYears = Math.max(0, Math.floor((end.getTime() - now.getTime()) / (365.25 * 86400000)))
  return `${activeYears} yr${activeYears !== 1 ? 's' : ''} active \u00B7 ${remainingYears} yr${remainingYears !== 1 ? 's' : ''} remaining`
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

/** Section header label (uppercase mono) */
function SectionHeader({ label }: { label: string }) {
  return (
    <>
      <span
        className="text-[11px] font-medium font-mono tracking-wider uppercase"
        style={{ color: D.textMuted }}
      >
        {label}
      </span>
      <div className="h-px w-full" style={{ background: D.border }} />
    </>
  )
}

/** Key-value cell in a grid row */
function DetailCell({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <div className="flex flex-col gap-1 flex-1 min-w-0">
      <span className="text-xs" style={{ color: D.textMuted }}>{label}</span>
      <span className="text-[13px] font-medium truncate" style={{ color: valueColor ?? D.textPrimary }}>
        {value}
      </span>
    </div>
  )
}

// ============================================================================
// MAIN MODAL
// ============================================================================

interface PolicyDetailModalProps {
  isOpen: boolean
  onClose: () => void
  policy: InsurancePolicyRecord | null
  personColor?: string
  onEdit?: (policy: InsurancePolicyRecord) => void
  onDelete?: (policy: InsurancePolicyRecord) => void
}

export function PolicyDetailModal({ isOpen, onClose, policy, personColor, onEdit, onDelete }: PolicyDetailModalProps) {
  if (!policy) return null

  const { icon: CategoryIcon, color: categoryColor } = getCategoryConfig(policy.category)
  const annualPremium = computeAnnualPremium(policy.premiumAmount, policy.premiumFrequency)
  const durationLabel = computeDurationLabel(policy.startDate, policy.endDate)
  const personInitials = policy.personName
    ? policy.personName.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)
    : '??'

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      overlayClassName="bg-black/60 backdrop-blur-sm"
    >
      <div
        className="flex flex-col overflow-hidden"
        style={{
          width: 600,
          maxHeight: '85vh',
          background: D.modalBg,
          border: `1px solid ${D.border}`,
          borderRadius: 2,
        }}
      >
        {/* ── HEADER ─────────────────────────────────────────────── */}
        <div
          className="flex items-center justify-between shrink-0 px-6"
          style={{ height: 72, borderBottom: `1px solid ${D.border}` }}
        >
          <div className="flex items-center gap-3.5 min-w-0">
            {/* Category icon */}
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
              style={{ background: `${categoryColor}30` }}
            >
              <CategoryIcon className="h-5 w-5" style={{ color: categoryColor }} />
            </div>
            {/* Policy name + insurer row */}
            <div className="flex flex-col gap-0.5 min-w-0">
              <span className="text-base font-semibold truncate" style={{ color: D.textPrimary }}>
                {policy.name}
              </span>
              <div className="flex items-center gap-1.5">
                {policy.insurerName && (
                  <span className="text-xs" style={{ color: D.textSecondary }}>{policy.insurerName}</span>
                )}
                {policy.insurerName && policy.policyNumber && (
                  <span className="text-xs" style={{ color: D.textDim }}>&middot;</span>
                )}
                {policy.policyNumber && (
                  <span className="text-xs font-mono" style={{ color: D.textDim }}>{policy.policyNumber}</span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            {/* Status badge */}
            <div
              className="flex items-center gap-1.5 rounded-full px-2.5 py-1"
              style={{ background: policy.isActive ? '#22C55E18' : '#EF444418' }}
            >
              <div
                className="h-1.5 w-1.5 rounded-full"
                style={{ background: policy.isActive ? D.statusGreen : '#EF4444' }}
              />
              <span
                className="text-[11px] font-medium"
                style={{ color: policy.isActive ? D.statusGreen : '#EF4444' }}
              >
                {policy.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
            {/* Close button */}
            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-md transition-colors hover:bg-white/[0.05]"
              style={{ border: `1px solid ${D.border}` }}
            >
              <X className="h-4 w-4" style={{ color: D.textSecondary }} />
            </button>
          </div>
        </div>

        {/* ── BODY (scrollable) ──────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">

          {/* Coverage Amounts */}
          <div
            className="flex flex-col gap-4 p-5 rounded-sm"
            style={{ background: D.cardBg, border: `1px solid ${D.border}` }}
          >
            <SectionHeader label="COVERAGE AMOUNTS" />
            <div className="flex gap-4">
              <DetailCell label="Coverage Amount" value={formatCurrency(policy.coverageAmount)} />
              <DetailCell label="Death Benefit" value={policy.deathBenefit != null ? formatCurrency(policy.deathBenefit) : '\u2014'} />
            </div>
            <div className="flex gap-4">
              <DetailCell label="TPD Benefit" value={policy.tpdBenefit != null ? formatCurrency(policy.tpdBenefit) : '\u2014'} />
              <DetailCell label="CI Benefit" value={policy.criticalIllnessBenefit != null ? formatCurrency(policy.criticalIllnessBenefit) : '\u2014'} />
            </div>
          </div>

          {/* Policy Details */}
          <div
            className="flex flex-col gap-4 p-5 rounded-sm"
            style={{ background: D.cardBg, border: `1px solid ${D.border}` }}
          >
            <SectionHeader label="POLICY DETAILS" />
            <div className="flex gap-4">
              <DetailCell label="Category" value={policy.category.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())} />
              <DetailCell label="Subcategory" value={policy.subcategory ?? '\u2014'} />
              <DetailCell
                label="Government Scheme"
                value={policy.governmentScheme ?? '\u2014'}
                valueColor={policy.governmentScheme ? D.textPrimary : D.textDim}
              />
            </div>
            <div className="flex gap-4">
              <DetailCell
                label="Premium"
                value={`${formatCurrency(policy.premiumAmount)}/${policy.premiumFrequency === 'monthly' ? 'mo' : policy.premiumFrequency === 'quarterly' ? 'qtr' : 'yr'}`}
              />
              <DetailCell label="Annual Premium" value={formatCurrency(annualPremium)} />
              <DetailCell
                label="Linked Expense"
                value={policy.linkedExpenseId ? `Linked` : '\u2014'}
                valueColor={policy.linkedExpenseId ? D.linkedPurple : D.textDim}
              />
            </div>
          </div>

          {/* Payment Source */}
          {(() => {
            const payability = getMediSavePayability(policy)
            if (payability === 'none') return null
            const isFull = payability === 'full'
            const cpfLabel = getCpfAccountLabel(policy.governmentScheme ?? null)
            const medisavePortion = isFull ? annualPremium : 0
            const cashPortion = isFull ? 0 : annualPremium
            const badgeBg = isFull ? 'rgba(34, 197, 94, 0.10)' : 'rgba(245, 158, 11, 0.10)'
            const badgeColor = isFull ? '#22C55E' : '#F59E0B'
            const badgeLabel = isFull ? cpfLabel : 'MediSave/Cash'
            return (
              <div
                className="flex flex-col gap-4 p-5 rounded-sm"
                style={{ background: D.cardBg, border: `1px solid ${D.border}` }}
              >
                <SectionHeader label="PAYMENT SOURCE" />
                <div className="flex gap-4">
                  <div className="flex flex-col gap-1 flex-1 min-w-0">
                    <span className="text-xs" style={{ color: D.textMuted }}>Source</span>
                    <span
                      className="inline-flex w-fit items-center gap-1 rounded px-2 py-0.5 text-[11px] font-semibold"
                      style={{ background: badgeBg, color: badgeColor }}
                    >
                      <Landmark className="h-3 w-3" />
                      {badgeLabel}
                    </span>
                  </div>
                  <DetailCell
                    label={`${cpfLabel} Portion`}
                    value={medisavePortion > 0 ? formatCurrency(medisavePortion) + '/yr' : '\u2014'}
                    valueColor={medisavePortion > 0 ? '#22C55E' : D.textDim}
                  />
                  <DetailCell
                    label="Cash Portion"
                    value={cashPortion > 0 ? formatCurrency(cashPortion) + '/yr' : '\u2014'}
                    valueColor={cashPortion > 0 ? D.textPrimary : D.textDim}
                  />
                </div>
                {!isFull && (
                  <div className="flex items-center gap-2 rounded-md px-3 py-2" style={{ background: 'rgba(245, 158, 11, 0.06)', border: '1px solid rgba(245, 158, 11, 0.12)' }}>
                    <span className="text-[11px] leading-relaxed" style={{ color: '#F59E0B' }}>
                      ISP premiums are subject to the MediSave Additional Withdrawal Limit (AWL). The actual MediSave/Cash split depends on remaining AWL after other ISPs.
                    </span>
                  </div>
                )}
              </div>
            )
          })()}

          {/* Dates & Person */}
          <div
            className="flex flex-col gap-4 p-5 rounded-sm"
            style={{ background: D.cardBg, border: `1px solid ${D.border}` }}
          >
            <SectionHeader label="DATES & COVERAGE PERIOD" />
            <div className="flex gap-4">
              <DetailCell label="Start Date" value={formatDate(policy.startDate)} />
              <DetailCell label="End Date" value={formatDate(policy.endDate)} />
              <DetailCell label="Renewal Date" value={formatDate(policy.renewalDate)} />
            </div>

            <div className="h-px w-full" style={{ background: D.border }} />

            {/* Person row */}
            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-1">
                <span className="text-xs" style={{ color: D.textMuted }}>Covered Person</span>
                <div className="flex items-center gap-2">
                  <div
                    className="flex h-6 w-6 items-center justify-center rounded-full"
                    style={{ background: personColor || '#64748b' }}
                  >
                    <span className="text-[9px] font-semibold text-white">{personInitials}</span>
                  </div>
                  <span className="text-[13px] font-medium" style={{ color: D.textPrimary }}>
                    {policy.personName || 'Unassigned'}
                  </span>
                </div>
              </div>

              {durationLabel && (
                <div
                  className="flex items-center gap-1.5 rounded-full px-2.5 py-1"
                  style={{ background: `${categoryColor}20` }}
                >
                  <Calendar className="h-3 w-3" style={{ color: categoryColor }} />
                  <span className="text-[11px] font-medium" style={{ color: categoryColor }}>
                    {durationLabel}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Notes */}
          {policy.notes && (
            <div
              className="flex flex-col gap-3 p-5 rounded-sm"
              style={{ background: D.cardBg, border: `1px solid ${D.border}` }}
            >
              <SectionHeader label="NOTES" />
              <p className="text-[13px] leading-relaxed" style={{ color: D.textSecondary }}>
                {policy.notes}
              </p>
            </div>
          )}
        </div>

        {/* ── FOOTER ─────────────────────────────────────────────── */}
        <div
          className="flex items-center justify-between shrink-0 px-6"
          style={{ height: 64, borderTop: `1px solid ${D.border}` }}
        >
          {/* Delete button */}
          <button
            type="button"
            onClick={() => onDelete?.(policy)}
            className="flex items-center gap-1.5 rounded-md px-4 py-2 text-[13px] font-medium transition-colors hover:bg-red-500/10"
            style={{ color: D.deleteRed, border: `1px solid ${D.deleteRed}50` }}
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete Policy
          </button>

          <div className="flex items-center gap-2.5">
            {/* Close button */}
            <button
              type="button"
              onClick={onClose}
              className="rounded-md px-4 py-2 text-[13px] font-medium transition-colors hover:bg-white/[0.05]"
              style={{ color: D.textSecondary, border: `1px solid ${D.border}` }}
            >
              Close
            </button>
            {/* Edit button */}
            <button
              type="button"
              onClick={() => onEdit?.(policy)}
              className="flex items-center gap-1.5 rounded-md px-4 py-2 text-[13px] font-medium transition-colors hover:brightness-95"
              style={{ background: D.textPrimary, color: '#111113' }}
            >
              <Pencil className="h-3.5 w-3.5" />
              Edit Policy
            </button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
