import { RefreshCw } from 'lucide-react'
import { NetWorthProjection } from './NetWorthProjection'

export function FinancialWorkspace() {
  const handleSettings = () => {
    console.log('Settings clicked');
    // TODO: Open settings modal
  };

  const handlePropertyPlanner = () => {
    console.log('Property Planner clicked');
    // TODO: Open property planner
  };

  const handleRefresh = () => {
    console.log('Refresh clicked');
    // TODO: Refresh data
  };
  return (
    <div className="flex h-full w-full flex-col bg-gray-900 text-white">
      <div className="flex flex-col gap-3 border-b border-white/10 px-6 py-4 text-left sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-lg font-semibold text-white">
            Financial Workspace
          </p>
          <p className="text-sm text-gray-400">
            Track projections and model housing decisions with mock data.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleSettings}
            className="flex items-center gap-2 rounded-lg bg-gray-800 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-700"
          >
            <span className="text-base">⚙️</span>
          </button>
          <button
            onClick={handlePropertyPlanner}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
          >
            <span className="text-base">🏠</span>
            <span>Property Planner</span>
            <span className="rounded bg-white/20 px-1.5 py-0.5 text-xs">HDB (BTO / Resale)</span>
          </button>
          <button
            onClick={handleRefresh}
            className="rounded-full p-2 text-gray-400 transition-colors hover:bg-gray-800 hover:text-white"
            title="Refresh financial data"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div className="min-h-[500px] flex-1 p-6">
        <NetWorthProjection />
      </div>
    </div>
  )
}