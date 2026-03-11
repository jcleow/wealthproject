# Chat Ephemeral Visualization Layer — RSC Streaming + Chart Overlays

## Overview

Enable the AI chat to dynamically compose React components in responses and drive temporary visual overlays on the main net worth projection chart. When users ask "what if" questions, the chart becomes a **reactive canvas** — ghost trajectories, annotations, and delta shading appear ephemerally and disappear when the conversation moves on.

---

## Architecture

```
Client (React)
  ├── Chat Panel ← receives streaming RSC components (text + cards + charts)
  └── Main Chart ← reads from Zustand store, draws ephemeral overlays
        ↑
        │ subscribes
        │
  chatVisualizationStore (Zustand) ← written by invisible <ChartOverlaySync />
        ↑
        │ rendered by
        │
  Next.js Server Action (rendering proxy)
        │ composes ResponseLayout with:
        │   - visible chat components (ImpactCard, ScenarioComparison, etc.)
        │   - invisible ChartOverlaySync (bridges data to Zustand store)
        │
        ↓ consumes SSE
  Go Backend (unchanged — same tool execution, same SSE stream)
```

### Key Principle

- **Go backend** = financial brain (LLM, tools, calculations, data) — UNCHANGED
- **Next.js server action** = rendering brain (composition, layout, progressive UI)
- **Zustand store** = data bridge between chat components and main chart
- **Chart.js plugin** = draws ephemeral overlays from the store
- **Client** = thin display layer

---

## How RSC Streaming Works Here

React Server Components streaming sends a **serialized React component tree** (not HTML) over the wire. The client React runtime receives chunks and reconciles them into the live VDOM incrementally.

Vercel AI SDK's `createStreamableUI` provides:
- `ui.update(reactNode)` — update the streamed UI progressively
- `ui.done(reactNode)` — finalize the stream
- `ui.value` — the streamable ReactNode to return to the client

The Next.js server action consumes the Go backend's existing SSE stream and translates tool results into composed React components streamed to the client.

---

## Visual States

### State 1: Baseline (Chat Idle)
- Chat panel shows suggested questions
- Main chart shows the single net worth trajectory with existing scenario markers
- Zustand store is empty — no overlays

### State 2: What-If Ghost Line
- User asks: "What if I buy a $1.5M condo at age 35?"
- Chat panel shows: AI response text + ImpactCard (Net Worth at 60: $2.8M -> $1.9M, Monthly Mortgage: ($4,200), Break-even Age: 48)
- Main chart overlays: rose ghost trajectory diverging at age 35, divergence marker, annotation callout, delta shading, endpoint labels

### State 3: Multi-Scenario Comparison
- User asks: "Compare buying a condo vs investing the down payment"
- Chat panel shows: AI response + ScenarioComparison card (3 rows: Current $2.8M, Buy Condo $1.9M -32%, Invest More $3.2M +14%)
- Main chart overlays: amber ghost line (buy condo), cyan ghost line (invest more), purple divergence marker at age 35, crossover annotations, best-option callout

### State Transition: Ephemeral Cleanup
- When user asks a NEW question, previous `ChartOverlaySync` unmounts
- `useEffect` cleanup fires `clearOverlay()` on the Zustand store
- Old ghost lines disappear, new overlays for the new question appear
- No manual cleanup needed — React's component lifecycle handles it

---

## Implementation Plan

### Phase 1: Zustand Store + Chart.js Plugin

**New files:**

#### `frontend/src/stores/chatVisualizationStore.ts`

