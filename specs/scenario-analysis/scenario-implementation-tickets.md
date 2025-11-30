# Scenario Analysis Implementation Tickets

## Overview

This document breaks down the scenario analysis feature into implementable tickets based on:
- **scenario-design-principles.md**: Core architectural principles and requirements
- **scenario-analysis-business.md**: Business logic and insight framework
- **AGENTS.md**: Ticket structure and complexity guidelines

The scenario system enables users to model life events (car purchase, disability, child, etc.) and understand their financial impact through a unified input/output schema.

---

## Backend Implementation Tickets

### B9: Core Scenario Event Models & Database Schema
**Status**: todo
**Complexity**: 5 points
**Blocks**: B10, B11, F9

**Background**: Implement the foundational data models for the scenario analysis system based on the universal input structure defined in scenario-design-principles.md.

**Requirements**:
- Create `scenario_events` table with fields:
  - `id`, `user_id`, `name`, `description`, `occurs_on`, `display_icon`, `tags`, `scenario_id`
  - `created_at`, `updated_at`, `is_included` (for toggle simulation)
- Create `event_impacts` table with fields:
  - `id`, `event_id`, `target_type`, `target_id`, `impact_kind`, `amount`, `currency`
  - `cadence`, `start_month`, `end_month`, `notes` (month resolution, end optional/open)
- Implement Go models with proper validation
- Add database migrations
- Implement repository layer with CRUD operations

**Acceptance Criteria**:
- [ ] Database schema supports all fields from scenario-design-principles.md
- [ ] Proper foreign key relationships and constraints
- [ ] Repository methods for Create, Read, Update, Delete operations
- [ ] Validation for required fields and business rules
- [ ] Unit tests for all repository methods

**API Contract**:
```go
type ScenarioEvent struct {
    ID          int       `json:"id"`
    UserID      int       `json:"user_id"`
    Name        string    `json:"name"`
    Description string    `json:"description"`
    OccursOn    time.Time `json:"occurs_on"`
    DisplayIcon string    `json:"display_icon"`
    Tags        []string  `json:"tags"`
    ScenarioID  *int      `json:"scenario_id,omitempty"`
    IsIncluded  bool      `json:"is_included"`
    Impacts     []EventImpact `json:"impacts"`
}

type EventImpact struct {
    ID         int    `json:"id"`
    EventID    int    `json:"event_id"`
    TargetType string `json:"target_type"` // asset|liability|income|expense|aggregate
    TargetID   *int   `json:"target_id,omitempty"`
    ImpactKind string `json:"impact_kind"` // delta|override|start|stop
    Amount     int64  `json:"amount"`
    Currency   string `json:"currency"`
    Cadence    string `json:"cadence"` // one_time|monthly|annual
    StartMonth string `json:"start_month"` // YYYY-MM
    EndMonth   *string `json:"end_month,omitempty"` // optional/open-ended
    Notes      string `json:"notes,omitempty"`
}
```

---

### B10: Scenario Events CRUD API
**Status**: todo
**Complexity**: 3 points
**Blocks**: F9, F10
**Depends on**: B9

**Background**: Create REST API endpoints for managing scenario events with their associated impacts.

**Requirements**:
- `POST /api/v1/scenario-events` - Create new event with impacts
- `GET /api/v1/scenario-events` - List events with filtering (year, tags, included)
- `GET /api/v1/scenario-events/{id}` - Get single event with impacts
- `PUT /api/v1/scenario-events/{id}` - Update event and impacts
- `DELETE /api/v1/scenario-events/{id}` - Delete event
- `PATCH /api/v1/scenario-events/{id}/toggle` - Toggle is_included flag
- Proper error handling and validation
- User authorization (only access own events)

**Acceptance Criteria**:
- [ ] All CRUD endpoints implemented with proper HTTP status codes
- [ ] Request/response validation using proper Go structs
- [ ] User authorization middleware applied
- [ ] Error responses follow consistent format
- [ ] Integration tests for all endpoints
- [ ] API documentation updated

**API Examples**:
```bash
# Create event
POST /api/v1/scenario-events
{
  "name": "Child Birth",
  "description": "First child expected",
  "occurs_on": "2025-06-01",
  "display_icon": "baby",
  "tags": ["family", "major"],
  "impacts": [
    {
      "target_type": "expense",
      "impact_kind": "delta",
      "amount": 150000,
      "currency": "SGD",
      "cadence": "monthly",
      "start_year": 2025,
      "notes": "Childcare expenses"
    }
  ]
}

# Toggle inclusion
PATCH /api/v1/scenario-events/123/toggle
{"is_included": false}
```

