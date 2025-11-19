package handlers

import (
	"bytes"
	"context"
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

// MockLLMClient implements the LLMClient interface for testing
type MockLLMClient struct {
	mock.Mock
}

func (m *MockLLMClient) GenerateToolCalls(ctx context.Context, req llm.ChatRequest) (*llm.ToolCallResponse, error) {
	args := m.Called(ctx, req)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*llm.ToolCallResponse), args.Error(1)
}

func (m *MockLLMClient) SupportedModels() []string {
	args := m.Called()
	return args.Get(0).([]string)
}

func (m *MockLLMClient) ProviderName() string {
	args := m.Called()
	return args.String(0)
}

// MockSessionStore implements session storage for testing
type MockSessionStore struct {
	mock.Mock
}

func (m *MockSessionStore) GetSession(sessionID string) (*session.SessionState, error) {
	args := m.Called(sessionID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*session.SessionState), args.Error(1)
}

func (m *MockSessionStore) SaveSession(state *session.SessionState) error {
	args := m.Called(state)
	return args.Error(0)
}

func (m *MockSessionStore) CreateSession(userID string) (*session.SessionState, error) {
	args := m.Called(userID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*session.SessionState), args.Error(1)
}

func (m *MockSessionStore) DeleteSession(sessionID string) error {
	args := m.Called(sessionID)
	return args.Error(0)
}

func (m *MockSessionStore) AddMessage(sessionID string, message session.ConversationStep) error {
	args := m.Called(sessionID, message)
	return args.Error(0)
}

func (m *MockSessionStore) GetMessages(sessionID string, limit int) ([]session.ConversationStep, error) {
	args := m.Called(sessionID, limit)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]session.ConversationStep), args.Error(1)
}

// MockActionPreviewService implements preview service for testing
type MockActionPreviewService struct {
	mock.Mock
}

func (m *MockActionPreviewService) GeneratePreview(toolCalls []llm.ToolCall) ([]financial.ProposedAction, error) {
	args := m.Called(toolCalls)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]financial.ProposedAction), args.Error(1)
}

func (m *MockActionPreviewService) ValidateActionParameters(toolCall llm.ToolCall) error {
	args := m.Called(toolCall)
	return args.Error(0)
}

func (m *MockActionPreviewService) EstimateImpact(toolCall llm.ToolCall) (*financial.ImpactEstimate, error) {
	args := m.Called(toolCall)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*financial.ImpactEstimate), args.Error(1)
}

// MockClientManager implements LLM client management for testing
type MockClientManager struct {
	mock.Mock
}

func (m *MockClientManager) GenerateToolCalls(ctx context.Context, req llm.ChatRequest) (*llm.ToolCallResponse, error) {
	args := m.Called(ctx, req)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*llm.ToolCallResponse), args.Error(1)
}

func (m *MockClientManager) GetAvailableProviders() []string {
	args := m.Called()
	return args.Get(0).([]string)
}

func (m *MockClientManager) SetPrimary(providerName string) error {
	args := m.Called(providerName)
	return args.Error(0)
}

func (m *MockClientManager) RegisterProvider(name string, client llm.LLMClient) error {
	args := m.Called(name, client)
	return args.Error(0)
}

func setupChatHandlerTest() (*ChatHandler, *MockClientManager, *MockActionPreviewService, *MockSessionStore) {
	mockLLMManager := &MockClientManager{}
	mockPreviewService := &MockActionPreviewService{}
	mockSessionStore := &MockSessionStore{}

	handler := &ChatHandler{
		llmClient:    mockLLMManager,
		previewSvc:   mockPreviewService,
		sessionStore: mockSessionStore,
		tools:        []llm.ToolDefinition{}, // Empty for testing
	}

	return handler, mockLLMManager, mockPreviewService, mockSessionStore
}

