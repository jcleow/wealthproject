package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"sort"
	"time"

	"financial-chat-system/backend/internal/financial"
	"financial-chat-system/backend/internal/llm"
	"financial-chat-system/backend/internal/session"
)

// FinancialExecutor abstracts financial operations to allow testing
type FinancialExecutor interface {
	CreateAsset(ctx context.Context, params financial.AssetParams) (*string, error)
	UpdateAsset(ctx context.Context, params financial.UpdateAssetParams) (*string, error)
	DeleteAsset(ctx context.Context, params financial.DeleteAssetParams) (*string, error)
	CreateLiability(ctx context.Context, params financial.LiabilityParams) (*string, error)
	UpdateLiability(ctx context.Context, params financial.UpdateLiabilityParams) (*string, error)
	DeleteLiability(ctx context.Context, params financial.DeleteLiabilityParams) (*string, error)
	CreateIncome(ctx context.Context, params financial.IncomeParams) (*string, error)
	UpdateIncome(ctx context.Context, params financial.UpdateIncomeParams) (*string, error)
	DeleteIncome(ctx context.Context, params financial.DeleteIncomeParams) (*string, error)
	CreateExpense(ctx context.Context, params financial.ExpenseParams) (*string, error)
	UpdateExpense(ctx context.Context, params financial.UpdateExpenseParams) (*string, error)
	DeleteExpense(ctx context.Context, params financial.DeleteExpenseParams) (*string, error)
	CreatePropertyScenario(ctx context.Context, params financial.PropertyScenarioParams) (*string, error)
	RollbackAction(ctx context.Context, toolName string, entityID *string) error
}

// DispatchSessionStore defines the session store contract used by dispatch
type DispatchSessionStore interface {
	GetSession(ctx context.Context, sessionID string) (*session.SessionState, error)
	UpdateEntityReferences(ctx context.Context, sessionID string, assetID, liabilityID *string) error
	ClearPendingActions(ctx context.Context, sessionID string, callIDs []string) error
}

// DispatchHandler handles action execution requests
type DispatchHandler struct {
	financialClient FinancialExecutor
	sessionStore    DispatchSessionStore
	previewSvc      *financial.ActionPreviewService
}

// NewDispatchHandler creates a new dispatch handler
func NewDispatchHandler(financialClient FinancialExecutor, sessionStore DispatchSessionStore, previewSvc *financial.ActionPreviewService) *DispatchHandler {
	return &DispatchHandler{
		financialClient: financialClient,
		sessionStore:    sessionStore,
		previewSvc:      previewSvc,
	}
}

// DispatchRequest represents the action dispatch request
type DispatchRequest struct {
	SelectedActions []SelectedAction `json:"selected_actions" validate:"required"`
	SessionID       string           `json:"session_id" validate:"required"`
}

// SelectedAction represents a user-selected action
type SelectedAction struct {
	CallID       string                 `json:"call_id" validate:"required"`
	Approved     bool                   `json:"approved"`
	ModifiedArgs map[string]interface{} `json:"modified_args,omitempty"`
}

// DispatchResponse represents the action execution response
type DispatchResponse struct {
	Results             []ExecutionResult    `json:"results"`
	Summary             ExecutionSummary     `json:"summary"`
	UpdatedSessionState session.SessionState `json:"updated_session_state"`
	APIVersion          string               `json:"api_version"`
}

// ExecutionResult represents the result of a single action execution
type ExecutionResult struct {
	CallID        string  `json:"call_id"`
	ToolName      string  `json:"tool_name,omitempty"`
	Success       bool    `json:"success"`
	EntityID      *string `json:"entity_id,omitempty"`
	Error         *string `json:"error,omitempty"`
	ExecutionTime int64   `json:"execution_time_ms"`
	RolledBack    bool    `json:"rolled_back,omitempty"`
}

// ExecutionSummary provides an overview of the execution
type ExecutionSummary struct {
	TotalActions       int    `json:"total_actions"`
	Successful         int    `json:"successful"`
	Failed             int    `json:"failed"`
	Skipped            int    `json:"skipped"`
	TotalExecutionTime int64  `json:"total_execution_time_ms"`
	Status             string `json:"status"` // "success", "partial_success", "failed"
}

