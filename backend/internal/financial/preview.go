package financial

import (
	"encoding/json"
	"fmt"
	"strconv"
	"strings"

	"financial-chat-system/backend/internal/llm"
)

// ActionPreviewService generates human-readable previews of financial actions
type ActionPreviewService struct {
	registry   *FinancialToolRegistry
	calculator *FinancialCalculator
	validator  *ParameterValidator
}

// MissingParamsError captures required fields that were not provided for tool calls.
type MissingParamsError struct {
	Missing map[string][]string
}

func (e *MissingParamsError) Error() string {
	return "missing required parameters for one or more tool calls"
}

// NewActionPreviewService creates a new action preview service
func NewActionPreviewService(financialClient *Client) *ActionPreviewService {
	// Initialize the registry if not already done
	if GlobalRegistry == nil {
		if err := InitializeRegistry(); err != nil {
			// Log error but continue with a new registry
			GlobalRegistry = NewFinancialToolRegistry()
		}
	}

	return &ActionPreviewService{
		registry:   GlobalRegistry,
		calculator: NewFinancialCalculator(),
		validator:  NewParameterValidator(),
	}
}

// ProposedAction represents a financial action that needs user approval
type ProposedAction struct {
	CallID              string                 `json:"call_id"`
	ToolName            string                 `json:"tool_name"`
	FriendlyDescription string                 `json:"friendly_description"`
	Parameters          map[string]interface{} `json:"parameters"`
	EstimatedImpact     *ImpactEstimate        `json:"estimated_impact"`
	Warnings            []Warning              `json:"warnings,omitempty"`
	Dependencies        []string               `json:"dependencies,omitempty"`
}

// ImpactEstimate represents the estimated financial impact
type ImpactEstimate struct {
	NetWorthChange float64 `json:"net_worth_change"`
	MonthlyChange  float64 `json:"monthly_change,omitempty"`
	Description    string  `json:"description"`
}

// Warning represents a potential issue with the action
type Warning struct {
	Type     string `json:"type"`
	Message  string `json:"message"`
	Severity string `json:"severity"` // "low", "medium", "high"
}

// GeneratePreview generates previews for multiple tool calls
func (s *ActionPreviewService) GeneratePreview(toolCalls []llm.ToolCall) ([]ProposedAction, error) {
	if len(toolCalls) == 0 {
		return []ProposedAction{}, nil
	}

	actions := make([]ProposedAction, 0, len(toolCalls))
	dependencies := s.analyzeDependencies(toolCalls)
	missingFields := make(map[string][]string)

	for _, toolCall := range toolCalls {
		action, err := s.generateSinglePreview(toolCall, dependencies[toolCall.ID])
		if err != nil {
			if mErr, ok := err.(*MissingParamsError); ok && mErr != nil {
				for callID, fields := range mErr.Missing {
					missingFields[callID] = append(missingFields[callID], fields...)
				}
				continue
			}
			return nil, fmt.Errorf("failed to generate preview for %s: %w", toolCall.ID, err)
		}
		actions = append(actions, action)
	}

	if len(missingFields) > 0 {
		return nil, &MissingParamsError{Missing: missingFields}
	}

	return actions, nil
}

