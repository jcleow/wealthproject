# Financial Tool Calling Implementation - New Repository Approach

This document breaks down the implementation of LLM-native tool calling in a completely new repository.

**APPROACH: New Repo with Go Backend + Fresh Frontend**
- **New Repository**: Clean start without legacy code and dependencies
- **Go Backend**: Handles all LLM interactions, tool calling, action preview/dispatch
- **Fresh Frontend**: React/TypeScript rewrite maintaining current look & feel
- **Reference Current Repo**: Copy business logic, styles, and patterns from existing system
- **Migration Strategy**: Deploy new system alongside current one, then migrate

## Epic: Build New Financial Tool Calling System (New Repo)

### Phase 0: Repository Setup & Reference Extraction

#### Ticket 0a: Create New Repository Structure
**Priority:** P0
**Estimate:** 2 story points
**Dependencies:** None

**Description:**
Create new repository with clean Go backend + React frontend structure.

**Acceptance Criteria:**
- [ ] Create new GitHub repository: `financial-chat-system`
- [ ] Set up Go backend structure with proper modules
- [ ] Set up React frontend with Vite + TypeScript
- [ ] Configure development environment (Docker, scripts)
- [ ] Set up CI/CD pipeline basics
- [ ] Create README with setup instructions

**Technical Details:**
```
financial-chat-system/
├── backend/
│   ├── cmd/server/
│   ├── internal/
│   ├── go.mod
│   └── Dockerfile
├── frontend/
│   ├── src/
│   ├── package.json (no AI SDK deps)
│   └── Dockerfile
├── docker-compose.yml
└── README.md
```

**Specific Files:**
- Complete repository scaffolding
- Development environment setup

#### Ticket 0b: Extract Business Logic & Styles from Current Repo
**Priority:** P0
**Estimate:** 3 story points
**Dependencies:** Ticket 0a

**Description:**
Extract and document business logic, UI patterns, and styles from current repository to maintain look & feel.

**Acceptance Criteria:**
- [ ] Document financial calculation logic from `/lib/financial/types.ts`
- [ ] Extract database schemas and migration patterns
- [ ] Copy UI component styles and design patterns
- [ ] Document current chat UI layout and interactions
- [ ] Extract authentication and session management patterns
- [ ] Create style guide with current colors, fonts, spacing

**Technical Details:**
- Study `/components/chat.tsx` for layout and interactions
- Extract Tailwind classes and component patterns
- Document `/features/financial-planning/` business rules
- Copy database schema from migrations
- Reference design system from existing components

**Reference Files from Current Repo:**
- `/lib/financial/types.ts` - Core business types
- `/components/chat.tsx` - Chat UI layout
- `/components/elements/message.tsx` - Message styling
- `/features/financial-planning/` - Business logic
- `/internal/migrations/` - Database schemas
- Tailwind config and global styles

### Phase 1: Go Backend Foundation

#### Ticket 1: Go LLM Client Interface & Types
**Priority:** P0
**Estimate:** 3 story points
**Dependencies:** None

**Description:**
Create LLM client abstraction in Go backend for calling various LLM providers.

**Acceptance Criteria:**
- [ ] Create `internal/llm/types.go` with ChatMessage, ToolCall, ToolDefinition structs
- [ ] Define LLMClient interface for multiple providers (OpenAI, Anthropic, Google)
- [ ] Create ChatRequest and ChatResponse structs
- [ ] Support tool calling in LLM requests
- [ ] Abstract away provider-specific differences

**Technical Details:**
```go
type LLMClient interface {
    GenerateToolCalls(ctx context.Context, req ChatRequest) (*ToolCallResponse, error)
}

type ChatMessage struct {
    Role    string `json:"role"`
    Content string `json:"content"`
    ToolCalls []ToolCall `json:"tool_calls,omitempty"`
}

type ToolCall struct {
    ID string `json:"id"`
    Type string `json:"type"`
    Function FunctionCall `json:"function"`
}
```

**Specific Files:**
- `internal/llm/types.go` (new)
- `internal/llm/client.go` (new interface definition)

### Phase 2: Go LLM Provider Implementation