// HandleDispatch executes approved financial actions
func (h *DispatchHandler) HandleDispatch(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	startTime := time.Now()

	// Parse request
	var req DispatchRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_request", "Failed to parse request body")
		return
	}

	// Validate request
	if req.SessionID == "" || len(req.SelectedActions) == 0 {
		writeError(w, http.StatusBadRequest, "missing_required_fields", "Selected actions and session_id are required")
		return
	}

	// Load session state
	sessionState, err := h.sessionStore.GetSession(ctx, req.SessionID)
	if err != nil {
		writeError(w, http.StatusNotFound, "session_not_found", "Session not found")
		return
	}

	pendingActions := sessionState.PendingActions
	if len(pendingActions) == 0 {
		writeError(w, http.StatusBadRequest, "no_pending_actions", "No pending actions to execute")
		return
	}

	pendingMap := make(map[string]session.PendingToolCall)
	for _, action := range pendingActions {
		pendingMap[action.CallID] = action
	}

	dependencyMap := h.resolveDependencies(pendingActions)

	results := make([]ExecutionResult, 0, len(req.SelectedActions))
	approvedSet := map[string]bool{}
	skippedCount := 0
	actionsToExecute := make([]ExecutionAction, 0, len(req.SelectedActions))

	for _, selected := range req.SelectedActions {
		pending, exists := pendingMap[selected.CallID]
		if !exists {
			writeError(w, http.StatusBadRequest, "invalid_action", fmt.Sprintf("Action %s not found in pending actions", selected.CallID))
			return
		}

		if !selected.Approved {
			skippedCount++
			msg := "Action was not approved by user"
			results = append(results, ExecutionResult{
				CallID:        selected.CallID,
				ToolName:      pending.ToolName,
				Success:       false,
				Error:         &msg,
				ExecutionTime: 0,
			})
			continue
		}

		approvedSet[selected.CallID] = true

		params := cloneParams(pending.Parameters)
		if selected.ModifiedArgs != nil {
			for k, v := range selected.ModifiedArgs {
				params[k] = v
			}
		}

		actionsToExecute = append(actionsToExecute, ExecutionAction{
			CallID:       selected.CallID,
			ToolName:     pending.ToolName,
			Parameters:   params,
			Dependencies: dependencyMap[selected.CallID],
		})
	}

	// Handle dependency approval/missing cases before execution
	blocked := map[string]string{}
	for _, action := range actionsToExecute {
		for _, dep := range action.Dependencies {
			if _, exists := pendingMap[dep]; !exists {
				blocked[action.CallID] = fmt.Sprintf("Dependency %s not found", dep)
				break
			}
			if !approvedSet[dep] {
				blocked[action.CallID] = fmt.Sprintf("Dependency %s was not approved", dep)
				break
			}
		}
	}

	executable := make([]ExecutionAction, 0, len(actionsToExecute))
	failureCount := 0
	for _, action := range actionsToExecute {
		if reason, found := blocked[action.CallID]; found {
			results = append(results, ExecutionResult{
				CallID:   action.CallID,
				ToolName: action.ToolName,
				Success:  false,
				Error:    &reason,
			})
			failureCount++
			continue
		}
		executable = append(executable, action)
	}

	if len(executable) == 0 {
		response := DispatchResponse{
			Results: results,
			Summary: ExecutionSummary{
				TotalActions:       len(req.SelectedActions),
				Successful:         0,
				Failed:             failureCount,
				Skipped:            skippedCount,
				TotalExecutionTime: time.Since(startTime).Milliseconds(),
				Status:             "failed",
			},
			UpdatedSessionState: *sessionState,
			APIVersion:          "v1",
		}
		writeJSON(w, response)
		return
	}

	sortedActions, err := h.sortActionsByDependencies(executable)
	if err != nil {
		writeError(w, http.StatusConflict, "dependency_error", err.Error())
		return
	}

	// Execute actions
	executionResults := map[string]*ExecutionResult{}
	executedActions := []executedAction{}
	successCount := 0

	for i, action := range sortedActions {
		paramsWithDeps := h.injectDependencyReferences(action.Parameters, action.Dependencies, executionResults, pendingMap)

		actionStart := time.Now()
		entityID, execErr := h.executeAction(ctx, ExecutionAction{
			CallID:       action.CallID,
			ToolName:     action.ToolName,
			Parameters:   paramsWithDeps,
			Dependencies: action.Dependencies,
		}, sessionState)

		result := ExecutionResult{
			CallID:        action.CallID,
			ToolName:      action.ToolName,
			Success:       execErr == nil,
			EntityID:      entityID,
			ExecutionTime: time.Since(actionStart).Milliseconds(),
		}

		if execErr != nil {
			errMsg := execErr.Error()
			result.Error = &errMsg
			results = append(results, result)
			failureCount++

			rollbackFailures := h.rollbackExecuted(ctx, executedActions)
			for idx := range results {
				for _, executed := range executedActions {
					if results[idx].CallID == executed.Action.CallID {
						results[idx].RolledBack = true
						if results[idx].Success {
							results[idx].Success = false
							if successCount > 0 {
								successCount--
							}
							failureCount++
						}
						if msg, ok := rollbackFailures[executed.Action.CallID]; ok {
							results[idx].Error = &msg
						} else if results[idx].Error == nil {
							rbMsg := "rolled back due to failure in dependent action"
							results[idx].Error = &rbMsg
						}
					}
				}
			}

			// Mark remaining actions as not executed due to failure
			for j := i + 1; j < len(sortedActions); j++ {
				msg := "not executed due to previous failure"
				results = append(results, ExecutionResult{
					CallID:   sortedActions[j].CallID,
					ToolName: sortedActions[j].ToolName,
					Success:  false,
					Error:    &msg,
				})
				failureCount++
			}

			break
		}

		results = append(results, result)
		executionResults[action.CallID] = &results[len(results)-1]
		executedActions = append(executedActions, executedAction{
			Action:   action,
			EntityID: entityID,
		})
		successCount++
	}

	// Track entity references only for successful, non-rolled-back actions
	var lastAssetID, lastLiabilityID *string
	for _, res := range results {
		if !res.Success || res.RolledBack || res.EntityID == nil {
			continue
		}
		switch pendingMap[res.CallID].ToolName {
		case "createAsset", "updateAsset":
			lastAssetID = res.EntityID
		case "createLiability", "updateLiability":
			lastLiabilityID = res.EntityID
		}
	}

	if lastAssetID != nil || lastLiabilityID != nil {
		if err := h.sessionStore.UpdateEntityReferences(ctx, req.SessionID, lastAssetID, lastLiabilityID); err != nil {
			fmt.Printf("Failed to update entity references: %v\n", err)
		}
	}

	// Clear executed or processed actions from pending list
	var clearedIDs []string
	for _, action := range executedActions {
		clearedIDs = append(clearedIDs, action.Action.CallID)
	}
	for callID := range blocked {
		clearedIDs = append(clearedIDs, callID)
	}
	for _, selected := range req.SelectedActions {
		if !selected.Approved {
			clearedIDs = append(clearedIDs, selected.CallID)
		}
	}
	if len(clearedIDs) > 0 {
		if err := h.sessionStore.ClearPendingActions(ctx, req.SessionID, clearedIDs); err != nil {
			fmt.Printf("Failed to clear pending actions: %v\n", err)
		}
	}

	updatedSession, _ := h.sessionStore.GetSession(ctx, req.SessionID)
	if updatedSession == nil {
		updatedSession = sessionState
	}

	status := "success"
	if failureCount > 0 && successCount > 0 {
		status = "partial_success"
	} else if failureCount > 0 && successCount == 0 {
		status = "failed"
	}

	response := DispatchResponse{
		Results: results,
		Summary: ExecutionSummary{
			TotalActions:       len(req.SelectedActions),
			Successful:         successCount,
			Failed:             failureCount,
			Skipped:            skippedCount,
			TotalExecutionTime: time.Since(startTime).Milliseconds(),
			Status:             status,
		},
		UpdatedSessionState: *updatedSession,
		APIVersion:          "v1",
	}

	writeJSON(w, response)
}

