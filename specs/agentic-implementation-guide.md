# Agentic AI Implementation Guide

## Technical Implementation Details for Enhanced Agency

This guide provides concrete implementation steps to transform the current tool-using AI into a fully agentic financial assistant.

---

## 1. Goal Management System Implementation

### Database Schema Extensions

```sql
-- Goals table
CREATE TABLE financial_goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    target_amount DECIMAL(15,2),
    deadline DATE,
    category VARCHAR(50) NOT NULL, -- 'retirement', 'house', 'debt_payoff', 'emergency_fund'
    priority INTEGER DEFAULT 5,
    status VARCHAR(20) DEFAULT 'active', -- 'active', 'completed', 'paused', 'cancelled'
    progress DECIMAL(5,2) DEFAULT 0.0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Plan steps table
CREATE TABLE plan_steps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    goal_id UUID REFERENCES financial_goals(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    step_order INTEGER NOT NULL,
    target_actions JSONB, -- Array of tool calls needed
    due_date DATE,
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'in_progress', 'completed', 'skipped'
    dependencies JSONB, -- Array of step IDs that must complete first
    completion_criteria JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Goal progress tracking
CREATE TABLE goal_progress_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    goal_id UUID REFERENCES financial_goals(id) ON DELETE CASCADE,
    progress_amount DECIMAL(15,2),
    progress_percentage DECIMAL(5,2),
    milestone_reached VARCHAR(255),
    notes TEXT,
    recorded_at TIMESTAMP DEFAULT NOW()
);
```

### Go Implementation

```go
// backend/internal/financial/goals.go
package financial

import (
    "context"
    "time"
    "github.com/google/uuid"
)

type Goal struct {
    ID           string    `json:"id"`
    UserID       string    `json:"user_id"`
    Title        string    `json:"title"`
    Description  string    `json:"description"`
    TargetAmount float64   `json:"target_amount"`
    Deadline     time.Time `json:"deadline"`
    Category     string    `json:"category"`
    Priority     int       `json:"priority"`
    Status       string    `json:"status"`
    Progress     float64   `json:"progress"`
    Steps        []PlanStep `json:"steps"`
    CreatedAt    time.Time `json:"created_at"`
    UpdatedAt    time.Time `json:"updated_at"`
}

type PlanStep struct {
    ID                string            `json:"id"`
    GoalID            string            `json:"goal_id"`
    Title             string            `json:"title"`
    Description       string            `json:"description"`
    StepOrder         int               `json:"step_order"`
    TargetActions     []string          `json:"target_actions"`
    DueDate           time.Time         `json:"due_date"`
    Status            string            `json:"status"`
    Dependencies      []string          `json:"dependencies"`
    CompletionCriteria map[string]interface{} `json:"completion_criteria"`
}

type GoalService struct {
    store *repository.Store
}

func NewGoalService(store *repository.Store) *GoalService {
    return &GoalService{store: store}
}

func (gs *GoalService) CreateGoal(ctx context.Context, goal Goal) (*Goal, error) {
    // Generate plan steps automatically based on goal
    steps := gs.generatePlanSteps(goal)
    goal.Steps = steps

    return gs.store.CreateGoal(ctx, goal)
}

func (gs *GoalService) generatePlanSteps(goal Goal) []PlanStep {
    switch goal.Category {
    case "emergency_fund":
        return gs.generateEmergencyFundSteps(goal)
    case "debt_payoff":
        return gs.generateDebtPayoffSteps(goal)
    case "house":
        return gs.generateHouseSavingSteps(goal)
    case "retirement":
        return gs.generateRetirementSteps(goal)
    default:
        return gs.generateGenericSavingSteps(goal)
    }
}

func (gs *GoalService) generateEmergencyFundSteps(goal Goal) []PlanStep {
    return []PlanStep{
        {
            ID: uuid.New().String(),
            Title: "Assess current emergency savings",
            Description: "Calculate existing emergency fund amount",
            StepOrder: 1,
            TargetActions: []string{"getAssets", "filterAssets"},
            Status: "pending",
        },
        {
            ID: uuid.New().String(),
            Title: "Calculate monthly expenses",
            Description: "Determine monthly essential expenses for emergency fund sizing",
            StepOrder: 2,
            TargetActions: []string{"getExpenses", "calculateMonthlyTotal"},
            Status: "pending",
        },
        {
            ID: uuid.New().String(),
            Title: "Set up emergency fund asset",
            Description: "Create dedicated emergency fund account",
            StepOrder: 3,
            TargetActions: []string{"createAsset"},
            Status: "pending",
        },
        {
            ID: uuid.New().String(),
            Title: "Create automatic savings plan",
            Description: "Set up recurring transfers to emergency fund",
            StepOrder: 4,
            TargetActions: []string{"createIncome", "createExpense"},
            Status: "pending",
        },
    }
}
```

