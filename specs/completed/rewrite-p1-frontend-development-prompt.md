# Frontend Development Prompt - Financial Chat System

## Project Context

You are tasked with building the **frontend** for a new financial chat system that replaces an existing complex intent parsing system with LLM-native tool calling. This is a complete rewrite using a **new repository approach** with Go backend + React frontend.

**Repository:** `financial-chat-system` (new repo)
**Your Role:** Frontend developer working in parallel with backend team
**Technology Stack:** React 18 + TypeScript + Vite + Tailwind (NO AI SDK)

## Mission Statement

Build a React frontend that maintains the **exact look and feel** of the current financial planning application while removing all Vercel AI SDK dependencies and integrating with a new Go backend via REST APIs.

## Key Requirements

### 1. **Design Consistency**
- **CRITICAL:** Maintain identical visual appearance to current system
- Copy exact CSS classes, color schemes, typography, spacing
- Match current responsive breakpoints and interactions
- Replicate current component patterns and animations

### 2. **No AI SDK Dependencies**
- Remove ALL Vercel AI SDK imports (`from "ai"`)
- Build custom chat hooks and message handling
- Create manual action preview/dispatch workflow

### 3. **Go Backend Integration**
- Integrate with versioned REST APIs (`/api/v1/`)
- Handle action previews and user approval workflow
- Manage session state and authentication

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                           USER INTERACTION                         │
│  User types: "I have a house worth 500k and a mortgage of 300k"    │
└─────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         REACT FRONTEND                             │
│  ├── Chat Interface (matching current design exactly)              │
│  ├── Custom useChat hook (replaces AI SDK)                         │
│  └── Message handling with action preview UI                       │
└─────────────────────────────────────────────────────────────────────┘
                                   │ HTTP POST
                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         GO BACKEND                                 │
│  ├── POST /api/v1/chat (sends message, gets response + actions)    │
│  ├── AI processes message and returns proposed financial actions    │
│  └── POST /api/v1/financial/actions/dispatch (executes approved)   │
└─────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        ACTION PREVIEW UI                           │
│  ├── User reviews AI-proposed actions before execution             │
│  ├── Shows impact estimates and warnings                           │
│  └── Manual approval/modification before dispatch                  │
└─────────────────────────────────────────────────────────────────────┘
```

## API Contract

Your frontend will communicate with these **Go backend endpoints**:

### 1. Chat API
**Endpoint:** `POST /api/v1/chat`

```typescript
interface ChatRequest {
  message: string;      // User's message
  chat_id: string;      // Conversation ID
  session_id: string;   // User session
}

interface ChatResponse {
  message_id: string;                    // Response ID
  content: string;                       // AI's text response
  proposed_actions: ProposedAction[];    // Actions to preview
  requires_approval: boolean;            // Whether actions need approval
}

interface ProposedAction {
  call_id: string;                       // Unique action ID
  tool_name: string;                     // "createAsset", "updateLiability", etc.
  friendly_description: string;          // Human-readable description
  parameters: Record<string, any>;       // Tool parameters
  estimated_impact: {
    net_worth_change: number;
    description: string;
  };
  warnings?: Array<{
    type: string;
    message: string;
    severity: "low" | "medium" | "high";
  }>;
}
```

### 2. Action Dispatch API
**Endpoint:** `POST /api/v1/financial/actions/dispatch`

```typescript
interface DispatchRequest {
  selected_actions: Array<{
    call_id: string;                     // Action to execute
    approved: boolean;                   // User approval
    modified_args?: Record<string, any>; // User modifications
  }>;
  session_id: string;
}

