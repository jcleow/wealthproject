package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"time"

	"financial-chat-system/backend/internal/financial"
	"financial-chat-system/backend/internal/llm"
	"financial-chat-system/backend/internal/session"

	"github.com/google/uuid"
	"github.com/gorilla/mux"
)

// ChatHandler handles chat API requests
type ChatHandler struct {
	llmClient        llmToolCaller
	previewSvc       previewGenerator
	sessionStore     chatSessionStore
	tools            []llm.ToolDefinition
	defaultModel     string
	defaultMaxTokens int
}

// Interfaces declared for testability
type chatSessionStore interface {
	GetSession(ctx context.Context, sessionID string) (*session.SessionState, error)
	CreateSession(ctx context.Context, userID string, sessionID string) (*session.SessionState, error)
	UpdateSession(ctx context.Context, session *session.SessionState) error
	AddMessage(ctx context.Context, sessionID string, message llm.ChatMessage) error
	AddPendingActions(ctx context.Context, sessionID string, toolCalls []llm.ToolCall) error
	UpdatePendingActionMetadata(ctx context.Context, sessionID string, metadata map[string]session.PendingActionMetadata) error
	GetConversationHistory(ctx context.Context, sessionID string, limit int) ([]llm.ChatMessage, error)
}

type previewGenerator interface {
	GeneratePreview(toolCalls []llm.ToolCall) ([]financial.ProposedAction, error)
}

type llmToolCaller interface {
	GenerateToolCalls(ctx context.Context, req llm.ChatRequest) (*llm.ToolCallResponse, error)
}

// NewChatHandler creates a new chat handler
func NewChatHandler(llmClient *llm.ClientManager, previewSvc *financial.ActionPreviewService, sessionStore *session.Store, defaultModel string, defaultMaxTokens int) *ChatHandler {
	// Initialize the registry if not already done
	if financial.GlobalRegistry == nil {
		financial.InitializeRegistry()
	}

	return &ChatHandler{
		llmClient:        llmClient,
		previewSvc:       previewSvc,
		sessionStore:     sessionStore,
		tools:            financial.GlobalRegistry.GetTools(),
		defaultModel:     defaultModel,
		defaultMaxTokens: defaultMaxTokens,
	}
}

// ChatRequest represents the incoming chat request
type ChatRequest struct {
	Message   string `json:"message" validate:"required"`
	ChatID    string `json:"chat_id" validate:"required"`
	SessionID string `json:"session_id" validate:"required"`
}

// ChatResponse represents the chat response
type ChatResponse struct {
	MessageID        string                     `json:"message_id"`
	Content          string                     `json:"content"`
	ProposedActions  []financial.ProposedAction `json:"proposed_actions"`
	RequiresApproval bool                       `json:"requires_approval"`
	ConversationFlow []session.ConversationStep `json:"conversation_flow,omitempty"`
	APIVersion       string                     `json:"api_version"`
}

