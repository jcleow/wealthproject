package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"time"

	"financial-chat-system/backend/internal/financial"
	"financial-chat-system/backend/internal/llm"
	"financial-chat-system/backend/internal/middleware"
	"financial-chat-system/backend/internal/session"
	"financial-chat-system/backend/internal/usage"

	"github.com/google/uuid"
	"github.com/gorilla/mux"
)

// ChatHandler handles chat API requests
type ChatHandler struct {
	llmClient        llmToolCaller
	previewSvc       previewGenerator
	sessionStore     chatSessionStore
	financialClient  *financial.Client
	usageRepo        *usage.Repository
	tools            []llm.ToolDefinition
	defaultModel     string
	defaultMaxTokens int
	systemPrompt     string
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
	SaveConversationHistory(ctx context.Context, sessionID string, messages []llm.ChatMessage) error
}

type previewGenerator interface {
	GeneratePreview(toolCalls []llm.ToolCall) ([]financial.ProposedAction, error)
}

type llmToolCaller interface {
	GenerateToolCalls(ctx context.Context, req llm.ChatRequest) (*llm.ToolCallResponse, error)
}

// NewChatHandler creates a new chat handler
func NewChatHandler(llmClient *llm.ClientManager, previewSvc *financial.ActionPreviewService, sessionStore *session.Store, financialClient *financial.Client, usageRepo *usage.Repository, defaultModel string, defaultMaxTokens int) *ChatHandler {
	// Initialize the registry if not already done
	if financial.GlobalRegistry == nil {
		financial.InitializeRegistry()
	}

	systemPrompt, err := loadSystemPrompt()
	if err != nil {
		log.Printf("WARN: Failed to load system prompt from file: %v", err)
	}

	return &ChatHandler{
		llmClient:        llmClient,
		previewSvc:       previewSvc,
		sessionStore:     sessionStore,
		financialClient:  financialClient,
		usageRepo:        usageRepo,
		tools:            financial.GlobalRegistry.GetTools(),
		defaultModel:     defaultModel,
		defaultMaxTokens: defaultMaxTokens,
		systemPrompt:     systemPrompt,
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
	ActionsExecuted  int                        `json:"actions_executed,omitempty"`
	ConversationFlow []session.ConversationStep `json:"conversation_flow,omitempty"`
	APIVersion       string                     `json:"api_version"`
}

func loadSystemPrompt() (string, error) {
	candidates := []string{}

	if envPath := strings.TrimSpace(os.Getenv("SYSTEM_PROMPT_PATH")); envPath != "" {
		candidates = append(candidates, envPath)
	}

	candidates = append(candidates,
		filepath.Join("backend", "internal", "llm", "prompts", "system_prompt.txt"),
		filepath.Join("internal", "llm", "prompts", "system_prompt.txt"),
	)

	var lastErr error
	for _, path := range candidates {
		content, err := os.ReadFile(path)
		if err != nil {
			lastErr = err
			continue
		}

		prompt := strings.TrimSpace(string(content))
		if prompt == "" {
			lastErr = fmt.Errorf("system prompt file %s is empty", path)
			continue
		}

		return prompt, nil
	}

	if lastErr != nil {
		return "", lastErr
	}

	return "", fmt.Errorf("no system prompt file found; set SYSTEM_PROMPT_PATH or place the prompt in internal/llm/prompts/system_prompt.txt")
}

// HandleChat processes chat requests and generates responses with tool calls
// @Summary Send a chat message
// @Description Process a chat message and generate AI response with financial tool calls
// @Tags Chat
// @Accept json
// @Produce json
// @Param body body ChatRequest true "Chat message"
// @Success 200 {object} ChatResponse
// @Failure 400 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /chat [post]
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

	// Get authenticated userID from middleware context
	authUserID := middleware.GetUserContext(r.Context()).UserID
	if authUserID == "" {
		authUserID = sessionState.UserID // fallback for dev mode
	}

	// Get financial context for injection into system prompt
	var financialContextStr string
	if h.financialClient != nil {
		finCtx, err := h.financialClient.GetFinancialContext(ctx, authUserID)
		if err != nil {
			log.Printf("WARNING: Failed to get financial context for session %s: %v", req.SessionID, err)
		} else {
			financialContextStr = h.financialClient.FormatContextForPrompt(finCtx)
		}
	}

	// Prepare messages for LLM
	messages := h.prepareMessages(sessionState, req.Message, financialContextStr)

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

	// If no LLM providers are configured, return a clear error before calling.
	if lister, ok := h.llmClient.(interface{ GetAvailableProviders() []string }); ok {
		if len(lister.GetAvailableProviders()) == 0 {
			writeError(w, http.StatusServiceUnavailable, "llm_not_configured", "No LLM providers configured. Set OPENAI_API_KEY, ANTHROPIC_API_KEY, or GEMINI_API_KEY.")
			return
		}
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

	// Log usage (non-blocking)
	if h.usageRepo != nil && h.usageRepo.IsEnabled() {
		sessionIDPtr := &req.SessionID
		go func() {
			if err := h.usageRepo.LogUsage(context.Background(), authUserID, sessionIDPtr, response); err != nil {
				log.Printf("WARN: Failed to log usage for session %s: %v", req.SessionID, err)
			}
		}()
	}

	// Save conversation history (non-blocking)
	go func() {
		messagesToSave := []llm.ChatMessage{
			{Role: "user", Content: req.Message},
			response.Message,
		}
		if err := h.sessionStore.SaveConversationHistory(context.Background(), req.SessionID, messagesToSave); err != nil {
			log.Printf("WARN: Failed to save conversation history for session %s: %v", req.SessionID, err)
		}
	}()

	// Extract content and tool calls from response
	responseContent := ""
	if response.Message.Content != "" {
		responseContent = response.Message.Content
	}
	log.Printf("DEBUG: LLM response - Content length: %d, ToolCalls: %d", len(response.Message.Content), len(response.ToolCalls))
	if len(response.ToolCalls) > 0 {
		log.Printf("DEBUG: LLM returned %d tool calls", len(response.ToolCalls))
		for i, tc := range response.ToolCalls {
			log.Printf("DEBUG: ToolCall[%d]: %s - Args: %s", i, tc.Function.Name, tc.Function.Arguments)
		}
	}

	// Generate action previews if tool calls are present
	var proposedActions []financial.ProposedAction
	requiresApproval := false
	actionsExecuted := 0
	var missingFields map[string][]string

	if len(response.ToolCalls) > 0 {
		// Separate read-only (analysis) tools from write tools
		var readOnlyToolCalls []llm.ToolCall
		var writeToolCalls []llm.ToolCall

		for _, tc := range response.ToolCalls {
			if financial.IsReadOnlyTool(tc.Function.Name) {
				readOnlyToolCalls = append(readOnlyToolCalls, tc)
			} else {
				writeToolCalls = append(writeToolCalls, tc)
			}
		}

		// Use authenticated userID for tool execution
		userID := authUserID

		// Execute read-only tools immediately and append results to response
		if len(readOnlyToolCalls) > 0 && h.financialClient != nil {
			var analysisResults []string
			for _, tc := range readOnlyToolCalls {
				result, err := h.executeReadOnlyTool(ctx, tc, userID)
				if err != nil {
					log.Printf("WARNING: Failed to execute read-only tool %s: %v", tc.Function.Name, err)
					continue
				}
				if result != nil && *result != "" {
					analysisResults = append(analysisResults, *result)
				}
			}

			// Append analysis results to response content
			if len(analysisResults) > 0 {
				if responseContent != "" {
					responseContent += "\n\n"
				}
				responseContent += strings.Join(analysisResults, "\n\n")
			}
		}

		// Process write tools (require approval unless auto-execute is enabled)
		if len(writeToolCalls) > 0 {
			// Check if user has auto-execute enabled
			autoExecute := false
			if h.financialClient != nil {
				autoExecute = h.financialClient.GetAutoExecuteTools(ctx, userID)
			}

			if autoExecute {
				// Auto-execute mode: execute write tools immediately
				log.Printf("INFO: Auto-executing %d write tools for session %s", len(writeToolCalls), req.SessionID)
				var executionResults []string
				for _, tc := range writeToolCalls {
					result, err := h.executeWriteTool(ctx, tc, userID)
					if err != nil {
						log.Printf("WARNING: Failed to auto-execute tool %s: %v", tc.Function.Name, err)
						executionResults = append(executionResults, fmt.Sprintf("Failed to execute %s: %v", tc.Function.Name, err))
					} else if result != nil && *result != "" {
						executionResults = append(executionResults, fmt.Sprintf("Executed %s: %s", tc.Function.Name, *result))
						actionsExecuted++
					} else {
						executionResults = append(executionResults, fmt.Sprintf("Executed %s successfully", tc.Function.Name))
						actionsExecuted++
					}
				}
				// Append execution results to response
				if len(executionResults) > 0 {
					if responseContent != "" {
						responseContent += "\n\n"
					}
					responseContent += "**Actions completed:**\n" + strings.Join(executionResults, "\n")
				}
				// Clear tool calls since they were executed
				writeToolCalls = nil
			} else {
				// Standard approval flow
				requiresApproval = true

				// Generate previews for write tools only
				previews, err := h.previewSvc.GeneratePreview(writeToolCalls)
				if err != nil {
					if mErr, ok := err.(*financial.MissingParamsError); ok && mErr != nil {
						// Missing required fields: do not create pending actions or previews
						missingFields = mErr.Missing
						requiresApproval = false
						proposedActions = nil
						responseContent = h.formatMissingFieldsPrompt(missingFields)
						// Drop unusable tool calls so they aren't persisted on the assistant message
						writeToolCalls = nil
						log.Printf("INFO: Missing required fields for session %s: %v", req.SessionID, missingFields)
					} else {
						// Log error but continue - previews are not critical
						log.Printf("WARNING: Failed to generate previews for session %s: %v", req.SessionID, err)
					}
				} else {
					proposedActions = previews
					// Ensure the user sees a concise confirmation if the LLM response is empty
					if responseContent == "" {
						responseContent = h.formatPreviewSummary(previews)
					}
					// Store pending actions in session now that validation passed
					if err := h.sessionStore.AddPendingActions(ctx, req.SessionID, writeToolCalls); err != nil {
						log.Printf("ERROR: Failed to save pending actions for session %s: %v", req.SessionID, err)
						writeError(w, http.StatusInternalServerError, "session_error", "Failed to save pending actions")
						return
					}

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
		}

		// Update response.ToolCalls to only include write tools (for message persistence)
		response.ToolCalls = writeToolCalls
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
		ActionsExecuted:  actionsExecuted,
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

	log.Printf("INFO: Chat request completed - SessionID: %s, RequiresApproval: %t, ActionsExecuted: %d, ContentLength: %d", req.SessionID, requiresApproval, actionsExecuted, len(responseContent))
}

// prepareMessages prepares the message history for the LLM
func (h *ChatHandler) prepareMessages(sessionState *session.SessionState, userMessage string, financialContext string) []llm.ChatMessage {
	messages := []llm.ChatMessage{}
	if h.systemPrompt != "" {
		systemContent := h.systemPrompt
		// Inject financial context if available
		if financialContext != "" {
			systemContent = systemContent + "\n\n" + financialContext
		}
		messages = append(messages, llm.ChatMessage{
			Role:    "system",
			Content: systemContent,
		})
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

// formatMissingFieldsPrompt builds a user-facing prompt listing all missing required fields.
func (h *ChatHandler) formatMissingFieldsPrompt(missing map[string][]string) string {
	if len(missing) == 0 {
		return "I need a bit more information before I can continue. What details can you provide?"
	}

	unique := map[string]struct{}{}
	for _, fields := range missing {
		for _, f := range fields {
			if f == "" {
				continue
			}
			unique[f] = struct{}{}
		}
	}

	fieldList := make([]string, 0, len(unique))
	for f := range unique {
		fieldList = append(fieldList, f)
	}
	sort.Strings(fieldList)

	return fmt.Sprintf("I need a bit more information before I can proceed. Please provide: %s.", strings.Join(fieldList, ", "))
}

// formatPreviewSummary builds a short, natural confirmation based on generated previews.
func (h *ChatHandler) formatPreviewSummary(previews []financial.ProposedAction) string {
	if len(previews) == 0 {
		return ""
	}

	if len(previews) == 1 {
		desc := strings.TrimSpace(previews[0].FriendlyDescription)
		if desc == "" {
			desc = fmt.Sprintf("run %s", previews[0].ToolName)
		}
		return fmt.Sprintf("I'll prepare this now: %s. Please check if everything looks correct, then confirm or cancel.", desc)
	}

	return fmt.Sprintf("I found %d actions. Review the previews below, confirm or cancel, and tell me if anything looks off.", len(previews))
}

// executeReadOnlyTool executes analysis tools that don't modify data
func (h *ChatHandler) executeReadOnlyTool(ctx context.Context, tc llm.ToolCall, userID string) (*string, error) {
	if h.financialClient == nil {
		return nil, fmt.Errorf("financial client not available")
	}

	var args map[string]interface{}
	if err := json.Unmarshal([]byte(tc.Function.Arguments), &args); err != nil {
		return nil, fmt.Errorf("failed to parse arguments: %w", err)
	}

	switch tc.Function.Name {
	case "getNetWorthSummary":
		params := financial.GetNetWorthSummaryParams{
			IncludeScenarios: getBoolParam(args, "includeScenarios", false),
			AsOfYear:         getIntParamChat(args, "asOfYear", 0),
		}
		return h.financialClient.GetNetWorthSummary(ctx, userID, params)

	case "analyzeNetWorthTrends":
		params := financial.AnalyzeNetWorthTrendsParams{
			IncludeScenarios: getBoolParam(args, "includeScenarios", true),
			YearsToAnalyze:   getIntParamChat(args, "yearsToAnalyze", 30),
		}
		return h.financialClient.AnalyzeNetWorthTrends(ctx, userID, params)

	case "compareScenarioImpact":
		params := financial.CompareScenarioImpactParams{
			ScenarioID:     getStringParamChat(args, "scenarioId", ""),
			ScenarioName:   getStringParamChat(args, "scenarioName", ""),
			YearsToProject: getIntParamChat(args, "yearsToProject", 10),
		}
		return h.financialClient.CompareScenarioImpact(ctx, userID, params)

	case "projectNetWorthAtYear":
		params := financial.ProjectNetWorthAtYearParams{
			TargetYear:       getIntParamChat(args, "targetYear", 0),
			TargetAge:        getIntParamChat(args, "targetAge", 0),
			IncludeScenarios: getBoolParam(args, "includeScenarios", true),
		}
		return h.financialClient.ProjectNetWorthAtYear(ctx, userID, params)

	case "identifyNetWorthLevers":
		params := financial.IdentifyNetWorthLeversParams{
			TopN:     getIntParamChat(args, "topN", 5),
			Category: getStringParamChat(args, "category", "all"),
		}
		return h.financialClient.IdentifyNetWorthLevers(ctx, userID, params)

	case "listScenarioEvents":
		params := financial.ListScenarioEventsParams{
			IncludeDisabled: getBoolParam(args, "includeDisabled", true),
			TargetType:      getStringParamChat(args, "targetType", ""),
		}
		return h.financialClient.ListScenarioEvents(ctx, userID, params)

	default:
		return nil, fmt.Errorf("unknown read-only tool: %s", tc.Function.Name)
	}
}

// executeWriteTool executes a write tool directly (for auto-execute mode)
func (h *ChatHandler) executeWriteTool(ctx context.Context, tc llm.ToolCall, userID string) (*string, error) {
	if h.financialClient == nil {
		return nil, fmt.Errorf("financial client not available")
	}

	var args map[string]interface{}
	if err := json.Unmarshal([]byte(tc.Function.Arguments), &args); err != nil {
		return nil, fmt.Errorf("failed to parse arguments: %w", err)
	}

	// Set userID in context for the financial client
	ctx = context.WithValue(ctx, "userID", userID)

	switch tc.Function.Name {
	case "createAsset":
		params := financial.AssetParams{
			Category:     getStringParamChat(args, "category", "other_asset"),
			Name:         getStringParamChat(args, "name", ""),
			CurrentValue: getFloatParamChat(args, "currentValue", 0),
			Notes:        getStringParamChat(args, "notes", ""),
		}
		if rate := getFloatParamChat(args, "annualGrowthRate", -1); rate >= 0 {
			params.AnnualGrowthRate = &rate
		}
		return h.financialClient.CreateAsset(ctx, params)

	case "updateAsset":
		params := financial.UpdateAssetParams{
			AssetID:   getStringParamChat(args, "assetId", ""),
			AssetName: getStringParamChat(args, "assetName", ""),
			Name:      getStringParamChat(args, "name", ""),
			Notes:     getStringParamChat(args, "notes", ""),
		}
		if val := getFloatParamChat(args, "currentValue", -1); val >= 0 {
			params.CurrentValue = &val
		}
		if rate := getFloatParamChat(args, "annualGrowthRate", -1); rate >= 0 {
			params.AnnualGrowthRate = &rate
		}
		return h.financialClient.UpdateAsset(ctx, params)

	case "deleteAsset":
		params := financial.DeleteAssetParams{
			AssetID:   getStringParamChat(args, "assetId", ""),
			AssetName: getStringParamChat(args, "assetName", ""),
		}
		return h.financialClient.DeleteAsset(ctx, params)

	case "createLiability":
		params := financial.LiabilityParams{
			Category:       getStringParamChat(args, "category", "other_debt"),
			Name:           getStringParamChat(args, "name", ""),
			CurrentBalance: getFloatParamChat(args, "currentBalance", 0),
			InterestRate:   getFloatParamChat(args, "interestRate", 0),
			MaturityDate:   getStringParamChat(args, "maturityDate", ""),
			Notes:          getStringParamChat(args, "notes", ""),
		}
		if payment := getFloatParamChat(args, "monthlyPayment", -1); payment >= 0 {
			params.MonthlyPayment = &payment
		}
		return h.financialClient.CreateLiability(ctx, params)

	case "updateLiability":
		params := financial.UpdateLiabilityParams{
			LiabilityID:   getStringParamChat(args, "liabilityId", ""),
			LiabilityName: getStringParamChat(args, "liabilityName", ""),
			Name:          getStringParamChat(args, "name", ""),
			MaturityDate:  getStringParamChat(args, "maturityDate", ""),
			Notes:         getStringParamChat(args, "notes", ""),
		}
		if val := getFloatParamChat(args, "currentBalance", -1); val >= 0 {
			params.CurrentBalance = &val
		}
		if rate := getFloatParamChat(args, "interestRate", -1); rate >= 0 {
			params.InterestRate = &rate
		}
		if payment := getFloatParamChat(args, "monthlyPayment", -1); payment >= 0 {
			params.MonthlyPayment = &payment
		}
		return h.financialClient.UpdateLiability(ctx, params)

	case "deleteLiability":
		params := financial.DeleteLiabilityParams{
			LiabilityID:   getStringParamChat(args, "liabilityId", ""),
			LiabilityName: getStringParamChat(args, "liabilityName", ""),
		}
		return h.financialClient.DeleteLiability(ctx, params)

	case "createIncome":
		params := financial.IncomeParams{
			Source:    getStringParamChat(args, "source", ""),
			Amount:    getFloatParamChat(args, "amount", 0),
			Frequency: getStringParamChat(args, "frequency", "monthly"),
			StartDate: getStringParamChat(args, "startDate", ""),
			Category:  getStringParamChat(args, "category", ""),
			Notes:     getStringParamChat(args, "notes", ""),
		}
		return h.financialClient.CreateIncome(ctx, params)

	case "updateIncome":
		params := financial.UpdateIncomeParams{
			IncomeID:   getStringParamChat(args, "incomeId", ""),
			IncomeName: getStringParamChat(args, "incomeName", ""),
			Source:     getStringParamChat(args, "source", ""),
			Frequency:  getStringParamChat(args, "frequency", ""),
			StartDate:  getStringParamChat(args, "startDate", ""),
			Category:   getStringParamChat(args, "category", ""),
			Notes:      getStringParamChat(args, "notes", ""),
		}
		if val := getFloatParamChat(args, "amount", -1); val >= 0 {
			params.Amount = &val
		}
		return h.financialClient.UpdateIncome(ctx, params)

	case "deleteIncome":
		params := financial.DeleteIncomeParams{
			IncomeID:   getStringParamChat(args, "incomeId", ""),
			IncomeName: getStringParamChat(args, "incomeName", ""),
		}
		return h.financialClient.DeleteIncome(ctx, params)

	case "createExpense":
		params := financial.ExpenseParams{
			Payee:     getStringParamChat(args, "payee", ""),
			Amount:    getFloatParamChat(args, "amount", 0),
			Frequency: getStringParamChat(args, "frequency", "monthly"),
			Category:  getStringParamChat(args, "category", ""),
			Notes:     getStringParamChat(args, "notes", ""),
		}
		return h.financialClient.CreateExpense(ctx, params)

	case "updateExpense":
		params := financial.UpdateExpenseParams{
			ExpenseID:   getStringParamChat(args, "expenseId", ""),
			ExpenseName: getStringParamChat(args, "expenseName", ""),
			Payee:       getStringParamChat(args, "payee", ""),
			Frequency:   getStringParamChat(args, "frequency", ""),
			Category:    getStringParamChat(args, "category", ""),
			Notes:       getStringParamChat(args, "notes", ""),
		}
		if val := getFloatParamChat(args, "amount", -1); val >= 0 {
			params.Amount = &val
		}
		return h.financialClient.UpdateExpense(ctx, params)

	case "deleteExpense":
		params := financial.DeleteExpenseParams{
			ExpenseID:   getStringParamChat(args, "expenseId", ""),
			ExpenseName: getStringParamChat(args, "expenseName", ""),
		}
		return h.financialClient.DeleteExpense(ctx, params)

	case "createPropertyScenario":
		params := financial.PropertyScenarioParams{
			PropertyPrice: getFloatParamChat(args, "propertyPrice", 0),
			DownPayment:   getFloatParamChat(args, "downPayment", 0),
			LoanAmount:    getFloatParamChat(args, "loanAmount", 0),
			InterestRate:  getFloatParamChat(args, "interestRate", 0),
			LoanTenure:    getIntParamChat(args, "loanTenure", 0),
			PropertyType:  getStringParamChat(args, "propertyType", ""),
			Name:          getStringParamChat(args, "name", ""),
			Notes:         getStringParamChat(args, "notes", ""),
		}
		return h.financialClient.CreatePropertyScenario(ctx, params)

	case "createScenarioEvent":
		params := financial.CreateScenarioEventParams{
			Name:        getStringParamChat(args, "name", ""),
			Description: getStringParamChat(args, "description", ""),
			TargetYear:  getIntParamChat(args, "targetYear", 0),
			TargetType:  getStringParamChat(args, "targetType", ""),
			TargetID:    getStringParamChat(args, "targetId", ""),
			ImpactType:  getStringParamChat(args, "impactType", ""),
		}
		if val := getFloatParamChat(args, "impactValue", -999999); val != -999999 {
			params.ImpactValue = &val
		}
		if isIncluded, exists := args["isIncluded"]; exists {
			if b, ok := isIncluded.(bool); ok {
				params.IsIncluded = &b
			}
		}
		return h.financialClient.CreateScenarioEvent(ctx, params)

	case "updateScenarioEvent":
		params := financial.UpdateScenarioEventParams{
			ScenarioID:   getStringParamChat(args, "scenarioId", ""),
			ScenarioName: getStringParamChat(args, "scenarioName", ""),
			Name:         getStringParamChat(args, "name", ""),
			Description:  getStringParamChat(args, "description", ""),
		}
		if val := getIntParamChat(args, "targetYear", -1); val >= 0 {
			params.TargetYear = &val
		}
		if val := getFloatParamChat(args, "impactValue", -999999); val != -999999 {
			params.ImpactValue = &val
		}
		if isIncluded, exists := args["isIncluded"]; exists {
			if b, ok := isIncluded.(bool); ok {
				params.IsIncluded = &b
			}
		}
		return h.financialClient.UpdateScenarioEvent(ctx, params)

	case "deleteScenarioEvent":
		params := financial.DeleteScenarioEventParams{
			ScenarioID:   getStringParamChat(args, "scenarioId", ""),
			ScenarioName: getStringParamChat(args, "scenarioName", ""),
		}
		return h.financialClient.DeleteScenarioEvent(ctx, params)

	case "toggleScenarioIncluded":
		params := financial.ToggleScenarioIncludedParams{
			ScenarioID:   getStringParamChat(args, "scenarioId", ""),
			ScenarioName: getStringParamChat(args, "scenarioName", ""),
			IsIncluded:   getBoolParam(args, "isIncluded", true),
		}
		return h.financialClient.ToggleScenarioIncluded(ctx, params)

	default:
		return nil, fmt.Errorf("unknown write tool: %s", tc.Function.Name)
	}
}

// getFloatParamChat extracts a float parameter from args
func getFloatParamChat(args map[string]interface{}, key string, defaultValue float64) float64 {
	if value, exists := args[key]; exists {
		switch v := value.(type) {
		case float64:
			return v
		case int:
			return float64(v)
		}
	}
	return defaultValue
}

// Helper functions for parameter extraction in chat handler
func getStringParamChat(args map[string]interface{}, key, defaultValue string) string {
	if value, exists := args[key]; exists {
		if str, ok := value.(string); ok {
			return str
		}
	}
	return defaultValue
}

func getIntParamChat(args map[string]interface{}, key string, defaultValue int) int {
	if value, exists := args[key]; exists {
		switch v := value.(type) {
		case float64:
			return int(v)
		case int:
			return v
		}
	}
	return defaultValue
}

func getBoolParam(args map[string]interface{}, key string, defaultValue bool) bool {
	if value, exists := args[key]; exists {
		if b, ok := value.(bool); ok {
			return b
		}
	}
	return defaultValue
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