### Tool Enhancement for Goals

```go
// backend/internal/financial/goal_tools.go
package financial

func RegisterGoalTools(registry *ToolRegistry) {
    registry.RegisterTool(ToolDefinition{
        Type: "function",
        Function: FunctionSchema{
            Name: "createGoal",
            Description: "Create a new financial goal with automatic plan generation",
            Parameters: map[string]interface{}{
                "type": "object",
                "properties": map[string]interface{}{
                    "title": map[string]interface{}{
                        "type": "string",
                        "description": "Goal title",
                    },
                    "target_amount": map[string]interface{}{
                        "type": "number",
                        "description": "Target amount to achieve",
                    },
                    "deadline": map[string]interface{}{
                        "type": "string",
                        "format": "date",
                        "description": "Target completion date",
                    },
                    "category": map[string]interface{}{
                        "type": "string",
                        "enum": []string{"emergency_fund", "debt_payoff", "house", "retirement", "general"},
                        "description": "Goal category for plan generation",
                    },
                },
                "required": []string{"title", "target_amount", "deadline", "category"},
            },
        },
    })

    registry.RegisterTool(ToolDefinition{
        Type: "function",
        Function: FunctionSchema{
            Name: "updateGoalProgress",
            Description: "Update progress toward a financial goal",
            Parameters: map[string]interface{}{
                "type": "object",
                "properties": map[string]interface{}{
                    "goal_id": map[string]interface{}{
                        "type": "string",
                        "description": "Goal ID to update",
                    },
                    "progress_amount": map[string]interface{}{
                        "type": "number",
                        "description": "Current amount toward goal",
                    },
                    "milestone_reached": map[string]interface{}{
                        "type": "string",
                        "description": "Milestone description if any",
                    },
                },
                "required": []string{"goal_id", "progress_amount"},
            },
        },
    })
}
```

---

## 2. Autonomous Action Framework

### Action Categorization System