---

### B11: Financial Data Integration with Events
**Status**: todo
**Complexity**: 8 points
**Blocks**: F10, F11
**Depends on**: B9, B10

**Background**: Integrate scenario events into the financial projection system. This is the core calculation engine that applies event impacts to financial_data.

**Requirements**:
- Extend existing financial_data calculation to include scenario events
- Apply impacts in deterministic order: overrides first, then deltas, then summaries
- Annotate affected financial_data rows with `event_impacts` array
- Support year-based filtering to show events for specific years
- Implement conflict detection for overlapping overrides
- Calculate derived metrics (cashflow changes, net worth deltas)
- Generate insight data for "What Does This Mean for Me?" narratives

**Key Components**:
1. **Impact Application Logic**:
   - Parse `occurs_on` to derive `applies_year`
   - Apply impacts based on `cadence` and time windows
   - Handle `start_year`/`end_year` for recurring impacts

2. **Conflict Resolution**:
   - Detect multiple overrides to same entity/year
   - Return validation errors for conflicts
   - Provide clear error messages

3. **Financial Data Annotation**:
   - Add `event_impacts` field to affected rows
   - Include `event_id`, `impact_amount`, `impact_kind`
   - Support filtering by year to show relevant events

4. **Insight Generation**:
   - Calculate cashflow sufficiency metrics
   - Determine emergency fund depletion timeline
   - Assess debt servicing ratio changes
   - Generate retirement impact analysis
   - Apply insight templates from scenario-analysis-business.md

**Acceptance Criteria**:
- [ ] Event impacts correctly applied to financial projections
- [ ] Deterministic calculation order ensures consistent results
- [ ] Conflict detection prevents invalid override combinations
- [ ] Financial data includes event_impacts annotations
- [ ] Year filtering shows relevant events and impacts
- [ ] Insight generation covers all categories from business spec
- [ ] Unit tests for impact application logic
- [ ] Integration tests with full event scenarios
- [ ] Performance testing with multiple events

**API Contract Extension**:
```go
type FinancialDataRow struct {
    // existing fields...
    EventImpacts []EventImpactSummary `json:"event_impacts,omitempty"`
}

type EventImpactSummary struct {
    EventID      int    `json:"event_id"`
    EventName    string `json:"event_name"`
    ImpactAmount int64  `json:"impact_amount"`
    ImpactKind   string `json:"impact_kind"`
    Notes        string `json:"notes,omitempty"`
}

type ScenarioInsights struct {
    CashflowRisks    []InsightMessage `json:"cashflow_risks"`
    LiabilityRisks   []InsightMessage `json:"liability_risks"`
    SavingsGoalRisks []InsightMessage `json:"savings_goal_risks"`
    LiquidityRisks   []InsightMessage `json:"liquidity_risks"`
    LifestyleImpact  []InsightMessage `json:"lifestyle_impact"`
    AssetAllocation  []InsightMessage `json:"asset_allocation"`
    CascadingEffects []InsightMessage `json:"cascading_effects"`
}

type InsightMessage struct {
    Category string `json:"category"`
    Message  string `json:"message"`
    Severity string `json:"severity"` // low|medium|high|critical
    Metrics  map[string]interface{} `json:"metrics,omitempty"`
}
```

---

### B12: Scenario Analysis Endpoint
**Status**: todo
**Complexity**: 4 points
**Blocks**: F11
**Depends on**: B11

**Background**: Create endpoint to run scenario analysis and return comprehensive results including financial projections and insights.

**Requirements**:
- `POST /api/v1/scenario-analysis` - Run analysis with selected events
- Accept list of event IDs or use all included events
- Return financial_data with event annotations
- Include scenario insights and "what this means" narratives
- Support comparison between baseline and scenario projections
- Cache results for performance (optional)

**Acceptance Criteria**:
- [ ] Endpoint accepts event selection parameters
- [ ] Returns complete scenario analysis results
- [ ] Includes baseline vs scenario comparison metrics
- [ ] Performance optimized for multiple events
- [ ] Proper error handling for invalid scenarios
- [ ] Integration tests with various event combinations

