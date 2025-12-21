package handlers

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"

	"financial-chat-system/backend/internal/financial"
	"financial-chat-system/backend/internal/session"
)

type mockFinancialClient struct {
	failOnTool string
	actions    []string
}

func (m *mockFinancialClient) DeleteAsset(ctx context.Context, params financial.DeleteAssetParams) (*string, error) {
	m.actions = append(m.actions, "deleteAsset")
	if m.failOnTool == "deleteAsset" {
		return nil, errMockFailure
	}
	id := "asset-123"
	return &id, nil
}

func (m *mockFinancialClient) CreateAsset(ctx context.Context, params financial.AssetParams) (*string, error) {
	m.actions = append(m.actions, "createAsset")
	if m.failOnTool == "createAsset" {
		return nil, errMockFailure
	}
	id := "asset-123"
	return &id, nil
}

func (m *mockFinancialClient) UpdateAsset(ctx context.Context, params financial.UpdateAssetParams) (*string, error) {
	m.actions = append(m.actions, "updateAsset")
	if m.failOnTool == "updateAsset" {
		return nil, errMockFailure
	}
	id := "asset-123"
	return &id, nil
}

func (m *mockFinancialClient) CreateLiability(ctx context.Context, params financial.LiabilityParams) (*string, error) {
	m.actions = append(m.actions, "createLiability")
	if m.failOnTool == "createLiability" {
		return nil, errMockFailure
	}
	id := "liability-123"
	return &id, nil
}

func (m *mockFinancialClient) UpdateLiability(ctx context.Context, params financial.UpdateLiabilityParams) (*string, error) {
	m.actions = append(m.actions, "updateLiability")
	if m.failOnTool == "updateLiability" {
		return nil, errMockFailure
	}
	id := "liability-123"
	return &id, nil
}

func (m *mockFinancialClient) DeleteLiability(ctx context.Context, params financial.DeleteLiabilityParams) (*string, error) {
	m.actions = append(m.actions, "deleteLiability")
	if m.failOnTool == "deleteLiability" {
		return nil, errMockFailure
	}
	id := "liability-123"
	return &id, nil
}

func (m *mockFinancialClient) CreateIncome(ctx context.Context, params financial.IncomeParams) (*string, error) {
	m.actions = append(m.actions, "createIncome")
	if m.failOnTool == "createIncome" {
		return nil, errMockFailure
	}
	id := "income-123"
	return &id, nil
}

func (m *mockFinancialClient) UpdateIncome(ctx context.Context, params financial.UpdateIncomeParams) (*string, error) {
	m.actions = append(m.actions, "updateIncome")
	if m.failOnTool == "updateIncome" {
		return nil, errMockFailure
	}
	id := "income-123"
	return &id, nil
}

func (m *mockFinancialClient) DeleteIncome(ctx context.Context, params financial.DeleteIncomeParams) (*string, error) {
	m.actions = append(m.actions, "deleteIncome")
	if m.failOnTool == "deleteIncome" {
		return nil, errMockFailure
	}
	id := "income-123"
	return &id, nil
}

func (m *mockFinancialClient) CreateExpense(ctx context.Context, params financial.ExpenseParams) (*string, error) {
	m.actions = append(m.actions, "createExpense")
	if m.failOnTool == "createExpense" {
		return nil, errMockFailure
	}
	id := "expense-123"
	return &id, nil
}

func (m *mockFinancialClient) UpdateExpense(ctx context.Context, params financial.UpdateExpenseParams) (*string, error) {
	m.actions = append(m.actions, "updateExpense")
	if m.failOnTool == "updateExpense" {
		return nil, errMockFailure
	}
	id := "expense-123"
	return &id, nil
}

func (m *mockFinancialClient) DeleteExpense(ctx context.Context, params financial.DeleteExpenseParams) (*string, error) {
	m.actions = append(m.actions, "deleteExpense")
	if m.failOnTool == "deleteExpense" {
		return nil, errMockFailure
	}
	id := "expense-123"
	return &id, nil
}

func (m *mockFinancialClient) CreatePropertyScenario(ctx context.Context, params financial.PropertyScenarioParams) (*string, error) {
	m.actions = append(m.actions, "createPropertyScenario")
	if m.failOnTool == "createPropertyScenario" {
		return nil, errMockFailure
	}
	id := "scenario-123"
	return &id, nil
}

func (m *mockFinancialClient) RollbackAction(ctx context.Context, toolName string, entityID *string) error {
	m.actions = append(m.actions, "rollback:"+toolName)
	return nil
}