```go
// backend/internal/financial/autonomous.go
package financial

type ActionRisk int

const (
    RiskSafe ActionRisk = iota
    RiskLow
    RiskMedium
    RiskHigh
)

type ActionCategory struct {
    Name             string
    RiskLevel        ActionRisk
    RequiresApproval bool
    MaxValue         float64 // Maximum value for autonomous execution
    Description      string
    Examples         []string
}

var ActionCategories = map[string]ActionCategory{
    "read_operations": {
        Name:             "Read Operations",
        RiskLevel:        RiskSafe,
        RequiresApproval: false,
        MaxValue:         0, // No limit for read operations
        Description:      "Operations that only read data without modifications",
        Examples:         []string{"getAssets", "getExpenses", "calculateProjection"},
    },
    "analysis": {
        Name:             "Financial Analysis",
        RiskLevel:        RiskSafe,
        RequiresApproval: false,
        MaxValue:         0,
        Description:      "Analysis and reporting operations",
        Examples:         []string{"analyzeSpending", "generateReport", "assessRisk"},
    },
    "small_updates": {
        Name:             "Small Updates",
        RiskLevel:        RiskLow,
        RequiresApproval: false,
        MaxValue:         100, // Up to $100 autonomous updates
        Description:      "Minor financial record updates",
        Examples:         []string{"updateAssetValue", "addExpense"},
    },
    "goal_tracking": {
        Name:             "Goal Tracking",
        RiskLevel:        RiskLow,
        RequiresApproval: false,
        MaxValue:         0,
        Description:      "Goal progress and planning operations",
        Examples:         []string{"updateGoalProgress", "createPlanStep"},
    },
    "major_changes": {
        Name:             "Major Changes",
        RiskLevel:        RiskHigh,
        RequiresApproval: true,
        MaxValue:         0,
        Description:      "Significant financial changes requiring approval",
        Examples:         []string{"deleteAsset", "createLiability", "major_investment"},
    },
}

type AutonomousExecutor struct {
    client     *Client
    categories map[string]ActionCategory
}

func NewAutonomousExecutor(client *Client) *AutonomousExecutor {
    return &AutonomousExecutor{
        client:     client,
        categories: ActionCategories,
    }
}

func (ae *AutonomousExecutor) CanExecuteAutonomously(action string, params map[string]interface{}) bool {
    category := ae.categorizeAction(action)
    if category.RequiresApproval {
        return false
    }

    // Check value limits for financial operations
    if value, ok := params["amount"].(float64); ok {
        if category.MaxValue > 0 && value > category.MaxValue {
            return false
        }
    }

    return true
}

func (ae *AutonomousExecutor) categorizeAction(action string) ActionCategory {
    for _, category := range ae.categories {
        for _, example := range category.Examples {
            if example == action {
                return category
            }
        }
    }

    // Default to high risk requiring approval
    return ActionCategories["major_changes"]
}
```

### Enhanced Dispatch Handler

```go
// backend/cmd/server/handlers/autonomous_dispatch.go
package handlers

import (
    "context"
    "encoding/json"
    "net/http"
    "financial-chat-system/backend/internal/financial"
)

type AutonomousDispatchHandler struct {
    client          *financial.Client
    sessionStore    chatSessionStore
    previewService  previewGenerator
    autonomousExec  *financial.AutonomousExecutor
}

func (h *AutonomousDispatchHandler) HandleAutonomousDispatch(w http.ResponseWriter, r *http.Request) {
    var req DispatchRequest
    if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
        writeError(w, "Invalid request body", http.StatusBadRequest)
        return
    }

    // Separate autonomous and approval-required actions
    autonomousActions := []SelectedAction{}
    approvalActions := []SelectedAction{}

    for _, action := range req.SelectedActions {
        if h.autonomousExec.CanExecuteAutonomously(action.CallID, action.Parameters) {
            autonomousActions = append(autonomousActions, action)
        } else {
            approvalActions = append(approvalActions, action)
        }
    }

    results := DispatchResponse{
        Results: []ActionResult{},
    }

    // Execute autonomous actions immediately
    for _, action := range autonomousActions {
        result := h.executeAction(r.Context(), action)
        result.WasAutonomous = true
        results.Results = append(results.Results, result)
    }

    // Queue approval-required actions
    if len(approvalActions) > 0 {
        err := h.sessionStore.AddPendingActions(r.Context(), req.SessionID, approvalActions)
        if err != nil {
            writeError(w, "Failed to queue approval actions", http.StatusInternalServerError)
            return
        }

        results.PendingApprovals = len(approvalActions)
    }

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(results)
}
```

---

## 3. Learning System Implementation

### Learning Database Schema