// generateSinglePreview generates a preview for a single tool call
func (s *ActionPreviewService) generateSinglePreview(toolCall llm.ToolCall, deps []string) (ProposedAction, error) {
	// Parse tool arguments
	var args map[string]interface{}
	if err := json.Unmarshal([]byte(toolCall.Function.Arguments), &args); err != nil {
		return ProposedAction{}, fmt.Errorf("failed to parse arguments: %w", err)
	}

	// Apply safe defaults for assets to avoid unnecessary user prompts
	if toolCall.Function.Name == "createAsset" {
		args = defaultAssetArgs(args)
	}

	// Validate tool call
	missing, err := s.registry.ValidateToolCall(toolCall.Function.Name, args)
	if err != nil {
		// If the registry surfaced missing fields as an error, normalize to MissingParamsError
		if toolErr, ok := err.(*ToolError); ok && toolErr.Type == "missing_required_field" && toolErr.Field != "" {
			return ProposedAction{}, &MissingParamsError{
				Missing: map[string][]string{
					toolCall.ID: {toolErr.Field},
				},
			}
		}
		return ProposedAction{}, fmt.Errorf("tool validation failed: %w", err)
	}
	if len(missing) > 0 {
		return ProposedAction{}, &MissingParamsError{
			Missing: map[string][]string{
				toolCall.ID: missing,
			},
		}
	}

	// Generate friendly description
	description := s.generateFriendlyDescription(toolCall.Function.Name, args)

	// Calculate impact
	impact := s.calculator.CalculateImpact(toolCall.Function.Name, args)

	// Detect warnings
	warnings := s.detectWarnings(toolCall.Function.Name, args)

	return ProposedAction{
		CallID:              toolCall.ID,
		ToolName:            toolCall.Function.Name,
		FriendlyDescription: description,
		Parameters:          args,
		EstimatedImpact:     impact,
		Warnings:            warnings,
		Dependencies:        deps,
	}, nil
}

// generateFriendlyDescription creates human-readable descriptions
func (s *ActionPreviewService) generateFriendlyDescription(toolName string, args map[string]interface{}) string {
	switch toolName {
	case "createAsset":
		name := getStringParam(args, "name", "New Asset")
		value := getFloatParam(args, "currentValue", 0)
		category := getStringParam(args, "category", "asset")

		return fmt.Sprintf("Create %s '%s' worth %s",
			formatAssetCategory(category), name, formatCurrency(value))

	case "updateAsset":
		assetID := getStringParam(args, "assetId", "unknown")
		if _, exists := args["currentValue"]; exists {
			return fmt.Sprintf("Update asset %s value to %s",
				assetID, formatCurrency(getFloatParam(args, "currentValue", 0)))
		}
		return fmt.Sprintf("Update asset %s details", assetID)

	case "createLiability":
		name := getStringParam(args, "name", "New Liability")
		balance := getFloatParam(args, "currentBalance", 0)
		rate := getFloatParam(args, "interestRate", 0)
		category := getStringParam(args, "category", "debt")

		return fmt.Sprintf("Create %s '%s' with balance %s at %.2f%% interest",
			formatLiabilityCategory(category), name, formatCurrency(balance), rate*100)

	case "updateLiability":
		liabilityID := getStringParam(args, "liabilityId", "unknown")
		if _, exists := args["currentBalance"]; exists {
			return fmt.Sprintf("Update liability %s balance to %s",
				liabilityID, formatCurrency(getFloatParam(args, "currentBalance", 0)))
		}
		return fmt.Sprintf("Update liability %s details", liabilityID)

	case "createPropertyScenario":
		price := getFloatParam(args, "propertyPrice", 0)
		downPayment := getFloatParam(args, "downPayment", 0)
		loanAmount := getFloatParam(args, "loanAmount", 0)
		rate := getFloatParam(args, "interestRate", 0)
		tenure := getIntParam(args, "loanTenure", 0)
		propertyType := getStringParam(args, "propertyType", "property")

		return fmt.Sprintf("Analyze %s purchase: %s price, %s down payment, %s loan over %d years at %.2f%%",
			formatPropertyType(propertyType), formatCurrency(price), formatCurrency(downPayment),
			formatCurrency(loanAmount), tenure, rate*100)

	default:
		return fmt.Sprintf("Execute %s with provided parameters", toolName)
	}
}