// Analysis tools (Agent 3) - read-only mock implementations
func (m *mockFinancialClient) GetNetWorthSummary(ctx context.Context, userID string, params financial.GetNetWorthSummaryParams) (*string, error) {
	result := "Mock net worth summary"
	return &result, nil
}

func (m *mockFinancialClient) AnalyzeNetWorthTrends(ctx context.Context, userID string, params financial.AnalyzeNetWorthTrendsParams) (*string, error) {
	result := "Mock net worth trends"
	return &result, nil
}

func (m *mockFinancialClient) CompareScenarioImpact(ctx context.Context, userID string, params financial.CompareScenarioImpactParams) (*string, error) {
	result := "Mock scenario impact"
	return &result, nil
}

func (m *mockFinancialClient) ProjectNetWorthAtYear(ctx context.Context, userID string, params financial.ProjectNetWorthAtYearParams) (*string, error) {
	result := "Mock net worth projection"
	return &result, nil
}

func (m *mockFinancialClient) IdentifyNetWorthLevers(ctx context.Context, userID string, params financial.IdentifyNetWorthLeversParams) (*string, error) {
	result := "Mock net worth levers"
	return &result, nil
}

// Scenario CRUD tools (Agent 2) - mock implementations
func (m *mockFinancialClient) CreateScenarioEvent(ctx context.Context, params financial.CreateScenarioEventParams) (*string, error) {
	m.actions = append(m.actions, "createScenarioEvent")
	if m.failOnTool == "createScenarioEvent" {
		return nil, errMockFailure
	}
	id := "scenario-event-123"
	return &id, nil
}

func (m *mockFinancialClient) StopFinancialItem(ctx context.Context, params financial.StopFinancialItemParams) (*string, error) {
	m.actions = append(m.actions, "stopFinancialItem")
	if m.failOnTool == "stopFinancialItem" {
		return nil, errMockFailure
	}
	id := "scenario-event-123"
	return &id, nil
}

func (m *mockFinancialClient) StartFinancialItem(ctx context.Context, params financial.StartFinancialItemParams) (*string, error) {
	m.actions = append(m.actions, "startFinancialItem")
	if m.failOnTool == "startFinancialItem" {
		return nil, errMockFailure
	}
	id := "scenario-event-123"
	return &id, nil
}

func (m *mockFinancialClient) ModifyFinancialItem(ctx context.Context, params financial.ModifyFinancialItemParams) (*string, error) {
	m.actions = append(m.actions, "modifyFinancialItem")
	if m.failOnTool == "modifyFinancialItem" {
		return nil, errMockFailure
	}
	id := "scenario-event-123"
	return &id, nil
}

func (m *mockFinancialClient) UpdateScenarioEvent(ctx context.Context, params financial.UpdateScenarioEventParams) (*string, error) {
	m.actions = append(m.actions, "updateScenarioEvent")
	if m.failOnTool == "updateScenarioEvent" {
		return nil, errMockFailure
	}
	id := "scenario-event-123"
	return &id, nil
}

func (m *mockFinancialClient) DeleteScenarioEvent(ctx context.Context, params financial.DeleteScenarioEventParams) (*string, error) {
	m.actions = append(m.actions, "deleteScenarioEvent")
	if m.failOnTool == "deleteScenarioEvent" {
		return nil, errMockFailure
	}
	id := "scenario-event-123"
	return &id, nil
}

func (m *mockFinancialClient) ListScenarioEvents(ctx context.Context, userID string, params financial.ListScenarioEventsParams) (*string, error) {
	result := "Mock scenario events list"
	return &result, nil
}

func (m *mockFinancialClient) ToggleScenarioIncluded(ctx context.Context, params financial.ToggleScenarioIncludedParams) (*string, error) {
	m.actions = append(m.actions, "toggleScenarioIncluded")
	if m.failOnTool == "toggleScenarioIncluded" {
		return nil, errMockFailure
	}
	id := "scenario-event-123"
	return &id, nil
}

var errMockFailure = fmt.Errorf("mock failure")

type mockSessionStore struct {
	state *session.SessionState
}

func (m *mockSessionStore) GetSession(ctx context.Context, sessionID string) (*session.SessionState, error) {
	if m.state != nil && m.state.SessionID == sessionID {
		return m.state, nil
	}
	return nil, fmt.Errorf("session not found")
}

func (m *mockSessionStore) UpdateEntityReferences(ctx context.Context, sessionID string, assetID, liabilityID *string) error {
	if m.state == nil {
		return fmt.Errorf("session not found")
	}
	m.state.LastAssetID = assetID
	m.state.LastLiabilityID = liabilityID
	return nil
}

