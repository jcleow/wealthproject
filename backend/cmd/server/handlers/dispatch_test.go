package handlers

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"financial-chat-system/backend/internal/financial"
	"financial-chat-system/backend/internal/llm"
	"financial-chat-system/backend/internal/session"

	"github.com/gorilla/mux"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"
)

// MockFinancialClient implements financial client for testing
type MockFinancialClient struct {
	mock.Mock
}

func (m *MockFinancialClient) CreateAsset(params map[string]interface{}) (*financial.AssetResult, error) {
	args := m.Called(params)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*financial.AssetResult), args.Error(1)
}

func (m *MockFinancialClient) UpdateAsset(assetID string, params map[string]interface{}) (*financial.AssetResult, error) {
	args := m.Called(assetID, params)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*financial.AssetResult), args.Error(1)
}

func (m *MockFinancialClient) CreateLiability(params map[string]interface{}) (*financial.LiabilityResult, error) {
	args := m.Called(params)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*financial.LiabilityResult), args.Error(1)
}

func (m *MockFinancialClient) UpdateLiability(liabilityID string, params map[string]interface{}) (*financial.LiabilityResult, error) {
	args := m.Called(liabilityID, params)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*financial.LiabilityResult), args.Error(1)
}

func (m *MockFinancialClient) CreatePropertyScenario(params map[string]interface{}) (*financial.PropertyScenarioResult, error) {
	args := m.Called(params)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*financial.PropertyScenarioResult), args.Error(1)
}

func setupDispatchHandlerTest() (*DispatchHandler, *MockFinancialClient, *MockSessionStore, *MockActionPreviewService) {
	mockFinancialClient := &MockFinancialClient{}
	mockSessionStore := &MockSessionStore{}
	mockPreviewService := &MockActionPreviewService{}

	handler := &DispatchHandler{
		financialClient: mockFinancialClient,
		sessionStore:    mockSessionStore,
		previewSvc:      mockPreviewService,
	}

	return handler, mockFinancialClient, mockSessionStore, mockPreviewService
}