func TestChatHandler_HandleChat_Success(t *testing.T) {
	handler, mockLLMManager, mockPreviewService, mockSessionStore := setupChatHandlerTest()

	// Setup test data
	sessionID := "test-session-123"
	chatID := "test-chat-456"

	// Mock session state
	sessionState := &session.SessionState{
		SessionID: sessionID,
		UserID:    "test-user",
		ConversationFlow: []session.ConversationStep{
			{
				Role:      "user",
				Content:   "Previous message",
				Timestamp: time.Now().Add(-5 * time.Minute),
			},
		},
		CreatedAt: time.Now().Add(-10 * time.Minute),
		UpdatedAt: time.Now(),
	}

	// Mock LLM response with tool calls
	llmResponse := &llm.ToolCallResponse{
		Message: llm.ChatMessage{
			Role:    "assistant",
			Content: "I'll help you create a financial asset.",
			ToolCalls: []llm.ToolCall{
				{
					ID:   "call_test123",
					Type: "function",
					Function: llm.FunctionCall{
						Name:      "createAsset",
						Arguments: `{"name": "Savings Account", "category": "cash_savings", "currentValue": 10000}`,
					},
				},
			},
		},
		ToolCalls:    []llm.ToolCall{},
		FinishReason: llm.FinishReasonToolCalls,
		Usage: &llm.TokenUsage{
			PromptTokens:     50,
			CompletionTokens: 30,
			TotalTokens:      80,
		},
		RequestID:      "llm-request-123",
		Provider:       "openai",
		Model:          "gpt-4",
		ProcessingTime: 1500 * time.Millisecond,
	}

	// Mock action preview
	proposedActions := []financial.ProposedAction{
		{
			CallID:              "call_test123",
			ToolName:            "createAsset",
			FriendlyDescription: "Create a new savings account asset worth $10,000",
			Parameters: map[string]interface{}{
				"name":         "Savings Account",
				"category":     "cash_savings",
				"currentValue": 10000.0,
			},
			EstimatedImpact: &financial.ImpactEstimate{
				NetWorthChange: 10000.0,
				Description:    "Increase net worth by $10,000",
			},
			Warnings: []financial.Warning{},
		},
	}

	// Setup mock expectations
	mockSessionStore.On("GetSession", sessionID).Return(sessionState, nil)
	mockLLMManager.On("GenerateToolCalls", mock.Anything, mock.MatchedBy(func(req llm.ChatRequest) bool {
		return len(req.Messages) > 0 && req.Messages[len(req.Messages)-1].Content == "I have $10,000 in my savings account"
	})).Return(llmResponse, nil)
	mockPreviewService.On("GeneratePreview", mock.MatchedBy(func(toolCalls []llm.ToolCall) bool {
		return len(toolCalls) == 1 && toolCalls[0].Function.Name == "createAsset"
	})).Return(proposedActions, nil)
	mockSessionStore.On("AddMessage", sessionID, mock.MatchedBy(func(step session.ConversationStep) bool {
		return step.Role == "user" && step.Content == "I have $10,000 in my savings account"
	})).Return(nil)
	mockSessionStore.On("AddMessage", sessionID, mock.MatchedBy(func(step session.ConversationStep) bool {
		return step.Role == "assistant" && step.Content == "I'll help you create a financial asset."
	})).Return(nil)
	mockSessionStore.On("SaveSession", mock.MatchedBy(func(state *session.SessionState) bool {
		return state.SessionID == sessionID
	})).Return(nil)

	// Create test request
	requestBody := ChatRequest{
		Message:   "I have $10,000 in my savings account",
		ChatID:    chatID,
		SessionID: sessionID,
	}
	reqBodyBytes, _ := json.Marshal(requestBody)

	// Create HTTP request
	req, err := http.NewRequest("POST", "/api/v1/chat", bytes.NewBuffer(reqBodyBytes))
	require.NoError(t, err)
	req.Header.Set("Content-Type", "application/json")

	// Create response recorder
	rr := httptest.NewRecorder()

	// Create router and add the handler
	router := mux.NewRouter()
	router.HandleFunc("/api/v1/chat", handler.HandleChat).Methods("POST")

	// Serve the request
	router.ServeHTTP(rr, req)

	// Verify response
	assert.Equal(t, http.StatusOK, rr.Code)

	var response ChatResponse
	err = json.Unmarshal(rr.Body.Bytes(), &response)
	require.NoError(t, err)

	// Verify response structure
	assert.NotEmpty(t, response.MessageID)
	assert.Equal(t, "I'll help you create a financial asset.", response.Content)
	assert.True(t, response.RequiresApproval)
	assert.Len(t, response.ProposedActions, 1)

	// Verify proposed action
	action := response.ProposedActions[0]
	assert.Equal(t, "call_test123", action.CallID)
	assert.Equal(t, "createAsset", action.ToolName)
	assert.Equal(t, "Create a new savings account asset worth $10,000", action.FriendlyDescription)
	assert.Equal(t, 10000.0, action.EstimatedImpact.NetWorthChange)

	// Verify all mocks were called
	mockSessionStore.AssertExpectations(t)
	mockLLMManager.AssertExpectations(t)
	mockPreviewService.AssertExpectations(t)
}