// detectWarnings identifies potential issues with the action
func (s *ActionPreviewService) detectWarnings(toolName string, args map[string]interface{}) []Warning {
	var warnings []Warning

	switch toolName {
	case "createAsset":
		value := getFloatParam(args, "currentValue", 0)
		if value > 10000000 { // 10M SGD
			warnings = append(warnings, Warning{
				Type:     "high_value",
				Message:  "This is a very high asset value. Please verify the amount.",
				Severity: "medium",
			})
		}

	case "createLiability":
		balance := getFloatParam(args, "currentBalance", 0)
		rate := getFloatParam(args, "interestRate", 0)

		if rate > 0.15 { // 15% annual
			warnings = append(warnings, Warning{
				Type:     "high_interest",
				Message:  fmt.Sprintf("Interest rate of %.1f%% is very high. Consider refinancing options.", rate*100),
				Severity: "high",
			})
		}

		if balance > 5000000 { // 5M SGD
			warnings = append(warnings, Warning{
				Type:     "high_debt",
				Message:  "This is a very large debt amount. Please verify.",
				Severity: "medium",
			})
		}

	case "createPropertyScenario":
		price := getFloatParam(args, "propertyPrice", 0)
		downPayment := getFloatParam(args, "downPayment", 0)
		loanAmount := getFloatParam(args, "loanAmount", 0)
		rate := getFloatParam(args, "interestRate", 0)

		// Check down payment ratio
		if price > 0 && downPayment/price < 0.2 {
			warnings = append(warnings, Warning{
				Type:     "low_down_payment",
				Message:  "Down payment is less than 20%. You may need mortgage insurance.",
				Severity: "medium",
			})
		}

		// Check debt service ratio (rough estimate assuming 30% income ratio)
		monthlyPayment := s.calculator.CalculateMonthlyPayment(loanAmount, rate, getIntParam(args, "loanTenure", 25))
		if monthlyPayment > 15000 { // Assume high-income warning threshold
			warnings = append(warnings, Warning{
				Type:     "high_msr",
				Message:  fmt.Sprintf("Monthly payment of %s is very high. Ensure it fits your budget.", formatCurrency(monthlyPayment)),
				Severity: "high",
			})
		}

		if rate > 0.06 { // 6% annual
			warnings = append(warnings, Warning{
				Type:     "high_mortgage_rate",
				Message:  fmt.Sprintf("Mortgage rate of %.2f%% is quite high. Shop around for better rates.", rate*100),
				Severity: "medium",
			})
		}
	}

	// General validation warnings
	if len(args) == 0 {
		warnings = append(warnings, Warning{
			Type:     "missing_parameters",
			Message:  "This action has no parameters. Please verify the details.",
			Severity: "low",
		})
	}

	return warnings
}

// defaultAssetArgs fills in safe defaults for asset creation so we can generate previews without extra questions.
func defaultAssetArgs(args map[string]interface{}) map[string]interface{} {
	if args == nil {
		args = make(map[string]interface{})
	}

	allowedCategories := map[string]struct{}{
		"hdb_property":     {},
		"condo_property":   {},
		"landed_property":  {},
		"cash_savings":     {},
		"cpf_account":      {},
		"stocks_portfolio": {},
		"bonds_investment": {},
		"bank_account":     {},
		"cryptocurrency":   {},
		"other_asset":      {},
	}

	// Normalize category
	if raw, ok := args["category"].(string); ok {
		if _, allowed := allowedCategories[raw]; !allowed || strings.TrimSpace(raw) == "" {
			args["category"] = "other_asset"
		}
	} else {
		args["category"] = "other_asset"
	}

	// Provide a fallback name if missing
	if raw, ok := args["name"].(string); !ok || strings.TrimSpace(raw) == "" {
		if cat, okCat := args["category"].(string); okCat && cat != "" {
			args["name"] = formatCategoryName(cat)
		} else {
			args["name"] = "Asset"
		}
	}

	return args
}

func formatCategoryName(cat string) string {
	clean := strings.TrimSpace(strings.ReplaceAll(cat, "_", " "))
	if clean == "" {
		return "Asset"
	}

	parts := strings.Fields(strings.ToLower(clean))
	for i, p := range parts {
		if len(p) == 0 {
			continue
		}
		parts[i] = strings.ToUpper(p[:1]) + p[1:]
	}
	return strings.Join(parts, " ")
}

