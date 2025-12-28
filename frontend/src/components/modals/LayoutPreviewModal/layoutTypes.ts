import type { DashboardLayout } from '@/types/financial'

export type { DashboardLayout }

export interface LayoutOption {
  id: DashboardLayout
  label: string
  description: string
}

export const LAYOUT_OPTIONS: LayoutOption[] = [
  {
    id: 'stacked',
    label: 'Stacked',
    description: 'Chart on top, cards below',
  },
  {
    id: 'chart-left',
    label: 'Chart Left',
    description: 'Chart left, cards right',
  },
  {
    id: 'chart-right',
    label: 'Chart Right',
    description: 'Cards left, chart right',
  },
]
