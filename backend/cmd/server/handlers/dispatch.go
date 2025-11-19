package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"sort"
	"time"

	"financial-chat-system/backend/internal/financial"
	"financial-chat-system/backend/internal/session"
)

// DispatchHandler handles action execution requests
type DispatchHandler struct {
	financialClient *financial.Client
	sessionStore    *session.Store
	previewSvc      *financial.ActionPreviewService
}

// NewDispatchHandler creates a new dispatch handler
func NewDispatchHandler(financialClient *financial.Client, sessionStore *session.Store, previewSvc *financial.ActionPreviewService) *DispatchHandler {
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
	Results             []ExecutionResult       `json:"results"`
	Summary             ExecutionSummary        `json:"summary"`
	UpdatedSessionState session.SessionState    `json:"updated_session_state"`
	APIVersion          string                  `json:"api_version"`
}

// ExecutionResult represents the result of a single action execution
type ExecutionResult struct {
	CallID        string  `json:"call_id"`
	ToolName      string  `json:"tool_name"`
	Success       bool    `json:"success"`
	EntityID      *string `json:"entity_id,omitempty"`
	Error         *string `json:"error,omitempty"`
	ExecutionTime int64   `json:"execution_time_ms"`
}

// ExecutionSummary provides an overview of the execution
type ExecutionSummary struct {
	TotalActions     int    `json:"total_actions"`
	SuccessfulActions int   `json:"successful_actions"`
	FailedActions     int   `json:"failed_actions"`
	TotalExecutionTime int64 `json:"total_execution_time_ms"`
	Status           string `json:"status"` // "success", "partial_success", "failed"
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
	if len(req.SelectedActions) == 0 || req.SessionID == "" {
		writeError(w, http.StatusBadRequest, "missing_required_fields", "Selected actions and session_id are required")
		return
	}

	// Load session state
	sessionState, err := h.sessionStore.GetSession(ctx, req.SessionID)
	if err != nil {
		writeError(w, http.StatusNotFound, "session_not_found", "Session not found")
		return
	}

	// Get pending actions from session
	pendingActions := sessionState.PendingActions
	if len(pendingActions) == 0 {
		writeError(w, http.StatusBadRequest, "no_pending_actions", "No pending actions to execute")
		return
	}

	// Create a map of pending actions for quick lookup
	pendingMap := make(map[string]session.PendingToolCall)
	for _, action := range pendingActions {
		pendingMap[action.CallID] = action
	}

	// Prepare actions for execution
	var actionsToExecute []ExecutionAction
	for _, selected := range req.SelectedActions {
		if !selected.Approved {
			continue
		}

		pending, exists := pendingMap[selected.CallID]
		if !exists {
			continue // Skip if action not found in pending list
		}

		// Merge modified arguments if provided
		params := pending.Parameters
		if selected.ModifiedArgs != nil {
			for k, v := range selected.ModifiedArgs {
				params[k] = v
			}
		}

		actionsToExecute = append(actionsToExecute, ExecutionAction{
			CallID:     selected.CallID,
			ToolName:   pending.ToolName,
			Parameters: params,
		})
	}

	// Sort actions by dependencies
	sortedActions := h.sortActionsByDependencies(actionsToExecute)

	// Execute actions
	results := make([]ExecutionResult, 0, len(sortedActions))
	var successCount, failureCount int
	var lastAssetID, lastLiabilityID *string

	for _, action := range sortedActions {
		actionStart := time.Now()

		// Execute the action
		entityID, err := h.executeAction(ctx, action, sessionState)

		result := ExecutionResult{
			CallID:        action.CallID,
			ToolName:      action.ToolName,
			Success:       err == nil,
			ExecutionTime: time.Since(actionStart).Milliseconds(),
		}

		if err != nil {
			errMsg := err.Error()
			result.Error = &errMsg
			failureCount++

			// If this is a critical failure, stop execution
			if h.isCriticalFailure(action.ToolName, err) {
				results = append(results, result)
				break
			}
		} else {
			result.EntityID = entityID
			successCount++

			// Update last entity references
			if entityID != nil {
				switch action.ToolName {
				case "createAsset", "updateAsset":
					lastAssetID = entityID
				case "createLiability", "updateLiability":
					lastLiabilityID = entityID
				}
			}
		}

		results = append(results, result)
	}

	// Update session state with new entity references
	if lastAssetID != nil || lastLiabilityID != nil {
		if err := h.sessionStore.UpdateEntityReferences(ctx, req.SessionID, lastAssetID, lastLiabilityID); err != nil {
			// Log error but continue
			fmt.Printf("Failed to update entity references: %v\n", err)
		}
	}

	// Clear executed actions from pending list
	var executedIDs []string
	for _, result := range results {
		executedIDs = append(executedIDs, result.CallID)
	}

	if err := h.sessionStore.ClearPendingActions(ctx, req.SessionID, executedIDs); err != nil {
		// Log error but continue
		fmt.Printf("Failed to clear pending actions: %v\n", err)
	}

	// Get updated session state
	updatedSession, _ := h.sessionStore.GetSession(ctx, req.SessionID)
	if updatedSession == nil {
		updatedSession = sessionState
	}

	// Determine overall status
	status := "success"
	if failureCount > 0 && successCount > 0 {
		status = "partial_success"
	} else if failureCount > 0 && successCount == 0 {
		status = "failed"
	}

	// Prepare response
	response := DispatchResponse{
		Results: results,
		Summary: ExecutionSummary{
			TotalActions:       len(sortedActions),
			SuccessfulActions:  successCount,
			FailedActions:      failureCount,
			TotalExecutionTime: time.Since(startTime).Milliseconds(),
			Status:             status,
		},
		UpdatedSessionState: *updatedSession,
		APIVersion:          "v1",
	}

	// Set response headers
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("API-Version", "v1")

	// Write response
	if err := json.NewEncoder(w).Encode(response); err != nil {
		writeError(w, http.StatusInternalServerError, "response_error", "Failed to encode response")
		return
	}
}

