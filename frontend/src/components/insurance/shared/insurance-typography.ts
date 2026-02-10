/**
 * Insurance Module — Shared Typography Constants
 *
 * Ensures consistent font sizes, weights, and spacing across all insurance tabs
 * (Policies, Journey, Guidelines, MyCoverage, etc.).
 *
 * When adding a new insurance tab or card component, import from here rather than
 * hardcoding font sizes. This prevents the drift that happens when one tab uses
 * text-[11px] while another uses text-xs for the same semantic role.
 *
 * Usage:
 *   import { INSURANCE_TYPOGRAPHY as T } from '@/components/insurance/shared/insurance-typography'
 *   <span className={T.cardLabel}>ACTIVE POLICIES</span>
 *   <span className={T.cardValue}>$976K</span>
 */

export const INSURANCE_TYPOGRAPHY = {
  /** Card section labels — uppercase mono headers like "ACTIVE POLICIES", "TARGET TOTAL" */
  cardLabel: 'font-mono text-[11px] font-medium uppercase tracking-wider',

  /** Large metric values inside summary cards (e.g. "$976K", "3") */
  cardValue: 'text-xl font-semibold',

  /** Medium metric values in detail cards (e.g. policy coverage, premium amounts) */
  cardDetailValue: 'text-sm font-medium',

  /** Description text below card values */
  cardDescription: 'text-xs',

  /** Content area section title (e.g. "Coverage Analysis Over Time") */
  sectionTitle: 'text-sm font-medium',

  /** Subtitle / helper text below section titles */
  sectionSubtitle: 'text-xs',

  /** Category / row labels in tables and lists (e.g. "Life/TPD", "Critical Illness") */
  categoryLabel: 'text-[13px] font-medium',

  /** Category icon size class */
  categoryIconSize: 'h-4 w-4',

  /** Body text in tables and breakdowns (e.g. person names, amounts) */
  bodyText: 'text-[13px]',

  /** Small meta text (e.g. "In 11 years", filter labels) */
  metaText: 'text-[11px]',

  /** Milestone card title */
  milestoneTitle: 'text-[13px] font-semibold',

  /** Milestone card description */
  milestoneDescription: 'text-[11px] leading-relaxed',

  /** Milestone impact text */
  milestoneImpact: 'text-[11px] font-medium',

  /** Filter chip text */
  chipText: 'text-[11px]',

  /** Legend / axis label text */
  legendText: 'text-[10px]',

  /** Status badge text (e.g. "Gap: $670K") */
  statusText: 'text-[11px] font-medium',
} as const