// HandleChat processes chat requests and generates responses with tool calls
func (h *ChatHandler) HandleChat(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	// Parse request
	var req ChatRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		log.Printf("ERROR: Failed to parse request body: %v", err)
		writeError(w, http.StatusBadRequest, "invalid_request", "Failed to parse request body")
		return
	}

	// Log incoming request
	log.Printf("INFO: Chat request - SessionID: %s, Message length: %d", req.SessionID, len(req.Message))

	// Validate request
	if req.Message == "" || req.SessionID == "" {
		log.Printf("ERROR: Missing required fields - Message: %t, SessionID: %t", req.Message == "", req.SessionID == "")
		writeError(w, http.StatusBadRequest, "missing_required_fields", "Message and session_id are required")
		return
	}

	// Ensure session ID is a valid UUID to match DB schema
	if _, err := uuid.Parse(req.SessionID); err != nil {
		log.Printf("ERROR: Invalid session ID format: %s", req.SessionID)
		writeError(w, http.StatusBadRequest, "invalid_session_id", "session_id must be a valid UUID")
		return
	}

	// Load or create session
	log.Printf("DEBUG: Attempting to get session: %s", req.SessionID)
	sessionState, err := h.sessionStore.GetSession(ctx, req.SessionID)
	if err != nil {
		log.Printf("DEBUG: Session not found, creating new session. Error was: %v", err)
		// If session doesn't exist, create a new one
		// In production, you'd get the user ID from authentication
		userID := r.Header.Get("X-User-ID")
		if userID == "" {
			userID = "550e8400-e29b-41d4-a716-446655440000" // Default UUID for development
		}
		log.Printf("DEBUG: Creating session for userID: %s", userID)

		sessionState, err = h.sessionStore.CreateSession(ctx, userID, req.SessionID)
		if err != nil {
			log.Printf("ERROR: Failed to create session: %v", err)
			writeError(w, http.StatusInternalServerError, "session_error", "Failed to create session")
			return
		}
		log.Printf("DEBUG: Successfully created session: %s", sessionState.SessionID)
	}

	// Add user message to conversation history
	userMessage := llm.ChatMessage{
		Role:    "user",
		Content: req.Message,
	}

	if err := h.sessionStore.AddMessage(ctx, req.SessionID, userMessage); err != nil {
		log.Printf("ERROR: Failed to save user message for session %s: %v", req.SessionID, err)
		writeError(w, http.StatusInternalServerError, "session_error", "Failed to save message")
		return
	}

	// Prepare messages for LLM
	messages := h.prepareMessages(sessionState, req.Message)

	// Create LLM request
	llmRequest := llm.ChatRequest{
		Messages:    messages,
		Tools:       h.tools,
		Model:       h.defaultModel,
		Temperature: 0.1,
	}

	if h.defaultMaxTokens > 0 {
		llmRequest.MaxTokens = h.defaultMaxTokens
	}

	// Call LLM with timeout
	llmCtx, cancel := context.WithTimeout(ctx, 30*time.Second)
	defer cancel()

	response, err := h.llmClient.GenerateToolCalls(llmCtx, llmRequest)
	if err != nil {
		log.Printf("ERROR: LLM call failed for session %s: %v", req.SessionID, err)
		writeError(w, http.StatusServiceUnavailable, "llm_error", "Failed to generate response")
		return
	}

	// Extract content and tool calls from response
	responseContent := ""
	if response.Message.Content != "" {
		responseContent = response.Message.Content
	}

	// Generate action previews if tool calls are present
	var proposedActions []financial.ProposedAction
	requiresApproval := false

	if len(response.ToolCalls) > 0 {
		requiresApproval = true

		// Store pending actions in session
		if err := h.sessionStore.AddPendingActions(ctx, req.SessionID, response.ToolCalls); err != nil {
			log.Printf("ERROR: Failed to save pending actions for session %s: %v", req.SessionID, err)
			writeError(w, http.StatusInternalServerError, "session_error", "Failed to save pending actions")
			return
		}

		// Generate previews
		previews, err := h.previewSvc.GeneratePreview(response.ToolCalls)
		if err != nil {
			// Log error but continue - previews are not critical
			log.Printf("WARNING: Failed to generate previews for session %s: %v", req.SessionID, err)
		} else {
			proposedActions = previews
			// Store friendly descriptions and dependencies with pending actions for later dispatch
			meta := make(map[string]session.PendingActionMetadata)
			for _, preview := range previews {
				meta[preview.CallID] = session.PendingActionMetadata{
					FriendlyDescription: preview.FriendlyDescription,
					Dependencies:        preview.Dependencies,
				}
			}
			if err := h.sessionStore.UpdatePendingActionMetadata(ctx, req.SessionID, meta); err != nil {
				log.Printf("WARNING: Failed to update pending action metadata for session %s: %v", req.SessionID, err)
			}
		}
	}

	// Save assistant message
	assistantMessage := llm.ChatMessage{
		Role:      "assistant",
		Content:   responseContent,
		ToolCalls: response.ToolCalls,
	}

	if err := h.sessionStore.AddMessage(ctx, req.SessionID, assistantMessage); err != nil {
		// Log error but continue
		log.Printf("WARNING: Failed to save assistant message for session %s: %v", req.SessionID, err)
	}

	// Get updated conversation flow
	updatedSession, _ := h.sessionStore.GetSession(ctx, req.SessionID)
	conversationFlow := []session.ConversationStep{}
	if updatedSession != nil && len(updatedSession.ConversationFlow) > 0 {
		// Return last 5 steps
		start := len(updatedSession.ConversationFlow) - 5
		if start < 0 {
			start = 0
		}
		conversationFlow = updatedSession.ConversationFlow[start:]
	}

	// Prepare response
	chatResponse := ChatResponse{
		MessageID:        uuid.New().String(),
		Content:          responseContent,
		ProposedActions:  proposedActions,
		RequiresApproval: requiresApproval,
		ConversationFlow: conversationFlow,
		APIVersion:       "v1",
	}

	// Set response headers
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("API-Version", "v1")

	// Write response
	if err := json.NewEncoder(w).Encode(chatResponse); err != nil {
		log.Printf("ERROR: Failed to encode response for session %s: %v", req.SessionID, err)
		writeError(w, http.StatusInternalServerError, "response_error", "Failed to encode response")
		return
	}

	log.Printf("INFO: Chat request completed successfully - SessionID: %s, RequiresApproval: %t", req.SessionID, requiresApproval)
}

// prepareMessages prepares the message history for the LLM
func (h *ChatHandler) prepareMessages(sessionState *session.SessionState, userMessage string) []llm.ChatMessage {
	// Start with system message
	messages := []llm.ChatMessage{
		{
			Role: "system",
			Content: `You are a helpful financial planning assistant. You help users manage their assets, liabilities, and financial scenarios.
You have access to tools for creating and updating financial entities. When users ask about financial planning,
use the appropriate tools to help them. Always be clear about what actions you're proposing and ask for confirmation.`,
		},
	}

	// Add conversation history (last 10 messages)
	historyStart := len(sessionState.Messages) - 10
	if historyStart < 0 {
		historyStart = 0
	}

	for i := historyStart; i < len(sessionState.Messages); i++ {
		messages = append(messages, sessionState.Messages[i])
	}

	// Add current user message
	messages = append(messages, llm.ChatMessage{
		Role:    "user",
		Content: userMessage,
	})

	return messages
}

// HandleChatStream handles streaming chat responses (optional, for future implementation)
func (h *ChatHandler) HandleChatStream(w http.ResponseWriter, r *http.Request) {
	// Set headers for SSE
	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	w.Header().Set("API-Version", "v1")

	// TODO: Implement streaming response
	fmt.Fprintf(w, "data: %s\n\n", `{"error": "Streaming not yet implemented"}`)
}

// GetChatHistory retrieves chat history for a session
func (h *ChatHandler) GetChatHistory(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	sessionID := vars["sessionId"]

	if sessionID == "" {
		writeError(w, http.StatusBadRequest, "missing_session_id", "Session ID is required")
		return
	}

	ctx := r.Context()
	messages, err := h.sessionStore.GetConversationHistory(ctx, sessionID, 50)
	if err != nil {
		writeError(w, http.StatusNotFound, "session_not_found", "Failed to retrieve chat history")
		return
	}

	response := map[string]interface{}{
		"session_id":  sessionID,
		"messages":    messages,
		"api_version": "v1",
	}

	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("API-Version", "v1")
	json.NewEncoder(w).Encode(response)
}