#### Ticket 2a: Implement OpenAI Provider
**Priority:** P0
**Estimate:** 5 story points
**Dependencies:** Ticket 1

**Description:**
Implement OpenAI provider in Go for LLM tool calling.

**Acceptance Criteria:**
- [ ] Add OpenAI Go SDK dependency
- [ ] Create `internal/llm/providers/openai.go`
- [ ] Implement OpenAIProvider struct with LLMClient interface
- [ ] Handle OpenAI tool calling format (native)
- [ ] Support GPT-4 and other OpenAI models
- [ ] Error handling and retry logic

**Technical Details:**
```go
type OpenAIProvider struct {
    client *openai.Client
    model  string
}

func (p *OpenAIProvider) GenerateToolCalls(ctx context.Context, req ChatRequest) (*ToolCallResponse, error) {
    // Implementation with openai-go SDK
}
```

**Specific Files:**
- `internal/llm/providers/openai.go` (new)
- `go.mod` (add openai-go dependency)

#### Ticket 2b: Implement Anthropic Provider (Optional)
**Priority:** P1
**Estimate:** 4 story points
**Dependencies:** Ticket 1

**Description:**
Implement Anthropic Claude provider in Go for tool calling.

**Acceptance Criteria:**
- [ ] Add Anthropic Go SDK dependency
- [ ] Create `internal/llm/providers/anthropic.go`
- [ ] Implement AnthropicProvider struct with LLMClient interface
- [ ] Convert Claude tool calling format to standard format
- [ ] Support Claude-3 models
- [ ] Handle Anthropic-specific API differences

**Technical Details:**
- Direct HTTP calls to Anthropic API
- Convert Claude's function calling to standard ToolCall format
- Handle Anthropic-specific request/response structure

### Phase 3: Go Financial Tools Implementation

#### Ticket 3a: Define Financial Tools in Go
**Priority:** P0
**Estimate:** 4 story points
**Dependencies:** Ticket 2a

**Description:**
Create financial tool definitions and registry in Go backend.

**Acceptance Criteria:**
- [ ] Create `internal/financial/tools.go` with tool definitions
- [ ] Define 5 financial tools: create_asset, update_asset, create_liability, update_liability, create_property_scenario
- [ ] Use OpenAI function calling JSON schema format
- [ ] Include parameter validation with Go struct tags
- [ ] Create tool registry for lookup and execution

**Technical Details:**
```go
type ToolDefinition struct {
    Type     string          `json:"type"`
    Function FunctionSchema  `json:"function"`
}

type FunctionSchema struct {
    Name        string                 `json:"name"`
    Description string                 `json:"description"`
    Parameters  map[string]interface{} `json:"parameters"`
}

type FinancialToolRegistry struct {
    tools map[string]ToolDefinition
}
```

**Specific Files:**
- `internal/financial/tools.go` (new)
- `internal/financial/registry.go` (new)

#### Ticket 3b: Implement Action Preview Service
**Priority:** P0
**Estimate:** 5 story points
**Dependencies:** Ticket 3a

**Description:**
Create Go service to generate action previews from LLM tool calls.

**Acceptance Criteria:**
- [ ] Create `internal/financial/preview.go`
- [ ] Generate friendly descriptions from tool parameters
- [ ] Calculate impact estimates (net worth changes, monthly payments)
- [ ] Detect warnings (high interest rates, MSR violations)
- [ ] Identify dependencies between actions
- [ ] Return structured ProposedAction objects

**Technical Details:**
```go
type ProposedAction struct {
    CallID              string   `json:"call_id"`
    ToolName           string   `json:"tool_name"`
    FriendlyDescription string   `json:"friendly_description"`
    Parameters         map[string]interface{} `json:"parameters"`
    EstimatedImpact    string   `json:"estimated_impact"`
    Warnings           []string `json:"warnings,omitempty"`
    Dependencies       []string `json:"dependencies,omitempty"`
}

type ActionPreviewService struct {
    financialCalc   *FinancialCalculator
    warningDetector *WarningDetector
}
```

**Specific Files:**
- `internal/financial/preview.go` (new)
- `internal/financial/calculator.go` (new)

### Phase 4: Go Backend API Endpoints