**API Contract**:
```go
type ScenarioAnalysisRequest struct {
    EventIDs    []int `json:"event_ids,omitempty"` // if empty, use all included
    BaselineYear int  `json:"baseline_year"`
    ProjectionYears int `json:"projection_years"`
}

type ScenarioAnalysisResponse struct {
    BaselineData    []FinancialDataRow `json:"baseline_data"`
    ScenarioData    []FinancialDataRow `json:"scenario_data"`
    Insights        ScenarioInsights   `json:"insights"`
    Summary         ScenarioSummary    `json:"summary"`
    IncludedEvents  []ScenarioEvent    `json:"included_events"`
}

type ScenarioSummary struct {
    NetWorthDelta     int64 `json:"net_worth_delta"`
    CashflowDelta     int64 `json:"cashflow_delta"`
    RetirementDelay   int   `json:"retirement_delay_months"`
    EmergencyFundRisk bool  `json:"emergency_fund_risk"`
    DSRExceedsLimit   bool  `json:"dsr_exceeds_limit"`
}
```

---

## Frontend Implementation Tickets

### F9: Scenario Event Models & Types
**Status**: todo
**Complexity**: 2 points
**Blocks**: F10, F11
**Depends on**: B9, B10

**Background**: Create TypeScript types and API client methods for scenario events.

**Requirements**:
- Define TypeScript interfaces matching backend models
- Implement API client methods for CRUD operations
- Add Zod schemas for validation
- Create custom hooks for scenario event management

**Acceptance Criteria**:
- [ ] TypeScript types match backend API contract exactly
- [ ] API client methods with proper error handling
- [ ] Zod schemas for request/response validation
- [ ] Custom hooks: useScenarioEvents, useScenarioEvent, useCreateEvent, etc.
- [ ] Unit tests for API client methods

**Implementation**:
```typescript
// types/scenario.ts
export interface ScenarioEvent {
  id: number;
  user_id: number;
  name: string;
  description: string;
  occurs_on: string;
  display_icon: string;
  tags: string[];
  scenario_id?: number;
  is_included: boolean;
  impacts: EventImpact[];
}

export interface EventImpact {
  id: number;
  event_id: number;
  target_type: 'asset' | 'liability' | 'income' | 'expense' | 'aggregate';
  target_id?: number;
  impact_kind: 'delta' | 'override' | 'start' | 'stop';
  amount: number;
  currency: string;
  cadence: 'one_time' | 'monthly' | 'annual';
  start_year: number;
  end_year?: number;
  notes?: string;
}

// hooks/useScenarioEvents.ts
export function useScenarioEvents(filters?: EventFilters) {
  // React Query implementation
}

export function useCreateScenarioEvent() {
  // Mutation hook for creating events
}
```

---

### F10: Event Overlay & Graph Integration
**Status**: todo
**Complexity**: 5 points
**Blocks**: F11
**Depends on**: F9, B10

**Background**: Add event markers to the financial projection graph with hover tooltips and click-to-modal functionality.

**Requirements**:
- Display event icons on timeline graph at `occurs_on` dates
- Show hover tooltips with event name, date, short description
- Click event marker opens detailed modal
- Support multiple events on same date (stacked or grouped)
- Visual differentiation for included/excluded events
- Smooth animations for interactions

**Key Components**:
1. **Event Markers**: Icon overlays positioned at correct dates
2. **Hover Tooltips**: Quick preview of event details
3. **Click Handlers**: Open event modal with full details
4. **Visual States**: Different styles for included/excluded events
5. **Multiple Events**: Handle overlapping dates gracefully

**Acceptance Criteria**:
- [ ] Event markers appear at correct timeline positions
- [ ] Hover shows informative tooltips
- [ ] Click opens event detail modal
- [ ] Visual distinction between included/excluded events
- [ ] Smooth animations and transitions
- [ ] Responsive design for mobile
- [ ] Accessibility support (keyboard navigation, screen readers)

**Implementation Notes**:
- Use existing graph component and extend with event layer
- Consider D3.js or similar for precise positioning
- Implement tooltip component matching design system
- Use Radix UI for accessible modal interactions

---

### F11: Event Detail Modal & Management
**Status**: todo
**Complexity**: 6 points
**Blocks**: F12
**Depends on**: F10, B11

**Background**: Create comprehensive modal for viewing and editing scenario events with impact details and financial projections.