func TestDispatchHandler_HandleDispatch_Success(t *testing.T) {
	handler, mockFinancialClient, mockSessionStore, mockPreviewService := setupDispatchHandlerTest()

	sessionID := "test-session-123"

	// Mock session state with pending tool calls
	sessionState := &session.SessionState{
		SessionID: sessionID,
		UserID:    "test-user",
		PendingActions: []session.PendingToolCall{
			{
				CallID:   "call_test123",
				ToolName: "createAsset",
				Parameters: map[string]interface{}{
					"name":         "Savings Account",
					"category":     "cash_savings",
					"currentValue": 10000.0,
				},
				CreatedAt: time.Now(),
			},
			{
				CallID:   "call_test456",
				ToolName: "createLiability",
				Parameters: map[string]interface{}{
					"name":           "Credit Card",
					"category":       "credit_card",
					"currentBalance": 5000.0,
					"interestRate":   0.18,
				},
				CreatedAt: time.Now(),
			},
		},
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	// Mock financial operation results
	assetResult := &financial.AssetResult{
		ID:           "asset_123",
		Name:         "Savings Account",
		Category:     "cash_savings",
		CurrentValue: 10000.0,
		CreatedAt:    time.Now(),
	}

	liabilityResult := &financial.LiabilityResult{
		ID:             "liability_456",
		Name:           "Credit Card",
		Category:       "credit_card",
		CurrentBalance: 5000.0,
		InterestRate:   0.18,
		CreatedAt:      time.Now(),
	}

	// Setup mock expectations
	mockSessionStore.On("GetSession", sessionID).Return(sessionState, nil)

	mockFinancialClient.On("CreateAsset", map[string]interface{}{
		"name":         "Savings Account",
		"category":     "cash_savings",
		"currentValue": 10000.0,
	}).Return(assetResult, nil)

	mockFinancialClient.On("CreateLiability", map[string]interface{}{
		"name":           "Credit Card",
		"category":       "credit_card",
		"currentBalance": 5000.0,
		"interestRate":   0.18,
	}).Return(liabilityResult, nil)

	// Mock session state update with new entity IDs
	mockSessionStore.On("SaveSession", mock.MatchedBy(func(state *session.SessionState) bool {
		return state.SessionID == sessionID &&
			*state.LastAssetID == "asset_123" &&
			*state.LastLiabilityID == "liability_456" &&
			len(state.PendingActions) == 0 // Should be cleared after execution
	})).Return(nil)

	// Create test request
	requestBody := DispatchRequest{
		SelectedActions: []SelectedAction{
			{
				CallID:   "call_test123",
				Approved: true,
			},
			{
				CallID:   "call_test456",
				Approved: true,
			},
		},
		SessionID: sessionID,
	}
	reqBodyBytes, _ := json.Marshal(requestBody)

	// Create HTTP request
	req, err := http.NewRequest("POST", "/api/v1/financial/actions/dispatch", bytes.NewBuffer(reqBodyBytes))
	require.NoError(t, err)
	req.Header.Set("Content-Type", "application/json")

	// Create response recorder
	rr := httptest.NewRecorder()

	// Create router and add the handler
	router := mux.NewRouter()
	router.HandleFunc("/api/v1/financial/actions/dispatch", handler.HandleDispatch).Methods("POST")

	// Serve the request
	router.ServeHTTP(rr, req)

	// Verify response
	assert.Equal(t, http.StatusOK, rr.Code)

	var response DispatchResponse
	err = json.Unmarshal(rr.Body.Bytes(), &response)
	require.NoError(t, err)

	// Verify response structure
	assert.Len(t, response.Results, 2)

	// Verify first result (asset creation)
	assetExecResult := response.Results[0]
	assert.Equal(t, "call_test123", assetExecResult.CallID)
	assert.True(t, assetExecResult.Success)
	assert.Equal(t, "asset_123", *assetExecResult.EntityID)
	assert.Nil(t, assetExecResult.Error)
	assert.Greater(t, assetExecResult.ExecutionTime, int64(0))

	// Verify second result (liability creation)
	liabilityExecResult := response.Results[1]
	assert.Equal(t, "call_test456", liabilityExecResult.CallID)
	assert.True(t, liabilityExecResult.Success)
	assert.Equal(t, "liability_456", *liabilityExecResult.EntityID)
	assert.Nil(t, liabilityExecResult.Error)

	// Verify summary
	assert.Equal(t, 2, response.Summary.TotalActions)
	assert.Equal(t, 2, response.Summary.SuccessfulActions)
	assert.Equal(t, 0, response.Summary.FailedActions)

	// Verify updated session state
	assert.Equal(t, sessionID, response.UpdatedSessionState.SessionID)
	assert.Equal(t, "asset_123", *response.UpdatedSessionState.LastAssetID)
	assert.Equal(t, "liability_456", *response.UpdatedSessionState.LastLiabilityID)

	// Verify all mocks were called
	mockSessionStore.AssertExpectations(t)
	mockFinancialClient.AssertExpectations(t)
}

func TestDispatchHandler_HandleDispatch_PartialSuccess(t *testing.T) {
	handler, mockFinancialClient, mockSessionStore, _ := setupDispatchHandlerTest()

	sessionID := "test-session-123"

	// Mock session state with pending tool calls
	sessionState := &session.SessionState{
		SessionID: sessionID,
		UserID:    "test-user",
		PendingActions: []session.PendingToolCall{
			{
				CallID:   "call_test123",
				ToolName: "createAsset",
				Parameters: map[string]interface{}{
					"name":         "Savings Account",
					"category":     "cash_savings",
					"currentValue": 10000.0,
				},
				CreatedAt: time.Now(),
			},
			{
				CallID:   "call_test456",
				ToolName: "createLiability",
				Parameters: map[string]interface{}{
					"name":           "Invalid Liability",
					"category":       "credit_card",
					"currentBalance": -1000.0, // Invalid negative balance
					"interestRate":   0.18,
				},
				CreatedAt: time.Now(),
			},
		},
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	// Mock successful asset creation
	assetResult := &financial.AssetResult{
		ID:           "asset_123",
		Name:         "Savings Account",
		Category:     "cash_savings",
		CurrentValue: 10000.0,
		CreatedAt:    time.Now(),
	}

	// Setup mock expectations
	mockSessionStore.On("GetSession", sessionID).Return(sessionState, nil)

	mockFinancialClient.On("CreateAsset", mock.Anything).Return(assetResult, nil)

	// Mock liability creation failure
	mockFinancialClient.On("CreateLiability", mock.Anything).Return(nil,
		financial.ValidationError{Message: "Current balance cannot be negative"})

	// Mock session state update (only successful entities)
	mockSessionStore.On("SaveSession", mock.MatchedBy(func(state *session.SessionState) bool {
		return state.SessionID == sessionID &&
			*state.LastAssetID == "asset_123" &&
			state.LastLiabilityID == nil // Should not be set due to failure
	})).Return(nil)

	// Create test request (both actions approved)
	requestBody := DispatchRequest{
		SelectedActions: []SelectedAction{
			{
				CallID:   "call_test123",
				Approved: true,
			},
			{
				CallID:   "call_test456",
				Approved: true,
			},
		},
		SessionID: sessionID,
	}
	reqBodyBytes, _ := json.Marshal(requestBody)

	req, err := http.NewRequest("POST", "/api/v1/financial/actions/dispatch", bytes.NewBuffer(reqBodyBytes))
	require.NoError(t, err)
	req.Header.Set("Content-Type", "application/json")

	rr := httptest.NewRecorder()
	router := mux.NewRouter()
	router.HandleFunc("/api/v1/financial/actions/dispatch", handler.HandleDispatch).Methods("POST")
	router.ServeHTTP(rr, req)

	// Verify response
	assert.Equal(t, http.StatusOK, rr.Code) // Partial success still returns 200

	var response DispatchResponse
	err = json.Unmarshal(rr.Body.Bytes(), &response)
	require.NoError(t, err)

	// Verify results
	assert.Len(t, response.Results, 2)

	// Check successful result
	successResult := response.Results[0]
	assert.Equal(t, "call_test123", successResult.CallID)
	assert.True(t, successResult.Success)
	assert.Equal(t, "asset_123", *successResult.EntityID)

	// Check failed result
	failedResult := response.Results[1]
	assert.Equal(t, "call_test456", failedResult.CallID)
	assert.False(t, failedResult.Success)
	assert.Nil(t, failedResult.EntityID)
	assert.NotNil(t, failedResult.Error)
	assert.Contains(t, *failedResult.Error, "Current balance cannot be negative")

	// Verify summary
	assert.Equal(t, 2, response.Summary.TotalActions)
	assert.Equal(t, 1, response.Summary.SuccessfulActions)
	assert.Equal(t, 1, response.Summary.FailedActions)

	mockSessionStore.AssertExpectations(t)
	mockFinancialClient.AssertExpectations(t)
}

func TestDispatchHandler_HandleDispatch_ValidationErrors(t *testing.T) {
	handler, _, _, _ := setupDispatchHandlerTest()

	tests := []struct {
		name           string
		requestBody    interface{}
		expectedStatus int
		expectedError  string
	}{
		{
			name:           "missing selected_actions",
			requestBody:    map[string]interface{}{"session_id": "test"},
			expectedStatus: http.StatusBadRequest,
			expectedError:  "selected_actions is required",
		},
		{
			name:           "missing session_id",
			requestBody:    map[string]interface{}{"selected_actions": []interface{}{}},
			expectedStatus: http.StatusBadRequest,
			expectedError:  "session_id is required",
		},
		{
			name: "empty selected_actions",
			requestBody: map[string]interface{}{
				"selected_actions": []interface{}{},
				"session_id":       "test",
			},
			expectedStatus: http.StatusBadRequest,
			expectedError:  "at least one action must be selected",
		},
		{
			name: "invalid action format",
			requestBody: map[string]interface{}{
				"selected_actions": []interface{}{
					map[string]interface{}{
						"approved": true,
						// missing call_id
					},
				},
				"session_id": "test",
			},
			expectedStatus: http.StatusBadRequest,
			expectedError:  "call_id is required",
		},
		{
			name:           "invalid json",
			requestBody:    "invalid json",
			expectedStatus: http.StatusBadRequest,
			expectedError:  "invalid request format",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			var reqBodyBytes []byte
			var err error

			if str, ok := tt.requestBody.(string); ok {
				reqBodyBytes = []byte(str)
			} else {
				reqBodyBytes, err = json.Marshal(tt.requestBody)
				require.NoError(t, err)
			}

			req, err := http.NewRequest("POST", "/api/v1/financial/actions/dispatch", bytes.NewBuffer(reqBodyBytes))
			require.NoError(t, err)
			req.Header.Set("Content-Type", "application/json")

			rr := httptest.NewRecorder()
			router := mux.NewRouter()
			router.HandleFunc("/api/v1/financial/actions/dispatch", handler.HandleDispatch).Methods("POST")
			router.ServeHTTP(rr, req)

			assert.Equal(t, tt.expectedStatus, rr.Code)

			var errorResponse map[string]interface{}
			err = json.Unmarshal(rr.Body.Bytes(), &errorResponse)
			require.NoError(t, err)

			assert.Contains(t, strings.ToLower(errorResponse["message"].(string)), strings.ToLower(tt.expectedError))
		})
	}
}

func TestDispatchHandler_HandleDispatch_SessionNotFound(t *testing.T) {
	handler, _, mockSessionStore, _ := setupDispatchHandlerTest()

	sessionID := "nonexistent-session"

	// Mock session not found
	mockSessionStore.On("GetSession", sessionID).Return(nil, session.ErrSessionNotFound)

	requestBody := DispatchRequest{
		SelectedActions: []SelectedAction{
			{
				CallID:   "call_test123",
				Approved: true,
			},
		},
		SessionID: sessionID,
	}
	reqBodyBytes, _ := json.Marshal(requestBody)

	req, err := http.NewRequest("POST", "/api/v1/financial/actions/dispatch", bytes.NewBuffer(reqBodyBytes))
	require.NoError(t, err)
	req.Header.Set("Content-Type", "application/json")

	rr := httptest.NewRecorder()
	router := mux.NewRouter()
	router.HandleFunc("/api/v1/financial/actions/dispatch", handler.HandleDispatch).Methods("POST")
	router.ServeHTTP(rr, req)

	assert.Equal(t, http.StatusNotFound, rr.Code)

	var errorResponse map[string]interface{}
	err = json.Unmarshal(rr.Body.Bytes(), &errorResponse)
	require.NoError(t, err)

	assert.Contains(t, strings.ToLower(errorResponse["message"].(string)), "session not found")
	mockSessionStore.AssertExpectations(t)
}

func TestDispatchHandler_HandleDispatch_ApprovedOnlyActions(t *testing.T) {
	handler, mockFinancialClient, mockSessionStore, _ := setupDispatchHandlerTest()

	sessionID := "test-session-123"

	// Mock session state with multiple pending actions
	sessionState := &session.SessionState{
		SessionID: sessionID,
		UserID:    "test-user",
		PendingActions: []session.PendingToolCall{
			{
				CallID:   "call_approved",
				ToolName: "createAsset",
				Parameters: map[string]interface{}{
					"name":         "Approved Asset",
					"category":     "cash_savings",
					"currentValue": 10000.0,
				},
				CreatedAt: time.Now(),
			},
			{
				CallID:   "call_rejected",
				ToolName: "createLiability",
				Parameters: map[string]interface{}{
					"name":           "Rejected Liability",
					"category":       "credit_card",
					"currentBalance": 5000.0,
					"interestRate":   0.18,
				},
				CreatedAt: time.Now(),
			},
		},
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	// Mock only approved action execution
	assetResult := &financial.AssetResult{
		ID:           "asset_123",
		Name:         "Approved Asset",
		Category:     "cash_savings",
		CurrentValue: 10000.0,
		CreatedAt:    time.Now(),
	}

	// Setup mock expectations - only for approved action
	mockSessionStore.On("GetSession", sessionID).Return(sessionState, nil)
	mockFinancialClient.On("CreateAsset", mock.MatchedBy(func(params map[string]interface{}) bool {
		return params["name"] == "Approved Asset"
	})).Return(assetResult, nil)

	// Note: CreateLiability should NOT be called for rejected action

	mockSessionStore.On("SaveSession", mock.MatchedBy(func(state *session.SessionState) bool {
		return state.SessionID == sessionID && *state.LastAssetID == "asset_123"
	})).Return(nil)

	// Create test request - approve only first action
	requestBody := DispatchRequest{
		SelectedActions: []SelectedAction{
			{
				CallID:   "call_approved",
				Approved: true,
			},
			{
				CallID:   "call_rejected",
				Approved: false, // Explicitly not approved
			},
		},
		SessionID: sessionID,
	}
	reqBodyBytes, _ := json.Marshal(requestBody)

	req, err := http.NewRequest("POST", "/api/v1/financial/actions/dispatch", bytes.NewBuffer(reqBodyBytes))
	require.NoError(t, err)
	req.Header.Set("Content-Type", "application/json")

	rr := httptest.NewRecorder()
	router := mux.NewRouter()
	router.HandleFunc("/api/v1/financial/actions/dispatch", handler.HandleDispatch).Methods("POST")
	router.ServeHTTP(rr, req)

	// Verify response
	assert.Equal(t, http.StatusOK, rr.Code)

	var response DispatchResponse
	err = json.Unmarshal(rr.Body.Bytes(), &response)
	require.NoError(t, err)

	// Should only have one result for the approved action
	assert.Len(t, response.Results, 1)

	approvedResult := response.Results[0]
	assert.Equal(t, "call_approved", approvedResult.CallID)
	assert.True(t, approvedResult.Success)
	assert.Equal(t, "asset_123", *approvedResult.EntityID)

	// Verify summary
	assert.Equal(t, 1, response.Summary.TotalActions)
	assert.Equal(t, 1, response.Summary.SuccessfulActions)
	assert.Equal(t, 0, response.Summary.FailedActions)

	mockSessionStore.AssertExpectations(t)
	mockFinancialClient.AssertExpectations(t)
}

func TestDispatchHandler_HandleDispatch_ModifiedParameters(t *testing.T) {
	handler, mockFinancialClient, mockSessionStore, _ := setupDispatchHandlerTest()

	sessionID := "test-session-123"

	// Mock session state
	sessionState := &session.SessionState{
		SessionID: sessionID,
		UserID:    "test-user",
		PendingActions: []session.PendingToolCall{
			{
				CallID:   "call_test123",
				ToolName: "createAsset",
				Parameters: map[string]interface{}{
					"name":         "Original Asset",
					"category":     "cash_savings",
					"currentValue": 5000.0,
				},
				CreatedAt: time.Now(),
			},
		},
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	// Mock result with modified parameters
	assetResult := &financial.AssetResult{
		ID:           "asset_modified",
		Name:         "Modified Asset Name",
		Category:     "cash_savings",
		CurrentValue: 7500.0, // Modified value
		CreatedAt:    time.Now(),
	}

	// Setup expectations with modified parameters
	mockSessionStore.On("GetSession", sessionID).Return(sessionState, nil)
	mockFinancialClient.On("CreateAsset", map[string]interface{}{
		"name":         "Modified Asset Name", // User modified this
		"category":     "cash_savings",
		"currentValue": 7500.0, // User modified this
	}).Return(assetResult, nil)
	mockSessionStore.On("SaveSession", mock.Anything).Return(nil)

	// Create request with modified parameters
	requestBody := DispatchRequest{
		SelectedActions: []SelectedAction{
			{
				CallID:   "call_test123",
				Approved: true,
				ModifiedArgs: map[string]interface{}{
					"name":         "Modified Asset Name",
					"currentValue": 7500.0,
					// category remains unchanged
				},
			},
		},
		SessionID: sessionID,
	}
	reqBodyBytes, _ := json.Marshal(requestBody)

	req, err := http.NewRequest("POST", "/api/v1/financial/actions/dispatch", bytes.NewBuffer(reqBodyBytes))
	require.NoError(t, err)
	req.Header.Set("Content-Type", "application/json")

	rr := httptest.NewRecorder()
	router := mux.NewRouter()
	router.HandleFunc("/api/v1/financial/actions/dispatch", handler.HandleDispatch).Methods("POST")
	router.ServeHTTP(rr, req)

	assert.Equal(t, http.StatusOK, rr.Code)

	var response DispatchResponse
	err = json.Unmarshal(rr.Body.Bytes(), &response)
	require.NoError(t, err)

	assert.Len(t, response.Results, 1)
	result := response.Results[0]
	assert.True(t, result.Success)
	assert.Equal(t, "asset_modified", *result.EntityID)

	mockSessionStore.AssertExpectations(t)
	mockFinancialClient.AssertExpectations(t)
}