#### Ticket 4a: Implement Chat API Handler
**Priority:** P0
**Estimate:** 6 story points
**Dependencies:** Ticket 2a, 3a, 3b

**Description:**
Create Go HTTP handler for chat API that calls LLM and returns action previews.

**Acceptance Criteria:**
- [ ] Create `cmd/server/handlers/chat.go`
- [ ] Implement POST /api/chat endpoint
- [ ] Integrate LLM client with financial tools
- [ ] Generate action previews from LLM tool calls
- [ ] Handle authentication and session management
- [ ] Return structured JSON response

**Technical Details:**
```go
type ChatRequest struct {
    Message   string `json:"message"`
    ChatID    string `json:"chat_id"`
    SessionID string `json:"session_id"`
}

type ChatResponse struct {
    MessageID       string           `json:"message_id"`
    Content         string           `json:"content"`
    ProposedActions []ProposedAction `json:"proposed_actions"`
    RequiresApproval bool            `json:"requires_approval"`
}

func (h *ChatHandler) HandleChat(w http.ResponseWriter, r *http.Request) {
    // Implementation
}
```

**Specific Files:**
- `cmd/server/handlers/chat.go` (new)
- `cmd/server/middleware/auth.go` (new)

#### Ticket 4b: Implement Action Dispatch API Handler
**Priority:** P0
**Estimate:** 5 story points
**Dependencies:** Ticket 4a

**Description:**
Create Go HTTP handler for executing approved financial actions.

**Acceptance Criteria:**
- [ ] Create `cmd/server/handlers/dispatch.go`
- [ ] Implement POST /api/financial/actions/dispatch endpoint
- [ ] Execute selected actions via database client
- [ ] Handle dependencies and partial failures
- [ ] Update session state with new entity IDs
- [ ] Return execution results

**Technical Details:**
```go
type DispatchRequest struct {
    SelectedActions []SelectedAction `json:"selected_actions"`
}

type SelectedAction struct {
    CallID       string                 `json:"call_id"`
    Approved     bool                   `json:"approved"`
    ModifiedArgs map[string]interface{} `json:"modified_args,omitempty"`
}

type ExecutionResult struct {
    CallID   string `json:"call_id"`
    Success  bool   `json:"success"`
    EntityID string `json:"entity_id,omitempty"`
    Error    string `json:"error,omitempty"`
}
```

**Specific Files:**
- `cmd/server/handlers/dispatch.go` (new)
- `internal/financial/executor.go` (new)

### Phase 5: Frontend Foundation (Maintaining Current Look & Feel)

#### Ticket 5a: Recreate Frontend with Current Design System
**Priority:** P0
**Estimate:** 4 story points
**Dependencies:** Ticket 4a, Ticket 0b

**Description:**
Set up fresh React frontend that matches current repository's look and feel.

**Acceptance Criteria:**
- [ ] Recreate current Tailwind config and design tokens
- [ ] Copy current color scheme, typography, and spacing
- [ ] Replicate existing component layout patterns
- [ ] Match current chat interface design exactly
- [ ] Use same Radix UI components as current repo
- [ ] Maintain responsive design patterns

**Technical Details:**
```
frontend/src/
├── styles/
│   ├── globals.css (copy from current repo)
│   └── tailwind.config.js (match current config)
├── components/
│   ├── ui/ (Radix components like current repo)
│   └── financial/ (new action preview components)
├── hooks/ (custom hooks, no AI SDK)
├── services/ (Go backend API client)
└── types/ (TypeScript types matching Go structs)
```

**Design Consistency:**
- Copy exact Tailwind classes from current components
- Match current spacing, borders, shadows, colors
- Use same icons and visual hierarchy
- Maintain current responsive breakpoints

**Reference Files from Current Repo:**
- `tailwind.config.ts` - Design tokens
- `app/globals.css` - Global styles
- `/components/ui/` - Radix UI patterns
- `/components/chat.tsx` - Main layout
- Color scheme and typography patterns

**Specific Files:**
- `frontend/tailwind.config.js` (copied and adapted)
- `frontend/src/styles/globals.css` (match current styles)

#### Ticket 5b: Create API Service Layer
**Priority:** P0
**Estimate:** 2 story points
**Dependencies:** Ticket 5a