```typescript
import { create } from 'zustand'

interface GhostLine {
  id: string
  label: string
  color: string
  dataPoints: { age: number; value: number }[]
}

interface Annotation {
  id: string
  age: number
  value?: number
  label: string
  color: string
  type: 'callout' | 'marker' | 'band'
}

interface ChatVisualizationState {
  ghostLines: GhostLine[]
  annotations: Annotation[]
  highlightRange: { startAge: number; endAge: number } | null
  impactDelta: { baselineEnd: number; scenarioEnd: number } | null

  setOverlay: (overlay: Partial<ChatVisualizationState>) => void
  clearOverlay: () => void
}

export const useChatVisualizationStore = create<ChatVisualizationState>((set) => ({
  ghostLines: [],
  annotations: [],
  highlightRange: null,
  impactDelta: null,

  setOverlay: (overlay) => set((state) => ({ ...state, ...overlay })),
  clearOverlay: () => set({
    ghostLines: [],
    annotations: [],
    highlightRange: null,
    impactDelta: null,
  }),
}))
```

#### `frontend/src/components/dashboard/projections/chartjs/chatOverlayPlugin.ts`

A new Chart.js plugin that reads from the Zustand store and draws:
- Ghost trajectory lines (dashed, color-coded)
- Annotation callouts (rounded pills with labels)
- Delta shading between baseline and ghost curves
- Divergence markers at scenario split points

The plugin uses `useChatVisualizationStore.getState()` to read overlay data on each `afterDraw` cycle.

**Modified files:**

- `frontend/src/components/dashboard/projections/ProjectionChartJS.tsx` — Register the chatOverlayPlugin + inject ghost line datasets from the store

### Phase 2: RSC Server Action (Rendering Proxy)

**New files:**

#### `frontend/src/app/actions/chat.ts`

```typescript
'use server'

import { createStreamableUI } from 'ai/rsc'

export async function sendMessage(messages: Message[], token: string) {
  const ui = createStreamableUI(<ThinkingIndicator />)

  // Proxy to Go backend — same endpoint, same SSE stream
  processGoStream(token, messages, ui)

  return ui.value
}

async function processGoStream(
  token: string,
  messages: Message[],
  ui: ReturnType<typeof createStreamableUI>
) {
  const res = await fetch(`${process.env.GO_BACKEND_URL}/api/v1/chat`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ messages }),
  })

  const reader = res.body!.getReader()
  const decoder = new TextDecoder()
  let text = ''
  let toolResults: ToolResult[] = []

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    for (const event of parseSSE(decoder.decode(value))) {
      switch (event.type) {
        case 'text_delta':
          text += event.content
          ui.update(<ResponseLayout text={text} tools={toolResults} />)
          break
        case 'tool_result':
          toolResults.push(event)
          ui.update(<ResponseLayout text={text} tools={toolResults} />)
          break
        case 'done':
          ui.done(<ResponseLayout text={text} tools={toolResults} final />)
          break
      }
    }
  }
}
```

### Phase 3: Composition Layer + Bridge Component

**New files:**

#### `frontend/src/components/chat/ResponseLayout.tsx` (Server Component)

Dynamic composition logic — decides what to render based on tool results:
- Text streaming with markdown
- ImpactCard for single-scenario analysis
- ScenarioComparison for multi-scenario
- ChartOverlaySync (invisible) for main chart overlays

```typescript
function ResponseLayout({ text, tools, final }: Props) {
  const projection = tools.find(t => t.name === 'projectNetWorthAtYear')
  const comparison = tools.find(t => t.name === 'compareScenarioImpact')
  const overlayData = buildOverlayData(tools)

  return (
    <div className="space-y-4">
      <ChatMarkdown>{text}</ChatMarkdown>

      {/* Visible in chat */}
      {comparison && projection ? (
        <div className="grid grid-cols-2 gap-3">
          <ProjectionChart data={projection.data} scenarios={comparison.data} />
          <ScenarioComparison data={comparison.data} />
        </div>
      ) : projection ? (
        <ProjectionChart data={projection.data} />
      ) : null}

      {/* Invisible — syncs overlays to main chart */}
      {overlayData && <ChartOverlaySync data={overlayData} />}
    </div>
  )
}
```

#### `frontend/src/components/chat/ChartOverlaySync.tsx` (Client Component)