func (m *mockSessionStore) ClearPendingActions(ctx context.Context, sessionID string, callIDs []string) error {
	if m.state == nil {
		return fmt.Errorf("session not found")
	}

	toRemove := map[string]bool{}
	for _, id := range callIDs {
		toRemove[id] = true
	}

	remaining := []session.PendingToolCall{}
	for _, action := range m.state.PendingActions {
		if !toRemove[action.CallID] {
			remaining = append(remaining, action)
		}
	}
	m.state.PendingActions = remaining
	return nil
}

func TestHandleDispatchExecutesActionsWithDependencies(t *testing.T) {
	sessionState := session.NewSessionState("sess-1", "chat-1", "user-1")
	sessionState.PendingActions = []session.PendingToolCall{
		{
			CallID:     "create-call",
			ToolName:   "createAsset",
			Parameters: map[string]interface{}{"name": "Asset", "category": "cash_savings", "currentValue": 1000},
		},
		{
			CallID:       "update-call",
			ToolName:     "updateAsset",
			Parameters:   map[string]interface{}{},
			Dependencies: []string{"create-call"},
		},
	}

	body := DispatchRequest{
		SessionID: "sess-1",
		SelectedActions: []SelectedAction{
			{CallID: "create-call", Approved: true},
			{CallID: "update-call", Approved: true},
		},
	}

	reqBytes, _ := json.Marshal(body)
	req := httptest.NewRequest(http.MethodPost, "/api/v1/financial/actions/dispatch", bytes.NewReader(reqBytes))
	rec := httptest.NewRecorder()

	handler := NewDispatchHandler(&mockFinancialClient{}, &mockSessionStore{state: sessionState}, nil)
	handler.HandleDispatch(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected status OK, got %d", rec.Code)
	}

	var resp DispatchResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &resp); err != nil {
		t.Fatalf("failed to unmarshal response: %v", err)
	}

	if resp.Summary.Successful != 2 {
		t.Fatalf("expected 2 successful actions, got %d", resp.Summary.Successful)
	}

	if len(resp.Results) != 2 {
		t.Fatalf("expected 2 results, got %d", len(resp.Results))
	}

	for _, r := range resp.Results {
		if !r.Success {
			t.Fatalf("expected action %s to succeed, got error %v", r.CallID, r.Error)
		}
		if r.EntityID == nil {
			t.Fatalf("expected action %s to return entity id", r.CallID)
		}
	}
}

func TestHandleDispatchRollsBackOnFailure(t *testing.T) {
	sessionState := session.NewSessionState("sess-2", "chat-1", "user-1")
	sessionState.PendingActions = []session.PendingToolCall{
		{
			CallID:     "create-call",
			ToolName:   "createAsset",
			Parameters: map[string]interface{}{"name": "Asset", "category": "cash_savings", "currentValue": 1000},
		},
		{
			CallID:       "update-call",
			ToolName:     "updateAsset",
			Parameters:   map[string]interface{}{},
			Dependencies: []string{"create-call"},
		},
	}

	body := DispatchRequest{
		SessionID: "sess-2",
		SelectedActions: []SelectedAction{
			{CallID: "create-call", Approved: true},
			{CallID: "update-call", Approved: true},
		},
	}

	reqBytes, _ := json.Marshal(body)
	req := httptest.NewRequest(http.MethodPost, "/api/v1/financial/actions/dispatch", bytes.NewReader(reqBytes))
	rec := httptest.NewRecorder()

	handler := NewDispatchHandler(&mockFinancialClient{failOnTool: "updateAsset"}, &mockSessionStore{state: sessionState}, nil)
	handler.HandleDispatch(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected status OK, got %d", rec.Code)
	}

	var resp DispatchResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &resp); err != nil {
		t.Fatalf("failed to unmarshal response: %v", err)
	}

	if resp.Summary.Successful != 0 {
		t.Fatalf("expected successful count to be 0 after rollback, got %d", resp.Summary.Successful)
	}
	if resp.Summary.Failed < 2 {
		t.Fatalf("expected failures to include rollback, got %d", resp.Summary.Failed)
	}

	rolledBackFound := false
	for _, r := range resp.Results {
		if r.CallID == "create-call" && r.RolledBack {
			rolledBackFound = true
		}
	}
	if !rolledBackFound {
		t.Fatalf("expected create action to be marked as rolled back")
	}
}
