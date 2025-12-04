'use client'

import { useState, useMemo } from 'react'
import {
  ReactFlow,
  Node,
  Edge,
  Background,
  Controls,
  Handle,
  Position,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

import { formatCurrency } from '@/lib/format'

// 2025 retirement sums
const FRS_2025 = 213000
const BRS_2025 = 106500

// Pre-55 Balances Input Node
function BalancesInputNode({ data }: { data: {
  oaBalance: number
  saBalance: number
  maBalance: number
  hasPropertyPledge: boolean
  onChange: (field: string, value: number | boolean) => void
}}) {
  const total = data.oaBalance + data.saBalance + data.maBalance

  return (
    <div className="rounded-xl border border-white/[0.08] bg-[#0f1728]/95 p-4 shadow-xl backdrop-blur min-w-[220px]">
      <div className="mb-3 text-xs font-medium uppercase tracking-wide text-cyan-400">
        Balances Before 55
      </div>

      <div className="space-y-3">
        <div>
          <label className="mb-1 block text-xs text-slate-400">OA Balance</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
            <input
              type="number"
              value={data.oaBalance}
              onChange={(e) => data.onChange('oaBalance', Number(e.target.value))}
              className="w-full rounded-lg border border-white/[0.08] bg-white/[0.02] py-2 pl-7 pr-3 text-white transition focus:border-emerald-500/50 focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs text-slate-400">SA Balance</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
            <input
              type="number"
              value={data.saBalance}
              onChange={(e) => data.onChange('saBalance', Number(e.target.value))}
              className="w-full rounded-lg border border-white/[0.08] bg-white/[0.02] py-2 pl-7 pr-3 text-white transition focus:border-blue-500/50 focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs text-slate-400">MA Balance</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
            <input
              type="number"
              value={data.maBalance}
              onChange={(e) => data.onChange('maBalance', Number(e.target.value))}
              className="w-full rounded-lg border border-white/[0.08] bg-white/[0.02] py-2 pl-7 pr-3 text-white transition focus:border-amber-500/50 focus:outline-none"
            />
          </div>
        </div>

        <div className="pt-2 border-t border-white/10">
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Total CPF:</span>
            <span className="font-medium text-white">{formatCurrency(total)}</span>
          </div>
        </div>

        <div className="pt-2 border-t border-white/10">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={data.hasPropertyPledge}
              onChange={(e) => data.onChange('hasPropertyPledge', e.target.checked)}
              className="rounded border-white/20 bg-white/5"
            />
            <span className="text-xs text-slate-300">Property Pledge (BRS option)</span>
          </label>
          {data.hasPropertyPledge && (
            <p className="text-xs text-slate-500 mt-1 ml-5">Only need BRS ($106.5K) in RA</p>
          )}
        </div>
      </div>

      <Handle type="source" position={Position.Right} className="!bg-cyan-500 !w-3 !h-3" />
    </div>
  )
}

// Transfer Calculator Node
function TransferNode({ data }: { data: {
  saBalance: number
  oaBalance: number
  frs: number
  targetSum: number
  saToRa: number
  oaToRa: number
  raTotal: number
  shortfall: number
}}) {
  return (
    <div className="rounded-xl border border-violet-500/30 bg-violet-500/10 p-4 shadow-xl backdrop-blur min-w-[220px]">
      <Handle type="target" position={Position.Left} className="!bg-violet-500 !w-3 !h-3" />

      <div className="mb-2 text-xs font-medium uppercase tracking-wide text-violet-400">
        RA Creation Process
      </div>

      <div className="space-y-3 text-sm">
        <div className="pb-2 border-b border-white/10">
          <div className="text-xs text-slate-400 mb-1">Target:</div>
          <div className="flex justify-between">
            <span className="text-slate-300">Retirement Sum:</span>
            <span className="font-medium text-white">{formatCurrency(data.targetSum)}</span>
          </div>
        </div>

        <div>
          <div className="text-xs text-slate-400 mb-1">Step 1: SA → RA</div>
          <div className="flex justify-between text-blue-400">
            <span>Transfer from SA:</span>
            <span className="font-medium">{formatCurrency(data.saToRa)}</span>
          </div>
        </div>

        {data.oaToRa > 0 && (
          <div>
            <div className="text-xs text-slate-400 mb-1">Step 2: OA → RA (if needed)</div>
            <div className="flex justify-between text-emerald-400">
              <span>Transfer from OA:</span>
              <span className="font-medium">{formatCurrency(data.oaToRa)}</span>
            </div>
          </div>
        )}

        <div className="pt-2 border-t border-white/10">
          <div className="flex justify-between">
            <span className="text-slate-300">RA Balance:</span>
            <span className="font-bold text-purple-400">{formatCurrency(data.raTotal)}</span>
          </div>
          {data.shortfall > 0 && (
            <div className="flex justify-between text-red-400 mt-1">
              <span>Shortfall from Target:</span>
              <span className="font-medium">-{formatCurrency(data.shortfall)}</span>
            </div>
          )}
        </div>
      </div>

      <Handle type="source" position={Position.Right} className="!bg-violet-500 !w-3 !h-3" />
    </div>
  )
}

// Post-55 Result Node
function ResultNode({ data }: { data: {
  oaRemaining: number
  saRemaining: number
  maBalance: number
  raBalance: number
  withdrawable: number
  canWithdraw: boolean
  shortfall: number
}}) {
  return (
    <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 shadow-xl backdrop-blur min-w-[200px]">
      <Handle type="target" position={Position.Left} className="!bg-emerald-500 !w-3 !h-3" />

      <div className="mb-2 text-xs font-medium uppercase tracking-wide text-emerald-400">
        After Age 55
      </div>

      <div className="space-y-2 text-sm">
        <div className="text-xs text-slate-400 uppercase">Account Balances:</div>

        <div className="flex justify-between">
          <span className="text-emerald-400">OA:</span>
          <span className="font-medium text-white">{formatCurrency(data.oaRemaining)}</span>
        </div>

        <div className="flex justify-between">
          <span className="text-blue-400">SA:</span>
          <span className="font-medium text-white">{formatCurrency(data.saRemaining)}</span>
        </div>

        <div className="flex justify-between">
          <span className="text-amber-400">MA:</span>
          <span className="font-medium text-white">{formatCurrency(data.maBalance)}</span>
        </div>

        <div className="flex justify-between pt-2 border-t border-white/10">
          <span className="text-purple-400">RA:</span>
          <span className="font-bold text-white">{formatCurrency(data.raBalance)}</span>
        </div>

        <div className="pt-2 border-t border-white/10">
          <div className="text-xs text-slate-400 uppercase mb-1">Withdrawable:</div>
          {data.canWithdraw ? (
            <div className="text-xl font-bold text-emerald-400">
              {formatCurrency(data.withdrawable)}
            </div>
          ) : (
            <div>
              <div className="text-lg font-bold text-red-400">$0</div>
              <p className="text-xs text-red-400 mt-1">
                Below FRS by {formatCurrency(data.shortfall)}
              </p>
            </div>
          )}
        </div>

        {data.canWithdraw && data.withdrawable > 0 && (
          <p className="text-xs text-slate-400">
            Amount above FRS can be withdrawn in cash
          </p>
        )}
      </div>
    </div>
  )
}

// SA Shielding Tip Node
function ShieldingTipNode({ data }: { data: {
  saBalance: number
  oaBalance: number
  canShield: boolean
  shieldableAmount: number
}}) {
  if (!data.canShield) return null

  return (
    <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 shadow-xl backdrop-blur min-w-[180px]">
      <Handle type="target" position={Position.Left} className="!bg-amber-500 !w-3 !h-3" />

      <div className="mb-2 text-xs font-medium uppercase tracking-wide text-amber-400">
        💡 SA Shielding Tip
      </div>

      <div className="text-xs text-slate-300 space-y-2">
        <p>Your OA can cover FRS alone!</p>
        <p>
          Shield up to <span className="text-amber-400 font-medium">{formatCurrency(data.shieldableAmount)}</span> by buying T-Bills with SA before 55.
        </p>
        <p className="text-slate-400">
          SA stays liquid at 4% instead of locked in RA.
        </p>
      </div>
    </div>
  )
}

const nodeTypes = {
  balancesInput: BalancesInputNode,
  transfer: TransferNode,
  result: ResultNode,
  shieldingTip: ShieldingTipNode,
}

interface Age55RASimulatorProps {
  className?: string
}

export function Age55RASimulator({ className }: Age55RASimulatorProps) {
  const [oaBalance, setOaBalance] = useState(150000)
  const [saBalance, setSaBalance] = useState(80000)
  const [maBalance, setMaBalance] = useState(50000)
  const [hasPropertyPledge, setHasPropertyPledge] = useState(false)

  const handleChange = (field: string, value: number | boolean) => {
    switch (field) {
      case 'oaBalance': setOaBalance(value as number); break
      case 'saBalance': setSaBalance(value as number); break
      case 'maBalance': setMaBalance(value as number); break
      case 'hasPropertyPledge': setHasPropertyPledge(value as boolean); break
    }
  }

  const calculations = useMemo(() => {
    const targetSum = hasPropertyPledge ? BRS_2025 : FRS_2025
    const totalCpf = oaBalance + saBalance + maBalance

    // Step 1: SA transfers to RA first
    const saToRa = Math.min(saBalance, targetSum)
    const raAfterSa = saToRa
    const remainingNeeded = targetSum - raAfterSa

    // Step 2: OA fills the gap if needed
    const oaToRa = Math.min(oaBalance, Math.max(0, remainingNeeded))
    const raTotal = saToRa + oaToRa

    // Calculate remaining balances
    const oaRemaining = oaBalance - oaToRa
    const saRemaining = saBalance - saToRa // This should be 0 as SA closes

    // Withdrawable amount (anything above target sum)
    const shortfall = Math.max(0, targetSum - raTotal)
    const canWithdraw = shortfall === 0
    const withdrawable = canWithdraw ? (oaRemaining + saRemaining) : 0

    // SA Shielding opportunity
    const canShield = oaBalance >= targetSum
    const shieldableAmount = canShield ? saBalance : Math.max(0, saBalance - (targetSum - oaBalance))

    return {
      targetSum,
      totalCpf,
      saToRa,
      oaToRa,
      raTotal,
      oaRemaining,
      saRemaining,
      shortfall,
      canWithdraw,
      withdrawable,
      canShield,
      shieldableAmount,
    }
  }, [oaBalance, saBalance, maBalance, hasPropertyPledge])

  const nodes: Node[] = useMemo(() => {
    const baseNodes: Node[] = [
      {
        id: 'balances',
        type: 'balancesInput',
        position: { x: -380, y: 50 },
        data: { oaBalance, saBalance, maBalance, hasPropertyPledge, onChange: handleChange },
      },
      {
        id: 'transfer',
        type: 'transfer',
        position: { x: -80, y: 30 },
        data: {
          saBalance,
          oaBalance,
          frs: FRS_2025,
          targetSum: calculations.targetSum,
          saToRa: calculations.saToRa,
          oaToRa: calculations.oaToRa,
          raTotal: calculations.raTotal,
          shortfall: calculations.shortfall,
        },
      },
      {
        id: 'result',
        type: 'result',
        position: { x: 220, y: 30 },
        data: {
          oaRemaining: calculations.oaRemaining,
          saRemaining: calculations.saRemaining,
          maBalance,
          raBalance: calculations.raTotal,
          withdrawable: calculations.withdrawable,
          canWithdraw: calculations.canWithdraw,
          shortfall: calculations.shortfall,
        },
      },
    ]

    // Add shielding tip if applicable
    if (calculations.canShield && calculations.shieldableAmount > 0) {
      baseNodes.push({
        id: 'shielding',
        type: 'shieldingTip',
        position: { x: -80, y: 300 },
        data: {
          saBalance,
          oaBalance,
          canShield: calculations.canShield,
          shieldableAmount: calculations.shieldableAmount,
        },
      })
    }

    return baseNodes
  }, [oaBalance, saBalance, maBalance, hasPropertyPledge, calculations])

  const edges: Edge[] = useMemo(() => {
    const baseEdges: Edge[] = [
      {
        id: 'e-bal-transfer',
        source: 'balances',
        target: 'transfer',
        animated: true,
        style: { stroke: '#8b5cf6', strokeWidth: 2 },
      },
      {
        id: 'e-transfer-result',
        source: 'transfer',
        target: 'result',
        animated: true,
        style: { stroke: '#10b981', strokeWidth: 2 },
      },
    ]

    if (calculations.canShield && calculations.shieldableAmount > 0) {
      baseEdges.push({
        id: 'e-bal-shield',
        source: 'balances',
        target: 'shielding',
        animated: true,
        style: { stroke: '#f59e0b', strokeWidth: 2, strokeDasharray: '5,5' },
      })
    }

    return baseEdges
  }, [calculations.canShield, calculations.shieldableAmount])

  return (
    <div className={`h-[700px] rounded-xl border border-white/[0.08] bg-[#0a0a0a] ${className}`}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        proOptions={{ hideAttribution: true }}
        minZoom={0.5}
        maxZoom={1.5}
        defaultEdgeOptions={{
          type: 'smoothstep',
        }}
      >
        <Background color="#1e293b" gap={20} size={1} />
        <Controls
          className="!bg-slate-800 !border-white/10 !rounded-lg [&>button]:!bg-slate-700 [&>button]:!border-white/10 [&>button:hover]:!bg-slate-600 [&>button>svg]:!fill-white"
        />
      </ReactFlow>

      {/* Summary Footer */}
      <div className="border-t border-white/[0.06] px-4 py-3 flex items-center justify-between text-sm">
        <div className="flex gap-6">
          <div>
            <span className="text-slate-400">Target: </span>
            <span className="font-medium text-violet-400">
              {hasPropertyPledge ? 'BRS' : 'FRS'} ({formatCurrency(calculations.targetSum)})
            </span>
          </div>
          <div>
            <span className="text-slate-400">RA: </span>
            <span className={`font-medium ${calculations.shortfall > 0 ? 'text-red-400' : 'text-purple-400'}`}>
              {formatCurrency(calculations.raTotal)}
            </span>
          </div>
          <div>
            <span className="text-slate-400">Withdrawable: </span>
            <span className="font-medium text-emerald-400">{formatCurrency(calculations.withdrawable)}</span>
          </div>
        </div>
        <div className="text-xs text-slate-500">
          FRS: {formatCurrency(FRS_2025)} | BRS: {formatCurrency(BRS_2025)} (2025)
        </div>
      </div>
    </div>
  )
}