// ExecutionAction represents an action to be executed
type ExecutionAction struct {
	CallID       string
	ToolName     string
	Parameters   map[string]interface{}
	Dependencies []string
	Priority     int // Lower number = higher priority
}

type executedAction struct {
	Action   ExecutionAction
	EntityID *string
}

// executeAction executes a single financial action
func (h *DispatchHandler) executeAction(ctx context.Context, action ExecutionAction, sessionState *session.SessionState) (*string, error) {
	params := h.enrichParametersWithReferences(action.Parameters, sessionState)

	switch action.ToolName {
	case "createAsset":
		typed, err := financial.DecodeParams[financial.AssetParams](params)
		if err != nil {
			return nil, fmt.Errorf("invalid createAsset parameters: %w", err)
		}
		return h.financialClient.CreateAsset(ctx, typed)
	case "updateAsset":
		typed, err := financial.DecodeParams[financial.UpdateAssetParams](params)
		if err != nil {
			return nil, fmt.Errorf("invalid updateAsset parameters: %w", err)
		}
		return h.financialClient.UpdateAsset(ctx, typed)
	case "deleteAsset":
		typed, err := financial.DecodeParams[financial.DeleteAssetParams](params)
		if err != nil {
			return nil, fmt.Errorf("invalid deleteAsset parameters: %w", err)
		}
		return h.financialClient.DeleteAsset(ctx, typed)
	case "createLiability":
		typed, err := financial.DecodeParams[financial.LiabilityParams](params)
		if err != nil {
			return nil, fmt.Errorf("invalid createLiability parameters: %w", err)
		}
		return h.financialClient.CreateLiability(ctx, typed)
	case "updateLiability":
		typed, err := financial.DecodeParams[financial.UpdateLiabilityParams](params)
		if err != nil {
			return nil, fmt.Errorf("invalid updateLiability parameters: %w", err)
		}
		return h.financialClient.UpdateLiability(ctx, typed)
	case "deleteLiability":
		typed, err := financial.DecodeParams[financial.DeleteLiabilityParams](params)
		if err != nil {
			return nil, fmt.Errorf("invalid deleteLiability parameters: %w", err)
		}
		return h.financialClient.DeleteLiability(ctx, typed)
	case "createIncome":
		typed, err := financial.DecodeParams[financial.IncomeParams](params)
		if err != nil {
			return nil, fmt.Errorf("invalid createIncome parameters: %w", err)
		}
		return h.financialClient.CreateIncome(ctx, typed)
	case "updateIncome":
		typed, err := financial.DecodeParams[financial.UpdateIncomeParams](params)
		if err != nil {
			return nil, fmt.Errorf("invalid updateIncome parameters: %w", err)
		}
		return h.financialClient.UpdateIncome(ctx, typed)
	case "deleteIncome":
		typed, err := financial.DecodeParams[financial.DeleteIncomeParams](params)
		if err != nil {
			return nil, fmt.Errorf("invalid deleteIncome parameters: %w", err)
		}
		return h.financialClient.DeleteIncome(ctx, typed)
	case "createExpense":
		typed, err := financial.DecodeParams[financial.ExpenseParams](params)
		if err != nil {
			return nil, fmt.Errorf("invalid createExpense parameters: %w", err)
		}
		return h.financialClient.CreateExpense(ctx, typed)
	case "updateExpense":
		typed, err := financial.DecodeParams[financial.UpdateExpenseParams](params)
		if err != nil {
			return nil, fmt.Errorf("invalid updateExpense parameters: %w", err)
		}
		return h.financialClient.UpdateExpense(ctx, typed)
	case "deleteExpense":
		typed, err := financial.DecodeParams[financial.DeleteExpenseParams](params)
		if err != nil {
			return nil, fmt.Errorf("invalid deleteExpense parameters: %w", err)
		}
		return h.financialClient.DeleteExpense(ctx, typed)
	case "createPropertyScenario":
		typed, err := financial.DecodeParams[financial.PropertyScenarioParams](params)
		if err != nil {
			return nil, fmt.Errorf("invalid createPropertyScenario parameters: %w", err)
		}
		return h.financialClient.CreatePropertyScenario(ctx, typed)
	default:
		return nil, fmt.Errorf("unknown tool: %s", action.ToolName)
	}
}