**Description:**
Create TypeScript service layer to communicate with Go backend APIs.

**Acceptance Criteria:**
- [ ] Create `src/services/api.ts` with Go backend client
- [ ] Define TypeScript types matching Go structs
- [ ] Implement chat API calls (POST /api/chat)
- [ ] Implement dispatch API calls (POST /api/financial/actions/dispatch)
- [ ] Add error handling and request/response validation
- [ ] Use React Query for caching and state management

**Technical Details:**
```typescript
interface ChatRequest {
  message: string;
  chat_id: string;
  session_id: string;
}

interface ChatResponse {
  message_id: string;
  content: string;
  proposed_actions: ProposedAction[];
  requires_approval: boolean;
}

class ApiService {
  async sendMessage(request: ChatRequest): Promise<ChatResponse> {
    // HTTP fetch to Go backend
  }

  async dispatchActions(actions: SelectedAction[]): Promise<ExecutionResult[]> {
    // HTTP fetch to Go backend
  }
}
```

**Specific Files:**
- `src/services/api.ts` (new)
- `src/types/api.ts` (new - TypeScript types matching Go structs)

**Description:**
Create API endpoint for selective execution of approved actions.

**Acceptance Criteria:**
- [ ] Create `/app/api/financial/actions/dispatch/route.ts`
- [ ] Accept array of selected call_ids from user approval
- [ ] Look up original actions by call_id
- [ ] Execute actions in dependency order
- [ ] Use existing `financialClient` for actual CRUD operations
- [ ] Handle partial failures gracefully
- [ ] Return execution results with success/failure status
- [ ] Maintain audit trail of executed actions
- [ ] Support session state updates (lastAssetId, etc.)

**Technical Details:**
- Integrate with existing `dispatchIntentActions` patterns
- Use topological sort for dependency ordering
- Wrap `financialClient` calls with error handling
- Update session state for entity linking

### Phase 6: Chat UI Implementation

#### Ticket 6a: Create Custom Chat Hooks
**Priority:** P0
**Estimate:** 4 story points
**Dependencies:** Ticket 5b

**Description:**
Create custom React hooks for chat functionality without AI SDK dependencies.

**Acceptance Criteria:**
- [ ] Create `src/hooks/useChat.ts` with custom implementation
- [ ] Message state management (messages, input, isLoading, error)
- [ ] Custom handleSubmit function calling Go backend
- [ ] Action preview state management (pendingActions, selectedActions)
- [ ] Integrate with React Query for API state management
- [ ] Handle responses with/without proposed actions

**Technical Details:**
```typescript
interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  proposed_actions?: ProposedAction[];
}

function useChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [pendingActions, setPendingActions] = useState<ProposedAction[]>([]);

  const sendMessage = async (content: string) => {
    // Call Go backend API
    // Handle response with potential action previews
  };

  return { messages, input, setInput, sendMessage, isLoading, pendingActions };
}
```

**Specific Files:**
- `src/hooks/useChat.ts` (new)
- `src/hooks/useActionPreview.ts` (new)

#### Ticket 6b: Recreate Current Chat Interface (Exact Match)
**Priority:** P0
**Estimate:** 6 story points
**Dependencies:** Ticket 6a

**Description:**
Recreate the current chat interface components with identical look and feel.

**Acceptance Criteria:**
- [ ] Recreate `Chat.tsx` matching current `/components/chat.tsx` layout
- [ ] Recreate `MessageList.tsx` with same styling as current message display
- [ ] Recreate `MessageInput.tsx` matching current `/components/multimodal-input.tsx` design
- [ ] Recreate `Message.tsx` with identical styling to `/components/elements/message.tsx`
- [ ] Match current spacing, animations, and interactions exactly
- [ ] Maintain current responsive behavior and breakpoints