interface DispatchResponse {
  results: Array<{
    call_id: string;
    success: boolean;
    entity_id?: string;    // Created entity ID
    error?: string;
  }>;
  summary: {
    successful: number;
    failed: number;
    total_execution_time_ms: number;
  };
}
```

## Current Repository Reference

**Extract designs from:** `/Users/jitcorn/assetra2/`

### Key Files to Study for Design Patterns:
- `tailwind.config.ts` - Design tokens and configuration
- `app/globals.css` - Global styles and CSS variables
- `/components/ui/` - Radix UI component patterns
- `/components/chat.tsx` - Main chat layout (**COPY THIS EXACTLY**)
- `/components/elements/message.tsx` - Message styling
- `/components/multimodal-input.tsx` - Input field design

### Business Logic to Reference:
- `/lib/financial/types.ts` - Financial data types
- `/features/financial-planning/` - Business rules and calculations

## Development Tickets (29 Story Points)

Your tickets are detailed in: `/Users/jitcorn/assetra2/specs/rewrite-phase-1/frontend-tickets.txt`

### Phase 0: Setup (5 points)
- **F0:** Extract current design system (3 pts)
- **F1:** Create React frontend structure (2 pts)

### Phase 1: API Layer (3 points)
- **F2:** Create API service layer (3 pts)

### Phase 2: Chat Implementation (10 points)
- **F3:** Create custom chat hooks (4 pts)
- **F4:** Recreate chat interface components (6 pts)

### Phase 3: Action UI (9 points)
- **F5:** Create action preview components (6 pts)
- **F6:** Create action results & feedback UI (3 pts)

### Phase 4: Integration (5 points)
- **F7:** Frontend integration & testing (3 pts)
- **F8:** Production build & deployment (2 pts)

## Key Implementation Guidelines

### 1. Design Extraction (Start Here)
```bash
# Study current repository structure
cd /Users/jitcorn/assetra2
# Copy tailwind config, global styles, component patterns
# Document color scheme, typography, spacing
```

### 2. Custom Chat Implementation
```typescript
// Replace AI SDK with custom implementation
function useChat(sessionId: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [pendingActions, setPendingActions] = useState<ProposedAction[]>([]);

  const sendMessage = async (content: string) => {
    // Call Go backend API instead of AI SDK
    const response = await apiService.sendMessage({
      message: content,
      chat_id: generateChatId(),
      session_id: sessionId,
    });

    // Handle response with potential action previews
    if (response.proposed_actions.length > 0) {
      setPendingActions(response.proposed_actions);
    }
  };

  return { messages, sendMessage, pendingActions };
}
```

### 3. Action Preview UI
Create new components for the manual approval workflow:

```typescript
function ActionPreview({ actions }: { actions: ProposedAction[] }) {
  const [selectedActions, setSelectedActions] = useState<string[]>([]);

  return (
    <Card className="w-full"> {/* Match current card styling */}
      <CardHeader>
        <CardTitle>Review Proposed Actions</CardTitle>
      </CardHeader>

      <CardContent>
        {actions.map(action => (
          <ActionCard
            key={action.call_id}
            action={action}
            selected={selectedActions.includes(action.call_id)}
            onSelect={(selected) => {
              // Handle action selection
            }}
          />
        ))}
      </CardContent>

      <CardFooter>
        <Button onClick={dispatchSelectedActions}>
          Execute {selectedActions.length} Actions
        </Button>
      </CardFooter>
    </Card>
  );
}
```

## Development Environment

### Repository Structure
```
financial-chat-system/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ui/           # Radix components (copy from current)
│   │   │   ├── chat/         # Custom chat components
│   │   │   └── financial/    # Action preview components
│   │   ├── hooks/            # Custom hooks (no AI SDK)
│   │   ├── services/         # Go backend API client
│   │   ├── types/            # TypeScript types
│   │   └── styles/           # Tailwind + global styles
│   ├── package.json          # NO AI SDK dependencies
│   └── tailwind.config.js    # Copied from current repo
└── backend/                  # Go backend (other team)
```

### Required Dependencies
```json
{
  "dependencies": {
    "react": "^18.x",
    "typescript": "^5.x",
    "@radix-ui/react-*": "^1.x",  // Same as current repo
    "@tanstack/react-query": "^4.x",
    "react-hook-form": "^7.x"
    // NO "ai" package
    // NO Vercel AI SDK
  }
}
```

## Coordination with Backend Team

### Dependencies
- **Backend must complete:** B6 (Chat API) before your F3-F4
- **Backend must complete:** B7 (Dispatch API) before your F5-F6
- **You can start immediately:** F0 (Design extraction), F1 (Setup), F2 (API service)

### Communication
- Use the API contract as the interface specification
- Mock the Go backend during development
- Test integration when backend APIs are ready

## Success Criteria

### Visual Match (Critical)
- [ ] Identical appearance to current chat interface
- [ ] Same color scheme, typography, spacing
- [ ] Current responsive behavior maintained
- [ ] All animations and interactions preserved

### Functional Requirements
- [ ] Chat works without AI SDK dependencies
- [ ] Action preview UI shows proposed changes
- [ ] Users can approve/modify actions before execution
- [ ] Real-time feedback on execution results
- [ ] Session management and error handling

### Technical Requirements
- [ ] Zero AI SDK dependencies in package.json
- [ ] API versioning headers included
- [ ] TypeScript types match Go backend structs
- [ ] Production build optimized

## Getting Started

1. **Start with F0:** Extract current design patterns from `/Users/jitcorn/assetra2/`
2. **Continue with F1:** Set up fresh React project structure
3. **Build F2:** Create API service layer for Go backend
4. **Implement F3-F4:** Custom chat without AI SDK
5. **Create F5-F6:** Action preview and dispatch UI
6. **Integrate F7-F8:** Testing and production setup

You have complete autonomy to implement the frontend while the backend team works in parallel. The API contract serves as your interface specification.

**Goal:** Deliver a frontend that users cannot distinguish from the current system, but with a clean architecture integrating with the new Go backend.