func TestChatHandler_HandleChat_ValidationError(t *testing.T) {
	handler, _, _, _ := setupChatHandlerTest()

	tests := []struct {
		name           string
		requestBody    interface{}
		expectedStatus int
		expectedError  string
	}{
		{
			name:           "missing message",
			requestBody:    map[string]interface{}{"chat_id": "test", "session_id": "test"},
			expectedStatus: http.StatusBadRequest,
			expectedError:  "message is required",
		},
		{
			name:           "missing chat_id",
			requestBody:    map[string]interface{}{"message": "test", "session_id": "test"},
			expectedStatus: http.StatusBadRequest,
			expectedError:  "chat_id is required",
		},
		{
			name:           "missing session_id",
			requestBody:    map[string]interface{}{"message": "test", "chat_id": "test"},
			expectedStatus: http.StatusBadRequest,
			expectedError:  "session_id is required",
		},
		{
			name:           "empty message",
			requestBody:    map[string]interface{}{"message": "", "chat_id": "test", "session_id": "test"},
			expectedStatus: http.StatusBadRequest,
			expectedError:  "message cannot be empty",
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

			req, err := http.NewRequest("POST", "/api/v1/chat", bytes.NewBuffer(reqBodyBytes))
			require.NoError(t, err)
			req.Header.Set("Content-Type", "application/json")

			rr := httptest.NewRecorder()
			router := mux.NewRouter()
			router.HandleFunc("/api/v1/chat", handler.HandleChat).Methods("POST")
			router.ServeHTTP(rr, req)

			assert.Equal(t, tt.expectedStatus, rr.Code)

			var errorResponse map[string]interface{}
			err = json.Unmarshal(rr.Body.Bytes(), &errorResponse)
			require.NoError(t, err)

			assert.Contains(t, strings.ToLower(errorResponse["message"].(string)), strings.ToLower(tt.expectedError))
		})
	}
}

func TestChatHandler_HandleChat_SessionNotFound(t *testing.T) {
	handler, _, _, mockSessionStore := setupChatHandlerTest()

	sessionID := "nonexistent-session"

	// Mock session not found
	mockSessionStore.On("GetSession", sessionID).Return(nil, session.ErrSessionNotFound)

	requestBody := ChatRequest{
		Message:   "Test message",
		ChatID:    "test-chat",
		SessionID: sessionID,
	}
	reqBodyBytes, _ := json.Marshal(requestBody)

	req, err := http.NewRequest("POST", "/api/v1/chat", bytes.NewBuffer(reqBodyBytes))
	require.NoError(t, err)
	req.Header.Set("Content-Type", "application/json")

	rr := httptest.NewRecorder()
	router := mux.NewRouter()
	router.HandleFunc("/api/v1/chat", handler.HandleChat).Methods("POST")
	router.ServeHTTP(rr, req)

	assert.Equal(t, http.StatusNotFound, rr.Code)

	var errorResponse map[string]interface{}
	err = json.Unmarshal(rr.Body.Bytes(), &errorResponse)
	require.NoError(t, err)

	assert.Contains(t, strings.ToLower(errorResponse["message"].(string)), "session not found")
	mockSessionStore.AssertExpectations(t)
}