```typescript
'use client'

import { useEffect } from 'react'
import { useChatVisualizationStore } from '@/stores/chatVisualizationStore'

export function ChartOverlaySync({ data }: { data: OverlayData }) {
  const setOverlay = useChatVisualizationStore(s => s.setOverlay)
  const clearOverlay = useChatVisualizationStore(s => s.clearOverlay)

  useEffect(() => {
    setOverlay(data)
    return () => clearOverlay() // ephemeral cleanup on unmount
  }, [data])

  return null // renders nothing
}
```

### Phase 4: Chat Component Updates

**Modified files:**

- `frontend/src/components/chat/Chat.tsx` — Call server action instead of direct SSE fetch. Render streaming ReactNode for assistant messages.

### Phase 5: Rich Chat Components

**New files:**

- `frontend/src/components/chat/ImpactCard.tsx` — Shows financial impact analysis (net worth change, monthly cost, break-even)
- `frontend/src/components/chat/ScenarioComparison.tsx` — Color-coded comparison table with multiple scenarios
- `frontend/src/components/chat/ChatMarkdown.tsx` — Markdown renderer for AI text
- `frontend/src/components/chat/ThinkingIndicator.tsx` — Loading skeleton shown while AI processes

---

## What Changes vs What Stays

| Layer | Changes? | Details |
|-------|----------|---------|
| Go Backend (all 26 tools) | NO | Zero changes. Same SSE endpoint, same tool execution |
| Next.js Server Action | NEW | ~50 lines — thin proxy that consumes Go SSE, composes components |
| ResponseLayout | NEW | Server component for dynamic composition |
| ChartOverlaySync | NEW | Invisible client component, Zustand bridge |
| chatVisualizationStore | NEW | Zustand store for ephemeral overlay data |
| chatOverlayPlugin | NEW | Chart.js plugin reading from Zustand store |
| Chat.tsx | MINOR | Calls server action instead of direct SSE |
| ProjectionChartJS.tsx | MINOR | Register chatOverlayPlugin + ghost line datasets |
| Existing chart/card components | NO | Same components |

---

## Dependencies

- `ai` (Vercel AI SDK) — for `createStreamableUI` from `ai/rsc`
- React 18+ with RSC support (already in Next.js 16)
- Zustand (already installed)
- Chart.js plugin architecture (already used for milestones, currentPositionLine)

---

## Existing Infrastructure (Already Implemented)

The following backend capabilities are fully implemented and ready to power this feature:

- **26 registered AI tools** — 13 CRUD + 6 analysis + 7 scenario tools
- **Read-only tools auto-execute** — `getNetWorthSummary`, `analyzeNetWorthTrends`, `compareScenarioImpact`, `projectNetWorthAtYear`, `identifyNetWorthLevers`
- **Financial context injection** — `GetFinancialContext()` and `FormatContextForPrompt()` inject full financial state into LLM
- **31-year timeline projection engine** — Monthly/yearly resolution with scenario application
- **SSE streaming** — Chat handler already streams responses with tool call results
- **Chart.js plugin architecture** — `milestonePlugin`, `currentPositionLinePlugin` already draw custom canvas overlays

---

## Mockups

Three design mockups were created in Pencil (Assetra3.pen):
- **Screen 1: Baseline** — Chat idle, single trajectory, suggested questions
- **Screen 2: What-If Ghost Line** — Active conversation, rose ghost trajectory with impact card
- **Screen 3: Multi-Scenario Comparison** — Three trajectories (blue/amber/cyan) with comparison table

---

## Estimated Effort

| Phase | Scope | Estimate |
|-------|-------|----------|
| Phase 1 | Zustand store + Chart.js plugin | Small |
| Phase 2 | RSC server action (rendering proxy) | Small |
| Phase 3 | Composition layer + bridge component | Medium |
| Phase 4 | Chat.tsx updates | Small |
| Phase 5 | Rich chat components (cards, tables) | Medium |
| **Total** | | **Medium-Large** |