**Technical Details:**
```typescript
// Recreate current chat layout exactly
function Chat() {
  const { messages, input, setInput, sendMessage, isLoading, pendingActions } = useChat();

  return (
    <div className="flex flex-col h-screen max-w-3xl mx-auto"> {/* Match current layout */}
      <ChatHeader /> {/* Copy from current repo */}
      <MessageList messages={messages} className="flex-1 overflow-y-auto p-4" />
      {pendingActions.length > 0 && (
        <ActionPreview actions={pendingActions} /> {/* New component but match design */}
      )}
      <MessageInput
        value={input}
        onChange={setInput}
        onSubmit={sendMessage}
        isLoading={isLoading}
        className="border-t bg-background p-4" {/* Match current input styling */}
      />
    </div>
  );
}
```

**Design Matching Requirements:**
- Copy exact CSS classes from current `/components/chat.tsx`
- Match message bubble styling from `/components/elements/message.tsx`
- Replicate input field design from `/components/multimodal-input.tsx`
- Use same loading states and animations
- Match current color scheme and typography

**Reference Components from Current Repo:**
- `/components/chat.tsx` - Main layout and structure
- `/components/elements/message.tsx` - Message styling
- `/components/multimodal-input.tsx` - Input field design
- `/components/chat-header.tsx` - Header component

**Specific Files:**
- `src/components/Chat.tsx` (recreate current design)
- `src/components/MessageList.tsx` (match current message list)
- `src/components/MessageInput.tsx` (copy current input styling)
- `src/components/Message.tsx` (identical to current message styling)

#### Ticket 6c: Create Action Preview Components (Matching Current Design Language)
**Priority:** P0
**Estimate:** 6 story points
**Dependencies:** Ticket 6b

**Description:**
Build financial action preview and dispatch UI using current repository's design language.

**Acceptance Criteria:**
- [ ] Create `ActionPreview.tsx` using current card/panel styling patterns
- [ ] Create `ActionCard.tsx` matching current component card designs
- [ ] Create `ActionDispatch.tsx` using current button and dialog patterns
- [ ] Match current color scheme (same blues, greens, grays)
- [ ] Use current typography scale and spacing
- [ ] Replicate current toast notification styling
- [ ] Follow current form and checkbox styling patterns

**Technical Details:**
```typescript
// Match current repository's design patterns
function ActionPreview({ actions, onDispatch }: ActionPreviewProps) {
  const [selectedActionIds, setSelectedActionIds] = useState<string[]>([]);

  return (
    <div className="border border-border rounded-lg p-6 bg-card"> {/* Current card styling */}
      <div className="flex items-center gap-2 mb-4">
        <IconCheckCircle className="h-5 w-5 text-blue-500" /> {/* Current icon style */}
        <h3 className="text-lg font-semibold">Review Proposed Actions</h3> {/* Current typography */}
      </div>

      <div className="space-y-3"> {/* Current spacing patterns */}
        {actions.map(action => (
          <ActionCard key={action.call_id} action={action} />
        ))}
      </div>

      <ActionDispatch
        className="mt-6 pt-4 border-t border-border" {/* Current separator styling */}
        onDispatch={() => onDispatch(selectedActionIds)}
      />
    </div>
  );
}
```

**Design Consistency Requirements:**
- Use current repository's card/panel component styling
- Match current button designs (primary, secondary, destructive)
- Copy current form input and checkbox styling
- Use same color tokens as current components
- Match current loading spinner and progress indicators
- Replicate current modal/dialog styling patterns

**Reference Components for Styling:**
- Current card components for action preview container
- Current button patterns for dispatch actions
- Current form components for checkboxes and inputs
- Current toast/notification styling
- Current modal/dialog patterns for confirmations

**Specific Files:**
- `src/components/ActionPreview.tsx` (using current card design)
- `src/components/ActionCard.tsx` (matching current card patterns)
- `src/components/ActionDispatch.tsx` (current button/modal styling)

### Phase 7: Integration & Testing

#### Ticket 7a: Integration & End-to-End Testing
**Priority:** P1
**Estimate:** 4 story points
**Dependencies:** Ticket 6c

**Description:**
Integrate frontend with Go backend and test complete flow.

**Acceptance Criteria:**
- [ ] Set up development environment with Go backend + React frontend
- [ ] Test complete chat → action preview → dispatch flow
- [ ] Ensure proper error handling across frontend and backend
- [ ] Validate TypeScript types match Go structs
- [ ] Test with real LLM providers (OpenAI/Anthropic)
- [ ] Performance testing and optimization