```sql
-- User interaction logging
CREATE TABLE user_interactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id VARCHAR(255) NOT NULL,
    user_id VARCHAR(255) NOT NULL,
    interaction_type VARCHAR(50) NOT NULL, -- 'tool_call', 'approval', 'feedback'
    action_name VARCHAR(100),
    parameters JSONB,
    response JSONB,
    success BOOLEAN DEFAULT TRUE,
    user_feedback VARCHAR(20), -- 'helpful', 'confusing', 'incorrect', 'perfect'
    feedback_details TEXT,
    processing_time_ms INTEGER,
    created_at TIMESTAMP DEFAULT NOW()
);

-- User preferences learned over time
CREATE TABLE user_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255) UNIQUE NOT NULL,
    preferred_tools JSONB DEFAULT '[]',
    avoided_tools JSONB DEFAULT '[]',
    communication_style VARCHAR(50) DEFAULT 'balanced', -- 'concise', 'detailed', 'balanced'
    risk_tolerance VARCHAR(20) DEFAULT 'moderate', -- 'conservative', 'moderate', 'aggressive'
    notification_frequency VARCHAR(20) DEFAULT 'weekly', -- 'daily', 'weekly', 'monthly'
    goal_categories JSONB DEFAULT '[]',
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Learning outcomes and patterns
CREATE TABLE learning_patterns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pattern_type VARCHAR(50) NOT NULL, -- 'tool_preference', 'goal_pattern', 'success_factor'
    pattern_data JSONB NOT NULL,
    confidence_score DECIMAL(3,2) DEFAULT 0.0, -- 0.0 to 1.0
    sample_size INTEGER DEFAULT 1,
    last_updated TIMESTAMP DEFAULT NOW()
);
```

### Learning Service Implementation

```go
// backend/internal/learning/service.go
package learning

import (
    "context"
    "encoding/json"
    "time"
    "financial-chat-system/backend/internal/repository"
)

type LearningService struct {
    store *repository.Store
}

type UserInteraction struct {
    ID               string                 `json:"id"`
    SessionID        string                 `json:"session_id"`
    UserID           string                 `json:"user_id"`
    InteractionType  string                 `json:"interaction_type"`
    ActionName       string                 `json:"action_name"`
    Parameters       map[string]interface{} `json:"parameters"`
    Response         map[string]interface{} `json:"response"`
    Success          bool                   `json:"success"`
    UserFeedback     string                 `json:"user_feedback"`
    FeedbackDetails  string                 `json:"feedback_details"`
    ProcessingTimeMs int                    `json:"processing_time_ms"`
    CreatedAt        time.Time              `json:"created_at"`
}

type UserPreferences struct {
    UserID               string   `json:"user_id"`
    PreferredTools       []string `json:"preferred_tools"`
    AvoidedTools         []string `json:"avoided_tools"`
    CommunicationStyle   string   `json:"communication_style"`
    RiskTolerance        string   `json:"risk_tolerance"`
    NotificationFreq     string   `json:"notification_frequency"`
    GoalCategories       []string `json:"goal_categories"`
}

func NewLearningService(store *repository.Store) *LearningService {
    return &LearningService{store: store}
}

func (ls *LearningService) LogInteraction(ctx context.Context, interaction UserInteraction) error {
    // Store the interaction
    err := ls.store.LogUserInteraction(ctx, interaction)
    if err != nil {
        return err
    }

    // Async learning analysis
    go ls.analyzeInteractionPatterns(ctx, interaction.UserID)

    return nil
}

func (ls *LearningService) GetUserPreferences(ctx context.Context, userID string) (*UserPreferences, error) {
    prefs, err := ls.store.GetUserPreferences(ctx, userID)
    if err != nil {
        // Return default preferences if none exist
        return &UserPreferences{
            UserID:             userID,
            CommunicationStyle: "balanced",
            RiskTolerance:      "moderate",
            NotificationFreq:   "weekly",
        }, nil
    }
    return prefs, nil
}

func (ls *LearningService) analyzeInteractionPatterns(ctx context.Context, userID string) {
    // Analyze recent interactions for patterns
    interactions, err := ls.store.GetRecentInteractions(ctx, userID, 50)
    if err != nil {
        return
    }

    // Tool preference analysis
    ls.analyzeToolPreferences(ctx, userID, interactions)

    // Success pattern analysis
    ls.analyzeSuccessPatterns(ctx, userID, interactions)

    // Communication style analysis
    ls.analyzeCommunicationPreferences(ctx, userID, interactions)
}

func (ls *LearningService) analyzeToolPreferences(ctx context.Context, userID string, interactions []UserInteraction) {
    toolSuccess := make(map[string]float64)
    toolCount := make(map[string]int)

    for _, interaction := range interactions {
        if interaction.ActionName == "" {
            continue
        }

        toolCount[interaction.ActionName]++
        if interaction.Success && interaction.UserFeedback == "helpful" {
            toolSuccess[interaction.ActionName]++
        }
    }

    // Update preferences based on success rates
    var preferred, avoided []string
    for tool, count := range toolCount {
        if count < 3 {
            continue // Need minimum sample size
        }

        successRate := toolSuccess[tool] / float64(count)
        if successRate > 0.8 {
            preferred = append(preferred, tool)
        } else if successRate < 0.3 {
            avoided = append(avoided, tool)
        }
    }

    // Update user preferences
    ls.store.UpdateUserToolPreferences(ctx, userID, preferred, avoided)
}

func (ls *LearningService) GetOptimalToolSequence(ctx context.Context, userID string, goalType string) ([]string, error) {
    prefs, err := ls.GetUserPreferences(ctx, userID)
    if err != nil {
        return nil, err
    }

    // Get base sequence for goal type
    baseSequence := ls.getBaseToolSequence(goalType)

    // Optimize based on user preferences
    return ls.optimizeSequenceForUser(baseSequence, prefs), nil
}
```

