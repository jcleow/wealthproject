package handlers

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"financial-chat-system/backend/internal/financial"
	"financial-chat-system/backend/internal/llm"
	"financial-chat-system/backend/internal/session"

	"github.com/gorilla/mux"
	"github.com/stretchr/testify/assert"
)

// Minimal fake LLM manager that returns a static tool call
type fakeLLMManager struct {
	response *llm.ToolCallResponse
	err      error
}

func (f *fakeLLMManager) GenerateToolCalls(ctx context.Context, req llm.ChatRequest) (*llm.ToolCallResponse, error) {
	if f.response == nil && f.err == nil {
		return nil, assert.AnError
	}
	return f.response, f.err
}

// Minimal in-memory session store to satisfy ChatHandler
type fakeSessionStore struct {
	state *session.SessionState
}

func (f *fakeSessionStore) GetSession(ctx context.Context, sessionID string) (*session.SessionState, error) {
	if f.state != nil && f.state.SessionID == sessionID {
		return f.state, nil
	}
	return nil, session.ErrSessionNotFound
}

func (f *fakeSessionStore) CreateSession(ctx context.Context, userID string, sessionID string) (*session.SessionState, error) {
	f.state = session.NewSessionState(sessionID, "chat-1", userID)
	return f.state, nil
}

func (f *fakeSessionStore) UpdateSession(ctx context.Context, state *session.SessionState) error {
	f.state = state
	return nil
}

func (f *fakeSessionStore) AddMessage(ctx context.Context, sessionID string, message llm.ChatMessage) error {
	if f.state == nil {
		return session.ErrSessionNotFound
	}
	f.state.Messages = append(f.state.Messages, message)
	return nil
}

func (f *fakeSessionStore) AddPendingActions(ctx context.Context, sessionID string, toolCalls []llm.ToolCall) error {
	if f.state == nil {
		return session.ErrSessionNotFound
	}
	return setPendingFromToolCalls(f.state, toolCalls)
}

func (f *fakeSessionStore) UpdatePendingActionMetadata(ctx context.Context, sessionID string, metadata map[string]session.PendingActionMetadata) error {
	return nil
}

func (f *fakeSessionStore) GetConversationHistory(ctx context.Context, sessionID string, limit int) ([]llm.ChatMessage, error) {
	if f.state == nil {
		return nil, session.ErrSessionNotFound
	}
	return f.state.Messages, nil
}

// Lightweight preview service that echoes tool calls into ProposedActions
type fakePreviewService struct{}

func (f *fakePreviewService) GeneratePreview(toolCalls []llm.ToolCall) ([]financial.ProposedAction, error) {
	actions := make([]financial.ProposedAction, 0, len(toolCalls))
	for _, tc := range toolCalls {
		actions = append(actions, financial.ProposedAction{
			CallID:              tc.ID,
			ToolName:            tc.Function.Name,
			FriendlyDescription: "preview: " + tc.Function.Name,
			Parameters:          map[string]interface{}{},
		})
	}
	return actions, nil
}

type missingPreviewService struct {
	missing map[string][]string
}

func (f *missingPreviewService) GeneratePreview(toolCalls []llm.ToolCall) ([]financial.ProposedAction, error) {
	return nil, &financial.MissingParamsError{Missing: f.missing}
}

func TestChatHandler_HandleChat_Success(t *testing.T) {
	store := &fakeSessionStore{}
	llmResp := &llm.ToolCallResponse{
		Message: llm.ChatMessage{
			Role:    "assistant",
			Content: "ok",
		},
		ToolCalls: []llm.ToolCall{
			{
				ID:   "call_1",
				Type: "function",
				Function: llm.FunctionCall{
					Name:      "createAsset",
					Arguments: `{"name":"test","currentValue":1000,"assetType":"savings"}`,
				},
			},
		},
	}
	handler := &ChatHandler{
		llmClient:        &fakeLLMManager{response: llmResp},
		previewSvc:       &fakePreviewService{},
		sessionStore:     store,
		tools:            []llm.ToolDefinition{},
		defaultModel:     "gpt-4",
		defaultMaxTokens: 0,
	}

	body := ChatRequest{
		Message:   "hi",
		ChatID:    "chat-1",
		SessionID: "550e8400-e29b-41d4-a716-446655440000",
	}
	buf, _ := json.Marshal(body)
	req := httptest.NewRequest(http.MethodPost, "/api/v1/chat", bytes.NewReader(buf))
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()

	router := mux.NewRouter()
	router.HandleFunc("/api/v1/chat", handler.HandleChat).Methods("POST")
	router.ServeHTTP(rr, req)

	assert.Equal(t, http.StatusOK, rr.Code)
	var resp ChatResponse
	assert.NoError(t, json.Unmarshal(rr.Body.Bytes(), &resp))
	assert.True(t, resp.RequiresApproval)
	assert.Len(t, resp.ProposedActions, 1)
	assert.Equal(t, "call_1", resp.ProposedActions[0].CallID)
}