**Technical Details:**
- Development setup with concurrent Go server + Vite dev server
- Integration testing of all API endpoints
- Error boundary implementation
- Loading states and user feedback

**Specific Files:**
- `docker-compose.yml` (development setup)
- `frontend/src/components/ErrorBoundary.tsx` (new)

#### Ticket 7b: Production Deployment Setup
**Priority:** P2
**Estimate:** 3 story points
**Dependencies:** Ticket 7a

**Description:**
Set up production deployment for new repository.

**Acceptance Criteria:**
- [ ] Create production Docker containers
- [ ] Set up CI/CD pipeline for new repository
- [ ] Configure environment variables and secrets
- [ ] Set up monitoring and logging
- [ ] Performance optimization and bundling

**Technical Details:**
- Multi-stage Docker builds
- Frontend build optimization with Vite
- Go binary compilation for production
- Environment configuration management

### Phase 8: Migration Strategy

#### Ticket 8a: Parallel Deployment Setup
**Priority:** P2
**Estimate:** 2 story points
**Dependencies:** Ticket 7b

**Description:**
Deploy new system alongside current one for gradual migration.

**Acceptance Criteria:**
- [ ] Deploy new system to separate subdomain (e.g., `new.yourapp.com`)
- [ ] Set up database connection to existing data
- [ ] Create user migration strategy
- [ ] Set up feature flags for A/B testing
- [ ] Documentation for switching between systems

**Technical Details:**
- Separate deployment pipeline
- Database migration scripts if needed
- User authentication integration
- Rollback strategy

#### Ticket 8b: User Migration & Cleanup
**Priority:** P3
**Estimate:** 3 story points
**Dependencies:** Ticket 8a

**Description:**
Migrate users to new system and clean up old repository.

**Acceptance Criteria:**
- [ ] Gradual user migration based on feature flags
- [ ] Monitor performance and user feedback
- [ ] Switch primary domain to new system
- [ ] Archive old repository
- [ ] Clean up old deployments and infrastructure

**Technical Details:**
- User migration monitoring
- Performance comparison between systems
- Old system graceful shutdown
- Documentation update

#### Ticket 6e: Create Action Preview UI Components
**Priority:** P1
**Estimate:** 4 story points
**Dependencies:** Ticket 6d

**Description:**
Create new UI components for financial action preview and dispatch workflow.

**Acceptance Criteria:**
- [ ] Create `/components/financial/action-preview.tsx` component
- [ ] Create `/components/financial/action-dispatch.tsx` component
- [ ] Display proposed actions with friendly descriptions
- [ ] Show impact estimates and warnings prominently
- [ ] Support action selection/deselection
- [ ] Create dispatch button with confirmation flow
- [ ] Show execution progress and results
- [ ] Integrate with existing toast system

**Technical Details:**
- New components for manual action review workflow
- Checkbox selection interface for actions
- Integration with action preview and dispatch APIs
- Toast notifications for execution results

**Specific Files:**
- `/components/financial/action-preview.tsx` (new)
- `/components/financial/action-dispatch.tsx` (new)

#### Ticket 6f: Remove Remaining AI SDK Dependencies
**Priority:** P1
**Estimate:** 2 story points
**Dependencies:** Ticket 6e

**Description:**
Clean up remaining AI SDK imports and update artifact components.

**Acceptance Criteria:**
- [ ] Update `/components/create-artifact.tsx` to remove AI SDK dependencies
- [ ] Remove any remaining `from "ai"` imports in components
- [ ] Update type imports to use custom types instead of AI SDK types
- [ ] Verify all components work without AI SDK
- [ ] Update any missed streaming or tool handling logic

**Technical Details:**
- Final cleanup of AI SDK dependencies
- Ensure all components use custom implementations
- Type safety with custom ChatMessage and ToolCall types

**Specific Files:**
- `/components/create-artifact.tsx`
- Any other components with remaining AI SDK imports

### Phase 4: Frontend Dispatch UI

#### Ticket 7a: Create Basic Action Preview Component
**Priority:** P1
**Estimate:** 3 story points
**Dependencies:** Ticket 3

**Description:**
Create React component to display action previews for user review.

