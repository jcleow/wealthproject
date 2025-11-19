import { RefreshCw, Sparkles, Trash2 } from 'lucide-react'

import { NetWorthProjection } from './NetWorthProjection'
import { PropertyPlannerLauncher } from '@/components/property-planner/property-planner-launcher'

const quickActions = [
  { icon: Sparkles, label: 'Load defaults' },
  { icon: Trash2, label: 'Clear data' },
]

export function FinancialWorkspace() {
  const handleAction = (label: string) => {
    console.log(`${label} clicked`)
  }

  const handleRefresh = () => {
    console.log('Refresh clicked')
  }

  return (
    <div className="flex h-full w-full flex-col bg-transparent text-white">
      <div className="flex flex-col gap-3 border-b border-white/10 px-6 py-4 text-left sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <p className="text-sm font-semibold uppercase tracking-wide text-gray-300">
            Financial Workspace
          </p>
          <p className="text-sm text-white">
            Track projections and model housing decisions with mock data.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden items-center gap-2 md:flex">
            {quickActions.map(({ icon: Icon, label }) => (
              <button
                key={label}
                onClick={() => handleAction(label)}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 text-white/70 transition hover:bg-white/10 hover:text-white"
                title={label}
                type="button"
              >
                <Icon className="h-4 w-4" />
              </button>
            ))}
          </div>
          <div className="flex items-center">
            <PropertyPlannerLauncher />
          </div>
          <button
            onClick={handleRefresh}
            className="rounded-full border border-white/10 p-2 text-gray-400 transition hover:bg-white/10 hover:text-white"
            title="Refresh financial data"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div className="min-h-0 flex-1 p-6">
        <NetWorthProjection />
      </div>

    </div>
  )
}