---

## 4. Proactive Monitoring System

### Background Processing Implementation

```go
// backend/internal/monitor/service.go
package monitor

import (
    "context"
    "time"
    "financial-chat-system/backend/internal/financial"
    "financial-chat-system/backend/internal/notifications"
)

type MonitorService struct {
    client         *financial.Client
    goalService    *financial.GoalService
    notifications  *notifications.Service
    ticker         *time.Ticker
}

type MonitorConfig struct {
    CheckInterval    time.Duration
    GoalCheckWindow  time.Duration
    SpendingWindow   time.Duration
}

func NewMonitorService(client *financial.Client, goalService *financial.GoalService) *MonitorService {
    return &MonitorService{
        client:      client,
        goalService: goalService,
        ticker:      time.NewTicker(1 * time.Hour), // Check hourly
    }
}

func (ms *MonitorService) Start(ctx context.Context) {
    go func() {
        for {
            select {
            case <-ctx.Done():
                return
            case <-ms.ticker.C:
                ms.performChecks(ctx)
            }
        }
    }()
}

func (ms *MonitorService) performChecks(ctx context.Context) {
    // Get all active users (from recent sessions)
    users, err := ms.client.GetActiveUsers(ctx)
    if err != nil {
        return
    }

    for _, userID := range users {
        go ms.checkUserFinancialHealth(ctx, userID)
    }
}

func (ms *MonitorService) checkUserFinancialHealth(ctx context.Context, userID string) {
    // Check goal progress
    ms.checkGoalProgress(ctx, userID)

    // Check spending patterns
    ms.checkSpendingPatterns(ctx, userID)

    // Check asset performance
    ms.checkAssetPerformance(ctx, userID)

    // Check upcoming deadlines
    ms.checkUpcomingDeadlines(ctx, userID)
}

func (ms *MonitorService) checkGoalProgress(ctx context.Context, userID string) {
    goals, err := ms.goalService.GetActiveGoals(ctx, userID)
    if err != nil {
        return
    }

    for _, goal := range goals {
        currentProgress := ms.calculateGoalProgress(ctx, goal)
        expectedProgress := ms.calculateExpectedProgress(goal)

        // Check if behind schedule
        if currentProgress < expectedProgress*0.8 { // 20% tolerance
            ms.notifications.SendGoalAlert(ctx, userID, goal, "behind_schedule")
        }

        // Check for milestones
        if ms.isNewMilestoneReached(goal, currentProgress) {
            ms.notifications.SendGoalAlert(ctx, userID, goal, "milestone_reached")
        }

        // Update progress
        ms.goalService.UpdateProgress(ctx, goal.ID, currentProgress)
    }
}

type ProactiveAction struct {
    Type        string                 `json:"type"`
    Priority    string                 `json:"priority"`
    Title       string                 `json:"title"`
    Description string                 `json:"description"`
    Actions     []string               `json:"suggested_actions"`
    Data        map[string]interface{} `json:"data"`
}

func (ms *MonitorService) generateProactiveActions(ctx context.Context, userID string) ([]ProactiveAction, error) {
    actions := []ProactiveAction{}

    // Analyze spending trends
    spendingActions := ms.analyzeSpendingTrends(ctx, userID)
    actions = append(actions, spendingActions...)

    // Check goal opportunities
    goalActions := ms.findGoalOpportunities(ctx, userID)
    actions = append(actions, goalActions...)

    // Asset optimization suggestions
    assetActions := ms.suggestAssetOptimizations(ctx, userID)
    actions = append(actions, assetActions...)

    return actions, nil
}
```