**Acceptance Criteria:**
- [ ] Create `ActionPreview` component showing proposed actions
- [ ] Display friendly descriptions and impact estimates
- [ ] Show warnings in prominent way
- [ ] Support select/deselect functionality
- [ ] Basic responsive design

**Technical Details:**
- Use existing UI components (radix-ui, tailwindcss)
- Simple list/card layout
- Checkbox selection

#### Ticket 7b: Add Advanced Action Preview Features
**Priority:** P2
**Estimate:** 3 story points
**Dependencies:** Ticket 7a

**Description:**
Add advanced features to action preview component.

**Acceptance Criteria:**
- [ ] Show parameter details in expandable format
- [ ] Highlight dependencies between actions
- [ ] Include action icons/visual indicators
- [ ] Support editing parameters before dispatch
- [ ] Bulk select/deselect functionality

**Technical Details:**
- Collapsible parameter sections
- Dependency visualization
- Inline parameter editing forms

**Description:**
Create React component to display action previews for user review.

**Acceptance Criteria:**
- [ ] Create `ActionPreview` component showing proposed actions
- [ ] Display friendly descriptions, impact estimates, warnings
- [ ] Show parameter details in expandable format
- [ ] Support bulk select/deselect functionality
- [ ] Highlight dependencies between actions
- [ ] Include action icons/visual indicators
- [ ] Support editing parameters before dispatch
- [ ] Responsive design for mobile

**Technical Details:**
- Use existing UI components (radix-ui, tailwindcss)
- Follow design patterns from property planner components
- Include accessibility features

#### Ticket 8: Create Dispatch Button & Flow
**Priority:** P1
**Estimate:** 2 story points
**Dependencies:** Ticket 4a, 7a

**Description:**
Create dispatch button and confirmation flow for executing selected actions.

**Acceptance Criteria:**
- [ ] Add dispatch button to action preview component
- [ ] Show confirmation dialog with summary of selected actions
- [ ] Display progress indicator during execution
- [ ] Show execution results (success/failure per action)
- [ ] Handle partial failures gracefully
- [ ] Refresh relevant data after successful execution
- [ ] Show toast notifications for results

**Technical Details:**
- Integrate with existing loading states and error handling
- Use toast system from existing components
- Update financial planning store after execution

### Phase 5: Migration & Testing

#### Ticket 9: Update Chat Message Handling for Tool Calls
**Priority:** P1
**Estimate:** 5 story points
**Dependencies:** Ticket 7a, 8

**Description:**
Update chat message handling to detect financial tool calls and show dispatch UI.

**Acceptance Criteria:**
- [ ] Detect tool calls in chat responses
- [ ] Show action preview UI instead of executing immediately
- [ ] Maintain chat flow after action dispatch
- [ ] Support mixed messages (text + tool calls)
- [ ] Handle tool call errors gracefully

**Technical Details:**
- Parse streaming tool call responses
- Conditionally render preview UI vs regular message content
- Maintain message history with action metadata

#### Ticket 10: Create Migration Path from Intent Parser
**Priority:** P2
**Estimate:** 2 story points
**Dependencies:** Ticket 9

**Description:**
Create feature flag and migration strategy from old intent parser to new tool calling.

**Acceptance Criteria:**
- [ ] Add feature flag for tool calling vs intent parser
- [ ] Support gradual rollout
- [ ] Maintain backwards compatibility
- [ ] Document migration process
- [ ] Create comparison testing

**Technical Details:**
- Use environment variables for feature flagging
- Keep old intent parser as fallback
- A/B testing framework for comparison

#### Ticket 11a: Unit and Integration Tests
**Priority:** P1
**Estimate:** 3 story points
**Dependencies:** Ticket 9

**Description:**
Create comprehensive unit and integration tests.

**Acceptance Criteria:**
- [ ] Unit tests for all financial tools
- [ ] Integration tests for API endpoints
- [ ] Mock `financialClient` for unit tests
- [ ] Error handling tests for edge cases

#### Ticket 11b: E2E and Performance Tests
**Priority:** P2
**Estimate:** 3 story points
**Dependencies:** Ticket 11a

**Description:**
Create end-to-end and performance tests.