**Requirements**:
- **Event Details Section**: Name, description, date, tags, icon
- **Impacts Table**: List all impacts with amounts and timing
- **Financial Impact Preview**: Net worth delta, cashflow changes
- **Insights Section**: "What this means for you" narratives
- **Edit Mode**: Inline editing of event details and impacts
- **Include/Exclude Toggle**: Runtime simulation control
- **Delete Confirmation**: Safe event removal

**Modal Sections**:
1. **Header**: Event name, date, include/exclude toggle, edit/delete actions
2. **Overview**: Description, tags, occurrence details
3. **Financial Impacts**: Table of all impacts with calculations
4. **Projections**: Mini charts showing before/after comparisons
5. **Insights**: Generated narratives from scenario analysis
6. **Actions**: Save, cancel, delete confirmation

**Acceptance Criteria**:
- [ ] Complete event information display
- [ ] Inline editing with validation
- [ ] Real-time impact calculations
- [ ] Insight narratives from backend
- [ ] Include/exclude toggle updates projections
- [ ] Confirmation dialogs for destructive actions
- [ ] Mobile-responsive design
- [ ] Keyboard shortcuts and accessibility
- [ ] Loading states during API calls

**Components**:
```typescript
// components/scenario/EventDetailModal.tsx
interface EventDetailModalProps {
  eventId: number;
  isOpen: boolean;
  onClose: () => void;
}

// components/scenario/ImpactTable.tsx
interface ImpactTableProps {
  impacts: EventImpact[];
  isEditing: boolean;
  onUpdateImpact: (impact: EventImpact) => void;
}

// components/scenario/InsightSection.tsx
interface InsightSectionProps {
  insights: ScenarioInsights;
  loading: boolean;
}
```

---

### F12: Scenario Event Palette & Search
**Status**: todo
**Complexity**: 4 points
**Depends on**: F11

**Background**: Create searchable sidebar/palette for managing multiple scenario events with filtering and quick actions.

**Requirements**:
- **Event List**: All events with icons, names, dates, include status
- **Search/Filter**: By name, tags, year, inclusion status
- **Quick Actions**: Include/exclude toggle, duplicate, delete
- **Hover Previews**: Quick tooltip with event summary
- **Drag & Drop**: Reorder events or change dates (optional)
- **Bulk Actions**: Select multiple events for operations

**Key Features**:
1. **Searchable List**: Fast filtering with multiple criteria
2. **Visual Grouping**: Group by year, category, or status
3. **Quick Toggle**: Include/exclude without opening modal
4. **Hover Previews**: See impact summary on hover
5. **Keyboard Navigation**: Arrow keys, enter to open
6. **Empty States**: Helpful messaging when no events

**Acceptance Criteria**:
- [ ] Searchable event list with multiple filter options
- [ ] Include/exclude toggles update projections immediately
- [ ] Hover previews show relevant event information
- [ ] Keyboard navigation works smoothly
- [ ] Empty and loading states handled gracefully
- [ ] Mobile-friendly responsive design
- [ ] Bulk selection and operations work correctly

---

### F13: Scenario Template Library
**Status**: todo
**Complexity**: 3 points
**Depends on**: F12

**Background**: Provide pre-built scenario templates for common life events to reduce user setup time.

**Requirements**:
- **Template Gallery**: Common scenarios (child, disability, car purchase, etc.)
- **Template Preview**: Show typical impacts before applying
- **Customization**: Modify template values before creating event
- **Template Categories**: Group by life stage, risk type, etc.
- **Quick Setup**: One-click apply with reasonable defaults

**Template Categories**:
- **Family**: Child birth, marriage, divorce, elder care
- **Career**: Promotion, job loss, career change, retirement
- **Health**: Disability, critical illness, medical expenses
- **Property**: Home purchase, renovation, downsizing
- **Financial**: Investment windfall, market crash, inheritance

**Acceptance Criteria**:
- [ ] Template library with categorized scenarios
- [ ] Preview shows estimated financial impacts
- [ ] Customization form with sensible defaults
- [ ] One-click apply creates properly configured event
- [ ] Search and filter templates by category/keywords
- [ ] Mobile-friendly template selection
- [ ] Help text explaining each template type

---

## Testing & Documentation Tickets

### T1: Scenario System Integration Tests
**Status**: todo
**Complexity**: 4 points
**Depends on**: B12, F11

**Background**: Comprehensive testing of the complete scenario analysis workflow.