// injectDependencyReferences adds entity IDs from dependency results into parameters when missing
func (h *DispatchHandler) injectDependencyReferences(params map[string]interface{}, deps []string, results map[string]*ExecutionResult, pending map[string]session.PendingToolCall) map[string]interface{} {
	merged := cloneParams(params)

	for _, dep := range deps {
		result, ok := results[dep]
		if !ok || result.EntityID == nil {
			continue
		}

		if pendingDep, exists := pending[dep]; exists {
			switch pendingDep.ToolName {
			case "createAsset":
				if _, has := merged["assetId"]; !has {
					merged["assetId"] = *result.EntityID
				}
				if _, has := merged["lastAssetId"]; !has {
					merged["lastAssetId"] = *result.EntityID
				}
			case "createLiability":
				if _, has := merged["liabilityId"]; !has {
					merged["liabilityId"] = *result.EntityID
				}
				if _, has := merged["lastLiabilityId"]; !has {
					merged["lastLiabilityId"] = *result.EntityID
				}
			}
		}
	}

	return merged
}

// enrichParametersWithReferences adds entity references from session state
func (h *DispatchHandler) enrichParametersWithReferences(params map[string]interface{}, sessionState *session.SessionState) map[string]interface{} {
	enriched := cloneParams(params)

	if _, hasAssetID := enriched["assetId"]; !hasAssetID && sessionState.LastAssetID != nil {
		enriched["lastAssetId"] = *sessionState.LastAssetID
	}

	if _, hasLiabilityID := enriched["liabilityId"]; !hasLiabilityID && sessionState.LastLiabilityID != nil {
		enriched["lastLiabilityId"] = *sessionState.LastLiabilityID
	}

	return enriched
}