// analyzeDependencies identifies dependencies between tool calls
func (s *ActionPreviewService) analyzeDependencies(toolCalls []llm.ToolCall) map[string][]string {
	dependencies := make(map[string][]string)

	// Simple dependency analysis: updates depend on creates
	createCalls := make(map[string]string) // tool type -> call ID

	for _, toolCall := range toolCalls {
		if strings.HasPrefix(toolCall.Function.Name, "create") {
			entityType := strings.TrimPrefix(toolCall.Function.Name, "create")
			createCalls[entityType] = toolCall.ID
		}
	}

	for _, toolCall := range toolCalls {
		if strings.HasPrefix(toolCall.Function.Name, "update") {
			entityType := strings.TrimPrefix(toolCall.Function.Name, "update")
			if createCallID, exists := createCalls[entityType]; exists {
				dependencies[toolCall.ID] = []string{createCallID}
			}
		}
	}

	return dependencies
}

// Helper functions for parameter extraction
func getStringParam(args map[string]interface{}, key, defaultValue string) string {
	if value, exists := args[key]; exists {
		if str, ok := value.(string); ok {
			return str
		}
	}
	return defaultValue
}

func getFloatParam(args map[string]interface{}, key string, defaultValue float64) float64 {
	if value, exists := args[key]; exists {
		switch v := value.(type) {
		case float64:
			return v
		case int:
			return float64(v)
		case string:
			if f, err := strconv.ParseFloat(v, 64); err == nil {
				return f
			}
		}
	}
	return defaultValue
}

func getIntParam(args map[string]interface{}, key string, defaultValue int) int {
	if value, exists := args[key]; exists {
		switch v := value.(type) {
		case int:
			return v
		case float64:
			return int(v)
		case string:
			if i, err := strconv.Atoi(v); err == nil {
				return i
			}
		}
	}
	return defaultValue
}

// Formatting functions
func formatCurrency(amount float64) string {
	if amount >= 1000000 {
		return fmt.Sprintf("$%.1fM", amount/1000000)
	} else if amount >= 1000 {
		return fmt.Sprintf("$%.0fk", amount/1000)
	}
	return fmt.Sprintf("$%.0f", amount)
}

func formatAssetCategory(category string) string {
	switch category {
	case "hdb_property":
		return "HDB property"
	case "condo_property":
		return "condominium"
	case "landed_property":
		return "landed property"
	case "cash_savings":
		return "savings account"
	case "cpf_account":
		return "CPF account"
	case "stocks_portfolio":
		return "stock portfolio"
	case "bonds_investment":
		return "bond investment"
	case "bank_account":
		return "bank account"
	case "cryptocurrency":
		return "cryptocurrency"
	default:
		return "asset"
	}
}

func formatLiabilityCategory(category string) string {
	switch category {
	case "mortgage":
		return "mortgage"
	case "personal_loan":
		return "personal loan"
	case "car_loan":
		return "car loan"
	case "education_loan":
		return "education loan"
	case "credit_card":
		return "credit card debt"
	case "business_loan":
		return "business loan"
	case "overdraft":
		return "overdraft"
	default:
		return "debt"
	}
}

func formatPropertyType(propertyType string) string {
	switch propertyType {
	case "hdb_bto":
		return "HDB BTO"
	case "hdb_resale":
		return "HDB resale"
	case "condo_new":
		return "new condominium"
	case "condo_resale":
		return "resale condominium"
	case "landed_terrace":
		return "terrace house"
	case "landed_semi_d":
		return "semi-detached house"
	case "landed_bungalow":
		return "bungalow"
	case "commercial":
		return "commercial property"
	case "industrial":
		return "industrial property"
	default:
		return "property"
	}
}