### Integration with Chat Handler

```go
// Enhanced chat handler with proactive suggestions
func (h *ChatHandler) generateProactiveSuggestions(ctx context.Context, userID string) []ProactiveAction {
    actions, err := h.monitorService.generateProactiveActions(ctx, userID)
    if err != nil {
        return nil
    }

    // Filter based on user preferences
    prefs, _ := h.learningService.GetUserPreferences(ctx, userID)
    return h.filterActionsByPreferences(actions, prefs)
}

func (h *ChatHandler) HandleChat(w http.ResponseWriter, r *http.Request) {
    // ... existing code ...

    // Add proactive suggestions to response
    proactiveActions := h.generateProactiveSuggestions(r.Context(), userID)

    response := ChatResponse{
        Message:           assistantMessage,
        RequiresApproval: len(proposedActions) > 0,
        ProposedActions:  proposedActions,
        ProactiveSuggestions: proactiveActions, // New field
        Conversation: conversationResponse,
        RequestID:    requestID,
    }

    // ... rest of existing code ...
}
```

---

## 5. Integration Points

### Updated Main Server Configuration

```go
// backend/cmd/server/main.go updates
func main() {
    // ... existing setup ...

    // Initialize new services
    goalService := financial.NewGoalService(finStore)
    learningService := learning.NewLearningService(finStore)
    monitorService := monitor.NewMonitorService(financialClient, goalService)
    autonomousExecutor := financial.NewAutonomousExecutor(financialClient)

    // Start background monitoring
    monitorService.Start(context.Background())

    // Enhanced handlers with new capabilities
    chatHandler := handlers.NewEnhancedChatHandler(
        llmManager,
        previewService,
        sessionStore,
        goalService,
        learningService,
        monitorService,
        defaultModel,
        defaultMaxTokens,
    )

    autonomousDispatchHandler := handlers.NewAutonomousDispatchHandler(
        financialClient,
        sessionStore,
        previewService,
        autonomousExecutor,
    )

    // Register new endpoints
    v1Router.HandleFunc("/goals", goalHandler.HandleGoals).Methods("GET", "POST")
    v1Router.HandleFunc("/goals/{id}/progress", goalHandler.UpdateProgress).Methods("PUT")
    v1Router.HandleFunc("/financial/actions/autonomous", autonomousDispatchHandler.HandleAutonomousDispatch).Methods("POST")
    v1Router.HandleFunc("/proactive/suggestions", chatHandler.GetProactiveSuggestions).Methods("GET")

    // ... rest of existing code ...
}
```

This implementation guide provides the concrete technical steps needed to transform your current AI assistant into a fully agentic system with goal-oriented planning, learning capabilities, and autonomous execution within safe boundaries.