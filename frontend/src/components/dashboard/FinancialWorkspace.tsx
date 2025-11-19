import { useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { NetWorthProjection } from './NetWorthProjection'
import { PropertyPlannerModal } from '../modals/PropertyPlannerModal'

export function FinancialWorkspace() {
  const [isPropertyPlannerOpen, setIsPropertyPlannerOpen] = useState(false)

  const handleSettings = () => {
    console.log('Settings clicked');
    // TODO: Open settings modal
  };

  const handlePropertyPlanner = () => {
    setIsPropertyPlannerOpen(true)
  };

  const handleRefresh = () => {
    console.log('Refresh clicked');
    // TODO: Refresh data
  };
  return (
    <div className="flex h-full w-full flex-col bg-gray-900 text-white">
      <div className="flex flex-col gap-3 border-b border-white/10 px-6 py-5 text-left sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-xl font-semibold text-white">
              Hello David 👋
            </h1>
            <p className="text-sm text-gray-400">
              Financial Workspace
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handlePropertyPlanner}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700"
          >
            <span className="text-base">🏠</span>
            <span>Property Planner</span>
            <span className="rounded bg-white/20 px-2 py-0.5 text-xs">HDB (BTO / Resale)</span>
          </button>
          <button
            onClick={handleSettings}
            className="flex items-center gap-2 rounded-lg bg-gray-700/50 px-3 py-2.5 text-sm font-medium text-white transition-colors hover:bg-gray-600/50"
          >
            <span className="text-base">⚙️</span>
          </button>
          <button
            onClick={handleRefresh}
            className="rounded-lg p-2.5 text-gray-400 transition-colors hover:bg-gray-700/50 hover:text-white"
            title="Refresh financial data"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div className="min-h-[500px] flex-1 p-6">
        <NetWorthProjection />
      </div>

      <PropertyPlannerModal
        isOpen={isPropertyPlannerOpen}
        onClose={() => setIsPropertyPlannerOpen(false)}
      />
    </div>
  )
}