// sortActionsByDependencies sorts actions based on their dependencies
func (h *DispatchHandler) sortActionsByDependencies(actions []ExecutionAction) ([]ExecutionAction, error) {
	if len(actions) == 0 {
		return actions, nil
	}

	// Map actions and indegrees for Kahn's algorithm
	actionMap := make(map[string]ExecutionAction)
	indegree := make(map[string]int)
	graph := make(map[string][]string)

	for _, action := range actions {
		actionMap[action.CallID] = action
		indegree[action.CallID] = 0
	}

	for _, action := range actions {
		for _, dep := range action.Dependencies {
			if _, exists := actionMap[dep]; exists {
				graph[dep] = append(graph[dep], action.CallID)
				indegree[action.CallID]++
			}
		}
	}

	queue := make([]ExecutionAction, 0)
	for id, deg := range indegree {
		if deg == 0 {
			queue = append(queue, actionMap[id])
		}
	}

	sort.Slice(queue, func(i, j int) bool {
		return queue[i].ToolName < queue[j].ToolName
	})

	var sorted []ExecutionAction
	for len(queue) > 0 {
		current := queue[0]
		queue = queue[1:]
		sorted = append(sorted, current)

		for _, neighbor := range graph[current.CallID] {
			indegree[neighbor]--
			if indegree[neighbor] == 0 {
				queue = append(queue, actionMap[neighbor])
			}
		}

		sort.Slice(queue, func(i, j int) bool {
			return queue[i].ToolName < queue[j].ToolName
		})
	}

	if len(sorted) != len(actions) {
		return nil, fmt.Errorf("detected circular dependency in actions")
	}

	return sorted, nil
}

// resolveDependencies ensures dependency data exists; falls back to preview analysis when missing
func (h *DispatchHandler) resolveDependencies(pending []session.PendingToolCall) map[string][]string {
	deps := make(map[string][]string)
	missing := []session.PendingToolCall{}

	for _, action := range pending {
		if len(action.Dependencies) > 0 {
			deps[action.CallID] = action.Dependencies
			continue
		}
		missing = append(missing, action)
	}

	if len(missing) == 0 || h.previewSvc == nil {
		return deps
	}

	toolCalls := make([]llm.ToolCall, 0, len(missing))
	for _, action := range missing {
		argsJSON, _ := json.Marshal(action.Parameters)
		toolCalls = append(toolCalls, llm.ToolCall{
			ID:   action.CallID,
			Type: "function",
			Function: llm.FunctionCall{
				Name:      action.ToolName,
				Arguments: string(argsJSON),
			},
		})
	}

	previews, err := h.previewSvc.GeneratePreview(toolCalls)
	if err != nil {
		return deps
	}

	for _, preview := range previews {
		if len(preview.Dependencies) > 0 {
			deps[preview.CallID] = preview.Dependencies
		}
	}

	return deps
}

// rollbackExecuted attempts to rollback executed actions in reverse order
func (h *DispatchHandler) rollbackExecuted(ctx context.Context, executed []executedAction) map[string]string {
	failures := make(map[string]string)

	for i := len(executed) - 1; i >= 0; i-- {
		action := executed[i]
		if action.EntityID == nil {
			continue
		}
		if err := h.financialClient.RollbackAction(ctx, action.Action.ToolName, action.EntityID); err != nil {
			failures[action.Action.CallID] = err.Error()
		}
	}

	return failures
}

// isCriticalFailure determines if a failure should stop further execution
func (h *DispatchHandler) isCriticalFailure(toolName string, err error) bool {
	criticalTools := map[string]bool{
		"createAsset":     true,
		"createLiability": true,
	}
	return criticalTools[toolName]
}

func cloneParams(params map[string]interface{}) map[string]interface{} {
	clone := make(map[string]interface{}, len(params))
	for k, v := range params {
		clone[k] = v
	}
	return clone
}

func writeJSON(w http.ResponseWriter, payload interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("API-Version", "v1")
	_ = json.NewEncoder(w).Encode(payload)
}

// HandleBatchDispatch handles multiple dispatch requests in batch
func (h *DispatchHandler) HandleBatchDispatch(w http.ResponseWriter, r *http.Request) {
	writeError(w, http.StatusNotImplemented, "not_implemented", "Batch dispatch not yet implemented")
}

// GetDispatchStatus retrieves the status of a previous dispatch
func (h *DispatchHandler) GetDispatchStatus(w http.ResponseWriter, r *http.Request) {
	writeError(w, http.StatusNotImplemented, "not_implemented", "Dispatch status tracking not yet implemented")
}