**Acceptance Criteria:**
- [ ] E2E tests for chat → preview → dispatch flow
- [ ] Performance testing for action preview generation
- [ ] Load testing for concurrent tool calls
- [ ] Test real financial scenarios end-to-end

**Description:**
Comprehensive testing of the new tool calling system.

**Acceptance Criteria:**
- [ ] Unit tests for all financial tools
- [ ] Integration tests for API endpoints
- [ ] E2E tests for chat → preview → dispatch flow
- [ ] Performance testing for action preview generation
- [ ] Error handling tests for edge cases
- [ ] Load testing for concurrent tool calls

**Technical Details:**
- Use existing test framework (vitest, playwright)
- Mock `financialClient` for unit tests
- Test real financial scenarios end-to-end

## Summary

**Story Point Breakdown:**
- Phase 1: 12 points (1a:3, 1b:3, 1c:5, 2:1)
- Phase 2: 8 points (3:5, 4a:3, 4b:3)
- Phase 3: 4 points (5:2, 6:2)
- Phase 4: 8 points (7a:3, 7b:3, 8:2)
- Phase 5: 15 points (9:5, 10:2, 11a:3, 11b:3)

**Total Story Points:** 68 points
## Summary

**New Repository Approach - Story Point Breakdown:**

**Backend (39 points):**
- **Phase 0: Repository Setup** - 2 points (B0a: Go repository structure)
- **Phase 1: API & LLM Foundation** - 5 points (B0b: API versioning - 2, B1: LLM client - 3)
- **Phase 2: LLM Providers** - 9 points (B2: OpenAI provider - 5, B3: Anthropic - 4)
- **Phase 3: Financial Tools** - 9 points (B4: Tool definitions - 4, B5: Action preview - 5)
- **Phase 4: API Endpoints** - 11 points (B6: Chat API - 6, B7: Dispatch API - 5)
- **Phase 5: Backend Testing** - 3 points (B8: Session management - 3)

**Frontend (29 points):**
- **Phase 0: Setup** - 5 points (F0: Design extraction - 3, F1: React setup - 2)
- **Phase 1: API Layer** - 3 points (F2: API service layer - 3)
- **Phase 2: Chat Implementation** - 10 points (F3: Custom hooks - 4, F4: Chat interface - 6)
- **Phase 3: Action UI** - 9 points (F5: Action preview components - 6, F6: Results UI - 3)
- **Phase 4: Integration** - 5 points (F7: Frontend integration - 3, F8: Production build - 2)

**Total: 68 story points**

**Critical Path:** 0a → 0b → 1 → 2a → 3a → 3b → 4a → 4b → 5a → 5b → 6a → 6b → 6c

**MVP Scope:** Backend complete (39 points - Go backend ready for frontend integration)
**Full Feature:** Backend + Frontend (68 points - Complete system ready for deployment)
**Production Ready:** Add deployment/migration phases as needed

**New Repository Benefits:**
✅ **Clean slate**: No legacy code or dead dependencies
✅ **Maintain look & feel**: Exact visual match to current system
✅ **Modern stack**: Go + React 18 + TypeScript + Vite
✅ **No vendor lock-in**: Zero Vercel AI SDK dependencies
✅ **Parallel development**: Build alongside current system
✅ **Risk mitigation**: Gradual migration with rollback capability

**Technology Stack:**
- **Repository**: New `financial-chat-system` repository
- **Backend**: Go + OpenAI/Anthropic SDKs + existing database
- **Frontend**: React 18 + TypeScript + Vite + Tailwind (matching current design)
- **Communication**: REST APIs with JSON
- **Design**: Exact copy of current UI patterns and styling

**Migration Strategy:**
1. **Phase 0**: Set up new repo and extract current design patterns
2. **Phases 1-4**: Build complete Go backend with APIs
3. **Phases 5-6**: Build React frontend matching current look exactly
4. **Phase 7**: Test and deploy alongside current system
5. **Phase 8**: Gradually migrate users, then archive old repo

**Key Advantage**: This approach eliminates the need to identify and remove dead code by starting fresh while maintaining the exact same user experience. Users won't notice any visual or functional differences during migration.