**Requirements**:
- End-to-end tests covering event creation to insight generation
- API integration tests for all scenario endpoints
- Frontend component tests with mocked API responses
- Performance tests with multiple complex scenarios
- User journey tests for common workflows

**Test Scenarios**:
- Create child scenario with multiple impacts
- Analyze retirement delay from major expense
- Test conflict detection with overlapping overrides
- Verify insight generation accuracy
- Test include/exclude toggle functionality

---

### D1: Scenario Analysis Documentation
**Status**: todo
**Complexity**: 2 points
**Depends on**: T1

**Background**: Create comprehensive documentation for the scenario analysis feature.

**Requirements**:
- User guide for scenario creation and analysis
- API documentation with examples
- Architecture documentation explaining calculation engine
- Developer guide for extending scenario types
- Troubleshooting guide for common issues

---

## Summary

**Total Backend Points**: 20 points (4 tickets)
**Total Frontend Points**: 20 points (5 tickets)
**Total Testing/Docs Points**: 6 points (2 tickets)
**Grand Total**: 46 points (11 tickets)

**Critical Path**:
1. B9 → B10 → B11 → B12 (Backend foundation)
2. F9 → F10 → F11 → F12 (Frontend core features)
3. F13 (Enhanced UX)
4. T1 → D1 (Quality assurance)

**Key Dependencies**:
- Frontend completely blocked until B9 + B10 complete
- Full scenario analysis requires B11 integration
- User testing possible after F11 completion
- Production ready after T1 passes

---

## User Interaction Design Plan

### Overview
This section details how users will interact with the scenario system through both UI forms and AI chat, integrating with the existing chat/dispatch architecture.

### User Flow Scenarios

#### Flow 1: Manual Scenario Creation via Modal
1. **Entry Point**: User clicks "Create Scenario" button from dashboard/timeline
2. **Modal Opens**: Form appears with scenario creation fields
3. **Fill Event Meta**: User enters name, description, date, selects icon, adds tags
4. **Build Impacts**: User adds financial impacts:
   - Select target type (asset/liability/income/expense)
   - Choose impact kind (delta/override/start/stop)
   - Set amount, currency, cadence, timing
5. **Preview**: Modal shows calculated financial impact preview
6. **Save**: Creates entries in `scenario_events` and `event_impacts` tables
7. **Timeline Update**: New scenario icon appears on financial timeline
8. **Analysis**: User can toggle include/exclude to see "what-if" projections

#### Flow 2: AI Chat Scenario Creation
1. **Chat Input**: User types "What if I have a child next year?"
2. **LLM Processing**: AI generates `createScenarioEvent` tool call with defaults:
   - Name: "Child Birth"
   - Date: Next year
   - Impacts: Childcare expenses, medical costs, etc.
3. **Preview Generation**: Backend calculates financial impact
4. **User Review**: Chat shows preview with proposed actions
5. **User Approval**: User confirms or modifies impacts
6. **Dispatch**: Same workflow as existing financial actions
7. **Database Update**: Scenario stored via standard CRUD operations
8. **Timeline Integration**: Scenario appears with event markers

#### Flow 3: AI Scenario Analysis Questions
1. **Query**: User asks "How does having a child affect my retirement?"
2. **Context Loading**: AI loads user's existing scenarios and financial data
3. **Analysis Calculation**: Uses scenario analysis endpoint with included events
4. **Insight Generation**: Applies insight templates from business framework:
   - "Retirement delayed by 3 years due to reduced savings"
   - "Emergency fund at risk in months 18-24"
   - "Savings rate drops from 25% to 12%"
5. **Response**: AI provides narrative analysis with specific impacts
6. **Follow-up**: User can ask clarifying questions or modify scenarios

#### Flow 4: Scenario Management & Analysis
1. **Scenario Palette**: User opens sidebar with scenario list
2. **Search/Filter**: Finds scenarios by name, tags, year, status
3. **Quick Actions**: Toggle include/exclude, duplicate, delete
4. **Bulk Operations**: Select multiple scenarios for batch operations
5. **Timeline Visualization**: See all scenarios on financial projection graph
6. **Detailed Analysis**: Click scenario markers to open detail modals
7. **What-if Comparison**: Compare baseline vs scenario projections

### 1. Modal Form Interface

