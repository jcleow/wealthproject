'use client'

import { useMemo } from 'react'
import {
  ReactFlow,
  Node,
  Edge,
  Background,
  Handle,
  Position,
  MarkerType,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { formatCurrency } from '@/lib/format'

// CPF 2025 Constants
const FRS = 213000

interface FlowchartProps {
  saBalance: number
  oaBalance: number
  className?: string
}

// Decision diamond node component
function DecisionNode({ data }: { data: { label: string; isActive: boolean } }) {
  return (
    <div
      className={`relative flex h-[80px] w-[140px] rotate-45 items-center justify-center rounded-lg border-2 transition-all duration-300 ${
        data.isActive
          ? 'border-cyan-400 bg-cyan-500/20 shadow-lg shadow-cyan-500/20'
          : 'border-white/20 bg-white/[0.03]'
      }`}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!-left-1 !top-1/2 !h-2 !w-2 !-rotate-45 !border-0 !bg-slate-400"
      />
      <span
        className={`-rotate-45 text-center text-xs font-medium leading-tight ${
          data.isActive ? 'text-cyan-300' : 'text-slate-400'
        }`}
      >
        {data.label}
      </span>
      <Handle
        type="source"
        position={Position.Top}
        id="yes"
        className="!-top-1 !left-1/2 !h-2 !w-2 !-rotate-45 !border-0 !bg-emerald-400"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="no"
        className="!-bottom-1 !left-1/2 !h-2 !w-2 !-rotate-45 !border-0 !bg-amber-400"
      />
    </div>
  )
}

// Start node (shows balances)
function StartNode({ data }: { data: { sa: number; oa: number } }) {
  return (
    <div className="rounded-xl border border-white/[0.08] bg-[#0f1728]/95 p-3 shadow-xl backdrop-blur">
      <div className="mb-2 text-center text-xs font-medium uppercase tracking-wide text-slate-400">
        Your Balances
      </div>
      <div className="space-y-1 text-center">
        <div className="flex items-center justify-between gap-4">
          <span className="text-xs text-purple-400">SA:</span>
          <span className="font-mono text-sm text-purple-300">{formatCurrency(data.sa)}</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-xs text-blue-400">OA:</span>
          <span className="font-mono text-sm text-blue-300">{formatCurrency(data.oa)}</span>
        </div>
      </div>
      <Handle
        type="source"
        position={Position.Right}
        className="!h-2 !w-2 !border-0 !bg-slate-400"
      />
    </div>
  )
}

// Action/Result node component
function ActionNode({
  data,
}: {
  data: { steps: string[]; isActive: boolean; variant: 'action' | 'result' }
}) {
  const bgColor =
    data.variant === 'result'
      ? data.isActive
        ? 'border-amber-400/50 bg-amber-500/15'
        : 'border-white/10 bg-white/[0.02]'
      : data.isActive
        ? 'border-emerald-400/50 bg-emerald-500/15'
        : 'border-white/10 bg-white/[0.02]'

  const textColor =
    data.variant === 'result'
      ? data.isActive
        ? 'text-amber-300'
        : 'text-slate-500'
      : data.isActive
        ? 'text-emerald-300'
        : 'text-slate-500'

  return (
    <div
      className={`max-w-[180px] rounded-lg border p-3 transition-all duration-300 ${bgColor} ${
        data.isActive ? 'shadow-lg' : ''
      }`}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!h-2 !w-2 !border-0 !bg-slate-400"
      />
      <ol className="space-y-1">
        {data.steps.map((step, i) => (
          <li key={i} className={`text-xs leading-snug ${textColor}`}>
            {data.steps.length > 1 && <span className="mr-1">{i + 1})</span>}
            {step}
          </li>
        ))}
      </ol>
      {data.variant === 'action' && (
        <Handle
          type="source"
          position={Position.Right}
          className="!h-2 !w-2 !border-0 !bg-slate-400"
        />
      )}
    </div>
  )
}

// Final outcome node
function OutcomeNode({ data }: { data: { label: string; isActive: boolean } }) {
  return (
    <div
      className={`rounded-lg border-2 px-4 py-2 transition-all duration-300 ${
        data.isActive
          ? 'border-amber-400 bg-amber-500/20 shadow-lg shadow-amber-500/20'
          : 'border-white/20 bg-white/[0.03]'
      }`}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!h-2 !w-2 !border-0 !bg-slate-400"
      />
      <span className={`text-xs font-medium ${data.isActive ? 'text-amber-300' : 'text-slate-500'}`}>
        {data.label}
      </span>
    </div>
  )
}

