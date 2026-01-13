'use client'

import { useMemo } from 'react'
import {
  ReactFlow,
  Node,
  Edge,
  Background,
  Controls,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

import { EstimateDisclaimer } from './components/EstimateDisclaimer'
import { SummaryFooter } from './components/SummaryFooter'
import { RAInputNode } from './components/nodes/RAInputNode'
import { PlanNode } from './components/nodes/PlanNode'
import { ProjectionNode } from './components/nodes/ProjectionNode'
import { useCPFLifeEstimates } from './hooks/useCPFLifeEstimates'
import type { PlanType } from './types'

const nodeTypes = {
  raInput: RAInputNode,
  plan: PlanNode,
  projection: ProjectionNode,
}

interface CPFLifeEstimatorProps {
  className?: string
  cpfAccountId?: string
}

export function CPFLifeEstimator({ className, cpfAccountId }: CPFLifeEstimatorProps) {
  const {
    raBalance,
    startAge,
    birthYear,
    gender,
    selectedPlan,
    setSelectedPlan,
    estimates,
    payouts,
    isLoading,
    handleChange,
  } = useCPFLifeEstimates({ cpfAccountId })

  const nodes: Node[] = useMemo(() => [
    {
      id: 'ra',
      type: 'raInput',
      position: { x: -350, y: 80 },
      data: { raBalance, startAge, birthYear, gender, onChange: handleChange, isLoading },
    },
    {
      id: 'standard',
      type: 'plan',
      position: { x: -30, y: -30 },
      data: {
        planType: 'standard' as PlanType,
        payout: payouts.standard,
        description: 'Highest monthly income',
        pros: ['Highest payout'],
        cons: ['Lower bequest'],
        color: 'blue',
        isSelected: selectedPlan === 'standard',
        isLoading,
        onClick: () => setSelectedPlan('standard'),
      },
    },
    {
      id: 'basic',
      type: 'plan',
      position: { x: -30, y: 150 },
      data: {
        planType: 'basic' as PlanType,
        payout: payouts.basic,
        description: 'Leave more to family',
        pros: ['Highest bequest'],
        cons: ['Lower payout'],
        color: 'green',
        isSelected: selectedPlan === 'basic',
        isLoading,
        onClick: () => setSelectedPlan('basic'),
      },
    },
    {
      id: 'escalating',
      type: 'plan',
      position: { x: -30, y: 330 },
      data: {
        planType: 'escalating' as PlanType,
        payout: payouts.escalating,
        description: 'Payouts grow 2%/year',
        pros: ['Inflation hedge'],
        cons: ['Lowest start'],
        color: 'amber',
        isSelected: selectedPlan === 'escalating',
        isLoading,
        onClick: () => setSelectedPlan('escalating'),
      },
    },
    {
      id: 'projection',
      type: 'projection',
      position: { x: 240, y: 100 },
      data: {
        monthlyPayout: payouts[selectedPlan],
        planType: selectedPlan,
        startAge,
        payoutAt75: selectedPlan === 'escalating' ? payouts.escalatingAt75 : undefined,
        payoutAt85: selectedPlan === 'escalating' ? payouts.escalatingAt85 : undefined,
        isLoading,
      },
    },
  ], [raBalance, startAge, birthYear, gender, payouts, selectedPlan, isLoading, handleChange, setSelectedPlan])

  const edges: Edge[] = useMemo(() => [
    {
      id: 'e-ra-standard',
      source: 'ra',
      target: 'standard',
      animated: true,
      style: { stroke: '#3b82f6', strokeWidth: selectedPlan === 'standard' ? 3 : 1 },
    },
    {
      id: 'e-ra-basic',
      source: 'ra',
      target: 'basic',
      animated: true,
      style: { stroke: '#10b981', strokeWidth: selectedPlan === 'basic' ? 3 : 1 },
    },
    {
      id: 'e-ra-escalating',
      source: 'ra',
      target: 'escalating',
      animated: true,
      style: { stroke: '#f59e0b', strokeWidth: selectedPlan === 'escalating' ? 3 : 1 },
    },
    {
      id: 'e-standard-proj',
      source: 'standard',
      target: 'projection',
      animated: selectedPlan === 'standard',
      style: { stroke: '#3b82f6', strokeWidth: selectedPlan === 'standard' ? 3 : 1, opacity: selectedPlan === 'standard' ? 1 : 0.3 },
    },
    {
      id: 'e-basic-proj',
      source: 'basic',
      target: 'projection',
      animated: selectedPlan === 'basic',
      style: { stroke: '#10b981', strokeWidth: selectedPlan === 'basic' ? 3 : 1, opacity: selectedPlan === 'basic' ? 1 : 0.3 },
    },
    {
      id: 'e-escalating-proj',
      source: 'escalating',
      target: 'projection',
      animated: selectedPlan === 'escalating',
      style: { stroke: '#f59e0b', strokeWidth: selectedPlan === 'escalating' ? 3 : 1, opacity: selectedPlan === 'escalating' ? 1 : 0.3 },
    },
  ], [selectedPlan])

  return (
    <div className={className}>
      <div className="mb-4">
        <EstimateDisclaimer />
      </div>

      {estimates && (
        <div className="mb-4 flex items-center justify-between">
          <span className="text-xs text-slate-400">
            Birth year: {estimates.birthYear} | Gender: {estimates.gender}
          </span>
        </div>
      )}

      <div className="h-[650px] rounded-xl border border-white/[0.08] bg-[#0a0a0a]">
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
            className={`!bg-slate-800 !border-white/10 !rounded-lg [&>button]:!bg-slate-700 [&>button]:!border-white/10 [&>button:hover]:!bg-slate-600 [&>button>svg]:!fill-white`}
          />
        </ReactFlow>
      </div>

      <SummaryFooter
        raBalance={raBalance}
        selectedPlan={selectedPlan}
        payouts={payouts}
        isLoading={isLoading}
      />
    </div>
  )
}