#### 1.1 Create Scenario Button & Modal
- Add "Create Scenario" button in main dashboard/timeline view
- Modal form following existing `FinancialFormModal.tsx` patterns:
  - **Event Meta**: Name, description, date, icon picker, tags
  - **Impacts Builder**: Dynamic form for adding multiple impacts
    - Target type dropdown (asset/liability/income/expense)
    - Impact kind (delta/override/start/stop)
    - Amount, currency, cadence (one-time/monthly/annual)
    - Start/end year, notes
  - **Preview Section**: Show calculated financial impact
  - **Save/Cancel**: Standard form actions

#### 1.2 Impact Builder Interface
- Tabbed sections for different impact types
- Dynamic add/remove rows for multiple impacts per scenario
- Smart defaults based on scenario templates (child, disability, etc.)
- Validation for required fields and business rules (no overlapping overrides)

### 2. AI Chat Dispatch Integration

#### 2.1 Scenario Tools in Registry
Add to `backend/internal/financial/tools.go`:

**createScenarioEvent**:
```go
// Tool for creating scenario events via chat
{
  "name": "createScenarioEvent",
  "description": "Create a life scenario event (child, disability, car purchase, etc.) with financial impacts",
  "parameters": {
    "name": "Child Birth",
    "occurs_on": "2025-06-01",
    "display_icon": "baby",
    "impacts": [
      {
        "target_type": "expense",
        "impact_kind": "delta",
        "amount": 1500,
        "cadence": "monthly",
        "start_year": 2025
      }
    ]
  }
}
```

**updateScenarioEvent** and **deleteScenarioEvent** tools following existing patterns

#### 2.2 Chat Interface Extensions
- User can say: "What if I have a child next year?"
- LLM generates scenario tool call with reasonable defaults
- Preview shows financial impact calculations
- User approves/modifies before dispatch
- Same workflow as existing financial actions

### 3. Database & Backend Integration

#### 3.1 Custom Scenarios Table
Extend the scenario system from implementation tickets:
- Link to `scenario_events` and `event_impacts` tables
- Store user-created scenarios alongside templates
- Flag custom vs template scenarios for different UX

#### 3.2 Financial Data Integration
- Scenarios integrate with existing financial projection system
- Apply impacts to user's assets/liabilities/income/expense
- Generate event-annotated `financial_data` rows
- Support include/exclude toggle for "what-if" analysis

### 4. AI Analysis & Insights

#### 4.1 Scenario Analysis Endpoint
Extend `/api/v1/chat` to handle scenario questions:
- "How does having a child affect my retirement?"
- "Can I afford this if I lose my job?"
- LLM uses scenario analysis endpoint + insight framework

#### 4.2 Insight Generation Framework
Use the insight templates from `scenario-analysis-business.md`:
- **Cashflow Risks**: "Your savings rate drops from 25% to 5%"
- **Retirement Impact**: "Retirement delayed by 3 years"
- **Emergency Fund**: "Cash reserves fall below 3 months"
- **Debt Risk**: "DSR rises above safe levels"

### 5. Visual Integration

#### 5.1 Timeline Event Markers
- Scenario events appear as icons on financial timeline graph
- Click opens scenario detail modal
- Hover shows quick impact summary
- Visual distinction for included/excluded scenarios

#### 5.2 Scenario Palette
- Sidebar with searchable list of scenarios
- Quick include/exclude toggles
- Hover previews of financial impact
- Bulk operations for multiple scenarios

### 6. Implementation Sequence

#### Phase 1: Core Infrastructure (Backend)
1. Extend scenario database schema
2. Add scenario tools to financial registry
3. Implement scenario creation/update/delete endpoints
4. Integrate with financial calculation engine

#### Phase 2: UI/UX (Frontend)
1. Create scenario modal form component
2. Add scenario event markers to timeline
3. Build scenario palette/management interface
4. Integrate with existing chat interface

#### Phase 3: AI Analysis
1. Extend chat system to handle scenario questions
2. Implement insight generation from business framework
3. Add scenario analysis endpoint
4. Test end-to-end user workflows

#### Phase 4: Templates & Polish
1. Pre-built scenario templates (child, disability, etc.)
2. Enhanced UX with smart defaults
3. Performance optimization for complex scenarios
4. Documentation and user guidance

### Success Criteria
- User can create custom scenarios via modal form
- AI chat can create/modify scenarios via natural language
- Financial projections update in real-time with scenario impacts
- AI provides meaningful insights about scenario implications
- Seamless integration with existing financial management workflow