const nodeTypes = {
  decision: DecisionNode,
  start: StartNode,
  action: ActionNode,
  outcome: OutcomeNode,
}

export function Age55DecisionFlowchart({ saBalance, oaBalance, className }: FlowchartProps) {
  // Determine which path is active based on balances
  const activePath = useMemo(() => {
    const saGreaterThanFRS = saBalance > FRS
    const combinedGreaterThanFRS = oaBalance + saBalance > FRS

    if (saGreaterThanFRS) {
      return 'path1' // SA > FRS
    } else if (combinedGreaterThanFRS) {
      return 'path2' // SA <= FRS, but OA + SA > FRS
    } else {
      return 'path3' // OA + SA <= FRS
    }
  }, [saBalance, oaBalance])

  // Build nodes with active states
  const nodes: Node[] = useMemo(
    () => [
      // Start node
      {
        id: 'start',
        type: 'start',
        position: { x: 0, y: 120 },
        data: { sa: saBalance, oa: oaBalance },
        draggable: false,
      },
      // First decision: Is SA > FRS?
      {
        id: 'decision1',
        type: 'decision',
        position: { x: 180, y: 105 },
        data: { label: 'Is SA > FRS?', isActive: true },
        draggable: false,
      },
      // Path 1 (Yes): SA > FRS actions
      {
        id: 'action1',
        type: 'action',
        position: { x: 320, y: 0 },
        data: {
          steps: ['Transfer SA = FRS to RA', 'Transfer excess SA to OA'],
          isActive: activePath === 'path1',
          variant: 'action',
        },
        draggable: false,
      },
      {
        id: 'result1',
        type: 'action',
        position: { x: 520, y: 0 },
        data: {
          steps: ['Close SA'],
          isActive: activePath === 'path1',
          variant: 'result',
        },
        draggable: false,
      },
      {
        id: 'outcome1',
        type: 'outcome',
        position: { x: 680, y: 10 },
        data: { label: 'OA can be withdrawn', isActive: activePath === 'path1' },
        draggable: false,
      },
      // Second decision: Is OA + SA > FRS?
      {
        id: 'decision2',
        type: 'decision',
        position: { x: 320, y: 200 },
        data: {
          label: 'Is OA + SA > FRS?',
          isActive: activePath === 'path2' || activePath === 'path3',
        },
        draggable: false,
      },
      // Path 2 (Yes for decision 2): OA + SA > FRS actions
      {
        id: 'action2',
        type: 'action',
        position: { x: 500, y: 140 },
        data: {
          steps: ['Transfer all SA to RA', 'Transfer OA = FRS - SA to RA'],
          isActive: activePath === 'path2',
          variant: 'action',
        },
        draggable: false,
      },
      // Path 3 (No for decision 2): OA + SA <= FRS actions
      {
        id: 'action3',
        type: 'action',
        position: { x: 500, y: 280 },
        data: {
          steps: ['First $5k in OA remains in OA', 'Transfer balance OA + SA to RA'],
          isActive: activePath === 'path3',
          variant: 'action',
        },
        draggable: false,
      },
    ],
    [saBalance, oaBalance, activePath]
  )

  // Build edges with active states
  const edges: Edge[] = useMemo(
    () => [
      // Start to Decision 1
      {
        id: 'e-start-d1',
        source: 'start',
        target: 'decision1',
        animated: true,
        style: { stroke: '#64748b', strokeWidth: 2 },
      },
      // Decision 1 -> Yes -> Action 1
      {
        id: 'e-d1-yes',
        source: 'decision1',
        sourceHandle: 'yes',
        target: 'action1',
        label: 'Yes',
        labelStyle: { fill: '#22c55e', fontWeight: 600, fontSize: 11 },
        labelBgStyle: { fill: 'transparent' },
        animated: activePath === 'path1',
        style: {
          stroke: activePath === 'path1' ? '#22c55e' : '#374151',
          strokeWidth: activePath === 'path1' ? 2 : 1,
        },
        markerEnd: { type: MarkerType.ArrowClosed, color: activePath === 'path1' ? '#22c55e' : '#374151' },
      },
      // Action 1 -> Result 1
      {
        id: 'e-a1-r1',
        source: 'action1',
        target: 'result1',
        animated: activePath === 'path1',
        style: {
          stroke: activePath === 'path1' ? '#22c55e' : '#374151',
          strokeWidth: activePath === 'path1' ? 2 : 1,
        },
        markerEnd: { type: MarkerType.ArrowClosed, color: activePath === 'path1' ? '#22c55e' : '#374151' },
      },
      // Result 1 -> Outcome 1
      {
        id: 'e-r1-o1',
        source: 'result1',
        target: 'outcome1',
        animated: activePath === 'path1',
        style: {
          stroke: activePath === 'path1' ? '#fbbf24' : '#374151',
          strokeWidth: activePath === 'path1' ? 2 : 1,
        },
        markerEnd: { type: MarkerType.ArrowClosed, color: activePath === 'path1' ? '#fbbf24' : '#374151' },
      },
      // Decision 1 -> No -> Decision 2
      {
        id: 'e-d1-no',
        source: 'decision1',
        sourceHandle: 'no',
        target: 'decision2',
        label: 'No',
        labelStyle: { fill: '#f59e0b', fontWeight: 600, fontSize: 11 },
        labelBgStyle: { fill: 'transparent' },
        animated: activePath === 'path2' || activePath === 'path3',
        style: {
          stroke: activePath !== 'path1' ? '#f59e0b' : '#374151',
          strokeWidth: activePath !== 'path1' ? 2 : 1,
        },
        markerEnd: { type: MarkerType.ArrowClosed, color: activePath !== 'path1' ? '#f59e0b' : '#374151' },
      },
      // Decision 2 -> Yes -> Action 2
      {
        id: 'e-d2-yes',
        source: 'decision2',
        sourceHandle: 'yes',
        target: 'action2',
        label: 'Yes',
        labelStyle: { fill: '#22c55e', fontWeight: 600, fontSize: 11 },
        labelBgStyle: { fill: 'transparent' },
        animated: activePath === 'path2',
        style: {
          stroke: activePath === 'path2' ? '#22c55e' : '#374151',
          strokeWidth: activePath === 'path2' ? 2 : 1,
        },
        markerEnd: { type: MarkerType.ArrowClosed, color: activePath === 'path2' ? '#22c55e' : '#374151' },
      },
      // Decision 2 -> No -> Action 3
      {
        id: 'e-d2-no',
        source: 'decision2',
        sourceHandle: 'no',
        target: 'action3',
        label: 'No',
        labelStyle: { fill: '#f59e0b', fontWeight: 600, fontSize: 11 },
        labelBgStyle: { fill: 'transparent' },
        animated: activePath === 'path3',
        style: {
          stroke: activePath === 'path3' ? '#f59e0b' : '#374151',
          strokeWidth: activePath === 'path3' ? 2 : 1,
        },
        markerEnd: { type: MarkerType.ArrowClosed, color: activePath === 'path3' ? '#f59e0b' : '#374151' },
      },
    ],
    [activePath]
  )

  return (
    <div className={`rounded-xl border border-white/[0.08] bg-[#0a0a0a] ${className}`}>
      <div className="border-b border-white/[0.06] px-5 py-3">
        <h4 className="text-sm font-medium text-white">CPF Transfer Decision Flow at Age 55</h4>
        <p className="mt-0.5 text-xs text-slate-500">
          FRS 2025: {formatCurrency(FRS)} • Your path is highlighted
        </p>
      </div>
      <div className="h-[320px] w-full">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.3 }}
          proOptions={{ hideAttribution: true }}
          panOnDrag={false}
          zoomOnScroll={false}
          zoomOnPinch={false}
          zoomOnDoubleClick={false}
          preventScrolling={false}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
        >
          <Background color="#1e293b" gap={20} size={1} />
        </ReactFlow>
      </div>
      {/* Legend */}
      <div className="flex items-center justify-center gap-6 border-t border-white/[0.06] px-5 py-3">
        <div className="flex items-center gap-2">
          <div className="h-2 w-4 rounded-sm bg-emerald-500" />
          <span className="text-xs text-slate-400">Yes path</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-2 w-4 rounded-sm bg-amber-500" />
          <span className="text-xs text-slate-400">No path</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-2 w-4 rounded-sm bg-cyan-500" />
          <span className="text-xs text-slate-400">Decision point</span>
        </div>
      </div>
    </div>
  )
}