func TestChatHandler_HandleChat_LLMError(t *testing.T) {
	handler, mockLLMManager, _, mockSessionStore := setupChatHandlerTest()

	sessionID := "test-session"
	sessionState := &session.SessionState{
		SessionID: sessionID,
		UserID:    "test-user",
		ConversationFlow: []session.ConversationStep{},
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	// Mock session retrieval
	mockSessionStore.On("GetSession", sessionID).Return(sessionState, nil)
	mockSessionStore.On("AddMessage", sessionID, mock.Anything).Return(nil)

	// Mock LLM error
	llmError := llm.LLMError{
		Type:     llm.ErrorTypeRateLimit,
		Message:  "Rate limit exceeded",
		Provider: "openai",
	}
	mockLLMManager.On("GenerateToolCalls", mock.Anything, mock.Anything).Return(nil, llmError)

	requestBody := ChatRequest{
		Message:   "Test message",
		ChatID:    "test-chat",
		SessionID: sessionID,
	}
	reqBodyBytes, _ := json.Marshal(requestBody)

	req, err := http.NewRequest("POST", "/api/v1/chat", bytes.NewBuffer(reqBodyBytes))
	require.NoError(t, err)
	req.Header.Set("Content-Type", "application/json")

	rr := httptest.NewRecorder()
	router := mux.NewRouter()
	router.HandleFunc("/api/v1/chat", handler.HandleChat).Methods("POST")
	router.ServeHTTP(rr, req)

	assert.Equal(t, http.StatusTooManyRequests, rr.Code) // Rate limit maps to 429

	var errorResponse map[string]interface{}
	err = json.Unmarshal(rr.Body.Bytes(), &errorResponse)
	require.NoError(t, err)

	assert.Contains(t, errorResponse["message"].(string), "Rate limit exceeded")
	mockSessionStore.AssertExpectations(t)
	mockLLMManager.AssertExpectations(t)
}

func TestChatHandler_GetChatHistory(t *testing.T) {
	handler, _, _, mockSessionStore := setupChatHandlerTest()

	sessionID := "test-session"
	expectedMessages := []session.ConversationStep{
		{
			Role:      "user",
			Content:   "Hello",
			Timestamp: time.Now().Add(-5 * time.Minute),
		},
		{
			Role:      "assistant",
			Content:   "Hi there! How can I help you?",
			Timestamp: time.Now().Add(-4 * time.Minute),
		},
		{
			Role:      "user",
			Content:   "I want to create an asset",
			Timestamp: time.Now().Add(-3 * time.Minute),
		},
	}

	// Mock expectations
	mockSessionStore.On("GetMessages", sessionID, 50).Return(expectedMessages, nil)

	// Create HTTP request
	req, err := http.NewRequest("GET", "/api/v1/chat/history/"+sessionID, nil)
	require.NoError(t, err)

	// Create response recorder
	rr := httptest.NewRecorder()

	// Create router and add the handler
	router := mux.NewRouter()
	router.HandleFunc("/api/v1/chat/history/{sessionId}", handler.GetChatHistory).Methods("GET")

	// Serve the request
	router.ServeHTTP(rr, req)

	// Verify response
	assert.Equal(t, http.StatusOK, rr.Code)

	var response GetChatHistoryResponse
	err = json.Unmarshal(rr.Body.Bytes(), &response)
	require.NoError(t, err)

	assert.Equal(t, sessionID, response.SessionID)
	assert.Len(t, response.Messages, 3)
	assert.Equal(t, "user", response.Messages[0].Role)
	assert.Equal(t, "Hello", response.Messages[0].Content)

	mockSessionStore.AssertExpectations(t)
}

func TestChatHandler_GetChatHistory_SessionNotFound(t *testing.T) {
	handler, _, _, mockSessionStore := setupChatHandlerTest()

	sessionID := "nonexistent-session"

	// Mock session not found
	mockSessionStore.On("GetMessages", sessionID, 50).Return(nil, session.ErrSessionNotFound)

	req, err := http.NewRequest("GET", "/api/v1/chat/history/"+sessionID, nil)
	require.NoError(t, err)

	rr := httptest.NewRecorder()
	router := mux.NewRouter()
	router.HandleFunc("/api/v1/chat/history/{sessionId}", handler.GetChatHistory).Methods("GET")
	router.ServeHTTP(rr, req)

	assert.Equal(t, http.StatusNotFound, rr.Code)

	var errorResponse map[string]interface{}
	err = json.Unmarshal(rr.Body.Bytes(), &errorResponse)
	require.NoError(t, err)

	assert.Contains(t, strings.ToLower(errorResponse["message"].(string)), "session not found")
	mockSessionStore.AssertExpectations(t)
}