// ExecutionAction represents an action to be executed
type ExecutionAction struct {
	CallID     string
	ToolName   string
	Parameters map[string]interface{}
	Priority   int // Lower number = higher priority
}

// executeAction executes a single financial action
func (h *DispatchHandler) executeAction(ctx context.Context, action ExecutionAction, sessionState *session.SessionState) (*string, error) {
	// Add entity references to parameters if needed
	params := h.enrichParametersWithReferences(action.Parameters, sessionState)

	// Execute based on tool name
	switch action.ToolName {
	case "createAsset":
		return h.financialClient.CreateAsset(ctx, params)
	case "updateAsset":
		return h.financialClient.UpdateAsset(ctx, params)
	case "createLiability":
		return h.financialClient.CreateLiability(ctx, params)
	case "updateLiability":
		return h.financialClient.UpdateLiability(ctx, params)
	case "createPropertyScenario":
		return h.financialClient.CreatePropertyScenario(ctx, params)
	default:
		return nil, fmt.Errorf("unknown tool: %s", action.ToolName)
	}
}

// enrichParametersWithReferences adds entity references from session state
func (h *DispatchHandler) enrichParametersWithReferences(params map[string]interface{}, sessionState *session.SessionState) map[string]interface{} {
	enriched := make(map[string]interface{})
	for k, v := range params {
		enriched[k] = v
	}

	// Add last entity references if not already present
	if _, hasAssetID := enriched["assetId"]; !hasAssetID && sessionState.LastAssetID != nil {
		enriched["lastAssetId"] = *sessionState.LastAssetID
	}

	if _, hasLiabilityID := enriched["liabilityId"]; !hasLiabilityID && sessionState.LastLiabilityID != nil {
		enriched["lastLiabilityId"] = *sessionState.LastLiabilityID
	}

	return enriched
}

// sortActionsByDependencies sorts actions based on their dependencies
func (h *DispatchHandler) sortActionsByDependencies(actions []ExecutionAction) []ExecutionAction {
	// Define priority for each action type
	priorities := map[string]int{
		"createAsset":           1,
		"createLiability":       2,
		"updateAsset":           3,
		"updateLiability":       4,
		"createPropertyScenario": 5,
	}

	// Assign priorities
	for i := range actions {
		if priority, exists := priorities[actions[i].ToolName]; exists {
			actions[i].Priority = priority
		} else {
			actions[i].Priority = 99
		}
	}

	// Sort by priority
	sort.Slice(actions, func(i, j int) bool {
		return actions[i].Priority < actions[j].Priority
	})

	return actions
}

// isCriticalFailure determines if a failure should stop further execution
func (h *DispatchHandler) isCriticalFailure(toolName string, err error) bool {
	// Define critical failure conditions
	criticalTools := map[string]bool{
		"createAsset":     true, // If we can't create an asset, dependent actions will fail
		"createLiability": true, // If we can't create a liability, dependent actions will fail
	}

	return criticalTools[toolName]
}

// HandleBatchDispatch handles multiple dispatch requests in batch
func (h *DispatchHandler) HandleBatchDispatch(w http.ResponseWriter, r *http.Request) {
	// TODO: Implement batch dispatch for multiple sessions
	writeError(w, http.StatusNotImplemented, "not_implemented", "Batch dispatch not yet implemented")
}

// GetDispatchStatus retrieves the status of a previous dispatch
func (h *DispatchHandler) GetDispatchStatus(w http.ResponseWriter, r *http.Request) {
	// TODO: Implement dispatch status tracking
	writeError(w, http.StatusNotImplemented, "not_implemented", "Dispatch status tracking not yet implemented")
}