func TestChatHandler_HandleChat_Validation(t *testing.T) {
	handler := &ChatHandler{
		llmClient:        &fakeLLMManager{},
		previewSvc:       &fakePreviewService{},
		sessionStore:     &fakeSessionStore{},
		tools:            []llm.ToolDefinition{},
		defaultModel:     "gpt-4",
		defaultMaxTokens: 0,
	}

	tt := []ChatRequest{
		{Message: "", ChatID: "c1", SessionID: "550e8400-e29b-41d4-a716-446655440000"},
		{Message: "hi", ChatID: "c1", SessionID: ""},
		{Message: "hi", ChatID: "c1", SessionID: "not-a-uuid"},
	}
	for _, tc := range tt {
		buf, _ := json.Marshal(tc)
		req := httptest.NewRequest(http.MethodPost, "/api/v1/chat", bytes.NewReader(buf))
		req.Header.Set("Content-Type", "application/json")
		rr := httptest.NewRecorder()
		handler.HandleChat(rr, req)
		assert.Equal(t, http.StatusBadRequest, rr.Code)
	}
}

func TestChatHandler_GetChatHistory_NotFound(t *testing.T) {
	handler := &ChatHandler{
		llmClient:        &fakeLLMManager{},
		previewSvc:       &fakePreviewService{},
		sessionStore:     &fakeSessionStore{},
		tools:            []llm.ToolDefinition{},
		defaultModel:     "gpt-4",
		defaultMaxTokens: 0,
	}
	req := httptest.NewRequest(http.MethodGet, "/api/v1/chat/history/unknown", nil)
	rr := httptest.NewRecorder()
	router := mux.NewRouter()
	router.HandleFunc("/api/v1/chat/history/{sessionId}", handler.GetChatHistory).Methods("GET")
	router.ServeHTTP(rr, req)
	assert.Equal(t, http.StatusNotFound, rr.Code)
}

func TestChatHandler_HandleChat_MissingFieldsPrompt(t *testing.T) {
	store := &fakeSessionStore{}
	llmResp := &llm.ToolCallResponse{
		Message: llm.ChatMessage{
			Role:    "assistant",
			Content: "ok",
		},
		ToolCalls: []llm.ToolCall{
			{
				ID:   "call_1",
				Type: "function",
				Function: llm.FunctionCall{
					Name:      "createPropertyScenario",
					Arguments: `{"propertyPrice":1000000}`,
				},
			},
		},
	}

	handler := &ChatHandler{
		llmClient:        &fakeLLMManager{response: llmResp},
		previewSvc:       &missingPreviewService{missing: map[string][]string{"call_1": {"name", "propertyType"}}},
		sessionStore:     store,
		tools:            []llm.ToolDefinition{},
		defaultModel:     "gpt-4",
		defaultMaxTokens: 0,
	}

	body := ChatRequest{
		Message:   "hi",
		ChatID:    "chat-1",
		SessionID: "550e8400-e29b-41d4-a716-446655440000",
	}
	buf, _ := json.Marshal(body)
	req := httptest.NewRequest(http.MethodPost, "/api/v1/chat", bytes.NewReader(buf))
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()

	router := mux.NewRouter()
	router.HandleFunc("/api/v1/chat", handler.HandleChat).Methods("POST")
	router.ServeHTTP(rr, req)

	assert.Equal(t, http.StatusOK, rr.Code)
	var resp ChatResponse
	assert.NoError(t, json.Unmarshal(rr.Body.Bytes(), &resp))
	assert.False(t, resp.RequiresApproval)
	assert.Len(t, resp.ProposedActions, 0)
	assert.Contains(t, resp.Content, "name")
	assert.Contains(t, resp.Content, "propertyType")
}

// Helper to set pending actions on a SessionState
func setPendingFromToolCalls(s *session.SessionState, calls []llm.ToolCall) error {
	now := time.Now()
	for _, tc := range calls {
		var params map[string]interface{}
		_ = json.Unmarshal([]byte(tc.Function.Arguments), &params)
		s.PendingActions = append(s.PendingActions, session.PendingToolCall{
			CallID:       tc.ID,
			ToolName:     tc.Function.Name,
			Parameters:   params,
			CreatedAt:    now,
			Dependencies: []string{},
		})
	}
	return nil
}
